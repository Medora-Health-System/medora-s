"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import type { UnifiedTimelineApiItem } from "@/lib/unifiedEncounterTimelineUi";
import {
  formatUnifiedTimelineCorrectionLine,
  summarizeUnifiedTimelineItem,
} from "@/lib/unifiedEncounterTimelineUi";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

const DEFAULT_LIMIT = 40;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function parseUnifiedTimelineResponse(data: unknown): {
  items: UnifiedTimelineApiItem[];
  capped: boolean;
  limit: number;
} {
  const root = asRecord(data);
  const itemsRaw = Array.isArray(root?.items) ? root.items : [];
  const items: UnifiedTimelineApiItem[] = [];
  for (const r of itemsRaw) {
    const o = asRecord(r);
    if (!o) continue;
    const id = typeof o.id === "string" ? o.id : "";
    const sourceKind = typeof o.sourceKind === "string" ? o.sourceKind : "";
    const documentedAtIso = typeof o.documentedAtIso === "string" ? o.documentedAtIso : "";
    if (!id || !sourceKind || !documentedAtIso) continue;
    const actor = asRecord(o.actor) ?? {};
    items.push({
      id,
      sourceKind: sourceKind as UnifiedTimelineApiItem["sourceKind"],
      sourceId: typeof o.sourceId === "string" ? o.sourceId : "",
      storedEventType: typeof o.storedEventType === "string" ? o.storedEventType : "",
      displayEventType: typeof o.displayEventType === "string" ? o.displayEventType : "",
      displayGroup: (typeof o.displayGroup === "string"
        ? o.displayGroup
        : "CLINICAL") as UnifiedTimelineApiItem["displayGroup"],
      carePhase: (typeof o.carePhase === "string" ? o.carePhase : "ED") as UnifiedTimelineApiItem["carePhase"],
      documentedAtIso,
      effectiveClinicalAtIso:
        typeof o.effectiveClinicalAtIso === "string" ? o.effectiveClinicalAtIso : null,
      hasClinicalTimeCorrection: o.hasClinicalTimeCorrection === true,
      actor: {
        userId: typeof actor.userId === "string" ? actor.userId : null,
        displayName: typeof actor.displayName === "string" ? actor.displayName : null,
        role: typeof actor.role === "string" ? actor.role : null,
        department: typeof actor.department === "string" ? actor.department : null,
      },
      chips: Array.isArray(o.chips)
        ? (o.chips.filter((c) => typeof c === "string") as UnifiedTimelineApiItem["chips"])
        : [],
      titleFr: typeof o.titleFr === "string" ? o.titleFr : null,
      titleEn: typeof o.titleEn === "string" ? o.titleEn : null,
      summaryFr: typeof o.summaryFr === "string" ? o.summaryFr : null,
      summaryEn: typeof o.summaryEn === "string" ? o.summaryEn : null,
      orderId: typeof o.orderId === "string" ? o.orderId : null,
      orderItemId: typeof o.orderItemId === "string" ? o.orderItemId : null,
      payloadJson: o.payloadJson,
    });
  }
  return {
    items,
    capped: root?.capped === true,
    limit: typeof root?.limit === "number" ? root.limit : DEFAULT_LIMIT,
  };
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
    items: UnifiedTimelineApiItem[];
    capped: boolean;
    limit: number;
  }>({ loading: true, error: false, items: [], capped: false, limit: DEFAULT_LIMIT });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    (async () => {
      try {
        const data = await apiFetch(
          `/encounters/${encounterId}/unified-timeline?limit=${DEFAULT_LIMIT}`,
          { facilityId }
        );
        if (cancelled) return;
        const parsed = parseUnifiedTimelineResponse(data);
        setState({
          loading: false,
          error: false,
          items: parsed.items,
          capped: parsed.capped,
          limit: parsed.limit,
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, items: [], capped: false, limit: DEFAULT_LIMIT });
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

  const chipStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 9999,
    padding: "1px 6px",
    marginRight: 4,
    marginTop: 2,
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
          <p style={{ ...lineStyle, color: "#92400e", fontWeight: 600 }}>{t("unifiedTimeline.loadError")}</p>
        ) : state.items.length === 0 ? (
          <p style={{ ...lineStyle, color: "#64748b" }}>{t("unifiedTimeline.empty")}</p>
        ) : (
          <>
            {state.capped ? (
              <p style={{ ...lineStyle, color: "#92400e", fontSize: 11, marginBottom: 8 }}>
                {t("unifiedTimeline.cappedHint").replace("{limit}", String(state.limit))}
              </p>
            ) : null}
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {state.items.map((row, i) => {
                const { label, summary, groupLabel, chipLabels } = summarizeUnifiedTimelineItem(
                  row,
                  language,
                  t
                );
                const when = formatEncounterChromeDateTime(row.documentedAtIso, language);
                const actor =
                  row.actor.displayName?.trim() ||
                  row.actor.department?.trim() ||
                  t("common.dash");
                const correctionLine = formatUnifiedTimelineCorrectionLine(row, language, t);
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
                      <span style={{ color: "#94a3b8" }}> · </span>
                      <span style={{ fontWeight: 600 }}>{groupLabel}</span>
                    </div>
                    {chipLabels.length > 0 ? (
                      <div style={{ marginBottom: 4 }}>
                        {chipLabels.map((chip) => (
                          <span key={chip} style={chipStyle}>
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p style={{ ...lineStyle, fontWeight: 700, color: "#0f172a", marginBottom: summary ? 2 : 0 }}>
                      {label}
                    </p>
                    {summary ? (
                      <p style={{ ...lineStyle, color: "#475569", fontSize: 11 }}>{summary}</p>
                    ) : null}
                    {correctionLine ? (
                      <p style={{ ...lineStyle, color: "#64748b", fontSize: 10, marginTop: 4 }}>{correctionLine}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
