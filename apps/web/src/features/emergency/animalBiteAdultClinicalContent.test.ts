import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL, HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import { providerDocumentationTraumaInjuryComplaintIntelEn } from "@/i18n/messages/providerDocumentationTraumaInjuryComplaintIntel.en";
import { providerDocumentationTraumaInjuryComplaintIntelFr } from "@/i18n/messages/providerDocumentationTraumaInjuryComplaintIntel.fr";

const webRoot = join(import.meta.dirname, "../..");

function resolveWorkspaceLabel(key: string, messages: typeof enMessages): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

describe("MEDUI.CLINICAL_CONTENT.ANIMAL_BITE_ADULT_TEMPLATE_AND_DX", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "animal_bite_adult_complaint_v1");

  it("adult animal bite template exists in adult MSK trauma catalog", () => {
    expect(template).toBeTruthy();
    expect(template!.majorGroup).toBe("ADULT");
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
  });

  it.each(["animal bite", "dog bite", "cat bite", "mammal bite", "bite wound", "puncture wound"])(
    "template search finds animal bite for %s",
    (query) => {
      expect(template).toBeTruthy();
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "animal_bite_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages),
      );
      for (const term of query.toLowerCase().split(/\s+/)) {
        expect(searchable).toContain(term);
      }
    },
  );

  it("routes human-bite search to the dedicated high-risk wound template", () => {
    const matches = filterProviderDocumentationTemplates("human bite", (k) => resolveWorkspaceLabel(k, enMessages));
    expect(matches.some((t) => t.id === "human_bite_high_risk_wound_adult_complaint_v1")).toBe(true);
    expect(matches.some((t) => t.id === "animal_bite_adult_complaint_v1")).toBe(false);
    expect((HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? []).some((key) => key.includes("planTetanusUpdate"))).toBe(true);
  });

  it("template intelligence populates HPI ROS PE MDM impression and plan sections", () => {
    const intel = ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL;
    expect((intel.hpi ?? []).length).toBeGreaterThan(10);
    expect((intel.rosImportantPositives ?? []).length).toBeGreaterThan(0);
    expect((intel.rosImportantNegatives ?? []).length).toBeGreaterThan(0);
    expect(Object.keys(intel.physicalExam ?? {}).length).toBeGreaterThan(2);
    expect((intel.mdmWorkingAssessment ?? []).length).toBeGreaterThan(0);
    expect((intel.mdmDifferentialSynthesis ?? []).length).toBeGreaterThan(0);
    expect((intel.mdmPlanSummary ?? []).length).toBeGreaterThan(5);
    expect((intel.clinicalImpression ?? []).length).toBeGreaterThan(0);
  });

  it("body-region HPI fields cover head-to-toe sites", () => {
    const hpi = ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL.hpi ?? [];
    const requiredSites = [
      "ScalpHead",
      "Face",
      "EyePeriorbital",
      "Ear",
      "Nose",
      "MouthLip",
      "Neck",
      "Shoulder",
      "UpperArm",
      "Elbow",
      "Forearm",
      "Wrist",
      "HandFinger",
      "Chest",
      "Abdomen",
      "Back",
      "Buttock",
      "Hip",
      "Thigh",
      "Knee",
      "LowerLeg",
      "Ankle",
      "FootToe",
      "MultipleSites",
      "Unspecified",
    ];
    for (const site of requiredSites) {
      expect(hpi.some((k) => k.includes(`hpiBiteLocation${site}`))).toBe(true);
    }
  });

  it("plan includes tetanus rabies antibiotic and wound care prompts", () => {
    const plan = ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planTetanusUpdate"))).toBe(true);
    expect(plan.some((k) => k.includes("planRabiesRiskAssessment"))).toBe(true);
    expect(plan.some((k) => k.includes("planAntibioticsDecision"))).toBe(true);
    expect(plan.some((k) => k.includes("planWoundIrrigationCleansing") || k.includes("planWoundCare"))).toBe(
      true,
    );
  });

  it("EN/FR workspace labels exist without raw i18n keys leaking", () => {
    expect(enMessages.providerDocumentationWorkspace.templateAnimalBiteAdultComplaintV1).toMatch(/animal bite|sting/i);
    expect(frMessages.providerDocumentationWorkspace.templateAnimalBiteAdultComplaintV1).toMatch(/morsure/i);
  });

  it("EN/FR complaint intel namespace has animal bite body region labels", () => {
    const enNs = providerDocumentationTraumaInjuryComplaintIntelEn.animalBiteAdultComplaintV1;
    const frNs = providerDocumentationTraumaInjuryComplaintIntelFr.animalBiteAdultComplaintV1;
    expect(enNs.hpiBiteLocationHandFinger).toMatch(/hand|finger/i);
    expect(frNs.hpiBiteLocationHandFinger).toMatch(/main|doigt/i);
    expect(enNs.planRabiesRiskAssessment).toMatch(/rabies/i);
    expect(frNs.planRabiesRiskAssessment).toMatch(/rage/i);
  });

  it("diagnosis resolve preserves animal ownership and routes human bite separately", () => {
    const cases = [
      { code: "W54.0XXA", displayName: "Bitten by dog, initial encounter" },
      { code: "W55.01XA", displayName: "Bitten by cat, initial encounter" },
      { code: "S61.459A", displayName: "Open bite of unspecified finger" },
      { code: "", displayName: "Animal bite wound" },
      { code: "", displayName: "Dog bite" },
      { code: "", displayName: "Morsure de chien" },
    ];
    for (const c of cases) {
      const resolved = resolveProviderDischargeTemplateForDiagnosis(c);
      expect(resolved.template.id).toBe("animal_bite_v1");
      expect(resolved.template.id).not.toMatch(/phobia|allergy/i);
    }
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "W50.3XXA", displayName: "Accidental bite by another person" }).template.id).toBe("human_bite_v1");
  });

  it("animal bite discharge prefills include wound care infection antibiotics rabies return and follow-up", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "W54.0XXA",
      displayName: "Dog bite",
    });
    const text = resolved.template.suggestedText.en;
    expect(text.diagnosisInstructions.toLowerCase()).toMatch(/wound|dressing|antibiot/);
    expect(text.diagnosisInstructions.toLowerCase()).toMatch(/tetanus|rabies|24/);
    expect(text.returnPrecautions.toLowerCase()).toMatch(/red streak|fever|numbness|rabies/);
    expect((resolved.template.defaultFollowUps ?? []).length).toBeGreaterThan(0);
    expect(
      (resolved.template.defaultFollowUps ?? []).some((f) =>
        /1–2|1-2|24|48/i.test(String((f as { timing?: string }).timing ?? "")),
      ),
    ).toBe(true);
  });

  it("COMMON_DIAGNOSES includes animal bite choices without duplicates", () => {
    const biteCodes = ["W54.0XXA", "W55.01XA", "W50.3XXA", "W55.81XA", "S61.459A"];
    const codes = COMMON_DIAGNOSES.map((d) => d.code);
    for (const code of biteCodes) {
      expect(codes.filter((c) => c === code)).toHaveLength(1);
    }
    expect(COMMON_DIAGNOSES.some((d) => /morsure|bite/i.test(d.label))).toBe(true);
  });

  it("ICD sample catalog includes searchable animal bite rows", () => {
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("W54.0XXA");
    expect(csv).toContain("Bitten by dog");
    expect(csv).toContain("W55.01XA");
    expect(csv).toContain("Bitten by cat");
    expect(csv).toContain("animal bite");
    expect(csv).not.toMatch(/F40\.|animal phobia/i);
  });
});
