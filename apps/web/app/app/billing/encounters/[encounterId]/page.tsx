"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { billingLedgerRowHasUsableCode } from "@medora/shared";
import { normalizeUserFacingError } from "@/lib/userFacingError";

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

type ReadinessPayload = {
  isReady: boolean;
  blockers: { code: string; detail?: string }[];
  warnings: { code: string; detail?: string }[];
  counts: {
    totalBillingEvents: number;
    uncodedLines: number;
    ledgerLinesNeedingReview: number;
    diagnosisCount: number;
  };
};

type SummaryPayload = {
  encounter: {
    id: string;
    type: string;
    status?: string;
    dischargedAt: string | null;
    billingFinalizationStatus?: string;
    billingFinalizedAt?: string | null;
    billingReopenedAt?: string | null;
    patient: { firstName?: string; lastName?: string; mrn?: string | null };
  };
  readiness: ReadinessPayload;
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

function readinessLineLabel(
  t: (k: string) => string,
  prefix: "readinessBlocker" | "readinessWarning",
  code: string,
  detail?: string
): string {
  const k = `billingPage.${prefix}_${code}`;
  const v = t(k);
  const base = v === k ? code : v;
  return detail ? `${base} (${detail})` : base;
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const locale = encounterBcp47(language);
  const canMarkReviewed = roles.includes("BILLING") || roles.includes("ADMIN");
  const canFinalizeBilling = roles.includes("BILLING") || roles.includes("ADMIN");

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
    setActionError(null);
    try {
      await apiFetch(`/billing/events/${billingEventId}`, {
        facilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "REVIEWED" }),
      });
      setToast(t("billingPage.billingSummaryReviewedOk"));
      await load();
    } catch (e: unknown) {
      setToast(null);
      const raw = e instanceof Error && e.message ? e.message : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.billingSummaryMarkReviewedError")
      );
    } finally {
      setMarkingId(null);
    }
  };

  const finalizeEncounter = async () => {
    if (!facilityId) return;
    setActionBusy(true);
    setActionError(null);
    setToast(null);
    try {
      await apiFetch(`/billing/encounters/${encounterId}/finalize`, {
        facilityId,
        method: "POST",
      });
      setToast(t("billingPage.readinessFinalizedOk"));
      await load();
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.readinessActionError")
      );
    } finally {
      setActionBusy(false);
    }
  };

  const reopenEncounter = async () => {
    if (!facilityId) return;
    setActionBusy(true);
    setActionError(null);
    setToast(null);
    try {
      await apiFetch(`/billing/encounters/${encounterId}/reopen`, {
        facilityId,
        method: "POST",
      });
      setToast(t("billingPage.readinessReopenedOk"));
      await load();
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.readinessActionError")
      );
    } finally {
      setActionBusy(false);
    }
  };

  const wf = data?.encounter?.billingFinalizationStatus ?? "NOT_READY";
  const readiness = data?.readiness;
  const showFinalize =
    canFinalizeBilling &&
    wf !== "FINALIZED" &&
    readiness?.isReady === true &&
    (wf === "NOT_READY" || wf === "READY_FOR_REVIEW" || wf === "REOPENED");
  const showReopen = canFinalizeBilling && wf === "FINALIZED";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px 40px" }}>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Link href="/app/billing" style={{ color: "#0f172a", fontWeight: 600 }}>
          ← {t("billingPage.billingSummaryBack")}
        </Link>
        <span style={{ color: "#cbd5e1" }} aria-hidden>
          |
        </span>
        <Link href={`/app/encounters/${encounterId}`} style={{ color: "#475569", fontSize: 14 }}>
          {t("billingPage.billingSummaryOpenClinicalEncounter")}
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
      {actionError && (
        <div style={{ marginBottom: 12, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>
          {actionError}
        </div>
      )}

      {!loading && !error && data && readiness && (
        <>
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: readiness.isReady ? "#f0fdf4" : "#fffbeb",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("billingPage.readinessCardTitle")}</h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#334155" }}>
              <strong>{billingPageKey(t, `billingWorkflow_${wf}`)}</strong>
              {" · "}
              {readiness.isReady ? t("billingPage.readinessIsReady") : t("billingPage.readinessNotReady")}
            </p>
            {readiness.blockers.length > 0 ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("billingPage.readinessBlockers")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#92400e" }}>
                  {readiness.blockers.map((b) => (
                    <li key={b.code}>{readinessLineLabel(t, "readinessBlocker", b.code, b.detail)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {readiness.warnings.length > 0 ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("billingPage.readinessWarnings")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
                  {readiness.warnings.map((w) => (
                    <li key={w.code}>{readinessLineLabel(t, "readinessWarning", w.code, w.detail)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {showFinalize ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void finalizeEncounter()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0f766e",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: actionBusy ? "wait" : "pointer",
                  }}
                >
                  {t("billingPage.readinessFinalize")}
                </button>
              ) : null}
              {showReopen ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void reopenEncounter()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: actionBusy ? "wait" : "pointer",
                  }}
                >
                  {t("billingPage.readinessReopen")}
                </button>
              ) : null}
            </div>
          </div>

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
