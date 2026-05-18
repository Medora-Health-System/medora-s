"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import type { ObservationReassessmentV1Body } from "@medora/shared";
import { insertTextAtTextareaSelection } from "@/lib/insertTextAtTextareaSelection";
import {
  buildClinicalDraftKey,
  clinicalDraftPayloadSignature,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";

const OBS_REASSESS_NOTE_MAX = 2000;
const OBS_REASSESSMENT_DRAFT_VERSION = "observation-reassessment-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

import { OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS } from "@/features/observation/observationReassessmentOperationalPresets";

const QUICK_PHRASE_GROUPS = [
  {
    groupKey: "encounterChrome.observationReassessment.quickPhrases.groups.general",
    phraseIds: ["improvedContinue", "unchangedContinue", "worseningEscalation"] as const,
  },
  {
    groupKey: "encounterChrome.observationReassessment.quickPhrases.groups.clinical",
    phraseIds: ["chestPain", "dehydration", "sepsisWatch"] as const,
  },
  {
    groupKey: "encounterChrome.observationReassessment.quickPhrases.groups.disposition",
    phraseIds: ["readyDischarge"] as const,
  },
  {
    groupKey: "encounterChrome.observationReassessment.quickPhrases.groups.operational",
    phraseIds: OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS,
  },
] as const;

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box",
};

const panel: React.CSSProperties = {
  backgroundColor: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
  maxWidth: 520,
  width: "100%",
  padding: "20px 22px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

const chkRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
  marginBottom: 6,
};

const phraseChip: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  lineHeight: 1.3,
  textAlign: "left" as const,
};

