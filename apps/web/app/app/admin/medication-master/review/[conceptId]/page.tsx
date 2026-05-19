"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MedicationMasterValidationReview } from "@/components/admin/MedicationMasterValidationReview";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchMedicationMasterConcept, type MedicationMasterConceptDetail } from "@/lib/medicationMasterApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export default function MedicationMasterReviewPage() {
  const { t, language } = useI18n();
  const params = useParams();
  const conceptId = typeof params.conceptId === "string" ? params.conceptId : "";
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isFacilityOrPlatformAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [detail, setDetail] = useState<MedicationMasterConceptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId || !conceptId) {
      setError(t("medicationMasterValidation.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedicationMasterConcept(facilityId, conceptId);
      setDetail(data);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setDetail(null);
      setError(normalizeUserFacingError(raw, language) || t("medicationMasterValidation.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, conceptId, language, t]);

  useEffect(() => {
    if (!ready || !isFacilityOrPlatformAdmin || !conceptId) return;
    void load();
  }, [ready, isFacilityOrPlatformAdmin, conceptId, load]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isFacilityOrPlatformAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("medicationMasterValidation.accessDenied")}</p>
        <Link href="/app">{t("medicationMasterValidation.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/app/admin/medication-master" style={{ color: "#1a1a1a" }}>
        {t("medicationMasterValidation.backExplorer")}
      </Link>
      <h1 style={{ margin: "12px 0 4px 0" }}>{t("medicationMasterValidation.title")}</h1>
      <p style={{ color: "#475569", maxWidth: 720 }}>{t("medicationMasterValidation.intro")}</p>

      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        style={{ margin: "12px 0", padding: "8px 14px", borderRadius: 8 }}
      >
        {t("medicationMasterValidation.refresh")}
      </button>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {loading ? <p>{t("common.loading")}</p> : null}
      {!loading && detail ? <MedicationMasterValidationReview detail={detail} /> : null}
    </div>
  );
}
