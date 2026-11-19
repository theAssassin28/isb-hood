-- Access model (docs/BUILD_PLAN.md, sections 3 and 5.3).
--
-- 1. RLS is on for every table.
-- 2. `authenticated` cannot read other people's rows in course_reviews,
--    career_entries, comments or profiles. Readers go through the *_public
--    views, which never return an author's identity for anonymous entries.
-- 3. Status transitions (live vs pending_verification) are enforced in the
--    database, so a client cannot publish around verification.

-- ------------------------------------------------------------ helper funcs
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'moderator' and deleted_at is null
  );
$$;

-- May this account publish straight to live? (ISB account, or verified contributor.)
create or replace function public.can_publish(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and deleted_at is null
      and (account_type = 'isb' or verification_status = 'verified')
  );
$$;

-- May the current user read other people's content?
create or replace function public.can_read()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and deleted_at is null
      and profile_completed_at is not null
      and (account_type = 'isb' or verification_status = 'verified')
  );
$$;

-- --------------------------------------------------------------- triggers
-- A profile row for every auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Entry status rules for ordinary users (moderators and the service role are exempt):
--   draft stays draft; anything else becomes live or pending_verification
--   depending on the author; only moderators can remove or restore.
create or replace function public.enforce_entry_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();

  if auth.uid() is not null and not public.is_moderator() then
    if tg_op = 'UPDATE' and old.status = 'removed' then
      raise exception 'This entry was removed by a moderator and cannot be changed';
    end if;
    if new.status = 'removed' then
      raise exception 'Only moderators can mark an entry removed; delete it instead';
    end if;
    if new.on_behalf_of_name is not null or new.on_behalf_of_cohort is not null then
      raise exception 'Only moderators can enter an entry on behalf of someone';
    end if;
    if new.status <> 'draft' then
      new.status := case when public.can_publish(new.author_id)
                         then 'live' else 'pending_verification' end;
    end if;
  end if;

  if new.status = 'live' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger course_reviews_status before insert or update on public.course_reviews
  for each row execute function public.enforce_entry_status();
create trigger career_entries_status before insert or update on public.career_entries
  for each row execute function public.enforce_entry_status();

-- When the entry's author first replies to a question, stamp the question.
create or replace function public.stamp_first_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  entry_author uuid;
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.entry_type = 'course_review' then
    select author_id into entry_author from public.course_reviews where id = new.entry_id;
  else
    select author_id into entry_author from public.career_entries where id = new.entry_id;
  end if;
  if entry_author = new.author_id then
    update public.comments
      set first_reply_at = new.created_at
      where id = new.parent_id and first_reply_at is null;
  end if;
  return new;
end;
$$;
create trigger comments_first_reply after insert on public.comments
  for each row execute function public.stamp_first_reply();

