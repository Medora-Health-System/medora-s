"use client";

import { useState, type CSSProperties } from "react";
import type { PatientPortalAccessStatus, PatientPortalActivationIssue } from "@/lib/patientPortalAdminApi";
import { digitalCareFormatWhen, digitalCarePortalAccessActions, type PatientAppAccessKind } from "./digitalCareWorkspaceView";

const card: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "white",
};

const buttonBase: CSSProperties = {
  minHeight: 38,
  padding: "8px 12px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const KIND_TONE: Record<PatientAppAccessKind, { bg: string; text: string; border: string }> = {
  NOT_ACTIVATED: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  PENDING: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  EXPIRED: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  ACTIVE: { bg: "#ecfdf5", text: "#166534", border: "#86efac" },
  REVOKED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
};

export function DigitalCarePatientAppAccess({
  t,
  patientName,
  access,
  canActivate,
  canRevoke,
  busy,
  issuedCode,
  issuedExpiresAt,
  copied,
  lookupFailed,
  lookupError,
  onActivate,
  onRevoke,
  onCopy,
  onRefresh,
}: {
  t: (key: string) => string;
  patientName: string;
  access: PatientPortalAccessStatus | null;
  canActivate: boolean;
  canRevoke: boolean;
  busy: boolean;
  issuedCode: string | null;
  issuedExpiresAt: string | null;
  copied: boolean;
  lookupFailed?: boolean;
  lookupError?: string | null;
  onActivate: () => Promise<PatientPortalActivationIssue | void>;
  onRevoke: () => Promise<void>;
  onCopy: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<"activate" | "revoke" | null>(null);
  const actions = digitalCarePortalAccessActions({
    canActivate,
    canRevoke,
    access,
    lookupFailed: Boolean(lookupFailed),
  });
  const kind = actions.kind;
  const tone = KIND_TONE[kind];
  const showRegenerate = actions.showRegenerate;
  const showActivate = actions.showActivate;
  const showRevoke = actions.showRevoke;

  async function runActivate() {
    setConfirm(null);
    await onActivate();
  }

  async function runRevoke() {
    setConfirm(null);
    await onRevoke();
  }

  return (
    <div style={card} data-testid="digital-care-patient-app-access">
      <strong>{t("digitalCare.appAccess.title")}</strong>
      {lookupFailed ? (
        <div data-testid="digital-care-patient-app-access-error" role="alert" style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{lookupError || t("digitalCare.appAccess.loadError")}</p>
        </div>
      ) : null}
      {actions.showStatus ? (
        <div
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 800,
            background: tone.bg,
            color: tone.text,
            border: `1px solid ${tone.border}`,
          }}
        >
          {t(`digitalCare.appAccess.status.${kind}`)}
        </div>
      ) : null}
      {access?.latestActivation?.expiresAt && kind === "PENDING" ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("digitalCare.appAccess.expiresAt")}: {digitalCareFormatWhen(access.latestActivation.expiresAt)}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {showActivate ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("activate")}
            style={{ ...buttonBase, border: 0, background: "#0f766e", color: "white" }}
          >
            {t("digitalCare.appAccess.activate")}
          </button>
        ) : null}
        {showRegenerate ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("activate")}
            style={{ ...buttonBase, border: "1px solid #cbd5e1", background: "white", color: "#0f172a" }}
          >
            {kind === "EXPIRED" ? t("digitalCare.appAccess.generateNew") : t("digitalCare.appAccess.regenerate")}
          </button>
        ) : null}
        {showRevoke ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("revoke")}
            style={{ ...buttonBase, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}
          >
            {t("digitalCare.appAccess.revoke")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRefresh()}
          style={{ ...buttonBase, border: "1px solid #cbd5e1", background: "white", color: "#0f172a" }}
        >
          {lookupFailed ? t("digitalCare.appAccess.retry") : t("digitalCare.refresh")}
        </button>
      </div>
      {issuedCode && !lookupFailed ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{t("digitalCare.appAccess.codeLabel")}</div>
          <code style={{ display: "block", marginTop: 6, fontSize: 13, wordBreak: "break-all" }}>{issuedCode}</code>
          {issuedExpiresAt ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {t("digitalCare.appAccess.expiresAt")}: {digitalCareFormatWhen(issuedExpiresAt)}
            </div>
          ) : null}
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#92400e" }}>{t("digitalCare.appAccess.codeWarning")}</p>
          <button
            type="button"
            onClick={() => void onCopy()}
            style={{ ...buttonBase, marginTop: 8, border: "1px solid #cbd5e1", background: "white" }}
          >
            {copied ? t("digitalCare.appAccess.copied") : t("digitalCare.appAccess.copy")}
          </button>
        </div>
      ) : null}
      {confirm && !lookupFailed ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            background: "#fffbeb",
          }}
        >
          <p style={{ margin: 0, fontWeight: 800 }}>
            {confirm === "activate" ? t("digitalCare.appAccess.confirmActivateTitle") : t("digitalCare.appAccess.confirmRevokeTitle")}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#334155" }}>
            {t("digitalCare.appAccess.patient")}: {patientName}
          </p>
          {confirm === "activate" ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#334155" }}>{t("digitalCare.appAccess.confirmActivateBody")}</p>
          ) : (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#334155" }}>{t("digitalCare.appAccess.confirmRevokeBody")}</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void (confirm === "activate" ? runActivate() : runRevoke())}
              style={{ ...buttonBase, border: 0, background: "#0f766e", color: "white" }}
            >
              {t("digitalCare.appAccess.confirm")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
              style={{ ...buttonBase, border: "1px solid #cbd5e1", background: "white" }}
            >
              {t("digitalCare.appAccess.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
