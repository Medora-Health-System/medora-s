import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { BURN_INJURY_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

function resolveWorkspaceLabel(key: string, messages: typeof enMessages): string {
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages) as string;
}

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_5_BURN", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "burn_injury_adult_complaint_v1");

  it("registers the adaptive burn / inhalation template", () => {
    expect(template?.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateBurnInjuryAdultComplaintV1).toBe("Burn / Inhalation Injury");
    expect(frMessages.providerDocumentationWorkspace.templateBurnInjuryAdultComplaintV1).toMatch(/brûlure/i);
    expect(enMessages.providerDocumentationWorkspace.templateBurn).toMatch(/legacy/i);
  });

  it.each(["burn", "scald", "chemical", "electrical", "inhalation", "frostbite"])(
    "finds the template for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (key) => resolveWorkspaceLabel(key, enMessages));
      expect(matches.some((item) => item.id === "burn_injury_adult_complaint_v1")).toBe(true);
      expect(providerDocumentationTemplateSearchableText(template!, (key) => resolveWorkspaceLabel(key, enMessages)).toLowerCase()).toContain(query);
    },
  );

  it("includes airway, TBSA, and depth documentation prompts", () => {
    expect(BURN_INJURY_ADULT_COMPLAINT_V1_INTEL.hpi?.some((key) => key.includes("hpiTbsaEstimated"))).toBe(true);
    expect(BURN_INJURY_ADULT_COMPLAINT_V1_INTEL.hpi?.some((key) => key.includes("hpiAirwaySymptoms"))).toBe(true);
    expect(Object.values(BURN_INJURY_ADULT_COMPLAINT_V1_INTEL.physicalExam ?? {}).flat().some((key) => key.includes("examBurnDepthDocumented"))).toBe(true);
  });

  it.each([
    ["T20.10XA", "burn_face_v1"],
    ["T23.201A", "burn_hand_v1"],
    ["T27.0XXA", "burn_inhalation_aftercare_v1"],
    ["T75.4XXA", "burn_electrical_v1"],
    ["T33.011A", "frostbite_v1"],
    ["L55.9", "sunburn_v1"],
  ])("routes %s to its burn discharge template", (code, templateId) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "burn injury" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.template.id).not.toBe("wound_laceration_v1");
    expect(resolved.template.id).not.toContain("fracture");
  });
});
