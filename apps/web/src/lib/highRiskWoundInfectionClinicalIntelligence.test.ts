import { describe, expect, it } from "vitest";
import { resolveHighRiskWoundInfectionContext } from "./highRiskWoundInfectionClinicalIntelligence";

describe("highRiskWoundInfectionClinicalIntelligence", () => {
  it("resolves a simple infected traumatic wound and allows routine discharge", () => {
    const context = resolveHighRiskWoundInfectionContext({ displayName: "Infected traumatic wound of the forearm" });
    expect(context.branches).toContain("infected_traumatic_wound");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for necrotizing infection and gas-forming infection unless follow-up", () => {
    const necrotizing = resolveHighRiskWoundInfectionContext({ displayName: "Necrotizing soft tissue infection" });
    expect(necrotizing.branches).toContain("necrotizing_infection");
    expect(necrotizing.dischargeFamilyId).toBeNull();
    const gas = resolveHighRiskWoundInfectionContext({ displayName: "Gas gangrene with crepitus" });
    expect(gas.branches).toContain("gas_forming_infection");
    expect(gas.dischargeFamilyId).toBeNull();
    const followUp = resolveHighRiskWoundInfectionContext({ displayName: "Necrotizing soft tissue infection, follow-up recheck" });
    expect(followUp.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for deep space hand infection and infectious tenosynovitis", () => {
    const deepSpace = resolveHighRiskWoundInfectionContext({ displayName: "Deep space hand infection" });
    expect(deepSpace.branches).toContain("deep_space_hand");
    expect(deepSpace.dischargeFamilyId).toBeNull();
    const tenosynovitis = resolveHighRiskWoundInfectionContext({ displayName: "Infectious flexor tenosynovitis, Kanavel signs present" });
    expect(tenosynovitis.branches).toContain("infectious_tenosynovitis");
    expect(tenosynovitis.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for wound dehiscence with evisceration", () => {
    const dehiscence = resolveHighRiskWoundInfectionContext({ displayName: "Wound dehiscence with evisceration" });
    expect(dehiscence.branches).toContain("wound_dehiscence");
    expect(dehiscence.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for diabetic ischemic ulcer infection and osteomyelitis/septic joint concern", () => {
    const diabeticUlcer = resolveHighRiskWoundInfectionContext({ displayName: "Diabetic ischemic ulcer infection" });
    expect(diabeticUlcer.branches).toContain("diabetic_ischemic_ulcer_infection");
    expect(diabeticUlcer.dischargeFamilyId).toBeNull();
    const osteo = resolveHighRiskWoundInfectionContext({ displayName: "Osteomyelitis concern with exposed bone" });
    expect(osteo.branches).toContain("osteomyelitis_septic_joint_concern");
    expect(osteo.dischargeFamilyId).toBeNull();
  });

  it("resolves water/farm contamination and foreign-body-associated infection with routine discharge available", () => {
    const water = resolveHighRiskWoundInfectionContext({ displayName: "Wound infection after freshwater exposure" });
    expect(water.branches).toContain("water_farm_contamination");
    expect(water.dischargeFamilyId).not.toBeNull();
    const foreignBody = resolveHighRiskWoundInfectionContext({ displayName: "Wound infection, retained foreign body suspected" });
    expect(foreignBody.branches).toContain("foreign_body_associated_infection");
  });

  it("resolves pyomyositis and postoperative wound complication branches", () => {
    const pyo = resolveHighRiskWoundInfectionContext({ displayName: "Pyomyositis of the thigh" });
    expect(pyo.branches).toContain("pyomyositis");
    expect(pyo.dischargeFamilyId).toBeNull();
    const postop = resolveHighRiskWoundInfectionContext({ displayName: "Postoperative wound breakdown" });
    expect(postop.branches).toContain("postoperative_wound_complication");
    expect(postop.dischargeFamilyId).not.toBeNull();
  });
});
