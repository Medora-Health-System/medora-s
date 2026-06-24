import { runControlledSubstanceWaveCRuntimeRemediationReport } from "../dist/medication/controlledSubstanceWaveCRuntimeRemediation.js";

const report = runControlledSubstanceWaveCRuntimeRemediationReport();
console.log(JSON.stringify({
  finalDecision: report.finalDecision,
  pilotBlocker: {
    decision: report.pilotMedicationBlocker.decision,
    sampleBefore: report.pilotMedicationBlocker.sampleFacilityBlockersBefore,
    sampleAfter: report.pilotMedicationBlocker.sampleFacilityAllowedAfter,
  },
  waveCCatalog: {
    decision: report.waveCCatalogRuntime.decision,
    missingCount: report.waveCCatalogRuntime.missingCount,
    gaps: report.waveCCatalogRuntime.rows.filter((r) => r.classification !== "PRESENT"),
  },
  duplicates: report.duplicateMedicationResolution,
  painReassessment: {
    workflow: report.painReassessmentWorkflow.decision,
    persistence: report.painReassessmentPersistence.decision,
  },
  runtimeValidation: report.waveCRuntimeValidation,
  compatibility: report.compatibilityAudit,
}, null, 2));
