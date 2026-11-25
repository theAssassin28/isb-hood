---
author: CT
---

# Laws of UX Audit: ISB Hood prototype

Scope: every screen of the clickable prototype (demo mode, sample data), in both themes and both layouts. Reviewed 25 Nov 2026 on branch `design/login-page`.
Platform: mobile web (375 px, below 1024 px) and desktop web (1440 px, 1024 px and up). Light and dark themes.
Not reviewed: real email delivery and reply links, the daily email job, PostHog, and anything that needs Supabase (none of it runs in the demo). Career entries and "Like me" (F3, F4) and bid-intent nudges (F7b) are not built yet.

How it was measured: each screen was loaded at 375 px and 1440 px as the right sample person, and a script measured every visible control (size, accent fills per screen, labels, headings, sideways scroll). Contrast was computed from the theme tokens for every text, control and chart pair. Flows were walked by hand in the browser.

## Course page and "All reviews" (26 Nov 2026)

Scope: the course page (S9) only, after its desktop layout changed (reviews heading on top; review cards and summary card side by side) and review section titles were made bold capitals. States reviewed: 3+ reviews with a changed professor (`/courses/MKT-501`), 4 reviews with your own entry and open questions (`/courses/STR-503`), 2 reviews ("Based on 2 reviews", `/courses/FIN-507`) and no reviews (`/courses/NEG-504`). Phone 375 px and desktop 1440 px, dark and light.
Not reviewed: a course with more than 6 reviews (none in the sample data).

Overall: 0 Critical, 2 Major, 3 Minor. **All 5 fixed the same day; re-measured below.**

| Finding                                 | Before                                                             | After                                                                                                                                                                                 | Status                                                        |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Review cards too heavy                  | 24 emphasised runs, 8 bold capitals titles                         | 1 bold run per card (the offering line); titles are quiet labels                                                                                                                      | Fixed                                                         |
| Phone: reviews a screen and a half down | first review at 1,072 to 1,227 px, no shortcut                     | "Read the 3 reviews ↓" (44 px tall) at 258 px, in the first screen; tapping it puts the reviews heading just under the header                                                         | Fixed                                                         |
| Two names for the questions control     | "Ask the author" or "Questions (1)"                                | always "Ask the author", with "· 1 question" when there are any; the author sees "Questions from readers · 1 waiting for you"                                                         | Fixed                                                         |
| Long reviews on phones                  | 1,220 to 1,244 px per review; secondary facts as 4 titled sections | the reviewer's words first; teaching style, careers, why taken and outline match in one labelled block. 1,134 to 1,158 px per review on phones (−7%), 890 to 918 px on desktop (−16%) | Fixed; still about 1.4 phone screens per review, see research |
| Capitals headings in the persona panel  | bold capitals                                                      | medium-weight sentence case, like other card headings                                                                                                                                 | Fixed                                                         |

Follow-up the same day: the hairlines between review sections were removed and the review card now uses the summary card's formatting (labels over semibold values, the same evaluation bar and legend, spacing instead of lines). Re-measured: 0 horizontal lines inside a review, 1 evaluation bar per review, no sideways scroll; a review is 1,068 to 1,092 px on phones and 884 to 908 px on desktop.

Second follow-up: on desktop the summary and reviews are no longer side by side. The page uses the phone order at every width (summary on top, then all reviews) in one 768 px column, so long review lines stay readable (74 characters per line) and the "Read the N reviews" link now shows on desktop too. Measured at 1440 px: summary from 453 to 989 px, reviews heading at 1,021 px, no sideways scroll.

Third follow-up: the cards then went back to the full page width on desktop (1,088 px at 1440, lined up with the header), with each written answer capped at about 75 characters per line inside the card (measured 72 to 74).

Scorecard before fixes (after fixes: Pass on every law, phone and desktop):

| Screen                  | Jakob | Fitts    | Miller | Hick     | Postel | Peak-End | Aesthetic | Von Restorff | Tesler | Doherty |
| ----------------------- | ----- | -------- | ------ | -------- | ------ | -------- | --------- | ------------ | ------ | ------- |
| S9 course page, phone   | Minor | **Fail** | Pass   | **Fail** | Pass   | Pass     | **Fail**  | **Fail**     | Minor  | Pass    |
| S9 course page, desktop | Minor | Pass     | Pass   | Pass     | Pass   | Pass     | **Fail**  | **Fail**     | Minor  | Pass    |

### [Major, fixed] S9 - Review cards were too heavy: nothing stood out

