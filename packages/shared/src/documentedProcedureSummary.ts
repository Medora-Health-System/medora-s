import {
  displayNameEnForDocumentedProcedureType,
  displayNameFrForDocumentedProcedureType,
} from "./documentedProcedureBillingBridge.js";
import {
  pickCatalogDisplayLabelForProductUi,
  pickProductUiCopy,
} from "./i18n/productUiLocale.js";
import {
  readCanonicalProcedureTypeFromPayload,
  readDocumentationRoleFromPayload,
  type ProcedureDocumentationRole,
} from "./schemas/encounterProcedureNursing.js";

export const DOCUMENTED_PROCEDURE_STATUS_COMPLETED = "COMPLETED" as const;

export type DocumentedProcedureStatus = typeof DOCUMENTED_PROCEDURE_STATUS_COMPLETED;

export type DocumentedProcedureSummaryLocale = string;

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

export function displayNameEnForDocumentedProcedurePayload(payloadJson: unknown): string {
  const procedureType = readCanonicalProcedureTypeFromPayload(payloadJson);
  const documentationRole = readDocumentationRoleFromPayload(payloadJson);
  if (documentationRole === "NURSING" && procedureType) {
    return `${displayNameEnForDocumentedProcedureType(procedureType)} (nursing care)`;
  }
  return displayNameEnForDocumentedProcedureType(procedureType);
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

type ProcedureSummaryLabels = {
  site: string;
  performedAt: string;
  performedBy: string;
  documentedBy: string;
  roleNursing: string;
  roleProvider: string;
  statusCompleted: string;
  assistedProvider: string;
  notes: string;
  complications: string;
};

const PROCEDURE_SUMMARY_LABELS_EN: ProcedureSummaryLabels = {
  site: "Site",
  performedAt: "Performed at",
  performedBy: "Performed by",
  documentedBy: "Documented by",
  roleNursing: "Section: nursing",
  roleProvider: "Section: provider",
  statusCompleted: "Status: completed",
  assistedProvider: "Assisting provider",
  notes: "Notes",
  complications: "Complications",
};

const PROCEDURE_SUMMARY_LABELS_FR: ProcedureSummaryLabels = {
  site: "Site",
  performedAt: "Réalisée le",
  performedBy: "Réalisée par",
  documentedBy: "Documentée par",
  roleNursing: "Volet : soins infirmiers",
  roleProvider: "Volet : médecin",
  statusCompleted: "Statut : terminée",
  assistedProvider: "Médecin assisté",
  notes: "Notes",
  complications: "Complications",
};

const PROCEDURE_SUMMARY_LABELS_ES: ProcedureSummaryLabels = {
  site: "Sitio",
  performedAt: "Realizado el",
  performedBy: "Realizado por",
  documentedBy: "Documentado por",
  roleNursing: "Sección: enfermería",
  roleProvider: "Sección: profesional clínico",
  statusCompleted: "Estado: completado",
  assistedProvider: "Profesional clínico asistente",
  notes: "Notas",
  complications: "Complicaciones",
};

function procedureSummaryLabels(locale: string): ProcedureSummaryLabels {
  return pickProductUiCopy(
    locale,
    {
      en: PROCEDURE_SUMMARY_LABELS_EN,
      fr: PROCEDURE_SUMMARY_LABELS_FR,
      es: PROCEDURE_SUMMARY_LABELS_ES,
    },
    PROCEDURE_SUMMARY_LABELS_ES
  );
}

export type DocumentedProcedureSummaryMeta = {
  procedureType: string;
  procedureNameFr: string;
  procedureNameEn: string;
  performedAtIso: string | null;
  documentedAtIso: string;
  performedByDisplayName: string | null;
  documentedByDisplayName: string | null;
  performerTitle: string | null;
  status: DocumentedProcedureStatus;
  clinicalSummaryFr: string;
  clinicalSummaryEn: string;
  documentationRole: ProcedureDocumentationRole;
};

export function formatDocumentedProcedureClinicalSummary(input: {
  payloadJson: unknown;
  documentedAtIso: string;
  documentedByDisplayName: string | null;
  locale: DocumentedProcedureSummaryLocale;
}): string | null {
  const procedureType = readCanonicalProcedureTypeFromPayload(input.payloadJson);
  if (!procedureType) return null;

  const record = asRecord(input.payloadJson);
  const documentationRole = readDocumentationRoleFromPayload(input.payloadJson);
  const labels = procedureSummaryLabels(input.locale);
  const procedureName = pickCatalogDisplayLabelForProductUi(input.locale, {
    displayNameEn: displayNameEnForDocumentedProcedurePayload(input.payloadJson),
    displayNameFr: displayNameFrForDocumentedProcedurePayload(input.payloadJson),
    code: procedureType,
  });
  const performedAtIso = readPerformedAtFromPayload(input.payloadJson);
  const performedByDisplayName = readPerformedByDisplayNameFromPayload(input.payloadJson);
  const performerTitle = readPerformerTitleFromPayload(input.payloadJson);
  const documentedByDisplayName = input.documentedByDisplayName?.trim() || null;

  const parts: string[] = [procedureName];
  const site = readStr(record, "site");
  if (site) parts.push(`${labels.site} : ${site}`);
  if (performedAtIso) parts.push(`${labels.performedAt} ${performedAtIso}`);
  if (performedByDisplayName) {
    parts.push(
      performerTitle
        ? `${labels.performedBy} ${performerTitle} ${performedByDisplayName}`
        : `${labels.performedBy} ${performedByDisplayName}`
    );
  }
  if (documentedByDisplayName) parts.push(`${labels.documentedBy} ${documentedByDisplayName}`);
  if (documentationRole === "NURSING") parts.push(labels.roleNursing);
  else parts.push(labels.roleProvider);
  parts.push(labels.statusCompleted);

  const assistedProvider = readStr(record, "assistedProviderName");
  if (assistedProvider) parts.push(`${labels.assistedProvider} : ${assistedProvider}`);

  const notes = readStr(record, "notes");
  if (notes) parts.push(`${labels.notes} : ${notes.slice(0, 160)}`);
  const complications = readStr(record, "complications");
  if (complications) parts.push(`${labels.complications} : ${complications.slice(0, 120)}`);

  return parts.join(" — ");
}

export function buildDocumentedProcedureSummaryMeta(input: {
  payloadJson: unknown;
  documentedAtIso: string;
  documentedByDisplayName: string | null;
}): DocumentedProcedureSummaryMeta | null {
  const procedureType = readCanonicalProcedureTypeFromPayload(input.payloadJson);
  if (!procedureType) return null;

  const procedureNameFr = displayNameFrForDocumentedProcedurePayload(input.payloadJson);
  const procedureNameEn = displayNameEnForDocumentedProcedurePayload(input.payloadJson);
  const documentationRole = readDocumentationRoleFromPayload(input.payloadJson);
  const performedAtIso = readPerformedAtFromPayload(input.payloadJson);
  const performedByDisplayName = readPerformedByDisplayNameFromPayload(input.payloadJson);
  const performerTitle = readPerformerTitleFromPayload(input.payloadJson);
  const documentedByDisplayName = input.documentedByDisplayName?.trim() || null;

  const clinicalSummaryFr =
    formatDocumentedProcedureClinicalSummary({
      payloadJson: input.payloadJson,
      documentedAtIso: input.documentedAtIso,
      documentedByDisplayName: input.documentedByDisplayName,
      locale: "fr",
    }) ?? procedureNameFr;
  const clinicalSummaryEn =
    formatDocumentedProcedureClinicalSummary({
      payloadJson: input.payloadJson,
      documentedAtIso: input.documentedAtIso,
      documentedByDisplayName: input.documentedByDisplayName,
      locale: "en",
    }) ?? procedureNameEn;

  return {
    procedureType,
    procedureNameFr,
    procedureNameEn,
    performedAtIso,
    documentedAtIso: input.documentedAtIso,
    performedByDisplayName,
    documentedByDisplayName,
    performerTitle,
    status: DOCUMENTED_PROCEDURE_STATUS_COMPLETED,
    clinicalSummaryFr,
    clinicalSummaryEn,
    documentationRole,
  };
}
