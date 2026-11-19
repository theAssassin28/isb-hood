-- M4: comments, flags, moderation, account deletion (docs/BUILD_PLAN.md 4.7, 4.10, 5.3, 6.6).

-- ------------------------------------------------------------- comments
alter table public.comments
  add constraint comments_body_length check (char_length(body) <= 2000);

-- May the signed-in user post this comment? A question needs a live entry that
-- is open to questions; a reply needs a live question on the same entry.
-- Two levels only: a reply to a reply is refused.
create function public.can_comment(p_entry_type text, p_entry_id uuid, p_parent_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_read()
    and case p_entry_type
      when 'course_review' then exists (
        select 1 from public.course_reviews r
        join public.offerings o on o.id = r.offering_id
        where r.id = p_entry_id and r.status = 'live' and o.status = 'approved'
          and (p_parent_id is not null or r.open_to_questions))
      when 'career_entry' then exists (
        select 1 from public.career_entries e
        where e.id = p_entry_id and e.status = 'live'
          and (p_parent_id is not null or e.open_to_questions))
      else false
    end
    and (
      p_parent_id is null or exists (
        select 1 from public.comments q
        where q.id = p_parent_id and q.parent_id is null and q.status = 'live'
          and q.entry_type = p_entry_type and q.entry_id = p_entry_id)
    );
$$;

drop policy comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'live'
    and first_reply_at is null
    and public.can_comment(entry_type, entry_id, parent_id)
  );

-- Deleting a question would take other people's replies with it, so a
-- question that has replies keeps its row and loses its text.
create function public.delete_my_comment(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.comments where id = target;
  if v_author is null or v_author <> auth.uid() then
    raise exception 'Comment not found';
  end if;
  if exists (select 1 from public.comments where parent_id = target) then
    update public.comments set body = 'This comment was deleted by its author.' where id = target;
  else
    delete from public.comments where id = target;
  end if;
end;
$$;

drop policy comments_delete_own on public.comments;
revoke delete on public.comments from authenticated;

-- Readers see "Former member" for someone who deleted their account.
create or replace view public.comments_public as
select
  c.id, c.entry_type, c.entry_id, c.parent_id, c.body, c.created_at, c.first_reply_at,
  x.is_entry_author,
  case when x.hide_identity or p.deleted_at is not null then null else c.author_id end as author_id,
  case when x.hide_identity then 'Author'
       when p.deleted_at is not null then 'Former member'
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

-- ---------------------------------------------------------------- flags
alter table public.flags
  add constraint flags_reason_length check (char_length(reason) between 1 and 500);

-- One open flag per person per item: a second tap does not stack the queue.
create unique index flags_one_open_per_reporter
  on public.flags (reporter_id, target_type, target_id)
  where resolved_at is null and reporter_id is not null;

-- Resolve every open flag on an item at once; "removed" also hides the item.
create function public.resolve_flags(p_target_type text, p_target_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can resolve flags';
  end if;
  if p_resolution not in ('kept', 'removed', 'edit_requested') then
    raise exception 'Unknown resolution %', p_resolution;
  end if;

  if p_resolution = 'removed' then
    if p_target_type = 'course_review' then
      update public.course_reviews set status = 'removed' where id = p_target_id;
    elsif p_target_type = 'career_entry' then
      update public.career_entries set status = 'removed' where id = p_target_id;
    elsif p_target_type = 'comment' then
      update public.comments set status = 'removed' where id = p_target_id;
    end if;
  end if;

  update public.flags
    set resolved_by = auth.uid(), resolved_at = now(), resolution = p_resolution
    where target_type = p_target_type and target_id = p_target_id and resolved_at is null;
end;
$$;

-- ------------------------------------------------------ account deletion
-- The identity lock (0004) must not stop someone deleting their account.
create or replace function public.lock_verified_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.is_moderator()
     and old.account_type = 'contributor'
     and old.verification_status = 'verified'
     and old.deleted_at is null
     and new.deleted_at is null
     and (new.full_name, new.cohort, new.programme)
         is distinct from (old.full_name, old.cohort, old.programme)
  then
    raise exception 'Name, programme and cohort are locked after verification. Ask a moderator to change them.';
  end if;
  return new;
end;
$$;

-- Deletes the signed-in person's entries, blanks their comments (rows stay so
-- threads do not break) and scrubs their profile. Events and survey answers
-- stay, tied to an id that no longer names anyone (plan 5.3).
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.career_entries where author_id = uid;
  delete from public.course_reviews where author_id = uid;
  update public.comments set body = 'This comment was deleted by its author.' where author_id = uid;
  update public.flags set reporter_id = null where reporter_id = uid;
  update public.outreach_contacts set claimed_by = null where claimed_by = uid;
  update public.offerings set created_by = null where created_by = uid;

  update public.profiles set
    email = 'deleted-' || uid || '@deleted.invalid',
    full_name = null,
    programme = null,
    cohort = null,
    background_function = null,
    background_industry = null,
    years_experience_band = null,
    target_track = null,
    source = null,
    notify_pref = 'off',
    early_access_chat = false,
    early_access_people = false,
    deleted_at = now()
  where id = uid;
end;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function public.can_comment(text, uuid, uuid) from public, anon;
revoke all on function public.delete_my_comment(uuid) from public, anon;
revoke all on function public.resolve_flags(text, uuid, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.can_comment(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.delete_my_comment(uuid) to authenticated, service_role;
grant execute on function public.resolve_flags(text, uuid, text) to authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated, service_role;
grant select on public.comments_public to authenticated;
