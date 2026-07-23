"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalCareActivePatientsSection } from "@/features/hospital-care/HospitalCareActivePatientsSection";
import {
  fetchHospitalCensus,
  type HospitalCensusResponse,
} from "@/features/hospital-care/hospitalCareCensusApi";
import { isForbiddenApiError } from "@/features/hospital-care/hospitalCarePlacementApi";

/**
 * D3E.6A — Observation census from canonical hospital census (open encounters).
 * Does not mix Med/Surg/ICU bed maps into this clinical tab.
 */
export function ObservationCensusView() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [census, setCensus] = useState<HospitalCensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const data = await fetchHospitalCensus("OBSERVATION", { facilityId });
        if (!cancelled) setCensus(data);
      } catch (err) {
        if (!cancelled) {
          setCensus(null);
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
              String(census.summary.activeObservation)
            )}
          </p>
          <HospitalCareActivePatientsSection census={census} defaultContext="OBSERVATION" />
        </>
      ) : null}
    </HospitalCareShell>
  );
}
