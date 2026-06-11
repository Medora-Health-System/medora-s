"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  MAR_SHIFT_TIMELINE_SHIFT_CODES,
  MAR_SHIFT_TIMELINE_SHIFT_LABELS,
  type MarShiftTimelineShiftCode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  fetchMarShiftTimeline,
  type MarShiftTimelineCellItem,
  type MarShiftTimelineResponse,
} from "@/lib/marShiftTimelineApi";
import {
  buildMarShiftTimelineItemHoverTitle,
  formatMarShiftTimelineHeaderClock,
  marShiftTimelineItemStatusStyle,
} from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineActionHandlers } from "@/features/mar/marShiftTimelineActions";
import { FacilityMarShiftTimelineDrawer } from "./FacilityMarShiftTimelineDrawer";

const DEFAULT_SHIFT_CODE: MarShiftTimelineShiftCode = "7A_7P";
const HEADER_CLOCK_REFRESH_MS = 60_000;

function interpolateMessage(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    template
  );
}

export type FacilityMarShiftTimelineProps = {
  facilityId: string;
  encounterId?: string;
  assignedToUserId?: string;
  compact?: boolean;
  actionHandlers?: MarShiftTimelineActionHandlers | null;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
  onRegisterCloseDrawer?: (close: () => void) => void;
};

type DrawerSelection = {
  item: MarShiftTimelineCellItem;
  patientDisplay: string;
  roomLabel: string | null;
};

