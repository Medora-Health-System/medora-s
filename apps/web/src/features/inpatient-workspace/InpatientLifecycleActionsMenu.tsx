"use client";

import { useState, type CSSProperties } from "react";
import { INPATIENT_CANCEL_REASON_CODES } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  cancelInpatientAdmission,
  editInpatientAdmissionDetails,
  transferInpatientBed,
  voidInpatientEncounter,
} from "@/features/hospital-care/inpatientOperationsApi";

type Props = {
  encounterId: string;
  canAdmin?: boolean;
};

/** Discharge is only via INP.DIS.1E final-discharge board — not this menu. */
type Mode = null | "edit" | "transfer" | "cancel" | "void";

export function InpatientLifecycleActionsMenu({ encounterId, canAdmin }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editReason, setEditReason] = useState("");
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState("");
  const [reasonForAdmission, setReasonForAdmission] = useState("");
  const [toBedKey, setToBedKey] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [cancelCode, setCancelCode] = useState<string>("CREATED_IN_ERROR");
  const [cancelExplanation, setCancelExplanation] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidConfirm, setVoidConfirm] = useState(false);

  const run = async (fn: () => Promise<unknown>, okKey: string) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(t(okKey));
      setMode(null);
    } catch (e) {
      const err = e as { message?: string; body?: { code?: string; message?: string } };
      setError(err.body?.message ?? err.message ?? t("hospitalAdmissionD4a25.lifecycle.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="inpatient-lifecycle-actions" style={{ marginBottom: 10 }}>
      <button type="button" style={menuBtn} onClick={() => setOpen((v) => !v)}>
        {t("hospitalAdmissionD4a25.lifecycle.menu")}
      </button>
      {open ? (
        <div style={menuPanel}>
          <button type="button" style={itemBtn} onClick={() => setMode("edit")}>
            {t("hospitalAdmissionD4a25.lifecycle.editAdmission")}
          </button>
          <button type="button" style={itemBtn} onClick={() => setMode("transfer")}>
            {t("hospitalAdmissionD4a25.lifecycle.transferBed")}
          </button>
          <button type="button" style={itemBtn} onClick={() => setMode("cancel")}>
            {t("hospitalAdmissionD4a25.lifecycle.cancelAdmission")}
          </button>
          {canAdmin ? (
            <button type="button" style={{ ...itemBtn, color: "#b91c1c" }} onClick={() => setMode("void")}>
              {t("hospitalAdmissionD4a25.lifecycle.voidEncounter")}
            </button>
          ) : null}
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
            {t("hospitalAdmissionD4a25.lifecycle.noHardDelete")}
          </p>
        </div>
      ) : null}

      {mode === "edit" ? (
        <div style={formBox} data-testid="lifecycle-edit-form">
          <label style={label}>
            {t("hospitalAdmissionD4a25.fields.primaryDiagnosis")}
            <input value={admissionDiagnosis} onChange={(e) => setAdmissionDiagnosis(e.target.value)} style={input} />
          </label>
          <label style={label}>
            {t("hospitalAdmissionD4a25.fields.reasonForAdmission")}
            <textarea value={reasonForAdmission} onChange={(e) => setReasonForAdmission(e.target.value)} style={input} rows={2} />
          </label>
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.editReason")}
            <input value={editReason} onChange={(e) => setEditReason(e.target.value)} style={input} />
          </label>
          <button
            type="button"
            disabled={busy}
            style={primaryBtn}
            onClick={() =>
              void run(
                () =>
                  editInpatientAdmissionDetails(encounterId, {
                    admissionDiagnosis: admissionDiagnosis || null,
                    reasonForAdmission: reasonForAdmission || null,
                    editReason,
                  }),
                "hospitalAdmissionD4a25.lifecycle.editOk"
              )
            }
          >
            {t("hospitalAdmissionD4a25.lifecycle.saveEdit")}
          </button>
        </div>
      ) : null}

      {mode === "transfer" ? (
        <div style={formBox} data-testid="lifecycle-transfer-form">
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.toBedKey")}
            <input value={toBedKey} onChange={(e) => setToBedKey(e.target.value)} placeholder="MS:3" style={input} />
          </label>
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.transferReason")}
            <input value={transferReason} onChange={(e) => setTransferReason(e.target.value)} style={input} />
          </label>
          <button
            type="button"
            disabled={busy}
            style={primaryBtn}
            onClick={() =>
              void run(
                () =>
                  transferInpatientBed(encounterId, {
                    toBedKey,
                    reason: transferReason,
                  }),
                "hospitalAdmissionD4a25.lifecycle.transferOk"
              )
            }
          >
            {t("hospitalAdmissionD4a25.lifecycle.confirmTransfer")}
          </button>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div style={formBox} data-testid="lifecycle-cancel-form">
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.cancelReason")}
            <select value={cancelCode} onChange={(e) => setCancelCode(e.target.value)} style={input}>
              {INPATIENT_CANCEL_REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {t(`hospitalAdmissionD4a25.cancelReasons.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.explanation")}
            <textarea value={cancelExplanation} onChange={(e) => setCancelExplanation(e.target.value)} style={input} rows={2} />
          </label>
          <button
            type="button"
            disabled={busy}
            style={primaryBtn}
            onClick={() =>
              void run(
                () =>
                  cancelInpatientAdmission(encounterId, {
                    reasonCode: cancelCode,
                    explanation: cancelExplanation,
                  }),
                "hospitalAdmissionD4a25.lifecycle.cancelOk"
              )
            }
          >
            {t("hospitalAdmissionD4a25.lifecycle.confirmCancel")}
          </button>
        </div>
      ) : null}

      {mode === "void" ? (
        <div style={formBox} data-testid="lifecycle-void-form">
          <p style={{ fontSize: 12, color: "#b91c1c", margin: 0 }}>
            {t("hospitalAdmissionD4a25.lifecycle.voidWarning")}
          </p>
          <label style={label}>
            {t("hospitalAdmissionD4a25.lifecycle.voidReason")}
            <textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} style={input} rows={2} />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={voidConfirm}
              onChange={(e) => setVoidConfirm(e.target.checked)}
            />
            {t("hospitalAdmissionD4a25.lifecycle.voidConfirm")}
          </label>
          <button
            type="button"
            disabled={busy || !voidConfirm}
            style={{ ...primaryBtn, background: "#b91c1c" }}
            onClick={() =>
              void run(
                () =>
                  voidInpatientEncounter(encounterId, {
                    reason: voidReason,
                    confirm: true,
                  }),
                "hospitalAdmissionD4a25.lifecycle.voidOk"
              )
            }
          >
            {t("hospitalAdmissionD4a25.lifecycle.confirmVoid")}
          </button>
        </div>
      ) : null}

      {msg ? (
        <p role="status" style={{ fontSize: 12, color: "#0f766e" }}>
          {msg}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const menuBtn: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
const menuPanel: CSSProperties = {
  marginTop: 6,
  padding: 8,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "grid",
  gap: 4,
};
const itemBtn: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid transparent",
  background: "#f8fafc",
  fontSize: 12,
  cursor: "pointer",
};
const formBox: CSSProperties = {
  marginTop: 8,
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  display: "grid",
  gap: 8,
};
const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600 };
const input: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 8,
  fontSize: 13,
  boxSizing: "border-box",
};
const primaryBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
