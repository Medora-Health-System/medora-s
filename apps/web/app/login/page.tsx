"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPostLoginDestinationForAuthUser } from "@/lib/landingRoute";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import styles from "./page.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      const data = (await parseApiResponse(response)) as { error?: string; message?: string; user?: { facilityRoles?: unknown } } | null;

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "Échec de la connexion. Réessayez.";
        setError(normalizeUserFacingError(errorMessage) || "Échec de la connexion. Réessayez.");
        setLoading(false);
        return;
      }

      const facilityRoles = (data?.user?.facilityRoles ?? []) as { facilityId: string; role?: string }[];
      const dest = getPostLoginDestinationForAuthUser(
        facilityRoles.map((fr) => ({ facilityId: String(fr.facilityId), role: String(fr.role ?? "") })),
        searchParams.get("redirect")
      );
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError("Échec de la connexion. Vérifiez votre connexion et réessayez.");
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
            Dossier patient et suivi des soins pour structures de santé en milieu à ressources limitées.
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
            Connexion
          </h2>
          <p
            style={{
              margin: "0 0 28px 0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Saisissez vos identifiants pour accéder au dossier.
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
                Identifiant
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder="Courriel ou identifiant"
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
                Mot de passe
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
                Mot de passe oublié ?
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
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>Chargement…</div>}>
      <LoginForm />
    </Suspense>
  );
}
