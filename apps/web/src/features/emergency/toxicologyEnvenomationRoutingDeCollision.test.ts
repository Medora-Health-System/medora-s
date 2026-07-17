import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("toxicologyEnvenomationRoutingDeCollision — Phase 16", () => {
  it("routes acetaminophen poisoning to acetaminophen follow-up family", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "T39.1X1A",
      displayName: "Poisoning by 4-Aminophenol derivatives, accidental, initial encounter",
    });
    expect(resolved.template.id).toBe("acetaminophen_exposure_followup_v1");
  });

  it("keeps opioid adverse-effect T40.2X5A on behavioral-health aftercare (not poisoning family)", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "T40.2X5A",
      displayName: "Adverse effect of other opioids, initial encounter",
    });
    expect(resolved.template.id).toBe("behavioral_health_opioid_overdose_aftercare_v1");
  });

  it("routes opioid poisoning (intent character 1–4) to toxicology opioid post-observation", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "T40.2X1A",
      displayName: "Poisoning by other opioids, accidental, initial encounter",
    });
    expect(resolved.template.id).toBe("opioid_overdose_post_observation_v1");
  });

  it("routes carbon monoxide T58 to toxicology (not environmental heat/cold)", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "T58.01XA",
      displayName: "Toxic effect of carbon monoxide from motor vehicle exhaust, accidental, initial encounter",
    });
    expect(resolved.template.id).toBe("carbon_monoxide_post_acute_v1");
    expect(resolved.template.id).not.toMatch(/heat_|cold_|hypothermia/);
  });

  it("routes venomous snake T63.0 to snake envenomation, not ordinary animal bite", () => {
    const snake = resolveProviderDischargeTemplateForDiagnosis({
      code: "T63.001A",
      displayName: "Toxic effect of unspecified snake venom, accidental, initial encounter",
    });
    expect(snake.template.id).toBe("snake_envenomation_post_acute_v1");
    const dog = resolveProviderDischargeTemplateForDiagnosis({
      code: "W54.0XXA",
      displayName: "Bitten by dog, initial encounter",
    });
    expect(dog.template.id).toBe("animal_bite_v1");
  });

  it("keeps alcohol intoxication and alcohol withdrawal on distinct families", () => {
    const intox = resolveProviderDischargeTemplateForDiagnosis({
      code: "F10.129",
      displayName: "Alcohol intoxication",
    });
    const withdrawal = resolveProviderDischargeTemplateForDiagnosis({
      code: "F10.239",
      displayName: "Alcohol withdrawal post-acute care",
    });
    expect(intox.template.id).toBe("alcohol_intoxication_v1");
    expect(withdrawal.template.id).toBe("alcohol_withdrawal_post_acute_v1");
    expect(intox.template.id).not.toBe(withdrawal.template.id);
  });

  it("does not let generic fever/AMS steal serotonin syndrome or NMS keywords", () => {
    const ss = resolveProviderDischargeTemplateForDiagnosis({
      code: "G90.81",
      displayName: "Serotonin syndrome",
    });
    const nms = resolveProviderDischargeTemplateForDiagnosis({
      code: "G21.0",
      displayName: "Malignant neuroleptic syndrome",
    });
    expect(ss.template.id).not.toMatch(/fever|viral/);
    expect(nms.template.id).not.toMatch(/fever|viral/);
  });

  it("high-risk toxicology families never resolve as low_risk_toxic_exposure_v1", () => {
    for (const code of ["T58.01XA", "T54.91XA", "T63.001A", "T60.0X1A"]) {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: code });
      expect(resolved.template.id).not.toBe("low_risk_toxic_exposure_v1");
    }
  });
});
