/**
 * ER handoff V1 — additive JSON under `Encounter.nursingAssessment.erHandoffV1`.
 * Shared by API (transfer gating) and web (merge/read). No DB migration.
 */

export const ER_HANDOFF_V1_KEY = "erHandoffV1" as const;

export type ErHandoffV1Stored = {
  reportGiven?: boolean;
  /** ISO 8601 timestamp string */
  reportGivenAt?: string;
  receivingNurseName?: string;
  handoffNote?: string;
  readyForInpatientTransfer?: boolean;
  providerDispositionCompleted?: boolean;
  nurseDocumentationCompleted?: boolean;
  acceptingPhysicianSelected?: boolean;
  reportGivenToReceivingUnit?: boolean;
  /** ISO 8601 — last explicit handoff save (additive accountability). */
  handoffLastSavedAt?: string;
  handoffLastSavedByDisplayName?: string;
};

const MAX_NOTE = 2000;
const MAX_NAME = 256;
const MAX_DISPLAY = 256;
const MAX_ISO = 40;

function trimStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function readBool(v: unknown): boolean | undefined {
  if (v === true) return true;
  if (v === false) return false;
  return undefined;
}

/**
 * Safe read for forms and API checks — missing blob yields empty object (all undefined).
 */
export function readErHandoffV1FromNursingAssessment(nursingAssessment: unknown): ErHandoffV1Stored {
  const out: ErHandoffV1Stored = {};
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return out;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_HANDOFF_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;

  const rg = readBool(o.reportGiven);
  if (rg !== undefined) out.reportGiven = rg;
  const rga = trimStr(o.reportGivenAt, MAX_ISO);
  if (rga) out.reportGivenAt = rga;
  const rn = trimStr(o.receivingNurseName, MAX_NAME);
  if (rn) out.receivingNurseName = rn;
  const hn = trimStr(o.handoffNote, MAX_NOTE);
  if (hn) out.handoffNote = hn;
  const rft = readBool(o.readyForInpatientTransfer);
  if (rft !== undefined) out.readyForInpatientTransfer = rft;
  const pdc = readBool(o.providerDispositionCompleted);
  if (pdc !== undefined) out.providerDispositionCompleted = pdc;
  const ndc = readBool(o.nurseDocumentationCompleted);
  if (ndc !== undefined) out.nurseDocumentationCompleted = ndc;
  const aps = readBool(o.acceptingPhysicianSelected);
  if (aps !== undefined) out.acceptingPhysicianSelected = aps;
  const rgr = readBool(o.reportGivenToReceivingUnit);
  if (rgr !== undefined) out.reportGivenToReceivingUnit = rgr;
  const hlsa = trimStr(o.handoffLastSavedAt, MAX_ISO);
  if (hlsa) out.handoffLastSavedAt = hlsa;
  const hlsn = trimStr(o.handoffLastSavedByDisplayName, MAX_DISPLAY);
  if (hlsn) out.handoffLastSavedByDisplayName = hlsn;

  return out;
}

function sanitizeForPersist(form: ErHandoffV1Stored): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.reportGiven === true || form.reportGiven === false) out.reportGiven = form.reportGiven;
  const rga = trimStr(form.reportGivenAt, MAX_ISO);
  if (rga) out.reportGivenAt = rga;
  const rn = trimStr(form.receivingNurseName, MAX_NAME);
  if (rn) out.receivingNurseName = rn;
  const hn = trimStr(form.handoffNote, MAX_NOTE);
  if (hn) out.handoffNote = hn;
  if (form.readyForInpatientTransfer === true || form.readyForInpatientTransfer === false) {
    out.readyForInpatientTransfer = form.readyForInpatientTransfer;
  }
  if (form.providerDispositionCompleted === true || form.providerDispositionCompleted === false) {
    out.providerDispositionCompleted = form.providerDispositionCompleted;
  }
  if (form.nurseDocumentationCompleted === true || form.nurseDocumentationCompleted === false) {
    out.nurseDocumentationCompleted = form.nurseDocumentationCompleted;
  }
  if (form.acceptingPhysicianSelected === true || form.acceptingPhysicianSelected === false) {
    out.acceptingPhysicianSelected = form.acceptingPhysicianSelected;
  }
  if (form.reportGivenToReceivingUnit === true || form.reportGivenToReceivingUnit === false) {
    out.reportGivenToReceivingUnit = form.reportGivenToReceivingUnit;
  }
  const hlsa = trimStr(form.handoffLastSavedAt, MAX_ISO);
  if (hlsa) out.handoffLastSavedAt = hlsa;
  const hlsn = trimStr(form.handoffLastSavedByDisplayName, MAX_DISPLAY);
  if (hlsn) out.handoffLastSavedByDisplayName = hlsn;
  return out;
}

/**
 * Merges handoff into nursingAssessment JSON; preserves other keys (erDispositionV1, etc.).
 */
export function mergeErHandoffV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErHandoffV1Stored
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const persisted = sanitizeForPersist(form);
  if (Object.keys(persisted).length === 0) {
    delete base[ER_HANDOFF_V1_KEY];
  } else {
    base[ER_HANDOFF_V1_KEY] = persisted;
  }
  return base;
}

/**
 * Transfer gating (API + UI): explicit handoff readiness — report documented OR ready flag.
 * Does not infer from other nursing documentation.
 */
export function erHandoffV1SatisfiesInpatientTransferConfirm(nursingAssessment: unknown): boolean {
  const h = readErHandoffV1FromNursingAssessment(nursingAssessment);
  if (h.reportGiven === true) return true;
  if (h.readyForInpatientTransfer === true) return true;
  return false;
}

export function erHandoffV1HasPersistedBlob(nursingAssessment: unknown): boolean {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return false;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_HANDOFF_V1_KEY];
  return raw !== undefined && raw !== null && typeof raw === "object" && !Array.isArray(raw);
}
