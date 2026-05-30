import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation stroke neuro reassessment (EDOC.11)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationStrokeNeuroReassessmentForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.11 stroke neuro form", () => {
    expect(hub).toContain("isEdoc11StrokeNeuroReassessmentFormCard");
    expect(hub).toContain("ClinicalDocumentationStrokeNeuroReassessmentForm");
  });

  it("form exposes NIHSS reassessment, GCS scoring, and repeatable cards", () => {
    expect(form).toContain("clinical-documentation-stroke-neuro-form");
    expect(form).toContain("stroke-neuro-nihss-reassessment-time");
    expect(form).toContain("ClinicalDocumentationScoreSelectField");
    expect(form).toContain("stroke-neuro-gcs-total");
    expect(form).toContain("stroke-neuro-checks-time");
    expect(form).toContain("stroke-neuro-pupils-time");
    expect(form).toContain("stroke-neuro-motor-time");
    expect(form).toContain("stroke-neuro-escalation-time");
    expect(form).toContain("stroke-neuro-thrombolytic-time");
    expect(form).toContain("validateStrokeNeuroReassessmentPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("bilingual strokeNeuro form keys mirrored", () => {
    expect(en).toContain("strokeNeuro:");
    expect(fr).toContain("strokeNeuro:");
    expect(en).toContain("gcsSeverity:");
    expect(fr).toContain("gcsSeverity:");
    expect(en).toContain("bleedingObserved:");
    expect(fr).toContain("bleedingObserved:");
  });
});
