"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { formatEncounterVitalsHistoryCompactLine } from "@/lib/patientVitals";
import { summarizeClinicalTimelineRow } from "@/lib/clinicalTimelineDisplayUi";
import {
  buildProcedureTimelineDetailLine,
  procedureTimelineCompactSuffix,
  procedureTypeDisplayName,
  type ProcedurePayload,
} from "@/lib/lacerationProcedurePayloadDisplay";

export type ClinicalTimelineApiRow = {
  id: string;
  eventType: string;
  createdAt: string;
  createdBy: { userId: string; firstName: string | null; lastName: string | null };
  payloadJson: unknown;
};

const DEFAULT_LIMIT = 30;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function formatActor(firstName: string | null | undefined, lastName: string | null | undefined, dash: string): string {
  const s = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return s || dash;
}

function summarizeClinicalEvent(
  row: ClinicalTimelineApiRow,
  language: SupportedLanguage,
  t: (key: string) => string
): { label: string; summary: string } {
  if (row.eventType === "VITALS_RECORDED") {
    const payload = asRecord(row.payloadJson) ?? {};
    const vitalsRaw = payload.vitals;
    const vitals =
      vitalsRaw != null && typeof vitalsRaw === "object" && !Array.isArray(vitalsRaw)
        ? (vitalsRaw as Record<string, unknown>)
        : {};
    const line = formatEncounterVitalsHistoryCompactLine(vitals, language).trim();
    const base = summarizeClinicalTimelineRow(row, t);
    return {
      label: base.label,
      summary: line || t("emergencyVisitSummaryPanel.clinicalTimeline.noVitalsDetail"),
    };
  }
  if (row.eventType === "PROCEDURE_DOCUMENTED") {
    const payload = asRecord(row.payloadJson) ?? {} as ProcedurePayload;
    const proc = typeof payload.procedureType === "string" ? payload.procedureType : "";
    const procedure = procedureTypeDisplayName(t, proc);
    const detail = procedureTimelineCompactSuffix(payload, t);
    const label = t("emergencyVisitSummaryPanel.clinicalTimeline.event.procedureDocumented")
      .replace("{procedure}", procedure)
      .replace("{detail}", detail);
    const summary = buildProcedureTimelineDetailLine(
      payload,
      row.createdAt,
      language,
      t,
      row.createdBy,
      (fn, ln) => formatActor(fn, ln, t("common.dash"))
    );
    return { label, summary };
  }
  return summarizeClinicalTimelineRow(row, t);
}

export function ClinicalTimeline({
  encounterId,
  facilityId,
  refreshToken,
}: {
  encounterId: string;
  facilityId: string;
  /** Bump to refetch (e.g. after chart saves). */
  refreshToken?: number;
}) {
  const { t, language } = useI18n();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    items: ClinicalTimelineApiRow[];
  }>({ loading: true, error: false, items: [] });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    (async () => {
      try {
        const data = await apiFetch(
          `/encounters/${encounterId}/clinical-timeline?limit=${DEFAULT_LIMIT}`,
          { facilityId }
        );
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : [];
        const items: ClinicalTimelineApiRow[] = [];
        for (const r of raw) {
          if (!r || typeof r !== "object" || Array.isArray(r)) continue;
          const o = r as Record<string, unknown>;
          const id = typeof o.id === "string" ? o.id : "";
          const eventType = typeof o.eventType === "string" ? o.eventType : "";
          const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
          const cb = asRecord(o.createdBy);
          if (!id || !eventType || !createdAt || !cb) continue;
          items.push({
            id,
            eventType,
            createdAt,
            createdBy: {
              userId: typeof cb.userId === "string" ? cb.userId : "",
              firstName: typeof cb.firstName === "string" ? cb.firstName : null,
              lastName: typeof cb.lastName === "string" ? cb.lastName : null,
            },
            payloadJson: o.payloadJson,
          });
        }
        setState({ loading: false, error: false, items });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, items: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken]);

  const sectionTitle: React.CSSProperties = {
    margin: 0,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const lineStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.45,
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <p style={sectionTitle}>{t("emergencyVisitSummaryPanel.clinicalTimeline.title")}</p>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "10px 14px 12px" }}>
        {state.loading ? (
          <p style={{ ...lineStyle, color: "#64748b" }}>{t("common.loading")}</p>
        ) : state.error ? (
          <p style={{ ...lineStyle, color: "#92400e", fontWeight: 600 }}>
            {t("emergencyVisitSummaryPanel.clinicalTimeline.loadError")}
          </p>
        ) : state.items.length === 0 ? (
          <p style={{ ...lineStyle, color: "#64748b" }}>{t("emergencyVisitSummaryPanel.clinicalTimeline.empty")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {state.items.map((row, i) => {
              const { label, summary } = summarizeClinicalEvent(row, language, t);
              const when = formatEncounterChromeDateTime(row.createdAt, language);
              const actor = formatActor(row.createdBy.firstName, row.createdBy.lastName, t("common.dash"));
              return (
                <li
                  key={row.id}
                  style={{
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom: i === state.items.length - 1 ? "none" : "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                    <span style={{ color: "#0f172a", fontWeight: 700 }}>{when}</span>
                    <span style={{ color: "#94a3b8" }}> — </span>
                    <span>{actor}</span>
                  </div>
                  <p style={{ ...lineStyle, fontWeight: 700, color: "#0f172a", marginBottom: summary ? 2 : 0 }}>
                    {label}
                  </p>
                  {summary ? <p style={{ ...lineStyle, color: "#475569", fontSize: 11 }}>{summary}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
