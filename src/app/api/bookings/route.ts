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
    const product_id = url.searchParams.get("product_id");
    const date_from = url.searchParams.get("date_from");
    const date_to = url.searchParams.get("date_to");
    const payment_status = url.searchParams.get("payment_status");

    const db = getDb();
    let query = `
      SELECT b.*, s.date, s.start_time, s.end_time,
             p.name as product_name, p.price as product_price
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN products p ON b.product_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (product_id) {
      query += " AND b.product_id = ?";
      params.push(product_id);
    }
    if (date_from) {
      query += " AND s.date >= ?";
      params.push(date_from);
    }
    if (date_to) {
      query += " AND s.date <= ?";
      params.push(date_to);
    }
    if (payment_status) {
      query += " AND b.payment_status = ?";
      params.push(payment_status);
    }

    query += " ORDER BY s.date DESC, s.start_time DESC";

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch bookings: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slot_id, customer_name, customer_email, customer_phone, party_size, notes } = body;

    if (!slot_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: "slot_id, customer_name, and customer_email are required" },
        { status: 400 }
      );
    }

    const size = party_size || 1;
    const db = getDb();

    const slot = db
      .prepare("SELECT * FROM slots WHERE id = ?")
      .get(slot_id) as {
      id: number;
      product_id: number;
      total_seats: number;
      booked_seats: number;
    } | undefined;

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const available = slot.total_seats - slot.booked_seats;
    if (size > available) {
      return NextResponse.json(
        { error: `Only ${available} seat(s) available` },
        { status: 400 }
      );
    }

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(slot.product_id) as {
      price: number;
      deposit_percent: number;
    };

    const total_amount = product.price * size;
    const deposit_amount = total_amount * (product.deposit_percent / 100);

    const result = db
      .prepare(
        `INSERT INTO bookings (slot_id, product_id, customer_name, customer_email, customer_phone, party_size, total_amount, deposit_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        slot_id,
        slot.product_id,
        customer_name,
        customer_email,
        customer_phone || null,
        size,
        total_amount,
        deposit_amount,
        notes || null
      );

    db.prepare("UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?").run(
      size,
      slot_id
    );

    const booking = db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
