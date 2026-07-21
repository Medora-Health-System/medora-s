"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalCareActivePatientsSection } from "@/features/hospital-care/HospitalCareActivePatientsSection";
import {
  fetchHospitalCensus,
  type HospitalCensusResponse,
} from "@/features/hospital-care/hospitalCareCensusApi";
import { isForbiddenApiError } from "@/features/hospital-care/hospitalCarePlacementApi";

/**
 * D3E.6A — Inpatient census from canonical hospital census (open encounters).
 * Includes direct admissions without ED/Observation.
 */
export function InpatientCensusView() {
  const { t } = useI18n();
  const [census, setCensus] = useState<HospitalCensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHospitalCensus("INPATIENT");
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
  }, [t]);

  return (
    <HospitalCareShell
      active="inpatient"
      title={t("inpatientD3e.census.title")}
      subtitle={t("hospitalCareD3e6a.inpatientTab.subtitle")}
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
            data-testid="inpatient-census-count"
          >
            {t("hospitalCareD3e6a.inpatientTab.count").replace(
              "{count}",
              String(census.summary.activeInpatient)
            )}
          </p>
          <HospitalCareActivePatientsSection census={census} defaultContext="INPATIENT" />
        </>
      ) : null}
    </HospitalCareShell>
  );
}
