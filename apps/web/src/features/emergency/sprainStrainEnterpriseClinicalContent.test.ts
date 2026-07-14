import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendSprainStrainDispositionFromDiagnosis } from "@/features/emergency/sprainStrainDispositionRecommendations";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_2_SPRAINS_STRAINS", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "sprain_strain_adult_complaint_v1");

  it("single Sprain / Strain provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateSprainStrainAdultComplaintV1).toBe("Sprain / Strain");
    expect(frMessages.providerDocumentationWorkspace.templateSprainStrainAdultComplaintV1).toMatch(/Entorse/);
  });

  it.each(["sprain", "ankle sprain", "neck strain", "hamstring", "twisted ankle"])(
    "template search finds Sprain / Strain for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "sprain_strain_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      for (const term of query.toLowerCase().split(/\s+/)) {
        expect(searchable).toContain(term);
      }
    }
  );

  it("intel includes RICE and instability-aware plan prompts", () => {
    const plan = SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planRiceInstructions"))).toBe(true);
    expect(plan.some((k) => k.includes("planOrthopedicFollowUp"))).toBe(true);
    expect((SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL.hpi ?? []).some((k) => k.includes("hpiSiteAnkle"))).toBe(true);
  });

  it.each([
    { code: "S93.401A", templateId: "trauma_msk_ankle_sprain_v1" },
    { code: "S63.501A", templateId: "trauma_msk_wrist_sprain_v1" },
    { code: "S83.90XA", templateId: "trauma_msk_knee_injury_v1" },
    { code: "S16.1XXA", templateId: "trauma_msk_neck_strain_v1" },
    { code: "S39.012A", templateId: "trauma_msk_back_strain_v1" },
    { code: "S43.401A", templateId: "trauma_msk_shoulder_pain_v1" },
    { code: "S76.311A", templateId: "trauma_msk_tendon_generic_v1" },
  ])("discharge resolves $code to $templateId", ({ code, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "sprain strain" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("shoulder dislocation does not resolve to ankle sprain", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "S43.001A",
      displayName: "Shoulder dislocation",
    });
    expect(resolved.template.id).toBe("trauma_msk_dislocation_shoulder_v1");
    expect(resolved.template.id).not.toBe("trauma_msk_ankle_sprain_v1");
  });

  it("disposition recommendations are advisory", () => {
    const ankle = recommendSprainStrainDispositionFromDiagnosis({
      code: "S93.401A",
      displayName: "ankle sprain",
    });
    expect(ankle.map((r) => r.id)).toContain("discharge");
    expect(ankle.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include sprain/strain rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S93.401A")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S93.401A");
    expect(csv).toContain("S76.311A");
    expect(csv).toMatch(/sprain|strain|entorse/i);
  });
});
