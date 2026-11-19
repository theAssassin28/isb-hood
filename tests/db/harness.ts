import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Runs the real migrations against an in-process Postgres (PGlite), with a
// small stand-in for the parts of Supabase the migrations depend on:
// the auth schema, auth.uid(), and the anon / authenticated / service_role roles.
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated, service_role;
  grant execute on function auth.uid() to authenticated, service_role;
`;

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function freshDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

/** Run queries as a signed-in user, the way the app's server client would. */
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`,
  );
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

type NewUser = {
  email: string;
  name: string;
  cohort: string;
  accountType?: "isb" | "contributor";
  verification?: "not_required" | "pending" | "verified";
  role?: "reader" | "moderator";
};

/** Create an auth user (the trigger makes the profile), then set profile fields as the server would. */
export async function createUser(db: PGlite, u: NewUser): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, jsonb_build_object('full_name', $2::text)) returning id`,
    [u.email, u.name],
  );
  const id = rows[0].id;
  const accountType = u.accountType ?? "isb";
  await db.query(
    `update public.profiles
       set cohort = $2, account_type = $3, verification_status = $4, role = $5,
           profile_completed_at = now()
     where id = $1`,
    [
      id,
      u.cohort,
      accountType,
      u.verification ?? (accountType === "isb" ? "not_required" : "pending"),
      u.role ?? "reader",
    ],
  );
  return id;
}

/** Column values for a review that satisfies every publish rule. */
export const COMPLETE_REVIEW = {
  why_taken: "{interest}",
  workload_band: "2-4",
  eval_participation: 20,
  eval_quizzes: 10,
  eval_individual: 20,
  eval_group: 20,
  eval_midterm: 0,
  eval_final: 30,
  outline_gap: "The group project has four graded sub-parts that the outline does not list.",
  quant_qual: 3,
  teaching_styles: "{case_discussion}",
  grade_risk: "medium",
  grade_risk_reason: "Curve is tight in the final.",
  learning_value: 4,
  learning_value_reason: "The cases map closely to real pricing decisions in consumer goods.",
  who_should_take: "Anyone heading to marketing or product.",
  outline_match: "partly",
} as const;

export async function insertReview(
  db: PGlite,
  args: { offeringId: string; authorId: string; visibility?: string; status?: string },
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; status: string }> {
  const row: Record<string, unknown> = {
    ...COMPLETE_REVIEW,
    offering_id: args.offeringId,
    author_id: args.authorId,
    visibility: args.visibility ?? "named",
    status: args.status ?? "live",
    ...overrides,
  };
  const cols = Object.keys(row);
  const { rows } = await db.query<{ id: string; status: string }>(
    `insert into public.course_reviews (${cols.join(", ")})
     values (${cols.map((_, i) => `$${i + 1}`).join(", ")})
     returning id, status`,
    Object.values(row),
  );
  return rows[0];
}

export async function createOffering(db: PGlite): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `with c as (
       insert into public.courses (code, title) values ('T-' || gen_random_uuid(), 'Test course')
       returning id
     )
     insert into public.offerings (course_id, professor, term_label, cohort_year, is_current)
     select id, 'Prof Test', 'Term 7', 'Co''26', true from c
     returning id`,
  );
  return rows[0].id;
}
