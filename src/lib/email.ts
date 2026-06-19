import { createLogger } from "./logger";

const log = createLogger("email");

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

/**
 * Transactional email wrapper (example: Resend REST API — no SDK dependency).
 * This is the standard integration shape (§4.5): typed in, errors handled inside,
 * a decided fallback (log + return false) instead of a thrown 500. With no API
 * key it's a no-op that logs, so dev never sends real mail.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const sender = from ?? process.env.EMAIL_FROM ?? "App <noreply@example.com>";

  if (!key) {
    log.warn("(no RESEND_API_KEY) would send:", { to, subject });
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: sender, to, subject, html }),
    });
    if (!res.ok) {
      log.error("send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    log.error("send threw", err);
    return false;
  }
}

/** Escape interpolated values before putting them in HTML email (§6 Security). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
