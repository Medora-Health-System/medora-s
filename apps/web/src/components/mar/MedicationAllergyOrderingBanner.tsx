"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  findMarAllergyCandidatesForMedicationName,
  type MarAllergyCandidate,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { fetchMedicationAdministrationHistory } from "@/lib/medicationAdministrationHistoryApi";

export type MedicationAllergyOrderingBannerProps = {
  facilityId: string;
  encounterId: string;
  medicationName: string | null | undefined;
  onContinueOrder?: () => void;
  onReviewDetails?: () => void;
};

function historyEntriesToCandidates(
  entries: import("@medora/shared").MedicationAdministrationHistoryEntry[]
): MarAllergyCandidate[] {
  return entries
    .filter(
      (e) => e.eventType === "ALLERGY_REVIEW_RECOMMENDED" && !e.allergyReviewDismissedAt?.trim()
    )
    .map((e) => ({
      candidateId: e.allergyReviewCandidateId ?? e.id,
      medicationName: e.allergyReviewMedicationName ?? e.medicationLabel,
      medicationClass: null,
      reactionText: e.allergyReviewReactionText ?? "",
      reactionCategory: (e.allergyReviewRecommendationLevel ??
        "REVIEW_RECOMMENDED") as MarAllergyCandidate["reactionCategory"],
      detectedAt: e.eventAt,
      documentedBy: e.allergyReviewDocumentedBy ?? e.performedByDisplay,
      recommendationLevel: (e.allergyReviewRecommendationLevel ??
        "REVIEW_RECOMMENDED") as MarAllergyCandidate["recommendationLevel"],
    }));
}

export function MedicationAllergyOrderingBanner({
  facilityId,
  encounterId,
  medicationName,
  onContinueOrder,
  onReviewDetails,
}: MedicationAllergyOrderingBannerProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<
    import("@medora/shared").MedicationAdministrationHistoryEntry[]
  >([]);

  useEffect(() => {
    if (!medicationName?.trim()) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    void fetchMedicationAdministrationHistory(encounterId, facilityId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, encounterId, medicationName]);

  const matchingHighPriority = useMemo(() => {
    const candidates = historyEntriesToCandidates(entries);
    return findMarAllergyCandidatesForMedicationName(candidates, medicationName).filter(
      (c) => c.recommendationLevel === "HIGH_PRIORITY_REVIEW"
    );
  }, [entries, medicationName]);

  if (matchingHighPriority.length === 0) return null;

  return (
    <div
      data-testid="mar-allergy-ordering-banner"
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        fontSize: 13,
        color: "#991b1b",
      }}
    >
      <div style={{ fontWeight: 600 }}>{t("marAllergyReview.ordering.banner")}</div>
      <div style={{ marginTop: 4 }}>{t("marAllergyReview.ordering.guidance")}</div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          data-testid="mar-allergy-ordering-continue"
          onClick={onContinueOrder}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("marAllergyReview.ordering.continueOrder")}
        </button>
        {onReviewDetails ? (
          <button
            type="button"
            data-testid="mar-allergy-ordering-review-details"
            onClick={onReviewDetails}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t("marAllergyReview.ordering.reviewDetails")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