- Law: Von Restorff, Aesthetic-Usability
- Evidence: one review card had 24 emphasised text runs (8 section titles in bold capitals, 9 medium-weight values, the bold offering line and 6 more) against 16 regular ones. The reviewer's own words, the reason this product exists, were the lightest text on the card.
- Fix applied: section titles are quiet labels again (14 px, medium, muted, sentence case), with the hairline divider kept so the review still scans by section; body text back to full ink. Re-measured: 0 bold capitals; titles 500 weight, `#595959` on white (7.0:1) and `#bababa` on `#141414` (9.5:1). The review card and the summary card now use the same label style.

### [Major] S9 phone - The reviews start a screen and a half down

- Law: Hick, Fitts
- Evidence: at 375 x 812 the summary card is 694 to 742 px tall and comes first, so the first review starts at 1,072 px (FIN-507) to 1,227 px (MKT-501). The reasons, the core of "reasons, not ratings", are below the second screen.
- Why it matters: readers deciding a bid skim; what needs two screens of scrolling is often never reached.
- Fix: under the course title on phones, a link "Read the 3 reviews ↓" that jumps to `#reviews`; or collapse the summary on phones to its four facts with "Show the full summary". The first is one line of code; the second changes more and should follow the research question below.

### [Minor] S9 - The same control has two names

- Law: Jakob (consistency)
- Evidence: under a review with no questions the control reads "Ask the author"; with one it reads "Questions (1)". It is the same place to ask.
- Fix: "Ask the author" always, with the count after it when there is one: "Ask the author · 1 question".

### [Minor] S9 - Each review is long on a phone

- Law: Tesler, Miller
- Evidence: one review is 1,220 to 1,244 px tall at 375 px (about one and a half screens) with 12 chunks; three reviews come to about 3,700 px. The chunks are well labelled (Miller passes); the length comes from secondary facts.
- Fix: show the four facts, "What the outline did not tell you" and "Who should take it / skip it" first; fold teaching style, careers it helps, why they took it and outline match into one row of tags.

### [Minor] Prototype panel - Capitals headings are now the only ones in the app

- Law: Aesthetic-Usability (consistency)
- Evidence: the sign-in persona panel still uses bold capitals ("LOOKING FOR ADVICE"), the style just removed from reviews.
- Fix: use the same `type-label` style there.

### Passes worth keeping

- Desktop: the review cards and the summary card start on the same line (both at 454 px); the summary scrolls with the page.
- Line length on desktop: 74 to 79 characters per line, inside the readable range.
- Targets: "Ask the author", "Request a chat" and "Flag this review" are all 44 px tall; "Flag" is 78 px (phone) and 375 px (desktop) from "Request a chat", so the report action is not crowded next to the friendly one.
- One filled button: "Took this course? Add your review" (or "Edit your review"), pinned above the tab bar on phones and under the summary on desktop. The page ends on it, never on a dead end.
- States: "New or changed course" warning when the professor changed; "Based on 2 reviews" with agreement hidden under 3; "No reviews yet" with a link to write the first; shaped placeholders while loading.

### Needs user research

- **Show the reviewer's background?** Job J1 is "from people like me", but a review shows only "Tara Iyer, Co'26" or "Verified Co'26 student". Adding pre-MBA function or target track would help matching, but for an anonymous author in a small cohort it could reveal who wrote it (see ethics). Test whether readers miss it before deciding.
- **Summary first, or reviews first, on phones?** (also in the first audit). The "Read the reviews" link is the cheap step, now in place; watch whether people use it.
- **Still-long reviews.** A review is about 1.4 phone screens because each has five written answers. Collapsing the last two ("Why that learning value", "Why that grade risk") behind "More" is a judgment call: they carry reasons, the product's core. Test before cutting.
- **Sorting reviews.** Newest first is fine at 2 to 4 reviews; check again when a course passes 6.

### Ethical flag

- Showing a background next to an anonymous review is a re-identification risk (a CA from banking in a 400-person batch is a short list). If it is added, show it only for named reviews, or only once a course has enough reviews that a background matches several people.

## Re-audit after fixes (25 Nov 2026)

All 10 findings are fixed and were re-measured on every screen at 375 px and 1440 px, signed in as the right sample person. Every screen now passes every law in the scorecard. The survey wording under "Ethical flags" and the "Needs user research" items are unchanged: they need a team decision or testing.

