# ISB Hood MVP: Build Plan

**Status:** ready to hand off · **Written:** 15 Nov 2026 · **Owner:** Group 12, SWPM (Shivam Singh)
**Build window:** 16 Nov to 6 Dec 2026 (Test 1), plus about 1 day between 7 and 20 Dec (Test 2)
**Hard deadline that cannot move:** Term 7 bidding, 4 to 10 Jan 2027

This plan turns three source documents into buildable work. Where they disagree, the order of authority is:

1. `docs/source/ISB_Hood_MVP_Requirements.docx` (v0.2, the spec; text in `docs/source/extracted/mvp_requirements.txt`)
2. `docs/source/ISB_Hood_Solution_MVP_Prioritization_deck.pptx` (hypotheses, pass lines, prioritisation; text in `extracted/deck_slides.txt`)
3. `docs/source/ISB_Hood_Product_Note.pdf` (original vision; broader than the MVP)

Anything marked **[decision]** is a choice this plan makes that the sources leave open. Anything marked **[confirm]** needs a fact or a team call before the milestone that depends on it; each has a safe default so the build never blocks.

---

## 1. What we are building, in one page

ISB Hood passes what one ISB batch learns about courses and careers to the next. The MVP is **an experiment, not a small product**. It runs one loop, **write a structured entry → read it → ask the author**, as two tests:

|              | Test 1: Courses (primary)                                                          | Test 2: Career (a week later)                                    |
| ------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Belief       | Alumni and seniors write course reviews; Co'27 changes a Term 7 bid because of one | People who made a career move write it down; a reader acts on it |
| Writers      | Co'26/Co'25 alumni, Co'27 for finished courses                                     | Co'27 and Co'26                                                  |
| Readers      | Co'27 (Term 7 bids), PGP YL                                                        | Co'27 in placements, PGP YL                                      |
| Supply pass  | 40+ reviews from 20+ people; 10+ Term 7 courses with 3+ reviews, by 3 Jan 2027     | 10+ entries: 5+ playbooks across 3+ tracks, 5+ company notes     |
| Outcome pass | 20%+ of 30+ survey responses name a bid they changed                               | 30%+ of 20+ responses name an action taken                       |
| Both         | 70%+ of comment questions answered within 48 hours                                 |                                                                  |

**The riskiest belief is supply (A1).** So the contributor path (outreach link → sign in → 5-minute form → published) gets the most polish. A beautiful reader experience with an 8-minute form fails the experiment.

**What "done" means for the build:** a stranger on a phone, arriving from a WhatsApp link, can (a) write a course review in about 5 minutes, or (b) read a course page and ask the author a question, with no help; and every number in section 9 of the requirements can be read off a metrics page without touching raw data.

### Scope fence

| In (P0)                                                                                                                                                                                                                    | Fake door only                                   | Out, do not build                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 course review form · F2 course page with summary · F3 playbook and company note · F4 career filter and "Like me" · F5 comments with email alert · F6 sign-in and profile · F7 events and two surveys · moderation queue | F8a "Request a chat" · F9a "Find people like me" | Places, food, events · procedures/first-term guide · AI summary or recommendations · private chat · people finder · mobile app, push · salary or offer amounts · admin feedback channel · Mohali campus |

The product note lists places, procedures and events as coverage areas. Research demoted them (mild or early-term pain). They are non-goals; do not leave stubs for them in navigation.

---

## 2. Stack and architecture

**[decision]** Claude Code build (not Lovable), because the anonymity and verification rules need server-side control that is easier to get right in code we own.

| Layer      | Choice                                                                             | Why                                                               |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| App        | Next.js (App Router, TypeScript, server components + server actions)               | One codebase, server-side data access, fast on phones             |
| UI         | Tailwind + shadcn/ui, mobile-first                                                 | Quick, accessible forms                                           |
| DB + auth  | Supabase (Postgres, sign-in by emailed 6-digit code, Row Level Security)           | Named in the requirements; hosted auth                            |
| Email      | Gmail SMTP through Nodemailer, from a dedicated Gmail account with an app password | Free and needs no domain; comment alerts within 5 minutes         |
| Analytics  | Own `events` table (source of truth) + PostHog free tier (funnels, session views)  | Pass lines must be computable in SQL, joined to users and surveys |
| Hosting    | Vercel Hobby on the free `*.vercel.app` address, with one daily Vercel Cron        | Free; zero ops                                                    |
| Validation | zod schemas shared by form and server action                                       | One definition per content type                                   |
| Tests      | Vitest (aggregation, rules), Playwright (core loop on a phone viewport)            |                                                                   |

### Free tiers only

**Requirement (15 Nov):** the app runs on free plans wherever possible. Nothing in the MVP needs a paid plan. Limits below are from memory of each provider's free plan: check the current pricing page when creating each account.

| Service       | Free plan constraint                                                                                                               | How the build works within it                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel Hobby  | Personal, non-commercial use; cron jobs run at most once a day                                                                     | One daily cron does everything scheduled: digest emails, survey nudges, moderator reminder, keep-alive. Comment alerts are sent inline, not by cron                                                                                  |
| Supabase Free | Two projects; small database; project pauses after about a week without activity; no automatic backups                             | One project for production, local PGlite for tests (no second cloud project needed). The daily cron touches the database so it never pauses. A scheduled GitHub Actions job runs `pg_dump` and stores the dump as a private artifact |
| Gmail SMTP    | About 500 recipients a day; needs 2-step verification and an app password; a college Workspace account may not allow app passwords | Create a new personal Gmail for the project. 500 a day is far above what 400 students can generate. If it is ever hit, queue the rest for the digest                                                                                 |
| PostHog Free  | Monthly event allowance far above our volume                                                                                       | Mirror only the spec events; the `events` table stays the source of truth                                                                                                                                                            |
| GitHub        | Free Actions minutes are limited on private repos                                                                                  | CI runs in about a minute; fine                                                                                                                                                                                                      |
| Google OAuth  | Free. An "External" app left in "Testing" only admits listed test users                                                            | Set the consent screen to "In production"; only email and profile scopes are requested, so no Google review is needed                                                                                                                |
| Domain        | A custom domain costs money                                                                                                        | Use `isb-hood.vercel.app` (or the nearest free name). Not needed for Gmail SMTP                                                                                                                                                      |

