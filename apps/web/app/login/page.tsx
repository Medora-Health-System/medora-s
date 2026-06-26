"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPostLoginDestinationForAuthUser } from "@/lib/landingRoute";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import { invalidateAuthMeSessionCache } from "@/lib/authSessionMe";
import { notifyAuthSessionRestored } from "@/lib/authShellRecovery";
import { useI18n } from "@/lib/i18n";
import { messageForAuthErrorCode, pickAuthErrorCodeOrLegacyMessage } from "@/lib/authApiErrorCode";
import { MfaChallengePanel } from "./MfaChallengePanel";
import { MfaEnrollmentPanel } from "@/components/mfa/MfaEnrollmentPanel";
import styles from "./page.module.css";

function LoginSuspenseFallback() {
  const { t } = useI18n();
  return <div style={{ padding: 48, textAlign: "center" }}>{t("auth.login.suspenseLoading")}</div>;
}

type AuthUserShape = {
  facilityRoles?: { facilityId: string; role?: string }[];
  msppRoles?: unknown;
};

type Stage =
  | { kind: "credentials" }
  | { kind: "mfa_challenge"; challengeToken: string }
  | { kind: "mfa_enrollment"; enrollmentToken: string };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "credentials" });

  /**
   * Phase 9 patch — language correctness. The MFA panels render *before* a
   * session is issued, so they have no access to `/auth/me` or facility data.
   * The API returns `preferredLanguage` (derived from the user's primary
   * facility) on the MFA branches; switch the i18n locale here so the panels
   * render in the correct language. We only switch to a supported value.
   */
  const applyPreferredLanguage = (lang?: string) => {
    if (!lang) return;
    const norm = lang.trim().toLowerCase();
    if (norm === "fr" || norm === "en") {
      if (norm !== language) setLanguage(norm);
    }
  };

  const navigateAfterAuth = (user?: AuthUserShape) => {
    invalidateAuthMeSessionCache();
    notifyAuthSessionRestored();
    const facilityRoles = (user?.facilityRoles ?? []) as { facilityId: string; role?: string }[];
    const msppRolesRaw = user?.msppRoles;
    const msppRoles = Array.isArray(msppRolesRaw)
      ? msppRolesRaw.filter((x): x is string => typeof x === "string")
      : [];
    const dest = getPostLoginDestinationForAuthUser(
      facilityRoles.map((fr) => ({ facilityId: String(fr.facilityId), role: String(fr.role ?? "") })),
      searchParams.get("redirect"),
      msppRoles
    );
    router.push(dest);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await parseApiResponse(response)) as {
        errorCode?: string;
        error?: string;
        message?: string;
        user?: AuthUserShape;
        mfaRequired?: boolean;
        mfaChallengeToken?: string;
        mfaEnrollmentRequired?: boolean;
        mfaEnrollmentToken?: string;
        preferredLanguage?: string;
      } | null;

      if (!response.ok) {
        const { code, legacyMessage } = pickAuthErrorCodeOrLegacyMessage(data ?? {});
        const mapped =
          code != null
            ? messageForAuthErrorCode(t, code, "auth.login.errorFallback")
            : normalizeUserFacingError(legacyMessage, language);
        setError(mapped || t("auth.login.errorFallback"));
        setLoading(false);
        return;
      }

      if (data?.mfaRequired && data.mfaChallengeToken) {
        applyPreferredLanguage(data.preferredLanguage);
        setStage({ kind: "mfa_challenge", challengeToken: data.mfaChallengeToken });
        setLoading(false);
        setPassword("");
        return;
      }

      if (data?.mfaEnrollmentRequired && data.mfaEnrollmentToken) {
        applyPreferredLanguage(data.preferredLanguage);
        setStage({ kind: "mfa_enrollment", enrollmentToken: data.mfaEnrollmentToken });
        setLoading(false);
        setPassword("");
        return;
      }

      navigateAfterAuth(data?.user);
    } catch {
      setError(t("auth.login.errorNetwork"));
      setLoading(false);
    }
  };

  const cancelMfa = () => {
    setStage({ kind: "credentials" });
    setError(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <div style={{ maxWidth: 420 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(3rem, 8vw, 5.25rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#60a5fa" }}>Medora</span>
            <span style={{ color: "#2dd4bf" }}>-S</span>
          </h1>
        </div>
      </div>

      <div className={styles.formSide}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#fff",
            padding: "40px 40px 32px",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {stage.kind === "credentials" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
                aria-label={t("auth.login.languageToggleAria")}
              >
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{t("auth.login.languageLabel")}</span>
                <button
                  type="button"
                  onClick={() => setLanguage("fr")}
                  aria-pressed={language === "fr"}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: language === "fr" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    backgroundColor: language === "fr" ? "#eff6ff" : "#fff",
                    color: language === "fr" ? "#1d4ed8" : "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("auth.login.langFr")}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  aria-pressed={language === "en"}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: language === "en" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    backgroundColor: language === "en" ? "#eff6ff" : "#fff",
                    color: language === "en" ? "#1d4ed8" : "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("auth.login.langEn")}
                </button>
              </div>
              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  letterSpacing: "-0.01em",
                }}
              >
                {t("auth.login.title")}
              </h2>
              <p
                style={{
                  margin: "0 0 28px 0",
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                {t("auth.login.subtitle")}
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="username"
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#334155",
                    }}
                  >
                    {t("auth.login.usernameLabel")}
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    placeholder={t("auth.login.usernamePlaceholder")}
                    autoComplete="username"
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

                <div style={{ marginBottom: 8 }}>
                  <label
                    htmlFor="password"
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#334155",
                    }}
                  >
                    {t("auth.login.passwordLabel")}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

                <div style={{ marginBottom: 24, textAlign: "right" }}>
                  <Link
                    href="/mot-de-passe-oublie"
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      textDecoration: "none",
                    }}
                  >
                    {t("auth.login.forgotPasswordLink")}
                  </Link>
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
                  {loading ? t("auth.login.submitting") : t("auth.login.submit")}
                </button>
              </form>
            </>
          )}

          {stage.kind === "mfa_challenge" && (
            <MfaChallengePanel
              challengeToken={stage.challengeToken}
              onSuccess={(d) => navigateAfterAuth(d.user)}
              onCancel={cancelMfa}
            />
          )}

          {stage.kind === "mfa_enrollment" && (
            <MfaEnrollmentPanel
              enrollmentToken={stage.enrollmentToken}
              onComplete={(d) => navigateAfterAuth(d.user)}
              onCancel={cancelMfa}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
