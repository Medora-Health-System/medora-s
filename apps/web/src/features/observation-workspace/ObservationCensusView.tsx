"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalCareActivePatientsSection } from "@/features/hospital-care/HospitalCareActivePatientsSection";
import { HospitalCareIncomingPlacementSection } from "@/features/hospital-care/HospitalCareIncomingPlacementSection";
import {
  fetchHospitalCensus,
  type HospitalCensusResponse,
} from "@/features/hospital-care/hospitalCareCensusApi";
import {
  fetchFacilityPlacementQueue,
  isForbiddenApiError,
  isHospitalBoardObservationReceivingRow,
  type HospitalCarePlacementQueueRow,
} from "@/features/hospital-care/hospitalCarePlacementApi";

/**
 * D3E.6A — Observation census from canonical hospital census (open encounters).
 * Does not mix Med/Surg/ICU bed maps into this clinical tab.
 */
export function ObservationCensusView() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [census, setCensus] = useState<HospitalCensusResponse | null>(null);
  const [incoming, setIncoming] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    if (!facilityId?.trim()) return Promise.resolve();
    return Promise.all([
      fetchHospitalCensus("OBSERVATION", { facilityId }),
      fetchFacilityPlacementQueue(),
    ]).then(([data, queue]) => {
      setCensus(data);
      setIncoming(
        queue.availability === "ENABLED"
          ? queue.items.filter((r) => isHospitalBoardObservationReceivingRow(r))
          : []
      );
    });
  };

  useEffect(() => {
    let cancelled = false;
    if (!ready || !facilityId?.trim()) {
      setLoading(!ready);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, queue] = await Promise.all([
          fetchHospitalCensus("OBSERVATION", { facilityId }),
          fetchFacilityPlacementQueue(),
        ]);
        if (!cancelled) {
          setCensus(data);
          setIncoming(
            queue.availability === "ENABLED"
              ? queue.items.filter((r) => isHospitalBoardObservationReceivingRow(r))
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCensus(null);
          setIncoming([]);
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3ca.loadError")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, ready, facilityId]);

  const observationCount = useMemo(
    () => (census?.summary.activeObservation ?? 0) + incoming.length,
    [census, incoming.length]
  );

  return (
    <HospitalCareShell
      active="observation"
      title={t("observationD3d.census.title")}
      subtitle={t("hospitalCareD3e6a.observationTab.subtitle")}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : census ? (
        <>
          <p
            style={{ fontSize: 13, color: "#334155", marginBottom: 8 }}
            data-testid="observation-census-count"
          >
            {t("hospitalCareD3e6a.observationTab.count").replace(
              "{count}",
              String(observationCount)
            )}
          </p>
          <HospitalCareIncomingPlacementSection
            surface="OBSERVATION"
            rows={incoming}
            onReload={async () => {
              await reload();
            }}
          />
          <HospitalCareActivePatientsSection census={census} defaultContext="OBSERVATION" />
        </>
      ) : null}
    </HospitalCareShell>
  );
}
