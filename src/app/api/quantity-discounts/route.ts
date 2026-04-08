import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const db = getDb();

    let query = "SELECT * FROM quantity_discounts WHERE active = 1";
    const params: (string | number)[] = [];

    if (product_id) {
      query += " AND product_id = ?";
      params.push(product_id);
    }
    query += " ORDER BY min_quantity ASC";

    const discounts = db.prepare(query).all(...params);
    return NextResponse.json(discounts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch discounts: " + (error as Error).message },
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
    const { product_id, min_quantity, discount_type, discount_value } = body;

    if (!product_id || !min_quantity || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: "product_id, min_quantity, discount_type, and discount_value are required" },
        { status: 400 }
      );
    }

    if (!["percent", "fixed_per_person"].includes(discount_type)) {
      return NextResponse.json({ error: "discount_type must be 'percent' or 'fixed_per_person'" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO quantity_discounts (product_id, min_quantity, discount_type, discount_value)
       VALUES (?, ?, ?, ?)`
    ).run(product_id, min_quantity, discount_type, discount_value);

    const discount = db.prepare("SELECT * FROM quantity_discounts WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create discount: " + (error as Error).message },
      { status: 500 }
    );
  }
}
