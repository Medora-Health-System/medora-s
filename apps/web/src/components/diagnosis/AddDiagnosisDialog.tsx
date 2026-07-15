"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ClinicalOnsetFields } from "./ClinicalOnsetFields";
import {
  buildClinicalOnsetApiPayload,
  defaultClinicalOnsetValue,
  clinicalOnsetFromStored,
  isClinicalOnsetComplete,
  type ClinicalOnsetApiPayload,
  type ClinicalOnsetValue,
} from "./clinicalOnsetModel";

export type AddDiagnosisDialogMode = "add" | "editOnset";

export type AddDiagnosisDialogProps = {
  open: boolean;
  mode?: AddDiagnosisDialogMode;
  code: string;
  description: string | null;
  willBePrimary?: boolean;
  initialOnset?: { onsetDate: string | null; onsetPrecision?: string | null };
  initialNotes?: string;
  submitting?: boolean;
  t: (key: string) => string;
  onCancel: () => void;
  onConfirm: (payload: ClinicalOnsetApiPayload & { notes?: string }) => void | Promise<void>;
};

export function AddDiagnosisDialog({
  open,
  mode = "add",
  code,
  description,
  willBePrimary = false,
  initialOnset,
  initialNotes = "",
  submitting = false,
  t,
  onCancel,
  onConfirm,
}: AddDiagnosisDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [onset, setOnset] = useState<ClinicalOnsetValue>(defaultClinicalOnsetValue);
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOnset(
      initialOnset
        ? clinicalOnsetFromStored(initialOnset)
        : defaultClinicalOnsetValue()
    );
    setNotes(initialNotes ?? "");
    setLocalError(null);
  }, [open, initialOnset, initialNotes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, submitting]);

  if (!open) return null;

  const canSubmit = isClinicalOnsetComplete(onset) && !submitting;

  const handleConfirm = async () => {
    const built = buildClinicalOnsetApiPayload(onset);
    if ("error" in built) {
      setLocalError(
        built.error === "future"
          ? t("diagnosisOnset.futureError")
          : t("diagnosisOnset.incompleteError")
      );
      return;
    }
    setLocalError(null);
    await onConfirm({
      ...built,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="add-diagnosis-dialog"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
          padding: "18px 20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
          {mode === "editOnset" ? t("diagnosisOnset.editOnsetTitle") : t("diagnosisOnset.addTitle")}
        </h2>

        <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{code}</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4, lineHeight: 1.4 }}>
            {description?.trim() || t("diagnosisOnset.noDescription")}
          </div>
          {mode === "add" ? (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              {willBePrimary
                ? t("diagnosisOnset.willBePrimary")
                : t("diagnosisOnset.willBeSecondary")}
            </div>
          ) : null}
        </div>

        <ClinicalOnsetFields
          value={onset}
          onChange={setOnset}
          disabled={submitting}
          t={t}
          autoFocus
        />

        {mode === "add" ? (
          <label style={{ display: "block", marginTop: 14, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {t("diagnosisOnset.notesOptional")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={2}
              style={{
                display: "block",
                marginTop: 4,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>
        ) : null}

        {localError ? (
          <p role="alert" style={{ margin: "12px 0 0", fontSize: 13, color: "#b91c1c" }}>
            {localError}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              minHeight: 40,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: 14,
              fontWeight: 600,
              color: "#475569",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-testid="add-diagnosis-confirm"
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
            style={{
              minHeight: 40,
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: canSubmit ? "#0f172a" : "#94a3b8",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {mode === "editOnset" ? t("diagnosisOnset.saveOnset") : t("diagnosisOnset.addConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
