import { describe, expect, it } from "vitest";
import {
  INPATIENT_NURSING_ASSESSMENT_V1_KEY,
  adaptInpatientNursingAssessmentToClinicalRecord,
  inpatientNursingAssessmentSaveSchema,
  patientHistorySectionSchema,
  projectInpatientNursingAssessmentOverview,
} from "./inpatientNursingAssessmentV1.js";

describe("INP.1A inpatient nursing assessment authority", () => {
  it("validates supported clinical domains and rejects forged authority fields", () => {
    expect(inpatientNursingAssessmentSaveSchema.safeParse({
      status: "SAVED", mentalStatus: { code: "ALERT" }, orientation: ["PERSON", "PLACE"],
      pain: { score: 4 }, respiratory: { code: "NORMAL" }, fallRisk: { level: "HIGH", score: 8 },
      skinWounds: { code: "WOUND", note: "dressing intact" }, mobility: { code: "ASSIST_ONE" },
      linesDrainsDevices: [{ code: "FOLEY" }], narrative: "Assessment completed.",
    }).success).toBe(true);
    expect(inpatientNursingAssessmentSaveSchema.safeParse({ status: "SAVED", authorUserId: "forged" }).success).toBe(false);
    expect(inpatientNursingAssessmentSaveSchema.safeParse({ status: "SAVED", authoredAt: "2020-01-01" }).success).toBe(false);
  });

  it("provides one typed Overview/Summary/chart/print clinical-record projection", () => {
    const assessment = {
      status: "SAVED" as const, version: 1 as const, sessionId: "s1", authoredAt: "2026-01-02T00:00:00.000Z",
      authorUserId: "rn1", authorDisplayName: "Nurse One", authorRole: "RN" as const,
      pain: { score: 2 }, fallRisk: { level: "LOW" as const }, mentalStatus: { code: "ALERT" },
      respiratory: { code: "NORMAL" }, skinWounds: { code: "INTACT" }, mobility: { code: "INDEPENDENT" },
    };
    expect(projectInpatientNursingAssessmentOverview(assessment)).toMatchObject({ painScore: 2, mentalStatus: "ALERT", respiratoryConcern: false });
    expect(adaptInpatientNursingAssessmentToClinicalRecord({ encounterId: "e", patientId: "p", facilityId: "f", assessment })).toMatchObject({
      schemaId: INPATIENT_NURSING_ASSESSMENT_V1_KEY,
      occurredAt: assessment.authoredAt,
      serverAuthoredAt: assessment.authoredAt,
    });
  });

  it("INP.1B.6 keeps clinical documented time distinct from server authoredAt", () => {
    const clinicalDocumentedAt = "2026-01-01T07:00:00.000Z";
    const authoredAt = "2026-01-01T09:30:00.000Z";
    expect(inpatientNursingAssessmentSaveSchema.safeParse({
      status: "SAVED",
      clinicalDocumentedAt,
      mentalStatus: { code: "ALERT" },
    }).success).toBe(true);
    const assessment = {
      status: "SAVED" as const,
      version: 1 as const,
      sessionId: "s2",
      authoredAt,
      clinicalDocumentedAt,
      authorUserId: "rn1",
      authorDisplayName: "Nurse One",
      authorRole: "RN" as const,
      pain: { score: 1 },
    };
    const overview = projectInpatientNursingAssessmentOverview(assessment);
    expect(overview.lastAssessmentAt).toBe(clinicalDocumentedAt);
    expect(overview.serverAuthoredAt).toBe(authoredAt);
    expect(
      adaptInpatientNursingAssessmentToClinicalRecord({
        encounterId: "e",
        patientId: "p",
        facilityId: "f",
        assessment,
      }).occurredAt,
    ).toBe(clinicalDocumentedAt);
  });

  it.each(["medicalHistory", "surgicalHistory", "homeMedications", "tobacco", "alcohol", "substances", "socialHistory"])("allows only typed %s updates", (section) => {
    const values: Record<string, unknown> = {
      medicalHistory: { pastMedicalHistory: "HTN" }, surgicalHistory: { pastSurgicalHistory: "Appendectomy" },
      homeMedications: { medicationsSummary: "Metformin" }, tobacco: { smokingStatus: "Former" },
      alcohol: { alcoholUse: "None" }, substances: { marijuanaUse: "None" },
      socialHistory: { historySocialComments: "Lives with family" },
    };
    expect(patientHistorySectionSchema.safeParse({ section, value: values[section] }).success).toBe(true);
  });

  it("has no unrestricted JSON patch shape", () => {
    expect(patientHistorySectionSchema.safeParse({ section: "arbitrary", value: { secret: true } }).success).toBe(false);
    expect(patientHistorySectionSchema.safeParse({ op: "replace", path: "/allergies", value: {} }).success).toBe(false);
  });
});
