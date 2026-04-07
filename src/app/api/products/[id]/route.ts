import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const product = db
      .prepare("SELECT * FROM products WHERE id = ? AND active = 1")
      .get(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch product: " + (error as Error).message },
      { status: 500 }
    );
  }
}

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
      active,
    } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        deposit_percent = COALESCE(?, deposit_percent),
        seats_per_slot = COALESCE(?, seats_per_slot),
        duration_minutes = COALESCE(?, duration_minutes),
        season_start = ?,
        season_end = ?,
        color = COALESCE(?, color),
        active = COALESCE(?, active)
      WHERE id = ?`
    ).run(
      name ?? null,
      description ?? null,
      price ?? null,
      deposit_percent ?? null,
      seats_per_slot ?? null,
      duration_minutes ?? null,
      season_start !== undefined ? season_start : null,
      season_end !== undefined ? season_end : null,
      color ?? null,
      active ?? null,
      id
    );

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update product: " + (error as Error).message },
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
    db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete product: " + (error as Error).message },
      { status: 500 }
    );
  }
}
