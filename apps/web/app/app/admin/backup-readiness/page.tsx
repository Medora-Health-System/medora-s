"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchBackupReadiness,
  type BackupReadinessCheck,
  type BackupReadinessOverallStatus,
  type BackupReadinessPayload,
} from "@/lib/backupReadinessApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { productUiBcp47Tag } from "@/i18n/config";

function overallBadgeStyle(s: BackupReadinessOverallStatus): CSSProperties {
  if (s === "ready") return { background: "#166534", color: "#fff" };
  if (s === "attention") return { background: "#a16207", color: "#fff" };
  return { background: "#991b1b", color: "#fff" };
}

function checkBorder(status: BackupReadinessCheck["status"]): string {
  if (status === "pass") return "1px solid #bbf7d0";
  if (status === "warn") return "1px solid #fde047";
  return "1px solid #fecaca";
}

export default function AdminBackupReadinessPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<BackupReadinessPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("backupReadiness.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchBackupReadiness(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("backupReadiness.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

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
        <Link href="/app">{t("backupReadiness.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("backupReadiness.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("backupReadiness.title")}</h1>
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
          {loading ? t("common.loading") : t("backupReadiness.refresh")}
        </button>
        {data ? (
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              fontWeight: 700,
              fontSize: 13,
              ...overallBadgeStyle(data.status),
            }}
          >
            {t(`backupReadiness.overall.${data.status}`)}
          </span>
        ) : null}
      </div>
      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("backupReadiness.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 8 }}>{t("backupReadiness.monitoringRiskNote")}</p>
      <p style={{ fontSize: 13, color: "#64748b" }}>
        {t("backupReadiness.generatedAt")}:{" "}
        {data?.generatedAt
          ? new Date(data.generatedAt).toLocaleString(productUiBcp47Tag(language), {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—"}
      </p>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {data?.checks?.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {data.checks.map((c) => (
            <li
              key={c.key}
              style={{
                border: checkBorder(c.status),
                borderRadius: 10,
                padding: "14px 16px",
                background: "#fafafa",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t(`backupReadiness.checks.${c.key}`)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {t("backupReadiness.statusLabel")}: <strong>{t(`backupReadiness.checkStatus.${c.status}`)}</strong>
              </div>
              {c.detail ? (
                <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#334155" }}>
                  {t(`backupReadiness.details.${c.detail}`)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !loading && data && !data.checks.length ? (
        <p>{t("backupReadiness.empty")}</p>
      ) : null}
    </div>
  );
}
