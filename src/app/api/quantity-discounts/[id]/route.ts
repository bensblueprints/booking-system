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
    const { min_quantity, discount_type, discount_value, active } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM quantity_discounts WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE quantity_discounts SET
        min_quantity = COALESCE(?, min_quantity),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        active = COALESCE(?, active)
      WHERE id = ?`
    ).run(
      min_quantity ?? null,
      discount_type ?? null,
      discount_value ?? null,
      active ?? null,
      id
    );

    const discount = db.prepare("SELECT * FROM quantity_discounts WHERE id = ?").get(id);
    return NextResponse.json(discount);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update discount: " + (error as Error).message },
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

    db.prepare("DELETE FROM quantity_discounts WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete discount: " + (error as Error).message },
      { status: 500 }
    );
  }
}
