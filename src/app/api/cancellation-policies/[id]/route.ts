import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare("SELECT * FROM cancellation_policies WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.rules_json !== undefined) {
      updates.push("rules_json = ?");
      values.push(typeof body.rules_json === "string" ? body.rules_json : JSON.stringify(body.rules_json));
    }
    if (body.product_id !== undefined) {
      updates.push("product_id = ?");
      values.push(body.product_id);
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE cancellation_policies SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM cancellation_policies WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update cancellation policy: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM cancellation_policies WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Cancellation policy not found" }, { status: 404 });
    }

    // Remove reference from products
    db.prepare("UPDATE products SET cancellation_policy_id = NULL WHERE cancellation_policy_id = ?").run(id);
    db.prepare("DELETE FROM cancellation_policies WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete cancellation policy: " + (error as Error).message },
      { status: 500 }
    );
  }
}
