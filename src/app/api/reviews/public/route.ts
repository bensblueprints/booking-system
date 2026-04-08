import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const db = getDb();

    let query = `
      SELECT r.id, r.customer_name, r.rating, r.comment, r.created_at,
             p.name as product_name
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN products p ON b.product_id = p.id
      WHERE r.approved = 1
    `;
    const params: (string | number)[] = [];

    if (product_id) {
      query += " AND b.product_id = ?";
      params.push(product_id);
    }
    query += " ORDER BY r.created_at DESC";

    const reviews = db.prepare(query).all(...params);
    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reviews: " + (error as Error).message },
      { status: 500 }
    );
  }
}
