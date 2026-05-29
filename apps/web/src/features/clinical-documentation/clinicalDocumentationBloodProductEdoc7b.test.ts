import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation blood product (EDOC.7B)", () => {
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationBloodProductForm.tsx"),
    "utf8"
  );
  const volumeSelect = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/BloodProductVolumeSelect.tsx"),
    "utf8"
  );
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );

  it("verification and initiation render preset volume select", () => {
    expect(form).toContain("BloodProductVolumeSelect");
    expect(form).toContain('testIdPrefix="blood-verification"');
    expect(form).toContain('testIdPrefix="blood-initiation"');
    expect(volumeSelect).toContain("volume-preset");
    expect(volumeSelect).toContain("volume-custom");
    expect(volumeSelect).toContain("OTHER");
  });

  it("pre-assessment save is isolated from completion fields", () => {
    const preAssessmentCaseMatch = form.match(
      /case BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID:[\s\S]*?payload = \{([\s\S]*?)\};\s*break;/
    );
    expect(preAssessmentCaseMatch).not.toBeNull();
    const preAssessmentCaseBody = preAssessmentCaseMatch![1]!;
    expect(preAssessmentCaseBody).toContain("baselineSpo2");
    expect(preAssessmentCaseBody).not.toContain("volumeInfusedMl");
    expect(preAssessmentCaseBody).not.toContain("...completion");
    expect(form).toContain("blood-pre-assessment-time");
  });

  it("completion includes completionTime, endTime, post vitals, and reactionObserved", () => {
    expect(form).toContain("completionTime: toIsoFromLocalDatetime(completion.completionTime)");
    expect(form).toContain("endTime: toIsoFromLocalDatetime(completion.endTime)");
    expect(form).toContain("postHeartRate");
    expect(form).toContain("reactionObserved");
    expect(form).toContain("blood-completion-completion-time");
    expect(form).toContain("blood-completion-end-time");
  });

  it("witness modal behavior unchanged (EDOC.7A)", () => {
    expect(hub).toContain("ClinicalDocumentationWitnessSearchModal");
    expect(hub).toContain("witnessClinicalDocumentationEntry");
  });
});
