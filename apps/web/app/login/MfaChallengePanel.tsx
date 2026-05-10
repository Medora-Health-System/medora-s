"use client";

/**
 * Phase 9 — MFA challenge panel (post-password step on the login page).
 *
 * Stays mounted on the login page when the BFF returns `mfaRequired: true`.
 * Holds the short-lived `mfaChallengeToken` in memory only — never localStorage.
 */

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { parseApiResponse } from "@/lib/apiClient";
import { messageForAuthErrorCode, pickAuthErrorCodeOrLegacyMessage } from "@/lib/authApiErrorCode";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type Props = {
  challengeToken: string;
  onSuccess: (data: { user?: { facilityRoles?: { facilityId: string; role?: string }[]; msppRoles?: string[] } }) => void;
  onCancel: () => void;
};

export function MfaChallengePanel({ challengeToken, onSuccess, onCancel }: Props) {
  const { t, language } = useI18n();
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [usingRecovery, setUsingRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { challengeToken };
      if (usingRecovery) body.recoveryCode = recoveryCode.trim();
      else body.code = code.trim();

      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await parseApiResponse(res)) as { user?: any; error?: string } | null;
      if (!res.ok) {
        const d = data as { errorCode?: string; error?: string; message?: string } | null;
        const { code, legacyMessage } = pickAuthErrorCodeOrLegacyMessage(d ?? {});
        setError(
          code != null
            ? messageForAuthErrorCode(t, code, "auth.mfa.errorInvalid")
            : normalizeUserFacingError(legacyMessage, language) ||
                (res.status === 401 ? t("auth.mfa.errorInvalid") : t("auth.mfa.errorGeneric"))
        );
        setLoading(false);
        return;
      }
      onSuccess(data ?? {});
    } catch {
      setError(t("auth.mfa.errorGeneric"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }}>
        {t("auth.mfa.title")}
      </h2>
      <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#64748b" }}>
        {t("auth.mfa.challengeIntro")}
      </p>

      {!usingRecovery && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="mfa-code" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500, color: "#334155" }}>
            {t("auth.mfa.codeLabel")}
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={t("auth.mfa.codePlaceholder")}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 18,
              letterSpacing: "0.25em",
              textAlign: "center",
              color: "#1e293b",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      )}

      {usingRecovery && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="mfa-recovery" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500, color: "#334155" }}>
            {t("auth.mfa.recoveryCodeLabel")}
          </label>
          <input
            id="mfa-recovery"
            type="text"
            autoComplete="off"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
            placeholder={t("auth.mfa.recoveryCodePlaceholder")}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 15,
              letterSpacing: "0.05em",
              color: "#1e293b",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      )}

      <div style={{ marginBottom: 20, textAlign: "right" }}>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setUsingRecovery((v) => !v);
            setCode("");
            setRecoveryCode("");
          }}
          style={{ background: "none", border: "none", padding: 0, color: "#475569", fontSize: 13, cursor: "pointer" }}
        >
          {usingRecovery ? t("auth.mfa.useTotpCode") : t("auth.mfa.useRecoveryCode")}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: 16, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 16px",
          backgroundColor: "#1a365d",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? t("auth.mfa.submitting") : t("auth.mfa.submit")}
      </button>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: "none", border: "none", padding: 0, color: "#475569", fontSize: 13, cursor: "pointer" }}
        >
          {t("auth.mfa.backToLogin")}
        </button>
      </div>
    </form>
  );
}
