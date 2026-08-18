"use client";

import React, { useMemo } from "react";
import {
  serializeLabAnalyteRows,
  type RecoveredLabAnalyteRow,
} from "@medora/shared";
import { parseLabObservationLines } from "@/lib/clinicalResultNormalize";

type LabResultStructuredEntryProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  t: (key: string) => string;
};

function emitLabResultText(rows: RecoveredLabAnalyteRow[], narrative: string): string {
  const table = serializeLabAnalyteRows(rows);
  const note = narrative.trim();
  if (table && note) return `${table}\n\nConclusion:\n${note}`;
  return table || note;
}

export function LabResultStructuredEntry({
  value,
  onChange,
  placeholder,
  t,
}: LabResultStructuredEntryProps) {
  const parsed = useMemo(() => parseLabObservationLines(value), [value]);
  const rows: RecoveredLabAnalyteRow[] = parsed.rows.map((r) => ({
    label: r.label,
    value: r.value,
    ref: r.ref ?? "",
    units: r.units ?? "",
  }));
  const workingRows =
    rows.length > 0 ? rows : [{ label: "", value: "", ref: "", units: "" }];
  const narrative = parsed.conclusion || (parsed.rows.length === 0 ? value : parsed.preamble);

  const updateRow = (index: number, patch: Partial<RecoveredLabAnalyteRow>) => {
    const next = workingRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(emitLabResultText(next, narrative));
  };

  const addRow = () => {
    onChange(
      emitLabResultText([...workingRows, { label: "", value: "", ref: "", units: "" }], narrative)
    );
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    fontSize: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
  };

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>{t("orderDetail.labAnalyteName")}</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>{t("orderDetail.labAnalyteValue")}</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>{t("orderDetail.labAnalyteRange")}</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>{t("orderDetail.labAnalyteUnits")}</th>
            </tr>
          </thead>
          <tbody>
            {(workingRows).map((row, i) => (
              <tr key={i}>
                <td style={{ padding: "4px 6px" }}>
                  <input
                    aria-label={t("orderDetail.labAnalyteName")}
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    style={inputStyle}
                  />
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input
                    aria-label={t("orderDetail.labAnalyteValue")}
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    style={inputStyle}
                  />
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input
                    aria-label={t("orderDetail.labAnalyteRange")}
                    value={row.ref}
                    onChange={(e) => updateRow(i, { ref: e.target.value })}
                    style={inputStyle}
                  />
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <input
                    aria-label={t("orderDetail.labAnalyteUnits")}
                    value={row.units}
                    onChange={(e) => updateRow(i, { units: e.target.value })}
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} style={{ justifySelf: "start", padding: "6px 10px", fontSize: 13 }}>
        {t("orderDetail.labAddAnalyte")}
      </button>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
        {t("orderDetail.labNarrative")}
        <textarea
          value={narrative}
          onChange={(e) => onChange(emitLabResultText(workingRows, e.target.value))}
          rows={3}
          placeholder={placeholder}
          style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", padding: 8 }}
        />
      </label>
    </div>
  );
}