-- Moderator verifies (or rejects) a contributor; verification publishes
-- everything they have waiting.
create or replace function public.verify_contributor(target uuid, approve boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can verify contributors';
  end if;
  update public.profiles
    set verification_status = case when approve then 'verified' else 'rejected' end,
        verified_by = auth.uid(),
        verified_at = now()
    where id = target and account_type = 'contributor';
  if approve then
    update public.course_reviews set status = 'live'
      where author_id = target and status = 'pending_verification';
    update public.career_entries set status = 'live'
      where author_id = target and status = 'pending_verification';
  end if;
end;
$$;

-- ----------------------------------------------------------- public views
-- These views run with the owner's rights (not security_invoker) on purpose:
-- they are the only way a reader sees another person's entry, and they decide
-- what identity is exposed.
create view public.course_reviews_public as
select
  r.id, r.offering_id, o.course_id, o.professor, o.term_label, o.cohort_year,
  r.visibility, r.open_to_questions,
  r.why_taken, r.workload_band,
  r.eval_participation, r.eval_quizzes, r.eval_individual,
  r.eval_group, r.eval_midterm, r.eval_final,
  r.outline_gap, r.quant_qual, r.teaching_styles,
  r.grade_risk, r.grade_risk_reason, r.learning_value, r.learning_value_reason,
  r.careers_helped, r.who_should_take, r.who_should_skip, r.outline_match,
  r.published_at, r.updated_at,
  (r.updated_at > r.published_at + interval '1 minute') as is_edited,
  case when r.visibility = 'named' and r.on_behalf_of_name is null then r.author_id end as author_id,
  case
    when r.on_behalf_of_name is not null and r.visibility = 'named'
      then r.on_behalf_of_name || ', ' || coalesce(r.on_behalf_of_cohort, 'alum')
    when r.visibility = 'named'
      then coalesce(p.full_name, 'ISB student') || ', ' || coalesce(p.cohort, '')
    else 'Verified ' || coalesce(r.on_behalf_of_cohort, p.cohort, 'ISB') || ' student'
  end as author_display,
  coalesce(r.on_behalf_of_cohort, p.cohort) as author_cohort,
  (r.on_behalf_of_name is not null) as entered_by_team,
  (r.author_id = auth.uid()) as is_mine
from public.course_reviews r
join public.offerings o on o.id = r.offering_id
join public.profiles p on p.id = r.author_id
where r.status = 'live' and public.can_read();

create view public.career_entries_public as
select
  e.id, e.type, e.visibility, e.open_to_questions,
  e.track, e.company, e.from_function, e.from_industry, e.from_years_band,
  e.body, e.published_at, e.updated_at,
  (e.updated_at > e.published_at + interval '1 minute') as is_edited,
  case when e.visibility = 'named' and e.on_behalf_of_name is null then e.author_id end as author_id,
  case
    when e.on_behalf_of_name is not null and e.visibility = 'named'
      then e.on_behalf_of_name || ', ' || coalesce(e.on_behalf_of_cohort, 'alum')
    when e.visibility = 'named'
      then coalesce(p.full_name, 'ISB student') || ', ' || coalesce(p.cohort, '')
    else 'Verified ' || coalesce(e.on_behalf_of_cohort, p.cohort, 'ISB') || ' student'
  end as author_display,
  coalesce(e.on_behalf_of_cohort, p.cohort) as author_cohort,
  -- Company notes have no "from"; match on the author's own background (plan 6.3).
  coalesce(e.from_function, p.background_function) as match_function,
  coalesce(e.from_industry, p.background_industry) as match_industry,
  (e.on_behalf_of_name is not null) as entered_by_team,
  (e.author_id = auth.uid()) as is_mine
from public.career_entries e
join public.profiles p on p.id = e.author_id
where e.status = 'live' and public.can_read();

create view public.comments_public as
select
  c.id, c.entry_type, c.entry_id, c.parent_id, c.body, c.created_at, c.first_reply_at,
  x.is_entry_author,
  case when x.hide_identity then null else c.author_id end as author_id,
  case when x.hide_identity then 'Author'
       else coalesce(p.full_name, 'ISB student') || ', ' || coalesce(p.cohort, '') end as author_display,
  (c.author_id = auth.uid()) as is_mine
from public.comments c
join public.profiles p on p.id = c.author_id
left join public.course_reviews r on c.entry_type = 'course_review' and r.id = c.entry_id
left join public.career_entries e on c.entry_type = 'career_entry' and e.id = c.entry_id
cross join lateral (
  select
    (c.author_id = coalesce(r.author_id, e.author_id)) as is_entry_author,
    (c.author_id = coalesce(r.author_id, e.author_id)
      and coalesce(r.visibility, e.visibility) = 'anonymous') as hide_identity
) x
where c.status = 'live'
  and coalesce(r.status, e.status) = 'live'
  and public.can_read();

-- -------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.offerings enable row level security;
alter table public.course_reviews enable row level security;
alter table public.career_entries enable row level security;
alter table public.career_entry_courses enable row level security;
alter table public.comments enable row level security;
alter table public.flags enable row level security;
alter table public.survey_responses enable row level security;
alter table public.events enable row level security;
alter table public.outreach_contacts enable row level security;
alter table public.app_settings enable row level security;
alter table public.email_log enable row level security;

-- profiles: own row, or moderator.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_moderator());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_moderator on public.profiles for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- courses and offerings: the catalogue is not sensitive; contributors need it to write.
create policy courses_select on public.courses for select to authenticated using (true);
create policy courses_moderator on public.courses for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy offerings_select on public.offerings for select to authenticated
  using (status = 'approved' or created_by = auth.uid() or public.is_moderator());
