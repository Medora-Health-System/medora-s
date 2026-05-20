/**
 * Phase 19G — Controlled runtime activation flags (stored in governanceNotes, no migration).
 */

export const RUNTIME_ACTIVATION_MARKER_START = "<!--MEDORA_RUNTIME_ACTIVATION:v1-->";
export const RUNTIME_ACTIVATION_MARKER_END = "<!--/MEDORA_RUNTIME_ACTIVATION-->";

export type MedicationRuntimeActivationState =
  | "CANONICAL_INACTIVE"
  | "FORMULARY_REVIEW"
  | "FORMULARY_APPROVED_INACTIVE"
  | "ORDER_SEARCH_ENABLED"
  | "MAR_ENABLED"
  | "BILLING_REVIEW_REQUIRED"
  | "BILLING_ENABLED";

export type ProductRuntimeActivationMeta = {
  version: 1;
  formularyApprovedInactive: boolean;
  formularyApprovedAt: string | null;
  orderSearchEnabled: boolean;
  orderSearchEnabledAt: string | null;
  marEnabled: boolean;
  marEnabledAt: string | null;
  billingReviewRequired: boolean;
  billingReviewRequestedAt: string | null;
  billingEnabled: boolean;
  billingEnabledAt: string | null;
  reviewedBillingCode: string | null;
  reviewedBillingUnit: string | null;
  reviewedByRole: string | null;
};

export function defaultProductRuntimeActivationMeta(): ProductRuntimeActivationMeta {
  return {
    version: 1,
    formularyApprovedInactive: false,
    formularyApprovedAt: null,
    orderSearchEnabled: false,
    orderSearchEnabledAt: null,
    marEnabled: false,
    marEnabledAt: null,
    billingReviewRequired: false,
    billingReviewRequestedAt: null,
    billingEnabled: false,
    billingEnabledAt: null,
    reviewedBillingCode: null,
    reviewedBillingUnit: null,
    reviewedByRole: null,
  };
}

function parseMetaJson(raw: string): ProductRuntimeActivationMeta {
  const base = defaultProductRuntimeActivationMeta();
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.version !== 1) return base;
    return {
      version: 1,
      formularyApprovedInactive: o.formularyApprovedInactive === true,
      formularyApprovedAt: typeof o.formularyApprovedAt === "string" ? o.formularyApprovedAt : null,
      orderSearchEnabled: o.orderSearchEnabled === true,
      orderSearchEnabledAt:
        typeof o.orderSearchEnabledAt === "string" ? o.orderSearchEnabledAt : null,
      marEnabled: o.marEnabled === true,
      marEnabledAt: typeof o.marEnabledAt === "string" ? o.marEnabledAt : null,
      billingReviewRequired: o.billingReviewRequired === true,
      billingReviewRequestedAt:
        typeof o.billingReviewRequestedAt === "string" ? o.billingReviewRequestedAt : null,
      billingEnabled: o.billingEnabled === true,
      billingEnabledAt: typeof o.billingEnabledAt === "string" ? o.billingEnabledAt : null,
      reviewedBillingCode:
        typeof o.reviewedBillingCode === "string" ? o.reviewedBillingCode.trim() || null : null,
      reviewedBillingUnit:
        typeof o.reviewedBillingUnit === "string" ? o.reviewedBillingUnit.trim() || null : null,
      reviewedByRole: typeof o.reviewedByRole === "string" ? o.reviewedByRole.trim() || null : null,
    };
  } catch {
    return base;
  }
}

export function parseProductRuntimeActivation(
  governanceNotes: string | null | undefined
): ProductRuntimeActivationMeta {
  const notes = governanceNotes?.trim() ?? "";
  if (!notes.includes(RUNTIME_ACTIVATION_MARKER_START)) {
    return defaultProductRuntimeActivationMeta();
  }
  const start = notes.indexOf(RUNTIME_ACTIVATION_MARKER_START) + RUNTIME_ACTIVATION_MARKER_START.length;
  const end = notes.indexOf(RUNTIME_ACTIVATION_MARKER_END);
  if (end < start) return defaultProductRuntimeActivationMeta();
  return parseMetaJson(notes.slice(start, end).trim());
}

export function mergeProductRuntimeActivation(
  governanceNotes: string | null | undefined,
  patch: Partial<ProductRuntimeActivationMeta>
): string {
  const notes = governanceNotes?.trim() ?? "";
  const human = stripRuntimeActivationBlock(notes).trim();
  const current = parseProductRuntimeActivation(notes);
  const next: ProductRuntimeActivationMeta = { ...current, ...patch, version: 1 };
  const block = `${RUNTIME_ACTIVATION_MARKER_START}\n${JSON.stringify(next)}\n${RUNTIME_ACTIVATION_MARKER_END}`;
  if (!human) return block;
  return `${human}\n\n${block}`;
}

export function stripRuntimeActivationBlock(notes: string): string {
  const start = notes.indexOf(RUNTIME_ACTIVATION_MARKER_START);
  if (start < 0) return notes;
  const end = notes.indexOf(RUNTIME_ACTIVATION_MARKER_END);
  if (end < 0) return notes.slice(0, start).trim();
  return (notes.slice(0, start) + notes.slice(end + RUNTIME_ACTIVATION_MARKER_END.length)).trim();
}

export function deriveRuntimeActivationState(params: {
  productIsActive: boolean;
  conceptIsActive: boolean;
  governanceStatus: string;
  formularyOnFormulary: boolean;
  runtime: ProductRuntimeActivationMeta;
}): MedicationRuntimeActivationState {
  const { productIsActive, governanceStatus, formularyOnFormulary, runtime } = params;

  if (runtime.billingEnabled) return "BILLING_ENABLED";
  if (runtime.billingReviewRequired) return "BILLING_REVIEW_REQUIRED";
  if (runtime.marEnabled) return "MAR_ENABLED";
  if (runtime.orderSearchEnabled && productIsActive) return "ORDER_SEARCH_ENABLED";
  if (runtime.formularyApprovedInactive || (formularyOnFormulary && !runtime.orderSearchEnabled)) {
    return "FORMULARY_APPROVED_INACTIVE";
  }
  if (governanceStatus === "REVIEW_REQUIRED" || governanceStatus === "READY_FOR_ACTIVATION") {
    return "FORMULARY_REVIEW";
  }
  return "CANONICAL_INACTIVE";
}
