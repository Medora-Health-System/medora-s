"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MAR_SHIFT_TIMELINE_SHIFT_CODES,
  MAR_SHIFT_TIMELINE_SHIFT_LABELS,
  type MarShiftTimelineShiftCode,
  isMarShiftTimelineItemActionable,
  formatMarShiftTimelineClinicalDateTime,
  buildMarShiftTimelineTitle,
  isMarMedicationResponseInternalSecondaryText,
  resolveMarMedicationResponseBadgeLabelKey,
  resolveMarShiftTimelineLatestResponsePainScores,
  isMedicationResponseRequired,
  toMedicationResponseEditabilityInput,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  fetchMarShiftTimeline,
  type MarShiftTimelineCellItem,
  type MarShiftTimelineResponse,
} from "@/lib/marShiftTimelineApi";
import {
  buildMarShiftTimelineItemHoverTitle,
  findMarShiftTimelineCellItem,
  formatMarShiftTimelineHeaderClock,
  marShiftTimelineItemStatusStyle,
  marShiftTimelinePrnRowStyle,
  marShiftTimelineRescheduleCellStyle,
  marShiftTimelineAdministrationVarianceCellStyle,
  marShiftTimelineMedicationResponseBadgeStyle,
  marShiftTimelineMedicationResponseFollowUpStyle,
  localizeMarTimelinePrnCellText,
  localizeMarShiftTimelineSecondaryText,
  reconcileMarShiftTimelineDrawerSelection,
  resolveMarShiftTimelineResponseTimelineLabelKey,
  type MarShiftTimelineDrawerSelection,
} from "@/features/mar/marShiftTimelineDisplay";
import {
  isRoutineMarDueAdministerShortcut,
  type MarShiftTimelineActionHandlers,
} from "@/features/mar/marShiftTimelineActions";
import { FacilityMarShiftTimelineDrawer } from "./FacilityMarShiftTimelineDrawer";
import {
  readStoredMarShiftTimelineShiftCode,
  writeStoredMarShiftTimelineShiftCode,
} from "@/lib/marShiftTimelineUiState";
import {
  buildHistoricalMarTimeline,
  resolveFacilityLocalToday,
  shouldUseExplicitMarShiftWindow,
} from "@/lib/marHistoricalTimeline";

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
  /** Active viewer user id — used for per-user shift preference persistence (K.10). */
  viewerUserId?: string;
  compact?: boolean;
  facilityTimeZone?: string | null;
  /** Facility-local YYYY-MM-DD; when not today, timeline loads that date's shift window. */
  selectedDateLocal?: string | null;
  historicalReadOnly?: boolean;
  actionHandlers?: MarShiftTimelineActionHandlers | null;
  onShiftCodeChange?: (shiftCode: MarShiftTimelineShiftCode) => void;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
  onRegisterCloseDrawer?: (close: () => void) => void;
  /** Re-open drawer with fresh timeline item after administer modal (K.10B.2). */
  onRegisterReopenDrawer?: (
    reopen: (orderItemId: string, medicationDoseInstanceId?: string | null, scheduledAt?: string | null) => void
  ) => void;
  /** Flatter layout when nested inside ED MAR card (no duplicate chrome). */
  embedded?: boolean;
};

type DrawerSelection = MarShiftTimelineDrawerSelection;

