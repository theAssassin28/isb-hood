# Personas for the prototype

Four ready-made people to try ISB Hood from both sides: two **information seekers** reading before they decide, and two **contributors** sharing what they learned. Their profiles are already filled in, so signing in goes straight to Home.

They are fictional, built from the research personas in [PRD.md](PRD.md) section 3.1. Their data lives in `lib/demo/seed-data.ts` (search for "Primary personas").

## Signing in

1. Run `pnpm dev` and open http://localhost:3000. With no Supabase keys the app runs as the prototype.
2. Seekers and Ishita sign in on the sign-in page. Karan is an alum without an ISB email, so he signs in from **Sign in as a contributor** (`/contribute`).
3. Enter the email below. The address checks still run, but no email is sent: type **any 6 digits** as the code.
4. Shortcut: **Sample accounts** in the strip at the top lets you continue as anyone in one tap.

Everything you do (reviews, questions, answers) stays in the server's memory and is shared by every persona, so one person's action shows up for the others. **Reset demo data** in the top strip, or restarting `pnpm dev`, puts it all back.

| Persona         | Side               | Email                        | Signs in on   |
| --------------- | ------------------ | ---------------------------- | ------------- |
| Ananya Kulkarni | Information seeker | `ananya.kulkarni@isb.edu`    | `/signin`     |
| Arjun Bhatia    | Information seeker | `arjun.bhatia@isb.edu`       | `/signin`     |
| Karan Malhotra  | Contributor        | `karan.malhotra@example.com` | `/contribute` |
| Ishita Sharma   | Contributor        | `ishita.sharma@isb.edu`      | `/signin`     |

---

## Information seekers

### Ananya Kulkarni, the Elective Optimiser

|             |                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email       | `ananya.kulkarni@isb.edu`                                                                                                                                                                     |
| Profile     | PGP Co'27 · pre-MBA consulting in BFSI (risk) · 3 to 5 years · target track general management or strategy                                                                                    |
| Based on    | Primary persona "Elective Optimiser" (PRD 3.1), job J1                                                                                                                                        |
| Situation   | Term 7 bidding is open. She has 16 to 20 options and wants a mix that fits this term's priority without a surprise after bidding. Conflicting reviews with no reasons have burned her before. |
| Starts with | No reviews or questions of her own                                                                                                                                                            |

**Try this**

1. Home → **Courses**. The list opens on Term 7. Filter by workload or quant or qual, or sort by highest learning value.
2. Open **Pricing Strategy**. Notice the "new or changed" banner (Prof Bhatt teaches it now; every review is for Prof Sen), the summary block with agreement, and the reasons under each rating.
3. Compare with **Corporate Valuation** (same professor both years, 6+ hours a week).
4. On a review, **ask the author** something the review does not cover, for example "Is the project doable alongside placement prep?"
5. On Home, the **post-bid survey** prompt asks whether ISB Hood changed a bid.

**What it tests:** reading reasons rather than ratings, course pages with 3+ reviews (value reached), the ask-the-author loop (F2, F5, F7).

### Arjun Bhatia, the Career Pivoter

|             |                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email       | `arjun.bhatia@isb.edu`                                                                                                                                                                                 |
| Profile     | PGP Co'27 · CA, pre-MBA finance in BFSI (banking) · 6 to 8 years · target track product                                                                                                                |
| Based on    | Primary persona "Career Pivoter" (PRD 3.1), jobs J2 and J4                                                                                                                                             |
| Situation   | Wants to move from banking into product. Advice he gets comes from people who already had a product background, so he looks for courses that help the switch and for authors who started where he did. |
| Starts with | One question asked on Karan's Product Management review, **not answered yet**                                                                                                                          |

**Try this**

1. Home → **Courses**, set **Helps for** to **Product**.
2. Open **Product Management**. Karan's review is the one from an engineer who switched into product. Arjun's question sits under it, waiting.
3. After Karan answers (see "Both sides" below), reload: the reply shows with Karan's name and the **Author** label.
4. Try **Request a chat** on a review: it is a fake door, so it opens the early-access sheet.

**What it tests:** matching by background and track, the wait for an author's reply, the chat fake door (F5, F8a). Career playbooks and "Like me" (F3, F4) are not built yet, so Arjun's story runs on course reviews for now.

---

## Contributors

### Karan Malhotra, the Senior Guide

