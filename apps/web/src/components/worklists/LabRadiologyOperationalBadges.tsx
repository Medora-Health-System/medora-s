"use client";

import React from "react";
import { MedoraCardBadge } from "@/components/medora-card";
import {
  labRadEscalationBadgeSoftStyle,
  type LabRadEscalationBadgeModel,
} from "@/features/orders/labRadiologyOperationalEscalationUi";
import {
  labRadReconciliationBadgeSoftStyle,
  type LabRadReconciliationBadgeModel,
} from "@/features/orders/labRadiologyOperationalReconciliationUi";

export function LabRadiologyOperationalBadges({
  reconciliationBadges,
  escalationBadges,
  t,
  compact,
}: {
  reconciliationBadges: LabRadReconciliationBadgeModel[];
  escalationBadges: LabRadEscalationBadgeModel[];
  t: (key: string) => string;
  compact?: boolean;
}) {
  if (!reconciliationBadges.length && !escalationBadges.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 4 : 6,
        marginTop: compact ? 4 : 6,
      }}
    >
      {escalationBadges.map((b) => {
        const soft = labRadEscalationBadgeSoftStyle(b.tone);
        return (
          <span key={`esc-${b.flag}`} title={b.titleKey ? t(b.titleKey) : undefined}>
            <MedoraCardBadge soft={soft}>{t(b.labelKey)}</MedoraCardBadge>
          </span>
        );
      })}
      {reconciliationBadges.map((b) => {
        const soft = labRadReconciliationBadgeSoftStyle(b.tone);
        return (
          <span key={`rec-${b.flag}`} title={b.titleKey ? t(b.titleKey) : undefined}>
            <MedoraCardBadge soft={soft}>{t(b.labelKey)}</MedoraCardBadge>
          </span>
        );
      })}
    </div>
  );
}
