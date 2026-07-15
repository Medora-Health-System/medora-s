"use client";

import React from "react";
import type { ClinicalOnsetValue } from "./clinicalOnsetModel";

export type ClinicalOnsetFieldsProps = {
  value: ClinicalOnsetValue;
  onChange: (next: ClinicalOnsetValue) => void;
  disabled?: boolean;
  t: (key: string) => string;
  autoFocus?: boolean;
};

const radioStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  color: "#0f172a",
  minHeight: 36,
  cursor: "pointer",
};

export function ClinicalOnsetFields({
  value,
  onChange,
  disabled = false,
  t,
  autoFocus = false,
}: ClinicalOnsetFieldsProps) {
  const setChoice = (choice: ClinicalOnsetValue["choice"]) => {
    onChange({
      ...value,
      choice,
      dateLocal: choice.startsWith("CUSTOM") ? value.dateLocal ?? "" : value.dateLocal,
      timeLocal: choice === "CUSTOM_DATETIME" ? value.timeLocal ?? "" : value.timeLocal,
    });
  };

  return (
    <fieldset
      data-testid="clinical-onset-fields"
      disabled={disabled}
      style={{ margin: 0, padding: 0, border: "none", display: "flex", flexDirection: "column", gap: 8 }}
    >
      <legend style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
        {t("diagnosisOnset.clinicalOnset")}
      </legend>

      <label style={radioStyle}>
        <input
          type="radio"
          name="clinical-onset-choice"
          checked={value.choice === "UNKNOWN"}
          onChange={() => setChoice("UNKNOWN")}
          autoFocus={autoFocus}
          disabled={disabled}
        />
        {t("diagnosisOnset.unknown")}
      </label>
      <label style={radioStyle}>
        <input
          type="radio"
          name="clinical-onset-choice"
          checked={value.choice === "NOW"}
          onChange={() => setChoice("NOW")}
          disabled={disabled}
        />
        {t("diagnosisOnset.now")}
      </label>
      <label style={radioStyle}>
        <input
          type="radio"
          name="clinical-onset-choice"
          checked={value.choice === "CUSTOM_DATE"}
          onChange={() => setChoice("CUSTOM_DATE")}
          disabled={disabled}
        />
        {t("diagnosisOnset.customDate")}
      </label>
      <label style={radioStyle}>
        <input
          type="radio"
          name="clinical-onset-choice"
          checked={value.choice === "CUSTOM_DATETIME"}
          onChange={() => setChoice("CUSTOM_DATETIME")}
          disabled={disabled}
        />
        {t("diagnosisOnset.customDateTime")}
      </label>

      {value.choice === "CUSTOM_DATE" || value.choice === "CUSTOM_DATETIME" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {t("diagnosisOnset.date")}
            <input
              type="date"
              data-testid="clinical-onset-date"
              value={value.dateLocal ?? ""}
              onChange={(e) => onChange({ ...value, dateLocal: e.target.value })}
              disabled={disabled}
              style={{
                display: "block",
                marginTop: 4,
                minHeight: 40,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
              }}
            />
          </label>
          {value.choice === "CUSTOM_DATETIME" ? (
            <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
              {t("diagnosisOnset.time")}
              <input
                type="time"
                data-testid="clinical-onset-time"
                value={value.timeLocal ?? ""}
                onChange={(e) => onChange({ ...value, timeLocal: e.target.value })}
                disabled={disabled}
                style={{
                  display: "block",
                  marginTop: 4,
                  minHeight: 40,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