export function FacilityMarShiftTimeline({
  facilityId,
  encounterId,
  assignedToUserId,
  compact = false,
  actionHandlers = null,
  onRegisterRefresh,
  onRegisterCloseDrawer,
}: FacilityMarShiftTimelineProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [shiftCode, setShiftCode] = useState<MarShiftTimelineShiftCode>(DEFAULT_SHIFT_CODE);
  const [data, setData] = useState<MarShiftTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(null);
  const [headerNow, setHeaderNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setHeaderNow(new Date()), HEADER_CLOCK_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchMarShiftTimeline({
        facilityId,
        encounterId,
        assignedToUserId,
        shiftCode,
        includeCompleted: true,
        includeUpcoming: true,
      });
      setData(response);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [assignedToUserId, encounterId, facilityId, shiftCode]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    onRegisterRefresh?.(loadTimeline);
  }, [loadTimeline, onRegisterRefresh]);

  useEffect(() => {
    onRegisterCloseDrawer?.(() => setDrawerSelection(null));
  }, [onRegisterCloseDrawer]);

  const title =
    data?.title?.trim() ||
    (data?.facility?.name
      ? `${data.facility.name} MAR SHIFT TIMELINE`
      : t("marShiftTimeline.titleFallback"));

  const viewerName = data?.viewer?.displayName?.trim() || "—";
  const headerClockText = formatMarShiftTimelineHeaderClock(headerNow, dateLocale);

  return (
    <section
      data-testid="facility-mar-shift-timeline"
      aria-label={title}
      style={{
        marginBottom: compact ? 10 : 14,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        padding: compact ? "10px 12px" : "12px 14px",
      }}
    >
      <header style={{ marginBottom: compact ? 8 : 10 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <h2
            data-testid="mar-shift-timeline-title"
            style={{ margin: 0, fontSize: compact ? 15 : 17, lineHeight: 1.25, flex: 1 }}
          >
            {title}
          </h2>
          <span
            data-testid="mar-shift-timeline-current-time"
            style={{ fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}
          >
            {interpolateMessage(t("marShiftTimeline.currentTimeLine"), { datetime: headerClockText })}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px 16px",
            fontSize: 13,
            color: "#475569",
          }}
        >
          <span data-testid="mar-shift-timeline-viewer">
            {interpolateMessage(t("marShiftTimeline.nurseLine"), { name: viewerName })}
          </span>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>{t("marShiftTimeline.shiftLabel")}</span>
            <select
              data-testid="mar-shift-timeline-shift-select"
              value={shiftCode}
              onChange={(e) => setShiftCode(e.target.value as MarShiftTimelineShiftCode)}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                backgroundColor: "#fff",
              }}
            >
              {MAR_SHIFT_TIMELINE_SHIFT_CODES.map((code) => (
                <option key={code} value={code}>
                  {MAR_SHIFT_TIMELINE_SHIFT_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p data-testid="mar-shift-timeline-error" style={{ margin: 0, fontSize: 13, color: "#b45309" }}>
          {t("marShiftTimeline.error")}
        </p>
      ) : data && !data.enabled ? (
        <p data-testid="mar-shift-timeline-disabled" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("marShiftTimeline.disabled")}
        </p>
      ) : data && data.rows.length === 0 ? (
        <p data-testid="mar-shift-timeline-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("marShiftTimeline.empty")}
        </p>
      ) : data ? (
        <div
          data-testid="mar-shift-timeline-grid-scroll"
          style={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            backgroundColor: "#fff",
          }}
        >
          <table
            data-testid="mar-shift-timeline-grid"
            style={{
              borderCollapse: "collapse",
              minWidth: "100%",
              width: "max-content",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    backgroundColor: "#f1f5f9",
                    borderBottom: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    padding: "8px 10px",
                    textAlign: "left",
                    minWidth: 160,
                  }}
                >
                  {t("marShiftTimeline.patientRoomColumn")}
                </th>
                {data.shift.columns.map((column) => (
                  <th
                    key={column.key}
                    data-testid={`mar-shift-timeline-column-${column.label}`}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      borderRight: "1px solid #e2e8f0",
                      padding: "8px 6px",
                      minWidth: 72,
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.encounterId} data-testid={`mar-shift-timeline-row-${row.encounterId}`}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      backgroundColor: "#fff",
                      borderBottom: "1px solid #e2e8f0",
                      borderRight: "1px solid #e2e8f0",
                      padding: "8px 10px",
                      verticalAlign: "top",
                    }}
                  >
                    <div data-testid="mar-shift-timeline-patient" style={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {row.patientDisplay}
                    </div>
                    <div data-testid="mar-shift-timeline-room" style={{ color: "#64748b", marginTop: 2 }}>
                      {row.roomLabel?.trim() || t("common.dash")}
                    </div>
                  </td>
                  {data.shift.columns.map((column) => {
                    const cell = row.cells.find((c) => c.columnKey === column.key);
                    return (
                      <td
                        key={`${row.encounterId}-${column.key}`}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          borderRight: "1px solid #e2e8f0",
                          padding: 4,
                          verticalAlign: "top",
                          minWidth: 72,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {(cell?.items ?? []).map((item) => {
                            const readOnly = item.readOnly === true || item.doseStatus === "COMPLETED";
                            const statusStyle = marShiftTimelineItemStatusStyle(item.doseStatus, readOnly);
                            return (
                              <button
                                key={item.medicationDoseInstanceId}
                                type="button"
                                data-testid="mar-shift-timeline-cell-item"
                                data-dose-status={item.doseStatus}
                                data-read-only={readOnly ? "true" : "false"}
                                aria-label={`${item.primaryText} ${item.secondaryText} ${item.tertiaryText ?? ""}`.trim()}
                                title={buildMarShiftTimelineItemHoverTitle(item)}
                                onClick={() =>
                                  setDrawerSelection({
                                    item,
                                    patientDisplay: row.patientDisplay,
                                    roomLabel: row.roomLabel,
                                  })
                                }
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  border: `1px solid ${statusStyle.borderColor}`,
                                  backgroundColor: statusStyle.backgroundColor as string,
                                  color: statusStyle.color as string,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  lineHeight: 1.25,
                                }}
                              >
                                <div data-testid="mar-shift-timeline-primary-text">{item.primaryText}</div>
                                {item.secondaryText?.trim() ? (
                                  <div
                                    data-testid="mar-shift-timeline-secondary-text"
                                    style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}
                                  >
                                    {item.secondaryText}
                                  </div>
                                ) : null}
                                {item.tertiaryText?.trim() ? (
                                  <div
                                    data-testid="mar-shift-timeline-tertiary-text"
                                    style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}
                                  >
                                    {item.tertiaryText}
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <FacilityMarShiftTimelineDrawer
        item={drawerSelection?.item ?? null}
        context={
          drawerSelection
            ? {
                patientDisplay: drawerSelection.patientDisplay,
                roomLabel: drawerSelection.roomLabel,
              }
            : null
        }
        actionHandlers={actionHandlers}
        onClose={() => setDrawerSelection(null)}
        onActionSuccess={async () => {
          await loadTimeline();
          setDrawerSelection(null);
        }}
      />
    </section>
  );
}
