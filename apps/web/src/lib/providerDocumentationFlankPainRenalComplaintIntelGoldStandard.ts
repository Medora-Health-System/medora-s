/** ME.2PB-R Track C — chart-ready flank / renal colic complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function onsetTimingHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiFlankPainBeganToday"),
    fp("hpiFlankPainBeganThisMorning"),
    fp("hpiFlankPainBeganOvernight"),
    fp("hpiSymptomsSeveralDays"),
    fp("hpiSuddenOnsetFlankPain"),
    fp("hpiGradualOnsetFlankPain"),
    fp("hpiIntermittentFlankPain"),
    fp("hpiWorseningFlankPain"),
  ];
}

function locationRadiationHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiRightFlankPain"),
    fp("hpiLeftFlankPain"),
    fp("hpiBilateralFlankPain"),
    fp("hpiFlankPainRadiatesToGroin"),
    fp("hpiFlankPainRadiatesToLowerAbdomen"),
    fp("hpiSuprapubicPain"),
    fp("hpiLowerAbdominalPain"),
  ];
}

function painQualityHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiSharpFlankPain"),
    fp("hpiColickyFlankPain"),
    fp("hpiCrampingPain"),
    fp("hpiConstantPain"),
    fp("hpiIntermittentPain"),
    fp("hpiSevereFlankPain"),
  ];
}

function associatedSymptomsHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiNausea"),
    fp("hpiVomiting"),
    fp("hpiHematuria"),
    fp("hpiDysuria"),
    fp("hpiUrinaryFrequency"),
    fp("hpiUrgency"),
    fp("hpiFever"),
    fp("hpiChills"),
    fp("hpiDecreasedUrineOutput"),
    fp("hpiTesticularPain"),
  ];
}

function riskContextHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiHistoryOfKidneyStones"),
    fp("hpiHistoryOfSolitaryKidney"),
    fp("hpiRecentUrinaryTractInfection"),
    fp("hpiPregnancyConcern"),
    fp("hpiRecentDehydration"),
    fp("hpiPriorUrologicProcedure"),
  ];
}

function importantNegativesHpi(fp: (key: string) => string): string[] {
  return [
    fp("hpiDeniesFever"),
    fp("hpiDeniesChills"),
    fp("hpiDeniesVomiting"),
    fp("hpiDeniesDysuria"),
    fp("hpiDeniesHematuria"),
    fp("hpiDeniesAbdominalPain"),
    fp("hpiDeniesTesticularPain"),
    fp("hpiDeniesUrinaryRetention"),
  ];
}

function flankRos(fp: (key: string) => string) {
  return {
    rosImportantPositives: [
      fp("rosFlankPain"),
      fp("rosAbdominalPain"),
      fp("rosNausea"),
      fp("rosVomiting"),
      fp("rosHematuria"),
      fp("rosDysuria"),
      fp("rosUrinaryFrequency"),
      fp("rosUrgency"),
      fp("rosFever"),
      fp("rosChills"),
      fp("rosDecreasedUrineOutput"),
      fp("rosTesticularPain"),
    ],
    rosImportantNegatives: [
      fp("rosDeniesFever"),
      fp("rosDeniesChills"),
      fp("rosDeniesVomiting"),
      fp("rosDeniesDysuria"),
      fp("rosDeniesHematuria"),
      fp("rosDeniesAbdominalPain"),
      fp("rosDeniesTesticularPain"),
      fp("rosDeniesUrinaryRetention"),
    ],
    rosRedFlags: [
      fp("rfFeverWithFlankPain"),
      fp("rfSevereFlankPain"),
      fp("rfPersistentVomiting"),
      fp("rfDecreasedUrineOutput"),
      fp("rfSolitaryKidney"),
      fp("rfPregnancyConcern"),
      fp("rfSepsisConcern"),
      fp("rfObstructingStoneConcern"),
      fp("rfInfectedStoneConcern"),
    ],
  };
}

function flankExam(fp: (key: string) => string) {
  return {
    general: [
      fp("examWellAppearing"),
      fp("examUncomfortableAppearing"),
      fp("examMildlyIllAppearing"),
      fp("examNonToxicAppearing"),
      fp("examAppearsDehydrated"),
      fp("examDryMucousMembranes"),
      fp("examMoistMucousMembranes"),
      fp("examTachycardiaPresent"),
      fp("examFebrile"),
      fp("examAfebrile"),
      fp("examHemodynamicallyStable"),
      fp("examAlertAndOriented"),
      fp("examNoFocalNeurologicDeficit"),
    ],
    abdomen: [
      fp("examAbdomenSoft"),
      fp("examMildAbdominalTenderness"),
      fp("examSuprapubicTenderness"),
      fp("examNoGuarding"),
      fp("examNoReboundTenderness"),
      fp("examNoPeritonealSigns"),
      fp("examRightCvaTenderness"),
      fp("examLeftCvaTenderness"),
      fp("examBilateralCvaTenderness"),
      fp("examNoCvaTenderness"),
    ],
  };
}

function flankMdmCannotMissDiff(fp: (key: string) => string): string[] {
  return [
    fp("diffInfectedObstructingStone"),
    fp("diffSepsis"),
    fp("diffAcuteKidneyInjury"),
    fp("diffAbdominalAorticAneurysm"),
    fp("diffEctopicPregnancy"),
    fp("diffOvarianTorsion"),
    fp("diffTesticularTorsion"),
  ];
}

function flankMdmFull(fp: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      fp("waSuspectedRenalColic"),
      fp("waSuspectedUreterolithiasis"),
      fp("waSuspectedKidneyStone"),
      fp("waSuspectedPyelonephritis"),
      fp("waFlankPainUnclearEtiology"),
      fp("waLowSuspicionInfectedObstructingStone"),
      fp("waConcernForObstructingStone"),
      fp("waConcernForInfectedStone"),
    ],
    mdmDifferentialSynthesis: [
      fp("diffRenalColic"),
      fp("diffUreterolithiasis"),
      fp("diffNephrolithiasis"),
      fp("diffUrinaryTractInfection"),
      fp("diffPyelonephritis"),
      fp("diffMusculoskeletalFlankPain"),
      fp("diffObstructingUreteralStone"),
      fp("diffInfectedUreteralStone"),
      fp("diffHydronephrosis"),
      fp("diffAppendicitis"),
      fp("diffDiverticulitis"),
      ...flankMdmCannotMissDiff(fp),
    ],
    mdmDataReviewed: [
      fp("mdmUrinalysisReviewed"),
      fp("mdmUrineCultureReviewed"),
      fp("mdmCbcReviewed"),
      fp("mdmCmpReviewed"),
      fp("mdmRenalFunctionReviewed"),
      fp("mdmPregnancyTestReviewed"),
      fp("mdmCtAbdomenPelvisReviewed"),
      fp("mdmRenalUltrasoundReviewed"),
      fp("mdmBedsideUltrasoundReviewed"),
    ],
    mdmRiskStratification: [
      fp("riskPainControlledLow"),
      fp("riskToleratingOralIntakeLow"),
      fp("riskNoFeverLow"),
      fp("riskNoEvidenceObstructionLow"),
      fp("riskImagingObtainedModerate"),
      fp("riskIvFluidsAdministeredModerate"),
      fp("riskAnalgesiaAdministeredModerate"),
      fp("riskObservationRequiredModerate"),
      fp("riskInfectedStoneConcernHigh"),
      fp("riskObstructingStoneConcernHigh"),
      fp("riskAcuteKidneyInjuryConcernHigh"),
      fp("riskSolitaryKidneyConcernHigh"),
      fp("riskSepsisConcernHigh"),
      fp("riskAdmissionRecommendedHigh"),
      fp("riskUrologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      fp("reasoningMostConsistentRenalColic"),
      fp("reasoningLowSuspicionInfectedObstructingStone"),
      fp("reasoningNoEvidenceSepsis"),
      fp("reasoningRenalFunctionReassuring"),
      fp("reasoningPainControlledAfterTreatment"),
      fp("reasoningImagingNoObstruction"),
      fp("reasoningUrologyConsultHighRiskFeatures"),
    ],
    clinicalImpression: [
      fp("impRenalColic"),
      fp("impUreterolithiasis"),
      fp("impNephrolithiasis"),
      fp("impFlankPain"),
      fp("impPyelonephritis"),
      fp("impUrinaryTractInfection"),
      fp("impObstructingStone"),
    ],
    mdmPlanSummary: [
      fp("planIvFluidsAdministered"),
      fp("planAnalgesiaAdministered"),
      fp("planAntiemeticAdministered"),
      fp("planUrineStrainerProvided"),
      fp("planAlphaBlockerPrescribed"),
      fp("planAntibioticsPrescribed"),
      fp("planUrologyFollowUpRecommended"),
      fp("planReturnPrecautionsDiscussed"),
      fp("planEdReturnAdvisedFeverUncontrolledPain"),
    ],
  };
}

function flankReassessment(fp: (key: string) => string) {
  return {
    reassessment: [
      fp("reassessFlankPainImproved"),
      fp("reassessNauseaImproved"),
      fp("reassessVomitingImproved"),
      fp("reassessPainControlledAfterTreatment"),
      fp("reassessToleratingOralIntake"),
      fp("reassessRemainsHemodynamicallyStable"),
      fp("reassessRepeatAbdominalExamBenign"),
      fp("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [
      fp("dispUrologyFollowUpRecommended"),
      fp("dispPcpFollowUpRecommended"),
      fp("dispReturnFeverVomitingUncontrolledPain"),
      fp("dispReturnPrecautionsDiscussed"),
      fp("dispUrineStrainerInstructionsDiscussed"),
    ],
  };
}

export function buildFlankPainRenalGoldStandardIntel(
  fp: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...onsetTimingHpi(fp),
      ...locationRadiationHpi(fp),
      ...painQualityHpi(fp),
      ...associatedSymptomsHpi(fp),
      ...riskContextHpi(fp),
      ...importantNegativesHpi(fp),
    ],
    ...flankRos(fp),
    physicalExam: flankExam(fp),
    ...flankMdmFull(fp),
    mdmAdmitObserveDischarge: [fp("dispObservation"), fp("dispAdmission"), fp("dispDischarge")],
    ...flankReassessment(fp),
  });
}

export function buildFlankPainComplaintIntel(fp: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildFlankPainRenalGoldStandardIntel(fp);
}

export function buildFlankPainRenalComplaintV1Intel(
  fp: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildFlankPainRenalGoldStandardIntel(fp);
}

export function buildFlankPainComplaintV1GiIntel(fp: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildFlankPainRenalGoldStandardIntel(fp);
}
