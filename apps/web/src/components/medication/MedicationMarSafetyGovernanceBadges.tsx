"use client";

import React from "react";
import {
  getMedicationSafetyBadges,
  medicationSafetyGovernanceHasDisplay,
  type MedicationSafetyBadgeId,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { MedoraCardBadge } from "@/components/medora-card/MedoraCardBadge";
import type { PriorityBadgeSoft } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";

const BADGE_SOFT: Record<MedicationSafetyBadgeId, PriorityBadgeSoft> = {
  CONTROLLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  HIGH_ALERT: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  LASA: { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" },
  WITNESS_REQUIRED: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  DOUBLE_SIGN_REQUIRED: { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" },
  PHARMACY_VERIFY: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  PHARMACY_VERIFIED: { bg: "#ecfdf5", text: "#166534", border: "#bbf7d0" },
  WASTE_REQUIRED: { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
};

export function MedicationMarSafetyGovernanceBadges({
  governance,
  compact = false,
}: {
  governance: MedicationSafetyGovernanceDisplayInput;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (!medicationSafetyGovernanceHasDisplay(governance)) return null;

  const badgeIds = getMedicationSafetyBadges(governance);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 4 : 6,
        marginTop: compact ? 4 : 6,
      }}
      role="list"
      aria-label={t("marGovernance.badgesListAria")}
    >
      {badgeIds.map((id) => {
        const label = t(`marGovernance.badges.${id}`);
        return (
          <span
            key={id}
            role="listitem"
            aria-label={t("marGovernance.badgeAria").replace("{badge}", label)}
          >
            <MedoraCardBadge soft={BADGE_SOFT[id]} compact={compact}>
              {label}
            </MedoraCardBadge>
          </span>
        );
      })}
    </div>
  );
}
