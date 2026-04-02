"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirm) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
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
        setMessage(data.error || "Erreur.");
      } else {
        setMessage("Mot de passe mis à jour.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      setMessage("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1>Paramètres</h1>

      <h3>Changer mon mot de passe</h3>

      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label>Mot de passe actuel</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Nouveau mot de passe</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Confirmer</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Chargement..." : "Mettre à jour"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: "#333" }}>{message}</p>
      )}
    </div>
  );
}
