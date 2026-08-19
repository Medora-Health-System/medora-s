"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { fetchMedicationAdministrationHistory } from "@/lib/medicationAdministrationHistoryApi";

export type MedicationAllergyReviewProviderNoticeProps = {
  facilityId: string;
  encounterId: string;
  onReviewDetails?: () => void;
  /** INP.2E.1 — skip history GET until enabled (timeline-first MAR). */
  loadEnabled?: boolean;
};

export function MedicationAllergyReviewProviderNotice({
  facilityId,
  encounterId,
  onReviewDetails,
  loadEnabled = true,
}: MedicationAllergyReviewProviderNoticeProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<MedicationAdministrationHistoryEntry[]>([]);

  useEffect(() => {
    if (!loadEnabled) {
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
  }, [facilityId, encounterId, loadEnabled]);

  const activeRecommendations = useMemo(() => {
    return entries.filter(
      (e) =>
        e.eventType === "ALLERGY_REVIEW_RECOMMENDED" && !e.allergyReviewDismissedAt?.trim()
    );
  }, [entries]);

  if (activeRecommendations.length === 0) return null;

  return (
    <div
      data-testid="mar-allergy-review-provider-notice"
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #fde68a",
        background: "#fffbeb",
        fontSize: 13,
        color: "#78350f",
      }}
    >
      <div style={{ fontWeight: 600 }}>{t("marAllergyReview.provider.notice")}</div>
      {onReviewDetails ? (
        <button
          type="button"
          data-testid="mar-allergy-review-provider-details-link"
          onClick={onReviewDetails}
          style={{
            marginTop: 6,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#1d4ed8",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t("marAllergyReview.provider.reviewDetails")}
        </button>
      ) : null}
    </div>
  );
}
