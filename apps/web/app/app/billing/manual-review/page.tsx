"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

type BillingReadinessStatus = "candidate_only" | "pending_license" | "missing";
type BillingReviewCategory = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

type ManualReviewRow = {
  encounterId: string;
  patientId: string;
  patientName: string;
  orderItemId: string;
  medoraCode: string;
  category: BillingReviewCategory;
  displayName: string;
  billingStatus: BillingReadinessStatus;
  reason: string;
  createdAt: string;
};

const billingStatusOrder: BillingReadinessStatus[] = ["candidate_only", "pending_license", "missing"];
const categoryOrder: BillingReviewCategory[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

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
  };
  const key = knownReasonKeyByText[normalized];
  return key ? t(`billingPage.${key}`) : normalized;
}

export default function ManualBillingReviewPage() {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<ManualReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = encounterBcp47(language);

  const loadRows = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/billing/manual-review", { facilityId });
      setRows(Array.isArray(res) ? (res as ManualReviewRow[]) : []);
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

  const groupedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const statusDiff = billingStatusOrder.indexOf(a.billingStatus) - billingStatusOrder.indexOf(b.billingStatus);
      if (statusDiff !== 0) return statusDiff;
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted.reduce<Array<{ key: string; status: BillingReadinessStatus; category: BillingReviewCategory; rows: ManualReviewRow[] }>>(
      (groups, row) => {
        const key = `${row.billingStatus}:${row.category}`;
        const current = groups[groups.length - 1];
        if (current?.key === key) {
          current.rows.push(row);
        } else {
          groups.push({ key, status: row.billingStatus, category: row.category, rows: [row] });
        }
        return groups;
      },
      []
    );
  }, [rows]);

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
      ) : error ? (
        <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8 }}>
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8 }}>
          {t("billingPage.manualReviewEmpty")}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <th style={{ padding: 10, textAlign: "left" }}>{t("common.patient")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableOrder")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCode")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableStatus")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCategory")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableReason")}</th>
                <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.manualReviewTableCreatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <React.Fragment key={group.key}>
                  <tr>
                    <td colSpan={7} style={{ padding: "8px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <strong>{billingPageKey(t, `billingReadiness_${group.status}`)}</strong>
                      <span style={{ color: "#64748b" }}> · {billingPageKey(t, `billingCategory_${group.category}`)}</span>
                      <span style={{ color: "#64748b" }}> · {group.rows.length}</span>
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.orderItemId} style={{ borderBottom: "1px solid #f1f5f9" }}>
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
                      <td style={{ padding: 10, color: "#334155", maxWidth: 360 }}>
                        {autoBillDecisionReasonText(t, row.reason)}
                      </td>
                      <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString(locale) : t("common.dash")}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
