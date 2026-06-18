"use client";

import React from "react";
import type { EdClosedEncounterCertificationResult } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  resolveEdEncounterBillingReadinessTone,
  type EdEncounterBillingReadinessTone,
} from "@/features/emergency/edEncounterCertificationReviewModel";

type Props = {
  certification: EdClosedEncounterCertificationResult;
};

function toneStyle(tone: EdEncounterBillingReadinessTone) {
  if (tone === "ready_for_billing") {
    return { bg: "#d1fae5", border: "#6ee7b7", color: "#065f46" };
  }
  if (tone === "billing_deficiencies") {
    return { bg: "#fffbeb", border: "#fde68a", color: "#92400e" };
  }
  return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" };
}

export function EdEncounterBillingReadinessBadge({ certification }: Props) {
  const { t } = useI18n();
  const tone = resolveEdEncounterBillingReadinessTone(certification);
  const colors = toneStyle(tone);

  return (
    <span
      data-testid="ed-encounter-billing-readiness-badge"
      data-tone={tone}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
      }}
    >
      {t(`edLifecycle.certification.closeReview.billingTone.${tone}`)}
    </span>
  );
}
