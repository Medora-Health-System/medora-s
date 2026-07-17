import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("psychiatricBehavioralDischargeRouting — Phase 18", () => {
  it("routes R45.851 to suicidal_ideation_post_assessment_v1", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "R45.851",
      displayName: "Suicidal ideation",
    });
    expect(resolved.template.id).toBe("suicidal_ideation_post_assessment_v1");
    expect(resolved.template.id).not.toBe("behavioral_health_suicidal_ideation_precautions_v1");
  });

  it("routes R45.850 homicidal ideation to psychosis_post_acute_v1", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "R45.850",
      displayName: "Homicidal ideation",
    });
    expect(resolved.template.id).toBe("psychosis_post_acute_v1");
  });

  it("routes T14.91 to suicide_attempt_post_acute, not wound-only", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "T14.91XA",
      displayName: "Self-inflicted injury, initial encounter",
    });
    expect(resolved.template.id).toBe("suicide_attempt_post_acute_v1");
  });

  it("routes F05 delirium to delirium_post_acute, not psychosis", () => {
    const delirium = resolveProviderDischargeTemplateForDiagnosis({ code: "F05", displayName: "Delirium" });
    const psychosis = resolveProviderDischargeTemplateForDiagnosis({ code: "F29", displayName: "Psychosis" });
    expect(delirium.template.id).toBe("delirium_post_acute_v1");
    expect(psychosis.template.id).toBe("psychosis_post_acute_v1");
  });

  it("routes F31 mania to mania_post_acute, not generic agitation", () => {
    const mania = resolveProviderDischargeTemplateForDiagnosis({ code: "F31.9", displayName: "Bipolar disorder" });
    const agitation = resolveProviderDischargeTemplateForDiagnosis({ code: "R45.1", displayName: "Agitation" });
    expect(mania.template.id).toBe("mania_post_acute_v1");
    expect(agitation.template.id).toBe("behavioral_agitation_post_acute_v1");
  });

  it("routes F53 postpartum psychiatric crisis without stealing O* obstetric codes", () => {
    const ppPsych = resolveProviderDischargeTemplateForDiagnosis({ code: "F53.0", displayName: "Postpartum psychosis" });
    const ppBleed = resolveProviderDischargeTemplateForDiagnosis({ code: "O72.1", displayName: "Postpartum hemorrhage" });
    expect(ppPsych.template.id).toBe("postpartum_psychiatric_crisis_post_acute_v1");
    expect(ppBleed.template.id).toBe("postpartum_bleeding_post_acute_v1");
  });

  it("keeps intentional opioid poisoning T40.2X1A on toxicology, not psychiatric attempt", () => {
    const tox = resolveProviderDischargeTemplateForDiagnosis({
      code: "T40.2X1A",
      displayName: "Poisoning by other opioids, accidental",
    });
    expect(tox.template.id).toBe("opioid_overdose_post_observation_v1");
  });

  it("routes Z91.52 NSSI to self_harm_post_assessment, not suicide attempt", () => {
    const nssi = resolveProviderDischargeTemplateForDiagnosis({ code: "Z91.52", displayName: "Self-harm" });
    const attempt = resolveProviderDischargeTemplateForDiagnosis({ code: "T14.91XA", displayName: "Suicide attempt" });
    expect(nssi.template.id).toBe("self_harm_post_assessment_v1");
    expect(attempt.template.id).toBe("suicide_attempt_post_acute_v1");
  });

  it("routes Z53 refusal and AMA to distinct families", () => {
    const refusal = resolveProviderDischargeTemplateForDiagnosis({ code: "Z53.20", displayName: "Refusal of treatment" });
    const ama = resolveProviderDischargeTemplateForDiagnosis({ code: "Z53.9", displayName: "Procedure not carried out" });
    expect(refusal.template.id).toBe("informed_refusal_v1");
    expect(ama.template.id).toBe("against_medical_advice_v1");
  });

  it("routes F84 autism crisis to pediatric_behavioral_crisis", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "F84.0",
      displayName: "Autism spectrum disorder with behavioral crisis",
    });
    expect(resolved.template.id).toBe("pediatric_behavioral_crisis_v1");
  });

  it("routes substance-induced psychosis F19.959 to substance_induced_behavioral_crisis", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "F19.959",
      displayName: "Other psychoactive substance use, psychotic disorder",
    });
    expect(resolved.template.id).toBe("substance_induced_behavioral_crisis_v1");
  });
});
