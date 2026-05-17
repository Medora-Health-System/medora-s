"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseLabRadiologyEffectiveClinicalTimeIso } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  datetimeLocalValueToUtcIso,
  labRadModalIsLargeBackdate,
  labRadModalRequiresDetailedReason,
  labRadModalRequiresReason,
} from "@/features/orders/labRadiologyEffectiveTimeDisplay";

function toDatetimeLocalValue(iso: string): string {
  const d = parseLabRadiologyEffectiveClinicalTimeIso(iso);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LabRadiologyEffectiveTimeModal({
  open,
  lineLabel,
  milestoneLabel,
  defaultEffectiveIso,
  documentedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  adjustmentVersion,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  lineLabel: string;
  milestoneLabel: string;
  defaultEffectiveIso: string;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
  onClose: () => void;
  onSave: (payload: { effectiveClinicalTime: string; reason?: string }) => Promise<void>;
  saving: boolean;
}) {
  const { t, language } = useI18n();
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
    return labRadModalRequiresReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      adjustmentVersion,
    });
  }, [effectiveIso, documentedAt, orderCreatedAt, orderItemCreatedAt, adjustmentVersion]);

  const largeBackdate = useMemo(() => {
    if (!effectiveIso) return false;
    return labRadModalIsLargeBackdate({ effectiveClinicalTimeIso: effectiveIso, documentedAt });
  }, [effectiveIso, documentedAt]);

  const reasonTooShort = useMemo(() => {
    if (!effectiveIso) return false;
    return labRadModalRequiresDetailedReason({
      effectiveClinicalTimeIso: effectiveIso,
      documentedAt,
      reason,
    });
  }, [effectiveIso, documentedAt, reason]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const iso = datetimeLocalValueToUtcIso(clinicalLocal);
    if (!iso) {
      setError(t("labRadTime.invalidTime"));
      return;
    }
    if (reasonRequired && !reason.trim()) {
      setError(t("labRadTime.reasonRequired"));
      return;
    }
    if (reasonTooShort) {
      setError(t("labRadTime.reasonTooShortForLargeBackdate"));
      return;
    }
    try {
      await onSave({
        effectiveClinicalTime: iso,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw.trim()
          ? normalizeUserFacingError(raw, language) ?? raw.trim()
          : t("labRadTime.saveFailed")
      );
    }
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
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
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{milestoneLabel}</h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
          <strong>{lineLabel}</strong>
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {t("labRadTime.warning")}
        </p>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {t("labRadTime.effectiveLabel")}
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
            {t("labRadTime.largeBackdateSupervisoryWarning")}
          </p>
        ) : null}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {t("labRadTime.reasonLabel")}
          {reasonRequired ? " *" : null}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("labRadTime.reasonPlaceholder")}
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ padding: "8px 14px" }}>
            {t("labRadTime.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {saving ? t("common.saving") : t("labRadTime.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
