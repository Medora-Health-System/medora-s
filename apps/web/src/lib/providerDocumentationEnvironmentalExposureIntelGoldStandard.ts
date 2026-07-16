/**
 * Phase 15 (Commit 1) — Environmental / Exposure chart-ready provider documentation
 * intelligence (gold-standard click-to-insert builders). Mirrors the Phase 14 dermatology
 * pattern (`buildDermatologicRashAdultV1Intel` / `buildAllergicInflammatoryDermatologyAdultV1Intel`
 * / `buildVesicularBullousSkinDisorderAdultV1Intel` / `buildDermatologicEmergencyAdultV1Intel`
 * in `providerDocumentationDermatologyIntelGoldStandard.ts`): each chief-complaint area gets
 * a single adaptive provider documentation template whose chips are reordered by the
 * matching clinical-intelligence module (`heatEnvironmentalIllnessClinicalIntelligence.ts`,
 * `coldEnvironmentalInjuryClinicalIntelligence.ts`,
 * `submersionElectricalLightningClinicalIntelligence.ts`,
 * `altitudeDivingRadiationExposureClinicalIntelligence.ts`) rather than split into separate
 * visible templates per diagnosis.
 *
 * These builders intentionally do NOT reuse the existing `burn` / `burn_injury_adult_complaint_v1`
 * template or `burnClinicalIntelligence.ts` (those remain unchanged and untouched by this
 * file, and continue to own thermal/chemical/electrical/lightning/frostbite *burn* wound
 * documentation and disposition). This module instead documents the *systemic* physiologic
 * exposure concern (heat illness, hypothermia staging, submersion, electrical/lightning
 * systemic effects, altitude, diving, and radiation exposure) that can accompany or occur
 * without a burn wound.
 *
 * All fragments are click-to-insert only; nothing here is auto-inserted on template apply,
 * nothing auto-documents a negative finding, and nothing establishes a diagnosis, initiates
 * cooling/rewarming, orders oxygen or hyperbaric therapy, admits, transfers, or requests a
 * consult. Core-temperature and altitude/dive-parameter chips are documentation only and are
 * never used to autonomously stage severity (see `environmentalExposureRedFlagEngine.ts`).
 * Ear/sinus barotrauma chips explicitly note that evaluation ownership belongs to ENT.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

/**
 * Heat illness / hyperthermia (adult) — single adaptive provider documentation template
 * covering heat cramps, heat syncope, heat exhaustion, exertional heat illness, classic
 * (nonexertional) heat illness, heat stroke concern, exertional rhabdomyolysis overlap, and
 * dehydration/electrolyte concern. Branch emphasis is not baked into fixed sub-templates;
 * `adaptHeatEnvironmentalIllnessIntel` reorders these same chips by resolved branch and
 * red-flag category. Heat stroke concern requires documented altered mental status,
 * seizure, or coma language in addition to any measured core temperature — a temperature
 * reading alone is documentation only and never autonomously establishes heat stroke.
 */
export function buildHeatEnvironmentalIllnessAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiExposureDurationReported"),
      d("hpiAmbientTemperatureReportedIfKnown"),
      d("hpiExertionalActivityReported"),
      d("hpiHydrationIntakeReported"),
      d("hpiSweatingStatusReported"),
      d("hpiPriorHeatIllnessHistoryReported"),
      d("hpiThermoregulationAffectingMedicationReported"),
      d("hpiAlcoholOrDrugUseReported"),
      d("hpiOutdoorOccupationOrAthleticActivityReported"),
      d("hpiMuscleCrampsReported"),
      d("hpiDizzinessOrSyncopeReported"),
      d("hpiNauseaOrVomitingReported"),
      d("hpiConfusionOrBehaviorChangeReported"),
      d("hpiMeasuredCoreTemperatureReportedIfObtained"),
      d("hpiCoolingStartedBeforeArrivalReported"),
      d("hpiPregnancyStatusReportedIfApplicable"),
      d("hpiPediatricOrGeriatricStatusReported"),
      d("hpiChronicIllnessHistoryReported"),
    ],
    rosImportantPositives: [d("rosHeatExposure"), d("rosSweating"), d("rosMuscleCramps"), d("rosWeakness"), d("rosHeadache")],
    rosImportantNegatives: [d("rosDeniesChestPain"), d("rosDeniesSeizure"), d("rosDeniesFocalWeakness")],
    rosRedFlags: [
      d("rfAlteredMentalStatusOrSeizure"),
      d("rfHotDrySkinReported"),
      d("rfHypotension"),
      d("rfTachycardiaOutOfProportion"),
      d("rfExertionalCollapseWithConfusion"),
      d("rfDarkUrineOrDecreasedUrineOutputConcern"),
    ],
    physicalExam: {
      general: [
        d("examWellAppearing"),
        d("examNonToxicAppearing"),
        d("examToxicAppearing"),
        d("examDiaphoreticSkinPresent"),
        d("examHotDrySkinPresent"),
      ],
      neuroPsych: [
        d("examAlertAndOriented"),
        d("examConfusionPresent"),
        d("examSeizureActivityDocumentedIfWitnessed"),
      ],
      musculoskeletal: [d("examMuscleTendernessOrCrampingDocumented")],
    },
    mdmWorkingAssessment: [
      d("waHeatCramps"),
      d("waHeatSyncope"),
      d("waHeatExhaustion"),
      d("waExertionalHeatIllness"),
      d("waClassicHeatIllness"),
      d("waHeatStrokeConcern"),
      d("waExertionalRhabdomyolysisOverlapConcern"),
      d("waDehydrationElectrolyteConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffHeatCramps"),
      d("diffHeatSyncope"),
      d("diffHeatExhaustion"),
      d("diffHeatStroke"),
      d("diffExertionalRhabdomyolysis"),
      d("diffHyponatremia"),
      d("diffSepsis"),
      d("diffThyroidStorm"),
      d("diffSerotoninSyndromeOrNeurolepticMalignantSyndrome"),
      d("diffSympathomimeticToxicity"),
    ],
    mdmDataReviewed: [
      d("mdmCoreTemperatureReviewedIfMeasured"),
      d("mdmCkReviewedIfObtained"),
      d("mdmElectrolytesReviewedIfObtained"),
      d("mdmRenalFunctionReviewedIfObtained"),
      d("mdmCoagulationStudiesReviewedIfObtained"),
      d("mdmUrinalysisReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskHeatCrampsOrSyncope"),
      d("riskModerateRiskHeatExhaustion"),
      d("riskHighRiskHeatStrokeConcern"),
      d("riskHighRiskRhabdomyolysisMultiorganConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningMeasuredCoreTemperatureAndMentalStatusTogetherGuideAssessment"),
      d("reasoningAlteredMentalStatusOrSeizureRequiredForHeatStrokeConcernTemperatureAloneInsufficient"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnHeatStrokeConcernRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyCoolOrderLabsAdmitTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impHeatCramps"),
      d("impHeatExhaustion"),
      d("impHeatStrokeConcern"),
      d("impExertionalRhabdomyolysisOverlapConcern"),
    ],
    mdmPlanSummary: [
      d("planCoolingMeasuresProvided"),
      d("planFluidRepletionProvided"),
      d("planElectrolyteRepletionProvidedIfIndicated"),
      d("planActivityRestrictionInstructionsGiven"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessMentalStatusUnchangedOrImproved"),
      d("reassessCoreTemperatureTrendImprovedAfterCooling"),
      d("reassessTolerantingOralFluids"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForConfusionSeizurePersistentVomitingOrDarkUrine"),
      d("dispPrimaryCareFollowUpArranged"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}

/**
 * Cold exposure / hypothermia / frostbite (adult) — single adaptive provider
 * documentation template covering mild hypothermia, moderate-severe hypothermia concern,
 * frostnip, superficial frostbite, deep frostbite concern, chilblains/pernio, immersion
 * foot, and cold water exposure. Branch emphasis is not baked into fixed sub-templates;
 * `adaptColdEnvironmentalInjuryIntel` reorders these same chips by resolved branch and
 * red-flag category. Frostbite depth is documentation only and is never autonomously
 * staged from a single exam mention.
 */
export function buildColdEnvironmentalInjuryAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiExposureDurationReported"),
      d("hpiAmbientTemperatureReportedIfKnown"),
      d("hpiWetOrImmersionExposureReported"),
      d("hpiWindExposureReported"),
      d("hpiClothingAdequacyReported"),
      d("hpiShiveringStatusReported"),
      d("hpiAlteredMentalStatusOnsetReported"),
      d("hpiAlcoholOrDrugUseReported"),
      d("hpiPriorColdInjuryHistoryReported"),
      d("hpiDiabetesOrPeripheralVascularDiseaseHistoryReported"),
      d("hpiAffectedBodyPartReported"),
      d("hpiExtremityNumbnessOrPainReported"),
      d("hpiExtremityColorChangeReported"),
      d("hpiRewarmingAttemptedBeforeArrivalReported"),
      d("hpiMeasuredCoreTemperatureReportedIfObtained"),
      d("hpiPediatricOrGeriatricStatusReported"),
      d("hpiProlongedOutdoorExposureReported"),
    ],
    rosImportantPositives: [d("rosShivering"), d("rosExtremityNumbness"), d("rosExtremityPain"), d("rosWeakness")],
    rosImportantNegatives: [d("rosDeniesChestPain"), d("rosDeniesLossOfConsciousness")],
    rosRedFlags: [
      d("rfAlteredMentalStatusWithColdExposure"),
      d("rfAbsentShivering"),
      d("rfCardiacArrhythmiaConcern"),
      d("rfHardOrNonBlanchingSkin"),
      d("rfHemorrhagicBlistersPresent"),
      d("rfDeepTissueInvolvementConcern"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examShiveringPresent"), d("examShiveringAbsent"), d("examLethargicAppearing")],
      skin: [
        d("examSkinColorDocumented"),
        d("examBlisterTypeDocumented"),
        d("examSensationDocumented"),
        d("examCapillaryRefillDocumented"),
        d("examAffectedBodyRegionDocumented"),
      ],
      musculoskeletal: [d("examRangeOfMotionOfAffectedExtremityDocumented")],
    },
    mdmWorkingAssessment: [
      d("waMildHypothermia"),
      d("waModerateSevereHypothermiaConcern"),
      d("waFrostnip"),
      d("waSuperficialFrostbite"),
      d("waDeepFrostbiteConcern"),
      d("waChilblainsPernio"),
      d("waImmersionFoot"),
      d("waColdWaterExposureOther"),
    ],
    mdmDifferentialSynthesis: [
      d("diffHypothermia"),
      d("diffFrostbite"),
      d("diffFrostnip"),
      d("diffChilblains"),
      d("diffImmersionFoot"),
      d("diffCardiacArrhythmia"),
      d("diffSepsisRelatedTemperatureDysregulation"),
      d("diffHypoglycemia"),
      d("diffHypothyroidismMyxedema"),
    ],
    mdmDataReviewed: [
      d("mdmCoreTemperatureReviewedIfMeasured"),
      d("mdmEcgReviewedIfObtained"),
      d("mdmGlucoseReviewedIfObtained"),
      d("mdmElectrolytesReviewedIfObtained"),
      d("mdmCkReviewedIfObtained"),
      d("mdmCoagulationStudiesReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskFrostnipOrMildPeripheralColdInjury"),
      d("riskModerateRiskMildHypothermia"),
      d("riskHighRiskModerateSevereHypothermiaConcern"),
      d("riskHighRiskDeepFrostbiteConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningMeasuredCoreTemperatureAndStagingGuideAssessmentNotAutonomousFromSingleReading"),
      d("reasoningRewarmingRateAndArrhythmiaRiskDocumented"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnModerateSevereHypothermiaOrDeepFrostbiteConcernRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyRewarmOrderLabsAdmitTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impMildHypothermia"),
      d("impFrostnip"),
      d("impSuperficialFrostbite"),
      d("impDeepFrostbiteConcern"),
    ],
    mdmPlanSummary: [
      d("planRewarmingMeasuresProvided"),
      d("planAffectedAreaProtectedAndElevated"),
      d("planAnalgesiaProvided"),
      d("planTetanusStatusUpdated"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessMentalStatusUnchangedOrImproved"),
      d("reassessCoreTemperatureTrendImprovedAfterRewarming"),
      d("reassessSensationOrColorImprovedInAffectedExtremity"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForWorseningNumbnessColorChangeBlisteringOrConfusion"),
      d("dispSurgicalOrPodiatryFollowUpForFrostbiteConcern"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}

/**
 * Submersion / electrical / lightning injury (adult) — single adaptive provider
 * documentation template covering nonfatal drowning, aspiration after submersion, cold
 * water submersion, low-voltage electrical injury, high-voltage electrical injury concern,
 * electrical arc injury, lightning injury concern, cardiac/neuro complication concern, and
 * rhabdomyolysis concern. Branch emphasis is not baked into fixed sub-templates;
 * `adaptSubmersionElectricalLightningIntel` reorders these same chips by resolved branch
 * and red-flag category. Delayed respiratory decompensation after submersion is documented
 * only through serial-reassessment language — "dry drowning" and "secondary drowning" are
 * not medically recognized terms and never appear in this module.
 */
export function buildSubmersionElectricalLightningAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSubmersionDurationReported"),
      d("hpiWaterTemperatureReportedIfKnown"),
      d("hpiRescueAndResuscitationDetailsReported"),
      d("hpiCoughOrRespiratorySymptomsAfterSubmersionReported"),
      d("hpiVoltageSourceAndCircuitTypeReportedIfKnown"),
      d("hpiContactDurationWithElectricalSourceReported"),
      d("hpiEntryExitWoundLocationReported"),
      d("hpiLossOfConsciousnessReported"),
      d("hpiWitnessedCardiacArrestOrArrhythmiaReported"),
      d("hpiLightningStrikeMechanismReported"),
      d("hpiAssociatedFallOrBluntTraumaReported"),
      d("hpiSeizureActivityReported"),
      d("hpiMusclePainReported"),
      d("hpiPriorCardiacHistoryReported"),
      d("hpiPregnancyStatusReportedIfApplicable"),
      d("hpiPediatricOrGeriatricStatusReported"),
    ],
    rosImportantPositives: [d("rosCough"), d("rosShortnessOfBreath"), d("rosChestPain"), d("rosMusclePain"), d("rosNumbness")],
    rosImportantNegatives: [d("rosDeniesLossOfConsciousness"), d("rosDeniesPalpitations"), d("rosDeniesFocalWeakness")],
    rosRedFlags: [
      d("rfRespiratoryFailureAfterSubmersion"),
      d("rfCardiacArrestOrArrhythmia"),
      d("rfAlteredMentalStatusAfterElectricalOrLightningInjury"),
      d("rfHighVoltageExposure"),
      d("rfEntryExitWoundsWithDeepTissueConcern"),
      d("rfAssociatedTraumaConcern"),
      d("rfCompartmentSyndromeConcern"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examRespiratoryDistressPresent"), d("examToxicOrLethargicAppearing")],
      respiratory: [d("examBreathSoundsDocumented"), d("examWorkOfBreathingDocumented"), d("examOxygenSaturationReviewed")],
      cardiovascular: [d("examRhythmDocumented"), d("examPulsesDocumented")],
      skin: [d("examEntryExitWoundDocumented"), d("examBurnDepthDocumented"), d("examFeatheringSkinPatternDocumentedIfPresent")],
      musculoskeletal: [d("examCompartmentFindingsDocumented")],
    },
    mdmWorkingAssessment: [
      d("waNonfatalDrowning"),
      d("waAspirationAfterSubmersion"),
      d("waColdWaterSubmersion"),
      d("waLowVoltageElectricalInjury"),
      d("waHighVoltageElectricalInjuryConcern"),
      d("waElectricalArcInjury"),
      d("waLightningInjuryConcern"),
      d("waCardiacNeuroComplicationConcern"),
      d("waRhabdomyolysisConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAspirationPneumonitis"),
      d("diffPneumonia"),
      d("diffAcuteRespiratoryDistressSyndrome"),
      d("diffCardiacArrhythmia"),
      d("diffElectricalBurn"),
      d("diffRhabdomyolysis"),
      d("diffCompartmentSyndrome"),
      d("diffTraumaticInjuryFromAssociatedFall"),
      d("diffTympanicMembraneRupture"),
      d("diffCardiacContusion"),
    ],
    mdmDataReviewed: [
      d("mdmChestXrayReviewedIfObtained"),
      d("mdmEcgReviewedIfObtained"),
      d("mdmCkReviewedIfObtained"),
      d("mdmTroponinReviewedIfObtained"),
      d("mdmElectrolytesAndRenalFunctionReviewedIfObtained"),
      d("mdmUrinalysisForMyoglobinReviewedIfObtained"),
      d("mdmOxygenSaturationTrendReviewed"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskBriefAsymptomaticSubmersion"),
      d("riskModerateRiskAspirationOrRespiratorySymptoms"),
      d("riskHighRiskHighVoltageLightningOrCardiacNeuroConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningSubmersionDurationAndRespiratorySymptomsGuideAssessment"),
      d("reasoningVoltageAndContactDetailsGuideAssessment"),
      d("reasoningDelayedRespiratoryDecompensationMonitoredBySerialReassessmentNotAnUnprovenLabel"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnHighVoltageLightningWithArrestOrDrowningWithRespiratoryFailureRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderOxygenHyperbaricTherapyAdmitTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impNonfatalDrowning"),
      d("impLowVoltageElectricalInjury"),
      d("impHighVoltageElectricalInjuryConcern"),
      d("impLightningInjuryConcern"),
    ],
    mdmPlanSummary: [
      d("planOxygenAndRespiratorySupportProvidedIfIndicated"),
      d("planWoundCareProvided"),
      d("planCardiacMonitoringProvided"),
      d("planPeriodOfObservationForDelayedRespiratorySymptomsArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessRespiratoryStatusUnchangedOrImproved"),
      d("reassessOxygenSaturationTrendReviewed"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessMentalStatusUnchanged"),
    ],
    followUpDisposition: [
      d("dispReturnForWorseningCoughShortnessOfBreathChestPainOrDarkUrine"),
      d("dispCardiologyOrBurnFollowUpArranged"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}

/**
 * Altitude / diving / radiation exposure (adult) — single adaptive provider documentation
 * template covering acute mountain sickness, high-altitude cerebral edema concern,
 * high-altitude pulmonary edema concern, decompression illness, arterial gas embolism
 * concern, pulmonary barotrauma, ear/sinus barotrauma with ENT overlap, radiation exposure
 * only, radiation injury concern, and occupational mass exposure. Branch emphasis is not
 * baked into fixed sub-templates; `adaptAltitudeDivingRadiationExposureIntel` reorders
 * these same chips by resolved branch and red-flag category. Ear/sinus barotrauma chips
 * explicitly note that evaluation ownership belongs to ENT. Carbon monoxide/smoke mentions
 * are linked only as an exposure source, never as an autonomous toxicology diagnosis.
 */
export function buildAltitudeDivingRadiationExposureAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiAltitudeGainedReported"),
      d("hpiRateOfAscentReported"),
      d("hpiDiveDepthAndBottomTimeReportedIfKnown"),
      d("hpiAscentRateReportedIfKnown"),
      d("hpiTimeSinceSurfacingReported"),
      d("hpiRadiationSourceReportedIfKnown"),
      d("hpiEstimatedExposureDurationReported"),
      d("hpiHeadacheSeverityReported"),
      d("hpiNauseaOrVomitingReported"),
      d("hpiDyspneaAtRestVersusExertionalReported"),
      d("hpiCoughReported"),
      d("hpiJointOrLimbPainAfterAscentReported"),
      d("hpiFocalNeurologicSymptomsReported"),
      d("hpiEarOrSinusPainReported"),
      d("hpiSkinChangesAfterExposureReported"),
      d("hpiPriorAltitudeOrDiveIllnessHistoryReported"),
      d("hpiCarbonMonoxideOrSmokeExposureSourceReported"),
      d("hpiPediatricOrGeriatricStatusReported"),
    ],
    rosImportantPositives: [d("rosHeadache"), d("rosNausea"), d("rosDyspnea"), d("rosJointPain"), d("rosEarPain")],
    rosImportantNegatives: [d("rosDeniesFocalNeurologicSymptoms"), d("rosDeniesChestPain"), d("rosDeniesLossOfConsciousness")],
    rosRedFlags: [
      d("rfAtaxiaOrConfusionAtAltitude"),
      d("rfDyspneaAtRestAtAltitude"),
      d("rfFocalNeurologicSymptomsAfterAscent"),
      d("rfJointOrLimbPainAfterDiveAscent"),
      d("rfLossOfConsciousnessAfterRapidAscent"),
      d("rfHematologicOrGastrointestinalSymptomsAfterRadiationExposure"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examNonToxicAppearing"), d("examToxicOrLethargicAppearing")],
      respiratory: [d("examRespiratoryDistressPresent"), d("examCracklesOrRalesDocumented"), d("examOxygenSaturationReviewed")],
      neuroPsych: [d("examAlertAndOriented"), d("examAtaxiaDocumented"), d("examFocalNeurologicDeficitDocumented")],
      heent: [d("examTympanicMembraneFindingsDocumented"), d("examSinusTendernessDocumented")],
      skin: [d("examSkinChangesAfterExposureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waAcuteMountainSickness"),
      d("waHaceConcern"),
      d("waHapeConcern"),
      d("waDecompressionIllness"),
      d("waArterialGasEmbolismConcern"),
      d("waPulmonaryBarotrauma"),
      d("waEarSinusBarotraumaEntOverlap"),
      d("waRadiationExposureOnly"),
      d("waRadiationInjuryConcern"),
      d("waOccupationalMassExposure"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAcuteMountainSickness"),
      d("diffHighAltitudeCerebralEdema"),
      d("diffHighAltitudePulmonaryEdema"),
      d("diffDecompressionIllness"),
      d("diffArterialGasEmbolism"),
      d("diffPneumothoraxFromBarotrauma"),
      d("diffTympanicMembraneRupture"),
      d("diffAcuteRadiationSyndrome"),
      d("diffCarbonMonoxideExposure"),
      d("diffDehydration"),
    ],
    mdmDataReviewed: [
      d("mdmOxygenSaturationReviewed"),
      d("mdmChestXrayReviewedIfObtained"),
      d("mdmRadiationDosimetryReviewedIfAvailable"),
      d("mdmCompleteBloodCountReviewedIfObtained"),
      d("mdmCarboxyhemoglobinLevelReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskUncomplicatedAcuteMountainSickness"),
      d("riskModerateRiskPulmonaryOrEarSinusBarotrauma"),
      d("riskHighRiskHaceHapeDciOrAgeConcern"),
      d("riskHighRiskRadiationInjuryConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningAltitudeGainedAndAscentRateGuideAssessment"),
      d("reasoningDiveProfileAndSymptomOnsetTimingGuideAssessment"),
      d("reasoningEarSinusBarotraumaEvaluationOwnershipBelongsToEnt"),
      d("reasoningCarbonMonoxideOrSmokeLinkedAsExposureSourceOnlyNotAutonomousToxicologyDiagnosis"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnHaceHapeDciOrAgeConcernRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderHyperbaricTherapyOxygenAdmitTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impAcuteMountainSickness"),
      d("impDecompressionIllnessConcern"),
      d("impPulmonaryBarotrauma"),
      d("impRadiationExposureDocumented"),
    ],
    mdmPlanSummary: [
      d("planDescentOrDecompressionPlanDiscussedWithSpecialtyIfIndicated"),
      d("planEntFollowUpArrangedForBarotrauma"),
      d("planHydrationAndAnalgesiaProvided"),
      d("planRadiationSafetyInstructionsGivenIfIndicated"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessSymptomsUnchangedOrImproved"),
      d("reassessOxygenSaturationTrendReviewed"),
      d("reassessNeurologicExamUnchanged"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForWorseningHeadacheDyspneaOrNeurologicSymptoms"),
      d("dispHyperbaricOrDivingMedicineFollowUpArrangedIfIndicated"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}
