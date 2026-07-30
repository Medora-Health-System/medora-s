"use client";

/**
 * MEDUI.D4C.7K — shared Reopen Encounter action (one enterprise UI authority).
 * Care-setting wrappers may supply onSuccess / query invalidation only.
 * Labels must remain “Rouvrir la rencontre” / “Reopen Encounter” — never “Unlock Chart”.
 */

import { useCallback, useId, useState } from "react";
import { canReopenEncounter } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { reopenEncounterViaEnterprise } from "@/lib/clinicalWorklistApi";

export type EnterpriseReopenEncounterActionProps = {
  facilityId: string;
  encounterId: string;
  encounterStatus: string | null | undefined;
  roleCodes: readonly string[] | null | undefined;
  expectedVersion?: number;
  /** Compact lock icon control for list rows. */
  variant?: "icon" | "button";
  onSuccess?: (result: {
    workspaceTarget?: string;
    warnings?: string[];
  }) => void;
  onError?: (message: string) => void;
};

export function EnterpriseReopenEncounterAction({
  facilityId,
  encounterId,
  encounterStatus,
  roleCodes,
  expectedVersion,
  variant = "icon",
  onSuccess,
  onError,
}: EnterpriseReopenEncounterActionProps) {
  const { t } = useI18n();
  const dialogTitleId = useId();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = String(encounterStatus ?? "").toUpperCase() === "CLOSED";
  const authorized = canReopenEncounter(roleCodes);

  const submit = useCallback(async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError(t("enterpriseEncounterLifecycleD4c7k.reopen.reasonRequired"));
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const clientRequestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `reopen-${Date.now()}`;
      const result = await reopenEncounterViaEnterprise(facilityId, encounterId, {
        reason: trimmed,
        expectedVersion,
        clientRequestId,
      });
      setOpen(false);
      setReason("");
      onSuccess?.({
        workspaceTarget: result.workspaceTarget,
        warnings: result.warnings,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : t("enterpriseEncounterLifecycleD4c7k.reopen.failed");
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }, [busy, encounterId, expectedVersion, facilityId, onError, onSuccess, reason, t]);

  if (!isClosed) return null;
  if (!authorized) return null;

  const label = t("enterpriseEncounterLifecycleD4c7k.reopen.action");

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          title={label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <LockIcon />
        </button>
      )}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: 20,
              boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
            }}
          >
            <h2 id={dialogTitleId} style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
              {label}
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.45 }}>
              {t("enterpriseEncounterLifecycleD4c7k.reopen.dialogBody")}
            </p>
            <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
              <li>{t("enterpriseEncounterLifecycleD4c7k.reopen.preservesCloseHistory")}</li>
              <li>{t("enterpriseEncounterLifecycleD4c7k.reopen.signedNotesRemain")}</li>
              <li>{t("enterpriseEncounterLifecycleD4c7k.reopen.billingUnchanged")}</li>
              <li>{t("enterpriseEncounterLifecycleD4c7k.reopen.prescriptionsUnchanged")}</li>
              <li>{t("enterpriseEncounterLifecycleD4c7k.reopen.roomBedNotRestored")}</li>
            </ul>
            <label htmlFor={reasonId} style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t("enterpriseEncounterLifecycleD4c7k.reopen.reasonLabel")}
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder={t("enterpriseEncounterLifecycleD4c7k.reopen.reasonPlaceholder")}
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: 10,
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {error ? (
              <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
                {error}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (busy) return;
                  setOpen(false);
                  setError(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {t("enterpriseEncounterLifecycleD4c7k.reopen.cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: busy ? "#94a3b8" : "#0f766e",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy
                  ? t("enterpriseEncounterLifecycleD4c7k.reopen.submitting")
                  : t("enterpriseEncounterLifecycleD4c7k.reopen.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
