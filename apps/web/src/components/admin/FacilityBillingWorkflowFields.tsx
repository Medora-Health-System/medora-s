"use client";

import type { BillingClassification, FacilityBillingClassificationMode } from "@medora/shared";
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

export function emptyFacilityBillingWorkflowForm(): FacilityBillingWorkflowFormState {
  return {
    billingClassificationMode: "",
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
}): FacilityBillingWorkflowFormState {
  return {
    billingClassificationMode: payload.billingClassificationMode ?? "",
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
};

export function FacilityBillingWorkflowFields({ form, onChange, disabled }: Props) {
  const { t } = useI18n();
  const showHybridOptions =
    form.billingClassificationMode === "HYBRID_UC_ED" ||
    form.billingClassificationMode === "HOSPITAL_ENTERPRISE";

  return (
    <fieldset
      disabled={disabled}
      style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, margin: "16px 0 0", minWidth: 0 }}
    >
      <legend style={{ fontSize: 13, fontWeight: 700, padding: "0 6px" }}>
        {t("adminUsers.billingWorkflowSectionTitle")}
      </legend>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>{t("adminUsers.billingWorkflowIntro")}</p>
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
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="radio"
            name="billingClassificationMode"
            checked={form.billingClassificationMode === ""}
            onChange={() => onChange({ ...form, billingClassificationMode: "" })}
          />
          <span>{t("adminUsers.billingWorkflowModes.LEGACY_UNSET")}</span>
        </label>
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
