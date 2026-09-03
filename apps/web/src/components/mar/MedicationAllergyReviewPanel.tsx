"use client";

import React, { useMemo, useState } from "react";
import {
  formatMarShiftTimelineClinicalDateTime,
  resolveMarAllergyReviewRecommendationMessageKey,
  type MarAllergyCandidate,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { dismissMarAllergyReviewRecommendation } from "@/lib/marAllergyReviewApi";
import { productUiBcp47Tag } from "@/i18n/config";

export type MedicationAllergyReviewPanelProps = {
  encounterId: string;
  administrationId: string;
  candidates: MarAllergyCandidate[];
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onDismissed?: () => void | Promise<void>;
};

export function MedicationAllergyReviewPanel({
  encounterId,
  administrationId,
  candidates,
  facilityTimeZone = null,
  readOnly = false,
  onDismissed,
}: MedicationAllergyReviewPanelProps) {
  const { t, language } = useI18n();
  const dateLocale = productUiBcp47Tag(language);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCandidates = useMemo(
    () => candidates.filter((c) => c.recommendationLevel !== "NONE" && !c.dismissedAt?.trim()),
    [candidates]
  );

  if (activeCandidates.length === 0) return null;

  const formatInstant = (iso: string | null | undefined) =>
    iso?.trim()
      ? formatMarShiftTimelineClinicalDateTime(iso, dateLocale, facilityTimeZone ?? undefined)
      : null;

  const handleDismiss = async (candidateId: string) => {
    setError(null);
    setSubmittingId(candidateId);
    try {
      await dismissMarAllergyReviewRecommendation({
        encounterId,
        administrationId,
        candidateId,
      });
      await onDismissed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marAllergyReview.panel.dismissError"));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section
      data-testid="mar-allergy-review-panel"
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #fde68a",
        background: "#fffbeb",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#92400e" }}>
        {t("marAllergyReview.panel.title")}
      </h3>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#78350f" }}>
        {t("marAllergyReview.panel.advisoryOnly")}
      </p>

      {activeCandidates.map((candidate) => {
        const messageKey = resolveMarAllergyReviewRecommendationMessageKey(
          candidate.recommendationLevel
        );
        const recommendationLabel = messageKey ? t(messageKey) : candidate.recommendationLevel;

        return (
          <div
            key={candidate.candidateId}
            data-testid="mar-allergy-review-candidate"
            data-recommendation-level={candidate.recommendationLevel}
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #fcd34d",
              background: "#ffffff",
              fontSize: 13,
            }}
          >
            <div
              data-testid="mar-allergy-review-recommendation"
              style={{ fontWeight: 600, color: "#b45309" }}
            >
              {t("marAllergyReview.panel.recommendationLabel")}: {recommendationLabel}
            </div>
            <div style={{ marginTop: 4, color: "#334155" }}>
              {t("marAllergyReview.panel.medication")}: {candidate.medicationName}
            </div>
            <div style={{ marginTop: 4, color: "#334155" }}>
              {t("marAllergyReview.panel.reaction")}: {candidate.reactionText}
            </div>
            <div style={{ marginTop: 4, color: "#475569" }}>
              {t("marAllergyReview.panel.time")}: {formatInstant(candidate.detectedAt)}
            </div>
            {candidate.documentedBy?.trim() ? (
              <div style={{ marginTop: 4, color: "#475569" }}>
                {t("marAllergyReview.panel.reporter")}: {candidate.documentedBy}
              </div>
            ) : null}

            {!readOnly ? (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-testid="mar-allergy-review-review-button"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    /* informational only — future allergy workflow */
                  }}
                >
                  {t("marAllergyReview.panel.reviewAllergy")}
                </button>
                <button
                  type="button"
                  data-testid="mar-allergy-review-dismiss-button"
                  disabled={submittingId === candidate.candidateId}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: 12,
                    cursor: submittingId === candidate.candidateId ? "wait" : "pointer",
                  }}
                  onClick={() => void handleDismiss(candidate.candidateId)}
                >
                  {t("marAllergyReview.panel.dismissRecommendation")}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {error ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>
      ) : null}
    </section>
  );
}
