"use client";

import { useEffect, useState } from "react";
import {
  fetchEncounterFacilityFeeReadiness,
  type EncounterFacilityFeeReadinessPayload,
} from "@/lib/facilityFeeReadinessApi";
import { useI18n } from "@/lib/i18n";

type Props = {
  facilityId: string | null | undefined;
  encounterId: string;
  enabled?: boolean;
};

/** Lightweight operational facility-fee hint — informational only, non-blocking. */
export function FacilityFeeOperationalHint({ facilityId, encounterId, enabled = true }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<EncounterFacilityFeeReadinessPayload | null>(null);

  useEffect(() => {
    if (!enabled || !facilityId || !encounterId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void fetchEncounterFacilityFeeReadiness(facilityId, encounterId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, facilityId, encounterId]);

  if (!enabled || !data) return null;

  const flags = data.operationalFlags;
  const showHint =
    flags.extendedObservation ||
    flags.boardingReview ||
    flags.observationCandidate ||
    flags.inpatientReview ||
    data.requiresManualReview;

  if (!showHint) return null;

  let labelKey = "facilityFeeReadiness.hintOperationalReview";
  if (flags.extendedObservation) labelKey = "facilityFeeReadiness.flagExtendedObservation";
  else if (flags.inpatientReview) labelKey = "facilityFeeReadiness.flagInpatientReview";
  else if (flags.observationCandidate) labelKey = "facilityFeeReadiness.flagObservationCandidate";
  else if (flags.boardingReview) labelKey = "facilityFeeReadiness.flagBoardingReview";

  return (
    <span
      data-testid="facility-fee-operational-hint"
      style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}
      title={t("facilityFeeReadiness.previewOnlyDisclaimer")}
    >
      {t(labelKey)}
    </span>
  );
}
