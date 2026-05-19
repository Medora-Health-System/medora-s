/** Phase 19E — exact source fields from Priority ER inventory staging rawJson. */

export type PriorityErSourceTrace = {
  exactSourceText: string;
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string;
  sourcePackageExact: string;
  sourceReviewStatus: string;
};

export function isPriorityErInventoryStagingRow(rawJson: unknown): boolean {
  if (rawJson == null || typeof rawJson !== "object" || Array.isArray(rawJson)) return false;
  const preservation = (rawJson as Record<string, unknown>).__preservation;
  if (preservation == null || typeof preservation !== "object") return false;
  return (preservation as Record<string, unknown>).rule === "priority_er_inventory_exact_source";
}

export function parsePriorityErSourceTrace(rawJson: unknown): PriorityErSourceTrace {
  const empty: PriorityErSourceTrace = {
    exactSourceText: "",
    sourceNameExact: "",
    sourceStrengthExact: "",
    sourceRouteExact: "",
    sourcePackageExact: "",
    sourceReviewStatus: "",
  };
  if (rawJson == null || typeof rawJson !== "object" || Array.isArray(rawJson)) return empty;

  const raw = rawJson as Record<string, unknown>;
  const trace =
    raw.__sourceTrace != null && typeof raw.__sourceTrace === "object" && !Array.isArray(raw.__sourceTrace)
      ? (raw.__sourceTrace as Record<string, unknown>)
      : {};

  const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : "");

  const sourceNameExact = str(trace.sourceNameExact) || str(raw.medication) || str(raw.source_name_exact);
  const sourceStrengthExact = str(trace.sourceStrengthExact) || str(raw.dose) || str(raw.source_strength_exact);
  const sourceRouteExact =
    str(trace.sourceRouteExact) || str(raw.form) || str(raw.source_route_exact);
  const sourcePackageExact =
    str(trace.sourcePackageExact) || str(raw.source_package_exact) || sourceRouteExact;

  return {
    exactSourceText:
      str(trace.exactSourceText) ||
      str(raw.exact_source_text) ||
      [sourceNameExact, sourceStrengthExact, sourceRouteExact].filter(Boolean).join(" "),
    sourceNameExact,
    sourceStrengthExact,
    sourceRouteExact,
    sourcePackageExact,
    sourceReviewStatus: str(trace.sourceReviewStatus) || str(raw.source_review_status),
  };
}

export function parsePriorityErReconciliationMeta(rawJson: unknown): {
  matchedConceptIds: string[];
  matchedProductIds: string[];
  duplicateWarnings: string[];
} {
  if (rawJson == null || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return { matchedConceptIds: [], matchedProductIds: [], duplicateWarnings: [] };
  }
  const rec = (rawJson as Record<string, unknown>).__reconciliation;
  if (rec == null || typeof rec !== "object" || Array.isArray(rec)) {
    return { matchedConceptIds: [], matchedProductIds: [], duplicateWarnings: [] };
  }
  const o = rec as Record<string, unknown>;
  return {
    matchedConceptIds: Array.isArray(o.matchedConceptIds)
      ? (o.matchedConceptIds as string[]).filter((id) => typeof id === "string")
      : [],
    matchedProductIds: Array.isArray(o.matchedProductIds)
      ? (o.matchedProductIds as string[]).filter((id) => typeof id === "string")
      : [],
    duplicateWarnings: Array.isArray(o.duplicateWarnings)
      ? (o.duplicateWarnings as string[]).filter((s) => typeof s === "string")
      : [],
  };
}
