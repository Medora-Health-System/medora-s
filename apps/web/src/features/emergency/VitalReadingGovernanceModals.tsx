"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import type { VitalSummaryReading } from "@/components/patients/VitalSummaryPanel";
import {
  OXYGEN_DELIVERY_DEVICES,
  VITAL_TEMPERATURE_SITES,
  VITALS_VOID_REASON_CODES,
  oxygenDeviceI18nKey,
  measuredAtIsoFromLocalInputs,
  splitMeasuredAtLocal,
  temperatureSiteI18nKey,
  voidReasonI18nKey,
} from "@/lib/vitalsMeasurementContextDisplay";
import { oxygenDeviceSuggestsFiO2, oxygenDeviceSuggestsFlow } from "@medora/shared";

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  minHeight: 40,
};

export function VitalReadingVoidModal({
  open,
  reading,
  encounterId,
  facilityId,
  onClose,
  onDone,
}: {
  open: boolean;
  reading: VitalSummaryReading | null;
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setText("");
      setErr(null);
    }
  }, [open]);

  if (!open || !reading?.readingId) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/encounters/${encounterId}/triage/vitals-readings/${reading.readingId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voidReasonCode: code,
          voidReasonText: text.trim() || null,
        }),
        facilityId,
      });
      await onDone();
      onClose();
    } catch (e) {
      setErr(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("vitalsContext.voidError")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-vitals-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(420px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <p id="void-vitals-title" style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
          {t("vitalsContext.removeVitalEntry")}
        </p>
        <p style={{ margin: "8px 0 12px", fontSize: 12, color: "#64748b" }}>{t("vitalsContext.voidHint")}</p>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
          {t("vitalsContext.voidReasonLabel")}
          <select value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} style={inputBase}>
            <option value="">{t("common.dash")}</option>
            {VITALS_VOID_REASON_CODES.map((c) => (
              <option key={c} value={c}>
                {t(voidReasonI18nKey(c))}
              </option>
            ))}
          </select>
        </label>
        {code === "OTHER" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, marginTop: 10 }}>
            {t("vitalsContext.voidReasonOther")}
            <input value={text} onChange={(e) => setText(e.target.value)} disabled={busy} style={inputBase} />
          </label>
        ) : null}
        {err ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 10 }}>
            {err}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            disabled={busy || !code || (code === "OTHER" && !text.trim())}
            onClick={() => void submit()}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: busy ? "#94a3b8" : "#b91c1c",
              color: "#fff",
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              minHeight: 44,
            }}
          >
            {busy ? t("erQuickVitals.saving") : t("vitalsContext.confirmVoid")}
          </button>
          <button type="button" disabled={busy} onClick={onClose} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", minHeight: 44 }}>
            {t("erQuickVitals.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function VitalReadingEditModal({
  open,
  reading,
  encounterId,
  facilityId,
  onClose,
  onDone,
}: {
  open: boolean;
  reading: VitalSummaryReading | null;
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [spo2, setSpo2] = useState("");
  const [tempC, setTempC] = useState("");
  const [temperatureSite, setTemperatureSite] = useState("");
  const [oxygenDevice, setOxygenDevice] = useState("ROOM_AIR");
  const [oxygenFlowLpm, setOxygenFlowLpm] = useState("");
  const [oxygenFiO2Percent, setOxygenFiO2Percent] = useState("");
  const [oxygenDeviceNotes, setOxygenDeviceNotes] = useState("");
  const [measuredDate, setMeasuredDate] = useState("");
  const [measuredTime, setMeasuredTime] = useState("");

  useEffect(() => {
    if (!open || !reading) return;
    const v = reading.vitalsJson;
    setHr(v.hr != null ? String(v.hr) : "");
    setRr(v.rr != null ? String(v.rr) : "");
    setBpSys(v.bpSys != null ? String(v.bpSys) : "");
    setBpDia(v.bpDia != null ? String(v.bpDia) : "");
    setSpo2(v.spo2 != null ? String(v.spo2) : "");
    setTempC(v.tempC != null ? String(v.tempC) : "");
    setTemperatureSite(typeof v.temperatureSite === "string" ? v.temperatureSite : "");
    setOxygenDevice(typeof v.oxygenDevice === "string" ? v.oxygenDevice : "ROOM_AIR");
    setOxygenFlowLpm(v.oxygenFlowLpm != null ? String(v.oxygenFlowLpm) : "");
    setOxygenFiO2Percent(v.oxygenFiO2Percent != null ? String(v.oxygenFiO2Percent) : "");
    setOxygenDeviceNotes(typeof v.oxygenDeviceNotes === "string" ? v.oxygenDeviceNotes : "");
    const split = splitMeasuredAtLocal(reading.measuredAtIso);
    setMeasuredDate(split.date);
    setMeasuredTime(split.time);
    setErr(null);
  }, [open, reading]);

  if (!open || !reading?.readingId) return null;

  const showFlow = oxygenDeviceSuggestsFlow(oxygenDevice as any);
  const showFiO2 = oxygenDeviceSuggestsFiO2(oxygenDevice as any);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const measuredAt = measuredAtIsoFromLocalInputs(measuredDate, measuredTime);
      if (!measuredAt) {
        setErr(t("vitalsContext.errors.invalidMeasuredAt"));
        return;
      }
      const vitalsJson: Record<string, unknown> = {
        ...reading.vitalsJson,
        hr: hr.trim() ? parseInt(hr, 10) : undefined,
        rr: rr.trim() ? parseInt(rr, 10) : undefined,
        bpSys: bpSys.trim() ? parseInt(bpSys, 10) : undefined,
        bpDia: bpDia.trim() ? parseInt(bpDia, 10) : undefined,
        spo2: spo2.trim() ? parseInt(spo2, 10) : undefined,
        tempC: tempC.trim() ? Number(tempC) : undefined,
        temperatureSite: temperatureSite || undefined,
        oxygenDevice: oxygenDevice || undefined,
        oxygenFlowLpm: oxygenFlowLpm.trim() ? Number(oxygenFlowLpm) : undefined,
        oxygenFiO2Percent: oxygenFiO2Percent.trim() ? Number(oxygenFiO2Percent) : undefined,
        oxygenDeviceNotes: oxygenDeviceNotes.trim() || undefined,
      };
      Object.keys(vitalsJson).forEach((k) => {
        if (vitalsJson[k] === undefined) delete vitalsJson[k];
      });

      await apiFetch(`/encounters/${encounterId}/triage/vitals-readings/${reading.readingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vitalsJson, measuredAt }),
        facilityId,
      });
      await onDone();
      onClose();
    } catch (e) {
      const raw = e instanceof Error ? e.message : null;
      if (raw && /measuredAt cannot be in the future/i.test(raw)) {
        setErr(t("vitalsContext.errors.futureMeasuredAt"));
      } else {
        setErr(normalizeUserFacingError(raw, language) || t("vitalsContext.updateError"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-vitals-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(520px, 100%)", maxHeight: "92vh", overflow: "auto" }}>
        <p id="edit-vitals-title" style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
          {t("vitalsContext.editVitals")}
        </p>
        <p style={{ margin: "8px 0 4px", fontSize: 12, color: "#64748b" }}>
          {t("vitalsContext.recordedAt")}:{" "}
          {reading.recordedAtIso ? new Date(reading.recordedAtIso).toLocaleString() : "—"}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{reading.byTitle}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.hr")}
            <input value={hr} onChange={(e) => setHr(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.rr")}
            <input value={rr} onChange={(e) => setRr(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.bpSys")}
            <input value={bpSys} onChange={(e) => setBpSys(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.bpDia")}
            <input value={bpDia} onChange={(e) => setBpDia(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.tempC")}
            <input value={tempC} onChange={(e) => setTempC(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("vitalsContext.temperatureSiteLabel")}
            <select value={temperatureSite} onChange={(e) => setTemperatureSite(e.target.value)} disabled={busy} style={inputBase}>
              <option value="">{t("vitalsContext.temperatureSitePlaceholder")}</option>
              {VITAL_TEMPERATURE_SITES.map((s) => (
                <option key={s} value={s}>
                  {t(temperatureSiteI18nKey(s))}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("erQuickVitals.spo2")}
            <input value={spo2} onChange={(e) => setSpo2(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("vitalsContext.oxygenDeviceLabel")}
            <select
              value={oxygenDevice}
              onChange={(e) => {
                const next = e.target.value;
                setOxygenDevice(next);
                if (next === "ROOM_AIR") {
                  setOxygenFlowLpm("");
                  setOxygenFiO2Percent("");
                }
              }}
              disabled={busy}
              style={inputBase}
            >
              {OXYGEN_DELIVERY_DEVICES.map((d) => (
                <option key={d} value={d}>
                  {t(oxygenDeviceI18nKey(d))}
                </option>
              ))}
            </select>
          </label>
          {showFlow ? (
            <label style={{ fontSize: 11, fontWeight: 600 }}>
              {t("vitalsContext.oxygenFlow")}
              <input value={oxygenFlowLpm} onChange={(e) => setOxygenFlowLpm(e.target.value)} disabled={busy} style={inputBase} />
            </label>
          ) : null}
          {showFiO2 ? (
            <label style={{ fontSize: 11, fontWeight: 600 }}>
              {t("vitalsContext.oxygenFiO2")}
              <input value={oxygenFiO2Percent} onChange={(e) => setOxygenFiO2Percent(e.target.value)} disabled={busy} style={inputBase} />
            </label>
          ) : null}
          <label style={{ fontSize: 11, fontWeight: 600, gridColumn: "1 / -1" }}>
            {t("vitalsContext.oxygenDeviceNotes")}
            <input value={oxygenDeviceNotes} onChange={(e) => setOxygenDeviceNotes(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("vitalsContext.measuredDate")}
            <input type="date" value={measuredDate} onChange={(e) => setMeasuredDate(e.target.value)} disabled={busy} style={inputBase} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            {t("vitalsContext.measuredTime")}
            <input type="time" value={measuredTime} onChange={(e) => setMeasuredTime(e.target.value)} disabled={busy} style={inputBase} />
          </label>
        </div>
        {err ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 10 }}>
            {err}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: busy ? "#94a3b8" : "#0284c7",
              color: "#fff",
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              minHeight: 44,
            }}
          >
            {busy ? t("erQuickVitals.saving") : t("vitalsContext.saveVitals")}
          </button>
          <button type="button" disabled={busy} onClick={onClose} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", minHeight: 44 }}>
            {t("erQuickVitals.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
