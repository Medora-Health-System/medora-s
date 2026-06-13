"use client";

import React from "react";
import type { BedBoardOccupancySummary, EncounterBedUnitCode } from "@medora/shared";
import { BedBoardCensusHeader } from "@/components/encounters/BedBoardCensusHeader";
import { BedBoardGrid } from "@/components/encounters/BedBoardGrid";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";

export type BedBoardUnitSectionProps = {
  unit: EncounterBedUnitCode;
  summary: BedBoardOccupancySummary;
  beds: FacilityBedBoardBedRow[];
  statusFilter?: BedBoardStatusFilterId;
  facilityId?: string | null;
  compact?: boolean;
  canAssignRoom?: boolean;
  canManageBedStatus?: boolean;
  onAvailableBedClick?: (bed: FacilityBedBoardBedRow) => void;
  onBedStatusUpdated?: (bed: FacilityBedBoardBedRow) => void;
  encounterChartPath?: (encounterId: string, unit: EncounterBedUnitCode) => string;
};

export function BedBoardUnitSection({
  unit,
  summary,
  beds,
  statusFilter = "all",
  facilityId,
  compact,
  canAssignRoom,
  canManageBedStatus,
  onAvailableBedClick,
  onBedStatusUpdated,
  encounterChartPath,
}: BedBoardUnitSectionProps) {
  return (
    <section
      data-testid={`bed-board-unit-section-${unit}`}
      style={{
        marginBottom: compact ? 16 : 20,
        padding: compact ? 12 : 16,
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <BedBoardCensusHeader unit={unit} summary={summary} compact={compact} />
      <BedBoardGrid
        unit={unit}
        beds={beds}
        statusFilter={statusFilter}
        facilityId={facilityId}
        canAssignRoom={canAssignRoom}
        canManageBedStatus={canManageBedStatus}
        onAvailableBedClick={onAvailableBedClick}
        onBedStatusUpdated={onBedStatusUpdated}
        encounterChartPath={encounterChartPath}
      />
    </section>
  );
}
