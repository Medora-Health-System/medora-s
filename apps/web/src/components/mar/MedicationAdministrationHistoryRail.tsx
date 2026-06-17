"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MedoraCardBadge } from "@/components/medora-card/MedoraCardBadge";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import {
  buildMedicationAdministrationHistoryRailEntries,
  isClinicalViewportMobile,
  isClinicalViewportTabletOrBelow,
  marAdministrationHistoryRailSideWidthPercent,
  marAdministrationHistoryRailTimelineWidthPercent,
  readStoredMarAdministrationHistoryRailExpanded,
  resolveClinicalViewportModeFromWidth,
  resolveMarAdministrationHistoryRailDefaultExpanded,
  resolveMarAdministrationHistoryRailLayoutMode,
  writeStoredMarAdministrationHistoryRailExpanded,
  type MarAdministrationHistoryRailLayoutMode,
  type MedicationAdministrationHistoryRailEntry,
} from "@/lib/medicationAdministrationHistoryRail";
import { fetchMedicationAdministrationHistory } from "@/lib/medicationAdministrationHistoryApi";
import {
  filterMedicationAdministrationHistoryByInstantWindow,
  type MarHistoryRailScopeMode,
} from "@/lib/marHistoricalTimeline";
import { useI18n } from "@/lib/i18n";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";

export type MedicationAdministrationHistoryRailProps = {
  facilityId: string;
  encounterId: string;
  viewerUserId?: string | null;
  facilityTimeZone?: string | null;
  compact?: boolean;
  selectedDayWindow?: { startIso: string; endIso: string } | null;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
};

function HistoryRailEntryCard({
  entry,
  t,
  compact,
}: {
  entry: MedicationAdministrationHistoryRailEntry;
  t: (key: string) => string;
  compact?: boolean;
}) {
  return (
    <li
      data-testid="mar-administration-history-entry"
      data-event-type={entry.eventType}
      style={{
        listStyle: "none",
        padding: compact ? "8px 10px" : "10px 12px",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.35,
          color: "#0f172a",
        }}
      >
        {entry.medicationLine}
      </div>
      <div style={{ marginTop: 6 }}>
        <MedoraCardBadge soft={entry.badgeSoft} compact={compact}>
          {t(entry.statusLabelKey)}
        </MedoraCardBadge>
      </div>
      <div
        style={{ marginTop: 6, fontSize: compact ? 12 : 13, color: "#475569" }}
        data-testid="mar-administration-history-clinical-time"
      >
        {entry.clinicalTimeLabel}
      </div>
      {entry.showAdjustedTime && entry.documentedTimeLabel ? (
        <div
          style={{ marginTop: 4, fontSize: compact ? 11 : 12, color: "#64748b" }}
          data-testid="mar-administration-history-documented-time"
        >
          <MedoraCardBadge preset="neutral" compact>
            {t("marTab.adminTime.adjustedBadge")}
          </MedoraCardBadge>
          <span style={{ marginLeft: 6 }}>{entry.documentedTimeLabel}</span>
        </div>
      ) : null}
      {entry.performerLine ? (
        <div style={{ marginTop: 4, fontSize: compact ? 12 : 13, color: "#334155" }}>
          {entry.performerLine}
        </div>
      ) : null}
      {entry.prnIndicationLine ? (
        <div style={{ marginTop: 4, fontSize: compact ? 12 : 13, color: "#64748b" }}>
          {entry.prnIndicationLine}
        </div>
      ) : null}
      {entry.reasonLine ? (
        <div style={{ marginTop: 4, fontSize: compact ? 12 : 13, color: "#64748b" }}>
          {entry.reasonLine}
        </div>
      ) : null}
    </li>
  );
}

