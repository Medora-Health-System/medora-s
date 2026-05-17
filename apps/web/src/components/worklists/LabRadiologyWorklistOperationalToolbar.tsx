"use client";

import React from "react";
import type { LabRadWorklistSortMode } from "@medora/shared";
import type { LabRadWorklistOperationalFilters } from "@/lib/worklistLabRadOperational";

const labelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 12,
};

export function LabRadiologyWorklistOperationalToolbar({
  filters,
  onFiltersChange,
  sortMode,
  onSortModeChange,
  t,
}: {
  filters: LabRadWorklistOperationalFilters;
  onFiltersChange: (next: LabRadWorklistOperationalFilters) => void;
  sortMode: LabRadWorklistSortMode;
  onSortModeChange: (mode: LabRadWorklistSortMode) => void;
  t: (key: string) => string;
}) {
  const set = (key: keyof LabRadWorklistOperationalFilters, value: boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{t("labRadEscalation.sortLabel")}</span>
        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as LabRadWorklistSortMode)}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
          }}
          aria-label={t("labRadEscalation.sortLabel")}
        >
          <option value="MOST_URGENT">{t("labRadEscalation.sortMostUrgent")}</option>
          <option value="OLDEST_FIRST">{t("labRadEscalation.sortOldestFirst")}</option>
          <option value="CRITICAL_ACK_FIRST">{t("labRadEscalation.sortCriticalAckFirst")}</option>
          <option value="RECENTLY_UPDATED">{t("labRadEscalation.sortRecentlyUpdated")}</option>
        </select>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.needsEscalation}
            onChange={(e) => set("needsEscalation", e.target.checked)}
          />
          {t("labRadEscalation.filterNeedsEscalation")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.criticalDelay}
            onChange={(e) => set("criticalDelay", e.target.checked)}
          />
          {t("labRadEscalation.filterCriticalDelay")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.awaitingResultOrFinalization}
            onChange={(e) => set("awaitingResultOrFinalization", e.target.checked)}
          />
          {t("labRadEscalation.filterAwaitingResult")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.awaitingAcknowledgement}
            onChange={(e) => set("awaitingAcknowledgement", e.target.checked)}
          />
          {t("labRadEscalation.filterAwaitingAck")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.shiftHandoffReview}
            onChange={(e) => set("shiftHandoffReview", e.target.checked)}
          />
          {t("labRadEscalation.filterShiftHandoff")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.adjustedReconciled}
            onChange={(e) => set("adjustedReconciled", e.target.checked)}
          />
          {t("labRadEscalation.filterAdjustedReconciled")}
        </label>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={filters.needsReconciliation}
            onChange={(e) => set("needsReconciliation", e.target.checked)}
          />
          {t("labRadReconciliation.filterNeedsReconciliation")}
        </label>
      </div>
    </div>
  );
}
