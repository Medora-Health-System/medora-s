"use client";

/**
 * MEDUI.D5A.5B — Inline enterprise medical history authoring inside Dental.
 * Reuses Patient clinical-history-profile APIs — no DentalMedicalHistory.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { D5A5B_CERTIFICATION_ID } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { PatientClinicalHistoryProfileBlock } from "@/components/patient-chart/PatientClinicalHistoryProfileBlock";
import {
  patientClinicalHistoryProfileFromJson,
  type PatientClinicalHistoryProfile,
} from "@/features/emergency/patientClinicalHistoryProfile";
import { InpatientAllergyEditorModal } from "@/features/inpatient-workspace/InpatientClinicalStatusEditors";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type Props = {
  patientId: string;
  encounterId: string;
  facilityId: string;
  canEdit: boolean;
  canReview: boolean;
  readOnlyReasonLabel?: string | null;
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  padding: 8,
  fontSize: 13,
  fontFamily: "inherit",
};

export function EnterpriseDentalMedicalHistoryPanel({
  patientId,
  encounterId,
  facilityId,
  canEdit,
  canReview,
  readOnlyReasonLabel,
}: Props) {
  const { t, language } = useI18n();
  const [profile, setProfile] = useState<PatientClinicalHistoryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [allergyOpen, setAllergyOpen] = useState(false);

  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [pastSurgicalHistory, setPastSurgicalHistory] = useState("");
  const [medicationsSummary, setMedicationsSummary] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");
  const [alcoholUse, setAlcoholUse] = useState("");
  const [historySocialComments, setHistorySocialComments] = useState("");

  const [historyReviewed, setHistoryReviewed] = useState(false);
  const [historyReviewNotes, setHistoryReviewNotes] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRaw, clinical] = await Promise.all([
        apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile`, {
          facilityId,
        }),
        apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/clinical-record`, {
          facilityId,
        }).catch(() => null),
      ]);
      const parsed = patientClinicalHistoryProfileFromJson(profileRaw);
      setProfile(parsed);
      setPastMedicalHistory(parsed?.medicalHistory?.pastMedicalHistory ?? "");
      setPastSurgicalHistory(parsed?.surgicalHistory?.pastSurgicalHistory ?? "");
      setMedicationsSummary(parsed?.homeMedications?.medicationsSummary ?? "");
      setSmokingStatus(parsed?.socialHistory?.smokingStatus ?? "");
      setAlcoholUse(parsed?.socialHistory?.alcoholUse ?? "");
      setHistorySocialComments(parsed?.socialHistory?.historySocialComments ?? "");
      setDirty(false);
      const hr = (clinical as { historyReview?: { reviewed?: boolean; notes?: string | null } } | null)
        ?.historyReview;
      setHistoryReviewed(Boolean(hr?.reviewed));
      setHistoryReviewNotes(String(hr?.notes ?? ""));
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setLoading(false);
    }
  }, [patientId, encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const markDirty = () => {
    setDirty(true);
    setSavedAt(null);
  };

  const saveEnterpriseHistory = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/medicalHistory`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { pastMedicalHistory }, encounterId }),
      });
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/surgicalHistory`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { pastSurgicalHistory }, encounterId }),
      });
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/homeMedications`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { medicationsSummary }, encounterId }),
      });
      // Tobacco/alcohol/comments merge into socialHistory — sequential to avoid races.
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/tobacco`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { smokingStatus }, encounterId }),
      });
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/alcohol`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { alcoholUse }, encounterId }),
      });
      await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/socialHistory`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ value: { historySocialComments }, encounterId }),
      });
      setDirty(false);
      setSavedAt(new Date().toISOString());
      await load();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setSaving(false);
    }
  };

  const saveHistoryReview = async (reviewed: boolean) => {
    if (!canReview || reviewSaving) return;
    setReviewSaving(true);
    setError(null);
    try {
      await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/history-review`, {
        method: "PUT",
        facilityId,
        body: JSON.stringify({ reviewed, notes: historyReviewNotes || null }),
      });
      setHistoryReviewed(reviewed);
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("dentalCareD5a5.history.reviewError")
      );
    } finally {
      setReviewSaving(false);
    }
  };

  const allergySummary =
    profile?.allergies?.entries
      ?.filter((e) => e.status !== "INACTIVE")
      .map((e) => e.substance)
      .filter(Boolean)
      .join(", ") ||
    [profile?.allergies?.medicationAllergiesDetail, profile?.allergies?.allergyNote]
      .filter(Boolean)
      .join(" · ") ||
    null;

  const medsSummary = medicationsSummary.trim() || profile?.homeMedications?.medicationsSummary?.trim() || null;

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div
      data-testid="dental-medical-history-panel"
      data-certification={D5A5B_CERTIFICATION_ID}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.history.inlineHelp")}</p>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 8,
            fontSize: 13,
          }}
        >
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>
              {t("dentalCareD5a5.history.allergiesLabel")}
            </div>
            <div style={{ marginTop: 4 }}>{allergySummary || t("dentalCareD5a5.notDocumented")}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>
              {t("dentalCareD5a5.history.medicationsLabel")}
            </div>
            <div style={{ marginTop: 4 }}>{medsSummary || t("dentalCareD5a5.notDocumented")}</div>
          </div>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setAllergyOpen(true)}
            style={{
              marginTop: 10,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("dentalCareD5a5.history.editAllergies")}
          </button>
        ) : null}
      </div>

      {!canEdit && readOnlyReasonLabel ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{readOnlyReasonLabel}</p>
      ) : null}

      <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          {t("dentalCareD5a5.history.pmh")}
          <textarea
            value={pastMedicalHistory}
            disabled={!canEdit || saving}
            onChange={(e) => {
              setPastMedicalHistory(e.target.value);
              markDirty();
            }}
            rows={3}
            style={{ ...fieldStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          {t("dentalCareD5a5.history.psh")}
          <textarea
            value={pastSurgicalHistory}
            disabled={!canEdit || saving}
            onChange={(e) => {
              setPastSurgicalHistory(e.target.value);
              markDirty();
            }}
            rows={2}
            style={{ ...fieldStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          {t("dentalCareD5a5.history.homeMeds")}
          <textarea
            value={medicationsSummary}
            disabled={!canEdit || saving}
            onChange={(e) => {
              setMedicationsSummary(e.target.value);
              markDirty();
            }}
            rows={2}
            style={{ ...fieldStyle, marginTop: 4 }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            {t("dentalCareD5a5.history.tobacco")}
            <input
              value={smokingStatus}
              disabled={!canEdit || saving}
              onChange={(e) => {
                setSmokingStatus(e.target.value);
                markDirty();
              }}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            {t("dentalCareD5a5.history.alcohol")}
            <input
              value={alcoholUse}
              disabled={!canEdit || saving}
              onChange={(e) => {
                setAlcoholUse(e.target.value);
                markDirty();
              }}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
        </div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          {t("dentalCareD5a5.history.socialComments")}
          <textarea
            value={historySocialComments}
            disabled={!canEdit || saving}
            onChange={(e) => {
              setHistorySocialComments(e.target.value);
              markDirty();
            }}
            rows={2}
            style={{ ...fieldStyle, marginTop: 4 }}
          />
        </label>

        {canEdit ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void saveEnterpriseHistory()}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                background: dirty ? "#0f172a" : "#94a3b8",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving || !dirty ? "not-allowed" : "pointer",
              }}
            >
              {saving ? t("common.loading") : t("dentalCareD5a5.history.saveEnterprise")}
            </button>
            {dirty ? (
              <span style={{ fontSize: 12, color: "#b45309" }}>{t("dentalCareD5a5.history.unsaved")}</span>
            ) : null}
            {savedAt && !dirty ? (
              <span style={{ fontSize: 12, color: "#15803d" }}>{t("dentalCareD5a5.history.saved")}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>{t("dentalCareD5a5.history.reviewTitle")}</p>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.history.reviewHelp")}</p>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={historyReviewed}
            disabled={!canReview || reviewSaving}
            onChange={(e) => void saveHistoryReview(e.target.checked)}
          />
          <span>{t("dentalCareD5a5.history.reviewedCheckbox")}</span>
        </label>
        <textarea
          value={historyReviewNotes}
          disabled={!canReview}
          onChange={(e) => setHistoryReviewNotes(e.target.value)}
          onBlur={() => {
            if (historyReviewed) void saveHistoryReview(true);
          }}
          rows={2}
          placeholder={t("dentalCareD5a5.history.reviewNotesPlaceholder")}
          style={{ ...fieldStyle, marginTop: 8 }}
        />
      </div>

      <PatientClinicalHistoryProfileBlock profile={profile} />

      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href={`/app/patients/${encodeURIComponent(patientId)}`} style={{ color: "#0f766e", fontWeight: 600 }}>
          {t("dentalCareD5a5.history.openFullRecord")}
        </Link>
      </p>

      {error ? (
        <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      <InpatientAllergyEditorModal
        open={allergyOpen}
        onClose={() => setAllergyOpen(false)}
        encounterId={encounterId}
        facilityId={facilityId}
        patientId={patientId}
        onSaved={async () => {
          setAllergyOpen(false);
          await load();
        }}
      />
    </div>
  );
}
