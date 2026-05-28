"use client";

import type { EncounterFacilityFeeReadinessPayload } from "@/lib/facilityFeeReadinessApi";
import {
  facilityFeeCardBackground,
  facilityFeeCategoryLabelKey,
  facilityFeeReasonLabelKey,
  facilityFeeStatusLabelKey,
  observationOperationalStatusLabelKey,
} from "@/lib/facilityFeeReadinessDisplay";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: EncounterFacilityFeeReadinessPayload | null;
  loading?: boolean;
  error?: string | null;
};

export function EncounterFacilityFeeReadinessCard({ data, loading, error }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: 16, fontSize: 13, color: "#64748b" }}>{t("facilityFeeReadiness.loading")}</div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: 14,
          borderRadius: 8,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#b91c1c",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const bg = facilityFeeCardBackground(data.requiresManualReview);

  return (
    <div
      data-testid="facility-fee-readiness-card"
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("facilityFeeReadiness.cardTitle")}</h2>
      <p
        data-testid="facility-fee-readiness-disclaimer"
        style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("facilityFeeReadiness.previewOnlyDisclaimer")}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("facilityFeeReadiness.categoryLabel")}:</strong>{" "}
        {t(facilityFeeCategoryLabelKey(data.facilityFeeCategory))}
      </p>
      <p
        data-testid="facility-fee-observation-status"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("facilityFeeReadiness.observationStatusLabel")}:</strong>{" "}
        {t(observationOperationalStatusLabelKey(data.observationOperationalStatus))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("facilityFeeReadiness.readinessStatusLabel")}:</strong>{" "}
        {t(facilityFeeStatusLabelKey(data.readinessStatus))}
      </p>
      {data.requiresManualReview ? (
        <p
          data-testid="facility-fee-manual-review"
          style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("facilityFeeReadiness.manualReviewFlag")}
        </p>
      ) : null}
      {data.operationalFlags.observationCandidate ? (
        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#475569" }}>
          {t("facilityFeeReadiness.flagObservationCandidate")}
        </p>
      ) : null}
      {data.operationalFlags.extendedObservation ? (
        <p
          data-testid="facility-fee-extended-observation"
          style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e" }}
        >
          {t("facilityFeeReadiness.flagExtendedObservation")}
        </p>
      ) : null}
      {data.operationalFlags.boardingReview ? (
        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#475569" }}>
          {t("facilityFeeReadiness.flagBoardingReview")}
        </p>
      ) : null}
      {data.operationalFlags.inpatientReview ? (
        <p
          data-testid="facility-fee-inpatient-review"
          style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e" }}
        >
          {t("facilityFeeReadiness.flagInpatientReview")}
        </p>
      ) : null}
      {data.reasons.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("facilityFeeReadiness.missingItems")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
            {data.reasons.map((item) => (
              <li key={item}>{t(facilityFeeReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("facilityFeeReadiness.warnings")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
            {data.warnings.map((item) => (
              <li key={item}>{t(facilityFeeReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
