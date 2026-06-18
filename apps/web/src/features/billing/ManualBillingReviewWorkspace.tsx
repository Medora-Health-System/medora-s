"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import {
  filterManualReviewByCategory,
  isManualReviewBulkSelectable,
  manualReviewCategoryFilterI18nKey,
  MANUAL_REVIEW_CATEGORY_FILTERS,
  partitionManualReviewRows,
  sortManualReviewRows,
} from "@/features/billing/manualBillingReviewPartition";
import type {
  BillingReviewDecisionStatus,
  ManualBillingReviewBulkDecisionResponse,
  ManualReviewCategoryFilter,
  ManualReviewRow,
} from "@/features/billing/manualBillingReviewTypes";

function billingPageKey(t: (key: string) => string, suffix: string): string {
  const key = `billingPage.${suffix}`;
  const value = t(key);
  return value === key ? suffix : value;
}

function autoBillDecisionReasonText(t: (key: string) => string, reason: string): string {
  const normalized = reason.trim();
  const knownReasonKeyByText: Record<string, string> = {
    "Medication auto-billing is disabled until dose/unit conversion and payer policy are implemented.":
      "autoBillDecisionReasonMedicationDisabled",
    "Imaging auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.":
      "autoBillDecisionReasonImagingDisabled",
    "Care/procedure auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.":
      "autoBillDecisionReasonCareDisabled",
    "Candidate-only billing evidence requires manual review.": "autoBillDecisionReasonCandidateOnly",
    "Licensed billing source or facility chargemaster review is required.": "autoBillDecisionReasonPendingLicense",
    "No safe billing code is available for auto-billing.": "autoBillDecisionReasonMissing",
    "Auto-billing requires a validated lab billing code.": "autoBillDecisionReasonValidatedLabRequired",
    "Procedure documented; CPT/chargemaster review required.": "autoBillDecisionReasonDocumentedProcedureReview",
  };
  const key = knownReasonKeyByText[normalized];
  return key ? t(`billingPage.${key}`) : normalized;
}

function formatCountMessage(t: (key: string) => string, key: string, count: number): string {
  return t(key).replace("{count}", String(count));
}

function formatBulkSummary(
  t: (key: string) => string,
  summary: ManualBillingReviewBulkDecisionResponse
): string {
  return t("billingPage.manualReviewBulkSuccessSummary")
    .replace("{approved}", String(summary.approved))
    .replace("{skipped}", String(summary.skipped))
    .replace("{failed}", String(summary.failed));
}

type AuditTrailProps = {
  row: ManualReviewRow;
  locale: string;
  t: (key: string) => string;
};