export type ObservationReassessmentModalProps = {
  open: boolean;
  defaultRole: "PROVIDER" | "RN";
  encounterId: string;
  facilityId: string;
  encounterStatus?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type ObservationReassessmentDraftPayload = ObservationReassessmentV1Body;

function defaultObservationReassessmentPayload(role: "PROVIDER" | "RN"): ObservationReassessmentDraftPayload {
  return {
    role,
    patientStatus: "unchanged",
    symptomsReviewed: true,
    vitalsReviewed: true,
    resultsReviewed: true,
    painControlled: true,
    continueObservation: true,
    readyForDischarge: false,
    transferConsidered: false,
    note: "",
  };
}

function observationReassessmentPayloadSignature(payload: ObservationReassessmentDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

function observationReassessmentDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<ObservationReassessmentDraftPayload>;
  return observationReassessmentPayloadSignature(p as ObservationReassessmentDraftPayload) !==
    observationReassessmentPayloadSignature(defaultObservationReassessmentPayload((p.role as "PROVIDER" | "RN") ?? "PROVIDER"));
}

export function ObservationReassessmentModal({
  open,
  defaultRole,
  encounterId,
  facilityId,
  encounterStatus,
  onClose,
  onSaved,
}: ObservationReassessmentModalProps) {
  const { t, language } = useI18n();
  const [role, setRole] = useState<"PROVIDER" | "RN">(defaultRole);
  const [patientStatus, setPatientStatus] = useState<ObservationReassessmentV1Body["patientStatus"]>("unchanged");
  const [symptomsReviewed, setSymptomsReviewed] = useState(true);
  const [vitalsReviewed, setVitalsReviewed] = useState(true);
  const [resultsReviewed, setResultsReviewed] = useState(true);
  const [painControlled, setPainControlled] = useState(true);
  const [continueObservation, setContinueObservation] = useState(true);
  const [readyForDischarge, setReadyForDischarge] = useState(false);
  const [transferConsidered, setTransferConsidered] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: "OBSERVATION_REASSESSMENT",
      encounterId,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: `${OBS_REASSESSMENT_DRAFT_VERSION}:${defaultRole}`,
    }),
    [defaultRole, encounterId, facilityId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);
  const workflowEditable = open && (encounterStatus == null || encounterStatus === "OPEN");
  const currentPayload: ObservationReassessmentDraftPayload = useMemo(
    () => ({
      role,
      patientStatus,
      symptomsReviewed,
      vitalsReviewed,
      resultsReviewed,
      painControlled,
      continueObservation,
      readyForDischarge,
      transferConsidered,
      note,
    }),
    [
      continueObservation,
      note,
      painControlled,
      patientStatus,
      readyForDischarge,
      resultsReviewed,
      role,
      symptomsReviewed,
      transferConsidered,
      vitalsReviewed,
    ]
  );
  const defaultPayload = useMemo(() => defaultObservationReassessmentPayload(defaultRole), [defaultRole]);
  const draftDirty =
    observationReassessmentPayloadSignature(currentPayload) !== observationReassessmentPayloadSignature(defaultPayload);

  useEffect(() => {
    if (!open) return;
    const base = defaultObservationReassessmentPayload(defaultRole);
    setRole(base.role);
    setPatientStatus(base.patientStatus);
    setSymptomsReviewed(base.symptomsReviewed);
    setVitalsReviewed(base.vitalsReviewed);
    setResultsReviewed(base.resultsReviewed);
    setPainControlled(base.painControlled);
    setContinueObservation(base.continueObservation);
    setReadyForDischarge(base.readyForDischarge);
    setTransferConsidered(base.transferConsidered);
    setNote(base.note ?? "");
    setError(null);
    setSaving(false);
    setDraftRestoredAt(null);
    setDraftSavedLocallyAt(null);

    if (typeof window === "undefined" || restoredDraftKeyRef.current === draftKey) return;
    const draft = readClinicalDraft<ObservationReassessmentDraftPayload>(window.localStorage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: draftScope,
      workflowEditable,
      encounterStatus: encounterStatus ?? null,
      hasPayloadContent: observationReassessmentDraftHasContent,
    });
    restoredDraftKeyRef.current = draftKey;
    if (canRestore && draft) {
      setRole(draft.payload.role);
      setPatientStatus(draft.payload.patientStatus);
      setSymptomsReviewed(draft.payload.symptomsReviewed);
      setVitalsReviewed(draft.payload.vitalsReviewed);
      setResultsReviewed(draft.payload.resultsReviewed);
      setPainControlled(draft.payload.painControlled);
      setContinueObservation(draft.payload.continueObservation);
      setReadyForDischarge(draft.payload.readyForDischarge);
      setTransferConsidered(draft.payload.transferConsidered);
      setNote(draft.payload.note ?? "");
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, draftKey);
    }
  }, [defaultRole, draftKey, draftScope, encounterStatus, open, workflowEditable]);

  useEffect(() => {
    if (!workflowEditable) return;
    if (!draftDirty || !observationReassessmentDraftHasContent(currentPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      draftKey,
      createClinicalDraft({
        scope: draftScope,
        payload: currentPayload,
        savedLocallyAt,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [currentPayload, draftDirty, draftKey, draftScope, workflowEditable]);

  useClinicalBeforeUnloadWarning({
    dirty: draftDirty && Boolean(draftSavedLocallyAt),
    workflowEditable,
  });

  const submit = useCallback(async () => {
    setSaving(true);
    setError(null);
    const body: ObservationReassessmentV1Body = {
      role,
      patientStatus,
      symptomsReviewed,
      vitalsReviewed,
      resultsReviewed,
      painControlled,
      continueObservation,
      readyForDischarge,
      transferConsidered,
      note: note.trim() || undefined,
    };
    try {
      await apiFetch(`/encounters/${encounterId}/observation-reassessment`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        normalizeUserFacingError(msg, language) || t("encounterChrome.observationReassessment.saveError")
      );
    } finally {
      setSaving(false);
    }
  }, [
    continueObservation,
    encounterId,
    facilityId,
    draftKey,
    language,
    note,
    onClose,
    onSaved,
    painControlled,
    patientStatus,
    readyForDischarge,
    resultsReviewed,
    role,
    symptomsReviewed,
    t,
    transferConsidered,
    vitalsReviewed,
  ]);

  const insertPhraseText = useCallback(
    (phraseId: string) => {
      const text = t(`encounterChrome.observationReassessment.quickPhrases.${phraseId}.text`);
      const el = noteRef.current;
      const start = el ? el.selectionStart : note.length;
      const end = el ? el.selectionEnd : note.length;
      const { value, caret } = insertTextAtTextareaSelection(note, start, end, text, {
        maxLength: OBS_REASSESS_NOTE_MAX,
      });
      setNote(value);
      requestAnimationFrame(() => {
        const ta = noteRef.current;
        if (!ta) return;
        ta.focus();
        const c = Math.min(caret, value.length);
        ta.setSelectionRange(c, c);
      });
    },
    [note, t]
  );

  if (!open) return null;

  return (
    <div style={overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panel} role="dialog" aria-modal="true" aria-labelledby="obs-reassess-title">
        <h2 id="obs-reassess-title" style={{ margin: "0 0 12px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
          {t("encounterChrome.observationReassessment.title")}
        </h2>
        <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          {t("encounterChrome.observationReassessment.intro")}
        </p>
        {draftRestoredAt ? (
          <p role="status" style={{ margin: "0 0 8px 0", fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
            {t("encounterChrome.observationReassessment.localDraftRestored")}
          </p>
        ) : null}
        {draftSavedLocallyAt && draftDirty ? (
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b" }}>
            {t("encounterChrome.observationReassessment.localDraftSaved")}
          </p>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>{t("encounterChrome.observationReassessment.fieldRole")}</span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={chkRow}>
              <input
                type="radio"
                name="obsReassessRole"
                checked={role === "PROVIDER"}
                onChange={() => setRole("PROVIDER")}
              />
              {t("encounterChrome.observationReassessment.roleProvider")}
            </label>
            <label style={chkRow}>
              <input type="radio" name="obsReassessRole" checked={role === "RN"} onChange={() => setRole("RN")} />
              {t("encounterChrome.observationReassessment.roleRn")}
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle} htmlFor="obsReassessStatus">
            {t("encounterChrome.observationReassessment.fieldPatientStatus")}
          </label>
          <select
            id="obsReassessStatus"
            value={patientStatus}
            onChange={(e) => setPatientStatus(e.target.value as ObservationReassessmentV1Body["patientStatus"])}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              color: "#0f172a",
              backgroundColor: "#fff",
            }}
          >
            <option value="improved">{t("encounterChrome.observationReassessment.statusImproved")}</option>
            <option value="unchanged">{t("encounterChrome.observationReassessment.statusUnchanged")}</option>
            <option value="worsening">{t("encounterChrome.observationReassessment.statusWorsening")}</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>{t("encounterChrome.observationReassessment.fieldChecklist")}</span>
          <label style={chkRow}>
            <input type="checkbox" checked={symptomsReviewed} onChange={(e) => setSymptomsReviewed(e.target.checked)} />
            {t("encounterChrome.observationReassessment.chkSymptoms")}
          </label>
          <label style={chkRow}>
            <input type="checkbox" checked={vitalsReviewed} onChange={(e) => setVitalsReviewed(e.target.checked)} />
            {t("encounterChrome.observationReassessment.chkVitals")}
          </label>
          <label style={chkRow}>
            <input type="checkbox" checked={resultsReviewed} onChange={(e) => setResultsReviewed(e.target.checked)} />
            {t("encounterChrome.observationReassessment.chkResults")}
          </label>
          <label style={chkRow}>
            <input type="checkbox" checked={painControlled} onChange={(e) => setPainControlled(e.target.checked)} />
            {t("encounterChrome.observationReassessment.chkPain")}
          </label>
          <label style={chkRow}>
            <input
              type="checkbox"
              checked={continueObservation}
              onChange={(e) => setContinueObservation(e.target.checked)}
            />
            {t("encounterChrome.observationReassessment.chkContinue")}
          </label>
          <label style={chkRow}>
            <input
              type="checkbox"
              checked={readyForDischarge}
              onChange={(e) => setReadyForDischarge(e.target.checked)}
            />
            {t("encounterChrome.observationReassessment.chkDischarge")}
          </label>
          <label style={chkRow}>
            <input
              type="checkbox"
              checked={transferConsidered}
              onChange={(e) => setTransferConsidered(e.target.checked)}
            />
            {t("encounterChrome.observationReassessment.chkTransfer")}
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>{t("encounterChrome.observationReassessment.quickPhrases.title")}</div>
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45, fontWeight: 600 }}>
            {t("encounterChrome.observationReassessment.quickPhrases.reviewHint")}
          </p>
          {QUICK_PHRASE_GROUPS.map((g) => (
            <div key={g.groupKey} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>{t(g.groupKey)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {g.phraseIds.map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    title={t(`encounterChrome.observationReassessment.quickPhrases.${pid}.text`)}
                    onClick={() => insertPhraseText(pid)}
                    disabled={saving}
                    style={{
                      ...phraseChip,
                      opacity: saving ? 0.55 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {t(`encounterChrome.observationReassessment.quickPhrases.${pid}.btn`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="obsReassessNote">
            {t("encounterChrome.observationReassessment.fieldNote")}
          </label>
          <textarea
            id="obsReassessNote"
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={OBS_REASSESS_NOTE_MAX}
            placeholder={t("encounterChrome.observationReassessment.notePlaceholder")}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              color: "#0f172a",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              color: "#334155",
            }}
          >
            {t("encounterChrome.observationReassessment.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              background: saving ? "#94a3b8" : "#4f46e5",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("encounterChrome.observationReassessment.saving") : t("encounterChrome.observationReassessment.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
