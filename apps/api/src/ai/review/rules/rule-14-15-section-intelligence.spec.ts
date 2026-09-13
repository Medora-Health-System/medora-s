import { rule14EdMissingVitals } from "./rule-14-ed-missing-vitals.rule.js";
import { rule15ResultsNotReconciledInMdm } from "./rule-15-results-not-reconciled-in-mdm.rule.js";

const ctx = { generatedAt: "2026-09-13T15:30:00.000Z", snapshotVersion: "snapshot-v1" };

function baseSnapshot() {
  return {
    snapshotVersion: "snapshot-v1",
    generatedAt: "2026-09-13T15:30:00.000Z",
    encounterContext: { careSetting: "EMERGENCY_DEPARTMENT" },
    patientContext: {},
    presentation: { latestVitals: null, vitalTrend: [] },
    clinicalDocumentation: {
      providerDocumentationStatus: "DRAFT",
      providerNote: null,
      treatmentPlan: null,
      structuredEntries: [],
      reassessments: [],
    },
    diagnostics: { orders: [], results: [], pendingTests: [], criticalResults: [] },
    treatments: { medicationOrders: [], medicationAdministrations: [], procedures: [] },
    diagnoses: { documentedDiagnoses: [] },
    disposition: { followUps: [], appointments: [] },
  } as any;
}

describe("Phase 2J section intelligence", () => {
  it("flags missing ED vitals once provider documentation has started", () => {
    const findings = rule14EdMissingVitals(baseSnapshot(), ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "CLINICAL_SAFETY",
      priority: "HIGH",
      title: "No vital signs are documented for this emergency encounter",
    });
  });

  it("does not apply the ED-vitals rule to an outpatient clinic encounter", () => {
    const snapshot = baseSnapshot();
    snapshot.encounterContext.careSetting = "OFFICE_OUTPATIENT_CLINIC";
    expect(rule14EdMissingVitals(snapshot, ctx)).toEqual([]);
  });

  it("does not flag ED vitals when a vital set is present", () => {
    const snapshot = baseSnapshot();
    snapshot.presentation.latestVitals = { recordedAt: "2026-09-13T15:20:00.000Z", values: { heartRate: 80 } };
    expect(rule14EdMissingVitals(snapshot, ctx)).toEqual([]);
  });

  it("flags available results when structured MDM does not document data reviewed", () => {
    const snapshot = baseSnapshot();
    snapshot.diagnostics.results = [{ id: "result-1", resultText: null }];
    snapshot.clinicalDocumentation.structuredEntries = [{
      id: "provider-doc",
      namespace: "erProviderMseV1",
      documentedAt: "2026-09-13T15:20:00.000Z",
      payloadSummary: { mdmWorkingAssessment: "Abdominal pain", mdmDataReviewed: "" },
    }];
    const findings = rule15ResultsNotReconciledInMdm(snapshot, ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "RESULT_FOLLOWUP",
      priority: "MEDIUM",
      title: "Available diagnostic results are not reconciled in the MDM",
    });
  });

  it("does not flag diagnostic reconciliation when MDM documents data reviewed", () => {
    const snapshot = baseSnapshot();
    snapshot.diagnostics.results = [{ id: "result-1", resultText: null }];
    snapshot.clinicalDocumentation.structuredEntries = [{
      id: "provider-doc",
      namespace: "erProviderMseV1",
      documentedAt: "2026-09-13T15:20:00.000Z",
      payloadSummary: { mdmDataReviewed: "CBC and CMP reviewed" },
    }];
    expect(rule15ResultsNotReconciledInMdm(snapshot, ctx)).toEqual([]);
  });
});
