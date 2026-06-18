"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { RevenuePaymentQueueTable } from "@/features/revenue/RevenuePaymentQueueTable";
import {
  REVENUE_PAYMENT_WORKSPACE_FILTERS,
  REVENUE_PAYMENT_WORKSPACE_FILTER_I18N_KEYS,
  REVENUE_PAYMENT_WORKSPACE_ROUTE,
  REVENUE_PAYMENT_WORKSPACE_VIEWS,
  REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS,
  type RevenuePaymentWorkspaceFilter,
  type RevenuePaymentWorkspaceView,
} from "@/features/revenue/revenuePaymentNavigation";
import {
  fetchRevenuePaymentWorkspace,
  mapRevenuePaymentApiRowsToWorkspaceRows,
  shouldReplaceRevenuePaymentRows,
  type RevenuePaymentWorkspaceRow,
} from "@/features/revenue/revenuePaymentApi";
import {
  buildRevenuePaymentCounts,
  formatRevenuePaymentQueueCountLabel,
} from "@/features/revenue/revenuePaymentQueueCounts";
import type { RevenuePaymentQueue } from "@medora/shared";

type RevenuePaymentWorkspaceProps = {
  facilityId?: string | null;
};

const EMPTY_STATE_I18N_KEYS: Record<RevenuePaymentQueue, string> = {
  PAYMENT_PENDING: "revenuePayment.empty.paymentPending",
  PAYMENT_RECEIVED: "revenuePayment.empty.paymentReceived",
  UNDERPAID: "revenuePayment.empty.underpaid",
  DENIED: "revenuePayment.empty.denied",
  UNAPPLIED_PAYMENT: "revenuePayment.empty.unappliedPayment",
  RECONCILIATION_REQUIRED: "revenuePayment.empty.reconciliationRequired",
};

export function RevenuePaymentWorkspace({ facilityId }: RevenuePaymentWorkspaceProps) {
  const { t } = useI18n();
  const hasLoadedOnceRef = useRef(false);
  const [activeView, setActiveView] = useState<RevenuePaymentWorkspaceView>(
    REVENUE_PAYMENT_WORKSPACE_VIEWS[0]!
  );
  const [quickFilter, setQuickFilter] = useState<RevenuePaymentWorkspaceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<RevenuePaymentWorkspaceRow[]>([]);
  const [counts, setCounts] = useState(buildRevenuePaymentCounts(null));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadPayments = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!facilityId) return;
      const silent = Boolean(opts?.silent) || hasLoadedOnceRef.current;
      if (!silent) setIsInitialLoading(true);
      if (silent) setIsRefreshingSilently(true);
      setFetchError(null);

      try {
        const result = await fetchRevenuePaymentWorkspace({
          facilityId,
          queue: quickFilter === "ALL" ? undefined : quickFilter,
          search,
        });
        const nextRows = mapRevenuePaymentApiRowsToWorkspaceRows(result.rows);
        setRows((prev) => (shouldReplaceRevenuePaymentRows(prev, nextRows) ? nextRows : prev));
        setCounts(buildRevenuePaymentCounts(result.counts));
        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (!silent) {
          setFetchError(error instanceof Error ? error.message : t("revenuePayment.loadError"));
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshingSilently(false);
      }
    },
    [facilityId, quickFilter, search, t]
  );

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const viewRows = useMemo(() => {
    if (quickFilter !== "ALL") return rows;
    return rows.filter((row) => row.queue === activeView);
  }, [activeView, quickFilter, rows]);

  const activeQueueForEmpty =
    quickFilter === "ALL" ? activeView : (quickFilter as RevenuePaymentQueue);

  return (
    <div
      data-testid="revenue-payment-workspace"
      style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}
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
            {t("revenuePayment.title")}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 720 }}>
            {t("revenuePayment.intro")}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            href="/app/admin/revenue-cycle"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenuePayment.backRevenueCycle")}
          </Link>
          <Link
            href="/app/admin/revenue-cycle/claims"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenuePayment.backClaims")}
          </Link>
          <Link
            href="/app/admin"
            style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
          >
            {t("revenuePayment.backAdmin")}
          </Link>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("revenuePayment.searchPlaceholder")}
          data-testid="revenue-payment-search"
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
            data-testid="revenue-payment-silent-refresh"
            style={{ fontSize: 12, color: "#64748b" }}
          >
            {t("revenuePayment.refreshing")}
          </span>
        ) : null}
      </div>

      <nav
        aria-label={t("revenuePayment.viewsAriaLabel")}
        data-testid="revenue-payment-view-nav"
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
        {REVENUE_PAYMENT_WORKSPACE_VIEWS.map((view) => {
          const selected = quickFilter === "ALL" && activeView === view;
          const label = t(REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS[view]);
          return (
            <button
              key={view}
              type="button"
              data-testid={`revenue-payment-view-${view.toLowerCase()}`}
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
              {formatRevenuePaymentQueueCountLabel(view, counts[view], label)}
            </button>
          );
        })}
      </nav>

      <div
        aria-label={t("revenuePayment.filtersAriaLabel")}
        data-testid="revenue-payment-quick-filters"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {REVENUE_PAYMENT_WORKSPACE_FILTERS.map((filterKey) => {
          const selected = quickFilter === filterKey;
          const label = t(REVENUE_PAYMENT_WORKSPACE_FILTER_I18N_KEYS[filterKey]);
          const countLabel =
            filterKey === "ALL"
              ? label
              : formatRevenuePaymentQueueCountLabel(
                  filterKey,
                  counts[filterKey as RevenuePaymentQueue],
                  label
                );
          return (
            <button
              key={filterKey}
              type="button"
              data-testid={`revenue-payment-filter-${filterKey.toLowerCase()}`}
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
        data-testid="revenue-payment-workspace-content"
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: 14,
          minHeight: 240,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 15, color: "#0f172a" }}>
          {quickFilter === "ALL"
            ? t(REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS[activeView])
            : t(REVENUE_PAYMENT_WORKSPACE_FILTER_I18N_KEYS[quickFilter])}
        </h2>

        {isInitialLoading ? (
          <p data-testid="revenue-payment-loading" style={{ color: "#64748b", fontSize: 13 }}>
            {t("revenuePayment.loading")}
          </p>
        ) : fetchError ? (
          <p data-testid="revenue-payment-error" style={{ color: "#b91c1c", fontSize: 13 }}>
            {fetchError}
          </p>
        ) : viewRows.length === 0 ? (
          <p data-testid="revenue-payment-empty" style={{ color: "#64748b", fontSize: 13 }}>
            {t(EMPTY_STATE_I18N_KEYS[activeQueueForEmpty])}
          </p>
        ) : (
          <RevenuePaymentQueueTable rows={viewRows} />
        )}
      </section>

      <p
        data-testid="revenue-payment-read-only-notice"
        style={{ margin: 0, fontSize: 12, color: "#64748b" }}
      >
        {t("revenuePayment.readOnlyNotice")}
      </p>
      <span data-testid="revenue-payment-route-marker" hidden>
        {REVENUE_PAYMENT_WORKSPACE_ROUTE}
      </span>
    </div>
  );
}
