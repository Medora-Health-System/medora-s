/** Phase 19E.0 — exact Priority ER inventory source text preservation (staging only). */

export const EXACT_SOURCE_CSV_COLUMNS = [
  "source_inventory_sku",
  "source_inventory_description",
  "source_location",
  "exact_source_text",
  "source_name_exact",
  "source_strength_exact",
  "source_route_exact",
  "source_package_exact",
  "source_page",
  "source_line_number",
  "source_image_ref",
  "exact_raw_text",
  "source_language",
] as const;

export const SOURCE_REVIEW_STATUSES = [
  "OCR_REVIEW_REQUIRED",
  "MANUAL_REVIEW_REQUIRED",
  "VERIFIED",
] as const;

export type ExactSourceTrace = {
  exactSourceText: string;
  sourceInventorySku: string | null;
  sourceNameExact: string | null;
  sourceStrengthExact: string | null;
  sourceRouteExact: string | null;
  sourcePackageExact: string | null;
  sourcePage: string | null;
  sourceLineNumber: string | null;
  sourceImageRef: string | null;
  exactRawText: string | null;
  sourceReviewStatus: string | null;
  sourceLanguage: string | null;
  normalizationNotes: string | null;
};

/** Read CSV cell without trimming — preserves exact inventory wording. */
export function exactCell(row: Record<string, string>, key: string): string {
  return row[key] ?? "";
}

/** Trim only for proposed/normalized workbook fields (never written back to source fields). */
export function proposedCell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

export function buildExactSourceTrace(row: Record<string, string>): ExactSourceTrace {
  const exactSourceText =
    exactCell(row, "exact_source_text") ||
    exactCell(row, "source_inventory_description") ||
    "";

  return {
    exactSourceText,
    sourceInventorySku: exactCell(row, "source_inventory_sku") || null,
    sourceNameExact: exactCell(row, "source_name_exact") || null,
    sourceStrengthExact: exactCell(row, "source_strength_exact") || null,
    sourceRouteExact: exactCell(row, "source_route_exact") || null,
    sourcePackageExact: exactCell(row, "source_package_exact") || null,
    sourcePage: exactCell(row, "source_page") || null,
    sourceLineNumber: exactCell(row, "source_line_number") || null,
    sourceImageRef: exactCell(row, "source_image_ref") || null,
    exactRawText: exactCell(row, "exact_raw_text") || null,
    sourceReviewStatus: exactCell(row, "source_review_status") || null,
    sourceLanguage: exactCell(row, "source_language") || null,
    normalizationNotes: exactCell(row, "normalization_notes") || null,
  };
}

/**
 * Staging `sourceInventoryDescription` must be exact inventory text only.
 * Never fall back to generic_name or other normalized fields.
 */
export function resolveExactSourceInventoryDescription(row: Record<string, string>): string {
  const trace = buildExactSourceTrace(row);
  if (trace.exactSourceText) return trace.exactSourceText;
  if (trace.exactRawText) return trace.exactRawText;
  return "";
}

export function buildPreservedRawJson(
  row: Record<string, string>,
  trace: ExactSourceTrace
): Record<string, unknown> {
  const exact: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    exact[key] = value;
  }
  return {
    ...exact,
    __sourceTrace: trace,
    __preservation: {
      phase: "19E.0",
      rule: "exact_source_fields_immutable",
    },
  };
}

export function requiresSourceExtractionReview(trace: ExactSourceTrace): boolean {
  const status = (trace.sourceReviewStatus ?? "").toUpperCase();
  return status === "OCR_REVIEW_REQUIRED" || status === "MANUAL_REVIEW_REQUIRED";
}

/** Never auto-approve rows pending OCR/manual inventory extraction review. */
export function blocksAutoApproval(trace: ExactSourceTrace, overallStatus: string): boolean {
  if (!requiresSourceExtractionReview(trace)) return false;
  return overallStatus.toLowerCase() === "approved";
}

export type BillingReviewAugment = {
  billingReviewStatus: string | null;
  reviewFlags: string[];
  ndc11: string | null;
  hcpcsCodeSuggested: string | null;
};

/**
 * Missing billing codes → review required; never guess HCPCS/NDC/J-codes.
 */
export function applyBillingSafetyFlags(input: {
  row: Record<string, string>;
  ndc11: string | null;
  hcpcsCodeSuggested: string | null;
  billingReviewStatus: string | null;
  reviewFlags: string[];
}): BillingReviewAugment {
  const flags = [...input.reviewFlags];
  let billingReviewStatus = input.billingReviewStatus;
  let ndc11 = input.ndc11;
  let hcpcsCodeSuggested = input.hcpcsCodeSuggested;

  const ndcRaw = exactCell(input.row, "ndc11");
  const ndcConfidence = proposedCell(input.row, "ndc_confidence").toLowerCase();
  const hcpcsRaw = exactCell(input.row, "hcpcs_j_code_suggested");

  if (!ndc11 && ndcRaw.replace(/\D/g, "").length > 0 && ndcRaw.replace(/\D/g, "").length !== 11) {
    ndc11 = null;
  }

  if (!hcpcsRaw.trim()) {
    hcpcsCodeSuggested = null;
  }

  const needsBillingReview =
    !hcpcsCodeSuggested ||
    !ndc11 ||
    ndcConfidence === "unknown" ||
    billingReviewStatus === "pending";

  if (needsBillingReview) {
    if (!flags.includes("BILLING_REVIEW_REQUIRED")) {
      flags.push("BILLING_REVIEW_REQUIRED");
    }
    if (!billingReviewStatus || billingReviewStatus === "approved") {
      billingReviewStatus = "pending";
    }
  }

  return { billingReviewStatus, reviewFlags: flags, ndc11, hcpcsCodeSuggested };
}
