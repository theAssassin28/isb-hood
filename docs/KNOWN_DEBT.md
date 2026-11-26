# Known debt

Deliberate shortcuts. Each one is a choice, not an oversight. Add to this list whenever a milestone takes one.

## Accepted for the MVP

| Shortcut                                            | Why it is acceptable now                  | When it stops being acceptable                          |
| --------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| No caching                                          | A few hundred users                       | Pages slower than 2 seconds on a phone                  |
| Manual moderation and contributor verification      | Five moderators, a few dozen contributors | Queue regularly older than 24 hours                     |
| Seeded course and offering lists                    | No ISB system access in the MVP           | A second term of use                                    |
| Campaign-level outreach links, name matched by hand | Easier to paste into WhatsApp groups      | Impersonation is ever suspected                         |
| "Top 3 take / skip" lines chosen by recency         | AI summaries are out of scope             | 10+ reviews per course                                  |
| One-level comment threads                           | Enough for question and answer            | Threads regularly pass 3 messages (also the F8 trigger) |
| Surveys are self-report                             | We cannot see real bids or shortlists     | Never fixed in the MVP; stated in every read-out        |
| No native app or push                               | A web link in WhatsApp is enough to test  | Outside the MVP                                         |

## From the free-tier constraint

| Shortcut                                        | Consequence                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Email from a Gmail account, not a custom domain | About 500 recipients a day; mail shows a Gmail sender; no bounce analytics                                                 |
| One daily cron (Vercel Hobby)                   | Digests, survey nudges and moderator reminders go out once a day at a fixed time, not at the best time per user            |
| Supabase free project                           | Pauses after about a week idle (the daily cron prevents it); backups are our own `pg_dump` job, not point-in-time recovery |
| No paid error monitoring                        | Errors are read from Vercel logs, which are kept for a short time                                                          |
| `*.vercel.app` address                          | Less recognisable link in WhatsApp                                                                                         |

## From M0

| Shortcut                                                                            | Consequence                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database tests run on PGlite with a stand-in for Supabase's `auth` schema and roles | Proves our SQL and access rules, not Supabase's own behaviour. Re-run the access checks by hand once against the real project (RUNBOOK, step 4)            |
| `vite` pinned to 7.x for Vitest                                                     | Vite 8 needed a `lightningcss` release the registry did not serve on 15 Nov. Unpin when it installs cleanly                                                |
| Supabase default privileges are not altered                                         | Supabase auto-grants new tables to `anon` and `authenticated`. Every future migration must end with explicit `revoke` / `grant`, as `0002_access.sql` does |

## From M1

| Shortcut                                                                                                                                       | Consequence                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in, onboarding and verification have not been run against a real Supabase project                                                         | Rules are covered by unit and database tests, and signed-out redirects were checked in a browser. The signed-in paths need the manual run in RUNBOOK ("Check M1 by hand") once the project exists |
| A non-ISB person who starts on the contributor link, abandons before any sign-in completes, then uses the ordinary sign-in page is turned away | They are told to use the contributor link again. Acceptable; nothing is lost                                                                                                                      |
| A rejected non-ISB sign-in is deleted with the service role                                                                                    | No orphan accounts, but nothing records the attempt                                                                                                                                               |
| No session id on events                                                                                                                        | `events.session_id` stays empty until return-visit logic needs it (M5)                                                                                                                            |
| No PostHog mirror yet                                                                                                                          | Events go to the `events` table only until M5                                                                                                                                                     |

## From M2

| Shortcut                                                                          | Consequence                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The review form has not been run against a real database                          | Rules are covered by unit and database tests; the form's steps, validation and preview were checked in a browser with sample data. Saving, resuming a draft and publishing need the manual run in RUNBOOK ("Check M2 by hand") |
| No Playwright end-to-end tests                                                    | They need a running Supabase project and a test mailbox to read sign-in codes from. Add once the project exists, before the contribution drive                                                                                 |
| A proposed professor or term cannot be edited or merged, only approved or deleted | Two spellings of one professor become two offerings. The course page still pools their reviews; only the label differs                                                                                                         |
| Courses are renamed by re-importing the CSV, not edited in place                  | Fine while the list is small                                                                                                                                                                                                   |
| A session that expires mid-form sends the writer to sign-in on the next save      | Everything up to the last completed step is already saved and is restored on return                                                                                                                                            |
| `form_seconds` counts time with the tab visible, including pauses                 | Slightly overstates writing time; use the median, as the plan does                                                                                                                                                             |
| "Review another course" lists every course, not the ones the campaign most needs  | Sort by need once the outreach list and review counts exist (M3)                                                                                                                                                               |

## From M3

