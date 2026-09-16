import {
  digitalCareLooksLikeUuid,
  digitalCareParseResultRows,
  digitalCareParseSearchDate,
  digitalCarePatientDisplayName,
  digitalCareVisitType,
} from "./digital-care-staff-workspace.util";

describe("Digital Care staff workspace util", () => {
  it("formats identity without falling back to empty names", () => {
    expect(digitalCarePatientDisplayName({ firstName: "Marie", lastName: "Toussaint" })).toBe("Marie Toussaint");
    expect(digitalCarePatientDisplayName({})).toBe("Patient");
  });

  it("classifies observation from billing classification", () => {
    expect(digitalCareVisitType("INPATIENT", "OBSERVATION")).toBe("OBSERVATION");
    expect(digitalCareVisitType("EMERGENCY")).toBe("ED");
  });

  it("rejects UUID search needles", () => {
    expect(digitalCareLooksLikeUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(digitalCareLooksLikeUuid("1002456")).toBe(false);
  });

  it("parses DOB search dates", () => {
    expect(digitalCareParseSearchDate("1985-03-12")?.toISOString().slice(0, 10)).toBe("1985-03-12");
  });

  it("parses lab rows from structured result data", () => {
    const rows = digitalCareParseResultRows(
      {
        schemaVersion: "medora.clinicalResult.v1",
        resultType: "LAB",
        observations: [{ name: "Glucose", value: "96", unit: "mg/dL", referenceText: "70-99", flag: "NORMAL" }],
      },
      null,
    );
    expect(rows[0]).toEqual(
      expect.objectContaining({ test: "Glucose", result: "96", unit: "mg/dL", flag: "NORMAL" }),
    );
  });
});
