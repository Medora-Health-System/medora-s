"use client";

import React from "react";
import { MedoraCardBadge } from "@/components/medora-card";
import {
  labRadReconciliationBadgeSoftStyle,
  type LabRadReconciliationBadgeModel,
} from "@/features/orders/labRadiologyOperationalReconciliationUi";

export function LabRadiologyReconciliationBadges({
  badges,
  t,
  compact,
}: {
  badges: LabRadReconciliationBadgeModel[];
  t: (key: string) => string;
  compact?: boolean;
}) {
  if (!badges.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 4 : 6,
        marginTop: compact ? 4 : 6,
      }}
    >
      {badges.map((b) => {
        const soft = labRadReconciliationBadgeSoftStyle(b.tone);
        return (
          <span key={b.flag} title={b.titleKey ? t(b.titleKey) : undefined}>
            <MedoraCardBadge soft={soft}>{t(b.labelKey)}</MedoraCardBadge>
          </span>
        );
      })}
    </div>
  );
}
