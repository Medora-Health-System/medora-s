/** ME.2M-R Track C — chart-ready dizziness / vertigo / syncope complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function dizzinessHpi(dz: (key: string) => string): string[] {
  return [
    dz("hpiDizzinessBeganToday"),
    dz("hpiDizzinessBeganThisMorning"),
    dz("hpiDizzinessBeganOvernight"),
    dz("hpiSuddenOnsetDizziness"),
    dz("hpiGradualOnsetDizziness"),
    dz("hpiSymptomsForSeveralDays"),
    dz("hpiIntermittentDizziness"),
    dz("hpiRecurrentDizziness"),
    dz("hpiRoomSpinningSensation"),
    dz("hpiLightheadedness"),
    dz("hpiNearSyncope"),
    dz("hpiSyncope"),
    dz("hpiFeelingOffBalance"),
    dz("hpiUnsteadyGait"),
    dz("hpiWorseWithPositionChange"),
    dz("hpiWorseWithHeadMovement"),
    dz("hpiSymptomsOccurWithStanding"),
    dz("hpiSymptomsOccurWithExertion"),
    dz("hpiSymptomsImproving"),
    dz("hpiSymptomsWorsening"),
    dz("hpiNausea"),
    dz("hpiVomiting"),
    dz("hpiHeadache"),
    dz("hpiChestPain"),
    dz("hpiShortnessOfBreath"),
    dz("hpiPalpitations"),
    dz("hpiWeakness"),
    dz("hpiVisionChanges"),
    dz("hpiHearingChanges"),
    dz("hpiTinnitus"),
    dz("hpiRecentIllness"),
    dz("hpiPoorOralIntake"),
    dz("hpiDehydrationConcern"),
    dz("hpiRecentMedicationChange"),
    dz("hpiHistoryOfVertigo"),
    dz("hpiHistoryOfArrhythmia"),
    dz("hpiHistoryOfStroke"),
    dz("hpiHistoryOfSeizures"),
    dz("hpiFallAfterDizziness"),
    dz("hpiRecentHeadInjury"),
    dz("hpiAnticoagulantUse"),
    dz("hpiDeniesChestPain"),
    dz("hpiDeniesShortnessOfBreath"),
    dz("hpiDeniesPalpitations"),
    dz("hpiDeniesFocalWeakness"),
    dz("hpiDeniesNumbness"),
    dz("hpiDeniesSlurredSpeech"),
    dz("hpiDeniesVisionLoss"),
    dz("hpiDeniesSeizureActivity"),
    dz("hpiDeniesHeadInjury"),
    dz("hpiDeniesLossOfConsciousness"),
  ];
}

function sharedRos(dz: (key: string) => string) {
  return {
    rosImportantPositives: [
      dz("rosDizziness"),
      dz("rosLightheadedness"),
      dz("rosVertigo"),
      dz("rosSyncope"),
      dz("rosNearSyncope"),
      dz("rosNausea"),
      dz("rosVomiting"),
      dz("rosHeadache"),
      dz("rosChestPain"),
      dz("rosShortnessOfBreath"),
      dz("rosPalpitations"),
      dz("rosWeakness"),
      dz("rosVisionChanges"),
      dz("rosHearingChanges"),
      dz("rosTinnitus"),
    ],
    rosImportantNegatives: [
      dz("rosDeniesChestPain"),
      dz("rosDeniesShortnessOfBreath"),
      dz("rosDeniesPalpitations"),
      dz("rosDeniesSyncope"),
      dz("rosDeniesFocalWeakness"),
      dz("rosDeniesNumbness"),
      dz("rosDeniesSlurredSpeech"),
      dz("rosDeniesSeizureActivity"),
    ],
    rosRedFlags: [
      dz("rfSyncope"),
      dz("rfExertionalSyncope"),
      dz("rfChestPainWithSyncope"),
      dz("rfShortnessOfBreathWithSyncope"),
      dz("rfFocalNeurologicDeficit"),
      dz("rfAlteredMentalStatus"),
      dz("rfSevereHeadache"),
      dz("rfNewGaitInstability"),
      dz("rfHypotension"),
      dz("rfPersistentVomiting"),
    ],
  };
}

function sharedExam(dz: (key: string) => string) {
  return {
    general: [
      dz("examWellAppearing"),
      dz("examUncomfortableAppearing"),
      dz("examNonToxicAppearing"),
      dz("examAppearsLightheaded"),
      dz("examAppearsUnsteady"),
    ],
    cardiovascular: [
      dz("examOrthostaticVitalsNormal"),
      dz("examOrthostaticHypotensionPresent"),
      dz("examTachycardiaPresent"),
      dz("examBloodPressureStable"),
      dz("examRegularRateAndRhythm"),
      dz("examMurmurPresent"),
    ],
    respiratory: [dz("examLungsClearBilaterally"), dz("examNoRespiratoryDistress")],
    neuroPsych: [
      dz("examAlertAndOriented"),
      dz("examCranialNervesIntact"),
      dz("examNormalSpeech"),
      dz("examNormalGait"),
      dz("examUnsteadyGait"),
      dz("examGaitInstability"),
      dz("examTruncalAtaxia"),
      dz("examNoFocalNeurologicDeficit"),
      dz("examFocalNeurologicDeficitPresent"),
      dz("examNormalCoordination"),
      dz("examAbnormalCoordination"),
    ],
    heent: [
      dz("examPupilsEqualAndReactive"),
      dz("examExtraocularMovementsIntact"),
      dz("examHorizontalNystagmus"),
      dz("examVerticalNystagmus"),
      dz("examNystagmusPresent"),
      dz("examNoNystagmus"),
      dz("examPositiveDixHallpike"),
      dz("examNegativeDixHallpike"),
      dz("examNormalTympanicMembranes"),
    ],
    musculoskeletal: [
      dz("examNoSignsOfHeadTrauma"),
      dz("examScalpHematomaPresent"),
      dz("examAbrasionPresent"),
    ],
  };
}

function sharedMdmGoldStandard(dz: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      dz("waSuspectedBenignPositionalVertigo"),
      dz("waSuspectedPeripheralVertigo"),
      dz("waSuspectedOrthostaticDizziness"),
      dz("waSuspectedDehydrationRelatedDizziness"),
      dz("waNearSyncope"),
      dz("waSyncopeUnclearEtiology"),
      dz("waLowSuspicionStroke"),
      dz("waConcernCentralVertigo"),
      dz("waConcernCardiacSyncope"),
    ],
    mdmDifferentialSynthesis: [
      dz("diffBenignParoxysmalPositionalVertigo"),
      dz("diffVestibularNeuritis"),
      dz("diffLabyrinthitis"),
      dz("diffMeniereDisease"),
      dz("diffOrthostaticHypotension"),
      dz("diffOrthostaticSyncope"),
      dz("diffDehydration"),
      dz("diffVasovagalSyncope"),
      dz("diffMedicationEffect"),
      dz("diffHypoglycemia"),
      dz("diffCardiacArrhythmia"),
      dz("diffStructuralHeartDisease"),
      dz("diffAcuteCoronarySyndrome"),
      dz("diffPulmonaryEmbolism"),
      dz("diffStroke"),
      dz("diffTransientIschemicAttack"),
      dz("diffSeizure"),
      dz("diffAnemia"),
      dz("diffPosteriorCirculationStroke"),
      dz("diffVertebrobasilarInsufficiency"),
      dz("diffCerebellarInfarction"),
      dz("diffIntracranialHemorrhage"),
      dz("diffAorticDissection"),
      dz("diffSepsis"),
      dz("diffSevereElectrolyteAbnormality"),
    ],
    mdmDataReviewed: [
      dz("mdmCbcReviewed"),
      dz("mdmCmpReviewed"),
      dz("mdmGlucoseReviewed"),
      dz("mdmEkgReviewed"),
      dz("mdmTroponinReviewed"),
      dz("mdmOrthostaticVitalSignsReviewed"),
      dz("mdmCtHeadReviewed"),
      dz("mdmCtaHeadAndNeckReviewed"),
      dz("mdmMriBrainReviewed"),
      dz("mdmUrinalysisReviewed"),
    ],
    mdmRiskStratification: [
      dz("riskNormalNeurologicExaminationLow"),
      dz("riskSymptomsConsistentPeripheralVertigoLow"),
      dz("riskSymptomsImprovedAfterTreatmentLow"),
      dz("riskStableOutpatientManagementLow"),
      dz("riskAdvancedImagingObtainedModerate"),
      dz("riskObservationRequiredModerate"),
      dz("riskPersistentSymptomsModerate"),
      dz("riskCardiacMonitoringRequiredModerate"),
      dz("riskConcernCentralVertigoHigh"),
      dz("riskConcernCardiacSyncopeHigh"),
      dz("riskConcernStrokeHigh"),
      dz("riskAdmissionRecommendedHigh"),
      dz("riskNeurologyConsultationObtainedHigh"),
      dz("riskCardiologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      dz("reasoningSymptomsMostConsistentPeripheralVertigo"),
      dz("reasoningSymptomsNotConsistentCentralVertigo"),
      dz("reasoningSymptomsMostConsistentOrthostaticDizziness"),
      dz("reasoningLowSuspicionPosteriorCirculationStroke"),
      dz("reasoningNoFocalNeurologicDeficitIdentified"),
      dz("reasoningSymptomsReproducedWithPositionalTesting"),
      dz("reasoningLowSuspicionCardiacSyncope"),
      dz("reasoningNeurologicExaminationReassuring"),
      dz("reasoningNoRecurrentSyncopeObserved"),
    ],
    clinicalImpression: [
      dz("impDizziness"),
      dz("impVertigo"),
      dz("impBenignPositionalVertigo"),
      dz("impNearSyncope"),
      dz("impSyncope"),
      dz("impOrthostaticDizziness"),
      dz("impDehydrationRelatedDizziness"),
    ],
    mdmPlanSummary: [
      dz("planEpleyManeuverDiscussed"),
      dz("planMeclizinePrescribed"),
      dz("planMeclizineAdministered"),
      dz("planAntiemeticAdministered"),
      dz("planIvFluidsAdministered"),
      dz("planOralHydrationEncouraged"),
      dz("planFallPrecautionsDiscussed"),
      dz("planNeurologyFollowUpRecommended"),
      dz("planCardiologyFollowUpRecommended"),
      dz("planReturnPrecautionsDiscussed"),
      dz("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(dz: (key: string) => string) {
  return {
    reassessment: [
      dz("reassessDizzinessImproved"),
      dz("reassessVertigoImproved"),
      dz("reassessNauseaImproved"),
      dz("reassessSymptomsImprovedAfterTreatment"),
      dz("reassessAmbulatingSafely"),
      dz("reassessRepeatNeurologicExaminationUnchanged"),
      dz("reassessRemainsNeurologicallyIntact"),
      dz("reassessRemainsHemodynamicallyStable"),
      dz("reassessOrthostaticSymptomsImproved"),
      dz("reassessNoRecurrentSyncopeObserved"),
    ],
    followUpDisposition: [
      dz("dispReturnWorseningDizziness"),
      dz("dispReturnRecurrentSyncope"),
      dz("dispNeurologyFollowUpRecommended"),
      dz("dispCardiologyFollowUpRecommended"),
      dz("dispReturnPrecautionsDiscussed"),
      dz("dispNoDrivingUntilCleared"),
    ],
  };
}

function buildDizzinessVertigoGoldStandardIntel(
  dz: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: dizzinessHpi(dz),
    ...sharedRos(dz),
    physicalExam: sharedExam(dz),
    ...sharedMdmGoldStandard(dz),
    mdmAdmitObserveDischarge: [dz("dispObservation"), dz("dispAdmission"), dz("dispDischarge")],
    ...sharedReassessment(dz),
  });
}

export function buildDizzinessSyncopeComplaintIntel(
  dz: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildDizzinessVertigoGoldStandardIntel(dz);
}

export function buildNearSyncopeComplaintV1Intel(
  ns: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildDizzinessVertigoGoldStandardIntel(ns);
}

export function buildVertigoComplaintV1Intel(
  vt: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildDizzinessVertigoGoldStandardIntel(vt);
}
