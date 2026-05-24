"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  HOME_MED_COMPLIANCE_CHIP_CODES,
  HOME_MED_FREQUENCY_CHIP_CODES,
  HOME_MED_LAST_TAKEN_CHIP_CODES,
  applyHomeMedicationDoseChip,
  emptyHomeMedicationEntryForm,
  extractHomeMedicationDoseStrengthChips,
  homeMedicationEntryFormFromCatalog,
  homeMedicationEntryFormIsValid,
  type HomeMedicationCompliance,
  type HomeMedicationEntryForm,
  type HomeMedicationLastTaken,
  type HomeMedicationStatus,
} from "./homeMedicationEntry";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

function QuickChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 9999,
        border: active ? "1px solid #166534" : "1px solid #cbd5e1",
        backgroundColor: active ? "#dcfce7" : "#fff",
        color: active ? "#166534" : "#334155",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 10 }}>{children}</div>
  );
}

export function HomeMedicationEntryModal({
  catalogItem,
  disabled,
  onCancel,
  onSave,
}: {
  catalogItem: CatalogSearchItem;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (entry: HomeMedicationEntryForm) => void;
}) {
  const { t, language } = useI18n();
  const [form, setForm] = useState<HomeMedicationEntryForm>(() =>
    homeMedicationEntryFormFromCatalog(catalogItem, language, t)
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setForm(homeMedicationEntryFormFromCatalog(catalogItem, language, t));
    setSubmitError(null);
  }, [catalogItem, language, t]);

  const doseChips = useMemo(() => extractHomeMedicationDoseStrengthChips(catalogItem), [catalogItem]);

  const patch = (partial: Partial<HomeMedicationEntryForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    if (!homeMedicationEntryFormIsValid(form)) {
      setSubmitError(t("erTriage.homeMed.errNameRequired"));
      return;
    }
    setSubmitError(null);
    onSave(form);
  };

  const statusOptions: { value: HomeMedicationStatus; label: string }[] = [
    { value: "active", label: t("erTriage.homeMed.status.active") },
    { value: "inactive", label: t("erTriage.homeMed.status.inactive") },
    { value: "in_error", label: t("erTriage.homeMed.status.in_error") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-med-entry-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !disabled) onCancel();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          maxWidth: 560,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="home-med-entry-title" style={{ margin: "0 0 4px 0", fontSize: 17, color: "#0f172a" }}>
          {t("erTriage.homeMed.modalTitle").replace("{name}", form.medicationName)}
        </h4>
        <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("erTriage.homeMed.historyOnlyNotice")}
        </p>

        {!form.catalogDetailsAvailable ? (
          <p
            style={{
              margin: "0 0 12px 0",
              padding: "8px 10px",
              borderRadius: 8,
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              fontSize: 12,
              color: "#92400e",
            }}
          >
            {t("erTriage.homeMed.detailsUnavailableManual")}
          </p>
        ) : null}

        {submitError ? (
          <p role="alert" style={{ margin: "0 0 10px 0", fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
            {submitError}
          </p>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>{t("erTriage.homeMed.field.medicationName")} *</label>
            <input
              type="text"
              value={form.medicationName}
              onChange={(e) => patch({ medicationName: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.status")}</label>
            <select
              value={form.status}
              onChange={(e) => patch({ status: e.target.value as HomeMedicationStatus })}
              disabled={disabled}
              style={inputStyle}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.strength")}</label>
            <input
              type="text"
              value={form.strength}
              onChange={(e) => patch({ strength: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.doseValue")}</label>
            <input
              type="text"
              value={form.doseValue}
              onChange={(e) => patch({ doseValue: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.doseUnit")}</label>
            <input
              type="text"
              value={form.doseUnit}
              onChange={(e) => patch({ doseUnit: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          {doseChips.length > 0 ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>{t("erTriage.homeMed.chipsDose")}</span>
              <ChipRow>
                {doseChips.map((chip) => (
                  <QuickChip
                    key={chip}
                    label={chip}
                    active={form.strength.trim() === chip}
                    disabled={disabled}
                    onClick={() => patch(applyHomeMedicationDoseChip(form, chip))}
                  />
                ))}
              </ChipRow>
            </div>
          ) : null}

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.route")}</label>
            <input
              type="text"
              value={form.route}
              onChange={(e) => patch({ route: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.frequency")}</label>
            <input
              type="text"
              value={form.frequency}
              onChange={(e) => patch({ frequency: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>{t("erTriage.homeMed.chipsFrequency")}</span>
            <ChipRow>
              {HOME_MED_FREQUENCY_CHIP_CODES.map((code) => (
                <QuickChip
                  key={code}
                  label={t(`erTriage.homeMed.frequency.${code}`)}
                  active={form.frequency.trim().toLowerCase() === t(`erTriage.homeMed.frequency.${code}`).trim().toLowerCase()}
                  disabled={disabled}
                  onClick={() => patch({ frequency: t(`erTriage.homeMed.frequency.${code}`) })}
                />
              ))}
            </ChipRow>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>{t("erTriage.homeMed.field.indication")}</label>
            <input
              type="text"
              value={form.indication}
              onChange={(e) => patch({ indication: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.startDate")}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.lastTaken")}</label>
            <input
              type="text"
              value={form.lastTaken ? t(`erTriage.homeMed.lastTaken.${form.lastTaken}`) : ""}
              readOnly
              placeholder={t("erTriage.homeMed.field.lastTakenPlaceholder")}
              disabled={disabled}
              style={{ ...inputStyle, backgroundColor: "#f8fafc" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>{t("erTriage.homeMed.chipsLastTaken")}</span>
            <ChipRow>
              {HOME_MED_LAST_TAKEN_CHIP_CODES.map((code) => (
                <QuickChip
                  key={code}
                  label={t(`erTriage.homeMed.lastTaken.${code}`)}
                  active={form.lastTaken === code}
                  disabled={disabled}
                  onClick={() => patch({ lastTaken: code as HomeMedicationLastTaken })}
                />
              ))}
            </ChipRow>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>{t("erTriage.homeMed.chipsCompliance")}</span>
            <ChipRow>
              {HOME_MED_COMPLIANCE_CHIP_CODES.map((code) => (
                <QuickChip
                  key={code}
                  label={t(`erTriage.homeMed.compliance.${code}`)}
                  active={form.compliance === code}
                  disabled={disabled}
                  onClick={() => patch({ compliance: code as HomeMedicationCompliance })}
                />
              ))}
            </ChipRow>
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.dosageForm")}</label>
            <input
              type="text"
              value={form.dosageForm}
              onChange={(e) => patch({ dosageForm: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.therapeuticClass")}</label>
            <input
              type="text"
              value={form.therapeuticClass}
              onChange={(e) => patch({ therapeuticClass: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.quantity")}</label>
            <input
              type="text"
              value={form.quantity}
              onChange={(e) => patch({ quantity: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.refillsRemaining")}</label>
            <input
              type="text"
              value={form.refillsRemaining}
              onChange={(e) => patch({ refillsRemaining: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.duration")}</label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => patch({ duration: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.endDate")}</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.lastFillDate")}</label>
            <input
              type="date"
              value={form.lastFillDate}
              onChange={(e) => patch({ lastFillDate: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("erTriage.homeMed.field.source")}</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => patch({ source: e.target.value })}
              disabled={disabled}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>{t("erTriage.homeMed.field.patientInstructions")}</label>
            <textarea
              value={form.patientInstructions}
              onChange={(e) => patch({ patientInstructions: e.target.value })}
              disabled={disabled}
              rows={2}
              style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>{t("erTriage.homeMed.field.notes")}</label>
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              disabled={disabled}
              rows={2}
              style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 14,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {t("erTriage.homeMed.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#1a1a1a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {t("erTriage.homeMed.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
