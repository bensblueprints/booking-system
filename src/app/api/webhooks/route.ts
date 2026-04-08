import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { generateWebhookSecret } from "@/lib/webhooks";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const webhooks = db
      .prepare("SELECT * FROM webhooks ORDER BY created_at DESC")
      .all();
    return NextResponse.json(webhooks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch webhooks: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, events, active } = body;

    if (!url || !events) {
      return NextResponse.json({ error: "url and events are required" }, { status: 400 });
    }

    const db = getDb();
    const secret = generateWebhookSecret();
    const eventsStr = typeof events === "string" ? events : JSON.stringify(events);

    const result = db
      .prepare(
        "INSERT INTO webhooks (url, events, secret, active) VALUES (?, ?, ?, ?)"
      )
      .run(url, eventsStr, secret, active !== undefined ? active : 1);

    const webhook = db
      .prepare("SELECT * FROM webhooks WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create webhook: " + (error as Error).message },
      { status: 500 }
    );
  }
}
