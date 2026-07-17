/**
 * Phase 16 (Commit 1) — Toxicology / envenomation chart-ready provider documentation
 * intelligence (gold-standard click-to-insert builders). Four adaptive templates only —
 * no per-drug visible template explosion. Antidotes/MAR, consults, and disposition remain
 * clinician-owned. Forbidden automatic reassurances: medically cleared, toxicity excluded,
 * safe for discharge, no delayed toxicity, no suicidal intent.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export function buildToxicIngestionOverdoseAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSubstanceOrProductReported"),
      d("hpiBrandOrGenericReportedIfKnown"),
      d("hpiFormulationImmediateOrExtendedReleaseReported"),
      d("hpiAmountReportedIfKnown"),
      d("hpiAmountUnknownNotInvented"),
      d("hpiEstimatedMaximumAmountReportedIfKnown"),
      d("hpiRouteReported"),
      d("hpiExposureDateTimeReported"),
      d("hpiFirstSymptomTimeReported"),
      d("hpiIntentIntentionalAccidentalAssaultOrUnknown"),
      d("hpiSingleOrMixedExposureReported"),
      d("hpiCoIngestantsReported"),
      d("hpiBodyWeightReportedIfKnown"),
      d("hpiPregnancyStatusReportedIfApplicable"),
      d("hpiContainerOrLabelAvailableReported"),
      d("hpiVomitingBeforeArrivalReported"),
      d("hpiDecontaminationBeforeArrivalReported"),
      d("hpiPriorTreatmentReported"),
      d("hpiPoisonControlCaseOrReferenceReported"),
      d("hpiPediatricMaxPossibleIngestionReportedIfApplicable"),
      d("hpiDelayedReleaseOrBodyPackerConcernReported"),
      d("hpiWitnessReliabilityReported"),
    ],
    rosImportantPositives: [
      d("rosNauseaOrVomiting"),
      d("rosAlteredMentalStatus"),
      d("rosRespiratoryDepression"),
      d("rosAgitation"),
      d("rosChestPain"),
    ],
    rosImportantNegatives: [d("rosDeniesSeizure"), d("rosDeniesChestPain"), d("rosDeniesSuicidalIntentIfDocumented")],
    rosRedFlags: [
      d("rfRespiratoryDepressionOrHypoxia"),
      d("rfSeizureOrComa"),
      d("rfWideQrsOrQtcProlongationIfReviewed"),
      d("rfHypotensionOrShock"),
      d("rfUnknownOrMixedIngestion"),
      d("rfIntentionalSelfHarmLinkage"),
      d("rfDelayedReleaseConcern"),
      d("rfSerotoninSyndromeOrNmsConcern"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examToxicAppearing"), d("examDiaphoreticOrDrySkinDocumented")],
      neuroPsych: [
        d("examAlertAndOriented"),
        d("examSedatedOrObtunded"),
        d("examAgitated"),
        d("examClonusOrHyperreflexiaDocumentedIfPresent"),
        d("examRigidityDocumentedIfPresent"),
      ],
      heent: [d("examPupilsDocumented"), d("examEyeExposureFindingsIfPresent")],
      respiratory: [d("examRespiratoryEffortDocumented"), d("examOxygenationDocumented")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
      abdomen: [d("examBowelSoundsDocumentedIfRelevant")],
    },
    mdmWorkingAssessment: [
      d("waAcetaminophenExposure"),
      d("waSalicylateToxicityConcern"),
      d("waOpioidOverdose"),
      d("waBenzodiazepineOrSedativeOverdose"),
      d("waCardiovascularAgentToxicityConcern"),
      d("waUnknownIngestion"),
      d("waMixedOverdose"),
      d("waIntentionalOverdoseWithPsychiatricLinkage"),
      d("waPediatricAccidentalIngestion"),
      d("waDelayedReleaseExposureConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAcetaminophenPoisoning"),
      d("diffSalicylateToxicity"),
      d("diffOpioidToxidrome"),
      d("diffSedativeToxidrome"),
      d("diffAnticholinergicToxidrome"),
      d("diffSerotoninSyndrome"),
      d("diffNeurolepticMalignantSyndrome"),
      d("diffToxicAlcoholConcern"),
      d("diffMixedOrUnknownIngestion"),
      d("diffPrimaryPsychiatricCrisisWithoutMedicalToxicity"),
    ],
    mdmDataReviewed: [
      d("mdmEcgQrsQtcReviewedIfObtained"),
      d("mdmAcetaminophenLevelReviewedIfObtained"),
      d("mdmSalicylateLevelReviewedIfObtained"),
      d("mdmEthanolLevelReviewedIfObtained"),
      d("mdmElectrolytesRenalLiverReviewedIfObtained"),
      d("mdmBloodGasLactateReviewedIfObtained"),
      d("mdmGlucoseReviewedIfObtained"),
      d("mdmPregnancyTestReviewedIfObtained"),
      d("mdmUrineDrugScreenReviewedIfObtained"),
      d("mdmPoisonControlRecommendationsDocumentedIfReceived"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskCompletedObservation"),
      d("riskModerateUnknownOrMixedRequiresObservation"),
      d("riskHighIntentionalOrDelayedReleaseOrUnstable"),
    ],
    mdmClinicalRationale: [
      d("reasoningAmountNotInventedWhenUnknown"),
      d("reasoningNoMedicallyClearedStatement"),
      d("reasoningAntidotesRemainMarOwned"),
      d("reasoningPoisonControlAdvisoryOnly"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnModuleDoesNotAutonomouslyDoseAntidoteDecontaminateAdmitOrClear"),
      d("warnIntentionalOverdoseRequiresSuicideRiskAssessment"),
    ],
    clinicalImpression: [
      d("impToxicIngestionOverdose"),
      d("impUnknownOrMixedIngestion"),
      d("impIntentionalOverdoseMedicalStabilizationInProgress"),
    ],
    mdmPlanSummary: [
      d("planSerialVitalsAndMentalStatus"),
      d("planEcgAndLabsAsClinicianSelected"),
      d("planPoisonControlConsultationArrangedIfIndicated"),
      d("planPsychiatricLinkageIfIntentional"),
      d("planReturnPrecautionsIfDischargedAfterObservation"),
      d("planAntidoteAdministeredOnlyIfDocumentedInMar"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [
      d("reassessMentalStatusTrend"),
      d("reassessRespiratoryStatusTrend"),
      d("reassessEcgOrLabTrendIfObtained"),
      d("reassessNoUnsupportedMedicalClearanceLanguage"),
    ],
    followUpDisposition: [
      d("dispPoisonControlFollowUpIfArranged"),
      d("dispPrimaryCareOrToxicologyFollowUp"),
      d("dispReturnForWorseningMentalStatusRespiratoryDepressionOrSeizure"),
    ],
  });
}

export function buildSubstanceIntoxicationWithdrawalAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSubstanceReported"),
      d("hpiRouteReported"),
      d("hpiLastUseTimeReported"),
      d("hpiChronicUseReported"),
      d("hpiPriorWithdrawalSeizureOrDtReported"),
      d("hpiCoIngestantsReported"),
      d("hpiTraumaScreenReported"),
      d("hpiCapacityAndBehavioralContextReported"),
      d("hpiCiwaOrCowsReviewedIfObtained"),
    ],
    rosImportantPositives: [d("rosTremor"), d("rosAgitation"), d("rosNausea"), d("rosDiaphoresis"), d("rosHallucinations")],
    rosImportantNegatives: [d("rosDeniesSeizure"), d("rosDeniesChestPain")],
    rosRedFlags: [
      d("rfWithdrawalDeliriumOrSeizure"),
      d("rfRespiratoryDepressionWithIntoxication"),
      d("rfSevereAgitationOrHyperthermia"),
      d("rfPolysubstanceInstability"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examToxicAppearing"), d("examDiaphoretic")],
      neuroPsych: [d("examAlertAndOriented"), d("examTremulous"), d("examAgitated"), d("examSedated")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
      respiratory: [d("examRespiratoryEffortDocumented")],
    },
    mdmWorkingAssessment: [
      d("waAlcoholIntoxication"),
      d("waAlcoholWithdrawal"),
      d("waOpioidIntoxication"),
      d("waOpioidWithdrawal"),
      d("waStimulantIntoxication"),
      d("waCannabisIntoxication"),
      d("waSedativeWithdrawal"),
      d("waPolysubstanceIntoxication"),
    ],
    mdmDifferentialSynthesis: [
      d("diffIntoxicationVersusWithdrawal"),
      d("diffToxicAlcoholConcern"),
      d("diffIntracranialInjuryWithTrauma"),
      d("diffHypoglycemia"),
      d("diffPrimaryPsychiatricDisease"),
    ],
    mdmDataReviewed: [
      d("mdmGlucoseReviewedIfObtained"),
      d("mdmEthanolLevelReviewedIfObtained"),
      d("mdmElectrolytesReviewedIfObtained"),
      d("mdmCiwaArReviewedIfObtained"),
      d("mdmCowsReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskIsolatedIntoxicationImproving"),
      d("riskHighRiskWithdrawalDeliriumOrSeizure"),
    ],
    mdmClinicalRationale: [
      d("reasoningIntoxicationNotWithdrawalWithoutWithdrawalFindings"),
      d("reasoningScoresDoNotOrderMedicationsOrDisposition"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyDoseOrDispositionFromScore")],
    clinicalImpression: [d("impSubstanceIntoxication"), d("impSubstanceWithdrawal"), d("impPolysubstanceExposure")],
    mdmPlanSummary: [
      d("planSerialMentalStatusAndVitals"),
      d("planSupportiveCareAsDocumented"),
      d("planBehavioralHealthResourcesIfAppropriate"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessMentalStatusTrend"), d("reassessWithdrawalScoreTrendIfDocumented")],
    followUpDisposition: [d("dispSubstanceUseResources"), d("dispReturnForSeizureDeliriumOrRespiratoryDepression")],
  });
}

export function buildInhaledIndustrialToxicExposureAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiToxinOrGasSourceReported"),
      d("hpiEnclosedSpaceReported"),
      d("hpiFireOrSmokeContextReported"),
      d("hpiMultipleVictimsReported"),
      d("hpiOccupationalOrMassExposureReported"),
      d("hpiDurationOfExposureReported"),
      d("hpiSymptomOnsetReported"),
      d("hpiPregnancyStatusReportedIfApplicable"),
      d("hpiPriorTreatmentReported"),
      d("hpiPoisonControlCaseOrReferenceReported"),
    ],
    rosImportantPositives: [d("rosHeadache"), d("rosDizziness"), d("rosDyspnea"), d("rosChestPain"), d("rosConfusion")],
    rosImportantNegatives: [d("rosDeniesSyncope"), d("rosDeniesChestPain")],
    rosRedFlags: [
      d("rfAlteredMentalStatusOrSyncope"),
      d("rfCyanideConcern"),
      d("rfMethemoglobinemiaConcern"),
      d("rfRespiratoryFailureOrAirwayInjury"),
      d("rfPulseOximetryAloneDoesNotExcludeCarbonMonoxide"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examToxicAppearing"), d("examCyanosisDocumentedIfPresent")],
      neuroPsych: [d("examAlertAndOriented"), d("examConfusionPresent")],
      respiratory: [d("examRespiratoryEffortDocumented"), d("examSootOrAirwayFindingsIfPresent")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waCarbonMonoxidePoisoning"),
      d("waCyanideExposureConcern"),
      d("waHydrogenSulfideExposure"),
      d("waSmokeToxicExposure"),
      d("waIrritantGasExposure"),
      d("waMethemoglobinemiaConcern"),
      d("waOccupationalMassExposure"),
    ],
    mdmDifferentialSynthesis: [
      d("diffCarbonMonoxidePoisoning"),
      d("diffCyanideToxicity"),
      d("diffMethemoglobinemia"),
      d("diffSmokeInhalationAirwayInjuryBurnOwnedContext"),
      d("diffSimpleAsphyxiantExposure"),
    ],
    mdmDataReviewed: [
      d("mdmCoOximetryReviewedIfObtained"),
      d("mdmLactateReviewedIfObtained"),
      d("mdmBloodGasReviewedIfObtained"),
      d("mdmMethemoglobinReviewedIfObtained"),
      d("mdmEcgReviewedIfObtained"),
      d("mdmPoisonControlRecommendationsDocumentedIfReceived"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskMildIrritantExposure"),
      d("riskHighRiskConfirmedPoisoningOrAms"),
    ],
    mdmClinicalRationale: [
      d("reasoningPulseOximetryAloneDoesNotExcludeCarbonMonoxide"),
      d("reasoningToxicologyOwnsConfirmedPoisoningEnvironmentalContextReusable"),
      d("reasoningNoAutonomousHyperbaricRecommendation"),
      d("reasoningAntidotesRemainMarOwned"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyOrderHyperbaricOrAntidote")],
    clinicalImpression: [d("impInhaledToxicExposure"), d("impCarbonMonoxidePoisoning"), d("impMethemoglobinemiaConcern")],
    mdmPlanSummary: [
      d("planOxygenOrSupportiveCareAsDocumented"),
      d("planSerialNeurologicAndRespiratoryAssessment"),
      d("planPoisonControlOrToxicologyConsultationIfIndicated"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessMentalStatusTrend"), d("reassessOxygenationTrend")],
    followUpDisposition: [d("dispPoisonControlFollowUpIfArranged"), d("dispReturnForConfusionChestPainOrDyspnea")],
  });
}

export function buildEnvenomationPoisonousExposureAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiExposureTypeSnakeSpiderScorpionMarinePlantMushroomOrPesticide"),
      d("hpiSpeciesIfConfidentlyIdentified"),
      d("hpiPhotoOrSpecimenAvailabilityReported"),
      d("hpiTimeOfExposureReported"),
      d("hpiBodyRegionReported"),
      d("hpiLocalPainSwellingProgressionReported"),
      d("hpiSerialCircumferenceReportedIfMeasured"),
      d("hpiSystemicSymptomsReported"),
      d("hpiPriorFirstAidReported"),
      d("hpiTourniquetCuttingOrSuctionAttemptedReported"),
      d("hpiPoisonControlCaseOrReferenceReported"),
    ],
    rosImportantPositives: [d("rosLocalPain"), d("rosSwelling"), d("rosNausea"), d("rosWeakness"), d("rosBleeding")],
    rosImportantNegatives: [d("rosDeniesDifficultyBreathing"), d("rosDeniesFocalWeakness")],
    rosRedFlags: [
      d("rfSystemicEnvenomationOrCoagulopathy"),
      d("rfNeurotoxicityOrCranialNerveFindings"),
      d("rfRespiratoryCompromise"),
      d("rfCompartmentConcern"),
      d("rfOrganophosphateCholinergicFindings"),
      d("rfDoNotRecommendCuttingSuctionIceOrTightTourniquet"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examToxicAppearing")],
      skin: [d("examBiteOrStingSiteDocumented"), d("examProgressionMarkingsDocumented"), d("examNecrosisDocumentedIfPresent")],
      neuroPsych: [d("examAlertAndOriented"), d("examWeaknessOrCranialNerveFindingsDocumentedIfPresent")],
      musculoskeletal: [d("examCompartmentConcernExamDocumentedIfRelevant")],
      respiratory: [d("examRespiratoryEffortDocumented")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waSnakeEnvenomation"),
      d("waSpiderEnvenomation"),
      d("waScorpionEnvenomation"),
      d("waMarineEnvenomation"),
      d("waMushroomOrPlantToxicity"),
      d("waPesticideOrganophosphateExposure"),
      d("waUnknownVenomousExposure"),
    ],
    mdmDifferentialSynthesis: [
      d("diffVenomousVersusNonvenomousBite"),
      d("diffOrdinaryAnimalBiteOwnershipPreserved"),
      d("diffCellulitisOrNecrotizingInfection"),
      d("diffAllergicReaction"),
      d("diffOrganophosphateToxicity"),
    ],
    mdmDataReviewed: [
      d("mdmCoagulationStudiesReviewedIfObtained"),
      d("mdmCkReviewedIfObtained"),
      d("mdmLabsReviewedIfObtained"),
      d("mdmPoisonControlRecommendationsDocumentedIfReceived"),
      d("mdmAntivenomAdministeredOnlyIfDocumentedInMar"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskLocalOnlyExposure"),
      d("riskHighRiskSystemicEnvenomationOrOrganophosphate"),
    ],
    mdmClinicalRationale: [
      d("reasoningSpeciesIdentificationAloneInsufficient"),
      d("reasoningNoCuttingSuctionIceOrTightTourniquetAdvice"),
      d("reasoningAntivenomRemainsMarOwned"),
      d("reasoningOrdinaryBitesRemainBiteOwned"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyOrderAntivenom")],
    clinicalImpression: [d("impEnvenomation"), d("impPoisonousExposure"), d("impPesticideExposure")],
    mdmPlanSummary: [
      d("planSerialCircumferenceAndSystemicReassessment"),
      d("planWoundCareAsDocumented"),
      d("planPoisonControlOrToxicologyConsultationIfIndicated"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessLocalProgression"), d("reassessSystemicSymptoms")],
    followUpDisposition: [d("dispPoisonControlFollowUpIfArranged"), d("dispReturnForSpreadingSwellingBleedingOrWeakness")],
  });
}
