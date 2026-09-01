/**
 * EMTALA compliance log V1 — stored under `Encounter.nursingAssessment.erEmtalaV1` (Json).
 * Persists via existing PATCH /encounters/:id. No DB migration.
 * Read-only and disposition-save complements are merged with workflow-derived state (ER-Compliance-1B); no autonomic clinical decisions in this file.
 */

import { hydrateDischargeFormFromEncounterJson } from "@/lib/encounterDischarge";
import {
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  readDispositionSignatureFromEncounter,
  readDischargeSortieExecutionFromEncounter,
  supplementFormHasContent,
} from "./emergencyDispositionV1";
import type { ErDispositionOutcomeUi } from "./emergencyDispositionV1";
import { canonicalEdDispositionEnginePath } from "./edHosp1bDispositionOutcomeMapping";
import { erTriageV1FormFromVitalsJson } from "./medoraErTriageV1";
import { mseDocumentedAtFromNursing } from "./emergencyProviderMseV1";

export const ER_EMTALA_V1_KEY = "erEmtalaV1" as const;

export const EMTALA_STATUS_VALUES = [
  "ARRIVED",
  "TRIAGED",
  "MSE_IN_PROGRESS",
  "MSE_COMPLETE",
  "DISPOSITIONED",
  "DEPARTED",
] as const;
export type EmtalaStatusV1 = (typeof EMTALA_STATUS_VALUES)[number];

export const EMTALA_DISPOSITION_CATEGORY_VALUES = [
  "HOME",
  "ADMISSION",
  "TRANSFER",
  "AMA",
  "LWBS",
  "ELOPEMENT",
  "DECEASED",
  "OTHER",
] as const;
export type EmtalaDispositionCategoryV1 = (typeof EMTALA_DISPOSITION_CATEGORY_VALUES)[number];

export type ErEmtalaV1Signature = {
  savedAt: string;
  savedByDisplayName: string;
};

export type ErEmtalaV1Stored = {
  arrivalAt?: string | null;
  triageStartedAt?: string | null;
  triageCompletedAt?: string | null;
  medicalScreeningExamStartedAt?: string | null;
  medicalScreeningExamCompletedAt?: string | null;
  dispositionDecisionAt?: string | null;
  departureAt?: string | null;
  emtalaStatus?: EmtalaStatusV1 | null;
  emtalaDispositionCategory?: EmtalaDispositionCategoryV1 | null;
  transferRequestedAt?: string | null;
  transferAcceptedAt?: string | null;
  acceptingFacilityName?: string | null;
  acceptingClinicianName?: string | null;
  transferMode?: string | null;
  transferReason?: string | null;
  amaRiskDiscussionDocumented?: boolean | null;
  lwbsDocumentedAt?: string | null;
  msePerformed?: boolean | null;
  emergencyConditionConsidered?: boolean | null;
  stabilizingTreatmentProvidedOrNotApplicable?: boolean | null;
  signature?: ErEmtalaV1Signature;
};

export type ErEmtalaV1Form = {
  arrivalAt: string;
  triageStartedAt: string;
  triageCompletedAt: string;
  medicalScreeningExamStartedAt: string;
  medicalScreeningExamCompletedAt: string;
  dispositionDecisionAt: string;
  departureAt: string;
  emtalaStatus: string;
  emtalaDispositionCategory: string;
  transferRequestedAt: string;
  transferAcceptedAt: string;
  acceptingFacilityName: string;
  acceptingClinicianName: string;
  transferMode: string;
  transferReason: string;
  amaRiskDiscussionDocumented: "" | "true" | "false";
  lwbsDocumentedAt: string;
  msePerformed: "" | "true" | "false";
  emergencyConditionConsidered: "" | "true" | "false";
  stabilizingTreatmentProvidedOrNotApplicable: "" | "true" | "false";
};

const MAX_NAME = 500;
const MAX_TEXT = 4000;

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function triToBool(v: "" | "true" | "false"): boolean | null {
  if (v === "") return null;
  return v === "true";
}

