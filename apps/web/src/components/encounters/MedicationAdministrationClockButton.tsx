"use client";

import React from "react";

export function MedicationAdministrationClockButton({
  enabled,
  title,
  onClick,
}: {
  enabled: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={!enabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        minHeight: 36,
        padding: 0,
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: enabled ? "#fff" : "#f1f5f9",
        color: enabled ? "#334155" : "#94a3b8",
        cursor: enabled ? "pointer" : "not-allowed",
        fontSize: 16,
        lineHeight: 1,
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      🧭
    </button>
  );
}

export function MedicationAdministrationDocumentButton({
  title,
  onClick,
  disabled,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isDisabled = disabled === true;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        minHeight: 36,
        padding: 0,
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: isDisabled ? "#f1f5f9" : "#fff",
        color: isDisabled ? "#94a3b8" : "#334155",
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontSize: 15,
        lineHeight: 1,
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      📋
    </button>
  );
}

export function MedicationAdministrationAdjustedBadge({
  label,
  title,
}: {
  label: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 9999,
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
        maxWidth: "100%",
      }}
    >
      {label}
    </span>
  );
}
