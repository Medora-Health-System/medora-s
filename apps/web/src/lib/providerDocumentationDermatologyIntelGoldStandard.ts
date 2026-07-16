/**
 * Phase 14 — Dermatologic Emergency chart-ready provider documentation intelligence
 * (gold-standard click-to-insert builders). Mirrors the Phase 13 soft tissue/wound
 * infection pattern (`buildSoftTissueInfectionAdultV1Intel` /
 * `buildAbscessPurulentInfectionAdultV1Intel` / `buildHighRiskWoundInfectionAdultV1Intel`
 * in `providerDocumentationSoftTissueWoundInfectionIntelGoldStandard.ts`): each
 * chief-complaint area gets a single adaptive provider documentation template whose chips
 * are reordered by the matching clinical-intelligence module
 * (`dermatologicRashClinicalIntelligence.ts`,
 * `allergicInflammatoryDermatologyClinicalIntelligence.ts`,
 * `vesicularBullousSkinDisorderClinicalIntelligence.ts`,
 * `dermatologicEmergencyClinicalIntelligence.ts`) rather than split into separate visible
 * templates per diagnosis.
 *
 * These builders intentionally do NOT reuse the allergic-reaction/rash bundle
 * (`buildAllergicReactionRashIntel` / `RASH_SKIN_COMPLAINT_V1_INTEL` in
 * `providerDocumentationRashSkinComplaintIntelGoldStandard.ts`) — those static templates
 * remain unchanged and untouched by this file. Instead each builder assembles its own
 * dermatology-appropriate ROS/MDM stack.
 *
 * All fragments are click-to-insert only; nothing here is auto-inserted on template apply,
 * nothing auto-documents a negative finding, and nothing establishes a diagnosis, starts a
 * treatment, performs a biopsy, admits, transfers, or requests a consult. Nikolsky-sign and
 * SCORTEN chips are explicitly labeled documentation-only (see
 * `dermatologicEmergencyRedFlagEngine.ts`). Ophthalmic zoster and ocular/mucosal
 * involvement chips explicitly note that eye examination ownership belongs to
 * ophthalmology, not this module.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

/**
 * Rash / skin lesion (adult) — single adaptive provider documentation template covering
 * undifferentiated rash, viral exanthem, bacterial eruption concern, fungal infection
 * concern, parasitic infestation concern, inflammatory dermatosis concern, suspicious
 * lesion concern, and serious rash red-flag concern. Branch emphasis is not baked into
 * fixed sub-templates; `adaptDermatologicRashIntel` reorders these same chips by resolved
 * branch and red-flag category.
 */
