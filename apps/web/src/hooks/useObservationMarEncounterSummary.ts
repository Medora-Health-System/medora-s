"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import {
  computeObservationMarEncounterSummary,
  type ObservationMarEncounterSummary,
} from "@/lib/observationMarEncounterSummary";
import type { SupportedLanguage } from "@/i18n/config";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { perfClinicalDataLog } from "./encounterClinicalDataPerf";
import type { EncounterClinicalDataValue } from "./encounterClinicalDataTypes";

export type UseObservationMarEncounterSummaryArgs = {
  encounterId: string;
  facilityId: string;
  refreshKey: string;
  enabled: boolean;
  language: SupportedLanguage;
  t: (key: string) => string;
  /** When provided, reuse shared encounter clinical data instead of direct API fetches. */
  clinicalData?: EncounterClinicalDataValue | null;
  /** When false, suppresses 60s polling (e.g. MAR/Orders tab active). */
  pollingEnabled?: boolean;
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
  clinicalData = null,
  pollingEnabled = true,
}: UseObservationMarEncounterSummaryArgs): {
  summary: ObservationMarEncounterSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [summary, setSummary] = useState<ObservationMarEncounterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const standaloneLoadInFlightRef = useRef(false);
  const clinicalDataRef = useRef(clinicalData);
  clinicalDataRef.current = clinicalData;

  const computeFromArrays = useCallback(
    (orders: unknown[], admins: unknown[], eventsRaw: unknown[]) => {
      return computeObservationMarEncounterSummary(orders, admins, eventsRaw, Date.now(), language, t);
    },
    [language, t]
  );

  const recomputeFromSharedCache = useCallback(() => {
    const cd = clinicalDataRef.current;
    if (!cd) return;
    setSummary(computeFromArrays(cd.orders, cd.medicationAdministrations, cd.orderEvents));
  }, [computeFromArrays]);

  const standaloneLoad = useCallback(async () => {
    if (!enabled || !encounterId.trim() || !facilityId.trim()) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (standaloneLoadInFlightRef.current) return;
    standaloneLoadInFlightRef.current = true;
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
      const [o, a, ev] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/order-events`, { facilityId }).catch(() => []),
      ]);
      const serverOrders = Array.isArray(o) ? o : [];
      const serverAdmins = Array.isArray(a) ? a : [];
      const eventsRaw = Array.isArray(ev) ? ev : [];
      const orders = mergeOrders(serverOrders, pendingOrders);
      const admins = [...serverAdmins, ...pendingAdmins];
      setSummary(computeFromArrays(orders, admins, eventsRaw));
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(
        normalizeUserFacingError(raw.trim() || null, language) ||
          t("encounterChrome.observationDocSummary.marSummary.loadFailed")
      );
      setSummary(null);
    } finally {
      standaloneLoadInFlightRef.current = false;
      setLoading(false);
    }
  }, [enabled, encounterId, facilityId, language, t, computeFromArrays]);

  const sharedLoading = useMemo(() => {
    if (!clinicalData) return false;
    return (
      clinicalData.loading.orders ||
      clinicalData.loading.mar ||
      clinicalData.loading.orderEvents
    );
  }, [clinicalData]);

  useEffect(() => {
    if (!enabled || !encounterId.trim() || !facilityId.trim()) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (clinicalData) {
      perfClinicalDataLog("observation MAR summary using shared clinical data");
      if (sharedLoading && clinicalData.orders.length === 0 && clinicalData.medicationAdministrations.length === 0) {
        setLoading(true);
        return;
      }
      const ordersErr = clinicalData.errors.orders;
      const marErr = clinicalData.errors.mar;
      if (ordersErr || marErr) {
        setError(
          normalizeUserFacingError(ordersErr || marErr, language) ||
            t("encounterChrome.observationDocSummary.marSummary.loadFailed")
        );
        setSummary(null);
        setLoading(false);
        return;
      }
      setError(null);
      setSummary(
        computeFromArrays(
          clinicalData.orders,
          clinicalData.medicationAdministrations,
          clinicalData.orderEvents
        )
      );
      setLoading(false);
      return;
    }

    void standaloneLoad();
  }, [
    enabled,
    encounterId,
    facilityId,
    refreshKey,
    clinicalData,
    clinicalData?.orders,
    clinicalData?.medicationAdministrations,
    clinicalData?.orderEvents,
    clinicalData?.errors.orders,
    clinicalData?.errors.mar,
    sharedLoading,
    standaloneLoad,
    computeFromArrays,
    language,
    t,
  ]);

  useEffect(() => {
    if (!enabled || !pollingEnabled) return;

    if (clinicalData) {
      const id = setInterval(() => {
        perfClinicalDataLog("observation MAR polling recompute from shared cache");
        recomputeFromSharedCache();
      }, 60_000);
      return () => clearInterval(id);
    }

    const id = setInterval(() => {
      if (standaloneLoadInFlightRef.current) return;
      void standaloneLoad();
    }, 60_000);
    return () => clearInterval(id);
  }, [enabled, pollingEnabled, clinicalData, recomputeFromSharedCache, standaloneLoad]);

  const reload = useCallback(async () => {
    if (clinicalData) {
      await clinicalData.refresh("ordersAndEvents", { reason: "manual", force: true });
      await clinicalData.refresh("mar", { reason: "manual", force: true });
      recomputeFromSharedCache();
      return;
    }
    await standaloneLoad();
  }, [clinicalData, recomputeFromSharedCache, standaloneLoad]);

  return { summary, loading, error, reload };
}
