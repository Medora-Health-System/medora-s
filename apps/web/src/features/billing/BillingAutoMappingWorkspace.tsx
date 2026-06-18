"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BILLING_AUTO_MAPPING_QUEUE,
  canBulkApplyAutoMapping,
  filterBillingAutoMappingWorkspaceRows,
  type BillingAutoMappingQueueView,
  type BillingAutoMappingWorkspaceRow,
} from "@medora/shared";
import {
  bulkApplyBillingAutoMappings,
  fetchBillingAutoMappingWorkspace,
  type BillingAutoMappingBulkApplyResult,
} from "@/lib/billingAutoMappingApi";

type BillingAutoMappingWorkspaceProps = {
  facilityId: string;
  t: (key: string) => string;
  locale: string;
};

const TAB_ORDER: BillingAutoMappingQueueView[] = [
  BILLING_AUTO_MAPPING_QUEUE.APPLY_READY,
  BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED,
  BILLING_AUTO_MAPPING_QUEUE.SKIPPED,
  BILLING_AUTO_MAPPING_QUEUE.MAPPED,
];

function tabI18nKey(tab: BillingAutoMappingQueueView): string {
  switch (tab) {
    case BILLING_AUTO_MAPPING_QUEUE.APPLY_READY:
      return "billingPage.autoMappingWorkspaceTabApplyReady";
    case BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED:
      return "billingPage.autoMappingWorkspaceTabReviewRequired";
    case BILLING_AUTO_MAPPING_QUEUE.SKIPPED:
      return "billingPage.autoMappingWorkspaceTabSkipped";
    case BILLING_AUTO_MAPPING_QUEUE.MAPPED:
      return "billingPage.autoMappingWorkspaceTabMapped";
    default:
      return "billingPage.autoMappingWorkspaceTabApplyReady";
  }
}

function countForTab(
  tab: BillingAutoMappingQueueView,
  counts: { applyReady: number; reviewRequired: number; skipped: number; mapped: number }
): number {
  switch (tab) {
    case BILLING_AUTO_MAPPING_QUEUE.APPLY_READY:
      return counts.applyReady;
    case BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED:
      return counts.reviewRequired;
    case BILLING_AUTO_MAPPING_QUEUE.SKIPPED:
      return counts.skipped;
    case BILLING_AUTO_MAPPING_QUEUE.MAPPED:
      return counts.mapped;
    default:
      return 0;
  }
}

function formatBulkSummary(t: (key: string) => string, summary: BillingAutoMappingBulkApplyResult): string {
  return t("billingPage.autoMappingWorkspaceBulkSummary")
    .replace("{applied}", String(summary.applied))
    .replace("{skipped}", String(summary.skipped))
    .replace("{failed}", String(summary.failed));
}

