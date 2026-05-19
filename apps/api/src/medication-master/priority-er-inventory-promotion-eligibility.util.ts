import type { DuplicateResolutionMode } from "./promotion-duplicate.util";
import type { MedicationFormularyImportStagingPromotionRow } from "./medication-formulary-import-staging.types";
import {
  isPriorityErInventoryStagingRow,
  parsePriorityErSourceTrace,
} from "./priority-er-inventory-staging-source.util";

export type PriorityErPromotionBlockReason = {
  code: string;
  message: string;
};

export type PriorityErPromotionEligibilityInput = {
  duplicateResolution?: DuplicateResolutionMode;
  confirmCreateDespiteDuplicate?: boolean;
  activateBilling?: boolean;
  activatePackageWithNdc?: boolean;
};

export type PriorityErPromotionEligibilityResult =
  | { eligible: true }
  | { eligible: false; reasons: PriorityErPromotionBlockReason[] };

function reviewFlags(row: MedicationFormularyImportStagingPromotionRow): string[] {
  return Array.isArray(row.reviewFlags) ? (row.reviewFlags as string[]) : [];
}

function hasPromotionResult(row: MedicationFormularyImportStagingPromotionRow): boolean {
  if (row.promotionResultJson == null) return false;
  if (typeof row.promotionResultJson !== "object" || Array.isArray(row.promotionResultJson)) {
    return false;
  }
  const o = row.promotionResultJson as Record<string, unknown>;
  return typeof o.conceptId === "string" && typeof o.productId === "string";
}

/**
 * Phase 19E.2 — manual promotion gates for Priority ER inventory staging rows.
 */
export function evaluatePriorityErPromotionEligibility(
  row: MedicationFormularyImportStagingPromotionRow,
  input: PriorityErPromotionEligibilityInput = {}
): PriorityErPromotionEligibilityResult {
  const reasons: PriorityErPromotionBlockReason[] = [];

  if (!isPriorityErInventoryStagingRow(row.rawJson)) {
    reasons.push({
      code: "NOT_PRIORITY_ER_ROW",
      message: "Cette ligne n'est pas un inventaire Priority ER (19E).",
    });
    return { eligible: false, reasons };
  }

  if (hasPromotionResult(row)) {
    reasons.push({
      code: "ALREADY_PROMOTED",
      message: "Cette ligne a déjà été promue vers le référentiel canonique.",
    });
    return { eligible: false, reasons };
  }

  const trace = parsePriorityErSourceTrace(row.rawJson);
  if (!trace.sourceNameExact.trim()) {
    reasons.push({ code: "MISSING_MEDICATION_NAME", message: "Nom source exact manquant." });
  }
  if (!trace.sourceStrengthExact.trim()) {
    reasons.push({ code: "MISSING_DOSE", message: "Dose source exacte manquante." });
  }
  if (!trace.sourceRouteExact.trim()) {
    reasons.push({ code: "MISSING_FORM", message: "Forme / voie source exacte manquante." });
  }

  const flags = reviewFlags(row);
  if (flags.includes("MISSING_MEDICATION_NAME")) {
    reasons.push({ code: "MISSING_MEDICATION_NAME", message: "Drapeau MISSING_MEDICATION_NAME actif." });
  }
  if (flags.includes("MISSING_DOSE")) {
    reasons.push({ code: "MISSING_DOSE", message: "Drapeau MISSING_DOSE actif." });
  }
  if (flags.includes("MISSING_FORM")) {
    reasons.push({ code: "MISSING_FORM", message: "Drapeau MISSING_FORM actif." });
  }

  const status = row.reconciliationStatus.trim().toUpperCase();
  const resolution = input.duplicateResolution ?? "CREATE_NEW";

  if (status === "POSSIBLE_DUPLICATE") {
    const allowed =
      resolution === "LINK_TO_EXISTING_CONCEPT" ||
      resolution === "LINK_TO_EXISTING_PRODUCT" ||
      resolution === "NEW_PACKAGE_ONLY" ||
      input.confirmCreateDespiteDuplicate === true;
    if (!allowed) {
      reasons.push({
        code: "UNRESOLVED_DUPLICATE",
        message:
          "Doublon possible non résolu — lier un concept/produit existant ou confirmer la création explicite.",
      });
    }
  }

  if (input.activateBilling === true && flags.includes("BILLING_REVIEW_REQUIRED")) {
    reasons.push({
      code: "BILLING_REVIEW",
      message: "Revue facturation requise — activation facturation non autorisée.",
    });
  }

  if (input.activatePackageWithNdc === true && flags.includes("NDC_REVIEW_REQUIRED")) {
    reasons.push({
      code: "NDC_REVIEW",
      message: "Revue NDC requise — conditionnement avec NDC non autorisé.",
    });
  }

  if (reasons.length > 0) {
    return { eligible: false, reasons };
  }
  return { eligible: true };
}
