"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { RevenueCycleQueueTable } from "@/features/revenue/RevenueCycleQueueTable";
import {
  REVENUE_WORKSPACE_FILTERS,
  REVENUE_WORKSPACE_FILTER_I18N_KEYS,
  REVENUE_WORKSPACE_VIEWS,
  REVENUE_WORKSPACE_VIEW_I18N_KEYS,
  REVENUE_CYCLE_WORKSPACE_ROUTE,
  matchesRevenueCycleFilter,
  type RevenueCycleWorkspaceFilter,
  type RevenueCycleWorkspaceView,
} from "@/features/revenue/revenueCycleNavigation";
import {
  fetchRevenueCycleQueue,
  mapRevenueCycleApiRowsToWorkspaceRows,
  shouldReplaceRevenueCycleRows,
} from "@/features/revenue/revenueCycleQueueApi";
import {
  buildRevenueCycleQueueCounts,
  formatRevenueCycleQueueCountLabel,
} from "@/features/revenue/revenueCycleQueueCounts";
import type { RevenueCycleQueueRow } from "@/features/revenue/revenueCycleWorkspaceModels";
import type { RevenueCycleQueueView } from "@medora/shared";

type RevenueCycleWorkspaceProps = {
  facilityId?: string | null;
};

const EMPTY_STATE_I18N_KEYS: Record<RevenueCycleQueueView, string> = {
  READY_FOR_BILLING: "revenueCycle.empty.readyForBilling",
  BILLING_DEFICIENCY: "revenueCycle.empty.billingDeficiency",
  CODING_REVIEW: "revenueCycle.empty.codingReview",
  CLAIM_SUBMITTED: "revenueCycle.empty.claimSubmitted",
  CLAIM_PAID: "revenueCycle.empty.claimPaid",
};

