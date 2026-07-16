/**
 * Phase 12 — ENT Emergencies chart-ready provider documentation intelligence
 * (gold-standard click-to-insert builders). Mirrors the Phase 11 eye pattern
 * (`buildEyeComplaintAdultV1Intel` / `buildEyeTraumaAdultV1Intel` in
 * `providerDocumentationTraumaInjuryComplaintIntelGoldStandard.ts`): each chief-complaint
 * area gets a single adaptive provider documentation template whose chips are reordered by
 * the matching clinical-intelligence module (`entEarHearingVertigoClinicalIntelligence.ts`,
 * `entNoseEpistaxisClinicalIntelligence.ts`, `entThroatNeckAirwayClinicalIntelligence.ts`)
 * rather than split into separate visible templates per diagnosis.
 *
 * These builders intentionally do NOT reuse the mechanical-trauma bundle
 * (`buildMskTraumaV1Intel` / `buildTraumaBundle`) because ENT emergencies are largely
 * atraumatic/infectious/airway concerns — pulling in trauma-specific cannot-miss items
 * (subdural hematoma, compartment syndrome, solid organ injury, cervical spine fracture)
 * would be clinically inaccurate. Instead each builder assembles its own ENT-appropriate
 * ROS/MDM stack, following the same literal-bundle pattern already used for
 * `EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL` / `SINUS_SYMPTOMS_COMPLAINT_V1_INTEL` in
 * `providerDocumentationInfectiousEntComplaintIntelligence19Mdm7.ts`.
 *
 * All fragments are click-to-insert only; nothing here is auto-inserted on template apply,
 * nothing auto-documents a negative finding, and nothing establishes a diagnosis, starts a
 * treatment, manages the airway, requests a consult, or sets disposition. HINTS exam chips
 * are explicitly labeled documentation-only (see `hintsExaminationSafety.ts`).
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

/**
 * Ear pain / hearing change / vertigo (adult) — single adaptive provider documentation
 * template covering otitis externa (including malignant otitis externa), otitis media,
 * mastoiditis, TM perforation, sudden sensorineural hearing loss, peripheral vertigo
 * (BPPV / vestibular neuritis / labyrinthitis / Meniere-type), central vertigo concern,
 * peripheral facial nerve palsy, Ramsay Hunt syndrome, and ear foreign body (including
 * button battery). Branch emphasis is not baked into fixed sub-templates;
 * `adaptEntEarHearingVertigoIntel` reorders these same chips by resolved branch and
 * red-flag category. HINTS documentation chips are explicitly labeled documentation-only
 * and never resolve to an automated stroke rule-out (see `hintsExaminationSafety.ts`).
 */
export function buildEntEarHearingVertigoAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiEarPainOnset"),
      d("hpiUnilateralEarSymptomsReported"),
      d("hpiBilateralEarSymptomsReported"),
      d("hpiOtorrheaReported"),
      d("hpiPurulentOtorrheaReported"),
      d("hpiHearingLossOnsetReported"),
      d("hpiSuddenHearingLossReported"),
      d("hpiTinnitusReported"),
      d("hpiAuralFullnessReported"),
      d("hpiVertigoOnsetReported"),
      d("hpiVertigoTriggeredByPositionChangeReported"),
      d("hpiVertigoContinuousSinceOnsetReported"),
      d("hpiAssociatedNauseaVomitingReported"),
      d("hpiRecentUpperRespiratoryInfectionReported"),
      d("hpiSwimmingOrWaterExposureReported"),
      d("hpiDiabetesOrImmunocompromiseReported"),
      d("hpiEarVesicularRashReported"),
      d("hpiFacialWeaknessReported"),
      d("hpiMastoidPainOrSwellingReported"),
      d("hpiForeignBodySensationInEarReported"),
      d("hpiDeniesHeadTrauma"),
    ],
    rosImportantPositives: [
      d("rosEarPain"),
      d("rosOtorrhea"),
      d("rosHearingLoss"),
      d("rosTinnitus"),
      d("rosVertigo"),
      d("rosAuralFullness"),
      d("rosFever"),
    ],
    rosImportantNegatives: [
      d("rosDeniesFacialWeakness"),
      d("rosDeniesSevereHeadache"),
      d("rosDeniesVisionChange"),
      d("rosDeniesLimbWeakness"),
    ],
    rosRedFlags: [
      d("rfMastoidSwelling"),
      d("rfFacialWeakness"),
      d("rfSuddenHearingLoss"),
      d("rfCentralVertigoFeatures"),
      d("rfAlteredMentalStatus"),
      d("rfImmunocompromisedWithEarInfection"),
      d("rfSuspectedButtonBatteryForeignBody"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examNoAcuteDistress")],
      heent: [
        d("examErythematousEarCanal"),
        d("examCanalEdemaWithPurulence"),
        d("examTragalTenderness"),
        d("examTympanicMembraneErythemaOrBulging"),
        d("examTympanicMembranePerforationPresent"),
        d("examPostauricularSwellingOrFluctuance"),
        d("examProtrudingAuricle"),
        d("examVesicularRashInEarCanalOrAuricle"),
        d("examFacialNerveFunctionDocumented"),
        d("examFacialWeaknessPresent"),
        d("examWeberRinneDocumented"),
        d("examEarCanalForeignBodyVisualized"),
      ],
      neuroPsych: [
        d("examNystagmusDocumented"),
        d("examGaitAndRombergDocumented"),
        d("examHeadImpulseTestDocumentationOnly"),
        d("examSkewDeviationDocumentationOnly"),
        d("examNoFocalNeurologicDeficit"),
      ],
    },
    mdmWorkingAssessment: [
      d("waEarPainEvaluation"),
      d("waHearingLossEvaluation"),
      d("waVertigoEvaluation"),
      d("waConcernForMalignantOtitisExterna"),
      d("waConcernForMastoiditis"),
      d("waConcernForCentralVertigo"),
    ],
    mdmDifferentialSynthesis: [
      d("diffOtitisExterna"),
      d("diffMalignantOtitisExterna"),
      d("diffAcuteOtitisMedia"),
      d("diffMastoiditis"),
      d("diffTympanicMembranePerforation"),
      d("diffCholesteatoma"),
      d("diffSuddenSensorineuralHearingLoss"),
      d("diffCerumenImpaction"),
      d("diffEarForeignBody"),
      d("diffBppv"),
      d("diffVestibularNeuritis"),
      d("diffLabyrinthitis"),
      d("diffMenieresDisease"),
      d("diffCentralVertigoConcern"),
      d("diffRamsayHuntSyndrome"),
      d("diffBellsPalsy"),
    ],
    mdmDataReviewed: [
      d("mdmOtoscopyPerformed"),
      d("mdmAudiometryReviewedIfObtained"),
      d("mdmHintsExamDocumentedNotValidatedStrokeRuleOut"),
      d("mdmCtTemporalBoneReviewedIfObtained"),
      d("mdmMriReviewedIfObtained"),
      d("mdmCbcReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskEarComplaint"),
      d("riskModerateRiskComplicatedOtitis"),
      d("riskHighRiskMalignantOtitisExternaOrMastoiditis"),
      d("riskHighRiskCentralVertigoConcern"),
      d("riskUrgentEntOrNeurologyEvaluation"),
    ],
    mdmClinicalRationale: [
      d("reasoningOtoscopicFindingsGuideAssessment"),
      d("reasoningVertigoTimingAndTriggerGuideDocumentation"),
      d("reasoningHintsDocumentationOnlyNotAutomatedStrokeRuleOut"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnHintsDocumentationOnlyNotStrokeRuleOut"),
      d("warnButtonBatteryEarCanalUrgentRemovalIfPresent"),
    ],
    clinicalImpression: [
      d("impOtitisExterna"),
      d("impAcuteOtitisMedia"),
      d("impCerumenImpaction"),
      d("impPeripheralVertigoConcern"),
    ],
    mdmPlanSummary: [
      d("planEntConsultRequested"),
      d("planUrgentNeurologyEvaluationRequested"),
      d("planTopicalOrOralTherapyProvided"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessEarPainImproved"),
      d("reassessHearingSymptomsUnchanged"),
      d("reassessVertigoImproved"),
      d("reassessNoNewNeurologicFindings"),
    ],
    followUpDisposition: [
      d("dispReturnWorseningPainSwellingFever"),
      d("dispReturnFacialWeaknessOrNeurologicSymptoms"),
      d("dispUrgentEntFollowUp"),
      d("dispUrgentNeurologyFollowUpIfCentralConcern"),
    ],
  });
}

/**
 * Nosebleed / nasal complaint (adult) — single adaptive provider documentation template
 * covering anterior epistaxis, posterior epistaxis concern, nasal foreign body (including
 * button battery), septal hematoma overlap, and anticoagulated epistaxis. Branch emphasis
 * is not baked into fixed sub-templates; `adaptEntNoseEpistaxisIntel` reorders these same
 * chips by resolved branch and red-flag category.
 */
export function buildEntNoseEpistaxisAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiEpistaxisOnset"),
      d("hpiAnteriorBleedingReported"),
      d("hpiPosteriorBleedingSensationReported"),
      d("hpiBilateralNasalBleedingReported"),
      d("hpiBleedingDurationReported"),
      d("hpiPriorEpistaxisEpisodesReported"),
      d("hpiAnticoagulantOrAntiplateletUseReported"),
      d("hpiTraumaToNoseReported"),
      d("hpiNasalForeignBodySensationReported"),
      d("hpiButtonBatteryExposureReported"),
      d("hpiHypertensionHistoryReported"),
      d("hpiBleedingDisorderHistoryReported"),
      d("hpiRecentNasalSurgeryReported"),
      d("hpiDeniesHemoptysis"),
    ],
    rosImportantPositives: [d("rosEpistaxis"), d("rosNasalCongestion"), d("rosDizziness"), d("rosLightheadedness")],
    rosImportantNegatives: [d("rosDeniesHemoptysis"), d("rosDeniesChestPain"), d("rosDeniesEasyBruising")],
    rosRedFlags: [
      d("rfHemodynamicInstability"),
      d("rfPosteriorBleedingSource"),
      d("rfAnticoagulantUse"),
      d("rfSuspectedButtonBatteryForeignBody"),
      d("rfSeptalHematoma"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examHemodynamicInstabilityPresent")],
      heent: [
        d("examAnteriorNasalBleedingSiteVisualized"),
        d("examPosteriorBleedingSourceSuspected"),
        d("examNasalSeptalHematomaPresent"),
        d("examNasalForeignBodyVisualized"),
        d("examButtonBatteryVisualizedInNasalCavity"),
        d("examNasalPackingInPlace"),
        d("examOropharynxWithPosteriorBloodDrainage"),
      ],
    },
    mdmWorkingAssessment: [
      d("waAnteriorEpistaxisEvaluation"),
      d("waPosteriorEpistaxisConcern"),
      d("waNasalForeignBodyConcern"),
      d("waSeptalHematomaConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffAnteriorEpistaxis"),
      d("diffPosteriorEpistaxis"),
      d("diffNasalForeignBody"),
      d("diffSeptalHematoma"),
      d("diffAnticoagulantAssociatedEpistaxis"),
      d("diffHereditaryHemorrhagicTelangiectasia"),
      d("diffNasalTraumaWithBleeding"),
      d("diffCoagulopathy"),
      d("diffHypertensiveEpistaxis"),
    ],
    mdmDataReviewed: [
      d("mdmCbcReviewedIfObtained"),
      d("mdmCoagulationStudiesReviewedIfObtained"),
      d("mdmAnticoagulantLevelReviewedIfApplicable"),
      d("mdmBloodTypeAndScreenReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskAnteriorEpistaxis"),
      d("riskModerateRiskRecurrentOrAnticoagulated"),
      d("riskHighRiskPosteriorOrHemodynamicInstability"),
      d("riskUrgentEntEvaluation"),
    ],
    mdmClinicalRationale: [
      d("reasoningBleedingSiteGuidesManagement"),
      d("reasoningAnticoagulationStatusDocumented"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnButtonBatteryNasalUrgentRemovalIfPresent"),
      d("warnSeptalHematomaUrgentEntEvaluationIfPresent"),
    ],
    clinicalImpression: [d("impAnteriorEpistaxis"), d("impNasalForeignBody")],
    mdmPlanSummary: [
      d("planNasalPackingPlaced"),
      d("planEntConsultRequested"),
      d("planAnticoagulationManagementDiscussedWithPrescriber"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessBleedingControlled"),
      d("reassessNoRebleedingObserved"),
      d("reassessHemodynamicallyStableOnReassessment"),
    ],
    followUpDisposition: [
      d("dispReturnRecurrentOrHeavyBleeding"),
      d("dispUrgentEntFollowUp"),
      d("dispReturnDizzinessOrSyncope"),
    ],
  });
}

/**
 * Throat / neck / upper airway emergency (adult) — single adaptive provider documentation
 * template covering pharyngitis/tonsillitis, peritonsillar abscess, retropharyngeal
 * abscess, parapharyngeal/deep neck infection, Ludwig angina, epiglottitis, odontogenic
 * spread, sialadenitis, salivary duct obstruction, and throat/airway foreign body. Branch
 * emphasis is not baked into fixed sub-templates; `adaptEntThroatNeckAirwayIntel` reorders
 * these same chips by resolved branch and red-flag category. Includes an explicit airway
 * exam safety warning for suspected epiglottitis and a button-battery urgent-removal
 * warning.
 */
