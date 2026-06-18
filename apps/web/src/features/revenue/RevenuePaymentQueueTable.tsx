"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  REVENUE_PAYMENT_RECONCILIATION_I18N_KEYS,
  REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS,
} from "@/features/revenue/revenuePaymentNavigation";
import type { RevenuePaymentWorkspaceRow } from "@/features/revenue/revenuePaymentApi";

type RevenuePaymentQueueTableProps = {
  rows: readonly RevenuePaymentWorkspaceRow[];
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#0f172a",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const actionLinkStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 600,
  fontSize: 12,
  textDecoration: "none",
};

function formatAmount(value: number | null, dash: string): string {
  if (value == null) return dash;
  return value.toFixed(2);
}

export function RevenuePaymentQueueTable({ rows }: RevenuePaymentQueueTableProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid="revenue-payment-queue-table"
      style={{
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        backgroundColor: "#fff",
        overflowX: "auto",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
        <thead>
          <tr>
            <th style={thStyle}>{t("revenuePayment.table.patient")}</th>
            <th style={thStyle}>{t("revenuePayment.table.encounter")}</th>
            <th style={thStyle}>{t("revenuePayment.table.claim")}</th>
            <th style={thStyle}>{t("revenuePayment.table.payer")}</th>
            <th style={thStyle}>{t("revenuePayment.table.expectedAmount")}</th>
            <th style={thStyle}>{t("revenuePayment.table.paidAmount")}</th>
            <th style={thStyle}>{t("revenuePayment.table.variance")}</th>
            <th style={thStyle}>{t("revenuePayment.table.status")}</th>
            <th style={thStyle}>{t("revenuePayment.table.reconciliation")}</th>
            <th style={thStyle}>{t("revenuePayment.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ ...tdStyle, color: "#64748b" }}>
                {t("revenuePayment.table.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.claimId} data-testid={`revenue-payment-row-${row.claimId}`}>
                <td style={tdStyle}>
                  <div>{row.patientName}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{row.mrn ?? t("common.dash")}</div>
                </td>
                <td style={tdStyle}>{row.encounterId.slice(0, 8).toUpperCase()}</td>
                <td style={tdStyle} data-testid={`revenue-payment-claim-${row.claimId}`}>
                  {row.claimLabel}
                </td>
                <td style={tdStyle}>{row.payer ?? t("common.dash")}</td>
                <td style={tdStyle}>{formatAmount(row.expectedAmount, t("common.dash"))}</td>
                <td style={tdStyle}>{formatAmount(row.paidAmount, t("common.dash"))}</td>
                <td style={tdStyle} data-testid={`revenue-payment-variance-${row.claimId}`}>
                  {formatAmount(row.variance, t("common.dash"))}
                </td>
                <td style={tdStyle} data-testid={`revenue-payment-queue-${row.claimId}`}>
                  {t(REVENUE_PAYMENT_WORKSPACE_VIEW_I18N_KEYS[row.queue])}
                </td>
                <td style={tdStyle} data-testid={`revenue-payment-reconciliation-${row.claimId}`}>
                  {t(REVENUE_PAYMENT_RECONCILIATION_I18N_KEYS[row.reconciliationStatus])}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {row.denialCode ? (
                      <div
                        data-testid={`revenue-payment-denial-${row.claimId}`}
                        style={{ fontSize: 11, color: "#b91c1c", maxWidth: 220 }}
                      >
                        <strong>{t("revenuePayment.denial.code")}:</strong> {row.denialCode}
                        {row.denialDescription ? (
                          <div style={{ color: "#64748b", marginTop: 2 }}>{row.denialDescription}</div>
                        ) : null}
                        {row.correctionRecommended ? (
                          <div style={{ color: "#334155", marginTop: 4 }}>
                            {t("revenuePayment.denial.correctionRecommended")}: {row.correctionRecommended}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <Link
                        href={row.ledgerHref}
                        style={actionLinkStyle}
                        data-testid={`revenue-payment-ledger-${row.claimId}`}
                      >
                        {t("revenuePayment.actions.viewLedger")}
                      </Link>
                      <Link
                        href={row.auditHref}
                        style={actionLinkStyle}
                        data-testid={`revenue-payment-audit-${row.claimId}`}
                      >
                        {t("revenuePayment.actions.viewAudit")}
                      </Link>
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
