"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";

type SummaryPayload = {
  encounter: {
    id: string;
    type: string;
    dischargedAt: string | null;
    patient: { firstName?: string; lastName?: string; mrn?: string | null };
  };
  events: Array<{
    id: string;
    sourceModule: string;
    reviewStatus: string;
    serviceDate: string | null;
    descriptionSnapshot: string | null;
  }>;
  summary: {
    totalEvents: number;
    needsReview: number;
    missingCode: number;
  };
};

export default function BillingEncounterLedgerPage() {
  const params = useParams();
  const encounterId = params.encounterId as string;
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = encounterBcp47(language);

  const load = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/billing/encounters/${encounterId}/summary`, {
        facilityId,
      })) as SummaryPayload;
      setData(res);
    } catch (e) {
      setData(null);
      setError(t("billingPage.billingSummaryLoadError"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, ready, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px 40px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/billing" style={{ color: "#0f172a", fontWeight: 600 }}>
          ← {t("billingPage.billingSummaryBack")}
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>{t("billingPage.billingSummaryTitle")}</h1>
      {data?.encounter?.patient ? (
        <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>
          {data.encounter.patient.firstName} {data.encounter.patient.lastName} · {data.encounter.patient.mrn ?? "—"}
        </p>
      ) : null}

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <div style={{ padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div style={{ marginBottom: 16, fontSize: 14, color: "#334155" }}>
            <strong>{t("billingPage.billingSummaryTotal")}:</strong> {data.summary.totalEvents} ·{" "}
            {t("billingPage.colNeedsReview")}: {data.summary.needsReview} · {t("billingPage.colMissingCode")}:{" "}
            {data.summary.missingCode}
          </div>
          {data.events.length === 0 ? (
            <p style={{ color: "#64748b" }}>{t("billingPage.billingSummaryEmpty")}</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableModule")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableStatus")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableServiceDate")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableDescription")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev) => (
                    <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{ev.sourceModule}</td>
                      <td style={{ padding: 10 }}>{ev.reviewStatus}</td>
                      <td style={{ padding: 10 }}>
                        {ev.serviceDate
                          ? new Date(ev.serviceDate).toLocaleString(locale)
                          : t("common.dash")}
                      </td>
                      <td style={{ padding: 10, color: "#334155", maxWidth: 420 }}>
                        {ev.descriptionSnapshot?.trim() ? ev.descriptionSnapshot : t("common.dash")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
