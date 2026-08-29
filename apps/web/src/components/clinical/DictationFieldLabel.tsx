"use client";

import React from "react";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

function MicrophoneGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" fill="none">
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
  /** Place the mic on the far right of a full-width section header (sketch-aligned). */
  alignEnd = false,
  /** Larger mic control so the affordance is unmistakable in documentation editors. */
  prominent = false,
}: {
  label: string;
  dictationTargetId: string;
  dictationLabel: string;
  readOnly?: boolean;
  readOnlyLabel?: string;
  alignEnd?: boolean;
  prominent?: boolean;
}) {
  const focusDictationField = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(dictationTargetId) as HTMLTextAreaElement | null;
    if (!el || el.disabled) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* some browsers reject setSelectionRange on disabled/non-text inputs */
    }
    el.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.28)";
    el.style.background = "#eff6ff";
    el.style.borderColor = "#93c5fd";
    window.setTimeout(() => {
      el.style.boxShadow = "";
      el.style.background = "";
      el.style.borderColor = "";
    }, 1400);
  };
  const microphoneTitle = readOnly ? readOnlyLabel : dictationLabel;
  const btnSize = prominent ? 34 : 24;
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: alignEnd ? "space-between" : undefined,
        gap: 8,
        flexWrap: "wrap",
        width: alignEnd ? "100%" : undefined,
        marginBottom: 6,
      }}
    >
      <span
        style={{
          ...labelStyle,
          marginBottom: 0,
          fontSize: prominent ? 13 : 12,
          fontWeight: prominent ? 700 : 600,
          color: "#0f172a",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        disabled={readOnly}
        title={microphoneTitle}
        aria-label={microphoneTitle}
        data-testid={dictationTargetId ? `dictation-mic-${dictationTargetId}` : undefined}
        onClick={focusDictationField}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: btnSize,
          height: btnSize,
          borderRadius: 9999,
          border: prominent ? "1.5px solid #93c5fd" : "1px solid #cbd5e1",
          background: readOnly ? "#f1f5f9" : prominent ? "#eff6ff" : "#fff",
          color: readOnly ? "#94a3b8" : "#1d4ed8",
          cursor: readOnly ? "not-allowed" : "pointer",
          boxShadow: prominent && !readOnly ? "0 1px 2px rgba(37, 99, 235, 0.12)" : undefined,
          flexShrink: 0,
        }}
      >
        <MicrophoneGlyph size={prominent ? 16 : 13} />
      </button>
    </span>
  );
}
