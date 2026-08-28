/**
 * INP.DIS.1A — Canonical inpatient discharge contract on Encounter.dischargeSummaryJson.
 * One authoritative aggregate; namespaced inpatient sections; legacy flat keys preserved.
 * Planning (D3E.7 / D4B.7) ≠ provider-authorized final disposition.
 */

import type { InpatientDischargeWorkflowState } from "./inpatientClinicalOpsV1.js";
import {
  hydrateInpatientProviderDischarge,
  readInpatientProviderDischargeFromSummary,
  type InpatientProviderDischargeV1,
  type InpatientProviderDischargeV1B,
} from "./inpatientProviderDischargeInpDis1b.js";

export const INPATIENT_DISCHARGE_SCHEMA_VERSION = "INP.DIS.1A" as const;

export type { InpatientProviderDischargeV1, InpatientProviderDischargeV1B };

export const INPATIENT_DISCHARGE_NAMESPACE_KEYS = [
  "inpatientProviderDischarge",
  "inpatientMedRecon",
  "inpatientPatientInstructions",
  "inpatientNursingDischarge",
  "inpatientFinalDischarge",
] as const;

/** Discharge medication reconciliation snapshot (INP.DIS.1C+). */
export type InpatientMedReconDischargeV1 = {
  schemaVersion?: typeof INPATIENT_DISCHARGE_SCHEMA_VERSION;
  finalizedAt?: string | null;
  finalizedByUserId?: string | null;
  lines?: Array<Record<string, unknown>>;
};

/** Patient discharge instructions snapshot (INP.DIS.1C+). */
export type InpatientPatientInstructionsDischargeV1 = {
  schemaVersion?: typeof INPATIENT_DISCHARGE_SCHEMA_VERSION;
  documentedAt?: string | null;
  documentedByUserId?: string | null;
  sections?: Record<string, string>;
};

/** Nursing discharge execution snapshot (INP.DIS.1D+). */
export type InpatientNursingDischargeV1 = {
  schemaVersion?: typeof INPATIENT_DISCHARGE_SCHEMA_VERSION;
  destinationConfirmed?: string | null;
  conditionAtDeparture?: string | null;
  departureAt?: string | null;
  documentedByUserId?: string | null;
  displayNameSnapshot?: string | null;
  professionalTitleSnapshot?: string | null;
};

export type InpatientDischargePlanningContext = {
  anticipatedDischargeDate?: string | null;
  destination?: string | null;
  workflowState?: InpatientDischargeWorkflowState | string | null;
};

export type EffectiveInpatientDischargeSummary = {
  raw: Record<string, unknown>;
  schemaVersion: string | null;
  /** Legacy + flat keys for print/summary backward compatibility. */
  flat: Record<string, unknown>;
  inpatientProviderDischarge: InpatientProviderDischargeV1 | null;
  inpatientMedRecon: InpatientMedReconDischargeV1 | null;
  inpatientPatientInstructions: InpatientPatientInstructionsDischargeV1 | null;
  inpatientNursingDischarge: InpatientNursingDischargeV1 | null;
  plannedDestination: string | null;
  plannedDischargeWorkflowState: string | null;
  /** Provider-authorized final disposition when present. */
  finalDisposition: string | null;
  isSynthesizedDraftFallback: boolean;
  hasClinicianAuthoredContent: boolean;
  unknownKeysPreserved: true;
};

const LEGACY_FLAT_STRING_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
  "dischargeDiagnosisSummary",
  "medicationInstructions",
  "returnPrecautions",
  "followUpInstructions",
  "activityInstructions",
  "woundCareInstructions",
  "workSchoolNote",
  "patientInstructionsGiven",
  "instructionsGivenBy",
  "instructionsGivenAt",
  "providerDischargeDocumentedAt",
  "providerDischargeDocumentedByDisplayName",
  "providerDischargeDocumentedByTitle",
  "plannedDestination",
  "plannedDischargeWorkflowState",
] as const;

