import {
  ADMINISTRATION_TYPES,
  BILLING_UNIT_STRATEGIES,
  FULFILLMENT_INTENTS,
  IMPORT_GATE_STATUSES,
  MAR_WORKFLOWS,
  OVERALL_STATUSES,
  PACKAGE_TYPES,
  RECONCILIATION_STATUSES,
  REVIEW_STATUSES,
  ROUTES,
  SECONDARY_REVIEW_FLAGS,
} from "./formulary-workbook.constants";

export type ValidationErrorItem = {
  field?: string;
  code: string;
  message: string;
};

export type ValidatedWorkbookRow = {
  sourceRowId: string;
  sourceInventorySku: string | null;
  sourceInventoryDescription: string;
  raw: Record<string, string>;
  proposedConceptCode: string | null;
  proposedProductCode: string | null;
  proposedPackageCode: string | null;
  reconciliationStatus: string;
  importGateStatus: string;
  overallStatus: string;
  reviewFlags: string[];
  ndc11: string | null;
  hcpcsCodeSuggested: string | null;
  billingReviewStatus: string | null;
  safetyReviewStatus: string | null;
  infusionReviewStatus: string | null;
  pharmacySignoff: string | null;
  nursingSignoff: string | null;
  edMdSignoff: string | null;
  complianceSignoff: string | null;
  validationErrors: ValidationErrorItem[];
  isValid: boolean;
};

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function parseYesNo(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "true" || v === "1" || v === "oui") return true;
  if (v === "no" || v === "n" || v === "false" || v === "0" || v === "non") return false;
  return null;
}