Do not add a paid dependency without asking first. If something appears to need one (custom email domain, more frequent cron, larger database), write the constraint in `KNOWN_DEBT.md` and design around it.

Use current stable versions; check each library's docs at build time rather than assuming an API.

### Architecture rules (non-negotiable)

1. **All reads and writes go through the server.** Server components and server actions use the Supabase server client. The browser never queries entry tables directly.
2. **Author identity never reaches the client for anonymous entries.** Not in HTML, not in JSON, not in an ID that can be joined. See 5.3.
3. **RLS is on for every table** as a second line of defence, even though access is server-mediated.
4. **Every event is written server-side** to `events` in the same code path as the action it describes, then mirrored to PostHog. Client-only tracking is not acceptable for outcome events.
5. **Calendar-day logic uses Asia/Kolkata.**
6. **Dates and gates live in an `app_settings` table**, not in code (bid window, survey windows, which modules are open to which programme).

### Repository layout

```
isb-hood/
  app/
    (public)/            sign-in, contributor landing, content rules, privacy
    (app)/               authenticated shell
      page.tsx           Home
      courses/           list, [courseId] page
      careers/           list, [entryId] page
      write/             chooser, course-review, playbook, company-note
      me/                My activity, profile, notification prefs, delete account
      admin/             moderation, verification, courses+offerings, outreach, metrics, settings
    api/                 auth callback, cron (digest, survey nudges), email reply links
  lib/
    db/                  typed queries, one file per entity
    domain/              aggregation.ts, agreement.ts, likeMe.ts, events.ts, gates.ts
    schemas/             zod: courseReview, playbook, companyNote, profile, survey
    email/               templates + send
  supabase/
    migrations/          SQL, including RLS and views
    seed/                courses.csv, offerings.csv, outreach.csv, vocab
  tests/                 unit/, e2e/
  docs/                  this plan, source documents, KNOWN_DEBT.md, RUNBOOK.md
```

---

## 3. Users, roles and access

**Update (20 Nov):** sign-in is a 6-digit code emailed to the address the person types, not Google. ISB uses Microsoft Outlook and no Microsoft (Entra ID) app will be registered, so the only check is the `@isb.edu` domain (setting `allowed_reader_domains`). A code rather than a link, because Outlook's link scanner opens links before the person does. Where this section says Google, read "emailed code". Runbook step 5 has the Supabase settings.

