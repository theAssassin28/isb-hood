# ISB Hood: handoff

State on 26 Nov 2026. Read this first, then `docs/BUILD_PLAN.md` for the full design.

## What it is

ISB Hood passes on what one ISB batch has learned about courses and careers to the next (SWPM Group 12, Hyderabad). The MVP tests one loop: an alum writes a structured course review, a student reads it before bidding, and the student asks the author a question. The spec is `docs/source/extracted/mvp_requirements.txt`. Where the spec and the plan disagree, the spec wins.

## Where things stand

| Area                                                                               | State                                    |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| M0 to M5 (sign-in, reviews, course pages, questions, moderation, surveys, metrics) | Built and tested locally                 |
| M7, careers: track playbooks, company notes, "Like me", a pathway page per track   | Built and tested locally, on sample data |
| Clickable demo on sample data                                                      | Built; this is what is shown for now     |
| Supabase, Gmail sending, PostHog, Vercel                                           | **Not set up.** Not needed for the demo  |
| M6 (harden and launch Test 1)                                                      | Not started                              |

- **Repo:** https://github.com/theAssassin28/isb-hood (private; it contains Godly template assets and coursework). Branch `main`; CI runs on every push and is green as of commit `c49682f`.
- **Checks:** lint, types, 225 tests and the production build pass.
- **Checked in the browser at phone width:** the career list and "Like me", a pathway page, an entry page, asking an author, and publishing a playbook and a company note (including the pay-figure warning). Not clicked through yet: verifying Dev as Nisha and taking the survey.

## Run the demo

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000.

- **Signing in:** the sign-in page opens with "Testing the prototype? Start here": tap one of the four primary personas (walkthroughs in `docs/PERSONAS.md`). Or type any email and any 6-digit code; no email is sent.
- **Demo script:** each primary persona has one, in a panel from the "Demo script" button at the bottom right.
- **Switching and resetting:** the strip at the top says who you are and has **Switch persona** and **Reset**.
- **Layouts and themes:** narrower than 1024px is the phone layout (bottom tab bar), wider is desktop; the sun/moon button switches light and dark.

| Person                                               | What to show                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Ravi, PGP Co'27 (ex-consultant, BFSI, wants product) | Reading reviews and asking a question; careers with "Like me"; the post-bid survey after he opens a Term 7 course |
| Meera, PGP YL                                        | The view for YL students; questions waiting on a review and a company note                                        |
| Asha, Co'26 alum                                     | Writing a review, playbook or company note under her name; answering a waiting question                           |
| Kiran, Co'26 alum                                    | Answering anonymously; replies show as "Author" (reviews and a finance playbook)                                  |
| Dev, Co'25 alum                                      | Waiting for verification, so his review and marketing playbook are held                                           |
| Nisha, moderator                                     | Verifying Dev, resolving flags, importing courses, the metrics page and its CSV export                            |
| Rohan, new student                                   | The first-time setup screens                                                                                      |

**Suggested script:**

1. As Ravi, open Pricing Strategy. It shows the new-professor banner. Read a review and ask its author a question. Go back Home: the post-bid survey prompt now appears, because he looked at a Term 7 course.
2. Still as Ravi, open Careers. Open the Product pathway to see what three people did at each stage. Turn on "Like me": Farah, a risk consultant from BFSI like him, comes first. Ask her a question. (Arjun, the career pivoter persona, gets the same view for his finance and BFSI background.)
3. Switch to Kiran and answer anonymously.
4. As Asha, write a playbook or company note. Try a pay figure ("30 LPA") to show the warning.
5. As Dev, write a review; it is held. Switch to Nisha, verify Dev: his review and his playbook go live. Then resolve a flag and open Metrics.
6. As Rohan, go through onboarding.
7. Reset the demo.

**Demo limits:**

- **Sample data:** courses, reviews and people are in `lib/demo/seed-data.ts` (8 courses, 17 reviews, question threads, 3 flags, background activity for the metrics). Careers are in `lib/demo/seed-careers.ts`: 11 playbooks and 8 company notes across all six tracks. Company names are real recruiters, but every word is made up. Edit either file, then press Reset.
- **State:** changes made while clicking live in one server process and are lost on restart. Present from a laptop, not a serverless host.
- **Services:** email, PostHog and the daily job do nothing in the demo.
- **Never deploy demo mode with real people on it:** sign-in is a picker, so anyone could become the moderator.

## How careers work

