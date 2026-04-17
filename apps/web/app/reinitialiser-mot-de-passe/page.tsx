"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

function ResetPasswordSuspenseFallback() {
  const { t } = useI18n();
  return (
    <div className={styles.root} style={{ padding: 24 }}>
      {t("auth.login.suspenseLoading")}
    </div>
  );
}

function ReinitialiserMotDePasseContent() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [missingParams, setMissingParams] = useState(false);

  useEffect(() => {
    setMissingParams(!id || !token);
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("auth.resetPassword.mismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.resetPassword.minLength"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, newPassword }),
      });

      const data = (await parseApiResponse(response)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "";
        setError(
          normalizeUserFacingError(errorMessage, language) || t("auth.resetPassword.invalidLinkFallback")
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(t("auth.resetPassword.serviceUnavailable"));
      setLoading(false);
    }
  };

  if (missingParams) {
    return (
      <div className={styles.root}>
        <div className={styles.brand}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 600 }}>
              Medora-S
            </h1>
          </div>
        </div>
        <div className={styles.formSide}>
          <div
            style={{
              maxWidth: 400,
              backgroundColor: "#fff",
              padding: 40,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", color: "#1e293b" }}>
              {t("auth.resetPassword.invalidParamsTitle")}
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#64748b" }}>
              {t("auth.resetPassword.invalidParamsBody")}
            </p>
            <Link
              href="/mot-de-passe-oublie"
              style={{
                display: "inline-block",
                fontSize: 14,
                color: "#1a365d",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {t("auth.resetPassword.requestNewLink")}
            </Link>
            <span style={{ margin: "0 8px", color: "#94a3b8" }}>|</span>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                color: "#475569",
                textDecoration: "none",
              }}
            >
              {t("auth.resetPassword.returnToSignIn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <div style={{ maxWidth: 420 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Medora-S
          </h1>
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              fontSize: "clamp(0.9375rem, 2vw, 1rem)",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
            }}
          >
            {t("auth.resetPassword.brandTagline")}
          </p>
        </div>
      </div>

      <div className={styles.formSide}>
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "#fff",
            padding: "40px 40px 32px",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#1e293b",
              letterSpacing: "-0.01em",
            }}
          >
            {t("auth.resetPassword.title")}
          </h2>
          <p
            style={{
              margin: "0 0 28px 0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            {t("auth.resetPassword.subtitle")}
          </p>

          {success ? (
            <div>
              <div
                role="status"
                style={{
                  marginBottom: 24,
                  padding: 12,
                  backgroundColor: "#f0fdf4",
                  color: "#166534",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                {t("auth.resetPassword.successBody")}
              </div>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  padding: "12px 16px",
                  backgroundColor: "#1a365d",
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 15,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {t("auth.resetPassword.goToSignIn")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="newPassword"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  {t("auth.resetPassword.newPasswordLabel")}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 15,
                    color: "#1e293b",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="confirmPassword"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  {t("auth.resetPassword.confirmPasswordLabel")}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 15,
                    color: "#1e293b",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    marginBottom: 20,
                    padding: 12,
                    backgroundColor: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
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
                {loading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
              </button>

              <p style={{ marginTop: 20, marginBottom: 0, textAlign: "center" }}>
                <Link
                  href="/login"
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    textDecoration: "none",
                  }}
                >
                  {t("auth.resetPassword.backToSignIn")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={<ResetPasswordSuspenseFallback />}>
      <ReinitialiserMotDePasseContent />
    </Suspense>
  );
}
