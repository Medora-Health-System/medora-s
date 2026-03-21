"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await parseApiResponse(response)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "Une erreur s'est produite. Réessayez.";
        setError(
          normalizeUserFacingError(errorMessage) || "Une erreur s'est produite. Réessayez."
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError("Service indisponible. Réessayez plus tard.");
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
            Mot de passe oublié
          </h2>
          <p
            style={{
              margin: "0 0 28px 0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Saisissez votre adresse courriel. Si un compte existe, un lien de réinitialisation vous sera envoyé.
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
                Si ce compte existe, un lien de réinitialisation a été envoyé. Vérifiez votre messagerie (et les courriels indésirables).
              </div>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  fontSize: 14,
                  color: "#1a365d",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  Adresse courriel
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="vous@exemple.org"
                  autoComplete="email"
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
                {loading ? "Envoi…" : "Envoyer le lien"}
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
                  ← Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