- **Career list (`/careers`):** a tile per track, then every playbook and company note, with filters (kind, track, background, company) and "Like me".
- **"Like me":** shows entries from people who had the reader's pre-MBA function or industry. Function matches come first, then the reader's target track (plan 6.3). Company notes match on the author's own background.
- **Pathway page (`/careers/tracks/<track>`):** lines up every playbook for one track by stage: before ISB, early terms (1 to 3), mid terms (4 to 5), late terms (6 to 8), placement weeks. It also shows where people came from, the median applied, shortlists, interviews and offers, what mattered most, the latest safe start, and mistakes to avoid. Lines from people like the reader are tagged.
- **Entry page (`/careers/<id>`):** the full playbook or note, with questions to the author, "Request a chat" (fake door) and flagging.
- **Writing:** `/write/playbook` and `/write/company-note` have one page of questions, then a preview, then publish. Text that looks like pay or an offer amount gets a warning, and is flagged for moderators if published anyway.
- **Logic:** `lib/domain/careers.ts` (matching, filters, pathway) and `lib/schemas/careerEntry.ts` (fields and rules).

## How the demo works

`isDemo()` in `lib/demo/mode.ts` is true when the Supabase keys are unset. `ISB_HOOD_DEMO=1` or `ISB_HOOD_DEMO=0` forces it on or off.

In demo mode, `createClient` (`lib/supabase/server.ts`) and `createAdminClient` (`lib/supabase/admin.ts`) return a fake Supabase client instead of the real one, so the pages and actions run unchanged.

| File                                                           | Role                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/demo/seed-data.ts`                                        | The sample people, courses, reviews, comments, flags and outreach                                   |
| `lib/demo/seed-careers.ts`                                     | The sample playbooks, company notes and their questions                                             |
| `lib/demo/db.ts`                                               | The in-memory database. It copies the SQL views, access rules, triggers and functions in TypeScript |
| `lib/demo/client.ts`                                           | The fake client: the query builder, joins, `rpc` and `auth`                                         |
| `lib/demo/actions.ts`                                          | Signing in as a person, and Reset                                                                   |
| `components/demo-banner.tsx`, `components/demo-personas.tsx`   | The strip and the person picker                                                                     |
| `components/demo-start.tsx`, `components/demo-script-dock.tsx` | The sign-in persona panel and the "Demo script" button and panel                                    |
| `tests/unit/demo.test.ts`, `tests/unit/career-entries.test.ts` | Check that the fake keeps anonymity, access, triggers and metrics right, and the career entry rules |

When you change any SQL in `supabase/migrations/`, make the same change in `lib/demo/db.ts`. Otherwise the demo and the real app drift apart.

## Switching to the real app

1. Follow `docs/RUNBOOK.md`, "One-time setup of the hosted services". Every service is on a free plan: Supabase, a Gmail account with an app password, PostHog and Vercel.
2. Copy `.env.example` to `.env.local` and fill it in. Setting the Supabase keys turns demo mode off.
3. Apply the migrations in `supabase/migrations/`, then work through the RUNBOOK's "Check M1 by hand" to "Check M5 by hand".

**How sign-in works:**

- It is a 6-digit code sent by email. There is no Google or Microsoft sign-in.
- The reader door (`/signin`) accepts `@isb.edu` addresses only. The allowed domains are a setting.
- Alumni use the contributor door (`/contribute`), which accepts any address. Moderators then verify them.

## What's next

1. **M6, harden and launch Test 1** (plan section 9):
   - a usability test with 5 students and an alumni sign-in test with 5 alumni;
   - performance and accessibility passes;
   - loading the real Term 7 courses;
   - a Playwright core-loop test, a `pg_dump` backup and the launch checklist in section 11.
2. **Careers in the real app:** the pages are built and gated by `careers_write_open` and `careers_read_open` (both off by default; the demo turns them on). Still to do: the daily digest email for career comments, autosave on the career forms, and a run against a real Supabase project.
3. **Open questions** (plan section 13): when Term 7 courses are published, whether YL students bid on the same electives, whether faculty reviews need approval, and who moderates.

## Rules that are easy to break

The full list is in `CLAUDE.md`.

- **Anonymity:** an anonymous author's identity must never reach the browser.
- **Data access:** all of it happens on the server, with row level security on every table.
- **Data we never collect:** grades, salaries, offer amounts or phone numbers.
- **Out of scope:** places, AI, chat, the people finder and a mobile app are not built. Chat and the people finder exist only as fake doors.
- **Free plans only:** ask before adding anything paid.
- **Visual system:** Stella's colours with Kero's shapes, dark and light themes, phone first (two layouts, split at 1024px; see PRD 6.3). Use the tokens in `app/globals.css` and the class strings in `components/styles.ts`. Show previews before any restyle.
- **Next.js 16:** this is newer than most docs assume. Read `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).

## Reference

| Doc                  | For                                                   |
| -------------------- | ----------------------------------------------------- |
| `docs/BUILD_PLAN.md` | The full design, data model, rules, milestones, risks |
| `docs/RUNBOOK.md`    | Setup, checks, deploy, manual test steps, the demo    |
| `docs/KNOWN_DEBT.md` | Deliberate shortcuts and what they cost               |
| `docs/source/`       | The spec, deck and product note                       |

**Checks before every push** (CI runs the same ones):

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
