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

    const existing = db.prepare("SELECT * FROM custom_fields WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of ["label", "field_type"]) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (body.product_id !== undefined) {
      updates.push("product_id = ?");
      values.push(body.product_id);
    }
    if (body.options_json !== undefined) {
      updates.push("options_json = ?");
      values.push(body.options_json ? (typeof body.options_json === "string" ? body.options_json : JSON.stringify(body.options_json)) : null);
    }
    if (body.required !== undefined) {
      updates.push("required = ?");
      values.push(body.required);
    }
    if (body.sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(body.sort_order);
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE custom_fields SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM custom_fields WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update custom field: " + (error as Error).message },
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

    const existing = db.prepare("SELECT * FROM custom_fields WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM custom_fields WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete custom field: " + (error as Error).message },
      { status: 500 }
    );
  }
}
