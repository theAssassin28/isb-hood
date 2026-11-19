-- Make team members moderators. Each person must have signed in once first
-- (that creates their profile). Replace the placeholder addresses, then run
-- in the Supabase SQL editor.

update public.profiles
set role = 'moderator'
where email in (
  'member1@isb.edu',
  'member2@isb.edu'
);
