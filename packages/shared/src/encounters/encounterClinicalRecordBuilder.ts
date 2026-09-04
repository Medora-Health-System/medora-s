/**
 * Pure builder for Encounter Clinical Record projection.
 */

import {
  buildProviderAssessmentHistory,
  dedupeClinicalTimelineEntries,
  dedupeEncounterClinicalRecordDiagnoses,
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
import { pickProductUiCopy } from "../i18n/productUiLocale.js";
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
  EncounterClinicalRecordNarrativeNote,
  EncounterClinicalRecordOrderRow,
  EncounterClinicalRecordProcedure,
  EncounterClinicalRecordTriageDocumentation,
  EncounterClinicalRecordTextBlock,
  EncounterClinicalRecordVitalPoint,
} from "./encounterClinicalRecordTypes.js";
import { buildClinicalRecordAttribution } from "./clinicalRecordAttribution.js";
import {
  dedupeClinicalRecordVitalRows,
  projectClinicalRecordVitalRow,
} from "./clinicalRecordVitalsProjection.js";
import {
  formatClinicalRecordMarDisplayLine,
  resolveClinicalRecordMarDose,
  resolveClinicalRecordMedicationName,
} from "./clinicalRecordMarResolution.js";

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

function buildNarrativeNotes(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordNarrativeNote[] {
  const encounterId = input.encounter.id;
  const byId = new Map<string, EncounterClinicalRecordNarrativeNote>();
  for (const note of input.encounterNotes ?? []) {
    const id = asTrimmed(note.id);
    const body = asTrimmed(note.body);
    const createdAt = asTrimmed(note.createdAt);
    const sourceEncounterId = asTrimmed(note.encounterId);
    if (!id || !body || !createdAt || (sourceEncounterId && sourceEncounterId !== encounterId)) continue;
    const noteType = String(note.noteType ?? "OTHER").toUpperCase();
    const safeType = (["PROVIDER", "NURSING", "TECHNICIAN", "OTHER"] as const).find((v) => v === noteType) ?? "OTHER";
    byId.set(id, {
      id,
      encounterId,
      noteType: safeType,
      body,
      authorUserId: asTrimmed(note.authorUserId),
      authorDisplayName: asTrimmed(note.authorDisplayName) ?? "—",
      authorRoleTitle: asTrimmed(note.authorRoleTitle) ?? "—",
      createdAt,
      status: note.voidedAt ? "VOIDED" : note.isAmendment ? "AMENDMENT" : note.cosignedAt ? "COSIGNED" : "SAVED",
      legacy: Boolean(note.legacy),
      amendedFromNoteId: asTrimmed(note.amendedFromNoteId),
      amendmentReason: asTrimmed(note.amendmentReason),
      voidedAt: asTrimmed(note.voidedAt),
      voidReasonCode: asTrimmed(note.voidReasonCode),
      cosignedAt: asTrimmed(note.cosignedAt),
    });
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
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
        orderedByRoleTitle: asTrimmed(order.orderedByRoleTitle),
      });
    }
  }
  return dedupeOrderRows(candidates);
}

function buildTriageDocumentation(
  input: BuildEncounterClinicalRecordInput
): EncounterClinicalRecordTriageDocumentation | null {
  const triage = input.triageDocumentation;
  if (!triage) return null;
  const documentedBy = buildClinicalRecordAttribution({
    name: triage.documentedByDisplayName,
    initials: triage.documentedByInitials,
    role: triage.documentedByRole,
    at: triage.documentedAt ?? input.encounter.triageCompleteAt,
  });
  const fields = triage.fields ?? {};
  const hasFields = Object.values(fields).some((v) => Boolean(v?.trim()));
  if (
    !documentedBy.name &&
    !documentedBy.role &&
    !documentedBy.at &&
    !hasFields
  ) {
    return null;
  }
  return { documentedBy, fields };
}

