"use client";

import React from "react";
import type { BedBoardOccupancySummary, EncounterBedUnitCode } from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type BedBoardCensusHeaderProps = {
  unit: EncounterBedUnitCode;
  summary: BedBoardOccupancySummary;
  compact?: boolean;
};

function unitLabel(unit: EncounterBedUnitCode, t: (key: string) => string): string {
  const map: Record<EncounterBedUnitCode, string> = {
    ED: t("bedBoard.unitEd"),
    MS: t("bedBoard.unitMs"),
    ICU: t("bedBoard.unitIcu"),
    OBS: t("bedBoard.unitObs"),
  };
  return map[unit] ?? unit;
}

type CensusStatProps = {
  label: string;
  value: number;
  compact?: boolean;
};

function CensusStat({ label, value, compact }: CensusStatProps) {
  if (value <= 0) return null;
  return (
    <div
      data-testid={`bed-board-census-stat-${label}`}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: 9999,
        border: "1px solid #e2e8f0",
        background: "#fff",
        fontSize: compact ? 11 : 12,
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{value}</strong>
    </div>
  );
}

export function BedBoardCensusHeader({ unit, summary, compact }: BedBoardCensusHeaderProps) {
  const { t } = useI18n();
  const title = t("bedBoard.censusTitle").replace("{{unit}}", unitLabel(unit, t));

  return (
    <header
      data-testid="bed-board-census-header"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: compact ? 6 : 8,
        marginBottom: compact ? 8 : 12,
      }}
    >
      <h2
        data-testid="bed-board-census-title"
        style={{
          margin: 0,
          fontSize: compact ? 14 : 16,
          fontWeight: 700,
          color: "#0f172a",
          marginRight: 4,
        }}
      >
        {title}
      </h2>
      <div
        role="group"
        aria-label={title}
        data-testid="bed-board-census-stats"
        style={{ display: "flex", flexWrap: "wrap", gap: compact ? 4 : 6 }}
      >
        <CensusStat label={t("bedBoard.occupied")} value={summary.occupied} compact={compact} />
        <CensusStat label={t("bedBoard.available")} value={summary.available} compact={compact} />
        <CensusStat label={t("bedBoard.blocked")} value={summary.blocked} compact={compact} />
        <CensusStat label={t("bedBoard.reserved")} value={summary.reserved} compact={compact} />
        <CensusStat label={t("bedBoard.cleaning")} value={summary.cleaning} compact={compact} />
        <CensusStat label={t("bedBoard.dirty")} value={summary.dirty} compact={compact} />
        <CensusStat
          label={t("bedBoard.transferPending")}
          value={summary.transferPending}
          compact={compact}
        />
        <CensusStat
          label={t("bedBoard.dischargePending")}
          value={summary.dischargePending}
          compact={compact}
        />
      </div>
    </header>
  );
}
