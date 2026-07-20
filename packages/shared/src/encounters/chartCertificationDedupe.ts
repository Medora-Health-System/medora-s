/**
 * Stage A — semantic deficiency collapsing for ED chart certification.
 * One root cause → one deficiency, even when multiple engines emit aliases.
 */

/** Stable canonical codes for root-cause collapsing. */
export const CHART_CERTIFICATION_ROOT_CODES = {
  PROVIDER_NOTE_UNSIGNED: "PROVIDER_NOTE_UNSIGNED",
  PROVIDER_DOCUMENTATION_MISSING: "PROVIDER_DOCUMENTATION_MISSING",
  NURSING_ASSESSMENT_MISSING: "NURSING_ASSESSMENT_MISSING",
  ACTIVE_ORDERS_UNRESOLVED: "ACTIVE_ORDERS_UNRESOLVED",
  BILLING_NOT_READY: "BILLING_NOT_READY",
  DISCHARGE_FOLLOW_UP_MISSING: "DISCHARGE_FOLLOW_UP_MISSING",
  DISCHARGE_INSTRUCTIONS_MISSING: "DISCHARGE_INSTRUCTIONS_MISSING",
} as const;

export type ChartCertificationRootCode =
  (typeof CHART_CERTIFICATION_ROOT_CODES)[keyof typeof CHART_CERTIFICATION_ROOT_CODES];

/** Map emitted deficiency ids / disposition codes → root dedupe key. */
const DEDUPE_ALIASES: Record<string, string> = {
  "provider:unsigned": CHART_CERTIFICATION_ROOT_CODES.PROVIDER_NOTE_UNSIGNED,
  "disposition:PROVIDER_DOCUMENTATION_UNSIGNED": CHART_CERTIFICATION_ROOT_CODES.PROVIDER_NOTE_UNSIGNED,
  PROVIDER_DOCUMENTATION_UNSIGNED: CHART_CERTIFICATION_ROOT_CODES.PROVIDER_NOTE_UNSIGNED,

  "doc:PROVIDER_DOCUMENTATION": CHART_CERTIFICATION_ROOT_CODES.PROVIDER_DOCUMENTATION_MISSING,
  PROVIDER_DOCUMENTATION: CHART_CERTIFICATION_ROOT_CODES.PROVIDER_DOCUMENTATION_MISSING,

  "doc:NURSING_ASSESSMENT": CHART_CERTIFICATION_ROOT_CODES.NURSING_ASSESSMENT_MISSING,
  NURSING_ASSESSMENT: CHART_CERTIFICATION_ROOT_CODES.NURSING_ASSESSMENT_MISSING,

  "orders:open": CHART_CERTIFICATION_ROOT_CODES.ACTIVE_ORDERS_UNRESOLVED,
  "disposition:ACTIVE_ORDERS_UNRESOLVED": CHART_CERTIFICATION_ROOT_CODES.ACTIVE_ORDERS_UNRESOLVED,
  ACTIVE_ORDERS_UNRESOLVED: CHART_CERTIFICATION_ROOT_CODES.ACTIVE_ORDERS_UNRESOLVED,

  "billing:not-ready": CHART_CERTIFICATION_ROOT_CODES.BILLING_NOT_READY,
  "billing:snapshot-not-ready": CHART_CERTIFICATION_ROOT_CODES.BILLING_NOT_READY,

  "disposition:DISCHARGE_FOLLOW_UP_MISSING": CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_FOLLOW_UP_MISSING,
  DISCHARGE_FOLLOW_UP_MISSING: CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_FOLLOW_UP_MISSING,

  "disposition:DISCHARGE_INSTRUCTIONS_MISSING":
    CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_INSTRUCTIONS_MISSING,
  "disposition:DISCHARGE_INSTRUCTIONS_NOT_GIVEN":
    CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_INSTRUCTIONS_MISSING,
  DISCHARGE_INSTRUCTIONS_MISSING: CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_INSTRUCTIONS_MISSING,
  DISCHARGE_INSTRUCTIONS_NOT_GIVEN: CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_INSTRUCTIONS_MISSING,
  DISCHARGE_INSTRUCTIONS_INCOMPLETE: CHART_CERTIFICATION_ROOT_CODES.DISCHARGE_INSTRUCTIONS_MISSING,
};

export function chartCertificationDedupeKey(input: {
  id: string;
  stableCode?: string | null;
  sourceEntityId?: string | null;
}): string {
  const alias =
    DEDUPE_ALIASES[input.id] ??
    (input.stableCode ? DEDUPE_ALIASES[input.stableCode] : undefined) ??
    input.stableCode ??
    input.id;
  const entity = (input.sourceEntityId ?? "").trim();
  return entity ? `${alias}::${entity}` : alias;
}

const ESTABLISHED = "ESTABLISHED_WORKFLOW";

/** Prefer the first (higher-priority) deficiency when collapsing aliases. */
export function mergeChartCertificationDeficiencyFlags<
  T extends {
    blockingClosure: boolean;
    blockingBilling: boolean;
    severity: string;
    sourceAuthority?: string;
    suggestsClosureReview?: boolean;
    suggestsBillingReview?: boolean;
  },
>(existing: T, incoming: T): T {
  const severityRank = (s: string) =>
    s === "BLOCKER" ? 3 : s === "WARNING" ? 2 : s === "INFO" ? 1 : 0;
  const established =
    existing.sourceAuthority === ESTABLISHED || incoming.sourceAuthority === ESTABLISHED;
  const existingSuggestsClosure =
    existing.suggestsClosureReview ?? existing.blockingClosure;
  const incomingSuggestsClosure =
    incoming.suggestsClosureReview ?? incoming.blockingClosure;
  const existingSuggestsBilling =
    existing.suggestsBillingReview ?? existing.blockingBilling;
  const incomingSuggestsBilling =
    incoming.suggestsBillingReview ?? incoming.blockingBilling;
  return {
    ...existing,
    sourceAuthority: established ? ESTABLISHED : existing.sourceAuthority ?? incoming.sourceAuthority,
    blockingClosure: established
      ? (existing.sourceAuthority === ESTABLISHED && existing.blockingClosure) ||
        (incoming.sourceAuthority === ESTABLISHED && incoming.blockingClosure)
      : false,
    blockingBilling: established
      ? (existing.sourceAuthority === ESTABLISHED && existing.blockingBilling) ||
        (incoming.sourceAuthority === ESTABLISHED && incoming.blockingBilling)
      : false,
    suggestsClosureReview: existingSuggestsClosure || incomingSuggestsClosure,
    suggestsBillingReview: existingSuggestsBilling || incomingSuggestsBilling,
    severity:
      severityRank(incoming.severity) > severityRank(existing.severity)
        ? incoming.severity
        : existing.severity,
  };
}
