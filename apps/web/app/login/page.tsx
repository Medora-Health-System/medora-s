"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPostLoginDestinationForAuthUser } from "@/lib/landingRoute";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import styles from "./page.module.css";

const loginCopy = {
  suspenseLoading: "Loading...",
  title: "Sign in",
  subtitle: "Enter your credentials to access the chart.",
  usernameLabel: "Email or username",
  usernamePlaceholder: "Email or username",
  passwordLabel: "Password",
  forgotPasswordLink: "Forgot password?",
  submit: "Login",
  submitting: "Signing in...",
  errorFallback: "Unable to sign in. Please try again.",
  errorNetwork: "Unable to sign in. Check your connection and try again.",
};

function LoginSuspenseFallback() {
  return <div style={{ padding: 48, textAlign: "center" }}>{loginCopy.suspenseLoading}</div>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        error?: string;
        message?: string;
        user?: { facilityRoles?: unknown; msppRoles?: unknown };
      } | null;

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "";
        setError(
          normalizeUserFacingError(errorMessage, language) || loginCopy.errorFallback
        );
        setLoading(false);
        return;
      }

      const facilityRoles = (data?.user?.facilityRoles ?? []) as { facilityId: string; role?: string }[];
      const msppRolesRaw = data?.user?.msppRoles;
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
    } catch (err) {
      setError(loginCopy.errorNetwork);
      setLoading(false);
    }
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
            {loginCopy.title}
          </h2>
          <p
            style={{
              margin: "0 0 28px 0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            {loginCopy.subtitle}
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
                {loginCopy.usernameLabel}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder={loginCopy.usernamePlaceholder}
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
                {loginCopy.passwordLabel}
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
                {loginCopy.forgotPasswordLink}
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
              {loading ? loginCopy.submitting : loginCopy.submit}
            </button>
          </form>
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
