import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const date_from = url.searchParams.get("date_from");
    const date_to = url.searchParams.get("date_to");

    const db = getDb();
    const isAdmin = !!getAdminFromRequest(request);

    let query = `
      SELECT s.*, p.name as product_name, p.price as product_price,
             p.deposit_percent, p.color as product_color,
             p.duration_minutes
      FROM slots s
      JOIN products p ON s.product_id = p.id
      WHERE p.active = 1
    `;
    const params: (string | number)[] = [];

    if (!isAdmin) {
      query += " AND s.booked_seats < s.total_seats";
    }

    if (product_id) {
      query += " AND s.product_id = ?";
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

    query += " ORDER BY s.date, s.start_time";

    const slots = db.prepare(query).all(...params);
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slots: " + (error as Error).message },
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
    const { product_id, dates, start_time, end_time } = body;

    if (!product_id || !dates || !Array.isArray(dates) || !start_time || !end_time) {
      return NextResponse.json(
        { error: "product_id, dates (array), start_time, and end_time are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const product = db
      .prepare("SELECT * FROM products WHERE id = ? AND active = 1")
      .get(product_id) as { seats_per_slot: number } | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const insert = db.prepare(
      `INSERT INTO slots (product_id, date, start_time, end_time, total_seats)
       VALUES (?, ?, ?, ?, ?)`
    );

    const created: unknown[] = [];
    const insertMany = db.transaction((dates: string[]) => {
      for (const date of dates) {
        const result = insert.run(
          product_id,
          date,
          start_time,
          end_time,
          product.seats_per_slot
        );
        const slot = db
          .prepare("SELECT * FROM slots WHERE id = ?")
          .get(result.lastInsertRowid);
        created.push(slot);
      }
    });

    insertMany(dates);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create slots: " + (error as Error).message },
      { status: 500 }
    );
  }
}
