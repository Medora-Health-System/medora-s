"use client";

import type { CSSProperties } from "react";
import {
  NURSING_ADMISSION_OPTION_CATALOGS,
  fieldIsVisible,
  nursingSectionSchema,
  type InpatientAdmissionClinicalSection,
  type NursingSectionFieldDef,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { NursingAdmissionRapidSectionControls } from "./rapid-documentation/NursingAdmissionRapidSectionControls";
import { sentenceCaseClinicalLabel } from "@medora/shared";

type Props = {
  sectionId: InpatientAdmissionClinicalSection;
  answers: Record<string, unknown>;
  unableReason: string;
  readOnly?: boolean;
  onChange: (answers: Record<string, unknown>) => void;
  onUnableReasonChange: (reason: string) => void;
};

function HelpTip({ helpKey }: { helpKey: string }) {
  const { t } = useI18n();
  const text = t(helpKey);
  return (
    <button
      type="button"
      title={text}
      aria-label={text}
      style={helpBtn}
      data-testid={`help-${helpKey}`}
    >
      ?
    </button>
  );
}

function FieldControl(props: {
  field: NursingSectionFieldDef;
  value: unknown;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
}) {
  const { t } = useI18n();
  const { field, value, readOnly, onChange } = props;
  const options = field.optionsKey
    ? NURSING_ADMISSION_OPTION_CATALOGS[field.optionsKey] ?? []
    : [];
  const labelRaw = t(`hospitalAdmissionD4a25.fields.${field.key}`);
  const label =
    labelRaw === `hospitalAdmissionD4a25.fields.${field.key}`
      ? sentenceCaseClinicalLabel(field.key)
      : labelRaw;
  const commonLabel: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 };

  if (field.control === "textarea") {
    return (
      <label style={commonLabel}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          <HelpTip helpKey={field.helpKey} />
        </span>
        <textarea
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (field.control === "number") {
    return (
      <label style={commonLabel}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          <HelpTip helpKey={field.helpKey} />
        </span>
        <input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (field.control === "datetime" || field.control === "date") {
    return (
      <label style={commonLabel}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          <HelpTip helpKey={field.helpKey} />
        </span>
        <input
          type={field.control === "date" ? "date" : "datetime-local"}
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        />
      </label>
    );
  }

  if (
    field.control === "select" ||
    field.control === "radio" ||
    field.control === "yes_no_unknown" ||
    field.control === "presentAbsentUnable"
  ) {
    const opts =
      options.length > 0
        ? options
        : field.control === "yes_no_unknown"
          ? NURSING_ADMISSION_OPTION_CATALOGS.yesNoUnknown
          : field.control === "presentAbsentUnable"
            ? NURSING_ADMISSION_OPTION_CATALOGS.presentAbsentUnable
            : [];
    return (
      <label style={commonLabel}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          <HelpTip helpKey={field.helpKey} />
        </span>
        <select
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value || null)}
          style={inputStyle}
          data-testid={`field-${field.key}`}
        >
          <option value="">{t("hospitalAdmissionD4a25.selectPlaceholder")}</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {t(`hospitalAdmissionD4a25.options.${opt}`)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.control === "multiselect" || field.control === "checkbox") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 8, margin: 0 }}>
        <legend style={{ fontSize: 12, fontWeight: 600, display: "contents" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {label}
            <HelpTip helpKey={field.helpKey} />
          </span>
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} style={{ fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={checked}
                  onChange={() => {
                    if (checked) onChange(selected.filter((x) => x !== opt));
                    else onChange([...selected, opt]);
                  }}
                  data-testid={`field-${field.key}-${opt}`}
                />
                {t(`hospitalAdmissionD4a25.options.${opt}`)}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label style={commonLabel}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {label}
        <HelpTip helpKey={field.helpKey} />
      </span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        data-testid={`field-${field.key}`}
      />
    </label>
  );
}

export function NursingAdmissionStructuredSectionForm({
  sectionId,
  answers,
  unableReason,
  readOnly,
  onChange,
  onUnableReasonChange,
}: Props) {
  const { t } = useI18n();
  const schema = nursingSectionSchema(sectionId);

  return (
    <div data-testid={`structured-section-${sectionId}`} style={{ display: "grid", gap: 10 }}>
      <NursingAdmissionRapidSectionControls
        sectionId={sectionId}
        answers={answers}
        readOnly={readOnly}
        onChange={onChange}
      />
      <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
        <HelpTip helpKey={schema.helpKey} />{" "}
        {t(schema.helpKey)}
      </p>
      {schema.domainReuse?.length ? (
        <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
          {t("hospitalAdmissionD4a25.domainReuse")}: {schema.domainReuse.join(" · ")}
        </p>
      ) : null}
      {schema.fields.map((field) => {
        if (!fieldIsVisible(field, answers)) return null;
        return (
          <FieldControl
            key={field.key}
            field={field}
            value={answers[field.key]}
            readOnly={readOnly}
            onChange={(v) => onChange({ ...answers, [field.key]: v })}
          />
        );
      })}
      <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {t("hospitalAdmissionD4a25.unableReason")}
          <HelpTip helpKey="hospitalAdmissionD4a25.help.fields.unableReason" />
        </span>
        <textarea
          value={unableReason}
          disabled={readOnly}
          rows={2}
          onChange={(e) => onUnableReasonChange(e.target.value)}
          style={inputStyle}
          data-testid="field-unableReason"
        />
      </label>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 8,
  fontSize: 13,
  boxSizing: "border-box",
};

const helpBtn: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 9999,
  border: "1px solid #94a3b8",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 11,
  fontWeight: 700,
  cursor: "help",
  lineHeight: "16px",
  padding: 0,
};
