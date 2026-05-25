"use client";

import React from "react";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

function MicrophoneGlyph() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 10.25c1.2 0 2.1-.9 2.1-2.1V3.6c0-1.2-.9-2.1-2.1-2.1s-2.1.9-2.1 2.1v4.55c0 1.2.9 2.1 2.1 2.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.75 7.75a4.25 4.25 0 0 0 8.5 0M8 12v2.5M5.75 14.5h4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Microphone focus affordance for Dragon / voice dictation (UI only — no save model change). */
export function DictationFieldLabel({
  label,
  dictationTargetId,
  dictationLabel,
  readOnly = false,
  readOnlyLabel,
}: {
  label: string;
  dictationTargetId: string;
  dictationLabel: string;
  readOnly?: boolean;
  readOnlyLabel?: string;
}) {
  const focusDictationField = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(dictationTargetId) as HTMLTextAreaElement | null;
    if (!el || el.disabled) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    el.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.18)";
    el.style.background = "#fefce8";
    window.setTimeout(() => {
      el.style.boxShadow = "";
      el.style.background = "";
    }, 1200);
  };
  const microphoneTitle = readOnly ? readOnlyLabel : dictationLabel;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
      <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
      <button
        type="button"
        disabled={readOnly}
        title={microphoneTitle}
        aria-label={microphoneTitle}
        onClick={focusDictationField}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: 9999,
          border: "1px solid #cbd5e1",
          background: readOnly ? "#f1f5f9" : "#fff",
          color: readOnly ? "#94a3b8" : "#0f766e",
          cursor: readOnly ? "not-allowed" : "pointer",
        }}
      >
        <MicrophoneGlyph />
      </button>
    </span>
  );
}
