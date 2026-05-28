"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import {
  fetchClaimAssemblyPreviewQueue,
  type ClaimAssemblyPreviewQueueRow,
} from "@/lib/claimAssemblyPreviewApi";
import {
  claimAssemblyClassificationFilterOptions,
  claimAssemblyPackageTypeFilterOptions,
  claimAssemblyPackageTypeLabelKey,
  claimAssemblyReasonLabelKey,
  claimAssemblyStatusFilterOptions,
  claimAssemblyStatusLabelKey,
} from "@/lib/claimAssemblyPreviewDisplay";
import type {
  BillingClassification,
  ClaimAssemblyPackageType,
  ClaimAssemblyPreviewStatus,
} from "@medora/shared";

function defaultLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ClaimAssemblyPreviewPage() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<ClaimAssemblyPreviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClaimAssemblyPreviewStatus | "">("");
  const [packageTypeFilter, setPackageTypeFilter] = useState<ClaimAssemblyPackageType | "">("");
  const [classificationFilter, setClassificationFilter] = useState<BillingClassification | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(defaultLocalIsoDate());
  const [manualReviewOnly, setManualReviewOnly] = useState(false);
  const [professionalOnly, setProfessionalOnly] = useState(false);
  const [facilityOnly, setFacilityOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    try {
      const payload = await fetchClaimAssemblyPreviewQueue(facilityId, {
        status: statusFilter || undefined,
        packageType: packageTypeFilter || undefined,
        billingClassification: classificationFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        manualReviewOnly: manualReviewOnly || undefined,
        professionalOnly: professionalOnly || undefined,
        facilityOnly: facilityOnly || undefined,
        limit: 100,
      });
      setRows(payload.rows ?? []);
      setSelectedId((prev) => {
        if (prev && payload.rows?.some((r) => r.encounterId === prev)) return prev;
        return payload.rows?.[0]?.encounterId ?? null;
      });
    } catch (err) {
      console.error("claim assembly preview queue load failed", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    ready,
    facilityId,
    statusFilter,
    packageTypeFilter,
    classificationFilter,
    dateFrom,
    dateTo,
    manualReviewOnly,
    professionalOnly,
    facilityOnly,
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
        <h1>{t("claimAssemblyPreview.pageTitle")}</h1>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("claimAssemblyPreview.pageTitle")}</h1>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>{t("claimAssemblyPreview.pageSubtitle")}</p>
      <p
        data-testid="claim-assembly-page-disclaimer"
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
        {t("claimAssemblyPreview.previewOnlyDisclaimer")}
      </p>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/billing" style={{ fontSize: 14, color: "#2563eb" }}>
          ← {t("claimAssemblyPreview.backToBilling")}
        </Link>
      </div>

      <div
        data-testid="claim-assembly-filters"
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
          <span>{t("claimAssemblyPreview.filterStatus")}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClaimAssemblyPreviewStatus | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("claimAssemblyPreview.filterAll")}</option>
            {claimAssemblyStatusFilterOptions().map((s) => (
              <option key={s} value={s}>
                {t(claimAssemblyStatusLabelKey(s))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("claimAssemblyPreview.filterPackageType")}</span>
          <select
            value={packageTypeFilter}
            onChange={(e) => setPackageTypeFilter(e.target.value as ClaimAssemblyPackageType | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("claimAssemblyPreview.filterAll")}</option>
            {claimAssemblyPackageTypeFilterOptions().map((p) => (
              <option key={p} value={p}>
                {t(claimAssemblyPackageTypeLabelKey(p))}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("claimAssemblyPreview.filterClassification")}</span>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value as BillingClassification | "")}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            <option value="">{t("claimAssemblyPreview.filterAll")}</option>
            {claimAssemblyClassificationFilterOptions().map((c) => (
              <option key={c} value={c}>
                {tBillingClassification(t, c)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("claimAssemblyPreview.filterDateFrom")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("claimAssemblyPreview.filterDateTo")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={manualReviewOnly} onChange={(e) => setManualReviewOnly(e.target.checked)} />
          {t("claimAssemblyPreview.filterManualReviewOnly")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={professionalOnly} onChange={(e) => setProfessionalOnly(e.target.checked)} />
          {t("claimAssemblyPreview.filterProfessionalOnly")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={facilityOnly} onChange={(e) => setFacilityOnly(e.target.checked)} />
          {t("claimAssemblyPreview.filterFacilityOnly")}
        </label>
      </div>

      {loading ? <p>{t("claimAssemblyPreview.loading")}</p> : null}
      {!loading && rows.length === 0 ? (
        <p style={{ color: "#64748b" }}>{t("claimAssemblyPreview.emptyQueue")}</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <div data-testid="claim-assembly-queue">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colDate")}</th>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colClassification")}</th>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colPackageType")}</th>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colStatus")}</th>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colMissing")}</th>
                  <th style={{ padding: 8 }}>{t("claimAssemblyPreview.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.encounterId}
                    data-testid="claim-assembly-row"
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
                        data-testid="claim-assembly-classification-badge"
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
                    <td style={{ padding: 8 }}>{t(claimAssemblyPackageTypeLabelKey(row.packageType))}</td>
                    <td style={{ padding: 8 }}>{t(claimAssemblyStatusLabelKey(row.status))}</td>
                    <td style={{ padding: 8 }}>{row.missingItemsCount}</td>
                    <td style={{ padding: 8 }}>
                      <Link
                        href={`/app/billing/encounters/${row.encounterId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
                        {t("claimAssemblyPreview.openEncounterBilling")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              data-testid="claim-assembly-professional-panel"
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("claimAssemblyPreview.professionalPanelTitle")}</h2>
              {selectedRow ? (
                selectedRow.professionalPackage.applies ? (
                  <>
                    <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                      <strong>{t("claimAssemblyPreview.readinessLabel")}:</strong>{" "}
                      {selectedRow.professionalReady
                        ? t("claimAssemblyPreview.packageReady")
                        : t("claimAssemblyPreview.packageNotReady")}
                    </p>
                    {selectedRow.professionalPackage.reasons.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                        {selectedRow.professionalPackage.reasons.map((r) => (
                          <li key={r}>{t(claimAssemblyReasonLabelKey(r))}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: 12, color: "#64748b" }}>{t("claimAssemblyPreview.noMissingItems")}</p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: "#64748b" }}>{t("claimAssemblyPreview.packageNotApplicable")}</p>
                )
              ) : (
                <p style={{ fontSize: 13, color: "#64748b" }}>{t("claimAssemblyPreview.selectRowHint")}</p>
              )}
            </div>

            <div
              data-testid="claim-assembly-facility-panel"
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("claimAssemblyPreview.facilityPanelTitle")}</h2>
              {selectedRow ? (
                selectedRow.facilityPackage.applies ? (
                  <>
                    <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                      <strong>{t("claimAssemblyPreview.readinessLabel")}:</strong>{" "}
                      {selectedRow.facilityReady
                        ? t("claimAssemblyPreview.packageReady")
                        : t("claimAssemblyPreview.packageNotReady")}
                    </p>
                    {selectedRow.facilityPackage.reasons.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                        {selectedRow.facilityPackage.reasons.map((r) => (
                          <li key={r}>{t(claimAssemblyReasonLabelKey(r))}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: 12, color: "#64748b" }}>{t("claimAssemblyPreview.noMissingItems")}</p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: "#64748b" }}>{t("claimAssemblyPreview.packageNotApplicable")}</p>
                )
              ) : (
                <p style={{ fontSize: 13, color: "#64748b" }}>{t("claimAssemblyPreview.selectRowHint")}</p>
              )}
            </div>

            <div
              data-testid="claim-assembly-missing-panel"
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("claimAssemblyPreview.missingPanelTitle")}</h2>
              {selectedRow ? (
                <>
                  {selectedRow.requiresManualReview ? (
                    <p
                      data-testid="claim-assembly-manual-review-flag"
                      style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e", fontWeight: 600 }}
                    >
                      {t("claimAssemblyPreview.manualReviewFlag")}
                    </p>
                  ) : null}
                  {selectedRow.reasons.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {selectedRow.reasons.map((r) => (
                        <li key={r}>{t(claimAssemblyReasonLabelKey(r))}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 12, color: "#64748b" }}>{t("claimAssemblyPreview.noMissingItems")}</p>
                  )}
                  {selectedRow.warnings.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                        {t("claimAssemblyPreview.warnings")}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
                        {selectedRow.warnings.map((r) => (
                          <li key={r}>{t(claimAssemblyReasonLabelKey(r))}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#64748b" }}>{t("claimAssemblyPreview.selectRowHint")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