create policy offerings_propose on public.offerings for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending' and not is_current);
create policy offerings_moderator on public.offerings for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- entries: direct access to own rows only; everyone else uses the views.
create policy reviews_own on public.course_reviews for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy reviews_moderator on public.course_reviews for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy entries_own on public.career_entries for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy entries_moderator on public.career_entries for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy entry_courses_own on public.career_entry_courses for all to authenticated
  using (exists (select 1 from public.career_entries e where e.id = entry_id and e.author_id = auth.uid()))
  with check (exists (select 1 from public.career_entries e where e.id = entry_id and e.author_id = auth.uid()));
create policy entry_courses_read on public.career_entry_courses for select to authenticated
  using (public.can_read());

-- comments: write own (readers only), read own; everyone else uses comments_public.
create policy comments_select_own on public.comments for select to authenticated
  using (author_id = auth.uid() or public.is_moderator());
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and status = 'live' and public.can_read());
create policy comments_delete_own on public.comments for delete to authenticated
  using (author_id = auth.uid());
create policy comments_moderator on public.comments for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- flags: any reader can raise one; moderators resolve.
create policy flags_insert on public.flags for insert to authenticated
  with check (reporter_id = auth.uid() and resolved_at is null and public.can_read());
create policy flags_select on public.flags for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy flags_moderator on public.flags for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- surveys: own response.
create policy surveys_insert on public.survey_responses for insert to authenticated
  with check (user_id = auth.uid());
create policy surveys_select on public.survey_responses for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- events: append-only for the acting user; only moderators read.
create policy events_insert on public.events for insert to authenticated
  with check (user_id = auth.uid());
create policy events_select on public.events for select to authenticated
  using (public.is_moderator());

-- outreach list: moderators only. Settings: everyone reads gates, moderators write.
create policy outreach_moderator on public.outreach_contacts for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy settings_select on public.app_settings for select to authenticated using (true);
create policy settings_moderator on public.app_settings for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- email_log: no policies; service role only.

-- ----------------------------------------------------------------- grants
-- Start from nothing, then grant exactly what the policies above expect.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, public;

grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;

grant select on public.profiles to authenticated;
-- Users may edit their own profile fields, never role, account type or verification.
grant update (full_name, programme, cohort, background_function, background_industry,
              years_experience_band, target_track, source, notify_pref,
              early_access_chat, early_access_people, profile_completed_at)
  on public.profiles to authenticated;

grant select on public.courses, public.offerings, public.app_settings to authenticated;
grant insert on public.offerings to authenticated;
grant select, insert, update, delete on public.course_reviews, public.career_entries,
  public.career_entry_courses to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert on public.flags, public.survey_responses to authenticated;
grant insert on public.events to authenticated;
grant select on public.course_reviews_public, public.career_entries_public,
  public.comments_public to authenticated;

-- Moderator writes go through the same role; RLS limits them to moderators.
grant insert, update, delete on public.courses to authenticated;
grant update, delete on public.offerings to authenticated;
grant update on public.comments, public.flags to authenticated;
grant select, insert, update, delete on public.outreach_contacts to authenticated;
grant insert, update on public.app_settings to authenticated;
grant select on public.events to authenticated;
