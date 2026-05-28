/** Phase 19MDM.4 — Cardiac / vascular complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const palpitations = (key: string) => `providerDocumentationComplaintIntel.palpitationsComplaintV1.${key}`;
const hypertension = (key: string) => `providerDocumentationComplaintIntel.hypertensionComplaintV1.${key}`;
const legSwellingDvt = (key: string) => `providerDocumentationComplaintIntel.legSwellingDvtComplaintV1.${key}`;
const chfSymptoms = (key: string) => `providerDocumentationComplaintIntel.chfSymptomsComplaintV1.${key}`;
const afibRapidRate = (key: string) => `providerDocumentationComplaintIntel.afibRapidRateComplaintV1.${key}`;
const generalizedWeaknessCardiacEquivalent = (key: string) => `providerDocumentationComplaintIntel.generalizedWeaknessCardiacEquivalentComplaintV1.${key}`;
const nearSyncope = (key: string) => `providerDocumentationComplaintIntel.nearSyncopeComplaintV1.${key}`;
const exertionalDyspnea = (key: string) => `providerDocumentationComplaintIntel.exertionalDyspneaComplaintV1.${key}`;
const edemaVolumeOverload = (key: string) => `providerDocumentationComplaintIntel.edemaVolumeOverloadComplaintV1.${key}`;

export const PALPITATIONS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [palpitations("hpiOnsetDurationFrequency"), palpitations("hpiTriggersExertional"), palpitations("hpiChestPainSobSyncope"), palpitations("hpiStimulantThyroidCardiacHistory")],
  rosImportantPositives: [palpitations("rosPalpitations"), palpitations("rosChestPain"), palpitations("rosSob"), palpitations("rosDizziness")],
  rosImportantNegatives: [palpitations("rosDeniesSyncope")],
  rosRedFlags: [palpitations("rfSyncopeEvent"), palpitations("rfChestPainConcern")],
  physicalExam: { cardiovascular: [palpitations("examRhythmRateIfDocumented"), palpitations("examPerfusion"), palpitations("examCardiopulmonaryExam")], general: [palpitations("examGeneralAppearance")] },
  mdmWorkingAssessment: [palpitations("mdmPalpitationsPresentation")],
  mdmDifferentialSynthesis: [palpitations("diffArrhythmia"), palpitations("diffAnxietyPanic"), palpitations("diffStimulantEffect"), palpitations("diffThyroidMetabolic"), palpitations("diffAcsPeWhenRelevant")],
  mdmDataReviewed: [palpitations("mdmEkgMonitorReviewedIfObtained"), palpitations("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [palpitations("mdmRiskBenefitDiscussed"), palpitations("mdmCardiologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [palpitations("mdmObservationIfIndicated")],
  reassessment: [palpitations("reassessRhythmSymptoms")],
  followUpDisposition: [palpitations("dispReturnSyncopeChestPainSob")],
});

export const HYPERTENSION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [hypertension("hpiBpTrendSymptoms"), hypertension("hpiMedicationAdherence"), hypertension("hpiChestPainSobNeuro"), hypertension("hpiHeadacheVisionRenal")],
  rosImportantPositives: [hypertension("rosElevatedBpConcern"), hypertension("rosHeadache"), hypertension("rosChestPain")],
  rosImportantNegatives: [hypertension("rosDeniesNeuroDeficit")],
  rosRedFlags: [hypertension("rfHypertensiveEmergencyConcern"), hypertension("rfAlteredMentalStatus")],
  physicalExam: { cardiovascular: [hypertension("examNeuroScreen"), hypertension("examCardiopulmonaryExam"), hypertension("examVolumeStatusIfDocumented")], general: [hypertension("examGeneralAppearance")] },
  mdmWorkingAssessment: [hypertension("mdmElevatedBpPresentation")],
  mdmDifferentialSynthesis: [hypertension("diffAsymptomaticElevatedBp"), hypertension("diffHypertensiveUrgencyEmergency"), hypertension("diffPainAnxietyNonadherence"), hypertension("diffRenalEndocrineContributors")],
  mdmDataReviewed: [hypertension("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [hypertension("mdmMedicationReconciliationDiscussed"), hypertension("mdmPcpFollowUpDiscussed")],
  mdmAdmitObserveDischarge: [hypertension("mdmObservationIfSymptomatic")],
  reassessment: [hypertension("reassessBpSymptoms")],
  followUpDisposition: [hypertension("dispReturnNeuroChestSobSymptoms")],
});

export const LEG_SWELLING_DVT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [legSwellingDvt("hpiUnilateralVsBilateral"), legSwellingDvt("hpiPainRednessTrauma"), legSwellingDvt("hpiImmobilizationTravelRisk"), legSwellingDvt("hpiChestPainSobHemoptysis")],
  rosImportantPositives: [legSwellingDvt("rosLegSwelling"), legSwellingDvt("rosLegPain"), legSwellingDvt("rosSob")],
  rosImportantNegatives: [legSwellingDvt("rosDeniesHemoptysis")],
  rosRedFlags: [legSwellingDvt("rfPeConcern"), legSwellingDvt("rfUnilateralWarmthRedness")],
  physicalExam: { cardiovascular: [legSwellingDvt("examEdemaDistribution"), legSwellingDvt("examCalfTendernessIfExamined"), legSwellingDvt("examPulsesSkinChanges")], general: [legSwellingDvt("examGeneralAppearance")] },
  mdmWorkingAssessment: [legSwellingDvt("mdmLegSwellingPresentation")],
  mdmDifferentialSynthesis: [legSwellingDvt("diffDvt"), legSwellingDvt("diffCellulitis"), legSwellingDvt("diffChfVolumeOverload"), legSwellingDvt("diffVenousInsufficiency"), legSwellingDvt("diffInjuryRenalHepatic")],
  mdmDataReviewed: [legSwellingDvt("mdmUltrasoundDimerReviewedIfObtained")],
  mdmClinicalRationale: [legSwellingDvt("mdmPeDvtPrecautionsDiscussed"), legSwellingDvt("mdmVascularConsultIfIndicated")],
  mdmAdmitObserveDischarge: [legSwellingDvt("mdmAdmissionIfHighRisk")],
  reassessment: [legSwellingDvt("reassessSwellingPain")],
  followUpDisposition: [legSwellingDvt("dispReturnSobChestPainWorseningSwelling")],
});

export const CHF_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [chfSymptoms("hpiDyspneaOrthopnea"), chfSymptoms("hpiEdemaWeightGain"), chfSymptoms("hpiMedicationAdherenceOxygen"), chfSymptoms("hpiChestPainCoughFever")],
  rosImportantPositives: [chfSymptoms("rosSob"), chfSymptoms("rosEdema"), chfSymptoms("rosOrthopnea")],
  rosImportantNegatives: [chfSymptoms("rosDeniesChestPain")],
  rosRedFlags: [chfSymptoms("rfRespiratoryDistress"), chfSymptoms("rfHypoxiaConcern")],
  physicalExam: { cardiovascular: [chfSymptoms("examWorkOfBreathing"), chfSymptoms("examLungSoundsIfDocumented"), chfSymptoms("examEdemaPerfusion")], general: [chfSymptoms("examGeneralAppearance")] },
  mdmWorkingAssessment: [chfSymptoms("mdmChfExacerbationConsidered")],
  mdmDifferentialSynthesis: [chfSymptoms("diffChfExacerbation"), chfSymptoms("diffAcs"), chfSymptoms("diffPneumonia"), chfSymptoms("diffCopdAsthma"), chfSymptoms("diffPe"), chfSymptoms("diffRenalFailure")],
  mdmDataReviewed: [chfSymptoms("mdmCxrBnpReviewedIfObtained"), chfSymptoms("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [chfSymptoms("mdmDiuresisOxygenPlanIfGiven"), chfSymptoms("mdmCardiologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [chfSymptoms("mdmAdmissionObservationIfIndicated")],
  reassessment: [chfSymptoms("reassessRespiratoryOxygenNeed")],
  followUpDisposition: [chfSymptoms("dispDispositionReflectsRespiratoryCourse")],
});

export const AFIB_RAPID_RATE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [afibRapidRate("hpiOnsetPalpitations"), afibRapidRate("hpiChestPainSobSyncope"), afibRapidRate("hpiPriorAfibMedsTriggers"), afibRapidRate("hpiAnticoagulantUse")],
  rosImportantPositives: [afibRapidRate("rosPalpitations"), afibRapidRate("rosChestPain"), afibRapidRate("rosDizziness")],
  rosImportantNegatives: [afibRapidRate("rosDeniesSyncope")],
  rosRedFlags: [afibRapidRate("rfHypotensionConcern"), afibRapidRate("rfSyncopeEvent")],
  physicalExam: { cardiovascular: [afibRapidRate("examRateRhythmIfDocumented"), afibRapidRate("examPerfusion"), afibRapidRate("examCardiopulmonaryStatus")], general: [afibRapidRate("examGeneralAppearance")] },
  mdmWorkingAssessment: [afibRapidRate("mdmTachyarrhythmiaConsidered")],
  mdmDifferentialSynthesis: [afibRapidRate("diffAfibFlutter"), afibRapidRate("diffOtherTachyarrhythmia"), afibRapidRate("diffAcs"), afibRapidRate("diffPe"), afibRapidRate("diffThyroidMetabolic"), afibRapidRate("diffInfectionDehydration")],
  mdmDataReviewed: [afibRapidRate("mdmEkgMonitorLabsReviewedIfObtained")],
  mdmClinicalRationale: [afibRapidRate("mdmRateControlPlanIfGiven"), afibRapidRate("mdmCardiologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [afibRapidRate("mdmObservationIfPersistent")],
  reassessment: [afibRapidRate("reassessRateSymptomsAfterTreatment")],
  followUpDisposition: [afibRapidRate("dispReturnChestPainSobSyncopeNeuro")],
});

export const GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [generalizedWeaknessCardiacEquivalent("hpiOnsetExertionalComponent"), generalizedWeaknessCardiacEquivalent("hpiFunctionalDecline"), generalizedWeaknessCardiacEquivalent("hpiFocalVsGeneralized"), generalizedWeaknessCardiacEquivalent("hpiChestPainSobPalpitations")],
  rosImportantPositives: [generalizedWeaknessCardiacEquivalent("rosWeakness"), generalizedWeaknessCardiacEquivalent("rosFatigue"), generalizedWeaknessCardiacEquivalent("rosSob")],
  rosImportantNegatives: [generalizedWeaknessCardiacEquivalent("rosDeniesFocalWeakness")],
  rosRedFlags: [generalizedWeaknessCardiacEquivalent("rfSyncopeConcern"), generalizedWeaknessCardiacEquivalent("rfAlteredMentalStatus")],
  physicalExam: { cardiovascular: [generalizedWeaknessCardiacEquivalent("examNeuroScreen"), generalizedWeaknessCardiacEquivalent("examCardiopulmonaryExam"), generalizedWeaknessCardiacEquivalent("examHydrationPerfusion")], general: [generalizedWeaknessCardiacEquivalent("examGeneralAppearance")] },
  mdmWorkingAssessment: [generalizedWeaknessCardiacEquivalent("mdmWeaknessPresentation")],
  mdmDifferentialSynthesis: [generalizedWeaknessCardiacEquivalent("diffCardiacIschemiaEquivalent"), generalizedWeaknessCardiacEquivalent("diffArrhythmia"), generalizedWeaknessCardiacEquivalent("diffInfectionAnemia"), generalizedWeaknessCardiacEquivalent("diffDehydrationMetabolic"), generalizedWeaknessCardiacEquivalent("diffNeurologicCause")],
  mdmDataReviewed: [generalizedWeaknessCardiacEquivalent("mdmEkgTroponinLabsIfObtained")],
  mdmClinicalRationale: [generalizedWeaknessCardiacEquivalent("mdmFunctionalStatusAssessed"), generalizedWeaknessCardiacEquivalent("mdmCardiologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [generalizedWeaknessCardiacEquivalent("mdmAdmissionIfHighRisk")],
  reassessment: [generalizedWeaknessCardiacEquivalent("reassessFunctionalStatus")],
  followUpDisposition: [generalizedWeaknessCardiacEquivalent("dispFollowUpAdmissionIfIndicated")],
});

export const NEAR_SYNCOPE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [nearSyncope("hpiProdromeTriggers"), nearSyncope("hpiExertionalPositionalEvent"), nearSyncope("hpiInjuryFall"), nearSyncope("hpiChestPainSobPalpitations")],
  rosImportantPositives: [nearSyncope("rosNearSyncope"), nearSyncope("rosDizziness"), nearSyncope("rosPalpitations")],
  rosImportantNegatives: [nearSyncope("rosDeniesChestPain")],
  rosRedFlags: [nearSyncope("rfInjuryFromFall"), nearSyncope("rfRecurrentEvents")],
  physicalExam: { cardiovascular: [nearSyncope("examNeuroCardiacAssessment"), nearSyncope("examVolumeStatus"), nearSyncope("examInjuryAssessment")], general: [nearSyncope("examGeneralAppearance")] },
  mdmWorkingAssessment: [nearSyncope("mdmNearSyncopePresentation")],
  mdmDifferentialSynthesis: [nearSyncope("diffArrhythmia"), nearSyncope("diffVasovagalOrthostatic"), nearSyncope("diffDehydration"), nearSyncope("diffAcsPe"), nearSyncope("diffAnemiaGiBleed"), nearSyncope("diffNeurologicCause")],
  mdmDataReviewed: [nearSyncope("mdmEkgLabsMonitoringIfObtained")],
  mdmClinicalRationale: [nearSyncope("mdmFallRiskDiscussed"), nearSyncope("mdmCardiologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [nearSyncope("mdmObservationIfHighRisk")],
  reassessment: [nearSyncope("reassessRecurrenceInjury")],
  followUpDisposition: [nearSyncope("dispDrivingPrecautionsAsDirected")],
});

export const EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [exertionalDyspnea("hpiExertionalThreshold"), exertionalDyspnea("hpiBaselineFunctionOrthopnea"), exertionalDyspnea("hpiChestPainCoughWheeze"), exertionalDyspnea("hpiCardiacPulmonaryPeRisk")],
  rosImportantPositives: [exertionalDyspnea("rosExertionalSob"), exertionalDyspnea("rosChestPain"), exertionalDyspnea("rosEdema")],
  rosImportantNegatives: [exertionalDyspnea("rosDeniesRestSob")],
  rosRedFlags: [exertionalDyspnea("rfRestDyspnea"), exertionalDyspnea("rfHypoxiaConcern")],
  physicalExam: { cardiovascular: [exertionalDyspnea("examWorkOfBreathing"), exertionalDyspnea("examLungCardiacFindings"), exertionalDyspnea("examEdemaOxygenNeed")], general: [exertionalDyspnea("examGeneralAppearance")] },
  mdmWorkingAssessment: [exertionalDyspnea("mdmExertionalDyspneaPresentation")],
  mdmDifferentialSynthesis: [exertionalDyspnea("diffChf"), exertionalDyspnea("diffAcs"), exertionalDyspnea("diffCopdAsthma"), exertionalDyspnea("diffPneumonia"), exertionalDyspnea("diffPe"), exertionalDyspnea("diffAnemia")],
  mdmDataReviewed: [exertionalDyspnea("mdmCxrEkgLabsIfObtained")],
  mdmClinicalRationale: [exertionalDyspnea("mdmOxygenPlanIfGiven"), exertionalDyspnea("mdmCardiologyPulmonaryFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [exertionalDyspnea("mdmAdmissionIfIndicated")],
  reassessment: [exertionalDyspnea("reassessExertionalLimitation")],
  followUpDisposition: [exertionalDyspnea("dispReturnWorseningBreathingChestPain")],
});

export const EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [edemaVolumeOverload("hpiDistributionDuration"), edemaVolumeOverload("hpiWeightGainDyspnea"), edemaVolumeOverload("hpiUrineOutputMedAdherence"), edemaVolumeOverload("hpiRenalLiverHeartHistory")],
  rosImportantPositives: [edemaVolumeOverload("rosEdema"), edemaVolumeOverload("rosDyspnea"), edemaVolumeOverload("rosWeightGain")],
  rosImportantNegatives: [edemaVolumeOverload("rosDeniesUnilateralWarmth")],
  rosRedFlags: [edemaVolumeOverload("rfRapidWeightGain"), edemaVolumeOverload("rfSevereDyspnea")],
  physicalExam: { cardiovascular: [edemaVolumeOverload("examEdemaSeverity"), edemaVolumeOverload("examLungFindingsIfDocumented"), edemaVolumeOverload("examPerfusionSkinChanges")], general: [edemaVolumeOverload("examGeneralAppearance")] },
  mdmWorkingAssessment: [edemaVolumeOverload("mdmVolumeOverloadPresentation")],
  mdmDifferentialSynthesis: [edemaVolumeOverload("diffChf"), edemaVolumeOverload("diffRenalDisease"), edemaVolumeOverload("diffLiverDisease"), edemaVolumeOverload("diffVenousInsufficiency"), edemaVolumeOverload("diffMedicationRelated"), edemaVolumeOverload("diffDvtIfUnilateral")],
  mdmDataReviewed: [edemaVolumeOverload("mdmLabsImagingReviewedIfObtained")],
  mdmClinicalRationale: [edemaVolumeOverload("mdmDiureticPlanIfGiven"), edemaVolumeOverload("mdmNephrologyCardiologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [edemaVolumeOverload("mdmAdmissionIfIndicated")],
  reassessment: [edemaVolumeOverload("reassessVolumeRespiratoryStatus")],
  followUpDisposition: [edemaVolumeOverload("dispReturnSobChestPainRapidSwelling")],
});

export const CARDIAC_COMPLAINT_V1_TEMPLATE_IDS = [
  "palpitations_complaint_v1",
  "hypertension_complaint_v1",
  "leg_swelling_dvt_complaint_v1",
  "chf_symptoms_complaint_v1",
  "afib_rapid_rate_complaint_v1",
  "generalized_weakness_cardiac_equivalent_complaint_v1",
  "near_syncope_complaint_v1",
  "exertional_dyspnea_complaint_v1",
  "edema_volume_overload_complaint_v1"
] as const;

export const CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  palpitations_complaint_v1: PALPITATIONS_COMPLAINT_V1_INTEL,
  hypertension_complaint_v1: HYPERTENSION_COMPLAINT_V1_INTEL,
  leg_swelling_dvt_complaint_v1: LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  chf_symptoms_complaint_v1: CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  afib_rapid_rate_complaint_v1: AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  generalized_weakness_cardiac_equivalent_complaint_v1: GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  near_syncope_complaint_v1: NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  exertional_dyspnea_complaint_v1: EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  edema_volume_overload_complaint_v1: EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
} as const;