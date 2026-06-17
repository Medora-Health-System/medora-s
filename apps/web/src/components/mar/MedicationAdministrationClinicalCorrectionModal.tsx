"use client";

import React, { useMemo, useState } from "react";
import {
  buildMarClinicalCorrectionBeforeAfterPreview,
  marClinicalCorrectionDefaultReasonCode,
  marClinicalCorrectionReasonRequiresDetail,
  type MarClinicalCorrectionActionType,
} from "@/features/mar/marClinicalCorrectionWorkflow";
import { MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export type MarClinicalCorrectionModalTarget = {
  administrationId: string;
  medicationLabel: string;
  doseValue?: string | number | null;
  doseUnit?: string | null;
  route?: string | null;
  marAction?: string | null;
  notes?: string | null;
};

export function MedicationAdministrationClinicalCorrectionModal({
  open,
  correctionType,
  target,
  workflowEditable,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  correctionType: MarClinicalCorrectionActionType;
  target: MarClinicalCorrectionModalTarget;
  workflowEditable: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    correctionReasonCode: string;
    reason?: string;
    doseValue?: string;
    doseUnit?: string;
    route?: string;
  }) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const [reasonCode, setReasonCode] = useState<string>(() =>
    marClinicalCorrectionDefaultReasonCode(correctionType)
  );
  const [reasonDetail, setReasonDetail] = useState("");
  const [doseValue, setDoseValue] = useState("");
  const [doseUnit, setDoseUnit] = useState(target.doseUnit?.trim() || "mg");
  const [route, setRoute] = useState(target.route?.trim() || "");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setReasonCode(marClinicalCorrectionDefaultReasonCode(correctionType));
    setReasonDetail("");
    setDoseValue("");
    setDoseUnit(target.doseUnit?.trim() || "mg");
    setRoute(target.route?.trim() || "");
    setConfirmed(false);
    setError(null);
  }, [open, correctionType, target.doseUnit, target.route]);

  const preview = useMemo(
    () =>
      buildMarClinicalCorrectionBeforeAfterPreview({
        type: correctionType,
        current: target,
        correctedDoseValue: doseValue.trim() || undefined,
        correctedDoseUnit: doseUnit.trim() || undefined,
        correctedRoute: route.trim() || undefined,
      }),
    [correctionType, doseUnit, doseValue, route, target]
  );

  const detailRequired = marClinicalCorrectionReasonRequiresDetail(correctionType);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (detailRequired && !reasonDetail.trim()) {
      setError(t("marClinicalCorrection.modal.detailRequired"));
      return;
    }
    if (!confirmed) {
      setError(t("marClinicalCorrection.modal.confirmRequired"));
      return;
    }
    if (correctionType === "DOSE" && !doseValue.trim()) {
      setError(t("marClinicalCorrection.modal.doseRequired"));
      return;
    }
    if (correctionType === "ROUTE" && !route.trim()) {
      setError(t("marClinicalCorrection.modal.routeRequired"));
      return;
    }
    try {
      await onSave({
        correctionReasonCode: reasonCode,
        ...(reasonDetail.trim() ? { reason: reasonDetail.trim() } : {}),
        ...(correctionType === "DOSE"
          ? { doseValue: doseValue.trim(), doseUnit: doseUnit.trim() || undefined }
          : {}),
        ...(correctionType === "ROUTE" ? { route: route.trim() } : {}),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw.trim()
          ? (normalizeUserFacingError(raw, language) ?? raw.trim())
          : t("marClinicalCorrection.modal.saveFailed")
      );
    }
  };

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
      <form
        data-testid="mar-clinical-correction-modal"
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
        aria-labelledby="mar-clinical-correction-title"
        style={{
          width: "min(460px, 100%)",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "18px 20px",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="mar-clinical-correction-title"
          style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}
        >
          {t("marClinicalCorrection.modal.title")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
          <strong>{target.medicationLabel}</strong>
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#475569" }}>
          {t(`marClinicalCorrection.type.${correctionType}`)}
        </p>

        <div
          data-testid="mar-clinical-correction-before-after"
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#334155",
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>{t("marClinicalCorrection.modal.before")}:</span>{" "}
            {preview.before}
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ fontWeight: 600 }}>{t("marClinicalCorrection.modal.after")}:</span>{" "}
            {preview.after === "duplicate_documentation_flagged"
              ? t("marAdministrationCorrection.duplicateFlagged")
              : preview.after}
          </div>
        </div>

        {correctionType === "DOSE" ? (
          <>
            <label style={labelStyle}>{t("marClinicalCorrection.modal.correctedDose")} *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                style={{ ...inputStyle, width: 88 }}
              />
            </div>
          </>
        ) : null}

        {correctionType === "ROUTE" ? (
          <>
            <label style={labelStyle}>{t("marClinicalCorrection.modal.correctedRoute")} *</label>
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
          </>
        ) : null}

        <label style={labelStyle}>{t("marAdministrationCorrection.fieldLabel")}</label>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          disabled={!workflowEditable}
          style={{ ...inputStyle, marginBottom: 12 }}
        >
          {MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES.filter(
            (code) => code !== "DOCUMENTED_WRONG_PATIENT"
          ).map((code) => (
            <option key={code} value={code}>
              {t(`marAdministrationCorrection.reason.${code}`)}
            </option>
          ))}
        </select>

        <label style={labelStyle}>
          {t("marAdministrationCorrection.detailLabel")}
          {detailRequired ? " *" : null}
        </label>
        <textarea
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          rows={3}
          placeholder={t("marAdministrationCorrection.detailPlaceholder")}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
        />

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            data-testid="mar-clinical-correction-confirm"
          />
          <span>{t("marClinicalCorrection.modal.confirmLabel")}</span>
        </label>

        {error ? (
          <p role="alert" style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={secondaryBtn}>
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving || !workflowEditable} style={primaryBtn}>
            {saving ? t("common.saving") : t("marClinicalCorrection.modal.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