function boolToTri(v: boolean | null | undefined): "" | "true" | "false" {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

function parseStatus(v: unknown): EmtalaStatusV1 | null {
  if (typeof v !== "string" || !v) return null;
  return (EMTALA_STATUS_VALUES as readonly string[]).includes(v) ? (v as EmtalaStatusV1) : null;
}

function parseDisposition(v: unknown): EmtalaDispositionCategoryV1 | null {
  if (typeof v !== "string" || !v) return null;
  return (EMTALA_DISPOSITION_CATEGORY_VALUES as readonly string[]).includes(v)
    ? (v as EmtalaDispositionCategoryV1)
    : null;
}

function parseBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}

export function readErEmtalaV1FromNursing(nursingAssessment: unknown): ErEmtalaV1Stored | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_EMTALA_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: ErEmtalaV1Stored = {};
  if (o.arrivalAt) out.arrivalAt = str(o.arrivalAt, 40);
  if (o.triageStartedAt) out.triageStartedAt = str(o.triageStartedAt, 40);
  if (o.triageCompletedAt) out.triageCompletedAt = str(o.triageCompletedAt, 40);
  if (o.medicalScreeningExamStartedAt) out.medicalScreeningExamStartedAt = str(o.medicalScreeningExamStartedAt, 40);
  if (o.medicalScreeningExamCompletedAt) out.medicalScreeningExamCompletedAt = str(o.medicalScreeningExamCompletedAt, 40);
  if (o.dispositionDecisionAt) out.dispositionDecisionAt = str(o.dispositionDecisionAt, 40);
  if (o.departureAt) out.departureAt = str(o.departureAt, 40);
  const st = parseStatus(o.emtalaStatus);
  if (st) out.emtalaStatus = st;
  const dc = parseDisposition(o.emtalaDispositionCategory);
  if (dc) out.emtalaDispositionCategory = dc;
  if (o.transferRequestedAt) out.transferRequestedAt = str(o.transferRequestedAt, 40);
  if (o.transferAcceptedAt) out.transferAcceptedAt = str(o.transferAcceptedAt, 40);
  if (o.acceptingFacilityName) out.acceptingFacilityName = str(o.acceptingFacilityName, MAX_NAME);
  if (o.acceptingClinicianName) out.acceptingClinicianName = str(o.acceptingClinicianName, MAX_NAME);
  if (o.transferMode) out.transferMode = str(o.transferMode, 200);
  if (o.transferReason) out.transferReason = str(o.transferReason, MAX_TEXT);
  const ama = parseBool(o.amaRiskDiscussionDocumented);
  if (ama !== null) out.amaRiskDiscussionDocumented = ama;
  if (o.lwbsDocumentedAt) out.lwbsDocumentedAt = str(o.lwbsDocumentedAt, 40);
  const mse = parseBool(o.msePerformed);
  if (mse !== null) out.msePerformed = mse;
  const emc = parseBool(o.emergencyConditionConsidered);
  if (emc !== null) out.emergencyConditionConsidered = emc;
  const stb = parseBool(o.stabilizingTreatmentProvidedOrNotApplicable);
  if (stb !== null) out.stabilizingTreatmentProvidedOrNotApplicable = stb;
  const sig = o.signature;
  if (sig && typeof sig === "object" && !Array.isArray(sig)) {
    const at = (sig as { savedAt?: unknown }).savedAt;
    const by = (sig as { savedByDisplayName?: unknown }).savedByDisplayName;
    if (typeof at === "string" && typeof by === "string" && at.trim() && by.trim()) {
      out.signature = { savedAt: at.trim().slice(0, 40), savedByDisplayName: by.trim().slice(0, 200) };
    }
  }
  return Object.keys(out).length ? out : null;
}

