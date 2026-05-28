import { describe, expect, it } from "vitest";
import {
  deriveDocumentationCompletenessFlags,
  PROVIDER_DOCUMENTATION_NAMESPACE_KEY,
} from "./documentationCompletenessFlags.js";

describe("documentationCompletenessFlags (19UCED.7)", () => {
  it("detects MDM presence without exposing text", () => {
    const flags = deriveDocumentationCompletenessFlags({
      nursingAssessment: {
        [PROVIDER_DOCUMENTATION_NAMESPACE_KEY]: {
          mdmRiskLevel: "Moderate",
          mdmWorkingAssessment: "Working assessment documented.",
        },
      },
      hasPrimaryDiagnosis: true,
      hasProviderAttribution: true,
    });
    expect(flags.hasMDM).toBe(true);
    expect(JSON.stringify(flags)).not.toContain("Working assessment");
  });

  it("detects disposition from discharge status", () => {
    const flags = deriveDocumentationCompletenessFlags({
      dischargeStatus: "DISCHARGED_HOME",
      hasPrimaryDiagnosis: true,
      hasProviderAttribution: true,
    });
    expect(flags.hasDispositionDocumentation).toBe(true);
  });

  it("detects reassessment from nursing reassessment namespace", () => {
    const flags = deriveDocumentationCompletenessFlags({
      nursingAssessment: { erNursingReassessmentV1: { vitalsSnapshot: { hr: "80" } } },
      hasPrimaryDiagnosis: true,
      hasProviderAttribution: true,
    });
    expect(flags.hasReassessment).toBe(true);
  });
});
