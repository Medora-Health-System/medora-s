import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendTendonDispositionFromDiagnosis } from "@/features/emergency/tendonDispositionRecommendations";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_3_TENDON", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "tendon_injury_adult_complaint_v1");

  it("single Tendon Injury / Rupture provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateTendonInjuryAdultComplaintV1).toBe(
      "Tendon Injury / Rupture"
    );
    expect(frMessages.providerDocumentationWorkspace.templateTendonInjuryAdultComplaintV1).toMatch(/tendineuse/i);
  });

  it.each(["tendon", "Achilles", "rotator cuff tear", "mallet finger", "flexor tendon"])(
    "template search finds Tendon Injury for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "tendon_injury_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      for (const term of query.toLowerCase().split(/\s+/)) {
        expect(searchable).toContain(term);
      }
    }
  );

  it("intel includes tendon-specific exam and plan prompts", () => {
    const plan = TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planTendonSplintProtocol"))).toBe(true);
    expect(plan.some((k) => k.includes("planOrthopedicFollowUp"))).toBe(true);
    expect((TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL.hpi ?? []).some((k) => k.includes("hpiSiteAchilles"))).toBe(true);
  });

  it.each([
    { code: "S86.011A", templateId: "trauma_msk_tendon_achilles_v1" },
    { code: "S46.011A", templateId: "trauma_msk_tendon_shoulder_v1" },
    { code: "S66.321A", templateId: "trauma_msk_tendon_hand_v1" },
    { code: "S76.111A", templateId: "trauma_msk_tendon_extensor_mechanism_v1" },
  ])("discharge resolves $code to $templateId", ({ code, templateId }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "tendon injury" });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.matchLevel).not.toBe("generic");
  });

  it("Achilles does not resolve to ankle sprain", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "S86.011A",
      displayName: "Achilles rupture",
    });
    expect(resolved.template.id).toBe("trauma_msk_tendon_achilles_v1");
    expect(resolved.template.id).not.toBe("trauma_msk_ankle_sprain_v1");
  });

  it("disposition recommendations are advisory", () => {
    const achilles = recommendTendonDispositionFromDiagnosis({
      code: "S86.011A",
      displayName: "Achilles rupture",
    });
    expect(achilles.map((r) => r.id)).toContain("orthopedics");
    expect(achilles.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include tendon rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "S86.011A")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("S86.011A");
    expect(csv).toContain("S46.011A");
    expect(csv).toMatch(/tendon|Achilles|rotator cuff/i);
  });
});
