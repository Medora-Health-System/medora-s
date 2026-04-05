"use client";

import React from "react";
import type { PriorityBadgeSoft } from "./medoraCardTokens";
import { NEUTRAL_BADGE, PATHWAY_BADGE, SYNC_PENDING_BADGE } from "./medoraCardTokens";

export type MedoraCardBadgePreset = "neutral" | "pathway" | "syncPending";

export type MedoraCardBadgeProps = {
  children: React.ReactNode;
  /** Use soft colors from tokens (priority, custom status, etc.) */
  preset?: MedoraCardBadgePreset;
  soft?: PriorityBadgeSoft;
};

export function MedoraCardBadge({ children, preset = "neutral", soft }: MedoraCardBadgeProps) {
  let colors: PriorityBadgeSoft = NEUTRAL_BADGE;
  if (soft) {
    colors = soft;
  } else if (preset === "pathway") {
    colors = PATHWAY_BADGE;
  } else if (preset === "syncPending") {
    colors = SYNC_PENDING_BADGE;
  } else {
    colors = NEUTRAL_BADGE;
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </span>
  );
}
