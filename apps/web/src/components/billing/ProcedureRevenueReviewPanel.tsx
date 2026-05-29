"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  ProcedureRevenueReviewDecisionAction,
  ProcedureRevenueReviewQueueRow,
  ProcedureRevenueReviewReasonCode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  fetchProcedureRevenueReviewQueue,
  postProcedureRevenueReviewDecision,
} from "@/lib/procedureRevenueReviewApi";
import { procedureRevenueReviewReasonLabelKey } from "@/lib/procedureRevenueReviewUi";

const DISCLAIMER_STYLE: React.CSSProperties = {
  margin: "0 0 12px",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 12,
  color: "#475569",
  lineHeight: 1.45,
};

export function ProcedureRevenueReviewPanel({ facilityId }: { facilityId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ProcedureRevenueReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [docMissingOnly, setDocMissingOnly] = useState(false);
  const [activeRow, setActiveRow] = useState<ProcedureRevenueReviewQueueRow | null>(null);
  const [decision, setDecision] = useState<ProcedureRevenueReviewDecisionAction>("HOLD_FOR_DOCUMENTATION");
  const [reasonCode, setReasonCode] = useState<ProcedureRevenueReviewReasonCode>("DOCUMENTATION_MISSING");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchProcedureRevenueReviewQueue(facilityId, {
        documentationMissing: docMissingOnly ? true : undefined,
        limit: 50,
      });
      setRows(payload.rows ?? []);
    } catch (err) {
      console.error("procedure revenue review load failed", err);
      setRows([]);
      setError(t("procedureRevenueReview.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, docMissingOnly, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDecision = (row: ProcedureRevenueReviewQueueRow, action: ProcedureRevenueReviewDecisionAction) => {
    setActiveRow(row);
    setDecision(action);
    if (action === "HOLD_FOR_DOCUMENTATION") setReasonCode("DOCUMENTATION_MISSING");
    else if (action === "HOLD_FOR_CHARGE_MASTER") setReasonCode("CHARGE_MASTER_MISSING");
    else if (action === "HOLD_FOR_CODER_REVIEW") setReasonCode("CODER_REVIEW_REQUIRED");
    else if (action === "REJECT_NOT_BILLABLE") setReasonCode("NOT_BILLABLE_PER_POLICY");
    else setReasonCode("OTHER_REVIEW_REQUIRED");
    setNote("");
  };

  const submitDecision = async () => {
    if (!activeRow || !facilityId) return;
    setSubmitting(true);
    setError(null);
    try {
      await postProcedureRevenueReviewDecision(facilityId, activeRow.billingEventId, {
        decision,
        reasonCode,
        note: note.trim() || undefined,
      });
      setActiveRow(null);
      await load();
    } catch (err) {
      console.error("procedure revenue review decision failed", err);
      setError(t("procedureRevenueReview.decisionError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-testid="procedure-revenue-review-panel" style={{ marginTop: 24 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>{t("procedureRevenueReview.sectionTitle")}</h2>
      <p data-testid="procedure-revenue-review-disclaimer" style={DISCLAIMER_STYLE}>
        {t("procedureRevenueReview.previewDisclaimer")}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={docMissingOnly}
          onChange={(e) => setDocMissingOnly(e.target.checked)}
        />
        {t("procedureRevenueReview.filterDocumentationMissing")}
      </label>
      {loading ? <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p> : null}
      {error ? <p style={{ fontSize: 13, color: "#b91c1c" }}>{error}</p> : null}
      {!loading && rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("procedureRevenueReview.emptyQueue")}</p>
      ) : null}
      <div data-testid="procedure-revenue-review-queue">
        {rows.map((row) => (
          <div
            key={row.billingEventId}
            data-testid="procedure-revenue-review-row"
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{row.displayNameFr}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              {t("procedureRevenueReview.reviewStatus")}:{" "}
              {t(`procedureRevenueReview.status.${row.revenueReviewStatus}`)}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {t("procedureRevenueReview.billingSide")}:{" "}
              {t(`procedureRevenueReview.side.${row.procedureBillingSideReview}`)}
            </div>
            {!row.documentationLinked ? (
              <div
                data-testid="procedure-revenue-review-doc-missing"
                style={{ fontSize: 12, color: "#9a3412", marginTop: 4, fontWeight: 600 }}
              >
                {t("procedureRevenueReview.documentationMissingWarning")}
              </div>
            ) : null}
            {!row.facilityChargeMasterLinked ? (
              <div
                data-testid="procedure-revenue-review-charge-master-missing"
                style={{ fontSize: 12, color: "#1e40af", marginTop: 4, fontWeight: 600 }}
              >
                {t("procedureRevenueReview.chargeMasterMissingWarning")}
              </div>
            ) : null}
            {row.reviewWarnings.length > 0 ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
                {row.reviewWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              <button type="button" style={actionBtnStyle} onClick={() => openDecision(row, "APPROVE_FOR_EXPORT_REVIEW")}>
                {t("procedureRevenueReview.actionApprove")}
              </button>
              <button type="button" style={actionBtnStyle} onClick={() => openDecision(row, "HOLD_FOR_DOCUMENTATION")}>
                {t("procedureRevenueReview.actionHoldDocumentation")}
              </button>
              <button type="button" style={actionBtnStyle} onClick={() => openDecision(row, "HOLD_FOR_CODER_REVIEW")}>
                {t("procedureRevenueReview.actionHoldCoder")}
              </button>
              <button type="button" style={actionBtnStyle} onClick={() => openDecision(row, "HOLD_FOR_CHARGE_MASTER")}>
                {t("procedureRevenueReview.actionHoldChargeMaster")}
              </button>
              <button type="button" style={actionBtnStyleDanger} onClick={() => openDecision(row, "REJECT_NOT_BILLABLE")}>
                {t("procedureRevenueReview.actionReject")}
              </button>
            </div>
          </div>
        ))}
      </div>
      {activeRow ? (
        <div
          data-testid="procedure-revenue-review-decision-form"
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            {t("procedureRevenueReview.decisionFormTitle")} — {activeRow.displayNameFr}
          </h3>
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px" }}>
            {t("procedureRevenueReview.notePhiWarning")}
          </p>
          <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
            {t("procedureRevenueReview.reasonCodeLabel")}
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as ProcedureRevenueReviewReasonCode)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6 }}
            >
              {(
                [
                  "DOCUMENTATION_MISSING",
                  "CHARGE_MASTER_MISSING",
                  "CODER_REVIEW_REQUIRED",
                  "NOT_BILLABLE_PER_POLICY",
                  "OTHER_REVIEW_REQUIRED",
                ] as ProcedureRevenueReviewReasonCode[]
              ).map((code) => (
                <option key={code} value={code}>
                  {t(procedureRevenueReviewReasonLabelKey(code) ?? code)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
            {t("procedureRevenueReview.noteLabel")}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={submitting} style={actionBtnStyle} onClick={() => void submitDecision()}>
              {t("procedureRevenueReview.submitDecision")}
            </button>
            <button type="button" style={actionBtnStyle} onClick={() => setActiveRow(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const actionBtnStyleDanger: React.CSSProperties = {
  ...actionBtnStyle,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};
