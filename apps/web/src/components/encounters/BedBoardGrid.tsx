"use client";

import React, { useCallback, useState } from "react";
import type { EncounterBedUnitCode } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";
import { filterBedBoardByStatus } from "@/lib/bedBoardFilters";
import {
  resolveBedStatusBadge,
  resolveBedStatusBorder,
  resolveBedStatusLabel,
} from "@/lib/bedStatusPresentation";
import { isBedBoardDischargePending, isBedBoardTransferPending } from "@/lib/bedStatusDisplay";
import { emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import { BedBoardStatusDetailModal } from "@/components/encounters/BedBoardStatusDetailModal";

export type BedBoardGridProps = {
  unit: EncounterBedUnitCode;
  beds: FacilityBedBoardBedRow[];
  statusFilter?: BedBoardStatusFilterId;
  facilityId?: string | null;
  canAssignRoom?: boolean;
  canManageBedStatus?: boolean;
  onAvailableBedClick?: (bed: FacilityBedBoardBedRow) => void;
  onBedStatusUpdated?: (bed: FacilityBedBoardBedRow) => void;
  encounterChartPath?: (encounterId: string, unit: EncounterBedUnitCode) => string;
};

function TransferIcon() {
  return (
    <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
      ⇄
    </span>
  );
}

function DischargeIcon() {
  return (
    <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
      ↗
    </span>
  );
}

function defaultChartPath(encounterId: string, unit: EncounterBedUnitCode): string {
  if (unit === "ED") {
    return emergencyChartPath(encounterId);
  }
  return `/app/encounters/${encodeURIComponent(encounterId)}`;
}

export function BedBoardGrid({
  unit,
  beds,
  statusFilter = "all",
  facilityId = null,
  canAssignRoom = false,
  canManageBedStatus = false,
  onAvailableBedClick,
  onBedStatusUpdated,
  encounterChartPath = defaultChartPath,
}: BedBoardGridProps) {
  const { t, language } = useI18n();
  const [statusDetailBed, setStatusDetailBed] = useState<FacilityBedBoardBedRow | null>(null);

  const visibleBeds = filterBedBoardByStatus(beds, statusFilter);

  const handleBedActivate = useCallback((bed: FacilityBedBoardBedRow) => {
    setStatusDetailBed(bed);
  }, []);

  const cellAriaLabel = (bed: FacilityBedBoardBedRow): string => {
    const label = bed.displayKey || bed.display;
    switch (bed.status) {
      case "AVAILABLE":
        return t("bedBoard.cellAriaAvailable").replace("{{bed}}", label);
      case "OCCUPIED":
        return t("bedBoard.cellAriaOccupied")
          .replace("{{bed}}", label)
          .replace("{{patient}}", bed.patientDisplay ?? bed.occupantPatientName ?? "—");
      case "BLOCKED":
        return t("bedBoard.cellAriaBlocked").replace("{{bed}}", label);
      case "CLEANING":
        return t("bedBoard.cellAriaCleaning").replace("{{bed}}", label);
      case "DIRTY":
        return t("bedBoard.cellAriaDirty").replace("{{bed}}", label);
      case "TRANSFER_PENDING":
        return t("bedBoard.cellAriaTransfer").replace("{{bed}}", label);
      case "DISCHARGE_PENDING":
        return t("bedBoard.cellAriaDischarge").replace("{{bed}}", label);
      default:
        return label;
    }
  };

  return (
    <>
      <div
        role="grid"
        aria-label={t("bedBoard.gridAriaLabel")}
        data-testid="bed-board-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {visibleBeds.map((bed) => {
          const colors = resolveBedStatusBadge(bed.status);
          const statusLabel = resolveBedStatusLabel(bed.status, language, t);

          return (
            <button
              key={bed.storageKey || bed.bedKey}
              type="button"
              role="gridcell"
              data-testid={`bed-board-cell-${bed.storageKey || bed.bedKey}`}
              data-status={bed.status}
              aria-label={cellAriaLabel(bed)}
              onClick={() => handleBedActivate(bed)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleBedActivate(bed);
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                padding: "8px 10px",
                minHeight: 72,
                minWidth: 44,
                borderRadius: 10,
                border: `1px solid ${resolveBedStatusBorder(bed.status)}`,
                background: colors.bg,
                color: colors.text,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                data-testid="bed-board-cell-label"
                style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}
              >
                {bed.displayKey || bed.display}
              </span>
              <span
                data-testid="bed-board-cell-status"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 9999,
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  color: colors.text,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isBedBoardTransferPending(bed.status) ? (
                  <TransferIcon aria-label={t("bedBoard.transferIconLabel")} />
                ) : null}
                {isBedBoardDischargePending(bed.status) ? (
                  <DischargeIcon aria-label={t("bedBoard.dischargeIconLabel")} />
                ) : null}
                {statusLabel}
              </span>
              {bed.patientDisplay || bed.occupantPatientName ? (
                <span
                  data-testid="bed-board-cell-patient"
                  style={{
                    fontSize: 11,
                    lineHeight: 1.25,
                    color: "#334155",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {bed.patientDisplay ?? bed.occupantPatientName}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <BedBoardStatusDetailModal
        open={Boolean(statusDetailBed)}
        bed={statusDetailBed}
        unit={unit}
        facilityId={facilityId}
        canManageStatus={canManageBedStatus}
        canAssignRoom={canAssignRoom}
        onClose={() => setStatusDetailBed(null)}
        onStatusUpdated={onBedStatusUpdated}
        onAssignPatient={onAvailableBedClick}
        encounterChartPath={encounterChartPath}
      />
    </>
  );
}
