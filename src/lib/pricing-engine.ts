import { getDb } from "./db";

interface PricingRule {
  id: number;
  product_id: number;
  name: string;
  rule_type: string;
  condition_json: string;
  adjustment_type: string;
  adjustment_value: number;
  priority: number;
  active: number;
}

interface Adjustment {
  name: string;
  amount: number;
}

export function calculateDynamicPrice(
  productId: number,
  basePrice: number,
  date: string,
  occupancyPct: number
): { adjustedPrice: number; adjustments: Adjustment[] } {
  const db = getDb();

  const rules = db
    .prepare(
      "SELECT * FROM pricing_rules WHERE product_id = ? AND active = 1 ORDER BY priority ASC"
    )
    .all(productId) as PricingRule[];

  const adjustments: Adjustment[] = [];
  let adjustedPrice = basePrice;

  const targetDate = new Date(date + "T00:00:00");
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const daysBefore = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const dayOfWeek = targetDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  for (const rule of rules) {
    let matches = false;
    const condition = JSON.parse(rule.condition_json);

    switch (rule.rule_type) {
      case "early_bird":
        // condition: { days_before: 14 } — booking is >= X days before
        if (daysBefore >= (condition.days_before || 0)) {
          matches = true;
        }
        break;

      case "last_minute":
        // condition: { days_before: 3 } — booking is < X days before
        if (daysBefore < (condition.days_before || 0) && daysBefore >= 0) {
          matches = true;
        }
        break;

      case "day_of_week":
        // condition: { days: ["saturday", "sunday"] }
        if (
          Array.isArray(condition.days) &&
          condition.days.map((d: string) => d.toLowerCase()).includes(dayOfWeek)
        ) {
          matches = true;
        }
        break;

      case "date_range":
        // condition: { start_date: "2025-06-01", end_date: "2025-08-31" }
        if (date >= (condition.start_date || "") && date <= (condition.end_date || "9999-12-31")) {
          matches = true;
        }
        break;

      case "demand":
        // condition: { min_occupancy: 80 } — occupancy > X%
        if (occupancyPct > (condition.min_occupancy || 0)) {
          matches = true;
        }
        break;
    }

    if (matches) {
      let amount = 0;
      if (rule.adjustment_type === "percent") {
        amount = Math.round(basePrice * (rule.adjustment_value / 100) * 100) / 100;
      } else if (rule.adjustment_type === "fixed") {
        amount = rule.adjustment_value;
      }

      adjustedPrice += amount;
      adjustments.push({ name: rule.name, amount });
    }
  }

  if (adjustedPrice < 0) adjustedPrice = 0;

  return { adjustedPrice: Math.round(adjustedPrice * 100) / 100, adjustments };
}
