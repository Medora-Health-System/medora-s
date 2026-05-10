"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchRoiMonitoringSummary } from "@/lib/chartRoiApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export default function AdminRoiMonitoringPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<{
    byStatus: { status: string; count: number }[];
    byFacility: { facilityId: string; status: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = language === "en" ? "en" : "fr";

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchRoiMonitoringSummary(facilityId, lang);
      setData(d);
    } catch (e: unknown) {
      setData(null);
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("roiMonitoring.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, lang, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }
  if (!isPlatformOperator) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("roiMonitoring.accessDenied")}</p>
        <Link href="/app/admin">{t("roi.backAdmin")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Link href="/app/admin" style={{ fontSize: 14 }}>
        {t("roi.backAdmin")}
      </Link>
      <h1 style={{ marginTop: 8 }}>{t("roiMonitoring.title")}</h1>
      <p style={{ color: "#555" }}>{t("roiMonitoring.intro")}</p>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <button type="button" onClick={() => void load()} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? t("common.loading") : t("roi.refresh")}
      </button>
      {!data ? (
        <p style={{ color: "#64748b" }}>{t("roiMonitoring.empty")}</p>
      ) : (
        <>
          <h2 style={{ fontSize: 15 }}>{t("roiMonitoring.byStatus")}</h2>
          <ul>
            {data.byStatus.map((r) => (
              <li key={r.status}>
                {t(`roi.status.${r.status}`)} : {r.count}
              </li>
            ))}
          </ul>
          <h2 style={{ fontSize: 15 }}>{t("roiMonitoring.byFacility")}</h2>
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("roiMonitoring.facilityNote")}</p>
          <ul style={{ fontSize: 13 }}>
            {data.byFacility.slice(0, 50).map((r) => (
              <li key={`${r.facilityId}-${r.status}`}>
                {r.facilityId.slice(0, 8)}… — {t(`roi.status.${r.status}`)} : {r.count}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