function buildLaboratoryResults(
  input: BuildEncounterClinicalRecordInput,
  locale: EncounterClinicalRecordLocale
): EncounterClinicalRecordLaboratoryResult[] {
  const candidates: EncounterClinicalRecordLaboratoryResult[] = [];
  for (const order of input.orders ?? []) {
    const orderId = asTrimmed(order.id);
    if (!orderId || normalizeOrderType(order.type) !== "LAB") continue;
    const orderedBy = buildClinicalRecordAttribution({
      name: order.orderedByDisplayName,
      role: order.orderedByRoleTitle,
      at: order.createdAt,
    });
    for (const item of order.items ?? []) {
      const orderItemId = asTrimmed(item.id);
      const result = item.result;
      const resultText = asTrimmed(result?.resultText);
      const verifiedAt = asTrimmed(result?.verifiedAt);
      if (!orderItemId || !resultText || !verifiedAt) continue;
      const reviewedAt = asTrimmed(result?.acknowledgedByProviderAt) ?? asTrimmed(result?.acknowledgedAt);
      const reviewedByName = asTrimmed(result?.acknowledgedByDisplayName);
      candidates.push({
        orderId,
        orderItemId,
        label: orderItemLabel(item),
        resultText,
        verifiedAt,
        criticalValue: Boolean(result?.criticalValue),
        acknowledgedAt: reviewedAt,
        orderedBy,
        resultedBy: buildClinicalRecordAttribution({
          name: result?.enteredByDisplayName,
          at: verifiedAt,
        }),
        reviewedBy: reviewedByName
          ? buildClinicalRecordAttribution({
              name: reviewedByName,
              at: reviewedAt,
            })
          : null,
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
    const orderedBy = buildClinicalRecordAttribution({
      name: order.orderedByDisplayName,
      role: order.orderedByRoleTitle,
      at: order.createdAt,
    });
    for (const item of order.items ?? []) {
      const orderItemId = asTrimmed(item.id);
      const result = item.result;
      const resultText = asTrimmed(result?.resultText);
      const verifiedAt = asTrimmed(result?.verifiedAt);
      if (!orderItemId || !resultText || !verifiedAt) continue;
      const reviewedAt = asTrimmed(result?.acknowledgedByProviderAt) ?? asTrimmed(result?.acknowledgedAt);
      const reviewedByName = asTrimmed(result?.acknowledgedByDisplayName);
      candidates.push({
        orderId,
        orderItemId,
        label: orderItemLabel(item),
        resultText,
        verifiedAt,
        criticalValue: Boolean(result?.criticalValue),
        acknowledgedAt: reviewedAt,
        orderedBy,
        resultedBy: buildClinicalRecordAttribution({
          name: result?.enteredByDisplayName,
          at: verifiedAt,
        }),
        reviewedBy: reviewedByName
          ? buildClinicalRecordAttribution({
              name: reviewedByName,
              at: reviewedAt,
            })
          : null,
      });
    }
  }
  return dedupeImagingResults(candidates);
}

function normalizeOrderType(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function buildOrderItemLabelIndex(
  input: BuildEncounterClinicalRecordInput
): Map<string, string> {
  const index = new Map<string, string>();
  for (const order of input.orders ?? []) {
    for (const item of order.items ?? []) {
      const id = asTrimmed(item.id);
      if (!id) continue;
      const label =
        asTrimmed(item.displayLabel) ??
        asTrimmed(item.manualLabel) ??
        asTrimmed(item.catalogItemType);
      if (label) index.set(id, label);
    }
  }
  return index;
}

function buildMedicationAdministrations(
  input: BuildEncounterClinicalRecordInput
): EncounterClinicalRecordMedicationAdministration[] {
  const orderItemLabels = buildOrderItemLabelIndex(input);
  const candidates: EncounterClinicalRecordMedicationAdministration[] = [];
  for (const admin of input.medicationAdministrations ?? []) {
    const id = asTrimmed(admin.id);
    if (!id) continue;
    const orderItemId = asTrimmed(admin.orderItemId);
    const medicationName = resolveClinicalRecordMedicationName({
      medicationLabelSnapshot: admin.medicationLabelSnapshot,
      medicationName: admin.medicationName,
      medicationDisplayName: admin.medicationDisplayName,
      displayLabel: admin.displayLabel,
      manualLabel: admin.manualLabel,
      orderItemLabel: orderItemId ? orderItemLabels.get(orderItemId) ?? null : null,
    });
    const dose = resolveClinicalRecordMarDose({
      dose: admin.dose,
      doseValue: admin.doseValue,
      doseUnit: admin.doseUnit,
      administeredQuantity: admin.administeredQuantity,
    });
    const route = asTrimmed(admin.route);
    const administeredByName =
      asTrimmed(admin.administeredByDisplayName) ?? asTrimmed(admin.administeredByDisplayFr);
    const documentedByName = asTrimmed(admin.documentedByDisplayName);
    const administeredAt = asTrimmed(admin.administeredAt);
    candidates.push({
      id,
      medicationName,
      dose,
      route,
      action: asTrimmed(admin.marAction) ?? asTrimmed(admin.action) ?? "ADMINISTERED",
      administeredAt,
      administeredByDisplayName: administeredByName,
      documentedByDisplayName: documentedByName,
      orderItemId,
      displayLine: formatClinicalRecordMarDisplayLine({ medicationName, dose, route }),
      administeredBy: buildClinicalRecordAttribution({
        name: administeredByName,
        at: administeredAt,
      }),
      documentedBy: documentedByName
        ? buildClinicalRecordAttribution({
            name: documentedByName,
            at: administeredAt,
          })
        : null,
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
      performedByDisplayName: asTrimmed(proc.performedByDisplayName),
      documentationRole: asTrimmed(proc.documentationRole),
      status: asTrimmed(proc.status) ?? "COMPLETED",
      documentedBy: buildClinicalRecordAttribution({
        name: proc.documentedByDisplayName,
        role: proc.documentationRole,
        at: proc.documentedAt ?? proc.createdAt,
      }),
      performedBy: asTrimmed(proc.performedByDisplayName)
        ? buildClinicalRecordAttribution({
            name: proc.performedByDisplayName,
            role: proc.performerTitle ?? proc.documentationRole,
            at: proc.performedAt ?? proc.documentedAt ?? proc.createdAt,
          })
        : null,
    });
  }
  return dedupeProcedures(candidates);
}

function buildVitals(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordVitalPoint[] {
  const projected = (input.vitals ?? [])
    .map((vital, index) => projectClinicalRecordVitalRow(vital, index))
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map((row) => ({
      id: row.id,
      recordedAt: row.recordedAt,
      source: row.source,
      summary: row.summary,
      bloodPressure: row.bloodPressure,
      heartRate: row.heartRate,
      respiratoryRate: row.respiratoryRate,
      spo2: row.spo2,
      temperatureCelsius: row.temperatureCelsius,
      weight: row.weight,
      height: row.height,
      pain: row.pain,
      documentedBy: row.documentedBy,
    }));
  return dedupeClinicalRecordVitalRows(projected);
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

function defaultMilestoneSummary(
  milestone: EncounterClinicalRecordClinicalTimelineEntry["milestone"],
  locale: EncounterClinicalRecordLocale
): string {
  const labels: Record<
    EncounterClinicalRecordClinicalTimelineEntry["milestone"],
    { en: string; fr: string; es: string }
  > = {
    ARRIVAL: { en: "Arrival", fr: "Arrivée", es: "Llegada" },
    TRIAGE_COMPLETE: { en: "Triage complete", fr: "Triage terminé", es: "Triage completado" },
    PROVIDER_ASSESSMENT_SIGNED: { en: "Provider assessment signed", fr: "Évaluation médicale signée", es: "Evaluación médica firmada" },
    LABORATORY_COLLECTED: { en: "Laboratory collected", fr: "Prélèvement laboratoire", es: "Muestra de laboratorio obtenida" },
    LABORATORY_RESULTED: { en: "Laboratory resulted", fr: "Résultat laboratoire", es: "Resultado de laboratorio" },
    IMAGING_RESULTED: { en: "Imaging resulted", fr: "Résultat imagerie", es: "Resultado de imagen" },
    MEDICATION_ADMINISTERED: { en: "Medication administered", fr: "Médicament administré", es: "Medicamento administrado" },
    PROCEDURE_COMPLETED: { en: "Procedure completed", fr: "Procédure réalisée", es: "Procedimiento realizado" },
    DISPOSITION: { en: "Disposition documented", fr: "Disposition documentée", es: "Disposición documentada" },
    DISCHARGED: { en: "Encounter closed", fr: "Consultation clôturée", es: "Encuentro cerrado" },
  };
  return pickProductUiCopy(locale, labels[milestone], labels[milestone].es);
}

function buildClinicalTimeline(input: BuildEncounterClinicalRecordInput): EncounterClinicalRecordClinicalTimelineEntry[] {
  const enc = input.encounter;
  const locale = input.locale ?? "fr";
  const candidates: EncounterClinicalRecordClinicalTimelineEntry[] = [];

  if (enc.createdAt) {
    pushClinicalMilestone(candidates, {
      id: "arrival",
      milestone: "ARRIVAL",
      timestampIso: enc.createdAt,
      actorDisplayName: null,
      actorRoleTitle: null,
      summary: defaultMilestoneSummary("ARRIVAL", locale),
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
      summary: defaultMilestoneSummary("TRIAGE_COMPLETE", locale),
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
      summary: defaultMilestoneSummary("PROVIDER_ASSESSMENT_SIGNED", locale),
      sourceType: "PROVIDER_DOCUMENTATION",
      sourceId: "provider-signed",
    });
  }

  for (const lab of buildLaboratoryResults(input, locale)) {
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
      summary: defaultMilestoneSummary("DISPOSITION", locale),
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
      summary: defaultMilestoneSummary("DISCHARGED", locale),
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

function formatDiagnosisDisplayLabel(dx: {
  code?: string | null;
  displayLabel?: string | null;
  label?: string | null;
  description?: string | null;
}): string | null {
  const displayLabel = asTrimmed(dx.displayLabel) ?? asTrimmed(dx.label);
  if (displayLabel) return displayLabel;
  const code = asTrimmed(dx.code);
  const description = asTrimmed(dx.description);
  if (code && description) return `${code} — ${description}`;
  return description ?? code;
}

function resolveDiagnosisAttributionName(dx: {
  createdByDisplay?: { name?: string | null } | null;
  createdByDisplayName?: string | null;
  documentedByDisplayName?: string | null;
  createdByName?: string | null;
  updatedByDisplay?: { name?: string | null } | null;
}): string | null {
  const createdByDisplay =
    dx.createdByDisplay && typeof dx.createdByDisplay === "object" ? dx.createdByDisplay : null;
  return (
    asTrimmed(createdByDisplay?.name) ??
    asTrimmed(dx.createdByDisplayName) ??
    asTrimmed(dx.documentedByDisplayName) ??
    asTrimmed(dx.createdByName) ??
    asTrimmed(dx.updatedByDisplay?.name)
  );
}

function resolveDiagnosisAttributionRole(dx: {
  createdByDisplay?: { role?: string | null } | null;
  createdByRole?: string | null;
  documentedByRole?: string | null;
  updatedByDisplay?: { role?: string | null } | null;
}): string | null {
  const createdByDisplay =
    dx.createdByDisplay && typeof dx.createdByDisplay === "object" ? dx.createdByDisplay : null;
  return (
    asTrimmed(createdByDisplay?.role) ??
    asTrimmed(dx.createdByRole) ??
    asTrimmed(dx.documentedByRole) ??
    asTrimmed(dx.updatedByDisplay?.role)
  );
}

function buildDiagnoses(input: BuildEncounterClinicalRecordInput) {
  const built = (input.encounter.diagnoses ?? [])
    .map((dx, index) => {
      const id = asTrimmed(dx.id) ?? `dx-${index}`;
      const displayLabel = formatDiagnosisDisplayLabel(dx);
      if (!displayLabel) return null;
      const documentedAt = asTrimmed(dx.documentedAt) ?? asTrimmed(dx.createdAt);
      const documentedByDisplayName = resolveDiagnosisAttributionName(dx);
      const documentedByRole = resolveDiagnosisAttributionRole(dx);
      return {
        id,
        code: asTrimmed(dx.code),
        displayLabel,
        diagnosisType: asTrimmed(dx.diagnosisType),
        status: asTrimmed(dx.status),
        isPrimary: Boolean(dx.isPrimary),
        documentedAt,
        documentedByDisplayName,
        documentedBy: buildClinicalRecordAttribution({
          name: documentedByDisplayName,
          role: documentedByRole,
          at: documentedAt,
        }),
      };
    })
    .filter((dx): dx is NonNullable<typeof dx> => dx !== null);
  return dedupeEncounterClinicalRecordDiagnoses(built);
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
    triageDocumentation: buildTriageDocumentation(input),
    vitals: buildVitals(input),
    providerAssessment,
    providerAssessmentHistory,
    nursingAssessment: nursing.primary,
    nursingAssessmentHistory: nursing.history,
    narrativeNotes: buildNarrativeNotes(input),
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
          documentedByDisplayName: asTrimmed(input.disposition.documentedByDisplayName),
          signedByDisplayName: asTrimmed(input.disposition.signedByDisplayName),
          documentedBy: buildClinicalRecordAttribution({
            name: input.disposition.documentedByDisplayName,
            at: input.disposition.dispositionAt,
          }),
          signedBy: asTrimmed(input.disposition.signedByDisplayName)
            ? buildClinicalRecordAttribution({
                name: input.disposition.signedByDisplayName,
                at: input.disposition.signedAt ?? input.disposition.dispositionAt,
              })
            : null,
        }
      : null,
    signatures: (input.signatures ?? []).map((sig) => ({
      domain: sig.domain,
      signerDisplayName: sig.signerDisplayName,
      signerRoleTitle: asTrimmed(sig.signerRoleTitle),
      signedAt: sig.signedAt,
      initials: asTrimmed(sig.initials),
      meaning: asTrimmed(sig.meaning),
      signedBy: buildClinicalRecordAttribution({
        name: sig.signerDisplayName,
        initials: sig.initials,
        role: sig.signerRoleTitle,
        at: sig.signedAt,
      }),
    })),
    clinicalTimeline: buildClinicalTimeline(input),
    auditTimeline: buildAuditTimeline(input, locale),
  };
}
