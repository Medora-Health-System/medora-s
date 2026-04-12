"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppAlertEscalationRow, MsppAlertEscalationsResponse } from "@/lib/msppApi";
import {
  MSPP_EMPTY_STATE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "./msppUiChrome";

function escalationBadgeStyle(level: MsppAlertEscalationRow["escalationLevel"]): React.CSSProperties {
  if (level === "URGENT") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(234, 179, 8, 0.22)",
      color: "#a16207",
    };
  }
  if (level === "PRIORITY") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(59, 130, 246, 0.14)",
      color: "#1d4ed8",
    };
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(100, 116, 139, 0.12)",
    color: "#475569",
  };
}

function signalLevelBadgeStyle(level: MsppAlertEscalationRow["signalLevel"]): React.CSSProperties {
  if (level === "HIGH") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(234, 179, 8, 0.2)",
      color: "#a16207",
    };
  }
  if (level === "MEDIUM") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(59, 130, 246, 0.14)",
      color: "#1d4ed8",
    };
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(100, 116, 139, 0.12)",
    color: "#475569",
  };
}

function formatGeo(row: MsppAlertEscalationRow): string {
  if (row.scope === "COMMUNE") {
    const c = row.communeName?.trim() || "—";
    const d = row.departmentName?.trim() || "";
    return d ? `${c} (${d})` : c;
  }
  return row.departmentName?.trim() || "—";
}

export function MsppEscalationsBlock({
  loading,
  data,
}: {
  loading: boolean;
  data: MsppAlertEscalationsResponse | null;
}) {
  const { t } = useI18n();
  const rows = data?.escalations ?? [];

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppEscalations.title")}</h2>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 4, marginBottom: 8, fontWeight: 600, color: "#334155" }}>
        {t("msppEscalations.disclaimer")}
      </p>
      {loading ? (
        <p style={{ color: "#64748b", margin: 0 }}>{t("msppEscalations.loading")}</p>
      ) : rows.length === 0 ? (
        <p style={MSPP_EMPTY_STATE}>{t("msppEscalations.empty")}</p>
      ) : (
        <>
          {data?.truncated ? (
            <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 0, marginBottom: 10, fontSize: 12 }}>
              {t("msppEscalations.truncated")
                .replace("{shown}", String(rows.length))
                .replace("{total}", String(data.totalMatchedBeforeCap))}
            </p>
          ) : null}
          <div style={{ overflowX: "auto" }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colGeo")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colSignalLevel")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colEscalation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colReason")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const escLabel = t(`msppEscalations.level.${row.escalationLevel}`);
                  const sigLabel = t(`msppSanitarySignals.level.${row.signalLevel}`);
                  const reason = t(`msppEscalations.reason.${row.escalationReasonCode}`);
                  const key =
                    row.scope === "COMMUNE"
                      ? `${row.diseaseCode}-${row.geoCommuneId}-${row.departmentId}-${row.escalationReasonCode}-${idx}`
                      : `${row.diseaseCode}-${row.departmentId}-${row.escalationReasonCode}-${idx}`;
                  return (
                    <tr key={key}>
                      <td style={MSPP_TABLE_CELL}>
                        <div style={{ fontWeight: 600 }}>{row.diseaseName?.trim() || row.diseaseCode}</div>
                      </td>
                      <td style={MSPP_TABLE_CELL}>{formatGeo(row)}</td>
                      <td style={MSPP_TABLE_CELL}>
                        <span style={signalLevelBadgeStyle(row.signalLevel)}>{sigLabel}</span>
                      </td>
                      <td style={MSPP_TABLE_CELL}>
                        <span style={escalationBadgeStyle(row.escalationLevel)}>{escLabel}</span>
                      </td>
                      <td style={{ ...MSPP_TABLE_CELL, fontSize: 13, color: "#475569" }}>{reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