export function BillingAutoMappingWorkspace({ facilityId, t, locale }: BillingAutoMappingWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ applyReady: 0, reviewRequired: 0, skipped: 0, mapped: 0, total: 0 });
  const [rows, setRows] = useState<BillingAutoMappingWorkspaceRow[]>([]);
  const [activeTab, setActiveTab] = useState<BillingAutoMappingQueueView>(BILLING_AUTO_MAPPING_QUEUE.APPLY_READY);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [singleApplyingId, setSingleApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBillingAutoMappingWorkspace(facilityId, { limit: 2000 });
      setCounts(data.counts);
      setRows(data.rows);
    } catch {
      setError(t("billingPage.autoMappingWorkspaceLoadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabRows = useMemo(
    () => filterBillingAutoMappingWorkspaceRows(rows.filter((row) => row.queue === activeTab), search),
    [rows, activeTab, search]
  );

  const applyReadySelectable = useMemo(
    () => tabRows.filter((row) => canBulkApplyAutoMapping(row)),
    [tabRows]
  );

  const allApplyReadySelected =
    applyReadySelectable.length > 0 && applyReadySelectable.every((row) => selectedIds.has(row.ledgerRowId));

  const toggleSelectAll = () => {
    if (activeTab !== BILLING_AUTO_MAPPING_QUEUE.APPLY_READY) return;
    if (allApplyReadySelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applyReadySelectable.map((row) => row.ledgerRowId)));
    }
  };

  const toggleRow = (ledgerRowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ledgerRowId)) next.delete(ledgerRowId);
      else next.add(ledgerRowId);
      return next;
    });
  };

  const runBulkApply = async (ledgerRowIds: string[]) => {
    setBulkApplying(true);
    setBulkSummary(null);
    try {
      const result = await bulkApplyBillingAutoMappings(facilityId, ledgerRowIds);
      setBulkSummary(formatBulkSummary(t, result));
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      await load();
    } catch {
      setError(t("billingPage.autoMappingWorkspaceBulkError"));
    } finally {
      setBulkApplying(false);
    }
  };

  const applySingle = async (ledgerRowId: string) => {
    setSingleApplyingId(ledgerRowId);
    try {
      await runBulkApply([ledgerRowId]);
    } finally {
      setSingleApplyingId(null);
    }
  };

  if (loading) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <div data-testid="billing-auto-mapping-workspace">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`auto-mapping-tab-${tab}`}
            onClick={() => {
              setActiveTab(tab);
              setSelectedIds(new Set());
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: activeTab === tab ? "1px solid #0f766e" : "1px solid #cbd5e1",
              background: activeTab === tab ? "#ecfdf5" : "#fff",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(tabI18nKey(tab))} ({countForTab(tab, counts)})
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
          {t("billingPage.autoMappingWorkspaceSearchLabel")}
          <input
            type="search"
            data-testid="auto-mapping-workspace-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("billingPage.autoMappingWorkspaceSearchPlaceholder")}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 240 }}
          />
        </label>
        {activeTab === BILLING_AUTO_MAPPING_QUEUE.APPLY_READY ? (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                data-testid="auto-mapping-select-all"
                checked={allApplyReadySelected}
                onChange={toggleSelectAll}
              />
              {t("billingPage.autoMappingWorkspaceSelectAll")}
            </label>
            <button
              type="button"
              data-testid="auto-mapping-bulk-apply-open"
              disabled={selectedIds.size === 0 || bulkApplying}
              onClick={() => setBulkConfirmOpen(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: selectedIds.size > 0 ? "#0f766e" : "#94a3b8",
                color: "#fff",
                fontWeight: 700,
                cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
              }}
            >
              {t("billingPage.autoMappingWorkspaceBulkApply")}
            </button>
          </>
        ) : null}
      </div>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {bulkSummary ? (
        <p data-testid="auto-mapping-bulk-summary" style={{ color: "#0f766e", fontWeight: 600 }}>
          {bulkSummary}
        </p>
      ) : null}

      {tabRows.length === 0 ? (
        <p style={{ color: "#64748b" }}>{t("billingPage.autoMappingWorkspaceEmpty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} data-testid="auto-mapping-workspace-table">
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {activeTab === BILLING_AUTO_MAPPING_QUEUE.APPLY_READY ? <th style={{ padding: 8 }} /> : null}
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColPatient")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColMrn")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColEncounter")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColSource")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColDescription")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColSuggested")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColConfidence")}</th>
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColStatus")}</th>
                {activeTab === BILLING_AUTO_MAPPING_QUEUE.MAPPED ? (
                  <>
                    <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColAppliedCode")}</th>
                    <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColAppliedAt")}</th>
                  </>
                ) : null}
                <th style={{ padding: 8 }}>{t("billingPage.autoMappingWorkspaceColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {tabRows.map((row) => (
                <tr key={row.ledgerRowId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  {activeTab === BILLING_AUTO_MAPPING_QUEUE.APPLY_READY ? (
                    <td style={{ padding: 8 }}>
                      {canBulkApplyAutoMapping(row) ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.ledgerRowId)}
                          onChange={() => toggleRow(row.ledgerRowId)}
                          aria-label={row.description}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td style={{ padding: 8 }}>{row.patientName}</td>
                  <td style={{ padding: 8 }}>{row.patientMrn ?? "—"}</td>
                  <td style={{ padding: 8, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                    {row.encounterId.slice(0, 8)}…
                  </td>
                  <td style={{ padding: 8 }}>{row.sourceType}</td>
                  <td style={{ padding: 8 }}>{row.description}</td>
                  <td style={{ padding: 8 }}>{row.suggestedCode || "—"}</td>
                  <td style={{ padding: 8 }}>
                    {row.confidence ? t(`billingPage.autoMappingConfidence_${row.confidence}`) : "—"}
                  </td>
                  <td style={{ padding: 8 }}>{row.queue}</td>
                  {activeTab === BILLING_AUTO_MAPPING_QUEUE.MAPPED ? (
                    <>
                      <td style={{ padding: 8 }}>{row.appliedCode ?? "—"}</td>
                      <td style={{ padding: 8 }}>
                        {row.appliedAt ? new Date(row.appliedAt).toLocaleString(locale) : "—"}
                      </td>
                    </>
                  ) : null}
                  <td style={{ padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {activeTab === BILLING_AUTO_MAPPING_QUEUE.APPLY_READY && canBulkApplyAutoMapping(row) ? (
                      <button
                        type="button"
                        disabled={singleApplyingId === row.ledgerRowId || bulkApplying}
                        onClick={() => void applySingle(row.ledgerRowId)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #0f766e",
                          background: "#fff",
                          color: "#0f766e",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {t("billingPage.autoMappingWorkspaceActionApply")}
                      </button>
                    ) : null}
                    {activeTab === BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED ? (
                      <Link
                        href={`/app/billing/encounters/${row.encounterId}?autoMapping=1`}
                        style={{ fontSize: 12, fontWeight: 600, color: "#0f766e" }}
                      >
                        {t("billingPage.autoMappingWorkspaceActionReview")}
                      </Link>
                    ) : null}
                    <Link
                      href={`/app/billing/encounters/${row.encounterId}`}
                      style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}
                    >
                      {t("billingPage.autoMappingWorkspaceActionViewLedger")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bulkConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="auto-mapping-bulk-confirm-modal"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              borderRadius: 10,
              padding: 18,
              boxShadow: "0 20px 50px rgba(15,23,42,0.22)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {t("billingPage.autoMappingWorkspaceBulkConfirmTitle").replace("{count}", String(selectedIds.size))}
            </h2>
            <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
              {t("billingPage.autoMappingWorkspaceBulkConfirmBody")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(false)}
                disabled={bulkApplying}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                data-testid="auto-mapping-bulk-confirm-submit"
                disabled={bulkApplying}
                onClick={() => void runBulkApply([...selectedIds])}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {bulkApplying ? t("billingPage.autoMappingApplying") : t("billingPage.autoMappingWorkspaceBulkConfirmSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
