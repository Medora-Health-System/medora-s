/** ME.2PC-R Track C — chart-ready hematuria complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function onsetTimingHpi(h: (key: string) => string): string[] {
  return [
    h("hpiBloodInUrineBeganToday"),
    h("hpiBloodInUrineBeganThisMorning"),
    h("hpiBloodInUrineBeganOvernight"),
    h("hpiSymptomsSeveralDays"),
    h("hpiSuddenOnsetHematuria"),
    h("hpiIntermittentHematuria"),
    h("hpiRecurrentHematuria"),
    h("hpiWorseningHematuria"),
  ];
}

function hematuriaCharacteristicsHpi(h: (key: string) => string): string[] {
  return [
    h("hpiGrossHematuria"),
    h("hpiMicroscopicHematuria"),
    h("hpiBrightRedBloodInUrine"),
    h("hpiBloodClotsInUrine"),
    h("hpiTerminalHematuria"),
    h("hpiPainlessHematuria"),
    h("hpiPainfulHematuria"),
  ];
}

function associatedUrinaryHpi(h: (key: string) => string): string[] {
  return [
    h("hpiDysuria"),
    h("hpiUrinaryFrequency"),
    h("hpiUrinaryUrgency"),
    h("hpiSuprapubicPain"),
    h("hpiSuprapubicPressure"),
    h("hpiDifficultyUrinating"),
  ];
}

function upperTractHpi(h: (key: string) => string): string[] {
  return [
    h("hpiFlankPain"),
    h("hpiRenalColicSymptoms"),
    h("hpiNausea"),
    h("hpiVomiting"),
    h("hpiFever"),
    h("hpiChills"),
  ];
}

function riskFactorsHpi(h: (key: string) => string): string[] {
  return [
    h("hpiHistoryKidneyStones"),
    h("hpiHistoryRecurrentHematuria"),
    h("hpiAnticoagulantUse"),
    h("hpiSmokingHistory"),
    h("hpiRecentUrinaryProcedure"),
    h("hpiFamilyHistoryUrinaryTractCancer"),
  ];
}

function importantNegativesHpi(h: (key: string) => string): string[] {
  return [
    h("hpiDeniesFlankPain"),
    h("hpiDeniesFever"),
    h("hpiDeniesChills"),
    h("hpiDeniesDysuria"),
    h("hpiDeniesUrinaryRetention"),
    h("hpiDeniesTrauma"),
    h("hpiDeniesAbdominalPain"),
  ];
}

function hematuriaRos(h: (key: string) => string) {
  return {
    rosImportantPositives: [
      h("rosHematuria"),
      h("rosDysuria"),
      h("rosUrinaryFrequency"),
      h("rosUrinaryUrgency"),
      h("rosSuprapubicPain"),
      h("rosFlankPain"),
      h("rosNausea"),
      h("rosVomiting"),
      h("rosFever"),
      h("rosChills"),
    ],
    rosImportantNegatives: [
      h("rosDeniesFever"),
      h("rosDeniesChills"),
      h("rosDeniesDysuria"),
      h("rosDeniesFlankPain"),
      h("rosDeniesUrinaryRetention"),
      h("rosDeniesTrauma"),
    ],
    rosRedFlags: [
      h("rfGrossHematuriaWithClots"),
      h("rfUrinaryRetention"),
      h("rfSevereFlankPain"),
      h("rfFeverWithHematuria"),
      h("rfSepsisConcern"),
      h("rfAnticoagulatedPatient"),
      h("rfUnexplainedPainlessHematuria"),
      h("rfMalignancyConcern"),
    ],
  };
}

function hematuriaExam(h: (key: string) => string) {
  return {
    general: [
      h("examWellAppearing"),
      h("examMildlyIllAppearing"),
      h("examUncomfortableAppearing"),
      h("examNonToxicAppearing"),
      h("examAfebrile"),
      h("examFebrile"),
      h("examHemodynamicallyStable"),
      h("examTachycardiaPresent"),
      h("examAlertAndOriented"),
      h("examNoFocalNeurologicDeficit"),
    ],
    abdomen: [
      h("examAbdomenSoft"),
      h("examSuprapubicTenderness"),
      h("examMildLowerAbdominalTenderness"),
      h("examRightCvaTenderness"),
      h("examLeftCvaTenderness"),
      h("examNoCvaTenderness"),
      h("examNoReboundTenderness"),
      h("examNoGuarding"),
    ],
  };
}

function hematuriaMdmCannotMiss(h: (key: string) => string): string[] {
  return [
    h("diffBladderCancer"),
    h("diffRenalCellCarcinoma"),
    h("diffInfectedObstructingStone"),
    h("diffUrinaryRetentionClotObstruction"),
    h("diffUrosepsis"),
    h("diffAcuteKidneyInjury"),
    h("diffObstructiveUropathy"),
    h("diffRenalAbscess"),
  ];
}

function hematuriaMdmFull(h: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      h("waHematuriaUnclearEtiology"),
      h("waSuspectedNephrolithiasis"),
      h("waSuspectedUrinaryTractInfection"),
      h("waSuspectedAnticoagulantRelatedBleeding"),
      h("waConcernForUrinaryTractMalignancy"),
      h("waConcernForObstructiveUropathy"),
    ],
    mdmDifferentialSynthesis: [
      h("diffUrinaryTractInfection"),
      h("diffStoneDisease"),
      h("diffAnticoagulantRelatedBleeding"),
      h("diffBenignProstaticBleeding"),
      h("diffPyelonephritis"),
      h("diffRenalMass"),
      h("diffBladderMass"),
      ...hematuriaMdmCannotMiss(h),
    ],
    mdmDataReviewed: [
      h("mdmUrinalysisReviewed"),
      h("mdmUrineCultureReviewed"),
      h("mdmCbcReviewed"),
      h("mdmCmpReviewed"),
      h("mdmRenalFunctionReviewed"),
      h("mdmCtAbdomenPelvisReviewed"),
      h("mdmRenalUltrasoundReviewed"),
    ],
    mdmRiskStratification: [
      h("riskReassuringEvaluationLow"),
      h("riskHemodynamicallyStableLow"),
      h("riskNoEvidenceInfectionLow"),
      h("riskImagingObtainedModerate"),
      h("riskAnticoagulatedPatientModerate"),
      h("riskUrologyFollowUpRequiredModerate"),
      h("riskUrinaryRetentionFromClotsHigh"),
      h("riskMalignancyConcernHigh"),
      h("riskObstructiveUropathyConcernHigh"),
      h("riskSepsisConcernHigh"),
      h("riskAdmissionRecommendedHigh"),
      h("riskUrgentUrologyConsultationHigh"),
    ],
    mdmClinicalRationale: [
      h("reasoningMostConsistentNephrolithiasis"),
      h("reasoningLowSuspicionInfection"),
      h("reasoningNoEvidenceSepsis"),
      h("reasoningPainlessHematuriaRequiresMalignancyEvaluation"),
      h("reasoningOutpatientUrologyEvaluationAppropriate"),
    ],
    clinicalImpression: [
      h("impHematuria"),
      h("impGrossHematuria"),
      h("impMicroscopicHematuria"),
      h("impNephrolithiasis"),
      h("impUrinaryTractInfection"),
      h("impAnticoagulantAssociatedHematuria"),
    ],
    mdmPlanSummary: [
      h("planUrinalysisObtained"),
      h("planUrineCultureSent"),
      h("planCtImagingObtained"),
      h("planOralHydrationEncouraged"),
      h("planUrologyFollowUpRecommended"),
      h("planReturnPrecautionsDiscussed"),
      h("planEdReturnAdvisedRetentionFeverWorseningBleeding"),
    ],
  };
}

function hematuriaReassessment(h: (key: string) => string) {
  return {
    reassessment: [
      h("reassessPainImproved"),
      h("reassessNauseaImproved"),
      h("reassessSymptomsImprovedAfterTreatment"),
      h("reassessRemainsHemodynamicallyStable"),
      h("reassessToleratingOralIntake"),
      h("reassessRepeatAbdominalExamBenign"),
      h("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [
      h("dispUrologyFollowUpRecommended"),
      h("dispReturnWorseningBleeding"),
      h("dispReturnUrinaryRetention"),
      h("dispReturnFeverFlankPain"),
      h("dispReturnPrecautionsDiscussed"),
      h("dispPcpFollowUpRecommended"),
    ],
  };
}

export function buildHematuriaComplaintV1Intel(
  h: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...onsetTimingHpi(h),
      ...hematuriaCharacteristicsHpi(h),
      ...associatedUrinaryHpi(h),
      ...upperTractHpi(h),
      ...riskFactorsHpi(h),
      ...importantNegativesHpi(h),
    ],
    ...hematuriaRos(h),
    physicalExam: hematuriaExam(h),
    ...hematuriaMdmFull(h),
    mdmAdmitObserveDischarge: [h("dispObservation"), h("dispAdmission"), h("dispDischarge")],
    ...hematuriaReassessment(h),
  });
}
