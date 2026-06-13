"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { BedOperationalStatus, EncounterBedUnitCode } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";
import {
  bedStatusBadgeSoft,
  bedStatusCellBorderColor,
  formatHospitalBedStatusLabel,
  isBedBoardDischargePending,
  isBedBoardTransferPending,
} from "@/lib/bedStatusDisplay";
import { emergencyChartPath } from "@/features/emergency/emergencyRoutes";

export type BedBoardGridProps = {
  unit: EncounterBedUnitCode;
  beds: FacilityBedBoardBedRow[];
  canAssignRoom?: boolean;
  onAvailableBedClick?: (bed: FacilityBedBoardBedRow) => void;
  encounterChartPath?: (encounterId: string, unit: EncounterBedUnitCode) => string;
};

type StatusDetailState = {
  bed: FacilityBedBoardBedRow;
  status: BedOperationalStatus;
};

function TransferIcon() {
  return (
    <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }} title="">
      ⇄
    </span>
  );
}

function DischargeIcon() {
  return (
    <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }} title="">
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
  canAssignRoom = false,
  onAvailableBedClick,
  encounterChartPath = defaultChartPath,
}: BedBoardGridProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const [statusDetail, setStatusDetail] = useState<StatusDetailState | null>(null);

  const handleBedActivate = useCallback(
    (bed: FacilityBedBoardBedRow) => {
      switch (bed.status) {
        case "AVAILABLE":
          if (canAssignRoom && onAvailableBedClick) {
            onAvailableBedClick(bed);
          }
          break;
        case "OCCUPIED":
          if (bed.occupantEncounterId) {
            router.push(encounterChartPath(bed.occupantEncounterId, unit));
          }
          break;
        case "BLOCKED":
        case "CLEANING":
        case "DIRTY":
        case "RESERVED":
          setStatusDetail({ bed, status: bed.status });
          break;
        case "TRANSFER_PENDING":
        case "DISCHARGE_PENDING":
          if (bed.occupantEncounterId) {
            router.push(encounterChartPath(bed.occupantEncounterId, unit));
          }
          break;
        default:
          break;
      }
    },
    [canAssignRoom, encounterChartPath, onAvailableBedClick, router, unit]
  );

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
        {beds.map((bed) => {
          const colors = bedStatusBadgeSoft(bed.status);
          const statusLabel = formatHospitalBedStatusLabel(bed.status, language, t);
          const isInteractive =
            bed.status === "AVAILABLE"
              ? canAssignRoom && Boolean(onAvailableBedClick)
              : bed.status === "OCCUPIED" ||
                bed.status === "TRANSFER_PENDING" ||
                bed.status === "DISCHARGE_PENDING" ||
                bed.status === "BLOCKED" ||
                bed.status === "CLEANING" ||
                bed.status === "DIRTY" ||
                bed.status === "RESERVED";

          return (
            <button
              key={bed.storageKey || bed.bedKey}
              type="button"
              role="gridcell"
              data-testid={`bed-board-cell-${bed.storageKey || bed.bedKey}`}
              data-status={bed.status}
              aria-label={cellAriaLabel(bed)}
              disabled={!isInteractive}
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
                borderRadius: 10,
                border: `1px solid ${bedStatusCellBorderColor(bed.status)}`,
                background: colors.bg,
                color: colors.text,
                textAlign: "left",
                cursor: isInteractive ? "pointer" : "default",
                opacity: isInteractive ? 1 : 0.92,
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

      {statusDetail ? (
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
          onClick={() => setStatusDetail(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              padding: 16,
              minWidth: 280,
              maxWidth: 420,
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
              <strong>{statusDetail.bed.displayKey || statusDetail.bed.display}</strong>
              {" — "}
              {formatHospitalBedStatusLabel(statusDetail.status, language, t)}
            </p>
            {statusDetail.bed.reasonText || statusDetail.bed.reasonCode ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#475569" }}>
                {t("bedBoard.statusDetailReason")}:{" "}
                {statusDetail.bed.reasonText ?? statusDetail.bed.reasonCode}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setStatusDetail(null)}
              style={{
                marginTop: 12,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("bedBoard.assignPickCancel")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
