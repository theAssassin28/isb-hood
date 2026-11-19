# Runbook

## Local development

```bash
pnpm install
```

```bash
pnpm dev
```

Checks (the same ones CI runs):

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm test` applies every file in `supabase/migrations/` to an in-process Postgres (PGlite) and checks the access rules. No Docker or Supabase account is needed to run it.

## One-time setup of the hosted services (all free plans)

These steps need a person with a browser; they create accounts and cannot be scripted from here. Do them in this order. Put every key in Vercel's environment variables and in a local `.env.local` (names in `.env.example`); never commit them.

1. **GitHub.** Create a private repository and push this folder. CI (`.github/workflows/ci.yml`) runs on every push.
2. **Supabase.** Create one project on the Free plan, region Mumbai (`ap-south-1`). Copy the project URL, anon key and service-role key.
3. **Database.** In the Supabase SQL editor run, in order: `supabase/migrations/0001_schema.sql`, `0002_access.sql`, `0003_default_settings.sql`, `0004_verification.sql`, `0005_courses_admin.sql`, `0006_value_once.sql`, `0007_comments_moderation.sql`, `0008_surveys_metrics.sql`, and any later numbered files. For a development project also run `supabase/seed/dev_seed.sql`.
4. **Check access on the real database.** In the SQL editor: `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;` must return no rows.
5. **Google sign-in.** In Google Cloud Console create an OAuth client (Web). Authorised redirect URI: the callback URL shown in Supabase under Authentication > Providers > Google. Set the consent screen to External and **In production** (only email and profile scopes, so no Google review). Paste the client ID and secret into Supabase.
6. **Vercel.** Import the GitHub repository on the Hobby plan. Add the environment variables. Note the `*.vercel.app` address; set it as `NEXT_PUBLIC_SITE_URL` and in Supabase under Authentication > URL configuration set it as the Site URL and add `<address>/auth/callback` (and `http://localhost:3000/auth/callback` for development) to the redirect allow-list.
7. **Email.** Create a new Gmail account for the project, turn on 2-step verification, create an app password, and set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM`. Without these, emails are only printed to the server log.
   7a. **Daily job.** Set `CRON_SECRET` in Vercel to a long random string (for example the output of `openssl rand -hex 32`). `vercel.json` already schedules `/api/cron/daily` for 02:30 UTC (08:00 IST); Vercel sends the secret with each run.
8. **PostHog.** Create a free project; set `NEXT_PUBLIC_POSTHOG_KEY` to the project token and `NEXT_PUBLIC_POSTHOG_HOST` to the ingestion host for your region, `https://us.i.posthog.com` or `https://eu.i.posthog.com` (not the app address).
9. **Moderators.** After each team member has signed in once (possible from M1), edit and run `supabase/seed/moderators.sql`.

## Check M1 by hand

Needs steps 2, 3 and 5 above, the three Supabase keys in `.env.local`, and `pnpm dev`. Use three Google accounts: one ISB, two personal.

1. **ISB account, `/signin`.** Lands on "About you". Submit it empty: every field shows an error. Fill it in: lands on Home with "Hello, <name>". In the SQL editor, `select name, props from events order by id desc limit 1;` shows `user_signed_up`.
2. **Personal account, `/signin`.** Lands on "That was not an ISB email address". `select count(*) from auth.users where email = '<that address>';` returns 0.
3. **Second personal account, `/contribute?src=test&course=<a course id>`.** Lands on "About you" with no "How did you hear" question. After submitting: the review holding page. Go to `/`: "Thanks, <name>… checking your name". `/admin/verification` shows a 404.
4. **Make the ISB account a moderator** (`supabase/seed/moderators.sql`), reload: an Admin link appears. `/admin/verification` lists the person from step 3. Press Verify: the list empties.
5. **Back as the step-3 account:** Home now says "Hello". Sign out, then sign in again from `/signin` (not the contributor link): still gets in.
6. **Sign out** on any account returns to `/signin`, and `/` redirects there.

## Check M2 by hand

Needs "Check M1 by hand" done, so there is a moderator, a verified contributor and an unverified one.

1. **Moderator, Admin > Courses.** Paste the example rows and import: the summary counts new courses and offerings. Import the same rows again: zero new. Import a file with a wrong header: nothing changes and the errors name the rows.
2. **Moderator, Admin > Outreach.** Import two rows for the same person and different courses: one contact, "asked about 2 courses".
3. **On a phone, open the contributor link** shown under a course in Admin > Courses with a new personal Google account. After "About you" the form opens on that course. Time it: a real review should take about 5 minutes.
4. **Press Continue on an empty step:** each missing answer is marked. Enter a mix that totals 90: it says so and will not continue.
5. **Finish step 2, close the tab, open `/write`:** the review is listed as "Draft". "Continue writing" reopens at step 3 with the earlier answers in place.
6. **Publish.** As the unverified contributor it says it goes live after verification. Verify them in Admin: `select status from course_reviews` shows `live`.
7. **Choose "My professor or term is not listed"** on another course and publish: Admin > Courses shows it under "Proposed by contributors". Approve it.
8. **Edit a published review** from `/write`, change one answer, Save changes: the change is stored and the status is unchanged. Delete a draft: it disappears from `/write`.
9. **Events:** `select name, props from events order by id desc limit 10;` shows `form_started`, `form_step_completed` with steps 0 to 3, and `entry_submitted` with `form_seconds`.