export function FacilityMarShiftTimeline({
  facilityId,
  encounterId,
  assignedToUserId,
  viewerUserId,
  compact = false,
  facilityTimeZone = null,
  selectedDateLocal = null,
  historicalReadOnly = false,
  actionHandlers = null,
  onShiftCodeChange,
  onRegisterRefresh,
  onRegisterCloseDrawer,
  onRegisterReopenDrawer,
  embedded = false,
}: FacilityMarShiftTimelineProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const shiftHydratedRef = useRef(false);
  const [shiftCode, setShiftCode] = useState<MarShiftTimelineShiftCode>(DEFAULT_SHIFT_CODE);
  const [data, setData] = useState<MarShiftTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(null);
  const [headerNow, setHeaderNow] = useState(() => new Date());

  const drawerActionHandlers = React.useMemo((): MarShiftTimelineActionHandlers | null => {
    if (!actionHandlers) return null;
    if (!historicalReadOnly) return actionHandlers;
    return { ...actionHandlers, historicalReviewMode: true };
  }, [actionHandlers, historicalReadOnly]);

  useEffect(() => {
    const id = window.setInterval(() => setHeaderNow(new Date()), HEADER_CLOCK_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    shiftHydratedRef.current = false;
  }, [facilityId, viewerUserId]);

  useEffect(() => {
    if (shiftHydratedRef.current || !facilityId.trim() || !viewerUserId?.trim()) return;
    const stored = readStoredMarShiftTimelineShiftCode(facilityId, viewerUserId);
    if (stored) setShiftCode(stored);
    shiftHydratedRef.current = true;
  }, [facilityId, viewerUserId]);

  const handleShiftChange = useCallback(
    (next: MarShiftTimelineShiftCode) => {
      setShiftCode(next);
      onShiftCodeChange?.(next);
      if (facilityId.trim() && viewerUserId?.trim()) {
        writeStoredMarShiftTimelineShiftCode(facilityId, viewerUserId, next);
      }
    },
    [facilityId, onShiftCodeChange, viewerUserId]
  );

  const explicitShiftWindow = React.useMemo(() => {
    const dateLocal = selectedDateLocal?.trim();
    const tz = facilityTimeZone?.trim();
    if (!dateLocal || !tz) return null;
    const todayLocal = resolveFacilityLocalToday(tz);
    if (dateLocal === todayLocal) return null;
    const built = buildHistoricalMarTimeline({
      selectedDateLocal: dateLocal,
      shiftCode,
      facilityTimeZone: tz,
      locale: language,
    });
    return shouldUseExplicitMarShiftWindow(built)
      ? { shiftStart: built.shiftStart, shiftEnd: built.shiftEnd }
      : null;
  }, [facilityTimeZone, language, selectedDateLocal, shiftCode]);

  const loadTimeline = useCallback(async (reopenDrawer?: Pick<MarShiftTimelineCellItem, "orderItemId" | "medicationDoseInstanceId" | "scheduledAt">) => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchMarShiftTimeline({
        facilityId,
        encounterId,
        // Encounter MAR is shared; never gate the chart timeline on assignment.
        assignedToUserId: encounterId?.trim() ? undefined : assignedToUserId,
        shiftCode,
        shiftStart: explicitShiftWindow?.shiftStart,
        shiftEnd: explicitShiftWindow?.shiftEnd,
        locale: language,
        includeCompleted: true,
        includeUpcoming: true,
      });
      setData(response);
      if (reopenDrawer) {
        const found = findMarShiftTimelineCellItem(response, reopenDrawer);
        setDrawerSelection(
          found
            ? {
                item: found.item,
                patientDisplay: found.patientDisplay,
                roomLabel: found.roomLabel,
                governedRoomDisplay: found.governedRoomDisplay,
                encounterId: found.encounterId ?? encounterId ?? "",
              }
            : null
        );
      } else {
        setDrawerSelection((prev) => reconcileMarShiftTimelineDrawerSelection(prev, response));
      }
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [assignedToUserId, encounterId, explicitShiftWindow, facilityId, shiftCode, language]);

  useEffect(() => {
    onShiftCodeChange?.(shiftCode);
  }, [onShiftCodeChange, shiftCode]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    onRegisterRefresh?.(() => loadTimeline());
  }, [loadTimeline, onRegisterRefresh]);

  useEffect(() => {
    onRegisterReopenDrawer?.((orderItemId, medicationDoseInstanceId, scheduledAt) => {
      void loadTimeline({
        orderItemId,
        medicationDoseInstanceId: medicationDoseInstanceId ?? "",
        scheduledAt: scheduledAt ?? "",
      });
    });
  }, [loadTimeline, onRegisterReopenDrawer]);

  useEffect(() => {
    onRegisterCloseDrawer?.(() => setDrawerSelection(null));
  }, [onRegisterCloseDrawer]);

  const title = (() => {
    const raw = data?.title?.trim();
    if (raw) {
      return raw
        .replace(/\s+MAR\s+SHIFT\s+TIMELINE$/i, " Shift Timeline")
        .replace(/\s+SHIFT\s+TIMELINE$/i, " Shift Timeline");
    }
    if (data?.facility?.name) return buildMarShiftTimelineTitle(data.facility.name);
    return t("marShiftTimeline.titleFallback");
  })();

  const viewerName = data?.viewer?.displayName?.trim() || "—";
  const assignedNurseName =
    data?.assignedNurse?.displayName?.trim() || t("marShiftTimeline.unassignedNurse");
  const showViewingAs =
    Boolean(encounterId?.trim()) &&
    Boolean(data?.viewer?.userId) &&
    data?.assignedNurse?.userId != null &&
    data.assignedNurse.userId !== data.viewer.userId;
  const shiftHoursLabel = (() => {
    const start = data?.shift?.startAt?.trim();
    const end = data?.shift?.endAt?.trim();
    const tz = data?.shift?.timeZone?.trim() || facilityTimeZone?.trim() || undefined;
    if (!start || !end) return data?.shift?.label?.trim() || "";
    try {
      const fmt = new Intl.DateTimeFormat(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      });
      return `${fmt.format(new Date(start))}–${fmt.format(new Date(end))}`;
    } catch {
      return data?.shift?.label?.trim() || "";
    }
  })();
  const headerClockText = formatMarShiftTimelineHeaderClock(headerNow, dateLocale, facilityTimeZone);
  const uiLocale = language === "en" ? "en" : "fr";

  return (
    <section
      data-testid="facility-mar-shift-timeline"
      data-embedded={embedded ? "true" : "false"}
      aria-label={title}
      style={{
        marginBottom: embedded ? 0 : compact ? 10 : 14,
        border: embedded ? "none" : "1px solid #e2e8f0",
        borderRadius: embedded ? 0 : 12,
        backgroundColor: embedded ? "transparent" : "#f8fafc",
        padding: embedded ? 0 : compact ? "10px 12px" : "12px 14px",
      }}
    >
      <header style={{ marginBottom: embedded ? 6 : compact ? 8 : 10 }}>
        <div
          data-testid="mar-shift-timeline-metadata"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8px 16px",
            fontSize: 13,
            color: "#475569",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <h2
              data-testid="mar-shift-timeline-title"
              style={{
                margin: 0,
                fontSize: embedded ? 14 : compact ? 15 : 17,
                fontWeight: embedded ? 600 : 700,
                lineHeight: 1.25,
                color: "#0f172a",
              }}
            >
              {title}
            </h2>
            <p
              data-testid="mar-shift-timeline-assigned-nurse"
              aria-label={interpolateMessage(t("marShiftTimeline.assignedNurseLine"), {
                name: assignedNurseName,
              })}
              data-mar-nurse-assignment={
                data?.assignedNurse?.userId ? "assigned" : "unassigned"
              }
              style={{ margin: "4px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.35 }}
            >
              {t("marShiftTimeline.assignedNurseLabel")}:{" "}
              <span
                data-testid="mar-shift-timeline-assigned-nurse-name"
                style={{ color: "#0f172a", fontWeight: 700 }}
              >
                {assignedNurseName}
              </span>
            </p>
            {showViewingAs ? (
              <p
                data-testid="mar-shift-timeline-viewer"
                style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}
              >
                {interpolateMessage(t("marShiftTimeline.viewingAsLine"), { name: viewerName })}
              </p>
            ) : (
              <span data-testid="mar-shift-timeline-viewer" className="sr-only">
                {interpolateMessage(t("marShiftTimeline.viewingAsLine"), { name: viewerName })}
              </span>
            )}
          </div>
          <div
            data-testid="mar-shift-timeline-shift-controls"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "6px 10px",
              flex: "0 1 auto",
              minWidth: 0,
            }}
          >
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
              <span>{t("marShiftTimeline.shiftLabel")}</span>
              <select
                data-testid="mar-shift-timeline-shift-select"
                value={shiftCode}
                onChange={(e) => handleShiftChange(e.target.value as MarShiftTimelineShiftCode)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  backgroundColor: "#fff",
                  minHeight: 36,
                }}
              >
                {MAR_SHIFT_TIMELINE_SHIFT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {MAR_SHIFT_TIMELINE_SHIFT_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            {shiftHoursLabel ? (
              <span data-testid="mar-shift-timeline-shift-hours" style={{ whiteSpace: "nowrap" }}>
                {shiftHoursLabel}
              </span>
            ) : null}
            <span
              data-testid="mar-shift-timeline-current-time"
              style={{ whiteSpace: "nowrap" }}
            >
              {interpolateMessage(t("marShiftTimeline.currentTimeLine"), { datetime: headerClockText })}
            </span>
          </div>
        </div>
        {historicalReadOnly ? (
          <p
            data-testid="mar-shift-timeline-historical-readonly"
            style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}
          >
            {t("marHistorical.historicalReadOnly")}
          </p>
        ) : null}
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
              {data.rows.map((row) => {
                const isPrnRow = row.rowKind === "PRN";
                const rowKey = `${row.encounterId}-${row.rowKind ?? "SCHEDULED"}`;
                const prnRowShell = isPrnRow ? marShiftTimelinePrnRowStyle() : null;
                return (
                <tr
                  key={rowKey}
                  data-testid={
                    isPrnRow
                      ? `mar-shift-timeline-prn-row-${row.encounterId}`
                      : `mar-shift-timeline-row-${row.encounterId}`
                  }
                  data-row-kind={row.rowKind ?? "SCHEDULED"}
                >
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      backgroundColor: prnRowShell?.backgroundColor ?? "#fff",
                      borderBottom: `1px solid ${prnRowShell?.borderColor ?? "#e2e8f0"}`,
                      borderRight: `1px solid ${prnRowShell?.borderColor ?? "#e2e8f0"}`,
                      padding: "8px 10px",
                      verticalAlign: "top",
                    }}
                  >
                    {isPrnRow ? (
                      <>
                        <div
                          data-testid="mar-shift-timeline-prn-label"
                          style={{ fontWeight: 700, lineHeight: 1.3, color: "#664D03" }}
                        >
                          {t("marShiftTimeline.prnRowLabel")}
                        </div>
                        <div
                          data-testid="mar-shift-timeline-prn-subtitle"
                          style={{ color: "#92400e", marginTop: 2, fontSize: 11 }}
                        >
                          {row.prnBandSubtitle?.trim() || t("marShiftTimeline.prnRowSubtitle")}
                        </div>
                      </>
                    ) : (
                      <>
                        <div data-testid="mar-shift-timeline-patient" style={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {row.patientDisplay}
                        </div>
                        <div data-testid="mar-shift-timeline-room" style={{ color: "#64748b", marginTop: 2 }}>
                          {row.governedRoomDisplay?.trim() ||
                            row.roomLabel?.trim() ||
                            t("roomAssignment.noRoomAssigned")}
                        </div>
                      </>
                    )}
                  </td>
                  {data.shift.columns.map((column) => {
                    const cell = row.cells.find((c) => c.columnKey === column.key);
                    return (
                      <td
                        key={`${rowKey}-${column.key}`}
                        style={{
                          borderBottom: `1px solid ${prnRowShell?.borderColor ?? "#e2e8f0"}`,
                          borderRight: `1px solid ${prnRowShell?.borderColor ?? "#e2e8f0"}`,
                          padding: 4,
                          verticalAlign: "top",
                          minWidth: 72,
                          overflow: "hidden",
                          backgroundColor: prnRowShell?.backgroundColor,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            alignItems: "stretch",
                          }}
                        >
                          {(cell?.items ?? []).map((item) => {
                            const readOnly = !isMarShiftTimelineItemActionable(item);
                            const isRescheduled =
                              item.scheduleAdjustment?.isRescheduled === true &&
                              !item.administrationVariance?.hasVariance;
                            const variance = item.administrationVariance;
                            const hasVariance = variance?.hasVariance === true;
                            const responseBadge = item.medicationResponseBadge;
                            const responseFollowUp = item.medicationResponseFollowUp;
                            const localizedSecondary = localizeMarShiftTimelineSecondaryText(item, t, {
                              responseRequired: isMedicationResponseRequired(
                                toMedicationResponseEditabilityInput(item)
                              ),
                            });
                            const responseTimelineLabelKey = resolveMarShiftTimelineResponseTimelineLabelKey(
                              item,
                              {
                                responseRequired: isMedicationResponseRequired(
                                  toMedicationResponseEditabilityInput(item)
                                ),
                              }
                            );
                            const responsePainScores = resolveMarShiftTimelineLatestResponsePainScores(
                              item.medicationResponses
                            );
                            const responseBadgeStyle = responseBadge
                              ? marShiftTimelineMedicationResponseBadgeStyle(responseBadge.severity)
                              : null;
                            const followUpStyle = responseFollowUp
                              ? marShiftTimelineMedicationResponseFollowUpStyle(responseFollowUp.status)
                              : null;
                            const statusStyle = hasVariance
                              ? marShiftTimelineAdministrationVarianceCellStyle(variance?.badgeLabel)
                              : isRescheduled
                                ? marShiftTimelineRescheduleCellStyle()
                                : marShiftTimelineItemStatusStyle(
                                    item.doseStatus,
                                    readOnly,
                                    item.isPrnBand === true,
                                    item.secondaryText
                                  );
                            const facilityTz = data.shift.timeZone;
                            const scheduledPatientDisplay =
                              data.rows.find(
                                (candidate) =>
                                  candidate.encounterId === row.encounterId &&
                                  (candidate.rowKind ?? "SCHEDULED") === "SCHEDULED"
                              )?.patientDisplay ?? row.patientDisplay;
                            return (
                              <div
                                key={`${item.orderItemId}:${item.medicationDoseInstanceId || item.prnProjectionKey || item.administeredAt || item.scheduledAt || "fallback"}`}
                                style={{ position: "relative", width: "100%", maxWidth: "100%", flexShrink: 0 }}
                              >
                              <button
                                type="button"
                                data-testid="mar-shift-timeline-cell-item"
                                data-dose-status={item.doseStatus}
                                data-read-only={readOnly ? "true" : "false"}
                                data-prn-band={item.isPrnBand ? "true" : "false"}
                                aria-label={`${item.primaryText} ${localizedSecondary ?? item.secondaryText ?? ""} ${item.tertiaryText ?? ""}`.trim()}
                                title={buildMarShiftTimelineItemHoverTitle(item)}
                                onClick={() => {
                                  if (
                                    !readOnly &&
                                    drawerActionHandlers &&
                                    isRoutineMarDueAdministerShortcut(item, drawerActionHandlers)
                                  ) {
                                    void drawerActionHandlers.onRequestAdminister(item);
                                    return;
                                  }
                                  setDrawerSelection({
                                    item,
                                    patientDisplay: scheduledPatientDisplay,
                                    roomLabel: row.roomLabel,
                                    governedRoomDisplay: row.governedRoomDisplay ?? null,
                                    encounterId: row.encounterId,
                                  });
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  maxWidth: "100%",
                                  boxSizing: "border-box",
                                  flexShrink: 0,
                                  textAlign: "left",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  border: `1px solid ${statusStyle.borderColor}`,
                                  backgroundColor: statusStyle.backgroundColor as string,
                                  color: statusStyle.color as string,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  lineHeight: 1.25,
                                  overflow: "hidden",
                                }}
                              >
                                <div data-testid="mar-shift-timeline-primary-text">{item.primaryText}</div>
                                {item.doseDisplay?.doseLabel ? (
                                  <div
                                    data-testid="mar-shift-timeline-dose-label"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      marginTop: 2,
                                      color: "#0f766e",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {item.doseDisplay.doseLabel}
                                    {item.doseDisplay.routeLabel
                                      ? ` · ${item.doseDisplay.routeLabel}`
                                      : null}
                                    {item.doseDisplay.frequencyLabel
                                      ? ` · ${item.doseDisplay.frequencyLabel}`
                                      : null}
                                  </div>
                                ) : null}
                                {item.doseDisplay?.totalDoseLabel ? (
                                  <div
                                    data-testid="mar-shift-timeline-total-dose-label"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      marginTop: 1,
                                      color: "#0f766e",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {t("marShiftTimeline.doseDisplay.total")}:{" "}
                                    {item.doseDisplay.totalDoseLabel}
                                  </div>
                                ) : null}
                                {item.doseDisplay?.directionsLabel ? (
                                  <div
                                    data-testid="mar-shift-timeline-directions-label"
                                    style={{
                                      fontSize: 10,
                                      marginTop: 1,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {item.doseDisplay.directionsLabel}
                                  </div>
                                ) : null}
                                {item.doseDisplay?.quantityLabel ? (
                                  <div
                                    data-testid="mar-shift-timeline-quantity-label"
                                    style={{
                                      fontSize: 10,
                                      marginTop: 1,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {t("marShiftTimeline.doseDisplay.quantity")}:{" "}
                                    {item.doseDisplay.quantityLabel}
                                  </div>
                                ) : null}
                                {hasVariance && variance?.badgeLabel ? (
                                  <>
                                    <div
                                      data-testid="mar-shift-timeline-variance-badge"
                                      style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}
                                    >
                                      {t(`marAdministrationVariance.badge.${variance.badgeLabel}`)}
                                    </div>
                                    <div
                                      data-testid="mar-shift-timeline-variance-times"
                                      style={{ fontSize: 10, marginTop: 2, lineHeight: 1.3 }}
                                    >
                                      <div>
                                        {t("marAdministrationVariance.timeline.scheduled")}:{" "}
                                        {formatMarShiftTimelineClinicalDateTime(
                                          variance.effectiveScheduledAt ?? "",
                                          dateLocale,
                                          facilityTz
                                        )}
                                      </div>
                                      <div>
                                        {t("marAdministrationVariance.timeline.actual")}:{" "}
                                        {formatMarShiftTimelineClinicalDateTime(
                                          variance.actualAdministrationAt ?? "",
                                          dateLocale,
                                          facilityTz
                                        )}
                                      </div>
                                      {variance.varianceMinutes != null ? (
                                        <div>
                                          {t("marAdministrationVariance.timeline.variance")}:{" "}
                                          {variance.varianceMinutes > 0 ? "+" : ""}
                                          {variance.varianceMinutes} min
                                        </div>
                                      ) : null}
                                    </div>
                                  </>
                                ) : null}
                                {responseBadge && !responseTimelineLabelKey ? (
                                  <div
                                    data-testid="mar-shift-timeline-response-badge"
                                    title={
                                      item.medicationResponseAdverseEscalation
                                        ? t("marMedicationResponse.followUp.adverseEscalation")
                                        : undefined
                                    }
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      marginTop: 2,
                                      color: responseBadgeStyle?.color as string,
                                    }}
                                  >
                                    {t(
                                      resolveMarMedicationResponseBadgeLabelKey(responseBadge.count)
                                    ).replace("{count}", String(responseBadge.count))}
                                  </div>
                                ) : null}
                                {responseFollowUp && !responseTimelineLabelKey ? (
                                  <div
                                    data-testid="mar-shift-timeline-response-follow-up"
                                    data-follow-up-status={responseFollowUp.status}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      marginTop: 2,
                                      color: followUpStyle?.color as string,
                                    }}
                                  >
                                    {responseFollowUp.status === "OVERDUE"
                                      ? t("marMedicationResponse.followUp.overdue")
                                      : t("marMedicationResponse.followUp.recommended")}
                                  </div>
                                ) : null}
                                {isRescheduled ? (
                                  <div
                                    data-testid="mar-shift-timeline-reschedule-badge"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      marginTop: 2,
                                      color: "#1d4ed8",
                                    }}
                                  >
                                    {t("marReschedule.badge")}
                                  </div>
                                ) : null}
                                {isRescheduled && item.scheduleAdjustment ? (
                                  <div
                                    data-testid="mar-shift-timeline-reschedule-times"
                                    style={{ fontSize: 10, marginTop: 2, lineHeight: 1.3 }}
                                  >
                                    <div>
                                      {t("marReschedule.timeline.original")}:{" "}
                                      {formatMarShiftTimelineClinicalDateTime(
                                        item.scheduleAdjustment.originalScheduledAt ?? "",
                                        dateLocale,
                                        facilityTz
                                      )}
                                    </div>
                                    <div>
                                      {t("marReschedule.timeline.current")}:{" "}
                                      {formatMarShiftTimelineClinicalDateTime(
                                        item.scheduleAdjustment.currentScheduledAt,
                                        dateLocale,
                                        facilityTz
                                      )}
                                    </div>
                                  </div>
                                ) : localizedSecondary ? (
                                  <div
                                    data-testid="mar-shift-timeline-secondary-text"
                                    style={{ fontSize: 10, opacity: 0.9, marginTop: 2, fontWeight: 600 }}
                                  >
                                    {localizedSecondary}
                                  </div>
                                ) : item.secondaryText?.trim() &&
                                  !isMarMedicationResponseInternalSecondaryText(item.secondaryText) ? (
                                  <div
                                    data-testid="mar-shift-timeline-secondary-text"
                                    style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}
                                  >
                                    {item.secondaryText}
                                  </div>
                                ) : null}
                                {responsePainScores ? (
                                  <div
                                    data-testid="mar-shift-timeline-response-pain"
                                    style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}
                                  >
                                    {t("marMedicationResponse.history.pain")}: {responsePainScores.before}/10 →{" "}
                                    {responsePainScores.after}/10
                                  </div>
                                ) : null}
                                {item.tertiaryText?.trim() ? (
                                  <div
                                    data-testid="mar-shift-timeline-tertiary-text"
                                    style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}
                                  >
                                    {localizeMarTimelinePrnCellText(
                                      item.tertiaryText,
                                      uiLocale,
                                      item.prnReasonCode
                                    )}
                                  </div>
                                ) : null}
                              </button>
                              {!readOnly ? (
                                <button
                                  type="button"
                                  data-testid="mar-shift-timeline-cell-more-actions"
                                  aria-label={t("marShiftTimeline.moreActions")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDrawerSelection({
                                      item,
                                      patientDisplay: scheduledPatientDisplay,
                                      roomLabel: row.roomLabel,
                                      governedRoomDisplay: row.governedRoomDisplay ?? null,
                                      encounterId: row.encounterId,
                                    });
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: 2,
                                    right: 2,
                                    width: 18,
                                    height: 18,
                                    padding: 0,
                                    border: "none",
                                    borderRadius: 4,
                                    background: "transparent",
                                    color: "inherit",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    lineHeight: 1,
                                  }}
                                >
                                  ⋮
                                </button>
                              ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <FacilityMarShiftTimelineDrawer
        item={drawerSelection?.item ?? null}
        encounterId={drawerSelection?.encounterId ?? encounterId ?? null}
        context={
          drawerSelection
            ? {
                patientDisplay: drawerSelection.patientDisplay,
                roomLabel: drawerSelection.roomLabel,
                governedRoomDisplay: drawerSelection.governedRoomDisplay,
              }
            : null
        }
        facilityTimeZone={data?.shift.timeZone ?? data?.facility.timeZone ?? null}
        facilityId={facilityId}
        actionHandlers={drawerActionHandlers}
        onClose={() => setDrawerSelection(null)}
        onActionSuccess={async () => {
          await loadTimeline();
        }}
      />
    </section>
  );
}
