/**
 * Phase 18 (Commit 1) — psychiatric / behavioral / capacity chart-ready provider documentation intelligence
 * (gold-standard click-to-insert builders). Six adaptive templates only — no per-diagnosis
 * visible template explosion. Holds, restraints, medications, capacity, and disposition remain
 * clinician-owned. Forbidden: medical clearance, low suicide risk, not psychotic unless supported,
 * AMA = capacity, refusal = incapacity, auto-normal MSE.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

const sharedMseNeuroPsych = (d: (key: string) => string) => [
  d("mseAppearanceDocumented"),
  d("mseBehaviorDocumented"),
  d("mseSpeechDocumented"),
  d("mseMoodAffectDocumented"),
  d("mseThoughtProcessDocumented"),
  d("mseThoughtContentDocumented"),
  d("msePerceptionDocumented"),
  d("mseCognitionDocumented"),
  d("mseInsightJudgmentDocumented"),
  d("mseNoAutoNormalMseStatement"),
];

export function buildSuicideSelfHarmRiskV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCollateralSourceReportedIfAvailable"),
      d("hpiHistoryReliabilityReported"),
      d("hpiPassiveSuicidalIdeationReported"),
      d("hpiActiveSuicidalIdeationReported"),
      d("hpiSuicidalPlanReportedIfDocumented"),
      d("hpiSuicidalIntentReportedIfDocumented"),
      d("hpiPriorSuicideAttemptReportedIfKnown"),
      d("hpiPriorSelfHarmReportedIfKnown"),
      d("hpiNssiDistinctFromSuicideAttemptUnlessDocumented"),
      d("hpiLethalMeansAccessReportedIfKnown"),
      d("hpiSubstanceUseReportedIfRelevant"),
      d("hpiSleepDisturbanceReported"),
      d("hpiHousingOrSupportsReported"),
      d("hpiCssrsOrMonitoringDocumentedAsPromptOnly"),
    ],
    rosImportantPositives: [
      d("rosSuicidalThoughts"),
      d("rosHopelessness"),
      d("rosInsomnia"),
      d("rosSubstanceUse"),
      d("rosAgitation"),
    ],
    rosImportantNegatives: [d("rosDeniesActivePlan"), d("rosDeniesHomicidalIdeation"), d("rosDeniesPsychosis")],
    rosRedFlags: [
      d("rfActiveSuicidalIntentWithPlanOrMeansHighVisibility"),
      d("rfRecentHighLethalityAttempt"),
      d("rfPassiveSiDistinctFromActiveSi"),
      d("rfNssiNotSuicideAttemptUnlessDocumented"),
      d("rfNoLowSuicideRiskStatement"),
      d("rfNoSafeForDischargeStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examIllAppearing"), d("examDistressedIfPresent")],
      neuroPsych: [
        ...sharedMseNeuroPsych(d),
        d("examSuicidalIdeationOnExamIfDocumented"),
        d("examCooperativeIfDocumented"),
        d("examAgitatedIfPresent"),
      ],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
      skin: [d("examSelfHarmInjuriesDocumentedIfPresent")],
    },
    mdmWorkingAssessment: [
      d("waSuicidalIdeationConcern"),
      d("waSelfHarmConcern"),
      d("waPassiveSuicidalIdeation"),
      d("waActiveSuicidalIdeationWithPlan"),
    ],
    mdmDifferentialSynthesis: [
      d("diffMajorDepressionWithSuicidalIdeation"),
      d("diffAdjustmentDisorderWithDistress"),
      d("diffSubstanceInducedMoodSymptoms"),
      d("diffPersonalityDisorderWithSelfHarm"),
      d("diffMedicalContributorsToDistress"),
    ],
    mdmDataReviewed: [
      d("mdmCssrsReviewedIfCompleted"),
      d("mdmUrineDrugScreenReviewedIfObtained"),
      d("mdmAcetaminophenLevelReviewedIfObtained"),
      d("mdmPregnancyTestReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskDocumentedConcernWithoutAutonomousClassification"),
      d("riskHighAcuitySiPlanOrMeansDocumented"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventFindingsOrRiskLevel"),
      d("reasoningPassiveSiDistinctFromActiveSi"),
      d("reasoningNssiDistinctFromSuicideAttempt"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnModuleDoesNotAutonomouslyClassifySuicideRiskOrClear"),
      d("warnPreservePhase16IntentionalOdToxicologyLinkage"),
    ],
    clinicalImpression: [d("impSuicidalIdeationConcern"), d("impSelfHarmConcern")],
    mdmPlanSummary: [
      d("planSafetyMonitoringAsClinicianSelected"),
      d("planBehavioralHealthConsultationIfArranged"),
      d("planCrisisResourcesDiscussedIfDocumented"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessSiPlanIntentAndMeans"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispBehavioralHealthFollowUp"), d("dispReturnForWorseningSuicidalThoughtsOrSelfHarm")],
  });
}

export function buildPsychosisManiaBehavioralCrisisV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCollateralSourceReportedIfAvailable"),
      d("hpiPsychiatricHistoryReportedIfKnown"),
      d("hpiHallucinationsReportedIfPresent"),
      d("hpiDelusionsReportedIfPresent"),
      d("hpiParanoiaReportedIfPresent"),
      d("hpiManicSymptomsReportedIfPresent"),
      d("hpiAgitationOrBehavioralEscalationReported"),
      d("hpiSubstanceUseReportedIfRelevant"),
      d("hpiMedicationAdherenceReportedIfKnown"),
      d("hpiViolenceHistoryReportedIfKnown"),
    ],
    rosImportantPositives: [
      d("rosHallucinations"),
      d("rosParanoia"),
      d("rosAgitation"),
      d("rosInsomnia"),
      d("rosGrandiosity"),
    ],
    rosImportantNegatives: [d("rosDeniesSuicidalIdeation"), d("rosDeniesHomicidalIdeation")],
    rosRedFlags: [
      d("rfSeverePsychosisImpairingSafety"),
      d("rfSevereManiaDangerousBehavior"),
      d("rfCommandHallucinationsIfReported"),
      d("rfNoNotPsychoticUnlessSupportedStatement"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examAgitatedIfPresent"), d("examDisheveledIfPresent")],
      neuroPsych: [
        ...sharedMseNeuroPsych(d),
        d("examHallucinationsOnExamIfDocumented"),
        d("examPressuredSpeechIfPresent"),
        d("examDisorganizedThoughtProcessIfPresent"),
      ],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waPsychosisConcern"),
      d("waManiaConcern"),
      d("waBehavioralCrisis"),
      d("waAgitationConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffPrimaryPsychoticDisorder"),
      d("diffManiaOrBipolarDisorder"),
      d("diffSubstanceInducedPsychosis"),
      d("diffDeliriumMedicalEmergency"),
      d("diffPersonalityDisorderWithBehavioralDisturbance"),
    ],
    mdmDataReviewed: [
      d("mdmUrineDrugScreenReviewedIfObtained"),
      d("mdmEthanolLevelReviewedIfObtained"),
      d("mdmGlucoseReviewedIfObtained"),
      d("mdmCtHeadReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskDocumentedBehavioralConcernWithoutAutonomousClassification"),
      d("riskHighAcuityPsychosisOrManiaDocumented"),
    ],
    mdmClinicalRationale: [
      d("reasoningNotPsychoticUnlessSupportedByExam"),
      d("reasoningNoAutonomousMedicationSelection"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyDiagnoseOrClear")],
    clinicalImpression: [d("impPsychosisConcern"), d("impBehavioralCrisis")],
    mdmPlanSummary: [
      d("planBehavioralHealthConsultationIfArranged"),
      d("planDeEscalationAsClinicianSelected"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessPsychoticSymptomsAndBehavior"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispBehavioralHealthFollowUp"), d("dispReturnForEscalatingPsychosisOrAgitation")],
  });
}

export function buildDepressionAnxietyTraumaCrisisV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCollateralSourceReportedIfAvailable"),
      d("hpiDepressiveSymptomsReported"),
      d("hpiAnxietySymptomsReported"),
      d("hpiTraumaHistoryOrTriggerReportedIfApplicable"),
      d("hpiPanicSymptomsReportedIfPresent"),
      d("hpiGriefOrRecentLossReportedIfApplicable"),
      d("hpiSleepDisturbanceReported"),
      d("hpiSubstanceUseReportedIfRelevant"),
      d("hpiPassiveSuicidalIdeationReportedIfPresent"),
    ],
    rosImportantPositives: [
      d("rosDepression"),
      d("rosAnxiety"),
      d("rosInsomnia"),
      d("rosNightmares"),
      d("rosPanicSymptoms"),
    ],
    rosImportantNegatives: [d("rosDeniesActiveSuicidalPlan"), d("rosDeniesPsychosis")],
    rosRedFlags: [
      d("rfActiveSuicidalIntentWithPlanOrMeans"),
      d("rfTraumaRelatedDistress"),
      d("rfNoLowSuicideRiskStatement"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examTearfulIfPresent"), d("examAnxiousIfPresent")],
      neuroPsych: [...sharedMseNeuroPsych(d), d("examDepressedAffectIfPresent")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waDepressionConcern"),
      d("waAnxietyConcern"),
      d("waTraumaRelatedDistress"),
      d("waPanicReaction"),
    ],
    mdmDifferentialSynthesis: [
      d("diffMajorDepressiveEpisode"),
      d("diffGeneralizedAnxietyDisorder"),
      d("diffAcuteStressReaction"),
      d("diffPtsd"),
      d("diffMedicalContributorsToMoodSymptoms"),
    ],
    mdmDataReviewed: [
      d("mdmPhq9ReviewedIfCompletedAsPromptOnly"),
      d("mdmGad7ReviewedIfCompletedAsPromptOnly"),
      d("mdmPregnancyTestReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskDocumentedDistressWithoutAutonomousClassification"),
      d("riskSiPlanOrMeansDocumentedIfPresent"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventFindings"),
      d("reasoningNoLowSuicideRiskStatement"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyClassifyRiskOrClear")],
    clinicalImpression: [d("impDepressionConcern"), d("impAnxietyConcern"), d("impTraumaRelatedDistress")],
    mdmPlanSummary: [
      d("planBehavioralHealthReferralIfArranged"),
      d("planCrisisResourcesIfDocumented"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessMoodAndSiStatus"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispBehavioralHealthFollowUp"), d("dispReturnForWorseningMoodOrSuicidalThoughts")],
  });
}

export function buildDeliriumCatatoniaCognitiveBehaviorChangeV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCollateralSourceReportedIfAvailable"),
      d("hpiOnsetAndCourseReported"),
      d("hpiFluctuatingMentalStatusReportedIfPresent"),
      d("hpiFeverOrInfectionReportedIfPresent"),
      d("hpiSubstanceUseOrWithdrawalReportedIfRelevant"),
      d("hpiPriorBaselineCognitionReportedIfKnown"),
      d("hpiCatatonicFeaturesReportedIfPresent"),
    ],
    rosImportantPositives: [
      d("rosConfusion"),
      d("rosFever"),
      d("rosHallucinations"),
      d("rosAgitation"),
      d("rosInattention"),
    ],
    rosImportantNegatives: [d("rosDeniesHeadTrauma"), d("rosDeniesChestPain")],
    rosRedFlags: [
      d("rfDeliriumMedicalEmergencyHighVisibility"),
      d("rfCatatoniaConcern"),
      d("rfDoNotPresumePrimaryPsychiatricIllness"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examIllAppearingIfPresent"), d("examFeverDocumentedIfPresent")],
      neuroPsych: [
        ...sharedMseNeuroPsych(d),
        d("examOrientationDocumented"),
        d("examAttentionDocumented"),
        d("examCatatonicFeaturesDocumentedIfPresent"),
      ],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
      abdomen: [d("examAbdominalExamDocumentedIfPerformed")],
      reassessment: [d("reassessMentalStatusFluctuation")],
    },
    mdmWorkingAssessment: [
      d("waDeliriumConcern"),
      d("waCatatoniaConcern"),
      d("waAcuteCognitiveChange"),
      d("waBehaviorChangeConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffDelirium"),
      d("diffInfectionOrSepsis"),
      d("diffMetabolicEncephalopathy"),
      d("diffIntoxicationOrWithdrawal"),
      d("diffPrimaryPsychiatricPresentationAfterMedicalEvaluation"),
    ],
    mdmDataReviewed: [
      d("mdmGlucoseReviewedIfObtained"),
      d("mdmCbcReviewedIfObtained"),
      d("mdmCmpReviewedIfObtained"),
      d("mdmCtHeadReviewedIfObtained"),
      d("mdmUrinalysisReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskMedicalEmergencyUntilEvaluated"),
      d("riskDocumentedConcernWithoutAutonomousClassification"),
    ],
    mdmClinicalRationale: [
      d("reasoningDeliriumMedicalEmergencyAdvisory"),
      d("reasoningDoNotPresumePsychiatricCause"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnDeliriumRequiresMedicalEvaluationBeforePsychiatricAttribution")],
    clinicalImpression: [d("impDeliriumConcern"), d("impAcuteCognitiveBehaviorChange")],
    mdmPlanSummary: [
      d("planMedicalEvaluationAsClinicianSelected"),
      d("planSerialMentalStatusExam"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessMentalStatusAndContributors"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispMedicalAndBehavioralFollowUp"), d("dispReturnForWorseningConfusionOrAgitation")],
  });
}

export function buildPediatricDevelopmentalBehavioralEmergencyV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCaregiverCollateralReported"),
      d("hpiDevelopmentalBaselineReportedIfKnown"),
      d("hpiAutismOrNeurodivergenceReportedIfApplicable"),
      d("hpiAdhdOrImpulsivityReportedIfApplicable"),
      d("hpiBehavioralEscalationReported"),
      d("hpiSafeguardingConcernReportedIfApplicable"),
      d("hpiSuicidalIdeationInYouthReportedIfPresent"),
      d("hpiSchoolOrPlacementStressorsReportedIfKnown"),
    ],
    rosImportantPositives: [
      d("rosAgitation"),
      d("rosAggression"),
      d("rosInsomnia"),
      d("rosSuicidalThoughts"),
      d("rosBehaviorChange"),
    ],
    rosImportantNegatives: [d("rosDeniesFever"), d("rosDeniesHeadTrauma")],
    rosRedFlags: [
      d("rfSafeguardingConcern"),
      d("rfYouthSuicidalIdeationWithPlan"),
      d("rfNoLowSuicideRiskStatement"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examAgitatedIfPresent"), d("examDistressedIfPresent")],
      neuroPsych: [...sharedMseNeuroPsych(d), d("examDevelopmentallyAppropriateInteractionDocumented")],
      skin: [d("examInjuriesFromBehaviorDocumentedIfPresent")],
    },
    mdmWorkingAssessment: [
      d("waPediatricBehavioralEmergency"),
      d("waDevelopmentalBehavioralDecompensation"),
      d("waSafeguardingConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAutismRelatedDistress"),
      d("diffAdhdRelatedImpulsivity"),
      d("diffAdjustmentDisorder"),
      d("diffMedicalContributorsInYouth"),
      d("diffAbuseOrNeglectConcern"),
    ],
    mdmDataReviewed: [d("mdmGlucoseReviewedIfObtained"), d("mdmPregnancyTestReviewedIfApplicableInAdolescent")],
    mdmRiskStratification: [
      d("riskDocumentedConcernWithoutAutonomousClassification"),
      d("riskSafeguardingOrSiPlanDocumentedIfPresent"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventDevelopmentalHistory"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyDetermineCapacityOrHold")],
    clinicalImpression: [d("impPediatricBehavioralEmergency"), d("impSafeguardingConcernIfApplicable")],
    mdmPlanSummary: [
      d("planCaregiverCounselingIfDocumented"),
      d("planSafeguardingReportIfArranged"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessBehaviorAndSafety"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispPediatricBehavioralFollowUp"), d("dispReturnForEscalatingBehaviorOrSuicidalThoughts")],
  });
}

export function buildCapacityRefusalSafetyDispositionV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPresentingConcernInPatientOwnWords"),
      d("hpiCollateralSourceReportedIfAvailable"),
      d("hpiRefusalOfCareReportedIfPresent"),
      d("hpiAmaDiscussionReportedIfPresent"),
      d("hpiCapacityAssessmentElementsReportedIfDocumented"),
      d("hpiLegalStatusReportedIfKnown"),
      d("hpiSafetyConcernsReported"),
      d("hpiHousingOrSupportsReported"),
    ],
    rosImportantPositives: [
      d("rosSuicidalThoughts"),
      d("rosHomicidalThoughts"),
      d("rosAgitation"),
      d("rosConfusion"),
    ],
    rosImportantNegatives: [d("rosDeniesSuicidalPlanIfDocumented")],
    rosRedFlags: [
      d("rfRefusalNotIncapacity"),
      d("rfAmaFormNotCapacityDetermination"),
      d("rfActiveSuicidalIntentWithPlanOrMeans"),
      d("rfNoHasOrLacksCapacityStatement"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examAgitatedIfPresent")],
      neuroPsych: [
        ...sharedMseNeuroPsych(d),
        d("examCapacityElementsDocumentedIfAssessed"),
        d("examDecisionSpecificCapacityDocumented"),
      ],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waRefusalOfCare"),
      d("waCapacityAssessmentConcern"),
      d("waAmaDiscussion"),
      d("waSafetyDispositionPlanning"),
    ],
    mdmDifferentialSynthesis: [
      d("diffDecisionSpecificCapacityQuestion"),
      d("diffPsychiatricImpairmentAffectingDecisions"),
      d("diffDeliriumAffectingCapacity"),
      d("diffIntoxicationAffectingCapacity"),
    ],
    mdmDataReviewed: [d("mdmAmaFormCompletedIfDocumented"), d("mdmLegalHoldDocumentationReviewedIfPresent")],
    mdmRiskStratification: [
      d("riskDocumentedConcernWithoutAutonomousCapacityDetermination"),
      d("riskHighAcuitySafetyConcernDocumented"),
    ],
    mdmClinicalRationale: [
      d("reasoningRefusalNotIncapacity"),
      d("reasoningAmaNotCapacityDetermination"),
      d("reasoningDecisionSpecificCapacityOnly"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyDetermineCapacityOrHold")],
    clinicalImpression: [d("impRefusalOrCapacityConcern"), d("impSafetyDispositionPlanning")],
    mdmPlanSummary: [
      d("planSharedDecisionMakingDocumentedIfPerformed"),
      d("planBehavioralHealthConsultationIfArranged"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessCapacityElementsIfReassessed"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispBehavioralHealthFollowUp"), d("dispReturnForEscalatingSafetyConcerns")],
  });
}
