"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { billingLedgerRowHasUsableCode } from "@medora/shared";

type LedgerEventRow = {
  id: string;
  sourceModule: string;
  reviewStatus: string;
  codeType: string | null;
  code: string | null;
  procedureCode: string | null;
  hcpcsCode: string | null;
  diagnosisCodes: string | null;
  serviceDate: string | null;
  descriptionSnapshot: string | null;
};

type SummaryPayload = {
  encounter: {
    id: string;
    type: string;
    dischargedAt: string | null;
    patient: { firstName?: string; lastName?: string; mrn?: string | null };
  };
  events: LedgerEventRow[];
  summary: {
    totalEvents: number;
    needsReview: number;
    missingCode: number;
  };
};

function billingPageKey(t: (k: string) => string, suffix: string): string {
  const k = `billingPage.${suffix}`;
  const v = t(k);
  return v === k ? suffix : v;
}

export default function BillingEncounterLedgerPage() {
  const params = useParams();
  const encounterId = params.encounterId as string;
  const { t, language } = useI18n();
  const { facilityId, ready, roles } = useFacilityAndRoles();
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const locale = encounterBcp47(language);
  const canMarkReviewed = roles.includes("BILLING") || roles.includes("ADMIN");

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

  const markReviewed = async (billingEventId: string) => {
    if (!facilityId) return;
    setMarkingId(billingEventId);
    setToast(null);
    try {
      await apiFetch(`/billing/events/${billingEventId}`, {
        facilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "REVIEWED" }),
      });
      setToast(t("billingPage.billingSummaryReviewedOk"));
      await load();
    } catch {
      setToast(null);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px 40px" }}>
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
      {toast && (
        <div style={{ marginBottom: 12, padding: 10, background: "#ecfdf5", color: "#047857", borderRadius: 8 }}>
          {toast}
        </div>
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
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableCodeType")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableCode")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableProcedure")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableHcpcs")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableDiagnosis")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableStatus")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableServiceDate")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableDescription")}</th>
                    {canMarkReviewed ? (
                      <th style={{ padding: 10, textAlign: "left" }} aria-label={t("billingPage.billingSummaryMarkReviewed")} />
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev) => {
                    const coded = billingLedgerRowHasUsableCode(ev);
                    const rowBg = coded ? undefined : "#fffbeb";
                    return (
                      <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9", background: rowBg }}>
                        <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                          {billingPageKey(t, `billingSourceModule_${ev.sourceModule}`)}
                        </td>
                        <td style={{ padding: 10, fontSize: 13 }}>
                          {billingPageKey(t, ev.codeType ? `billingCodeType_${ev.codeType}` : "billingCodeType_UNKNOWN")}
                        </td>
                        <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                          {ev.code?.trim() ? ev.code : t("common.dash")}
                          {!coded ? (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#b45309",
                                fontFamily: "inherit",
                              }}
                            >
                              {t("billingPage.billingSummaryUncodedBadge")}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                          {ev.procedureCode?.trim() ? ev.procedureCode : t("common.dash")}
                        </td>
                        <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                          {ev.hcpcsCode?.trim() ? ev.hcpcsCode : t("common.dash")}
                        </td>
                        <td style={{ padding: 10, fontSize: 12, maxWidth: 160, wordBreak: "break-word" }}>
                          {ev.diagnosisCodes?.trim() ? ev.diagnosisCodes : t("common.dash")}
                        </td>
                        <td style={{ padding: 10 }}>
                          {billingPageKey(t, `billingReviewStatus_${ev.reviewStatus}`)}
                        </td>
                        <td style={{ padding: 10 }}>
                          {ev.serviceDate ? new Date(ev.serviceDate).toLocaleString(locale) : t("common.dash")}
                        </td>
                        <td style={{ padding: 10, color: "#334155", maxWidth: 280 }}>
                          {ev.descriptionSnapshot?.trim() ? ev.descriptionSnapshot : t("common.dash")}
                        </td>
                        {canMarkReviewed ? (
                          <td style={{ padding: 10 }}>
                            {ev.reviewStatus === "CAPTURED" && coded ? (
                              <button
                                type="button"
                                disabled={markingId === ev.id}
                                onClick={() => void markReviewed(ev.id)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  cursor: markingId === ev.id ? "wait" : "pointer",
                                }}
                              >
                                {t("billingPage.billingSummaryMarkReviewed")}
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
