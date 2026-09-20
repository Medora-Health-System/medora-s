import { describe, expect, it } from "vitest";
import {
  clinicCareLongitudinalAllergySummary,
  projectClinicCareAllergyIntoTriageSnapshot,
} from "./clinicCareLongitudinalAllergyProjection";

describe("clinic longitudinal allergy projection", () => {
  it("uses active patient allergy entries as the chart summary", () => {
    expect(
      clinicCareLongitudinalAllergySummary({
        version: 1,
        allergies: {
          nkda: false,
          entries: [
            { id: "a1", substance: "Codeine", status: "ACTIVE" },
            { id: "a2", substance: "Penicillin", status: "INACTIVE" },
          ],
        },
        provenance: {},
      })
    ).toBe("Codeine");
  });

  it("preserves explicit NKDA when the patient record has no active allergy", () => {
    expect(
      clinicCareLongitudinalAllergySummary({
        version: 1,
        allergies: { nkda: true, entries: [] },
        provenance: {},
      })
    ).toBe("NKDA");
  });

  it("replaces stale triage NKDA for Summary and MAR without mutating vitals", () => {
    const original = {
      chiefComplaint: "Palpitations",
      vitalsJson: { hr: 115, allergyNote: "NKDA" },
    };
    const projected = projectClinicCareAllergyIntoTriageSnapshot(original, "Codeine");

    expect(projected).toEqual({
      chiefComplaint: "Palpitations",
      vitalsJson: { hr: 115, allergyNote: "Codeine" },
    });
    expect(original.vitalsJson.allergyNote).toBe("NKDA");
  });

  it("creates the adapter shape when an encounter has no triage snapshot", () => {
    expect(projectClinicCareAllergyIntoTriageSnapshot(null, "Latex")).toEqual({
      vitalsJson: { allergyNote: "Latex" },
    });
  });
});
