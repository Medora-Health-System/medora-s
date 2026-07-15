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
import {
  OXYGEN_DELIVERY_DEVICES,
  VITAL_TEMPERATURE_SITES,
  oxygenDeviceSuggestsFiO2,
  oxygenDeviceSuggestsFlow,
  temperatureHintPairCelsiusFahrenheit,
  weightHintPairKgPounds,
} from "@medora/shared";
import { flipHeightInputMode } from "@/lib/vitalsEntryFlip";
import {
  oxygenDeviceI18nKey,
  measuredAtIsoFromLocalInputs,
  splitMeasuredAtLocal,
  temperatureSiteI18nKey,
} from "@/lib/vitalsMeasurementContextDisplay";
import {
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import { erTriageV1FormFromVitalsJson } from "./medoraErTriageV1";
import { isTriageStaleConflictError } from "./triageConcurrency";

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  backgroundColor: "#fff",
  minHeight: 40,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
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
  painScore: string;
  allergyNote: string;
  temperatureSite: string;
  oxygenDevice: string;
  oxygenFlowLpm: string;
  oxygenFiO2Percent: string;
  oxygenDeviceNotes: string;
  measuredDate: string;
  measuredTime: string;
};

function draftFromTriage(triage: Record<string, unknown> | null, language: "en" | "fr"): Draft {
  const measured = splitMeasuredAtLocal(new Date().toISOString());
  const empty: Draft = {
    tempC: "",
    hr: "",
    rr: "",
    bpSys: "",
    bpDia: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    painScore: "",
    tempInputUnit: "C",
    weightInputUnit: "kg",
    heightInputMode: "cm",
    heightFeet: "",
    heightInches: "",
    allergyNote: "",
    temperatureSite: "",
    oxygenDevice: "ROOM_AIR",
    oxygenFlowLpm: "",
    oxygenFiO2Percent: "",
    oxygenDeviceNotes: "",
    measuredDate: measured.date,
    measuredTime: measured.time,
  };
  const parsed = triagePreviewSliceFromTriageGet(triage, language);
  if (!parsed) return empty;
  const s = parsed.slice;
  const v =
    triage?.vitalsJson && typeof triage.vitalsJson === "object" && !Array.isArray(triage.vitalsJson)
      ? (triage.vitalsJson as Record<string, unknown>)
      : {};
  return {
    ...empty,
    tempC: s.tempC,
    hr: s.hr,
    rr: s.rr,
    bpSys: s.bpSys,
    bpDia: s.bpDia,
    spo2: s.spo2,
    weightKg: s.weightKg,
    heightCm: s.heightCm,
    painScore: s.painScore ?? "",
    tempInputUnit: s.tempInputUnit ?? "C",
    weightInputUnit: s.weightInputUnit ?? "kg",
    heightInputMode: s.heightInputMode ?? "cm",
    heightFeet: s.heightFeet ?? "",
    heightInches: s.heightInches ?? "",
    allergyNote: s.allergyNote,
    temperatureSite: typeof v.temperatureSite === "string" ? v.temperatureSite : "",
    oxygenDevice: typeof v.oxygenDevice === "string" ? v.oxygenDevice : "ROOM_AIR",
    oxygenFlowLpm: v.oxygenFlowLpm != null && v.oxygenFlowLpm !== "" ? String(v.oxygenFlowLpm) : "",
    oxygenFiO2Percent:
      v.oxygenFiO2Percent != null && v.oxygenFiO2Percent !== "" ? String(v.oxygenFiO2Percent) : "",
    oxygenDeviceNotes: typeof v.oxygenDeviceNotes === "string" ? v.oxygenDeviceNotes : "",
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(draftFromTriage(triageSnapshot, language));
      setMsg(null);
      setSuccessMsg(null);
    }
  }, [open, triageSnapshot, language]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    setSuccessMsg(null);
    try {
      const measuredAt = measuredAtIsoFromLocalInputs(draft.measuredDate, draft.measuredTime);
      if (!measuredAt) {
        setMsg(t("vitalsContext.errors.invalidMeasuredAt"));
        return;
      }

      const latestRaw = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
      const latest =
        latestRaw && typeof latestRaw === "object" && !Array.isArray(latestRaw)
          ? (latestRaw as Record<string, unknown>)
          : null;
      if (!latest) {
        setMsg(normalizeUserFacingError(null, language) || t("erQuickVitals.saveError"));
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

      const lastKnownTriageUpdatedAt =
        typeof latest.updatedAt === "string"
          ? latest.updatedAt
          : latest.updatedAt
            ? new Date(latest.updatedAt as string).toISOString()
            : null;

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
        lastKnownTriageUpdatedAt,
        measuredAt,
      };

      await apiFetch(`/encounters/${encounterId}/triage`, {
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

      setSuccessMsg(t("vitalsContext.saveSuccess"));
      await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      if (isTriageStaleConflictError(e)) {
        setMsg(t("erTriage.panel.staleConflict"));
      } else {
        const raw = e instanceof Error ? e.message : null;
        if (raw && /measuredAt cannot be in the future/i.test(raw)) {
          setMsg(t("vitalsContext.errors.futureMeasuredAt"));
        } else {
          setMsg(normalizeUserFacingError(raw, language) || t("erQuickVitals.saveError"));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selStyle: React.CSSProperties = {
    ...inputBase,
    minWidth: 72,
    fontWeight: 600,
    color: "#334155",
  };

  const showFlow = oxygenDeviceSuggestsFlow(draft.oxygenDevice as any);
  const showFiO2 = oxygenDeviceSuggestsFiO2(draft.oxygenDevice as any);

  return (
    <>
      <button
        type="button"
        aria-label={t("erQuickVitals.cancel")}
        onClick={() => {
          if (!saving) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          border: "none",
          background: "rgba(15, 23, 42, 0.35)",
          cursor: saving ? "wait" : "pointer",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="er-quick-vitals-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 90,
          width: "min(420px, 100vw)",
          height: "100vh",
          maxHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          borderLeft: "1px solid #bae6fd",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            flex: "0 0 auto",
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#fff",
          }}
        >
          <p
            id="er-quick-vitals-title"
            style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0369c1" }}
          >
            {t("erQuickVitals.title")}
          </p>
        </header>

        <div
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 16px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={grid2}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 11,
                color: "#475569",
                fontWeight: 600,
                gridColumn: "1 / -1",
              }}
            >
              {t("vitalsUnits.tempLabel")}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={draft.tempInputUnit}
                  onChange={(e) => setDraft((d) => ({ ...d, tempInputUnit: e.target.value as "C" | "F" }))}
                  disabled={saving}
                  style={{ ...selStyle, width: "auto" }}
                  aria-label={t("vitalsUnits.tempLabel")}
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
                  style={{ ...inputBase, flex: 1, minWidth: 72 }}
                />
                <select
                  value={draft.temperatureSite}
                  onChange={(e) => patch({ temperatureSite: e.target.value })}
                  disabled={saving}
                  style={{ ...selStyle, flex: "1 1 140px" }}
                  aria-label={t("vitalsContext.temperatureSiteLabel")}
                >
                  <option value="">{t("vitalsContext.temperatureSitePlaceholder")}</option>
                  {VITAL_TEMPERATURE_SITES.map((site) => (
                    <option key={site} value={site}>
                      {t(temperatureSiteI18nKey(site))}
                    </option>
                  ))}
                </select>
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
              <input type="text" inputMode="numeric" value={draft.hr} onChange={(e) => patch({ hr: e.target.value })} disabled={saving} style={inputBase} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {t("erQuickVitals.rr")}
              <input type="text" inputMode="numeric" value={draft.rr} onChange={(e) => patch({ rr: e.target.value })} disabled={saving} style={inputBase} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {t("erQuickVitals.bpSys")}
              <input type="text" inputMode="numeric" value={draft.bpSys} onChange={(e) => patch({ bpSys: e.target.value })} disabled={saving} style={inputBase} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {t("erQuickVitals.bpDia")}
              <input type="text" inputMode="numeric" value={draft.bpDia} onChange={(e) => patch({ bpDia: e.target.value })} disabled={saving} style={inputBase} />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 11,
                color: "#475569",
                fontWeight: 600,
                gridColumn: "1 / -1",
              }}
            >
              {t("erQuickVitals.spo2")}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.spo2}
                  onChange={(e) => patch({ spo2: e.target.value })}
                  disabled={saving}
                  style={{ ...inputBase, flex: "0 1 88px", maxWidth: 120 }}
                  aria-label={t("erQuickVitals.spo2")}
                />
                <select
                  value={draft.oxygenDevice}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      oxygenDevice: next,
                      ...(next === "ROOM_AIR"
                        ? { oxygenFlowLpm: "", oxygenFiO2Percent: "" }
                        : null),
                    }));
                  }}
                  disabled={saving}
                  style={{ ...selStyle, flex: "1 1 180px" }}
                  aria-label={t("vitalsContext.oxygenDeviceLabel")}
                >
                  {OXYGEN_DELIVERY_DEVICES.map((device) => (
                    <option key={device} value={device}>
                      {t(oxygenDeviceI18nKey(device))}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {showFlow || showFiO2 ? (
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {showFlow ? (
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
                    {t("vitalsContext.oxygenFlow")}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft.oxygenFlowLpm}
                      onChange={(e) => patch({ oxygenFlowLpm: e.target.value })}
                      disabled={saving}
                      style={inputBase}
                    />
                  </label>
                ) : null}
                {showFiO2 ? (
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
                    {t("vitalsContext.oxygenFiO2")}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft.oxygenFiO2Percent}
                      onChange={(e) => patch({ oxygenFiO2Percent: e.target.value })}
                      disabled={saving}
                      style={inputBase}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}

            {draft.oxygenDevice === "OTHER" || draft.oxygenDeviceNotes ? (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11,
                  color: "#475569",
                  fontWeight: 600,
                  gridColumn: "1 / -1",
                }}
              >
                {t("vitalsContext.oxygenDeviceNotes")}
                <input
                  type="text"
                  value={draft.oxygenDeviceNotes}
                  onChange={(e) => patch({ oxygenDeviceNotes: e.target.value })}
                  disabled={saving}
                  style={inputBase}
                />
              </label>
            ) : null}

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {t("vitalsUnits.weightLabel")}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={draft.weightInputUnit}
                  onChange={(e) => setDraft((d) => ({ ...d, weightInputUnit: e.target.value as "kg" | "lb" }))}
                  disabled={saving}
                  style={{ ...selStyle, width: "auto" }}
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
                  style={{ ...selStyle, width: "auto" }}
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

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {t("erQuickVitals.painScore")}
              <select
                value={draft.painScore}
                onChange={(e) => patch({ painScore: e.target.value })}
                disabled={saving}
                style={inputBase}
              >
                <option value="">{t("common.dash")}</option>
                {Array.from({ length: 11 }, (_, n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
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
              marginTop: 10,
            }}
          >
            {t("erQuickVitals.allergyNote")}
            <input
              type="text"
              value={draft.allergyNote}
              onChange={(e) => patch({ allergyNote: e.target.value })}
              disabled={saving}
              style={inputBase}
            />
          </label>

          {msg ? (
            <p role="alert" style={{ margin: "10px 0 0 0", fontSize: 12, color: "#b91c1c" }}>
              {msg}
            </p>
          ) : null}
          {successMsg ? (
            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#047857" }}>{successMsg}</p>
          ) : null}
        </div>

        <footer
          style={{
            flex: "0 0 auto",
            padding: "12px 16px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600, flex: "1 1 120px" }}>
              {t("vitalsContext.measuredDate")}
              <input
                type="date"
                value={draft.measuredDate}
                onChange={(e) => patch({ measuredDate: e.target.value })}
                disabled={saving}
                style={inputBase}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#475569", fontWeight: 600, flex: "1 1 120px" }}>
              {t("vitalsContext.measuredTime")}
              <input
                type="time"
                value={draft.measuredTime}
                onChange={(e) => patch({ measuredTime: e.target.value })}
                disabled={saving}
                style={inputBase}
              />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                backgroundColor: saving ? "#94a3b8" : "#0284c7",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                flex: "1 1 auto",
                minHeight: 44,
              }}
            >
              {saving ? t("erQuickVitals.saving") : t("vitalsContext.saveVitals")}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#334155",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
                minHeight: 44,
              }}
            >
              {t("erQuickVitals.cancel")}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
