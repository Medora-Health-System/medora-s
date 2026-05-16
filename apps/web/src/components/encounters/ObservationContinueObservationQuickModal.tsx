"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import type { ObservationReassessmentV1Body } from "@medora/shared";

const NOTE_MAX = 2000;

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 85,
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
  maxWidth: 480,
  width: "100%",
  padding: "20px 22px",
  boxSizing: "border-box",
};

export type ObservationContinueObservationQuickModalProps = {
  open: boolean;
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

/**
 * Provider-only quick path: documents intent to continue observation via the same
 * `POST /encounters/:id/observation-reassessment` pipeline (clinical event + audit).
 * No billing or encounter status change.
 */
export function ObservationContinueObservationQuickModal({
  open,
  encounterId,
  facilityId,
  onClose,
  onSaved,
}: ObservationContinueObservationQuickModalProps) {
  const { t, language } = useI18n();
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRationale("");
    setError(null);
    setSaving(false);
  }, [open]);

  const submit = useCallback(async () => {
    const note = rationale.trim();
    if (!note) return;
    setSaving(true);
    setError(null);
    const body: ObservationReassessmentV1Body = {
      role: "PROVIDER",
      patientStatus: "unchanged",
      symptomsReviewed: true,
      vitalsReviewed: true,
      resultsReviewed: true,
      painControlled: true,
      continueObservation: true,
      readyForDischarge: false,
      transferConsidered: false,
      note: note.slice(0, NOTE_MAX),
    };
    try {
      await apiFetch(`/encounters/${encounterId}/observation-reassessment`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        normalizeUserFacingError(msg, language) || t("encounterChrome.continueObservationQuick.saveError")
      );
    } finally {
      setSaving(false);
    }
  }, [encounterId, facilityId, language, onClose, onSaved, rationale, t]);

  if (!open) return null;

  return (
    <div style={overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panel} role="dialog" aria-modal="true" aria-labelledby="continue-obs-title">
        <h2 id="continue-obs-title" style={{ margin: "0 0 10px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
          {t("encounterChrome.continueObservationQuick.title")}
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
          {t("encounterChrome.continueObservationQuick.intro")}
        </p>
        <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45, fontWeight: 600 }}>
          {t("encounterChrome.continueObservationQuick.reviewHint")}
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
          {t("encounterChrome.continueObservationQuick.rationaleLabel")}
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            maxLength={NOTE_MAX}
            placeholder={t("encounterChrome.continueObservationQuick.placeholder")}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              color: "#0f172a",
              resize: "vertical",
              boxSizing: "border-box",
              fontWeight: 400,
            }}
          />
        </label>
        {error ? (
          <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
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
            {t("encounterChrome.continueObservationQuick.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !rationale.trim()}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              background: saving || !rationale.trim() ? "#94a3b8" : "#4f46e5",
              color: "#fff",
              cursor: saving || !rationale.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("encounterChrome.continueObservationQuick.saving") : t("encounterChrome.continueObservationQuick.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