const ER_STRUCTURED_ARRAY_KEYS = [
  "providerDischargeFollowUps",
  "providerDischargeDiagnosisDocs",
  "providerDischargeDiagnosisRefs",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readNamespace<T>(raw: Record<string, unknown>, key: string): T | null {
  const v = raw[key];
  return isRecord(v) ? (v as T) : null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function namespaceHasContent(ns: Record<string, unknown> | null | undefined): boolean {
  if (!ns) return false;
  for (const v of Object.values(ns)) {
    if (hasNonEmptyString(v)) return true;
    if (Array.isArray(v) && v.length > 0) return true;
    if (isRecord(v) && Object.keys(v).length > 0) return true;
  }
  return false;
}

/** Detect D4A.3.3A fallback synthesis marker (not clinician authorship). */
export function isSynthesizedDraftFallback(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (raw.isSynthesizedDraftFallback === true) return true;
  return raw.synthesizedByModule === "MEDUI.D4A.3.3A.inpatientDischargeSynthesis";
}

/** True when discharge JSON contains clinician- or provider-authored content (blocks synthesis overwrite). */
export function hasClinicianAuthoredDischargeContent(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (isSynthesizedDraftFallback(raw)) return false;

  const providerRaw = raw.inpatientProviderDischarge;
  const provider = hydrateInpatientProviderDischarge(providerRaw);
  if (provider) {
    if (provider.finalDisposition?.code?.trim()) return true;
    if (hasNonEmptyString(provider.hospitalCourse)) return true;
    if (hasNonEmptyString(provider.reasonForHospitalization)) return true;
    if (provider.dischargeDiagnoses.length > 0) return true;
    if (provider.documentedByUserId) return true;
  }

  if (namespaceHasContent(readNamespace(raw, "inpatientMedRecon"))) return true;
  if (namespaceHasContent(readNamespace(raw, "inpatientPatientInstructions"))) return true;
  if (namespaceHasContent(readNamespace(raw, "inpatientNursingDischarge"))) return true;

  for (const k of ER_STRUCTURED_ARRAY_KEYS) {
    const v = raw[k];
    if (Array.isArray(v) && v.length > 0) return true;
  }

  if (hasNonEmptyString(raw.providerDischargeDocumentedAt)) return true;
  if (hasNonEmptyString(raw.providerDischargeDocumentedByDisplayName)) return true;

  for (const k of LEGACY_FLAT_STRING_KEYS) {
    const v = raw[k];
    if (!hasNonEmptyString(v)) continue;
    if (k === "disposition" && isPlanningWorkflowState(String(v))) continue;
    return true;
  }

  return false;
}

const PLANNING_WORKFLOW_STATES = new Set([
  "PLANNING",
  "READY",
  "ORDERED",
  "INSTRUCTIONS_COMPLETE",
  "DEPARTED",
]);

function isPlanningWorkflowState(value: string): boolean {
  return PLANNING_WORKFLOW_STATES.has(value.trim().toUpperCase());
}

/**
 * Displayable discharge content exists (includes explicit fallback synthesis drafts).
 * Empty object/null → false unless fallback synthesis is explicitly merged by caller.
 */
export function hasMeaningfulDischargeSummary(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (hasClinicianAuthoredDischargeContent(raw)) return true;
  if (isSynthesizedDraftFallback(raw)) {
    return LEGACY_FLAT_STRING_KEYS.some((k) => hasNonEmptyString(raw[k]));
  }
  return LEGACY_FLAT_STRING_KEYS.some((k) => hasNonEmptyString(raw[k]));
}

export function resolveFinalDisposition(raw: Record<string, unknown>): string | null {
  const provider = readInpatientProviderDischargeFromSummary(raw);
  if (provider?.finalDisposition?.code?.trim()) {
    return provider.finalDisposition.labelSnapshot?.trim() || provider.finalDisposition.code.trim();
  }
  const flat = hasNonEmptyString(raw.finalDisposition) ? String(raw.finalDisposition).trim() : null;
  if (flat) return flat;
  if (hasNonEmptyString(raw.dischargeMode) && raw.plannedDestinationNotFinalDisposition !== true) {
    const mode = String(raw.dischargeMode).trim();
    if (!isPlanningWorkflowState(mode)) return mode;
  }
  return null;
}

export function resolvePlannedDestination(
  raw: Record<string, unknown>,
  planning?: InpatientDischargePlanningContext | null
): string | null {
  if (hasNonEmptyString(raw.plannedDestination)) return String(raw.plannedDestination).trim();
  if (hasNonEmptyString(planning?.destination)) return String(planning!.destination).trim();
  if (raw.plannedDestinationNotFinalDisposition === true && hasNonEmptyString(raw.patientDestination)) {
    return String(raw.patientDestination).trim();
  }
  if (isSynthesizedDraftFallback(raw) && hasNonEmptyString(raw.patientDestination)) {
    return String(raw.patientDestination).trim();
  }
  return null;
}

/** Read canonical inpatient discharge aggregate without mutating input. */
export function readEffectiveInpatientDischargeSummary(
  raw: unknown,
  planning?: InpatientDischargePlanningContext | null
): EffectiveInpatientDischargeSummary {
  const base = isRecord(raw) ? { ...raw } : {};
  const flat: Record<string, unknown> = { ...base };
  for (const k of INPATIENT_DISCHARGE_NAMESPACE_KEYS) {
    delete flat[k];
  }

  const provider = readInpatientProviderDischargeFromSummary(base);
  const finalDisposition = resolveFinalDisposition(base);
  const plannedDestination = resolvePlannedDestination(base, planning);

  return {
    raw: base,
    schemaVersion:
      typeof base.dispositionSchemaVersion === "string"
        ? base.dispositionSchemaVersion
        : provider?.schemaVersion ?? null,
    flat,
    inpatientProviderDischarge: provider,
    inpatientMedRecon: readNamespace(base, "inpatientMedRecon"),
    inpatientPatientInstructions: readNamespace(base, "inpatientPatientInstructions"),
    inpatientNursingDischarge: readNamespace(base, "inpatientNursingDischarge"),
    plannedDestination,
    plannedDischargeWorkflowState:
      hasNonEmptyString(base.plannedDischargeWorkflowState)
        ? String(base.plannedDischargeWorkflowState)
        : planning?.workflowState
          ? String(planning.workflowState)
          : isSynthesizedDraftFallback(base) && hasNonEmptyString(base.disposition)
            ? String(base.disposition)
            : null,
    finalDisposition,
    isSynthesizedDraftFallback: isSynthesizedDraftFallback(base),
    hasClinicianAuthoredContent: hasClinicianAuthoredDischargeContent(base),
    unknownKeysPreserved: true,
  };
}

export type ResolveInpatientDischargeForDisplayInput = {
  stored: unknown;
  planning?: InpatientDischargePlanningContext | null;
  /** Ephemeral D4A.3.3A fallback draft — never persisted unless caller explicitly PATCHes. */
  fallbackDraft?: Record<string, unknown> | null;
};

/**
 * Single reader for Summary / Print — never persists; optionally merges ephemeral fallback draft.
 */
export function resolveInpatientDischargeForDisplay(
  input: ResolveInpatientDischargeForDisplayInput
): Record<string, unknown> | null {
  const stored = isRecord(input.stored) ? { ...input.stored } : null;
  if (stored && hasClinicianAuthoredDischargeContent(stored)) {
    return stored;
  }
  if (stored && hasMeaningfulDischargeSummary(stored) && !isSynthesizedDraftFallback(stored)) {
    return stored;
  }
  if (input.fallbackDraft) {
    if (!stored) return { ...input.fallbackDraft };
    return mergeDischargeSummaryPreservingAuthored(stored, input.fallbackDraft);
  }
  return stored && Object.keys(stored).length ? stored : null;
}

/** Merge incoming into existing without overwriting clinician-authored content. */
export function mergeDischargeSummaryPreservingAuthored(
  existing: unknown,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  if (hasClinicianAuthoredDischargeContent(base)) {
    return base;
  }
  return { ...base, ...incoming };
}

/** Whether a PATCH of synthesized draft is allowed (fallback-only rows). */
export function shouldAllowSynthesizedDraftPersistence(existing: unknown): boolean {
  if (!isRecord(existing) || Object.keys(existing).length === 0) return true;
  return isSynthesizedDraftFallback(existing) && !hasClinicianAuthoredDischargeContent(existing);
}

/** Planned destination must never become implicit provider final disposition. */
export function plannedDestinationIsDistinctFromFinalDisposition(input: {
  plannedDestination?: string | null;
  finalDisposition?: string | null;
  raw?: Record<string, unknown>;
}): boolean {
  const planned = input.plannedDestination?.trim() || null;
  const finalDisp =
    input.finalDisposition?.trim() ||
    (input.raw ? resolveFinalDisposition(input.raw) : null);
  if (!planned) return true;
  if (!finalDisp) return true;
  return planned.toLowerCase() !== finalDisp.toLowerCase();
}

export function extractDischargePlanningFromClinicalOps(
  ops: unknown
): InpatientDischargePlanningContext | null {
  if (!isRecord(ops)) return null;
  const planning = isRecord(ops.dischargePlanning) ? ops.dischargePlanning : null;
  if (!planning) return null;
  return {
    anticipatedDischargeDate:
      typeof planning.anticipatedDischargeDate === "string"
        ? planning.anticipatedDischargeDate
        : null,
    destination: typeof planning.destination === "string" ? planning.destination : null,
    workflowState:
      typeof planning.workflowState === "string" ? planning.workflowState : null,
  };
}
