/** ME.2A-R Track C — chart-ready UTI / urinary symptoms complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function onsetTimingHpi(u: (key: string) => string): string[] {
  return [
    u("hpiUrinarySymptomsBeganToday"),
    u("hpiUrinarySymptomsBeganThisMorning"),
    u("hpiUrinarySymptomsBeganOvernight"),
    u("hpiSymptomsSeveralDays"),
    u("hpiSuddenOnsetUrinarySymptoms"),
    u("hpiGradualOnsetUrinarySymptoms"),
    u("hpiWorseningUrinarySymptoms"),
    u("hpiRecurrentUrinarySymptoms"),
  ];
}

function urinarySymptomsHpi(u: (key: string) => string): string[] {
  return [
    u("hpiDysuria"),
    u("hpiBurningWithUrination"),
    u("hpiUrinaryFrequency"),
    u("hpiUrinaryUrgency"),
    u("hpiSuprapubicDiscomfort"),
    u("hpiBladderPressure"),
    u("hpiCloudyUrine"),
    u("hpiFoulSmellingUrine"),
    u("hpiHematuria"),
  ];
}

function upperTractSystemicHpi(u: (key: string) => string): string[] {
  return [
    u("hpiFlankPain"),
    u("hpiFever"),
    u("hpiChills"),
    u("hpiNausea"),
    u("hpiVomiting"),
    u("hpiDecreasedOralIntake"),
    u("hpiWeakness"),
  ];
}

function riskContextHpi(u: (key: string) => string): string[] {
  return [
    u("hpiHistoryRecurrentUti"),
    u("hpiRecentUtiTreatment"),
    u("hpiRecentAntibioticUse"),
    u("hpiIndwellingCatheter"),
    u("hpiRecentCatheterUse"),
    u("hpiImmunocompromisedHistory"),
    u("hpiPregnancyConcern"),
    u("hpiDiabetesHistory"),
  ];
}

function importantNegativesHpi(u: (key: string) => string): string[] {
  return [
    u("hpiDeniesFever"),
    u("hpiDeniesChills"),
    u("hpiDeniesFlankPain"),
    u("hpiDeniesNausea"),
    u("hpiDeniesVomiting"),
    u("hpiDeniesHematuria"),
    u("hpiDeniesAbdominalPain"),
    u("hpiDeniesVaginalDischarge"),
    u("hpiDeniesTesticularPain"),
  ];
}

function urinaryRos(u: (key: string) => string) {
  return {
    rosImportantPositives: [
      u("rosDysuria"),
      u("rosUrinaryFrequency"),
      u("rosUrinaryUrgency"),
      u("rosSuprapubicDiscomfort"),
      u("rosHematuria"),
      u("rosFlankPain"),
      u("rosFever"),
      u("rosChills"),
      u("rosNausea"),
      u("rosVomiting"),
      u("rosWeakness"),
    ],
    rosImportantNegatives: [
      u("rosDeniesFever"),
      u("rosDeniesChills"),
      u("rosDeniesFlankPain"),
      u("rosDeniesNausea"),
      u("rosDeniesVomiting"),
      u("rosDeniesHematuria"),
      u("rosDeniesAbdominalPain"),
      u("rosDeniesVaginalDischarge"),
      u("rosDeniesTesticularPain"),
    ],
    rosRedFlags: [
      u("rfFeverWithUrinarySymptoms"),
      u("rfFlankPainWithUrinarySymptoms"),
      u("rfVomitingWithUrinarySymptoms"),
      u("rfPregnancyConcern"),
      u("rfImmunocompromisedUrinarySymptoms"),
      u("rfCatheterAssociatedSymptoms"),
      u("rfSepsisConcern"),
      u("rfPyelonephritisConcern"),
      u("rfObstructingStoneConcern"),
      u("rfUrinaryRetentionConcern"),
    ],
  };
}

function urinaryExam(u: (key: string) => string) {
  return {
    general: [
      u("examWellAppearing"),
      u("examMildlyIllAppearing"),
      u("examUncomfortableAppearing"),
      u("examNonToxicAppearing"),
      u("examAppearsDehydrated"),
      u("examAfebrile"),
      u("examFebrile"),
      u("examTachycardiaPresent"),
      u("examHemodynamicallyStable"),
      u("examMoistMucousMembranes"),
      u("examDryMucousMembranes"),
      u("examAlertAndOriented"),
      u("examNoFocalNeurologicDeficit"),
    ],
    abdomen: [
      u("examAbdomenSoft"),
      u("examSuprapubicTenderness"),
      u("examMildLowerAbdominalTenderness"),
      u("examNoGuarding"),
      u("examNoReboundTenderness"),
      u("examNoPeritonealSigns"),
      u("examRightCvaTenderness"),
      u("examLeftCvaTenderness"),
      u("examNoCvaTenderness"),
    ],
  };
}

function urinaryMdmCannotMiss(u: (key: string) => string): string[] {
  return [
    u("diffUrosepsis"),
    u("diffInfectedObstructingStone"),
    u("diffAcuteKidneyInjury"),
    u("diffPregnancyAssociatedUti"),
    u("diffSepticStone"),
    u("diffUrinaryRetention"),
    u("diffRenalAbscess"),
    u("diffObstructiveUropathy"),
  ];
}

function urinaryMdmFull(u: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      u("waSuspectedUncomplicatedUti"),
      u("waSuspectedCystitis"),
      u("waSuspectedPyelonephritis"),
      u("waSuspectedCatheterAssociatedUti"),
      u("waUrinarySymptomsUnclearEtiology"),
      u("waLowSuspicionPyelonephritis"),
      u("waConcernForObstructingStone"),
      u("waConcernForUrosepsis"),
    ],
    mdmDifferentialSynthesis: [
      u("diffCystitis"),
      u("diffUrinaryTractInfection"),
      u("diffUrethritis"),
      u("diffVaginitis"),
      u("diffProstatitis"),
      u("diffPyelonephritis"),
      u("diffCatheterAssociatedUti"),
      u("diffComplicatedUti"),
      u("diffNephrolithiasis"),
      ...urinaryMdmCannotMiss(u),
    ],
    mdmDataReviewed: [
      u("mdmUrinalysisReviewed"),
      u("mdmUrineCultureReviewed"),
      u("mdmCbcReviewed"),
      u("mdmCmpReviewed"),
      u("mdmRenalFunctionReviewed"),
      u("mdmPregnancyTestReviewed"),
      u("mdmCtAbdomenPelvisReviewed"),
      u("mdmRenalUltrasoundReviewed"),
    ],
    mdmRiskStratification: [
      u("riskUncomplicatedCystitisLow"),
      u("riskWellAppearingLow"),
      u("riskToleratingOralIntakeLow"),
      u("riskNoFlankPainLow"),
      u("riskNoFeverLow"),
      u("riskPyelonephritisSymptomsModerate"),
      u("riskUrineCultureObtainedModerate"),
      u("riskIvFluidsAdministeredModerate"),
      u("riskAntibioticTherapyModerate"),
      u("riskObservationRequiredModerate"),
      u("riskSepsisConcernHigh"),
      u("riskObstructingStoneConcernHigh"),
      u("riskAcuteKidneyInjuryConcernHigh"),
      u("riskPregnancyAssociatedInfectionHigh"),
      u("riskImmunocompromisedUrinaryInfectionHigh"),
      u("riskAdmissionRecommendedHigh"),
      u("riskUrologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      u("reasoningMostConsistentUncomplicatedCystitis"),
      u("reasoningLowSuspicionPyelonephritis"),
      u("reasoningNoEvidenceSepsis"),
      u("reasoningNoEvidenceObstructingStone"),
      u("reasoningRenalFunctionReassuring"),
      u("reasoningOutpatientManagementAppropriate"),
    ],
    clinicalImpression: [
      u("impUrinaryTractInfection"),
      u("impAcuteCystitis"),
      u("impPyelonephritis"),
      u("impUrinarySymptoms"),
      u("impHematuria"),
      u("impDysuria"),
      u("impComplicatedUrinaryTractInfection"),
    ],
    mdmPlanSummary: [
      u("planAntibioticsPrescribed"),
      u("planUrineCultureSent"),
      u("planOralHydrationEncouraged"),
      u("planIvFluidsAdministered"),
      u("planAntiemeticPrescribed"),
      u("planReturnPrecautionsDiscussed"),
      u("planPcpFollowUpRecommended"),
      u("planUrologyFollowUpRecommended"),
      u("planEdReturnAdvisedFeverFlankPainVomiting"),
    ],
  };
}

function urinaryReassessment(u: (key: string) => string) {
  return {
    reassessment: [
      u("reassessDysuriaImproved"),
      u("reassessSuprapubicPainImproved"),
      u("reassessNauseaImproved"),
      u("reassessVomitingResolved"),
      u("reassessToleratingOralIntake"),
      u("reassessHydrationStatusImproved"),
      u("reassessRemainsHemodynamicallyStable"),
      u("reassessRepeatAbdominalExamBenign"),
      u("reassessNoClinicalDeteriorationObserved"),
      u("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      u("dispAntibioticsPrescribed"),
      u("dispReturnFeverFlankPainVomiting"),
      u("dispOralHydrationEncouraged"),
      u("dispPcpFollowUpRecommended"),
      u("dispUrologyFollowUpRecommended"),
      u("dispReturnPrecautionsDiscussed"),
    ],
  };
}

export function buildUrinarySymptomsComplaintIntel(
  u: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...onsetTimingHpi(u),
      ...urinarySymptomsHpi(u),
      ...upperTractSystemicHpi(u),
      ...riskContextHpi(u),
      ...importantNegativesHpi(u),
    ],
    ...urinaryRos(u),
    physicalExam: urinaryExam(u),
    ...urinaryMdmFull(u),
    mdmAdmitObserveDischarge: [u("dispObservation"), u("dispAdmission"), u("dispDischarge")],
    ...urinaryReassessment(u),
  });
}
