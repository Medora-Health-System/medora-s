import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BRADEN_RISK_ASSESSMENT_CARD_ID,
  calculateBradenScore,
  deriveBradenRiskLevel,
  PRESSURE_INJURY_ASSESSMENT_CARD_ID,
  SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
  summarizeSkinWoundPressureInjuryPayload,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation skin wound (EDOC.20)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationSkinWoundForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.20 skin wound form", () => {
    expect(hub).toContain("isEdoc20SkinWoundPressureInjuryDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationSkinWoundForm");
  });

  it("form exposes all cards with dropdowns, Braden score, and compact layout", () => {
    expect(form).toContain("clinical-documentation-skin-wound-form");
    expect(form).toContain("SKIN_WOUND_SKIN_STATUS_OPTIONS");
    expect(form).toContain("SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS");
    expect(form).toContain("SKIN_WOUND_BRADEN_1_4_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateSkinWoundPressureInjuryDocumentationPayloadForCard");
    expect(form).toContain("calculateBradenScore");
    expect(form).toContain("deriveBradenRiskLevel");
    expect(form).toContain("braden-calculated");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
    expect(form).toContain("wound-photo-reference-id");
  });

  it("Braden scoring helpers match form display support", () => {
    const score = calculateBradenScore({
      sensoryPerception: 4,
      moisture: 4,
      activity: 4,
      mobility: 4,
      nutrition: 4,
      frictionShear: 3,
    });
    expect(score).toBe(23);
    expect(deriveBradenRiskLevel(score)).toBe("MINIMAL");
  });

  it("bilingual skin wound form keys mirrored", () => {
    expect(en).toContain("skinWound:");
    expect(fr).toContain("skinWound:");
    expect(en).toContain("bradenTotalScore:");
    expect(fr).toContain("bradenTotalScore:");
    expect(en).toContain("photoReferenceId:");
    expect(fr).toContain("photoReferenceId:");
  });

  it("EN and FR summaries render", () => {
    const enSummary = summarizeSkinWoundPressureInjuryPayload(
      SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: "2026-05-28T14:00:00.000Z",
        skinStatus: "INTACT",
        pressureInjuryPresent: "NO",
        woundPresent: "NO",
        skinTearPresent: "NO",
        masdPresent: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(enSummary.some((l) => l.key === "Skin status")).toBe(true);

    const frSummary = summarizeSkinWoundPressureInjuryPayload(
      BRADEN_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: "2026-05-28T14:00:00.000Z",
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
        totalScore: 23,
        riskLevel: "MINIMAL",
        preventionPlanReviewed: "YES",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(frSummary.some((l) => l.key === "Niveau de risque")).toBe(true);

    const piSummary = summarizeSkinWoundPressureInjuryPayload(
      PRESSURE_INJURY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: "2026-05-28T14:00:00.000Z",
        location: "SACRUM",
        stage: "STAGE_2",
        drainagePresent: "NO",
        infectionConcern: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(piSummary.some((l) => l.key === "Stage")).toBe(true);
  });
});
