import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { DISLOCATION_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendDislocationDispositionFromDiagnosis } from "@/features/emergency/dislocationDispositionRecommendations";
import { adaptDislocationComplaintIntel, resolveDislocationContextFromDiagnosis } from "@/lib/dislocationClinicalIntelligence";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_2_DISLOCATIONS", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "dislocation_adult_complaint_v1");

  it("single Dislocation provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateDislocationAdultComplaintV1).toBe("Dislocation");
    expect(frMessages.providerDocumentationWorkspace.templateDislocationAdultComplaintV1).toBe("Luxation");
  });

  it.each(["dislocation", "dislocated shoulder", "nursemaid", "patella dislocation", "jaw dislocation"])(
    "template search finds Dislocation for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "dislocation_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      for (const term of query.toLowerCase().split(/\s+/)) {
        expect(searchable).toContain(term);
      }
    }
  );

  it("intel includes reduction and specialty consult prompts", () => {
    const plan = DISLOCATION_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planReductionPerformed"))).toBe(true);
    expect(plan.some((k) => k.includes("planOrthopedicConsultRequested"))).toBe(true);
    expect(plan.some((k) => k.includes("planHandSurgeryConsultRequested"))).toBe(true);
    expect(plan.some((k) => k.includes("planMaxillofacialConsultRequested"))).toBe(true);
  });

  it.each([
    { code: "S43.001A", templateId: "trauma_msk_dislocation_shoulder_v1" },
    { code: "S53.031A", templateId: "trauma_msk_dislocation_elbow_v1" },
    { code: "S73.001A", templateId: "trauma_msk_dislocation_hip_v1" },
    { code: "S83.001A", templateId: "trauma_msk_dislocation_patella_v1" },
    { code: "S63.116A", templateId: "trauma_msk_dislocation_hand_v1" },
    { code: "S03.0XXA", templateId: "trauma_msk_dislocation_jaw_v1" },
  ])("discharge resolves $code to $templateId", ({ code, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "dislocation" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("does not break fracture or animal bite routing", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "S52.531A", displayName: "Colles fracture" }).template.id
    ).toBe("trauma_msk_minor_fracture_precautions_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "W54.0XXA", displayName: "Dog bite" }).template.id
    ).toBe("animal_bite_v1");
  });

  it("disposition recommendations are advisory", () => {
    const hip = recommendDislocationDispositionFromDiagnosis({
      code: "S73.001A",
      displayName: "hip dislocation",
    });
    expect(hip.map((r) => r.id)).toEqual(expect.arrayContaining(["admission", "orthopedics"]));
    expect(hip.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("adapt prioritizes region chips", () => {
    const ctx = resolveDislocationContextFromDiagnosis({
      code: "S03.0XXA",
      displayName: "jaw dislocation",
    });
    const adapted = adaptDislocationComplaintIntel(DISLOCATION_ADULT_COMPLAINT_V1_INTEL, ctx);
    const hpi = adapted.hpi ?? [];
    const jawIndex = hpi.findIndex((k) => k.toLowerCase().includes("jaw") || k.toLowerCase().includes("tmj"));
    const toeIndex = hpi.findIndex((k) => k.toLowerCase().includes("toe"));
    expect(jawIndex).toBeGreaterThanOrEqual(0);
    expect(jawIndex).toBeLessThan(toeIndex);
  });

  it("COMMON_DIAGNOSES and ICD sample include dislocation rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S43.001A")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S43.001A");
    expect(csv).toContain("S53.031A");
    expect(csv).toMatch(/dislocation|luxation/i);
  });
});
