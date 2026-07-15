"use client";

import React from "react";
import {
  OXYGEN_DELIVERY_DEVICES,
  VITAL_TEMPERATURE_SITES,
  oxygenDeviceSuggestsFiO2,
  oxygenDeviceSuggestsFlow,
  temperatureHintPairCelsiusFahrenheit,
  weightHintPairKgPounds,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { flipHeightInputMode } from "@/lib/vitalsEntryFlip";
import {
  oxygenDeviceI18nKey,
  temperatureSiteI18nKey,
} from "@/lib/vitalsMeasurementContextDisplay";

export type TriageVitalsCompactValues = {
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  painScore: string;
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
  heightFeet: string;
  heightInches: string;
  temperatureSite: string;
  oxygenDevice: string;
  oxygenFlowLpm: string;
  oxygenFiO2Percent: string;
  oxygenDeviceNotes: string;
  measuredDate: string;
  measuredTime: string;
};

const smInput: React.CSSProperties = {
  boxSizing: "border-box",
  padding: "6px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  backgroundColor: "#fff",
  minHeight: 36,
};

const smSelect: React.CSSProperties = {
  ...smInput,
  fontWeight: 600,
  color: "#334155",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 11,
  color: "#64748b",
  whiteSpace: "nowrap",
};

const unitHint: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 600,
  flexShrink: 0,
};

