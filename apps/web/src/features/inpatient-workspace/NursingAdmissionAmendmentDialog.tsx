"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  type InpatientAdmissionClinicalSection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { createNursingAdmissionAmendment } from "@/features/hospital-care/inpatientOperationsApi";

export function NursingAdmissionAmendmentDialog({
  encounterId,
  expectedVersion,
  expectedAmendmentVersion,
  open,
  mode,
  onClose,
  onSaved,
}: {
  encounterId: string;
  expectedVersion: number;
  expectedAmendmentVersion: number;
  open: boolean;
  mode: "ADDENDUM" | "CORRECTION" | "ENTERED_IN_ERROR";
  onClose: () => void;
  onSaved: (documentation: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const [sectionId, setSectionId] = useState<InpatientAdmissionClinicalSection | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [correctedValue, setCorrectedValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      firstFieldRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createNursingAdmissionAmendment(encounterId, {
        type: mode,
        clientRequestId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `amd-${Date.now()}`,
        reason,
        note: note.trim() || null,
        sectionId: sectionId || null,
        originalValue: mode === "CORRECTION" ? originalValue : undefined,
        correctedValue: mode === "CORRECTION" ? correctedValue : undefined,
        expectedVersion,
        expectedAmendmentVersion,
        credentials: "RN",
      });
      onSaved(res.documentation);
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : t("common.loadError");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="nursing-admission-amendment-dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          maxWidth: 520,
          width: "100%",
          padding: 16,
        }}
      >
        <h2 id={titleId} style={{ margin: "0 0 8px", fontSize: 16 }}>
          {mode === "ADDENDUM"
            ? t("hospitalAdmissionD4a25a.amendments.addAddendum")
            : mode === "CORRECTION"
              ? t("hospitalAdmissionD4a25a.amendments.addCorrection")
              : t("hospitalAdmissionD4a25a.amendments.enteredInError")}
        </h2>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
          {t("hospitalAdmissionD4a25a.domain.helpAddendum")}
        </p>
        <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
          {t("hospitalAdmissionD4a25a.amendments.section")}
          <select
            ref={firstFieldRef}
            value={sectionId}
            onChange={(e) =>
              setSectionId(e.target.value as InpatientAdmissionClinicalSection | "")
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            <option value="">—</option>
            {INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`hospitalAdmissionD4a0.clinical.sections.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
          {t("hospitalAdmissionD4a25a.amendments.reason")}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
          {t("hospitalAdmissionD4a25a.amendments.note")}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        {mode === "CORRECTION" ? (
          <>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalAdmissionD4a25a.amendments.original")}
              <textarea
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                rows={2}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalAdmissionD4a25a.amendments.corrected")}
              <textarea
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                rows={2}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              />
            </label>
          </>
        ) : null}
        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" disabled={busy || !reason.trim()} onClick={() => void submit()}>
            {t("hospitalAdmissionD4a25a.amendments.submit")}
          </button>
          <button type="button" onClick={onClose}>
            {t("hospitalAdmissionD4a25a.amendments.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
