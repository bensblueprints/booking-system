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
    const templates = db.prepare("SELECT * FROM email_templates ORDER BY template_type").all();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { template_type, subject, body_html } = body;

    if (!template_type) {
      return NextResponse.json(
        { error: "template_type is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM email_templates WHERE template_type = ?")
      .get(template_type);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const fields: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];

    if (subject !== undefined) {
      fields.push("subject = ?");
      values.push(subject);
    }
    if (body_html !== undefined) {
      fields.push("body_html = ?");
      values.push(body_html);
    }

    values.push(template_type);
    db.prepare(`UPDATE email_templates SET ${fields.join(", ")} WHERE template_type = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM email_templates WHERE template_type = ?").get(template_type);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update template: " + (error as Error).message },
      { status: 500 }
    );
  }
}
