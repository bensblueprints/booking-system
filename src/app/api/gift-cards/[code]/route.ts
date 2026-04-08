import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const db = getDb();

    const gc = db
      .prepare("SELECT code, balance, status, expires_at FROM gift_cards WHERE code = ? COLLATE NOCASE")
      .get(code) as { code: string; balance: number; status: string; expires_at: string | null } | undefined;

    if (!gc) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    return NextResponse.json(gc);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check gift card: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;
    const body = await request.json();
    const db = getDb();

    const gc = db
      .prepare("SELECT * FROM gift_cards WHERE code = ? COLLATE NOCASE")
      .get(code);

    if (!gc) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (body.expires_at !== undefined) {
      updates.push("expires_at = ?");
      values.push(body.expires_at);
    }
    if (body.balance !== undefined) {
      updates.push("balance = ?");
      values.push(body.balance);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(code);
    db.prepare(
      `UPDATE gift_cards SET ${updates.join(", ")} WHERE code = ? COLLATE NOCASE`
    ).run(...values);

    const updated = db
      .prepare("SELECT * FROM gift_cards WHERE code = ? COLLATE NOCASE")
      .get(code);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update gift card: " + (error as Error).message },
      { status: 500 }
    );
  }
}
