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

    const affiliate = db.prepare("SELECT * FROM affiliates WHERE id = ?").get(id);
    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const bookings = db
      .prepare(
        `SELECT ab.*, b.customer_name, b.total_amount, b.created_at as booking_date,
                s.date, s.start_time, p.name as product_name
         FROM affiliate_bookings ab
         JOIN bookings b ON ab.booking_id = b.id
         JOIN slots s ON b.slot_id = s.id
         JOIN products p ON b.product_id = p.id
         WHERE ab.affiliate_id = ?
         ORDER BY b.created_at DESC`
      )
      .all(id);

    return NextResponse.json({ ...affiliate, bookings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch affiliate: " + (error as Error).message },
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

    const existing = db.prepare("SELECT * FROM affiliates WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    for (const field of ["name", "email", "code", "commission_type"]) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (body.commission_value !== undefined) {
      updates.push("commission_value = ?");
      values.push(body.commission_value);
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE affiliates SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM affiliates WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update affiliate: " + (error as Error).message },
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

    const existing = db.prepare("SELECT * FROM affiliates WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    db.prepare("UPDATE affiliates SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deactivate affiliate: " + (error as Error).message },
      { status: 500 }
    );
  }
}
