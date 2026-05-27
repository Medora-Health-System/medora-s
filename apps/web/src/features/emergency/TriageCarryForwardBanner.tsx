"use client";

import React from "react";
import type { TriageCarryForwardFieldKey, TriageCarryForwardMeta } from "@/features/emergency/triageCarryForward";
import { buildTriageCarryForwardSummary } from "@/features/emergency/triageCarryForward";
import { useI18n } from "@/lib/i18n";

const STATUS_LABEL_KEY: Record<
  NonNullable<TriageCarryForwardMeta["reviewStatus"]>,
  "erTriage.carryForward.carryForwardStatusPending" | "erTriage.carryForward.carryForwardStatusReviewed" | "erTriage.carryForward.carryForwardStatusModified" | "erTriage.carryForward.carryForwardStatusRemoved"
> = {
  pending_review: "erTriage.carryForward.carryForwardStatusPending",
  reviewed: "erTriage.carryForward.carryForwardStatusReviewed",
  modified: "erTriage.carryForward.carryForwardStatusModified",
  removed: "erTriage.carryForward.carryForwardStatusRemoved",
};

const FIELD_LABEL_KEY: Record<TriageCarryForwardFieldKey, `erTriage.carryForward.${string}`> = {
  allergies: "erTriage.carryForward.carryForwardFieldAllergies",
  homeMedications: "erTriage.carryForward.carryForwardFieldHomeMedications",
  medicalHistory: "erTriage.carryForward.carryForwardFieldMedicalHistory",
  surgicalHistory: "erTriage.carryForward.carryForwardFieldSurgicalHistory",
  smokingHistory: "erTriage.carryForward.carryForwardFieldSmoking",
  alcoholUse: "erTriage.carryForward.carryForwardFieldAlcohol",
  substanceUse: "erTriage.carryForward.carryForwardFieldSubstance",
};

export function TriageCarryForwardBanner({
  meta,
  formDisabled,
  onMarkReviewed,
}: {
  meta: TriageCarryForwardMeta | null;
  formDisabled: boolean;
  onMarkReviewed: () => void;
}) {
  const { t, language } = useI18n();
  if (!meta || !Object.keys(meta.fields).length) return null;

  const summary = buildTriageCarryForwardSummary(meta);
  const sourceDate =
    summary.sourceEncounterDate != null
      ? new Date(summary.sourceEncounterDate).toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div
      role="note"
      data-testid="triage-carry-forward-banner"
      style={{
        marginBottom: 12,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        color: "#78350f",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("erTriage.carryForward.bannerTitle")}</div>
      <div style={{ marginBottom: 6 }}>
        {t("erTriage.carryForward.bannerSource").replace("{date}", sourceDate)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {(Object.keys(meta.fields) as TriageCarryForwardFieldKey[]).map((fieldKey) => (
          <span
            key={fieldKey}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              color: "#92400e",
            }}
          >
            {t(FIELD_LABEL_KEY[fieldKey])}
          </span>
        ))}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            background: "#fff",
            border: "1px solid #e2e8f0",
            color: "#475569",
          }}
        >
          {t(STATUS_LABEL_KEY[meta.reviewStatus])}
        </span>
      </div>
      {meta.reviewStatus !== "reviewed" && meta.reviewStatus !== "removed" ? (
        <button
          type="button"
          disabled={formDisabled}
          onClick={onMarkReviewed}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d97706",
            background: "#fff",
            color: "#92400e",
            fontWeight: 600,
            fontSize: 12,
            cursor: formDisabled ? "not-allowed" : "pointer",
            minHeight: 44,
          }}
        >
          {t("erTriage.carryForward.markReviewed")}
        </button>
      ) : null}
    </div>
  );
}

export function TriageCarryForwardSectionBadge({
  fieldKey,
  meta,
}: {
  fieldKey: TriageCarryForwardFieldKey;
  meta: TriageCarryForwardMeta | null;
}) {
  const { t } = useI18n();
  if (!meta?.fields[fieldKey]) return null;
  return (
    <span
      data-testid={`triage-carry-forward-badge-${fieldKey}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        background: "#fef3c7",
        border: "1px solid #fcd34d",
        color: "#92400e",
      }}
    >
      {t("erTriage.carryForward.sectionBadge")}
    </span>
  );
}
