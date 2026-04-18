/**
 * EMTALA compliance log V1 — stored under `Encounter.nursingAssessment.erEmtalaV1` (Json).
 * Persists via existing PATCH /encounters/:id. No DB migration. Does not modify clinical MSE / triage / disposition logic.
 * User-entered fields only; no server-side inference in this module.
 */

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
 */
export function deriveEmtalaReadonlySummary(stored: ErEmtalaV1Stored | null): EmtalaReadonlySummary {
  if (!stored) return { kind: "none" };
  if (stored.emtalaStatus) {
    return { kind: "status", status: stored.emtalaStatus };
  }
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
  return { kind: "none" };
}
