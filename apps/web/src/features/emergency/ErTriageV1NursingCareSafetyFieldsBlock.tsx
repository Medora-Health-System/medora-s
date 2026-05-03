"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  ER_TRIAGE_NURSING_CHIP_DEFS,
  appendIfNotPresent,
  type ErTriageV1NursingCarePersistSlice,
  type ErYesNoUnknown,
} from "./medoraErTriageV1";

const chipHintStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 500,
};

function ErTriageDocChip({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        border: active ? "1px solid #3b82f6" : "1px solid #e2e8f0",
        background: active ? "#eff6ff" : "#f8fafc",
        color: "#334155",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        lineHeight: 1.3,
        opacity: disabled ? 0.55 : 1,
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function ErTriageDocChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>{children}</div>
  );
}

function toggleNursingCareChip(
  slice: ErTriageV1NursingCarePersistSlice,
  onSliceChange: (p: Partial<ErTriageV1NursingCarePersistSlice>) => void,
  code: string,
  label: string
): void {
  const current = slice.nursingCareSelections;
  if (current.includes(code)) {
    onSliceChange({ nursingCareSelections: current.filter((c) => c !== code) });
    return;
  }
  onSliceChange({
    nursingCareSelections: [...current, code],
    nursingCareNote: appendIfNotPresent(slice.nursingCareNote, label),
  });
}

export type ErTriageV1NursingCareSafetyFieldsBlockProps = {
  slice: ErTriageV1NursingCarePersistSlice;
  onSliceChange: (patch: Partial<ErTriageV1NursingCarePersistSlice>) => void;
  formDisabled: boolean;
  inputBase: React.CSSProperties;
  labelStyle: React.CSSProperties;
  grid3: React.CSSProperties;
};

export function ErTriageV1NursingCareSafetyFieldsBlock({
  slice,
  onSliceChange,
  formDisabled,
  inputBase,
  labelStyle,
  grid3,
}: ErTriageV1NursingCareSafetyFieldsBlockProps) {
  const { t } = useI18n();
  const dash = t("erTriage.preview.emptyOption");
  const ynuOptions: { value: ErYesNoUnknown; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t, dash]
  );

  const sel = (key: keyof ErTriageV1NursingCarePersistSlice, options: { value: string; label: string }[]) => (
    <select
      value={String(slice[key] ?? "")}
      onChange={(e) => onSliceChange({ [key]: e.target.value } as Partial<ErTriageV1NursingCarePersistSlice>)}
      disabled={formDisabled}
      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
    >
      {options.map((o) => (
        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>{t("erTriage.v1.nursingSummary")}</label>
        <textarea
          value={slice.nursingCareNote}
          onChange={(e) => onSliceChange({ nursingCareNote: e.target.value })}
          disabled={formDisabled}
          rows={2}
          maxLength={8000}
          style={{ ...inputBase, marginTop: 6, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
        />
        <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
        <ErTriageDocChipRow>
          {ER_TRIAGE_NURSING_CHIP_DEFS.map((def) => {
            const label = t(`erTriage.v1.${def.i18nKey}`);
            return (
              <ErTriageDocChip
                key={def.code}
                label={label}
                active={slice.nursingCareSelections.includes(def.code)}
                disabled={formDisabled}
                onClick={() => toggleNursingCareChip(slice, onSliceChange, def.code, label)}
              />
            );
          })}
        </ErTriageDocChipRow>
      </div>
      <div style={grid3}>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.callLight")}</label>
          {sel("callLightInReach", ynuOptions)}
        </div>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.bedLow")}</label>
          {sel("bedLockedLow", ynuOptions)}
        </div>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.familyBedside")}</label>
          {sel("familyAtBedside", ynuOptions)}
        </div>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.inView")}</label>
          {sel("inViewOfNursingStation", ynuOptions)}
        </div>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.planExplained")}</label>
          {sel("patientUpdatedOnPlan", ynuOptions)}
        </div>
        <div>
          <label style={labelStyle}>{t("erTriage.v1.comfort")}</label>
          {sel("comfortMeasuresProvided", ynuOptions)}
        </div>
      </div>
      <div>
        <label style={labelStyle}>{t("erTriage.v1.edPpe")}</label>
        <input
          type="text"
          value={slice.edCoursePpeNote}
          onChange={(e) => onSliceChange({ edCoursePpeNote: e.target.value })}
          disabled={formDisabled}
          style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
        />
      </div>
      <div>
        <label style={labelStyle}>{t("erTriage.v1.nursingAddendum")}</label>
        <textarea
          value={slice.nursingNotesAddendum}
          onChange={(e) => onSliceChange({ nursingNotesAddendum: e.target.value })}
          disabled={formDisabled}
          rows={3}
          maxLength={8000}
          style={{ ...inputBase, marginTop: 6, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
        />
      </div>
    </div>
  );
}
