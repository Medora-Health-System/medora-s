/**
 * MEDUI — Permanent Human Documentation Governance gate (Medical Exam chief complaint remediation).
 * Gold Standard = Track C + Human Documentation Audit.
 */
import { describe, expect, it } from "vitest";
import {
  HUMAN_DOC_FORBIDDEN_RENDERED_PHRASES,
  HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS,
  HUMAN_DOC_ALLOWED_DATA_REVIEWED_PATTERNS,
  HUMAN_DOC_ROBOTIC_VALUE_PATTERNS,
  HUMAN_DOCUMENTATION_AUDIT_FAMILIES,
  assertHumanDocumentationAuditPasses,
  assertHumanDocumentationSampleNoteComplete,
  auditHumanDocumentationForFamilyTemplate,
  auditHumanDocumentationValues,
  buildHumanDocumentationSamplesForFamilyTemplate,
} from "./providerDocumentationHumanDocumentationAudit";

describe("providerDocumentationHumanDocumentationAudit — MEDUI.ED.ME.HUMAN-DOC-GOVERNANCE", () => {
  it("registers at least one human documentation audit family", () => {
    expect(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.length).toBeGreaterThan(0);
  });

  it.each(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
    family.templates.map((template) => [family.phase, template.templateId] as const)
  ))("%s passes human documentation audit for %s (EN rendered values)", (phase, templateId) => {
    const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === phase);
    expect(family).toBeTruthy();
    const violations = auditHumanDocumentationForFamilyTemplate(family!, templateId);
    expect(() => assertHumanDocumentationAuditPasses(templateId, violations)).not.toThrow();
    expect(violations).toEqual([]);
  });

  it.each(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
    family.templates.map((template) => [family.phase, template.templateId, family.requiredSamplesPerTemplate] as const)
  ))(
    "%s generates %i rendered note samples for %s",
    (phase, templateId, requiredSamplesPerTemplate) => {
      const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === phase);
      expect(family).toBeTruthy();
      const samples = buildHumanDocumentationSamplesForFamilyTemplate(family!, templateId, requiredSamplesPerTemplate);
      expect(samples).toHaveLength(requiredSamplesPerTemplate);
      for (const sample of samples) {
        expect(sample.length).toBeGreaterThan(40);
        expect(() => assertHumanDocumentationSampleNoteComplete(sample)).not.toThrow();
        for (const section of HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS) {
          expect(sample).toContain(section);
        }
      }
    }
  );

  it("exposes enterprise forbidden phrase coverage", () => {
    expect(HUMAN_DOC_FORBIDDEN_RENDERED_PHRASES).toEqual(
      expect.arrayContaining([
        "historian used",
        "assessment completed",
        "exam completed",
        "if indicated",
        "follow-up recommended",
        "return advised",
      ])
    );
  });

  it("allows diagnostic review phrasing only in mdmDataReviewed values", () => {
    expect(HUMAN_DOC_ALLOWED_DATA_REVIEWED_PATTERNS.some((pattern) => pattern.test("CBC reviewed"))).toBe(true);
    expect(
      auditHumanDocumentationValues({
        phase: "unit-test",
        templateId: "test",
        bundle: { hpi: ["providerDocumentationComplaintIntel.test.hpiFeverReviewed"] },
        messages: { hpiFeverReviewed: "fever reviewed" },
      })
    ).not.toEqual([]);
  });

  it("exports robotic pattern helpers for future families", () => {
    expect(HUMAN_DOC_ROBOTIC_VALUE_PATTERNS.length).toBeGreaterThan(0);
  });
});
