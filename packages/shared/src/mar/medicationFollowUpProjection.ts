/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 — one projection, many consumers. */

import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";
import type { ParsedRespiratoryMedicationResponse } from "./respiratoryMedicationResponseGovernance.js";
import {
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
} from "./marMedicationResponseGovernance.js";
import {
  parseRespiratoryMedicationResponseNotes,
  sortRespiratoryMedicationResponsesNewestFirst,
} from "./respiratoryMedicationResponseNotes.js";
import { resolveMedicationResponseDocumentedByLabel } from "./medicationResponseDocumentedByDisplay.js";
import { resolveMedicationFollowUpType } from "./medicationFollowUpRegistry.js";
import { resolveMedicationFollowUpTypeLabelKey } from "./medicationFollowUpTypes.js";
import type { MedicationFollowUpType } from "./medicationFollowUpTypes.js";

export type MedicationFollowUpProjectionRowKind = "ADMINISTRATION" | "FOLLOW_UP";

export type UnifiedMedicationFollowUpProjectionRow = {
  id: string;
  kind: MedicationFollowUpProjectionRowKind;
  medicationName: string;
  dose: string | null;
  route: string | null;
  eventAt: string;
  followUpType: MedicationFollowUpType;
  followUpLabelKey: string;
  responseKind: "pain" | "respiratory" | null;
  painResponse?: ParsedMarMedicationResponse;
  respiratoryResponse?: ParsedRespiratoryMedicationResponse;
  documentedBy: string | null;
  summaryFields?: Array<{ testId?: string; text: string }>;
};

export type BuildUnifiedMedicationFollowUpTimelineInput = {
  admins: unknown[];
  readStr: (value: unknown) => string;
  formatWhen: (iso: string | null | undefined) => string;
  resolveFollowUpType: (admin: Record<string, unknown>) => MedicationFollowUpType;
};

function readAdminRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/** Chronological follow-up rows for MAR, Summary, history, discharge — single projection. */
export function buildUnifiedMedicationFollowUpTimelineRows(input: {
  admins: unknown[];
  readMedicationLabel: (admin: Record<string, unknown>) => string;
  readDose: (admin: Record<string, unknown>) => string;
  readRoute: (admin: Record<string, unknown>) => string;
  readAdministeredAt: (admin: Record<string, unknown>) => string;
  readFollowUpType: (admin: Record<string, unknown>) => MedicationFollowUpType;
}): UnifiedMedicationFollowUpProjectionRow[] {
  const rows: UnifiedMedicationFollowUpProjectionRow[] = [];

  for (const adminRaw of input.admins) {
    const admin = readAdminRecord(adminRaw);
    if (!admin) continue;
    const adminId = String(admin.id ?? "").trim();
    if (!adminId) continue;

    const medicationName = input.readMedicationLabel(admin);
    const dose = input.readDose(admin);
    const route = input.readRoute(admin);
    const administeredAt = input.readAdministeredAt(admin);
    const followUpType = input.readFollowUpType(admin);
    const notes = typeof admin.notes === "string" ? admin.notes : "";

    rows.push({
      id: `${adminId}:administration`,
      kind: "ADMINISTRATION",
      medicationName,
      dose,
      route,
      eventAt: administeredAt,
      followUpType,
      followUpLabelKey: "medicationFollowUp.events.administered",
      responseKind: null,
      documentedBy: null,
    });

    const painResponses = sortMarMedicationResponsesNewestFirst(
      Array.isArray(admin.medicationResponses)
        ? (admin.medicationResponses as ParsedMarMedicationResponse[])
        : parseMarMedicationResponseNotes(notes)
    );
    for (const response of painResponses) {
      rows.push({
        id: `${adminId}:pain-response:${response.documentedAt}`,
        kind: "FOLLOW_UP",
        medicationName,
        dose,
        route,
        eventAt: response.responseTime ?? response.documentedAt,
        followUpType: "PAIN",
        followUpLabelKey: "medicationFollowUp.events.painResponse",
        responseKind: "pain",
        painResponse: response,
        documentedBy: resolveMedicationResponseDocumentedByLabel({
          documentedBy: response.documentedBy ?? null,
          documentedByDisplayName: response.documentedByDisplayName ?? null,
          documentedByInitials: response.documentedByInitials ?? null,
          documentedByName: response.documentedByName ?? null,
          documentedByUserId: response.documentedByUserId ?? null,
        }),
      });
    }

    const respiratoryResponses = sortRespiratoryMedicationResponsesNewestFirst(
      Array.isArray(admin.respiratoryMedicationResponses)
        ? (admin.respiratoryMedicationResponses as ParsedRespiratoryMedicationResponse[])
        : parseRespiratoryMedicationResponseNotes(notes)
    );
    for (const response of respiratoryResponses) {
      rows.push({
        id: `${adminId}:respiratory-response:${response.documentedAt}`,
        kind: "FOLLOW_UP",
        medicationName,
        dose,
        route,
        eventAt: response.responseTime ?? response.documentedAt,
        followUpType: "RESPIRATORY",
        followUpLabelKey: "medicationFollowUp.events.respiratoryResponse",
        responseKind: "respiratory",
        respiratoryResponse: response,
        documentedBy: resolveMedicationResponseDocumentedByLabel({
          documentedBy: response.documentedBy ?? null,
          documentedByDisplayName: response.documentedByDisplayName ?? null,
          documentedByInitials: response.documentedByInitials ?? null,
          documentedByName: response.documentedByName ?? null,
          documentedByUserId: response.documentedByUserId ?? null,
        }),
      });
    }
  }

  return rows.sort(
    (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
  );
}

export function resolveAdministrationFollowUpTypeFromNotes(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  notes?: string | null;
  catalogCode?: string | null;
}): MedicationFollowUpType {
  return resolveMedicationFollowUpType({
    catalogCode: input.catalogCode,
    medicationLabel: input.medicationLabel,
    genericName: input.genericName,
  });
}

export function resolveMedicationFollowUpEventLabelKey(
  followUpType: MedicationFollowUpType,
  kind: MedicationFollowUpProjectionRowKind
): string {
  if (kind === "ADMINISTRATION") return "medicationFollowUp.events.administered";
  switch (followUpType) {
    case "PAIN":
      return "medicationFollowUp.events.painResponse";
    case "RESPIRATORY":
      return "medicationFollowUp.events.respiratoryResponse";
    case "GLUCOSE":
      return "medicationFollowUp.events.glucoseCheck";
    case "COAGULATION":
      return "medicationFollowUp.events.coagulationCheck";
    case "NEURO":
      return "medicationFollowUp.events.neuroCheck";
    case "SEDATION":
      return "medicationFollowUp.events.sedationAssessment";
    case "LAB":
      return "medicationFollowUp.events.labFollowUp";
    default:
      return resolveMedicationFollowUpTypeLabelKey(followUpType);
  }
}
