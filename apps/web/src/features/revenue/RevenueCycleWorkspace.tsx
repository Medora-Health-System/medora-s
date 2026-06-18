"use client";

import React, { useMemo, useState } from "react";
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
import { buildRevenueCyclePlaceholderRows } from "@/features/revenue/revenueCycleWorkspaceModels";

type RevenueCycleWorkspaceProps = {
  facilityId?: string | null;
};

export function RevenueCycleWorkspace({ facilityId: _facilityId }: RevenueCycleWorkspaceProps) {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<RevenueCycleWorkspaceView>(
    REVENUE_WORKSPACE_VIEWS[0]!
  );
  const [quickFilter, setQuickFilter] = useState<RevenueCycleWorkspaceFilter>("ALL");

  const placeholderRows = useMemo(() => buildRevenueCyclePlaceholderRows(), []);

  const filteredRows = useMemo(() => {
    return placeholderRows.filter((row) => matchesRevenueCycleFilter(row.queue, quickFilter));
  }, [placeholderRows, quickFilter]);

  const viewRows = useMemo(() => {
    if (quickFilter !== "ALL") return filteredRows;
    return placeholderRows.filter((row) => row.queue === activeView);
  }, [activeView, filteredRows, placeholderRows, quickFilter]);

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
            {t("revenueCycle.intro")}
          </p>
        </div>
        <Link
          href="/app/admin"
          style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
        >
          {t("revenueCycle.backAdmin")}
        </Link>
      </header>

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
              {t(REVENUE_WORKSPACE_VIEW_I18N_KEYS[view])}
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
              {t(REVENUE_WORKSPACE_FILTER_I18N_KEYS[filterKey])}
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
          <span
            data-testid="revenue-cycle-shell-notice"
            style={{ fontSize: 12, color: "#64748b" }}
          >
            {t("revenueCycle.shellNotice")}
          </span>
        </div>

        <RevenueCycleQueueTable rows={viewRows} />
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
