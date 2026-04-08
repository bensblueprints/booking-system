import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const affiliates = db
      .prepare("SELECT * FROM affiliates ORDER BY created_at DESC")
      .all();
    return NextResponse.json(affiliates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch affiliates: " + (error as Error).message },
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
    const { name, email, code, commission_type, commission_value } = body;

    if (!name || !email || !code) {
      return NextResponse.json({ error: "name, email, and code are required" }, { status: 400 });
    }

    const db = getDb();

    const existing = db.prepare("SELECT id FROM affiliates WHERE code = ? COLLATE NOCASE").get(code);
    if (existing) {
      return NextResponse.json({ error: "Affiliate code already exists" }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO affiliates (name, email, code, commission_type, commission_value)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, email, code, commission_type || "percent", commission_value ?? 10);

    const affiliate = db
      .prepare("SELECT * FROM affiliates WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(affiliate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create affiliate: " + (error as Error).message },
      { status: 500 }
    );
  }
}
