"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BillingAutoMappingCandidate } from "@medora/shared";
import {
  applyBillingAutoMappings,
  fetchBillingAutoMappingPreview,
  type BillingAutoMappingPreviewResult,
} from "@/lib/billingAutoMappingApi";

type BillingAutoMappingPanelProps = {
  facilityId: string;
  encounterId: string;
  t: (key: string) => string;
  onApplied?: () => void;
  onClose?: () => void;
};

function groupCandidates(candidates: BillingAutoMappingCandidate[]) {
  return {
    apply: candidates.filter((c) => c.decision === "APPLY"),
    review: candidates.filter((c) => c.decision === "REVIEW"),
    skip: candidates.filter((c) => c.decision === "SKIP"),
  };
}

function CandidateTable({
  rows,
  selectedIds,
  selectable,
  onToggle,
  t,
}: {
  rows: BillingAutoMappingCandidate[];
  selectedIds: Set<string>;
  selectable: boolean;
  onToggle: (id: string) => void;
  t: (key: string) => string;
}) {
  if (rows.length === 0) {
    return <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("billingPage.autoMappingEmptySection")}</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
            {selectable ? <th style={{ padding: 8 }} /> : null}
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColLine")}</th>
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColCurrent")}</th>
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColProposed")}</th>
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColConfidence")}</th>
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColReason")}</th>
            <th style={{ padding: 8 }}>{t("billingPage.autoMappingColWarnings")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ledgerLineId} style={{ borderTop: "1px solid #e2e8f0" }}>
              {selectable ? (
                <td style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.ledgerLineId)}
                    onChange={() => onToggle(row.ledgerLineId)}
                    aria-label={row.sourceLabel}
                  />
                </td>
              ) : null}
              <td style={{ padding: 8 }}>{row.sourceLabel}</td>
              <td style={{ padding: 8 }}>{row.currentCode || "—"}</td>
              <td style={{ padding: 8 }}>{row.proposedCode || "—"}</td>
              <td style={{ padding: 8 }}>{t(`billingPage.autoMappingConfidence_${row.confidence}`)}</td>
              <td style={{ padding: 8 }}>{row.reason}</td>
              <td style={{ padding: 8 }}>{row.warnings.join("; ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BillingAutoMappingPanel({
  facilityId,
  encounterId,
  t,
  onApplied,
  onClose,
}: BillingAutoMappingPanelProps) {
  const [preview, setPreview] = useState<BillingAutoMappingPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await fetchBillingAutoMappingPreview(facilityId, encounterId);
      setPreview(result);
      setSelectedIds(new Set(result.candidates.filter((c) => c.decision === "APPLY").map((c) => c.ledgerLineId)));
    } catch (e: unknown) {
      setPreview(null);
      setError(e instanceof Error ? e.message : t("billingPage.autoMappingLoadError"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () => groupCandidates(preview?.candidates ?? []),
    [preview?.candidates]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applySelected = async () => {
    if (selectedIds.size === 0) return;
    setApplying(true);
    setError(null);
    try {
      const result = await applyBillingAutoMappings(facilityId, encounterId, [...selectedIds]);
      setSummary(
        t("billingPage.autoMappingApplySummary")
          .replace("{applied}", String(result.appliedCount))
          .replace("{stale}", String(result.staleCount))
          .replace("{skipped}", String(result.skippedCount))
      );
      onApplied?.();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("billingPage.autoMappingApplyError"));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      data-testid="billing-auto-mapping-panel"
      style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{t("billingPage.autoMappingPanelTitle")}</h2>
        {onClose ? (
          <button type="button" onClick={onClose} style={{ fontSize: 12, padding: "4px 8px" }}>
            {t("common.close")}
          </button>
        ) : null}
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {t("billingPage.autoMappingPanelHelper")}
      </p>
      {loading ? <p style={{ fontSize: 13 }}>{t("common.loading")}</p> : null}
      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 13 }} role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <p style={{ color: "#047857", fontSize: 13 }} role="status">
          {summary}
        </p>
      ) : null}
      {!loading && preview ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#475569", marginBottom: 12 }}>
            <span>
              {t("billingPage.autoMappingApplyCount")}: {preview.applyCount}
            </span>
            <span>
              {t("billingPage.autoMappingReviewCount")}: {preview.reviewCount}
            </span>
            <span>
              {t("billingPage.autoMappingSkipCount")}: {preview.skipCount}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("billingPage.autoMappingSectionApply")}</h3>
            <CandidateTable
              rows={grouped.apply}
              selectedIds={selectedIds}
              selectable
              onToggle={toggleSelected}
              t={t}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("billingPage.autoMappingSectionReview")}</h3>
            <CandidateTable rows={grouped.review} selectedIds={selectedIds} selectable={false} onToggle={() => {}} t={t} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("billingPage.autoMappingSectionSkip")}</h3>
            <CandidateTable rows={grouped.skip} selectedIds={selectedIds} selectable={false} onToggle={() => {}} t={t} />
          </div>
          <button
            type="button"
            disabled={applying || selectedIds.size === 0}
            onClick={() => void applySelected()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #0f766e",
              background: applying ? "#ecfdf5" : "#fff",
              color: "#0f766e",
              fontWeight: 700,
              cursor: applying ? "wait" : "pointer",
            }}
          >
            {applying ? t("billingPage.autoMappingApplying") : t("billingPage.autoMappingApplySelected")}
          </button>
        </>
      ) : null}
    </div>
  );
}
