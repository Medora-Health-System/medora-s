"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterGovernedRoomDisplay,
  type EncounterRoomContext,
} from "@/lib/governedRoomDisplay";

export type EncounterGovernedRoomChipProps = {
  encounter: EncounterRoomContext;
  clickable?: boolean;
  onClick?: () => void;
  labelKey?: "encounterChrome.room" | "printOutput.patientChart.room" | "encounterChrome.labelRoom";
  compact?: boolean;
  alignSelf?: React.CSSProperties["alignSelf"];
};

export type EncounterGovernedRoomInlineProps = {
  encounter: EncounterRoomContext;
  clickable?: boolean;
  onClick?: () => void;
  labelKey?: "encounterChrome.labelRoom";
};

function chipShellStyle(
  compact: boolean,
  alignSelf: React.CSSProperties["alignSelf"],
  interactive: boolean
): React.CSSProperties {
  return {
    padding: compact ? "6px 10px" : "8px 12px",
    alignSelf,
    borderRadius: 10,
    border: "1px solid #bae6fd",
    backgroundColor: "#f0f9ff",
    textAlign: "center",
    minWidth: compact ? 76 : 88,
    maxWidth: 132,
    boxSizing: "border-box",
    ...(interactive ? { cursor: "pointer" } : {}),
  };
}

/** Governed room chip for encounter headers (K.10B.10 / K.10B.10A). */
export function EncounterGovernedRoomChip({
  encounter,
  clickable = false,
  onClick,
  labelKey = "encounterChrome.labelRoom",
  compact = false,
  alignSelf = "flex-end",
}: EncounterGovernedRoomChipProps) {
  const { t } = useI18n();
  const roomDisplay = formatEncounterGovernedRoomDisplay(encounter, t);
  const interactive = clickable && Boolean(onClick);
  const tooltip = t("roomAssignment.changeRoomTooltip");

  const labelStyle: React.CSSProperties = {
    fontSize: compact ? 8 : 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0369a1",
  };

  const valueStyle: React.CSSProperties = {
    marginTop: compact ? 1 : 2,
    fontSize: compact ? 14 : 16,
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#0c4a6e",
    fontVariantNumeric: "tabular-nums",
    wordBreak: "break-word",
  };

  const shellStyle = chipShellStyle(compact, alignSelf, interactive);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={tooltip}
        title={tooltip}
        style={{
          ...shellStyle,
          cursor: "pointer",
          font: "inherit",
          display: "block",
        }}
      >
        <div style={labelStyle}>{t(labelKey)}</div>
        <div style={valueStyle}>{roomDisplay}</div>
      </button>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={labelStyle}>{t(labelKey)}</div>
      <div style={valueStyle}>{roomDisplay}</div>
    </div>
  );
}

/** Inline governed room label for encounter header metadata rows. */
export function EncounterGovernedRoomInline({
  encounter,
  clickable = false,
  onClick,
  labelKey = "encounterChrome.labelRoom",
}: EncounterGovernedRoomInlineProps) {
  const { t } = useI18n();
  const roomDisplay = formatEncounterGovernedRoomDisplay(encounter, t);
  const interactive = clickable && Boolean(onClick);
  const tooltip = t("roomAssignment.changeRoomTooltip");
  const label = `${t(labelKey)}:`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={tooltip}
        title={tooltip}
        style={{
          margin: 0,
          padding: 0,
          border: "none",
          background: "none",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "#64748b" }}>{label}</span> {roomDisplay}
      </button>
    );
  }

  return (
    <div>
      <span style={{ color: "#64748b" }}>{label}</span> {roomDisplay}
    </div>
  );
}
