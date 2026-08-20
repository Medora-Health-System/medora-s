"use client";

import React from "react";
import type {
  ClinicalImagingReportSections,
  ClinicalLabObservation,
  ClinicalLabObservationFlag,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

const FLAG_OPTIONS: { value: ClinicalLabObservationFlag; labelKey: string }[] = [
  { value: null, labelKey: "structuredDiagnosticResult.flagNone" },
  { value: "NORMAL", labelKey: "structuredDiagnosticResult.flagNormal" },
  { value: "LOW", labelKey: "structuredDiagnosticResult.flagLow" },
  { value: "HIGH", labelKey: "structuredDiagnosticResult.flagHigh" },
  { value: "CRITICAL", labelKey: "structuredDiagnosticResult.flagCritical" },
  { value: "CRITICAL_LOW", labelKey: "structuredDiagnosticResult.flagCriticalLow" },
  { value: "CRITICAL_HIGH", labelKey: "structuredDiagnosticResult.flagCriticalHigh" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  padding: "6px 8px",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
  borderBottom: "1px solid #f1f5f9",
};

export function StructuredLabObservationEditor({
  observations,
  onChange,
  comments,
  onCommentsChange,
}: {
  observations: ClinicalLabObservation[];
  onChange: (next: ClinicalLabObservation[]) => void;
  comments: string;
  onCommentsChange: (next: string) => void;
}) {
  const { t } = useI18n();

  const updateRow = (index: number, patch: Partial<ClinicalLabObservation>) => {
    onChange(observations.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>
        {t("structuredDiagnosticResult.labPanelHint")}
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={thStyle}>{t("structuredDiagnosticResult.param")}</th>
              <th style={thStyle}>{t("structuredDiagnosticResult.result")}</th>
              <th style={thStyle}>{t("structuredDiagnosticResult.flag")}</th>
              <th style={thStyle}>{t("structuredDiagnosticResult.refRange")}</th>
              <th style={thStyle}>{t("structuredDiagnosticResult.units")}</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((row, index) => (
              <tr key={`${row.code ?? row.name}-${index}`}>
                <td style={{ ...tdStyle, fontWeight: 600, fontSize: 13, color: "#0f172a", minWidth: 160 }}>
                  {row.name}
                </td>
                <td style={{ ...tdStyle, minWidth: 90 }}>
                  <input
                    aria-label={`${row.name} ${t("structuredDiagnosticResult.result")}`}
                    value={row.value}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                    style={inputStyle}
                  />
                </td>
                <td style={{ ...tdStyle, minWidth: 110 }}>
                  <select
                    aria-label={`${row.name} ${t("structuredDiagnosticResult.flag")}`}
                    value={row.flag ?? ""}
                    onChange={(e) =>
                      updateRow(index, {
                        flag: (e.target.value || null) as ClinicalLabObservationFlag,
                      })
                    }
                    style={inputStyle}
                  >
                    {FLAG_OPTIONS.map((opt) => (
                      <option key={String(opt.value)} value={opt.value ?? ""}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ ...tdStyle, minWidth: 120 }}>
                  <input
                    aria-label={`${row.name} ${t("structuredDiagnosticResult.refRange")}`}
                    value={row.referenceText ?? ""}
                    onChange={(e) => updateRow(index, { referenceText: e.target.value })}
                    placeholder={t("structuredDiagnosticResult.refRangePlaceholder")}
                    style={inputStyle}
                  />
                </td>
                <td style={{ ...tdStyle, minWidth: 90 }}>
                  <input
                    aria-label={`${row.name} ${t("structuredDiagnosticResult.units")}`}
                    value={row.unit ?? ""}
                    onChange={(e) => updateRow(index, { unit: e.target.value })}
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label style={{ display: "block", marginTop: 12, fontSize: 13, fontWeight: 600 }}>
        {t("structuredDiagnosticResult.comments")}
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          rows={2}
          style={{ ...inputStyle, display: "block", marginTop: 6 }}
        />
      </label>
    </div>
  );
}

export function StructuredImagingReportEditor({
  report,
  onChange,
}: {
  report: ClinicalImagingReportSections;
  onChange: (next: ClinicalImagingReportSections) => void;
}) {
  const { t } = useI18n();
  const fields: { key: keyof ClinicalImagingReportSections; labelKey: string; rows: number }[] = [
    { key: "indication", labelKey: "structuredDiagnosticResult.indication", rows: 2 },
    { key: "technique", labelKey: "structuredDiagnosticResult.technique", rows: 2 },
    { key: "comparison", labelKey: "structuredDiagnosticResult.comparison", rows: 2 },
    { key: "findings", labelKey: "structuredDiagnosticResult.findings", rows: 4 },
    { key: "impression", labelKey: "structuredDiagnosticResult.impression", rows: 3 },
    { key: "recommendation", labelKey: "structuredDiagnosticResult.recommendation", rows: 2 },
  ];

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
      {fields.map((f) => (
        <label key={f.key} style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
          {t(f.labelKey)}
          <textarea
            value={report[f.key] ?? ""}
            onChange={(e) => onChange({ ...report, [f.key]: e.target.value })}
            rows={f.rows}
            style={{ ...inputStyle, display: "block", marginTop: 6 }}
          />
        </label>
      ))}
    </div>
  );
}
