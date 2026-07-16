import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { FRACTURE_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendFractureDispositionFromDiagnosis } from "@/features/emergency/fractureDispositionRecommendations";
import { adaptFractureComplaintIntel, resolveFractureContextFromDiagnosis } from "@/lib/fractureClinicalIntelligence";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_1_FOUNDATION_AND_FRACTURES", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "fracture_adult_complaint_v1");

  it("single Fracture provider template exists in adult MSK trauma catalog", () => {
    expect(template).toBeTruthy();
    expect(template!.majorGroup).toBe("ADULT");
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateFractureAdultComplaintV1).toBe("Fracture");
    expect(frMessages.providerDocumentationWorkspace.templateFractureAdultComplaintV1).toBe("Fracture");
  });

  it.each([
    "fracture",
    "broken bone",
    "broken arm",
    "broken wrist",
    "broken hip",
    "broken leg",
    "broken ankle",
    "broken finger",
    "clavicle",
    "greenstick",
    "open fracture",
  ])("template search finds Fracture for %s", (query) => {
    expect(template).toBeTruthy();
    const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
    expect(matches.some((t) => t.id === "fracture_adult_complaint_v1")).toBe(true);
    const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
      resolveWorkspaceLabel(k, enMessages)
    );
    for (const term of query.toLowerCase().split(/\s+/)) {
      expect(searchable).toContain(term);
    }
  });

  it("template intelligence populates HPI ROS PE MDM impression plan and specialty consults", () => {
    const intel = FRACTURE_ADULT_COMPLAINT_V1_INTEL;
    expect((intel.hpi ?? []).length).toBeGreaterThan(20);
    expect((intel.rosImportantPositives ?? []).length).toBeGreaterThan(0);
    expect((intel.rosImportantNegatives ?? []).length).toBeGreaterThan(0);
    expect(Object.keys(intel.physicalExam ?? {}).length).toBeGreaterThan(2);
    expect((intel.mdmWorkingAssessment ?? []).length).toBeGreaterThan(0);
    expect((intel.mdmDifferentialSynthesis ?? []).length).toBeGreaterThan(0);
    expect((intel.mdmPlanSummary ?? []).length).toBeGreaterThan(5);
    expect((intel.clinicalImpression ?? []).length).toBeGreaterThan(0);
    const plan = intel.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planOrthopedicConsultRequested"))).toBe(true);
    expect(plan.some((k) => k.includes("planNeurosurgeryConsultRequested"))).toBe(true);
    expect(plan.some((k) => k.includes("planMaxillofacialConsultRequested"))).toBe(true);
    expect(plan.some((k) => k.includes("planHandSurgeryConsultRequested"))).toBe(true);
  });

  it("body-region HPI fields cover head-to-toe fracture sites", () => {
    const hpi = FRACTURE_ADULT_COMPLAINT_V1_INTEL.hpi ?? [];
    const requiredSites = [
      "Skull",
      "Facial",
      "Orbital",
      "Nasal",
      "Mandible",
      "CervicalSpine",
      "ShoulderClavicle",
      "UpperArmHumerus",
      "Elbow",
      "ForearmWrist",
      "Hand",
      "Finger",
      "ThoracicSpine",
      "Rib",
      "Sternum",
      "LumbarSpine",
      "Pelvis",
      "Hip",
      "Femur",
      "Knee",
      "TibiaFibula",
      "Ankle",
      "Foot",
      "Toe",
    ];
    for (const site of requiredSites) {
      expect(hpi.some((k) => k.includes(`hpiSite${site}`))).toBe(true);
    }
  });

  it("EN/FR complaint intel namespace has fracture region and consult labels", () => {
    const enNs = providerDocumentationTraumaInjuryComplaintIntelEn.fractureAdultComplaintV1;
    const frNs = providerDocumentationTraumaInjuryComplaintIntelFr.fractureAdultComplaintV1;
    expect(enNs.hpiSiteHip).toMatch(/hip/i);
    expect(frNs.hpiSiteHip).toMatch(/hanche/i);
    expect(enNs.planOrthopedicConsultRequested).toMatch(/orthop/i);
    expect(frNs.planOrthopedicConsultRequested).toMatch(/orthop/i);
    expect(enNs.diffOpenFracture).toMatch(/open fracture/i);
    expect(frNs.diffOpenFracture).toMatch(/ouverte/i);
  });

  it.each([
    { code: "S52.531A", displayName: "Colles fracture", templateId: "trauma_msk_minor_fracture_precautions_v1" },
    { code: "S72.001A", displayName: "Hip fracture", templateId: "trauma_msk_fracture_hip_v1" },
    { code: "S02.3XXA", displayName: "Orbital floor fracture", templateId: "orbital_fracture_v1" },
    { code: "S32.010A", displayName: "Lumbar compression fracture", templateId: "trauma_msk_fracture_spine_v1" },
    { code: "S82.201B", displayName: "Open tibia fracture", templateId: "trauma_msk_fracture_open_v1" },
    { code: "S62.351A", displayName: "Metacarpal fracture", templateId: "trauma_msk_fracture_hand_v1" },
    { code: "S22.32XA", displayName: "Rib fracture", templateId: "trauma_msk_rib_injury_v1" },
    { code: "S32.810A", displayName: "Pelvic fracture", templateId: "trauma_msk_minor_fracture_precautions_v1" },
    { code: "M84.351A", displayName: "Stress fracture hip", templateId: "trauma_msk_minor_fracture_precautions_v1" },
    { code: "S52.121A", displayName: "Greenstick fracture", templateId: "trauma_msk_minor_fracture_precautions_v1" },
  ])("discharge resolves $code to $templateId", ({ code, displayName, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("does not steal animal bite discharge routing", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "W54.0XXA",
      displayName: "Dog bite",
    });
    expect(resolved.template.id).toBe("animal_bite_v1");
  });

  it("fracture discharge prefills include immobilization return and follow-up", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "S52.531A",
      displayName: "Distal radius fracture",
    });
    const text = resolved.template.suggestedText.en;
    expect(text.diagnosisInstructions.toLowerCase()).toMatch(/splint|cast|orthoped/);
    expect(text.returnPrecautions.toLowerCase()).toMatch(/numbness|swelling|pain/);
    expect((resolved.template.defaultFollowUps ?? []).length).toBeGreaterThan(0);
  });

  it("disposition recommendations are advisory only and cover specialty consults", () => {
    const hip = recommendFractureDispositionFromDiagnosis({
      code: "S72.001A",
      displayName: "hip fracture",
    });
    expect(hip.map((r) => r.id)).toEqual(expect.arrayContaining(["admission", "orthopedics"]));
    expect(hip.every((r) => typeof r.rationale === "string" && r.rationale.length > 10)).toBe(true);

    const facial = recommendFractureDispositionFromDiagnosis({
      code: "S02.3XXA",
      displayName: "orbital fracture",
    });
    expect(facial.map((r) => r.id)).toContain("maxillofacial");

    const hand = recommendFractureDispositionFromDiagnosis({
      code: "S62.351A",
      displayName: "metacarpal fracture",
    });
    expect(hand.map((r) => r.id)).toContain("hand_surgery");
  });

  it("adaptFractureComplaintIntel prioritizes matching region chips", () => {
    const ctx = resolveFractureContextFromDiagnosis({
      code: "S02.3XXA",
      displayName: "orbital floor fracture",
    });
    const adapted = adaptFractureComplaintIntel(FRACTURE_ADULT_COMPLAINT_V1_INTEL, ctx);
    const hpi = adapted.hpi ?? [];
    const orbitalIndex = hpi.findIndex((k) => k.toLowerCase().includes("orbital"));
    const toeIndex = hpi.findIndex((k) => k.toLowerCase().includes("toe"));
    expect(orbitalIndex).toBeGreaterThanOrEqual(0);
    expect(toeIndex).toBeGreaterThanOrEqual(0);
    expect(orbitalIndex).toBeLessThan(toeIndex);
  });

  it("COMMON_DIAGNOSES includes fracture choices without duplicates", () => {
    const fractureCodes = [
      "S52.531A",
      "S72.001A",
      "S02.3XXA",
      "S32.010A",
      "S82.201B",
      "S42.001A",
      "S22.32XA",
      "S62.351A",
      "S82.66XA",
      "M84.351A",
      "S52.121A",
    ];
    const codes = COMMON_DIAGNOSES.map((d) => d.code);
    for (const code of fractureCodes) {
      expect(codes.filter((c) => c === code)).toHaveLength(1);
    }
    expect(COMMON_DIAGNOSES.some((d) => /fracture/i.test(d.label))).toBe(true);
  });

  it("ICD sample catalog includes searchable fracture rows across major regions", () => {
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    for (const code of [
      "S52.531A",
      "S72.001A",
      "S02.3XXA",
      "S32.010A",
      "S82.201B",
      "S42.001A",
      "S22.32XA",
      "S62.351A",
      "S32.810A",
      "M84.351A",
      "M84.451A",
      "S52.121A",
    ]) {
      expect(csv).toContain(code);
    }
    expect(csv).toMatch(/fracture/i);
    expect(csv).toMatch(/broken wrist|broken hip|open fracture|greenstick|pelvic fracture/i);
  });

  it("keeps animal bite provider template intact", () => {
    const bite = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "animal_bite_adult_complaint_v1");
    expect(bite).toBeTruthy();
    expect(bite!.pickerSubgroupKey).toBe("msk_trauma");
  });
});
