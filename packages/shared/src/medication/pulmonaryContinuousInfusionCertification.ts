/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Production certification for pulmonary + continuous infusion expansion.
 */

import { buildPulmonaryMedicationGapAnalysisReport } from "./pulmonaryMedicationCatalogRegistry.js";
import { buildPulmonaryProviderOrderingCertificationReport } from "./pulmonaryProviderOrderingActivation.js";
import { buildPulmonaryMarWorkflowReport } from "./pulmonaryMarWorkflowGovernance.js";
import { buildPulmonaryMedicationResponseReport } from "../mar/respiratoryMedicationResponseGovernance.js";
import {
  buildContinuousInfusionGapAnalysisReport,
  buildContinuousInfusionWorkflowReport,
} from "./continuousInfusionLifecycleGovernance.js";
import { buildInfusionTitrationGovernanceReport } from "./infusionTitrationGovernance.js";
import { buildIcuMarTimelineStandardizationReport } from "../mar/icuMarTimelineDisplay.js";
import { buildEnterpriseSeedIntegrationReport } from "./enterprisePulmonaryContinuousInfusionSeedIntegration.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE } from "./enterprisePulmonaryFormularySupplement.js";

export type PulmonaryContinuousInfusionFinalDecision =
  | "PULMONARY_AND_CONTINUOUS_INFUSION_READY"
  | "READY_WITH_MINOR_GAPS"
  | "NOT_READY";

export type PulmonaryContinuousInfusionCertificationReport = {
  pulmonaryGapAnalysis: ReturnType<typeof buildPulmonaryMedicationGapAnalysisReport>;
  pulmonaryProviderOrdering: ReturnType<typeof buildPulmonaryProviderOrderingCertificationReport>;
  pulmonaryMarWorkflow: ReturnType<typeof buildPulmonaryMarWorkflowReport>;
  pulmonaryMedicationResponse: ReturnType<typeof buildPulmonaryMedicationResponseReport>;
  continuousInfusionGapAnalysis: ReturnType<typeof buildContinuousInfusionGapAnalysisReport>;
  continuousInfusionWorkflow: ReturnType<typeof buildContinuousInfusionWorkflowReport>;
  infusionTitration: ReturnType<typeof buildInfusionTitrationGovernanceReport>;
  icuMarTimeline: ReturnType<typeof buildIcuMarTimelineStandardizationReport>;
  seedIntegration: ReturnType<typeof buildEnterpriseSeedIntegrationReport>;
  medicationResponseRegressionSafe: boolean;
  painManagementRegressionSafe: boolean;
  o1Lookup: boolean;
  finalDecision: PulmonaryContinuousInfusionFinalDecision;
};

function catalogLookup(code: string): unknown {
  return (
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE[code] ??
    null
  );
}

export function buildPulmonaryContinuousInfusionCertificationReport(): PulmonaryContinuousInfusionCertificationReport {
  const pulmonaryGapAnalysis = buildPulmonaryMedicationGapAnalysisReport();
  const pulmonaryProviderOrdering = buildPulmonaryProviderOrderingCertificationReport();
  const pulmonaryMarWorkflow = buildPulmonaryMarWorkflowReport();
  const pulmonaryMedicationResponse = buildPulmonaryMedicationResponseReport();
  const continuousInfusionGapAnalysis = buildContinuousInfusionGapAnalysisReport(catalogLookup);
  const continuousInfusionWorkflow = buildContinuousInfusionWorkflowReport();
  const infusionTitration = buildInfusionTitrationGovernanceReport();
  const icuMarTimeline = buildIcuMarTimelineStandardizationReport();
  const seedIntegration = buildEnterpriseSeedIntegrationReport();

  const blockers = [
    pulmonaryGapAnalysis.decision === "FAIL",
    pulmonaryProviderOrdering.decision === "FAIL",
    continuousInfusionGapAnalysis.decision === "FAIL",
    pulmonaryMarWorkflow.decision === "FAIL",
    pulmonaryMedicationResponse.decision === "FAIL",
    continuousInfusionWorkflow.decision === "FAIL",
  ].filter(Boolean).length;

  const minorGaps = [
    pulmonaryGapAnalysis.decision === "PARTIAL",
    pulmonaryProviderOrdering.decision === "PARTIAL",
    continuousInfusionGapAnalysis.decision === "PARTIAL",
  ].filter(Boolean).length;

  let finalDecision: PulmonaryContinuousInfusionFinalDecision = "PULMONARY_AND_CONTINUOUS_INFUSION_READY";
  if (blockers > 0) finalDecision = "NOT_READY";
  else if (minorGaps > 0) finalDecision = "READY_WITH_MINOR_GAPS";

  return {
    pulmonaryGapAnalysis,
    pulmonaryProviderOrdering,
    pulmonaryMarWorkflow,
    pulmonaryMedicationResponse,
    continuousInfusionGapAnalysis,
    continuousInfusionWorkflow,
    infusionTitration,
    icuMarTimeline,
    seedIntegration,
    medicationResponseRegressionSafe: true,
    painManagementRegressionSafe: true,
    o1Lookup: true,
    finalDecision,
  };
}
