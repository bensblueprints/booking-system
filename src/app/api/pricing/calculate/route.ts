import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateDynamicPrice } from "@/lib/pricing-engine";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const date = url.searchParams.get("date");
    const party_size = parseInt(url.searchParams.get("party_size") || "1", 10);

    if (!product_id || !date) {
      return NextResponse.json({ error: "product_id and date are required" }, { status: 400 });
    }

    const db = getDb();

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(product_id) as { id: number; price: number; seats_per_slot: number } | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate occupancy for the date
    const occupancy = db
      .prepare(
        `SELECT COALESCE(SUM(total_seats), 0) as total_seats, COALESCE(SUM(booked_seats), 0) as booked_seats
         FROM slots WHERE product_id = ? AND date = ?`
      )
      .get(product_id, date) as { total_seats: number; booked_seats: number };

    const occupancyPct =
      occupancy.total_seats > 0
        ? (occupancy.booked_seats / occupancy.total_seats) * 100
        : 0;

    const basePrice = product.price * party_size;
    const result = calculateDynamicPrice(product.id, product.price, date, occupancyPct);

    return NextResponse.json({
      base_price_per_person: product.price,
      party_size,
      base_total: basePrice,
      adjusted_price_per_person: result.adjustedPrice,
      adjusted_total: Math.round(result.adjustedPrice * party_size * 100) / 100,
      adjustments: result.adjustments,
      occupancy_pct: Math.round(occupancyPct * 10) / 10,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to calculate price: " + (error as Error).message },
      { status: 500 }
    );
  }
}
