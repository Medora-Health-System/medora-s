"use client";

import React, { useMemo, useState } from "react";
import { MEDORA_CARD_SHELL, NEUTRAL_BADGE } from "@/components/medora-card/medoraCardTokens";
import { useUnifiedEncounterTimeline } from "@/hooks/useUnifiedEncounterTimeline";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  buildCommandTimelineExpandedLines,
  buildCommandTimelinePrimaryActorLine,
  categoryTone,
  commandTimelineCategoryI18nKey,
  commandTimelineEventTitle,
  commandTimelineFilterI18nKey,
  computeCarePhaseMarkers,
  filterCommandTimelineItems,
  formatCommandTimelineTimeBlock,
  itemNeedsOperationalFollowUp,
  type CommandTimelineFilter,
  type CommandTimelineViewMode,
  resolveCommandTimelineCategory,
} from "@/lib/enterpriseEncounterCommandTimelineModel";
import { unifiedTimelineChipLabel } from "@/lib/unifiedEncounterTimelineUi";
import { useI18n } from "@/lib/i18n";

const FILTER_OPTIONS: CommandTimelineFilter[] = [
  "ALL",
  "ED_OBSERVATION",
  "ORDERS",
  "MAR",
  "LAB",
  "RADIOLOGY",
  "PROCEDURES",
  "DOCUMENTATION",
  "DISCHARGE",
  "CORRECTED_ONLY",
  "NEEDS_FOLLOWUP",
];

