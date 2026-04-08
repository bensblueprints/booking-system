import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const slot_id = url.searchParams.get("slot_id");
    const status = url.searchParams.get("status");
    const db = getDb();

    let query = `
      SELECT w.*, s.date, s.start_time, s.end_time,
             p.name as product_name
      FROM waitlist w
      JOIN slots s ON w.slot_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (slot_id) {
      query += " AND w.slot_id = ?";
      params.push(slot_id);
    }
    if (status) {
      query += " AND w.status = ?";
      params.push(status);
    }
    query += " ORDER BY w.created_at ASC";

    const entries = db.prepare(query).all(...params);
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch waitlist: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slot_id, customer_name, customer_email, customer_phone, party_size } = body;

    if (!slot_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: "slot_id, customer_name, and customer_email are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify the slot exists
    const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(slot_id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const result = db.prepare(
      `INSERT INTO waitlist (slot_id, customer_name, customer_email, customer_phone, party_size)
       VALUES (?, ?, ?, ?, ?)`
    ).run(slot_id, customer_name, customer_email, customer_phone || "", party_size || 1);

    const entry = db.prepare("SELECT * FROM waitlist WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to join waitlist: " + (error as Error).message },
      { status: 500 }
    );
  }
}
