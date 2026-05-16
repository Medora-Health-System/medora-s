"use client";

import { useI18n } from "@/lib/i18n";
import { useObservationMarEncounterSummary } from "@/hooks/useObservationMarEncounterSummary";
import type { ObservationMarEncounterSummary } from "@/lib/observationMarEncounterSummary";

export function ObservationMarEncounterSummaryBlock({
  encounterId,
  facilityId,
  refreshKey,
  /** Parent-provided digest (e.g. shared with observation workflow chrome) — skips duplicate fetch. */
  externalDigest,
}: {
  encounterId: string;
  facilityId: string;
  /** Bump when encounter data that affects orders/MAR may have changed. */
  refreshKey: string;
  externalDigest?: {
    summary: ObservationMarEncounterSummary | null;
    loading: boolean;
    error: string | null;
  };
}) {
  const { t, language } = useI18n();
  const internal = useObservationMarEncounterSummary({
    encounterId,
    facilityId,
    refreshKey,
    enabled: !externalDigest,
    language,
    t,
  });
  const summary = externalDigest?.summary ?? internal.summary;
  const loading = externalDigest?.loading ?? internal.loading;
  const error = externalDigest?.error ?? internal.error;

  if (loading && !summary && !error) {
    return (
      <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>{t("encounterChrome.observationDocSummary.marSummary.loading")}</div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 12, fontSize: 12, color: "#b45309", lineHeight: 1.45 }} role="status">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  const pendingLine = t("encounterChrome.observationDocSummary.marSummary.pendingCount").replace("{count}", String(summary.pendingMedicationLines));
  const overdueLine =
    summary.overdueMedicationLines > 0
      ? t("encounterChrome.observationDocSummary.marSummary.overdueCount").replace("{count}", String(summary.overdueMedicationLines))
      : t("encounterChrome.observationDocSummary.marSummary.overdueNone");
  const infusionLine =
    summary.activeInfusionSessions > 0
      ? t("encounterChrome.observationDocSummary.marSummary.infusionActive").replace("{count}", String(summary.activeInfusionSessions))
      : t("encounterChrome.observationDocSummary.marSummary.infusionNone");

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        {t("encounterChrome.observationDocSummary.marSummary.sectionTitle")}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
        <li style={{ marginBottom: 4 }}>{pendingLine}</li>
        <li style={{ marginBottom: 4 }}>{overdueLine}</li>
        <li style={{ marginBottom: 4 }}>{infusionLine}</li>
        <li style={{ marginBottom: 4 }}>{t("encounterChrome.observationDocSummary.marSummary.prnReminder")}</li>
        <li style={{ marginBottom: 0 }}>{t("encounterChrome.observationDocSummary.marSummary.reviewBeforeDischarge")}</li>
      </ul>
    </div>
  );
}
