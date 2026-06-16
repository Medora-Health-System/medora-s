/** POSTCERT.1C — MDM.1 gold-standard builder for observation reassessment complaint intelligence. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export const OBSERVATION_REASSESSMENT_TEMPLATE_ID = "observation_reassessment" as const;

export const OBSERVATION_REASSESSMENT_REQUIRED_MDM1_SECTIONS = [
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "mdmDataReviewed",
  "mdmRiskStratification",
  "mdmClinicalRationale",
  "clinicalImpression",
  "mdmPlanSummary",
] as const;

export function buildObservationReassessmentComplaintIntel(
  or: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      or("hpiObservationForSerialReassessment"),
      or("hpiPersistentSymptomsRequiringMonitoring"),
      or("hpiIntervalSymptomChange"),
      or("hpiTreatmentResponse"),
      or("hpiRepeatEvaluationPerformed"),
      or("hpiAwaitingRepeatTesting"),
      or("hpiAwaitingConsultantRecommendation"),
      or("hpiObservationForDiagnosticClarification"),
      or("hpiPainStatus"),
      or("hpiOralIntake"),
      or("hpiAmbulationStatus"),
      or("hpiFamilyCaregiverUpdate"),
    ],
    rosImportantPositives: [
      or("rosPersistentSymptoms"),
      or("rosImprovingSymptoms"),
      or("rosRecurrentSymptoms"),
    ],
    rosImportantNegatives: [
      or("rosDeniesChestPain"),
      or("rosDeniesShortnessOfBreath"),
      or("rosDeniesNeurologicDeterioration"),
      or("rosDeniesWorseningAbdominalPain"),
      or("rosDeniesFever"),
      or("rosDeniesSyncope"),
    ],
    rosRedFlags: [
      or("rfWorseningClinicalStatus"),
      or("rfAbnormalRepeatVitals"),
      or("rfUncontrolledPain"),
      or("rfInabilityToToleratePo"),
      or("rfUnsafeAmbulation"),
      or("rfNewConcerningSymptoms"),
      or("rfPendingCriticalResult"),
    ],
    physicalExam: {
      general: [
        or("examWellAppearing"),
        or("examNoAcuteDistress"),
        or("examStableVitalSigns"),
        or("examRepeatExaminationReassuring"),
        or("examIntervalExaminationUnchanged"),
      ],
      respiratory: [or("examNormalRespiratoryEffort")],
      neuroPsych: [or("examNormalMentalStatus")],
    },
    mdmWorkingAssessment: [
      or("waObservationForSerialReassessment"),
      or("waOngoingDiagnosticEvaluation"),
      or("waMonitoringTreatmentResponse"),
      or("waObservationPendingDisposition"),
    ],
    mdmDifferentialSynthesis: [
      or("diffEvolvingAcuteIllness"),
      or("diffUnresolvedSymptoms"),
      or("diffDelayedTreatmentResponse"),
      or("diffOccultPathologyRequiringObservation"),
      or("diffProgressionOfIllness"),
      or("diffDischargeReadiness"),
      or("diffObservationFailure"),
    ],
    mdmDataReviewed: [
      or("mdmRepeatLaboratoryStudiesReviewed"),
      or("mdmRepeatImagingReviewed"),
      or("mdmConsultantRecommendationsReviewed"),
      or("mdmRepeatEcgReviewed"),
      or("mdmTelemetryReviewed"),
      or("mdmSerialVitalSignsReviewed"),
    ],
    mdmRiskStratification: [
      or("riskLowRiskObservationCourse"),
      or("riskModerateRiskExtendedObservation"),
      or("riskHighRiskAdmissionRequired"),
    ],
    mdmClinicalRationale: [
      or("reasoningSymptomsImprovingWithTreatment"),
      or("reasoningNoEvidenceDeterioration"),
      or("reasoningAdditionalObservationNecessary"),
      or("reasoningAdmissionRequired"),
      or("reasoningDischargeAppropriateAfterReassessment"),
    ],
    clinicalImpression: [
      or("impClinicallyImproved"),
      or("impClinicallyStable"),
      or("impRequiresContinuedObservation"),
      or("impRequiresAdmission"),
    ],
    mdmPlanSummary: [
      or("planContinueObservation"),
      or("planObtainRepeatTesting"),
      or("planConsultantFollowUp"),
      or("planDischargeAfterObservation"),
      or("planAdmitForOngoingCare"),
      or("planReturnPrecautionsProvided"),
    ],
    reassessment: [
      or("reassessSymptomsImproved"),
      or("reassessSymptomsUnchanged"),
      or("reassessSymptomsWorsened"),
      or("reassessRepeatExaminationPerformed"),
      or("reassessRepeatVitalSignsStable"),
      or("reassessRemainsHemodynamicallyStable"),
      or("reassessConsultantRecommendationsAddressed"),
      or("reassessObservationGoalsAchieved"),
      or("reassessFurtherObservationRequired"),
    ],
    followUpDisposition: [
      or("dispDischargedAfterObservation"),
      or("dispAdmitForOngoingCare"),
      or("dispObservationContinued"),
      or("dispReturnPrecautionsProvided"),
      or("dispFollowUpArranged"),
    ],
  });
}
