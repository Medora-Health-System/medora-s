"use client";

/**
 * Phase 9 — MFA enrollment panel.
 *
 * Two callable modes:
 *   * `enrollmentToken` provided  → forced-enrollment branch from login (no
 *     access cookie yet); we forward the token to the BFF.
 *   * `enrollmentToken` omitted   → already-logged-in user adding MFA from
 *     /app/account/mfa.
 *
 * Renders QR + manual secret on init, then a 6-digit confirmation step,
 * then the recovery codes panel. The plaintext TOTP secret is only displayed
 * during the init/verify steps and discarded as soon as enrollment succeeds.
 */

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { parseApiResponse } from "@/lib/apiClient";
import { messageForAuthErrorCode, pickAuthErrorCodeOrLegacyMessage } from "@/lib/authApiErrorCode";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MfaRecoveryCodesPanel } from "./MfaRecoveryCodesPanel";

type InitResponse = {
  pending?: boolean;
  otpauthUri?: string;
  qrCodeDataUrl?: string;
  error?: string;
};

function extractSecretFromOtpauthUri(uri: string): string | null {
  try {
    const u = new URL(uri);
    const s = u.searchParams.get("secret");
    return s && s.trim() ? s.trim() : null;
  } catch {
    return null;
  }
}

type VerifyResponse = {
  enabled?: boolean;
  recoveryCodes?: string[];
  user?: { facilityRoles?: { facilityId: string; role?: string }[]; msppRoles?: string[] };
  error?: string;
};

type Props = {
  enrollmentToken?: string;
  /** Called once recovery codes have been acknowledged. */
  onComplete?: (data: VerifyResponse) => void;
  onCancel?: () => void;
};

export function MfaEnrollmentPanel({ enrollmentToken, onComplete, onCancel }: Props) {
  const { t, language } = useI18n();

  const [step, setStep] = useState<"loading" | "scan" | "codes" | "error">("loading");
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<VerifyResponse | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const beginEnrollment = async () => {
    setStep("loading");
    setBootError(null);
    try {
      const res = await fetch("/api/auth/mfa/enroll/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollmentToken ? { enrollmentToken } : {}),
      });
      const data = (await parseApiResponse(res)) as InitResponse | null;
      if (!res.ok || !data?.qrCodeDataUrl || !data?.otpauthUri) {
        const d = data as { errorCode?: string; error?: string; message?: string } | null;
        const { code, legacyMessage } = pickAuthErrorCodeOrLegacyMessage(d ?? {});
        setBootError(
          code != null
            ? messageForAuthErrorCode(t, code, "auth.mfa.errorGeneric")
            : normalizeUserFacingError(legacyMessage, language) || t("auth.mfa.errorGeneric")
        );
        setStep("error");
        return;
      }
      setOtpauthUri(data.otpauthUri);
      setQrUrl(data.qrCodeDataUrl);
      setSecret(extractSecretFromOtpauthUri(data.otpauthUri));
      setStep("scan");
    } catch {
      setBootError(t("auth.mfa.errorGeneric"));
      setStep("error");
    }
  };

  useEffect(() => {
    void beginEnrollment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentToken]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = { code: code.trim() };
      if (enrollmentToken) body.enrollmentToken = enrollmentToken;
      const res = await fetch("/api/auth/mfa/enroll/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await parseApiResponse(res)) as VerifyResponse | null;
      if (!res.ok) {
        const d = data as { errorCode?: string; error?: string; message?: string } | null;
        const { code, legacyMessage } = pickAuthErrorCodeOrLegacyMessage(d ?? {});
        setVerifyError(
          code != null
            ? messageForAuthErrorCode(t, code, "auth.mfa.errorInvalid")
            : normalizeUserFacingError(legacyMessage, language) ||
                (res.status === 401 ? t("auth.mfa.errorInvalid") : t("auth.mfa.errorGeneric"))
        );
        setSubmitting(false);
        return;
      }
      setRecoveryCodes(data?.recoveryCodes ?? []);
      setCompleted(data ?? null);
      setStep("codes");
      setSecret(null);
      setOtpauthUri(null);
      setQrUrl(null);
      setSubmitting(false);
    } catch {
      setVerifyError(t("auth.mfa.errorGeneric"));
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return <div style={{ padding: 24, textAlign: "center", color: "#475569" }}>{t("auth.mfa.submitting")}</div>;
  }

  if (step === "error") {
    return (
      <div>
        <p role="alert" style={{ color: "#b91c1c", marginBottom: 16 }}>
          {bootError ?? t("auth.mfa.errorGeneric")}
        </p>
        <button
          type="button"
          onClick={() => beginEnrollment()}
          style={{
            padding: "10px 16px",
            backgroundColor: "#1a365d",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t("auth.mfa.setupRegenerate")}
        </button>
      </div>
    );
  }

  if (step === "codes") {
    return (
      <MfaRecoveryCodesPanel
        codes={recoveryCodes}
        onAcknowledge={() => onComplete?.(completed ?? {})}
      />
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }}>
        {t("auth.mfa.setupTitle")}
      </h2>
      <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#64748b" }}>{t("auth.mfa.setupIntro")}</p>

      {qrUrl && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="" width={208} height={208} style={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
        </div>
      )}

      {secret && (
        <details style={{ marginBottom: 20 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#475569" }}>
            {t("auth.mfa.setupCannotScan")}
          </summary>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>{t("auth.mfa.setupSecretLabel")}</div>
            <code
              style={{
                display: "block",
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: 14,
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {secret}
            </code>
          </div>
        </details>
      )}

      <form onSubmit={submitCode}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
          {t("auth.mfa.setupVerifyHeading")}
        </h3>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b" }}>{t("auth.mfa.setupVerifyHelper")}</p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder={t("auth.mfa.codePlaceholder")}
          disabled={submitting}
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
            marginBottom: 12,
          }}
        />

        {verifyError && (
          <div role="alert" style={{ marginBottom: 12, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
            {verifyError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#1a365d",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting || code.length !== 6 ? 0.7 : 1,
          }}
        >
          {submitting ? t("auth.mfa.submitting") : t("auth.mfa.submit")}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ background: "none", border: "none", padding: 0, color: "#475569", fontSize: 13, cursor: "pointer" }}
            >
              {t("auth.mfa.setupCancel")}
            </button>
          )}
          <button
            type="button"
            onClick={() => beginEnrollment()}
            style={{ background: "none", border: "none", padding: 0, color: "#475569", fontSize: 13, cursor: "pointer", marginLeft: "auto" }}
          >
            {t("auth.mfa.setupRegenerate")}
          </button>
        </div>

        {/* keep otpauthUri reachable for screen readers / debugging */}
        {otpauthUri && <span style={{ display: "none" }} aria-hidden>{otpauthUri}</span>}
      </form>
    </div>
  );
}
