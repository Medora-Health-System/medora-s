"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import {
  computeObservationMarEncounterSummary,
  type ObservationMarEncounterSummary,
} from "@/lib/observationMarEncounterSummary";
import type { SupportedLanguage } from "@/i18n/config";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export type UseObservationMarEncounterSummaryArgs = {
  encounterId: string;
  facilityId: string;
  refreshKey: string;
  enabled: boolean;
  language: SupportedLanguage;
  t: (key: string) => string;
};

/**
 * Single fetch path for observation MAR digest (orders + administrations + order events),
 * shared by documentation summary and workflow chrome.
 */
export function useObservationMarEncounterSummary({
  encounterId,
  facilityId,
  refreshKey,
  enabled,
  language,
  t,
}: UseObservationMarEncounterSummaryArgs): {
  summary: ObservationMarEncounterSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [summary, setSummary] = useState<ObservationMarEncounterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !encounterId.trim() || !facilityId.trim()) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }
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
      setError(
        normalizeUserFacingError(raw.trim() || null, language) ||
          t("encounterChrome.observationDocSummary.marSummary.loadFailed")
      );
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, encounterId, facilityId, language, t]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [enabled, load]);

  return { summary, loading, error, reload: load };
}
