"use client";

/**
 * Phase 9 — Admin MFA reset page.
 *
 * RBAC enforced server-side: ADMIN (same facility) or MEDORA_SUPER_ADMIN.
 * The page is intentionally minimal: identifier + confirm + audit message.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { parseApiResponse } from "@/lib/apiClient";

export default function AdminMfaResetPage() {
  const { t } = useI18n();
  const [userId, setUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mfa/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() }),
      });
      const data = (await parseApiResponse(res)) as
        | { reset?: boolean; sessionsRevoked?: number; error?: string; message?: string }
        | null;
      if (!res.ok || !data?.reset) {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          (typeof data?.message === "string" && data.message) ||
          t("auth.mfa.manageGenericError");
        setError(msg);
        setSubmitting(false);
        return;
      }
      setMessage(t("auth.mfa.adminResetSuccess"));
      setUserId("");
    } catch {
      setError(t("auth.mfa.manageGenericError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <p style={{ marginBottom: 12 }}>
        <Link href="/app/admin" style={{ color: "#475569" }}>
          ← {t("adminHub.title")}
        </Link>
      </p>

      <h1 style={{ margin: "0 0 8px 0", fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>
        {t("auth.mfa.adminResetTitle")}
      </h1>
      <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#475569" }}>{t("auth.mfa.adminResetIntro")}</p>

      <form
        onSubmit={submit}
        style={{
          padding: 24,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <label
          htmlFor="admin-mfa-userid"
          style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500, color: "#334155" }}
        >
          {t("auth.mfa.adminResetUserIdLabel")}
        </label>
        <input
          id="admin-mfa-userid"
          type="text"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoComplete="off"
          placeholder="00000000-0000-0000-0000-000000000000"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "ui-monospace,Menlo,monospace",
            color: "#1e293b",
            boxSizing: "border-box",
            outline: "none",
            marginBottom: 16,
          }}
        />

        {error && (
          <div role="alert" style={{ marginBottom: 12, padding: 12, backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 14 }}>
            {error}
          </div>
        )}
        {message && (
          <div role="status" style={{ marginBottom: 12, padding: 12, backgroundColor: "#ecfdf5", color: "#047857", borderRadius: 6, fontSize: 14 }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || userId.trim().length === 0}
          style={{
            padding: "10px 16px",
            backgroundColor: "#1a365d",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting || userId.trim().length === 0 ? 0.7 : 1,
          }}
        >
          {submitting ? t("auth.mfa.adminResetSubmitting") : t("auth.mfa.adminResetSubmit")}
        </button>
      </form>
    </div>
  );
}
