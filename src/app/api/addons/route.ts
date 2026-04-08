import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");

    const db = getDb();
    let query = "SELECT * FROM addons WHERE active = 1";
    const queryParams: unknown[] = [];

    if (product_id) {
      query += " AND (product_id = ? OR product_id IS NULL)";
      queryParams.push(product_id);
    }

    query += " ORDER BY sort_order, name";

    const addons = db.prepare(query).all(...queryParams);
    return NextResponse.json(addons);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch addons: " + (error as Error).message },
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
    const { name, description, price, product_id, max_quantity, per_person, sort_order } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "name and price are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO addons (name, description, price, product_id, max_quantity, per_person, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name,
      description || "",
      price,
      product_id ?? null,
      max_quantity ?? 10,
      per_person ? 1 : 0,
      sort_order ?? 0
    );

    const addon = db.prepare("SELECT * FROM addons WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(addon, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create addon: " + (error as Error).message },
      { status: 500 }
    );
  }
}
