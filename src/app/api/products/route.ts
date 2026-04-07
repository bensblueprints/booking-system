import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const db = getDb();
    const products = db
      .prepare("SELECT * FROM products WHERE active = 1 ORDER BY name")
      .all();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products: " + (error as Error).message },
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
    const {
      name,
      description,
      price,
      deposit_percent,
      seats_per_slot,
      duration_minutes,
      season_start,
      season_end,
      color,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO products (name, description, price, deposit_percent, seats_per_slot, duration_minutes, season_start, season_end, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        description || null,
        price,
        deposit_percent ?? 50,
        seats_per_slot ?? 6,
        duration_minutes ?? 120,
        season_start || null,
        season_end || null,
        color || "#1B6B8A"
      );

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create product: " + (error as Error).message },
      { status: 500 }
    );
  }
}