function FieldShell({
  label,
  children,
  style,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  htmlFor?: string;
}) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <label htmlFor={htmlFor} style={fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function emptyTriageVitalsCompactValues(
  measured: { date: string; time: string }
): TriageVitalsCompactValues {
  return {
    tempC: "",
    hr: "",
    rr: "",
    bpSys: "",
    bpDia: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    painScore: "",
    tempInputUnit: "F",
    weightInputUnit: "lb",
    heightInputMode: "ftin",
    heightFeet: "",
    heightInches: "",
    temperatureSite: "",
    oxygenDevice: "ROOM_AIR",
    oxygenFlowLpm: "",
    oxygenFiO2Percent: "",
    oxygenDeviceNotes: "",
    measuredDate: measured.date,
    measuredTime: measured.time,
  };
}

export function EmergencyTriageVitalsCompactSection({
  values,
  onChange,
  disabled,
  saving,
  onSaveVitals,
  onClearVitals,
  statusMessage,
  statusTone = "error",
  attributionLine,
  showHeading = true,
  saveLabel,
}: {
  values: TriageVitalsCompactValues;
  onChange: (patch: Partial<TriageVitalsCompactValues>) => void;
  disabled?: boolean;
  saving?: boolean;
  onSaveVitals: () => void;
  onClearVitals: () => void;
  statusMessage?: string | null;
  statusTone?: "error" | "success" | "info";
  attributionLine?: string | null;
  showHeading?: boolean;
  saveLabel?: string;
}) {
  const { t } = useI18n();
  const showFlow = oxygenDeviceSuggestsFlow(values.oxygenDevice as any);
  const showFiO2 = oxygenDeviceSuggestsFiO2(values.oxygenDevice as any);
  const bg = disabled ? "#f8fafc" : "#fff";

  return (
    <div className="medora-vitals-compact" style={{ minWidth: 0, width: "100%" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .medora-vitals-compact .vitals-row {
              display: flex;
              flex-wrap: wrap;
              gap: 10px 12px;
              align-items: flex-end;
              margin-top: 8px;
            }
            .medora-vitals-compact .vitals-save-bar {
              margin-top: 12px;
              padding: 10px 12px;
              border-radius: 10px;
              border: 1px solid #bae6fd;
              background: #f0f9ff;
              display: flex;
              flex-wrap: wrap;
              gap: 10px 12px;
              align-items: flex-end;
              justify-content: space-between;
            }
            .medora-vitals-compact .vitals-save-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              align-items: center;
            }
            @media (max-width: 767.98px) {
              .medora-vitals-compact .vitals-row > * {
                flex: 1 1 calc(50% - 12px);
                min-width: 140px;
              }
              .medora-vitals-compact .vitals-row > .vitals-span-full {
                flex: 1 1 100%;
              }
            }
          `,
        }}
      />

      {showHeading ? (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {t("erTriage.panel.sectionVitals")}
        </p>
      ) : null}

      <div className="vitals-row" role="group" aria-label={t("erTriage.panel.sectionVitals")}>
        <FieldShell label={t("vitalsContext.tempShort")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              id="vitals-temp-value"
              type="text"
              inputMode="decimal"
              value={values.tempC}
              onChange={(e) => onChange({ tempC: e.target.value })}
              disabled={disabled || saving}
              aria-label={t("vitalsContext.tempShort")}
              style={{
                ...smInput,
                width: 96,
                minWidth: 88,
                maxWidth: 110,
                backgroundColor: bg,
              }}
            />
            <select
              value={values.tempInputUnit}
              onChange={(e) => onChange({ tempInputUnit: e.target.value as "C" | "F" })}
              disabled={disabled || saving}
              aria-label={t("vitalsUnits.tempLabel")}
              style={{ ...smSelect, width: 70, minWidth: 64, maxWidth: 76, backgroundColor: bg }}
            >
              <option value="F">{t("vitalsUnits.unitF")}</option>
              <option value="C">{t("vitalsUnits.unitC")}</option>
            </select>
            <select
              value={values.temperatureSite}
              onChange={(e) => onChange({ temperatureSite: e.target.value })}
              disabled={disabled || saving}
              aria-label={t("vitalsContext.temperatureSiteLabel")}
              style={{ ...smSelect, width: 128, minWidth: 110, maxWidth: 140, backgroundColor: bg }}
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
            if (!values.tempC.trim()) return null;
            const pair = temperatureHintPairCelsiusFahrenheit(values.tempC, values.tempInputUnit);
            if (!pair) return null;
            return (
              <p style={{ margin: "3px 0 0", fontSize: 10, color: "#64748b" }}>
                {values.tempInputUnit === "F"
                  ? t("vitalsUnits.tempHintC").replace("{n}", pair.celsius.toFixed(1))
                  : t("vitalsUnits.tempHintF").replace("{n}", pair.fahrenheit.toFixed(1))}
              </p>
            );
          })()}
        </FieldShell>

        <FieldShell label={t("erQuickVitals.hr")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              value={values.hr}
              onChange={(e) => onChange({ hr: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 100, minWidth: 90, maxWidth: 110, backgroundColor: bg }}
            />
            <span style={unitHint}>{t("vitalsContext.perMin")}</span>
          </div>
        </FieldShell>

        <FieldShell label={t("erQuickVitals.rr")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              value={values.rr}
              onChange={(e) => onChange({ rr: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 100, minWidth: 90, maxWidth: 110, backgroundColor: bg }}
            />
            <span style={unitHint}>{t("vitalsContext.perMin")}</span>
          </div>
        </FieldShell>

        <FieldShell label={t("vitalSummary.labels.bp")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              value={values.bpSys}
              onChange={(e) => onChange({ bpSys: e.target.value })}
              disabled={disabled || saving}
              aria-label={t("erQuickVitals.bpSys")}
              style={{ ...smInput, width: 72, minWidth: 64, maxWidth: 80, backgroundColor: bg }}
            />
            <span style={unitHint}>/</span>
            <input
              type="text"
              inputMode="numeric"
              value={values.bpDia}
              onChange={(e) => onChange({ bpDia: e.target.value })}
              disabled={disabled || saving}
              aria-label={t("erQuickVitals.bpDia")}
              style={{ ...smInput, width: 72, minWidth: 64, maxWidth: 80, backgroundColor: bg }}
            />
            <span style={unitHint}>{t("vitalsContext.mmHg")}</span>
          </div>
        </FieldShell>

        <FieldShell label={t("vitalSummary.labels.spo2")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="numeric"
              value={values.spo2}
              onChange={(e) => onChange({ spo2: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 88, minWidth: 80, maxWidth: 105, backgroundColor: bg }}
            />
            <span style={unitHint}>{t("vitalsContext.percent")}</span>
          </div>
        </FieldShell>
      </div>

      <div className="vitals-row">
        <FieldShell label={t("vitalsContext.oxygenDeviceLabel")} style={{ flex: "0 1 auto" }}>
          <select
            value={values.oxygenDevice}
            onChange={(e) => {
              const next = e.target.value;
              onChange({
                oxygenDevice: next,
                ...(next === "ROOM_AIR" ? { oxygenFlowLpm: "", oxygenFiO2Percent: "" } : {}),
              });
            }}
            disabled={disabled || saving}
            style={{ ...smSelect, width: 180, minWidth: 150, maxWidth: 210, backgroundColor: bg }}
          >
            {OXYGEN_DELIVERY_DEVICES.map((device) => (
              <option key={device} value={device}>
                {t(oxygenDeviceI18nKey(device))}
              </option>
            ))}
          </select>
        </FieldShell>

        {showFlow ? (
          <FieldShell label={t("vitalsContext.oxygenFlow")} style={{ flex: "0 1 auto" }}>
            <input
              type="text"
              inputMode="decimal"
              value={values.oxygenFlowLpm}
              onChange={(e) => onChange({ oxygenFlowLpm: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 110, minWidth: 100, maxWidth: 120, backgroundColor: bg }}
            />
          </FieldShell>
        ) : null}

        {showFiO2 ? (
          <FieldShell label={t("vitalsContext.oxygenFiO2")} style={{ flex: "0 1 auto" }}>
            <input
              type="text"
              inputMode="decimal"
              value={values.oxygenFiO2Percent}
              onChange={(e) => onChange({ oxygenFiO2Percent: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 100, minWidth: 90, maxWidth: 110, backgroundColor: bg }}
            />
          </FieldShell>
        ) : null}

        {values.oxygenDevice === "OTHER" || values.oxygenDeviceNotes ? (
          <FieldShell
            label={t("vitalsContext.oxygenDeviceNotes")}
            style={{ flex: "1 1 180px", maxWidth: 280 }}
            htmlFor="vitals-o2-notes"
          >
            <input
              id="vitals-o2-notes"
              type="text"
              value={values.oxygenDeviceNotes}
              onChange={(e) => onChange({ oxygenDeviceNotes: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: "100%", maxWidth: 280, backgroundColor: bg }}
            />
          </FieldShell>
        ) : null}

        <FieldShell label={t("vitalSummary.labels.weight")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              inputMode="decimal"
              value={values.weightKg}
              onChange={(e) => onChange({ weightKg: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 110, minWidth: 100, maxWidth: 120, backgroundColor: bg }}
            />
            <select
              value={values.weightInputUnit}
              onChange={(e) => onChange({ weightInputUnit: e.target.value as "kg" | "lb" })}
              disabled={disabled || saving}
              aria-label={t("vitalsUnits.weightLabel")}
              style={{ ...smSelect, width: 74, minWidth: 70, maxWidth: 80, backgroundColor: bg }}
            >
              <option value="lb">{t("vitalsUnits.unitLb")}</option>
              <option value="kg">{t("vitalsUnits.unitKg")}</option>
            </select>
          </div>
          {(() => {
            if (!values.weightKg.trim()) return null;
            const pair = weightHintPairKgPounds(values.weightKg, values.weightInputUnit);
            if (!pair) return null;
            return (
              <p style={{ margin: "3px 0 0", fontSize: 10, color: "#64748b" }}>
                {values.weightInputUnit === "lb"
                  ? t("vitalsUnits.weightHintKg").replace("{n}", pair.kg.toFixed(1))
                  : t("vitalsUnits.weightHintLb").replace("{n}", pair.pounds.toFixed(1))}
              </p>
            );
          })()}
        </FieldShell>

        <FieldShell label={t("vitalSummary.labels.height")} style={{ flex: "0 1 auto" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={values.heightInputMode}
              onChange={(e) => {
                const m = e.target.value as "cm" | "ftin";
                const h = flipHeightInputMode({
                  heightCmStr: values.heightCm,
                  heightFeetStr: values.heightFeet,
                  heightInchesStr: values.heightInches,
                  from: values.heightInputMode,
                  to: m,
                });
                onChange({ heightInputMode: m, ...h });
              }}
              disabled={disabled || saving}
              aria-label={t("vitalsUnits.heightLabel")}
              style={{ ...smSelect, width: 84, backgroundColor: bg }}
            >
              <option value="ftin">{t("vitalsUnits.unitFtIn")}</option>
              <option value="cm">{t("vitalsUnits.unitCm")}</option>
            </select>
            {values.heightInputMode === "cm" ? (
              <input
                type="text"
                inputMode="decimal"
                value={values.heightCm}
                onChange={(e) => onChange({ heightCm: e.target.value })}
                disabled={disabled || saving}
                style={{ ...smInput, width: 100, minWidth: 90, maxWidth: 120, backgroundColor: bg }}
              />
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("vitalsUnits.feetPh")}
                  value={values.heightFeet}
                  onChange={(e) => onChange({ heightFeet: e.target.value })}
                  disabled={disabled || saving}
                  style={{ ...smInput, width: 52, backgroundColor: bg }}
                />
                <span style={unitHint}>′</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t("vitalsUnits.inchesPh")}
                  value={values.heightInches}
                  onChange={(e) => onChange({ heightInches: e.target.value })}
                  disabled={disabled || saving}
                  style={{ ...smInput, width: 52, backgroundColor: bg }}
                />
                <span style={unitHint}>″</span>
              </>
            )}
          </div>
        </FieldShell>

        <FieldShell label={t("erQuickVitals.painScore")} style={{ flex: "0 1 auto" }}>
          <select
            value={values.painScore}
            onChange={(e) => onChange({ painScore: e.target.value })}
            disabled={disabled || saving}
            style={{ ...smSelect, width: 112, minWidth: 100, maxWidth: 130, backgroundColor: bg }}
          >
            <option value="">{t("common.dash")}</option>
            {Array.from({ length: 11 }, (_, n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </FieldShell>
      </div>

      <div className="vitals-save-bar">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <FieldShell label={t("vitalsContext.measuredDate")}>
            <input
              type="date"
              value={values.measuredDate}
              onChange={(e) => onChange({ measuredDate: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 150, backgroundColor: bg }}
            />
          </FieldShell>
          <FieldShell label={t("vitalsContext.measuredTime")}>
            <input
              type="time"
              value={values.measuredTime}
              onChange={(e) => onChange({ measuredTime: e.target.value })}
              disabled={disabled || saving}
              style={{ ...smInput, width: 120, backgroundColor: bg }}
            />
          </FieldShell>
        </div>
        <div className="vitals-save-actions">
          <button
            type="button"
            onClick={onSaveVitals}
            disabled={disabled || saving}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: disabled || saving ? "#94a3b8" : "#0284c7",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: disabled || saving ? "wait" : "pointer",
              minHeight: 40,
            }}
          >
            {saving ? t("erQuickVitals.saving") : saveLabel ?? t("vitalsContext.saveVitals")}
          </button>
          <button
            type="button"
            onClick={onClearVitals}
            disabled={disabled || saving}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: disabled || saving ? "not-allowed" : "pointer",
              minHeight: 40,
            }}
          >
            {t("vitalsContext.clear")}
          </button>
        </div>
        {attributionLine ? (
          <p
            style={{
              margin: 0,
              flex: "1 1 100%",
              fontSize: 11,
              color: "#0369a1",
              lineHeight: 1.4,
            }}
          >
            {attributionLine}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              flex: "1 1 100%",
              fontSize: 11,
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            {t("vitalsContext.saveVitalsHint")}
          </p>
        )}
        {statusMessage ? (
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: 0,
              flex: "1 1 100%",
              fontSize: 12,
              color:
                statusTone === "success" ? "#047857" : statusTone === "info" ? "#0369a1" : "#b91c1c",
            }}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
