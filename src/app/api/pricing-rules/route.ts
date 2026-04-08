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

    let query = "SELECT * FROM pricing_rules";
    const params: (string | number)[] = [];

    if (product_id) {
      query += " WHERE product_id = ?";
      params.push(product_id);
    }

    query += " ORDER BY priority ASC";

    const rules = db.prepare(query).all(...params);
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pricing rules: " + (error as Error).message },
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
    const { product_id, name, rule_type, condition_json, adjustment_type, adjustment_value, priority } = body;

    if (!product_id || !name || !rule_type || !condition_json || !adjustment_type || adjustment_value === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    const condStr = typeof condition_json === "string" ? condition_json : JSON.stringify(condition_json);

    const result = db
      .prepare(
        `INSERT INTO pricing_rules (product_id, name, rule_type, condition_json, adjustment_type, adjustment_value, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(product_id, name, rule_type, condStr, adjustment_type, adjustment_value, priority || 0);

    const rule = db
      .prepare("SELECT * FROM pricing_rules WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create pricing rule: " + (error as Error).message },
      { status: 500 }
    );
  }
}
