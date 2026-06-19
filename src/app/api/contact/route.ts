import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/security";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/email";
import { alert } from "@/lib/alerts";
import { createLogger } from "@/lib/logger";

const log = createLogger("contact");

// Validate at the boundary (§1, §6). One schema = runtime check + inferred type.
const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  message: z.string().min(1).max(5000),
});

/**
 * Flagship example route. Demonstrates the full request shape from the standards:
 *   origin check → rate limit → Zod validation → fire-and-forget → fast response.
 */
export async function POST(req: Request) {
  // 1. Origin allowlist for browser-form mutations (§6).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Rate limit by IP (§6).
  const { allowed } = await rateLimit(`contact:${clientIp(req)}`, 5, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Parse + validate; reject cleanly before any logic runs.
  const body = await req.json().catch(() => null);
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { name, email, message } = parsed.data;

  // 4. Fire-and-forget the slow/flaky work (§4.2). Each step owns its errors;
  //    a failure alerts a human but never changes what the user sees.
  void (async () => {
    try {
      await sendEmail({
        to: process.env.EMAIL_FROM ?? "owner@example.com",
        subject: `New contact from ${name}`,
        html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})</p>
               <p>${escapeHtml(message)}</p>`,
      });
    } catch (err) {
      log.error("notify pipeline failed", err);
      await alert("Contact form notification failed", { name, email });
    }
  })();

  // 5. User is unblocked immediately.
  return NextResponse.json({ ok: true });
}
