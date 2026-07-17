/**
 * Phase 17 (Commit 1) — OB/GYN / urology chart-ready provider documentation intelligence
 * (gold-standard click-to-insert builders). Six adaptive templates only — no per-diagnosis
 * visible template explosion. Medications, consults, and disposition remain clinician-owned.
 * Forbidden automatic reassurances: ectopic excluded, torsion excluded, fetal well-being
 * confirmed, medically cleared.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export function buildEarlyPregnancyBleedingPainV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPregnancyTestStatusReported"),
      d("hpiLmpReportedIfKnown"),
      d("hpiEstimatedGestationalAgeReportedIfKnownWithSource"),
      d("hpiGravidityParityReportedIfKnown"),
      d("hpiRhStatusReportedIfKnown"),
      d("hpiVaginalBleedingAmountAndDurationReported"),
      d("hpiPelvicOrAbdominalPainReported"),
      d("hpiPassageOfTissueOrClotsReported"),
      d("hpiDizzinessOrSyncopeReported"),
      d("hpiPriorUltrasoundFindingsReportedIfDocumented"),
      d("hpiFetalHeartRateReportedIfObtained"),
      d("hpiContraceptionOrIudReported"),
      d("hpiSexualAssaultLinkageIfApplicable"),
    ],
    rosImportantPositives: [
      d("rosVaginalBleeding"),
      d("rosPelvicPain"),
      d("rosNauseaOrVomiting"),
      d("rosDizziness"),
      d("rosShoulderPain"),
    ],
    rosImportantNegatives: [d("rosDeniesFever"), d("rosDeniesSevereAbdominalPain")],
    rosRedFlags: [
      d("rfRupturedEctopicConcernHighVisibility"),
      d("rfHemodynamicInstabilityOrSyncope"),
      d("rfHeavyBleedingOrPassingClots"),
      d("rfShoulderPainWithPelvicPain"),
      d("rfNoEctopicExcludedStatement"),
      d("rfNoFetalViabilityConfirmedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examIllAppearing"), d("examPaleOrDiaphoreticIfPresent")],
      abdomen: [d("examAbdominalTendernessDocumented"), d("examReboundOrGuardingDocumentedIfPresent")],
      skin: [d("examPelvicExamFindingsDocumentedIfPerformed"), d("examCervicalOsDocumentedIfExamPerformed")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waEarlyPregnancyBleeding"),
      d("waEctopicPregnancyConcern"),
      d("waThreatenedMiscarriage"),
      d("waUnknownGestationalAge"),
      d("waMolarPregnancyConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffEctopicPregnancy"),
      d("diffThreatenedMiscarriage"),
      d("diffIncompleteMiscarriage"),
      d("diffCervicalOrVaginalSourceBleeding"),
      d("diffOvarianTorsionInPregnancy"),
    ],
    mdmDataReviewed: [
      d("mdmBetaHcgReviewedIfObtained"),
      d("mdmUltrasoundReviewedIfObtained"),
      d("mdmRhStatusReviewedIfKnown"),
      d("mdmHemoglobinReviewedIfObtained"),
      d("mdmTypeAndScreenReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskStableEarlyPregnancyBleeding"),
      d("riskHighRiskEctopicOrHemodynamicInstability"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventGravidityParityEgaRhOrFhr"),
      d("reasoningNoEctopicExcludedStatement"),
      d("reasoningNoFetalWellBeingConfirmedStatement"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [
      d("warnModuleDoesNotAutonomouslyDateViabilityOrClear"),
      d("warnRupturedEctopicRequiresUrgentDocumentation"),
    ],
    clinicalImpression: [
      d("impEarlyPregnancyBleeding"),
      d("impEctopicPregnancyConcern"),
      d("impThreatenedMiscarriage"),
    ],
    mdmPlanSummary: [
      d("planSerialVitalsAndRepeatExam"),
      d("planLabsAndImagingAsClinicianSelected"),
      d("planObstetricConsultationIfArranged"),
      d("planReturnPrecautions"),
      d("planSexualAssaultResourcesLinkedIfApplicable"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessBleedingTrend"), d("reassessHemodynamicStatus"), d("reassessNoUnsupportedClearanceLanguage")],
    followUpDisposition: [d("dispObstetricFollowUp"), d("dispReturnForHeavyBleedingSyncopeOrWorseningPain")],
  });
}

export function buildLatePregnancyLaborEmergencyV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiEstimatedGestationalAgeReportedIfKnownWithSource"),
      d("hpiContractionsOrLaborSymptomsReported"),
      d("hpiVaginalBleedingOrFluidLossReported"),
      d("hpiFetalMovementReported"),
      d("hpiFetalHeartRateReportedIfObtained"),
      d("hpiPriorObstetricHistoryReportedIfKnown"),
      d("hpiPriorUltrasoundPlacentaFindingsReportedIfDocumented"),
      d("hpiTraumaOrAbdominalPainReported"),
      d("hpiTimeSinceRuptureOfMembranesReportedIfKnown"),
    ],
    rosImportantPositives: [
      d("rosContractions"),
      d("rosVaginalBleeding"),
      d("rosDecreasedFetalMovement"),
      d("rosFluidLeakage"),
      d("rosAbdominalPain"),
    ],
    rosImportantNegatives: [d("rosDeniesFever"), d("rosDeniesVisualChanges")],
    rosRedFlags: [
      d("rfPlacentalEmergencyConcern"),
      d("rfCordProlapseConcern"),
      d("rfHeavyBleedingInLatePregnancy"),
      d("rfNoDigitalCervicalExamWhenPreviaUnresolved"),
      d("rfNoFetalWellBeingConfirmedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examDistressedInLaborIfPresent")],
      abdomen: [d("examUterineToneAndTendernessDocumented"), d("examFundalHeightDocumentedIfMeasured")],
      skin: [d("examCervicalExamFindingsDocumentedIfPerformed"), d("rfNoDigitalExamWhenPreviaUnresolved")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waPretermLaborConcern"),
      d("waTermLaborConcern"),
      d("waPpromConcern"),
      d("waPlacentalAbruptionConcern"),
      d("waPlacentaPreviaConcern"),
      d("waCordProlapseConcern"),
      d("waFetalDistressConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffPlacentalAbruption"),
      d("diffPlacentaPrevia"),
      d("diffPprom"),
      d("diffPretermLabor"),
      d("diffTermLabor"),
      d("diffUterineRuptureConcern"),
    ],
    mdmDataReviewed: [
      d("mdmUltrasoundReviewedIfObtained"),
      d("mdmFetalHeartRateTracingReviewedIfObtained"),
      d("mdmLabsReviewedIfObtained"),
      d("mdmTypeAndScreenReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskStableLatePregnancy"),
      d("riskHighRiskPlacentalEmergencyOrCordProlapse"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventEgaFhrOrApgar"),
      d("reasoningNoDigitalExamWhenPreviaUnresolved"),
      d("reasoningNoLaborDiagnosisAutonomously"),
      d("reasoningNoFetalWellBeingConfirmedStatement"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyManageLaborOrTransfer")],
    clinicalImpression: [
      d("impLatePregnancyEmergency"),
      d("impPlacentalEmergencyConcern"),
      d("impLaborConcern"),
    ],
    mdmPlanSummary: [
      d("planFetalMonitoringAsDocumented"),
      d("planObstetricConsultationIfArranged"),
      d("planSerialReassessment"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessContractionsAndBleeding"), d("reassessFetalHeartRateIfMonitored")],
    followUpDisposition: [d("dispObstetricFollowUp"), d("dispReturnForBleedingDecreasedMovementOrContractions")],
  });
}

export function buildHypertensivePostpartumObstetricEmergencyV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiGestationalAgeOrPostpartumIntervalReportedIfKnown"),
      d("hpiBloodPressureReadingsReported"),
      d("hpiHeadacheVisualChangesOrEpigastricPainReported"),
      d("hpiSeizureOrAlteredMentalStatusReported"),
      d("hpiVaginalBleedingPostpartumReported"),
      d("hpiDeliveryDetailsReportedIfKnown"),
      d("hpiFetalHeartRateReportedIfApplicableAndObtained"),
      d("hpiPriorPreeclampsiaHistoryReported"),
      d("hpiMedicationsTakenReportedIfDocumentedInMar"),
    ],
    rosImportantPositives: [
      d("rosHeadache"),
      d("rosVisualChanges"),
      d("rosEpigastricOrRuqPain"),
      d("rosVaginalBleeding"),
      d("rosShortnessOfBreath"),
    ],
    rosImportantNegatives: [d("rosDeniesChestPain"), d("rosDeniesSeizure")],
    rosRedFlags: [
      d("rfSeverePreeclampsiaEclampsiaHellpConcern"),
      d("rfPostpartumHemorrhageConcern"),
      d("rfSeizureInPregnancyOrPostpartum"),
      d("rfNoMedicallyClearedStatement"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examIllAppearing")],
      neuroPsych: [d("examMentalStatusDocumented"), d("examReflexesDocumentedIfAssessed")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
      abdomen: [d("examEpigastricOrRuqTendernessDocumentedIfPresent")],
    },
    mdmWorkingAssessment: [
      d("waPreeclampsiaConcern"),
      d("waEclampsiaConcern"),
      d("waHellpConcern"),
      d("waPostpartumHypertension"),
      d("waPostpartumHemorrhageConcern"),
      d("waPostpartumEndometritisConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffSeverePreeclampsia"),
      d("diffEclampsia"),
      d("diffHellpSyndrome"),
      d("diffPostpartumHemorrhage"),
      d("diffPrimaryHypertensiveEmergency"),
    ],
    mdmDataReviewed: [
      d("mdmPlateletsReviewedIfObtained"),
      d("mdmLiverFunctionTestsReviewedIfObtained"),
      d("mdmCreatinineReviewedIfObtained"),
      d("mdmUrinalysisReviewedIfObtained"),
      d("mdmMagnesiumLevelReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskMildPostpartumHypertension"),
      d("riskHighRiskSeverePreeclampsiaEclampsiaOrPph"),
    ],
    mdmClinicalRationale: [
      d("reasoningNeverInventApgarEgaOrDeliveryDetails"),
      d("reasoningMagnesiumAndAntihypertensivesRemainMarOwned"),
      d("reasoningNoAutonomousDisposition"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslyDoseMagnesiumOrClear")],
    clinicalImpression: [
      d("impHypertensiveObstetricEmergency"),
      d("impPostpartumHemorrhageConcern"),
      d("impPreeclampsiaConcern"),
    ],
    mdmPlanSummary: [
      d("planSerialBloodPressureAndNeurologicExam"),
      d("planLabsAsClinicianSelected"),
      d("planObstetricConsultationIfArranged"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessBloodPressureTrend"), d("reassessNeurologicStatus"), d("reassessBleedingTrend")],
    followUpDisposition: [d("dispObstetricFollowUp"), d("dispReturnForHeadacheVisualChangesSeizureOrHeavyBleeding")],
  });
}

export function buildAcuteGynecologicPelvicComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiPelvicPainOnsetAndLocationReported"),
      d("hpiMenstrualHistoryReportedIfKnown"),
      d("hpiPregnancyTestStatusReportedIfApplicable"),
      d("hpiVaginalBleedingOrDischargeReported"),
      d("hpiFeverOrSystemicSymptomsReported"),
      d("hpiNauseaOrVomitingReported"),
      d("hpiSexualActivityOrAssaultHistoryReportedIfApplicable"),
      d("hpiPriorPelvicSurgeryOrIudReported"),
      d("hpiPriorSimilarEpisodesReported"),
    ],
    rosImportantPositives: [
      d("rosPelvicPain"),
      d("rosNauseaOrVomiting"),
      d("rosFever"),
      d("rosVaginalDischarge"),
      d("rosDysuria"),
    ],
    rosImportantNegatives: [d("rosDeniesPregnancy"), d("rosDeniesTrauma")],
    rosRedFlags: [
      d("rfOvarianTorsionConcernHighVisibility"),
      d("rfSuddenSeverePelvicPainWithNausea"),
      d("rfFeverWithPelvicPain"),
      d("rfNoTorsionExcludedStatement"),
      d("rfDopplerPresenceDoesNotExcludeTorsion"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examIllAppearing"), d("examFeverDocumentedIfPresent")],
      abdomen: [d("examAbdominalTendernessDocumented"), d("examReboundDocumentedIfPresent")],
      skin: [d("examPelvicExamFindingsDocumentedIfPerformed"), d("examCervicalMotionTendernessDocumentedIfAssessed")],
    },
    mdmWorkingAssessment: [
      d("waOvarianTorsionConcern"),
      d("waRupturedOvarianCyst"),
      d("waPidConcern"),
      d("waTuboOvarianAbscessConcern"),
      d("waEndometriosisFlare"),
    ],
    mdmDifferentialSynthesis: [
      d("diffOvarianTorsion"),
      d("diffRupturedOvarianCyst"),
      d("diffPid"),
      d("diffEctopicPregnancy"),
      d("diffAppendicitis"),
      d("diffUrinaryTractInfection"),
    ],
    mdmDataReviewed: [
      d("mdmBetaHcgReviewedIfObtained"),
      d("mdmUltrasoundReviewedIfObtained"),
      d("mdmUrinalysisReviewedIfObtained"),
      d("mdmWhiteBloodCellCountReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskUncomplicatedPelvicPain"),
      d("riskHighRiskTorsionOrTuboOvarianAbscess"),
    ],
    mdmClinicalRationale: [
      d("reasoningDopplerPresenceDoesNotExcludeTorsion"),
      d("reasoningNoTorsionExcludedStatement"),
      d("reasoningSexualAssaultLinkOnlyNoForcedForensicExam"),
    ],
    mdmImmediateActionsRationale: [d("warnOvarianTorsionRequiresUrgentDocumentation")],
    clinicalImpression: [
      d("impAcutePelvicPain"),
      d("impOvarianTorsionConcern"),
      d("impPidConcern"),
    ],
    mdmPlanSummary: [
      d("planSerialExamAndVitals"),
      d("planImagingAsClinicianSelected"),
      d("planGynecologyConsultationIfArranged"),
      d("planSexualAssaultResourcesLinkedIfApplicable"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessPainTrend"), d("reassessFeverAndExam")],
    followUpDisposition: [d("dispGynecologyFollowUp"), d("dispReturnForWorseningPainFeverOrVomiting")],
  });
}

export function buildRenalUrinaryEmergencyV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiUrinarySymptomsReported"),
      d("hpiFlankPainReported"),
      d("hpiHematuriaReported"),
      d("hpiRetentionOrOliguriaReported"),
      d("hpiFeverOrRigorsReported"),
      d("hpiNauseaOrVomitingReported"),
      d("hpiPriorStoneOrUtiHistoryReported"),
      d("hpiCatheterOrFoleyStatusReported"),
      d("hpiPregnancyStatusReportedIfApplicable"),
    ],
    rosImportantPositives: [
      d("rosDysuria"),
      d("rosFlankPain"),
      d("rosHematuria"),
      d("rosFever"),
      d("rosNauseaOrVomiting"),
    ],
    rosImportantNegatives: [d("rosDeniesRetention"), d("rosDeniesHematuria")],
    rosRedFlags: [
      d("rfInfectedObstructedStoneConcern"),
      d("rfUrinarySepsisOrShockConcern"),
      d("rfAnuriaOrOliguria"),
      d("rfGrossHematuriaWithClots"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examIllAppearing"), d("examFeverDocumentedIfPresent")],
      abdomen: [d("examFlankTendernessDocumented"), d("examSuprapubicTendernessDocumentedIfPresent")],
      skin: [d("examCatheterStatusDocumentedIfPresent"), d("examCostovertebralAngleTendernessDocumented")],
      cardiovascular: [d("examHeartRateAndBloodPressureDocumented")],
    },
    mdmWorkingAssessment: [
      d("waObstructiveUropathyConcern"),
      d("waInfectedStoneConcern"),
      d("waAcuteUrinaryRetention"),
      d("waGrossHematuriaWithClots"),
      d("waPyelonephritisConcern"),
      d("waUrinarySepsisConcern"),
    ],
    mdmDifferentialSynthesis: [
      d("diffNephrolithiasis"),
      d("diffInfectedObstructedStone"),
      d("diffPyelonephritis"),
      d("diffUrinaryRetention"),
      d("diffUrosepsis"),
      d("diffRenalInfarction"),
    ],
    mdmDataReviewed: [
      d("mdmUrinalysisReviewedIfObtained"),
      d("mdmUrineCultureReviewedIfObtained"),
      d("mdmCreatinineReviewedIfObtained"),
      d("mdmCtUrogramOrUltrasoundReviewedIfObtained"),
      d("mdmLactateReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskUncomplicatedUrinarySymptoms"),
      d("riskHighRiskInfectedStoneOrUrosepsis"),
    ],
    mdmClinicalRationale: [
      d("reasoningAntibioticsRemainMarOwned"),
      d("reasoningNoAutonomousDisposition"),
      d("reasoningNoMedicallyClearedStatement"),
    ],
    mdmImmediateActionsRationale: [d("warnModuleDoesNotAutonomouslySelectAntibioticsOrDrainage")],
    clinicalImpression: [
      d("impRenalUrinaryEmergency"),
      d("impInfectedStoneConcern"),
      d("impUrinarySepsisConcern"),
    ],
    mdmPlanSummary: [
      d("planSerialVitalsAndExam"),
      d("planLabsAndImagingAsClinicianSelected"),
      d("planUrologyConsultationIfArranged"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessPainAndFeverTrend"), d("reassessUrinaryOutput")],
    followUpDisposition: [d("dispUrologyFollowUp"), d("dispReturnForFeverFlankPainRetentionOrWorseningSymptoms")],
  });
}

export function buildAcuteScrotalPenileEmergencyV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      d("hpiScrotalOrPenilePainOnsetReported"),
      d("hpiLateralityReported"),
      d("hpiNauseaOrVomitingReported"),
      d("hpiTraumaHistoryReported"),
      d("hpiUrinarySymptomsReported"),
      d("hpiPriorSimilarEpisodesReported"),
      d("hpiSexualActivityReportedIfApplicable"),
      d("hpiDurationOfPriapismReportedIfApplicable"),
    ],
    rosImportantPositives: [
      d("rosScrotalPain"),
      d("rosPenilePain"),
      d("rosNauseaOrVomiting"),
      d("rosSwelling"),
      d("rosDysuria"),
    ],
    rosImportantNegatives: [d("rosDeniesTrauma"), d("rosDeniesFever")],
    rosRedFlags: [
      d("rfTesticularTorsionConcernHighVisibility"),
      d("rfSuddenScrotalPainWithNausea"),
      d("rfPriapismConcern"),
      d("rfFournierOverlapDocumentOnly"),
      d("rfNoTorsionExcludedStatement"),
      d("rfDopplerPresenceDoesNotExcludeTorsion"),
    ],
    physicalExam: {
      general: [d("examWellAppearing"), d("examDistressedIfPresent")],
      skin: [
        d("examScrotalExamDocumented"),
        d("examTesticularLieAndTendernessDocumented"),
        d("examCremastericReflexDocumentedIfTested"),
        d("examPenileExamDocumentedIfRelevant"),
        d("examDopplerFindingsDocumentedIfObtained"),
      ],
    },
    mdmWorkingAssessment: [
      d("waTesticularTorsionConcern"),
      d("waEpididymitis"),
      d("waPriapism"),
      d("waPenileFractureConcern"),
      d("waParaphimosis"),
      d("waFournierOverlapDocumentOnly"),
    ],
    mdmDifferentialSynthesis: [
      d("diffTesticularTorsion"),
      d("diffEpididymitis"),
      d("diffTorsionOfAppendixTestis"),
      d("diffFournierGangreneOverlap"),
      d("diffIncarceratedHernia"),
      d("diffPriapism"),
    ],
    mdmDataReviewed: [
      d("mdmScrotalUltrasoundReviewedIfObtained"),
      d("mdmUrinalysisReviewedIfObtained"),
      d("mdmStiTestingReviewedIfObtained"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskUncomplicatedScrotalPain"),
      d("riskHighRiskTorsionPriapismOrFournierOverlap"),
    ],
    mdmClinicalRationale: [
      d("reasoningDopplerPresenceDoesNotExcludeTorsion"),
      d("reasoningNoTorsionExcludedStatement"),
      d("reasoningFournierRemainsPhase13Ownership"),
    ],
    mdmImmediateActionsRationale: [d("warnTesticularTorsionRequiresUrgentDocumentation")],
    clinicalImpression: [
      d("impAcuteScrotalPain"),
      d("impTesticularTorsionConcern"),
      d("impEpididymitis"),
    ],
    mdmPlanSummary: [
      d("planSerialScrotalExam"),
      d("planUltrasoundAsClinicianSelected"),
      d("planUrologyConsultationIfArranged"),
      d("planReturnPrecautions"),
    ],
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischargeAfterClinicianSelectedDisposition")],
    reassessment: [d("reassessScrotalExamAndPain"), d("reassessTimeFromSymptomOnset")],
    followUpDisposition: [d("dispUrologyFollowUp"), d("dispReturnForWorseningPainSwellingOrFever")],
  });
}