## Check M3 by hand

Needs "Check M2 by hand" done, with at least four reviews written by different accounts.

1. **Spread the reviews:** three or more on one course, two on another, none on a third. On a fourth, make the current offering a different professor from the one reviewed (Admin > Courses > Make current).
2. **As an ISB reader, open `/courses`.** Every course appears, the most reviewed first. Cards show review count, workload and quant or qual; the fourth course says "New professor"; the empty one says "Took it? Write the first one."
3. **Filters:** search a professor's name; try each filter and both sorts; "Reset" brings everything back. Each choice shows in the URL, so a filtered list can be shared.
4. **Course pages:** the 3+ course shows an agreement level and no caution; the 2-review course shows "Based on 2 reviews" and "Too few reviews to show agreement"; the empty course shows "No reviews yet"; the fourth shows "New or changed course" naming both professors.
5. **Anonymous review:** on its course page, view the page source. The author's name and email appear nowhere.
6. **Gates:** in Admin hide a course from readers; it disappears for the reader and stays (marked) for the moderator. Set `min_reviews_to_open_course` to 3 in the SQL editor (`update app_settings set value = '3' where key = 'min_reviews_to_open_course';`): only the 3+ course stays visible. Set it back to 0. A PGP YL account sees "open to PGP YL students soon" until `yl_read_open` is true.
7. **Events:** open the 3+ course twice, then `select name, props from events order by id desc limit 10;`. Two `course_page_viewed` rows and exactly one `value_reached` with `module` = `courses`. Applying a filter adds a `filter_used` row; merely loading `/courses` does not.

## Check M4 by hand

Needs "Check M3 by hand" done and the email settings from step 7. Use two accounts: a reader and the author of an anonymous review (preference "Right away").

1. **Ask:** as the reader, open the review and "Ask the author". The question appears at once. Within 5 minutes the author's inbox has "A question about your … review" (check spam too).
2. **Reply link:** sign out the author, then click "Answer the question" in the email. After Google sign-in it lands on that thread with the reply box focused.
3. **Answer:** post an answer. On the page it shows as "Author", not the name. The reader gets "Your question about … has an answer", which also says "The author". In the SQL editor: `select first_reply_at from comments where parent_id is null order by created_at desc limit 1;` is set, and `select props from events where name = 'comment_answered' order by id desc limit 1;` has `hours_to_answer`. The reader has a `value_reached` row with `trigger` = `author_reply_received`, unless they already had one for courses.
4. **Pay figures:** post "they offered 30 LPA". It asks first; "Post anyway" posts it and an automatic flag appears in Admin > Flags.
5. **Flags:** as the reader, flag the review. It stays visible. Admin > Flags shows it with its age and reason. "Ask author to edit" emails the author; "Remove" takes it off the course page; "Keep" just clears the flag.
6. **My activity:** the author sees the unanswered question under "Questions waiting for you". Switch the email preference to "Once a day", post another question as the reader: no instant email.
7. **Daily job:** run it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<address>/api/cron/daily`. The reply lists counts; the author gets one digest; moderators get the reminder if anything is flagged. Without the header it answers 401.
8. **Delete account:** as a throwaway account with a review and a comment, delete the account from My activity. The review disappears; the comment reads "This comment was deleted by its author." from "Former member"; signing in again shows "Your account is deleted".

## Check M5 by hand

Needs "Check M4 by hand" done. Use a moderator, a Co'27 reader who has opened a Term 7 course page, and a Co'26 reader who has too.

1. **Settings:** Admin > Settings. Set the post-bid survey window to start today and save; "Saved" shows. Try an end date before the start: nothing saves and the window is marked.
2. **Prompt:** the Co'27 reader now sees "Two questions about your bids" on Home and on Courses; the Co'26 reader does not. "Not now" hides it on that device until tomorrow.
3. **Answer:** choose "Yes, I changed…" without ticking a course: it asks for one. Complete it: "Thank you". The prompt is gone, and opening `/survey/post-bid` again says it is closed.
4. **Fake door:** on a review, "Request a chat" opens the coming-soon panel; "Ask a public question instead" opens the question box; "Yes, early access" says thanks. `select props from events where name = 'fake_door_clicked' order by id desc limit 2;` shows both the click and `left_contact: true`.
5. **Return visit:** open any course page on a day after the account was created. `select props from events where name = 'return_visit';` has one row for today, however many pages you open.
6. **Metrics:** Admin > Metrics. Count a few rows by hand in the SQL editor (for example `select count(*) from course_reviews where status = 'live' and on_behalf_of_name is null;`) and compare. Both CSV downloads open in a spreadsheet; the survey CSV has no names or emails.
7. **Survey emails:** run the daily job by hand (as in M4). The Co'27 reader gets one invitation. Running it again the same day sends nothing more.
8. **PostHog:** after a few page views, the project's activity view lists `course_page_viewed` with only a user id as the person.
9. **Put the survey window back** to 11 to 17 Jan before launch.

## Changing the database

Add a new numbered file in `supabase/migrations/`; never edit one that has been run in production. End it with explicit `revoke` / `grant` statements for any new table. Run `pnpm test`, then run the new file in the Supabase SQL editor.

## Not set up yet

- Asking the author, flags and moderation queue (M4)
- `pg_dump` backup job (M6)
- Playwright end-to-end tests (after the Supabase project exists)
