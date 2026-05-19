/** Phase 19E.1 — Priority ER inventory duplicate reconciliation categories (staging only). */
export const PRIORITY_ER_RECONCILIATION_STATUSES = [
  "EXACT_MATCH",
  "POSSIBLE_DUPLICATE",
  "REVIEW_REQUIRED",
  "NEW_CANDIDATE",
] as const;

export type PriorityErReconciliationStatus = (typeof PRIORITY_ER_RECONCILIATION_STATUSES)[number];

export const PRIORITY_ER_INVENTORY_REVIEW_FLAGS = [
  "MANUAL_REVIEW_REQUIRED",
  "BILLING_REVIEW_REQUIRED",
  "NDC_REVIEW_REQUIRED",
  "POSSIBLE_DUPLICATE",
  "EXACT_MATCH_CANDIDATE",
  "MISSING_MEDICATION_NAME",
  "MISSING_DOSE",
  "MISSING_FORM",
] as const;

/** Workbook column headers (accent-insensitive match for header row detection only). */
export const PRIORITY_ER_INVENTORY_XLSX_COLUMNS = {
  medication: [
    "medication",
    "medicament",
    "médicament",
    "medication name",
    "nom du medicament",
    "nom medicament",
    "drug",
    "drug name",
    "item",
    "product",
    "description",
    "inventory item",
    "med name",
  ],
  dose: ["dose", "dosage", "strength", "concentration", "dose/strength", "posologie"],
  form: [
    "form",
    "dosage form",
    "route/form",
    "forme",
    "forme pharmaceutique",
    "route",
    "presentation",
  ],
} as const;
