"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchEnterpriseOrderSetAnalytics } from "@/lib/orderSetAnalyticsApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import type { EnterpriseOrderSetUsageRow } from "@medora/shared";

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  return { from: isoDay(from), to: isoDay(to) };
}

function countEntries(record: Record<string, number>): Array<[string, number]> {
  return Object.entries(record).sort((a, b) => b[1] - a[1]);
}

export default function OrderSetAnalyticsPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const canView = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [range, setRange] = useState(defaultDateRange);
  const [orderSetCode, setOrderSetCode] = useState("");
  const [category, setCategory] = useState("");
  const [clinicalDomain, setClinicalDomain] = useState("");
  const [rows, setRows] = useState<EnterpriseOrderSetUsageRow[]>([]);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof fetchEnterpriseOrderSetAnalytics>
  >["summary"] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (cursor: string | undefined, append: boolean) => {
      if (!facilityId) {
        setError(t("orderSetAnalytics.errorFacility"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchEnterpriseOrderSetAnalytics(facilityId, {
          from: range.from,
          to: range.to,
          ...(orderSetCode.trim() ? { orderSetCode: orderSetCode.trim() } : {}),
          ...(category.trim() ? { category: category.trim() } : {}),
          ...(clinicalDomain.trim() ? { clinicalDomain: clinicalDomain.trim() } : {}),
          limit: 50,
          ...(cursor ? { cursor } : {}),
        });
        setSummary(res.summary);
        setRows((prev) => (append ? [...prev, ...res.rows] : res.rows));
        setNextCursor(res.nextCursor);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("orderSetAnalytics.errorLoad"));
        if (!append) {
          setRows([]);
          setSummary(null);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [category, clinicalDomain, facilityId, language, orderSetCode, range.from, range.to, t]
  );

  useEffect(() => {
    if (!ready || !canView || !facilityId) return;
    void loadPage(undefined, false);
  }, [ready, canView, facilityId, loadPage]);

  const byOrderSet = useMemo(
    () => (summary ? countEntries(summary.byOrderSetCode) : []),
    [summary]
  );
  const byCategory = useMemo(
    () => (summary ? countEntries(summary.byCategory) : []),
    [summary]
  );

  if (!ready) return null;

  if (!canView) {
    return (
      <div style={{ padding: 24 }} data-testid="order-set-analytics-page">
        <p>{t("orderSetAnalytics.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }} data-testid="order-set-analytics-page">
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/app/admin">{t("orderSetAnalytics.backAdmin")}</Link>
      </p>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>{t("orderSetAnalytics.pageTitle")}</h1>
      <p style={{ margin: "0 0 16px", color: "#455a64" }}>{t("orderSetAnalytics.pageSubtitle")}</p>
      <p
        style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}
        data-testid="order-set-analytics-disclaimer"
      >
        {t("orderSetAnalytics.analyticsOnlyDisclaimer")}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {t("orderSetAnalytics.fromLabel")}
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {t("orderSetAnalytics.toLabel")}
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {t("orderSetAnalytics.orderSetCodeLabel")}
          <input
            type="search"
            value={orderSetCode}
            onChange={(e) => setOrderSetCode(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {t("orderSetAnalytics.categoryLabel")}
          <input
            type="search"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ minWidth: 120 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {t("orderSetAnalytics.clinicalDomainLabel")}
          <input
            type="search"
            value={clinicalDomain}
            onChange={(e) => setClinicalDomain(e.target.value)}
            style={{ minWidth: 140 }}
          />
        </label>
        <button
          type="button"
          onClick={() => void loadPage(undefined, false)}
          disabled={loading}
          style={{ padding: "8px 14px", fontWeight: 600 }}
        >
          {loading ? t("orderSetAnalytics.loading") : t("orderSetAnalytics.applyFilters")}
        </button>
      </div>

      {error ? (
        <p style={{ color: "#b71c1c", marginBottom: 12 }} role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
            data-testid="order-set-analytics-summary"
          >
            {[
              [t("orderSetAnalytics.summaryApplications"), summary.totalApplications],
              [t("orderSetAnalytics.summaryOrders"), summary.totalProvenanceOrders],
              [t("orderSetAnalytics.summaryPlacedItems"), summary.totalPlacedItems],
              [t("orderSetAnalytics.summarySkippedItems"), summary.totalSkippedItems],
              [
                t("orderSetAnalytics.summaryStructuredSkipped"),
                summary.totalStructuredParameterSkipped,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
          {summary.summaryIsPartial ? (
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              {t("orderSetAnalytics.summaryPartialNote").replace(
                "{count}",
                String(summary.summaryScanCount)
              )}
            </p>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <section>
              <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>{t("orderSetAnalytics.sectionByOrderSet")}</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {byOrderSet.map(([code, count]) => (
                  <li key={code}>
                    {code}: {count}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>{t("orderSetAnalytics.sectionByCategory")}</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {byCategory.map(([code, count]) => (
                  <li key={code}>
                    {code}: {count}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}

      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>{t("orderSetAnalytics.sectionRecent")}</h2>
      {rows.length === 0 && !loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("orderSetAnalytics.emptyRows")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colAppliedAt")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colOrderSet")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colEncounter")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colOrderType")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colSelected")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colPlaced")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colSkipped")}</th>
                <th style={{ padding: "6px 8px" }}>{t("orderSetAnalytics.colStructuredSkipped")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.auditLogId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 8px" }}>{row.appliedAt ?? row.createdAt}</td>
                  <td style={{ padding: "6px 8px" }}>{row.orderSetCode}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11 }}>
                    {row.encounterId ?? "—"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{row.orderType ?? "—"}</td>
                  <td style={{ padding: "6px 8px" }}>{row.selectedItemCount}</td>
                  <td style={{ padding: "6px 8px" }}>{row.placedItemKeys.length}</td>
                  <td style={{ padding: "6px 8px" }}>{row.skippedItemCount}</td>
                  <td style={{ padding: "6px 8px" }}>{row.structuredParameterSkippedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <button
          type="button"
          style={{ marginTop: 12, padding: "8px 14px" }}
          disabled={loading}
          onClick={() => void loadPage(nextCursor, true)}
        >
          {loading ? t("orderSetAnalytics.loading") : t("orderSetAnalytics.loadMore")}
        </button>
      ) : null}
    </div>
  );
}
