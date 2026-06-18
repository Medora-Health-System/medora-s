"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import {
  fetchChargeReviewQueue,
  fetchEncounterChargeReview,
  type ChargeReviewQueueRow,
  type EncounterChargeReviewPayload,
} from "@/lib/chargeCaptureReviewApi";
import { ProcedureBillableEventsCard } from "@/components/billing/ProcedureBillableEventsCard";
import { ProcedureRevenueReviewPanel } from "@/components/billing/ProcedureRevenueReviewPanel";
import {
  chargeReviewClassificationFilterOptions,
  chargeReviewDomainFilterOptions,
  chargeReviewDomainLabelKey,
  chargeReviewReasonLabelKey,
  chargeReviewStatusFilterOptions,
  chargeReviewStatusLabelKey,
} from "@/lib/chargeCaptureReviewDisplay";
import type { BillingClassification, ChargeReviewDomain, ChargeReviewStatus } from "@medora/shared";

function defaultLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ChargeReviewPage() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<ChargeReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ChargeReviewStatus | "">("");
  const [domainFilter, setDomainFilter] = useState<ChargeReviewDomain | "">("");
  const [classificationFilter, setClassificationFilter] = useState<BillingClassification | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(defaultLocalIsoDate());
  const [encounterOpenFilter, setEncounterOpenFilter] = useState<"" | "open" | "closed">("");
  const [manualReviewOnly, setManualReviewOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<EncounterChargeReviewPayload | null>(null);

  const load = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    try {
      const payload = await fetchChargeReviewQueue(facilityId, {
        status: statusFilter || undefined,
        domain: domainFilter || undefined,
        billingClassification: classificationFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        encounterOpen:
          encounterOpenFilter === "open" ? true : encounterOpenFilter === "closed" ? false : undefined,
        manualReviewOnly: manualReviewOnly || undefined,
        limit: 100,
      });
      setRows(payload.rows ?? []);
      setSelectedId((prev) => {
        if (prev && payload.rows?.some((r) => r.encounterId === prev)) return prev;
        return payload.rows?.[0]?.encounterId ?? null;
      });
    } catch (err) {
      console.error("charge review queue load failed", err);
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
    encounterOpenFilter,
    manualReviewOnly,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ready || !facilityId || !selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void fetchEncounterChargeReview(facilityId, selectedId)
      .then((payload) => {
        if (!cancelled) setSelectedDetail(payload);
      })
      .catch((err) => {
        console.error("charge review encounter detail failed", err);
        if (!cancelled) setSelectedDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, facilityId, selectedId]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.encounterId === selectedId) ?? null,
    [rows, selectedId],
  );

  if (!ready) {
    return (
      <div>
        <h1>{t("chargeCaptureReview.pageTitle")}</h1>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("chargeCaptureReview.pageTitle")}</h1>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>{t("chargeCaptureReview.pageSubtitle")}</p>
      <p
        data-testid="charge-review-page-disclaimer"
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
        {t("chargeCaptureReview.previewOnlyDisclaimer")}
      </p>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/billing" style={{ fontSize: 14, color: "#2563eb" }}>
          ← {t("chargeCaptureReview.backToBilling")}
        </Link>
      </div>

      <div
        data-testid="charge-review-filters"
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
          <span>{t("chargeCaptureReview.filterStatus")}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ChargeReviewStatus | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("chargeCaptureReview.filterAll")}</option>
            {chargeReviewStatusFilterOptions().map((s) => (
              <option key={s} value={s}>
                {t(chargeReviewStatusLabelKey(s))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("chargeCaptureReview.filterDomain")}</span>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value as ChargeReviewDomain | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("chargeCaptureReview.filterAll")}</option>
            {chargeReviewDomainFilterOptions().map((d) => (
              <option key={d} value={d}>
                {t(chargeReviewDomainLabelKey(d))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("chargeCaptureReview.filterClassification")}</span>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value as BillingClassification | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("chargeCaptureReview.filterAll")}</option>
            {chargeReviewClassificationFilterOptions().map((c) => (
              <option key={c} value={c}>
                {tBillingClassification(t, c)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("chargeCaptureReview.filterDateFrom")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("chargeCaptureReview.filterDateTo")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("chargeCaptureReview.filterEncounter")}</span>
          <select
            value={encounterOpenFilter}
            onChange={(e) => setEncounterOpenFilter(e.target.value as "" | "open" | "closed")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("chargeCaptureReview.filterAll")}</option>
            <option value="open">{t("chargeCaptureReview.filterOpen")}</option>
            <option value="closed">{t("chargeCaptureReview.filterClosed")}</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input
            type="checkbox"
            checked={manualReviewOnly}
            onChange={(e) => setManualReviewOnly(e.target.checked)}
          />
          {t("chargeCaptureReview.filterManualReviewOnly")}
        </label>
      </div>

      {loading ? <p>{t("chargeCaptureReview.loading")}</p> : null}

      {!loading && rows.length === 0 ? (
        <p style={{ color: "#64748b" }}>{t("chargeCaptureReview.emptyQueue")}</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <div data-testid="charge-review-queue">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colDate")}</th>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colPatient")}</th>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colClassification")}</th>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colStatus")}</th>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colMissing")}</th>
                  <th style={{ padding: 8 }}>{t("chargeCaptureReview.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.encounterId}
                    data-testid="charge-review-row"
                    onClick={() => setSelectedId(row.encounterId)}
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      cursor: "pointer",
                      background: selectedId === row.encounterId ? "#eff6ff" : undefined,
                    }}
                  >
                    <td style={{ padding: 8 }}>{new Date(row.encounterDate).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>{row.patientDisplaySafeLabel}</td>
                    <td style={{ padding: 8 }}>
                      <span
                        data-testid="charge-review-classification-badge"
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
                    <td style={{ padding: 8 }}>{t(chargeReviewStatusLabelKey(row.chargeReviewStatus))}</td>
                    <td style={{ padding: 8 }}>{row.missingItemsCount}</td>
                    <td style={{ padding: 8 }}>
                      <Link
                        href={`/app/billing/encounters/${row.encounterId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
                        {t("chargeCaptureReview.openEncounterBilling")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            data-testid="charge-review-summary-panel"
            style={{
              padding: 14,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              alignSelf: "start",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("chargeCaptureReview.summaryTitle")}</h2>
            {selectedRow ? (
              <>
                <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                  <strong>{t("chargeCaptureReview.statusLabel")}:</strong>{" "}
                  {t(chargeReviewStatusLabelKey(selectedRow.chargeReviewStatus))}
                </p>
                <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                  <strong>{t("chargeCaptureReview.domainsLabel")}:</strong>{" "}
                  {selectedRow.domains.map((d) => t(chargeReviewDomainLabelKey(d))).join(" · ")}
                </p>
                {selectedRow.manualReviewRequired ? (
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                    {t("chargeCaptureReview.manualReviewFlag")}
                  </p>
                ) : null}
                {selectedRow.reasons.includes("PROCEDURE_CODE_REVIEW") ? (
                  <p style={{ margin: "8px 0 0", fontSize: 12 }}>
                    <Link
                      href={`/app/billing/encounters/${selectedRow.encounterId}?autoMapping=1`}
                      style={{ color: "#2563eb", fontWeight: 600 }}
                    >
                      {t("billingPage.autoMappingFindMappingLink")}
                    </Link>
                  </p>
                ) : null}
                {selectedRow.reasons.length > 0 ? (
                  <div data-testid="charge-review-summary-missing">
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                      {t("chargeCaptureReview.missingItems")}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {selectedRow.reasons.map((r) => (
                        <li key={r}>{t(chargeReviewReasonLabelKey(r))}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#64748b" }}>{t("chargeCaptureReview.noMissingItems")}</p>
                )}
                {selectedDetail?.procedureBillableEvents?.length ? (
                  <ProcedureBillableEventsCard events={selectedDetail.procedureBillableEvents} compact />
                ) : null}
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#64748b" }}>{t("chargeCaptureReview.selectRowHint")}</p>
            )}
          </div>
        </div>
      ) : null}

      {facilityId ? <ProcedureRevenueReviewPanel facilityId={facilityId} /> : null}
    </div>
  );
}
