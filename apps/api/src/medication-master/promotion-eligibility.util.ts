import type { MedicationFormularyImportStaging } from "@prisma/client";
import type { ValidationErrorItem } from "./formulary-import-validation.util";

export type PromotionBlockReason = {
  code: string;
  message: string;
};

export type PromotionEligibilityResult =
  | { eligible: true }
  | { eligible: false; reasons: PromotionBlockReason[] };

function parseValidationErrors(value: unknown): ValidationErrorItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e): e is ValidationErrorItem =>
      e != null && typeof e === "object" && "code" in e && "message" in e
  );
}

function parseRawJson(value: unknown): Record<string, string> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function yes(raw: Record<string, string>, key: string): boolean {
  const v = (raw[key] ?? "").trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "oui";
}

/**
 * Phase 19B.3 — staging row must pass all gates before manual promotion.
 */
export function evaluatePromotionEligibility(
  row: MedicationFormularyImportStaging
): PromotionEligibilityResult {
  const reasons: PromotionBlockReason[] = [];
  const raw = parseRawJson(row.rawJson);
  const validationErrors = parseValidationErrors(row.validationErrors);

  const overall = row.overallStatus.trim().toLowerCase();
  if (overall !== "approved") {
    reasons.push({
      code: "OVERALL_STATUS",
      message: `overall_status doit être approved (actuel: ${row.overallStatus}).`,
    });
  }

  const gate = row.importGateStatus.trim().toUpperCase();
  if (gate !== "READY" && gate !== "WAIVED") {
    reasons.push({
      code: "IMPORT_GATE",
      message: `import_gate_status doit être READY ou WAIVED (actuel: ${row.importGateStatus}).`,
    });
  }

  if (!row.pharmacySignoff?.trim()) {
    reasons.push({ code: "PHARMACY_SIGNOFF", message: "pharmacy_signoff requis." });
  }

  if (validationErrors.length > 0) {
    reasons.push({
      code: "VALIDATION_ERRORS",
      message: `${validationErrors.length} erreur(s) de validation enregistrée(s).`,
    });
  }

  const dupCodes = validationErrors.filter((e) => e.code === "DUPLICATE_PROPOSED_CODE");
  if (dupCodes.length > 0) {
    reasons.push({
      code: "DUPLICATE_PROPOSED_CODE",
      message: "Conflit de codes proposés non résolu dans le lot.",
    });
  }

  const billingStatus = (row.billingReviewStatus ?? "").trim().toLowerCase();
  const flags = Array.isArray(row.reviewFlags) ? (row.reviewFlags as string[]) : [];
  const needsBilling =
    Boolean(row.hcpcsCodeSuggested?.trim()) ||
    yes(raw, "controlled_substance") ||
    flags.includes("BILLING_REVIEW_REQUIRED");
  if (needsBilling && billingStatus !== "approved") {
    reasons.push({
      code: "BILLING_REVIEW",
      message: "billing_review_status doit être approved.",
    });
  }

  const safetyStatus = (row.safetyReviewStatus ?? "").trim().toLowerCase();
  const needsSafety =
    yes(raw, "high_alert") ||
    yes(raw, "controlled_substance") ||
    flags.includes("SAFETY_REVIEW_REQUIRED");
  if (needsSafety && safetyStatus !== "approved") {
    reasons.push({
      code: "SAFETY_REVIEW",
      message: "safety_review_status doit être approved.",
    });
  }

  if (yes(raw, "controlled_substance") && !row.complianceSignoff?.trim()) {
    reasons.push({ code: "COMPLIANCE_SIGNOFF", message: "compliance_signoff requis (contrôlé)." });
  }

  const infusionStatus = (row.infusionReviewStatus ?? "").trim().toLowerCase();
  if (yes(raw, "infusion_capable") && infusionStatus !== "approved") {
    reasons.push({
      code: "INFUSION_REVIEW",
      message: "infusion_review_status doit être approved pour perfusion.",
    });
  }

  if (yes(raw, "infusion_capable") && !row.nursingSignoff?.trim()) {
    reasons.push({ code: "NURSING_SIGNOFF", message: "nursing_signoff requis (perfusion)." });
  }

  if (yes(raw, "rsi_formulary") && !row.edMdSignoff?.trim()) {
    reasons.push({ code: "ED_MD_SIGNOFF", message: "ed_md_signoff requis (RSI)." });
  }

  if (!row.proposedConceptCode?.trim() && !row.proposedProductCode?.trim()) {
    reasons.push({
      code: "MISSING_CODES",
      message: "proposed_concept_code ou proposed_product_code requis.",
    });
  }

  if (!row.proposedPackageCode?.trim()) {
    reasons.push({ code: "MISSING_PACKAGE_CODE", message: "proposed_package_code requis." });
  }

  if (reasons.length > 0) {
    return { eligible: false, reasons };
  }
  return { eligible: true };
}