export function emptyErEmtalaV1Form(): ErEmtalaV1Form {
  return {
    arrivalAt: "",
    triageStartedAt: "",
    triageCompletedAt: "",
    medicalScreeningExamStartedAt: "",
    medicalScreeningExamCompletedAt: "",
    dispositionDecisionAt: "",
    departureAt: "",
    emtalaStatus: "",
    emtalaDispositionCategory: "",
    transferRequestedAt: "",
    transferAcceptedAt: "",
    acceptingFacilityName: "",
    acceptingClinicianName: "",
    transferMode: "",
    transferReason: "",
    amaRiskDiscussionDocumented: "",
    lwbsDocumentedAt: "",
    msePerformed: "",
    emergencyConditionConsidered: "",
    stabilizingTreatmentProvidedOrNotApplicable: "",
  };
}

export function erEmtalaV1FormFromEncounter(nursingAssessment: unknown): ErEmtalaV1Form {
  const e = emptyErEmtalaV1Form();
  const s = readErEmtalaV1FromNursing(nursingAssessment);
  if (!s) return e;
  e.arrivalAt = isoToDatetimeLocal(s.arrivalAt ?? null);
  e.triageStartedAt = isoToDatetimeLocal(s.triageStartedAt ?? null);
  e.triageCompletedAt = isoToDatetimeLocal(s.triageCompletedAt ?? null);
  e.medicalScreeningExamStartedAt = isoToDatetimeLocal(s.medicalScreeningExamStartedAt ?? null);
  e.medicalScreeningExamCompletedAt = isoToDatetimeLocal(s.medicalScreeningExamCompletedAt ?? null);
  e.dispositionDecisionAt = isoToDatetimeLocal(s.dispositionDecisionAt ?? null);
  e.departureAt = isoToDatetimeLocal(s.departureAt ?? null);
  e.emtalaStatus = s.emtalaStatus ?? "";
  e.emtalaDispositionCategory = s.emtalaDispositionCategory ?? "";
  e.transferRequestedAt = isoToDatetimeLocal(s.transferRequestedAt ?? null);
  e.transferAcceptedAt = isoToDatetimeLocal(s.transferAcceptedAt ?? null);
  e.acceptingFacilityName = s.acceptingFacilityName ?? "";
  e.acceptingClinicianName = s.acceptingClinicianName ?? "";
  e.transferMode = s.transferMode ?? "";
  e.transferReason = s.transferReason ?? "";
  e.amaRiskDiscussionDocumented = boolToTri(s.amaRiskDiscussionDocumented);
  e.lwbsDocumentedAt = isoToDatetimeLocal(s.lwbsDocumentedAt ?? null);
  e.msePerformed = boolToTri(s.msePerformed);
  e.emergencyConditionConsidered = boolToTri(s.emergencyConditionConsidered);
  e.stabilizingTreatmentProvidedOrNotApplicable = boolToTri(s.stabilizingTreatmentProvidedOrNotApplicable);
  return e;
}

function optionalIso(s: string): string | null {
  return datetimeLocalToIso(s);
}

function optionalStatus(s: string): EmtalaStatusV1 | null {
  const t = s.trim();
  if (!t) return null;
  return parseStatus(t);
}

function optionalDisposition(s: string): EmtalaDispositionCategoryV1 | null {
  const t = s.trim();
  if (!t) return null;
  return parseDisposition(t);
}

