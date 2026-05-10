"use client";

/**
 * Phase 9 — Recovery codes one-time display panel.
 *
 * Shown:
 *   * after successful MFA enrollment, and
 *   * after `regenerate` returns a new set.
 *
 * Codes are kept in component state only and never persisted by the BFF or
 * the browser beyond what the user explicitly downloads or copies.
 */

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
  codes: string[];
  onAcknowledge: () => void;
};

export function MfaRecoveryCodesPanel({ codes, onAcknowledge }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copy failed — leave UI in idle state
    }
  };

  const handleDownload = () => {
    const blob = new Blob([codes.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medora-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }}>
        {t("auth.mfa.recoveryCodesTitle")}
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#64748b" }}>{t("auth.mfa.recoveryCodesIntro")}</p>

      <div
        role="alert"
        style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: "#fef9c3",
          color: "#854d0e",
          borderRadius: 6,
          border: "1px solid #fde68a",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {t("auth.mfa.recoveryCodesWarning")}
      </div>

      <ul
        style={{
          margin: "0 0 16px 0",
          padding: 16,
          listStyle: "none",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          rowGap: 6,
          columnGap: 12,
          fontFamily: "ui-monospace,Menlo,monospace",
          fontSize: 14,
          color: "#0f172a",
        }}
      >
        {codes.map((c, i) => (
          <li key={`${c}-${i}`} style={{ userSelect: "all" }}>
            {c}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: "#fff",
            color: "#1a365d",
            border: "1px solid #1a365d",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {copied ? t("auth.mfa.recoveryCodesCopied") : t("auth.mfa.recoveryCodesCopy")}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: "#fff",
            color: "#1a365d",
            border: "1px solid #1a365d",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t("auth.mfa.recoveryCodesDownload")}
        </button>
      </div>

      <button
        type="button"
        onClick={onAcknowledge}
        style={{
          width: "100%",
          padding: "12px 16px",
          backgroundColor: "#1a365d",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {t("auth.mfa.recoveryCodesDone")}
      </button>
    </div>
  );
}
