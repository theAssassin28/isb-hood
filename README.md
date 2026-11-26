# ISB Hood

Passes what one ISB batch learns about courses and careers to the next. SWPM Group 12, Hyderabad campus.

The MVP is an experiment with one loop (write a structured entry, read it, ask the author), run as two tests: course reviews before Term 7 bidding (4 to 10 Jan 2027), then career entries a week later.

- **Handoff (read first):** [docs/HANDOFF.md](docs/HANDOFF.md)
- **Product requirements (what and why):** [docs/PRD.md](docs/PRD.md)
- **Build plan (how):** [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)
- **Spec:** [docs/source/ISB_Hood_MVP_Requirements.docx](docs/source/ISB_Hood_MVP_Requirements.docx) (plain text in `docs/source/extracted/`)
- **Deck and product note:** `docs/source/`

- **Setup, checks and deploy steps:** [docs/RUNBOOK.md](docs/RUNBOOK.md)
- **Deliberate shortcuts:** [docs/KNOWN_DEBT.md](docs/KNOWN_DEBT.md)
- **Personas to try the prototype:** [docs/PERSONAS.md](docs/PERSONAS.md) (emails, what each one shows, a both-sides walkthrough)
- **UX audit:** [docs/UX_AUDIT.md](docs/UX_AUDIT.md) (every screen against the Laws of UX, with the re-audit after fixes)

Status: M0 to M5 and the career section (M7: playbooks, company notes, "Like me" and a pathway page per track) are built locally (foundations; sign-in and verification; course import and the review form; course list and course page; comments, email and moderation; fake doors, surveys, metrics and settings). None of it has run against a real Supabase project, mailbox or PostHog project yet. To show it without any setup, run `pnpm dev` and open http://localhost:3000: with no keys set it runs as a clickable prototype on sample data (RUNBOOK, "Demo with sample data"). Sign in with any persona's email from [docs/PERSONAS.md](docs/PERSONAS.md) and any 6-digit code. Since then: a phone layout with a bottom tab bar and a desktop layout from 1024px, dark and light themes (sun/moon button at the top), a redesigned sign-in, four primary personas, and a Laws of UX audit with its fixes (PRD 1.1, "What changed"). Next is M6: harden and launch Test 1, which needs the hosted services set up.
