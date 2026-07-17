import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationPsychiatricBehavioralIntelligence";
import { OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationObGynUrologyIntelligence";
import { TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationToxicologyIntelligence";
import { BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS, PHASE_18_PSYCHIATRIC_BEHAVIORAL_ED_DISCHARGE_TEMPLATE_IDS } from "@/features/emergency/providerDischargeTemplateRegistry";
import { resolveSuicideSelfHarmRiskContext } from "@/lib/suicideSelfHarmRiskClinicalIntelligence";
import { resolveDeliriumCatatoniaCognitiveBehaviorChangeContext } from "@/lib/deliriumCatatoniaCognitiveBehaviorChangeClinicalIntelligence";
import { resolvePsychosisManiaBehavioralCrisisContext } from "@/lib/psychosisManiaBehavioralCrisisClinicalIntelligence";
import { flattenComplaintIntelligenceKeys } from "@/lib/providerDocumentationComplaintIntelligence";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("psychiatricBehavioralEnterpriseClinicalContent — Phase 18 (Commit 1)", () => {
  it("exposes exactly six psychiatric / behavioral / capacity adaptive templates", () => {
    for (const id of PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === id)).toHaveLength(1);
    }
    expect(PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(6);
  });

  it("does not create per-diagnosis visible template explosion", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(schizophrenia|bipolar|depression|ptsd|delirium)_complaint/.test(t.id)
      )
    ).toBe(false);
  });

  it("preserves psychiatric_behavioral, BATCH27 OB/GYN, Phase 16 tox, BATCH_8 and Phase 18 discharge IDs", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "psychiatric_behavioral")).toBe(true);
    expect(OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(6);
    expect(TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(4);
    expect(BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
    expect(PHASE_18_PSYCHIATRIC_BEHAVIORAL_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(20);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "observation_reassessment")).toBe(true);
  });

  it("maps post-assessment passive SI to Phase 18 suicidal ideation family", () => {
    const context = resolveSuicideSelfHarmRiskContext({
      displayName: "Passive suicidal ideation, post-observation follow-up",
    });
    expect(context.dischargeFamilyId).toBe("suicidal_ideation_post_assessment_v1");
  });

  it("withholds routine discharge for active SI with plan", () => {
    const context = resolveSuicideSelfHarmRiskContext({
      displayName: "Active suicidal ideation with plan and access to means",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for delirium", () => {
    const context = resolveDeliriumCatatoniaCognitiveBehaviorChangeContext({
      displayName: "Delirium with acute confusional state",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for postpartum psychosis", () => {
    const context = resolvePsychosisManiaBehavioralCrisisContext({
      displayName: "Postpartum psychosis with command hallucinations",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("chip dictionaries avoid forbidden language", () => {
    const forbidden = [
      "crazy",
      "manipulative",
      "drug-seeking",
      "excited delirium",
      "medically cleared",
      "low suicide risk",
      "not psychotic",
      "has capacity",
      "lacks capacity",
      "safe for discharge",
    ];
    const psychEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    const namespaces = [
      "suicideSelfHarmRiskV1",
      "psychosisManiaBehavioralCrisisV1",
      "depressionAnxietyTraumaCrisisV1",
      "deliriumCatatoniaCognitiveBehaviorChangeV1",
      "pediatricDevelopmentalBehavioralEmergencyV1",
      "capacityRefusalSafetyDispositionV1",
    ];
    for (const ns of namespaces) {
      const blob = Object.values(psychEn[ns] ?? {}).join(" ").toLowerCase();
      for (const phrase of forbidden) {
        if (phrase === "medically cleared" && blob.includes("no medically cleared")) continue;
        if (phrase === "low suicide risk" && blob.includes("no low suicide risk")) continue;
        if (phrase === "not psychotic" && blob.includes("no not psychotic")) continue;
        if (phrase === "has capacity" && blob.includes("no has or lacks capacity")) continue;
        if (phrase === "lacks capacity" && blob.includes("no has or lacks capacity")) continue;
        if (phrase === "safe for discharge" && blob.includes("no safe for discharge")) continue;
        expect(blob.includes(phrase)).toBe(false);
      }
    }
  });

  it("resolves EN/FR template titles", () => {
    const workspaceEn = (en as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    const workspaceFr = (fr as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    expect(workspaceEn.templateSuicideSelfHarmRiskV1).toBe("Suicidal Ideation / Self-Harm");
    expect(workspaceFr.templateSuicideSelfHarmRiskV1).toBe("Idées suicidaires / Automutilation");
    expect(workspaceEn.templatePsychosisManiaBehavioralCrisisV1).toBe("Psychosis / Mania / Behavioral Crisis");
    expect(workspaceFr.templatePsychosisManiaBehavioralCrisisV1).toBe("Psychose / Manie / Crise comportementale");
    expect(workspaceEn.templateDepressionAnxietyTraumaCrisisV1).toBe("Depression / Anxiety / Trauma Crisis");
    expect(workspaceFr.templateDepressionAnxietyTraumaCrisisV1).toBe(
      "Dépression / Anxiété / Crise liée au traumatisme"
    );
    expect(workspaceEn.templateDeliriumCatatoniaCognitiveBehaviorChangeV1).toBe(
      "Delirium / Catatonia / Cognitive-Behavioral Change"
    );
    expect(workspaceFr.templateDeliriumCatatoniaCognitiveBehaviorChangeV1).toBe(
      "Délirium / Catatonie / Changement cognitivo-comportemental"
    );
    expect(workspaceEn.templatePediatricDevelopmentalBehavioralEmergencyV1).toBe(
      "Pediatric / Developmental Behavioral Emergency"
    );
    expect(workspaceFr.templatePediatricDevelopmentalBehavioralEmergencyV1).toBe(
      "Urgence comportementale pédiatrique / Développementale"
    );
    expect(workspaceEn.templateCapacityRefusalSafetyDispositionV1).toBe(
      "Capacity / Refusal / Safety Disposition"
    );
    expect(workspaceFr.templateCapacityRefusalSafetyDispositionV1).toBe(
      "Capacité décisionnelle / Refus / Disposition sécuritaire"
    );
  });

  it("has complete i18n keys for psychiatric / behavioral complaint intelligence chips", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "suicide_self_harm_risk_v1");
    expect(template?.complaintIntelligence).toBeTruthy();
    const keys = flattenComplaintIntelligenceKeys(template!.complaintIntelligence!);
    const psychEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    for (const key of keys) {
      const match = key.match(/^providerDocumentationComplaintIntel\.(\w+)\.(\w+)$/);
      expect(match).toBeTruthy();
      const [, ns, leaf] = match!;
      expect(psychEn[ns]?.[leaf]).toBeTruthy();
    }
  });
});
