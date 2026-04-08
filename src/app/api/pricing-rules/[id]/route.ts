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

    const existing = db.prepare("SELECT * FROM pricing_rules WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Pricing rule not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    for (const field of ["name", "rule_type", "adjustment_type"]) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (body.condition_json !== undefined) {
      updates.push("condition_json = ?");
      values.push(typeof body.condition_json === "string" ? body.condition_json : JSON.stringify(body.condition_json));
    }
    if (body.adjustment_value !== undefined) {
      updates.push("adjustment_value = ?");
      values.push(body.adjustment_value);
    }
    if (body.priority !== undefined) {
      updates.push("priority = ?");
      values.push(body.priority);
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE pricing_rules SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM pricing_rules WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update pricing rule: " + (error as Error).message },
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

    const existing = db.prepare("SELECT * FROM pricing_rules WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Pricing rule not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM pricing_rules WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete pricing rule: " + (error as Error).message },
      { status: 500 }
    );
  }
}
