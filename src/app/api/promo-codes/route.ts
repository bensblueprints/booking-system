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
    const promos = db.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
    return NextResponse.json(promos);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch promo codes: " + (error as Error).message },
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
    const {
      code, discount_type, discount_value,
      min_order, max_uses, product_id,
      start_date, end_date, active,
    } = body;

    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: "code, discount_type, and discount_value are required" },
        { status: 400 }
      );
    }

    if (!["percent", "fixed"].includes(discount_type)) {
      return NextResponse.json(
        { error: "discount_type must be 'percent' or 'fixed'" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO promo_codes (code, discount_type, discount_value, min_order, max_uses, product_id, start_date, end_date, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      code,
      discount_type,
      discount_value,
      min_order || 0,
      max_uses ?? null,
      product_id ?? null,
      start_date || null,
      end_date || null,
      active !== undefined ? (active ? 1 : 0) : 1
    );

    const promo = db.prepare("SELECT * FROM promo_codes WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "A promo code with that code already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create promo code: " + msg },
      { status: 500 }
    );
  }
}
