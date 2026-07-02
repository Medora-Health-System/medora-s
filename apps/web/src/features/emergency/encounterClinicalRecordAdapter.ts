/**
 * Maps existing ER Summary data shapes to BuildEncounterClinicalRecordInput.
 * Pure adapter — no React, no fetch, no input mutation.
 */

import {
  formatDocumentedProcedureClinicalSummary,
  type BuildEncounterClinicalRecordInput,
  type EncounterClinicalRecordLocale,
} from "@medora/shared";
import { buildProviderDocumentationDisplayModel } from "@/lib/providerDocumentationModel";
import type { SupportedLanguage } from "@/i18n/config";
import type { UnifiedTimelineApiItem } from "@/lib/unifiedEncounterTimelineUi";
import type { EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import {
  readInitialNursingEvalSignature,
} from "./erInitialNursingAssessmentSummary";
import { readDispositionSignatureFromEncounter } from "./emergencyDispositionV1";
import type {
  ClinicalDocumentationEventApiEntry,
  EmergencyVisitSummaryModel,
  NursingReassessmentApiEntry,
  VisitSummaryDocumentationHistoryEntry,
  VisitSummaryReassessmentEntry,
} from "./emergencyVisitSummaryModel";

export type EmergencySummaryClinicalRecordAdapterEncounter = {
  id: string;
  facilityId?: string | null;
  patientId?: string | null;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  chiefComplaint?: string | null;
  visitReason?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  roomLabel?: string | null;
  diagnoses?: BuildEncounterClinicalRecordInput["encounter"]["diagnoses"];
  patient?: {
    id?: string | null;
    displayName?: string | null;
    mrn?: string | null;
    dateOfBirth?: string | null;
    sex?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

export type EmergencySummaryClinicalRecordAdapterInput = {
  locale: SupportedLanguage;
  encounter: EmergencySummaryClinicalRecordAdapterEncounter;
  triageSnapshot?: Record<string, unknown> | null;
  summaryModel: EmergencyVisitSummaryModel;
  orders?: unknown[];
  medicationAdministrations?: unknown[];
  procedures?: unknown[];
  documentationEvents?: ClinicalDocumentationEventApiEntry[];
  nursingReassessmentEvents?: NursingReassessmentApiEntry[];
  resultsSnapshot?: EncounterResultsLabRadSnapshot | null;
  unifiedTimelineItems?: UnifiedTimelineApiItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toClinicalRecordLocale(locale: SupportedLanguage): EncounterClinicalRecordLocale {
  return locale === "en" ? "en" : "fr";
}

function formatPatientDisplayName(patient: EmergencySummaryClinicalRecordAdapterEncounter["patient"]): string | null {
  if (!patient) return null;
  const display = asTrimmed(patient.displayName);
  if (display) return display;
  const parts = [asTrimmed(patient.firstName), asTrimmed(patient.lastName)].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function formatAttendingProvider(
  physician: EmergencySummaryClinicalRecordAdapterEncounter["physicianAssigned"]
): string | null {
  if (!physician) return null;
  const parts = [asTrimmed(physician.firstName), asTrimmed(physician.lastName)].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function mapProviderHistoryEntry(
  entry: VisitSummaryDocumentationHistoryEntry
): NonNullable<BuildEncounterClinicalRecordInput["providerAssessmentSaveHistory"]>[number] {
  return {
    id: entry.id,
    savedAt: entry.savedAt,
    documentedAt: entry.documentedAt,
    performerDisplayName: entry.performerDisplayName,
    performerRoleTitle: entry.performerRoleTitle,
    sections: entry.structuredLines.map((line) => {
      const colon = line.indexOf(":");
      if (colon <= 0) return { label: "Note", text: line };
      return {
        label: line.slice(0, colon).trim(),
        text: line.slice(colon + 1).trim(),
      };
    }),
    narrativeSummary: entry.narrativeExcerpt || null,
    isDraft: false,
  };
}

function mapNursingHistoryEntry(
  entry: VisitSummaryReassessmentEntry
): NonNullable<BuildEncounterClinicalRecordInput["nursingReassessmentHistory"]>[number] {
  return {
    id: entry.id,
    savedAt: entry.savedAt,
    documentedAt: entry.documentedAt,
    performerDisplayName: entry.performerDisplayName,
    performerRoleTitle: entry.performerRoleTitle,
    structuredLines: entry.structuredLines,
    narrativeSummary: entry.narrativeExcerpt || null,
  };
}

function readProviderWorkspaceSavedMeta(
  nursingAssessment: unknown,
  locale: SupportedLanguage
): {
  savedAt: string | null;
  savedByDisplayName: string | null;
} {
  const workspace = buildProviderDocumentationDisplayModel({
    nursingAssessment,
    locale: locale === "en" ? "en" : "fr",
  });
  return {
    savedAt: workspace?.savedAt ?? null,
    savedByDisplayName: workspace?.savedBy ?? null,
  };
}

function buildVitalsFromTriage(
  triageSnapshot: Record<string, unknown> | null | undefined
): BuildEncounterClinicalRecordInput["vitals"] {
  if (!triageSnapshot) return [];
  const vitalsJson = triageSnapshot.vitalsJson;
  const vitals = asRecord(vitalsJson);
  if (!vitals) return [];

  const recordedAt =
    asTrimmed(triageSnapshot.triageCompleteAt) ??
    asTrimmed(triageSnapshot.updatedAt) ??
    asTrimmed(triageSnapshot.createdAt);
  if (!recordedAt) return [];

  const parts: string[] = [];
  for (const [key, value] of Object.entries(vitals)) {
    if (value == null || value === "") continue;
    parts.push(`${key}: ${String(value)}`);
  }
  if (parts.length === 0) return [];

  return [
    {
      id: "triage-vitals",
      recordedAt,
      source: "TRIAGE",
      summary: parts.join(" · "),
    },
  ];
}

function mapOrders(orders: unknown[]): BuildEncounterClinicalRecordInput["orders"] {
  const mapped: NonNullable<BuildEncounterClinicalRecordInput["orders"]> = [];
  for (const raw of orders) {
    const order = asRecord(raw);
    if (!order) continue;
    const itemsRaw = Array.isArray(order.items) ? order.items : [];
    const items = itemsRaw
      .map((itemRaw) => {
        const item = asRecord(itemRaw);
        if (!item) return null;
        const result = asRecord(item.result);
        return {
          id: asTrimmed(item.id) ?? undefined,
          displayLabel: asTrimmed(item.displayLabel),
          manualLabel: asTrimmed(item.manualLabel),
          catalogItemType: asTrimmed(item.catalogItemType),
          status: asTrimmed(item.status),
          result: result
            ? {
                resultText: asTrimmed(result.resultText),
                verifiedAt: asTrimmed(result.verifiedAt),
                criticalValue: Boolean(result.criticalValue),
                acknowledgedAt:
                  asTrimmed(result.acknowledgedByProviderAt) ?? asTrimmed(result.acknowledgedAt),
                enteredByDisplayName:
                  asTrimmed(result.enteredByDisplayFr) ?? asTrimmed(result.verifiedByDisplayFr),
                acknowledgedByDisplayName: asTrimmed(result.acknowledgedByDisplayFr),
                acknowledgedByProviderAt: asTrimmed(result.acknowledgedByProviderAt),
              }
            : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    mapped.push({
      id: asTrimmed(order.id) ?? undefined,
      type: asTrimmed(order.type) ?? undefined,
      priority: asTrimmed(order.priority),
      status: asTrimmed(order.status),
      createdAt: asTrimmed(order.createdAt),
      orderedByDisplayName:
        asTrimmed(order.orderedByDisplayName) ??
        asTrimmed(order.prescriberName) ??
        asTrimmed(order.createdByDisplayName),
      items,
    });
  }
  return mapped;
}

function mapMedicationAdministrations(
  admins: unknown[]
): BuildEncounterClinicalRecordInput["medicationAdministrations"] {
  const mapped: NonNullable<BuildEncounterClinicalRecordInput["medicationAdministrations"]> = [];
  for (const raw of admins) {
    const admin = asRecord(raw);
    if (!admin) continue;
    const id = asTrimmed(admin.id);
    if (!id) continue;
    mapped.push({
      id,
      medicationName:
        asTrimmed(admin.medicationName) ??
        asTrimmed(admin.medicationDisplayName) ??
        asTrimmed(admin.displayLabel),
      dose: asTrimmed(admin.dose),
      route: asTrimmed(admin.route),
      marAction: asTrimmed(admin.marAction),
      action: asTrimmed(admin.action),
      administeredAt: asTrimmed(admin.administeredAt),
      administeredByDisplayName:
        asTrimmed(admin.administeredByDisplayName) ?? asTrimmed(admin.administeredBy),
      documentedByDisplayName:
        asTrimmed(admin.documentedByDisplayName) ??
        asTrimmed(admin.recordedByDisplayName) ??
        asTrimmed(admin.createdByDisplayName),
      orderItemId: asTrimmed(admin.orderItemId),
    });
  }
  return mapped;
}

function mapProcedures(
  procedures: unknown[],
  locale: EncounterClinicalRecordLocale
): BuildEncounterClinicalRecordInput["procedures"] {
  const mapped: NonNullable<BuildEncounterClinicalRecordInput["procedures"]> = [];
  for (const raw of procedures) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const id = asTrimmed(entry.id);
    if (!id) continue;
    const payload = asRecord(entry.payload) ?? entry;
    const documentedAt =
      asTrimmed(entry.documentedAt) ?? asTrimmed(entry.createdAt) ?? asTrimmed(entry.performedAt);
    const documentedByDisplayName =
      asTrimmed(entry.documentedByDisplayName) ?? asTrimmed(entry.performedByDisplayName);
    const clinicalSummary =
      asTrimmed(entry.clinicalSummaryFr) ??
      asTrimmed(entry.clinicalSummaryEn) ??
      asTrimmed(entry.clinicalSummary) ??
      (documentedAt
        ? formatDocumentedProcedureClinicalSummary({
            payloadJson: payload,
            documentedAtIso: documentedAt,
            documentedByDisplayName,
            locale,
          })
        : null);
    if (!clinicalSummary) continue;
    mapped.push({
      id,
      label: asTrimmed(entry.label) ?? asTrimmed(entry.procedureType) ?? clinicalSummary,
      clinicalSummary,
      documentedAt,
      documentedByDisplayName,
      performedByDisplayName:
        asTrimmed(entry.performedByDisplayName) ?? documentedByDisplayName,
      documentationRole: asTrimmed(entry.documentationRole),
    });
  }
  return mapped;
}

function mapDocumentationEventsToAuditRows(
  events: ClinicalDocumentationEventApiEntry[]
): NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> {
  const rows: NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> = [];
  for (const event of events) {
    const sourceId = asTrimmed(event.id);
    const documentedAtIso = asTrimmed(event.createdAt);
    const eventType = asTrimmed(event.eventType);
    if (!sourceId || !documentedAtIso || !eventType) continue;
    rows.push({
      sourceKind: "ENCOUNTER_CLINICAL_EVENT",
      sourceId,
      storedEventType: eventType,
      documentedAtIso,
      actorDisplayName:
        asTrimmed(event.performerDisplayName) ?? asTrimmed(event.createdBy),
      actorRole: asTrimmed(event.performerRoleTitle),
      summaryEn: eventType,
      summaryFr: eventType,
    });
  }
  return rows;
}

function mapNursingReassessmentEventsToAuditRows(
  events: NursingReassessmentApiEntry[]
): NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> {
  const rows: NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> = [];
  for (const event of events) {
    const sourceId = asTrimmed(event.id);
    const documentedAtIso = asTrimmed(event.createdAt);
    if (!sourceId || !documentedAtIso) continue;
    rows.push({
      sourceKind: "ENCOUNTER_CLINICAL_EVENT",
      sourceId,
      storedEventType: "NURSING_ASSESSMENT_SAVED",
      documentedAtIso,
      actorDisplayName: asTrimmed(event.performerDisplayName),
      actorRole: asTrimmed(event.performerRoleTitle),
      summaryEn: "Nursing reassessment saved",
      summaryFr: "Réévaluation infirmière enregistrée",
    });
  }
  return rows;
}

function orderTypeFromUnifiedItem(item: UnifiedTimelineApiItem): string | null {
  if (item.displayGroup === "LABORATORY") return "LAB";
  if (item.displayGroup === "IMAGING") return "IMAGING";
  if (item.displayGroup === "MEDICATION") return "MEDICATION";
  if (item.displayGroup === "PROCEDURE") return "CARE";
  return null;
}

function mapUnifiedTimelineToAuditRows(
  items: UnifiedTimelineApiItem[]
): NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> {
  const rows: NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]> = [];
  for (const item of items) {
    rows.push({
      sourceKind: item.sourceKind,
      sourceId: item.sourceId,
      storedEventType: item.storedEventType,
      documentedAtIso: item.documentedAtIso,
      actorDisplayName: item.actor.displayName,
      actorRole: item.actor.role,
      summaryEn: item.summaryEn,
      summaryFr: item.summaryFr,
      orderId: item.orderId,
      orderItemId: item.orderItemId,
      orderType: orderTypeFromUnifiedItem(item),
    });
  }
  return rows;
}

function buildDispositionInput(
  summaryModel: EmergencyVisitSummaryModel,
  encounter: EmergencySummaryClinicalRecordAdapterEncounter
): BuildEncounterClinicalRecordInput["disposition"] {
  const lines = summaryModel.disposition?.lines ?? [];
  const disSig = readDispositionSignatureFromEncounter(encounter.nursingAssessment);
  if (lines.length === 0 && !encounter.dischargeSummaryJson && !disSig) return null;
  return {
    dischargeMode: null,
    destination: null,
    summaryLines: lines,
    dispositionAt: asTrimmed(encounter.closedAt) ?? disSig?.savedAt ?? null,
    documentedByDisplayName: disSig?.savedByDisplayName ?? null,
    signedByDisplayName: disSig?.savedByDisplayName ?? null,
    signedAt: disSig?.savedAt ?? null,
  };
}

function buildTriageDocumentationInput(
  summaryModel: EmergencyVisitSummaryModel,
  triageSnapshot: Record<string, unknown> | null | undefined
): BuildEncounterClinicalRecordInput["triageDocumentation"] {
  const latest = summaryModel.triageAssessmentHistory[0];
  if (latest) {
    return {
      documentedByDisplayName: latest.performerDisplayName,
      documentedByRole: latest.performerRoleTitle,
      documentedAt: latest.documentedAt ?? latest.savedAt,
    };
  }
  const documentedAt =
    asTrimmed(triageSnapshot?.triageCompleteAt) ??
    asTrimmed(triageSnapshot?.updatedAt) ??
    asTrimmed(triageSnapshot?.createdAt);
  if (!documentedAt) return null;
  return { documentedAt };
}

function buildInitialNursingAssessmentInput(
  encounter: EmergencySummaryClinicalRecordAdapterEncounter,
  summaryModel: EmergencyVisitSummaryModel
): BuildEncounterClinicalRecordInput["nursingAssessmentInitial"] {
  const sig = readInitialNursingEvalSignature(encounter.nursingAssessment);
  const lines = summaryModel.initialNursingAssessment?.lines ?? [];
  if (!sig && lines.length === 0) return null;
  return {
    id: "initial-nursing-assessment",
    documentedAt: sig?.documentedAtIso ?? null,
    savedAt: sig?.documentedAtIso ?? encounter.createdAt ?? new Date(0).toISOString(),
    performerDisplayName: sig?.documentedBy ?? null,
    performerRoleTitle: sig?.roleTitle ?? null,
    structuredLines: lines,
    narrativeSummary: summaryModel.resumeInfirmier?.lines.join("\n") || null,
  };
}

function countOrderItems(orders: unknown[]): number {
  let count = 0;
  for (const raw of orders) {
    const order = asRecord(raw);
    if (!order || !Array.isArray(order.items)) continue;
    count += order.items.length;
  }
  return count;
}

function countResultsPreview(snapshot: EncounterResultsLabRadSnapshot | null | undefined): {
  lab: number;
  imaging: number;
} {
  if (!snapshot?.rows) return { lab: 0, imaging: 0 };
  let lab = 0;
  let imaging = 0;
  for (const row of snapshot.rows) {
    const order = asRecord(row.order);
    const item = asRecord(row.item);
    const orderType = asTrimmed(order?.type)?.toUpperCase();
    const result = asRecord(item?.result);
    const hasResult = Boolean(asTrimmed(result?.resultText) && asTrimmed(result?.verifiedAt));
    if (!hasResult) continue;
    if (orderType === "IMAGING") imaging += 1;
    else lab += 1;
  }
  return { lab, imaging };
}

export function buildEncounterClinicalRecordInputFromEmergencySummary(
  input: EmergencySummaryClinicalRecordAdapterInput
): BuildEncounterClinicalRecordInput {
  const locale = toClinicalRecordLocale(input.locale);
  const encounter = input.encounter;
  const model = input.summaryModel;
  const workspaceSaved = readProviderWorkspaceSavedMeta(encounter.nursingAssessment, input.locale);
  const providerDoc = model.providerDocumentation;

  const auditSourceRows = [
    ...mapDocumentationEventsToAuditRows(input.documentationEvents ?? []),
    ...mapNursingReassessmentEventsToAuditRows(input.nursingReassessmentEvents ?? []),
    ...mapUnifiedTimelineToAuditRows(input.unifiedTimelineItems ?? []),
  ];

  return {
    locale,
    encounter: {
      id: encounter.id,
      facilityId: encounter.facilityId,
      patientId: encounter.patientId ?? asTrimmed(encounter.patient?.id),
      type: encounter.type,
      status: encounter.status,
      createdAt: encounter.createdAt,
      closedAt: encounter.closedAt,
      nursingAssessment: encounter.nursingAssessment,
      dischargeSummaryJson: encounter.dischargeSummaryJson,
      admissionSummaryJson: encounter.admissionSummaryJson,
      providerDocumentationStatus: encounter.providerDocumentationStatus,
      providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
      providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr,
      triageCompleteAt: asTrimmed(input.triageSnapshot?.triageCompleteAt),
      diagnoses: encounter.diagnoses,
    },
    patient: {
      displayName: formatPatientDisplayName(encounter.patient),
      mrn: asTrimmed(encounter.patient?.mrn),
      dateOfBirth: asTrimmed(encounter.patient?.dateOfBirth),
      sex: asTrimmed(encounter.patient?.sex),
    },
    attendingProviderDisplayName: formatAttendingProvider(encounter.physicianAssigned),
    roomLabel: asTrimmed(encounter.roomLabel),
    chiefComplaintLines: model.motifPresentation?.lines ?? [],
    presentationLines: model.triageResume?.lines ?? [],
    triageDocumentation: buildTriageDocumentationInput(model, input.triageSnapshot),
    vitals: buildVitalsFromTriage(input.triageSnapshot),
    providerAssessment: providerDoc
      ? {
          documentationStatus: encounter.providerDocumentationStatus,
          signedAt: encounter.providerDocumentationSignedAt,
          signedByDisplayName: encounter.providerDocumentationSignedByDisplayFr,
          savedAt: workspaceSaved.savedAt,
          savedByDisplayName: workspaceSaved.savedByDisplayName,
          performerRoleTitle: null,
          sections: providerDoc.sections,
          narrativeSummary: null,
        }
      : null,
    providerAssessmentSaveHistory: model.providerMseHistory.map(mapProviderHistoryEntry),
    nursingAssessmentInitial: buildInitialNursingAssessmentInput(encounter, model),
    nursingReassessmentHistory: model.nursingReassessmentHistory.map(mapNursingHistoryEntry),
    orders: mapOrders(input.orders ?? []),
    medicationAdministrations: mapMedicationAdministrations(input.medicationAdministrations ?? []),
    procedures: mapProcedures(input.procedures ?? [], locale),
    disposition: buildDispositionInput(model, encounter),
    signatures: [],
    auditSourceRows,
  };
}

export function summarizeEmergencySummaryAdapterSources(input: {
  orders?: unknown[];
  medicationAdministrations?: unknown[];
  procedures?: unknown[];
  documentationEvents?: ClinicalDocumentationEventApiEntry[];
  resultsSnapshot?: EncounterResultsLabRadSnapshot | null;
}): {
  orderItemCount: number;
  marCount: number;
  procedureCount: number;
  documentationEventCount: number;
  labResultPreviewCount: number;
  imagingResultPreviewCount: number;
} {
  const preview = countResultsPreview(input.resultsSnapshot);
  return {
    orderItemCount: countOrderItems(input.orders ?? []),
    marCount: (input.medicationAdministrations ?? []).length,
    procedureCount: (input.procedures ?? []).length,
    documentationEventCount: (input.documentationEvents ?? []).length,
    labResultPreviewCount: preview.lab,
    imagingResultPreviewCount: preview.imaging,
  };
}
