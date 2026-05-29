import type { ProcedureDocumentationRecommendedAction } from "@medora/shared";

/** Extracts canonical procedure types from GET /encounters/:id/procedures payload. */
export function parseEncounterDocumentedProcedureTypes(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const out: string[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const rec = row as Record<string, unknown>;
    const payload =
      rec.payload && typeof rec.payload === "object" && !Array.isArray(rec.payload)
        ? (rec.payload as Record<string, unknown>)
        : null;
    const raw =
      typeof rec.canonicalProcedureType === "string" && rec.canonicalProcedureType.trim()
        ? rec.canonicalProcedureType.trim()
        : typeof rec.procedureType === "string" && rec.procedureType.trim()
          ? rec.procedureType.trim()
          : payload && typeof payload.procedureType === "string"
            ? String(payload.procedureType).trim()
            : "";
    if (!raw) continue;
    const legacyAssisted = payload?.assistedProcedureType;
    const resolved =
      raw === "NURSING_PROCEDURE_ASSIST" &&
      typeof legacyAssisted === "string" &&
      legacyAssisted.trim()
        ? legacyAssisted.trim()
        : raw;
    out.push(resolved);
  }
  return out;
}

export function procedureDocumentationActionLabelKey(
  action: ProcedureDocumentationRecommendedAction
): string | null {
  switch (action) {
    case "DOCUMENTATION_AVAILABLE":
      return "procedureOrderDocumentationLinkage.indicatorAvailable";
    case "DOCUMENTATION_RECOMMENDED":
      return "procedureOrderDocumentationLinkage.indicatorRecommended";
    case "DOCUMENTATION_REQUIRED_REVIEW":
      return "procedureOrderDocumentationLinkage.indicatorRequiredReview";
    default:
      return null;
  }
}

export function procedureDocumentationButtonLabelKey(
  action: ProcedureDocumentationRecommendedAction
): string | null {
  switch (action) {
    case "DOCUMENTATION_AVAILABLE":
      return "procedureOrderDocumentationLinkage.documentProcedure";
    case "DOCUMENTATION_RECOMMENDED":
    case "DOCUMENTATION_REQUIRED_REVIEW":
      return "procedureOrderDocumentationLinkage.openProcedureNote";
    default:
      return null;
  }
}

export function procedureDocumentationCompletionReminderKey(
  action: ProcedureDocumentationRecommendedAction
): string | null {
  if (action === "DOCUMENTATION_REQUIRED_REVIEW") {
    return "procedureOrderDocumentationLinkage.completionReminderRequired";
  }
  if (action === "DOCUMENTATION_RECOMMENDED") {
    return "procedureOrderDocumentationLinkage.completionReminderRecommended";
  }
  return null;
}
