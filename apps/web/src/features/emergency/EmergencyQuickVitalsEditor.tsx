"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { temperatureHintPairCelsiusFahrenheit, weightHintPairKgPounds } from "@medora/shared";
import { flipHeightInputMode } from "@/lib/vitalsEntryFlip";
import {
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import { erTriageV1FormFromVitalsJson } from "./medoraErTriageV1";

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  backgroundColor: "#fff",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8,
};

type Draft = {
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
  heightFeet: string;
  heightInches: string;
  allergyNote: string;
};

function draftFromTriage(triage: Record<string, unknown> | null, language: "en" | "fr"): Draft {
  const parsed = triagePreviewSliceFromTriageGet(triage, language);
  if (!parsed) {
    return {
      tempC: "",
      hr: "",
      rr: "",
      bpSys: "",
      bpDia: "",
      spo2: "",
      weightKg: "",
      heightCm: "",
      tempInputUnit: "C",
      weightInputUnit: "kg",
      heightInputMode: "cm",
      heightFeet: "",
      heightInches: "",
      allergyNote: "",
    };
  }
  const s = parsed.slice;
  return {
    tempC: s.tempC,
    hr: s.hr,
    rr: s.rr,
    bpSys: s.bpSys,
    bpDia: s.bpDia,
    spo2: s.spo2,
    weightKg: s.weightKg,
    heightCm: s.heightCm,
    tempInputUnit: s.tempInputUnit ?? "C",
    weightInputUnit: s.weightInputUnit ?? "kg",
    heightInputMode: s.heightInputMode ?? "cm",
    heightFeet: s.heightFeet ?? "",
    heightInches: s.heightInches ?? "",
    allergyNote: s.allergyNote,
  };
}

