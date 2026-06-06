import { describe, expect, it } from "vitest";
import {
  isBloodProductMedicationCatalog,
  isPcaOrPcpOpioidPumpRoute,
  marAdministrationRequiresDoubleCheck,
  marPharmacyBlockingWorkflowVisible,
  marPharmacyVerificationBlocksAdministration,
  resolveMarDoubleCheckRequirement,
} from "./marAdministrationGovernancePolicy.js";
import {
  highAlertMarGovernanceApplies,
  validateHighAlertMarCreate,
  type HighAlertMarGovernanceContext,
} from "./highAlertMarGovernance.js";
import { validateLasaMarCreate, lasaMarRequiresAcknowledgement } from "./lasaMarGovernance.js";
import { validateControlledSubstanceMarCreate } from "./controlledSubstanceMarGovernance.js";

const insulinGov = {
  highAlertClass: "HIGH_ALERT_INSULIN",
  isHighAlert: true,
  genericName: "Regular insulin",
} as const;

const heparinGov = {
  highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
  isHighAlert: true,
  genericName: "Heparin",
} as const;

describe("marAdministrationGovernancePolicy (M1.7A.9 / M1.8B.4A)", () => {
  it("never blocks MAR administration for pharmacy verification", () => {
    expect(marPharmacyVerificationBlocksAdministration()).toBe(false);
    expect(marPharmacyBlockingWorkflowVisible({}, "administered")).toBe(false);
  });

  it("Hydromorphone IV push does not require double-check", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        isHighAlert: true,
        requiresDoubleSign: true,
        catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        genericName: "Hydromorphone",
        route: "IV",
        isContinuousInfusion: false,
      })
    ).toBe(false);
  });

  it("requires double-check for insulin SQ, IVP, and IVPB", () => {
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, orderRoute: "SQ" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, orderRoute: "IVP" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, orderRoute: "IVPB" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, orderRoute: "SC" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, marRoute: "IV push" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...insulinGov, catalogRoute: "infusion" })).toBe(true);
  });

  it("exempts heparin SQ but requires IVP and IVPB", () => {
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, orderRoute: "SQ" })).toBe(false);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, orderRoute: "SC" })).toBe(false);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, orderRoute: "subcutaneous" })).toBe(false);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, orderRoute: "IVP" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, marRoute: "bolus" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, catalogRoute: "IVPB" })).toBe(true);
    expect(resolveMarDoubleCheckRequirement({ ...heparinGov, catalogRoute: "infusion" })).toBe(true);
  });

  it("requires double-check for blood products and PCA opioid pump", () => {
    expect(isBloodProductMedicationCatalog({ catalogCode: "RBC_PACKED_CELLS" })).toBe(true);
    expect(
      marAdministrationRequiresDoubleCheck({
        catalogCode: "FFP_TRANSFUSION",
      })
    ).toBe(true);
    expect(isPcaOrPcpOpioidPumpRoute("PCA")).toBe(true);
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        route: "PCA",
        genericName: "Morphine",
      })
    ).toBe(true);
  });

  it("requires double-check for continuous opioid infusion pump", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        genericName: "Morphine",
        route: "IV infusion",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });

  it("Fentanyl IV push does not require double-check (M1.7B.7B)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        genericName: "Fentanyl",
        route: "IV",
        isContinuousInfusion: false,
        requiresDoubleSign: true,
      })
    ).toBe(false);
  });

  it("insulin infusion requires double-check (M1.7B.7B policy lock)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_INSULIN",
        genericName: "Regular insulin",
        route: "IV",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });

  it("heparin infusion requires double-check (M1.7B.7B policy lock)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
        genericName: "Heparin",
        route: "IV",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });

  it("skips double-check at INFUSION_START for insulin/heparin", () => {
    expect(
      resolveMarDoubleCheckRequirement({
        ...insulinGov,
        orderRoute: "IVPB",
        infusionPhase: "INFUSION_START",
      })
    ).toBe(false);
    expect(
      resolveMarDoubleCheckRequirement({
        ...heparinGov,
        orderRoute: "IVPB",
        infusionPhase: "INFUSION_START",
      })
    ).toBe(false);
  });

  it("still requires double-check for blood at any route", () => {
    expect(
      resolveMarDoubleCheckRequirement({
        catalogCode: "RBC_PACKED_CELLS",
        orderRoute: "SQ",
      })
    ).toBe(true);
  });

  it("rejects same-user high-alert verifier", () => {
    const gov: HighAlertMarGovernanceContext = {
      isHighAlert: true,
      requiresDoubleCheck: true,
      safetyRequirementCodes: [],
    };
    const result = validateHighAlertMarCreate({
      marAction: "administered",
      governance: gov,
      administeredByUserId: "nurse-1",
      highAlertVerifierUserId: "nurse-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("HIGH_ALERT_VERIFIER_CANNOT_BE_SELF");
  });

  it("audits override path when acknowledged", () => {
    const gov: HighAlertMarGovernanceContext = {
      isHighAlert: true,
      requiresDoubleCheck: true,
      safetyRequirementCodes: [],
    };
    const result = validateHighAlertMarCreate({
      marAction: "administered",
      governance: gov,
      administeredByUserId: "nurse-1",
      highAlertOverrideReason: "Emergency — sole nurse on unit",
      highAlertOverrideAcknowledged: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.overrideUsed).toBe(true);
  });

  it("does not alter controlled-substance witness validation", () => {
    const result = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: {
        isControlled: true,
        requiresWitness: true,
        controlledSchedule: "II",
        allowsWasteDocumentation: false,
      },
      witnessUserId: "nurse-1",
      administeredByUserId: "nurse-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONTROLLED_WITNESS_CANNOT_BE_SELF");
  });

  it("does not alter LASA second-read validation", () => {
    expect(
      lasaMarRequiresAcknowledgement({
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        lasaSeverity: "LASA_HIGH",
      })
    ).toBe(true);
    const lasaFail = validateLasaMarCreate({
      marAction: "administered",
      governance: {
        lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
        lasaGroupLabel: "Morphine / hydromorphone",
        lasaSeverity: "LASA_HIGH",
        requiresAcknowledgement: true,
      },
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: false,
      administeredByUserId: "nurse-1",
    });
    expect(lasaFail.ok).toBe(false);
  });

  it("high-alert governance applies only to administered action", () => {
    expect(
      highAlertMarGovernanceApplies(
        { isHighAlert: true, requiresDoubleCheck: true, safetyRequirementCodes: [] },
        "refused"
      )
    ).toBe(false);
  });
});
