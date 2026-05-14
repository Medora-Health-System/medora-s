"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import type { ObservationReassessmentV1Body } from "@medora/shared";

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

export type ObservationReassessmentModalProps = {
  open: boolean;
  defaultRole: "PROVIDER" | "RN";
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ObservationReassessmentModal({
  open,
  defaultRole,
  encounterId,
  facilityId,
  onClose,
  onSaved,
}: ObservationReassessmentModalProps) {
  const { t } = useI18n();
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

  useEffect(() => {
    if (!open) return;
    setRole(defaultRole);
    setPatientStatus("unchanged");
    setSymptomsReviewed(true);
    setVitalsReviewed(true);
    setResultsReviewed(true);
    setPainControlled(true);
    setContinueObservation(true);
    setReadyForDischarge(false);
    setTransferConsidered(false);
    setNote("");
    setError(null);
    setSaving(false);
  }, [open, defaultRole]);

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
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || t("encounterChrome.observationReassessment.saveError"));
    } finally {
      setSaving(false);
    }
  }, [
    continueObservation,
    encounterId,
    facilityId,
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

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="obsReassessNote">
            {t("encounterChrome.observationReassessment.fieldNote")}
          </label>
          <textarea
            id="obsReassessNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
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
