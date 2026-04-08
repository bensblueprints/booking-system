import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getDb();

    const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const logs = db
      .prepare(
        "SELECT * FROM webhook_log WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(id);

    return NextResponse.json({ ...(webhook as Record<string, unknown>), recent_logs: logs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch webhook: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.url !== undefined) {
      updates.push("url = ?");
      values.push(body.url);
    }
    if (body.events !== undefined) {
      updates.push("events = ?");
      values.push(typeof body.events === "string" ? body.events : JSON.stringify(body.events));
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update webhook: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete webhook: " + (error as Error).message },
      { status: 500 }
    );
  }
}
