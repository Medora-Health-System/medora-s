import {
  ENTERPRISE_PROCEDURE_CATALOG,
  type EnterpriseProcedureDocumentationTemplateId,
} from "./enterpriseProcedureCatalog.js";
import type { DocumentedProcedureType } from "../schemas/encounterProcedureTypes.js";

export const PROCEDURE_DOCUMENTATION_RECOMMENDED_ACTIONS = [
  "NONE",
  "DOCUMENTATION_AVAILABLE",
  "DOCUMENTATION_RECOMMENDED",
  "DOCUMENTATION_REQUIRED_REVIEW",
] as const;

export type ProcedureDocumentationRecommendedAction =
  (typeof PROCEDURE_DOCUMENTATION_RECOMMENDED_ACTIONS)[number];

const TERMINAL_ORDER_ITEM_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);

export type ResolveProcedureDocumentationLinkageInput = {
  enterpriseProcedureId?: string | null;
  orderItemId?: string;
  orderStatus?: string | null;
  /** Optional encounter procedure types already documented (canonical procedureType values). */
  documentedProcedureTypes?: readonly string[] | null;
};

export type ResolveProcedureDocumentationLinkageOutput = {
  hasDocumentationTemplate: boolean;
  documentationTemplateId?: string;
  requiresProcedureNote: boolean;
  recommendedAction: ProcedureDocumentationRecommendedAction;
};

export function documentationTemplateIdToDocumentedProcedureType(
  templateId: EnterpriseProcedureDocumentationTemplateId
): DocumentedProcedureType | "LACERATION_REPAIR" {
  if (templateId === "LACERATION") return "LACERATION_REPAIR";
  return templateId;
}

/** Maps catalog documentationTemplateId to ER procedure launcher step id (no PHI). */
export function documentationTemplateIdToLauncherStep(
  templateId: EnterpriseProcedureDocumentationTemplateId
): string {
  if (templateId === "LACERATION") return "laceration";
  return templateId;
}

function normalizeOrderStatus(status: string | null | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

function isTerminalOrderStatus(status: string | null | undefined): boolean {
  return TERMINAL_ORDER_ITEM_STATUSES.has(normalizeOrderStatus(status));
}

function isProcedureAlreadyDocumented(
  documentedProcedureTypes: readonly string[] | null | undefined,
  documentedProcedureType: string
): boolean {
  if (!documentedProcedureTypes?.length) return false;
  const target = documentedProcedureType.trim().toUpperCase();
  return documentedProcedureTypes.some((value) => String(value ?? "").trim().toUpperCase() === target);
}

/**
 * MEDPROC.3 — resolves enterprise catalog procedure order → documentation template linkage.
 * Uses catalog metadata only; no PHI.
 */
export function resolveProcedureDocumentationLinkage(
  input: ResolveProcedureDocumentationLinkageInput
): ResolveProcedureDocumentationLinkageOutput {
  const none: ResolveProcedureDocumentationLinkageOutput = {
    hasDocumentationTemplate: false,
    requiresProcedureNote: false,
    recommendedAction: "NONE",
  };

  const enterpriseProcedureId = String(input.enterpriseProcedureId ?? "").trim();
  if (!enterpriseProcedureId) return none;

  const entry = ENTERPRISE_PROCEDURE_CATALOG.find((row) => row.id === enterpriseProcedureId);
  if (!entry?.documentationTemplateId) return none;

  const documentationTemplateId = entry.documentationTemplateId;
  const documentedProcedureType = documentationTemplateIdToDocumentedProcedureType(documentationTemplateId);
  const requiresProcedureNote = entry.requiresProcedureNote;
  const base = {
    hasDocumentationTemplate: true,
    documentationTemplateId,
    requiresProcedureNote,
  };

  if (
    isProcedureAlreadyDocumented(input.documentedProcedureTypes, documentedProcedureType)
  ) {
    return { ...base, recommendedAction: "NONE" };
  }

  if (!isTerminalOrderStatus(input.orderStatus)) {
    return { ...base, recommendedAction: "DOCUMENTATION_AVAILABLE" };
  }

  if (requiresProcedureNote) {
    return { ...base, recommendedAction: "DOCUMENTATION_REQUIRED_REVIEW" };
  }

  return { ...base, recommendedAction: "DOCUMENTATION_RECOMMENDED" };
}

export type ProcedureOrderDocumentationHint = {
  orderItemId: string;
  enterpriseProcedureId: string;
  orderStatus: string;
  linkage: ResolveProcedureDocumentationLinkageOutput;
  launcherStep: string;
  documentedProcedureType: string;
};

/** Collects non-NONE documentation hints for CARE order lines (catalog metadata only). */
export function collectProcedureOrderDocumentationHints(
  careOrderItems: ReadonlyArray<{
    id: string;
    enterpriseProcedureId?: string | null;
    status?: string | null;
  }>,
  documentedProcedureTypes?: readonly string[] | null
): ProcedureOrderDocumentationHint[] {
  const out: ProcedureOrderDocumentationHint[] = [];
  for (const item of careOrderItems) {
    const orderItemId = String(item.id ?? "").trim();
    const enterpriseProcedureId = String(item.enterpriseProcedureId ?? "").trim();
    if (!orderItemId || !enterpriseProcedureId) continue;

    const linkage = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId,
      orderItemId,
      orderStatus: item.status,
      documentedProcedureTypes,
    });
    if (linkage.recommendedAction === "NONE") continue;

    const entry = ENTERPRISE_PROCEDURE_CATALOG.find((row) => row.id === enterpriseProcedureId);
    const templateId = entry?.documentationTemplateId;
    if (!templateId) continue;

    out.push({
      orderItemId,
      enterpriseProcedureId,
      orderStatus: normalizeOrderStatus(item.status),
      linkage,
      launcherStep: documentationTemplateIdToLauncherStep(templateId),
      documentedProcedureType: documentationTemplateIdToDocumentedProcedureType(templateId),
    });
  }
  return out;
}
