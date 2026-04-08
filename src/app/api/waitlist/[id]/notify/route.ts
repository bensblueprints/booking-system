import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(
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

    const entry = db.prepare(
      `SELECT w.*, s.date, s.start_time, s.end_time,
              p.name as product_name
       FROM waitlist w
       JOIN slots s ON w.slot_id = s.id
       JOIN products p ON s.product_id = p.id
       WHERE w.id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!entry) {
      return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    }

    const businessName = db.prepare("SELECT value FROM settings WHERE key = 'business_name'").get() as { value: string } | undefined;
    const bName = businessName?.value || "Our Business";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1B6B8A;">A Spot Has Opened Up!</h2>
        <p>Hi ${entry.customer_name},</p>
        <p>Great news! A spot has opened up for <strong>${entry.product_name}</strong> on <strong>${entry.date}</strong> at <strong>${entry.start_time}</strong>.</p>
        <p>Please book soon as spots fill quickly!</p>
        <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
        <p style="color:#666;font-size:14px;">${bName}</p>
      </div>
    `;

    const result = await sendEmail(
      String(entry.customer_email),
      `A spot opened up for ${entry.product_name}!`,
      html
    );

    // Update status
    db.prepare(
      "UPDATE waitlist SET status = 'notified', notified_at = datetime('now') WHERE id = ?"
    ).run(id);

    if (!result.success) {
      return NextResponse.json({ warning: "Email failed but status updated", error: result.error });
    }

    const updated = db.prepare("SELECT * FROM waitlist WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to notify: " + (error as Error).message },
      { status: 500 }
    );
  }
}
