import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendCrushDispositionFromDiagnosis } from "@/features/emergency/crushDispositionRecommendations";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_4_CRUSH", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "crush_injury_adult_complaint_v1");

  it("single Crush Injury adaptive provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateCrushInjuryAdultComplaintV1).toBe("Crush Injury");
    expect(frMessages.providerDocumentationWorkspace.templateCrushInjuryAdultComplaintV1).toMatch(/écrasement|Ecrasement/i);
    expect(enMessages.providerDocumentationWorkspace.templateCrushInjury).toMatch(/legacy/i);
  });

  it.each(["crush", "crushing injury", "crushed hand", "prolonged compression", "degloving"])(
    "template search finds Crush Injury for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "crush_injury_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      expect(searchable.toLowerCase()).toContain(query.split(/\s+/)[0]!.toLowerCase());
    }
  );

  it("intel includes compartment and rhabdomyolysis prompts", () => {
    const plan = CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planSerialCompartmentChecks"))).toBe(true);
    expect(plan.some((k) => k.includes("planRhabdomyolysisMonitoring"))).toBe(true);
  });

  it.each([
    { code: "S67.21XA", templateId: "trauma_msk_crush_hand_finger_v1" },
    { code: "S77.11XA", templateId: "trauma_msk_crush_lower_extremity_v1" },
    { code: "S97.81XA", templateId: "trauma_msk_crush_foot_toe_v1" },
    { code: "T79.6XXA", templateId: "trauma_msk_crush_prolonged_compression_v1" },
  ])("discharge resolves $code to $templateId", ({ code, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "crush injury" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("crush does not resolve to contusion or laceration", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "S67.21XA",
      displayName: "Crushing injury of right hand",
    });
    expect(resolved.template.id).not.toBe("trauma_msk_contusion_v1");
    expect(resolved.template.id).not.toBe("wound_laceration_v1");
  });

  it("disposition recommendations are advisory", () => {
    const recs = recommendCrushDispositionFromDiagnosis({
      code: "T79.6XXA",
      displayName: "prolonged compression",
    });
    expect(recs.some((r) => r.id === "admission" || r.id === "trauma")).toBe(true);
    expect(recs.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include crush rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S67.21XA")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S67.21XA");
    expect(csv).toMatch(/crush/i);
  });
});
