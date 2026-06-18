"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { RevenueClaimQueueRow } from "@/features/revenue/revenueClaimSubmissionWorkspaceModels";
import { revenueClaimAuditHref } from "@/features/revenue/revenueClaimSubmissionNavigation";

type RevenueClaimQueueTableProps = {
  rows: readonly RevenueClaimQueueRow[];
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

function submissionStatusLabel(t: (k: string) => string, status: string): string {
  const key = `revenueClaimSubmission.submissionStatus.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

export function RevenueClaimQueueTable({ rows }: RevenueClaimQueueTableProps) {
  const { t, language } = useI18n();

  return (
    <div
      data-testid="revenue-claim-queue-table"
      style={{
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        backgroundColor: "#fff",
        overflowX: "auto",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
        <thead>
          <tr>
            <th style={thStyle}>{t("revenueClaimSubmission.table.patient")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.mrn")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.dos")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.provider")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.payer")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.claimId")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.submissionStatus")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.lastUpdated")}</th>
            <th style={thStyle}>{t("revenueClaimSubmission.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ ...tdStyle, color: "#64748b" }}>
                {t("revenueClaimSubmission.table.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.claimId} data-testid={`revenue-claim-row-${row.claimId}`}>
                <td style={tdStyle}>{row.patientName}</td>
                <td style={tdStyle}>{row.mrn ?? t("common.dash")}</td>
                <td style={tdStyle}>
                  {row.dateOfService
                    ? formatEncounterChromeDateTime(row.dateOfService, language)
                    : t("common.dash")}
                </td>
                <td style={tdStyle}>{row.providerName ?? t("common.dash")}</td>
                <td style={tdStyle}>{row.payerName ?? t("common.dash")}</td>
                <td style={tdStyle} data-testid={`revenue-claim-id-${row.claimId}`}>
                  {row.claimId.slice(0, 8).toUpperCase()}
                </td>
                <td style={tdStyle} data-testid={`revenue-claim-status-${row.claimId}`}>
                  {submissionStatusLabel(t, row.submissionStatus)}
                </td>
                <td style={tdStyle}>
                  {row.lastUpdatedAt
                    ? formatEncounterChromeDateTime(row.lastUpdatedAt, language)
                    : t("common.dash")}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <Link
                      href={row.ledgerHref}
                      style={actionLinkStyle}
                      data-testid={`revenue-claim-ledger-${row.claimId}`}
                    >
                      {t("revenueClaimSubmission.actions.viewLedger")}
                    </Link>
                    <Link
                      href={row.claimHref}
                      style={actionLinkStyle}
                      data-testid={`revenue-claim-view-${row.claimId}`}
                    >
                      {t("revenueClaimSubmission.actions.viewClaim")}
                    </Link>
                    <Link
                      href={revenueClaimAuditHref(row.claimId)}
                      style={actionLinkStyle}
                      data-testid={`revenue-claim-audit-${row.claimId}`}
                    >
                      {t("revenueClaimSubmission.actions.viewAudit")}
                    </Link>
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
