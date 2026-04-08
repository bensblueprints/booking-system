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
    const date_from = url.searchParams.get("date_from");
    const date_to = url.searchParams.get("date_to");
    const product_id = url.searchParams.get("product_id");

    const db = getDb();

    let query = `
      SELECT s.date,
             p.name as product_name,
             SUM(s.total_seats) as total_seats,
             SUM(s.booked_seats) as booked_seats,
             ROUND(CAST(SUM(s.booked_seats) AS REAL) / CAST(SUM(s.total_seats) AS REAL) * 100, 1) as occupancy_pct
      FROM slots s
      JOIN products p ON s.product_id = p.id
      WHERE s.total_seats > 0
    `;
    const params: (string | number)[] = [];

    if (date_from) {
      query += " AND s.date >= ?";
      params.push(date_from);
    }
    if (date_to) {
      query += " AND s.date <= ?";
      params.push(date_to);
    }
    if (product_id) {
      query += " AND s.product_id = ?";
      params.push(product_id);
    }

    query += " GROUP BY s.date, s.product_id ORDER BY s.date ASC";

    const rows = db.prepare(query).all(...params);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch occupancy report: " + (error as Error).message },
      { status: 500 }
    );
  }
}
