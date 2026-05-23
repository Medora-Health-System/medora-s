"use client";

import React, { useState } from "react";
import { afterProcedureDocumentSaveSuccess } from "@/features/emergency/procedureSaveSuccess";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

export function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 4,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

export type ProcedureFormCommonProps = {
  encounterId: string;
  facilityId: string;
  onBack: () => void;
  onClose: () => void;
  onRecorded: () => void;
  documentationRole?: "PROVIDER" | "NURSING";
};

const procedureSaveSuccessBannerStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.03em",
};

async function postDocument(encounterId: string, facilityId: string, body: Record<string, unknown>) {
  await apiFetch(`/encounters/${encounterId}/procedures/document`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body),
  });
}

export type FormShellSubmitCtx = {
  performedAtLocal: string;
  setPerformedAtLocal: (v: string) => void;
  submitErr: string | null;
  setSubmitErr: (v: string | null) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
};

type FormShellProps = ProcedureFormCommonProps & {
  titleKey: string;
  children: (ctx: FormShellSubmitCtx) => React.ReactNode;
};

export function ProcedureFormShell({
  encounterId,
  facilityId,
  onBack,
  onClose,
  onRecorded,
  documentationRole = "PROVIDER",
  titleKey,
  children,
}: FormShellProps) {
  const { t } = useI18n();
  const [performedAtLocal, setPerformedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const onSubmit = async (body: Record<string, unknown>) => {
    setSubmitErr(null);
    setSaveSuccess(false);
    setSubmitting(true);
    try {
      if (performedAtLocal.trim()) {
        const d = new Date(performedAtLocal);
        if (!Number.isNaN(d.getTime())) body.performedAt = d.toISOString();
      }
      body.documentationRole = documentationRole;
      await postDocument(encounterId, facilityId, body);
      setSaveSuccess(true);
      await afterProcedureDocumentSaveSuccess({ onRecorded, onClose });
    } catch (e) {
      setSubmitErr(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erProcedureLauncher.saveError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting || saveSuccess}
        style={{
          marginBottom: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: submitting || saveSuccess ? "not-allowed" : "pointer",
        }}
      >
        {t("erProcedureLauncher.backToGrid")}
      </button>
      <p style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t(titleKey)}</p>
      {saveSuccess ? (
        <p role="status" aria-live="polite" style={procedureSaveSuccessBannerStyle}>
          {t("erProcedureLauncher.saveSuccess")}
        </p>
      ) : null}
      {submitErr ? (
        <p role="alert" style={{ margin: "0 0 12px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
          {submitErr}
        </p>
      ) : null}
      {children({ performedAtLocal, setPerformedAtLocal, submitErr, setSubmitErr, submitting, setSubmitting, onSubmit })}
    </div>
  );
}

export function enumSelect<T extends string>(opts: {
  value: T | "";
  onChange: (v: T | "") => void;
  values: readonly T[];
  labelKey: (v: T) => string;
  t: (k: string) => string;
  required?: boolean;
  placeholderKey: string;
  id?: string;
}): React.ReactElement {
  const { value, onChange, values, labelKey, t, required, placeholderKey, id } = opts;
  return (
    <select
      id={id}
      value={value}
      required={required}
      onChange={(e) => onChange((e.target.value || "") as T | "")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="">{t(placeholderKey)}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {t(labelKey(v))}
        </option>
      ))}
    </select>
  );
}

export function boolSelect(value: boolean, onChange: (v: boolean) => void, t: (k: string) => string, id?: string): React.ReactElement {
  return (
    <select
      id={id}
      value={value ? "true" : "false"}
      required
      onChange={(e) => onChange(e.target.value === "true")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="true">{t("erProcedureLauncher.boolYes")}</option>
      <option value="false">{t("erProcedureLauncher.boolNo")}</option>
    </select>
  );
}

export function PerformedAtField({
  performedAtLocal,
  setPerformedAtLocal,
  t,
}: {
  performedAtLocal: string;
  setPerformedAtLocal: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <label style={labelStyle} htmlFor="procedure-performed-at">
        {t("erProcedureLauncher.fieldPerformedAt")}
      </label>
      <input
        id="procedure-performed-at"
        type="datetime-local"
        value={performedAtLocal}
        onChange={(e) => setPerformedAtLocal(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }}
      />
    </>
  );
}

export function SaveButton({ submitting, t }: { submitting: boolean; t: (k: string) => string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        border: "none",
        background: "#1d4ed8",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: submitting ? "not-allowed" : "pointer",
      }}
    >
      {t("erProcedureLauncher.save")}
    </button>
  );
}

export function validateOtherFields(
  pairs: Array<{ value: string; other: string }>,
  setSubmitErr: (v: string | null) => void,
  t: (k: string) => string
): boolean {
  for (const { value, other } of pairs) {
    if (value === "OTHER" && !other.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return false;
    }
  }
  return true;
}

export function validateRequiredEnums(
  values: Array<string | "">,
  setSubmitErr: (v: string | null) => void,
  t: (k: string) => string
): boolean {
  if (values.some((v) => !v)) {
    setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
    return false;
  }
  return true;
}

export function trimOptional(body: Record<string, unknown>, key: string, value: string) {
  if (value.trim()) body[key] = value.trim();
}
