import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { fireWebhookEvent } from "@/lib/webhooks";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { webhook_id } = body;

    if (!webhook_id) {
      return NextResponse.json({ error: "webhook_id is required" }, { status: 400 });
    }

    const db = getDb();
    const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(webhook_id) as {
      id: number;
      events: string;
    } | undefined;

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    let events: string[];
    try {
      events = JSON.parse(webhook.events);
    } catch {
      events = ["test"];
    }

    const testEvent = events[0] || "test";

    await fireWebhookEvent(testEvent, {
      test: true,
      webhook_id: webhook.id,
      message: "This is a test webhook event",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, event_fired: testEvent });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fire test webhook: " + (error as Error).message },
      { status: 500 }
    );
  }
}