export function EnterpriseEncounterCommandTimeline({
  encounterId,
  facilityId,
  refreshToken,
  defaultViewMode = "COMPACT",
  limit = 80,
  embedded = false,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken?: number;
  defaultViewMode?: CommandTimelineViewMode;
  limit?: number;
  embedded?: boolean;
}) {
  const { t, language } = useI18n();
  const { loading, error, items, capped, limit: responseLimit } = useUnifiedEncounterTimeline(
    encounterId,
    facilityId,
    { limit, refreshToken }
  );
  const [filter, setFilter] = useState<CommandTimelineFilter>("ALL");
  const [viewMode, setViewMode] = useState<CommandTimelineViewMode>(defaultViewMode);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const filteredItems = useMemo(() => filterCommandTimelineItems(items, filter), [items, filter]);
  const phaseMarkers = useMemo(() => computeCarePhaseMarkers(items), [items]);

  const formatDt = (iso: string | null) =>
    iso ? formatEncounterChromeDateTime(iso, language) : t("common.dash");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shellStyle: React.CSSProperties = embedded
    ? { border: "none", borderRadius: 0, background: "transparent", boxShadow: "none" }
    : {
        border: MEDORA_CARD_SHELL.border,
        borderRadius: MEDORA_CARD_SHELL.radius,
        background: MEDORA_CARD_SHELL.background,
        boxShadow: MEDORA_CARD_SHELL.boxShadow,
        overflow: "hidden",
      };

  return (
    <div style={shellStyle}>
      <div
        style={{
          padding: embedded ? "0 0 12px" : "14px 16px 12px",
          borderBottom: embedded ? "none" : "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              {t("commandTimeline.title")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", maxWidth: 520 }}>
              {t("commandTimeline.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => setViewMode("COMPACT")} style={viewToggleStyle(viewMode === "COMPACT")}>
              {t("commandTimeline.viewMode.compact")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("DETAILED")}
              style={viewToggleStyle(viewMode === "DETAILED")}
            >
              {t("commandTimeline.viewMode.detailed")}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {phaseMarkers.map((m) => (
            <span
              key={m.phase}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 9999,
                border: `1px solid ${m.reached ? "#86efac" : "#e2e8f0"}`,
                background: m.reached ? "#ecfdf5" : "#f8fafc",
                color: m.reached ? "#047857" : "#94a3b8",
              }}
            >
              {t(`commandTimeline.phase.${m.phase}`)}
              {m.reached && m.latestAtIso ? ` · ${formatDt(m.latestAtIso)}` : ""}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {FILTER_OPTIONS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} style={filterPillStyle(filter === f)}>
              {t(commandTimelineFilterI18nKey(f))}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: embedded ? 0 : "12px 16px 16px", maxHeight: embedded ? 360 : 560, overflowY: "auto" }}>
        {loading ? (
          <p style={mutedLine}>{t("common.loading")}</p>
        ) : error ? (
          <p style={{ ...mutedLine, color: "#92400e", fontWeight: 600 }}>{t("unifiedTimeline.loadError")}</p>
        ) : filteredItems.length === 0 ? (
          <p style={mutedLine}>{t("commandTimeline.emptyFiltered")}</p>
        ) : (
          <>
            {capped ? (
              <p style={{ ...mutedLine, color: "#92400e", marginBottom: 10 }}>
                {t("unifiedTimeline.cappedHint").replace("{limit}", String(responseLimit))}
              </p>
            ) : null}
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {filteredItems.map((item, index) => {
                const category = resolveCommandTimelineCategory(item);
                const tone = categoryTone(category);
                const expanded = expandedIds.has(item.id);
                const title = commandTimelineEventTitle(item, t, language);
                const actorLine = buildCommandTimelinePrimaryActorLine(item, t);
                const timeBlock = formatCommandTimelineTimeBlock(item, formatDt, t, viewMode);
                const expandedLines = buildCommandTimelineExpandedLines(item, t, formatDt);
                const isLast = index === filteredItems.length - 1;

                return (
                  <li
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr",
                      gap: 10,
                      paddingBottom: isLast ? 0 : 14,
                      marginBottom: isLast ? 0 : 14,
                      borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ position: "relative", paddingTop: 4 }}>
                      <span
                        style={{
                          display: "block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: tone.accent,
                          border: "2px solid #fff",
                          boxShadow: `0 0 0 1px ${tone.border}`,
                        }}
                      />
                      {!isLast ? (
                        <span
                          style={{
                            position: "absolute",
                            left: 4,
                            top: 14,
                            bottom: -14,
                            width: 2,
                            background: "#e2e8f0",
                          }}
                        />
                      ) : null}
                    </div>
                    <article
                      style={{
                        border: `1px solid ${tone.border}`,
                        borderLeft: `3px solid ${tone.accent}`,
                        borderRadius: 10,
                        background: tone.bg,
                        padding: viewMode === "COMPACT" ? "8px 10px" : "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: tone.text,
                            background: "#fff",
                            border: `1px solid ${tone.border}`,
                            borderRadius: 9999,
                            padding: "2px 7px",
                          }}
                        >
                          {t(commandTimelineCategoryI18nKey(category))}
                        </span>
                        {item.chips.map((chip) => (
                          <span key={chip} style={chipBadgeStyle}>
                            {unifiedTimelineChipLabel(chip, t)}
                          </span>
                        ))}
                        {item.hasClinicalTimeCorrection ? (
                          <span
                            style={{
                              ...chipBadgeStyle,
                              color: "#b45309",
                              borderColor: "#fde68a",
                              background: "#fffbeb",
                            }}
                          >
                            {t("commandTimeline.badges.timeCorrected")}
                          </span>
                        ) : null}
                        {itemNeedsOperationalFollowUp(item) ? (
                          <span
                            style={{
                              ...chipBadgeStyle,
                              color: "#b91c1c",
                              borderColor: "#fecaca",
                              background: "#fef2f2",
                            }}
                          >
                            {t("commandTimeline.badges.needsFollowUp")}
                          </span>
                        ) : null}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: viewMode === "COMPACT" ? 13 : 14,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {title}
                      </p>

                      {viewMode === "DETAILED" && item.summaryFr?.trim() ? (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                          {item.summaryFr.trim()}
                        </p>
                      ) : null}

                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#334155" }}>{actorLine}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748b" }}>{timeBlock.primary}</p>
                      {timeBlock.secondary ? (
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748b" }}>{timeBlock.secondary}</p>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        style={{
                          marginTop: 8,
                          padding: 0,
                          border: "none",
                          background: "none",
                          color: "#2563eb",
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {expanded ? t("commandTimeline.collapseDetails") : t("commandTimeline.expandDetails")}
                      </button>

                      {expanded ? (
                        <ul
                          style={{
                            margin: "8px 0 0",
                            paddingLeft: 16,
                            fontSize: 10,
                            color: "#475569",
                            lineHeight: 1.5,
                          }}
                        >
                          {expandedLines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

const mutedLine: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.45,
};

const chipBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: NEUTRAL_BADGE.text,
  backgroundColor: NEUTRAL_BADGE.bg,
  border: `1px solid ${NEUTRAL_BADGE.border}`,
  borderRadius: 9999,
  padding: "1px 6px",
};

function filterPillStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 9999,
    border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1d4ed8" : "#475569",
    cursor: "pointer",
  };
}

function viewToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 8,
    border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#475569",
    cursor: "pointer",
  };
}
