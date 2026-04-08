import { getDb } from "./db";
import crypto from "crypto";

interface Webhook {
  id: number;
  url: string;
  events: string;
  secret: string;
  active: number;
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function fireWebhookEvent(event: string, payload: object): Promise<void> {
  const db = getDb();

  const webhooks = db
    .prepare("SELECT * FROM webhooks WHERE active = 1")
    .all() as Webhook[];

  for (const webhook of webhooks) {
    // Check if this webhook subscribes to this event
    let events: string[];
    try {
      events = JSON.parse(webhook.events);
    } catch {
      continue;
    }

    if (!events.includes(event) && !events.includes("*")) {
      continue;
    }

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(body)
      .digest("hex");

    let responseStatus: number | null = null;
    let responseBody = "";

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      responseStatus = res.status;
      responseBody = (await res.text()).slice(0, 1000);
    } catch (err) {
      responseBody = (err as Error).message;
    }

    // Log the result
    try {
      db.prepare(
        `INSERT INTO webhook_log (webhook_id, event, payload, response_status, response_body)
         VALUES (?, ?, ?, ?, ?)`
      ).run(webhook.id, event, body, responseStatus, responseBody);
    } catch {
      // Don't fail if logging fails
    }
  }
}
