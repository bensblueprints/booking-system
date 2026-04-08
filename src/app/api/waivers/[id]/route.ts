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
    const { name, content_html, product_id, required, active } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM waivers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE waivers SET
        name = COALESCE(?, name),
        content_html = COALESCE(?, content_html),
        product_id = COALESCE(?, product_id),
        required = COALESCE(?, required),
        active = COALESCE(?, active)
      WHERE id = ?`
    ).run(
      name ?? null,
      content_html ?? null,
      product_id !== undefined ? product_id : null,
      required ?? null,
      active ?? null,
      id
    );

    const waiver = db.prepare("SELECT * FROM waivers WHERE id = ?").get(id);
    return NextResponse.json(waiver);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update waiver: " + (error as Error).message },
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

    db.prepare("UPDATE waivers SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deactivate waiver: " + (error as Error).message },
      { status: 500 }
    );
  }
}
