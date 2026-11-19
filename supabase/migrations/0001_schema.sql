-- ISB Hood schema (docs/BUILD_PLAN.md, section 5.1).
-- Enumerated values are text + check constraints so they are easy to change.
-- Vocabularies (tracks, functions, industries) are validated in the app
-- (lib/constants/vocab.ts), not here, because they are still [confirm].

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  programme text check (programme in ('pgp', 'pgp_yl', 'alum')),
  cohort text,
  background_function text,
  background_industry text,
  years_experience_band text check (years_experience_band in ('0-2', '3-5', '6-8', '9+')),
  target_track text,
  role text not null default 'reader' check (role in ('reader', 'moderator')),
  -- Least privilege by default: the auth callback upgrades ISB-domain accounts
  -- to ('isb', 'not_required') with the service role after checking the domain.
  account_type text not null default 'contributor' check (account_type in ('isb', 'contributor')),
  verification_status text not null default 'pending'
    check (verification_status in ('not_required', 'pending', 'verified', 'rejected')),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  outreach_contact_id uuid,
  source text,
  notify_pref text not null default 'instant' check (notify_pref in ('instant', 'daily', 'off')),
  early_access_chat boolean not null default false,
  early_access_people boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ------------------------------------------------------ courses, offerings
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  area text,
  open_to_readers boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  professor text not null,
  term_label text not null,
  cohort_year text not null,
  is_current boolean not null default false,
  status text not null default 'approved' check (status in ('approved', 'pending')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index offerings_course_idx on public.offerings (course_id);
-- Exactly one current offering per course.
create unique index offerings_one_current_per_course
  on public.offerings (course_id) where is_current;

-- ---------------------------------------------------------- course_reviews
create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id),
  author_id uuid not null references public.profiles (id) on delete cascade,
  visibility text not null default 'named' check (visibility in ('named', 'anonymous')),
  open_to_questions boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'pending_verification', 'live', 'removed')),
  -- Concierge fallback: a moderator enters a review for a consenting senior.
  on_behalf_of_name text,
  on_behalf_of_cohort text,

  why_taken text[],
  workload_band text check (workload_band in ('0-2', '2-4', '4-6', '6+')),
  eval_participation smallint check (eval_participation between 0 and 100),
  eval_quizzes smallint check (eval_quizzes between 0 and 100),
  eval_individual smallint check (eval_individual between 0 and 100),
  eval_group smallint check (eval_group between 0 and 100),
  eval_midterm smallint check (eval_midterm between 0 and 100),
  eval_final smallint check (eval_final between 0 and 100),
  outline_gap text,
  quant_qual smallint check (quant_qual between 1 and 5),
  teaching_styles text[],
  grade_risk text check (grade_risk in ('low', 'medium', 'high')),
  grade_risk_reason text,
  learning_value smallint check (learning_value between 1 and 5),
  learning_value_reason text,
  careers_helped text[],
  who_should_take text,
  who_should_skip text,
  outline_match text check (outline_match in ('yes', 'partly', 'no')),

  form_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  unique (offering_id, author_id),

  -- Drafts may be incomplete. Anything past draft must satisfy the spec:
  -- every rating has a reason, the mix totals 100, star-only reviews cannot exist.
  constraint course_review_complete check (
    status = 'draft' or (
      coalesce(cardinality(why_taken), 0) >= 1
      and workload_band is not null
      and eval_participation + eval_quizzes + eval_individual
          + eval_group + eval_midterm + eval_final = 100
      and char_length(btrim(outline_gap)) >= 40
      and quant_qual is not null
      and coalesce(cardinality(teaching_styles), 0) >= 1
      and grade_risk is not null
      and char_length(btrim(grade_risk_reason)) >= 1
      and learning_value is not null
      and char_length(btrim(learning_value_reason)) >= 40
      and (char_length(btrim(coalesce(who_should_take, ''))) > 0
           or char_length(btrim(coalesce(who_should_skip, ''))) > 0)
      and outline_match is not null
    )
  )
);
create index course_reviews_offering_idx on public.course_reviews (offering_id) where status = 'live';
create index course_reviews_author_idx on public.course_reviews (author_id);

-- ---------------------------------------------------------- career_entries
create table public.career_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('playbook', 'company_note')),
  author_id uuid not null references public.profiles (id) on delete cascade,
  visibility text not null default 'named' check (visibility in ('named', 'anonymous')),
  open_to_questions boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'pending_verification', 'live', 'removed')),
  on_behalf_of_name text,
  on_behalf_of_cohort text,
  -- Filterable columns; the rest of the entry lives in body, validated by zod.
  track text,
  company text,
  from_function text,
  from_industry text,
  from_years_band text,
  body jsonb not null default '{}'::jsonb,
  form_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint career_entry_complete check (
    status = 'draft'
    or (type = 'playbook' and track is not null and from_function is not null)
    or (type = 'company_note' and company is not null)
  )
);
create index career_entries_track_idx on public.career_entries (track) where status = 'live';
create index career_entries_author_idx on public.career_entries (author_id);

create table public.career_entry_courses (
  entry_id uuid not null references public.career_entries (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  primary key (entry_id, course_id)
);

-- ---------------------------------------------------------------- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('course_review', 'career_entry')),
  entry_id uuid not null,
  parent_id uuid references public.comments (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  status text not null default 'live' check (status in ('live', 'removed')),
  created_at timestamptz not null default now(),
  -- Set on a question when the entry's author first replies.
  first_reply_at timestamptz
);
create index comments_entry_idx on public.comments (entry_type, entry_id);

-- ------------------------------------------------------------------- flags
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('course_review', 'career_entry', 'comment')),
  target_id uuid not null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  auto boolean not null default false,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  resolution text check (resolution in ('kept', 'removed', 'edit_requested')),
  created_at timestamptz not null default now()
);
create index flags_open_idx on public.flags (created_at) where resolved_at is null;

-- -------------------------------------------------------- survey_responses
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  survey text not null check (survey in ('post_bid', 'career_followup')),
  bid_effect text check (bid_effect in ('changed', 'confirmed', 'no_effect', 'did_not_use')),
  changed_course_ids uuid[],
  career_action text check (career_action in
    ('applied_firm', 'skipped_firm', 'changed_prep', 'chose_offer', 'contacted_author', 'none')),
  action_text text,
  seniors_asked_band text check (seniors_asked_band in ('0', '1-2', '3-5', '6+')),
  days_since_first_view integer,
  created_at timestamptz not null default now(),
  unique (user_id, survey)
);

-- ------------------------------------------------------------------ events
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);
create index events_name_time_idx on public.events (name, created_at);
create index events_user_name_idx on public.events (user_id, name);

-- ------------------------------------------- outreach, settings, email log
create table public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cohort text,
  email text,
  asked_course_ids uuid[],
  campaign text,
  claimed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.profiles
  add constraint profiles_outreach_contact_fk
  foreign key (outreach_contact_id) references public.outreach_contacts (id) on delete set null;

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null,
  ref_id uuid,
  provider_id text,
  sent_at timestamptz not null default now()
);
create index email_log_user_kind_idx on public.email_log (user_id, kind, sent_at);
