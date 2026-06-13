"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EncounterBedUnitCode, ManualBedOperationalStatus } from "@medora/shared";
import { manualStatusBlockedByOccupancy } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  fetchBedStatusHistory,
  updateFacilityBedStatus,
  type FacilityBedBoardBedRow,
  type FacilityBedStatusHistoryEntry,
} from "@/lib/bedBoardApi";
import {
  resolveBedStatusBadge,
  resolveBedStatusLabel,
} from "@/lib/bedStatusPresentation";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const HOUSEKEEPING_ACTIONS: ManualBedOperationalStatus[] = [
  "DIRTY",
  "CLEANING",
  "AVAILABLE",
  "RESERVED",
  "BLOCKED",
];

const ACTION_I18N_KEY: Record<ManualBedOperationalStatus, string> = {
  DIRTY: "bedBoard.statusActionMarkDirty",
  CLEANING: "bedBoard.statusActionStartCleaning",
  AVAILABLE: "bedBoard.statusActionMarkAvailable",
  RESERVED: "bedBoard.statusActionReserve",
  BLOCKED: "bedBoard.statusActionBlock",
};

export type BedBoardStatusDetailModalProps = {
  open: boolean;
  bed: FacilityBedBoardBedRow | null;
  unit: EncounterBedUnitCode;
  facilityId: string | null;
  canManageStatus?: boolean;
  canAssignRoom?: boolean;
  onClose: () => void;
  onStatusUpdated?: (bed: FacilityBedBoardBedRow) => void;
  onAssignPatient?: (bed: FacilityBedBoardBedRow) => void;
  encounterChartPath?: (encounterId: string, unit: EncounterBedUnitCode) => string;
};

function formatHistoryTransition(
  entry: FacilityBedStatusHistoryEntry,
  t: (key: string) => string,
  language: "en" | "fr"
): string {
  const from = entry.oldStatus
    ? resolveBedStatusLabel(entry.oldStatus, language, t)
    : "—";
  const to = resolveBedStatusLabel(entry.newStatus, language, t);
  return `${from} → ${to}`;
}

