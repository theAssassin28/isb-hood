import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Email } from "./templates";

// Sends through the project Gmail account over SMTP (free plan: about 500
// recipients a day, docs/BUILD_PLAN.md section 2). Without SMTP settings, as in
// local development, messages are printed to the server log instead.

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transport;
}

export type SendResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

/**
 * Sends one email, retrying once. Records it in email_log, which is also how
 * repeats are avoided: the same (kind, refId) is never sent twice to a user.
 */
export async function sendEmail(args: {
  to: string;
  userId: string;
  kind: string;
  refId: string | null;
  email: Email;
}): Promise<SendResult> {
  const admin = createAdminClient();

  if (args.refId) {
    const { data: already } = await admin
      .from("email_log")
      .select("id")
      .eq("user_id", args.userId)
      .eq("kind", args.kind)
      .eq("ref_id", args.refId)
      .limit(1);
    if (already && already.length > 0) return { ok: true, skipped: true };
  }

  let providerId: string | null = null;
  if (!smtpConfigured()) {
    console.info(
      `[email] SMTP not configured; would send "${args.email.subject}" to ${args.to}\n${args.email.text}`,
    );
    providerId = "not-sent:smtp-not-configured";
  } else {
    let lastError = "unknown error";
    for (let attempt = 1; attempt <= 2 && providerId === null; attempt += 1) {
      try {
        const info = await getTransport().sendMail({
          from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
          to: args.to,
          subject: args.email.subject,
          text: args.email.text,
          html: args.email.html,
        });
        providerId = String(info.messageId ?? "sent");
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if (providerId === null) {
      console.error(`[email] ${args.kind} to user ${args.userId} failed: ${lastError}`);
      return { ok: false, error: lastError };
    }
  }

  await admin.from("email_log").insert({
    user_id: args.userId,
    kind: args.kind,
    ref_id: args.refId,
    provider_id: providerId,
  });
  return { ok: true };
}
