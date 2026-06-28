import { canonicalCareProcedureByCode } from "./canonicalCareProcedureCatalog.js";
import { enterpriseProcedureById } from "./enterpriseProcedureCatalog.js";

export const ENTERPRISE_PROCEDURE_ID_MAX_LENGTH = 128;

export type OrderTypeForEnterpriseProcedure = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

export function normalizeEnterpriseProcedureId(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isKnownEnterpriseProcedureId(value: string): boolean {
  const code = value.trim();
  const canonical = canonicalCareProcedureByCode(code);
  if (canonical) {
    return canonical.isActive && canonical.orderable;
  }
  return enterpriseProcedureById(code) != null;
}

/**
 * Validates enterpriseProcedureId on order create lines.
 * Rejects unknown ids and non-CARE order domains.
 */
export function validateEnterpriseProcedureIdForOrderItem(input: {
  orderType: OrderTypeForEnterpriseProcedure;
  catalogItemType: string;
  enterpriseProcedureId?: string | null;
}): { ok: true; enterpriseProcedureId?: string } | { ok: false; message: string } {
  const normalized = normalizeEnterpriseProcedureId(input.enterpriseProcedureId);
  if (!normalized) {
    return { ok: true };
  }
  if (normalized.length > ENTERPRISE_PROCEDURE_ID_MAX_LENGTH) {
    return { ok: false, message: "Identifiant procédure enterprise trop long." };
  }
  if (input.orderType !== "CARE" || input.catalogItemType !== "CARE") {
    return {
      ok: false,
      message: "enterpriseProcedureId est réservé aux lignes de soins (CARE).",
    };
  }
  if (!isKnownEnterpriseProcedureId(normalized)) {
    return {
      ok: false,
      message: "Procédure enterprise inconnue.",
    };
  }
  return { ok: true, enterpriseProcedureId: normalized };
}