export function BedBoardStatusDetailModal({
  open,
  bed,
  unit,
  facilityId,
  canManageStatus = false,
  canAssignRoom = false,
  onClose,
  onStatusUpdated,
  onAssignPatient,
  encounterChartPath,
}: BedBoardStatusDetailModalProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<ManualBedOperationalStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FacilityBedStatusHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open || !bed) return;
    setNote("");
    setPendingAction(null);
    setError(null);
    setSaving(false);
    setHistory([]);
  }, [open, bed?.storageKey, bed?.bedKey]);

  useEffect(() => {
    if (!open || !bed || !facilityId) return;
    const bedKey = bed.storageKey || bed.bedKey;
    let cancelled = false;
    setHistoryLoading(true);
    void fetchBedStatusHistory(facilityId, bedKey, 10)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bed, facilityId]);

  const occupantName = bed?.patientDisplay ?? bed?.occupantPatientName ?? null;
  const hasOccupant = Boolean(bed?.occupantEncounterId);

  const isActionDisabled = useCallback(
    (action: ManualBedOperationalStatus): boolean => {
      if (!bed) return true;
      if (bed.status === action) return true;
      return manualStatusBlockedByOccupancy({
        targetStatus: action,
        bedStatus: bed.status,
        occupantEncounterId: bed.occupantEncounterId,
      });
    },
    [bed]
  );

  const handleSave = useCallback(async () => {
    if (!bed || !facilityId || !canManageStatus || !pendingAction || saving) return;
    if (isActionDisabled(pendingAction)) return;

    setSaving(true);
    setError(null);
    try {
      const bedKey = bed.storageKey || bed.bedKey;
      const updated = await updateFacilityBedStatus(facilityId, bedKey, {
        status: pendingAction,
        reasonText: note.trim() || undefined,
      });
      onStatusUpdated?.(updated);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const normalized = normalizeUserFacingError(message, language);
      if (message.includes("BED_OCCUPIED_BLOCKS_STATUS_CHANGE")) {
        setError(t("bedBoard.statusOccupiedConflict"));
      } else {
        setError(normalized || t("bedBoard.statusUpdateFailed"));
      }
    } finally {
      setSaving(false);
    }
  }, [
    bed,
    canManageStatus,
    facilityId,
    isActionDisabled,
    language,
    note,
    onClose,
    onStatusUpdated,
    pendingAction,
    saving,
    t,
  ]);

  const handleViewEncounter = useCallback(() => {
    if (!bed?.occupantEncounterId || !encounterChartPath) return;
    router.push(encounterChartPath(bed.occupantEncounterId, unit));
    onClose();
  }, [bed?.occupantEncounterId, encounterChartPath, onClose, router, unit]);

  const handleAssignPatient = useCallback(() => {
    if (!bed || !onAssignPatient) return;
    onAssignPatient(bed);
    onClose();
  }, [bed, onAssignPatient, onClose]);

  const statusLabel = useMemo(() => {
    if (!bed) return "";
    return resolveBedStatusLabel(bed.status, language, t);
  }, [bed, language, t]);

  if (!open || !bed) return null;

  const bedLabel = bed.displayKey || bed.display;
  const statusColors = resolveBedStatusBadge(bed.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bed-board-status-detail-title"
      data-testid="bed-board-status-detail"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        background: "rgba(15, 23, 42, 0.35)",
      }}
      onClick={() => !saving && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: 16,
          width: "100%",
          minWidth: 280,
          maxWidth: 440,
          maxHeight: "min(90vh, 640px)",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="bed-board-status-detail-title"
          style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}
        >
          {bedLabel}
        </h3>

        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>{t("bedBoard.statusDetailStatus")}:</span>{" "}
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 9999,
                border: `1px solid ${statusColors.border}`,
                background: statusColors.bg,
                color: statusColors.text,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {statusLabel}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>{t("bedBoard.statusDetailOccupant")}:</span>{" "}
            {occupantName ?? t("bedBoard.statusDetailNoOccupant")}
          </p>
          {bed.reasonText || bed.reasonCode ? (
            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
              {t("bedBoard.statusDetailReason")}: {bed.reasonText ?? bed.reasonCode}
            </p>
          ) : null}
        </div>

        {hasOccupant && encounterChartPath ? (
          <button
            type="button"
            data-testid="bed-board-status-view-encounter"
            onClick={handleViewEncounter}
            style={{
              width: "100%",
              minHeight: 44,
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("bedBoard.statusViewEncounter")}
          </button>
        ) : null}

        {bed.status === "AVAILABLE" && canAssignRoom && onAssignPatient ? (
          <button
            type="button"
            data-testid="bed-board-status-assign-patient"
            onClick={handleAssignPatient}
            style={{
              width: "100%",
              minHeight: 44,
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #a7f3d0",
              background: "#ecfdf5",
              color: "#047857",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("bedBoard.statusAssignPatient")}
          </button>
        ) : null}

        {canManageStatus ? (
          <div style={{ marginTop: 4 }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t("bedBoard.statusActionsTitle")}
            </p>
            <div
              role="group"
              aria-label={t("bedBoard.statusActionsTitle")}
              data-testid="bed-board-status-actions"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {HOUSEKEEPING_ACTIONS.map((action) => {
                const colors = resolveBedStatusBadge(action);
                const disabled = saving || isActionDisabled(action);
                const selected = pendingAction === action;
                return (
                  <button
                    key={action}
                    type="button"
                    data-testid={`bed-board-status-action-${action}`}
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => setPendingAction(action)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: 44,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `2px solid ${selected ? "#0369a1" : colors.border}`,
                      background: selected ? colors.bg : "#fff",
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <span>{t(ACTION_I18N_KEY[action])}</span>
                    {bed.status === action ? (
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{statusLabel}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label style={{ display: "grid", gap: 4, marginTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {t("bedBoard.statusActionNote")}
              </span>
              <input
                type="text"
                value={note}
                disabled={saving}
                placeholder={t("bedBoard.statusActionNotePlaceholder")}
                onChange={(event) => setNote(event.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </label>
          </div>
        ) : null}

        <div style={{ marginTop: 14 }} data-testid="bed-board-status-history">
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {t("bedBoard.statusHistoryTitle")}
          </p>
          {historyLoading ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
          ) : history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("bedBoard.statusHistoryEmpty")}</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {history.map((entry) => (
                <li
                  key={entry.id}
                  data-testid="bed-board-status-history-item"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>
                    {entry.actorDisplay ?? t("bedBoard.statusHistoryUnknownActor")}
                  </div>
                  <div style={{ color: "#475569", marginTop: 2 }}>
                    {formatHistoryTransition(entry, t, language)}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>
                    {formatEncounterChromeDateTime(entry.occurredAt, language)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={{
              flex: "1 1 100px",
              minHeight: 44,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {t("bedBoard.assignPickCancel")}
          </button>
          {canManageStatus ? (
            <button
              type="button"
              data-testid="bed-board-status-save"
              disabled={saving || !pendingAction || isActionDisabled(pendingAction)}
              onClick={() => void handleSave()}
              style={{
                flex: "1 1 100px",
                minHeight: 44,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #0369a1",
                background: "#0284c7",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: saving || !pendingAction ? "wait" : "pointer",
                opacity: saving || !pendingAction ? 0.65 : 1,
              }}
            >
              {saving ? t("bedBoard.statusUpdateSaving") : t("bedBoard.statusSave")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
