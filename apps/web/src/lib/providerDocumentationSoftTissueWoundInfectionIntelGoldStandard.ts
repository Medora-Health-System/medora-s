/**
 * Phase 13 — Soft Tissue and Wound Infection chart-ready provider documentation
 * intelligence (gold-standard click-to-insert builders). Mirrors the Phase 12 ENT pattern
 * (`buildEntEarHearingVertigoAdultV1Intel` / `buildEntNoseEpistaxisAdultV1Intel` /
 * `buildEntThroatNeckAirwayAdultV1Intel` in
 * `providerDocumentationEntEmergencyComplaintIntelGoldStandard.ts`): each chief-complaint
 * area gets a single adaptive provider documentation template whose chips are reordered by
 * the matching clinical-intelligence module (`softTissueInfectionClinicalIntelligence.ts`,
 * `abscessPurulentInfectionClinicalIntelligence.ts`,
 * `highRiskWoundInfectionClinicalIntelligence.ts`) rather than split into separate visible
 * templates per diagnosis.
 *
 * These builders intentionally do NOT reuse the mechanical-trauma bundle
 * (`buildMskTraumaV1Intel` / `buildTraumaBundle`) because soft tissue and wound infections
 * are largely non-mechanical/infectious concerns — pulling in trauma-specific cannot-miss
 * items (compartment syndrome, solid organ injury, cervical spine fracture) would be
 * clinically inaccurate. Instead each builder assembles its own infection-appropriate
 * ROS/MDM stack, following the same literal-bundle pattern already used for
 * `CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL` / `ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL`
 * / `WOUND_INFECTION_COMPLAINT_V1_INTEL` in
 * `providerDocumentationRashSkinComplaintIntelGoldStandard.ts` (those three static
 * templates remain unchanged and untouched by this file).
 *
 * All fragments are click-to-insert only; nothing here is auto-inserted on template apply,
 * nothing auto-documents a negative finding, and nothing establishes a diagnosis, starts a
 * treatment, performs incision and drainage, admits, transfers, or requests a consult.
 * Kanavel-sign, LRINEC, and ultrasound-collection chips are explicitly labeled
 * documentation-only (see `softTissueWoundInfectionRedFlagEngine.ts`). Sepsis-specific
 * scoring/management is intentionally not duplicated here — see the dedicated sepsis
 * screening workflow (`packages/shared/src/clinicalDocumentation/sepsisMonitoringDocumentationPayloads.ts`);
 * chips below only note that a systemic-toxicity/sepsis concern was flagged.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

/**
 * Cellulitis / soft tissue infection (adult) — single adaptive provider documentation
 * template covering nonpurulent cellulitis, erysipelas, lymphangitis, infected wound,
 * infected ulcer, postoperative cellulitis, diabetic foot infection concern, pressure
 * injury infection concern, immunocompromised infection, systemic infection concern, and
 * necrotizing infection concern. Branch emphasis is not baked into fixed sub-templates;
 * `adaptSoftTissueInfectionIntel` reorders these same chips by resolved branch and
 * red-flag category. LRINEC documentation chips are explicitly labeled documentation-only
 * and never resolve to an automated rule-out of necrotizing infection.
 */
export function buildSoftTissueInfectionAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSkinRednessOnset"),
      d("hpiRapidlySpreadingRednessReported"),
      d("hpiWarmthAndSwellingReported"),
      d("hpiPainSeverityReported"),
      d("hpiPainOutOfProportionToAppearanceReported"),
      d("hpiFeverChillsReported"),
      d("hpiRecentSkinBreakOrTraumaReported"),
      d("hpiRecentSurgeryAtSiteReported"),
      d("hpiKnownDiabetesReported"),
      d("hpiKnownPeripheralVascularDiseaseReported"),
      d("hpiImmunocompromisedStatusReported"),
      d("hpiChronicWoundOrUlcerHistoryReported"),
      d("hpiPressureInjuryHistoryReported"),
      d("hpiLymphedemaOrPriorCellulitisReported"),
      d("hpiRedStreakingTowardTrunkReported"),
      d("hpiRapidProgressionOverHoursReported"),
      d("hpiDeniesPurulentDrainageReported"),
    ],
    rosImportantPositives: [d("rosSkinRedness"), d("rosSwelling"), d("rosWarmth"), d("rosFever"), d("rosChills"), d("rosPainAtSite")],
    rosImportantNegatives: [d("rosDeniesPurulentDrainage"), d("rosDeniesSystemicToxicity"), d("rosDeniesChestPain")],
    rosRedFlags: [
      d("rfPainOutOfProportionToExam"),
      d("rfRapidlyProgressiveErythema"),
      d("rfSkinNecrosisOrBullaePresent"),
      d("rfCrepitusPresent"),
      d("rfHypotension"),
      d("rfAlteredMentalStatus"),
      d("rfDiabeticFootLimbThreat"),
      d("rfImmunocompromisedWithSkinInfection"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examNonToxicAppearing"), d("examToxicAppearing"), d("examFebrile"), d("examHemodynamicallyStable")],
      skin: [
        d("examErythemaBorderMarkedAndDimensionsMeasured"),
        d("examWarmthPresent"),
        d("examIndurationPresent"),
        d("examTendernessToPalpation"),
        d("examNoFluctuance"),
        d("examNoCrepitus"),
        d("examNoSkinNecrosisOrBullae"),
        d("examLymphangiticStreakingPresent"),
        d("examBilateralComparisonDocumented"),
      ],
      musculoskeletal: [d("examDiabeticFootPulsesAndSensationDocumented"), d("examProbeToBoneTestPerformedAndResultDocumented")],
    },
    mdmWorkingAssessment: [
      d("waSuspectedNonpurulentCellulitis"),
      d("waSuspectedErysipelas"),
      d("waLymphangiticSpreadConcern"),
      d("waPostoperativeSurgicalSiteInfectionConcern"),
      d("waDiabeticFootInfectionConcern"),
      d("waPressureInjuryInfectionConcern"),
      d("waLowSuspicionNecrotizingInfection"),
      d("waConcernForNecrotizingInfection"),
      d("waConcernForSystemicToxicitySepsis"),
    ],
    mdmDifferentialSynthesis: [
      d("diffNonpurulentCellulitis"),
      d("diffErysipelas"),
      d("diffLymphangitis"),
      d("diffInfectedWound"),
      d("diffInfectedUlcer"),
      d("diffDeepVeinThrombosis"),
      d("diffContactDermatitis"),
      d("diffDiabeticFootInfection"),
      d("diffPressureInjuryInfection"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffSepsis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewedIfObtained"),
      d("mdmCmpReviewedIfObtained"),
      d("mdmLactateReviewedIfObtained"),
      d("mdmBloodCultureReviewedIfObtained"),
      d("mdmWoundCultureReviewedIfObtained"),
      d("mdmPointOfCareUltrasoundFindingsReviewedNotAutoInterpreted"),
      d("mdmXrayReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskLocalizedCellulitis"),
      d("riskModerateRiskLymphangiticSpreadOrComorbidities"),
      d("riskHighRiskDiabeticFootLimbThreat"),
      d("riskHighRiskNecrotizingInfectionConcern"),
      d("riskHighRiskSystemicToxicitySepsis"),
    ],
    mdmClinicalRationale: [
      d("reasoningErythemaMarginsAndProgressionGuideAssessment"),
      d("reasoningPainOutOfProportionRaisesNecrotizingConcern"),
      d("reasoningLrinecDocumentationOnlyNeverAutomatedRuleOut"),
      d("reasoningSystemicToxicityFlaggedPerRedFlagScreeningSepsisManagedSeparately"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnNecrotizingInfectionConcernRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderAntibioticsIAndDAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impNonpurulentCellulitis"),
      d("impErysipelas"),
      d("impLymphangitis"),
      d("impInfectedWound"),
      d("impInfectedUlcer"),
      d("impDiabeticFootInfectionConcern"),
    ],
    mdmPlanSummary: [
      d("planAntibioticsPrescribed"),
      d("planWoundCareProvided"),
      d("planElevationAndMarginsMarkedForIntervalComparison"),
      d("planSurgicalOrPodiatryFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessErythemaMarginsUnchangedOrImproved"),
      d("reassessPainImprovedAfterTreatment"),
      d("reassessNoIntervalProgressionOfErythema"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForSpreadingRednessFeverOrPain"),
      d("dispUrgentSurgicalEvaluationIfWorsening"),
      d("dispPodiatryFollowUpForDiabeticFootConcern"),
    ],
  });
}

/**
 * Abscess / purulent skin infection (adult) — single adaptive provider documentation
 * template covering cutaneous abscess, furuncle, carbuncle, felon, paronychia, pilonidal
 * abscess, hidradenitis-related abscess, postoperative abscess, perianal overlap, and deep
 * collection concern. Branch emphasis is not baked into fixed sub-templates;
 * `adaptAbscessPurulentInfectionIntel` reorders these same chips by resolved branch and
 * red-flag category. Herpetic whitlow chips explicitly document that incision and drainage
 * is not indicated for a vesicular viral lesion.
 */
export function buildAbscessPurulentInfectionAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSwellingOnset"),
      d("hpiFluctuantSwellingReported"),
      d("hpiPurulentDrainageReported"),
      d("hpiPainSeverityReported"),
      d("hpiPriorAbscessAtSiteReported"),
      d("hpiRecentShavingOrFollicleTraumaReported"),
      d("hpiMultipleConnectedBoilsReported"),
      d("hpiFingertipPainAndSwellingReported"),
      d("hpiNailFoldRednessReported"),
      d("hpiSacrococcygealSwellingReported"),
      d("hpiRecurrentBoilsInSkinFoldsReported"),
      d("hpiRecentSurgicalSiteSwellingReported"),
      d("hpiPerianalSwellingReported"),
      d("hpiFeverReported"),
      d("hpiDiabetesReported"),
      d("hpiImmunocompromisedReported"),
      d("hpiVesicularLesionsOnFingerReported"),
    ],
    rosImportantPositives: [d("rosSwelling"), d("rosPain"), d("rosDrainage"), d("rosFever"), d("rosRedness")],
    rosImportantNegatives: [d("rosDeniesSpreadingRedness"), d("rosDeniesSystemicSymptoms"), d("rosDeniesVesicularRash")],
    rosRedFlags: [
      d("rfNecrotizingConcern"),
      d("rfDeepSpaceExtensionConcern"),
      d("rfSeverePain"),
      d("rfHighFever"),
      d("rfHypotension"),
      d("rfImmunocompromised"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examNonToxicAppearing"), d("examToxicAppearing")],
      skin: [
        d("examFluctuanceDimensionsMeasured"),
        d("examSurroundingErythemaMeasured"),
        d("examPurulentDrainagePresent"),
        d("examIndurationPresent"),
        d("examNoCrepitus"),
        d("examVesicularLesionsConsistentWithHerpeticWhitlow"),
        d("examNoFluctuanceVesicularPatternOnly"),
      ],
      musculoskeletal: [
        d("examFingertipPulpSwellingConsistentWithFelon"),
        d("examKanavelSignsDocumentedNotAutomatedDiagnosis"),
        d("examParonychialFoldErythemaPresent"),
        d("examPilonidalSinusOpeningPresent"),
        d("examPerianalFluctuancePresent"),
      ],
    },
    mdmWorkingAssessment: [
      d("waSuspectedCutaneousAbscess"),
      d("waFurunculosis"),
      d("waCarbuncle"),
      d("waFelon"),
      d("waParonychia"),
      d("waPilonidalAbscess"),
      d("waHidradenitisRelatedAbscess"),
      d("waPostoperativeAbscess"),
      d("waPerianalAbscessConcern"),
      d("waDeepSpaceCollectionConcern"),
      d("waHerpeticWhitlowConcernNoDrainageIndicated"),
    ],
    mdmDifferentialSynthesis: [
      d("diffCutaneousAbscess"),
      d("diffFuruncle"),
      d("diffCarbuncle"),
      d("diffFelon"),
      d("diffParonychia"),
      d("diffPilonidalAbscess"),
      d("diffHidradenitisSuppurativa"),
      d("diffPerianalAbscessOrFistula"),
      d("diffHerpeticWhitlow"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffSepsis"),
    ],
    mdmDataReviewed: [
      d("mdmPointOfCareUltrasoundForFluidCollectionReviewedNotAutoInterpreted"),
      d("mdmCbcReviewedIfObtained"),
      d("mdmWoundCultureReviewedIfObtained"),
      d("mdmGlucoseReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskSimpleSuperficialAbscessLow"),
      d("riskRecurrentOrMultifocalModerate"),
      d("riskDeepSpaceOrPerianalHigh"),
      d("riskImmunocompromisedOrSystemicToxicityHigh"),
    ],
    mdmClinicalRationale: [
      d("reasoningFluctuanceAndDrainagePatternGuideAssessment"),
      d("reasoningVesicularPatternDistinctFromFluctuantAbscess"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnHerpeticWhitlowIncisionAndDrainageNotIndicatedAndNotAutonomouslySuggested"),
      d("warnModuleDoesNotAutonomouslyOrderAntibioticsIAndDAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impCutaneousAbscess"),
      d("impFurunculosis"),
      d("impCarbuncle"),
      d("impFelon"),
      d("impParonychia"),
      d("impPilonidalAbscess"),
      d("impHidradenitisRelatedAbscess"),
    ],
    mdmPlanSummary: [
      d("planIncisionAndDrainagePerformed"),
      d("planPackingPlaced"),
      d("planAntibioticsPrescribed"),
      d("planWoundCareProvided"),
      d("planSurgicalFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessDrainageAndPainImprovedAfterProcedure"),
      d("reassessSwellingImprovedAfterTreatment"),
      d("reassessRemainsAfebrile"),
    ],
    followUpDisposition: [
      d("dispReturnForSpreadingRednessFeverOrWorseningPain"),
      d("dispWoundCheckFollowUpArranged"),
      d("dispSurgicalFollowUpForRecurrentOrComplexAbscess"),
    ],
  });
}