export function EmergencyQuickVitalsEditor({
  open,
  onClose,
  encounterId,
  facilityId,
  patientId,
  triageSnapshot,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  triageSnapshot: Record<string, unknown> | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => draftFromTriage(triageSnapshot, language));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(draftFromTriage(triageSnapshot, language));
      setMsg(null);
    }
  }, [open, triageSnapshot, language]);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const latestRaw = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
      const latest =
        latestRaw && typeof latestRaw === "object" && !Array.isArray(latestRaw)
          ? (latestRaw as Record<string, unknown>)
          : null;
      if (!latest) {
        setMsg(normalizeUserFacingError(null) || t("erQuickVitals.saveError"));
        return;
      }

      const erV1 = erTriageV1FormFromVitalsJson(latest.vitalsJson);
      const vitalsMerged = mergeVitalsJsonForSave(latest.vitalsJson, {
        ...draft,
        erV1,
      });

      const strokeJson = strokeScreenFormToJson(
        strokeScreenFromUnknown(latest.strokeScreen),
        latest.strokeScreen
      );
      const sepsisJson = sepsisScreenFormToJson(
        sepsisScreenFromUnknown(latest.sepsisScreen),
        latest.sepsisScreen
      );
      const strokeScreenParsed = Object.keys(strokeJson).length > 0 ? strokeJson : null;
      const sepsisScreenParsed = Object.keys(sepsisJson).length > 0 ? sepsisJson : null;

      const payload: Record<string, unknown> = {
        chiefComplaint: (latest.chiefComplaint as string | undefined)?.trim() || null,
        onsetAt: latest.onsetAt ? new Date(latest.onsetAt as string).toISOString() : null,
        esi: latest.esi != null ? parseInt(String(latest.esi), 10) : null,
        vitalsJson: vitalsMerged,
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: latest.triageCompleteAt
          ? new Date(latest.triageCompleteAt as string).toISOString()
          : null,
      };

      const res = await apiFetch(`/encounters/${encounterId}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      if (patientId && latest && hasVitalsJson(latest.vitalsJson) && latest.id) {
        const u = latest.updatedAt;
        const supersededSnapshot: PatientTriageVitalsSnapshot = {
          encounterId,
          encounterType: "EMERGENCY",
          triageId: latest.id as string,
          updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
          triageCompleteAt: latest.triageCompleteAt
            ? new Date(latest.triageCompleteAt as string).toISOString()
            : null,
          vitalsJson: { ...(latest.vitalsJson as object) } as Record<string, unknown>,
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
              detail: { patientId, supersededSnapshot },
            })
          );
        }
      }

      void res;
      await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setMsg(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erQuickVitals.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selStyle: React.CSSProperties = {
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    backgroundColor: "#fff",
    minWidth: 52,
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #bae6fd",
        backgroundColor: "#f8fafc",
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0369c1" }}>{t("erQuickVitals.title")}</p>
      <div style={{ ...grid2, marginTop: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("vitalsUnits.tempLabel")}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={draft.tempInputUnit}
              onChange={(e) => {
                const u = e.target.value as "C" | "F";
                setDraft((d) => ({ ...d, tempInputUnit: u }));
              }}
              disabled={saving}
              style={selStyle}
            >
              <option value="F">{t("vitalsUnits.unitF")}</option>
              <option value="C">{t("vitalsUnits.unitC")}</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={draft.tempC}
              onChange={(e) => patch({ tempC: e.target.value })}
              disabled={saving}
              style={{ ...inputBase, flex: 1, minWidth: 0 }}
            />
          </div>
          {(() => {
            if (!draft.tempC.trim()) return null;
            const pair = temperatureHintPairCelsiusFahrenheit(draft.tempC, draft.tempInputUnit);
            if (!pair) return null;
            return (
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {draft.tempInputUnit === "F"
                  ? t("vitalsUnits.tempHintC").replace("{n}", pair.celsius.toFixed(1))
                  : t("vitalsUnits.tempHintF").replace("{n}", pair.fahrenheit.toFixed(1))}
              </span>
            );
          })()}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("erQuickVitals.hr")}
          <input
            type="text"
            inputMode="numeric"
            value={draft.hr}
            onChange={(e) => patch({ hr: e.target.value })}
            disabled={saving}
            style={inputBase}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("erQuickVitals.rr")}
          <input
            type="text"
            inputMode="numeric"
            value={draft.rr}
            onChange={(e) => patch({ rr: e.target.value })}
            disabled={saving}
            style={inputBase}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("erQuickVitals.bpSys")}
          <input
            type="text"
            inputMode="numeric"
            value={draft.bpSys}
            onChange={(e) => patch({ bpSys: e.target.value })}
            disabled={saving}
            style={inputBase}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("erQuickVitals.bpDia")}
          <input
            type="text"
            inputMode="numeric"
            value={draft.bpDia}
            onChange={(e) => patch({ bpDia: e.target.value })}
            disabled={saving}
            style={inputBase}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("erQuickVitals.spo2")}
          <input
            type="text"
            inputMode="numeric"
            value={draft.spo2}
            onChange={(e) => patch({ spo2: e.target.value })}
            disabled={saving}
            style={inputBase}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("vitalsUnits.weightLabel")}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={draft.weightInputUnit}
              onChange={(e) => {
                const u = e.target.value as "kg" | "lb";
                setDraft((d) => ({ ...d, weightInputUnit: u }));
              }}
              disabled={saving}
              style={selStyle}
            >
              <option value="lb">{t("vitalsUnits.unitLb")}</option>
              <option value="kg">{t("vitalsUnits.unitKg")}</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={draft.weightKg}
              onChange={(e) => patch({ weightKg: e.target.value })}
              disabled={saving}
              style={{ ...inputBase, flex: 1, minWidth: 0 }}
            />
          </div>
          {(() => {
            if (!draft.weightKg.trim()) return null;
            const pair = weightHintPairKgPounds(draft.weightKg, draft.weightInputUnit);
            if (!pair) return null;
            return (
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {draft.weightInputUnit === "lb"
                  ? t("vitalsUnits.weightHintKg").replace("{n}", pair.kg.toFixed(1))
                  : t("vitalsUnits.weightHintLb").replace("{n}", pair.pounds.toFixed(1))}
              </span>
            );
          })()}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
          {t("vitalsUnits.heightLabel")}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={draft.heightInputMode}
              onChange={(e) => {
                const m = e.target.value as "cm" | "ftin";
                setDraft((d) => {
                  const h = flipHeightInputMode({
                    heightCmStr: d.heightCm,
                    heightFeetStr: d.heightFeet,
                    heightInchesStr: d.heightInches,
                    from: d.heightInputMode,
                    to: m,
                  });
                  return { ...d, heightInputMode: m, ...h };
                });
              }}
              disabled={saving}
              style={selStyle}
            >
              <option value="ftin">{t("vitalsUnits.unitFtIn")}</option>
              <option value="cm">{t("vitalsUnits.unitCm")}</option>
            </select>
            {draft.heightInputMode === "cm" ? (
              <input
                type="text"
                inputMode="decimal"
                value={draft.heightCm}
                onChange={(e) => patch({ heightCm: e.target.value })}
                disabled={saving}
                style={{ ...inputBase, flex: 1, minWidth: 0 }}
              />
            ) : (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("vitalsUnits.feetPh")}
                  value={draft.heightFeet}
                  onChange={(e) => patch({ heightFeet: e.target.value })}
                  disabled={saving}
                  style={{ ...inputBase, width: 56 }}
                />
                <span style={{ fontSize: 10, color: "#64748b" }}>′</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t("vitalsUnits.inchesPh")}
                  value={draft.heightInches}
                  onChange={(e) => patch({ heightInches: e.target.value })}
                  disabled={saving}
                  style={{ ...inputBase, width: 56 }}
                />
                <span style={{ fontSize: 10, color: "#64748b" }}>″</span>
              </div>
            )}
          </div>
        </label>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 11,
          color: "#475569",
          fontWeight: 600,
          marginTop: 8,
        }}
      >
        {t("erQuickVitals.allergyNote")}
        <input
          type="text"
          value={draft.allergyNote}
          onChange={(e) => patch({ allergyNote: e.target.value })}
          disabled={saving}
          style={{ ...inputBase, padding: "6px 8px" }}
        />
      </label>
      {msg ? (
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#b91c1c" }}>{msg}</p>
      ) : null}
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            backgroundColor: saving ? "#94a3b8" : "#0284c7",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? t("erQuickVitals.saving") : t("erQuickVitals.save")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            backgroundColor: "#fff",
            color: "#334155",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {t("erQuickVitals.cancel")}
        </button>
      </div>
    </div>
  );
}
