"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppAlertTriageAssignee, MsppAlertTriageRow } from "@/lib/msppApi";
import type { MsppSanitarySignalsResponse } from "@/lib/msppApi";
import { formatMsppEscalationGeo } from "./msppEscalationFormatters";
import { MsppAlertTriagePanel } from "./MsppAlertTriagePanel";
import { MsppAlertInvestigationPanel } from "./MsppAlertInvestigationPanel";
import type { MsppAlertInvestigationCompact } from "@/lib/msppApi";
import {
  MSPP_EMPTY_STATE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "./msppUiChrome";

function signalLevelBadgeStyle(level: MsppAlertTriageRow["signalLevel"]): React.CSSProperties {
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

export function MsppAlertTriageSection({
  title,
  rows,
  window,
  assignees,
  expandedAlertKey,
  onToggleExpand,
  onRefresh,
  investigationByAlertKey,
  onRefreshInvestigations,
}: {
  title: string;
  rows: MsppAlertTriageRow[];
  window: MsppSanitarySignalsResponse["window"];
  assignees: MsppAlertTriageAssignee[];
  expandedAlertKey: string | null;
  onToggleExpand: (alertKey: string) => void;
  onRefresh: () => Promise<void>;
  investigationByAlertKey: Record<string, MsppAlertInvestigationCompact | undefined>;
  onRefreshInvestigations: () => Promise<void>;
}) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return (
      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>{title}</h2>
        <p style={MSPP_EMPTY_STATE}>{t("msppAlertsInboxPage.sectionEmpty")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{title}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={MSPP_TABLE}>
          <thead>
            <tr>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colDisease")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colGeo")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colSignalLevel")}</th>
              <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppAlertsInboxPage.colDelta")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colReason")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAlertTriage.colTriageStatus")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAlertTriage.colAction")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const sigLabel = t(`msppSanitarySignals.level.${row.signalLevel}`);
              const reason = t(`msppEscalations.reason.${row.escalationReasonCode}`);
              const st = row.triage?.triageStatus ?? "NEW";
              const stLabel = t(`msppAlertTriage.status.${st}`);
              const open = expandedAlertKey === row.alertKey;
              return (
                <React.Fragment key={`${row.alertKey}-${idx}`}>
                  <tr>
                    <td style={MSPP_TABLE_CELL}>
                      <div style={{ fontWeight: 600 }}>{row.diseaseName?.trim() || row.diseaseCode}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{row.diseaseCode}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>{formatMsppEscalationGeo(row)}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <span style={signalLevelBadgeStyle(row.signalLevel)}>{sigLabel}</span>
                    </td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      +{row.delta}
                    </td>
                    <td style={{ ...MSPP_TABLE_CELL, fontSize: 13, color: "#475569" }}>{reason}</td>
                    <td style={{ ...MSPP_TABLE_CELL, fontSize: 13 }}>{stLabel}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <button
                        type="button"
                        onClick={() => onToggleExpand(row.alertKey)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: open ? "#f1f5f9" : "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t("msppAlertTriage.treatAlert")}
                      </button>
                    </td>
                  </tr>
                  {open ? (
                    <tr>
                      <td colSpan={7} style={{ background: "#f8fafc", padding: 16, borderTop: "1px solid #e2e8f0" }}>
                        <MsppAlertTriagePanel row={row} window={window} assignees={assignees} onSaved={onRefresh} />
                        <div
                          style={{
                            marginTop: 20,
                            paddingTop: 16,
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <MsppAlertInvestigationPanel
                            row={row}
                            window={window}
                            assignees={assignees}
                            compact={investigationByAlertKey[row.alertKey]}
                            onChanged={onRefreshInvestigations}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
