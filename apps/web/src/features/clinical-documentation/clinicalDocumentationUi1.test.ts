import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation structured dropdown inputs (EDOC.UI.1)", () => {
  const strokeForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationStrokeForm.tsx"),
    "utf8"
  );
  const observationForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationObservationForm.tsx"),
    "utf8"
  );
  const ioForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationIntakeOutputForm.tsx"),
    "utf8"
  );
  const controls = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationFieldControls.tsx"),
    "utf8"
  );

  it("NIHSS form uses score select dropdowns, not plain number inputs for scored fields", () => {
    expect(strokeForm).toContain("ClinicalDocumentationScoreSelectField");
    expect(strokeForm).toContain("NIHSS_FIELD_OPTIONS");
    expect(strokeForm).toContain("NIHSS_SCORED_FIELD_KEYS");
    expect(strokeForm).not.toMatch(/type="number"[\s\S]*nihss\.levelOfConsciousness/);
    expect(strokeForm).not.toContain("NumberField");
  });

  it("NIHSS options and severity band display wired", () => {
    expect(strokeForm).toContain("deriveNihssSeverityBand");
    expect(strokeForm).toContain("clinical-documentation-nihss-severity-band");
    expect(strokeForm).toContain("clinical-documentation-nihss-total");
    expect(strokeForm).toContain("calculateNihssTotal");
  });

  it("persisted payload builds numeric NIHSS values only", () => {
    expect(strokeForm).toContain("levelOfConsciousness: nihss.levelOfConsciousness");
    expect(strokeForm).toContain("totalScore: nihss.unableToAssessReason.trim() ? nihssTotal : nihssTotal");
    expect(strokeForm).toContain("validateStrokePayloadForCard");
  });

  it("Cincinnati/VAN/ABCD2 use dropdown and derived results", () => {
    expect(strokeForm).toContain("CINCINNATI_ELEMENT_OPTIONS");
    expect(strokeForm).toContain("ABCD2_CLINICAL_FEATURE_OPTIONS");
    expect(strokeForm).toContain("ClinicalDocumentationBooleanField");
    expect(strokeForm).toContain("clinical-documentation-cincinnati-result");
    expect(strokeForm).toContain("clinical-documentation-van-result");
    expect(strokeForm).toContain("clinical-documentation-abcd2-total");
  });

  it("neuro checks use structured dropdowns", () => {
    expect(strokeForm).toContain("NEURO_FIELD_OPTIONS");
    expect(strokeForm).toContain("clinical-documentation-neuro-${key}");
  });

  it("observation enum fields use select dropdowns", () => {
    expect(observationForm).toContain("<select");
    expect(observationForm).toContain("OBS_PO_CHALLENGE_CARD_ID");
    expect(observationForm).toContain("tolerated");
  });

  it("I&O enum fields use select dropdowns", () => {
    expect(ioForm).toContain("<select");
    expect(ioForm).toContain("IO_URINE_OUTPUT_CARD_ID");
    expect(ioForm).toContain("IO_PO_INTAKE_CARD_ID");
  });

  it("shared field controls are tablet-friendly selects", () => {
    expect(controls).toContain("ClinicalDocumentationSelectField");
    expect(controls).toContain("ClinicalDocumentationScoreSelectField");
    expect(controls).toContain("ClinicalDocumentationBooleanField");
    expect(controls).toContain("minHeight: 36");
  });

  it("tablet layout remains compact", () => {
    expect(strokeForm).toContain("gridTemplateColumns");
    expect(observationForm).toContain("gridTemplateColumns");
    expect(ioForm).toContain("gridTemplateColumns");
  });
});
