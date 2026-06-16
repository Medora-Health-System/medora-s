/** ME.2I-R Track C — chart-ready female pelvic / GYN complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function pelvicOnsetTimingHpi(p: (key: string) => string): string[] {
  return [
    p("hpiPelvicPainBeganToday"),
    p("hpiPelvicPainBeganThisMorning"),
    p("hpiPelvicPainBeganOvernight"),
    p("hpiSymptomsSeveralDays"),
    p("hpiSuddenOnsetPelvicPain"),
    p("hpiGradualOnsetPelvicPain"),
    p("hpiIntermittentPelvicPain"),
    p("hpiWorseningPelvicPain"),
  ];
}

function pelvicPainLocationHpi(p: (key: string) => string): string[] {
  return [
    p("hpiLowerAbdominalPain"),
    p("hpiPelvicPain"),
    p("hpiSuprapubicPain"),
    p("hpiRightSidedPelvicPain"),
    p("hpiLeftSidedPelvicPain"),
    p("hpiCrampingPain"),
    p("hpiSharpPain"),
    p("hpiPressureLikePain"),
  ];
}

function vaginalBleedingHpi(p: (key: string) => string): string[] {
  return [
    p("hpiVaginalBleeding"),
    p("hpiHeavyVaginalBleeding"),
    p("hpiLightVaginalBleeding"),
    p("hpiSpotting"),
    p("hpiPassingClots"),
    p("hpiBleedingAfterIntercourse"),
    p("hpiBleedingAfterMissedPeriod"),
  ];
}

function vaginalDischargeStiHpi(p: (key: string) => string): string[] {
  return [
    p("hpiVaginalDischarge"),
    p("hpiFoulSmellingDischarge"),
    p("hpiPelvicDiscomfort"),
    p("hpiPainWithIntercourse"),
    p("hpiStiExposure"),
    p("hpiNewSexualPartner"),
  ];
}

function pregnancyLmpHpi(p: (key: string) => string): string[] {
  return [
    p("hpiMissedPeriod"),
    p("hpiPossiblePregnancy"),
    p("hpiPositiveHomePregnancyTest"),
    p("hpiLastMenstrualPeriodDocumented"),
    p("hpiPregnancyStatusUnknown"),
    p("hpiPregnancyConcern"),
  ];
}

function associatedSymptomsHpi(p: (key: string) => string): string[] {
  return [
    p("hpiNausea"),
    p("hpiVomiting"),
    p("hpiFever"),
    p("hpiChills"),
    p("hpiDizziness"),
    p("hpiSyncope"),
    p("hpiDysuria"),
    p("hpiUrinaryFrequency"),
    p("hpiFlankPain"),
  ];
}

function importantNegativesHpi(p: (key: string) => string): string[] {
  return [
    p("hpiDeniesFever"),
    p("hpiDeniesVomiting"),
    p("hpiDeniesSyncope"),
    p("hpiDeniesVaginalBleeding"),
    p("hpiDeniesVaginalDischarge"),
    p("hpiDeniesUrinarySymptoms"),
    p("hpiDeniesFlankPain"),
    p("hpiDeniesPregnancyConcern"),
  ];
}

function gynRos(p: (key: string) => string) {
  return {
    rosImportantPositives: [
      p("rosPelvicPain"),
      p("rosVaginalBleeding"),
      p("rosVaginalDischarge"),
      p("rosAbdominalPain"),
      p("rosNausea"),
      p("rosVomiting"),
      p("rosFever"),
      p("rosChills"),
      p("rosDizziness"),
      p("rosSyncope"),
      p("rosDysuria"),
      p("rosUrinaryFrequency"),
      p("rosFlankPain"),
    ],
    rosImportantNegatives: [
      p("rosDeniesFever"),
      p("rosDeniesVomiting"),
      p("rosDeniesSyncope"),
      p("rosDeniesHeavyBleeding"),
      p("rosDeniesVaginalDischarge"),
      p("rosDeniesUrinarySymptoms"),
      p("rosDeniesFlankPain"),
    ],
    rosRedFlags: [
      p("rfSeverePelvicPain"),
      p("rfSyncope"),
      p("rfHypotension"),
      p("rfHeavyVaginalBleeding"),
      p("rfPositivePregnancyTest"),
      p("rfFeverWithPelvicPain"),
      p("rfCervicalMotionTendernessConcern"),
      p("rfSepsisConcern"),
      p("rfEctopicPregnancyConcern"),
      p("rfOvarianTorsionConcern"),
    ],
  };
}

function gynExam(p: (key: string) => string) {
  return {
    general: [
      p("examWellAppearing"),
      p("examUncomfortableAppearing"),
      p("examMildlyIllAppearing"),
      p("examNonToxicAppearing"),
      p("examAppearsPale"),
      p("examHemodynamicallyStable"),
      p("examTachycardiaPresent"),
      p("examDryMucousMembranes"),
      p("examCapillaryRefillNormal"),
    ],
    abdomen: [
      p("examAbdomenSoft"),
      p("examSuprapubicTenderness"),
      p("examRightLowerQuadrantTenderness"),
      p("examLeftLowerQuadrantTenderness"),
      p("examLowerAbdominalTenderness"),
      p("examNoGuarding"),
      p("examNoReboundTenderness"),
      p("examNoPeritonealSigns"),
    ],
    skin: [
      p("examPelvicExamPerformedWithChaperone"),
      p("examPelvicExamDeferred"),
      p("examVaginalBleedingPresent"),
      p("examVaginalDischargePresent"),
      p("examCervicalMotionTendernessPresent"),
      p("examAdnexalTendernessPresent"),
      p("examRightAdnexalTenderness"),
      p("examLeftAdnexalTenderness"),
      p("examCervicalOsClosed"),
      p("examCervicalOsOpen"),
      p("examNoCervicalMotionTenderness"),
      p("examNoAdnexalTenderness"),
    ],
  };
}

function gynMdmCannotMissDiff(p: (key: string) => string): string[] {
  return [
    p("diffEctopicPregnancy"),
    p("diffOvarianTorsion"),
    p("diffTuboOvarianAbscess"),
    p("diffSepticAbortion"),
    p("diffHemorrhagicOvarianCyst"),
    p("diffSevereAnemiaFromBleeding"),
    p("diffSepsis"),
    p("diffAppendicitis"),
  ];
}

function gynMdmCommonDiff(p: (key: string) => string): string[] {
  return [
    p("diffDysmenorrhea"),
    p("diffOvarianCyst"),
    p("diffVaginitis"),
    p("diffCervicitis"),
    p("diffUrinaryTractInfection"),
    p("diffAbnormalUterineBleeding"),
    p("diffPelvicInflammatoryDisease"),
    p("diffPyelonephritis"),
    p("diffMiscarriage"),
  ];
}

function gynMdmFull(p: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      p("waSuspectedPelvicPain"),
      p("waSuspectedAbnormalUterineBleeding"),
      p("waSuspectedVaginitis"),
      p("waSuspectedCervicitis"),
      p("waSuspectedPelvicInflammatoryDisease"),
      p("waLowSuspicionEctopicPregnancy"),
      p("waConcernForEctopicPregnancy"),
      p("waConcernForOvarianTorsion"),
    ],
    mdmDifferentialSynthesis: [...gynMdmCommonDiff(p), ...gynMdmCannotMissDiff(p)],
    mdmDataReviewed: [
      p("mdmPregnancyTestReviewed"),
      p("mdmUrinalysisReviewed"),
      p("mdmCbcReviewed"),
      p("mdmCmpReviewed"),
      p("mdmWetPrepReviewed"),
      p("mdmGonorrheaChlamydiaTestingReviewed"),
      p("mdmPelvicUltrasoundReviewed"),
      p("mdmCtAbdomenPelvisReviewed"),
      p("mdmRhStatusReviewed"),
    ],
    mdmRiskStratification: [
      p("riskReassuringAbdominalExamLow"),
      p("riskHemodynamicallyStableLow"),
      p("riskLowSuspicionEctopicPregnancyLow"),
      p("riskLowSuspicionOvarianTorsionLow"),
      p("riskPelvicUltrasoundObtainedModerate"),
      p("riskStiTreatmentAdministeredModerate"),
      p("riskObservationRequiredModerate"),
      p("riskRepeatExaminationRequiredModerate"),
      p("riskEctopicPregnancyConcernHigh"),
      p("riskOvarianTorsionConcernHigh"),
      p("riskHeavyBleedingConcernHigh"),
      p("riskSepsisConcernHigh"),
      p("riskAdmissionRecommendedHigh"),
      p("riskObGynConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      p("reasoningMostConsistentVaginitis"),
      p("reasoningMostConsistentCervicitis"),
      p("reasoningLowSuspicionEctopicPregnancy"),
      p("reasoningLowSuspicionOvarianTorsion"),
      p("reasoningNoPeritonealSignsOnExamination"),
      p("reasoningPelvicUltrasoundReassuring"),
      p("reasoningHemodynamicallyStableAfterReassessment"),
    ],
    clinicalImpression: [
      p("impPelvicPain"),
      p("impVaginalBleeding"),
      p("impVaginalDischarge"),
      p("impVaginitis"),
      p("impCervicitis"),
      p("impPelvicInflammatoryDisease"),
      p("impAbnormalUterineBleeding"),
      p("impOvarianCyst"),
    ],
    mdmPlanSummary: [
      p("planAntibioticsPrescribed"),
      p("planEmpiricStiTreatmentAdministered"),
      p("planPainControlProvided"),
      p("planAntiemeticAdministered"),
      p("planPelvicRestDiscussed"),
      p("planObGynFollowUpRecommended"),
      p("planReturnPrecautionsDiscussed"),
      p("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function gynReassessment(p: (key: string) => string) {
  return {
    reassessment: [
      p("reassessPelvicPainImproved"),
      p("reassessAbdominalPainImproved"),
      p("reassessNauseaImproved"),
      p("reassessBleedingImproved"),
      p("reassessRemainsHemodynamicallyStable"),
      p("reassessRepeatAbdominalExamBenign"),
      p("reassessNoClinicalDeteriorationObserved"),
      p("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      p("dispObGynFollowUpRecommended"),
      p("dispReturnHeavyBleedingWorseningPainSyncopeFever"),
      p("dispReturnPrecautionsDiscussed"),
    ],
  };
}

export function buildFemalePelvicGynComplaintIntel(
  fg: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...pelvicOnsetTimingHpi(fg),
      ...pelvicPainLocationHpi(fg),
      ...vaginalBleedingHpi(fg),
      ...vaginalDischargeStiHpi(fg),
      ...pregnancyLmpHpi(fg),
      ...associatedSymptomsHpi(fg),
      ...importantNegativesHpi(fg),
    ],
    ...gynRos(fg),
    physicalExam: gynExam(fg),
    ...gynMdmFull(fg),
    mdmAdmitObserveDischarge: [fg("dispObservation"), fg("dispAdmission"), fg("dispDischarge")],
    ...gynReassessment(fg),
  });
}

export function buildPelvicPainComplaintV1Intel(
  pp: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...pelvicOnsetTimingHpi(pp),
      ...pelvicPainLocationHpi(pp),
      ...pregnancyLmpHpi(pp),
      pp("hpiVaginalBleeding"),
      pp("hpiVaginalDischarge"),
      ...associatedSymptomsHpi(pp),
      ...importantNegativesHpi(pp),
    ],
    ...gynRos(pp),
    physicalExam: gynExam(pp),
    mdmWorkingAssessment: [
      pp("waSuspectedPelvicPain"),
      pp("waLowSuspicionEctopicPregnancy"),
      pp("waConcernForEctopicPregnancy"),
      pp("waConcernForOvarianTorsion"),
      pp("waSuspectedPelvicInflammatoryDisease"),
    ],
    mdmDifferentialSynthesis: [
      pp("diffDysmenorrhea"),
      pp("diffOvarianCyst"),
      pp("diffPelvicInflammatoryDisease"),
      pp("diffUrinaryTractInfection"),
      pp("diffPyelonephritis"),
      pp("diffMiscarriage"),
      ...gynMdmCannotMissDiff(pp),
    ],
    mdmDataReviewed: [
      pp("mdmPregnancyTestReviewed"),
      pp("mdmUrinalysisReviewed"),
      pp("mdmCbcReviewed"),
      pp("mdmPelvicUltrasoundReviewed"),
      pp("mdmCtAbdomenPelvisReviewed"),
    ],
    mdmRiskStratification: [
      pp("riskReassuringAbdominalExamLow"),
      pp("riskHemodynamicallyStableLow"),
      pp("riskLowSuspicionEctopicPregnancyLow"),
      pp("riskLowSuspicionOvarianTorsionLow"),
      pp("riskPelvicUltrasoundObtainedModerate"),
      pp("riskObservationRequiredModerate"),
      pp("riskEctopicPregnancyConcernHigh"),
      pp("riskOvarianTorsionConcernHigh"),
      pp("riskSepsisConcernHigh"),
      pp("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      pp("reasoningLowSuspicionEctopicPregnancy"),
      pp("reasoningLowSuspicionOvarianTorsion"),
      pp("reasoningNoPeritonealSignsOnExamination"),
      pp("reasoningPelvicUltrasoundReassuring"),
    ],
    clinicalImpression: [pp("impPelvicPain"), pp("impOvarianCyst"), pp("impPelvicInflammatoryDisease")],
    mdmPlanSummary: [
      pp("planPainControlProvided"),
      pp("planAntibioticsPrescribed"),
      pp("planObGynFollowUpRecommended"),
      pp("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [pp("dispObservation"), pp("dispAdmission"), pp("dispDischarge")],
    ...gynReassessment(pp),
  });
}

export function buildVaginalBleedingComplaintV1Intel(
  vb: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...vaginalBleedingHpi(vb),
      ...pregnancyLmpHpi(vb),
      vb("hpiPelvicPain"),
      vb("hpiDizziness"),
      vb("hpiSyncope"),
      vb("hpiAnticoagulantUse"),
      ...importantNegativesHpi(vb),
    ],
    rosImportantPositives: [
      vb("rosVaginalBleeding"),
      vb("rosPelvicPain"),
      vb("rosAbdominalPain"),
      vb("rosDizziness"),
      vb("rosSyncope"),
      vb("rosNausea"),
    ],
    rosImportantNegatives: [
      vb("rosDeniesHeavyBleeding"),
      vb("rosDeniesSyncope"),
      vb("rosDeniesFever"),
      vb("rosDeniesSeverePain"),
    ],
    rosRedFlags: [
      vb("rfHeavyVaginalBleeding"),
      vb("rfHypotension"),
      vb("rfSyncope"),
      vb("rfPositivePregnancyTest"),
      vb("rfEctopicPregnancyConcern"),
      vb("rfSepsisConcern"),
    ],
    physicalExam: {
      general: [
        vb("examWellAppearing"),
        vb("examAppearsPale"),
        vb("examHemodynamicallyStable"),
        vb("examTachycardiaPresent"),
      ],
      abdomen: [vb("examLowerAbdominalTenderness"), vb("examNoPeritonealSigns")],
      skin: [vb("examVaginalBleedingPresent"), vb("examPelvicExamDeferred"), vb("examPelvicExamPerformedWithChaperone")],
    },
    mdmWorkingAssessment: [
      vb("waSuspectedAbnormalUterineBleeding"),
      vb("waLowSuspicionEctopicPregnancy"),
      vb("waConcernForEctopicPregnancy"),
    ],
    mdmDifferentialSynthesis: [
      vb("diffAbnormalUterineBleeding"),
      vb("diffMiscarriage"),
      vb("diffEctopicPregnancy"),
      vb("diffSepticAbortion"),
      vb("diffHemorrhagicOvarianCyst"),
      vb("diffSevereAnemiaFromBleeding"),
      vb("diffPelvicInflammatoryDisease"),
      vb("diffSepsis"),
    ],
    mdmDataReviewed: [
      vb("mdmPregnancyTestReviewed"),
      vb("mdmCbcReviewed"),
      vb("mdmPelvicUltrasoundReviewed"),
      vb("mdmRhStatusReviewed"),
    ],
    mdmRiskStratification: [
      vb("riskHemodynamicallyStableLow"),
      vb("riskLowSuspicionEctopicPregnancyLow"),
      vb("riskHeavyBleedingConcernHigh"),
      vb("riskEctopicPregnancyConcernHigh"),
      vb("riskAdmissionRecommendedHigh"),
      vb("riskObGynConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      vb("reasoningLowSuspicionEctopicPregnancy"),
      vb("reasoningHemodynamicallyStableAfterReassessment"),
    ],
    clinicalImpression: [vb("impVaginalBleeding"), vb("impAbnormalUterineBleeding"), vb("impMiscarriage")],
    mdmPlanSummary: [
      vb("planPainControlProvided"),
      vb("planObGynFollowUpRecommended"),
      vb("planReturnPrecautionsDiscussed"),
      vb("planEdReturnAdvisedWorseningSymptoms"),
    ],
    mdmAdmitObserveDischarge: [vb("dispObservation"), vb("dispAdmission"), vb("dispDischarge")],
    reassessment: [
      vb("reassessBleedingImproved"),
      vb("reassessRemainsHemodynamicallyStable"),
      vb("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [vb("dispReturnHeavyBleedingWorseningPainSyncopeFever"), vb("dispObGynFollowUpRecommended")],
  });
}

export function buildVaginalDischargeComplaintV1Intel(
  vd: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...vaginalDischargeStiHpi(vd),
      vd("hpiPelvicPain"),
      vd("hpiDysuria"),
      vd("hpiFever"),
      vd("hpiMissedPeriod"),
      vd("hpiPossiblePregnancy"),
      ...importantNegativesHpi(vd),
    ],
    rosImportantPositives: [
      vd("rosVaginalDischarge"),
      vd("rosPelvicPain"),
      vd("rosDysuria"),
      vd("rosFever"),
      vd("rosAbdominalPain"),
    ],
    rosImportantNegatives: [
      vd("rosDeniesFever"),
      vd("rosDeniesHeavyBleeding"),
      vd("rosDeniesUrinarySymptoms"),
    ],
    rosRedFlags: [
      vd("rfSeverePelvicPain"),
      vd("rfFeverWithPelvicPain"),
      vd("rfCervicalMotionTendernessConcern"),
      vd("rfSepsisConcern"),
    ],
    physicalExam: {
      general: [vd("examWellAppearing"), vd("examMildlyIllAppearing"), vd("examNonToxicAppearing")],
      abdomen: [vd("examSuprapubicTenderness"), vd("examNoPeritonealSigns")],
      skin: [
        vd("examVaginalDischargePresent"),
        vd("examCervicalMotionTendernessPresent"),
        vd("examNoCervicalMotionTenderness"),
        vd("examPelvicExamPerformedWithChaperone"),
        vd("examPelvicExamDeferred"),
      ],
    },
    mdmWorkingAssessment: [
      vd("waSuspectedVaginitis"),
      vd("waSuspectedCervicitis"),
      vd("waSuspectedPelvicInflammatoryDisease"),
    ],
    mdmDifferentialSynthesis: [
      vd("diffVaginitis"),
      vd("diffCervicitis"),
      vd("diffPelvicInflammatoryDisease"),
      vd("diffTuboOvarianAbscess"),
      vd("diffUrinaryTractInfection"),
      vd("diffEctopicPregnancy"),
      vd("diffSepsis"),
    ],
    mdmDataReviewed: [
      vd("mdmUrinalysisReviewed"),
      vd("mdmWetPrepReviewed"),
      vd("mdmGonorrheaChlamydiaTestingReviewed"),
      vd("mdmPregnancyTestReviewed"),
    ],
    mdmRiskStratification: [
      vd("riskReassuringAbdominalExamLow"),
      vd("riskStiTreatmentAdministeredModerate"),
      vd("riskObservationRequiredModerate"),
      vd("riskSepsisConcernHigh"),
      vd("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      vd("reasoningMostConsistentVaginitis"),
      vd("reasoningMostConsistentCervicitis"),
      vd("reasoningNoPeritonealSignsOnExamination"),
    ],
    clinicalImpression: [vd("impVaginalDischarge"), vd("impVaginitis"), vd("impCervicitis"), vd("impPelvicInflammatoryDisease")],
    mdmPlanSummary: [
      vd("planAntibioticsPrescribed"),
      vd("planEmpiricStiTreatmentAdministered"),
      vd("planPelvicRestDiscussed"),
      vd("planObGynFollowUpRecommended"),
      vd("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [vd("dispObservation"), vd("dispAdmission"), vd("dispDischarge")],
    reassessment: [
      vd("reassessPelvicPainImproved"),
      vd("reassessSymptomsImprovedAfterTreatment"),
      vd("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [vd("dispReturnHeavyBleedingWorseningPainSyncopeFever"), vd("dispObGynFollowUpRecommended")],
  });
}
