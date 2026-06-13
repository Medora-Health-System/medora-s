"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { ManualBedOperationalStatus } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  updateFacilityBedStatus,
  type FacilityBedBoardBedRow,
} from "@/lib/bedBoardApi";
import { bedStatusBadgeSoft, formatHospitalBedStatusLabel } from "@/lib/bedStatusDisplay";
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
  facilityId: string | null;
  canManageStatus?: boolean;
  onClose: () => void;
  onStatusUpdated?: (bed: FacilityBedBoardBedRow) => void;
};

export function BedBoardStatusDetailModal({
  open,
  bed,
  facilityId,
  canManageStatus = false,
  onClose,
  onStatusUpdated,
}: BedBoardStatusDetailModalProps) {
  const { t, language } = useI18n();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
    setSaving(false);
  }, [open, bed?.storageKey, bed?.bedKey]);

  const handleAction = useCallback(
    async (status: ManualBedOperationalStatus) => {
      if (!bed || !facilityId || !canManageStatus || saving) return;
      if (bed.status === status) return;

      setSaving(true);
      setError(null);
      try {
        const bedKey = bed.storageKey || bed.bedKey;
        const updated = await updateFacilityBedStatus(facilityId, bedKey, {
          status,
          reasonText: note.trim() || undefined,
        });
        onStatusUpdated?.(updated);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(
          normalizeUserFacingError(message, language) || t("bedBoard.statusUpdateFailed")
        );
      } finally {
        setSaving(false);
      }
    },
    [bed, canManageStatus, facilityId, language, note, onClose, onStatusUpdated, saving, t]
  );

  if (!open || !bed) return null;

  const statusLabel = formatHospitalBedStatusLabel(bed.status, language, t);
  const bedLabel = bed.displayKey || bed.display;

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
          minWidth: 300,
          maxWidth: 440,
          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="bed-board-status-detail-title"
          style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}
        >
          {t("bedBoard.statusDetailTitle")}
        </h3>
        <p style={{ margin: "0 0 4px", fontSize: 13 }}>
          <strong>{bedLabel}</strong>
          {" — "}
          {statusLabel}
        </p>
        {bed.reasonText || bed.reasonCode ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#475569" }}>
            {t("bedBoard.statusDetailReason")}: {bed.reasonText ?? bed.reasonCode}
          </p>
        ) : null}

        {canManageStatus ? (
          <div style={{ marginTop: 14 }}>
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
            <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
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
            <div
              role="group"
              aria-label={t("bedBoard.statusActionsTitle")}
              data-testid="bed-board-status-actions"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {HOUSEKEEPING_ACTIONS.map((action) => {
                const colors = bedStatusBadgeSoft(action);
                const isCurrent = bed.status === action;
                return (
                  <button
                    key={action}
                    type="button"
                    data-testid={`bed-board-status-action-${action}`}
                    disabled={saving || isCurrent}
                    onClick={() => void handleAction(action)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: isCurrent ? colors.bg : "#fff",
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: saving || isCurrent ? "default" : "pointer",
                      opacity: isCurrent ? 0.65 : 1,
                    }}
                  >
                    <span>{t(ACTION_I18N_KEY[action])}</span>
                    {isCurrent ? (
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{statusLabel}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          style={{
            marginTop: 14,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? t("bedBoard.statusUpdateSaving") : t("bedBoard.assignPickCancel")}
        </button>
      </div>
    </div>
  );
}
