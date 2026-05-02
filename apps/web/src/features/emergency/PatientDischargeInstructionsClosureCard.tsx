"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  hydrateDischargeFormFromEncounterJson,
  hydratePatientDischargeInstructionsSlice,
  mergeDischargeForSave,
  type PatientDischargeInstructionsSlice,
} from "@/lib/encounterDischarge";
import { MedoraCard, MedoraCardInner, MedoraCardTitle } from "@/components/medora-card";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

const taStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 12,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  color: "#0f172a",
  resize: "vertical",
  minHeight: 44,
  boxSizing: "border-box",
};

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 8,
};

type FieldRowProps = {
  labelKey: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  rows?: number;
};

function FieldRow({ labelKey, value, onChange, disabled, rows = 2 }: FieldRowProps) {
  const { t } = useI18n();
  return (
    <div style={{ minWidth: 0 }}>
      <label style={labelStyle}>{t(labelKey)}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        style={taStyle}
      />
    </div>
  );
}

export function PatientDischargeInstructionsClosureCard({
  encounterId,
  facilityId,
  dischargeSummaryJson,
  encounterStatus,
  canEditNursingDischarge,
  canEditMedicalDischarge,
  onSaved,
  formDisabled = false,
}: {
  encounterId: string;
  facilityId: string;
  dischargeSummaryJson: unknown;
  encounterStatus: string | null | undefined;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
  onSaved: () => void | Promise<void>;
  /** When true (e.g. disposition panel locked), fields and save are read-only. */
  formDisabled?: boolean;
}) {
  const { t, language } = useI18n();
  const [slice, setSlice] = useState<PatientDischargeInstructionsSlice>(() =>
    hydratePatientDischargeInstructionsSlice(dischargeSummaryJson)
  );
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [saveInfoIsError, setSaveInfoIsError] = useState(false);
  const [signerDisplay, setSignerDisplay] = useState("");

  const canEdit =
    !formDisabled &&
    (encounterStatus ?? "") === "OPEN" &&
    (canEditNursingDischarge || canEditMedicalDischarge);

  useEffect(() => {
    setSlice(hydratePatientDischargeInstructionsSlice(dischargeSummaryJson));
  }, [dischargeSummaryJson]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (cancelled) return;
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) setSignerDisplay(fn);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSlice = useCallback((patch: Partial<PatientDischargeInstructionsSlice>) => {
    setSlice((s) => ({ ...s, ...patch }));
  }, []);

  const handleGivenChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSlice((s) => ({
          ...s,
          patientInstructionsGiven: true,
          instructionsGivenAt: s.instructionsGivenAt || new Date().toISOString(),
          instructionsGivenBy: s.instructionsGivenBy?.trim() || signerDisplay || "",
        }));
      } else {
        setSlice((s) => ({
          ...s,
          patientInstructionsGiven: false,
          instructionsGivenBy: "",
          instructionsGivenAt: "",
        }));
      }
    },
    [signerDisplay]
  );

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveInfo(null);
    setSaveInfoIsError(false);
    try {
      const base = hydrateDischargeFormFromEncounterJson(dischargeSummaryJson);
      const merged = mergeDischargeForSave(
        dischargeSummaryJson,
        { ...base, ...slice },
        canEditNursingDischarge,
        canEditMedicalDischarge
      );
      if (merged === null) {
        setSaveInfoIsError(true);
        setSaveInfo(t("patientDischargeInstructions.saveNothing"));
        return;
      }
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeSummaryJson: merged }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await Promise.resolve(onSaved());
      setSaveInfoIsError(false);
      setSaveInfo(queued ? t("patientDischargeInstructions.saveQueued") : t("patientDischargeInstructions.saveOk"));
    } catch (e) {
      setSaveInfoIsError(true);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("patientDischargeInstructions.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MedoraCard leftAccentColor="#0369a1" variant="default">
      <MedoraCardInner>
        <MedoraCardTitle title={t("patientDischargeInstructions.cardTitle")} />
        <p style={{ margin: "6px 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
          {t("patientDischargeInstructions.cardHint")}
        </p>
        <div style={fieldGrid}>
          <FieldRow
            labelKey="patientDischargeInstructions.dischargeDiagnosisSummary"
            value={slice.dischargeDiagnosisSummary}
            onChange={(v) => patchSlice({ dischargeDiagnosisSummary: v })}
            disabled={!canEdit}
          />
          <FieldRow
            labelKey="patientDischargeInstructions.medicationInstructions"
            value={slice.medicationInstructions}
            onChange={(v) => patchSlice({ medicationInstructions: v })}
            disabled={!canEdit}
            rows={3}
          />
          <FieldRow
            labelKey="patientDischargeInstructions.returnPrecautions"
            value={slice.returnPrecautions}
            onChange={(v) => patchSlice({ returnPrecautions: v })}
            disabled={!canEdit}
          />
          <FieldRow
            labelKey="patientDischargeInstructions.followUpInstructions"
            value={slice.followUpInstructions}
            onChange={(v) => patchSlice({ followUpInstructions: v })}
            disabled={!canEdit}
          />
          <FieldRow
            labelKey="patientDischargeInstructions.activityInstructions"
            value={slice.activityInstructions}
            onChange={(v) => patchSlice({ activityInstructions: v })}
            disabled={!canEdit}
          />
          <FieldRow
            labelKey="patientDischargeInstructions.woundCareInstructions"
            value={slice.woundCareInstructions}
            onChange={(v) => patchSlice({ woundCareInstructions: v })}
            disabled={!canEdit}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldRow
              labelKey="patientDischargeInstructions.workSchoolNote"
              value={slice.workSchoolNote}
              onChange={(v) => patchSlice({ workSchoolNote: v })}
              disabled={!canEdit}
              rows={2}
            />
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              cursor: canEdit ? "pointer" : "default",
              fontSize: 12,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            <input
              type="checkbox"
              checked={slice.patientInstructionsGiven}
              disabled={!canEdit}
              onChange={(e) => handleGivenChange(e.target.checked)}
            />
            <span>{t("patientDischargeInstructions.givenCheckbox")}</span>
          </label>
          {slice.patientInstructionsGiven && (slice.instructionsGivenBy || slice.instructionsGivenAt) ? (
            <p style={{ margin: "8px 0 0 24px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {slice.instructionsGivenBy ? (
                <>
                  {t("patientDischargeInstructions.givenBy")} {slice.instructionsGivenBy}
                  {slice.instructionsGivenAt ? " · " : ""}
                </>
              ) : null}
              {slice.instructionsGivenAt
                ? `${t("patientDischargeInstructions.givenAt")} ${new Date(slice.instructionsGivenAt).toLocaleString(language === "en" ? "en-US" : "fr-FR")}`
                : null}
            </p>
          ) : null}
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canEdit || saving}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #0369a1",
              backgroundColor: canEdit && !saving ? "#0369a1" : "#e2e8f0",
              color: canEdit && !saving ? "#fff" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: canEdit && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? t("common.loading") : t("patientDischargeInstructions.save")}
          </button>
          {saveInfo ? (
            <span style={{ fontSize: 12, color: saveInfoIsError ? "#b91c1c" : "#15803d" }}>{saveInfo}</span>
          ) : null}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
