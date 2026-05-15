"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import {
  computeObservationMarEncounterSummary,
  type ObservationMarEncounterSummary,
} from "@/lib/observationMarEncounterSummary";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export function ObservationMarEncounterSummaryBlock({
  encounterId,
  facilityId,
  refreshKey,
}: {
  encounterId: string;
  facilityId: string;
  /** Bump when encounter data that affects orders/MAR may have changed. */
  refreshKey: string;
}) {
  const { t, language } = useI18n();
  const [summary, setSummary] = useState<ObservationMarEncounterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingAdmins, pendingOrders] = await Promise.all([
        getPendingMedicationAdminsFromQueue(
          facilityId,
          encounterId,
          t("marTab.pendingSyncFirstName"),
          t("marTab.pendingSyncLastName")
        ).catch(() => []),
        getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]),
      ]);
      const [o, a] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
      ]);
      let eventsRaw: unknown[] = [];
      try {
        const ev = await apiFetch(`/encounters/${encounterId}/order-events`, { facilityId });
        eventsRaw = Array.isArray(ev) ? ev : [];
      } catch {
        eventsRaw = [];
      }
      const serverOrders = Array.isArray(o) ? o : [];
      const serverAdmins = Array.isArray(a) ? a : [];
      const orders = mergeOrders(serverOrders, pendingOrders);
      const admins = [...serverAdmins, ...pendingAdmins];
      setSummary(computeObservationMarEncounterSummary(orders, admins, eventsRaw, Date.now(), language, t));
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(normalizeUserFacingError(raw.trim() || null, language) || t("encounterChrome.observationDocSummary.marSummary.loadFailed"));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language, t]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

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
        {summary.pendingMedicationLines > 0 ? (
          <li style={{ marginBottom: 4 }}>{t("encounterChrome.observationDocSummary.marSummary.prnReminder")}</li>
        ) : null}
        <li style={{ marginBottom: 0 }}>{t("encounterChrome.observationDocSummary.marSummary.reviewBeforeDischarge")}</li>
      </ul>
    </div>
  );
}