function ManualReviewAuditTrail({ row, locale, t }: AuditTrailProps) {
  if (row.decisionAuditTrail.length === 0) {
    return (
      <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
        {t("billingPage.manualReviewAuditEmpty")}
      </div>
    );
  }

  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#334155" }}>
        {t("billingPage.manualReviewAuditTrail")} ({row.decisionAuditTrail.length})
      </summary>
      <ul
        style={{
          margin: "8px 0 0",
          paddingLeft: 14,
          listStyle: "disc",
          color: "#475569",
          lineHeight: 1.4,
        }}
      >
        {row.decisionAuditTrail.map((entry) => (
          <li key={entry.id} style={{ marginBottom: 8 }}>
            <div>{new Date(entry.createdAt).toLocaleString(locale)}</div>
            <div>
              {entry.source === "BULK_APPROVAL" ? (
                <span>{t("billingPage.manualReviewAuditBulkApproval")}</span>
              ) : (
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10 }}>{entry.action}</span>
              )}
              {entry.decision ? (
                <span> · {billingPageKey(t, `billingReviewDecision_${entry.decision}`)}</span>
              ) : null}
              {entry.hasNotes === true ? (
                <span style={{ color: "#92400e" }}> · {t("billingPage.manualReviewAuditNotesRecorded")}</span>
              ) : null}
            </div>
            <div>
              {entry.actorDisplayName?.trim() ? entry.actorDisplayName : entry.userId ?? t("common.dash")}
            </div>
            {entry.bulkReason ? (
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{entry.bulkReason}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

type RowTableProps = {
  rows: ManualReviewRow[];
  locale: string;
  t: (key: string) => string;
  mode: "pending" | "approved";
  selectedIds?: Set<string>;
  onToggleRow?: (orderItemId: string) => void;
  onToggleAllVisible?: (orderItemIds: string[]) => void;
  savingOrderItemId?: string | null;
  onApprove?: (row: ManualReviewRow) => void;
  onNeedsInfo?: (row: ManualReviewRow) => void;
  onDoNotBill?: (row: ManualReviewRow) => void;
};

function ManualReviewRowTable({
  rows,
  locale,
  t,
  mode,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
  savingOrderItemId,
  onApprove,
  onNeedsInfo,
  onDoNotBill,
}: RowTableProps) {
  const selectableIds = useMemo(
    () => rows.filter(isManualReviewBulkSelectable).map((row) => row.orderItemId),
    [rows]
  );
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds?.has(id) === true);

  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            {mode === "pending" ? (
              <th style={{ padding: 10, width: 36 }}>
                <input
                  type="checkbox"
                  aria-label={t("billingPage.manualReviewSelectAll")}
                  checked={allVisibleSelected}
                  disabled={selectableIds.length === 0}
                  onChange={() => onToggleAllVisible?.(selectableIds)}
                />
              </th>
            ) : null}
            <th style={{ padding: 10, textAlign: "left" }}>{t("common.patient")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableOrder")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCode")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableStatus")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCategory")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCreatedAt")}</th>
            <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableReason")}</th>
            {mode === "approved" ? (
              <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableReviewer")}</th>
            ) : (
              <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableDecision")}</th>
            )}
            {mode === "pending" ? (
              <th style={{ padding: 10, textAlign: "left" }}>{t("common.actions")}</th>
            ) : (
              <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewAuditTrail")}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.orderItemId}
              style={{
                borderBottom: "1px solid #f1f5f9",
                background: row.reviewAnchorType === "PROCEDURE_DOCUMENTED" ? "#fafafa" : undefined,
              }}
            >
              {mode === "pending" ? (
                <td style={{ padding: 10 }}>
                  {isManualReviewBulkSelectable(row) ? (
                    <input
                      type="checkbox"
                      aria-label={row.displayName}
                      checked={selectedIds?.has(row.orderItemId) === true}
                      onChange={() => onToggleRow?.(row.orderItemId)}
                    />
                  ) : null}
                </td>
              ) : null}
              <td style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{row.patientName}</div>
                <div style={{ color: "#64748b", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
                  {row.patientId}
                </div>
              </td>
              <td style={{ padding: 10 }}>
                <div>{row.displayName || t("common.dash")}</div>
                <div style={{ color: "#64748b", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
                  {row.orderItemId}
                </div>
              </td>
              <td style={{ padding: 10, fontFamily: "ui-monospace, monospace" }}>
                {row.medoraCode || t("common.dash")}
              </td>
              <td style={{ padding: 10 }}>{billingPageKey(t, `billingReadiness_${row.billingStatus}`)}</td>
              <td style={{ padding: 10 }}>{billingPageKey(t, `billingCategory_${row.category}`)}</td>
              <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                {row.createdAt ? new Date(row.createdAt).toLocaleString(locale) : t("common.dash")}
              </td>
              <td style={{ padding: 10, color: "#334155", maxWidth: 320 }}>
                {autoBillDecisionReasonText(t, row.reason)}
              </td>
              {mode === "approved" ? (
                <td style={{ padding: 10, minWidth: 180 }}>
                  {row.latestDecision ? (
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {row.latestDecision.reviewerName?.trim()
                          ? row.latestDecision.reviewerName
                          : row.latestDecision.reviewerId}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
                        {t("billingPage.manualReviewApprovedAt")}:{" "}
                        {new Date(row.latestDecision.reviewedAt).toLocaleString(locale)}
                      </div>
                    </div>
                  ) : (
                    t("common.dash")
                  )}
                </td>
              ) : (
                <td style={{ padding: 10, minWidth: 180 }}>
                  {row.latestDecision ? (
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {billingPageKey(t, `billingReviewDecision_${row.latestDecision.decision}`)}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
                        {new Date(row.latestDecision.reviewedAt).toLocaleString(locale)}
                      </div>
                    </div>
                  ) : (
                    t("billingPage.manualReviewNoDecision")
                  )}
                </td>
              )}
              {mode === "pending" ? (
                <td style={{ padding: 10, minWidth: 220 }}>
                  {row.reviewAnchorType === "PROCEDURE_DOCUMENTED" ? (
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4, maxWidth: 260 }}>
                      {t("billingPage.manualReviewProcedureRowHint")}
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        disabled={savingOrderItemId === row.orderItemId}
                        onClick={() => onApprove?.(row)}
                        style={{
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #99f6e4",
                          background: "#f0fdfa",
                          color: "#0f766e",
                          fontSize: 12,
                        }}
                      >
                        {t("billingPage.manualReviewApprove")}
                      </button>
                      <button
                        type="button"
                        disabled={savingOrderItemId === row.orderItemId}
                        onClick={() => onNeedsInfo?.(row)}
                        style={{
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #fde68a",
                          background: "#fffbeb",
                          color: "#92400e",
                          fontSize: 12,
                        }}
                      >
                        {t("billingPage.manualReviewNeedsInfo")}
                      </button>
                      <button
                        type="button"
                        disabled={savingOrderItemId === row.orderItemId}
                        onClick={() => onDoNotBill?.(row)}
                        style={{
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#991b1b",
                          fontSize: 12,
                        }}
                      >
                        {t("billingPage.manualReviewDoNotBill")}
                      </button>
                    </div>
                  )}
                </td>
              ) : (
                <td style={{ padding: 10, minWidth: 220 }}>
                  <ManualReviewAuditTrail row={row} locale={locale} t={t} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ManualBillingReviewWorkspace() {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<ManualReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingOrderItemId, setSavingOrderItemId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ManualReviewCategoryFilter>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [approvedSectionOpen, setApprovedSectionOpen] = useState(false);
  const [decisionDraft, setDecisionDraft] = useState<{
    row: ManualReviewRow;
    decision: Exclude<BillingReviewDecisionStatus, "APPROVED">;
    notes: string;
  } | null>(null);
  const locale = encounterBcp47(language);

  const loadRows = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/billing/manual-review", { facilityId });
      setRows(
        Array.isArray(res)
          ? (res as ManualReviewRow[]).map((r) => ({
              ...r,
              decisionAuditTrail: Array.isArray(r.decisionAuditTrail) ? r.decisionAuditTrail : [],
            }))
          : []
      );
    } catch {
      setRows([]);
      setError(t("billingPage.manualReviewLoadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, ready, t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const { pending, approved } = useMemo(() => partitionManualReviewRows(rows), [rows]);
  const filteredPending = useMemo(
    () => sortManualReviewRows(filterManualReviewByCategory(pending, categoryFilter)),
    [pending, categoryFilter]
  );
  const sortedApproved = useMemo(() => sortManualReviewRows(approved), [approved]);

  const saveDecision = useCallback(
    async (row: ManualReviewRow, decision: BillingReviewDecisionStatus, notes?: string) => {
      if (!facilityId) return;
      setSavingOrderItemId(row.orderItemId);
      setError(null);
      setSuccessMessage(null);
      try {
        await apiFetch(`/billing/manual-review/${row.orderItemId}/decision`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            notes: notes?.trim() || undefined,
          }),
        });
        setDecisionDraft(null);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(row.orderItemId);
          return next;
        });
        await loadRows();
      } catch {
        setError(t("billingPage.manualReviewDecisionSaveError"));
      } finally {
        setSavingOrderItemId(null);
      }
    },
    [facilityId, loadRows, t]
  );

  const bulkApproveSelected = useCallback(async () => {
    if (!facilityId || selectedIds.size === 0) return;
    setBulkSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = (await apiFetch("/billing/manual-review/bulk-decision", {
        facilityId,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: [...selectedIds],
          decision: "APPROVED",
        }),
      })) as ManualBillingReviewBulkDecisionResponse;
      setBulkConfirmOpen(false);
      setSelectedIds(new Set());
      setSuccessMessage(formatBulkSummary(t, response));
      await loadRows();
    } catch {
      setError(t("billingPage.manualReviewBulkError"));
    } finally {
      setBulkSaving(false);
    }
  }, [facilityId, loadRows, selectedIds, t]);

  const toggleRow = useCallback((orderItemId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(orderItemId)) next.delete(orderItemId);
      else next.add(orderItemId);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback((visibleIds: string[]) => {
    setSelectedIds((current) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id));
      if (allSelected) {
        const next = new Set(current);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(current);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, []);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 12px 40px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/billing" style={{ color: "#0f172a", fontWeight: 600 }}>
          {t("billingPage.manualReviewBack")}
        </Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28 }}>{t("billingPage.manualReviewTitle")}</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
          {t("billingPage.manualReviewSubtitle")}
        </p>
      </div>

      {loading || !ready ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          {error ? (
            <div
              style={{
                padding: 12,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          ) : null}
          {successMessage ? (
            <div
              style={{
                padding: 12,
                border: "1px solid #99f6e4",
                background: "#f0fdfa",
                color: "#0f766e",
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {successMessage}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div style={{ padding: 16, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8 }}>
              {t("billingPage.manualReviewEmpty")}
            </div>
          ) : (
            <>
              <section style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 18 }}>{t("billingPage.manualReviewPendingSection")}</h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {MANUAL_REVIEW_CATEGORY_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setCategoryFilter(filter)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 9999,
                          border: "1px solid",
                          borderColor: categoryFilter === filter ? "#0f766e" : "#cbd5e1",
                          background: categoryFilter === filter ? "#f0fdfa" : "#fff",
                          color: categoryFilter === filter ? "#0f766e" : "#334155",
                          fontSize: 12,
                          fontWeight: categoryFilter === filter ? 700 : 500,
                        }}
                      >
                        {t(manualReviewCategoryFilterI18nKey(filter))}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedIds.size > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {formatCountMessage(t, "billingPage.manualReviewSelectedCount", selectedIds.size)}
                    </span>
                    <button
                      type="button"
                      disabled={bulkSaving}
                      onClick={() => setBulkConfirmOpen(true)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: "#0f766e",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {t("billingPage.manualReviewApproveSelected")}
                    </button>
                  </div>
                ) : null}

                {filteredPending.length === 0 ? (
                  <div style={{ padding: 16, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8 }}>
                    {t("billingPage.manualReviewPendingEmpty")}
                  </div>
                ) : (
                  <ManualReviewRowTable
                    rows={filteredPending}
                    locale={locale}
                    t={t}
                    mode="pending"
                    selectedIds={selectedIds}
                    onToggleRow={toggleRow}
                    onToggleAllVisible={toggleAllVisible}
                    savingOrderItemId={savingOrderItemId}
                    onApprove={(row) => void saveDecision(row, "APPROVED")}
                    onNeedsInfo={(row) =>
                      setDecisionDraft({
                        row,
                        decision: "NEEDS_INFO",
                        notes: row.latestDecision?.notes ?? "",
                      })
                    }
                    onDoNotBill={(row) =>
                      setDecisionDraft({
                        row,
                        decision: "DO_NOT_BILL",
                        notes: row.latestDecision?.notes ?? "",
                      })
                    }
                  />
                )}
              </section>

              <section>
                <details
                  open={approvedSectionOpen}
                  onToggle={(event) => setApprovedSectionOpen((event.target as HTMLDetailsElement).open)}
                >
                  <summary style={{ cursor: "pointer", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                    {t("billingPage.manualReviewApprovedSection")} ({sortedApproved.length})
                  </summary>
                  {sortedApproved.length === 0 ? (
                    <div style={{ padding: 16, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8 }}>
                      {t("billingPage.manualReviewApprovedEmpty")}
                    </div>
                  ) : (
                    <ManualReviewRowTable rows={sortedApproved} locale={locale} t={t} mode="approved" />
                  )}
                </details>
              </section>
            </>
          )}
        </>
      )}

      {decisionDraft ? (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: 460,
              background: "#fff",
              borderRadius: 10,
              padding: 18,
              boxShadow: "0 20px 50px rgba(15,23,42,0.22)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {billingPageKey(t, `billingReviewDecision_${decisionDraft.decision}`)}
            </h2>
            <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 13 }}>{decisionDraft.row.displayName}</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
              {t("billingPage.manualReviewNotesRequired")}
              <textarea
                value={decisionDraft.notes}
                onChange={(event) => setDecisionDraft({ ...decisionDraft, notes: event.target.value })}
                rows={4}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setDecisionDraft(null)}
                disabled={savingOrderItemId === decisionDraft.row.orderItemId}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  savingOrderItemId === decisionDraft.row.orderItemId || !decisionDraft.notes.trim()
                }
                onClick={() =>
                  void saveDecision(decisionDraft.row, decisionDraft.decision, decisionDraft.notes)
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: decisionDraft.notes.trim() ? "#0f766e" : "#94a3b8",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {savingOrderItemId === decisionDraft.row.orderItemId
                  ? t("common.saving")
                  : t("billingPage.manualReviewSaveDecision")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: 520,
              background: "#fff",
              borderRadius: 10,
              padding: 18,
              boxShadow: "0 20px 50px rgba(15,23,42,0.22)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{t("billingPage.manualReviewBulkConfirmTitle")}</h2>
            <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
              {formatCountMessage(t, "billingPage.manualReviewBulkConfirmBody", selectedIds.size)}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(false)}
                disabled={bulkSaving}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={bulkSaving || selectedIds.size === 0}
                onClick={() => void bulkApproveSelected()}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {bulkSaving ? t("common.saving") : t("billingPage.manualReviewBulkConfirmApprove")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