| Shortcut                                                                                                                      | Consequence                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The course list and course page have not been run against a real database                                                     | The summary rules, filters and banner are unit-tested, and the page was rendered from fixtures in a test and in a browser. RUNBOOK "Check M3 by hand" covers the real run |
| The course list reads every live review on each visit and aggregates in the app                                               | Fine for hundreds of reviews; move the aggregation into a SQL view if it reaches thousands                                                                                |
| View events are sent from the browser once the page is on screen, then written by a server action that recomputes the numbers | Needed because Next prefetches pages on links. A reader with JavaScript off records no views; a reader who closes the tab within a moment may not either                  |
| "Top 3 take / skip" lines treat each review as a different author                                                             | One person can review the same course under two offerings; rare, and anonymous authors cannot be told apart by design                                                     |
| The "New professor" check compares names                                                                                      | A misspelt professor name in an import looks like a change of professor. Fix the spelling with a re-import                                                                |
| Per-review actions (ask the author, request a chat, flag) are not on the course page yet                                      | M4 and M5                                                                                                                                                                 |
| The Careers card on Home says "opening soon" with no date                                                                     | Careers is M7 and opens by setting `careers_read_open`                                                                                                                    |

## From M4

| Shortcut                                                                              | Consequence                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comments, email and moderation have not run against a real database or a real mailbox | Rules are covered by database and unit tests; threads, flag form and pages were checked in a browser from fixtures. Without SMTP settings, emails are printed to the server log. RUNBOOK "Check M4 by hand" covers the real run |
| [decision] The person who asked is emailed when the author answers                    | Not in the spec, which only emails the author. Without it an answer can sit unseen. Uses the asker's own email preference                                                                                                       |
| A rate limit of 20 comments per person per hour, checked in the app                   | Enough to stop a runaway loop flooding someone's inbox; not a defence against a determined abuser                                                                                                                               |
| Removing a question also hides its replies                                            | Simpler than re-parenting; moderators should prefer "Keep" or asking for an edit on useful threads                                                                                                                              |
| An edit request is an email with no follow-up                                         | Nothing reminds the moderator to check later whether the author edited it                                                                                                                                                       |
| Deleting an account keeps the sign-in record in Supabase Auth                         | Signing in again shows "account deleted" instead of creating a fresh account. Restoring someone is a manual job in the SQL editor                                                                                               |
| Digests and the moderator reminder go out once a day at 08:00 IST                     | The free Vercel plan allows one cron run a day                                                                                                                                                                                  |
| The email "already sent" check and the send are not one transaction                   | Two near-simultaneous sends of the same alert could both go out; very unlikely                                                                                                                                                  |
| Comments and flags exist for course reviews only                                      | Career entries get them in M7                                                                                                                                                                                                   |

## From M5

| Shortcut                                                                       | Consequence                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Metrics come from one moderator-only database function, not SQL views          | Plain views in Supabase's public schema can be read by any signed-in user through the API. The function's SQL in `0008_surveys_metrics.sql` is the audit trail; a database test checks every number against a hand count |
| Surveys, fake doors, metrics and settings have not run against a real database | Rules are covered by database and unit tests and the screens were checked from fixtures. RUNBOOK "Check M5 by hand" covers the real run                                                                                  |
| "Find people like me" is built but not placed                                  | It belongs on the career list (M7). Its metric rows read "no data" until then                                                                                                                                            |
| The career follow-up survey cannot be triggered yet                            | It starts from the first career-entry view, which arrives with M7                                                                                                                                                        |
| "Not now" on a survey prompt is remembered per device for about a day          | A reader on two devices may see the prompt again                                                                                                                                                                         |
| Team members are counted in the metrics like anyone else                       | The team are Co'27 students too. Exclude test accounts by deleting them before the read-out                                                                                                                              |
| Survey emails respect "no emails"                                              | Readers who switched emails off only see the in-app prompt; response rates may be lower for them                                                                                                                         |
| PostHog receives only the pseudonymous user id                                 | Funnels in PostHog cannot be split by programme unless the property is added later; the metrics page already splits it                                                                                                   |

## From the Stella and Kero restyle (17 Nov)

| Shortcut                                                                      | Consequence                                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Dark only                                                                     | Stella is a dark design. Reading in bright sunlight is harder than on a light page; revisit after the usability test |
| Brand navy and teal no longer appear in the app                               | Stella's sky blue is the only accent. Keep the ISB colours for outside material (deck, posters)                      |
| Stella is a free Framer template, used for a non-commercial student project   | Godly Templates: recheck the template's terms (`templates/stella/README.md` in the kit) before any commercial use    |
| Editing the custom type utilities in `globals.css` needs a dev-server restart | Turbopack did not hot-reload them; normal class changes reload fine                                                  |
| `docs/design-previews/` holds static prototypes from the Godly kit            | Reference only; not part of the app or the build                                                                     |

