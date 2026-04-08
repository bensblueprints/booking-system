import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: "to (email address) is required" }, { status: 400 });
    }

    const result = await sendEmail(
      to,
      "Test Email - Booking System",
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1B6B8A;">Test Email</h2>
        <p>This is a test email from your booking system.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p style="color:#666;font-size:14px;">Sent at: ${new Date().toISOString()}</p>
      </div>`
    );

    if (result.success) {
      return NextResponse.json({ success: true, message: "Test email sent successfully" });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send test email: " + (error as Error).message },
      { status: 500 }
    );
  }
}
