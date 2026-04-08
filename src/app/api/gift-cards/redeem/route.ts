import { NextResponse } from "next/server";
import { redeemGiftCard } from "@/lib/gift-cards";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, booking_id, amount } = body;

    if (!code || !booking_id || !amount) {
      return NextResponse.json(
        { error: "code, booking_id, and amount are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const result = redeemGiftCard(code, amount, booking_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      remaining_balance: result.remaining_balance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to redeem gift card: " + (error as Error).message },
      { status: 500 }
    );
  }
}
