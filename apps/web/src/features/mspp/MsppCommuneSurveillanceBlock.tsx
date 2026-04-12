"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppCommuneSanitarySignalRow, MsppCommuneSanitarySignalsResponse } from "@/lib/msppApi";
import { msppSanitaryThresholdProfileSubtitle } from "./msppSanitarySignalProfileLabel";
import {
  MSPP_EMPTY_STATE,
  MSPP_MUTED_INLINE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "./msppUiChrome";

function signalLevelBadgeStyle(level: MsppCommuneSanitarySignalRow["signalLevel"]): React.CSSProperties {
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

function formatWindowLine(t: (key: string) => string, win: MsppCommuneSanitarySignalsResponse["window"]): string {
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
    return t("msppCommuneSurveillance.windowHint")
      .replace("{prev}", fmt(prevS, prevE))
      .replace("{cur}", fmt(curS, curE));
  } catch {
    return "";
  }
}

export function MsppCommuneSurveillanceBlock({
  loading,
  data,
}: {
  loading: boolean;
  data: MsppCommuneSanitarySignalsResponse | null;
}) {
  const { t } = useI18n();
  const rows = data?.signals ?? [];
  const winLine = data ? formatWindowLine(t, data.window) : "";

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppCommuneSurveillance.title")}</h2>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 4, marginBottom: 4, fontWeight: 600, color: "#334155" }}>
        {t("msppCommuneSurveillance.signalCommunal")}
      </p>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 0, marginBottom: 8, fontWeight: 600, color: "#334155" }}>
        {t("msppCommuneSurveillance.disclaimer")}
      </p>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 0, marginBottom: 8, fontSize: 12, color: "#64748b" }}>
        {t("msppCommuneSurveillance.validationRequired")}
      </p>
      {winLine ? (
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginTop: 0, marginBottom: 10, fontSize: 12 }}>{winLine}</p>
      ) : null}
      {data && data.excludedUnlinkedOrMismatchCount > 0 ? (
        <p style={{ ...MSPP_MUTED_INLINE, marginTop: 0, marginBottom: 10, fontSize: 12, display: "block" }}>
          {t("msppCommuneSurveillance.excludedHint").replace("{n}", String(data.excludedUnlinkedOrMismatchCount))}
        </p>
      ) : null}
      {data?.truncated ? (
        <p style={{ ...MSPP_MUTED_INLINE, marginTop: 0, marginBottom: 10, fontSize: 12, display: "block" }}>
          {t("msppCommuneSurveillance.truncatedHint")
            .replace("{shown}", String(data.signals.length))
            .replace("{total}", String(data.signalsTotalBeforeCap))}
        </p>
      ) : null}
      {loading ? (
        <p style={{ color: "#64748b", margin: 0 }}>{t("msppCommuneSurveillance.loading")}</p>
      ) : rows.length === 0 ? (
        <p style={MSPP_EMPTY_STATE}>{t("msppCommuneSurveillance.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={MSPP_TABLE}>
            <thead>
              <tr>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppCommuneSurveillance.colDepartment")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppCommuneSurveillance.colCommune")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppCommuneSurveillance.colDisease")}</th>
                <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppCommuneSurveillance.colCurrent")}</th>
                <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppCommuneSurveillance.colPrevious")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppCommuneSurveillance.colLevel")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const profileSub = msppSanitaryThresholdProfileSubtitle(t, row.thresholdProfileUsed);
                return (
                  <tr key={`${row.geoCommuneId}-${row.diseaseCode}`}>
                    <td style={MSPP_TABLE_CELL}>{row.departmentName?.trim() || "—"}</td>
                    <td style={MSPP_TABLE_CELL}>{row.communeName?.trim() || "—"}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <div style={{ fontWeight: 600 }}>{row.diseaseName?.trim() || row.diseaseCode}</div>
                    </td>
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
