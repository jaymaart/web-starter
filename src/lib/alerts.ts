import { createLogger } from "./logger";

const log = createLogger("alert");

/**
 * Alert a human on a critical-path failure (§10). Posts to Slack if configured;
 * otherwise logs. Never throws — alerting must not become its own failure mode.
 * Include the full context so the failed operation can be recovered manually.
 */
export async function alert(
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  const text = context
    ? `${message}\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\``
    : message;

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    log.warn("(no SLACK_WEBHOOK_URL) would alert:", text);
    return;
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    log.error("failed to post alert", err);
  }
}
