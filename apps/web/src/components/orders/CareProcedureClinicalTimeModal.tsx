"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  careProcedureClinicalTimeModalIsLargeBackdate,
  careProcedureClinicalTimeModalRequiresDetailedReason,
  careProcedureClinicalTimeModalRequiresReason,
  datetimeLocalValueToUtcIso,
} from "@/features/orders/careProcedureClinicalTimeDisplay";
import { parseCareProcedureEffectiveClinicalTimeIso } from "@medora/shared";

function toDatetimeLocalValue(iso: string): string {
  const d = parseCareProcedureEffectiveClinicalTimeIso(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CareProcedureClinicalTimeModal({
  open,
  lineLabel,
  defaultEffectiveIso,
  documentedCompletedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  adjustmentVersion,
  t,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  lineLabel: string;
  defaultEffectiveIso: string;
  documentedCompletedAt: Date | null;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
  t: (key: string) => string;
  onClose: () => void;
  onSave: (payload: { effectiveClinicalTime: string; reason?: string }) => Promise<void>;
  saving: boolean;
}) {
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
    if (!effectiveIso) return false;
    return careProcedureClinicalTimeModalRequiresReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedCompletedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      adjustmentVersion,
    });
  }, [effectiveIso, documentedCompletedAt, orderCreatedAt, orderItemCreatedAt, adjustmentVersion]);

  const largeBackdate = useMemo(() => {
    if (!effectiveIso) return false;
    return careProcedureClinicalTimeModalIsLargeBackdate({
      effectiveClinicalTimeIso: effectiveIso,
      documentedCompletedAt,
    });
  }, [effectiveIso, documentedCompletedAt]);

  const reasonTooShort = useMemo(() => {
    if (!effectiveIso) return false;
    return careProcedureClinicalTimeModalRequiresDetailedReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedCompletedAt,
      reason,
    });
  }, [effectiveIso, documentedCompletedAt, reason]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const iso = datetimeLocalValueToUtcIso(clinicalLocal);
    if (!iso) {
      setError(t("encounterChrome.ordersTab.careClinicalTime.invalidTime"));
      return;
    }
    if (reasonRequired && !reason.trim()) {
      setError(t("encounterChrome.ordersTab.careClinicalTime.reasonRequired"));
      return;
    }
    if (reasonTooShort) {
      setError(t("encounterChrome.ordersTab.careClinicalTime.reasonTooShortForLargeBackdate"));
      return;
    }
    try {
      await onSave({
        effectiveClinicalTime: iso,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("encounterChrome.ordersTab.careClinicalTime.saveFailed"));
    }
  };

  return (
    <CareClinicalTimeModalOverlay onClose={onClose}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
        aria-labelledby="care-clinical-time-title"
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
        <h2 id="care-clinical-time-title" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {t("encounterChrome.ordersTab.careClinicalTime.modalTitle")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          <strong>{lineLabel}</strong>
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {t("encounterChrome.ordersTab.careClinicalTime.explanation")}
        </p>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("encounterChrome.ordersTab.careClinicalTime.actualClinicalTime")}
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
            {t("encounterChrome.ordersTab.careClinicalTime.largeBackdateReasonHelp")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          {t("encounterChrome.ordersTab.careClinicalTime.adjustmentReason")}
          {reasonRequired ? " *" : null}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("encounterChrome.ordersTab.careClinicalTime.reasonPlaceholder")}
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
        <CareClinicalTimeModalActions t={t} onClose={onClose} saving={saving} />
      </form>
    </CareClinicalTimeModalOverlay>
  );
}

function CareClinicalTimeModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
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

function CareClinicalTimeModalActions({
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
        {t("encounterChrome.ordersTab.careClinicalTime.cancel")}
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
        {saving ? t("common.saving") : t("encounterChrome.ordersTab.careClinicalTime.saveTime")}
      </button>
    </div>
  );
}
