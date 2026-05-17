"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseMedicationAdministrationEffectiveTimeIso } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  datetimeLocalValueToUtcIso,
  medicationAdminTimeModalIsLargeBackdate,
  medicationAdminTimeModalRequiresDetailedReason,
  medicationAdminTimeModalRequiresReason,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";

function toDatetimeLocalValue(iso: string): string {
  const d = parseMedicationAdministrationEffectiveTimeIso(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MedicationAdministrationEffectiveTimeModal({
  open,
  medicationLabel,
  defaultEffectiveIso,
  originalAdministeredAt,
  systemDocumentedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  orderCancelledAt,
  adjustmentVersion,
  controlledMedication,
  t,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  medicationLabel: string;
  defaultEffectiveIso: string;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  orderCancelledAt: Date | null;
  adjustmentVersion: number;
  controlledMedication: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onSave: (payload: { effectiveAdministeredTime: string; reason?: string }) => Promise<void>;
  saving: boolean;
}) {
  const { language } = useI18n();
  const [clinicalLocal, setClinicalLocal] = useState(() => toDatetimeLocalValue(defaultEffectiveIso));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setClinicalLocal(toDatetimeLocalValue(defaultEffectiveIso));
      setReason("");
      setError(null);
    }
  }, [open, defaultEffectiveIso]);

  const effectiveIso = useMemo(() => datetimeLocalValueToUtcIso(clinicalLocal), [clinicalLocal]);

  const reasonRequired = useMemo(() => {
    if (!effectiveIso) return controlledMedication;
    return (
      controlledMedication ||
      medicationAdminTimeModalRequiresReason({
        effectiveAdministeredTimeIso: effectiveIso,
        originalAdministeredAt,
        systemDocumentedAt,
        orderCreatedAt,
        orderItemCreatedAt,
        adjustmentVersion,
        controlledMedication,
        orderCancelledAt,
      })
    );
  }, [
    effectiveIso,
    originalAdministeredAt,
    systemDocumentedAt,
    orderCreatedAt,
    orderItemCreatedAt,
    adjustmentVersion,
    controlledMedication,
    orderCancelledAt,
  ]);

  const largeBackdate = useMemo(() => {
    if (!effectiveIso) return false;
    return medicationAdminTimeModalIsLargeBackdate({
      effectiveAdministeredTimeIso: effectiveIso,
      systemDocumentedAt,
    });
  }, [effectiveIso, systemDocumentedAt]);

  const reasonTooShort = useMemo(() => {
    if (!effectiveIso) return false;
    return medicationAdminTimeModalRequiresDetailedReason({
      effectiveAdministeredTimeIso: effectiveIso,
      systemDocumentedAt,
      reason,
    });
  }, [effectiveIso, systemDocumentedAt, reason]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const iso = datetimeLocalValueToUtcIso(clinicalLocal);
    if (!iso) {
      setError(t("marTab.adminTime.invalidTime"));
      return;
    }
    if (reasonRequired && !reason.trim()) {
      setError(t("marTab.adminTime.reasonRequired"));
      return;
    }
    if (reasonTooShort) {
      setError(t("marTab.adminTime.reasonTooShortForLargeBackdate"));
      return;
    }
    try {
      await onSave({
        effectiveAdministeredTime: iso,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      } satisfies { effectiveAdministeredTime: string; reason?: string });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const fromServer = raw.trim()
        ? normalizeUserFacingError(raw, language) ?? raw.trim()
        : null;
      setError(fromServer ?? t("marTab.adminTime.saveFailed"));
    }
  };

  return (
    <MarAdminTimeModalOverlay onClose={onClose}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
        aria-labelledby="mar-admin-time-title"
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mar-admin-time-title" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {t("marTab.adminTime.modalTitle")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          <strong>{medicationLabel}</strong>
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {t("marTab.adminTime.warning")}
        </p>
        {controlledMedication ? (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", fontWeight: 600, lineHeight: 1.45 }}>
            {t("marTab.adminTime.controlledWarning")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("marTab.adminTime.effectiveLabel")}
        </label>
        <input
          type="datetime-local"
          value={clinicalLocal}
          onChange={(e) => setClinicalLocal(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            marginBottom: largeBackdate ? 6 : 12,
            boxSizing: "border-box",
          }}
        />
        {largeBackdate ? (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
            {t("marTab.adminTime.largeBackdateReasonHelp")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("marTab.adminTime.reasonLabel")}
          {reasonRequired ? " *" : null}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("marTab.adminTime.reasonPlaceholder")}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 13,
            resize: "vertical",
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />
        {error ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }} role="alert">
            {error}
          </p>
        ) : null}
        <MarAdminTimeModalActions t={t} onClose={onClose} saving={saving} />
      </form>
    </MarAdminTimeModalOverlay>
  );
}

function MarAdminTimeModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function MarAdminTimeModalActions({
  t,
  onClose,
  saving,
}: {
  t: (key: string) => string;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        style={{
          padding: "8px 14px",
          fontSize: 13,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {t("marTab.adminTime.cancel")}
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "8px 14px",
          fontSize: 13,
          borderRadius: 10,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("marTab.adminTime.save")}
      </button>
    </div>
  );
}