## From the switch to emailed codes (20 Nov)

| Shortcut                                                                                                                         | Consequence                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in is a 6-digit code emailed to the person; no Google, no Microsoft                                                         | No app to register and no IT approval. Every sign-in sends one email through the project Gmail account (about 500 a day): fine for 400 students, who stay signed in for weeks |
| The reader door accepts only `@isb.edu` (the `allowed_reader_domains` setting); alumni use the contributor door with any address | An alum who signs in from `/signin` with a personal address is refused and pointed to the contributor link; email reply links offer that link too                             |
| Anyone can ask the contributor door to email a code to any address                                                               | Supabase limits one code per address per minute. If it is abused, add a captcha (Supabase supports one)                                                                       |
| No end-to-end test of the code flow                                                                                              | Needs a real mailbox. Covered by RUNBOOK "Check M1 by hand" steps 1 to 4                                                                                                      |

## From the clickable prototype (21 Nov)

| Shortcut                                                                               | Consequence                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo mode swaps Supabase for an in-memory fake (`lib/demo/`) when no keys are set      | The fake copies the views, access rules, triggers and functions by hand. A change to SQL must be copied there too, or the demo and the real app drift apart (`tests/unit/demo.test.ts` catches some of it) |
| Demo state lives in one server process                                                 | Lost on restart; not usable on a serverless host. Fine for presenting from a laptop                                                                                                                        |
| Sign-in in the demo accepts any 6-digit code (and Sample accounts is a one-tap picker) | Never deploy with demo mode on and real data: anyone could sign in as the moderator. Real keys switch it off; the runbook has a pre-launch check                                                           |
| `/sample-accounts` is prerendered at build time                                        | After "Delete my account" in a built demo, the list may still show that person until Reset                                                                                                                 |
| Email, PostHog and the daily job are no-ops in the demo                                | Their effects (notification emails, funnels) cannot be shown, only described                                                                                                                               |

## From the responsive layouts, themes and UX audit (25 to 26 Nov)

| Shortcut                                                                                               | Consequence                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The theme choice is kept in `localStorage`, not on the account                                         | It does not follow the person to another browser or phone; each one starts on the system setting                                                                                                                  |
| The light theme repeats its tokens in two CSS blocks (system light, and a manual choice)               | A colour changed in one block must be changed in the other (`app/globals.css`)                                                                                                                                    |
| No tablet layout: everything under 1024px gets the phone layout                                        | On a tablet in landscape the course list is one column of wide cards                                                                                                                                              |
| Admin pages only got the wider tab row                                                                 | Admin content is still a narrow column on desktop                                                                                                                                                                 |
| Review drafts save 2.5 s after the last change, one save at a time                                     | A tab closed within those 2.5 s loses the last change; on a slow connection saves queue up                                                                                                                        |
| Loading placeholders are static shapes, not matched to real content height                             | Small layout shifts are still possible when real content is longer or shorter than the shape                                                                                                                      |
| Phones have `overscroll-behavior-y: none`                                                              | No rubber-band bounce, but also no pull-to-refresh in mobile browsers                                                                                                                                             |
| On phones with the tab bar, `<body>` is the scroll container, not the window (`app/globals.css`)       | Mobile browsers no longer hide their address bar while scrolling; code that scrolls must call `document.body.scrollTo` as well as `window.scrollTo`; the tab bar resets the scroll to the top on each page change |
| Course URLs use the code; some internal links (admin flags queue, email reply links) still pass the id | They work through a redirect, one extra hop                                                                                                                                                                       |

## From careers and the pathway pages (26 Nov)

| Shortcut                                                                | Consequence                                                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Career forms are one page with a preview; no autosave or drafts         | Leaving the page loses what was typed. The course review form autosaves; add the same if alumni abandon the playbook form                          |
| The daily digest email covers course reviews only                       | People on the daily digest get no email about questions on their career entries. Instant emails do cover them                                      |
| Pathway pages and the career list read every live entry on each request | Fine for tens of entries; add paging or a cached summary if it reaches hundreds                                                                    |
| Sample company notes name real firms with made-up content               | Demo only (`lib/demo/seed-careers.ts`). Do not show the demo publicly as if the notes were real                                                    |
| No event for opening a pathway page                                     | Only `career_entry_viewed` counts as a career view (plan 8.1 has no pathway event). Add one to the plan first if the pathway's use needs measuring |
| The demo opens careers (`careers_read_open`, `careers_write_open`)      | The real defaults stay off until the dates in plan section 7                                                                                       |
