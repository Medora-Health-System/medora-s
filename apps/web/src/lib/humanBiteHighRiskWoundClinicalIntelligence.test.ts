import { describe, expect, it } from "vitest";
import {
  adaptHumanBiteHighRiskWoundComplaintIntel,
  resolveHumanBiteHighRiskWoundContextFromDiagnosis,
} from "./humanBiteHighRiskWoundClinicalIntelligence";
import { HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("humanBiteHighRiskWoundClinicalIntelligence", () => {
  it.each([
    ["W50.3XXA", "Accidental bite by another person", "trauma_human_bite"],
    ["Y04.1XXA", "Assault by human bite", "trauma_human_bite"],
    ["", "Fight bite clenched fist knuckle wound", "trauma_fight_bite"],
    ["", "Contaminated wound dirty wound", "trauma_contaminated_wound"],
    ["", "Freshwater lake river wound", "trauma_water_exposed_wound"],
    ["", "Delayed presentation wound", "trauma_delayed_wound"],
    ["", "Deep contaminated sewage farm contamination", "trauma_deep_contaminated_wound"],
    ["", "High risk hand wound", "trauma_high_risk_hand_wound"],
  ])("resolves %s / %s", (code, displayName, family) => {
    expect(resolveHumanBiteHighRiskWoundContextFromDiagnosis({ code, displayName }).dischargeFamilyId).toBe(family);
  });

  it("identifies clenched-fist hand wounds as high risk", () => {
    const context = resolveHumanBiteHighRiskWoundContextFromDiagnosis({
      displayName: "Fight bite to knuckle with tendon concern and delayed presentation",
    });
    expect(context.dischargeFamilyId).toBe("trauma_fight_bite");
    expect(context.highRiskFlags).toEqual(expect.arrayContaining(["hand", "joint_or_tendon", "delayed"]));
    expect(context.dispositionRecommendations.map((recommendation) => recommendation.id)).toEqual(
      expect.arrayContaining(["hand_surgery", "orthopedics"]),
    );
  });

  it("prioritizes human-bite clinical documentation without adding rabies content", () => {
    const context = resolveHumanBiteHighRiskWoundContextFromDiagnosis({
      displayName: "Human bite with hand swelling and cellulitis",
    });
    const adapted = adaptHumanBiteHighRiskWoundComplaintIntel(
      HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL,
      context,
    );
    expect(adapted.hpi?.[0]).toMatch(/humanBite|fightBite|assault/i);
    expect(adapted.mdmPlanSummary?.join(" ")).not.toMatch(/rabies|animalControl/i);
    expect(JSON.stringify(context).toLowerCase()).not.toMatch(/rabies/);
  });
});
