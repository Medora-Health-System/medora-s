"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export default function SettingsPage() {
  const { t, language } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirm) {
      setMessage(t("auth.settings.mismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setMessage(t("auth.settings.minLength"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const raw =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "";
        setMessage(
          normalizeUserFacingError(raw, language) || t("auth.settings.errorGeneric")
        );
      } else {
        setMessage(t("auth.settings.success"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      setMessage(t("auth.settings.serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1>{t("auth.settings.title")}</h1>

      <p style={{ margin: "12px 0 24px 0" }}>
        <Link href="/app/settings/mfa" style={{ color: "#1a365d", fontWeight: 500 }}>
          {t("auth.mfa.manageTitle")} →
        </Link>
      </p>

      <h3>{t("auth.settings.changePasswordHeading")}</h3>

      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="settings-current-password">{t("auth.settings.currentPasswordLabel")}</label>
          <input
            id="settings-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="settings-new-password">{t("auth.settings.newPasswordLabel")}</label>
          <input
            id="settings-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="settings-confirm-password">{t("auth.settings.confirmPasswordLabel")}</label>
          <input
            id="settings-confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t("auth.settings.submitting") : t("auth.settings.submit")}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: "#333" }}>{message}</p>
      )}
    </div>
  );
}