export function buildDermatologicRashAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiRashOnsetAndDurationReported"),
      d("hpiRashDistributionReported"),
      d("hpiRashSpreadingOrStableReported"),
      d("hpiPruritusReported"),
      d("hpiPainOrBurningReported"),
      d("hpiFeverReported"),
      d("hpiNewMedicationExposureReported"),
      d("hpiNewSoapDetergentOrCosmeticExposureReported"),
      d("hpiRecentOutdoorOrInsectExposureReported"),
      d("hpiSickContactsReported"),
      d("hpiRecentTravelReported"),
      d("hpiKnownAllergiesReported"),
      d("hpiPriorSimilarRashHistoryReported"),
      d("hpiImmunocompromisedStatusReported"),
      d("hpiOralMucosalOrEyeInvolvementReported"),
    ],
    rosImportantPositives: [d("rosRash"), d("rosPruritus"), d("rosFever"), d("rosPainAtSite"), d("rosSwelling")],
    rosImportantNegatives: [
      d("rosDeniesMucosalInvolvement"),
      d("rosDeniesFacialSwelling"),
      d("rosDeniesDifficultyBreathing"),
      d("rosDeniesJointPain"),
    ],
    rosRedFlags: [
      d("rfNonblanchingRashWithFever"),
      d("rfMucosalOrOcularInvolvement"),
      d("rfWidespreadBlisteringOrSkinSloughing"),
      d("rfHighFever"),
      d("rfHypotension"),
      d("rfAlteredMentalStatus"),
      d("rfRapidlyProgressiveRash"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examNonToxicAppearing"), d("examToxicAppearing"), d("examFebrile")],
      heent: [d("examOralMucosaClear"), d("examConjunctivaClear")],
      skin: [
        d("examPrimaryLesionTypeDocumented"),
        d("examDistributionPatternDocumented"),
        d("examSecondaryChangesDocumented"),
        d("examBlanchingAssessed"),
        d("examMucosalExamDocumented"),
        d("examNoSkinSloughingOrBullae"),
        d("examNoPetechiaeOrPurpura"),
      ],
    },
    mdmWorkingAssessment: [
      d("waUndifferentiatedRash"),
      d("waViralExanthem"),
      d("waBacterialEruptionConcern"),
      d("waFungalInfectionConcern"),
      d("waParasiticInfestationConcern"),
      d("waInflammatoryDermatosisConcern"),
      d("waSuspiciousLesionConcern"),
      d("waSeriousRashRedFlagConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffViralExanthem"),
      d("diffContactDermatitis"),
      d("diffDrugEruption"),
      d("diffTineaInfection"),
      d("diffScabies"),
      d("diffImpetigo"),
      d("diffUrticaria"),
      d("diffPsoriasis"),
      d("diffStevensJohnsonSyndromeToxicEpidermalNecrolysis"),
      d("diffMeningococcemia"),
      d("diffSepsis"),
    ],
    mdmDataReviewed: [
      d("mdmKohPrepReviewedIfObtained"),
      d("mdmSkinCultureReviewedIfObtained"),
      d("mdmCbcReviewedIfObtained"),
      d("mdmSkinBiopsyReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskLocalizedRash"),
      d("riskModerateRiskWidespreadOrRecurrentRash"),
      d("riskHighRiskSeriousRashRedFlagConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningMorphologyAndDistributionGuideAssessment"),
      d("reasoningBlanchingStatusDistinguishesBenignFromConcerningRash"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnSeriousRashRedFlagRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderMedicationsBiopsyAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impUndifferentiatedRash"),
      d("impViralExanthem"),
      d("impContactDermatitisConcern"),
      d("impSuspiciousLesionConcern"),
    ],
    mdmPlanSummary: [
      d("planTopicalOrSystemicTherapyPrescribed"),
      d("planSkinCareInstructionsGiven"),
      d("planDermatologyFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessRashUnchangedOrImproved"),
      d("reassessPruritusImprovedAfterTreatment"),
      d("reassessNoIntervalSpreadOfRash"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForSpreadingRashFeverOrMucosalInvolvement"),
      d("dispDermatologyFollowUpForPersistentOrAtypicalRash"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}

/**
 * Allergic / inflammatory skin disorder (adult) — single adaptive provider documentation
 * template covering allergic and irritant contact dermatitis, atopic dermatitis, eczema
 * flare, urticaria, angioedema overlap, plaque psoriasis, pustular/erythrodermic psoriasis
 * concern, rosacea, seborrheic dermatitis, intertrigo, uncomplicated drug eruption, and
 * autoimmune inflammatory rash concern. Branch emphasis is not baked into fixed
 * sub-templates; `adaptAllergicInflammatoryDermatologyIntel` reorders these same chips by
 * resolved branch and red-flag category.
 */
export function buildAllergicInflammatoryDermatologyAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiRashOnsetAndDurationReported"),
      d("hpiKnownAllergenOrIrritantExposureReported"),
      d("hpiNewSoapDetergentOrCosmeticExposureReported"),
      d("hpiNewMedicationExposureReported"),
      d("hpiPruritusSeverityReported"),
      d("hpiPriorAtopicDermatitisOrEczemaHistoryReported"),
      d("hpiPriorPsoriasisHistoryReported"),
      d("hpiJointSymptomsReported"),
      d("hpiFacialOrThroatSwellingReported"),
      d("hpiHivesOnsetAndDurationReported"),
      d("hpiSkinFoldRashReported"),
      d("hpiFlushingOrFacialRednessReported"),
    ],
    rosImportantPositives: [d("rosPruritus"), d("rosRash"), d("rosSwelling"), d("rosSkinFoldRash"), d("rosFlushing")],
    rosImportantNegatives: [d("rosDeniesThroatTightness"), d("rosDeniesDifficultyBreathing"), d("rosDeniesFever")],
    rosRedFlags: [
      d("rfAirwaySwellingConcern"),
      d("rfWidespreadPustulesWithFever"),
      d("rfErythrodermaConcern"),
      d("rfSystemicSymptoms"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examNonToxicAppearing"), d("examToxicAppearing")],
      heent: [d("examNoTongueOrLipSwelling"), d("examAirwayPatent")],
      skin: [
        d("examDistributionAndMorphologyDocumented"),
        d("examLichenificationPresent"),
        d("examSilveryScalePresent"),
        d("examUrticarialWhealsPresent"),
        d("examSkinFoldErythemaPresent"),
        d("examPustulesOnErythematousBasePresent"),
        d("examNoSkinSloughing"),
      ],
    },
    mdmWorkingAssessment: [
      d("waAllergicContactDermatitis"),
      d("waIrritantContactDermatitis"),
      d("waAtopicDermatitis"),
      d("waEczemaFlare"),
      d("waUrticaria"),
      d("waAngioedemaConcern"),
      d("waPsoriasisPlaque"),
      d("waPsoriasisPustularOrErythrodermicConcern"),
      d("waRosacea"),
      d("waSeborrheicDermatitis"),
      d("waIntertrigo"),
      d("waDrugEruptionUncomplicated"),
      d("waAutoimmuneInflammatoryRashConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAllergicContactDermatitis"),
      d("diffIrritantContactDermatitis"),
      d("diffAtopicDermatitis"),
      d("diffUrticaria"),
      d("diffAngioedema"),
      d("diffPsoriasis"),
      d("diffGeneralizedPustularPsoriasis"),
      d("diffRosacea"),
      d("diffSeborrheicDermatitis"),
      d("diffIntertrigo"),
      d("diffDrugEruption"),
      d("diffAutoimmuneConnectiveTissueDisease"),
      d("diffCellulitis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewedIfObtained"),
      d("mdmIgELevelReviewedIfObtained"),
      d("mdmSkinBiopsyReviewedIfObtained"),
      d("mdmTryptaseReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskLocalizedDermatitis"),
      d("riskModerateRiskWidespreadOrRecurrentFlare"),
      d("riskHighRiskPustularOrErythrodermicPsoriasis"),
      d("riskHighRiskAngioedemaWithAirwayConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningExposureHistoryAndDistributionGuideAssessment"),
      d("reasoningAirwayInvolvementDistinguishesAngioedemaFromUncomplicatedUrticaria"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnAngioedemaWithAirwayInvolvementRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderMedicationsBiopsyAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impAllergicContactDermatitis"),
      d("impAtopicDermatitisEczemaFlare"),
      d("impUrticaria"),
      d("impPsoriasisPlaque"),
    ],
    mdmPlanSummary: [
      d("planTopicalSteroidOrEmollientPrescribed"),
      d("planAntihistaminePrescribed"),
      d("planTriggerOrAllergenAvoidanceGiven"),
      d("planDermatologyFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessPruritusImprovedAfterTreatment"),
      d("reassessRashUnchangedOrImproved"),
      d("reassessNoAirwayCompromise"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForAirwaySwellingOrDifficultyBreathing"),
      d("dispDermatologyFollowUpForPersistentOrRecurrentFlare"),
      d("dispReturnForSpreadingOrWorseningRash"),
    ],
  });
}

/**
 * Vesicular / bullous skin disorder (adult) — single adaptive provider documentation
 * template covering herpes simplex, herpes zoster, ophthalmic zoster concern, varicella,
 * bullous impetigo, erythema multiforme, Stevens-Johnson syndrome/TEN concern, autoimmune
 * bullous disorder, blistering medication reaction, herpetic whitlow, and eczema
 * herpeticum concern. Branch emphasis is not baked into fixed sub-templates;
 * `adaptVesicularBullousSkinDisorderIntel` reorders these same chips by resolved branch
 * and red-flag category. Ophthalmic-involvement chips explicitly note that eye
 * examination ownership belongs to ophthalmology.
 */
export function buildVesicularBullousSkinDisorderAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiVesicleOrBlisterOnsetReported"),
      d("hpiLesionDistributionReported"),
      d("hpiPainOrBurningPriorToLesionsReported"),
      d("hpiPriorSimilarOutbreaksReported"),
      d("hpiRecentSickContactOrExposureReported"),
      d("hpiKnownAtopicDermatitisOrEczemaHistoryReported"),
      d("hpiFeverReported"),
      d("hpiEyeInvolvementReported"),
      d("hpiOralGenitalMucosalInvolvementReported"),
      d("hpiRecentNewMedicationExposureReported"),
      d("hpiImmunocompromisedStatusReported"),
      d("hpiFingertipPainAndSwellingReported"),
    ],
    rosImportantPositives: [d("rosVesicularRash"), d("rosPain"), d("rosFever"), d("rosMucosalLesions")],
    rosImportantNegatives: [
      d("rosDeniesEyeInvolvement"),
      d("rosDeniesSystemicSymptoms"),
      d("rosDeniesSpreadingBeyondSingleDermatome"),
    ],
    rosRedFlags: [
      d("rfEpidermalDetachmentOrSkinSloughing"),
      d("rfMucosalInvolvement"),
      d("rfOcularInvolvement"),
      d("rfDisseminatedBeyondSingleDermatome"),
      d("rfEczematousSkinWithPunchedOutErosions"),
      d("rfHighFever"),
    ],
    physicalExam: {
      heent: [d("examOralMucosalLesionsPresent"), d("examNoOralMucosalLesions")],
      skin: [
        d("examVesicleOrBullaMorphologyDocumented"),
        d("examDistributionDocumented"),
        d("examGroupedOrClusteredLesionsPresent"),
        d("examPositiveNikolskyIfTested"),
        d("examNoSkinSloughing"),
        d("examCrustingPresent"),
        d("examPunchedOutErosionsOnEczematousSkinPresent"),
      ],
      musculoskeletal: [d("examFingertipPulpSwellingConsistentWithHerpeticWhitlow")],
    },
    mdmWorkingAssessment: [
      d("waHerpesSimplex"),
      d("waHerpesZoster"),
      d("waOphthalmicZosterConcern"),
      d("waVaricella"),
      d("waBullousImpetigo"),
      d("waErythemaMultiforme"),
      d("waStevensJohnsonSyndromeConcern"),
      d("waAutoimmuneBullousDisorderConcern"),
      d("waBlisteringMedicationReactionConcern"),
      d("waHerpeticWhitlow"),
      d("waEczemaHerpeticumConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffHerpesSimplex"),
      d("diffHerpesZoster"),
      d("diffVaricella"),
      d("diffBullousImpetigo"),
      d("diffErythemaMultiforme"),
      d("diffStevensJohnsonSyndromeToxicEpidermalNecrolysis"),
      d("diffBullousPemphigoid"),
      d("diffPemphigusVulgaris"),
      d("diffFixedDrugEruption"),
      d("diffEczemaHerpeticum"),
    ],
    mdmDataReviewed: [
      d("mdmViralPcrOrDfaReviewedIfObtained"),
      d("mdmTzanckSmearReviewedIfObtained"),
      d("mdmBacterialCultureReviewedIfObtained"),
      d("mdmSkinBiopsyReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskLocalizedSingleDermatomeLesion"),
      d("riskModerateRiskWidespreadOrRecurrentLesions"),
      d("riskHighRiskSjsTenOrEczemaHerpeticumConcern"),
      d("riskHighRiskOphthalmicInvolvement"),
    ],
    mdmClinicalRationale: [
      d("reasoningLesionMorphologyAndDistributionGuideAssessment"),
      d("reasoningNikolskySignDocumentationOnlyNotAutomatedDiagnosis"),
      d("reasoningOphthalmicInvolvementRequiresDedicatedEyeEvaluation"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnSjsTenOrEczemaHerpeticumConcernRequiresUrgentInPersonReassessment"),
      d("warnOphthalmicZosterConcernWarrantsDedicatedEyeEvaluationNotAutonomouslyPerformedHere"),
      d("warnModuleDoesNotAutonomouslyOrderMedicationsBiopsyAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impHerpesSimplex"),
      d("impHerpesZoster"),
      d("impVaricella"),
      d("impBullousImpetigo"),
      d("impErythemaMultiforme"),
    ],
    mdmPlanSummary: [
      d("planAntiviralPrescribed"),
      d("planWoundCareProvided"),
      d("planOphthalmologyFollowUpArrangedForOcularInvolvement"),
      d("planDermatologyFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessLesionsUnchangedOrImproved"),
      d("reassessPainImprovedAfterTreatment"),
      d("reassessNoIntervalSpreadOfLesions"),
      d("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      d("dispReturnForSpreadingLesionsFeverOrEyeInvolvement"),
      d("dispOphthalmologyFollowUpForOcularInvolvement"),
      d("dispUrgentReevaluationIfWorsening"),
    ],
  });
}

/**
 * Dermatologic emergency / high-risk rash (adult) — single adaptive provider
 * documentation template covering Stevens-Johnson syndrome/TEN, DRESS syndrome, AGEP,
 * meningococcal-type rash, petechiae/purpura with systemic symptoms, purpura fulminans,
 * disseminated infection, severe erythroderma, necrotizing infection overlap, severe
 * immunocompromised rash, ocular/mucosal involvement, and systemic toxicity concern.
 * Branch emphasis is not baked into fixed sub-templates; `adaptDermatologicEmergencyIntel`
 * reorders these same chips by resolved branch and red-flag category. SCORTEN and
 * ocular/mucosal-involvement chips are explicitly labeled documentation-only; sepsis-
 * specific scoring/management is intentionally not duplicated here — see the dedicated
 * sepsis screening workflow.
 */
export function buildDermatologicEmergencyAdultV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiRashOnsetAndProgressionReported"),
      d("hpiPercentBodySurfaceAreaInvolvedReported"),
      d("hpiMedicationExposureTimelineReported"),
      d("hpiMucosalOralOcularGenitalInvolvementReported"),
      d("hpiFeverReported"),
      d("hpiFacialSwellingReported"),
      d("hpiJointOrMuscleAcheReported"),
      d("hpiKnownPsoriasisHistoryReported"),
      d("hpiImmunocompromisedStatusReported"),
      d("hpiRapidProgressionOverHoursReported"),
      d("hpiPainOutOfProportionToAppearanceReported"),
    ],
    rosImportantPositives: [d("rosRash"), d("rosFever"), d("rosMucosalLesions"), d("rosFacialSwelling"), d("rosSkinPain")],
    rosImportantNegatives: [d("rosDeniesChestPain"), d("rosDeniesDifficultyBreathing")],
    rosRedFlags: [
      d("rfEpidermalDetachmentOrSkinSloughing"),
      d("rfMucosalOrOcularInvolvement"),
      d("rfNonblanchingRashWithFever"),
      d("rfHypotension"),
      d("rfAlteredMentalStatus"),
      d("rfRapidlyProgressivePurpura"),
      d("rfHighFeverWithRash"),
    ],
    physicalExam: {
      general: [
        d("examToxicAppearing"),
        d("examNonToxicAppearing"),
        d("examFebrile"),
        d("examHemodynamicallyStable"),
        d("examHemodynamicInstabilityPresent"),
      ],
      heent: [d("examOralMucosalErosionsPresent"), d("examConjunctivalInvolvementPresent"), d("examNoOralOrConjunctivalInvolvement")],
      skin: [
        d("examBodySurfaceAreaInvolvedDocumented"),
        d("examEpidermalDetachmentOrSkinSloughingPresent"),
        d("examPositiveNikolskyIfTested"),
        d("examNonblanchingPurpuraOrPetechiaePresent"),
        d("examWidespreadSterilePustulesOnErythematousBasePresent"),
        d("examDuskyOrViolaceousSkinPresent"),
      ],
    },
    mdmWorkingAssessment: [
      d("waStevensJohnsonSyndromeToxicEpidermalNecrolysisConcern"),
      d("waDressSyndromeConcern"),
      d("waAgepConcern"),
      d("waMeningococcalTypeRashConcern"),
      d("waPetechiaePurpuraWithSystemicSymptomsConcern"),
      d("waPurpuraFulminansConcern"),
      d("waDisseminatedInfectionConcern"),
      d("waSevereErythrodermaConcern"),
      d("waNecrotizingInfectionOverlapConcern"),
      d("waSevereImmunocompromisedRashConcern"),
      d("waOcularMucosalInvolvementConcern"),
      d("waSystemicToxicityConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffStevensJohnsonSyndrome"),
      d("diffToxicEpidermalNecrolysis"),
      d("diffDressSyndrome"),
      d("diffAcuteGeneralizedExanthematousPustulosis"),
      d("diffMeningococcemia"),
      d("diffPurpuraFulminans"),
      d("diffDisseminatedIntravascularCoagulation"),
      d("diffErythroderma"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffGeneralizedPustularPsoriasis"),
      d("diffSepsis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewedIfObtained"),
      d("mdmCmpReviewedIfObtained"),
      d("mdmLiverFunctionTestsReviewedIfObtained"),
      d("mdmCoagulationStudiesReviewedIfObtained"),
      d("mdmBloodCultureReviewedIfObtained"),
      d("mdmSkinBiopsyReviewedIfObtained"),
      d("mdmScortenDocumentedIfCalculatedNeverAutonomousRuleOut"),
    ],
    mdmRiskStratification: [
      d("riskHighRiskSjsTenOrDressConcern"),
      d("riskHighRiskPurpuraFulminansOrMeningococcemiaConcern"),
      d("riskHighRiskSevereErythrodermaOrDisseminatedInfection"),
      d("riskHighRiskSystemicToxicity"),
    ],
    mdmClinicalRationale: [
      d("reasoningBodySurfaceAreaAndMucosalInvolvementGuideAssessment"),
      d("reasoningScortenDocumentationOnlyNeverAutomatedRuleOut"),
      d("reasoningSystemicToxicityFlaggedPerRedFlagScreeningSepsisManagedSeparately"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnSjsTenDressOrPurpuraFulminansConcernRequiresUrgentInPersonReassessment"),
      d("warnModuleDoesNotAutonomouslyOrderMedicationsBiopsyAdmissionTransferOrConsult"),
    ],
    clinicalImpression: [
      d("impStevensJohnsonSyndromeToxicEpidermalNecrolysisConcern"),
      d("impDressSyndromeConcern"),
      d("impMeningococcalTypeRashConcern"),
      d("impSevereErythrodermaConcern"),
    ],
    mdmPlanSummary: [
      d("planOffendingMedicationDiscontinuedIfIdentified"),
      d("planWoundAndSkinCareProvided"),
      d("planFluidAndTemperatureManagementProvided"),
      d("planUrgentSpecialtyFollowUpArranged"),
      d("planReturnPrecautionsGiven"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessSkinFindingsUnchangedOrProgressing"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessMentalStatusUnchanged"),
      d("reassessNoIntervalSpreadOfSkinFindings"),
    ],
    followUpDisposition: [
      d("dispReturnForWorseningRashFeverOrMucosalInvolvement"),
      d("dispUrgentDermatologyOrInpatientEvaluationArranged"),
      d("dispFollowUpOnlyIfDocumentedAsPostAcuteRecheck"),
    ],
  });
}
