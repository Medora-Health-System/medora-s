"use client";

import React from "react";
import { isPartialControlledDose, type MedicationSafetyGovernanceDisplayInput } from "@medora/shared";
import { ClinicalUserRoleAutocomplete } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import type { ClinicalUserRoleOption } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { useI18n } from "@/lib/i18n";

export type MarControlledSubstanceFormState = {
  witnessUserId: string | null;
  witnessDisplayName: string;
  wasteAmount: string;
  wasteUnit: string;
  wasteReason: string;
  overrideReason: string;
  controlledOverrideAcknowledged: boolean;
  useOverride: boolean;
};

export function marControlledWorkflowVisible(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string
): boolean {
  return (
    marAction === "administered" &&
    governance.isControlled === true
  );
}

export function MarControlledSubstanceFields({
  facilityId,
  currentUserId,
  governance,
  marAction,
  orderedQuantity,
  administeredQuantity,
  defaultWasteUnit,
  state,
  onChange,
  fieldErrors,
}: {
  facilityId: string;
  currentUserId: string | null | undefined;
  governance: MedicationSafetyGovernanceDisplayInput;
  marAction: string;
  orderedQuantity: number | null;
  administeredQuantity: string;
  defaultWasteUnit: string;
  state: MarControlledSubstanceFormState;
  onChange: (patch: Partial<MarControlledSubstanceFormState>) => void;
  fieldErrors?: Partial<Record<keyof MarControlledSubstanceFormState | "witness", string>>;
}) {
  const { t } = useI18n();

  if (!marControlledWorkflowVisible(governance, marAction)) {
    return null;
  }

  const adminQtyNum = administeredQuantity.trim() ? Number(administeredQuantity) : null;
  const partialDose = isPartialControlledDose({
    administeredQuantity: Number.isFinite(adminQtyNum as number) ? adminQtyNum : null,
    orderedQuantity,
  });
  const showWaste =
    governance.wasteDocumentationRecommended === true ||
    partialDose ||
    state.wasteAmount.trim().length > 0;
  const requiresWitness = governance.requiresWitness === true;
  const showOverride = state.useOverride;

  const witnessSelected: ClinicalUserRoleOption | null = state.witnessUserId
    ? {
        id: state.witnessUserId,
        firstName: state.witnessDisplayName.split(" ")[0] ?? "",
        lastName: state.witnessDisplayName.split(" ").slice(1).join(" ") ?? "",
      }
    : null;

  return (
    <section
      role="region"
      aria-labelledby="mar-controlled-workflow-title"
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #fecaca",
        backgroundColor: "#fef2f2",
      }}
    >
      <h4
        id="mar-controlled-workflow-title"
        style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#991b1b" }}
      >
        {t("marControlled.title")}
      </h4>
      <p id="mar-controlled-workflow-desc" style={{ margin: "0 0 12px", fontSize: 12, color: "#7f1d1d" }}>
        {t("marControlled.description")}
      </p>

      {requiresWitness && !showOverride ? (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="mar-controlled-witness" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {t("marControlled.witnessLabel")}
          </label>
          <ClinicalUserRoleAutocomplete
            facilityId={facilityId}
            role="RN"
            ariaLabel={t("marControlled.witnessAria")}
            placeholder={t("marControlled.witnessPlaceholder")}
            displayValue={state.witnessDisplayName}
            onChangeDisplay={(v) => onChange({ witnessDisplayName: v, witnessUserId: null })}
            selectedUserId={state.witnessUserId}
            onSelectUser={(u) =>
              onChange({
                witnessUserId: u?.id ?? null,
                witnessDisplayName: u ? `${u.firstName} ${u.lastName}`.trim() : "",
              })
            }
          />
          {witnessSelected ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#166534" }}>
              {t("marControlled.witnessSelected")}
            </p>
          ) : null}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={showOverride}
              onChange={(e) => onChange({ useOverride: e.target.checked })}
            />
            {t("marControlled.useOverride")}
          </label>
          {fieldErrors?.witness ? (
            <p role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {fieldErrors.witness}
            </p>
          ) : null}
        </div>
      ) : null}

      {showOverride ? (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="mar-controlled-override-reason" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {t("marControlled.overrideReasonLabel")}
          </label>
          <textarea
            id="mar-controlled-override-reason"
            value={state.overrideReason}
            onChange={(e) => onChange({ overrideReason: e.target.value })}
            rows={3}
            style={{ width: "100%", marginTop: 4, fontSize: 13, borderRadius: 8, border: "1px solid #fca5a5" }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.controlledOverrideAcknowledged}
              onChange={(e) => onChange({ controlledOverrideAcknowledged: e.target.checked })}
            />
            {t("marControlled.overrideAck")}
          </label>
          {!requiresWitness ? null : (
            <button
              type="button"
              style={{
                marginTop: 8,
                fontSize: 12,
                background: "none",
                border: "none",
                color: "#1d4ed8",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => onChange({ useOverride: false })}
            >
              {t("marControlled.backToWitness")}
            </button>
          )}
        </div>
      ) : null}

      {showWaste ? (
        <fieldset
          style={{ margin: 0, padding: 0, border: "none" }}
          aria-describedby="mar-controlled-waste-hint"
        >
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t("marControlled.wasteLegend")}</legend>
          <p id="mar-controlled-waste-hint" style={{ margin: "0 0 8px", fontSize: 12, color: "#7f1d1d" }}>
            {partialDose ? t("marControlled.wastePartialHint") : t("marControlled.wasteHint")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 100px", fontSize: 12 }}>
              {t("marControlled.wasteAmountLabel")}
              <input
                type="number"
                min={0}
                step="any"
                value={state.wasteAmount}
                onChange={(e) => onChange({ wasteAmount: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4 }}
                aria-label={t("marControlled.wasteAmountLabel")}
              />
            </label>
            <label style={{ flex: "1 1 80px", fontSize: 12 }}>
              {t("marControlled.wasteUnitLabel")}
              <input
                type="text"
                value={state.wasteUnit || defaultWasteUnit}
                onChange={(e) => onChange({ wasteUnit: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4 }}
                aria-label={t("marControlled.wasteUnitLabel")}
              />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 8, fontSize: 12 }}>
            {t("marControlled.wasteReasonLabel")}
            <input
              type="text"
              value={state.wasteReason}
              onChange={(e) => onChange({ wasteReason: e.target.value })}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
        </fieldset>
      ) : null}
    </section>
  );
}