| Finding                               | Before                                    | After                                                                                                                                                         | Status             |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| S1 phone sign-in below the fold       | button ends at 924 px on an 812 px screen | ends at 628 px; title, then sign-in, then the project facts                                                                                                   | Fixed              |
| S6, S8 competing accent buttons       | 3 fills on Home, 2 on Courses             | 1 fill on every screen ("Answer now" and Home search are outline buttons; header search is a plain icon)                                                      | Fixed              |
| S11 single offering not pre-selected  | empty radio, extra tap                    | the only confirmed offering is selected; "not listed" still available                                                                                         | Fixed              |
| S9 duplicate write button on phones   | 2 buttons                                 | 1 at each width                                                                                                                                               | Fixed during audit |
| S16 header search button              | 36 x 36 px                                | 44 x 44 px in a 48 px pill                                                                                                                                    | Fixed              |
| S16 demo strip                        | 93 px, two lines, 36 px links             | 45 px, one line ("Prototype"), 44 px links                                                                                                                    | Fixed              |
| S15 metrics scrolls sideways          | page wider than 375 px                    | tables scroll inside their own box; page fits                                                                                                                 | Fixed              |
| S8, S9 loading text, page jumps       | "Loading…" line                           | placeholders shaped like the cards, summary panel and reviews (static, announced to screen readers)                                                           | Fixed              |
| S11 saved only on Continue            | a closed tab lost the current step        | saves 2.5 s after the last change; checked by ticking an answer and reloading. Background saves log no `form_step_completed`, so drop-off data stays accurate | Fixed              |
| S11 browser confirm dialog for delete | `window.confirm`                          | in-page "Delete this draft?" with Delete and Keep it                                                                                                          | Fixed              |
| S16 address bar ignores theme choice  | stayed on the system colour               | follows the sun/moon choice, also after moving between pages                                                                                                  | Fixed              |

The sections below are the original audit, kept as the "before" record.

## Summary (before fixes)

Overall: 0 Critical, 3 Major, 7 Minor. One further Major (a duplicate button on phone course pages) was introduced by this session's layout work and fixed during the audit.

Top 3 fixes:

1. Phone sign-in: put the sign-in card in the first screen (S1). The main action is below the fold today.
2. One solid accent button per screen on Home and Courses (S6, S8). Today two or three compete.
3. Pre-select the professor and term in the review form when the course has only one (S11). Writing is the riskiest step in the experiment.

What holds up well: every text pair passes 4.5:1 and every control and chart colour passes 3:1 in both themes; every screen has one h1 and no sideways scroll except one admin table; every form control has a label; radio and chip rows give 44 px targets through their labels; the sign-in code step, review form and contributor flow have clear progress, inline errors and a good last screen; the fake door is honest about not being built.

## Screens

| ID  | Screen                                                                  | Primary task                                 |
| --- | ----------------------------------------------------------------------- | -------------------------------------------- |
| S1  | Sign in: email step, code step, errors                                  | Get in with an ISB email                     |
| S2  | Contributor landing (`/contribute`)                                     | An alum signs in with any email              |
| S3  | Sample accounts (prototype only)                                        | Pick a persona                               |
| S4  | Static pages: rules, privacy, not ISB, sign-in problem, account deleted | Read, then go back                           |
| S5  | Onboarding, "About you"                                                 | Fill the profile once                        |
| S6  | Home, reader                                                            | Go to courses or write                       |
| S7  | Home, alum waiting for verification                                     | Understand the wait; write                   |
| S8  | Course list, with filters, empty result, PGP YL view                    | Find courses to compare                      |
| S9  | Course page: 3+ reviews, changed professor, no reviews, own review      | Judge a course; ask the author               |
| S10 | Write: pick a course                                                    | Choose what to review                        |
| S11 | Review form: 4 steps, preview, "Thank you"                              | Publish a review fast                        |
| S12 | My activity                                                             | Answer questions; manage entries and account |
| S13 | Post-bid survey, career survey                                          | Answer in under a minute                     |
| S14 | Fake door sheet ("Request a chat")                                      | Learn it is not built; leave contact         |
| S15 | Admin: flags, verify, courses, outreach, metrics, settings              | Moderate and read results                    |
| S16 | App shell: header, bottom tab bar, theme button, demo strip             | Move around; switch theme                    |

## Scorecard (screens x laws, before fixes; all Pass after)