| Who                                                         | Signs in with                         | Can read                                                            | Can write                                                    | Notes                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Reader (PGP Co'27, PGP YL)                                  | Emailed code to an `@isb.edu` address | Everything open to their programme                                  | Reviews, entries, comments, flags                            | Entries publish immediately                                                                                             |
| Contributor from outreach link (alumni, mostly Co'26/Co'25) | Emailed code to any address           | **Only their own entries until verified**; everything once verified | Reviews, entries; comments once verified                     | Entries stay `pending_verification` until a moderator matches the name to the outreach list, then show "Verified Co'XX" |
| Moderator (Group 12)                                        | Emailed code to an `@isb.edu` address | Everything, including real author names                             | Resolve flags, verify contributors, manage courses, settings | `role = moderator` set by seed/SQL                                                                                      |

**[decision]** An unverified non-ISB account sees nothing but its own drafts and a "thanks, we're verifying you" page. Otherwise the contributor link becomes a way round the ISB-only reader gate.

**Domain restriction.** Google's `hd` parameter is only a hint. Enforce on the server in the auth callback: allow if the email domain is in `ALLOWED_READER_DOMAINS` (default `isb.edu`; **[confirm]** the exact domain(s) for PGP and PGP YL students), else treat as a contributor only if the session started from a contributor link, else reject with a friendly page that links to the contributor route.

**Outreach links. [decision]** Campaign-level links, not per-person tokens: `/contribute?src=<campaign>&course=<courseId>`. Easier to paste into WhatsApp groups; verification is a manual name match against `outreach_contacts`. Per-person tokens are known debt.

**A10 fallback is already the design:** contributors can use any Google account from day one, so "5 of 5 alumni publish" is a test of the flow, not of ISB email access.

---

## 4. Screens and flows

Every screen has a loading, empty and error state. Layout target: 360 px wide phone first; desktop is the same column, wider. **Visual system (updated 17 Nov):** a blend of two Godly Templates designs (previews in `docs/design-previews/`). From Stella: the colours (near-black page `#0c0c0c`, `#141414` surfaces, `#262626` hairlines, white text, `#bababa` muted, one sky-blue accent `#87cefa` for actions only) and Geist for body text. From Kero: Hedvig Letters Serif at weight 400 for titles, 20px card corners, 12px fields and alerts, pill buttons and chips, and roomier spacing. Dark only. Four type sizes on a screen (32 / 20 / 16 / 14). Tokens live in `app/globals.css`, shared classes in `components/styles.ts`. 16 px minimum body text, 44 px minimum tap targets.

### 4.1 Route map

| Route                                    | Screen                                                                                            | Access                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| `/signin`                                | Sign in (Google), one line on what the site is                                                    | Public                        |
| `/contribute`                            | Contributor landing: what we're asking, 5 minutes, how identity is shown, "Continue with Google"  | Public                        |
| `/onboarding`                            | Profile form (first visit)                                                                        | Signed in, profile incomplete |
| `/`                                      | Home: Courses, Careers, search, "Write a review"                                                  | App                           |
| `/courses`                               | Course list with filters and sort                                                                 | App                           |
| `/courses/[id]`                          | Course page: banner, summary block, reviews, comments                                             | App                           |
| `/careers`                               | Career list: filters, "Like me" toggle, playbook and company-note cards                           | App, gated by settings        |
| `/careers/[id]`                          | Entry page with author line and comments                                                          | App, gated                    |
| `/write`                                 | Chooser: course review, playbook, company note                                                    | App                           |
| `/write/course-review?course=`           | F1 form → preview → publish                                                                       | App                           |
| `/write/playbook`, `/write/company-note` | F3 forms                                                                                          | App, gated                    |
| `/me`                                    | My entries, questions waiting for my reply, edit, delete, notification preference, delete account | App                           |
| `/survey/post-bid`, `/survey/career`     | Surveys (also shown as an in-app prompt)                                                          | App                           |
| `/rules`, `/privacy`                     | Content rules, what we store and do not store                                                     | Public                        |
| `/admin/*`                               | Queue, verification, courses and offerings, outreach list, metrics, settings                      | Moderator                     |

### 4.2 Onboarding (F6)

Fields, all required, one screen, selects not free text:

- Programme: PGP, PGP YL, Alum
- Cohort: Co'25, Co'26, Co'27, YL 2026-28, other
- Pre-MBA function, pre-MBA industry (controlled lists, section 5.5), years of experience (0-2, 3-5, 6-8, 9+)
- Target track (or, for alumni, current track)
- How did you hear about ISB Hood (WhatsApp group, a friend, email from the team, other); prefilled from `src`

On submit: set `profile_completed_at`, fire `user_signed_up` (this is "Event 1: arrived"). A contributor arriving with `?course=` goes straight to the review form after onboarding, not to Home.

### 4.3 Home and course list

- Home: two large entry points (Courses, Careers), search across course title, code, professor, company; a persistent "Write a review" button. Empty state explains the site and asks first contributors to start.
- Course card: name, current professor, review count, workload band, quant-or-qual tag, "New or changed" badge.
- Filters: term offered, workload band, quant or qual, track it helps. Sort: review count (default), learning value.
- **[decision]** Default the term filter to Term 7 during 28 Dec to 10 Jan, since that is the decision readers are making.
- A course with zero reviews still appears, with "No reviews yet. Took it? Write the first one."

### 4.4 Course page (F2)

Order top to bottom:

1. Header: title, code, current professor and term.
2. **"New or changed course" banner** when the rule in 6.2 fires.
3. **Summary block** (rules in 6.1): review count; median weekly workload; evaluation mix; quant-to-qual score; grade-risk split; learning value with agreement level; share who said the outline matched; top 3 "who should take it" and top 3 "who should skip it" lines.
4. Individual reviews, newest first, each tagged with professor and term, author line ("Name, Co'26" or "Verified Co'26 student"), all text answers, and its comment thread collapsed with a count.
5. Per review: "Ask the author" (if open to questions), "Request a chat" fake door, flag.
6. Sticky footer on phone: "Took this course? Add your review."

### 4.5 Write flow (F1, F3)

- One question group per step on phone (4 short steps for the course review), a visible progress bar, and **autosave of drafts to the server on every step** so a contributor who leaves WhatsApp and comes back loses nothing.
- Course, professor and term are preselected from the link where possible; professor and term are chosen from that course's offerings, with "My professor or term is not listed" → free text that creates a pending offering for a moderator to approve.
- Every rating has its reason field directly beneath it; publish is blocked without it. Star-only reviews cannot exist.
- Running total under the evaluation mix; must equal 100 to continue.
- Visibility step: "Show my name" or "Verified Co'XX student", with one sentence: "Moderators can always see who wrote an entry." Open-to-questions toggle, default on.
- Preview → Publish. Record `form_seconds` (active time from first field focus to publish, summed across sessions) and fire `entry_submitted`.
- After publish: thank-you screen with "Review another course" (list of the courses the outreach campaign most needs) and, once Test 2 is on, "Write your career path".

### 4.6 Career list and entry (F3, F4)

- Filters: track, company, background function; **"Like me" toggle** applies the reader's own profile background (rule in 6.3).
- Cards: playbook ("Risk consulting → Product, Co'26") and company note ("Company · Role · Year").
- Entry page: full content, author line, comments, "Request a chat"; the list page carries "Find people like me" (fake door F9a).

### 4.7 Comments (F5)

- Any signed-in, verified user can comment under an entry that is open to questions. Two levels: question and replies.
- The author gets an email within 5 minutes (sent inline from the server action, with a retry). The email has the question text and a one-click link that signs them in if needed and lands on the reply box.
- Notification preference per user: instant (default), daily digest, off.
- When the entry author replies to an anonymous entry, the reply shows as "Author", never their name.
- Set `first_reply_at` on the question when the entry's author first replies; fire `comment_answered` with `hours_to_answer`.

### 4.8 Fake doors (F8a, F9a)

Button → log `fake_door_clicked` → sheet: "Coming soon. Want early access?" with Yes / No thanks. "Yes" stores `left_contact = true` against the user (we already have their email; **do not** ask for a phone number). No dead ends: the sheet for "Request a chat" offers "Ask a public question instead".

### 4.9 Surveys (F7)

- **Post-bid:** shown once, 11 to 17 Jan 2027, to Co'27 readers who viewed at least one Term 7 course page. In-app prompt on next visit plus one email. Questions: "Did ISB Hood change any of your bids?" (changed → pick the course(s) from a list; confirmed; no effect; did not use), "How many seniors did you ask this time?" (0, 1-2, 3-5, 6+), optional free text.
- **Career follow-up:** 14 days after a reader's first career-entry view. "Name one thing you did because of an entry" (applied to a firm, skipped a firm, changed prep plan, chose an offer, contacted the author, none) plus a required one-line description unless "none".
- **Timing constraint:** follow-ups must be in by 24 Jan, so only readers whose first career view is on or before 10 Jan get the full 14 days. For later readers send at 24 Jan minus 1 day and record the shorter gap.
- One reminder each, then stop. Store responses in `survey_responses`.

### 4.10 Admin

| Page         | What it does                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Queue        | Flagged items oldest first with age (24-hour target), actions: keep, remove, edit-request to author                                                                      |
| Verification | Pending contributors with their Google name, email, claimed cohort, and suggested matches from the outreach list; verify (publishes all their pending entries) or reject |
| Courses      | CSV import and inline edit of courses and offerings; set `is_current`; approve pending offerings; per-course "open to readers" switch                                    |
| Outreach     | CSV import of contacts (name, cohort, optional email, course asked about); shows who has contributed                                                                     |
| Metrics      | Every pass line, live (section 8)                                                                                                                                        |
| Settings     | Dates and gates (section 7)                                                                                                                                              |

---

## 5. Data model

Postgres via Supabase. `id` is `uuid`, timestamps are `timestamptz`. Enumerated values use Postgres enums or check constraints.

### 5.1 Tables

**profiles** (1:1 with `auth.users`)
`id`, `email`, `full_name`, `programme` (pgp, pgp_yl, alum), `cohort`, `background_function`, `background_industry`, `years_experience_band`, `target_track`, `role` (reader, moderator), `account_type` (isb, contributor), `verification_status` (not_required, pending, verified, rejected), `verified_by`, `verified_at`, `outreach_contact_id`, `source`, `notify_pref` (instant, daily, off), `early_access_chat` bool, `early_access_people` bool, `profile_completed_at`, `created_at`, `deleted_at`

**courses**: `id`, `code`, `title`, `area`, `open_to_readers` bool default true

**offerings**: `id`, `course_id`, `professor`, `term_label` (for example "Term 7"), `cohort_year` (for example "Co'27"), `is_current` bool, `status` (approved, pending), `created_by`
Reviews attach to an offering, which is what makes a professor change visible. Exactly one `is_current = true` per course (partial unique index).

**course_reviews**
`id`, `offering_id`, `author_id`, `visibility` (named, anonymous), `open_to_questions` bool default true, `status` (draft, pending_verification, live, removed),
`why_taken text[]`, `workload_band` (0-2, 2-4, 4-6, 6+),
`eval_participation`, `eval_quizzes`, `eval_individual`, `eval_group`, `eval_midterm`, `eval_final` (ints, sum = 100),
`outline_gap text` (40+ chars), `quant_qual smallint` (1-5), `teaching_styles text[]`,
`grade_risk` (low, medium, high), `grade_risk_reason text`,
`learning_value smallint` (1-5), `learning_value_reason text` (40+ chars),
`careers_helped text[]`, `who_should_take text`, `who_should_skip text` (at least one),
`outline_match` (yes, partly, no), `form_seconds int`, `created_at`, `updated_at`, `published_at`
Unique on (`offering_id`, `author_id`).

**career_entries**
`id`, `type` (playbook, company_note), `author_id`, `visibility`, `open_to_questions`, `status`,
filterable columns: `track`, `company` (nullable), `from_function`, `from_industry`, `from_years_band`,
`body jsonb` (validated by the zod schema for its type), `form_seconds`, timestamps
**career_entry_courses**: `entry_id`, `course_id` ("courses that helped" → links to course pages)

**comments**: `id`, `entry_type` (course_review, career_entry), `entry_id`, `parent_id`, `author_id`, `body`, `status` (live, removed), `created_at`, `first_reply_at`

**flags**: `id`, `target_type` (course_review, career_entry, comment), `target_id`, `reporter_id`, `reason`, `auto` bool, `resolved_by`, `resolved_at`, `resolution`

**survey_responses**: `id`, `user_id`, `survey` (post_bid, career_followup), `bid_effect` (changed, confirmed, no_effect, did_not_use), `changed_course_ids uuid[]`, `career_action` (applied_firm, skipped_firm, changed_prep, chose_offer, contacted_author, none), `action_text`, `seniors_asked_band`, `days_since_first_view`, `created_at`. Unique on (`user_id`, `survey`).

**events**: `id`, `user_id`, `name`, `props jsonb`, `session_id`, `created_at`. Index on (`name`, `created_at`) and (`user_id`, `name`).

**outreach_contacts**: `id`, `full_name`, `cohort`, `email` (nullable), `asked_course_ids uuid[]`, `campaign`, `claimed_by`

**app_settings**: `key`, `value jsonb`, `updated_by`, `updated_at`

**email_log**: `id`, `user_id`, `kind`, `ref_id`, `sent_at`, `provider_id` (dedupe and digest bookkeeping)

### 5.2 Content field specifications

**Course review (F1)**, 13 inputs, under the 15-field limit:

| Field                             | Input                                                                                          | Rule                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------- |
| Course, professor, term taken     | Select from offerings                                                                          | Required               |
| Why you took it                   | Multi-select: career fit, interest, professor, grades, workload, friends, concentration credit | 1+                     |
| Weekly workload outside class     | 0-2, 2-4, 4-6, 6+ hours                                                                        | Required               |
| Evaluation mix                    | Six percentages                                                                                | Sum = 100              |
| What the outline did not tell you | Text                                                                                           | 40+ characters         |
| Quant or qual                     | 1 (fully qual) to 5 (fully quant)                                                              | Required               |
| Teaching style                    | Multi-select: case discussion, lecture, workshop, guest-heavy, project                         | 1+                     |
| Grade risk                        | Low, medium, high + reason                                                                     | Reason required        |
| Learning value                    | 1 to 5 + reason                                                                                | Reason 40+ characters  |
| Careers it helps                  | Multi-select tracks                                                                            | Optional               |
| Who should take it / skip it      | Two short texts                                                                                | At least one           |
| Did the outline match?            | Yes, partly, no                                                                                | Required               |
| Visibility; open to questions     | Two toggles                                                                                    | Required; default open |

**Track playbook (F3)**, `body` shape:

```
from:   { function, industry, years_band }
to:     { track, role, company_type, company? }
path:   { before_isb, early_terms, mid_terms, late_terms, placement_weeks }   // each short text; 2+ required
numbers:{ applied, shortlists, interviews, offers }                           // bands: 0, 1-2, 3-5, 6-10, 11-20, 20+
what_mattered: { picks: up to 3 of [cv_story, gpa, case_or_interview_prep, networking,
                 competitions, pors, prior_domain, courses], why }            // why required
courses_helped: via career_entry_courses
latest_safe_start: text      // answers "am I too late?"
mistakes_to_avoid: text
```

Term buckets default to early = Terms 1-3, mid = Terms 4-5, late = Terms 6-8. **[confirm]** against the PGP calendar; labels are in one constants file.

**Company note (F3)**, `body` shape:

```
company, role, year
relationship: interviewed | interned | joined
process_rounds, what_was_asked, prep_that_worked     // text
culture_and_team                                     // shown only if interned or joined
recommend: yes | depends | no,  recommend_to_whom    // text
```

**No salary or offer amounts.** Helper text says so on both career forms. On submit, a soft check for amount patterns (`LPA`, `lakh`, `CTC`, `₹`, `crore`, digits followed by `L`) shows "We don't collect pay figures. Remove it?" and, if the author publishes anyway, creates an `auto` flag for the queue. Same check on comments.

### 5.3 Anonymity and RLS

- `authenticated` has **no direct select** on `course_reviews`, `career_entries`, `comments` or `profiles` (other than own rows).
- Reader-facing data comes from views or security-definer functions (`course_reviews_public`, `career_entries_public`, `comments_public`) that return `author_display` ("Asha R, Co'26" or "Verified Co'26 student"), `author_cohort`, `is_mine`, and **no `author_id` unless `visibility = named`**.
- Comment replies by the entry author on an anonymous entry return `author_display = 'Author'`.
- Write policies: insert/update/delete own rows only; moderators via a `is_moderator()` function.
- Only `status = live` rows are visible to others. `pending_verification` and `draft` are visible to the author and moderators.
- Deleting an account sets entries to `removed` and scrubs profile fields. **[decision]** hard-delete comments' bodies but keep the row so threads do not break.
- Write an automated test that fetches a course page as a second user and asserts the anonymous author's id, name and email appear nowhere in the response.

### 5.4 Things we never store

Grades, salaries, offer amounts, phone numbers. No free-text field is labelled in a way that invites them.

### 5.5 Controlled vocabularies (one constants file)

- **Tracks:** consulting, product, finance, general management or strategy, marketing, other
- **Functions:** consulting, engineering/technology, product, finance/accounting, sales/BD, marketing, operations/supply chain, analytics/data, HR, entrepreneurship, public sector/social, other
- **Industries:** IT/software, BFSI, consulting, manufacturing, FMCG/retail, healthcare/pharma, energy/infra, e-commerce/internet, government/non-profit, other
- **Company type:** MBB/consulting, big tech, startup/scale-up, bank/NBFC/fund, conglomerate/GM programme, FMCG, other

**[confirm]** with the team in the first two days; changing these after entries exist is painful.

---

## 6. Business rules

### 6.1 Course page summary

Computed over `live` reviews for the course (all offerings), in SQL or `lib/domain/aggregation.ts`, unit-tested.

| Element                 | Rule                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Review count            | Count of live reviews; also show "from N reviewers across M offerings"                                                                      |
| Median weekly workload  | Median band (ordinal). Even count straddling two bands → show the range, e.g. "2-6 h"                                                       |
| Evaluation mix          | Mean of each component, rounded, renormalised to 100; show as a stacked bar with labels                                                     |
| Quant-to-qual           | Mean to one decimal on a labelled 1-5 scale                                                                                                 |
| Grade risk              | Split: "Low 2 · Medium 5 · High 1"                                                                                                          |
| Learning value          | Median, with agreement level                                                                                                                |
| Agreement               | **High** if 70%+ of ratings are within one point of the median, else **Mixed**. Hidden below 3 reviews: "Too few reviews to show agreement" |
| Outline matched         | Share answering yes; partly and no shown beside it                                                                                          |
| Top 3 take / skip lines | **[decision]** No AI. The three most recent non-empty lines from different authors, each with professor and term, and "See all"             |

**[decision]** When 3+ reviews exist for the _current_ professor, add a "This professor only" switch on the summary. Default stays "All reviews" so the count is not understated.

Below 3 reviews the summary still shows what it has, with a "Based on N review(s)" caution.

### 6.2 "New or changed course" banner

Show when the course has zero live reviews, **or** no live review is attached to an offering with the current professor. Copy differs: "No reviews yet" vs "Reviews below are for Prof X (Term 7, Co'26). This term it is taught by Prof Y." `has_new_or_changed_flag` goes on `course_page_viewed`.

### 6.3 "Like me" and matching

- `matches_reader_background` = entry `from_function` equals reader `background_function` **or** entry `from_industry` equals reader `background_industry`.
- `matches_reader_track` = entry `track` equals reader `target_track`.
- "Like me" toggle filters to `matches_reader_background`, sorted with function matches first, then track matches.
- Company notes have no "from", so match on the author's profile background.

### 6.4 Value and return events

- `value_reached` fires **once per user per module**: courses = first view of a course page with 3+ live reviews; career = first view of an entry where background or track matches; either = first author reply received to the user's question (`trigger` property says which).
- `return_visit` fires at most once per user per IST calendar day, on the first entry view on a day later than the sign-up day.
- `filter_used` is diagnostic only; never count it as an outcome.

### 6.5 Publishing and verification

| Author                        | On publish                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------ |
| ISB account                   | `live` at once                                                                 |
| Contributor, verified         | `live` at once, "Verified Co'XX" badge                                         |
| Contributor, not yet verified | `pending_verification`; goes live in bulk when a moderator verifies the person |

`entry_submitted` fires at submission either way (supply is counted at submission; the metrics page shows live and pending separately).

### 6.6 Moderation

- Rule shown at the top of every form: **review the course, not the person.** No personal remarks about faculty, staff or students.
- Any user can flag an entry or comment with a reason. Flagged content **stays visible** until a moderator removes it.
- Moderators act within 24 hours; the queue shows age and turns red past 20 hours. Daily email to moderators if the queue is non-empty.
- Authors can edit or delete their own entries at any time; edits bump `updated_at` and show "edited".

---

## 7. Settings and gates

`app_settings` keys, editable in `/admin/settings`, with defaults from the launch calendar:

| Key                                                 | Default                                                     | Controls                                              |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `careers_write_open`                                | false → true about 21 Dec, only if course supply is at 50%+ | Career forms visible to contributors                  |
| `careers_read_open`                                 | false → true 28 Dec                                         | Career list and entries visible to readers            |
| `yl_read_open`                                      | false → true 21 Dec                                         | PGP YL accounts can read course pages                 |
| `min_reviews_to_open_course`                        | 0 (set to 3 if supply lands at 50-99%)                      | Hides thin courses from readers per the decision rule |
| `bid_window`                                        | 4 to 10 Jan 2027                                            | Default term filter, banner copy                      |
| `post_bid_survey_window`                            | 11 to 17 Jan 2027                                           | Survey prompt and email                               |
| `career_followup_days` / `career_followup_deadline` | 14 / 24 Jan 2027                                            | Follow-up timing                                      |
| `bid_term_label`                                    | "Term 7"                                                    | Which offerings count as the bid term                 |
| `allowed_reader_domains`                            | `["isb.edu"]` **[confirm]**                                 | Auth gate                                             |

---

## 8. Instrumentation and the metrics page

### 8.1 Events (all carry `user_id`, `timestamp`, `session_id`)

| Event                 | When                               | Properties                                          |
| --------------------- | ---------------------------------- | --------------------------------------------------- |
| `user_signed_up`      | Profile completed                  | programme, cohort, background, target_track, source |
| `course_page_viewed`  | Course page opened                 | course_id, review_count, has_new_or_changed_flag    |
| `career_entry_viewed` | Career entry opened                | entry_type, track, matches_reader_background        |
| `value_reached`       | Rule 6.4                           | module, trigger, entry_id                           |
| `return_visit`        | Rule 6.4                           | days_since_signup, module                           |
| `entry_submitted`     | Review, playbook or note submitted | entry_type, contributor_cohort, form_seconds        |
| `comment_posted`      | Question asked                     | entry_id                                            |
| `comment_answered`    | First author reply                 | entry_id, hours_to_answer                           |
| `filter_used`         | Any filter or "Like me"            | filter_name                                         |
| `fake_door_clicked`   | Either fake door                   | door, entry_id, left_contact                        |

Also log, as diagnostics not in the spec: `form_started` and `form_step_completed` (to find where contributors drop), `survey_shown`, `survey_submitted`. One `track()` helper in `lib/domain/events.ts`; no ad hoc event names.

### 8.2 `/admin/metrics`: one row per pass line

Each row shows current value, target, and a pass / not yet / fail mark, backed by a SQL view so the number is auditable.

**Test 1 supply (by 3 Jan):** reviews (target 40) · distinct contributors (20) · Term 7 courses with 3+ reviews (10) · share of Term 7 electives with 3+ reviews (P1: 50%) · median `form_seconds` · form start → publish conversion
**Test 1 outcome:** survey responses (min 30) · changed % with named course (pass 20%) · confirmed, no effect, did not use, each reported separately · seniors asked distribution
**Test 2 supply:** entries (10) · playbooks (5) · tracks covered (3) · company notes (5)
**Test 2 outcome:** follow-up responses (min 20) · named-action % (pass 30%; 15-29% rework; under 15% drop)
**Both:** questions asked · answered within 48 h % (pass 70%) · median hours to answer
**Funnel:** arrived → value reached → came back (P1: 25% of readers return on a later day and read an entry), split by module and programme
**YL (P1):** PGP YL sign-ups (30) · questions from YL to Co'27 authors (10)
**Fake doors:** "Request a chat" clicks ÷ distinct readers of entries (build F8 at 15%, or if 20%+ of threads pass 3 messages) · "Find people like me" clicks ÷ distinct career readers (15%) and contacts left (10)
**A10:** alumni testers who published (5 of 5)

Results under a minimum sample render as **"Inconclusive: extend the survey"**, never as pass or fail.

CSV export for each view, for the course write-up.

---

## 9. Milestones

Dates assume one builder working with Claude Code. Each milestone ends deployed to production behind sign-in, with its acceptance checks passing.

### M0 · Foundations · 16 to 17 Nov

- Create the repo (git), Next.js app, Tailwind, shadcn/ui, lint, format, CI running typecheck and tests.
- Supabase project; migrations for every table in 5.1, enums, indexes, RLS on, views from 5.3.
- Vercel project (Hobby), environment variables, preview deploys; project Gmail account with app password; PostHog project (free).
- Seed script: vocabularies, moderators, 5 dummy courses with offerings.
- `docs/KNOWN_DEBT.md` and `docs/RUNBOOK.md` started.
- **Done when:** a deployed URL shows a styled placeholder home; migrations run clean from zero; CI is green.

### M1 · Sign-in and profile (F6) · 18 to 20 Nov

- Google OAuth through Supabase; server-side domain check; contributor route with `src` and `course` carried through the redirect.
- Onboarding form; `user_signed_up`; route guards (incomplete profile → onboarding; unverified contributor → limited shell; moderator-only admin).
- Admin verification page with outreach-list matching.
- **Done when:** an ISB account, a non-ISB account from `/contribute`, and a non-ISB account from `/signin` each land where section 3 says; verifying a contributor flips their pending entries to live.

### M2 · Courses, offerings and the review form (F1) · 21 to 25 Nov

- Admin CSV import and edit for courses and offerings; "not listed" pending offerings.
- Four-step review form with zod validation, server autosave of drafts, preview, publish, edit, delete.
- `form_started`, `form_step_completed`, `entry_submitted` with `form_seconds`.
- **Done when:** on a phone, from a `/contribute?course=` link, a new contributor publishes a valid review in about 5 minutes; a rating without a reason, or a mix not totalling 100, cannot be published; closing the tab mid-form and returning restores the draft.

### M3 · Course list and course page (F2) · 26 to 28 Nov

- Aggregation module with unit tests for every rule in 6.1 and 6.2 (0, 1, 2, 3, many reviews; even and odd medians; professor change).
- Course list with filters, sort, search; course page as specified in 4.4; `course_page_viewed`, `value_reached`, `filter_used`.
- **Done when:** fixtures for a course with 3+ reviews, a course with 2, a course with none, and a course with a changed professor each render the right summary, caution and banner; an anonymous review exposes no author identity (automated test).

### M4 · Comments, email, flags, moderation (F5) · 29 Nov to 1 Dec

- Threaded comments; inline email on new question; one-click reply link; notification preference; daily digest cron.
- `comment_posted`, `comment_answered`, `first_reply_at`.
- Flag action, moderation queue, moderator daily email, content rules page.
- My activity page: entries, questions waiting, edit, delete, delete account.
- **Done when:** a question triggers an email to the author in under 5 minutes, the link lands on the reply box, the reply shows "Author" on an anonymous entry, and `hours_to_answer` is recorded; a flagged item stays visible and appears in the queue with its age.

### M5 · Fake doors, surveys, metrics, settings (F7, F8a, F9a) · 2 to 3 Dec

- Both fake doors with the early-access sheet.
- Post-bid survey and career follow-up: eligibility queries, in-app prompt, email, reminder, cron.
- `return_visit` logic; `/admin/metrics` with all views; `/admin/settings`.
- **Done when:** with seeded data, every row on the metrics page matches a hand count; moving the survey window in settings to today makes the prompt appear for an eligible test user and not for an ineligible one.

### M6 · Harden and launch Test 1 · 4 to 6 Dec

- **Usability test, 5 students, think-aloud**, on their own phones: "read a course page and ask a question" and "write a review" with no help. Fix every blocker the same day.
- **A10 test:** 5 alumni go through contributor sign-in and publish.
- Performance pass: course list and course page under 2 seconds on a mid-range phone on 4G; check with Lighthouse mobile.
- Accessibility basics: labels, focus order, contrast on navy and teal.
- Real course and offering lists loaded; empty states reviewed; Playwright core-loop test green; `pg_dump` backup job on; errors visible in Vercel logs (free).
- **Done when:** the launch checklist in section 11 is ticked and the contribution-drive links are ready to send on 7 Dec.

### M7 · Career entries and filter (F3, F4) · 1 to 2 days between 7 and 20 Dec

- Playbook and company-note forms on the same step/autosave/preview components as F1; pay-figure soft check.
- Career list, filters, "Like me", entry page, `career_entry_viewed`, career `value_reached`; link "courses that helped" to course pages.
- Gated by `careers_write_open` and `careers_read_open`.
- **Done when:** a playbook and a company note can be published on a phone; "Like me" returns only matching entries for a test profile; with the gates off, no career route or link is reachable by a reader.

### During the drive, 7 Dec onward: watch and fix, do not add

Daily: metrics page, form drop-off by step, verification queue, moderation queue, email delivery. Allowed changes: copy, field order, shortening the form (the decision rule for 50-99% supply calls for "a shorter form"), bug fixes. Not allowed: new features.

---

## 10. Launch calendar and the non-build track

The build is worthless without these, and several block specific milestones.

| When            | Build          | Operations (team)                                                                                                                                                                                                                                                                                                                    |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16 Nov to 6 Dec | M0 to M6       | Agree vocabularies (by 17 Nov). Meet AAC/ASA on content rules **[confirm owner and date]**. Build the outreach list: Co'26 alumni per Term 7 course via own contacts and CAC alumni mapping. Get the Term 7 course list and professors, or seed from last year's and correct later. Recruit 5 usability testers and 5 alumni testers |
| 7 to 20 Dec     | M7; fixes only | **Course contribution drive.** Named asks per course, link with the course preselected. Co'27 sections for Terms 2 to 5 courses. Verify contributors daily                                                                                                                                                                           |
| 21 Dec to 3 Jan | Flip gates     | Term 6 starts 21 Dec. If course supply is 50%+, run the career drive. Open course pages to PGP YL. Open Test 2 to readers 28 Dec. **3 Jan: supply read** and apply the supply decision rule                                                                                                                                          |
| 4 to 10 Jan     | Freeze         | Term 7 bidding. Test 1 live for Co'27. Push the link in section groups                                                                                                                                                                                                                                                               |
| 11 to 17 Jan    | Survey live    | Post-bid survey; chase to 30+ responses                                                                                                                                                                                                                                                                                              |
| By 24 Jan       | Export         | Career follow-up; apply every decision rule; write up                                                                                                                                                                                                                                                                                |

### Decision rules (build the metrics page to answer these directly)

| Result                                     | Decision                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Supply under 50% of target                 | Stop building. Concierge: the team interviews seniors and writes the entries                                  |
| Supply 50 to 99%                           | One more 5-day drive with a shorter form and named asks; then open only courses or tracks with 3+ entries     |
| Supply 100%+                               | Open to readers; read the outcome                                                                             |
| Changed under 10%                          | Rethink the format                                                                                            |
| Changed 10 to 19%                          | Iterate (comparison view, fewer fields); retest next bid                                                      |
| Changed 20%+                               | Continue; widen to all of Co'27 and PGP YL                                                                    |
| Career action under 15% / 15 to 29% / 30%+ | Drop career for now / rework fields / continue                                                                |
| Chat (F8)                                  | Build only if "Request a chat" gets 15%+ click-through from entry readers, or 20%+ of threads pass 3 messages |
| People finder (F9)                         | Build only if 15%+ click-through from career readers and 10+ leave contact                                    |

The concierge fallback needs one thing from the build: **moderators can enter a review on behalf of a named, consenting senior** (an "entered by the ISB Hood team from an interview with…" author line). Cheap to add in M2 as a moderator-only field; do it.

---

## 11. Quality bar and launch checklist

**Testing**

- Unit: aggregation, agreement, banner, like-me, value and return rules, survey eligibility, domain gate, pay-figure check.
- Integration: RLS and view tests as three users (reader, unverified contributor, moderator).
- End to end (Playwright, phone viewport): contributor link → sign-in stub → onboarding → review → publish; reader → course page → ask → author replies; flag → queue → resolve.
- Manual: the two think-aloud tasks with 5 students; 5 alumni contributor runs.

**Launch checklist**

- [ ] Anonymous author identity absent from every reader response (automated test green)
- [ ] Non-ISB account cannot read anything before verification
- [ ] All ten spec events land in `events` with required properties; PostHog mirror working
- [ ] Comment email arrives in under 5 minutes on Gmail and Outlook; not in spam; unsubscribe/preferences link works
- [ ] Course page under 2 seconds on a phone; no layout shift on the summary block
- [ ] Empty and error states on every screen
- [ ] Content rules and privacy pages live; "what we never store" stated
- [ ] Edit, delete and delete-account work
- [ ] Real courses and offerings loaded; `is_current` correct for Term 7
- [ ] Settings dates match the calendar in section 10
- [ ] Scheduled `pg_dump` backup job running; errors visible in Vercel logs; moderators seeded
- [ ] `KNOWN_DEBT.md` lists every deliberate shortcut

**Known debt, accepted on purpose** (write into `KNOWN_DEBT.md`): no caching; manual moderation and verification; seeded course lists; campaign-level outreach links; no AI summaries; "top 3" lines chosen by recency; one-level comment threads; no native app or push; surveys are self-report.

---

## 12. Risks

| Risk                              | Effect                                        | Mitigation                                                                                                                                             |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form takes more than 5 minutes    | Supply fails, and with it the experiment      | Step form, autosave, preselected course, measure `form_seconds` and step drop-off from day one; pre-agreed shorter variant ready                       |
| Term 7 course list published late | Course pages cannot be seeded by 7 Dec        | Seed from last year's Term 7 list; "not listed" offering path; fix `is_current` when the list lands                                                    |
| ISB objects to faculty reviews    | Launch blocked                                | Meet AAC/ASA before 6 Dec; rules page; course-not-person rule in every form; fast removal                                                              |
| An anonymous author is exposed    | Trust gone, supply gone                       | Server-only reads, views without `author_id`, automated leak test, "Author" label on replies                                                           |
| Alumni cannot or will not sign in | A10 fails                                     | Any Google account already allowed; test with 5 alumni in week 3; concierge entry as backstop                                                          |
| Emails go to spam                 | Reply rate (A4) reads falsely low             | Plain-text emails from a real Gmail address (no custom domain on the free plan), check deliverability in M4; in-app "questions waiting" on My activity |
| Too few survey responses          | Result inconclusive                           | In-app prompt plus email plus one reminder; team chases in section groups; survey is three taps                                                        |
| Readers arrive to thin pages      | Outcome looks worse than the idea is          | `min_reviews_to_open_course` gate; clear "Based on N reviews"                                                                                          |
| Build slips past 6 Dec            | Drive starts late, bidding date does not move | Cut order if late: digest email → search → sort options → metrics polish. Never cut: form, course page, comments email, events, verification           |

---

## 13. Open questions

| #   | Question                                                                                       | Needed by   | Default if unanswered                             |
| --- | ---------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| 1   | Exact ISB email domain(s) for PGP and PGP YL students                                          | M1 (18 Nov) | `isb.edu`, list is a setting                      |
| 2   | Do alumni keep ISB email access?                                                               | M6          | Assume no; any-Google route is built anyway       |
| 3   | When are Term 7 courses and professors published?                                              | 7 Dec       | Seed from last year's list                        |
| 4   | Do PGP YL students take the same electives, and when do they bid?                              | 21 Dec      | Read-only access to the same pages                |
| 5   | Does ISB administration need to approve faculty-related reviews? Who owns the AAC/ASA meeting? | 6 Dec       | Proceed with the content rules; keep removal fast |
| 6   | Official Hyderabad batch size (interviewees said about 400)                                    | Write-up    | Report as interviewee figure                      |
| 7   | Term buckets for the playbook path                                                             | M7          | Early 1-3, mid 4-5, late 6-8                      |
| 8   | Final vocabularies for function, industry, track, company type                                 | 17 Nov      | Lists in 5.5                                      |
| 9   | Who are the moderators, and who is on call each day of the drive?                              | 6 Dec       | All five team members                             |

---

## 14. First session for whoever picks this up

1. Read this file, then `docs/source/extracted/mvp_requirements.txt` end to end.
2. Do M0 exactly as written; do not start screens before migrations, RLS and CI exist.
3. Build in milestone order. The contributor path (M1, M2) comes before the reader path because supply is the belief that ends the project if it is wrong.
4. After each milestone, run its "Done when" checks on a real phone and update `KNOWN_DEBT.md`.
5. When the spec and this plan disagree, the spec wins; when both are silent, choose the option that makes writing an entry faster, and note the choice here.
