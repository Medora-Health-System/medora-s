import { describe, expect, it } from "vitest";
import {
  D5A4A_CERTIFICATION_ID,
  D5A4A_CHIEF_CONCERN_CODES,
  D5A4A_DENTAL_CLINICAL_EVALUATION_KEY,
  D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS,
  buildDentalClinicalEvaluationSavePayload,
  dentalEvaluationContainsForbiddenMedicalMarkers,
  emptyDentalClinicalEvaluationV1,
  hasDentalClinicalEvaluationContent,
  parseDentalClinicalEvaluationV1,
  readDentalClinicalEvaluationFromNursingAssessment,
} from "./enterpriseDentalClinicalEvaluationD5a4a.js";

describe("MEDUI.D5A.4A dental clinical evaluation", () => {
  it("exports certification id and dental chief concern vocabulary", () => {
    expect(D5A4A_CERTIFICATION_ID).toBe("MEDUI.D5A.4A");
    expect(D5A4A_CHIEF_CONCERN_CODES).toContain("TOOTH_PAIN");
    expect(D5A4A_CHIEF_CONCERN_CODES).not.toContain("CHEST_PAIN");
  });

  it("forbids generic medical complaint markers in dental vocabulary list", () => {
    const joined = D5A4A_CHIEF_CONCERN_CODES.join(" ").toLowerCase();
    for (const marker of ["chest", "abdominal", "headache", "flank", "limb", "back_pain"]) {
      expect(joined).not.toContain(marker);
    }
    expect(D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS.length).toBeGreaterThan(5);
  });

  it("round-trips structured evaluation through nursingAssessment", () => {
    const empty = emptyDentalClinicalEvaluationV1();
    empty.chiefConcerns = ["TOOTH_PAIN", "SWELLING"];
    empty.hpi.coldSensitivity = "YES";
    empty.hpi.narrative = "Pain to cold on #16";
    empty.extraoral.tmj = "Non-tender";
    empty.intraoral.gingiva = "Localized erythema";
    empty.diagnostics.percussion = "Positive #16";
    empty.assessment = "Irreversible pulpitis #16";
    empty.clinicalDecision.findingsReviewed = true;
    empty.clinicalDecision.diagnosticImpression = "Likely pulpitis";

    const payload = buildDentalClinicalEvaluationSavePayload({
      previousNursingAssessment: {
        dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
      },
      evaluation: empty,
      metadata: { savedAt: "2026-08-15T12:00:00.000Z", savedBy: "Dr Test" },
      chiefComplaintLabelFor: (c) => c,
    });

    expect(payload.nursingAssessment.dentalServiceLineV1).toEqual({
      careSetting: "DENTAL",
      serviceLine: "DENTAL",
    });
    expect(payload.nursingAssessment[D5A4A_DENTAL_CLINICAL_EVALUATION_KEY]).toBeTruthy();
    expect(payload.chiefComplaint).toContain("TOOTH_PAIN");
    expect(payload.providerNote).toContain("pulpitis");
    expect((payload.nursingAssessment.physicianEvalV1 as { hpi?: string }).hpi).toContain("cold");

    const reloaded = readDentalClinicalEvaluationFromNursingAssessment(payload.nursingAssessment);
    expect(reloaded.chiefConcerns).toEqual(["TOOTH_PAIN", "SWELLING"]);
    expect(reloaded.hpi.coldSensitivity).toBe("YES");
    expect(reloaded.extraoral.tmj).toBe("Non-tender");
    expect(reloaded.assessment).toContain("pulpitis");
    expect(reloaded.metadata?.savedBy).toBe("Dr Test");
  });

  it("detects content for signability", () => {
    expect(hasDentalClinicalEvaluationContent(emptyDentalClinicalEvaluationV1())).toBe(false);
    const e = emptyDentalClinicalEvaluationV1();
    e.clinicalDecision.clinicalReasoning = "Discussed RCT vs extraction";
    expect(hasDentalClinicalEvaluationContent(e)).toBe(true);
  });

  it("parses unknown junk safely", () => {
    expect(parseDentalClinicalEvaluationV1(null).schemaVersion).toBe(1);
    expect(parseDentalClinicalEvaluationV1({ chiefConcerns: ["CHEST_PAIN"] }).chiefConcerns).toEqual(
      []
    );
  });

  it("flags forbidden medical marker strings", () => {
    expect(dentalEvaluationContainsForbiddenMedicalMarkers("chest pain template")).toBe(true);
    expect(dentalEvaluationContainsForbiddenMedicalMarkers("tooth pain cold")).toBe(false);
  });
});
