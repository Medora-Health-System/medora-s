import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { TRAUMATIC_AMPUTATION_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendTraumaticAmputationDispositionFromDiagnosis } from "@/features/emergency/traumaticAmputationDispositionRecommendations";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_4_AMPUTATION", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "traumatic_amputation_adult_complaint_v1");

  it("single Traumatic Amputation provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateTraumaticAmputationAdultComplaintV1).toBe(
      "Traumatic Amputation"
    );
    expect(frMessages.providerDocumentationWorkspace.templateTraumaticAmputationAdultComplaintV1).toMatch(
      /amputation/i
    );
  });

  it.each(["amputation", "severed finger", "partial amputation", "severed toe"])(
    "template search finds Traumatic Amputation for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "traumatic_amputation_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      expect(searchable.toLowerCase()).toContain(query.split(/\s+/)[0]!.toLowerCase());
    }
  );

  it("intel includes hemorrhage and replantation prompts", () => {
    const plan = TRAUMATIC_AMPUTATION_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planHemorrhageControl"))).toBe(true);
    expect(plan.some((k) => k.includes("planReplantationPreservation"))).toBe(true);
  });

  it.each([
    { code: "S68.110A", templateId: "trauma_msk_amputation_finger_thumb_v1", displayName: "Complete traumatic amputation finger" },
    { code: "S98.111A", templateId: "trauma_msk_amputation_toe_v1", displayName: "Complete traumatic amputation toe" },
  ])("discharge resolves $code to $templateId", ({ code, templateId, displayName }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.template.id).not.toBe("wound_laceration_v1");
  });

  it("disposition recommendations are advisory", () => {
    const recs = recommendTraumaticAmputationDispositionFromDiagnosis({
      code: "S68.110A",
      displayName: "complete traumatic amputation finger",
    });
    expect(recs.some((r) => r.id === "hand_surgery" || r.id === "transfer")).toBe(true);
    expect(recs.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include amputation rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S68.110A")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S68.110A");
  });
});