|             |                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Email       | `karan.malhotra@example.com` (sign in on `/contribute`)                                                                                 |
| Profile     | Co'26 alum, verified contributor · pre-MBA engineering in IT/software · 3 to 5 years · now a product manager                            |
| Based on    | Supply persona "Senior or Alum Guide" (PRD 3.1), job J5                                                                                 |
| Situation   | Juniors keep asking him the same questions about getting into product. He wants to answer once, in public, in a way that keeps helping. |
| Starts with | A live review of **Product Management** (Prof Rao, Co'26) and **Arjun's question waiting** for him                                      |

**Try this**

1. Open **My activity**. "Questions waiting for you" lists Arjun's question.
2. Tap **Answer**, write a reply and post it. It appears under his review with the **Author** label, for every reader.
3. From My activity, **Edit or delete** his review, or open it on the course page.
4. Write a second review from **Write a review** (a course he took as Co'26, such as Data Science for Managers).

**What it tests:** the outside-email door for alumni, answering a question once in public, editing your own entries (F1, F5, F6).

### Ishita Sharma, writing about a finished course

|             |                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email       | `ishita.sharma@isb.edu`                                                                                                                           |
| Profile     | PGP Co'27 · pre-MBA analytics in e-commerce · 0 to 2 years · target track consulting                                                              |
| Based on    | PRD 13.2 gap: "a Co'27 student writing about a course they finished" (supply persona)                                                             |
| Situation   | Took **Business Analytics** in Term 5 and has not reviewed it. A classmate asked her about it in the section group; she would rather answer once. |
| Starts with | No reviews                                                                                                                                        |

**Try this**

1. Home → **Write a review**, pick **Business Analytics** (Prof Pillai, Term 5).
2. Go through the **4-step form**. Note the time it takes: the PRD's line is about 5 minutes.
3. Try to publish a rating with no reason (it is blocked), make the evaluation mix not total 100 (it is blocked), close the tab mid-way and come back (the draft is restored).
4. Choose to show her name or appear as "Verified Co'27 student", then **publish**. As an ISB account she goes live at once.
5. Sign in as Ananya and open Business Analytics: Ishita's review is there.

**What it tests:** the writer path, which matters most (PRD 4.2: "when in doubt, make writing an entry faster"), and the form's checks (F1).

---

## Both sides at once

Use two browser windows, one of them private, so each has its own sign-in.

1. **Window 1, Arjun** (`arjun.bhatia@isb.edu`): open Product Management and see his question waiting.
2. **Window 2, Karan** (`karan.malhotra@example.com` on `/contribute`): My activity → Answer → post a reply.
3. **Window 1**: reload Product Management. The reply is there, labelled **Author**.
4. **Window 2, Ishita** (sign out, then `ishita.sharma@isb.edu`): write and publish a Business Analytics review.
5. **Window 1, Ananya** (sign out, then `ananya.kulkarni@isb.edu`): open Business Analytics, read Ishita's review and ask her a question.
6. **Window 2, Ishita**: My activity shows Ananya's question waiting.

When done, press **Reset demo data**.

## Other sample accounts

These show other states of the app and are listed under "More sample accounts". Sign in the same way.

| Person       | Email                    | Shows                                                                                |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------ |
| Ravi Menon   | `ravi.menon@isb.edu`     | A Co'27 reader with history: answered questions, his own review, the post-bid survey |
| Meera Das    | `meera.das@isb.edu`      | The PGP YL reader view                                                               |
| Asha Rao     | `asha.rao@isb.edu`       | A Co'26 alum writing under her name                                                  |
| Kiran Shah   | `kiran.shah@example.com` | An anonymous author: "Verified Co'26 student", replies as "Author"                   |
| Dev Nair     | `dev.nair@example.com`   | An alum waiting for verification: can write, cannot read                             |
| Nisha Kapoor | `nisha.kapoor@isb.edu`   | Moderator: verification, flags, imports, metrics, settings                           |
| Rohan Iyer   | `rohan.iyer@isb.edu`     | First visit: the "About you" onboarding                                              |

Any other address also works. A new `@isb.edu` address makes a reader who starts at "About you"; any other address on `/contribute` makes an alum waiting for verification.

## Rules for adding personas

From PRD 13.2: every persona is fictional (no real interviewees or classmates, no verbatim interview quotes as review text), and the existing demo people stay consistent. Add a person in `lib/demo/seed-data.ts` with a `persona` entry; set `side: "seeker"` or `side: "contributor"` to list them first on Sample accounts.
