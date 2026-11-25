# ISB Hood: Product Requirements Document

**Version:** 1.1 · **Date:** 26 Nov 2026 · **Author:** CT
**Team:** SWPM Group 12, Section B, ISB Hyderabad: Chinmay Thakare, Padarabinda Palai, Rajashree Pati, Shivam Singh, Sri Akhil Mylavarapu

**How this document relates to the repo**

- This PRD says **what** we are building and **why**. It is the product source of truth.
- `docs/BUILD_PLAN.md` says **how** (data model, field specs, business rules, milestones). Where they disagree on behaviour, this PRD wins; where they disagree on implementation detail, the build plan wins.
- `docs/source/extracted/mvp_requirements.txt` is the original spec (v0.2). This PRD supersedes it.
- Items marked **[not built yet]** were decided after the build plan was written and need code.
- Items marked **[confirm]** need a team decision.

**What changed in 1.1 (26 Nov 2026)**

- Two layouts (phone below 1024px, desktop from 1024px) and two themes (dark and light) (6.3).
- New sign-in page with the project's student-led context (6.1); in the prototype, any 6-digit code works (5.4, "Prototype").
- Four primary personas for the prototype, two information seekers and two contributors, each one tap from the sign-in page, with a demo script behind a floating "Demo script" button (it opens by itself on a persona's first visit); walkthroughs in `docs/PERSONAS.md` (13.2).
- Course pages live at their course code (`/courses/MKT-501`) (6.1).
- A Laws of UX audit of every screen and its 10 fixes, in `docs/UX_AUDIT.md`; the review form now saves as you type (5.4, 13.1).

---

## 1. Summary

ISB is a one-year programme, so there are no seniors on campus to ask. What each batch learns about courses and careers sits in WhatsApp groups, old club docs and alumni who get hard to reach, and it leaves with the batch.

**ISB Hood passes what one ISB batch learns about courses and careers to the next.** Seniors and alumni write short, structured entries with reasons. Juniors read them, filtered to people like them, and ask the author directly.

The MVP is an **experiment, not a small product**. It runs one loop, **write a structured entry → read it → ask the author**, as two tests:

- **Test 1, Courses (primary):** course reviews before Term 7 bidding, 4 to 10 Jan 2027.
- **Test 2, Career:** career playbooks and company notes, readers from 28 Dec.

**Value proposition.** For ISB students choosing electives or planning a career move, ISB Hood is the record of what earlier batches learned, with reasons, matched to your background, and the author one comment away. Unlike ratings or a 10-minute senior call, every entry says why and shows how many agree.

**Vision.** Any junior can make a course or career decision with a senior's real experience, at the moment it matters, in any batch. Every ISB batch should start where the last one finished.

---

## 2. Problem

### 2.1 Problem hypothesis

PGP students bidding for electives are most frustrated about choosing courses that fit their priority for the term, because the advice they get is a few opinions with no reasons, and it goes stale when a professor or format changes. Career pivoters face the same gap: advice comes from people who did not start where they did.

### 2.2 Problems

| ID | Problem | Who, and when | Cost today | Workaround today |
| --- | --- | --- | --- | --- |
| P1 | Electives | PGP students, the evening before bidding closes | 2 to 3 hours per round; 16 to 20 options; locked in if wrong | Call 3 to 5 seniors; run outlines through an LLM |
| P2 | Career | Career pivoters, Term 3 into placements | 5 to 10 minute senior calls; alumni emails unanswered | LinkedIn, Topmate, Reddit |
| P3 | YL handoff | PGP YL first-years with no seniors in their programme | Founding YL cohort had no course reviews at all | PGP friends, buddy luck |
| P4 | Supply | Seniors and alumni asked the same questions | One student answers every Atrium question | WhatsApp replies, one by one |

### 2.3 Research base

20 interviews on the Hyderabad campus: 13 PGP Co'27 students, 4 PGP YL students, 3 alumni (Co'25, Co'26). Four interviewers, each with an affinity diagram, mapped to 8 shared themes.

| Theme | Interviews | In the MVP? |
| --- | --- | --- |
| Course and elective choice | 17 of 20 | Yes: Test 1 |
| Finding the right person to ask | 13 of 20 | Yes: ask the author; people finder as a fake door |
| Career prep and decisions | 12 of 20 (14 with passing mentions) | Yes: Test 2 |
| Places, food, outings | 10 of 20 | No: mild pain |
| Settling in and procedures | 9 of 20 | No: early-term only |
| Term-by-term view | 7 of 20 | Later: calendar |
| PGP to YL handoff | 4 of 20 | Yes: YL reads the same pages |
| Repeated questions (supply side) | 2 of 20 | Yes: answer once, publicly |

Counts are theme mentions in a mixed, non-random sample recruited through our own networks. They are not prevalence: "17 of 20" does not mean 85% of the batch.

---

## 3. Users

### 3.1 Personas (from research)

Names are fictional composites; quotes are verbatim from interviewees.

| Persona | Type | Profile | Quote | Wants | Hurts |
| --- | --- | --- | --- | --- | --- |
| Ananya, the Elective Optimiser | Primary | PGP Co'27, ex risk consultant | "It's still a complete black box as to which source to believe and which one not to." | Electives that fit this term's priority (grades, load, learning, career); no surprise after bidding | Conflicting reviews with no reasons; polished outlines; 2 to 3 hours to decide |
| Arjun, the Career Pivoter | Primary | PGP Co'27, CA, ex-banker, wants consulting or product | "It's anchored on a set of people who already have that background, so it is difficult to actually pivot." | Land the target track; know what to do each term; decide on firms and offers | Generic, late advice; alumni who do not reply; small network |
| The PGP YL Junior | Secondary | PGP YL, new to Hyderabad | "Absolutely zero interaction between PGP and YL" outside events. | What earlier batches know, without depending on luck | Help depends on a buddy or a PGP friend |
| The Senior or Alum Guide | Supply | Co'26 alum, now in a product role | "Usually, I am the person who responds to all of these... no one else does." | Help juniors once, in a way that keeps helping | Same questions again and again; little time |

### 3.2 Jobs to be done

| # | Job (When..., I want to..., so I can...) | Persona |
| --- | --- | --- |
| J1 | When elective bidding opens, I want to know a course's real workload, grading and teaching style from people like me, so I can bid for a mix that fits this term's priority. | Elective Optimiser, YL Junior |
| J2 | When I plan a switch into a new track, I want the term-by-term path and what mattered from someone with my background, so I start the right prep on time. | Career Pivoter |
| J3 | When a company opens applications or I hold two offers, I want insider facts on role, process and culture, so I can decide. | Career Pivoter |
| J4 | When an entry does not cover my situation, I want to ask the person who wrote it, so I get an answer for my case without cold-messaging. | All readers |
| J5 | When juniors ask me the same question, I want to answer once in a way that keeps helping. | Senior or Alum Guide |

### 3.3 Roles and access

| Role | Signs in with | Can read | Can write |
| --- | --- | --- | --- |
| Reader (PGP Co'27, PGP YL) | 6-digit code emailed to an `@isb.edu` address | Everything open to their programme | Reviews, entries, comments, flags |
| Contributor from an outreach link (mostly alumni) | 6-digit code to any email | Only their own entries until verified; everything once verified | Reviews and entries; comments once verified |
| Moderator (Group 12) | Code to `@isb.edu` | Everything, including real author names | Verify, moderate, manage courses, settings, metrics |

Sign-in is an emailed code, not a link (Outlook's scanner opens links) and not Google or Microsoft (no IT approval needed).

---

## 4. Solution

### 4.1 Solution hypotheses

| ID | We believe... | Wrong if | How we validate |
| --- | --- | --- | --- |
| SH1 | Structured course reviews with a reason, professor, term and agreement change elective bids | Under 20% of 30+ surveyed readers name a changed bid | Outcome test (section 7.3) |
| SH2 | Career entries matched by background lead to action | Under 30% of 20+ readers name an action taken | 2-week career follow-up |
| SH3 | Asking the author settles doubts an entry cannot | Under 70% of questions answered in 48 hours | Reply time logged |
| SH4 | A 5-minute structured form gets seniors to write | Under 20 writers or 40 reviews in 10 days | Contribution drive |
| SH5 | The same entries help PGP YL first-years | Under 30 YL sign-ups; YL readers find PGP entries irrelevant | YL sign-ups and questions |

### 4.2 Riskiest assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| A1 | Seniors and alumni write honest, structured entries | **Riskiest. Tested first.** If it fails there is nothing to read |
| A3 | Entries change bids | Tested by the outcome test |
| A10 | Alumni can sign in to contribute | Tested with 5 alumni before launch |
| A4 | Authors answer follow-ups | Reply time logged |
| A5 | Career entries lead to action | Career follow-up |
| A6 | ISB administration accepts faculty-related reviews | Meet AAC/ASA before launch; fallback in section 9 |
| A7 | YL juniors find it relevant | YL sign-ups and questions |

**Design consequence:** when in doubt, make writing an entry faster. A beautiful reader experience with an 8-minute form fails the experiment.

### 4.3 How ISB Hood differs from what students use today

| Today | Does well | Fails |
| --- | --- | --- |
| Atrium course outlines | Official content | "Written in a very polished manner"; hide sub-assignments |
| Course ratings portal | One score per course | No reasons; differs by campus |
| Seniors and alumni | Trusted, personal | 1 to 2 opinions; depends on who you know |
| Alumni portal, buddies | Assigned contact | Low reply rates; varies by buddy |
| LinkedIn, Topmate, Reddit | Reach beyond ISB | Cold, generic, often paid |
| LLMs on outlines | Fast summary | Only as good as the outline |
| Repositories, WhatsApp | Peer-made, free | Half-filled, stale, lost in noise |

ISB Hood's differences: **reasons, not ratings** (every entry says why); **many voices** (shows how many agree); **dated** (professor and term on every entry, changed courses flagged); **matched** (filter by background and track); **reachable** (ask the author); **lasts** (survives the batch that wrote it).

---

## 5. MVP 1 scope

### 5.1 Goals

**P0 (must be met in MVP 1)**

- Course supply: 40+ reviews from 20+ contributors, 10+ Term 7 courses with 3+ reviews, by 3 Jan 2027
- Course outcome: 20%+ of 30+ matched readers change their bid answer (section 7.3)
- Career supply: 10+ entries: 5+ playbooks across 3+ tracks, 5+ company notes
- Career outcome: 30%+ of 20+ readers name an action they took
- 70%+ of questions answered within 48 hours
- All events logged from day one

**P1 (can slip to MVP 2)**

- 30+ PGP YL sign-ups and 10+ questions from YL to Co'27 authors
- 25%+ of readers come back on a later day and read an entry
- 50%+ of Term 7 electives with 3+ reviews
- Fake-door click-through measured for chat and people finder

### 5.2 Scope fence

| In (P0) | Fake door only | Out: do not build or stub |
| --- | --- | --- |
| F1 course review form · F2 course page · F3 playbook and company note · F4 career filter and "Like me" · F5 ask the author with email · F6 sign-in, profile, verification · F7 events and surveys · moderation queue · metrics page | F8a "Request a chat" · F9a "Find people like me" | Places, food, events · first-term guide · AI summaries · private chat · people finder · mobile app, push · salary or offer amounts · feedback channel to ISB admin · Mohali campus |

### 5.3 Non-goals and why

| Non-goal | Why not now |
| --- | --- |
| Places, food, events | Mild pain; friends and apps already work |
| First-term and admin guide | Real pain, but only early in Term 1 |
| AI recommendations or summaries | Needs 3+ reviews per course first |
| Private chat, people finder | Fake doors first; build on evidence |
| Mobile app, push | A web link in WhatsApp is enough to test |
| Salary or offer amounts | Sensitive; not needed to learn |
| Mohali campus | Scope is Hyderabad only |

### 5.4 Features

| ID | Feature | Core functionality | Telemetry | Error and edge cases | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Course review form | 4 steps with a progress bar; the draft saves to the server as you type (2.5 s after the last change) and at each step; preview, publish, edit, delete with an in-page confirmation; named or "Verified Co'XX"; open-to-questions toggle; course preselected from link; the professor and term preselected when there is only one | `form_started`, `form_step_completed` (step ends only, not background saves), `entry_submitted` (`form_seconds`) | Rating with no reason cannot publish; evaluation mix must total 100; closed tab restores the draft; "my professor or term is not listed" creates a pending offering | Built |
| F2 | Course page | Header, "new or changed" banner, summary block (workload, evaluation mix, quant/qual, grade risk, learning value with agreement, outline match, top 3 take/skip), reviews newest first | `course_page_viewed`, `value_reached` | Under 3 reviews: "Based on N reviews", agreement hidden; zero reviews: invite to write | Built |
| F3 | Career entries | Track playbook and company note on the same step/autosave/preview components | `entry_submitted`, `career_entry_viewed` | Pay-figure soft check; gated by settings | Not built (M7, 7 to 20 Dec) |
| F4 | Career filter | Track, company, background; "Like me" toggle | `filter_used` | Gated by settings | Not built (M7) |
| F5 | Ask the author | Question and replies under each entry; email to author within 5 minutes; one-click reply link; "Author" label on anonymous replies; notification preference | `comment_posted`, `comment_answered` (`hours_to_answer`) | Email missed: "questions waiting" on My activity | Built |
| F6 | Sign-in and verification | Emailed code; `@isb.edu` readers; contributors any email; onboarding profile; moderator verification against outreach list | `user_signed_up` | Non-ISB on reader door sent to contributor link; unverified sees only own drafts | Built |
| F7 | Surveys | Post-bid survey; career follow-up; in-app prompt, email, one reminder | `survey_shown`, `survey_submitted` | Under minimum sample shows "Inconclusive" | Built (career follow-up needs F3) |
| F7b | Bid-intent question and phase nudges | See section 7.3 | `bid_intent_answered`, `nudge_answered` | One tap, skippable | **[not built yet]** |
| F8a, F9a | Fake doors | "Request a chat" (on entries), "Find people like me" (on career list) open an early-access sheet | `fake_door_clicked` (`left_contact`) | Sheet says it is not built yet; offers "ask a public question instead" | Built; F9a placed with M7 |
| Mod | Moderation | Flag with reason; queue with age (red past 20 hours); keep, remove, request edit; content rules page | Flag logged | Flagged content stays visible until checked | Built |
| Admin | Admin pages | Verification, courses and offerings CSV, outreach list, metrics, settings | n/a | Moderators only | Built |
| Proto | Prototype mode | Runs with no Supabase keys, on sample data in `lib/demo/seed-data.ts`. Sign-in runs every email check but sends no email, and any 6-digit code signs in: a sample person's email signs in as them, any other address makes a new account. A "Testing the prototype? Start here" panel on sign-in with the four primary personas; a numbered demo script for each, in a side panel opened from a floating "Demo script" button at the bottom right of every app page (open by itself on a persona's first visit, then on demand); a strip on every page saying who you are, with "Switch persona" and "Reset"; a "Sample accounts" page | None (no PostHog, no email) | Turns off by itself once Supabase keys are set; it is never part of the real sign-in | Built (for demos and usability tests only) |
| Share | Share-to-WhatsApp link | Share a course page; opens for people not signed in show a preview and sign-in | `share_link_opened` | No entry text visible without sign-in | **[not built yet]**, P1 |

Full field specs, aggregation rules and data model: `docs/BUILD_PLAN.md` sections 4 to 7.

### 5.5 Trust, privacy and guardrails

- **Review the course, not the person.** Shown at the top of every form. No personal remarks about faculty, staff or students.
- Anonymous authors show as "Verified Co'26 student"; their identity never reaches the browser. Only moderators see who wrote it.
- Authors can edit or delete any entry at any time, and delete their account.
- **Never collect** grades, salaries, offer amounts or phone numbers.
- Flags checked within 24 hours.

---

## 6. Screens and flows

### 6.1 Route map

| Route | Screen | Access |
| --- | --- | --- |
| `/signin` | Sign in with emailed code; the title and one line on what the site is, then the sign-in card, then the student-led context (Group 12, research figures) and the contributor link. Desktop: story left, sign-in right | Public |
| `/contribute` | Contributor landing: what we ask, 5 minutes, how identity is shown | Public |
| `/onboarding` | Profile: programme, cohort, pre-MBA function and industry, years, target track, source | First visit |
| `/` | Home: Courses, Careers, search, "Write a review" | App |
| `/courses`, `/courses/[code]` | Course list with filters; course page at its course code, e.g. `/courses/MKT-501` (older id links redirect) | App |
| `/careers`, `/careers/[id]` | Career list with "Like me"; entry page | App, gated |
| `/write`, `/write/course-review` | Chooser; review form | App |
| `/write/playbook`, `/write/company-note` | Career forms | App, gated |
| `/me` | My entries, questions waiting, edit, delete, notification preference, delete account | App |
| `/survey/post-bid`, `/survey/career` | Surveys | App |
| `/rules`, `/privacy` | Content rules; what we store and never store | Public |
| `/sample-accounts` | The sample people, grouped as information seekers, contributors and other states; continue as anyone in one tap ("Switch persona" in the strip) | Prototype only |
| `/admin/*` | Queue, verification, courses, outreach, metrics, settings | Moderator |

### 6.2 Core journeys

**Reader (Elective Optimiser, PGP Co'27):** WhatsApp link in section group → sign in with code → onboarding → course list (Term 7 default during bidding) → course page with 3+ reviews (**value reached**) → bid-intent tap → ask the author → reply email (**hook**) → phase nudges → post-bid survey.

**Writer (Senior or Alum Guide, Co'26):** outreach link with course preselected → contributor landing → code to any email → onboarding → 4-step form → publish (pending until verified) → moderator verifies → live → question email → one-click reply.

**YL reader:** same as the reader once `yl_read_open` is on.

**Career pivoter:** career list → "Like me" → playbook from someone with the same background → ask the author or "Find people like me" (fake door) → 2-week follow-up.

**Moderator:** verification queue → flags → metrics page → settings.

### 6.3 Visual system

Stella's colours with Kero's shapes and serif titles, in two themes: dark (the reference) and light. The app follows the phone or computer's setting. A sun/moon button at the top right of every screen switches theme and is remembered in that browser; choosing the theme the system already uses goes back to following the system. The phone's address bar takes the same colour.

- Dark: page `#0c0c0c`, surfaces `#141414`, hairlines `#262626`, white text, muted `#bababa`, one sky-blue accent `#87cefa` **only for things you can tap**. Selected chips: white on dark.
- Light: page `#f5f5f5`, surfaces `#ffffff`, hairlines `#e2e2e2`, near-black text, muted `#595959`, accent `#0a6aa6` (sky blue is too faint on white). Selected chips: dark on light. Every text pair 4.5:1 or better in both themes.
- Body: Geist. Titles: Hedvig Letters Serif, weight 400.
- Corners: 20px cards, 12px fields, alerts and inner panels, pill buttons and chips.
- Four type sizes per screen: 32 / 20 / 16 / 14. Minimum 16px body text, 44px tap targets.
- Phone first, 360px wide. Two layouts, no tablet step:
  - Under 1024px: one column; a bottom tab bar (Home, Courses, Write, Activity, plus Admin for moderators); the course page's write button pinned above the tab bar.
  - From 1024px: a header with the sections and a course search pill; Home and the course list as card grids (3 columns); the course page in the same order as on phones, its cards at the full page width (written answers inside reviews keep about 75 characters per line): summary ("What reviewers say", its four facts in one row), then all reviews, with the write button pinned to the bottom of the window; sign-in and contributor pages split into story and sign-in.
  - Forms and reading pages (review form, onboarding, My activity, surveys, rules, privacy) stay one readable column at every width.
- **One filled accent button per screen**, the screen's main action. Other actions are outline buttons or text links.
- Use tokens in `app/globals.css` and class strings in `components/styles.ts` (`type-title`, `type-heading`, `type-label`, `type-tag`, `type-status`). No new colours or shadows.
- Every screen has loading, empty and error states. Loading shows grey placeholders shaped like the content, so nothing jumps when data arrives.
- Inside a review: the four facts, then the reviewer's written answers (outline gap, who should take it, who should skip it, then the reasons), then the evaluation mix, then one compact labelled block (teaching style, careers it helps, why they took it, outline match). It uses the "What reviewers say" card's formatting: quiet labels (14px, muted) over semibold values, the same evaluation bar and legend, and spacing instead of lines between sections, so the reviewer's words stay the strongest text. Bold capitals and hairline dividers were tried and dropped (`docs/UX_AUDIT.md`).
- Course page: a "Read the N reviews ↓" link under the title jumps past the summary. The questions control is always "Ask the author" (with "· N questions" when there are any); the author sees "Questions from readers".
- Career paths ("who should take it") are specific, one level under the track (for example Investment banking, Corporate finance and M&A, FP&A under Finance; list in `docs/BUILD_PLAN.md` 5.5). They show as pills, one path each, side by side: on course list cards (most named first), in "What reviewers say" (with how many reviewers named each; the written take and skip lines are not repeated there, they are in each review) and in each review.
- Phones: with the bottom tab bar, the page scrolls in an area that ends at the top of the tab bar, so the scrollbar never runs behind the menu; each new page starts at the top. The page does not rubber-band past its top or bottom. The "Content rules" and "Privacy" links show only at the end of the sign-in page and My activity (on desktop they are the footer of every page); the review form also links to the content rules.
- Outside material (decks, posters) uses ISB navy and teal instead; the app does not.

---

## 7. Metrics

### 7.1 North Star

**Courses researched per active junior, per bidding window.**

- **Researched:** opened 3+ distinct reviews of one course (careers: viewed an entry matching own track or background).
- **Active:** opened 1+ course page in the window.
- **Window:** the 5 bidding phases: bid, pre-sampling drop, post-sampling drop, re-bid, final round. Resets every term.
- **Target:** 2+ courses per active junior in Term 7 bidding. If it falls 20%: check depth, then breadth, then review format.
- **Game type:** productivity. Users win when they decide better with less effort, so we count courses researched, not time on site. The rate has a denominator and can fall.

| Input | Definition |
| --- | --- |
| Breadth | % of the batch active in the window |
| Depth | % of viewed electives with 3+ reviews |
| Frequency | Returns across the 5 phases |

**Counter-metric:** % who say the course did not match the reviews (nudge 2). **Stop rule:** above 30%, pause expansion and fix the review format. Also watched: entries flagged or removed.

**Indirect reach (not in the North Star):** the North Star undercounts because readers brief friends. Measured by a WhatsApp poll after phase 1 ("Read it myself / Heard from a classmate / Didn't use") and share-link opens by people not signed in.

### 7.2 Pass lines

| | Test 1: Courses | Test 2: Career |
| --- | --- | --- |
| Writers | Co'26 alumni; Co'27 for finished courses | Co'27 and Co'26 |
| Readers | Co'27 (Term 7 bids), PGP YL | Co'27 in placements, PGP YL |
| Supply pass | 40+ reviews from 20+ people; 10+ Term 7 courses with 3+ reviews, by 3 Jan | 10+ entries: 5+ playbooks across 3+ tracks, 5+ company notes |
| Outcome pass | 20%+ of 30+ matched readers change their bid answer | 30%+ of 20+ readers name an action taken |
| Both | 70%+ of questions answered within 48 hours | |

Under the minimum sample a result shows **"Inconclusive: extend the survey"**, never pass or fail.

### 7.3 Outcome test for courses **[not built yet: the code has only the post-bid survey]**

1. **Bid-intent question** on the course page, once per course: "Planning to bid on this? Yes / No / Unsure". One tap, shown after scroll or about 15 seconds, skippable.
2. **Nudge 1**, after phase 1 results: "Planning to drop any? Did a review influence it?"
3. **Nudge 2**, after the post-sampling drop: "Did the course match the reviews?" (feeds the counter-metric)
4. Nudges go only to readers who opened a course page; one tap each; show the batch's answers as the reward.

**Pass:** 20%+ of 30+ matched readers change their answer between the course-page question and nudge 1 (Unsure to decided, or Yes to No and back). Under 30 matched pairs: count only readers who changed a bid and name the course. "Confirmed" is reported, not counted. Only nudge 1 counts towards the pass line.

The existing post-bid survey (11 to 17 Jan) stays as a backup read. **[confirm]** whether to build F7b before the drive or keep only the survey.

### 7.4 Events

| Event | When | Feeds |
| --- | --- | --- |
| `user_signed_up` | Profile completed | Arrived; programme split |
| `course_page_viewed` | Course page opened | Active juniors; breadth |
| `review_opened` **[not built yet]** | Full review opened | Courses researched (North Star) |
| `career_entry_viewed` | Career entry opened | Career value |
| `value_reached` | First course page with 3+ reviews; first matching career entry; first reply received | Activation |
| `return_visit` | First entry view on a later IST day | Frequency |
| `entry_submitted` | Entry submitted (`form_seconds`) | Supply |
| `form_started`, `form_step_completed` | Form diagnostics | Form drop-off |
| `comment_posted`, `comment_answered` | Question asked; first author reply | Reply rate |
| `filter_used` | Any filter or "Like me" | Diagnostic only |
| `fake_door_clicked` | Either fake door | Demand for F8, F9 |
| `survey_shown`, `survey_submitted` | Surveys | Outcome |
| `bid_intent_answered`, `nudge_answered` **[not built yet]** | Bid-intent tap; nudge answer | Outcome test; counter-metric |
| `share_link_opened` **[not built yet]** | Shared link opened by someone not signed in | Indirect reach |

All events are written server-side to our own `events` table (source of truth) and mirrored to PostHog. Every event logs the user, time and session; course events also log the course and bidding phase.

### 7.5 Decision rules (written before launch)

| Result | Decision |
| --- | --- |
| Supply under 50% | Stop building. Concierge: the team interviews seniors and enters reviews on their behalf |
| Supply 50 to 99% | One more 5-day drive with a shorter form and named asks; then open only courses with 3+ entries |
| Supply 100%+ | Open to readers; read the outcome |
| Changed under 10% | Rethink the format |
| Changed 10 to 19% | Iterate (comparison view, fewer fields); retest next bid |
| Changed 20%+ | Continue; widen to all of Co'27 and PGP YL |
| Career action under 15% / 15 to 29% / 30%+ | Drop career for now / rework fields / continue |
| Chat (F8) | Build only if "Request a chat" gets 15%+ click-through from readers shown it, or 20%+ of threads pass 3 messages |
| People finder (F9) | Build only if 15%+ click-through from career readers and 10+ leave contact |

---

## 8. Roadmap

| | MVP 1 · Dec to Jan | MVP 2 · Feb to Mar | MVP 3 · Apr onward |
| --- | --- | --- | --- |
| Theme | Prove the loop | Deepen trust and reach | Make it last |
| Scope | Course reviews and pages; ask the author; career entries and "Like me"; surveys; fake doors | Private chat pilot and people finder pilot (each only if its fake door passes); course comparison view; wider Co'27 and PGP YL access | Co'27 handover drive before graduation; ISB runs Hood from Apr 2027; offer to other 1-year programmes (proposal); freshness flags; AI summaries once courses have 3+ reviews |
| Release metric | 40+ reviews from 20+ writers; 20%+ change a bid answer | 25%+ of readers return; 30+ YL sign-ups | 50%+ of electives with 3+ recent reviews; sponsor commitment |
| Gate | Supply and outcome pass lines met | A fake door reaches 15%+ of readers shown it | Co'27 writes for Co'28; ISB agrees to sponsor and run it |

**Where we drew the line.** Minimum: one loop, one entry template for two content types, public comments only, manual moderation, seeded course lists, no AI, places or app. Viable: every part of the loop is present, so a failed pass line tells us which belief was wrong.

---

## 9. Risks and pre-mortem

| Why it fails | Early signal | Mitigation |
| --- | --- | --- |
| Seniors do not write | Under 50% of supply by 3 Jan | Concierge entries; named asks per course |
| Form feels too long | Median `form_seconds` over 5 minutes; step drop-off | Shorter variant ready; course preselected; autosave |
| Readers find thin pages | Courses under 3 reviews | `min_reviews_to_open_course` gate; "Based on N reviews" |
| Authors do not reply | Under 70% answered in 48 hours | Email alert; one-click reply; "questions waiting" |
| ISB objects to faculty reviews | AAC or ASA raise a concern | **Fallback:** drop professor ratings; keep course content, workload and evaluation; signed-in ISB users only; run the test |
| An anonymous author is exposed | Any leak in a test | Server-only reads; automated leak test; "Author" label |
| Emails land in spam | Reply rate reads low | Plain-text email from a real Gmail account; in-app "questions waiting" |
| Too few survey answers | Under 30 responses | Prompt, email, reminder; chase in section groups |
| Term 7 list published late | Pages cannot be seeded by 7 Dec | Seed from last year's list; "not listed" offering path |
| Prototype sign-in reaches real users | Anyone can sign in with any code | Prototype mode switches off whenever Supabase keys are set; check `/sample-accounts` returns "not found" on the live site before launch |

---

## 10. Go-to-market

Writers first, then readers, timed back from Term 7 bidding (4 Jan 2027, cannot move).

| When | Step |
| --- | --- |
| To 6 Dec | Outreach list per Term 7 course (own contacts, CAC alumni mapping); agree content rules with AAC and ASA; 5-student usability test; 5-alumni sign-in test |
| 7 to 20 Dec | Course writer drive: named asks, link with course preselected; Co'27 sections for courses they finished |
| 21 Dec to 3 Jan | Career drive if course supply is 50%+; open course pages to PGP YL; career readers from 28 Dec; supply read on 3 Jan |
| 4 to 10 Jan | Term 7 bidding: link in Co'27 section groups; bid-intent and nudges live |
| 11 to 24 Jan | Post-bid survey; career follow-up; apply decision rules; write-up |
| Apr 2027 | Co'27 handover drive for Co'28 |

Early adopters: Co'27 students bidding in Term 7, and seniors who already answer the batch's questions.

---

## 11. Business model (proposal for the team to confirm)

Free for students. A paywall would cut the supply the product depends on.

| Who could pay | Why they would | When |
| --- | --- | --- |
| ISB alumni office or CAS | Fewer repeat queries to CAS and AAC; better elective fit | After Test 1 passes |
| Other 1-year programmes | Each batch's knowledge leaves with it | After a second ISB batch |
| 2-year colleges | Knowledge that survives graduation | Later, renamed |

**Business goal metric:** sponsor commitment by Apr 2027. Not in the MVP: we ask only after Test 1 passes.
**Cost today:** about ₹0 a month on free plans (Vercel Hobby, Supabase free, Gmail SMTP, PostHog free). Do not add a paid dependency without asking.
**Caveats:** each new campus needs its own writer drive; a paying institution may push to soften reviews, so content rules are agreed upfront.

---

## 12. Open questions

| # | Question | Default if unanswered |
| --- | --- | --- |
| 1 | Build F7b (bid-intent and nudges) before 7 Dec, or keep only the post-bid survey? | Keep the survey; add F7b if time allows |
| 2 | Exact ISB email domain(s) for PGP and PGP YL | `isb.edu`, list is a setting |
| 3 | When are Term 7 courses and professors published? | Seed from last year |
| 4 | Do PGP YL take the same electives, and when do they bid? | Read-only access to the same pages |
| 5 | Who owns the AAC/ASA meeting, and when? | Proceed with content rules; keep removal fast |
| 6 | Moderator on-call rota during the drive | All five team members |
| 7 | Final vocabularies for function, industry, track, company type | Lists in BUILD_PLAN 5.5 |
| 8 | Survey prompt says the answer "decides whether this continues" (UX audit ethics flag: mild pressure). Soften it? | Suggested: "tells us whether this helped" |
| 9 | The five "needs user research" items in `docs/UX_AUDIT.md` (summary or reviews first on phones; grid or comparison table; tab bar while writing; theme button without a label; survey wording) | Test in the 5-student usability test before 6 Dec |
| 10 | The specific career paths under each track (BUILD_PLAN 5.5) are a first cut. Right list? | Use it for the drive; rename freely, but values are hard to change once reviews exist |

---

## 13. Notes for design and prototyping sessions

Use this section when designing new screens, writing sample content or creating personas for demos.

### 13.1 Rules

- Follow the visual system in 6.3 exactly. No new colours, shadows or type sizes; one filled accent button per screen.
- Phone first (360px). Check every new screen in both layouts (375px and 1440px) and both themes. Every new screen needs loading (shaped placeholders), empty and error states.
- Tap targets at least 44px; any new colour pair at least 4.5:1 for text and 3:1 for borders and charts, in both themes.
- After a set of new screens, re-run the Laws of UX audit and add the results to `docs/UX_AUDIT.md`.
- Do not design or stub out-of-scope features (5.2). Chat and people finder appear only as fake-door buttons and the early-access sheet.
- Never show, collect or imply grades, salaries, offer amounts or phone numbers.
- Anonymous entries show "Verified Co'XX student"; replies by that author show "Author".
- The writer path matters most. Any change that adds time to writing a review needs a reason.

### 13.2 Fake personas and sample data

- **All personas and sample people must be fictional.** Never use the names of real interviewees or classmates, and do not reuse verbatim interview quotes as sample review text.
- Sample faculty: "Prof A", "Prof B" and so on. Sample courses can use real-sounding titles but no real course codes tied to real faculty.
- **Primary personas** for the prototype, built from 3.1 (profiles filled, so sign-in goes straight to Home). Emails, situations and step-by-step walkthroughs, including a two-window "both sides" script, are in `docs/PERSONAS.md`:

| Persona | Side | Based on | Email |
| --- | --- | --- | --- |
| Ananya Kulkarni, PGP Co'27, ex risk consultant | Information seeker | Elective Optimiser (J1) | `ananya.kulkarni@isb.edu` |
| Arjun Bhatia, PGP Co'27, CA and ex-banker moving into product | Information seeker | Career Pivoter (J2, J4); a question waits on Karan's review | `arjun.bhatia@isb.edu` |
| Karan Malhotra, Co'26 alum, now a product manager, personal email | Contributor | Senior or Alum Guide (J5); a live review and Arjun's question waiting | `karan.malhotra@example.com` |
| Ishita Sharma, PGP Co'27, finished Business Analytics in Term 5 | Contributor | A Co'27 student reviewing a finished course | `ishita.sharma@isb.edu` |

- Other demo people in `lib/demo/seed-data.ts` show other states (keep them consistent):

| Demo person | Role | Shows |
| --- | --- | --- |
| Ravi Menon | PGP Co'27 reader | Reading, asking, post-bid survey, his own review |
| Meera Das | PGP YL reader | YL reader view |
| Asha Rao | Co'26 alum, named | Writing a review, answering questions |
| Kiran Shah | Co'26 alum, anonymous | Answering as "Author" |
| Dev Nair | Co'25 alum, unverified | Waiting for verification |
| Nisha Kapoor | Moderator | Verification, flags, imports, metrics |
| Rohan | New student | Onboarding |

- **Name clash to fix [confirm]:** the research personas use "Meera" (PGP YL) and "Rohan" (alum guide), while the demo uses Meera Das (YL, consistent) and Rohan (new student, different role). Pick one meaning for Rohan before the term-end demo.
- Gaps still open: Arjun's "Like me" story waits for F3 and F4 (he uses course reviews until then), and there is no PGP YL first-year asking a Co'27 author yet (Meera asks a Co'26 alum). The Co'27 writer gap is covered by Ishita.
- Sample faculty in the seed data still use surnames ("Prof Sen", "Prof Bhatt") from before the "Prof A, Prof B" rule. **[confirm]** rename them before the term-end demo.

### 13.3 Screens most worth designing next

1. Bid-intent tap on the course page and the two phase nudges (F7b), including the "batch answers" reward view.
2. Career list with "Like me", playbook entry page, company-note entry page (F3, F4).
3. Share-to-WhatsApp preview for people not signed in.
4. Course comparison view (MVP 2 candidate).
5. Empty and thin states for courses with 0, 1 and 2 reviews.

---

## 14. Sources

- `docs/source/ISB_Hood_MVP_Requirements.docx` (spec v0.2)
- `docs/source/ISB_Hood_Solution_MVP_Prioritization_deck.pptx` (Assignment 2)
- `docs/source/ISB_Hood_Product_Note.pdf` (original vision)
- Assignment 1 persona submissions and interview transcripts (team folder)
- Assignment 3 deck: GAME framework, North Star, strategy, roadmap, backlog
- `docs/BUILD_PLAN.md`, `docs/KNOWN_DEBT.md`, `docs/RUNBOOK.md`
- `docs/PERSONAS.md` (prototype personas and walkthroughs), `docs/UX_AUDIT.md` (Laws of UX audit and re-audit, 25 Nov 2026)
