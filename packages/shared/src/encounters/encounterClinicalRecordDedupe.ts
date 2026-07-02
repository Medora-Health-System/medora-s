/**
 * Deterministic dedupe helpers for Encounter Clinical Record projection.
 */

import type {
  EncounterClinicalRecordClinicalMilestone,
  EncounterClinicalRecordClinicalTimelineEntry,
  EncounterClinicalRecordImagingResult,
  EncounterClinicalRecordLaboratoryResult,
  EncounterClinicalRecordMedicationAdministration,
  EncounterClinicalRecordNursingAssessment,
  EncounterClinicalRecordNursingAssessmentHistoryEntry,
  EncounterClinicalRecordOrderRow,
  EncounterClinicalRecordProcedure,
  EncounterClinicalRecordProviderAssessment,
  EncounterClinicalRecordProviderAssessmentHistoryEntry,
  EncounterClinicalRecordProviderStatus,
} from "./encounterClinicalRecordTypes.js";
import { buildClinicalRecordAttribution } from "./clinicalRecordAttribution.js";

const ORDER_LIFECYCLE_RANK: Record<string, number> = {
  DRAFT: 0,
  PLACED: 10,
  PENDING: 10,
  ACTIVE: 20,
  ACKNOWLEDGED: 30,
  IN_PROGRESS: 40,
  STARTED: 40,
  COLLECTED: 50,
  RESULTED: 60,
  VERIFIED: 70,
  REVIEWED: 80,
  COMPLETED: 90,
  CANCELLED: 5,
  DISCONTINUED: 5,
};

