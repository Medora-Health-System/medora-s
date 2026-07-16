/**
 * MEDUI.ED.POSTCERT.4 — Eye / Vision complaint-family discovery audit.
 * Phase 11 (MEDUI.CLINICAL.DIAGNOSTIC_INTELLIGENCE_PHASE_11_EYE_EMERGENCIES) introduced exactly
 * two dedicated adaptive Eye / Vision templates (`eye_complaint_adult_v1`, `eye_trauma_adult_v1`).
 * This audit now confirms exactly those two templates exist and nothing further has drifted in.
 */
import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationTemplateCatalog";
import { ENTERPRISE_GOVERNANCE_REGISTRY } from "./providerDocumentationEnterpriseGovernanceRegistry";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import enMessages from "@/i18n/messages/en";

const EYE_DISCOVERY_TERMS = [
  "eye",
  "vision",
  "visual",
  "ocular",
  "ophthalm",
  "foreign body",
  "corneal",
  "conjunctivit",
  "red eye",
  "eye pain",
  "vision loss",
  "blurred vision",
  "double vision",
  "photophobia",
  "flashers",
  "floaters",
  "retinal",
  "contact lens",
] as const;

/** Terms that indicate a dedicated eye chief-complaint template (not cross-family ROS chips). */
const DEDICATED_EYE_TEMPLATE_TERMS = [
  "eye complaint",
  "eye trauma",
  "red eye",
  "eye pain",
  "conjunctivit",
  "corneal",
  "ocular",
  "ophthalm",
  "vision complaint",
  "eye injury",
  "foreign body eye",
  "contact lens",
] as const;

const EXPECTED_DEDICATED_EYE_TEMPLATE_IDS = ["eye_complaint_adult_v1", "eye_trauma_adult_v1"] as const;

function resolveLabel(labelKey: string): string {
  const parts = labelKey.split(".");
  let current: unknown = enMessages;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return labelKey;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : labelKey;
}

function matchesAnyTerm(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

describe("providerDocumentationEyeFamilyDiscovery — MEDUI.ED.POSTCERT.4", () => {
  const allTemplateIds = PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => template.id);
  const allAuditTemplateIds = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
    family.templates.map((template) => template.templateId)
  );

  it("finds exactly the two Phase 11 dedicated Eye / Vision complaint templates in the catalog", () => {
    /** Trauma Injury Intelligence adaptive FB (Phase 4) — not an Eye/Vision chief-complaint family. */
    const TRAUMA_FOREIGN_BODY_TEMPLATE_ID = "foreign_body_adult_complaint_v1";
    const dedicatedMatches = PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => {
      if (template.id === TRAUMA_FOREIGN_BODY_TEMPLATE_ID) return false;
      const label = resolveLabel(template.labelKey);
      const helper = resolveLabel(template.helperKey);
      const haystack = `${template.id} ${label} ${helper}`;
      return matchesAnyTerm(haystack, DEDICATED_EYE_TEMPLATE_TERMS);
    });

    expect(dedicatedMatches.map((template) => template.id).sort()).toEqual(
      [...EXPECTED_DEDICATED_EYE_TEMPLATE_IDS].sort()
    );
  });

  it("registers no separate Eye governance family in the enterprise registry (adaptive templates only)", () => {
    const eyeFamilies = ENTERPRISE_GOVERNANCE_REGISTRY.filter((entry) =>
      matchesAnyTerm(`${entry.familyId} ${entry.displayName} ${entry.governanceModule}`, [
        "eye",
        "ocular",
        "ophthalm",
        "vision",
      ])
    );
    expect(eyeFamilies).toEqual([]);
  });

  it("registers no separate Eye templates in Human Documentation audit families (adaptive templates only)", () => {
    const eyeAudited = allAuditTemplateIds.filter((templateId) =>
      matchesAnyTerm(templateId, DEDICATED_EYE_TEMPLATE_TERMS)
    );
    expect(eyeAudited).toEqual([]);
  });

  it("documents adjacent vision-related chips embedded in non-eye families", () => {
    const embeddedVisionTemplates = PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => {
      if (!template.complaintIntelligence) return false;
      if ((EXPECTED_DEDICATED_EYE_TEMPLATE_IDS as readonly string[]).includes(template.id)) return false;
      const keys = flattenComplaintIntelligenceKeys(template.complaintIntelligence);
      return keys.some((key) => matchesAnyTerm(key, ["vision", "photophobia", "extraocular", "eye"]));
    }).map((template) => template.id);

    expect(embeddedVisionTemplates.length).toBeGreaterThan(0);
    expect(embeddedVisionTemplates).toContain("stroke_symptoms");
    expect(embeddedVisionTemplates).toContain("headache");
    expect(embeddedVisionTemplates).toContain("dizziness_syncope");
    for (const templateId of embeddedVisionTemplates) {
      expect(templateId).not.toMatch(/eye|ocular|conjunctivit|corneal/);
    }
  });

  it("confirms exactly the Phase 11 eye-specific complaint-intel namespaces exist", () => {
    const allIntelKeys = PROVIDER_DOCUMENTATION_TEMPLATES.flatMap((template) =>
      template.complaintIntelligence ? flattenComplaintIntelligenceKeys(template.complaintIntelligence) : []
    );
    const eyeNamespaceKeys = allIntelKeys.filter((key) =>
      /providerDocumentationComplaintIntel\.(eye|ocular|ophthalm|vision|redEye|conjunctiv)/i.test(key)
    );
    expect(eyeNamespaceKeys.length).toBeGreaterThan(0);
    const namespaces = new Set(eyeNamespaceKeys.map((key) => key.split(".")[1]));
    expect([...namespaces].sort()).toEqual(["eyeComplaintAdultV1", "eyeTraumaAdultV1"]);
  });

  it("classifies catalog coverage: exactly the two Phase 11 eye template IDs in ProviderDocumentationTemplateId union", () => {
    const eyeLikeIds = allTemplateIds.filter((id) =>
      matchesAnyTerm(id, ["eye", "ocular", "ophthalm", "conjunctiv", "corneal", "vision_complaint", "red_eye"])
    );
    expect(eyeLikeIds.sort()).toEqual([...EXPECTED_DEDICATED_EYE_TEMPLATE_IDS].sort());
  });

  it("documents discovery term scan baseline for future drift detection", () => {
    const scanHits = PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => {
      const label = resolveLabel(template.labelKey);
      return matchesAnyTerm(`${template.id} ${label}`, [...EYE_DISCOVERY_TERMS]);
    });
    // Injury Intelligence Phase 4 adaptive trauma template plus the two Phase 11 eye templates.
    expect(scanHits.map((template) => template.id).sort()).toEqual(
      ["foreign_body_adult_complaint_v1", ...EXPECTED_DEDICATED_EYE_TEMPLATE_IDS].sort()
    );
  });
});
