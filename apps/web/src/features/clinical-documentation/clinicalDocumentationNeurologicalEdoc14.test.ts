import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation neurological (EDOC.14)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationNeurologicalForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.14 neurological form", () => {
    expect(hub).toContain("isEdoc14NeurologicalDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationNeurologicalForm");
  });

  it("form exposes GCS, NIHSS, seizure, escalation with compact layout", () => {
    expect(form).toContain("clinical-documentation-neurological-form");
    expect(form).toContain("neuro-initial-time");
    expect(form).toContain("neuro-reassessment-time");
    expect(form).toContain("neuro-gcs-time");
    expect(form).toContain("neuro-nihss-time");
    expect(form).toContain("neuro-seizure-start");
    expect(form).toContain("neuro-post-tpa-time");
    expect(form).toContain("neuro-escalation-time");
    expect(form).toContain("neuro-initial-left-pupil-size");
    expect(form).toContain("leftPupilSizeMm");
    expect(form).toContain("benzodiazepineAdministered");
    expect(form).toContain("monitoringInterval");
    expect(form).toContain("neuro-gcs-total");
    expect(form).toContain("neuro-nihss-total");
    expect(form).toContain("validateNeurologicalDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("form renders pupil, motor strength, monitoring interval, and shared validation", () => {
    expect(form).toContain("NEURO_PUPIL_SIZE_MM_OPTIONS");
    expect(form).toContain("MOTOR_STRENGTH_GRADE_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("leftPupilReaction");
    expect(form).toContain("rightPupilReaction");
    expect(form).toContain("newUnilateralWeakness");
    expect(form).toContain("priorSpeechStatus");
    expect(form).toContain("requiresNeurologicalReassessmentProviderNotification");
    expect(form).toContain("MONITORING_INTERVAL_OPTIONS");
    expect(form).toContain("validateNeurologicalDocumentationPayloadForCard");
    expect(form).toContain("validationError");
  });

  it("bilingual neurological form keys mirrored", () => {
    expect(en).toContain("neurological:");
    expect(fr).toContain("neurological:");
    expect(en).toContain("mentalStatus:");
    expect(fr).toContain("mentalStatus:");
    expect(en).toContain("nihssSeverity:");
    expect(fr).toContain("nihssSeverity:");
  });
});
