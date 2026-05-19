/** Phase 19B.0 workbook column headers (CSV template). */
export const FORMULARY_WORKBOOK_REQUIRED_COLUMNS = [
  "workbook_row_id",
  "generic_name",
  "display_name_fr",
  "concentration_display",
  "route",
  "dosage_form",
  "administration_type",
  "package_type",
  "package_description",
  "reconciliation_status",
  "billing_unit_strategy",
  "wastage_billable",
  "billing_review_status",
  "controlled_substance",
  "high_alert",
  "lasa_risk",
  "safety_review_status",
  "infusion_capable",
  "mar_workflow",
  "bedside_administer",
  "pharmacy_dispense",
  "default_fulfillment_intent",
  "formulary_category",
  "ed_formulary",
  "unit_of_measure_stock",
  "unit_of_measure_billing",
] as const;

export const RECONCILIATION_STATUSES = [
  "EXISTING_CONCEPT_MATCH",
  "NEW_CONCEPT_REQUIRED",
  "EXISTING_PRODUCT_MATCH",
  "NEW_PRODUCT_REQUIRED",
  "PACKAGE_NDC_VARIANT_ONLY",
  "LEGACY_CATALOG_MATCH",
  "DEFERRED",
  "REJECTED",
] as const;

export const OVERALL_STATUSES = ["draft", "in_review", "approved", "deferred", "rejected"] as const;

export const IMPORT_GATE_STATUSES = ["BLOCKED", "IN_PROGRESS", "READY", "WAIVED"] as const;

export const ROUTES = [
  "PO",
  "SL",
  "IM",
  "IV",
  "IV_PUSH",
  "IVPB",
  "SQ",
  "IN",
  "PR",
  "TOPICAL",
  "OTHER",
] as const;

export const ADMINISTRATION_TYPES = ["ORAL", "IM", "SQ", "PUSH", "INFUSION", "OTHER"] as const;

export const PACKAGE_TYPES = [
  "VIAL",
  "SYRINGE",
  "BAG_PREMIX",
  "BAG_BASE",
  "AMPULE",
  "TABLET_BOTTLE",
  "OTHER",
] as const;

export const MAR_WORKFLOWS = ["SINGLE_DOSE", "INFUSION_SESSION", "PRN", "CONTINUOUS"] as const;

export const BILLING_UNIT_STRATEGIES = [
  "PER_MG",
  "PER_ML",
  "PER_EACH",
  "PER_HOUR_INFUSION",
  "CUSTOM",
  "UNKNOWN",
] as const;

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export const FULFILLMENT_INTENTS = ["ADMINISTER_CHART", "PHARMACY_DISPENSE"] as const;

export const SECONDARY_REVIEW_FLAGS = [
  "BILLING_REVIEW_REQUIRED",
  "SAFETY_REVIEW_REQUIRED",
  "INFUSION_REVIEW_REQUIRED",
  "MAR_WORKFLOW_REVIEW_REQUIRED",
  "DUPLICATE_THERAPY_REVIEW",
  "SEARCH_UX_REVIEW",
  "INVENTORY_ONLY",
  "VACCINE_PARALLEL_SYSTEM",
] as const;
