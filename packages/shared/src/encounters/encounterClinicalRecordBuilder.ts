/**
 * Pure builder for Encounter Clinical Record projection.
 */

import {
  buildProviderAssessmentHistory,
  dedupeClinicalTimelineEntries,
  dedupeImagingResults,
  dedupeLaboratoryResults,
  dedupeMedicationAdministrations,
  dedupeOrderRows,
  dedupeProcedures,
  isClinicalMilestoneEventType,
  isProviderSaveEventType,
  isWorkflowOrderEventType,
  resolveClinicalMilestoneFromEventType,
  resolveNursingAssessmentPrimary,
  resolveProviderAssessmentPrimary,
} from "./encounterClinicalRecordDedupe.js";
import type {
  BuildEncounterClinicalRecordInput,
  EncounterClinicalRecord,
  EncounterClinicalRecordAuditClassification,
  EncounterClinicalRecordAuditTimelineEntry,
  EncounterClinicalRecordClinicalTimelineEntry,
  EncounterClinicalRecordHeader,
  EncounterClinicalRecordImagingResult,
  EncounterClinicalRecordLaboratoryResult,
  EncounterClinicalRecordLocale,
  EncounterClinicalRecordMedicationAdministration,
  EncounterClinicalRecordOrderRow,
  EncounterClinicalRecordProcedure,
  EncounterClinicalRecordTextBlock,
  EncounterClinicalRecordVitalPoint,
} from "./encounterClinicalRecordTypes.js";

function asTrimmed(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t || null;
}

function textBlock(title: string | null, lines: string[]): EncounterClinicalRecordTextBlock | null {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return null;
  return { title, lines: filtered };
}

function orderItemLabel(item: {
  displayLabel?: string | null;
  manualLabel?: string | null;
  catalogItemType?: string | null;
}): string {
  return (
    asTrimmed(item.displayLabel) ??
    asTrimmed(item.manualLabel) ??
    asTrimmed(item.catalogItemType) ??
    "—"
  );
}

function classifyAuditEvent(
  sourceKind: string,
  eventType: string
): EncounterClinicalRecordAuditClassification {
  const kind = sourceKind.trim().toUpperCase();
  const type = eventType.trim().toUpperCase();

  if (kind === "MEDICATION_ADMINISTRATION") return "MAR";
  if (isProviderSaveEventType(type)) return "CLINICAL_DOCUMENTATION";
  if (kind === "ORDER_EVENT" && isWorkflowOrderEventType(type)) return "ORDER_WORKFLOW";
  if (kind === "ORDER_EVENT" && type.includes("RESULT")) return "RESULT_WORKFLOW";
  if (kind === "ORDER_ITEM_RESULT") return "RESULT_WORKFLOW";
  if (isClinicalMilestoneEventType(type)) return "CLINICAL_MILESTONE";
  if (type === "PROCEDURE_DOCUMENTED" || kind === "PROCEDURE") return "PROCEDURE";
  if (type.includes("DISCHARGE") || type.includes("DISPOSITION")) return "DISPOSITION";
  if (type.includes("METADATA") || type.includes("DRAFT")) return "METADATA";
  if (type.includes("SYSTEM") || type.includes("AUDIT")) return "SYSTEM";
  return "OTHER";
}

