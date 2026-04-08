import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

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

    const existing = db.prepare("SELECT * FROM promo_codes WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    const updatable = [
      "code", "discount_type", "discount_value", "min_order",
      "max_uses", "product_id", "start_date", "end_date", "active",
    ];

    for (const field of updatable) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === "active") {
          values.push(body[field] ? 1 : 0);
        } else {
          values.push(body[field]);
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE promo_codes SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM promo_codes WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update promo code: " + (error as Error).message },
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

    const existing = db.prepare("SELECT * FROM promo_codes WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    db.prepare("UPDATE promo_codes SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deactivate promo code: " + (error as Error).message },
      { status: 500 }
    );
  }
}