/**
 * High-risk wound / deep soft tissue infection (adult) — single adaptive provider
 * documentation template covering infected traumatic wound, deep space hand infection,
 * infectious flexor tenosynovitis, necrotizing infection, pyomyositis, gas-forming
 * infection, postoperative wound complication, wound dehiscence, diabetic ischemic ulcer
 * infection, water/farm contamination, foreign-body-associated infection, and
 * osteomyelitis/septic joint concern. Branch emphasis is not baked into fixed
 * sub-templates; `adaptHighRiskWoundInfectionIntel` reorders these same chips by resolved
 * branch and red-flag category. Includes explicit Kanavel-sign, LRINEC, and
 * point-of-care-ultrasound documentation-only labeling, and a dehiscence/evisceration
 * bedside-safety warning.
 */
export function buildHighRiskWoundInfectionAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiWoundMechanismReported"),
      d("hpiTimeSinceInjuryReported"),
      d("hpiFreshwaterOrSaltwaterExposureReported"),
      d("hpiFarmOrSoilExposureReported"),
      d("hpiRustyOrOrganicForeignBodyConcernReported"),
      d("hpiRecentSurgeryAtWoundSiteReported"),
      d("hpiWoundEdgesSeparatingReported"),
      d("hpiAbdominalWoundOpeningReported"),
      d("hpiFingerHeldInFlexionReported"),
      d("hpiPainWithPassiveFingerExtensionReported"),
      d("hpiDiabeticFootUlcerHistoryReported"),
      d("hpiPeripheralArterialDiseaseHistoryReported"),
      d("hpiRapidlyProgressiveMuscleOrLimbPainReported"),
      d("hpiPainOutOfProportionToExamReported"),
      d("hpiSystemicToxicityReported"),
      d("hpiPriorOsteomyelitisOrJointInfectionReported"),
      d("hpiFeverChillsReported"),
    ],
    rosImportantPositives: [d("rosWoundPain"), d("rosDrainage"), d("rosSwelling"), d("rosFever"), d("rosLimbPain")],
    rosImportantNegatives: [d("rosDeniesNumbnessOrParesthesia"), d("rosDeniesSystemicSymptoms")],
    rosRedFlags: [
      d("rfPainOutOfProportionToExam"),
      d("rfCrepitusPresent"),
      d("rfRapidlyProgressiveSwelling"),
      d("rfSkinNecrosisOrBullaePresent"),
      d("rfHypotension"),
      d("rfAlteredMentalStatus"),
      d("rfWoundDehiscenceWithEvisceration"),
      d("rfKanavelSignsPresent"),
      d("rfProbeToBonePositive"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examToxicAppearing"), d("examHemodynamicallyStable"), d("examHemodynamicInstabilityPresent")],
      skin: [
        d("examWoundEdgesAndDepthDocumented"),
        d("examSurroundingErythemaMeasured"),
        d("examCrepitusPresent"),
        d("examSkinNecrosisOrBullaePresent"),
        d("examPurulentOrMalodorousDrainagePresent"),
        d("examWoundDehiscenceWithFasciaOrBowelVisible"),
        d("examRetainedForeignBodySuspectedOnExam"),
      ],
      musculoskeletal: [
        d("examKanavelSignsDocumentedNotAutomatedDiagnosis"),
        d("examDiabeticFootPulsesAndSensationDocumented"),
        d("examProbeToBoneTestPerformedAndResultDocumented"),
        d("examPointOfCareUltrasoundFindingsDocumentedNotAutoInterpreted"),
        d("examJointEffusionOrRestrictedRangeOfMotionPresent"),
      ],
    },
    mdmWorkingAssessment: [
      d("waInfectedTraumaticWound"),
      d("waDeepSpaceHandInfectionConcern"),
      d("waInfectiousFlexorTenosynovitisConcern"),
      d("waConcernForNecrotizingSoftTissueInfection"),
      d("waPyomyositisConcern"),
      d("waGasFormingInfectionConcern"),
      d("waPostoperativeWoundComplication"),
      d("waWoundDehiscenceConcern"),
      d("waDiabeticIschemicUlcerInfectionConcern"),
      d("waWaterOrFarmContaminatedWoundConcern"),
      d("waRetainedForeignBodyAssociatedInfectionConcern"),
      d("waOsteomyelitisOrSepticJointConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffInfectedTraumaticWound"),
      d("diffDeepSpaceHandInfection"),
      d("diffFlexorTenosynovitis"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffGasGangrene"),
      d("diffPyomyositis"),
      d("diffPostoperativeSurgicalSiteInfection"),
      d("diffFascialDehiscence"),
      d("diffDiabeticIschemicUlcerInfection"),
      d("diffAtypicalWaterborneOrSoilOrganismInfection"),
      d("diffRetainedForeignBody"),
      d("diffOsteomyelitis"),
      d("diffSepticArthritis"),
      d("diffSepsis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewedIfObtained"),
      d("mdmLactateReviewedIfObtained"),
      d("mdmXrayReviewedForForeignBodyOrGasIfObtained"),
      d("mdmCtOrMriReviewedIfObtained"),
      d("mdmWoundCultureReviewedIfObtained"),
      d("mdmLrinecScoreDocumentedIfCalculatedNeverAutonomousRuleOut"),
      d("mdmPointOfCareUltrasoundFindingsReviewedNotAutoInterpreted"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskSuperficialWoundInfection"),
      d("riskModerateRiskDeepSpaceOrTenosynovitisConcern"),
      d("riskHighRiskNecrotizingOrGasFormingInfection"),
      d("riskHighRiskFascialDehiscenceEvisceration"),
      d("riskHighRiskSystemicToxicitySepsis"),
    ],
    mdmClinicalRationale: [
      d("reasoningMechanismAndContaminationSourceGuideAssessment"),
      d("reasoningKanavelSignsDocumentationOnlyNotAutomatedDiagnosis"),
      d("reasoningLrinecDocumentationOnlyNeverAutomatedRuleOut"),
      d("reasoningSystemicToxicityFlaggedPerRedFlagScreeningSepsisManagedSeparately"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnFascialDehiscenceOrEviscerationRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderAntibioticsIAndDAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impInfectedTraumaticWound"),
      d("impDeepSpaceHandInfectionConcern"),
      d("impPostoperativeWoundComplication"),
      d("impDiabeticIschemicUlcerInfection"),
    ],
    mdmPlanSummary: [
      d("planWoundExploredAndIrrigated"),
      d("planAntibioticsPrescribed"),
      d("planSurgicalOrHandSpecialistFollowUpArranged"),
      d("planTetanusStatusUpdated"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessWoundAppearanceUnchangedOrImproved"),
      d("reassessPainImprovedAfterTreatment"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessNoIntervalProgressionOfSwellingOrErythema"),
    ],
    followUpDisposition: [
      d("dispReturnForSpreadingInfectionFeverOrWorseningPain"),
      d("dispUrgentSurgicalOrHandSpecialistEvaluationIfWorsening"),
      d("dispWoundCheckFollowUpArranged"),
    ],
  });
}
