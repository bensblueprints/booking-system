import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { sendSms } from "@/lib/sms";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: "to phone number is required" }, { status: 400 });
    }

    const result = await sendSms(to, "This is a test SMS from your booking system.");

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send test SMS: " + (error as Error).message },
      { status: 500 }
    );
  }
}
