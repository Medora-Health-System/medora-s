"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchComplianceDashboard, type ComplianceDashboardPayload } from "@/lib/complianceApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type OverallSev = "ok" | "attention" | "critical";

function sevRank(s: OverallSev): number {
  if (s === "critical") return 2;
  if (s === "attention") return 1;
  return 0;
}

function maxSev(...xs: OverallSev[]): OverallSev {
  return xs.reduce((a, b) => (sevRank(a) >= sevRank(b) ? a : b), "ok" as OverallSev);
}

function coverageTier(percent: number): OverallSev {
  if (percent >= 99) return "ok";
  if (percent >= 95) return "attention";
  return "critical";
}

function failedExportTier(rate: number): OverallSev {
  if (rate === 0) return "ok";
  if (rate >= 10) return "critical";
  return "attention";
}

function overrideTier(n: number): OverallSev {
  if (n === 0) return "ok";
  if (n >= 5) return "critical";
  return "attention";
}

function criticalEventsTier(n: number): OverallSev {
  if (n === 0) return "ok";
  if (n >= 10) return "critical";
  return "attention";
}

function gapTier(ordersMissing: number, marMissing: number): OverallSev {
  const gaps = ordersMissing + marMissing;
  if (gaps === 0) return "ok";
  if (ordersMissing > 10 || marMissing > 10 || gaps > 15) return "critical";
  return "attention";
}

function deriveOverallStatus(d: ComplianceDashboardPayload): OverallSev {
  return maxSev(
    coverageTier(d.auditCoverage.orders.percent),
    coverageTier(d.auditCoverage.mar.percent),
    failedExportTier(d.riskSignals.failedExportRate),
    overrideTier(d.riskSignals.overrideCount),
    criticalEventsTier(d.riskSignals.criticalAuditCount),
    gapTier(d.gaps.ordersMissingAudit, d.gaps.marMissingAudit)
  );
}

function badgeStyle(s: OverallSev): CSSProperties {
  if (s === "ok") return { background: "#166534", color: "#fff" };
  if (s === "attention") return { background: "#a16207", color: "#fff" };
  return { background: "#991b1b", color: "#fff" };
}

function cardShell(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fafafa",
    fontSize: 14,
  };
}

export default function AdminCompliancePage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<ComplianceDashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("compliance.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchComplianceDashboard(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("compliance.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

  const overall = useMemo(() => (data ? deriveOverallStatus(data) : "ok"), [data]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isPlatformOperator) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("platformOps.restrictedBody")}</p>
        <Link href="/app">{t("compliance.backApp")}</Link>
      </div>
    );
  }

  const locale = language === "en" ? "en-US" : "fr-FR";
  const fmtIso = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("compliance.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("compliance.title")}</h1>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? t("common.loading") : t("compliance.refresh")}
        </button>
        {data ? (
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              fontWeight: 700,
              fontSize: 13,
              ...badgeStyle(overall),
            }}
          >
            {t(`compliance.status.${overall}`)}
          </span>
        ) : null}
      </div>

      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("compliance.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 8 }}>{t("compliance.noPhiNote")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 6 }}>{t("compliance.exportAuditNativeNote")}</p>

      {data ? (
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
          {t("compliance.window")}: {fmtIso(data.window.from)} — {fmtIso(data.window.to)}
        </p>
      ) : null}

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {data ? (
        <>
          <h2 style={{ fontSize: 16, margin: "20px 0 10px 0" }}>{t("compliance.auditCoverage")}</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            <li style={cardShell()}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("compliance.orders")}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("compliance.total")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.orders.total}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.audited")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.orders.audited}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.percent")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.orders.percent}%</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("compliance.mar")}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("compliance.total")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.mar.total}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.audited")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.mar.audited}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.percent")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.mar.percent}%</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("compliance.exports")}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("compliance.total")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.exports.total}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.audited")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.exports.audited}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{t("compliance.percent")}</div>
              <div style={{ fontWeight: 600 }}>{data.auditCoverage.exports.percent}%</div>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("compliance.exportPercentExplain")}
              </p>
            </li>
          </ul>

          <h2 style={{ fontSize: 16, margin: "22px 0 10px 0" }}>{t("compliance.missingAuditSignals")}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.ordersMissing")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.gaps.ordersMissingAudit}</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.marMissing")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.gaps.marMissingAudit}</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.exportsMissing")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.gaps.exportsMissingAudit}</div>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("compliance.exportsMissingExplain")}
              </p>
            </li>
          </ul>

          <h2 style={{ fontSize: 16, margin: "22px 0 10px 0" }}>{t("compliance.riskSignals")}</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.overrideCount")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.riskSignals.overrideCount}</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.failedExportCount")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.riskSignals.failedExportCount}</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.failedExportRate")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.riskSignals.failedExportRate}%</div>
            </li>
            <li style={cardShell()}>
              <div style={{ fontWeight: 700 }}>{t("compliance.criticalAuditCount")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.riskSignals.criticalAuditCount}</div>
            </li>
          </ul>

          <section style={{ marginTop: 20, padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("compliance.recommendedActionsTitle")}</div>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>{t(`compliance.recommendedActions.${overall}`)}</p>
          </section>
        </>
      ) : !loading ? (
        <p style={{ marginTop: 16 }}>{t("compliance.empty")}</p>
      ) : null}
    </div>
  );
}
