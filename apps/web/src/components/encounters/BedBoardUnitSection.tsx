"use client";

import React from "react";
import type { BedBoardOccupancySummary, EncounterBedUnitCode } from "@medora/shared";
import { BedBoardCensusHeader } from "@/components/encounters/BedBoardCensusHeader";
import { BedBoardGrid } from "@/components/encounters/BedBoardGrid";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

export type BedBoardUnitSectionProps = {
  unit: EncounterBedUnitCode;
  summary: BedBoardOccupancySummary;
  beds: FacilityBedBoardBedRow[];
  compact?: boolean;
  canAssignRoom?: boolean;
  onAvailableBedClick?: (bed: FacilityBedBoardBedRow) => void;
  encounterChartPath?: (encounterId: string, unit: EncounterBedUnitCode) => string;
};

export function BedBoardUnitSection({
  unit,
  summary,
  beds,
  compact,
  canAssignRoom,
  onAvailableBedClick,
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
        canAssignRoom={canAssignRoom}
        onAvailableBedClick={onAvailableBedClick}
        encounterChartPath={encounterChartPath}
      />
    </section>
  );
}
