import { describe, expect, it } from "vitest";
import {
  flatAdmissionFieldsHaveContent,
  inferPlacementEncounterTypeFromCareLevel,
  mergeAdmissionSummaryFieldsPreservingNested,
} from "./admissionSummaryMerge.js";

describe("mergeAdmissionSummaryFieldsPreservingNested", () => {
  it("preserves nested admissionCorrelation while updating flat fields", () => {
    const prior = {
      admissionReason: "old",
      admissionCorrelation: {
        correlationId: "corr-1",
        status: "ACTIVE",
      },
      otherNested: { keep: true },
    };
    const merged = mergeAdmissionSummaryFieldsPreservingNested(prior, {
      admissionReason: "Chest pain admission",
      serviceUnit: "MS",
      admissionDiagnosis: "ACS",
      careLevel: "Medical/Surgical",
      conditionAtAdmission: "",
      initialPlan: "",
      responsiblePhysicianName: "Dr Test",
    });
    expect(merged.admissionReason).toBe("Chest pain admission");
    expect(merged.serviceUnit).toBe("MS");
    expect(merged.admissionCorrelation).toEqual({
      correlationId: "corr-1",
      status: "ACTIVE",
    });
    expect(merged.otherNested).toEqual({ keep: true });
  });

  it("stores admissionDiagnosesV1 and composes admissionDiagnosis display", () => {
    const merged = mergeAdmissionSummaryFieldsPreservingNested(
      { admissionCorrelation: { id: "c1" } },
      {
        admissionReason: "Admit",
        serviceUnit: "",
        admissionDiagnosis: "",
        careLevel: "Observation",
        conditionAtAdmission: "",
        initialPlan: "",
        responsiblePhysicianName: "",
      },
      {
        primaryDiagnosisId: "dx-1",
        secondaryDiagnosisIds: ["dx-2"],
        primaryDisplay: "J18.9 — Pneumonia",
        secondaryDisplays: ["I10 — HTN"],
        clarificationText: "hypoxic",
      }
    );
    expect(merged.admissionCorrelation).toEqual({ id: "c1" });
    expect(merged.admissionDiagnosesV1).toMatchObject({
      primaryDiagnosisId: "dx-1",
      secondaryDiagnosisIds: ["dx-2"],
    });
    expect(String(merged.admissionDiagnosis)).toContain("J18.9");
    expect(String(merged.admissionDiagnosis)).toContain("hypoxic");
  });

  it("preserves requestedEncounterType (not a FLAT_ADMISSION_KEY)", () => {
    const merged = mergeAdmissionSummaryFieldsPreservingNested(
      { requestedEncounterType: "OBSERVATION", admissionCorrelation: { id: "c1" } },
      {
        admissionReason: "Obs",
        serviceUnit: "",
        admissionDiagnosis: "",
        careLevel: "OBSERVATION",
        conditionAtAdmission: "",
        initialPlan: "",
        responsiblePhysicianName: "",
      }
    );
    expect(merged.requestedEncounterType).toBe("OBSERVATION");
    expect(merged.admissionCorrelation).toEqual({ id: "c1" });
  });

  it("infers OBSERVATION vs INPATIENT from care level", () => {
    expect(inferPlacementEncounterTypeFromCareLevel("Observation")).toBe("OBSERVATION");
    expect(inferPlacementEncounterTypeFromCareLevel("Medical/Surgical")).toBe("INPATIENT");
    expect(
      flatAdmissionFieldsHaveContent({
        admissionReason: "x",
        serviceUnit: "",
        admissionDiagnosis: "",
        careLevel: "",
        conditionAtAdmission: "",
        initialPlan: "",
        responsiblePhysicianName: "",
      })
    ).toBe(true);
  });
});
