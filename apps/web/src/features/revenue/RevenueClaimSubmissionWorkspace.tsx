"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { RevenueClaimQueueTable } from "@/features/revenue/RevenueClaimQueueTable";
import {
  REVENUE_CLAIM_SUBMISSION_WORKSPACE_ROUTE,
  REVENUE_CLAIM_WORKSPACE_FILTERS,
  REVENUE_CLAIM_WORKSPACE_FILTER_I18N_KEYS,
  REVENUE_CLAIM_WORKSPACE_VIEWS,
  REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS,
  type RevenueClaimWorkspaceFilter,
  type RevenueClaimWorkspaceView,
} from "@/features/revenue/revenueClaimSubmissionNavigation";
import {
  fetchRevenueClaimSubmission,
  mapRevenueClaimApiRowsToWorkspaceRows,
  shouldReplaceRevenueClaimRows,
} from "@/features/revenue/revenueClaimSubmissionApi";
import {
  buildRevenueClaimSubmissionCounts,
  formatRevenueClaimQueueCountLabel,
} from "@/features/revenue/revenueClaimSubmissionQueueCounts";
import type { RevenueClaimQueueRow } from "@/features/revenue/revenueClaimSubmissionWorkspaceModels";
import type { ClaimSubmissionWorkspaceQueue } from "@medora/shared";

type RevenueClaimSubmissionWorkspaceProps = {
  facilityId?: string | null;
};

const EMPTY_STATE_I18N_KEYS: Record<ClaimSubmissionWorkspaceQueue, string> = {
  READY_TO_SEND: "revenueClaimSubmission.empty.readyToSend",
  SENT: "revenueClaimSubmission.empty.sent",
  ACK_PENDING: "revenueClaimSubmission.empty.ackPending",
  ACCEPTED: "revenueClaimSubmission.empty.accepted",
  REJECTED: "revenueClaimSubmission.empty.rejected",
  NEEDS_CORRECTION: "revenueClaimSubmission.empty.needsCorrection",
};

export function RevenueClaimSubmissionWorkspace({
  facilityId,
}: RevenueClaimSubmissionWorkspaceProps) {
  const { t } = useI18n();
  const hasLoadedOnceRef = useRef(false);
  const [activeView, setActiveView] = useState<RevenueClaimWorkspaceView>(
    REVENUE_CLAIM_WORKSPACE_VIEWS[0]!
  );
  const [quickFilter, setQuickFilter] = useState<RevenueClaimWorkspaceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<RevenueClaimQueueRow[]>([]);
  const [counts, setCounts] = useState(buildRevenueClaimSubmissionCounts(null));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadClaims = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!facilityId) return;
      const silent = Boolean(opts?.silent) || hasLoadedOnceRef.current;
      if (!silent) setIsInitialLoading(true);
      if (silent) setIsRefreshingSilently(true);
      setFetchError(null);

      try {
        const result = await fetchRevenueClaimSubmission({
          facilityId,
          queue: quickFilter === "ALL" ? undefined : quickFilter,
          search,
        });
        const nextRows = mapRevenueClaimApiRowsToWorkspaceRows(result.rows);
        setRows((prev) => (shouldReplaceRevenueClaimRows(prev, nextRows) ? nextRows : prev));
        setCounts(buildRevenueClaimSubmissionCounts(result.counts));
        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (!silent) {
          setFetchError(
            error instanceof Error ? error.message : t("revenueClaimSubmission.loadError")
          );
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshingSilently(false);
      }
    },
    [facilityId, quickFilter, search, t]
  );

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const viewRows = useMemo(() => {
    if (quickFilter !== "ALL") return rows;
    return rows.filter((row) => row.queue === activeView);
  }, [activeView, quickFilter, rows]);

  const activeQueueForEmpty =
    quickFilter === "ALL" ? activeView : (quickFilter as ClaimSubmissionWorkspaceQueue);

  return (
    <div
      data-testid="revenue-claim-submission-workspace"
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
            {t("revenueClaimSubmission.title")}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 720 }}>
            {t("revenueClaimSubmission.intro")}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            href="/app/admin/revenue-cycle"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenueClaimSubmission.backRevenueCycle")}
          </Link>
          <Link
            href="/app/admin"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenueClaimSubmission.backAdmin")}
          </Link>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("revenueClaimSubmission.searchPlaceholder")}
          data-testid="revenue-claim-search"
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
          <span
            data-testid="revenue-claim-silent-refresh"
            style={{ fontSize: 12, color: "#64748b" }}
          >
            {t("revenueClaimSubmission.refreshing")}
          </span>
        ) : null}
      </div>

      <nav
        aria-label={t("revenueClaimSubmission.viewsAriaLabel")}
        data-testid="revenue-claim-view-nav"
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
        {REVENUE_CLAIM_WORKSPACE_VIEWS.map((view) => {
          const selected = quickFilter === "ALL" && activeView === view;
          const label = t(REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS[view]);
          return (
            <button
              key={view}
              type="button"
              data-testid={`revenue-claim-view-${view.toLowerCase()}`}
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
              {formatRevenueClaimQueueCountLabel(view, counts[view], label)}
            </button>
          );
        })}
      </nav>

      <div
        aria-label={t("revenueClaimSubmission.filtersAriaLabel")}
        data-testid="revenue-claim-quick-filters"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {REVENUE_CLAIM_WORKSPACE_FILTERS.map((filterKey) => {
          const selected = quickFilter === filterKey;
          const label = t(REVENUE_CLAIM_WORKSPACE_FILTER_I18N_KEYS[filterKey]);
          const countLabel =
            filterKey === "ALL"
              ? label
              : formatRevenueClaimQueueCountLabel(
                  filterKey,
                  counts[filterKey as ClaimSubmissionWorkspaceQueue],
                  label
                );
          return (
            <button
              key={filterKey}
              type="button"
              data-testid={`revenue-claim-filter-${filterKey.toLowerCase()}`}
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
        data-testid="revenue-claim-workspace-content"
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
              ? t(REVENUE_CLAIM_WORKSPACE_VIEW_I18N_KEYS[activeView])
              : t(REVENUE_CLAIM_WORKSPACE_FILTER_I18N_KEYS[quickFilter])}
          </h2>
        </div>

        {isInitialLoading ? (
          <p data-testid="revenue-claim-loading" style={{ color: "#64748b", fontSize: 13 }}>
            {t("revenueClaimSubmission.loading")}
          </p>
        ) : fetchError ? (
          <p data-testid="revenue-claim-error" style={{ color: "#b91c1c", fontSize: 13 }}>
            {fetchError}
          </p>
        ) : viewRows.length === 0 ? (
          <p data-testid="revenue-claim-empty" style={{ color: "#64748b", fontSize: 13 }}>
            {t(EMPTY_STATE_I18N_KEYS[activeQueueForEmpty])}
          </p>
        ) : (
          <RevenueClaimQueueTable rows={viewRows} />
        )}
      </section>

      <p
        data-testid="revenue-claim-read-only-notice"
        style={{ margin: 0, fontSize: 12, color: "#64748b" }}
      >
        {t("revenueClaimSubmission.readOnlyNotice")}
      </p>
      <span data-testid="revenue-claim-route-marker" hidden>
        {REVENUE_CLAIM_SUBMISSION_WORKSPACE_ROUTE}
      </span>
    </div>
  );
}
