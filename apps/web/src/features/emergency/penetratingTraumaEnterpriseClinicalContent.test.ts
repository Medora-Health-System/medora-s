import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { PENETRATING_TRAUMA_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

function resolveWorkspaceLabel(key: string, messages: typeof enMessages): string {
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, messages) as string;
}

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_6_PENETRATING_TRAUMA", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "penetrating_trauma_adult_complaint_v1");

  it("registers the adaptive penetrating trauma template", () => {
    expect(template?.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templatePenetratingTraumaAdultComplaintV1).toBe("Gunshot / Stab / Penetrating Trauma");
    expect(frMessages.providerDocumentationWorkspace.templatePenetratingTraumaAdultComplaintV1).toMatch(/blessure par balle/i);
    expect(enMessages.providerDocumentationWorkspace.templatePenetratingInjury).toMatch(/legacy/i);
  });

  it.each(["gunshot", "firearm", "stab", "knife", "impalement", "tourniquet"])("finds the template for %s", (query) => {
    const matches = filterProviderDocumentationTemplates(query, (key) => resolveWorkspaceLabel(key, enMessages));
    expect(matches.some((item) => item.id === "penetrating_trauma_adult_complaint_v1")).toBe(true);
    expect(providerDocumentationTemplateSearchableText(template!, (key) => resolveWorkspaceLabel(key, enMessages)).toLowerCase()).toContain(query);
  });

  it("includes mechanism, hemorrhage, and trauma activation prompts", () => {
    expect(PENETRATING_TRAUMA_ADULT_COMPLAINT_V1_INTEL.hpi?.some((key) => key.includes("hpiGunshotMechanism"))).toBe(true);
    expect(PENETRATING_TRAUMA_ADULT_COMPLAINT_V1_INTEL.hpi?.some((key) => key.includes("hpiActiveHemorrhage"))).toBe(true);
    expect(PENETRATING_TRAUMA_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary?.some((key) => key.includes("planTraumaActivation"))).toBe(true);
  });

  it("routes penetrating diagnoses to region-specific discharge templates", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "S21.301A", displayName: "Penetrating wound of chest" }).template.id).toBe("penetrating_chest_v1");
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "S61.239A", displayName: "Puncture wound of finger" }).template.id).toBe("penetrating_hand_injury_v1");
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "S61.239A", displayName: "Gunshot wound of hand" }).template.id).toBe("penetrating_hand_injury_v1");
  });

  it("does not route cavity penetration to laceration or animal-bite templates", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "S21.301A", displayName: "Penetrating wound of chest" });
    expect(resolved.template.id).not.toBe("wound_laceration_v1");
    expect(resolved.template.id).not.toBe("animal_bite_v1");
  });
});
