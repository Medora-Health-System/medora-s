import { describe, expect, it } from "vitest";
import {
  defaultAllowedClassificationsForMode,
  defaultBillingWorkflowModeForFacilityType,
  FACILITY_BILLING_WORKFLOW_UNRESOLVED,
  inferBillingClassificationModeFromSiteType,
  isFacilityBillingWorkflowUnresolved,
  resolveAllowedTargetClassifications,
  resolveEffectiveFacilityBillingWorkflow,
  resolveFacilityBillingWorkflowConfig,
  validateFacilityBillingTransition,
} from "./facilityBillingWorkflow.js";

describe("facilityBillingWorkflow (19UCED.2)", () => {
  const hybridConfig = resolveFacilityBillingWorkflowConfig({
    billingClassificationMode: "HYBRID_UC_ED",
    billingSiteType: "HYBRID",
    allowUrgentCareToEmergencyUpgrade: true,
    requireUcToEdPatientAcknowledgement: true,
    showEncounterBillingControls: true,
  });

  it("infers mode from legacy billingSiteType", () => {
    expect(inferBillingClassificationModeFromSiteType("HYBRID")).toBe("HYBRID_UC_ED");
    expect(inferBillingClassificationModeFromSiteType("CLINIC")).toBe("CLINIC_ONLY");
  });

  it("UC-only facility blocks UC→ED", () => {
    const ucOnly = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: "URGENT_CARE_ONLY",
      billingSiteType: "URGENT_CARE",
    });
    const v = validateFacilityBillingTransition({
      from: "URGENT_CARE",
      to: "EMERGENCY_DEPARTMENT",
      facilityConfig: ucOnly,
      isAdmin: false,
    });
    expect(v.allowed).toBe(false);
    expect(v.code).toBe("UC_TO_ED_DISABLED_FOR_FACILITY");
  });

  it("hybrid facility allows UC→ED when upgrade enabled", () => {
    const v = validateFacilityBillingTransition({
      from: "URGENT_CARE",
      to: "EMERGENCY_DEPARTMENT",
      facilityConfig: hybridConfig,
      isAdmin: false,
    });
    expect(v.allowed).toBe(true);
    expect(v.requiresAcknowledgment).toBe(true);
  });

  it("hybrid resolves allowed targets for UC", () => {
    const targets = resolveAllowedTargetClassifications({
      from: "URGENT_CARE",
      facilityConfig: hybridConfig,
      isAdmin: false,
    });
    expect(targets).toEqual(["EMERGENCY_DEPARTMENT"]);
  });

  it("hybrid resolves ED→UC for ED trackboard encounters (19UCED.2A)", () => {
    const targets = resolveAllowedTargetClassifications({
      from: "EMERGENCY_DEPARTMENT",
      facilityConfig: hybridConfig,
      isAdmin: false,
    });
    expect(targets).toEqual(["URGENT_CARE"]);
  });

  it("hybrid legacy false flags bootstrap when allowed list empty (19UCED.2A)", () => {
    const legacyHybrid = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: "HYBRID_UC_ED",
      billingSiteType: "HYBRID",
      allowedEncounterBillingClassifications: [],
      allowUrgentCareToEmergencyUpgrade: false,
      showEncounterBillingControls: false,
    });
    expect(legacyHybrid.allowUrgentCareToEmergencyUpgrade).toBe(true);
    expect(legacyHybrid.showEncounterBillingControls).toBe(true);
    const targets = resolveAllowedTargetClassifications({
      from: "EMERGENCY_DEPARTMENT",
      facilityConfig: legacyHybrid,
      isAdmin: false,
    });
    expect(targets).toEqual(["URGENT_CARE"]);
  });

  it("hybrid explicit false flags respected when admin disables controls", () => {
    const disabledHybrid = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: "HYBRID_UC_ED",
      billingSiteType: "HYBRID",
      allowedEncounterBillingClassifications: ["URGENT_CARE", "EMERGENCY_DEPARTMENT"],
      allowUrgentCareToEmergencyUpgrade: false,
      showEncounterBillingControls: false,
    });
    expect(disabledHybrid.showEncounterBillingControls).toBe(false);
  });

  it("hospital enterprise allows ED→Observation", () => {
    const hospital = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: "HOSPITAL_ENTERPRISE",
      billingSiteType: "HOSPITAL",
      allowUrgentCareToEmergencyUpgrade: true,
      showEncounterBillingControls: true,
    });
    const targets = resolveAllowedTargetClassifications({
      from: "EMERGENCY_DEPARTMENT",
      facilityConfig: hospital,
      isAdmin: false,
    });
    expect(targets).toContain("OBSERVATION");
    expect(targets).toContain("INPATIENT");
  });

  it("clinic_only mode defaults allowed classifications", () => {
    expect(defaultAllowedClassificationsForMode("CLINIC_ONLY")).toContain("CLINIC_VISIT");
    expect(defaultAllowedClassificationsForMode("CLINIC_ONLY")).not.toContain("EMERGENCY_DEPARTMENT");
  });

  it("existing null mode stays operational via site type inference", () => {
    const legacy = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: null,
      billingSiteType: "HYBRID",
    });
    expect(legacy.billingClassificationMode).toBe("HYBRID_UC_ED");
    expect(legacy.allowUrgentCareToEmergencyUpgrade).toBe(true);
  });

  it("emergency_only facility blocks clinic to ED for non-admin", () => {
    const edOnly = resolveFacilityBillingWorkflowConfig({
      billingClassificationMode: "EMERGENCY_ONLY",
      billingSiteType: "FREESTANDING_ER",
    });
    const v = validateFacilityBillingTransition({
      from: "CLINIC_VISIT",
      to: "EMERGENCY_DEPARTMENT",
      facilityConfig: edOnly,
      isAdmin: false,
    });
    expect(v.allowed).toBe(false);
  });
});

describe("MEDUI.D4C.9 effective facility billing workflow", () => {
  it("projects explicit mode", () => {
    const eff = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: "CLINIC_ONLY",
      billingSiteType: "CLINIC",
    });
    expect(eff.source).toBe("EXPLICIT");
    expect(eff.configuredMode).toBe("CLINIC_ONLY");
    expect(eff.effectiveMode).toBe("CLINIC_ONLY");
    expect(defaultBillingWorkflowModeForFacilityType("HOSPITAL")).toBe("HOSPITAL_ENTERPRISE");
    expect(defaultBillingWorkflowModeForFacilityType("CLINIC")).toBe("CLINIC_ONLY");
  });

  it("infers LEGACY from billingSiteType", () => {
    const eff = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: null,
      billingSiteType: "CLINIC",
    });
    expect(eff.source).toBe("INFERRED_FROM_EXISTING_PROFILE");
    expect(eff.configuredMode).toBeNull();
    expect(eff.effectiveMode).toBe("CLINIC_ONLY");
  });

  it("marks unresolved LEGACY when inference fails", () => {
    const eff = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: null,
      billingSiteType: null,
    });
    expect(eff.source).toBe("UNRESOLVED");
    expect(eff.effectiveMode).toBeNull();
    expect(isFacilityBillingWorkflowUnresolved(eff)).toBe(true);
    expect(FACILITY_BILLING_WORKFLOW_UNRESOLVED).toBe("FACILITY_BILLING_WORKFLOW_UNRESOLVED");
  });
});