function buildHeader(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordHeader {
  const enc = input.encounter;
  const patient = input.patient ?? null;
  return {
    encounterId: enc.id,
    facilityId: asTrimmed(enc.facilityId),
    patientId: asTrimmed(enc.patientId),
    encounterType: asTrimmed(enc.type),
    encounterStatus: asTrimmed(enc.status),
    arrivedAt: asTrimmed(enc.createdAt),
    closedAt: asTrimmed(enc.closedAt),
    patientDisplayName: asTrimmed(patient?.displayName),
    patientMrn: asTrimmed(patient?.mrn),
    patientDateOfBirth: asTrimmed(patient?.dateOfBirth),
    patientSex: asTrimmed(patient?.sex),
    attendingProviderDisplayName: asTrimmed(input.attendingProviderDisplayName),
    roomLabel: asTrimmed(input.roomLabel),
  };
}

function buildOrders(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordOrderRow[] {
  const candidates: EncounterClinicalRecordOrderRow[] = [];
  for (const order of input.orders ?? []) {
    const orderId = asTrimmed(order.id);
    if (!orderId) continue;
    const orderType = asTrimmed(order.type) ?? "UNKNOWN";
    for (const item of order.items ?? []) {
      const orderItemId = asTrimmed(item.id);
      if (!orderItemId) continue;
      candidates.push({
        orderId,
        orderItemId,
        orderType,
        priority: asTrimmed(order.priority),
        status: asTrimmed(item.status) ?? asTrimmed(order.status) ?? "ACTIVE",
        label: orderItemLabel(item),
        orderedAt: asTrimmed(order.createdAt),
        orderedByDisplayName: asTrimmed(order.orderedByDisplayName),
      });
    }
  }
  return dedupeOrderRows(candidates);
}

function buildLaboratoryResults(
  input: BuildEncounterClinicalRecordInput,
  locale: EncounterClinicalRecordLocale
): EncounterClinicalRecordLaboratoryResult[] {
  const candidates: EncounterClinicalRecordLaboratoryResult[] = [];
  for (const order of input.orders ?? []) {
    const orderId = asTrimmed(order.id);
    if (!orderId || normalizeOrderType(order.type) !== "LAB") continue;
    for (const item of order.items ?? []) {
      const orderItemId = asTrimmed(item.id);
      const result = item.result;
      const resultText = asTrimmed(result?.resultText);
      const verifiedAt = asTrimmed(result?.verifiedAt);
      if (!orderItemId || !resultText || !verifiedAt) continue;
      candidates.push({
        orderId,
        orderItemId,
        label: orderItemLabel(item),
        resultText,
        verifiedAt,
        criticalValue: Boolean(result?.criticalValue),
        acknowledgedAt: asTrimmed(result?.acknowledgedAt),
      });
    }
  }
  void locale;
  return dedupeLaboratoryResults(candidates);
}

function buildImagingResults(
  input: BuildEncounterClinicalRecordInput
): EncounterClinicalRecordImagingResult[] {
  const candidates: EncounterClinicalRecordImagingResult[] = [];
  for (const order of input.orders ?? []) {
    const orderId = asTrimmed(order.id);
    if (!orderId || normalizeOrderType(order.type) !== "IMAGING") continue;
    for (const item of order.items ?? []) {
      const orderItemId = asTrimmed(item.id);
      const result = item.result;
      const resultText = asTrimmed(result?.resultText);
      const verifiedAt = asTrimmed(result?.verifiedAt);
      if (!orderItemId || !resultText || !verifiedAt) continue;
      candidates.push({
        orderId,
        orderItemId,
        label: orderItemLabel(item),
        resultText,
        verifiedAt,
        criticalValue: Boolean(result?.criticalValue),
        acknowledgedAt: asTrimmed(result?.acknowledgedAt),
      });
    }
  }
  return dedupeImagingResults(candidates);
}

function normalizeOrderType(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function buildMedicationAdministrations(
  input: BuildEncounterClinicalRecordInput
): EncounterClinicalRecordMedicationAdministration[] {
  const candidates: EncounterClinicalRecordMedicationAdministration[] = [];
  for (const admin of input.medicationAdministrations ?? []) {
    const id = asTrimmed(admin.id);
    if (!id) continue;
    candidates.push({
      id,
      medicationName: asTrimmed(admin.medicationName) ?? "—",
      dose: asTrimmed(admin.dose),
      route: asTrimmed(admin.route),
      action: asTrimmed(admin.marAction) ?? asTrimmed(admin.action) ?? "ADMINISTERED",
      administeredAt: asTrimmed(admin.administeredAt),
      administeredByDisplayName: asTrimmed(admin.administeredByDisplayName),
      orderItemId: asTrimmed(admin.orderItemId),
    });
  }
  return dedupeMedicationAdministrations(candidates);
}

function buildProcedures(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordProcedure[] {
  const candidates: EncounterClinicalRecordProcedure[] = [];
  for (const proc of input.procedures ?? []) {
    const id = asTrimmed(proc.id);
    const clinicalSummary = asTrimmed(proc.clinicalSummary) ?? asTrimmed(proc.label);
    if (!id || !clinicalSummary) continue;
    candidates.push({
      id,
      label: asTrimmed(proc.label) ?? clinicalSummary,
      clinicalSummary,
      documentedAt: asTrimmed(proc.documentedAt) ?? asTrimmed(proc.createdAt),
      documentedByDisplayName: asTrimmed(proc.documentedByDisplayName),
      documentationRole: asTrimmed(proc.documentationRole),
    });
  }
  return dedupeProcedures(candidates);
}

function buildVitals(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordVitalPoint[] {
  const out: EncounterClinicalRecordVitalPoint[] = [];
  for (const [index, vital] of (input.vitals ?? []).entries()) {
    const summary = asTrimmed(vital.summary);
    const recordedAt = asTrimmed(vital.recordedAt);
    if (!summary || !recordedAt) continue;
    out.push({
      id: asTrimmed(vital.id) ?? `vital-${index}`,
      recordedAt,
      source: asTrimmed(vital.source),
      summary,
    });
  }
  out.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  return out;
}

function auditSummary(
  row: NonNullable<BuildEncounterClinicalRecordInput["auditSourceRows"]>[number],
  locale: EncounterClinicalRecordLocale
): string {
  const fr = asTrimmed(row.summaryFr);
  const en = asTrimmed(row.summaryEn);
  if (locale === "en" && en) return en;
  if (fr) return fr;
  if (en) return en;
  return row.storedEventType;
}

function buildAuditTimeline(
  input: BuildEncounterClinicalRecordInput,
  locale: EncounterClinicalRecordLocale
): EncounterClinicalRecordAuditTimelineEntry[] {
  const out: EncounterClinicalRecordAuditTimelineEntry[] = [];
  for (const row of input.auditSourceRows ?? []) {
    const sourceId = asTrimmed(row.sourceId);
    const documentedAtIso = asTrimmed(row.documentedAtIso);
    if (!sourceId || !documentedAtIso) continue;
    out.push({
      id: `${row.sourceKind}:${sourceId}`,
      sourceKind: row.sourceKind,
      sourceId,
      eventType: row.storedEventType,
      documentedAtIso,
      classification: classifyAuditEvent(row.sourceKind, row.storedEventType),
      actorDisplayName: asTrimmed(row.actorDisplayName),
      actorRoleTitle: asTrimmed(row.actorRole),
      summary: auditSummary(row, locale),
      orderId: asTrimmed(row.orderId),
      orderItemId: asTrimmed(row.orderItemId),
    });
  }
  out.sort((a, b) => Date.parse(a.documentedAtIso) - Date.parse(b.documentedAtIso));
  return out;
}

function pushClinicalMilestone(
  out: EncounterClinicalRecordClinicalTimelineEntry[],
  entry: EncounterClinicalRecordClinicalTimelineEntry
): void {
  if (!entry.summary.trim()) return;
  out.push(entry);
}

function buildClinicalTimeline(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordClinicalTimelineEntry[] {
  const enc = input.encounter;
  const candidates: EncounterClinicalRecordClinicalTimelineEntry[] = [];

  if (enc.createdAt) {
    pushClinicalMilestone(candidates, {
      id: "arrival",
      milestone: "ARRIVAL",
      timestampIso: enc.createdAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: "Arrival",
      sourceType: "ENCOUNTER",
      sourceId: enc.id,
    });
  }

  const triageCompleteAt = asTrimmed(enc.triageCompleteAt);
  if (triageCompleteAt) {
    pushClinicalMilestone(candidates, {
      id: "triage-complete",
      milestone: "TRIAGE_COMPLETE",
      timestampIso: triageCompleteAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: "Triage complete",
      sourceType: "TRIAGE",
      sourceId: "triage-complete",
    });
  }

  const provider = resolveProviderAssessmentPrimary(input.providerAssessment ?? {});
  if (provider?.status === "SIGNED" && provider.signedAt) {
    pushClinicalMilestone(candidates, {
      id: "provider-signed",
      milestone: "PROVIDER_ASSESSMENT_SIGNED",
      timestampIso: provider.signedAt,
      actorDisplayName: provider.signedByDisplayName,
      actorRoleTitle: provider.performerRoleTitle,
      summary: "Provider assessment signed",
      sourceType: "PROVIDER_DOCUMENTATION",
      sourceId: "provider-signed",
    });
  }

  for (const lab of buildLaboratoryResults(input, "en")) {
    pushClinicalMilestone(candidates, {
      id: `lab-result:${lab.orderItemId}`,
      milestone: "LABORATORY_RESULTED",
      timestampIso: lab.verifiedAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: `${lab.label}: ${lab.resultText}`,
      sourceType: "ORDER_ITEM_RESULT",
      sourceId: lab.orderItemId,
    });
  }

  for (const img of buildImagingResults(input)) {
    pushClinicalMilestone(candidates, {
      id: `imaging-result:${img.orderItemId}`,
      milestone: "IMAGING_RESULTED",
      timestampIso: img.verifiedAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: `${img.label}: ${img.resultText}`,
      sourceType: "ORDER_ITEM_RESULT",
      sourceId: img.orderItemId,
    });
  }

  for (const mar of buildMedicationAdministrations(input)) {
    pushClinicalMilestone(candidates, {
      id: `mar:${mar.id}`,
      milestone: "MEDICATION_ADMINISTERED",
      timestampIso: mar.administeredAt,
      actorDisplayName: mar.administeredByDisplayName,
      actorRoleTitle: null,
      summary: `${mar.medicationName} — ${mar.action}`,
      sourceType: "MAR",
      sourceId: mar.id,
    });
  }

  for (const proc of buildProcedures(input)) {
    pushClinicalMilestone(candidates, {
      id: `procedure:${proc.id}`,
      milestone: "PROCEDURE_COMPLETED",
      timestampIso: proc.documentedAt,
      actorDisplayName: proc.documentedByDisplayName,
      actorRoleTitle: proc.documentationRole,
      summary: proc.clinicalSummary,
      sourceType: "PROCEDURE",
      sourceId: proc.id,
    });
  }

  if (input.disposition?.dispositionAt) {
    pushClinicalMilestone(candidates, {
      id: "disposition",
      milestone: "DISPOSITION",
      timestampIso: input.disposition.dispositionAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: "Disposition recorded",
      sourceType: "DISPOSITION",
      sourceId: "disposition",
    });
  }

  if (enc.closedAt) {
    pushClinicalMilestone(candidates, {
      id: "discharged",
      milestone: "DISCHARGED",
      timestampIso: enc.closedAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: "Encounter closed",
      sourceType: "ENCOUNTER",
      sourceId: `${enc.id}:closed`,
    });
  }

  for (const row of input.auditSourceRows ?? []) {
    const milestone = resolveClinicalMilestoneFromEventType(row.storedEventType, row.orderType);
    if (!milestone) continue;
    if (!isClinicalMilestoneEventType(row.storedEventType)) continue;
    const sourceId =
      asTrimmed(row.orderItemId) ?? asTrimmed(row.sourceId);
    if (!sourceId) continue;
    const sourceType =
      milestone === "LABORATORY_RESULTED" || milestone === "IMAGING_RESULTED"
        ? "ORDER_ITEM_RESULT"
        : row.sourceKind;
    pushClinicalMilestone(candidates, {
      id: `${sourceType}:${sourceId}`,
      milestone,
      timestampIso: asTrimmed(row.documentedAtIso),
      actorDisplayName: asTrimmed(row.actorDisplayName),
      actorRoleTitle: asTrimmed(row.actorRole),
      summary: auditSummary(row, "en"),
      sourceType,
      sourceId,
    });
  }

  return dedupeClinicalTimelineEntries(candidates);
}

function buildDiagnoses(input: BuildEncounterClinicalRecordInput) {
  return (input.encounter.diagnoses ?? [])
    .map((dx, index) => {
      const id = asTrimmed(dx.id) ?? `dx-${index}`;
      const displayLabel = asTrimmed(dx.displayLabel) ?? asTrimmed(dx.label);
      if (!displayLabel) return null;
      return {
        id,
        code: asTrimmed(dx.code),
        displayLabel,
        diagnosisType: asTrimmed(dx.diagnosisType),
        isPrimary: Boolean(dx.isPrimary),
        documentedAt: asTrimmed(dx.documentedAt) ?? asTrimmed(dx.createdAt),
      };
    })
    .filter((dx): dx is NonNullable<typeof dx> => dx !== null);
}

/**
 * Build a pure Encounter Clinical Record projection from encounter-local inputs.
 * No React, API calls, storage, or side effects.
 */
export function buildEncounterClinicalRecord(
  input: BuildEncounterClinicalRecordInput
): EncounterClinicalRecord {
  const locale = input.locale ?? "fr";
  const providerAssessment = resolveProviderAssessmentPrimary(input.providerAssessment ?? {});
  const providerAssessmentHistory = buildProviderAssessmentHistory(
    input.providerAssessmentSaveHistory ?? [],
    providerAssessment
  );
  const nursing = resolveNursingAssessmentPrimary(
    input.nursingAssessmentInitial ?? null,
    input.nursingReassessmentHistory ?? []
  );

  return {
    header: buildHeader(input),
    chiefComplaint: textBlock(null, input.chiefComplaintLines ?? []),
    presentation: textBlock(null, input.presentationLines ?? []),
    vitals: buildVitals(input),
    providerAssessment,
    providerAssessmentHistory,
    nursingAssessment: nursing.primary,
    nursingAssessmentHistory: nursing.history,
    orders: buildOrders(input),
    laboratoryResults: buildLaboratoryResults(input, locale),
    imagingResults: buildImagingResults(input),
    medicationAdministration: buildMedicationAdministrations(input),
    procedures: buildProcedures(input),
    diagnoses: buildDiagnoses(input),
    disposition: input.disposition
      ? {
          dischargeMode: asTrimmed(input.disposition.dischargeMode),
          destination: asTrimmed(input.disposition.destination),
          summaryLines: (input.disposition.summaryLines ?? []).map((l) => l.trim()).filter(Boolean),
          dispositionAt: asTrimmed(input.disposition.dispositionAt),
        }
      : null,
    signatures: [...(input.signatures ?? [])],
    clinicalTimeline: buildClinicalTimeline(input),
    auditTimeline: buildAuditTimeline(input, locale),
  };
}
