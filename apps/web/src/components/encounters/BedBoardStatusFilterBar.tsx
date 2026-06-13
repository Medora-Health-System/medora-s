"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import {
  BED_BOARD_STATUS_FILTER_OPTIONS,
  type BedBoardStatusFilterId,
} from "@/lib/bedBoardFilters";

export type BedBoardStatusFilterBarProps = {
  value: BedBoardStatusFilterId;
  onChange: (filter: BedBoardStatusFilterId) => void;
  compact?: boolean;
};

const FILTER_I18N_KEY: Record<BedBoardStatusFilterId, string> = {
  all: "bedBoard.filterAll",
  OCCUPIED: "bedBoard.filterOccupied",
  AVAILABLE: "bedBoard.filterAvailable",
  BLOCKED: "bedBoard.filterBlocked",
  DIRTY: "bedBoard.filterDirty",
  CLEANING: "bedBoard.filterCleaning",
  RESERVED: "bedBoard.filterReserved",
};

export function BedBoardStatusFilterBar({ value, onChange, compact }: BedBoardStatusFilterBarProps) {
  const { t } = useI18n();

  return (
    <div
      role="toolbar"
      aria-label={t("bedBoard.filterToolbarAria")}
      data-testid="bed-board-status-filter-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 4 : 6,
        marginBottom: compact ? 8 : 10,
      }}
    >
      {BED_BOARD_STATUS_FILTER_OPTIONS.map((filterId) => {
        const active = value === filterId;
        return (
          <button
            key={filterId}
            type="button"
            data-testid={`bed-board-filter-${filterId}`}
            aria-pressed={active}
            onClick={() => onChange(filterId)}
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: compact ? "6px 10px" : "8px 12px",
              borderRadius: 9999,
              border: active ? "1px solid #0369a1" : "1px solid #e2e8f0",
              background: active ? "#f0f9ff" : "#fff",
              color: active ? "#0c4a6e" : "#475569",
              fontSize: compact ? 11 : 12,
              fontWeight: active ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t(FILTER_I18N_KEY[filterId])}
          </button>
        );
      })}
    </div>
  );
}
