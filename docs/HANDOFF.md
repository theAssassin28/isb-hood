# ISB Hood: handoff

State on 21 Nov 2026. Read this first, then `docs/BUILD_PLAN.md` for the full design.

## What it is

ISB Hood passes on what one ISB batch has learned about courses and careers to the next (SWPM Group 12, Hyderabad). The MVP tests one loop: an alum writes a structured course review, a student reads it before bidding, and the student asks the author a question. The spec is `docs/source/extracted/mvp_requirements.txt`. Where the spec and the plan disagree, the spec wins.

## Where things stand

| Area                                                                               | State                                           |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| M0 to M5 (sign-in, reviews, course pages, questions, moderation, surveys, metrics) | Built and tested locally                        |
| Clickable demo on sample data                                                      | Built and pushed; this is what is shown for now |
| Supabase, Gmail sending, PostHog, Vercel                                           | **Not set up.** Not needed for the demo         |
| M6 (harden and launch Test 1) and M7 (career entries)                              | Not started                                     |

- **Repo:** https://github.com/theAssassin28/isb-hood (private; it contains Godly template assets and coursework). Branch `main`; CI runs on every push and is green as of commit `c49682f`.
- **Checks:** lint, types, 217 tests and the production build pass.
- **Not yet checked:** a click-through of the demo's forms in a real browser. The pages were checked by fetching them for each sample person. Before presenting, ask a question as Ravi, verify Dev as Nisha, and take the survey.

## Run the demo

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000.

- **Signing in:** pick a person on the sign-in page. No email is sent.
- **Switching and resetting:** the strip at the top has **Switch person** and **Reset demo data**.

| Person             | What to show                                                                           |
| ------------------ | -------------------------------------------------------------------------------------- |
| Ravi, PGP Co'27    | Reading reviews, asking a question, the post-bid survey (due for him), his own review  |
| Meera, PGP YL      | The view for YL students                                                               |
| Asha, Co'26 alum   | Writing a review under her name, answering a waiting question                          |
| Kiran, Co'26 alum  | Answering anonymously; replies show as "Author"                                        |
| Dev, Co'25 alum    | A contributor waiting for verification, so his review is held                          |
| Nisha, moderator   | Verifying Dev, resolving flags, importing courses, the metrics page and its CSV export |
| Rohan, new student | The first-time setup screens                                                           |

**Suggested script:**

1. As Ravi, open Pricing Strategy. It shows the new-professor banner. Read a review and ask its author a question.
2. Switch to Kiran and answer the question anonymously.
3. As Asha, write a review.
4. As Dev, write a review; it is held. Switch to Nisha, verify Dev, and the review is published. Then resolve a flag and open Metrics.
5. As Rohan, go through onboarding.
6. Reset the demo.

**Demo limits:**

- **Sample data:** it lives in `lib/demo/seed-data.ts` (8 courses, 17 reviews, question threads, 3 flags, background activity for the metrics). Edit it, then press Reset.
- **State:** changes made while clicking live in one server process and are lost on restart. Present from a laptop, not a serverless host.
- **Services:** email, PostHog and the daily job do nothing in the demo.
- **Never deploy demo mode with real people on it:** sign-in is a picker, so anyone could become the moderator.

## How the demo works

`isDemo()` in `lib/demo/mode.ts` is true when the Supabase keys are unset. `ISB_HOOD_DEMO=1` or `ISB_HOOD_DEMO=0` forces it on or off.

In demo mode, `createClient` (`lib/supabase/server.ts`) and `createAdminClient` (`lib/supabase/admin.ts`) return a fake Supabase client instead of the real one, so the pages and actions run unchanged.

| File                                                         | Role                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `lib/demo/seed-data.ts`                                      | The sample people, courses, reviews, comments, flags and outreach                                   |
| `lib/demo/db.ts`                                             | The in-memory database. It copies the SQL views, access rules, triggers and functions in TypeScript |
| `lib/demo/client.ts`                                         | The fake client: the query builder, joins, `rpc` and `auth`                                         |
| `lib/demo/actions.ts`                                        | Signing in as a person, and Reset                                                                   |
| `components/demo-banner.tsx`, `components/demo-personas.tsx` | The strip and the person picker                                                                     |
| `tests/unit/demo.test.ts`                                    | Checks that the fake keeps anonymity, access, triggers and metrics right                            |

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
2. **M7, career entries:** playbooks, company notes, the "Like me" filter. Gated by `careers_write_open` and `careers_read_open`.
3. **Open questions** (plan section 13): when Term 7 courses are published, whether YL students bid on the same electives, whether faculty reviews need approval, and who moderates.

## Rules that are easy to break

The full list is in `CLAUDE.md`.

- **Anonymity:** an anonymous author's identity must never reach the browser.
- **Data access:** all of it happens on the server, with row level security on every table.
- **Data we never collect:** grades, salaries, offer amounts or phone numbers.
- **Out of scope:** places, AI, chat, the people finder and a mobile app are not built. Chat and the people finder exist only as fake doors.
- **Free plans only:** ask before adding anything paid.
- **Visual system:** Stella's colours with Kero's shapes, dark only, phone first. Use the tokens in `app/globals.css` and the class strings in `components/styles.ts`. Show previews before any restyle.
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
