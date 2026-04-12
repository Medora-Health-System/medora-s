"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppSanitarySignalRow, MsppSanitarySignalsResponse } from "@/lib/msppApi";
import { msppSanitaryThresholdProfileSubtitle } from "./msppSanitarySignalProfileLabel";
import {
  MSPP_EMPTY_STATE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "./msppUiChrome";

function signalLevelBadgeStyle(level: MsppSanitarySignalRow["signalLevel"]): React.CSSProperties {
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

function formatWindowLine(t: (key: string) => string, win: MsppSanitarySignalsResponse["window"]): string {
  try {
    const curS = new Date(win.currentStart);
    const curE = new Date(win.currentEnd);
    const prevS = new Date(win.previousStart);
    const prevE = new Date(win.previousEnd);
    if ([curS, curE, prevS, prevE].some((d) => Number.isNaN(d.getTime()))) {
      return "";
    }
    const fmt = (a: Date, b: Date) =>
      `${a.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — ${b.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    return t("msppSanitarySignals.windowHint")
      .replace("{prev}", fmt(prevS, prevE))
      .replace("{cur}", fmt(curS, curE));
  } catch {
    return "";
  }
}

export function MsppSanitarySignalsBlock({
  loading,
  data,
}: {
  loading: boolean;
  data: MsppSanitarySignalsResponse | null;
}) {
  const { t } = useI18n();
  const rows = data?.signals ?? [];
  const winLine = data ? formatWindowLine(t, data.window) : "";

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppSanitarySignals.title")}</h2>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 4, marginBottom: 8, fontWeight: 600, color: "#334155" }}>
        {t("msppSanitarySignals.disclaimer")}
      </p>
      {winLine ? (
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 0, marginBottom: 10, fontSize: 12 }}>{winLine}</p>
      ) : null}
      {loading ? (
        <p style={{ color: "#64748b", margin: 0 }}>{t("msppSanitarySignals.loading")}</p>
      ) : rows.length === 0 ? (
        <p style={MSPP_EMPTY_STATE}>{t("msppSanitarySignals.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={MSPP_TABLE}>
            <thead>
              <tr>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppSanitarySignals.colDisease")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppSanitarySignals.colDepartment")}</th>
                <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppSanitarySignals.colCurrent")}</th>
                <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppSanitarySignals.colPrevious")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppSanitarySignals.colLevel")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const profileSub = msppSanitaryThresholdProfileSubtitle(t, row.thresholdProfileUsed);
                return (
                  <tr key={`${row.diseaseCode}-${row.departmentId}`}>
                    <td style={MSPP_TABLE_CELL}>
                      <div style={{ fontWeight: 600 }}>{row.diseaseName?.trim() || row.diseaseCode}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>{row.departmentName?.trim() || "—"}</td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {row.currentCount}
                    </td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {row.previousCount}
                    </td>
                    <td style={MSPP_TABLE_CELL}>
                      <span style={signalLevelBadgeStyle(row.signalLevel)}>
                        {t(`msppSanitarySignals.level.${row.signalLevel}`)}
                      </span>
                      {profileSub ? (
                        <div
                          style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.35 }}
                          title={t("msppSanitarySignals.ruleAppliedShort")}
                        >
                          {profileSub}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
