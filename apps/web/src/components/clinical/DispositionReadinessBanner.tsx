"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DispositionSafetyReadinessResponse } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

export function dispositionReadinessIssueText(
  t: (key: string) => string,
  issue: { code: string; message: string },
  data: DispositionSafetyReadinessResponse,
  /** Active Medora UI locale. English must never fall back to French API messages. */
  language: string = "en"
): string {
  const blockKey = `dispositionReadiness.blockers.${issue.code}`;
  const warnKey = `dispositionReadiness.warnings.${issue.code}`;
  const blockMsg = t(blockKey);
  const warnMsg = t(warnKey);
  const resolved = blockMsg !== blockKey ? blockMsg : warnMsg !== warnKey ? warnMsg : null;
  if (resolved) {
    if (issue.code === "ACTIVE_ORDERS_UNRESOLVED") {
      const c = data.activeOrderCounts;
      return resolved
        .replace("{lab}", String(c.lab))
        .replace("{imaging}", String(c.imaging))
        .replace("{medication}", String(c.medication))
        .replace("{care}", String(c.care));
    }
    return resolved;
  }
  const loc = resolveProductUiLanguageOrDefault(language);
  const codeIdentity = issue.code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  // French API `message` is only for FR UI. EN/ES use canonical code identity — never FR copy.
  if (loc === "fr") return issue.message;
  return codeIdentity;
}

export function DispositionReadinessBanner({
  encounterId,
  facilityId,
  refreshKey,
  onReadinessChange,
  disabled,
}: {
  encounterId: string;
  facilityId: string;
  /** Bump when chart data likely changed (e.g. encounter reload). */
  refreshKey?: string | number;
  onReadinessChange?: (r: DispositionSafetyReadinessResponse | null) => void;
  /** When encounter not OPEN, skip fetch. */
  disabled?: boolean;
}) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<DispositionSafetyReadinessResponse | null>(null);

  useEffect(() => {
    onReadinessChange?.(null);
    if (disabled) {
      setLoading(false);
      setError(false);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const raw = await apiFetch(`/encounters/${encounterId}/disposition-readiness`, { facilityId });
        if (cancelled) return;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          setData(null);
          setError(true);
          setLoading(false);
          return;
        }
        const o = raw as Record<string, unknown>;
        const blockers = Array.isArray(o.blockers) ? o.blockers : [];
        const warnings = Array.isArray(o.warnings) ? o.warnings : [];
        const counts = o.activeOrderCounts;
        const readiness: DispositionSafetyReadinessResponse = {
          canClose: o.canClose === true,
          blockers: blockers as DispositionSafetyReadinessResponse["blockers"],
          warnings: warnings as DispositionSafetyReadinessResponse["warnings"],
          lastVitalsAt: typeof o.lastVitalsAt === "string" ? o.lastVitalsAt : undefined,
          activeOrderCounts:
            counts &&
            typeof counts === "object" &&
            !Array.isArray(counts) &&
            typeof (counts as { lab?: unknown }).lab === "number"
              ? (counts as DispositionSafetyReadinessResponse["activeOrderCounts"])
              : { lab: 0, imaging: 0, medication: 0, care: 0 },
        };
        setData(readiness);
        onReadinessChange?.(readiness);
      } catch {
        if (!cancelled) {
          setData(null);
          setError(true);
          onReadinessChange?.(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onReadinessChange intentionally omitted — parent should wrap in useCallback to avoid spurious refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId, facilityId, refreshKey, disabled]);

  if (disabled) return null;

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const shell: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: "12px 14px",
  };

  if (loading) {
    return (
      <div style={shell}>
        <p style={{ ...titleStyle, marginBottom: 6 }}>{t("dispositionReadiness.title")}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ ...shell, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
        <p style={{ ...titleStyle, marginBottom: 6 }}>{t("dispositionReadiness.title")}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#92400e", fontWeight: 600 }}>{t("dispositionReadiness.loadError")}</p>
      </div>
    );
  }

  const alertShell =
    data.canClose && data.warnings.length === 0
      ? { ...shell, borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }
      : data.canClose
        ? { ...shell, borderColor: "#fde68a", backgroundColor: "#fffbeb" }
        : { ...shell, borderColor: "#fecaca", backgroundColor: "#fef2f2" };

  const c = data.activeOrderCounts;

  return (
    <div style={alertShell} role="status">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <p style={{ ...titleStyle, margin: 0, flex: 1 }}>{t("dispositionReadiness.title")}</p>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: data.canClose ? "#dcfce7" : "#fee2e2",
            color: data.canClose ? "#166534" : "#991b1b",
          }}
        >
          {data.canClose ? t("dispositionReadiness.statusOk") : t("dispositionReadiness.statusBlocked")}
        </span>
      </div>
      {data.lastVitalsAt ? (
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#475569" }}>
          {t("dispositionReadiness.lastVitalsLabel")}{" "}
          <strong style={{ color: "#0f172a" }}>{formatEncounterChromeDateTime(data.lastVitalsAt, language)}</strong>
        </p>
      ) : (
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
          {t("dispositionReadiness.noVitalsRecorded")}
        </p>
      )}
      <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b" }}>
        {t("dispositionReadiness.orderCountsLine")
          .replace("{lab}", String(c.lab))
          .replace("{imaging}", String(c.imaging))
          .replace("{medication}", String(c.medication))
          .replace("{care}", String(c.care))}
      </p>
      {data.blockers.length > 0 ? (
        <ul style={{ margin: "0 0 8px 0", paddingLeft: 18, fontSize: 12, color: "#7f1d1d", lineHeight: 1.45 }}>
          {data.blockers.map((b) => (
            <li key={b.code} style={{ marginBottom: 4 }}>
              {dispositionReadinessIssueText(t, b, data, language)}
            </li>
          ))}
        </ul>
      ) : null}
      {data.warnings.length > 0 ? (
        <ul style={{ margin: "0 0 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e", lineHeight: 1.45 }}>
          {data.warnings.map((w) => (
            <li key={w.code} style={{ marginBottom: 4 }}>
              {dispositionReadinessIssueText(t, w, data, language)}
            </li>
          ))}
        </ul>
      ) : null}
      {!data.canClose ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("dispositionReadiness.overrideHint")}
        </p>
      ) : null}
    </div>
  );
}
