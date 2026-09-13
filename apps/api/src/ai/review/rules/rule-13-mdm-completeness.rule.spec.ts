import type { EncounterAiSnapshot } from "@medora/shared";
import { rule13MdmCompleteness } from "./rule-13-mdm-completeness.rule.js";

const ctx = {
  generatedAt: "2026-09-13T13:30:00.000Z",
  snapshotVersion: "snapshot-1",
};

function snapshot(providerDoc: Record<string, unknown>): EncounterAiSnapshot {
  return {
    snapshotVersion: "snapshot-1",
    generatedAt: "2026-09-13T13:30:00.000Z",
    encounterContext: {
      encounterId: "550e8400-e29b-41d4-a716-446655440001",
      facilityId: "550e8400-e29b-41d4-a716-446655440002",
      patientId: "550e8400-e29b-41d4-a716-446655440003",
      country: "US",
      encounterType: "CLINIC",
      status: "OPEN",
      careSetting: "OFFICE_OUTPATIENT_CLINIC",
    },
    patientContext: {},
    presentation: {},
    clinicalDocumentation: {
      structuredEntries: [
        {
          id: "provider-doc",
          namespace: "erProviderMseV1",
          documentedAt: "2026-09-13T13:00:00.000Z",
          payloadSummary: providerDoc,
        },
      ],
    },
    diagnostics: {},
    treatments: {},
    diagnoses: {},
    disposition: {},
  };
}

describe("rule13MdmCompleteness", () => {
  it("flags provider documentation with no MDM content", () => {
    const findings = rule13MdmCompleteness(snapshot({ hpi: "Abdominal pain" }), ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("MDM_GAP");
    expect(findings[0].priority).toBe("MEDIUM");
    expect(findings[0].recommendedActions[0]).toMatchObject({
      actionType: "NAVIGATE",
      targetSection: "medical-evaluation",
    });
  });

  it("flags partial MDM and does not claim it is clinically wrong", () => {
    const findings = rule13MdmCompleteness(
      snapshot({ mdmWorkingAssessment: "Abdominal pain under evaluation" }),
      ctx
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].summary).toContain("data reviewed");
    expect(findings[0].reasoningSummary).toContain("does not determine");
  });

  it("does not flag when core MDM domains are documented", () => {
    const findings = rule13MdmCompleteness(
      snapshot({
        mdmWorkingAssessment: "Abdominal pain under evaluation",
        mdmDataReviewed: "Reviewed available labs",
        mdmClinicalRationale: "Risk and management reasoning documented",
        mdmPlanSummary: "Plan documented",
      }),
      ctx
    );
    expect(findings).toEqual([]);
  });

  it("ignores encounters without structured provider documentation", () => {
    const s = snapshot({});
    s.clinicalDocumentation.structuredEntries = [];
    expect(rule13MdmCompleteness(s, ctx)).toEqual([]);
  });
});
