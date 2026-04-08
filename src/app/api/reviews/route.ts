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
    const db = getDb();

    let query = `
      SELECT r.*, b.product_id, p.name as product_name
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN products p ON b.product_id = p.id
      WHERE 1=1
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { review_token, rating, comment, customer_name } = body;

    if (!review_token || !rating || !customer_name) {
      return NextResponse.json(
        { error: "review_token, rating, and customer_name are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const db = getDb();

    // Find the review by token
    const existing = db.prepare("SELECT * FROM reviews WHERE review_token = ?").get(review_token) as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Invalid review token" }, { status: 404 });
    }

    if (existing.rating !== null && existing.rating !== 0) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    db.prepare(
      `UPDATE reviews SET rating = ?, comment = ?, customer_name = ?, created_at = datetime('now')
       WHERE review_token = ?`
    ).run(rating, comment || "", customer_name, review_token);

    const review = db.prepare("SELECT * FROM reviews WHERE review_token = ?").get(review_token);
    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit review: " + (error as Error).message },
      { status: 500 }
    );
  }
}
