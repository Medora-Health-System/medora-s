import { displayNameFrForDocumentedProcedureType } from "./documentedProcedureBillingBridge.js";
import {
  readCanonicalProcedureTypeFromPayload,
  readDocumentationRoleFromPayload,
  type ProcedureDocumentationRole,
} from "./schemas/encounterProcedureNursing.js";

export const DOCUMENTED_PROCEDURE_STATUS_COMPLETED = "COMPLETED" as const;

export type DocumentedProcedureStatus = typeof DOCUMENTED_PROCEDURE_STATUS_COMPLETED;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStr(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function displayNameFrForDocumentedProcedurePayload(payloadJson: unknown): string {
  const procedureType = readCanonicalProcedureTypeFromPayload(payloadJson);
  const documentationRole = readDocumentationRoleFromPayload(payloadJson);
  if (documentationRole === "NURSING" && procedureType) {
    return `${displayNameFrForDocumentedProcedureType(procedureType)} (soins infirmiers)`;
  }
  return displayNameFrForDocumentedProcedureType(procedureType);
}

export function readProcedureTypeFromPayload(payloadJson: unknown): string | null {
  return readCanonicalProcedureTypeFromPayload(payloadJson);
}

export function readPerformedAtFromPayload(payloadJson: unknown): string | null {
  return readStr(asRecord(payloadJson), "performedAt");
}

export function readPerformedByDisplayNameFromPayload(payloadJson: unknown): string | null {
  const record = asRecord(payloadJson);
  return readStr(record, "performedByDisplayName") || readStr(record, "performerDisplayName");
}

export function readPerformerTitleFromPayload(payloadJson: unknown): string | null {
  return readStr(asRecord(payloadJson), "performerTitle");
}

export type DocumentedProcedureSummaryMeta = {
  procedureType: string;
  procedureNameFr: string;
  performedAtIso: string | null;
  documentedAtIso: string;
  performedByDisplayName: string | null;
  documentedByDisplayName: string | null;
  performerTitle: string | null;
  status: DocumentedProcedureStatus;
  clinicalSummaryFr: string;
  documentationRole: ProcedureDocumentationRole;
};

export function buildDocumentedProcedureSummaryMeta(input: {
  payloadJson: unknown;
  documentedAtIso: string;
  documentedByDisplayName: string | null;
}): DocumentedProcedureSummaryMeta | null {
  const procedureType = readCanonicalProcedureTypeFromPayload(input.payloadJson);
  if (!procedureType) return null;

  const record = asRecord(input.payloadJson);
  const procedureNameFr = displayNameFrForDocumentedProcedurePayload(input.payloadJson);
  const documentationRole = readDocumentationRoleFromPayload(input.payloadJson);
  const performedAtIso = readPerformedAtFromPayload(input.payloadJson);
  const performedByDisplayName = readPerformedByDisplayNameFromPayload(input.payloadJson);
  const performerTitle = readPerformerTitleFromPayload(input.payloadJson);
  const documentedByDisplayName = input.documentedByDisplayName?.trim() || null;

  const parts: string[] = [procedureNameFr];
  const site = readStr(record, "site");
  if (site) parts.push(`Site : ${site}`);
  if (performedAtIso) parts.push(`Réalisée le ${performedAtIso}`);
  if (performedByDisplayName) {
    parts.push(
      performerTitle
        ? `Réalisée par ${performerTitle} ${performedByDisplayName}`
        : `Réalisée par ${performedByDisplayName}`
    );
  }
  if (documentedByDisplayName) parts.push(`Documentée par ${documentedByDisplayName}`);
  if (documentationRole === "NURSING") parts.push("Volet : soins infirmiers");
  else parts.push("Volet : médecin");
  parts.push("Statut : terminée");

  const assistedProvider = readStr(record, "assistedProviderName");
  if (assistedProvider) parts.push(`Médecin assisté : ${assistedProvider}`);

  const notes = readStr(record, "notes");
  if (notes) parts.push(`Notes : ${notes.slice(0, 160)}`);
  const complications = readStr(record, "complications");
  if (complications) parts.push(`Complications : ${complications.slice(0, 120)}`);

  return {
    procedureType,
    procedureNameFr,
    performedAtIso,
    documentedAtIso: input.documentedAtIso,
    performedByDisplayName,
    documentedByDisplayName,
    performerTitle,
    status: DOCUMENTED_PROCEDURE_STATUS_COMPLETED,
    clinicalSummaryFr: parts.join(" — "),
    documentationRole,
  };
}