export function RevenueCycleWorkspace({ facilityId }: RevenueCycleWorkspaceProps) {
  const { t } = useI18n();
  const hasLoadedOnceRef = useRef(false);
  const [activeView, setActiveView] = useState<RevenueCycleWorkspaceView>(
    REVENUE_WORKSPACE_VIEWS[0]!
  );
  const [quickFilter, setQuickFilter] = useState<RevenueCycleWorkspaceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<RevenueCycleQueueRow[]>([]);
  const [counts, setCounts] = useState(buildRevenueCycleQueueCounts(null));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadQueue = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!facilityId) return;
      const silent = Boolean(opts?.silent) || hasLoadedOnceRef.current;
      if (!silent) setIsInitialLoading(true);
      if (silent) setIsRefreshingSilently(true);
      setFetchError(null);

      try {
        const result = await fetchRevenueCycleQueue({
          facilityId,
          queue: quickFilter === "ALL" ? undefined : quickFilter,
          search,
        });
        const nextRows = mapRevenueCycleApiRowsToWorkspaceRows(result.rows);
        setRows((prev) => (shouldReplaceRevenueCycleRows(prev, nextRows) ? nextRows : prev));
        setCounts(buildRevenueCycleQueueCounts(result.counts));
        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (!silent) {
          setFetchError(error instanceof Error ? error.message : t("revenueCycle.loadError"));
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshingSilently(false);
      }
    },
    [facilityId, quickFilter, search, t]
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const viewRows = useMemo(() => {
    if (quickFilter !== "ALL") return rows;
    return rows.filter((row) => row.queue === activeView);
  }, [activeView, quickFilter, rows]);

  const activeQueueForEmpty =
    quickFilter === "ALL" ? activeView : (quickFilter as RevenueCycleQueueView);

  return (
    <div
      data-testid="revenue-cycle-workspace"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, color: "#0f172a" }}>
            {t("revenueCycle.title")}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 720 }}>
            {t("revenueCycle.introLive")}
          </p>
        </div>
        <Link
          href="/app/admin"
          style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
        >
          {t("revenueCycle.backAdmin")}
        </Link>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("revenueCycle.searchPlaceholder")}
          data-testid="revenue-cycle-search"
          style={{
            minWidth: 220,
            flex: "1 1 220px",
            maxWidth: 360,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 13,
          }}
        />
        {isRefreshingSilently ? (
          <span data-testid="revenue-cycle-silent-refresh" style={{ fontSize: 12, color: "#64748b" }}>
            {t("revenueCycle.refreshing")}
          </span>
        ) : null}
      </div>

      <nav
        aria-label={t("revenueCycle.viewsAriaLabel")}
        data-testid="revenue-cycle-view-nav"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 12,
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        {REVENUE_WORKSPACE_VIEWS.map((view) => {
          const selected = quickFilter === "ALL" && activeView === view;
          const label = t(REVENUE_WORKSPACE_VIEW_I18N_KEYS[view]);
          return (
            <button
              key={view}
              type="button"
              data-testid={`revenue-cycle-view-${view.toLowerCase()}`}
              aria-pressed={selected}
              onClick={() => {
                setActiveView(view);
                setQuickFilter("ALL");
              }}
              style={{
                borderRadius: 9999,
                border: `1px solid ${selected ? "#2563eb" : "#e2e8f0"}`,
                background: selected ? "#eff6ff" : "#fff",
                color: selected ? "#1d4ed8" : "#475569",
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {formatRevenueCycleQueueCountLabel(view, counts[view], label)}
            </button>
          );
        })}
      </nav>

      <div
        aria-label={t("revenueCycle.filtersAriaLabel")}
        data-testid="revenue-cycle-quick-filters"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {REVENUE_WORKSPACE_FILTERS.map((filterKey) => {
          const selected = quickFilter === filterKey;
          const label = t(REVENUE_WORKSPACE_FILTER_I18N_KEYS[filterKey]);
          const countLabel =
            filterKey === "ALL"
              ? label
              : formatRevenueCycleQueueCountLabel(
                  filterKey,
                  counts[filterKey as RevenueCycleQueueView],
                  label
                );
          return (
            <button
              key={filterKey}
              type="button"
              data-testid={`revenue-cycle-filter-${filterKey.toLowerCase()}`}
              aria-pressed={selected}
              onClick={() => setQuickFilter(filterKey)}
              style={{
                borderRadius: 9999,
                border: `1px solid ${selected ? "#0f172a" : "#e2e8f0"}`,
                background: selected ? "#f8fafc" : "#fff",
                color: selected ? "#0f172a" : "#64748b",
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {countLabel}
            </button>
          );
        })}
      </div>

      <section
        data-testid="revenue-cycle-workspace-content"
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: 14,
          minHeight: 240,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>
            {quickFilter === "ALL"
              ? t(REVENUE_WORKSPACE_VIEW_I18N_KEYS[activeView])
              : t(REVENUE_WORKSPACE_FILTER_I18N_KEYS[quickFilter])}
          </h2>
        </div>

        {isInitialLoading ? (
          <p data-testid="revenue-cycle-loading" style={{ color: "#64748b", fontSize: 13 }}>
            {t("revenueCycle.loading")}
          </p>
        ) : fetchError ? (
          <p data-testid="revenue-cycle-error" style={{ color: "#b91c1c", fontSize: 13 }}>
            {fetchError}
          </p>
        ) : viewRows.length === 0 ? (
          <p data-testid="revenue-cycle-empty" style={{ color: "#64748b", fontSize: 13 }}>
            {t(EMPTY_STATE_I18N_KEYS[activeQueueForEmpty])}
          </p>
        ) : (
          <RevenueCycleQueueTable rows={viewRows} />
        )}
      </section>

      <p
        data-testid="revenue-cycle-read-only-notice"
        style={{ margin: 0, fontSize: 12, color: "#64748b" }}
      >
        {t("revenueCycle.readOnlyNotice")}
      </p>
      <span data-testid="revenue-cycle-route-marker" hidden>
        {REVENUE_CYCLE_WORKSPACE_ROUTE}
      </span>
    </div>
  );
}
