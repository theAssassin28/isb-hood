-- M5: surveys, return visits, metrics (docs/BUILD_PLAN.md 4.9, 6.4, 8.2).

-- ----------------------------------------------------------- settings
insert into public.app_settings (key, value) values
  ('post_bid_survey_cohort', '"Co''27"')
on conflict (key) do nothing;

create function public.app_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key;
$$;

-- Calendar day in India: survey windows and return visits are counted in IST.
create function public.ist_date(p_at timestamptz)
returns date language sql immutable as $$
  select (p_at at time zone 'Asia/Kolkata')::date;
$$;

-- --------------------------------------------------------- return visits
-- At most one per user per IST day (plan 6.4). The app sends props.day.
create unique index events_return_visit_once_a_day
  on public.events (user_id, (props ->> 'day'))
  where name = 'return_visit';

-- ---------------------------------------------------------------- surveys
alter table public.survey_responses
  add column note text check (char_length(note) <= 1000),
  add constraint survey_action_text_length check (char_length(action_text) <= 300),
  add constraint survey_complete check (
    (survey = 'post_bid'
      and bid_effect is not null
      and seniors_asked_band is not null
      and (bid_effect <> 'changed' or coalesce(cardinality(changed_course_ids), 0) >= 1))
    or
    (survey = 'career_followup'
      and career_action is not null
      and (career_action = 'none' or char_length(btrim(coalesce(action_text, ''))) > 0))
  );

