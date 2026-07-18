"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MedicationRecommendationShadowCard } from "@/components/medications/MedicationRecommendationShadowCard";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchPhase16ExposableRecommendations,
  submitPhase16Feedback,
  type Phase16RecommendationRow,
} from "@/lib/medicationPhase16RecommendationApi";

export default function ProviderMedicationRecommendationsPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const canAccess =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const [rows, setRows] = useState<Phase16RecommendationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    try {
      setRows(await fetchPhase16ExposableRecommendations(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase16Recommendations.errorLoad")
      );
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.accessDenied")}</p>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase16Recommendations.providerTitle")}
        </h1>
        <Link href="/app/provider" style={{ fontSize: 14 }}>
          {t("medicationPhase16Recommendations.backProvider")}
        </Link>
        <button type="button" onClick={() => void load()}>
          {t("medicationPhase16Recommendations.refresh")}
        </button>
      </div>
      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationPhase16Recommendations.providerBanner")}
      </p>
      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p style={{ color: "#64748b", margin: 0 }}>
          {t("medicationPhase16Recommendations.emptyProvider")}
        </p>
      ) : (
        rows.map((row) => (
          <MedicationRecommendationShadowCard
            key={row.id}
            row={row}
            busy={busyId === row.id}
            onAcknowledge={() => {
              if (!facilityId) return;
              setBusyId(row.id);
              void submitPhase16Feedback(facilityId, row.id, {
                feedbackType: "ACKNOWLEDGED",
              })
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase16Recommendations.errorLoad")
                  )
                )
                .finally(() => setBusyId(null));
            }}
            onReject={() => {
              if (!facilityId) return;
              setBusyId(row.id);
              void submitPhase16Feedback(facilityId, row.id, {
                feedbackType: "REJECTED",
                notes: "Provider rejected as information only",
              })
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase16Recommendations.errorLoad")
                  )
                )
                .finally(() => setBusyId(null));
            }}
          />
        ))
      )}
    </div>
  );
}
