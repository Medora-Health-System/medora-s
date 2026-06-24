import { runEnterpriseMedicationGapAnalysisReport } from "../dist/medication/enterpriseMedicationGapAnalysis.js";

const report = runEnterpriseMedicationGapAnalysisReport();

const summary = {
  finalDecision: report.finalDecision,
  ticket: report.ticket,
  coverage: report.coverage,
  gapTotalMissing: report.gap.totalMissingCount,
  readinessBreakdown: Object.fromEntries(
    Object.entries(
      report.gap.rows.reduce((acc, row) => {
        acc[row.activationReadiness] = (acc[row.activationReadiness] ?? 0) + 1;
        return acc;
      }, {})
    )
  ),
  domainMissingCounts: {
    emergencyDepartment: report.missingEmergencyDepartment.missingMedications.length,
    hospitalMedicine: report.missingHospitalMedicine.missingMedications.length,
    icu: report.missingIcu.missingMedications.length,
    cardiology: report.missingCardiology.missingMedications.length,
    neurology: report.missingNeurology.missingMedications.length,
    infectiousDisease: report.missingInfectiousDisease.missingMedications.length,
    psychiatry: report.missingPsychiatry.missingMedications.length,
    obgyn: report.missingObgyn.missingMedications.length,
    pediatrics: report.missingPediatrics.missingMedications.length,
    surgery: report.missingSurgery.missingMedications.length,
    gastroenterology: report.missingGastroenterology.missingMedications.length,
    painManagement: report.missingPainManagement.missingMedications.length,
    controlledSubstance: report.missingControlledSubstance.missingMedications.length,
  },
  marMissing: report.missingMarSupport.totalMissingCount,
  billingMissing: report.missingBillingCertification.totalMissingCount,
  inventoryMissing: report.missingInventoryCertification.totalMissingCount,
  duplicates: {
    duplicateCatalogCodes: report.duplicates.duplicateCatalogCodes,
    duplicateCanonicalFamiliesAmongActive: report.duplicates.duplicateCanonicalFamiliesAmongActive,
    duplicateDisplayNameCollisions: report.duplicates.duplicateDisplayNameCollisions,
  },
  top20Missing: report.top100Missing.rows.slice(0, 20),
  recommendedNextPhase: report.roadmap.recommendedNextPhase,
  roadmapPhases: report.roadmap.rows.slice(0, 8),
  compatibility: report.compatibility,
};

console.log(JSON.stringify(summary, null, 2));
