"use client";

import React from "react";
import type { SupportedLanguage } from "@/i18n/config";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import {
  formatTemperatureDualLine,
  formatWeightDualLine,
  formatHeightDualLine,
  snapshotKey,
} from "@/lib/patientVitals";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import {
  formatOxygenSupportCompact,
  temperatureSiteI18nKey,
} from "@/lib/vitalsMeasurementContextDisplay";
import { isVitalTemperatureSite } from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type VitalSummaryReading = {
  id: string;
  readingId?: string;
  measuredAtIso: string;
  recordedAtIso?: string;
  bp: string;
  hr: string;
  rr: string;
  temp: string;
  tempSiteLabel: string;
  spo2: string;
  oxygenLabel: string;
  weight: string;
  height: string;
  pain: string;
  byInitials: string;
  byTitle: string;
  vitalsJson: Record<string, unknown>;
};

function dash(v: string): string {
  return v.trim() ? v : "—";
}

function num(x: unknown): number | null {
  if (x == null || x === "") return null;
  const n = typeof x === "number" ? x : parseFloat(String(x).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Initials helper: prefers structured first/last; if a single display name is provided, takes
 * the first two letters (uppercase). Returns "—" when no name is available.
 */
export function vitalSummaryInitials(opts: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  serverInitials?: string | null;
}): string {
  const server = (opts.serverInitials ?? "").trim();
  if (server && server !== "—") return server.toUpperCase();
  if (server === "SYS") return "SYS";
  const first = (opts.firstName ?? "").trim();
  const last = (opts.lastName ?? "").trim();
  if (first || last) {
    const a = first ? first[0]!.toUpperCase() : "";
    const b = last ? last[0]!.toUpperCase() : "";
    const i = `${a}${b}`;
    return i || "—";
  }
  const display = (opts.displayName ?? "").trim();
  if (!display) return "—";
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!.toUpperCase()}${parts[parts.length - 1]![0]!.toUpperCase()}`;
  }
  const only = parts[0]!;
  return only.length >= 2 ? only.slice(0, 2).toUpperCase() : only[0]!.toUpperCase();
}

/**
 * Maps triage vitals snapshots to table rows (caller supplies newest-first order).
 */
export function snapshotsToVitalSummaryReadings(
  snapshotsNewestFirst: PatientTriageVitalsSnapshot[],
  language: SupportedLanguage,
  t?: (key: string) => string
): VitalSummaryReading[] {
  const translate = t ?? ((key: string) => key);
  return snapshotsNewestFirst.map((snap) => {
    const v = (snap.vitalsJson || {}) as Record<string, unknown>;
    const tempN = num(v.tempC);
    const measured = snap.measuredAt ?? snap.triageCompleteAt ?? snap.updatedAt;
    const sys = v.bpSys;
    const dia = v.bpDia;
    const bp =
      sys != null && sys !== "" && dia != null && dia !== ""
        ? `${String(sys).trim()}/${String(dia).trim()}`
        : "";
    const hr = v.hr != null && v.hr !== "" ? `${String(v.hr).trim()}` : "";
    const rr = v.rr != null && v.rr !== "" ? `${String(v.rr).trim()}` : "";
    const spo2 = v.spo2 != null && v.spo2 !== "" ? `${String(v.spo2).trim()}` : "";
    const wk = num(v.weightKg);
    const hc = num(v.heightCm);
    const painRaw = v.painScore ?? v.pain;
    let pain = "";
    if (painRaw != null && painRaw !== "") {
      pain = `${String(painRaw).trim()}/10`;
    } else {
      const er = v.medoraErTriageV1;
      if (er != null && typeof er === "object" && !Array.isArray(er)) {
        const legacy = (er as { painScale0to10?: unknown }).painScale0to10;
        if (legacy != null && legacy !== "") pain = `${String(legacy).trim()}/10`;
      }
    }
    const siteRaw = v.temperatureSite;
    const tempSiteLabel =
      typeof siteRaw === "string" && isVitalTemperatureSite(siteRaw)
        ? translate(temperatureSiteI18nKey(siteRaw))
        : "";
    const oxygenLabel = formatOxygenSupportCompact(v, translate);
    const byInitials = vitalSummaryInitials({
      firstName: null,
      lastName: null,
      displayName: snap.recordedByDisplayName ?? null,
      serverInitials: snap.recordedByInitials ?? null,
    });
    const name = (snap.recordedByDisplayName ?? "").trim();
    const role = (snap.recordedByRole ?? "").trim();
    const byTitle = name
      ? translate("vitalsContext.enteredByTitle")
          .replace("{name}", name)
          .replace("{role}", role || "—")
      : translate("vitalsContext.enteredByUnknown");

    const tempBase = tempN != null ? formatTemperatureDualLine(tempN, language) : "—";
    const temp = tempSiteLabel && tempBase !== "—" ? `${tempBase} ${tempSiteLabel}` : tempBase;
    const spo2Display =
      spo2 && oxygenLabel ? `${spo2}% · ${oxygenLabel}` : spo2 ? `${spo2}%` : oxygenLabel;

    return {
      id: snapshotKey(snap),
      readingId: snap.readingId,
      measuredAtIso: measured,
      recordedAtIso: snap.recordedAt,
      bp: dash(bp),
      hr: dash(hr),
      rr: dash(rr),
      temp,
      tempSiteLabel,
      spo2: dash(spo2Display),
      oxygenLabel,
      weight: wk != null ? formatWeightDualLine(wk, language) : "—",
      height: hc != null ? formatHeightDualLine(hc, language) : "—",
      pain: pain || "—",
      byInitials,
      byTitle,
      vitalsJson: v,
    };
  });
}

const shell: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  minWidth: 0,
  width: "100%",
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "6px 8px",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  fontSize: 12,
  color: "#0f172a",
  padding: "8px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

export function VitalSummaryPanel({
  readings,
  latestReadingId,
  onClose,
  onViewFullHistory,
  onEditReading,
  onVoidReading,
  actionsEnabled,
}: {
  readings: VitalSummaryReading[];
  latestReadingId?: string;
  onClose?: () => void;
  onViewFullHistory?: () => void;
  onEditReading?: (reading: VitalSummaryReading) => void;
  onVoidReading?: (reading: VitalSummaryReading) => void;
  actionsEnabled?: boolean;
}) {
  const { t, language } = useI18n();
  const loc = encounterBcp47(language);
  const vs = (k: string) => t(`vitalSummary.${k}`);

  const formatTs = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  };

  return (
    <div style={shell}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px 8px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
          {vs("title")}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={vs("close")}
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              padding: 0,
              border: "none",
              borderRadius: 6,
              backgroundColor: "#f1f5f9",
              color: "#475569",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {readings.length === 0 ? (
        <p style={{ margin: 0, padding: "14px 12px", fontSize: 13, color: "#64748b" }}>{vs("noHistory")}</p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>{vs("colTime")}</th>
                <th style={th} />
                <th style={th}>{vs("labels.bp")}</th>
                <th style={th}>{vs("labels.hr")}</th>
                <th style={th}>{vs("labels.rr")}</th>
                <th style={th}>{vs("labels.temp")}</th>
                <th style={th}>{vs("labels.spo2")}</th>
                <th style={th}>{vs("labels.weight")}</th>
                <th style={th}>{vs("labels.height")}</th>
                <th style={th}>{vs("labels.pain")}</th>
                <th style={th}>{vs("labels.by")}</th>
                {actionsEnabled ? <th style={th}>{vs("labels.actions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => {
                const isCurrent = latestReadingId != null && r.id === latestReadingId;
                return (
                  <tr key={r.id}>
                    <td style={td}>{formatTs(r.measuredAtIso)}</td>
                    <td style={{ ...td, width: 1 }}>
                      {isCurrent ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: 9999,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                          }}
                        >
                          {vs("current")}
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}> </span>
                      )}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{r.bp}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{r.hr}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{r.rr}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace", maxWidth: 160, whiteSpace: "normal" }}>
                      {r.temp}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace", maxWidth: 180, whiteSpace: "normal" }}>
                      {r.spo2}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace", maxWidth: 120 }}>
                      {r.weight}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace", maxWidth: 120 }}>
                      {r.height}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{r.pain}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#334155" }}>
                      <span title={r.byTitle} aria-label={r.byTitle}>
                        {r.byInitials}
                      </span>
                    </td>
                    {actionsEnabled ? (
                      <td style={{ ...td, whiteSpace: "normal" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {onEditReading && r.readingId ? (
                            <button
                              type="button"
                              onClick={() => onEditReading(r)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#0f172a",
                              }}
                            >
                              {t("vitalsContext.editVitals")}
                            </button>
                          ) : null}
                          {onVoidReading && r.readingId ? (
                            <button
                              type="button"
                              onClick={() => onVoidReading(r)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "#fff",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#b91c1c",
                              }}
                            >
                              {t("vitalsContext.removeVitalEntry")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {readings.length > 0 ? (
        <p style={{ margin: 0, padding: "8px 12px 0", fontSize: 11, color: "#64748b" }}>{vs("byFootnote")}</p>
      ) : null}

      {onViewFullHistory ? (
        <div style={{ padding: "10px 12px 12px", borderTop: readings.length ? "1px solid #f1f5f9" : undefined }}>
          <button
            type="button"
            onClick={onViewFullHistory}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: "#0284c7",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {vs("viewFullHistory")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
