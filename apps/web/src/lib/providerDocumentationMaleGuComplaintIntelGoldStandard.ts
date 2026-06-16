/** ME.2P-R Track C — chart-ready male GU complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function guOnsetTimingHpi(m: (key: string) => string): string[] {
  return [
    m("hpiSymptomsBeganToday"),
    m("hpiSymptomsBeganThisMorning"),
    m("hpiSymptomsBeganOvernight"),
    m("hpiSymptomsSeveralDays"),
    m("hpiSuddenOnset"),
    m("hpiGradualOnset"),
    m("hpiIntermittentSymptoms"),
    m("hpiWorseningSymptoms"),
  ];
}

function testicularPainHpi(m: (key: string) => string): string[] {
  return [
    m("hpiTesticularPain"),
    m("hpiRightTesticularPain"),
    m("hpiLeftTesticularPain"),
    m("hpiBilateralTesticularPain"),
    m("hpiSuddenTesticularPain"),
    m("hpiProgressiveTesticularPain"),
    m("hpiScrotalPain"),
    m("hpiScrotalSwelling"),
  ];
}

function penileStiHpi(m: (key: string) => string): string[] {
  return [
    m("hpiPenileDischarge"),
    m("hpiDysuria"),
    m("hpiBurningWithUrination"),
    m("hpiStiExposure"),
    m("hpiNewSexualPartner"),
    m("hpiUnprotectedIntercourse"),
    m("hpiGenitalLesion"),
    m("hpiPenilePain"),
  ];
}

function associatedSymptomsHpi(m: (key: string) => string): string[] {
  return [
    m("hpiFever"),
    m("hpiChills"),
    m("hpiNausea"),
    m("hpiVomiting"),
    m("hpiAbdominalPain"),
    m("hpiFlankPain"),
    m("hpiUrinaryFrequency"),
    m("hpiHematuria"),
    m("hpiRecentTrauma"),
  ];
}

function importantNegativesHpi(m: (key: string) => string): string[] {
  return [
    m("hpiDeniesFever"),
    m("hpiDeniesAbdominalPain"),
    m("hpiDeniesFlankPain"),
    m("hpiDeniesUrinarySymptoms"),
    m("hpiDeniesDischarge"),
    m("hpiDeniesSwelling"),
    m("hpiDeniesTrauma"),
  ];
}

function guRos(m: (key: string) => string) {
  return {
    rosImportantPositives: [
      m("rosTesticularPain"),
      m("rosScrotalSwelling"),
      m("rosPenileDischarge"),
      m("rosDysuria"),
      m("rosUrinaryFrequency"),
      m("rosHematuria"),
      m("rosFever"),
      m("rosChills"),
      m("rosAbdominalPain"),
      m("rosFlankPain"),
      m("rosNausea"),
    ],
    rosImportantNegatives: [
      m("rosDeniesFever"),
      m("rosDeniesDischarge"),
      m("rosDeniesHematuria"),
      m("rosDeniesAbdominalPain"),
      m("rosDeniesFlankPain"),
      m("rosDeniesTrauma"),
    ],
    rosRedFlags: [
      m("rfSevereTesticularPain"),
      m("rfSuddenOnsetTesticularPain"),
      m("rfHighRidingTesticleConcern"),
      m("rfAbsentCremastericReflexConcern"),
      m("rfFeverWithGuSymptoms"),
      m("rfSepsisConcern"),
      m("rfUrinaryRetentionConcern"),
      m("rfTesticularTorsionConcern"),
      m("rfFournierGangreneConcern"),
    ],
  };
}

function guExam(m: (key: string) => string) {
  return {
    general: [
      m("examWellAppearing"),
      m("examUncomfortableAppearing"),
      m("examMildlyIllAppearing"),
      m("examNonToxicAppearing"),
      m("examHemodynamicallyStable"),
      m("examTachycardiaPresent"),
      m("examFebrile"),
      m("examAfebrile"),
    ],
    abdomen: [
      m("examAbdomenSoft"),
      m("examSuprapubicTenderness"),
      m("examLowerAbdominalTenderness"),
      m("examNoGuarding"),
      m("examNoReboundTenderness"),
    ],
    skin: [
      m("examRightTesticularTenderness"),
      m("examLeftTesticularTenderness"),
      m("examBilateralTesticularTenderness"),
      m("examScrotalSwellingPresent"),
      m("examNoScrotalSwelling"),
      m("examPenileDischargePresent"),
      m("examNoPenileDischarge"),
      m("examCremastericReflexIntact"),
      m("examAbsentCremastericReflex"),
      m("examHighRidingTesticle"),
      m("examNormalTesticularLie"),
      m("examEpididymalTenderness"),
      m("examNoEpididymalTenderness"),
    ],
  };
}

function guMdmCannotMissDiff(m: (key: string) => string): string[] {
  return [
    m("diffTesticularTorsion"),
    m("diffFournierGangrene"),
    m("diffTesticularAbscess"),
    m("diffSepsis"),
    m("diffObstructiveUropathy"),
    m("diffAcuteUrinaryRetention"),
  ];
}

function guMdmCommonDiff(m: (key: string) => string): string[] {
  return [
    m("diffEpididymitis"),
    m("diffOrchitis"),
    m("diffSti"),
    m("diffUrethritis"),
    m("diffProstatitis"),
    m("diffHydrocele"),
    m("diffVaricocele"),
    m("diffPyelonephritis"),
    m("diffUrinaryTractInfection"),
    m("diffInguinalHernia"),
    m("diffScrotalTrauma"),
  ];
}

function guMdmFull(m: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      m("waSuspectedEpididymitis"),
      m("waSuspectedOrchitis"),
      m("waSuspectedSti"),
      m("waSuspectedTesticularTorsion"),
      m("waLowSuspicionTorsion"),
      m("waConcernForUrinaryTractInfection"),
      m("waConcernForProstatitis"),
    ],
    mdmDifferentialSynthesis: [...guMdmCommonDiff(m), ...guMdmCannotMissDiff(m)],
    mdmDataReviewed: [
      m("mdmUrinalysisReviewed"),
      m("mdmUrineCultureReviewed"),
      m("mdmGonorrheaChlamydiaTestingReviewed"),
      m("mdmCbcReviewed"),
      m("mdmCmpReviewed"),
      m("mdmScrotalUltrasoundReviewed"),
      m("mdmCtAbdomenPelvisReviewed"),
      m("mdmBloodCulturesReviewed"),
    ],
    mdmRiskStratification: [
      m("riskReassuringExaminationLow"),
      m("riskNormalTesticularLieLow"),
      m("riskLowSuspicionTorsionLow"),
      m("riskHemodynamicallyStableLow"),
      m("riskStiTreatmentAdministeredModerate"),
      m("riskUltrasoundObtainedModerate"),
      m("riskObservationRequiredModerate"),
      m("riskTorsionConcernHigh"),
      m("riskFournierGangreneConcernHigh"),
      m("riskSepsisConcernHigh"),
      m("riskObstructiveUropathyConcernHigh"),
      m("riskAdmissionRecommendedHigh"),
      m("riskUrologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      m("reasoningMostConsistentEpididymitis"),
      m("reasoningMostConsistentUrethritis"),
      m("reasoningLowSuspicionTesticularTorsion"),
      m("reasoningLowSuspicionFournierGangrene"),
      m("reasoningCremastericReflexIntactPresent"),
      m("reasoningUltrasoundReassuring"),
    ],
    clinicalImpression: [
      m("impTesticularPain"),
      m("impEpididymitis"),
      m("impOrchitis"),
      m("impUrethritis"),
      m("impStiExposure"),
      m("impProstatitis"),
      m("impHydrocele"),
      m("impVaricocele"),
    ],
    mdmPlanSummary: [
      m("planAntibioticsPrescribed"),
      m("planEmpiricStiTreatmentAdministered"),
      m("planPainControlProvided"),
      m("planScrotalSupportDiscussed"),
      m("planUrologyFollowUpRecommended"),
      m("planReturnPrecautionsDiscussed"),
      m("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function guReassessment(m: (key: string) => string) {
  return {
    reassessment: [
      m("reassessPainImproved"),
      m("reassessSwellingImproved"),
      m("reassessDysuriaImproved"),
      m("reassessSymptomsImprovedAfterTreatment"),
      m("reassessRemainsHemodynamicallyStable"),
      m("reassessRepeatAbdominalExamBenign"),
      m("reassessNoClinicalDeteriorationObserved"),
    ],
    followUpDisposition: [
      m("dispUrologyFollowUpRecommended"),
      m("dispReturnWorseningPainSwellingFever"),
      m("dispEmergentReturnTorsionSymptoms"),
      m("dispStiPrecautionsDiscussed"),
    ],
  };
}

export function buildMaleGenitalComplaintIntel(
  mg: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...guOnsetTimingHpi(mg),
      ...testicularPainHpi(mg),
      ...penileStiHpi(mg),
      ...associatedSymptomsHpi(mg),
      ...importantNegativesHpi(mg),
    ],
    ...guRos(mg),
    physicalExam: guExam(mg),
    ...guMdmFull(mg),
    mdmAdmitObserveDischarge: [mg("dispObservation"), mg("dispAdmission"), mg("dispDischarge")],
    ...guReassessment(mg),
  });
}

export function buildTesticularPainComplaintV1Intel(
  tp: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ...guOnsetTimingHpi(tp),
      ...testicularPainHpi(tp),
      tp("hpiPriorTorsionHistory"),
      tp("hpiNausea"),
      tp("hpiVomiting"),
      tp("hpiStiExposure"),
      tp("hpiDysuria"),
      ...importantNegativesHpi(tp),
    ],
    ...guRos(tp),
    physicalExam: guExam(tp),
    mdmWorkingAssessment: [
      tp("waSuspectedTesticularTorsion"),
      tp("waLowSuspicionTorsion"),
      tp("waSuspectedEpididymitis"),
      tp("waSuspectedOrchitis"),
    ],
    mdmDifferentialSynthesis: [
      tp("diffEpididymitis"),
      tp("diffOrchitis"),
      tp("diffInguinalHernia"),
      tp("diffHydrocele"),
      tp("diffVaricocele"),
      tp("diffScrotalTrauma"),
      ...guMdmCannotMissDiff(tp),
    ],
    mdmDataReviewed: [
      tp("mdmUrinalysisReviewed"),
      tp("mdmScrotalUltrasoundReviewed"),
      tp("mdmCbcReviewed"),
    ],
    mdmRiskStratification: [
      tp("riskReassuringExaminationLow"),
      tp("riskNormalTesticularLieLow"),
      tp("riskLowSuspicionTorsionLow"),
      tp("riskUltrasoundObtainedModerate"),
      tp("riskTorsionConcernHigh"),
      tp("riskAdmissionRecommendedHigh"),
      tp("riskUrologyConsultationObtainedHigh"),
    ],
    mdmClinicalRationale: [
      tp("reasoningLowSuspicionTesticularTorsion"),
      tp("reasoningCremastericReflexIntactPresent"),
      tp("reasoningUltrasoundReassuring"),
    ],
    clinicalImpression: [tp("impTesticularPain"), tp("impEpididymitis"), tp("impOrchitis")],
    mdmPlanSummary: [
      tp("planPainControlProvided"),
      tp("planAntibioticsPrescribed"),
      tp("planUrologyFollowUpRecommended"),
      tp("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [tp("dispObservation"), tp("dispAdmission"), tp("dispDischarge")],
    ...guReassessment(tp),
  });
}
