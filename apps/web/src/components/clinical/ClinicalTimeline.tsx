"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { formatEncounterVitalsHistoryCompactLine } from "@/lib/patientVitals";
import {
  buildProcedureTimelineDetailLine,
  procedureTimelineCompactSuffix,
  procedureTypeDisplayName,
  type ProcedurePayload,
} from "@/lib/lacerationProcedurePayloadDisplay";
import { OBSERVATION_REASSESSMENT_EVENT_SOURCE } from "@medora/shared";

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
  const payload = asRecord(row.payloadJson) ?? {};

  switch (row.eventType) {
    case "VITALS_RECORDED": {
      const vitalsRaw = payload.vitals;
      const vitals =
        vitalsRaw != null && typeof vitalsRaw === "object" && !Array.isArray(vitalsRaw)
          ? (vitalsRaw as Record<string, unknown>)
          : {};
      const line = formatEncounterVitalsHistoryCompactLine(vitals, language).trim();
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.vitalsRecorded"),
        summary: line || t("emergencyVisitSummaryPanel.clinicalTimeline.noVitalsDetail"),
      };
    }
    case "PROVIDER_SIGNED":
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.providerSigned"),
        summary: "",
      };
    case "PROVIDER_UNLOCKED":
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.providerUnlocked"),
        summary: "",
      };
    case "PROVIDER_MSE_SAVED":
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.providerMseSaved"),
        summary: "",
      };
    case "NURSING_ASSESSMENT_SAVED": {
      if (payload.source === OBSERVATION_REASSESSMENT_EVENT_SOURCE) {
        const obs = asRecord(payload.observationReassessmentV1) ?? {};
        const roleRaw = typeof obs.role === "string" ? obs.role : "";
        const roleLabel =
          roleRaw === "PROVIDER"
            ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessmentRoleMd")
            : roleRaw === "RN"
              ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessmentRoleRn")
              : roleRaw;
        const ps = typeof obs.patientStatus === "string" ? obs.patientStatus : "";
        const statusLabel =
          ps === "improved"
            ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusImproved")
            : ps === "worsening"
              ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusWorsening")
              : t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusUnchanged");
        const note = typeof obs.note === "string" && obs.note.trim() ? obs.note.trim() : "";
        const summary = note
          ? `${statusLabel} — ${note.slice(0, 160)}${note.length > 160 ? "…" : ""}`
          : statusLabel;
        return {
          label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessment").replace(
            "{role}",
            roleLabel
          ),
          summary,
        };
      }
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.nursingAssessmentSaved"),
        summary: "",
      };
    }
    case "HANDOFF_PROVIDER": {
      const name = typeof payload.toDisplayName === "string" && payload.toDisplayName.trim()
        ? payload.toDisplayName.trim()
        : t("emergencyVisitSummaryPanel.clinicalTimeline.handoffUnknown");
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.handoffProvider").replace("{name}", name),
        summary: "",
      };
    }
    case "HANDOFF_NURSING": {
      const snap = asRecord(payload.snapshot);
      const rn =
        snap && typeof snap.receivingNurseName === "string" && snap.receivingNurseName.trim()
          ? snap.receivingNurseName.trim()
          : t("emergencyVisitSummaryPanel.clinicalTimeline.handoffUnknown");
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.handoffNursing").replace("{name}", rn),
        summary: "",
      };
    }
    case "IV_INSERTED": {
      const gauge = typeof payload.gauge === "string" ? payload.gauge.trim() : "";
      const site = typeof payload.site === "string" ? payload.site.trim() : "";
      const detail = [gauge, site].filter(Boolean).join(" ").trim() || "—";
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.ivInserted").replace("{detail}", detail),
        summary: "",
      };
    }
    case "IV_REMOVED": {
      const gauge = typeof payload.gauge === "string" ? payload.gauge.trim() : "";
      const site = typeof payload.site === "string" ? payload.site.trim() : "";
      const detail = [gauge, site].filter(Boolean).join(" ").trim() || "—";
      return {
        label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.ivRemoved").replace("{detail}", detail),
        summary: "",
      };
    }
    case "PROCEDURE_DOCUMENTED": {
      const p = payload as ProcedurePayload;
      const proc = typeof p.procedureType === "string" ? p.procedureType : "";
      const procedure = procedureTypeDisplayName(t, proc);
      const detail = procedureTimelineCompactSuffix(p, t);
      const label = t("emergencyVisitSummaryPanel.clinicalTimeline.event.procedureDocumented")
        .replace("{procedure}", procedure)
        .replace("{detail}", detail);
      const summary = buildProcedureTimelineDetailLine(
        p,
        row.createdAt,
        language,
        t,
        row.createdBy,
        (fn, ln) => formatActor(fn, ln, t("common.dash"))
      );
      return { label, summary };
    }
    default:
      return {
        label: row.eventType,
        summary: "",
      };
  }
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
