/** ME.2K-R Track C — chart-ready headache complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function headacheHpi(ha: (key: string) => string): string[] {
  return [
    ha("hpiHeadacheBeganToday"),
    ha("hpiHeadacheBeganThisMorning"),
    ha("hpiHeadacheBeganOvernight"),
    ha("hpiSuddenOnsetHeadache"),
    ha("hpiGradualOnsetHeadache"),
    ha("hpiSymptomsForSeveralDays"),
    ha("hpiRecurrentHeadaches"),
    ha("hpiIntermittentHeadaches"),
    ha("hpiFrontalHeadache"),
    ha("hpiOccipitalHeadache"),
    ha("hpiTemporalHeadache"),
    ha("hpiDiffuseHeadache"),
    ha("hpiUnilateralHeadache"),
    ha("hpiBehindTheEyePain"),
    ha("hpiThrobbingHeadache"),
    ha("hpiPressureLikeHeadache"),
    ha("hpiSharpHeadache"),
    ha("hpiStabbingHeadache"),
    ha("hpiMildHeadache"),
    ha("hpiModerateHeadache"),
    ha("hpiSevereHeadache"),
    ha("hpiWorstHeadacheOfLife"),
    ha("hpiPhotophobia"),
    ha("hpiPhonophobia"),
    ha("hpiNausea"),
    ha("hpiVomiting"),
    ha("hpiDizziness"),
    ha("hpiVisualDisturbance"),
    ha("hpiBlurredVision"),
    ha("hpiAuraSymptoms"),
    ha("hpiNeckPain"),
    ha("hpiFever"),
    ha("hpiHistoryOfMigraines"),
    ha("hpiRecentIllness"),
    ha("hpiRecentHeadInjury"),
    ha("hpiHistoryOfHypertension"),
    ha("hpiAnticoagulantUse"),
    ha("hpiDeniesVisionLoss"),
    ha("hpiDeniesFocalWeakness"),
    ha("hpiDeniesNumbness"),
    ha("hpiDeniesSyncope"),
    ha("hpiDeniesSeizureActivity"),
    ha("hpiDeniesRecentTrauma"),
  ];
}

function sharedRos(ha: (key: string) => string) {
  return {
    rosImportantPositives: [
      ha("rosHeadache"),
      ha("rosPhotophobia"),
      ha("rosPhonophobia"),
      ha("rosNausea"),
      ha("rosVomiting"),
      ha("rosDizziness"),
      ha("rosVisualChanges"),
      ha("rosFever"),
      ha("rosNeckPain"),
    ],
    rosImportantNegatives: [
      ha("rosDeniesChestPain"),
      ha("rosDeniesShortnessOfBreath"),
      ha("rosDeniesSyncope"),
      ha("rosDeniesFocalWeakness"),
      ha("rosDeniesNumbness"),
      ha("rosDeniesSeizureActivity"),
    ],
    rosRedFlags: [
      ha("rfWorstHeadacheOfLife"),
      ha("rfAlteredMentalStatus"),
      ha("rfFocalNeurologicDeficit"),
      ha("rfVisionLoss"),
      ha("rfPersistentVomiting"),
      ha("rfMeningealSymptoms"),
      ha("rfNewHeadacheOnAnticoagulation"),
    ],
  };
}

function sharedExam(ha: (key: string) => string) {
  return {
    general: [
      ha("examWellAppearing"),
      ha("examUncomfortableAppearing"),
      ha("examAppearsInPain"),
      ha("examNonToxicAppearing"),
    ],
    neuroPsych: [
      ha("examAlertAndOriented"),
      ha("examCranialNervesIntact"),
      ha("examNoFocalNeurologicDeficit"),
      ha("examNormalSpeech"),
      ha("examNormalGait"),
    ],
    heent: [
      ha("examPupilsEqualAndReactive"),
      ha("examExtraocularMovementsIntact"),
      ha("examPhotophobiaPresent"),
      ha("examNoPapilledemaAppreciated"),
      ha("examNeckSupple"),
      ha("examMeningealSignsPresent"),
      ha("examNoMeningismus"),
    ],
  };
}

function sharedMdmGoldStandard(ha: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      ha("waMigraineHeadache"),
      ha("waTensionHeadache"),
      ha("waHeadacheUnclearEtiology"),
      ha("waClusterHeadache"),
      ha("waViralSyndromeAssociatedHeadache"),
      ha("waLowSuspicionIntracranialHemorrhage"),
      ha("waConcernForIntracranialProcess"),
    ],
    mdmDifferentialSynthesis: [
      ha("diffMigraine"),
      ha("diffTensionHeadache"),
      ha("diffClusterHeadache"),
      ha("diffSinusHeadache"),
      ha("diffMedicationOveruseHeadache"),
      ha("diffHypertensiveHeadache"),
      ha("diffPostTraumaticHeadache"),
      ha("diffTemporalArteritis"),
      ha("diffSubarachnoidHemorrhage"),
      ha("diffIntracranialHemorrhage"),
      ha("diffMeningitis"),
      ha("diffEncephalitis"),
      ha("diffBrainMass"),
      ha("diffCerebralVenousSinusThrombosis"),
      ha("diffAcuteAngleClosureGlaucoma"),
    ],
    mdmDataReviewed: [
      ha("mdmCbcReviewed"),
      ha("mdmCmpReviewed"),
      ha("mdmEsrReviewed"),
      ha("mdmCrpReviewed"),
      ha("mdmCtHeadReviewed"),
      ha("mdmCtaHeadReviewed"),
      ha("mdmMriBrainReviewed"),
      ha("mdmLumbarPunctureReviewed"),
    ],
    mdmRiskStratification: [
      ha("riskNormalNeurologicExaminationLow"),
      ha("riskSymptomsConsistentWithMigraineLow"),
      ha("riskImprovedAfterTreatmentLow"),
      ha("riskAdvancedImagingObtainedModerate"),
      ha("riskObservationRequiredModerate"),
      ha("riskPersistentSymptomsModerate"),
      ha("riskConcernIntracranialHemorrhageHigh"),
      ha("riskConcernCnsInfectionHigh"),
      ha("riskAdmissionRecommendedHigh"),
      ha("riskNeurologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      ha("reasoningSymptomsMostConsistentWithMigraine"),
      ha("reasoningSymptomsMostConsistentWithTensionHeadache"),
      ha("reasoningNoEvidenceAcuteIntracranialHemorrhage"),
      ha("reasoningLowSuspicionMeningitis"),
      ha("reasoningNeurologicExaminationReassuring"),
    ],
    clinicalImpression: [
      ha("impMigraineHeadache"),
      ha("impTensionHeadache"),
      ha("impClusterHeadache"),
      ha("impHeadache"),
      ha("impViralSyndrome"),
    ],
    mdmPlanSummary: [
      ha("planMigraineTherapyAdministered"),
      ha("planAntiemeticAdministered"),
      ha("planOralHydrationEncouraged"),
      ha("planNeurologyFollowUpRecommended"),
      ha("planReturnPrecautionsDiscussed"),
      ha("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(ha: (key: string) => string) {
  return {
    reassessment: [
      ha("reassessHeadacheImprovedAfterTreatment"),
      ha("reassessSymptomsImprovedAfterTreatment"),
      ha("reassessPainImproved"),
      ha("reassessNauseaImproved"),
      ha("reassessToleratingOralIntake"),
      ha("reassessRepeatNeurologicExaminationUnchanged"),
      ha("reassessRemainsNeurologicallyIntact"),
      ha("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      ha("dispReturnWorseningHeadache"),
      ha("dispReturnThunderclapHeadache"),
      ha("dispReturnNeurologicSymptoms"),
      ha("dispNeurologyFollowUpRecommended"),
      ha("dispReturnPrecautionsDiscussed"),
    ],
  };
}

export function buildHeadacheComplaintIntel(ha: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: headacheHpi(ha),
    ...sharedRos(ha),
    physicalExam: sharedExam(ha),
    ...sharedMdmGoldStandard(ha),
    mdmAdmitObserveDischarge: [ha("dispObservation"), ha("dispAdmission"), ha("dispDischarge")],
    ...sharedReassessment(ha),
  });
}

export function buildMigraineHeadacheComplaintV1Intel(
  mh: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildHeadacheComplaintIntel(mh);
}
