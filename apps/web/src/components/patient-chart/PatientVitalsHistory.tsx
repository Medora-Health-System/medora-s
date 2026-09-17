"use client";

import React from "react";
import Link from "next/link";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import {
  formatHeightDualLine,
  formatTemperatureDualLine,
  formatVitalsHeaderLineForLocale,
  formatWeightDualLine,
} from "@/lib/patientVitals";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { useI18n } from "@/lib/i18n";

const emptyStateStyle: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#64748b",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
};

const labels = {
  en: { temperature: "Temperature", heartRate: "Heart rate", bloodPressure: "Blood pressure", respiratoryRate: "Respiratory rate", spo2: "SpO₂", weight: "Weight", height: "Height", allergy: "Allergy" },
  fr: { temperature: "Température", heartRate: "Fréquence cardiaque", bloodPressure: "Tension artérielle", respiratoryRate: "Fréquence respiratoire", spo2: "SpO₂", weight: "Poids", height: "Taille", allergy: "Allergie" },
  es: { temperature: "Temperatura", heartRate: "Frecuencia cardíaca", bloodPressure: "Presión arterial", respiratoryRate: "Frecuencia respiratoria", spo2: "SpO₂", weight: "Peso", height: "Estatura", allergy: "Alergia" },
} as const;

export function PatientVitalsHistory({ items, loading }: { items: PatientTriageVitalsSnapshot[]; loading: boolean }) {
  const { t, language } = useI18n();
  const loc = encounterBcp47(language);
  const l = labels[language as keyof typeof labels] ?? labels.en;

  if (loading && items.length === 0) return <div style={emptyStateStyle}>Loading vital signs…</div>;
  if (items.length === 0) return <div style={emptyStateStyle}>No recorded vital signs.</div>;

  const num = (x: unknown): number | null => {
    if (x == null || x === "") return null;
    const n = typeof x === "number" ? x : parseFloat(String(x).trim());
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((snap) => {
        const v = (snap.vitalsJson || {}) as Record<string, number | string | null>;
        const tempN = num(v.tempC);
        const weightN = num(v.weightKg);
        const heightN = num(v.heightCm);
        const when = snap.triageCompleteAt ?? snap.updatedAt;
        const row = (label: string, val: string | number | null | undefined) =>
          val != null && val !== "" ? (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(130px, 180px) 1fr", gap: 10, fontSize: 13 }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>{label}</span>
              <span style={{ color: "#0f172a" }}>{val}</span>
            </div>
          ) : null;
        return (
          <div key={`${snap.triageId}-${snap.updatedAt}`} style={{ padding: "12px 14px", backgroundColor: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Link href={`/app/encounters/${snap.encounterId}`} style={{ color: "#0f172a", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>{tEncounterType(t, snap.encounterType)}</Link>
              <span style={{ color: "#94a3b8" }}>•</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(when).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            <div style={{ fontSize: 13, marginBottom: 10, color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontWeight: 600 }}>{formatVitalsHeaderLineForLocale(v, language) || "—"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {row(l.temperature, tempN != null ? formatTemperatureDualLine(tempN, language) : null)}
              {row(l.heartRate, v.hr != null && v.hr !== "" ? `${v.hr}/min` : null)}
              {row(l.bloodPressure, v.bpSys != null && v.bpDia != null && (v.bpSys !== "" || v.bpDia !== "") ? `${v.bpSys}/${v.bpDia} mmHg` : null)}
              {row(l.respiratoryRate, v.rr != null && v.rr !== "" ? `${v.rr}/min` : null)}
              {row(l.spo2, v.spo2 != null && v.spo2 !== "" ? `${v.spo2}%` : null)}
              {row(l.weight, weightN != null ? formatWeightDualLine(weightN, language) : null)}
              {row(l.height, heightN != null ? formatHeightDualLine(heightN, language) : null)}
              {v.allergyNote && String(v.allergyNote).trim() !== "" ? row(l.allergy, String(v.allergyNote)) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