const CLINICAL_MILESTONE_RANK: Record<EncounterClinicalRecordClinicalMilestone, number> = {
  ARRIVAL: 10,
  TRIAGE_COMPLETE: 20,
  PROVIDER_ASSESSMENT_SIGNED: 30,
  LABORATORY_COLLECTED: 40,
  LABORATORY_RESULTED: 50,
  IMAGING_RESULTED: 50,
  MEDICATION_ADMINISTERED: 60,
  PROCEDURE_COMPLETED: 70,
  DISPOSITION: 80,
  DISCHARGED: 90,
};

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function parseTime(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function orderLifecycleRank(status: string | null | undefined): number {
  const key = normalizeStatus(status);
  return ORDER_LIFECYCLE_RANK[key] ?? 15;
}

export function resolveProviderDocumentationStatus(
  documentationStatus: string | null | undefined
): EncounterClinicalRecordProviderStatus {
  const s = normalizeStatus(documentationStatus);
  if (s === "SIGNED") return "SIGNED";
  if (s === "SAVED" || s === "FINALIZED") return "SAVED";
  return "DRAFT";
}

export function resolveProviderAssessmentPrimary(input: {
  documentationStatus?: string | null;
  signedAt?: string | null;
  signedByDisplayName?: string | null;
  savedAt?: string | null;
  savedByDisplayName?: string | null;
  performerRoleTitle?: string | null;
  sections?: Array<{ label?: string; text?: string }>;
  narrativeSummary?: string | null;
}): EncounterClinicalRecordProviderAssessment | null {
  const sections = (input.sections ?? [])
    .map((s) => ({
      label: (s.label ?? "").trim(),
      text: (s.text ?? "").trim(),
    }))
    .filter((s) => s.label || s.text);
  const narrative = (input.narrativeSummary ?? "").trim();
  if (sections.length === 0 && !narrative) return null;

  const status = resolveProviderDocumentationStatus(input.documentationStatus);
  const signedAt = input.signedAt?.trim() || null;
  const savedAt = input.savedAt?.trim() || null;
  const signedByDisplayName = input.signedByDisplayName?.trim() || null;
  const savedByDisplayName = input.savedByDisplayName?.trim() || null;
  const performerDisplayName =
    status === "SIGNED"
      ? signedByDisplayName || savedByDisplayName || null
      : savedByDisplayName || null;

  return {
    status,
    documentedAt: signedAt ?? savedAt,
    performerDisplayName,
    performerRoleTitle: input.performerRoleTitle?.trim() || null,
    sections,
    narrativeSummary: narrative || null,
    signedAt,
    signedByDisplayName,
    savedAt,
    savedByDisplayName,
    documentedBy: buildClinicalRecordAttribution({
      name: performerDisplayName,
      role: input.performerRoleTitle,
      at: savedAt ?? signedAt,
    }),
    signedBy: signedAt
      ? buildClinicalRecordAttribution({
          name: signedByDisplayName,
          role: input.performerRoleTitle,
          at: signedAt,
        })
      : null,
    savedBy: savedAt
      ? buildClinicalRecordAttribution({
          name: savedByDisplayName,
          role: input.performerRoleTitle,
          at: savedAt,
        })
      : null,
  };
}

export function buildProviderAssessmentHistory(
  saveHistory: Array<{
    id: string;
    savedAt: string;
    documentedAt?: string | null;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    sections?: Array<{ label?: string; text?: string }>;
    narrativeSummary?: string | null;
    isDraft?: boolean;
  }>,
  primary: EncounterClinicalRecordProviderAssessment | null
): EncounterClinicalRecordProviderAssessmentHistoryEntry[] {
  const sorted = [...saveHistory].sort((a, b) => parseTime(b.savedAt) - parseTime(a.savedAt));
  const primaryKey = primary?.documentedAt
    ? `${primary.documentedAt}:${primary.performerDisplayName ?? ""}`
    : null;

  const out: EncounterClinicalRecordProviderAssessmentHistoryEntry[] = [];
  for (const entry of sorted) {
    const sections = (entry.sections ?? [])
      .map((s) => ({
        label: (s.label ?? "").trim(),
        text: (s.text ?? "").trim(),
      }))
      .filter((s) => s.label || s.text);
    const narrative = (entry.narrativeSummary ?? "").trim();
    if (sections.length === 0 && !narrative) continue;

    const key = `${entry.documentedAt ?? entry.savedAt}:${entry.performerDisplayName ?? ""}`;
    if (primaryKey && key === primaryKey && primary?.status !== "DRAFT") continue;

    out.push({
      id: entry.id,
      savedAt: entry.savedAt,
      documentedAt: entry.documentedAt?.trim() || null,
      performerDisplayName: entry.performerDisplayName?.trim() || null,
      performerRoleTitle: entry.performerRoleTitle?.trim() || null,
      sections,
      narrativeSummary: narrative || null,
      status: entry.isDraft ? "DRAFT" : "SAVED",
    });
  }
  return out;
}

export function resolveNursingAssessmentPrimary(
  initial: {
    id?: string;
    documentedAt?: string | null;
    savedAt?: string;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    structuredLines?: string[];
    narrativeSummary?: string | null;
  } | null,
  reassessmentHistory: Array<{
    id: string;
    documentedAt?: string | null;
    savedAt: string;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    structuredLines?: string[];
    narrativeSummary?: string | null;
  }>
): {
  primary: EncounterClinicalRecordNursingAssessment | null;
  history: EncounterClinicalRecordNursingAssessmentHistoryEntry[];
} {
  const sorted = [...reassessmentHistory].sort(
    (a, b) => parseTime(b.documentedAt ?? b.savedAt) - parseTime(a.documentedAt ?? a.savedAt)
  );

  const latestReassessment = sorted[0];
  if (latestReassessment) {
    const structuredLines = (latestReassessment.structuredLines ?? []).map((l) => l.trim()).filter(Boolean);
    const narrative = (latestReassessment.narrativeSummary ?? "").trim();
    const primary: EncounterClinicalRecordNursingAssessment = {
      id: latestReassessment.id,
      documentedAt: latestReassessment.documentedAt?.trim() || null,
      savedAt: latestReassessment.savedAt,
      performerDisplayName: latestReassessment.performerDisplayName?.trim() || null,
      performerRoleTitle: latestReassessment.performerRoleTitle?.trim() || null,
      structuredLines,
      narrativeSummary: narrative || null,
      isInitial: false,
    };
    const history = sorted.slice(1).map((entry) => ({
      id: entry.id,
      documentedAt: entry.documentedAt?.trim() || null,
      savedAt: entry.savedAt,
      performerDisplayName: entry.performerDisplayName?.trim() || null,
      performerRoleTitle: entry.performerRoleTitle?.trim() || null,
      structuredLines: (entry.structuredLines ?? []).map((l) => l.trim()).filter(Boolean),
      narrativeSummary: (entry.narrativeSummary ?? "").trim() || null,
    }));
    return { primary, history };
  }

  if (!initial?.savedAt) return { primary: null, history: [] };
  const structuredLines = (initial.structuredLines ?? []).map((l) => l.trim()).filter(Boolean);
  const narrative = (initial.narrativeSummary ?? "").trim();
  if (structuredLines.length === 0 && !narrative) return { primary: null, history: [] };

  return {
    primary: {
      id: initial.id?.trim() || "initial-nursing-assessment",
      documentedAt: initial.documentedAt?.trim() || null,
      savedAt: initial.savedAt,
      performerDisplayName: initial.performerDisplayName?.trim() || null,
      performerRoleTitle: initial.performerRoleTitle?.trim() || null,
      structuredLines,
      narrativeSummary: narrative || null,
      isInitial: true,
    },
    history: [],
  };
}

export function dedupeOrderRows(
  candidates: EncounterClinicalRecordOrderRow[]
): EncounterClinicalRecordOrderRow[] {
  const byItem = new Map<string, EncounterClinicalRecordOrderRow>();
  for (const row of candidates) {
    const key = row.orderItemId;
    const existing = byItem.get(key);
    if (!existing || orderLifecycleRank(row.status) >= orderLifecycleRank(existing.status)) {
      byItem.set(key, row);
    }
  }
  return [...byItem.values()].sort((a, b) => parseTime(a.orderedAt) - parseTime(b.orderedAt));
}

export function dedupeLaboratoryResults(
  candidates: EncounterClinicalRecordLaboratoryResult[]
): EncounterClinicalRecordLaboratoryResult[] {
  const byItem = new Map<string, EncounterClinicalRecordLaboratoryResult>();
  for (const row of candidates) {
    const existing = byItem.get(row.orderItemId);
    if (!existing || parseTime(row.verifiedAt) >= parseTime(existing.verifiedAt)) {
      byItem.set(row.orderItemId, row);
    }
  }
  return [...byItem.values()].sort((a, b) => parseTime(a.verifiedAt) - parseTime(b.verifiedAt));
}

export function dedupeImagingResults(
  candidates: EncounterClinicalRecordImagingResult[]
): EncounterClinicalRecordImagingResult[] {
  const byItem = new Map<string, EncounterClinicalRecordImagingResult>();
  for (const row of candidates) {
    const existing = byItem.get(row.orderItemId);
    if (!existing || parseTime(row.verifiedAt) >= parseTime(existing.verifiedAt)) {
      byItem.set(row.orderItemId, row);
    }
  }
  return [...byItem.values()].sort((a, b) => parseTime(a.verifiedAt) - parseTime(b.verifiedAt));
}

export function dedupeMedicationAdministrations(
  candidates: EncounterClinicalRecordMedicationAdministration[]
): EncounterClinicalRecordMedicationAdministration[] {
  const byId = new Map<string, EncounterClinicalRecordMedicationAdministration>();
  for (const row of candidates) {
    if (!row.id) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => parseTime(a.administeredAt) - parseTime(b.administeredAt));
}

export function dedupeProcedures(
  candidates: EncounterClinicalRecordProcedure[]
): EncounterClinicalRecordProcedure[] {
  const byId = new Map<string, EncounterClinicalRecordProcedure>();
  for (const row of candidates) {
    if (!row.id) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => parseTime(a.documentedAt) - parseTime(b.documentedAt));
}

export function dedupeClinicalTimelineEntries(
  candidates: EncounterClinicalRecordClinicalTimelineEntry[]
): EncounterClinicalRecordClinicalTimelineEntry[] {
  const bySource = new Map<string, EncounterClinicalRecordClinicalTimelineEntry>();
  for (const row of candidates) {
    const key = `${row.sourceType}:${row.sourceId}`;
    const existing = bySource.get(key);
    if (!existing) {
      bySource.set(key, row);
      continue;
    }
    const existingRank = CLINICAL_MILESTONE_RANK[existing.milestone] ?? 0;
    const rowRank = CLINICAL_MILESTONE_RANK[row.milestone] ?? 0;
    if (rowRank > existingRank) {
      bySource.set(key, row);
      continue;
    }
    if (rowRank === existingRank && parseTime(row.timestampIso) >= parseTime(existing.timestampIso)) {
      bySource.set(key, row);
    }
  }
  return [...bySource.values()].sort((a, b) => parseTime(a.timestampIso) - parseTime(b.timestampIso));
}

export function isWorkflowOrderEventType(eventType: string): boolean {
  const t = normalizeStatus(eventType);
  return (
    t === "ACKNOWLEDGED" ||
    t === "STARTED" ||
    t === "IN_PROGRESS" ||
    t === "REVIEWED" ||
    t === "RESULT_ACKNOWLEDGED" ||
    t === "PLACED" ||
    t === "PENDING"
  );
}

export function isProviderSaveEventType(eventType: string): boolean {
  const t = normalizeStatus(eventType);
  return (
    t === "PROVIDER_MSE_SAVED" ||
    t === "ED_PROVIDER_DOCUMENTATION_SAVED" ||
    t === "OBSERVATION_PROVIDER_PROGRESS_NOTE_SAVED"
  );
}

export function isClinicalMilestoneEventType(eventType: string): boolean {
  const t = normalizeStatus(eventType);
  if (isProviderSaveEventType(t)) return false;
  if (isWorkflowOrderEventType(t)) return false;
  return (
    t === "ARRIVAL" ||
    t === "TRIAGE_COMPLETE" ||
    t === "TRIAGE_ASSESSMENT_SAVED" ||
    t === "PROVIDER_SIGNED" ||
    t === "ED_PROVIDER_DOCUMENTATION_SIGNED" ||
    t === "OBSERVATION_PROVIDER_PROGRESS_NOTE_SIGNED" ||
    t === "LAB_COLLECTED" ||
    t === "COLLECTED" ||
    t === "RESULT_LAB_RECORDED" ||
    t === "RESULT_IMAGING_FINALIZED" ||
    t === "ADMINISTERED" ||
    t === "MAR_ADMINISTERED" ||
    t === "PROCEDURE_DOCUMENTED" ||
    t === "DISPOSITION_RECORDED" ||
    t === "DISCHARGE_SUMMARY_SAVED" ||
    t === "ENCOUNTER_CLOSED" ||
    t === "DISCHARGED"
  );
}

export function resolveClinicalMilestoneFromEventType(
  eventType: string,
  orderType?: string | null
): EncounterClinicalRecordClinicalMilestone | null {
  const t = normalizeStatus(eventType);
  const ot = normalizeStatus(orderType);

  if (t === "ARRIVAL") return "ARRIVAL";
  if (t === "TRIAGE_COMPLETE" || t === "TRIAGE_ASSESSMENT_SAVED") return "TRIAGE_COMPLETE";
  if (
    t === "PROVIDER_SIGNED" ||
    t === "ED_PROVIDER_DOCUMENTATION_SIGNED" ||
    t === "OBSERVATION_PROVIDER_PROGRESS_NOTE_SIGNED"
  ) {
    return "PROVIDER_ASSESSMENT_SIGNED";
  }
  if (t === "LAB_COLLECTED" || (t === "COLLECTED" && ot === "LAB")) return "LABORATORY_COLLECTED";
  if (t === "RESULT_LAB_RECORDED" || (t.includes("RESULT") && ot === "LAB")) return "LABORATORY_RESULTED";
  if (t === "RESULT_IMAGING_FINALIZED" || (t.includes("RESULT") && ot === "IMAGING")) {
    return "IMAGING_RESULTED";
  }
  if (t === "ADMINISTERED" || t === "MAR_ADMINISTERED") return "MEDICATION_ADMINISTERED";
  if (t === "PROCEDURE_DOCUMENTED") return "PROCEDURE_COMPLETED";
  if (t === "DISPOSITION_RECORDED" || t === "DISPOSITION_SUPPLEMENT_SAVED") return "DISPOSITION";
  if (t === "DISCHARGE_SUMMARY_SAVED" || t === "ENCOUNTER_CLOSED" || t === "DISCHARGED") {
    return "DISCHARGED";
  }
  return null;
}
