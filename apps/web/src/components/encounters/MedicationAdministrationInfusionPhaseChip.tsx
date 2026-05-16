"use client";

import React from "react";
import { medicationAdministrationInfusionPhaseChipKind } from "@medora/shared";

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 9999,
  letterSpacing: "0.02em",
  lineHeight: 1.3,
  maxWidth: "100%",
  verticalAlign: "middle",
};

const START_CHIP_STYLE: React.CSSProperties = {
  ...CHIP_STYLE,
  background: "#e0f2fe",
  color: "#0369a1",
  border: "1px solid #bae6fd",
};

const STOP_CHIP_STYLE: React.CSSProperties = {
  ...CHIP_STYLE,
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
};

export function MedicationAdministrationInfusionPhaseChip({
  row,
  t,
}: {
  row: {
    marAction?: string | null;
    notes?: string | null;
    infusionPhase?: string | null;
  };
  t: (key: string) => string;
}) {
  const kind = medicationAdministrationInfusionPhaseChipKind(row);
  if (!kind) return null;
  const label =
    kind === "start"
      ? t("marTab.adminTime.infusionPhaseChipStart")
      : t("marTab.adminTime.infusionPhaseChipStop");
  return (
    <span style={kind === "start" ? START_CHIP_STYLE : STOP_CHIP_STYLE} title={label}>
      {label}
    </span>
  );
}