| Screen              | Jakob | Fitts        | Miller | Hick         | Postel | Peak-End | Aesthetic | Von Restorff | Tesler   | Doherty |
| ------------------- | ----- | ------------ | ------ | ------------ | ------ | -------- | --------- | ------------ | -------- | ------- |
| S1 Sign in          | Pass  | **Fail**     | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S2 Contributor      | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S3 Sample accounts  | Pass  | Pass         | Pass   | Pass         | Pass   | N/A      | Pass      | Pass         | Pass     | Pass    |
| S4 Static pages     | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | N/A      | Pass    |
| S5 Onboarding       | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S6 Home             | Pass  | Pass         | Pass   | **Fail**     | Pass   | N/A      | Pass      | **Fail**     | Pass     | Pass    |
| S7 Home, unverified | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S8 Course list      | Pass  | Pass         | Pass   | **Fail**     | Pass   | Pass     | Pass      | **Fail**     | Pass     | Minor   |
| S9 Course page      | Pass  | Pass (fixed) | Pass   | Pass (fixed) | Pass   | Pass     | Pass      | Pass         | Pass     | Minor   |
| S10 Pick a course   | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S11 Review form     | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | **Fail** | Pass    |
| S12 My activity     | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S13 Surveys         | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S14 Fake door       | Pass  | Pass         | Pass   | Pass         | Pass   | Pass     | Pass      | Pass         | Pass     | Pass    |
| S15 Admin           | Pass  | Pass         | Pass   | Pass         | Minor  | N/A      | Pass      | Pass         | Pass     | Pass    |
| S16 Shell           | Pass  | Minor        | Pass   | Pass         | Pass   | N/A      | Minor     | Pass         | Pass     | Pass    |

"Minor" marks a cell whose only failure is a Minor finding.

## Findings

### [Major] S1 - On a phone the sign-in button is below the fold

- Law: Fitts, Hick
- Evidence: at 375 x 812 the sign-in card starts at 640 px and "Email me a sign-in code" ends at 924 px, below the screen. Above it: the demo strip (93 px, two lines), the brand, two tags, the title, a three-line lead and the research figures. On desktop the button ends at 464 px, in view.
- Why it matters: this is the first screen of every journey, usually opened from a WhatsApp link on a phone. If the one action is out of sight, people have to scroll before they know what to do.
- Fix: on phones, order the page as title, one-line lead, sign-in card, then the tags and research figures. Keep today's two-column order on desktop.

### [Major] S6, S8 - Two or three solid accent buttons compete

- Law: Von Restorff, Hick
- Evidence: Home has three filled sky-blue buttons on one phone screen: "Search", "Answer now" (survey prompt) and "Write a course review". The course list has "Answer now" and "Search" above the list. On desktop the header search button adds one more.
- Why it matters: when everything is emphasised nothing is. The design rule is one filled control per screen.
- Fix: keep "Write a course review" as the only fill on Home. Make "Answer now" an outline button (secondary style) and the page search button an outline or icon button. On the course list the search can be the only fill.

### [Major] S11 - The only professor and term is not pre-selected

- Law: Tesler
- Evidence: for Business Analytics (one offering, Prof Pillai, Term 5) step 1 shows that offering as an empty radio button above "My professor or term is not listed". The writer must tap it before anything else.
- Why it matters: supply is the riskiest belief (PRD 4.2). Each avoidable tap on the writer path costs reviews.
- Fix: when a course has exactly one offering, select it by default; the "not listed" option stays available.

### [Major, fixed during this audit] S9 - "Took this course?" appeared twice on phones

- Law: Hick, Von Restorff
- Evidence: the side-panel button meant for desktop also showed on phones, under the summary, as well as the bar pinned at the bottom. Caused by a `hidden` class overridden by the button's own `inline-flex`.
- Fix applied: the desktop button now sits in a wrapper that is hidden below 1024 px. Re-measured: one button at 375 px and one at 1440 px.

### [Minor] S16 - Header search button is 36 x 36 px

- Law: Fitts
- Evidence: the round search button inside the desktop header pill measures 36 x 36 px; the minimum is 44.
- Fix: make it 44 px (size-11) and the pill 48 px tall.

### [Minor] S16 - Demo strip links are 36 px tall and the strip takes two lines on phones

- Law: Fitts, Aesthetic-Usability
- Evidence: "Sample accounts" 113 x 36 px and "Reset demo data" 108 x 36 px; the strip is 93 px tall at 375 px. Prototype only, so it will not reach real users.
- Fix: 44 px tall links, and a shorter label ("Prototype") so the strip fits on one line.

### [Minor] S15 - The metrics page scrolls sideways on phones

- Law: Postel
- Evidence: `/admin/metrics` is wider than the 375 px screen; the cause is the results table.
- Fix: wrap each table in a horizontally scrolling container, or stack the rows as cards below 1024 px.

### [Minor] S8, S9 - Loading states are a line of text, so the page jumps