function inList<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function parsePipeList(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidNdc11(value: string): boolean {
  return /^\d{11}$/.test(value);
}

function hasSignoff(value: string | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

export type GateEvaluation = {
  gatesPassed: string[];
  gatesFailed: string[];
  importGateStatus: (typeof IMPORT_GATE_STATUSES)[number];
};

/** Evaluate Phase 19B.0 import gates (G1–G10) from workbook fields. */
export function evaluateImportGates(row: Record<string, string>, errors: ValidationErrorItem[]): GateEvaluation {
  const gatesPassed: string[] = [];
  const gatesFailed: string[] = [];

  const packageOk =
    cell(row, "package_type").length > 0 &&
    cell(row, "package_description").length > 0 &&
    cell(row, "concentration_display").length > 0;
  (packageOk ? gatesPassed : gatesFailed).push("G1_PACKAGE");

  const ndc = cell(row, "ndc11");
  const ndcConfidence = cell(row, "ndc_confidence").toLowerCase();
  const ndcOk =
    !ndc || isValidNdc11(ndc) || (ndcConfidence === "unknown" && hasSignoff(cell(row, "pharmacy_signoff")));
  (ndcOk ? gatesPassed : gatesFailed).push("G2_NDC");

  const hcpcs = cell(row, "hcpcs_j_code_suggested");
  const controlled = parseYesNo(cell(row, "controlled_substance")) === true;
  const billingStatus = cell(row, "billing_review_status").toLowerCase();
  const billingNeeded = Boolean(hcpcs) || controlled || billingStatus === "pending";
  const billingOk = !billingNeeded || billingStatus === "approved";
  (billingOk ? gatesPassed : gatesFailed).push("G3_BILLING");

  const bedside = parseYesNo(cell(row, "bedside_administer")) === true;
  const marWorkflow = cell(row, "mar_workflow");
  const marOk = !bedside || Boolean(marWorkflow);
  (marOk ? gatesPassed : gatesFailed).push("G4_MAR");

  const infusionCapable = parseYesNo(cell(row, "infusion_capable")) === true;
  const infusionReview = cell(row, "infusion_review_status").toLowerCase();
  const infusionOk = !infusionCapable || infusionReview === "approved";
  (infusionOk ? gatesPassed : gatesFailed).push("G5_INFUSION");

  const lasa = cell(row, "lasa_risk").toLowerCase();
  const searchUx = cell(row, "search_ux_review_status").toLowerCase();
  const lasaOk = lasa === "none" || !lasa || searchUx === "approved";
  (lasaOk ? gatesPassed : gatesFailed).push("G7_LASA");

  const edFormulary = parseYesNo(cell(row, "ed_formulary")) === true;
  const hasAlias =
    Boolean(cell(row, "aliases")) ||
    Boolean(cell(row, "ed_quick_search_keywords")) ||
    Boolean(cell(row, "brand_name"));
  const searchOk = !edFormulary || (Boolean(cell(row, "display_name_fr")) && hasAlias);
  (searchOk ? gatesPassed : gatesFailed).push("G8_SEARCH_UX");

  const highAlert = parseYesNo(cell(row, "high_alert")) === true;
  const safetyStatus = cell(row, "safety_review_status").toLowerCase();
  const safetyOk = !(highAlert || controlled) || safetyStatus === "approved";
  (safetyOk ? gatesPassed : gatesFailed).push("G9_SAFETY");

  const rsi = parseYesNo(cell(row, "rsi_formulary")) === true;
  const signoffOk =
    hasSignoff(cell(row, "pharmacy_signoff")) &&
    (!infusionCapable || hasSignoff(cell(row, "nursing_signoff"))) &&
    (!rsi || hasSignoff(cell(row, "ed_md_signoff"))) &&
    (!controlled || hasSignoff(cell(row, "compliance_signoff")));
  (signoffOk ? gatesPassed : gatesFailed).push("G10_SIGNOFF");

  const workbookGate = cell(row, "import_gate_status").toUpperCase();
  const hasValidationErrors = errors.length > 0;
  const overall = cell(row, "overall_status").toLowerCase();

  let importGateStatus: (typeof IMPORT_GATE_STATUSES)[number];
  if (hasValidationErrors) {
    importGateStatus = "BLOCKED";
  } else if (workbookGate === "WAIVED" && hasSignoff(cell(row, "pharmacy_signoff"))) {
    importGateStatus = "WAIVED";
  } else if (
    gatesFailed.length === 0 &&
    overall === "approved" &&
    (workbookGate === "READY" || gatesPassed.length >= 8)
  ) {
    importGateStatus = "READY";
  } else if (gatesPassed.length > 0) {
    importGateStatus = "IN_PROGRESS";
  } else {
    importGateStatus = "BLOCKED";
  }

  return { gatesPassed, gatesFailed, importGateStatus };
}

export function validateWorkbookRow(
  row: Record<string, string>,
  rowIndex: number
): ValidatedWorkbookRow {
  const errors: ValidationErrorItem[] = [];

  const sourceRowId = cell(row, "workbook_row_id") || `ROW_${rowIndex + 2}`;
  const sourceInventoryDescription =
    cell(row, "source_inventory_description") || cell(row, "generic_name") || "";

  if (!sourceInventoryDescription) {
    errors.push({
      field: "source_inventory_description",
      code: "REQUIRED",
      message: "Description ou generic_name requis.",
    });
  }

  if (!cell(row, "generic_name")) {
    errors.push({ field: "generic_name", code: "REQUIRED", message: "generic_name requis." });
  }
  if (!cell(row, "display_name_fr")) {
    errors.push({ field: "display_name_fr", code: "REQUIRED", message: "display_name_fr requis." });
  }
  if (!cell(row, "concentration_display")) {
    errors.push({
      field: "concentration_display",
      code: "REQUIRED",
      message: "concentration_display requis.",
    });
  }

  const reconciliationStatus = cell(row, "reconciliation_status").toUpperCase();
  if (!reconciliationStatus) {
    errors.push({
      field: "reconciliation_status",
      code: "REQUIRED",
      message: "reconciliation_status requis.",
    });
  } else if (!inList(reconciliationStatus, RECONCILIATION_STATUSES)) {
    errors.push({
      field: "reconciliation_status",
      code: "INVALID_ENUM",
      message: `reconciliation_status invalide: ${reconciliationStatus}`,
    });
  }

  const route = cell(row, "route").toUpperCase();
  if (route && !inList(route, ROUTES)) {
    errors.push({ field: "route", code: "INVALID_ENUM", message: `route invalide: ${route}` });
  }

  const administrationType = cell(row, "administration_type").toUpperCase();
  if (administrationType && !inList(administrationType, ADMINISTRATION_TYPES)) {
    errors.push({
      field: "administration_type",
      code: "INVALID_ENUM",
      message: `administration_type invalide: ${administrationType}`,
    });
  }

  const packageType = cell(row, "package_type").toUpperCase();
  if (packageType && !inList(packageType, PACKAGE_TYPES)) {
    errors.push({
      field: "package_type",
      code: "INVALID_ENUM",
      message: `package_type invalide: ${packageType}`,
    });
  }

  const marWorkflow = cell(row, "mar_workflow").toUpperCase();
  if (marWorkflow && !inList(marWorkflow, MAR_WORKFLOWS)) {
    errors.push({
      field: "mar_workflow",
      code: "INVALID_ENUM",
      message: `mar_workflow invalide: ${marWorkflow}`,
    });
  }

  const billingUnitStrategy = cell(row, "billing_unit_strategy").toUpperCase();
  if (billingUnitStrategy && !inList(billingUnitStrategy, BILLING_UNIT_STRATEGIES)) {
    errors.push({
      field: "billing_unit_strategy",
      code: "INVALID_ENUM",
      message: `billing_unit_strategy invalide: ${billingUnitStrategy}`,
    });
  }

  const fulfillment = cell(row, "default_fulfillment_intent").toUpperCase();
  if (fulfillment && !inList(fulfillment, FULFILLMENT_INTENTS)) {
    errors.push({
      field: "default_fulfillment_intent",
      code: "INVALID_ENUM",
      message: `default_fulfillment_intent invalide: ${fulfillment}`,
    });
  }

  for (const field of ["billing_review_status", "safety_review_status", "infusion_review_status"] as const) {
    const v = cell(row, field).toLowerCase();
    if (v && !inList(v, REVIEW_STATUSES)) {
      errors.push({ field, code: "INVALID_ENUM", message: `${field} invalide: ${v}` });
    }
  }

  const overallRaw = cell(row, "overall_status").toLowerCase();
  const overallStatus = overallRaw || "draft";
  if (overallStatus && !inList(overallStatus, OVERALL_STATUSES)) {
    errors.push({
      field: "overall_status",
      code: "INVALID_ENUM",
      message: `overall_status invalide: ${overallStatus}`,
    });
  }

  const ndc11Raw = cell(row, "ndc11").replace(/\D/g, "");
  const ndc11 = ndc11Raw.length === 11 ? ndc11Raw : ndc11Raw.length === 0 ? null : ndc11Raw;
  if (ndc11 && ndc11.length !== 11) {
    errors.push({ field: "ndc11", code: "INVALID_NDC", message: "ndc11 doit contenir 11 chiffres." });
  }

  const reviewFlags = parsePipeList(cell(row, "review_flags"));
  for (const flag of reviewFlags) {
    if (!inList(flag, SECONDARY_REVIEW_FLAGS)) {
      errors.push({
        field: "review_flags",
        code: "INVALID_FLAG",
        message: `review_flag inconnu: ${flag}`,
      });
    }
  }

  const gateEval = evaluateImportGates(row, errors);

  return {
    sourceRowId,
    sourceInventorySku: cell(row, "source_inventory_sku") || null,
    sourceInventoryDescription,
    raw: row,
    proposedConceptCode: cell(row, "proposed_concept_code") || null,
    proposedProductCode: cell(row, "proposed_product_code") || null,
    proposedPackageCode: cell(row, "proposed_package_code") || null,
    reconciliationStatus: reconciliationStatus || "NEW_PRODUCT_REQUIRED",
    importGateStatus: gateEval.importGateStatus,
    overallStatus: overallStatus,
    reviewFlags,
    ndc11: ndc11 && ndc11.length === 11 ? ndc11 : null,
    hcpcsCodeSuggested: cell(row, "hcpcs_j_code_suggested") || null,
    billingReviewStatus: cell(row, "billing_review_status").toLowerCase() || null,
    safetyReviewStatus: cell(row, "safety_review_status").toLowerCase() || null,
    infusionReviewStatus: cell(row, "infusion_review_status").toLowerCase() || null,
    pharmacySignoff: cell(row, "pharmacy_signoff") || null,
    nursingSignoff: cell(row, "nursing_signoff") || null,
    edMdSignoff: cell(row, "ed_md_signoff") || null,
    complianceSignoff: cell(row, "compliance_signoff") || null,
    validationErrors: errors,
    isValid: errors.length === 0,
  };
}

export function detectDuplicateProposedCodes(rows: ValidatedWorkbookRow[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const track = (code: string | null, kind: string, sourceRowId: string) => {
    if (!code) return;
    const key = `${kind}:${code.toUpperCase()}`;
    const list = index.get(key) ?? [];
    list.push(sourceRowId);
    index.set(key, list);
  };

  for (const row of rows) {
    track(row.proposedConceptCode, "concept", row.sourceRowId);
    track(row.proposedProductCode, "product", row.sourceRowId);
    track(row.proposedPackageCode, "package", row.sourceRowId);
  }

  const duplicates = new Map<string, string[]>();
  for (const [key, ids] of index) {
    if (ids.length > 1) duplicates.set(key, ids);
  }
  return duplicates;
}

export function applyDuplicateCodeFlags(
  rows: ValidatedWorkbookRow[],
  duplicates: Map<string, string[]>
): ValidatedWorkbookRow[] {
  if (duplicates.size === 0) return rows;

  return rows.map((row) => {
    const dupErrors: ValidationErrorItem[] = [];
    const check = (code: string | null, kind: string) => {
      if (!code) return;
      const key = `${kind}:${code.toUpperCase()}`;
      const ids = duplicates.get(key);
      if (ids && ids.length > 1) {
        dupErrors.push({
          field: `proposed_${kind}_code`,
          code: "DUPLICATE_PROPOSED_CODE",
          message: `Code ${kind} dupliqué dans le lot: ${code} (${ids.join(", ")})`,
        });
      }
    };
    check(row.proposedConceptCode, "concept");
    check(row.proposedProductCode, "product");
    check(row.proposedPackageCode, "package");

    if (dupErrors.length === 0) return row;

    const validationErrors = [...row.validationErrors, ...dupErrors];
    return {
      ...row,
      validationErrors,
      isValid: false,
      importGateStatus: "BLOCKED",
    };
  });
}