/** Data fields only (no signature) — for empty-check. */
export function erEmtalaV1DataFromForm(form: ErEmtalaV1Form): ErEmtalaV1Stored {
  const o: ErEmtalaV1Stored = {};
  const a0 = optionalIso(form.arrivalAt);
  if (a0) o.arrivalAt = a0;
  const a1 = optionalIso(form.triageStartedAt);
  if (a1) o.triageStartedAt = a1;
  const a2 = optionalIso(form.triageCompletedAt);
  if (a2) o.triageCompletedAt = a2;
  const a3 = optionalIso(form.medicalScreeningExamStartedAt);
  if (a3) o.medicalScreeningExamStartedAt = a3;
  const a4 = optionalIso(form.medicalScreeningExamCompletedAt);
  if (a4) o.medicalScreeningExamCompletedAt = a4;
  const a5 = optionalIso(form.dispositionDecisionAt);
  if (a5) o.dispositionDecisionAt = a5;
  const a6 = optionalIso(form.departureAt);
  if (a6) o.departureAt = a6;
  const st = optionalStatus(form.emtalaStatus);
  if (st) o.emtalaStatus = st;
  const dc = optionalDisposition(form.emtalaDispositionCategory);
  if (dc) o.emtalaDispositionCategory = dc;
  const t0 = optionalIso(form.transferRequestedAt);
  if (t0) o.transferRequestedAt = t0;
  const t1 = optionalIso(form.transferAcceptedAt);
  if (t1) o.transferAcceptedAt = t1;
  if (form.acceptingFacilityName.trim()) o.acceptingFacilityName = str(form.acceptingFacilityName, MAX_NAME);
  if (form.acceptingClinicianName.trim()) o.acceptingClinicianName = str(form.acceptingClinicianName, MAX_NAME);
  if (form.transferMode.trim()) o.transferMode = str(form.transferMode, 200);
  if (form.transferReason.trim()) o.transferReason = str(form.transferReason, MAX_TEXT);
  const ama = triToBool(form.amaRiskDiscussionDocumented);
  if (ama !== null) o.amaRiskDiscussionDocumented = ama;
  const lw = optionalIso(form.lwbsDocumentedAt);
  if (lw) o.lwbsDocumentedAt = lw;
  const mse = triToBool(form.msePerformed);
  if (mse !== null) o.msePerformed = mse;
  const emc = triToBool(form.emergencyConditionConsidered);
  if (emc !== null) o.emergencyConditionConsidered = emc;
  const stb = triToBool(form.stabilizingTreatmentProvidedOrNotApplicable);
  if (stb !== null) o.stabilizingTreatmentProvidedOrNotApplicable = stb;
  return o;
}

export function erEmtalaV1HasAnyData(s: ErEmtalaV1Stored): boolean {
  for (const [k, v] of Object.entries(s)) {
    if (k === "signature") continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") return true;
    if (typeof v === "string" && v.trim()) return true;
  }
  return false;
}

export function erEmtalaV1StoredFromForm(
  form: ErEmtalaV1Form,
  signature: ErEmtalaV1Signature
): ErEmtalaV1Stored {
  return { ...erEmtalaV1DataFromForm(form), signature };
}

/**
 * Merge EMTALA blob into full nursingAssessment for PATCH. Removes key if no data after save.
 */
export function mergeErEmtalaV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErEmtalaV1Form,
  signature: ErEmtalaV1Signature
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const data = erEmtalaV1DataFromForm(form);
  if (erEmtalaV1HasAnyData(data)) {
    base[ER_EMTALA_V1_KEY] = { ...data, signature };
  } else {
    delete base[ER_EMTALA_V1_KEY];
  }
  return base;
}

export type EmtalaReadonlySummary =
  | { kind: "status"; status: EmtalaStatusV1 }
  | { kind: "transferPending" }
  | { kind: "lwbs" }
  | { kind: "amaDocumented" }
  | { kind: "none" };

/**
 * Read-only summary for badges / one-line display. No writes. Does not assert legal compliance.
 * "Arrived" alone is suppressed — minimal ambient signal only (next-step states, AMA/LWBS/transfer, etc.).
 */
export function deriveEmtalaReadonlySummary(stored: ErEmtalaV1Stored | null): EmtalaReadonlySummary {
  if (!stored) return { kind: "none" };
  if (stored.emtalaDispositionCategory === "TRANSFER") {
    if (stored.transferRequestedAt && !stored.transferAcceptedAt) {
      return { kind: "transferPending" };
    }
  }
  if (stored.lwbsDocumentedAt) {
    return { kind: "lwbs" };
  }
  if (stored.amaRiskDiscussionDocumented === true) {
    return { kind: "amaDocumented" };
  }
  if (stored.emtalaStatus && stored.emtalaStatus !== "ARRIVED") {
    return { kind: "status", status: stored.emtalaStatus };
  }
  return { kind: "none" };
}

