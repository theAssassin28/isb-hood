"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "./client";
import { db, resetDb } from "./db";
import { isDemo } from "./mode";

/** Demo only: become one of the people in lib/demo/seed-data.ts. */
export async function demoSignIn(personId: string): Promise<void> {
  if (!isDemo()) return;
  const person = db().profiles.find((p) => p.id === personId && !p.deleted_at);
  if (!person) redirect("/signin");
  (await cookies()).set(DEMO_COOKIE, personId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(person.profile_completed_at ? "/" : "/onboarding");
}

/** Demo only: put every review, question, flag and answer back to the seed file. */
export async function demoReset(): Promise<void> {
  if (!isDemo()) return;
  resetDb();
  redirect("/signin");
}
