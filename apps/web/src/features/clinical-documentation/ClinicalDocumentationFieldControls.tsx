"use client";

import React from "react";
import type { ClinicalDocumentationFieldOption } from "@medora/shared";
import { formatClinicalDocumentationOptionLabel } from "@medora/shared";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 2,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  minHeight: 36,
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

export function ClinicalDocumentationSelectField<T extends string | number | boolean>({
  label,
  value,
  options,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<ClinicalDocumentationFieldOption<T>>;
  locale: "en" | "fr";
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <select
        data-testid={testId}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        style={fieldStyle}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {formatClinicalDocumentationOptionLabel(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ClinicalDocumentationScoreSelectField<T extends string | number>({
  label,
  value,
  options,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<ClinicalDocumentationFieldOption<T>>;
  locale: "en" | "fr";
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={options}
      locale={locale}
      onChange={onChange}
      testId={testId ?? "clinical-documentation-score-select"}
    />
  );
}

export function ClinicalDocumentationBooleanField({
  label,
  value,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: boolean;
  locale: "en" | "fr";
  onChange: (value: boolean) => void;
  testId?: string;
}) {
  const options: ClinicalDocumentationFieldOption<boolean>[] = [
    { value: true, labelEn: "Yes", labelFr: "Oui" },
    { value: false, labelEn: "No", labelFr: "Non" },
  ];
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={options}
      locale={locale}
      onChange={onChange}
      testId={testId ?? "clinical-documentation-boolean-select"}
    />
  );
}
