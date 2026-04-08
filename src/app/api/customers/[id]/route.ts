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

    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const bookings = db.prepare(
      `SELECT b.*, s.date, s.start_time, s.end_time,
              p.name as product_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN products p ON b.product_id = p.id
       WHERE b.customer_email = ?
       ORDER BY s.date DESC`
    ).all((customer as Record<string, unknown>).email);

    return NextResponse.json({ ...customer as object, bookings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customer: " + (error as Error).message },
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
    const { name, phone, notes, tags } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      name ?? null,
      phone ?? null,
      notes ?? null,
      tags ?? null,
      id
    );

    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update customer: " + (error as Error).message },
      { status: 500 }
    );
  }
}
