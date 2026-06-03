import { describe, expect, it } from "vitest";
import {
  hydrateProductFromGovernanceSnapshot,
  marControlledWorkflowVisible,
  marHighAlertWorkflowVisible,
  marLasaAcknowledgementComplete,
  marLasaWorkflowVisible,
  marPharmacyWorkflowVisible,
  resolveOrderItemMedicationAdministrationRequirements,
} from "./orderItemMedicationSafetyGovernance";

describe("orderItemMedicationSafetyGovernance (M1.7B.1)", () => {
  const hydroResolveInput = {
    catalog: {
      id: "cat-hydro",
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      genericName: "Hydromorphone",
      therapeuticClass: null,
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    },
    product: {
      isHighAlert: true,
      highAlertCategories: {
        highAlertClass: "HIGH_ALERT_OPIOID",
        safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        lasa: {
          lasaGroupCode: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
          lasaGroupLabel: "Morphine / hydromorphone",
          lasaSeverity: "LASA_HIGH",
        },
      },
      lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
      allowsWasteDocumentation: true,
    },
    pharmacy: { verificationStatus: "PENDING" as const },
  };

  it("Hydromorphone shows warnings only — no pharmacy or double-check block", () => {
    const requirements = resolveOrderItemMedicationAdministrationRequirements(
      { medicationGovernanceResolveInput: hydroResolveInput },
      { route: "IV", isContinuousInfusion: false }
    );
    expect(requirements).not.toBeNull();
    expect(requirements!.snapshot.requiresDoubleSign).toBe(false);
    expect(marPharmacyWorkflowVisible(requirements!, "administered")).toBe(false);
    expect(marHighAlertWorkflowVisible(requirements!, "administered")).toBe(false);
    expect(marLasaWorkflowVisible(requirements!, "administered")).toBe(true);
    expect(marControlledWorkflowVisible(requirements!, "administered")).toBe(true);
  });

  it("insulin requires double-check workflow", () => {
    const requirements = resolveOrderItemMedicationAdministrationRequirements({
      medicationGovernanceResolveInput: {
        catalog: {
          id: "cat-insulin",
          code: "INSULIN",
          genericName: "Insulin",
          therapeuticClass: null,
          isControlled: false,
          controlledSchedule: null,
          requiresWitness: false,
          requiresDoubleSign: true,
        },
        product: {
          isHighAlert: true,
          highAlertCategories: {
            highAlertClass: "HIGH_ALERT_INSULIN",
            safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
          },
          lasaGroupId: null,
          isControlled: false,
          controlledSchedule: null,
          requiresWitness: false,
          requiresDoubleSign: true,
          allowsWasteDocumentation: false,
        },
        pharmacy: null,
      },
    });
    expect(requirements!.snapshot.requiresDoubleSign).toBe(true);
    expect(marHighAlertWorkflowVisible(requirements!, "administered")).toBe(true);
  });

  it("Hydromorphone catalog-only order hydrates LASA from governance snapshot (M1.7B.2)", () => {
    const requirements = resolveOrderItemMedicationAdministrationRequirements(
      {
        catalogMedication: {
          id: "cat-hydro",
          code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
          genericName: "Hydromorphone",
          isControlled: true,
          controlledSchedule: "II",
          requiresWitness: false,
          requiresDoubleSign: true,
        },
        medicationSafetyGovernance: {
          isControlled: true,
          controlledSchedule: "II",
          isHighAlert: true,
          highAlertClass: "HIGH_ALERT_OPIOID",
          lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
          lasaGroupLabel: "Morphine / hydromorphone",
          lasaSeverity: "LASA_HIGH",
          requiresWitness: false,
          requiresDoubleSign: false,
          wasteDocumentationRecommended: true,
          pharmacyVerificationStatus: "PENDING",
          requiresPharmacyVerification: true,
        },
      },
      { route: "IV", isContinuousInfusion: false }
    );

    expect(requirements).not.toBeNull();
    expect(marLasaWorkflowVisible(requirements!, "administered")).toBe(true);
    expect(requirements!.workflows.lasa.requiresAcknowledgement).toBe(true);
  });

  it("hydrateProductFromGovernanceSnapshot rebuilds LASA product input", () => {
    const product = hydrateProductFromGovernanceSnapshot(
      {
        isControlled: true,
        controlledSchedule: "II",
        isHighAlert: true,
        highAlertClass: "HIGH_ALERT_OPIOID",
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        lasaGroupLabel: "Morphine / hydromorphone",
        lasaSeverity: "LASA_HIGH",
        requiresWitness: false,
        requiresDoubleSign: false,
        wasteDocumentationRecommended: true,
        pharmacyVerificationStatus: "PENDING",
        requiresPharmacyVerification: true,
      },
      {
        id: "cat-hydro",
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        isControlled: true,
        controlledSchedule: "II",
      }
    );
    expect(product?.lasaGroupId).toBe("GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE");
    expect(product?.isHighAlert).toBe(true);
  });

  it("marLasaAcknowledgementComplete requires both ack checkboxes or override", () => {
    expect(
      marLasaAcknowledgementComplete({
        lasaAcknowledged: true,
        lasaMedicationSelectionConfirmed: false,
        useOverride: false,
        lasaOverrideAcknowledged: false,
        lasaOverrideReason: "",
      })
    ).toBe(false);
    expect(
      marLasaAcknowledgementComplete({
        lasaAcknowledged: true,
        lasaMedicationSelectionConfirmed: true,
        useOverride: false,
        lasaOverrideAcknowledged: false,
        lasaOverrideReason: "",
      })
    ).toBe(true);
  });
});
