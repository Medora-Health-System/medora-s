import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendLigamentDispositionFromDiagnosis } from "@/features/emergency/ligamentDispositionRecommendations";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_3_LIGAMENT", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "ligament_injury_adult_complaint_v1");

  it("single Ligament Injury / Tear provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateLigamentInjuryAdultComplaintV1).toBe(
      "Ligament Injury / Tear"
    );
    expect(frMessages.providerDocumentationWorkspace.templateLigamentInjuryAdultComplaintV1).toMatch(/ligamentaire/i);
  });

  it.each(["ligament", "ACL", "syndesmosis", "thumb UCL", "scapholunate"])(
    "template search finds Ligament Injury for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "ligament_injury_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      for (const term of query.toLowerCase().split(/\s+/)) {
        expect(searchable).toContain(term);
      }
    }
  );

  it("intel includes ligament-specific exam and plan prompts", () => {
    const plan = LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planBraceImmobilization"))).toBe(true);
    expect(plan.some((k) => k.includes("planOrthopedicFollowUp"))).toBe(true);
    expect((LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL.hpi ?? []).some((k) => k.includes("hpiSiteAcl"))).toBe(true);
  });

  it.each([
    { code: "S83.511A", templateId: "trauma_msk_ligament_knee_v1" },
    { code: "S93.431A", templateId: "trauma_msk_ligament_ankle_v1" },
    { code: "S63.641A", templateId: "trauma_msk_ligament_hand_v1" },
    { code: "S63.511A", templateId: "trauma_msk_ligament_upper_extremity_v1" },
  ])("discharge resolves $code to $templateId", ({ code, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "ligament injury" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("ACL does not resolve to generic knee sprain template", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "S83.511A",
      displayName: "ACL tear",
    });
    expect(resolved.template.id).toBe("trauma_msk_ligament_knee_v1");
    expect(resolved.template.id).not.toBe("trauma_msk_knee_injury_v1");
  });

  it("disposition recommendations are advisory", () => {
    const acl = recommendLigamentDispositionFromDiagnosis({
      code: "S83.511A",
      displayName: "ACL tear",
    });
    expect(acl.map((r) => r.id)).toContain("orthopedics");
    expect(acl.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include ligament rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S83.511A")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S83.511A");
    expect(csv).toContain("S93.431A");
    expect(csv).toMatch(/ligament|ACL|syndesmosis/i);
  });
});