export function MedicationAdministrationHistoryRail({
  facilityId,
  encounterId,
  viewerUserId = null,
  facilityTimeZone = null,
  compact = false,
  selectedDayWindow = null,
  onRegisterRefresh,
}: MedicationAdministrationHistoryRailProps) {
  const { t, language } = useI18n();

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MedicationAdministrationHistoryRailEntry[]>([]);
  const [historyScope, setHistoryScope] = useState<MarHistoryRailScopeMode>("selectedDay");

  const layoutMode: MarAdministrationHistoryRailLayoutMode = useMemo(
    () => resolveMarAdministrationHistoryRailLayoutMode(viewportWidth),
    [viewportWidth]
  );
  const viewportMode = useMemo(
    () => resolveClinicalViewportModeFromWidth(viewportWidth),
    [viewportWidth]
  );
  const isMobile = isClinicalViewportMobile(viewportWidth);
  const isTabletOrBelow = isClinicalViewportTabletOrBelow(viewportWidth);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const userId = viewerUserId?.trim() || "";
    const stored = userId
      ? readStoredMarAdministrationHistoryRailExpanded(facilityId, encounterId, userId)
      : null;
    if (stored != null) {
      setExpanded(stored);
      return;
    }
    setExpanded(resolveMarAdministrationHistoryRailDefaultExpanded(viewportMode));
  }, [facilityId, encounterId, viewerUserId, viewportMode]);

  const formatClinicalTime = useCallback(
    (iso: string) => formatClinicalInstantForFacility(iso, facilityTimeZone, language),
    [facilityTimeZone, language]
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchMedicationAdministrationHistory(encounterId, facilityId);
      const scopedRows =
        historyScope === "selectedDay" && selectedDayWindow
          ? filterMedicationAdministrationHistoryByInstantWindow(rows, selectedDayWindow)
          : rows;
      setEntries(
        buildMedicationAdministrationHistoryRailEntries(scopedRows, {
          formatClinicalTime,
          t,
        })
      );
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, formatClinicalTime, historyScope, selectedDayWindow, t]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    onRegisterRefresh?.(loadHistory);
  }, [onRegisterRefresh, loadHistory]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    const userId = viewerUserId?.trim();
    if (userId) {
      writeStoredMarAdministrationHistoryRailExpanded(facilityId, encounterId, userId, next);
    }
  };

  const count = entries.length;
  const collapsedBar = (
    <button
      type="button"
      data-testid="mar-administration-history-toggle"
      aria-expanded={expanded}
      aria-controls="mar-administration-history-panel"
      onClick={toggleExpanded}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: layoutMode === "sideRail" ? "100%" : "100%",
        minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
        padding: compact ? "8px 10px" : "10px 12px",
        border: MEDORA_CARD_SHELL.border,
        borderRadius: 12,
        background: "#f8fafc",
        color: "#334155",
        fontWeight: 600,
        fontSize: compact ? 13 : 14,
        cursor: "pointer",
      }}
    >
      <span aria-hidden="true">🕘</span>
      <span>{t("marAdministrationHistory.title")}</span>
      <span data-testid="mar-administration-history-count">({count})</span>
    </button>
  );

  const panelBody = loading ? (
    <p style={{ margin: 0, padding: compact ? "8px 10px" : "12px", fontSize: 13, color: "#64748b" }}>
      {t("common.loading")}
    </p>
  ) : count === 0 ? (
    <p
      data-testid="mar-administration-history-empty"
      style={{ margin: 0, padding: compact ? "8px 10px" : "12px", fontSize: 13, color: "#64748b" }}
    >
      {t("marAdministrationHistory.empty")}
    </p>
  ) : (
    <ul
      data-testid="mar-administration-history-list"
      style={{
        margin: 0,
        padding: 0,
        overflowY: "auto",
        maxHeight: layoutMode === "sideRail" ? (compact ? 420 : 520) : isMobile ? 280 : 360,
      }}
    >
      {entries.map((entry) => (
        <HistoryRailEntryCard key={entry.id} entry={entry} t={t} compact={compact} />
      ))}
    </ul>
  );

  if (!expanded) {
    return (
      <aside
        data-testid="mar-administration-history-rail"
        data-layout-mode={layoutMode}
        data-expanded="false"
        data-viewport={isMobile ? "mobile" : isTabletOrBelow ? "tablet" : "desktop"}
        aria-label={t("marAdministrationHistory.title")}
        style={{
          flex:
            layoutMode === "sideRail"
              ? `0 0 ${marAdministrationHistoryRailSideWidthPercent()}%`
              : "0 0 auto",
          minWidth: layoutMode === "sideRail" ? 220 : undefined,
          maxWidth: layoutMode === "sideRail" ? 360 : undefined,
        }}
      >
        {collapsedBar}
      </aside>
    );
  }

  return (
    <aside
      data-testid="mar-administration-history-rail"
      data-layout-mode={layoutMode}
      data-expanded="true"
      data-viewport={isMobile ? "mobile" : isTabletOrBelow ? "tablet" : "desktop"}
      aria-label={t("marAdministrationHistory.title")}
      style={{
        flex:
          layoutMode === "sideRail"
            ? `0 0 ${marAdministrationHistoryRailSideWidthPercent()}%`
            : "1 1 auto",
        minWidth: layoutMode === "sideRail" ? 240 : 0,
        maxWidth: layoutMode === "sideRail" ? 400 : undefined,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        id="mar-administration-history-panel"
        style={{
          ...MEDORA_CARD_SHELL,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: compact ? "8px 10px" : "10px 12px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: compact ? 14 : 15,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {t("marAdministrationHistory.title")}
            <span
              data-testid="mar-administration-history-count"
              style={{ marginLeft: 6, fontWeight: 500, color: "#64748b" }}
            >
              ({count})
            </span>
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {selectedDayWindow ? (
              <select
                data-testid="mar-administration-history-scope"
                value={historyScope}
                onChange={(event) =>
                  setHistoryScope(event.target.value as MarHistoryRailScopeMode)
                }
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  background: "#fff",
                }}
              >
                <option value="selectedDay">{t("marHistorical.historyScopeSelectedDay")}</option>
                <option value="all">{t("marHistorical.historyScopeAll")}</option>
              </select>
            ) : null}
            <button
            type="button"
            data-testid="mar-administration-history-toggle"
            aria-expanded={expanded}
            aria-controls="mar-administration-history-panel"
            onClick={toggleExpanded}
            style={{
              minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
              minWidth: CLINICAL_MIN_TOUCH_TARGET_PX,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              color: "#475569",
            }}
          >
            {t("marAdministrationHistory.collapse")}
          </button>
          </div>
        </div>
        <div
          data-testid="mar-administration-history-scroll"
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          {panelBody}
        </div>
      </div>
    </aside>
  );
}

export { marAdministrationHistoryRailTimelineWidthPercent };
