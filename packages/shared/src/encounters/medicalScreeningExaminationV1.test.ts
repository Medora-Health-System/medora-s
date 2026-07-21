import { describe, expect, it } from "vitest";
import {
  MseClinicalStatus,
  isMseCompleted,
  readMedicalScreeningExaminationV1,
} from "./medicalScreeningExaminationV1.js";

describe("medicalScreeningExaminationV1", () => {
  it("defaults to NOT_STARTED", () => {
    const mse = readMedicalScreeningExaminationV1(null);
    expect(mse.status).toBe(MseClinicalStatus.NOT_STARTED);
    expect(mse.emtalaComplianceClaim).toBe(false);
  });

  it("never infers COMPLETED from triage-only nursing assessment", () => {
    const mse = readMedicalScreeningExaminationV1({
      triageAcuity: 3,
      vitals: { hr: 80 },
      chiefComplaint: "Pain",
    });
    expect(mse.status).toBe(MseClinicalStatus.NOT_STARTED);
    expect(isMseCompleted({ triageAcuity: 3 })).toBe(false);
  });

  it("treats legacy erProviderMse content as IN_PROGRESS LEGACY not COMPLETED", () => {
    const mse = readMedicalScreeningExaminationV1({
      erProviderMseV1: { chiefConcern: "Chest pain", hpiNarrative: "Sudden onset" },
    });
    expect(mse.status).toBe(MseClinicalStatus.IN_PROGRESS);
    expect(mse.source).toBe("LEGACY");
    expect(isMseCompleted({ erProviderMseV1: { chiefConcern: "x" } })).toBe(false);
  });

  it("requires SIGNED + COMPLETED for isMseCompleted", () => {
    expect(
      isMseCompleted({
        medicalScreeningExaminationV1: {
          status: "COMPLETED",
          documentationStatus: "SIGNED",
          source: "CURRENT",
          emtalaComplianceClaim: false,
          revision: 1,
        },
      })
    ).toBe(true);
  });
});
