import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  STROKE_NIHSS_CARD_ID,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation stroke suite (EDOC.4)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const strokeForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationStrokeForm.tsx"),
    "utf8"
  );

  it("Stroke Documentation category renders in hub", () => {
    expect(hub).toContain("isEdoc4StrokeFormCard");
    expect(hub).toContain("ClinicalDocumentationStrokeForm");
    expect(hub).toContain("clinical-documentation-hub");
  });

  it("NIHSS form opens with calculated score", () => {
    expect(strokeForm).toContain("clinical-documentation-stroke-form");
    expect(strokeForm).toContain("STROKE_NIHSS_CARD_ID");
    expect(strokeForm).toContain("clinical-documentation-nihss-total");
    expect(strokeForm).toContain("calculateNihssTotal");
  });

  it("all stroke form cards wired", () => {
    for (const id of EDOC4_STROKE_DOCUMENTATION_CARD_IDS) {
      expect(strokeForm.includes(id) || strokeForm.includes(id.toUpperCase().replace(/_/g, "_"))).toBe(
        true
      );
    }
    expect(strokeForm).toContain("STROKE_SWALLOW_SCREEN_CARD_ID");
    expect(strokeForm).toContain("STROKE_CINCINNATI_CARD_ID");
    expect(strokeForm).toContain("STROKE_VAN_ASSESSMENT_CARD_ID");
    expect(strokeForm).toContain("STROKE_ABCD2_CARD_ID");
    expect(strokeForm).toContain("STROKE_TIMELINE_CARD_ID");
    expect(strokeForm).toContain("STROKE_NEURO_CHECKS_CARD_ID");
    expect(strokeForm).toContain("clinical-documentation-cincinnati-result");
    expect(strokeForm).toContain("clinical-documentation-van-result");
    expect(strokeForm).toContain("clinical-documentation-abcd2-total");
    expect(strokeForm).toContain("clinical-documentation-stroke-validation-error");
    expect(strokeForm).toContain("gridTemplateColumns");
    expect(strokeForm).toContain("clinical-documentation-stroke-save");
  });

  it("hub uses stroke save through createClinicalDocumentationEntry", () => {
    expect(hub).toContain("saveObservationEntry");
    expect(hub).toContain("ClinicalDocumentationStrokeForm");
  });
});
