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

    const db = getDb();
    let query = "SELECT * FROM blackout_dates WHERE 1=1";
    const params: unknown[] = [];

    if (product_id) {
      query += " AND (product_id = ? OR product_id IS NULL)";
      params.push(product_id);
    }
    if (date_from) {
      query += " AND date >= ?";
      params.push(date_from);
    }
    if (date_to) {
      query += " AND date <= ?";
      params.push(date_to);
    }

    query += " ORDER BY date";

    const blackouts = db.prepare(query).all(...params);
    return NextResponse.json(blackouts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch blackout dates: " + (error as Error).message },
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
    const { product_id, dates, reason } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: "dates (array of date strings) is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO blackout_dates (product_id, date, reason) VALUES (?, ?, ?)"
    );

    const created: unknown[] = [];
    const insertMany = db.transaction(() => {
      for (const date of dates) {
        const result = insert.run(product_id ?? null, date, reason || "");
        if (result.changes > 0) {
          const row = db.prepare("SELECT * FROM blackout_dates WHERE id = ?").get(result.lastInsertRowid);
          created.push(row);
        }
      }
    });

    insertMany();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create blackout dates: " + (error as Error).message },
      { status: 500 }
    );
  }
}
