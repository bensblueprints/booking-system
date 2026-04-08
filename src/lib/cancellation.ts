import { getDb } from "./db";

interface PolicyRule {
  days_before: number;
  refund_percent: number;
}

interface CancellationPolicy {
  id: number;
  product_id: number;
  name: string;
  rules_json: string;
  active: number;
}

export function calculateRefund(
  policyId: number,
  slotDate: string,
  amountPaid: number
): {
  refund_amount: number;
  refund_percent: number;
  tier_description: string;
} {
  const db = getDb();

  const policy = db
    .prepare("SELECT * FROM cancellation_policies WHERE id = ?")
    .get(policyId) as CancellationPolicy | undefined;

  if (!policy) {
    return { refund_amount: 0, refund_percent: 0, tier_description: "No policy found" };
  }

  let rules: PolicyRule[];
  try {
    rules = JSON.parse(policy.rules_json) as PolicyRule[];
  } catch {
    return { refund_amount: 0, refund_percent: 0, tier_description: "Invalid policy rules" };
  }

  // Sort descending by days_before so we match the highest tier first
  rules.sort((a, b) => b.days_before - a.days_before);

  const now = new Date();
  const slotDateTime = new Date(slotDate + "T00:00:00");
  const diffMs = slotDateTime.getTime() - now.getTime();
  const daysBefore = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let matchedRule: PolicyRule | null = null;

  for (const rule of rules) {
    if (daysBefore >= rule.days_before) {
      matchedRule = rule;
      break;
    }
  }

  if (!matchedRule) {
    return {
      refund_amount: 0,
      refund_percent: 0,
      tier_description: "No refund available (less than minimum notice period)",
    };
  }

  const refund_percent = matchedRule.refund_percent;
  const refund_amount = Math.round(amountPaid * (refund_percent / 100) * 100) / 100;

  return {
    refund_amount,
    refund_percent,
    tier_description: `${refund_percent}% refund (${matchedRule.days_before}+ days notice)`,
  };
}
