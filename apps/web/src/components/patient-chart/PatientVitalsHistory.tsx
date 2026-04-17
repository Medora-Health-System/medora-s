"use client";

import React from "react";
import Link from "next/link";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { useI18n } from "@/lib/i18n";

const emptyStateStyle: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

export function PatientVitalsHistory({
  items,
  loading,
}: {
  items: PatientTriageVitalsSnapshot[];
  loading: boolean;
}) {
  const { t, language } = useI18n();
  const loc = encounterBcp47(language);
  const vh = (k: string) => t(`patientChartUi.vitalsHistory.${k}`);

  if (loading && items.length === 0) {
    return <div style={emptyStateStyle}>{vh("loading")}</div>;
  }

  if (items.length === 0) {
    return <div style={emptyStateStyle}>{vh("empty")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((snap) => {
        const v = (snap.vitalsJson || {}) as Record<string, number | string | null>;
        const dateHeure = snap.triageCompleteAt ?? snap.updatedAt;
        const formatDateTime = (s: string) =>
          new Date(s).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" });
        const row = (label: string, val: string | number | null | undefined) =>
          val != null && val !== "" ? (
            <div key={label} style={{ display: "flex", gap: 8, fontSize: 13 }}>
              <span style={{ color: "#666", minWidth: 150 }}>{label}</span>
              <span>{val}</span>
            </div>
          ) : null;
        return (
          <div
            key={`${snap.triageId}-${snap.updatedAt}`}
            style={{
              padding: "10px 12px",
              backgroundColor: "#fafafa",
              borderRadius: 6,
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#37474f" }}>
              <Link href={`/app/encounters/${snap.encounterId}`}>{tEncounterType(t, snap.encounterType)}</Link>
              {" — "}
              {formatDateTime(dateHeure)}
            </div>
            <div style={{ fontSize: 13, marginBottom: 8, color: "#263238", fontFamily: "ui-monospace, monospace" }}>
              {formatVitalsHeaderLineForLocale(v, language) || "—"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {row(vh("rowTemperature"), v.tempC != null && v.tempC !== "" ? `${v.tempC} °C` : null)}
              {row(vh("rowHeartRate"), v.hr != null && v.hr !== "" ? `${v.hr}/min` : null)}
              {row(
                vh("rowBloodPressure"),
                v.bpSys != null && v.bpDia != null && (v.bpSys !== "" || v.bpDia !== "")
                  ? `${v.bpSys}/${v.bpDia} mmHg`
                  : null
              )}
              {row(vh("rowRespiratoryRate"), v.rr != null && v.rr !== "" ? `${v.rr} /min` : null)}
              {row(vh("rowSpo2"), v.spo2 != null && v.spo2 !== "" ? `${v.spo2} %` : null)}
              {row(vh("rowWeight"), v.weightKg != null && v.weightKg !== "" ? `${v.weightKg} kg` : null)}
              {row(vh("rowHeight"), v.heightCm != null && v.heightCm !== "" ? `${v.heightCm} cm` : null)}
              {v.allergyNote && String(v.allergyNote).trim() !== "" ? (
                <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "#c62828", fontWeight: 700, minWidth: 150 }}>{vh("allergy")}</span>
                  <span style={{ color: "#c62828", fontWeight: 700 }}>
                    {v.allergyNote}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
