"use client";

import React, { useId, useMemo, useState } from "react";
import { ProviderDocumentationChipPanel } from "@/components/encounters/ProviderDocumentationChipPanel";
import {
  isDocumentationChipSelected,
  resolveDocumentationChipStyles,
} from "@/lib/providerDocumentationChipSelection";
import type { MdmTemplateOption } from "@/lib/providerDocumentationMdmTemplateCatalog";
import type { ProviderDocumentationWorkspaceState } from "@/lib/providerDocumentationModel";

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 9999,
  border: "1px solid",
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1.35,
  textAlign: "left",
};

export function ProviderDocumentationMdmTemplateDropdown({
  title,
  placeholder,
  highValueGroupLabel,
  existingGroupLabel,
  options,
  value,
  readOnly,
  resolveFragment,
  resolveLabel,
  onToggleField,
}: {
  title: string;
  placeholder: string;
  highValueGroupLabel: string;
  existingGroupLabel: string;
  options: MdmTemplateOption[];
  value: ProviderDocumentationWorkspaceState;
  readOnly: boolean;
  resolveFragment: (fragmentKey: string) => string;
  resolveLabel: (option: MdmTemplateOption) => string;
  onToggleField: (field: keyof ProviderDocumentationWorkspaceState, fragmentKey: string) => void;
}) {
  const [selectValue, setSelectValue] = useState("");
  const selectId = useId();

  const highValueOptions = useMemo(
    () => options.filter((option) => option.group === "highValue"),
    [options]
  );
  const existingOptions = useMemo(
    () => options.filter((option) => option.group === "existing"),
    [options]
  );

  const selectedOptions = useMemo(
    () =>
      options.filter((option) => {
        const fieldValue = value[option.field];
        if (typeof fieldValue !== "string") return false;
        return isDocumentationChipSelected(fieldValue, resolveFragment(option.fragmentKey));
      }),
    [options, resolveFragment, value]
  );

  if (options.length === 0) return null;

  const handleSelect = (optionId: string) => {
    const option = options.find((item) => item.id === optionId);
    if (!option || readOnly) return;
    onToggleField(option.field, option.fragmentKey);
    setSelectValue("");
  };

  return (
    <ProviderDocumentationChipPanel title={title} selectedCount={selectedOptions.length} defaultExpanded>
      <label htmlFor={selectId} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
        {placeholder}
      </label>
      <select
        id={selectId}
        value={selectValue}
        disabled={readOnly}
        onChange={(event) => {
          const next = event.target.value;
          setSelectValue(next);
          if (next) handleSelect(next);
        }}
        style={{
          width: "100%",
          fontSize: 12,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: readOnly ? "#f8fafc" : "#fff",
          color: readOnly ? "#94a3b8" : "#0f172a",
          fontFamily: "inherit",
        }}
      >
        <option value="">{placeholder}</option>
        {highValueOptions.length > 0 ? (
          <optgroup label={highValueGroupLabel}>
            {highValueOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.highValue ? "📄 " : ""}
                {resolveLabel(option)}
              </option>
            ))}
          </optgroup>
        ) : null}
        {existingOptions.length > 0 ? (
          <optgroup label={existingGroupLabel}>
            {existingOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {resolveLabel(option)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>

      {selectedOptions.length > 0 ? (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
          data-testid="provider-documentation-mdm-selected-templates"
        >
          {selectedOptions.map((option) => {
            const fieldValue = String(value[option.field] ?? "");
            const fragment = resolveFragment(option.fragmentKey);
            const selected = isDocumentationChipSelected(fieldValue, fragment);
            const toneStyles = resolveDocumentationChipStyles({ selected, readOnly: Boolean(readOnly) });
            return (
              <button
                key={option.id}
                type="button"
                disabled={readOnly}
                aria-pressed={selected}
                title={fragment}
                onClick={() => onToggleField(option.field, option.fragmentKey)}
                style={{
                  ...chipStyle,
                  background: toneStyles.background,
                  borderColor: toneStyles.borderColor,
                  color: toneStyles.color,
                  borderWidth: selected ? 2 : 1,
                  cursor: readOnly ? "not-allowed" : "pointer",
                  maxWidth: "100%",
                }}
              >
                {selected ? "✓ " : ""}
                {resolveLabel(option)}
              </button>
            );
          })}
        </div>
      ) : null}
    </ProviderDocumentationChipPanel>
  );
}
