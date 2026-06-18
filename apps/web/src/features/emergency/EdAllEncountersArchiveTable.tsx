"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime, formatPatientAgeSexLine } from "@/lib/encounterChromeI18n";
import type { EdAllEncountersArchiveRow } from "@/features/emergency/edAllEncountersArchive";

type EdAllEncountersArchiveTableProps = {
  rows: readonly EdAllEncountersArchiveRow[];
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

export function EdAllEncountersArchiveTable({ rows }: EdAllEncountersArchiveTableProps) {
  const { t, language } = useI18n();

  return (
    <div
      data-testid="ed-all-encounters-archive-table"
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
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.name")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.mrn")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.sexAge")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.reason")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.visitDate")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.los")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.status")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.facility")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.billingCoding")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.phone")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.chart")}</th>
            <th style={thStyle}>{t("edLifecycle.allEncounters.table.demo")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-testid={`ed-all-encounters-row-${row.id}`}>
              <td style={tdStyle}>{row.patientName}</td>
              <td style={tdStyle}>{row.mrn ?? t("common.dash")}</td>
              <td style={tdStyle}>
                {formatPatientAgeSexLine(row.dob, row.gender, null, t)}
              </td>
              <td style={tdStyle}>{row.chiefComplaint ?? t("common.dash")}</td>
              <td style={tdStyle}>
                {row.visitDate
                  ? formatEncounterChromeDateTime(row.visitDate, language)
                  : t("common.dash")}
              </td>
              <td style={tdStyle}>{row.los}</td>
              <td style={tdStyle}>{t(`edLifecycle.allEncounters.status.${row.status}`)}</td>
              <td style={tdStyle}>{row.facilityName ?? t("common.dash")}</td>
              <td style={tdStyle} data-testid={`ed-all-encounters-billing-${row.id}`}>
                {t(`edLifecycle.allEncounters.billing.${row.billingStatusLabel}`)}
              </td>
              <td style={tdStyle}>{row.phone ?? t("common.dash")}</td>
              <td style={tdStyle}>
                <Link href={row.chartHref} style={actionLinkStyle} data-testid={`ed-all-encounters-chart-${row.id}`}>
                  {t("edLifecycle.allEncounters.actions.chart")}
                </Link>
              </td>
              <td style={tdStyle}>
                {row.demoHref ? (
                  <Link href={row.demoHref} style={actionLinkStyle} data-testid={`ed-all-encounters-demo-${row.id}`}>
                    {t("edLifecycle.allEncounters.actions.demo")}
                  </Link>
                ) : (
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{t("common.dash")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
