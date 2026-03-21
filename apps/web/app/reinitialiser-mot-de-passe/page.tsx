"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";

function ReinitialiserMotDePasseContent() {
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
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
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
              : "Lien invalide ou expiré. Demandez un nouveau lien.";
        setError(
          normalizeUserFacingError(errorMessage) || "Lien invalide ou expiré. Demandez un nouveau lien."
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
              Lien invalide
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#64748b" }}>
              Ce lien de réinitialisation est invalide ou incomplet. Demandez un nouveau lien depuis la page « Mot de passe oublié ».
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
              Demander un nouveau lien
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
              Retour à la connexion
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
            Choisissez un nouveau mot de passe pour votre compte.
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
            Nouveau mot de passe
          </h2>
          <p
            style={{
              margin: "0 0 28px 0",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Saisissez et confirmez votre nouveau mot de passe (au moins 8 caractères).
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
                Mot de passe réinitialisé. Vous pouvez vous connecter.
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
                Aller à la connexion
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
                  Nouveau mot de passe
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
                  Confirmer le mot de passe
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
                {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
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

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={<div className={styles.root} style={{ padding: 24 }}>Chargement…</div>}>
      <ReinitialiserMotDePasseContent />
    </Suspense>
  );
}
