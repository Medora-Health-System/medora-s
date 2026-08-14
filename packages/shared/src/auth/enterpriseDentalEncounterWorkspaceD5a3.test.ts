import { describe, expect, it } from "vitest";
import {
  D5A3_CERTIFICATION_ID,
  assertNoDentalDuplicateEnginesInSource,
  buildDentalServiceLineTag,
  enterpriseDentalEncounterWorkspacePath,
  isDentalEncounterProjection,
  isD5a3DentalSectionActive,
  mergeDentalServiceLineIntoNursingAssessment,
  parseD5a3DentalWorkspaceSection,
  resolveDentalEncounterWorkspaceHref,
} from "./enterpriseDentalEncounterWorkspaceD5a3.js";

describe("MEDUI.D5A.3 enterprise dental encounter workspace", () => {
  it("exports certification id and path", () => {
    expect(D5A3_CERTIFICATION_ID).toBe("MEDUI.D5A.3");
    expect(enterpriseDentalEncounterWorkspacePath("e1")).toBe("/app/dental/encounters/e1");
    expect(enterpriseDentalEncounterWorkspacePath("e1", "imaging")).toBe(
      "/app/dental/encounters/e1?section=imaging"
    );
  });

  it("detects dental projection from nursingAssessment tag", () => {
    const nursing = mergeDentalServiceLineIntoNursingAssessment(null, buildDentalServiceLineTag());
    expect(isDentalEncounterProjection({ type: "OUTPATIENT", nursingAssessment: nursing })).toBe(
      true
    );
    expect(isDentalEncounterProjection({ type: "OUTPATIENT", nursingAssessment: {} })).toBe(false);
    expect(isDentalEncounterProjection({ type: "EMERGENCY" })).toBe(false);
  });

  it("CLOSED dental routes to enterprise encounter record", () => {
    expect(
      resolveDentalEncounterWorkspaceHref({
        id: "d1",
        status: "CLOSED",
        careSetting: "DENTAL",
      })
    ).toBe("/app/encounters/d1");
    expect(
      resolveDentalEncounterWorkspaceHref({
        id: "d1",
        status: "OPEN",
        careSetting: "DENTAL",
      })
    ).toBe("/app/dental/encounters/d1");
  });

  it("marks odontogram as placeholder and assessment as active", () => {
    expect(isD5a3DentalSectionActive("assessment")).toBe(true);
    expect(isD5a3DentalSectionActive("odontogram")).toBe(false);
    expect(parseD5a3DentalWorkspaceSection("bogus")).toBe("overview");
  });

  it("rejects forbidden Dental* engine names in source", () => {
    expect(assertNoDentalDuplicateEnginesInSource("Patient Encounter FollowUp")).toBe(true);
    expect(assertNoDentalDuplicateEnginesInSource("class DentalPatient {}")).toBe(false);
  });
});