function toIsoStringOrNull(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type EmtalaDerivationInput = {
  createdAt?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  /** Triage list row: vitalsJson + triageCompleteAt from encounter triage (when available). */
  triage?: { vitalsJson?: unknown; triageCompleteAt?: string | null } | null;
};

function hasDispositionContext(
  nursingAssessment: unknown,
  dischargeFormMode: string,
  supplement: ReturnType<typeof erDispositionSupplementFromEncounter>
): boolean {
  if (readDispositionSignatureFromEncounter(nursingAssessment)) return true;
  if (dischargeFormMode.trim()) return true;
  if (supplementFormHasContent(supplement)) return true;
  return false;
}

function pickWorkflowEmtalaStatus(facts: {
  hasArrived: boolean;
  triageCompletedAt: string | null;
  mseCompleteAt: string | null;
  dispositionSavedAt: string | null;
  departureAt: string | null;
}): EmtalaStatusV1 | null {
  if (facts.departureAt) return "DEPARTED";
  if (facts.dispositionSavedAt) return "DISPOSITIONED";
  if (facts.mseCompleteAt) return "MSE_COMPLETE";
  if (facts.triageCompletedAt) return "TRIAGED";
  if (facts.hasArrived) return "ARRIVED";
  return null;
}

/**
 * Merges **persisted** EMTALA blob (legacy panel + disposition complements) with **factual** timestamps
 * and workflow signals already stored elsewhere. Does not fabricate data.
 */
export function deriveEmtalaStateFromEncounter(input: EmtalaDerivationInput): ErEmtalaV1Stored | null {
  const nav = input.nursingAssessment;
  const manual = readErEmtalaV1FromNursing(nav);
  const discharge = hydrateDischargeFormFromEncounterJson(input.dischargeSummaryJson);
  const sup = erDispositionSupplementFromEncounter(nav);
  const hasDisp = hasDispositionContext(nav, discharge.dischargeMode, sup);
  const outcome = inferOutcomeUiFromForms(discharge.dischargeMode, sup);
  const disSig = readDispositionSignatureFromEncounter(nav);
  const dispositionAt = disSig ? toIsoStringOrNull(disSig.savedAt) : null;
  const mseAt = mseDocumentedAtFromNursing(nav);
  const triageE = input.triage?.vitalsJson ? erTriageV1FormFromVitalsJson(input.triage.vitalsJson) : null;
  const triageStart = triageE?.triageStartedAt?.trim()
    ? toIsoStringOrNull(triageE.triageStartedAt)
    : null;
  const triageC =
    toIsoStringOrNull(input.triage?.triageCompleteAt) ??
    toIsoStringOrNull(manual?.triageCompletedAt) ??
    null;
  const exec = readDischargeSortieExecutionFromEncounter(nav);
  const depAt = toIsoStringOrNull(exec?.dischargeSortieCompletedAt) ?? toIsoStringOrNull(manual?.departureAt) ?? null;

  const wStatus = pickWorkflowEmtalaStatus({
    hasArrived: Boolean(toIsoStringOrNull(input.createdAt)),
    triageCompletedAt: triageC,
    mseCompleteAt: mseAt,
    dispositionSavedAt: dispositionAt,
    departureAt: depAt,
  });
  const emtalaStatus = wStatus ?? manual?.emtalaStatus ?? null;

  const out: ErEmtalaV1Stored = { ...(manual ?? {}) };

  const arrivalAt = toIsoStringOrNull(input.createdAt) ?? (manual?.arrivalAt ? str(manual.arrivalAt, 40) : null);
  if (arrivalAt) out.arrivalAt = arrivalAt;
  if (triageStart) out.triageStartedAt = triageStart;
  if (triageC) out.triageCompletedAt = triageC;
  if (mseAt) {
    out.medicalScreeningExamCompletedAt = mseAt;
  }
  if (dispositionAt) {
    out.dispositionDecisionAt = dispositionAt;
  }
  if (depAt) {
    out.departureAt = depAt;
  }
  if (emtalaStatus) {
    out.emtalaStatus = emtalaStatus;
  }
  if (hasDisp) {
    out.emtalaDispositionCategory = canonicalEdDispositionEnginePath(outcome);
  } else if (manual?.emtalaDispositionCategory) {
    out.emtalaDispositionCategory = manual.emtalaDispositionCategory;
  }

  if (manual?.medicalScreeningExamStartedAt) {
    out.medicalScreeningExamStartedAt = str(manual.medicalScreeningExamStartedAt, 40);
  }

  if (Object.keys(out).length === 0) return null;
  return out;
}

/** EMTALA fields saved together with the disposition action (U.S. structured compliance). */
export type EmtalaDispositionComplementForm = {
  transferRequestedAt: string;
  transferAcceptedAt: string;
  acceptingFacilityName: string;
  acceptingClinicianName: string;
  transferMode: string;
  transferReason: string;
  amaRiskDiscussionDocumented: "" | "true" | "false";
  lwbsDocumentedAt: string;
  msePerformed: "" | "true" | "false";
  emergencyConditionConsidered: "" | "true" | "false";
  stabilizingTreatmentProvidedOrNotApplicable: "" | "true" | "false";
};

export function emptyEmtalaDispositionComplementForm(): EmtalaDispositionComplementForm {
  return {
    transferRequestedAt: "",
    transferAcceptedAt: "",
    acceptingFacilityName: "",
    acceptingClinicianName: "",
    transferMode: "",
    transferReason: "",
    amaRiskDiscussionDocumented: "",
    lwbsDocumentedAt: "",
    msePerformed: "",
    emergencyConditionConsidered: "",
    stabilizingTreatmentProvidedOrNotApplicable: "",
  };
}

export function emtalaDispositionComplementFromNursing(nursingAssessment: unknown): EmtalaDispositionComplementForm {
  const e = emptyEmtalaDispositionComplementForm();
  const s = readErEmtalaV1FromNursing(nursingAssessment);
  if (!s) return e;
  e.transferRequestedAt = s.transferRequestedAt ? isoToDatetimeLocal(s.transferRequestedAt) : "";
  e.transferAcceptedAt = s.transferAcceptedAt ? isoToDatetimeLocal(s.transferAcceptedAt) : "";
  e.acceptingFacilityName = s.acceptingFacilityName ?? "";
  e.acceptingClinicianName = s.acceptingClinicianName ?? "";
  e.transferMode = s.transferMode ?? "";
  e.transferReason = s.transferReason ?? "";
  e.amaRiskDiscussionDocumented = boolToTri(s.amaRiskDiscussionDocumented);
  e.lwbsDocumentedAt = s.lwbsDocumentedAt ? isoToDatetimeLocal(s.lwbsDocumentedAt) : "";
  e.msePerformed = boolToTri(s.msePerformed);
  e.emergencyConditionConsidered = boolToTri(s.emergencyConditionConsidered);
  e.stabilizingTreatmentProvidedOrNotApplicable = boolToTri(s.stabilizingTreatmentProvidedOrNotApplicable);
  return e;
}

function emtalaOutcomeFieldsFromComplement(
  f: EmtalaDispositionComplementForm,
  outcome: ErDispositionOutcomeUi
): Partial<ErEmtalaV1Stored> {
  const p: Partial<ErEmtalaV1Stored> = {};
  if (outcome === "TRANSFER") {
    const a = optionalIso(f.transferRequestedAt);
    if (a) p.transferRequestedAt = a;
    const b0 = optionalIso(f.transferAcceptedAt);
    if (b0) p.transferAcceptedAt = b0;
    if (f.acceptingFacilityName.trim()) p.acceptingFacilityName = str(f.acceptingFacilityName, 500);
    if (f.acceptingClinicianName.trim()) p.acceptingClinicianName = str(f.acceptingClinicianName, 500);
    if (f.transferMode.trim()) p.transferMode = str(f.transferMode, 200);
    if (f.transferReason.trim()) p.transferReason = str(f.transferReason, 4000);
  }
  if (outcome === "AMA") {
    const ama = triToBool(f.amaRiskDiscussionDocumented);
    if (ama !== null) p.amaRiskDiscussionDocumented = ama;
  }
  if (outcome === "LWBS") {
    const lw = optionalIso(f.lwbsDocumentedAt);
    if (lw) p.lwbsDocumentedAt = lw;
  }
  return p;
}

function applyTriStateAttestations(
  next: ErEmtalaV1Stored,
  f: EmtalaDispositionComplementForm
): void {
  if (f.msePerformed !== "") {
    const b = triToBool(f.msePerformed);
    if (b === null) delete next.msePerformed;
    else next.msePerformed = b;
  }
  if (f.emergencyConditionConsidered !== "") {
    const b = triToBool(f.emergencyConditionConsidered);
    if (b === null) delete next.emergencyConditionConsidered;
    else next.emergencyConditionConsidered = b;
  }
  if (f.stabilizingTreatmentProvidedOrNotApplicable !== "") {
    const b = triToBool(f.stabilizingTreatmentProvidedOrNotApplicable);
    if (b === null) delete next.stabilizingTreatmentProvidedOrNotApplicable;
    else next.stabilizingTreatmentProvidedOrNotApplicable = b;
  }
}

/**
 * Merges EMTALA V1 data into the nursing JSON already merged with `erDispositionV1`.
 * Outcome-specific EMTALA fields are cleared when the outcome is not the matching category.
 */
export function applyEmtalaV1ComplementToNursingAssessment(
  alreadyMerged: Record<string, unknown>,
  params: {
    outcome: ErDispositionOutcomeUi;
    complement: EmtalaDispositionComplementForm;
    dispositionDecidedAtIso: string;
    /** When false, US EMTALA attest booleans are not written or kept (Haiti / non-US). */
    persistAttestations?: boolean;
    /** Derived MSE YES only. Never pass true without canonical MSE evidence. */
    derivedMsePerformed?: boolean | null;
  }
): Record<string, unknown> {
  const { outcome, complement, dispositionDecidedAtIso } = params;
  const at = toIsoStringOrNull(dispositionDecidedAtIso);
  const prevE = readErEmtalaV1FromNursing(alreadyMerged);
  const next: ErEmtalaV1Stored = { ...(prevE ?? {}) };
  if (at) {
    next.dispositionDecisionAt = at;
  }
  next.emtalaDispositionCategory = canonicalEdDispositionEnginePath(outcome);

  if (outcome !== "TRANSFER") {
    delete next.transferRequestedAt;
    delete next.transferAcceptedAt;
    delete next.acceptingFacilityName;
    delete next.acceptingClinicianName;
    delete next.transferMode;
    delete next.transferReason;
  }
  if (outcome !== "AMA") {
    delete next.amaRiskDiscussionDocumented;
  }
  if (outcome !== "LWBS") {
    delete next.lwbsDocumentedAt;
  }

  Object.assign(next, emtalaOutcomeFieldsFromComplement(complement, outcome));
  if (params.persistAttestations === false) {
    delete next.msePerformed;
    delete next.emergencyConditionConsidered;
    delete next.stabilizingTreatmentProvidedOrNotApplicable;
  } else {
    applyTriStateAttestations(next, complement);
    if (params.derivedMsePerformed === true && complement.msePerformed === "") {
      next.msePerformed = true;
    }
  }

  if (prevE?.signature) {
    next.signature = prevE.signature;
  }

  const out = { ...alreadyMerged };
  if (erEmtalaV1HasAnyData(next) || (at != null && next.emtalaDispositionCategory)) {
    out[ER_EMTALA_V1_KEY] = next;
  } else {
    delete out[ER_EMTALA_V1_KEY];
  }
  return out;
}
