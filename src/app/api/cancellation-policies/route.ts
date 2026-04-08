import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const policies = db
      .prepare(
        `SELECT cp.*, p.name as product_name
         FROM cancellation_policies cp
         JOIN products p ON cp.product_id = p.id
         ORDER BY cp.id DESC`
      )
      .all();
    return NextResponse.json(policies);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cancellation policies: " + (error as Error).message },
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
    const { product_id, name, rules_json } = body;

    if (!product_id || !name || !rules_json) {
      return NextResponse.json({ error: "product_id, name, and rules_json are required" }, { status: 400 });
    }

    const db = getDb();
    const rulesStr = typeof rules_json === "string" ? rules_json : JSON.stringify(rules_json);

    const result = db
      .prepare(
        "INSERT INTO cancellation_policies (product_id, name, rules_json) VALUES (?, ?, ?)"
      )
      .run(product_id, name, rulesStr);

    // Auto-assign to product if no cancellation policy set
    db.prepare(
      "UPDATE products SET cancellation_policy_id = ? WHERE id = ? AND cancellation_policy_id IS NULL"
    ).run(result.lastInsertRowid, product_id);

    const policy = db
      .prepare("SELECT * FROM cancellation_policies WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create cancellation policy: " + (error as Error).message },
      { status: 500 }
    );
  }
}
