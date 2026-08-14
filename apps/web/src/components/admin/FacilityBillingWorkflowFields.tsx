"use client";

import type {
  BillingClassification,
  EffectiveFacilityBillingWorkflow,
  FacilityBillingClassificationMode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type FacilityBillingWorkflowFormState = {
  billingClassificationMode: FacilityBillingClassificationMode | "";
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
};

export const FACILITY_BILLING_MODES: FacilityBillingClassificationMode[] = [
  "CLINIC_ONLY",
  "URGENT_CARE_ONLY",
  "EMERGENCY_ONLY",
  "HYBRID_UC_ED",
  "HOSPITAL_ENTERPRISE",
];

/** MEDUI.D4C.9 — new facilities default to explicit CLINIC_ONLY (never LEGACY). */
export function emptyFacilityBillingWorkflowForm(): FacilityBillingWorkflowFormState {
  return {
    billingClassificationMode: "CLINIC_ONLY",
    allowUrgentCareToEmergencyUpgrade: false,
    requireUcToEdPatientAcknowledgement: true,
    showEncounterBillingControls: false,
  };
}

export function workflowFormFromPayload(payload: {
  billingClassificationMode: FacilityBillingClassificationMode | null;
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
  /** When present, use configured (persisted) mode for the radio — not inferred effective. */
  configuredMode?: FacilityBillingClassificationMode | null;
}): FacilityBillingWorkflowFormState {
  const configured =
    payload.configuredMode !== undefined
      ? payload.configuredMode
      : payload.billingClassificationMode;
  return {
    billingClassificationMode: configured ?? "",
    allowUrgentCareToEmergencyUpgrade: payload.allowUrgentCareToEmergencyUpgrade,
    requireUcToEdPatientAcknowledgement: payload.requireUcToEdPatientAcknowledgement,
    showEncounterBillingControls: payload.showEncounterBillingControls,
  };
}

export function workflowFormToPatch(form: FacilityBillingWorkflowFormState) {
  return {
    billingClassificationMode: form.billingClassificationMode || null,
    allowUrgentCareToEmergencyUpgrade: form.allowUrgentCareToEmergencyUpgrade,
    requireUcToEdPatientAcknowledgement: form.requireUcToEdPatientAcknowledgement,
    showEncounterBillingControls: form.showEncounterBillingControls,
  };
}

type Props = {
  form: FacilityBillingWorkflowFormState;
  onChange: (next: FacilityBillingWorkflowFormState) => void;
  disabled?: boolean;
  /**
   * MEDUI.D4C.9 — create: no LEGACY option (explicit required).
   * edit: LEGACY allowed only for existing unset facilities; show effective projection.
   */
  variant?: "create" | "edit";
  effectiveProjection?: Pick<
    EffectiveFacilityBillingWorkflow,
    "configuredMode" | "effectiveMode" | "source"
  > | null;
};

export function FacilityBillingWorkflowFields({
  form,
  onChange,
  disabled,
  variant = "edit",
  effectiveProjection = null,
}: Props) {
  const { t } = useI18n();
  const showHybridOptions =
    form.billingClassificationMode === "HYBRID_UC_ED" ||
    form.billingClassificationMode === "HOSPITAL_ENTERPRISE";
  const allowLegacyOption = variant === "edit";
  const unresolved = effectiveProjection?.source === "UNRESOLVED";

  return (
    <fieldset
      disabled={disabled}
      style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, margin: "16px 0 0", minWidth: 0 }}
      data-testid="facility-billing-workflow-fields"
      data-variant={variant}
    >
      <legend style={{ fontSize: 13, fontWeight: 700, padding: "0 6px" }}>
        {t("adminUsers.billingWorkflowSectionTitle")}
      </legend>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>
        {variant === "create"
          ? t("facilityServiceConfigD4c9.billingWorkflowCreateIntro")
          : t("adminUsers.billingWorkflowIntro")}
      </p>

      {variant === "edit" && effectiveProjection ? (
        <div
          data-testid="facility-billing-workflow-effective"
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            background: unresolved ? "#fef2f2" : "#f8fafc",
            border: `1px solid ${unresolved ? "#fecaca" : "#e2e8f0"}`,
            fontSize: 12,
            color: "#334155",
          }}
        >
          <div>
            <strong>{t("facilityServiceConfigD4c9.configuredWorkflow")}:</strong>{" "}
            {effectiveProjection.configuredMode
              ? t(`adminUsers.billingWorkflowModes.${effectiveProjection.configuredMode}`)
              : t("adminUsers.billingWorkflowModes.LEGACY_UNSET")}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>{t("facilityServiceConfigD4c9.effectiveWorkflow")}:</strong>{" "}
            {effectiveProjection.effectiveMode
              ? t(`adminUsers.billingWorkflowModes.${effectiveProjection.effectiveMode}`)
              : t("facilityServiceConfigD4c9.unresolvedWorkflow")}
          </div>
          <div style={{ marginTop: 4, color: "#64748b" }}>
            {effectiveProjection.source === "EXPLICIT"
              ? t("facilityServiceConfigD4c9.sourceExplicit")
              : effectiveProjection.source === "INFERRED_FROM_EXISTING_PROFILE"
                ? t("facilityServiceConfigD4c9.sourceInferred")
                : t("facilityServiceConfigD4c9.sourceUnresolved")}
          </div>
          {unresolved ? (
            <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c" }}>
              {t("facilityServiceConfigD4c9.unresolvedHelp")}
            </p>
          ) : null}
          {effectiveProjection.configuredMode == null && effectiveProjection.effectiveMode ? (
            <p style={{ margin: "8px 0 0" }}>{t("facilityServiceConfigD4c9.recommendExplicit")}</p>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FACILITY_BILLING_MODES.map((mode) => (
          <label key={mode} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="radio"
              name="billingClassificationMode"
              checked={form.billingClassificationMode === mode}
              onChange={() =>
                onChange({
                  ...form,
                  billingClassificationMode: mode,
                  allowUrgentCareToEmergencyUpgrade:
                    mode === "HYBRID_UC_ED" || mode === "HOSPITAL_ENTERPRISE"
                      ? true
                      : form.allowUrgentCareToEmergencyUpgrade,
                  showEncounterBillingControls:
                    mode === "HYBRID_UC_ED" || mode === "HOSPITAL_ENTERPRISE"
                      ? true
                      : form.showEncounterBillingControls,
                })
              }
            />
            <span>{t(`adminUsers.billingWorkflowModes.${mode}`)}</span>
          </label>
        ))}
        {allowLegacyOption ? (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="radio"
              name="billingClassificationMode"
              checked={form.billingClassificationMode === ""}
              onChange={() => onChange({ ...form, billingClassificationMode: "" })}
            />
            <span>{t("adminUsers.billingWorkflowModes.LEGACY_UNSET")}</span>
          </label>
        ) : null}
      </div>
      {showHybridOptions ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.allowUrgentCareToEmergencyUpgrade}
              onChange={(e) => onChange({ ...form, allowUrgentCareToEmergencyUpgrade: e.target.checked })}
            />
            <span>{t("adminUsers.billingWorkflowAllowUcToEd")}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.requireUcToEdPatientAcknowledgement}
              onChange={(e) => onChange({ ...form, requireUcToEdPatientAcknowledgement: e.target.checked })}
            />
            <span>{t("adminUsers.billingWorkflowRequireAck")}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.showEncounterBillingControls}
              onChange={(e) => onChange({ ...form, showEncounterBillingControls: e.target.checked })}
            />
            <span>{t("adminUsers.billingWorkflowShowControls")}</span>
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

export function billingClassificationModeLabel(
  t: (key: string) => string,
  mode: BillingClassification | string,
): string {
  return t(`encounterChrome.billingClassification.${mode}`);
}
