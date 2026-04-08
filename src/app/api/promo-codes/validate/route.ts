import { NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/promo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, product_id, amount } = body;

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const result = validatePromoCode(code, product_id ?? null, amount || 0);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      discount_type: result.promo!.discount_type,
      discount_value: result.promo!.discount_value,
      discount_amount: result.discount_amount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to validate promo code: " + (error as Error).message },
      { status: 500 }
    );
  }
}
