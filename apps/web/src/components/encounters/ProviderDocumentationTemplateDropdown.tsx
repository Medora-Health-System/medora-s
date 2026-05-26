"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { ProviderDocumentationChipPanel } from "@/components/encounters/ProviderDocumentationChipPanel";
import {
  isDocumentationChipSelected,
  resolveDocumentationChipStyles,
} from "@/lib/providerDocumentationChipSelection";
import {
  applyMdmTemplatePendingSelections,
  resolveAppliedMdmTemplateOptionIds,
  type MdmTemplateOption,
} from "@/lib/providerDocumentationMdmTemplateCatalog";
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

const optionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "6px 0",
  fontSize: 12,
  lineHeight: 1.4,
  color: "#0f172a",
  cursor: "pointer",
};

const actionButtonStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid",
  fontFamily: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

function MdmTemplateOptionList({
  groupLabel,
  options,
  startIndex,
  pendingIds,
  readOnly,
  resolveLabel,
  onTogglePending,
}: {
  groupLabel: string;
  options: MdmTemplateOption[];
  startIndex: number;
  pendingIds: Set<string>;
  readOnly: boolean;
  resolveLabel: (option: MdmTemplateOption) => string;
  onTogglePending: (optionId: string, checked: boolean) => void;
}) {
  const groupId = useId();

  if (options.length === 0) return null;

  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          padding: 0,
          marginBottom: 4,
        }}
      >
        {groupLabel}
      </legend>
      <div role="group" aria-labelledby={groupId} id={groupId}>
        {options.map((option, index) => {
          const displayNumber = startIndex + index + 1;
          const inputId = `${groupId}-${option.id}`;
          return (
            <label key={option.id} htmlFor={inputId} style={optionRowStyle}>
              <input
                id={inputId}
                type="checkbox"
                checked={pendingIds.has(option.id)}
                disabled={readOnly}
                onChange={(event) => onTogglePending(option.id, event.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>
                <span aria-hidden style={{ fontWeight: 700, marginRight: 4 }}>
                  {displayNumber}.
                </span>
                {option.highValue ? "📄 " : ""}
                {resolveLabel(option)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProviderDocumentationMdmTemplateDropdown({
  title,
  placeholder,
  highValueGroupLabel,
  existingGroupLabel,
  applySelectedLabel,
  cancelLabel,
  options,
  value,
  readOnly,
  resolveFragment,
  resolveLabel,
  onToggleField,
  onApplyFieldPatches,
}: {
  title: string;
  placeholder: string;
  highValueGroupLabel: string;
  existingGroupLabel: string;
  applySelectedLabel: string;
  cancelLabel: string;
  options: MdmTemplateOption[];
  value: ProviderDocumentationWorkspaceState;
  readOnly: boolean;
  resolveFragment: (fragmentKey: string) => string;
  resolveLabel: (option: MdmTemplateOption) => string;
  onToggleField: (field: keyof ProviderDocumentationWorkspaceState, fragmentKey: string) => void;
  onApplyFieldPatches: (patches: Partial<ProviderDocumentationWorkspaceState>) => void;
}) {
  const panelId = useId();
  const appliedIds = useMemo(
    () =>
      resolveAppliedMdmTemplateOptionIds({
        options,
        value,
        resolveFragment,
      }),
    [options, resolveFragment, value]
  );
  const appliedIdsKey = useMemo(() => [...appliedIds].sort().join("|"), [appliedIds]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set(appliedIds));

  useEffect(() => {
    setPendingIds(new Set(appliedIds));
  }, [appliedIdsKey, appliedIds]);

  const highValueOptions = useMemo(
    () => options.filter((option) => option.group === "highValue"),
    [options]
  );
  const existingOptions = useMemo(
    () => options.filter((option) => option.group === "existing"),
    [options]
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => appliedIds.has(option.id)),
    [appliedIds, options]
  );

  const hasPendingChanges = useMemo(() => {
    if (pendingIds.size !== appliedIds.size) return true;
    for (const id of pendingIds) {
      if (!appliedIds.has(id)) return true;
    }
    return false;
  }, [appliedIds, pendingIds]);

  if (options.length === 0) return null;

  const handleTogglePending = (optionId: string, checked: boolean) => {
    if (readOnly) return;
    setPendingIds((current) => {
      const next = new Set(current);
      if (checked) next.add(optionId);
      else next.delete(optionId);
      return next;
    });
  };

  const handleApply = () => {
    if (readOnly || !hasPendingChanges) return;
    const patch = applyMdmTemplatePendingSelections({
      value,
      options,
      pendingIds,
      resolveFragment,
    });
    if (Object.keys(patch).length > 0) {
      onApplyFieldPatches(patch);
    }
  };

  const handleCancel = () => {
    setPendingIds(new Set(appliedIds));
  };

  return (
    <ProviderDocumentationChipPanel title={title} selectedCount={selectedOptions.length} defaultExpanded>
      <p
        id={`${panelId}-hint`}
        style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 8px" }}
      >
        {placeholder}
      </p>
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-describedby={`${panelId}-hint`}
        data-testid="provider-documentation-mdm-template-options"
        style={{
          maxHeight: 280,
          overflowY: "auto",
          padding: "4px 0",
          marginBottom: 10,
        }}
      >
        <MdmTemplateOptionList
          groupLabel={highValueGroupLabel}
          options={highValueOptions}
          startIndex={0}
          pendingIds={pendingIds}
          readOnly={readOnly}
          resolveLabel={resolveLabel}
          onTogglePending={handleTogglePending}
        />
        {highValueOptions.length > 0 && existingOptions.length > 0 ? (
          <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} aria-hidden />
        ) : null}
        <MdmTemplateOptionList
          groupLabel={existingGroupLabel}
          options={existingOptions}
          startIndex={highValueOptions.length}
          pendingIds={pendingIds}
          readOnly={readOnly}
          resolveLabel={resolveLabel}
          onTogglePending={handleTogglePending}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          disabled={readOnly || !hasPendingChanges}
          data-testid="provider-documentation-mdm-apply-selected"
          onClick={handleApply}
          style={{
            ...actionButtonStyle,
            background: readOnly || !hasPendingChanges ? "#f1f5f9" : "#1d4ed8",
            borderColor: readOnly || !hasPendingChanges ? "#cbd5e1" : "#1d4ed8",
            color: readOnly || !hasPendingChanges ? "#94a3b8" : "#fff",
            cursor: readOnly || !hasPendingChanges ? "not-allowed" : "pointer",
          }}
        >
          {applySelectedLabel}
        </button>
        <button
          type="button"
          disabled={readOnly || !hasPendingChanges}
          data-testid="provider-documentation-mdm-cancel-selection"
          onClick={handleCancel}
          style={{
            ...actionButtonStyle,
            background: "#fff",
            borderColor: "#cbd5e1",
            color: readOnly || !hasPendingChanges ? "#94a3b8" : "#334155",
            cursor: readOnly || !hasPendingChanges ? "not-allowed" : "pointer",
          }}
        >
          {cancelLabel}
        </button>
      </div>

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
