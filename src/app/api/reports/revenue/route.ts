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
    const group_by = url.searchParams.get("group_by") || "day";

    const db = getDb();

    let periodExpr: string;
    switch (group_by) {
      case "week":
        periodExpr = "strftime('%Y-W%W', s.date)";
        break;
      case "month":
        periodExpr = "strftime('%Y-%m', s.date)";
        break;
      default:
        periodExpr = "s.date";
    }

    let query = `
      SELECT ${periodExpr} as period,
             SUM(b.total_amount) as total_revenue,
             COUNT(b.id) as total_bookings,
             SUM(b.deposit_amount) as total_deposit
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      WHERE b.status != 'cancelled'
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
      query += " AND b.product_id = ?";
      params.push(product_id);
    }

    query += ` GROUP BY period ORDER BY period ASC`;

    const rows = db.prepare(query).all(...params);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch revenue report: " + (error as Error).message },
      { status: 500 }
    );
  }
}
