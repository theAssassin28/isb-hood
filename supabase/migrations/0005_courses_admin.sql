-- M2: review form and course administration.

-- 1. One review per person per offering, except entries a moderator enters on
--    behalf of seniors (concierge fallback), which share the moderator's id.
alter table public.course_reviews
  drop constraint course_reviews_offering_id_author_id_key;
create unique index course_reviews_one_per_author
  on public.course_reviews (offering_id, author_id)
  where on_behalf_of_name is null;

-- 2. A contributor can propose a professor or term that is not listed. Reviews
--    on a proposed offering stay hidden from readers until a moderator approves it.
create or replace view public.course_reviews_public as
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
where r.status = 'live' and o.status = 'approved' and public.can_read();

-- 3. Course and offering import. One row per offering:
--    { code, title, area, professor, term, cohort, current }
--    Atomic, so a bad file changes nothing.
create function public.admin_import_courses(rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  v_course uuid;
  v_offering uuid;
  n_courses int := 0;
  n_offerings int := 0;
  was_new boolean;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can import courses';
  end if;

  for r in select * from jsonb_array_elements(rows) loop
    insert into public.courses (code, title, area)
    values (btrim(r ->> 'code'), btrim(r ->> 'title'), nullif(btrim(coalesce(r ->> 'area', '')), ''))
    on conflict (code) do update
      set title = excluded.title, area = coalesce(excluded.area, public.courses.area)
    returning id, (xmax = 0) into v_course, was_new;
    if was_new then n_courses := n_courses + 1; end if;

    if nullif(btrim(coalesce(r ->> 'professor', '')), '') is null then
      continue;
    end if;

    select id into v_offering from public.offerings
      where course_id = v_course
        and lower(btrim(professor)) = lower(btrim(r ->> 'professor'))
        and term_label = btrim(r ->> 'term')
        and cohort_year = btrim(r ->> 'cohort');

    if v_offering is null then
      insert into public.offerings (course_id, professor, term_label, cohort_year, status, created_by)
      values (v_course, btrim(r ->> 'professor'), btrim(r ->> 'term'), btrim(r ->> 'cohort'),
              'approved', auth.uid())
      returning id into v_offering;
      n_offerings := n_offerings + 1;
    else
      update public.offerings set status = 'approved' where id = v_offering and status <> 'approved';
    end if;

    if coalesce((r ->> 'current')::boolean, false) then
      update public.offerings set is_current = false
        where course_id = v_course and is_current and id <> v_offering;
      update public.offerings set is_current = true where id = v_offering;
    end if;
  end loop;

  return jsonb_build_object('courses', n_courses, 'offerings', n_offerings);
end;
$$;

create function public.set_current_offering(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_course uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can change the current offering';
  end if;
  select course_id into v_course from public.offerings where id = target and status = 'approved';
  if v_course is null then
    raise exception 'Offering not found or not approved';
  end if;
  update public.offerings set is_current = false
    where course_id = v_course and is_current and id <> target;
  update public.offerings set is_current = true where id = target;
end;
$$;

-- 4. Outreach list import. One row per person asked:
--    { name, cohort, email, course_code, campaign }
--    The same person asked about several courses becomes one contact.
create function public.admin_import_outreach(rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  v_contact uuid;
  v_course uuid;
  n_new int := 0;
  n_unknown_courses int := 0;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can import the outreach list';
  end if;

  for r in select * from jsonb_array_elements(rows) loop
    select id into v_contact from public.outreach_contacts
      where lower(btrim(full_name)) = lower(btrim(r ->> 'name'))
        and coalesce(cohort, '') = coalesce(nullif(btrim(coalesce(r ->> 'cohort', '')), ''), '');

    if v_contact is null then
      insert into public.outreach_contacts (full_name, cohort, email, campaign)
      values (btrim(r ->> 'name'),
              nullif(btrim(coalesce(r ->> 'cohort', '')), ''),
              nullif(lower(btrim(coalesce(r ->> 'email', ''))), ''),
              nullif(btrim(coalesce(r ->> 'campaign', '')), ''))
      returning id into v_contact;
      n_new := n_new + 1;
    else
      update public.outreach_contacts
        set email = coalesce(email, nullif(lower(btrim(coalesce(r ->> 'email', ''))), '')),
            campaign = coalesce(campaign, nullif(btrim(coalesce(r ->> 'campaign', '')), ''))
        where id = v_contact;
    end if;

    if nullif(btrim(coalesce(r ->> 'course_code', '')), '') is not null then
      select id into v_course from public.courses
        where lower(code) = lower(btrim(r ->> 'course_code'));
      if v_course is null then
        n_unknown_courses := n_unknown_courses + 1;
      else
        update public.outreach_contacts
          set asked_course_ids = array(
            select distinct x from unnest(coalesce(asked_course_ids, '{}') || v_course) as x)
          where id = v_contact;
      end if;
    end if;
  end loop;

  return jsonb_build_object('contacts', n_new, 'unknown_courses', n_unknown_courses);
end;
$$;

revoke all on function public.admin_import_courses(jsonb) from public, anon;
revoke all on function public.set_current_offering(uuid) from public, anon;
revoke all on function public.admin_import_outreach(jsonb) from public, anon;
grant execute on function public.admin_import_courses(jsonb) to authenticated, service_role;
grant execute on function public.set_current_offering(uuid) to authenticated, service_role;
grant execute on function public.admin_import_outreach(jsonb) to authenticated, service_role;
