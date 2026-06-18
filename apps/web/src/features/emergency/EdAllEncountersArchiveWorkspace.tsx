"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { EdAllEncountersArchiveTable } from "@/features/emergency/EdAllEncountersArchiveTable";
import {
  fetchEdAllEncountersArchive,
  filterEdAllEncountersArchiveRows,
  shouldReplaceArchiveRows,
  type EdAllEncountersArchiveFilters,
  type EdAllEncountersArchiveRow,
} from "@/features/emergency/edAllEncountersArchive";
import {
  ED_ALL_ENCOUNTERS_BILLING_CODING_FILTERS,
  ED_ALL_ENCOUNTERS_BILLING_CODING_FILTER_I18N_KEYS,
  filterAllEncountersByBillingCodingStatus,
  type EdAllEncountersBillingCodingFilter,
} from "@/features/emergency/edAllEncountersBillingCodingFilters";

type EdAllEncountersArchiveWorkspaceProps = {
  facilityId: string;
  refreshNonce: number;
};

export function EdAllEncountersArchiveWorkspace({
  facilityId,
  refreshNonce,
}: EdAllEncountersArchiveWorkspaceProps) {
  const { t } = useI18n();
  const hasLoadedOnceRef = useRef(false);
  const [rows, setRows] = useState<EdAllEncountersArchiveRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EdAllEncountersArchiveFilters>({
    search: "",
    startDate: "",
    endDate: "",
    facilityId,
  });
  const [billingCodingFilter, setBillingCodingFilter] =
    useState<EdAllEncountersBillingCodingFilter>("ALL");

  useEffect(() => {
    setFilters((prev) => ({ ...prev, facilityId }));
  }, [facilityId]);

  const loadArchive = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!facilityId) return;
      const silent = Boolean(opts?.silent) || hasLoadedOnceRef.current;
      if (!silent) setIsInitialLoading(true);
      if (silent) setIsRefreshingSilently(true);
      setFetchError(null);

      try {
        const result = await fetchEdAllEncountersArchive({
          facilityId,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
        });
        setRows((prev) => {
          if (prev.length > 0 && !shouldReplaceArchiveRows(prev, result.rows)) {
            return prev;
          }
          return result.rows;
        });
        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (!silent) {
          setFetchError(error instanceof Error ? error.message : t("edLifecycle.allEncounters.loadError"));
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshingSilently(false);
      }
    },
    [facilityId, filters.endDate, filters.search, filters.startDate, t]
  );

  useEffect(() => {
    void loadArchive({ silent: hasLoadedOnceRef.current });
  }, [facilityId, filters.endDate, filters.search, filters.startDate, loadArchive]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void loadArchive({ silent: true });
    }
  }, [refreshNonce, loadArchive]);

  const filteredRows = useMemo(() => {
    const searchAndDateFiltered = filterEdAllEncountersArchiveRows(rows, filters);
    return filterAllEncountersByBillingCodingStatus(searchAndDateFiltered, billingCodingFilter);
  }, [billingCodingFilter, filters, rows]);

  const filtersActive =
    Boolean(filters.search.trim()) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    billingCodingFilter !== "ALL";

  const inputStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    padding: "0 12px",
    fontSize: 13,
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 3,
  };

  if (fetchError && rows.length === 0) {
    return (
      <div
        data-testid="ed-all-encounters-error"
        style={{
          borderRadius: 16,
          border: "1px solid #fecaca",
          backgroundColor: "#fff",
          padding: 40,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{fetchError}</p>
        <button
          type="button"
          onClick={() => void loadArchive()}
          style={{
            marginTop: 24,
            padding: "10px 18px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {t("common.refresh")}
        </button>
      </div>
    );
  }

  if (isInitialLoading && rows.length === 0) {
    return (
      <div data-testid="ed-all-encounters-loading" style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div data-testid="ed-all-encounters-workspace">
      <div
        data-testid="ed-all-encounters-filters"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="ed-all-encounters-search">
            {t("edLifecycle.allEncounters.filters.search")}
          </label>
          <input
            id="ed-all-encounters-search"
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder={t("edLifecycle.allEncounters.filters.searchPlaceholder")}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ed-all-encounters-start">
            {t("edLifecycle.allEncounters.filters.startDate")}
          </label>
          <input
            id="ed-all-encounters-start"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ed-all-encounters-end">
            {t("edLifecycle.allEncounters.filters.endDate")}
          </label>
          <input
            id="ed-all-encounters-end"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label={t("edLifecycle.allEncounters.billingCodingFilter.ariaLabel")}
        data-testid="ed-all-encounters-billing-coding-filters"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {ED_ALL_ENCOUNTERS_BILLING_CODING_FILTERS.map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            data-testid={`ed-all-encounters-billing-filter-${filterKey.toLowerCase()}`}
            aria-pressed={billingCodingFilter === filterKey}
            onClick={() => setBillingCodingFilter(filterKey)}
            style={{
              padding: "6px 12px",
              borderRadius: 9999,
              border: "1px solid #e2e8f0",
              background: billingCodingFilter === filterKey ? "#eff6ff" : "#fff",
              color: billingCodingFilter === filterKey ? "#1d4ed8" : "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t(ED_ALL_ENCOUNTERS_BILLING_CODING_FILTER_I18N_KEYS[filterKey])}
          </button>
        ))}
      </div>

      {isRefreshingSilently ? (
        <p
          data-testid="ed-all-encounters-silent-refresh"
          style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b" }}
        >
          {t("common.refreshing")}
        </p>
      ) : null}

      {filteredRows.length === 0 ? (
        <div
          data-testid={filtersActive ? "ed-all-encounters-empty-filtered" : "ed-all-encounters-empty"}
          style={{
            borderRadius: 16,
            border: "1px dashed #cbd5e1",
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>
            {filtersActive
              ? t("edLifecycle.allEncounters.emptyFiltered")
              : t("edLifecycle.allEncounters.empty")}
          </p>
        </div>
      ) : (
        <EdAllEncountersArchiveTable rows={filteredRows} />
      )}
    </div>
  );
}