- Law: Doherty
- Evidence: every page shows "Loading…" while data streams in, then the full layout appears. In the demo this takes well under 400 ms; with the real database (Supabase, Mumbai region) it will be longer.
- Fix: grey placeholder blocks the size of the cards and summary panel, so nothing moves when data arrives.

### [Minor] S11 - Answers are saved per step, not as you type

- Law: Peak-End, Tesler
- Evidence: the form says "Your answers are saved each time you continue". Closing the tab mid-step loses that step.
- Fix: save the current step a few seconds after the last change, as PRD F1 describes ("autosave to server").

### [Minor] S11, S12 - Deleting a review uses the browser's own confirm dialog

- Law: Jakob, Aesthetic-Usability
- Evidence: `window.confirm("Delete this review? This cannot be undone.")`. It works and protects the user, but looks different on every browser and does not follow the app's style. Account deletion uses a typed "delete" in the page, which is better.
- Fix: an in-page confirmation, like the account deletion.

### [Minor] S16 - The phone's address bar colour ignores the manual theme choice

- Law: Aesthetic-Usability
- Evidence: the address bar colour follows the system setting. After tapping the sun or moon it can stay dark on a light page, or the other way round.
- Fix: update the theme-colour tag when the theme button is used.

## Flow-level findings

- **Reader (S1, S5, S6, S8, S9):** the painful peak is waiting for the code email. Mitigated: "It can take a minute; check junk mail too", "Send a new code", and "Change" for a wrong email. The value peak is a course page with 3+ reviews, reached in two taps from Home. Pass apart from S1's fold.
- **Writer (S2, S5, S10, S11):** clear progress ("1 of 4" with a bar), inline checks (a rating needs a reason; the evaluation mix must total 100), and a good ending: "Thank you" says whether the review is live or waiting and why, with "Review another course" and "Done for now". Pass, with S11's pre-selection as the one fix.
- **Alum waiting for verification (S7):** says what is happening, how long it takes (usually under a day) and what they can do now (write). Pass.
- **Ask the author (S9, S12):** a question shows as waiting; the author sees it under "Questions waiting for you" with one "Answer" link; the reply shows labelled "Author". Pass.
- **Errors and dead ends:** every error says how to fix it; empty states offer a way forward ("No course matches..." with "Clear filters"; "No reviews yet" with "Write the first one"); the fake door offers a public question instead. No dead ends found.
- **Theme:** the page follows the system; the sun/moon button sits top right on every screen (Jakob: where people look for it) and is 44 x 44 px. Picking the theme the system already uses clears the saved choice. Both themes pass every contrast check:

| Pair                           | Dark | Light | Needed |
| ------------------------------ | ---- | ----- | ------ |
| Body text on page              | 19.6 | 17.9  | 4.5    |
| Muted text on card             | 9.5  | 7.0   | 4.5    |
| Accent text (links) on card    | 10.7 | 5.8   | 4.5    |
| Text on accent buttons         | 11.4 | 5.8   | 4.5    |
| Warning text on card           | 13.9 | 5.9   | 4.5    |
| Error text on card             | 7.7  | 6.6   | 4.5    |
| Field borders on card          | 9.5  | 4.5   | 3.0    |
| Chart colours on card (lowest) | 4.7  | 4.9   | 3.0    |

## Ethical flags

- **Survey prompt pressure (Minor):** "It takes under a minute and decides whether this continues" leans on guilt. "Not now" is neutral, which is good. Suggest: "It takes under a minute and tells us whether this helped."
- **No dark patterns found.** The fake doors say plainly that the feature is not built. Account deletion needs a typed confirmation and explains what is kept. Anonymous posting is the author's choice and the identity never reaches the browser. Grades, salaries, offer amounts and phone numbers are never asked for. No infinite scroll, streaks or variable rewards.
- **Prototype sign-in:** any 6-digit code is accepted, and every sign-in screen labels this as a prototype. It must not reach real users; the real sign-in path is unchanged.

## Needs user research

These are judgment calls; test them by watching people use the prototype, not by asking for opinions.

- **Phone course page order:** the summary comes before the reviews. Do readers want the verdict first, or the reasons?
- **Course list as a grid:** a 3-column grid is good for browsing, but the job is comparing 16 to 20 electives. A comparison table may suit it better (a candidate for MVP 2).
- **Tab bar while writing:** the bottom tab bar stays visible during the 4-step form. It makes leaving easy (answers are saved per step). Watch whether writers tap away mid-form.
- **Theme button without a label:** sun and moon icons are common, but "follow the system again" happens only by picking the system's theme. Check whether anyone misses an explicit "System" option.
- **Survey wording:** whether the softer wording above changes response rates.
