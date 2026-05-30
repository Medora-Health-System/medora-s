import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  NURSING_ADMISSION_ASSESSMENT_CARD_ID,
  summarizeNursingAdmissionCarePlanPayload,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation nursing admission care plan (EDOC.19)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationNursingAdmissionCarePlanForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.19 nursing form", () => {
    expect(hub).toContain("isEdoc19NursingAdmissionCarePlanDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationNursingAdmissionCarePlanForm");
  });

  it("form exposes admission, shift, care plan, handoff with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-nursing-form");
    expect(form).toContain("NURSING_ADMISSION_SOURCE_OPTIONS");
    expect(form).toContain("NURSING_SHIFT_OPTIONS");
    expect(form).toContain("NURSING_INTERVENTION_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateNursingAdmissionCarePlanDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("bilingual nursing form keys mirrored", () => {
    expect(en).toContain("nursingAdmissionCarePlan:");
    expect(fr).toContain("nursingAdmissionCarePlan:");
    expect(en).toContain("primaryNursingProblem:");
    expect(fr).toContain("primaryNursingProblem:");
    expect(en).toContain("handoffType:");
    expect(fr).toContain("handoffType:");
  });

  it("EN and FR summaries render", () => {
    const payload = {
      assessmentTime: "2026-05-28T14:00:00.000Z",
      admissionSource: "ED",
      admissionReason: "Observation admission",
      baselineMentalStatus: "ALERT_ORIENTED",
      baselineMobility: "INDEPENDENT",
      fallRiskReviewed: "YES",
      skinAssessmentCompleted: "YES",
      painAssessmentCompleted: "YES",
      belongingsReviewed: "YES",
      homeMedicationsReviewed: "YES",
      allergiesReviewed: "YES",
      advanceDirectivesReviewed: "UNKNOWN",
      infectionScreeningCompleted: "YES",
      educationNeedsIdentified: "NO",
      interpreterNeeded: "NO",
      providerNotified: "NO",
    };
    const enSummary = summarizeNursingAdmissionCarePlanPayload(
      NURSING_ADMISSION_ASSESSMENT_CARD_ID,
      payload,
      "en"
    );
    const frSummary = summarizeNursingAdmissionCarePlanPayload(
      NURSING_ADMISSION_ASSESSMENT_CARD_ID,
      payload,
      "fr"
    );
    expect(enSummary.some((l) => l.key === "Source")).toBe(true);
    expect(frSummary.some((l) => l.key === "Provenance")).toBe(true);
  });
});
