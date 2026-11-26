# ISB Hood

Follow `docs/BUILD_PLAN.md`, milestone by milestone. The spec is `docs/source/extracted/mvp_requirements.txt`; it wins over the plan where they disagree.

Rules that are easy to break:

- Author identity must never reach the client for anonymous entries (plan 5.3).
- All data access is server-side; RLS on every table.
- Outcome events are written server-side to the `events` table (plan 8.1). No ad hoc event names.
- Never collect grades, salaries, offer amounts or phone numbers.
- Out-of-scope features (places, AI, chat, people finder, mobile app) are not to be built or stubbed; chat and people finder exist only as fake doors.
- Visual system: Stella's colours with Kero's shapes and serif titles (Godly Templates kit, via the gallery-grade skill). Use the tokens in `app/globals.css` and the class strings in `components/styles.ts` (`type-title`, `type-heading`, `type-label`, `type-tag`, `type-status`). Corners: `rounded-lg` (20px) for cards, `rounded-md` (12px) for fields, alerts and inner panels, `rounded-full` for buttons and chips. No new colours or shadows. The sky-blue `brand` colour is only for things you can tap; selected chips use ink on the page colour. Two themes, dark (reference) and light, with the same tokens: never hard-code a colour, and check any new pair is 4.5:1 in both. Two layouts: phone below 1024px (bottom tab bar), desktop from `lg:`; no tablet step.
- Phone browser first. Supply is the riskiest belief: when in doubt, make writing an entry faster.
- Free plans only (plan section 2, "Free tiers only"). Do not add a paid dependency without asking.
- Every migration ends with explicit revoke/grant for new tables; run `pnpm test` after any SQL change.

Commands: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format`. Setup and deploy steps: `docs/RUNBOOK.md`. Deliberate shortcuts: `docs/KNOWN_DEBT.md`.

@AGENTS.md
