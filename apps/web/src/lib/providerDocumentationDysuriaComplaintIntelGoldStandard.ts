/** ME.2PD-R Track C — chart-ready dysuria complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function onsetTimingHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDysuriaBeganToday"),
    d("hpiDysuriaBeganThisMorning"),
    d("hpiDysuriaBeganOvernight"),
    d("hpiSymptomsSeveralDays"),
    d("hpiSuddenOnsetDysuria"),
    d("hpiGradualOnsetDysuria"),
    d("hpiRecurrentUrinarySymptoms"),
    d("hpiWorseningUrinarySymptoms"),
  ];
}

function urinarySymptomsHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDysuria"),
    d("hpiBurningWithUrination"),
    d("hpiPainWithUrination"),
    d("hpiUrinaryFrequency"),
    d("hpiUrinaryUrgency"),
    d("hpiSuprapubicDiscomfort"),
    d("hpiSuprapubicPain"),
    d("hpiCloudyUrine"),
    d("hpiFoulSmellingUrine"),
    d("hpiHematuria"),
    d("hpiIncompleteBladderEmptying"),
  ];
}

function associatedSymptomsHpi(d: (key: string) => string): string[] {
  return [
    d("hpiFlankPain"),
    d("hpiFever"),
    d("hpiChills"),
    d("hpiNausea"),
    d("hpiVomiting"),
    d("hpiWeakness"),
  ];
}

function riskContextHpi(d: (key: string) => string): string[] {
  return [
    d("hpiHistoryRecurrentUti"),
    d("hpiRecentUrinaryTractInfection"),
    d("hpiRecentAntibioticUse"),
    d("hpiIndwellingCatheter"),
    d("hpiRecentCatheterUse"),
    d("hpiPregnancyConcern"),
    d("hpiStiConcern"),
    d("hpiDiabetesHistory"),
  ];
}

function importantNegativesHpi(d: (key: string) => string): string[] {
  return [
    d("hpiDeniesFever"),
    d("hpiDeniesChills"),
    d("hpiDeniesFlankPain"),
    d("hpiDeniesHematuria"),
    d("hpiDeniesNausea"),
    d("hpiDeniesVomiting"),
    d("hpiDeniesVaginalDischarge"),
    d("hpiDeniesTesticularPain"),
    d("hpiDeniesUrinaryRetention"),
  ];
}

function dysuriaRos(d: (key: string) => string) {
  return {
    rosImportantPositives: [
      d("rosDysuria"),
      d("rosUrinaryFrequency"),
      d("rosUrinaryUrgency"),
      d("rosSuprapubicPain"),
      d("rosHematuria"),
      d("rosFlankPain"),
      d("rosFever"),
      d("rosChills"),
      d("rosNausea"),
      d("rosVomiting"),
    ],
    rosImportantNegatives: [
      d("rosDeniesFever"),
      d("rosDeniesChills"),
      d("rosDeniesFlankPain"),
      d("rosDeniesHematuria"),
      d("rosDeniesVaginalDischarge"),
      d("rosDeniesTesticularPain"),
      d("rosDeniesUrinaryRetention"),
    ],
    rosRedFlags: [
      d("rfFeverWithUrinarySymptoms"),
      d("rfFlankPainWithUrinarySymptoms"),
      d("rfVomitingWithUrinarySymptoms"),
      d("rfPregnancyConcern"),
      d("rfStiConcern"),
      d("rfCatheterAssociatedSymptoms"),
      d("rfPyelonephritisConcern"),
      d("rfSepsisConcern"),
      d("rfUrinaryRetentionConcern"),
    ],
  };
}

function dysuriaExam(d: (key: string) => string) {
  return {
    general: [
      d("examWellAppearing"),
      d("examMildlyIllAppearing"),
      d("examUncomfortableAppearing"),
      d("examNonToxicAppearing"),
      d("examAfebrile"),
      d("examFebrile"),
      d("examTachycardiaPresent"),
      d("examHemodynamicallyStable"),
      d("examAlertAndOriented"),
      d("examNoFocalNeurologicDeficit"),
    ],
    abdomen: [
      d("examAbdomenSoft"),
      d("examSuprapubicTenderness"),
      d("examMildLowerAbdominalTenderness"),
      d("examNoReboundTenderness"),
      d("examNoGuarding"),
      d("examNoPeritonealSigns"),
      d("examRightCvaTenderness"),
      d("examLeftCvaTenderness"),
      d("examNoCvaTenderness"),
    ],
  };
}

function dysuriaMdmCannotMiss(d: (key: string) => string): string[] {
  return [
    d("diffUrosepsis"),
    d("diffInfectedObstructingStone"),
    d("diffAcuteKidneyInjury"),
    d("diffPregnancyAssociatedInfection"),
    d("diffUrinaryRetention"),
    d("diffRenalAbscess"),
    d("diffObstructiveUropathy"),
  ];
}

function dysuriaMdmFull(d: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      d("waSuspectedUncomplicatedUti"),
      d("waSuspectedCystitis"),
      d("waDysuriaUnclearEtiology"),
      d("waConcernForPyelonephritis"),
      d("waConcernForUrethritis"),
      d("waConcernForSti"),
      d("waSuspectedCatheterAssociatedUti"),
    ],
    mdmDifferentialSynthesis: [
      d("diffCystitis"),
      d("diffUrinaryTractInfection"),
      d("diffStiUrethritis"),
      d("diffVaginitis"),
      d("diffProstatitis"),
      d("diffPyelonephritis"),
      d("diffComplicatedUti"),
      d("diffCatheterAssociatedUti"),
      ...dysuriaMdmCannotMiss(d),
    ],
    mdmDataReviewed: [
      d("mdmUrinalysisReviewed"),
      d("mdmUrineCultureReviewed"),
      d("mdmCbcReviewed"),
      d("mdmCmpReviewed"),
      d("mdmRenalFunctionReviewed"),
      d("mdmPregnancyTestReviewed"),
      d("mdmCtAbdomenPelvisReviewed"),
      d("mdmRenalUltrasoundReviewed"),
    ],
    mdmRiskStratification: [
      d("riskUncomplicatedCystitisLow"),
      d("riskWellAppearingLow"),
      d("riskToleratingOralIntakeLow"),
      d("riskNoSystemicSymptomsLow"),
      d("riskPyelonephritisConcernModerate"),
      d("riskIvFluidsAdministeredModerate"),
      d("riskAntibioticTherapyModerate"),
      d("riskObservationRequiredModerate"),
      d("riskSepsisConcernHigh"),
      d("riskInfectedObstructingStoneConcernHigh"),
      d("riskAcuteKidneyInjuryConcernHigh"),
      d("riskPregnancyAssociatedInfectionHigh"),
      d("riskAdmissionRecommendedHigh"),
      d("riskSpecialtyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      d("reasoningMostConsistentUncomplicatedUti"),
      d("reasoningLowSuspicionPyelonephritis"),
      d("reasoningNoEvidenceSepsis"),
      d("reasoningNoEvidenceObstructingStone"),
      d("reasoningOutpatientManagementAppropriate"),
    ],
    clinicalImpression: [
      d("impDysuria"),
      d("impUrinaryTractInfection"),
      d("impAcuteCystitis"),
      d("impPyelonephritis"),
      d("impUrethritis"),
      d("impComplicatedUrinaryTractInfection"),
    ],
    mdmPlanSummary: [
      d("planAntibioticsPrescribed"),
      d("planUrineCultureSent"),
      d("planOralHydrationEncouraged"),
      d("planIvFluidsAdministered"),
      d("planReturnPrecautionsDiscussed"),
      d("planPcpFollowUpRecommended"),
      d("planUrologyFollowUpRecommended"),
      d("planEdReturnAdvisedFeverFlankPainWorseningSymptoms"),
    ],
  };
}

function dysuriaReassessment(d: (key: string) => string) {
  return {
    reassessment: [
      d("reassessDysuriaImproved"),
      d("reassessSuprapubicPainImproved"),
      d("reassessNauseaImproved"),
      d("reassessVomitingResolved"),
      d("reassessToleratingOralIntake"),
      d("reassessHydrationStatusImproved"),
      d("reassessSymptomsImprovedAfterTreatment"),
      d("reassessRepeatAbdominalExamBenign"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [
      d("dispAntibioticsPrescribed"),
      d("dispReturnFeverFlankPain"),
      d("dispOralHydrationEncouraged"),
      d("dispPcpFollowUpRecommended"),
      d("dispUrologyFollowUpRecommended"),
      d("dispReturnPrecautionsDiscussed"),
    ],
  };
}

export function buildDysuriaComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...onsetTimingHpi(d),
      ...urinarySymptomsHpi(d),
      ...associatedSymptomsHpi(d),
      ...riskContextHpi(d),
      ...importantNegativesHpi(d),
    ],
    ...dysuriaRos(d),
    physicalExam: dysuriaExam(d),
    ...dysuriaMdmFull(d),
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    ...dysuriaReassessment(d),
  });
}
