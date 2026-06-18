"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { RevenueCycleQueueRow } from "@/features/revenue/revenueCycleWorkspaceModels";
import {
  REVENUE_WORKSPACE_VIEW_I18N_KEYS,
} from "@/features/revenue/revenueCycleNavigation";

type RevenueCycleQueueTableProps = {
  rows: readonly RevenueCycleQueueRow[];
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

export function RevenueCycleQueueTable({ rows }: RevenueCycleQueueTableProps) {
  const { t, language } = useI18n();

  return (
    <div
      data-testid="revenue-cycle-queue-table"
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
            <th style={thStyle}>{t("revenueCycle.table.encounter")}</th>
            <th style={thStyle}>{t("revenueCycle.table.patient")}</th>
            <th style={thStyle}>{t("revenueCycle.table.mrn")}</th>
            <th style={thStyle}>{t("revenueCycle.table.dos")}</th>
            <th style={thStyle}>{t("revenueCycle.table.provider")}</th>
            <th style={thStyle}>{t("revenueCycle.table.queue")}</th>
            <th style={thStyle}>{t("revenueCycle.table.billingStatus")}</th>
            <th style={thStyle}>{t("revenueCycle.table.codingStatus")}</th>
            <th style={thStyle}>{t("revenueCycle.table.claimStatus")}</th>
            <th style={thStyle}>{t("revenueCycle.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ ...tdStyle, color: "#64748b" }}>
                {t("revenueCycle.table.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.encounterId} data-testid={`revenue-cycle-row-${row.encounterId}`}>
                <td style={tdStyle}>{row.encounterLabel}</td>
                <td style={tdStyle}>{row.patientName}</td>
                <td style={tdStyle}>{row.mrn ?? t("common.dash")}</td>
                <td style={tdStyle}>
                  {row.dateOfService
                    ? formatEncounterChromeDateTime(row.dateOfService, language)
                    : t("common.dash")}
                </td>
                <td style={tdStyle}>{row.providerName ?? t("common.dash")}</td>
                <td style={tdStyle} data-testid={`revenue-cycle-queue-${row.encounterId}`}>
                  {t(REVENUE_WORKSPACE_VIEW_I18N_KEYS[row.queue])}
                </td>
                <td style={tdStyle}>{t(`revenueCycle.billingStatus.${row.billingStatus}`)}</td>
                <td style={tdStyle}>{t(`revenueCycle.codingStatus.${row.codingStatus}`)}</td>
                <td style={tdStyle}>{t(`revenueCycle.claimStatus.${row.claimStatus}`)}</td>
                <td style={tdStyle}>
                  <Link
                    href={row.ledgerHref}
                    style={actionLinkStyle}
                    data-testid={`revenue-cycle-ledger-${row.encounterId}`}
                  >
                    {t("revenueCycle.actions.viewLedger")}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
