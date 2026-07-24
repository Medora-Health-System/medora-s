/**
 * ER handoff V1 — additive JSON under `Encounter.nursingAssessment.erHandoffV1`.
 * Shared by API (transfer gating) and web (merge/read). No DB migration.
 */

export const ER_HANDOFF_V1_KEY = "erHandoffV1" as const;

export type ErHandoffHistoryEntry = {
  at: string;
  byDisplayName?: string;
  receivingNurseName?: string;
  receivingUnit?: string;
  reportGivenTo?: string;
  careTransferred?: boolean;
  notePreview?: string;
};

export type ErHandoffV1Stored = {
  reportGiven?: boolean;
  /** ISO 8601 timestamp string */
  reportGivenAt?: string;
  receivingNurseName?: string;
  /** When set, must reference an active RN at the facility (server-validated on save). */
  receivingNurseUserId?: string;
  handoffNote?: string;
  readyForInpatientTransfer?: boolean;
  providerDispositionCompleted?: boolean;
  nurseDocumentationCompleted?: boolean;
  acceptingPhysicianSelected?: boolean;
  reportGivenToReceivingUnit?: boolean;
  /** ISO 8601 — last explicit handoff save (additive accountability). */
  handoffLastSavedAt?: string;
  handoffLastSavedByDisplayName?: string;
  /** D4A.3.3A — receiving unit / report given to / care transferred / e-signature. */
  receivingUnit?: string;
  reportGivenTo?: string;
  careTransferred?: boolean;
  electronicSignatureName?: string;
  electronicSignatureAt?: string;
  /** Append-only handoff history snapshots (max 40). */
  history?: ErHandoffHistoryEntry[];
};

const MAX_NOTE = 2000;
const MAX_NAME = 256;
const MAX_DISPLAY = 256;
const MAX_ISO = 40;

function trimUuid(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) {
    return undefined;
  }
  return t;
}

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
  const rnu = trimUuid(o.receivingNurseUserId);
  if (rnu) out.receivingNurseUserId = rnu;
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
  const unit = trimStr(o.receivingUnit, MAX_NAME);
  if (unit) out.receivingUnit = unit;
  const givenTo = trimStr(o.reportGivenTo, MAX_NAME);
  if (givenTo) out.reportGivenTo = givenTo;
  const ct = readBool(o.careTransferred);
  if (ct !== undefined) out.careTransferred = ct;
  const sig = trimStr(o.electronicSignatureName, MAX_DISPLAY);
  if (sig) out.electronicSignatureName = sig;
  const sigAt = trimStr(o.electronicSignatureAt, MAX_ISO);
  if (sigAt) out.electronicSignatureAt = sigAt;
  if (Array.isArray(o.history)) {
    const history: ErHandoffHistoryEntry[] = [];
    for (const row of o.history.slice(0, 40)) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const h = row as Record<string, unknown>;
      const at = trimStr(h.at, MAX_ISO);
      if (!at) continue;
      history.push({
        at,
        byDisplayName: trimStr(h.byDisplayName, MAX_DISPLAY),
        receivingNurseName: trimStr(h.receivingNurseName, MAX_NAME),
        receivingUnit: trimStr(h.receivingUnit, MAX_NAME),
        reportGivenTo: trimStr(h.reportGivenTo, MAX_NAME),
        careTransferred: readBool(h.careTransferred),
        notePreview: trimStr(h.notePreview, 180),
      });
    }
    if (history.length) out.history = history;
  }

  return out;
}

function sanitizeForPersist(form: ErHandoffV1Stored): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.reportGiven === true || form.reportGiven === false) out.reportGiven = form.reportGiven;
  const rga = trimStr(form.reportGivenAt, MAX_ISO);
  if (rga) out.reportGivenAt = rga;
  const rn = trimStr(form.receivingNurseName, MAX_NAME);
  if (rn) out.receivingNurseName = rn;
  const rnu = trimUuid(form.receivingNurseUserId);
  if (rnu) out.receivingNurseUserId = rnu;
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
  const unit = trimStr(form.receivingUnit, MAX_NAME);
  if (unit) out.receivingUnit = unit;
  const givenTo = trimStr(form.reportGivenTo, MAX_NAME);
  if (givenTo) out.reportGivenTo = givenTo;
  if (form.careTransferred === true || form.careTransferred === false) {
    out.careTransferred = form.careTransferred;
  }
  const sig = trimStr(form.electronicSignatureName, MAX_DISPLAY);
  if (sig) out.electronicSignatureName = sig;
  const sigAt = trimStr(form.electronicSignatureAt, MAX_ISO);
  if (sigAt) out.electronicSignatureAt = sigAt;
  if (Array.isArray(form.history) && form.history.length) {
    out.history = form.history.slice(0, 40).map((h) => ({
      at: String(h.at ?? "").slice(0, MAX_ISO),
      byDisplayName: h.byDisplayName,
      receivingNurseName: h.receivingNurseName,
      receivingUnit: h.receivingUnit,
      reportGivenTo: h.reportGivenTo,
      careTransferred: h.careTransferred,
      notePreview: h.notePreview,
    }));
  }
  return out;
}

/** Append a history snapshot when saving a handoff (keeps last 40). */
export function appendErHandoffHistory(
  previous: ErHandoffV1Stored,
  next: ErHandoffV1Stored,
  byDisplayName?: string | null
): ErHandoffV1Stored {
  const at = next.handoffLastSavedAt || next.reportGivenAt || new Date().toISOString();
  const entry: ErHandoffHistoryEntry = {
    at,
    byDisplayName: byDisplayName?.trim() || next.handoffLastSavedByDisplayName,
    receivingNurseName: next.receivingNurseName,
    receivingUnit: next.receivingUnit,
    reportGivenTo: next.reportGivenTo,
    careTransferred: next.careTransferred,
    notePreview: next.handoffNote?.trim().slice(0, 180),
  };
  const history = [...(previous.history ?? []), entry].slice(-40);
  return { ...next, history };
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
