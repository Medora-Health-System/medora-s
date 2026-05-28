"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { fetchCodingReviewQueue, type CodingReviewQueueRow } from "@/lib/codingIntegrityReviewApi";
import {
  codingIntegrityClassificationFilterOptions,
  codingIntegrityDomainFilterOptions,
  codingIntegrityDomainLabelKey,
  codingIntegrityReasonLabelKey,
  codingIntegrityStatusFilterOptions,
  codingIntegrityStatusLabelKey,
} from "@/lib/codingIntegrityReviewDisplay";
import type { BillingClassification, CodingIntegrityDomain, CodingIntegrityStatus } from "@medora/shared";

function defaultLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CodingReviewPage() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<CodingReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CodingIntegrityStatus | "">("");
  const [domainFilter, setDomainFilter] = useState<CodingIntegrityDomain | "">("");
  const [classificationFilter, setClassificationFilter] = useState<BillingClassification | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(defaultLocalIsoDate());
  const [observationOnly, setObservationOnly] = useState(false);
  const [providerClarificationOnly, setProviderClarificationOnly] = useState(false);
  const [complianceOnly, setComplianceOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    try {
      const payload = await fetchCodingReviewQueue(facilityId, {
        status: statusFilter || undefined,
        domain: domainFilter || undefined,
        billingClassification: classificationFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        observationOnly: observationOnly || undefined,
        providerClarificationOnly: providerClarificationOnly || undefined,
        complianceOnly: complianceOnly || undefined,
        limit: 100,
      });
      setRows(payload.rows ?? []);
      setSelectedId((prev) => {
        if (prev && payload.rows?.some((r) => r.encounterId === prev)) return prev;
        return payload.rows?.[0]?.encounterId ?? null;
      });
    } catch (err) {
      console.error("coding review queue load failed", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    ready,
    facilityId,
    statusFilter,
    domainFilter,
    classificationFilter,
    dateFrom,
    dateTo,
    observationOnly,
    providerClarificationOnly,
    complianceOnly,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.encounterId === selectedId) ?? null,
    [rows, selectedId],
  );

  if (!ready) {
    return (
      <div>
        <h1>{t("codingIntegrityReview.pageTitle")}</h1>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("codingIntegrityReview.pageTitle")}</h1>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>{t("codingIntegrityReview.pageSubtitle")}</p>
      <p
        data-testid="coding-review-page-disclaimer"
        style={{
          margin: "0 0 16px",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          color: "#475569",
          maxWidth: 720,
        }}
      >
        {t("codingIntegrityReview.previewOnlyDisclaimer")}
      </p>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/billing" style={{ fontSize: 14, color: "#2563eb" }}>
          ← {t("codingIntegrityReview.backToBilling")}
        </Link>
      </div>

      <div
        data-testid="coding-review-filters"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("codingIntegrityReview.filterStatus")}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CodingIntegrityStatus | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("codingIntegrityReview.filterAll")}</option>
            {codingIntegrityStatusFilterOptions().map((s) => (
              <option key={s} value={s}>
                {t(codingIntegrityStatusLabelKey(s))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("codingIntegrityReview.filterDomain")}</span>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value as CodingIntegrityDomain | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("codingIntegrityReview.filterAll")}</option>
            {codingIntegrityDomainFilterOptions().map((d) => (
              <option key={d} value={d}>
                {t(codingIntegrityDomainLabelKey(d))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("codingIntegrityReview.filterClassification")}</span>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value as BillingClassification | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("codingIntegrityReview.filterAll")}</option>
            {codingIntegrityClassificationFilterOptions().map((c) => (
              <option key={c} value={c}>
                {tBillingClassification(t, c)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("codingIntegrityReview.filterDateFrom")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("codingIntegrityReview.filterDateTo")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={observationOnly} onChange={(e) => setObservationOnly(e.target.checked)} />
          {t("codingIntegrityReview.filterObservationOnly")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input
            type="checkbox"
            checked={providerClarificationOnly}
            onChange={(e) => setProviderClarificationOnly(e.target.checked)}
          />
          {t("codingIntegrityReview.filterProviderClarificationOnly")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={complianceOnly} onChange={(e) => setComplianceOnly(e.target.checked)} />
          {t("codingIntegrityReview.filterComplianceOnly")}
        </label>
      </div>

      {loading ? <p>{t("codingIntegrityReview.loading")}</p> : null}
      {!loading && rows.length === 0 ? <p style={{ color: "#64748b" }}>{t("codingIntegrityReview.emptyQueue")}</p> : null}

      {!loading && rows.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <div data-testid="coding-review-queue">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>{t("codingIntegrityReview.colDate")}</th>
                  <th style={{ padding: 8 }}>{t("codingIntegrityReview.colClassification")}</th>
                  <th style={{ padding: 8 }}>{t("codingIntegrityReview.colStatus")}</th>
                  <th style={{ padding: 8 }}>{t("codingIntegrityReview.colMissing")}</th>
                  <th style={{ padding: 8 }}>{t("codingIntegrityReview.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.encounterId}
                    data-testid="coding-review-row"
                    onClick={() => setSelectedId(row.encounterId)}
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      cursor: "pointer",
                      background: selectedId === row.encounterId ? "#eff6ff" : undefined,
                    }}
                  >
                    <td style={{ padding: 8 }}>{new Date(row.encounterDate).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>
                      <span
                        data-testid="coding-review-classification-badge"
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          background: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {tBillingClassification(t, row.billingClassification)}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>{t(codingIntegrityStatusLabelKey(row.codingIntegrityStatus))}</td>
                    <td style={{ padding: 8 }}>{row.missingItemsCount}</td>
                    <td style={{ padding: 8 }}>
                      <Link
                        href={`/app/billing/encounters/${row.encounterId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
                        {t("codingIntegrityReview.openEncounterBilling")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            data-testid="coding-review-summary-panel"
            style={{
              padding: 14,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              alignSelf: "start",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("codingIntegrityReview.summaryTitle")}</h2>
            {selectedRow ? (
              <>
                <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                  <strong>{t("codingIntegrityReview.statusLabel")}:</strong>{" "}
                  {t(codingIntegrityStatusLabelKey(selectedRow.codingIntegrityStatus))}
                </p>
                {selectedRow.requiresProviderClarification ? (
                  <p
                    data-testid="coding-review-summary-provider-clarification"
                    style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e", fontWeight: 600 }}
                  >
                    {t("codingIntegrityReview.providerClarificationFlag")}
                  </p>
                ) : null}
                {selectedRow.requiresObservationReview ? (
                  <p
                    data-testid="coding-review-summary-observation"
                    style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e", fontWeight: 600 }}
                  >
                    {t("codingIntegrityReview.observationReviewFlag")}
                  </p>
                ) : null}
                {selectedRow.reasons.length > 0 ? (
                  <div data-testid="coding-review-summary-missing">
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                      {t("codingIntegrityReview.missingItems")}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {selectedRow.reasons.map((r) => (
                        <li key={r}>{t(codingIntegrityReasonLabelKey(r))}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#64748b" }}>{t("codingIntegrityReview.noMissingItems")}</p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#64748b" }}>{t("codingIntegrityReview.selectRowHint")}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
