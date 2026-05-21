/**
 * Phase 19I / 19I.2 — Tiered global baseline auto-approval (text rules only; no runtime activation).
 *
 * Tier 1: structurally valid low-risk Priority ER promoted products.
 * Tier 2 (manual review): explicit high-risk medication classes, malformed data,
 * governance block, or already baseline-approved.
 *
 * Duplicates, high-alert, controlled, infusion, and billing/NDC review flags do NOT
 * block baseline auto-approval (runtime activation remains separately gated).
 */

export const GLOBAL_BASELINE_AUTO_APPROVE_NOTE =
  "Auto-approved for global baseline only by Tier 1 safety rules. Runtime ordering, MAR, and billing remain disabled.";

/** Emitted only by evaluateGlobalBaselineTier (19I.2 policy). */
export type GlobalBaselineTier2Reason =
  | "MISSING_MEDICATION_NAME"
  | "MISSING_DOSE"
  | "MISSING_FORM"
  | "MISSING_EXACT_SOURCE"
  | "HIGH_RISK_MEDICATION"
  | "AMBIGUOUS_DOSE"
  | "GOVERNANCE_BLOCKED"
  | "ALREADY_BASELINE_APPROVED";

export type GlobalBaselineTierEvaluationInput = {
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string;
  exactSourceText: string;
  reconciliationStatus: string;
  reviewFlags: string[];
  isHighAlert: boolean;
  isControlled: boolean;
  requiresInfusionSession: boolean;
  administrationType: string;
  governanceStatus: string;
  baselineAvailable: boolean;
  alreadyActivationApproved: boolean;
  governanceBlocked: boolean;
};

export type GlobalBaselineTierEvaluationResult =
  | { tier: 1; tier2Reasons: [] }
  | { tier: 2; tier2Reasons: GlobalBaselineTier2Reason[] };

/** Manual-review-only classes per operational policy (19I.2). */
const HIGH_RISK_NAME_PATTERNS: RegExp[] = [
  /\bopioid\b/i,
  /\bmorphine\b/i,
  /\bfentanyl\b/i,
  /\bhydromorphone\b/i,
  /\boxycodone\b/i,
  /\bbenzodiazepine\b/i,
  /\bmidazolam\b/i,
  /\blorazepam\b/i,
  /\bdiazepam\b/i,
  /\binsulin\b/i,
  /\bheparin\b/i,
  /\bpotassium\s+chloride\b/i,
  /\bk\s*cl\b/i,
  /\bnorepinephrine\b/i,
  /\bepinephrine\b/i,
  /\bdopamine\b/i,
  /\bvasopressin\b/i,
  /\bvasopressor\b/i,
  /\bpropofol\b/i,
  /\bsedative\b/i,
  /\bphenobarbital\b/i,
  /\brocuronium\b/i,
  /\bvecuronium\b/i,
  /\bsuccinylcholine\b/i,
  /\bparalytic\b/i,
];

const AMBIGUOUS_DOSE_PATTERNS: RegExp[] = [
  /^\s*$/,
  /\bsee\s+(pkg|package|label)\b/i,
  /\bvarious\b/i,
  /\bunknown\b/i,
  /\bTBD\b/i,
  /\?/,
  /^\s*mg\s*$/i,
  /^\s*mcg\s*$/i,
  /^\s*units?\s*$/i,
];

function haystack(input: GlobalBaselineTierEvaluationInput): string {
  return [
    input.sourceNameExact,
    input.sourceStrengthExact,
    input.sourceRouteExact,
    input.exactSourceText,
  ]
    .join(" ")
    .toLowerCase();
}

function hasHighRiskMedicationPattern(text: string): boolean {
  return HIGH_RISK_NAME_PATTERNS.some((re) => re.test(text));
}

function isAmbiguousDose(dose: string): boolean {
  const t = dose.trim();
  if (!t) return true;
  if (AMBIGUOUS_DOSE_PATTERNS.some((re) => re.test(t))) return true;
  if (!/\d/.test(t)) return true;
  if (t.length > 80) return true;
  return false;
}

export function evaluateGlobalBaselineTier(
  input: GlobalBaselineTierEvaluationInput
): GlobalBaselineTierEvaluationResult {
  const reasons: GlobalBaselineTier2Reason[] = [];

  if (input.baselineAvailable && input.alreadyActivationApproved) {
    return { tier: 2, tier2Reasons: ["ALREADY_BASELINE_APPROVED"] };
  }

  if (
    input.governanceBlocked ||
    input.governanceStatus === "BLOCKED" ||
    input.governanceStatus === "RETIRED"
  ) {
    return { tier: 2, tier2Reasons: ["GOVERNANCE_BLOCKED"] };
  }

  const name = input.sourceNameExact.trim();
  const dose = input.sourceStrengthExact.trim();
  const form = input.sourceRouteExact.trim();
  const exact = input.exactSourceText.trim();

  if (!name) reasons.push("MISSING_MEDICATION_NAME");
  if (!dose) reasons.push("MISSING_DOSE");
  if (!form) reasons.push("MISSING_FORM");
  if (!exact && !(name && dose && form)) reasons.push("MISSING_EXACT_SOURCE");

  if (reasons.some((r) => r.startsWith("MISSING_"))) {
    return { tier: 2, tier2Reasons: reasons };
  }

  const text = haystack(input);
  if (hasHighRiskMedicationPattern(text)) reasons.push("HIGH_RISK_MEDICATION");

  if (isAmbiguousDose(dose)) reasons.push("AMBIGUOUS_DOSE");

  if (reasons.length > 0) {
    return { tier: 2, tier2Reasons: [...new Set(reasons)] };
  }

  return { tier: 1, tier2Reasons: [] };
}

export function summarizeTier2Reasons(
  rows: Array<{ tier2Reasons: GlobalBaselineTier2Reason[] }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const r of row.tier2Reasons) {
      counts[r] = (counts[r] ?? 0) + 1;
    }
  }
  return counts;
}
