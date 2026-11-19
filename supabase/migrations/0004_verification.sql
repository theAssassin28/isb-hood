-- M1: verification links a contributor to the outreach list, and a verified
-- contributor can no longer change the identity that was verified.

drop function public.verify_contributor(uuid, boolean);

create function public.verify_contributor(
  target uuid,
  approve boolean default true,
  contact uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can verify contributors';
  end if;

  update public.profiles
    set verification_status = case when approve then 'verified' else 'rejected' end,
        verified_by = auth.uid(),
        verified_at = now(),
        outreach_contact_id = coalesce(contact, outreach_contact_id)
    where id = target and account_type = 'contributor';

  if approve then
    if contact is not null then
      update public.outreach_contacts set claimed_by = target where id = contact;
    end if;
    update public.course_reviews set status = 'live'
      where author_id = target and status = 'pending_verification';
    update public.career_entries set status = 'live'
      where author_id = target and status = 'pending_verification';
  end if;
end;
$$;

revoke all on function public.verify_contributor(uuid, boolean, uuid) from public, anon;
grant execute on function public.verify_contributor(uuid, boolean, uuid) to authenticated, service_role;

-- The "Verified Co'XX" badge rests on the name and cohort a moderator checked.
create function public.lock_verified_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.is_moderator()
     and old.account_type = 'contributor'
     and old.verification_status = 'verified'
     and (new.full_name, new.cohort, new.programme)
         is distinct from (old.full_name, old.cohort, old.programme)
  then
    raise exception 'Name, programme and cohort are locked after verification. Ask a moderator to change them.';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_verified_identity
  before update on public.profiles
  for each row execute function public.lock_verified_identity();

revoke all on function public.lock_verified_identity() from public, anon;
