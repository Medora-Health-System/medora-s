"use client";

/**
 * Phase 9 — MFA management page (account-scoped).
 *
 * Lets the logged-in user enable / disable / regenerate recovery codes for
 * TOTP MFA. Privileged roles (PROVIDER, ADMIN, MEDORA_SUPER_ADMIN, PHARMACY,
 * BILLING) cannot disable MFA via this page; the API enforces the policy.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { parseApiResponse } from "@/lib/apiClient";
import { MfaEnrollmentPanel } from "@/components/mfa/MfaEnrollmentPanel";
import { MfaRecoveryCodesPanel } from "@/components/mfa/MfaRecoveryCodesPanel";

type Status = {
  enabled: boolean;
  required: boolean;
  enabledAt?: string | null;
  lastVerifiedAt?: string | null;
};

type View =
  | { kind: "view" }
  | { kind: "enrolling" }
  | { kind: "regenerating"; code: string }
  | { kind: "disabling"; code: string }
  | { kind: "showCodes"; codes: string[] };

export default function MfaManagementPage() {
  const { t, language } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "view" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshStatus = async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/auth/mfa/status", { method: "GET" });
      const data = (await parseApiResponse(res)) as Status & { error?: string } | null;
      if (!res.ok) {
        setLoadError(typeof data?.error === "string" ? data.error : t("auth.mfa.manageGenericError"));
        return;
      }
      setStatus({
        enabled: Boolean(data?.enabled),
        required: Boolean(data?.required),
        enabledAt: data?.enabledAt ?? null,
        lastVerifiedAt: data?.lastVerifiedAt ?? null,
      });
    } catch {
      setLoadError(t("auth.mfa.manageGenericError"));
    }
  };

  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view.kind !== "disabling") return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: view.code.trim() }),
      });
      const data = (await parseApiResponse(res)) as { error?: string } | null;
      if (!res.ok) {
        setActionError(
          typeof data?.error === "string" && data.error.length > 0 ? data.error : t("auth.mfa.errorInvalid")
        );
        setSubmitting(false);
        return;
      }
      setActionMessage(t("auth.mfa.manageDisabledSuccess"));
      setView({ kind: "view" });
      await refreshStatus();
    } catch {
      setActionError(t("auth.mfa.manageGenericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view.kind !== "regenerating") return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/auth/mfa/recovery-codes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: view.code.trim() }),
      });
      const data = (await parseApiResponse(res)) as { recoveryCodes?: string[]; error?: string } | null;
      if (!res.ok || !Array.isArray(data?.recoveryCodes)) {
        setActionError(
          typeof data?.error === "string" && data.error.length > 0 ? data.error : t("auth.mfa.errorInvalid")
        );
        setSubmitting(false);
        return;
      }
      setActionMessage(t("auth.mfa.manageRegeneratedSuccess"));
      setView({ kind: "showCodes", codes: data.recoveryCodes });
    } catch {
      setActionError(t("auth.mfa.manageGenericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const card = {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#fff",
    padding: "32px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;

  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
            {t("auth.mfa.manageTitle")}
          </h1>
          <Link href="/app/settings" style={{ fontSize: 13, color: "#475569" }}>
            {t("auth.settings.title")}
          </Link>
        </div>

        {loadError && (
          <div role="alert" style={{ marginBottom: 16, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
            {loadError}
          </div>
        )}

        {actionMessage && view.kind !== "showCodes" && (
          <div role="status" style={{ marginBottom: 16, padding: 12, backgroundColor: "#ecfdf5", color: "#047857", borderRadius: 6, fontSize: 14 }}>
            {actionMessage}
          </div>
        )}

        {/* ---------------- View / status ---------------- */}
        {view.kind === "view" && status && (
          <>
            <p style={{ margin: "12px 0 16px 0", fontSize: 14, color: "#475569" }}>
              {status.enabled ? t("auth.mfa.manageIntroEnabled") : t("auth.mfa.manageIntroDisabled")}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 9999,
                  background: status.enabled ? "#dcfce7" : "#fef2f2",
                  color: status.enabled ? "#166534" : "#991b1b",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {status.enabled ? t("auth.mfa.manageStatusEnabled") : t("auth.mfa.manageStatusDisabled")}
              </span>
              {status.required && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: "#fef9c3",
                    color: "#854d0e",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t("auth.mfa.manageRequiredBadge")}
                </span>
              )}
            </div>

            {status.enabled && (
              <p style={{ margin: "0 0 24px 0", fontSize: 13, color: "#64748b" }}>
                {t("auth.mfa.manageLastVerified")}{" "}
                {status.lastVerifiedAt
                  ? new Date(status.lastVerifiedAt).toLocaleString(language)
                  : t("auth.mfa.manageNever")}
              </p>
            )}

            {!status.enabled && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setActionMessage(null);
                  setView({ kind: "enrolling" });
                }}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#1a365d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("auth.mfa.manageEnable")}
              </button>
            )}

            {status.enabled && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setActionMessage(null);
                    setView({ kind: "regenerating", code: "" });
                  }}
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "#fff",
                    color: "#1a365d",
                    border: "1px solid #1a365d",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {t("auth.mfa.manageRegenerate")}
                </button>
                {!status.required && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setActionMessage(null);
                      setView({ kind: "disabling", code: "" });
                    }}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "#fff",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {t("auth.mfa.manageDisable")}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ---------------- Enrolling ---------------- */}
        {view.kind === "enrolling" && (
          <MfaEnrollmentPanel
            onCancel={() => {
              setView({ kind: "view" });
            }}
            onComplete={async () => {
              setView({ kind: "view" });
              setActionMessage(t("auth.mfa.manageStatusEnabled"));
              await refreshStatus();
            }}
          />
        )}

        {/* ---------------- Disabling ---------------- */}
        {view.kind === "disabling" && (
          <form onSubmit={submitDisable}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
              {t("auth.mfa.manageDisableConfirmTitle")}
            </h2>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#64748b" }}>
              {t("auth.mfa.manageDisableConfirmBody")}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={view.code}
              onChange={(e) => setView({ kind: "disabling", code: e.target.value.replace(/[^0-9]/g, "") })}
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
            {actionError && (
              <div role="alert" style={{ marginBottom: 12, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
                {actionError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting || view.code.length !== 6}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting || view.code.length !== 6 ? 0.7 : 1,
                }}
              >
                {submitting ? t("auth.mfa.submitting") : t("auth.mfa.manageDisable")}
              </button>
              <button
                type="button"
                onClick={() => setView({ kind: "view" })}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- Regenerating ---------------- */}
        {view.kind === "regenerating" && (
          <form onSubmit={submitRegenerate}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
              {t("auth.mfa.manageRegenerateConfirmTitle")}
            </h2>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#64748b" }}>
              {t("auth.mfa.manageRegenerateConfirmBody")}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={view.code}
              onChange={(e) => setView({ kind: "regenerating", code: e.target.value.replace(/[^0-9]/g, "") })}
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
            {actionError && (
              <div role="alert" style={{ marginBottom: 12, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
                {actionError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting || view.code.length !== 6}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#1a365d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting || view.code.length !== 6 ? 0.7 : 1,
                }}
              >
                {submitting ? t("auth.mfa.submitting") : t("auth.mfa.manageRegenerate")}
              </button>
              <button
                type="button"
                onClick={() => setView({ kind: "view" })}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- Show recovery codes ---------------- */}
        {view.kind === "showCodes" && (
          <MfaRecoveryCodesPanel
            codes={view.codes}
            onAcknowledge={() => {
              setView({ kind: "view" });
              void refreshStatus();
            }}
          />
        )}
      </div>
    </div>
  );
}
