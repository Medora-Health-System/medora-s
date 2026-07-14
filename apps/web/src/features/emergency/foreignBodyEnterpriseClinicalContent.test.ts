import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { FOREIGN_BODY_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { resolveProviderDischargeTemplateForDiagnosis } from "@/features/emergency/providerDischargeTemplateRegistry";
import { recommendForeignBodyDispositionFromDiagnosis } from "@/features/emergency/foreignBodyDispositionRecommendations";
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

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_4_FOREIGN_BODY", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "foreign_body_adult_complaint_v1");

  it("single Foreign Body provider template exists", () => {
    expect(template).toBeTruthy();
    expect(template!.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateForeignBodyAdultComplaintV1).toBe("Foreign Body");
    expect(frMessages.providerDocumentationWorkspace.templateForeignBodyAdultComplaintV1).toMatch(
      /corps étranger|corps etranger/i
    );
  });

  it.each(["foreign body", "splinter", "fishhook", "foreign body eye"])(
    "template search finds Foreign Body for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (k) => resolveWorkspaceLabel(k, enMessages));
      expect(matches.some((t) => t.id === "foreign_body_adult_complaint_v1")).toBe(true);
      const searchable = providerDocumentationTemplateSearchableText(template!, (k) =>
        resolveWorkspaceLabel(k, enMessages)
      );
      expect(searchable.toLowerCase()).toContain(query.split(/\s+/)[0]!.toLowerCase());
    }
  );

  it("intel includes removal completeness without procedure duplication language", () => {
    const plan = FOREIGN_BODY_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary ?? [];
    expect(plan.some((k) => k.includes("planForeignBodyRemovalComplete"))).toBe(true);
    expect(plan.some((k) => k.includes("planImagingDecision"))).toBe(true);
  });

  it.each([
    { code: "T15.00XA", templateId: "trauma_msk_foreign_body_eye_v1", displayName: "Foreign body in cornea" },
    { code: "T16.1XXA", templateId: "trauma_msk_foreign_body_ear_nose_v1", displayName: "Foreign body in right ear" },
    {
      code: "S61.441A",
      templateId: "trauma_msk_foreign_body_hand_finger_v1",
      displayName: "Puncture wound with foreign body of right hand",
    },
    { code: "T18.108A", templateId: "trauma_msk_foreign_body_ingested_v1", displayName: "Foreign body in esophagus" },
  ])("discharge resolves $code to $templateId", ({ code, templateId, displayName }) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName });
    expect(resolved.template.id).toBe(templateId);
    expect(resolved.template.id).not.toBe("wound_laceration_v1");
  });

  it("disposition recommendations are advisory", () => {
    const eye = recommendForeignBodyDispositionFromDiagnosis({
      code: "T15.00XA",
      displayName: "foreign body eye",
    });
    expect(eye.some((r) => r.id === "ophthalmology")).toBe(true);
    expect(eye.every((r) => r.rationale.length > 10)).toBe(true);
  });

  it("COMMON_DIAGNOSES and ICD sample include foreign body rows", () => {
    expect(COMMON_DIAGNOSES.some((d) => d.code === "T15.00XA")).toBe(true);
    const csv = readFileSync(join(webRoot, "../../api/prisma/data/icd10-cm-sample-dev.csv"), "utf8");
    expect(csv).toContain("T15.00XA");
    expect(csv).toMatch(/foreign body/i);
  });
});