-- First day the person opened a career entry (start of the follow-up clock).
create function public.first_career_view(p_user uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select min(created_at) from public.events
  where user_id = p_user and name = 'career_entry_viewed';
$$;

-- Is this survey due for this person on this day?
--  post_bid:        inside the survey window, in the survey cohort, and viewed
--                   at least one course page of the bid term.
--  career_followup: from 14 days after the first career view, brought forward
--                   to the day before the deadline for late starters, until
--                   the deadline (plan 4.9).
-- Never once they have answered.
create function public.survey_due(p_user uuid, p_survey text, p_today date)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_window jsonb;
  v_first timestamptz;
  v_deadline date;
  v_due date;
begin
  if exists (select 1 from public.survey_responses where user_id = p_user and survey = p_survey) then
    return false;
  end if;
  if not exists (select 1 from public.profiles where id = p_user and deleted_at is null) then
    return false;
  end if;

  if p_survey = 'post_bid' then
    v_window := public.app_setting('post_bid_survey_window');
    if v_window is null or p_today < (v_window ->> 'start')::date or p_today > (v_window ->> 'end')::date then
      return false;
    end if;
    return exists (
      select 1 from public.profiles
      where id = p_user and cohort = (public.app_setting('post_bid_survey_cohort') #>> '{}')
    ) and exists (
      select 1 from public.events
      where user_id = p_user and name = 'course_page_viewed'
        and props ->> 'current_term' = (public.app_setting('bid_term_label') #>> '{}')
    );
  elsif p_survey = 'career_followup' then
    v_first := public.first_career_view(p_user);
    if v_first is null then
      return false;
    end if;
    v_deadline := (public.app_setting('career_followup_deadline') #>> '{}')::date;
    v_due := least(
      public.ist_date(v_first) + coalesce((public.app_setting('career_followup_days') #>> '{}')::int, 14),
      v_deadline - 1
    );
    return p_today >= v_due and p_today <= v_deadline;
  end if;
  return false;
end;
$$;

-- What the signed-in person may answer today (drives the in-app prompt).
create function public.my_survey_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'post_bid', public.survey_due(auth.uid(), 'post_bid', public.ist_date(now())),
    'career_followup', public.survey_due(auth.uid(), 'career_followup', public.ist_date(now()))
  );
$$;

-- Everyone a survey is due for (the daily job's email list). Service role only.
create function public.survey_due_users(p_survey text, p_today date)
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
  where p.deleted_at is null and public.survey_due(p.id, p_survey, p_today);
$$;

-- Only a due survey can be answered, once; the follow-up gap is recorded by
-- the database, not trusted from the browser.
-- The policy may only ask about the caller: survey_due itself stays private,
-- so nobody can probe whether someone else is due.
create function public.i_may_answer(p_survey text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.survey_due(auth.uid(), p_survey, public.ist_date(now()));
$$;

drop policy surveys_insert on public.survey_responses;
create policy surveys_insert on public.survey_responses for insert to authenticated
  with check (user_id = auth.uid() and public.i_may_answer(survey));

create function public.set_days_since_first_view()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_first timestamptz;
begin
  new.days_since_first_view := null;
  if new.survey = 'career_followup' then
    v_first := public.first_career_view(new.user_id);
    if v_first is not null then
      new.days_since_first_view := public.ist_date(now()) - public.ist_date(v_first);
    end if;
  end if;
  return new;
end;
$$;
create trigger survey_days_since_first_view before insert on public.survey_responses
  for each row execute function public.set_days_since_first_view();

-- ---------------------------------------------------------------- metrics
-- Every number on /admin/metrics (plan 8.2), in one place so each is auditable.
-- Pass, fail and decision bands are applied in lib/domain/metrics.ts.
create function public.metrics_snapshot()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_bid_term text := coalesce(public.app_setting('bid_term_label') #>> '{}', 'Term 7');
  v_cohort text := coalesce(public.app_setting('post_bid_survey_cohort') #>> '{}', 'Co''27');
  v_result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can read metrics';
  end if;

  with
  submitted as (
    select * from public.course_reviews where status in ('live', 'pending_verification')
  ),
  own as (select * from submitted where on_behalf_of_name is null),
  bid_courses as (
    select distinct course_id from public.offerings
    where is_current and status = 'approved' and term_label = v_bid_term
  ),
  live_per_course as (
    select o.course_id, count(*) as n
    from public.course_reviews r join public.offerings o on o.id = r.offering_id
    where r.status = 'live' and o.status = 'approved'
    group by o.course_id
  ),
  careers as (
    select * from public.career_entries
    where status in ('live', 'pending_verification') and on_behalf_of_name is null
  ),
  signups as (
    select distinct on (user_id) user_id, props ->> 'programme' as programme
    from public.events where name = 'user_signed_up' and user_id is not null
    order by user_id, created_at
  ),
  readers as (select user_id, programme from signups where programme in ('pgp', 'pgp_yl')),
  value_users as (
    select distinct user_id, props ->> 'module' as module from public.events
    where name = 'value_reached' and user_id is not null
  ),
  returners as (
    select distinct user_id from public.events where name = 'return_visit' and user_id is not null
  ),
  questions as (
    select c.*,
      (select count(*) from public.comments r where r.parent_id = c.id and r.status = 'live') as replies
    from public.comments c
    where c.parent_id is null and c.status = 'live'
  ),
  door_clicks as (
    select distinct user_id, props ->> 'door' as door from public.events
    where name = 'fake_door_clicked' and user_id is not null
  ),
  entry_readers as (
    select distinct user_id from public.events
    where name in ('course_page_viewed', 'career_entry_viewed') and user_id is not null
  ),
  career_readers as (
    select distinct user_id from public.events
    where name = 'career_entry_viewed' and user_id is not null
  )
  select jsonb_build_object(
    -- Test 1 supply
    'reviews_live', (select count(*) from own where status = 'live'),
    'reviews_pending', (select count(*) from own where status = 'pending_verification'),
    'reviews_concierge', (select count(*) from submitted where on_behalf_of_name is not null),
    'contributors', (select count(distinct author_id) from own),
    'bid_term', v_bid_term,
    'bid_courses_total', (select count(*) from bid_courses),
    'bid_courses_3plus', (
      select count(*) from bid_courses b join live_per_course l using (course_id) where l.n >= 3),
    'median_form_seconds', (
      select percentile_cont(0.5) within group (order by form_seconds)
      from own where form_seconds > 0),
    'form_starters', (
      select count(distinct user_id) from public.events
      where name = 'form_started' and props ->> 'entry_type' = 'course_review'),
    'form_submitters', (
      select count(distinct user_id) from public.events
      where name = 'entry_submitted' and props ->> 'entry_type' = 'course_review'),

    -- Test 1 outcome
    'pb_responses', (select count(*) from public.survey_responses where survey = 'post_bid'),
    'pb_changed', (
      select count(*) from public.survey_responses
      where survey = 'post_bid' and bid_effect = 'changed'
        and coalesce(cardinality(changed_course_ids), 0) >= 1),
    'pb_confirmed', (
      select count(*) from public.survey_responses where survey = 'post_bid' and bid_effect = 'confirmed'),
    'pb_no_effect', (
      select count(*) from public.survey_responses where survey = 'post_bid' and bid_effect = 'no_effect'),
    'pb_did_not_use', (
      select count(*) from public.survey_responses where survey = 'post_bid' and bid_effect = 'did_not_use'),
    'pb_seniors', (
      select coalesce(jsonb_object_agg(seniors_asked_band, n), '{}'::jsonb) from (
        select seniors_asked_band, count(*) as n from public.survey_responses
        where survey = 'post_bid' group by seniors_asked_band) s),

    -- Test 2 supply
    'career_entries', (select count(*) from careers),
    'playbooks', (select count(*) from careers where type = 'playbook'),
    'company_notes', (select count(*) from careers where type = 'company_note'),
    'tracks_covered', (select count(distinct track) from careers where type = 'playbook'),

    -- Test 2 outcome
    'cf_responses', (select count(*) from public.survey_responses where survey = 'career_followup'),
    'cf_named_action', (
      select count(*) from public.survey_responses
      where survey = 'career_followup' and career_action <> 'none'
        and char_length(btrim(coalesce(action_text, ''))) > 0),

    -- Both: follow-up questions
    'questions_total', (select count(*) from questions),
    'questions_due', (
      select count(*) from questions
      where first_reply_at is not null or created_at <= now() - interval '48 hours'),
    'questions_answered_48h', (
      select count(*) from questions
      where first_reply_at is not null and first_reply_at - created_at <= interval '48 hours'),
    'median_hours_to_answer', (
      select percentile_cont(0.5) within group (
        order by extract(epoch from first_reply_at - created_at) / 3600.0)
      from questions where first_reply_at is not null),

    -- Funnel
    'arrived', (select count(*) from signups),
    'readers_arrived', (select count(*) from readers),
    'value_courses', (select count(distinct user_id) from value_users where module = 'courses'),
    'value_career', (select count(distinct user_id) from value_users where module = 'career'),
    'value_any', (select count(distinct user_id) from value_users),
    'came_back', (select count(*) from returners),
    'readers_came_back', (select count(*) from readers join returners using (user_id)),
    'by_programme', (
      select coalesce(jsonb_object_agg(programme, row), '{}'::jsonb) from (
        select s.programme, jsonb_build_object(
          'arrived', count(*),
          'value_reached', count(*) filter (where exists (
            select 1 from value_users v where v.user_id = s.user_id)),
          'came_back', count(*) filter (where exists (
            select 1 from returners r where r.user_id = s.user_id))
        ) as row
        from signups s where s.programme is not null group by s.programme) p),

    -- PGP YL
    'yl_signups', (select count(*) from signups where programme = 'pgp_yl'),
    'yl_questions', (
      select count(*) from questions q
      join public.profiles asker on asker.id = q.author_id
      join public.course_reviews r on q.entry_type = 'course_review' and r.id = q.entry_id
      join public.profiles writer on writer.id = r.author_id
      where asker.programme = 'pgp_yl' and writer.cohort = v_cohort),

    -- Fake doors
    'entry_readers', (select count(*) from entry_readers),
    'chat_clickers', (select count(*) from door_clicks where door = 'request_chat'),
    'chat_contacts', (
      select count(*) from public.profiles where early_access_chat and deleted_at is null),
    'threads_long', (select count(*) from questions where replies >= 3),
    'career_readers', (select count(*) from career_readers),
    'people_clickers', (select count(*) from door_clicks where door = 'find_people'),
    'people_contacts', (
      select count(*) from public.profiles where early_access_people and deleted_at is null),

    -- A10: contributors from outside ISB who published
    'outside_contributors_published', (
      select count(distinct o.author_id) from own o
      join public.profiles p on p.id = o.author_id where p.account_type = 'contributor'),

    'computed_at', now()
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function public.app_setting(text) from public, anon;
revoke all on function public.first_career_view(uuid) from public, anon, authenticated;
revoke all on function public.survey_due(uuid, text, date) from public, anon, authenticated;
revoke all on function public.survey_due_users(text, date) from public, anon, authenticated;
revoke all on function public.my_survey_status() from public, anon;
revoke all on function public.i_may_answer(text) from public, anon;
revoke all on function public.metrics_snapshot() from public, anon;
revoke all on function public.set_days_since_first_view() from public, anon;
grant execute on function public.app_setting(text) to authenticated, service_role;
grant execute on function public.ist_date(timestamptz) to authenticated, service_role;
grant execute on function public.first_career_view(uuid) to service_role;
grant execute on function public.survey_due(uuid, text, date) to service_role;
grant execute on function public.survey_due_users(text, date) to service_role;
grant execute on function public.my_survey_status() to authenticated, service_role;
grant execute on function public.i_may_answer(text) to authenticated, service_role;
grant execute on function public.metrics_snapshot() to authenticated, service_role;