export function buildEntThroatNeckAirwayAdultV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiSoreThroatOnset"),
      d("hpiOdynophagiaReported"),
      d("hpiDysphagiaReported"),
      d("hpiDroolingReported"),
      d("hpiMuffledVoiceReported"),
      d("hpiTrismusReported"),
      d("hpiNeckSwellingReported"),
      d("hpiFloorOfMouthSwellingReported"),
      d("hpiStridorReported"),
      d("hpiRespiratoryDistressReported"),
      d("hpiFeverWithThroatSymptomsReported"),
      d("hpiDentalInfectionHistoryReported"),
      d("hpiSalivaryGlandSwellingReported"),
      d("hpiSwellingWorseWithEatingReported"),
      d("hpiForeignBodySensationInThroatReported"),
      d("hpiChokingEpisodeReported"),
      d("hpiPriorTonsillectomyReported"),
      d("hpiImmunocompromisedStatusReported"),
      d("hpiDeniesPriorAirwayIntervention"),
    ],
    rosImportantPositives: [
      d("rosSoreThroat"),
      d("rosOdynophagia"),
      d("rosDysphagia"),
      d("rosDrooling"),
      d("rosNeckSwelling"),
      d("rosFever"),
    ],
    rosImportantNegatives: [d("rosDeniesStridor"), d("rosDeniesRespiratoryDistress"), d("rosDeniesTrismus")],
    rosRedFlags: [
      d("rfTrismus"),
      d("rfDrooling"),
      d("rfStridor"),
      d("rfRespiratoryDistress"),
      d("rfFloorOfMouthSwelling"),
      d("rfNeckSwellingRapidlyProgressive"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examTripodPositioningObserved"), d("examToxicAppearing"), d("examWellAppearing")],
      heent: [
        d("examTonsillarErythemaOrExudatePresent"),
        d("examPeritonsillarFullnessOrBulgePresent"),
        d("examUvularDeviationPresent"),
        d("examTrismusPresent"),
        d("examMuffledHotPotatoVoicePresent"),
        d("examFloorOfMouthInductionOrElevationPresent"),
        d("examSubmandibularSwellingPresent"),
        d("examNeckSwellingOrFluctuancePresent"),
        d("examDroolingPresent"),
        d("examStridorPresentOnExam"),
        d("examOropharyngealForeignBodyVisualized"),
      ],
      respiratory: [d("examRespiratoryDistressPresent"), d("examNoRespiratoryDistress"), d("examAirwayPatentOnVisualInspection")],
    },
    mdmWorkingAssessment: [
      d("waPharyngitisEvaluation"),
      d("waConcernForPeritonsillarAbscess"),
      d("waConcernForDeepNeckSpaceInfection"),
      d("waConcernForLudwigAngina"),
      d("waConcernForEpiglottitisAirwayRisk"),
      d("waConcernForAirwayForeignBody"),
    ],
    mdmDifferentialSynthesis: [
      d("diffPharyngitisTonsillitis"),
      d("diffPeritonsillarAbscess"),
      d("diffRetropharyngealAbscess"),
      d("diffParapharyngealDeepNeckInfection"),
      d("diffLudwigAngina"),
      d("diffEpiglottitis"),
      d("diffOdontogenicSpaceInfection"),
      d("diffSialadenitis"),
      d("diffSalivaryDuctObstruction"),
      d("diffThroatForeignBody"),
      d("diffAirwayForeignBody"),
      d("diffAngioedema"),
    ],
    mdmDataReviewed: [
      d("mdmOralPharyngealExamReviewed"),
      d("mdmCtNeckReviewedIfObtained"),
      d("mdmLateralNeckXrayReviewedIfObtained"),
      d("mdmCbcReviewedIfObtained"),
      d("mdmBloodCultureReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskUncomplicatedPharyngitis"),
      d("riskModerateRiskLocalizedAbscessConcern"),
      d("riskHighRiskDeepNeckOrAirwayThreateningInfection"),
      d("riskEmergentAirwayConcern"),
    ],
    mdmClinicalRationale: [
      d("reasoningAirwayStatusGuidesUrgency"),
      d("reasoningTrismusAndDroolingDocumented"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnAirwayExamSafetyEpiglottitisAvoidAgitationAndInstrumentation"),
      d("warnButtonBatteryThroatUrgentRemovalIfPresent"),
      d("warnAirwayForeignBodyPotentialForCompleteObstruction"),
    ],
    clinicalImpression: [d("impPharyngitisTonsillitis"), d("impPeritonsillarAbscessConcern")],
    mdmPlanSummary: [
      d("planEntOrAirwaySpecialistConsultRequested"),
      d("planImagingObtainedPerCliniciansDiscretion"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    reassessment: [
      d("reassessAirwayRemainsPatent"),
      d("reassessSwellingUnchanged"),
      d("reassessAbleToToleratePoAfterTreatment"),
      d("reassessNoRespiratoryDistressOnReassessment"),
    ],
    followUpDisposition: [
      d("dispReturnWorseningSwallowingOrBreathing"),
      d("dispUrgentEntOrOralSurgeryFollowUp"),
      d("dispReturnStridorOrDrooling"),
    ],
  });
}
