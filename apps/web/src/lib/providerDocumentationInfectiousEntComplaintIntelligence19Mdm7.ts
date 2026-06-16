/** Phase 19MDM.7 — Infectious / ENT complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { buildFeverComplaintV1Intel } from "./providerDocumentationAdultFeverComplaintIntelGoldStandard";
import {
  buildAbscessSoftTissueComplaintV1Intel,
  buildCellulitisSkinInfectionComplaintV1Intel,
  buildRashSkinComplaintV1Intel,
  buildWoundInfectionComplaintV1Intel,
} from "./providerDocumentationRashSkinComplaintIntelGoldStandard";
import { buildSoreThroatComplaintIntel } from "./providerDocumentationSoreThroatComplaintIntelGoldStandard";
import { buildDehydrationViralIllnessComplaintIntel } from "./providerDocumentationDehydrationViralIllnessComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const fever = (key: string) => `providerDocumentationComplaintIntel.feverComplaintV1.${key}`;
const cellulitisSkinInfection = (key: string) => `providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.${key}`;
const abscessSoftTissue = (key: string) => `providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.${key}`;
const woundInfection = (key: string) => `providerDocumentationComplaintIntel.woundInfectionComplaintV1.${key}`;
const earPainOtitis = (key: string) => `providerDocumentationComplaintIntel.earPainOtitisComplaintV1.${key}`;
const sinusSymptoms = (key: string) => `providerDocumentationComplaintIntel.sinusSymptomsComplaintV1.${key}`;
const dentalPainInfection = (key: string) => `providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.${key}`;
const rashSkin = (key: string) => `providerDocumentationComplaintIntel.rashSkinComplaintV1.${key}`;
const soreThroatInfectious = (key: string) => `providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1.${key}`;
const dehydrationViralIllness = (key: string) => `providerDocumentationComplaintIntel.dehydrationViralIllnessComplaintV1.${key}`;

export const FEVER_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = buildFeverComplaintV1Intel(fever);

export const CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildCellulitisSkinInfectionComplaintV1Intel(cellulitisSkinInfection);

export const ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAbscessSoftTissueComplaintV1Intel(abscessSoftTissue);

export const WOUND_INFECTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildWoundInfectionComplaintV1Intel(woundInfection);

export const EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    earPainOtitis("hpiEarPainBeganToday"),
    earPainOtitis("hpiEarPainSeveralDays"),
    earPainOtitis("hpiLeftEarPain"),
    earPainOtitis("hpiRightEarPain"),
    earPainOtitis("hpiDecreasedHearing"),
    earPainOtitis("hpiPurulentOtorrhea"),
    earPainOtitis("hpiSerousOtorrhea"),
    earPainOtitis("hpiFever"),
    earPainOtitis("hpiAssociatedUri"),
    earPainOtitis("hpiSwimmingExposure"),
    earPainOtitis("hpiEarTrauma"),
    earPainOtitis("hpiPossibleForeignBody"),
    earPainOtitis("hpiMastoidPain"),
    earPainOtitis("hpiTinnitus"),
    earPainOtitis("hpiRecentAntibiotics"),
  ],
  rosImportantPositives: [
    earPainOtitis("rosEarPain"),
    earPainOtitis("rosOtorrhea"),
    earPainOtitis("rosHearingChange"),
    earPainOtitis("rosFever"),
    earPainOtitis("rosTinnitus"),
    earPainOtitis("rosVertigo"),
    earPainOtitis("rosUriSymptoms"),
    earPainOtitis("rosMastoidPain"),
  ],
  rosImportantNegatives: [
    earPainOtitis("rosDeniesMastoidSwelling"),
    earPainOtitis("rosDeniesFacialWeakness"),
  ],
  rosRedFlags: [
    earPainOtitis("rfSevereEarPain"),
    earPainOtitis("rfMastoidSwelling"),
    earPainOtitis("rfFacialWeakness"),
    earPainOtitis("rfAlteredMentalStatus"),
    earPainOtitis("rfHypotension"),
  ],
  physicalExam: {
    heent: [
      earPainOtitis("examErythematousTympanicMembrane"),
      earPainOtitis("examBulgingTympanicMembrane"),
      earPainOtitis("examPerforatedTympanicMembrane"),
      earPainOtitis("examErythematousEarCanal"),
      earPainOtitis("examCanalEdema"),
      earPainOtitis("examPurulentOtorrhea"),
      earPainOtitis("examMastoidTenderness"),
      earPainOtitis("examPinnaTenderness"),
      earPainOtitis("examCanalForeignBody"),
      earPainOtitis("examFacialNerveIntact"),
      earPainOtitis("examFacialWeakness"),
    ],
    general: [earPainOtitis("examWellAppearing"), earPainOtitis("examUncomfortableAppearing")],
  },
  mdmWorkingAssessment: [
    earPainOtitis("waSuspectedAcuteOtitisMedia"),
    earPainOtitis("waSuspectedOtitisExterna"),
    earPainOtitis("waAtypicalEarPain"),
  ],
  mdmDifferentialSynthesis: [
    earPainOtitis("diffAcuteOtitisMedia"),
    earPainOtitis("diffOtitisExterna"),
    earPainOtitis("diffMastoiditis"),
    earPainOtitis("diffCerumenImpaction"),
    earPainOtitis("diffForeignBody"),
    earPainOtitis("diffTympanicMembranePerforation"),
    earPainOtitis("diffEustachianTubeDysfunction"),
    earPainOtitis("diffDentalTmjReferredPain"),
    earPainOtitis("diffCholesteatoma"),
    earPainOtitis("diffHearingLoss"),
    earPainOtitis("diffMalignantOtitisExterna"),
    earPainOtitis("diffPeriauricularCellulitis"),
    earPainOtitis("diffViralUriOtalgia"),
    earPainOtitis("diffIntracranialExtension"),
    earPainOtitis("diffSepsis"),
  ],
  mdmDataReviewed: [
    earPainOtitis("mdmOtoscopyPerformed"),
    earPainOtitis("mdmAudiometryReviewed"),
    earPainOtitis("mdmPriorEntRecordsReviewed"),
    earPainOtitis("mdmCultureReviewed"),
    earPainOtitis("mdmCtTemporalBoneReviewed"),
    earPainOtitis("mdmCbcReviewed"),
  ],
  mdmRiskStratification: [
    earPainOtitis("riskLowSuspicionMastoiditis"),
    earPainOtitis("riskModerateSuspicionComplicatedOtitis"),
    earPainOtitis("riskHighSuspicionMastoiditisOrIntracranialSpread"),
  ],
  mdmClinicalRationale: [
    earPainOtitis("reasoningMostConsistentWithOtitisMedia"),
    earPainOtitis("reasoningLowSuspicionMastoiditis"),
    earPainOtitis("reasoningLowSuspicionIntracranialExtension"),
  ],
  clinicalImpression: [
    earPainOtitis("impAcuteOtitisMedia"),
    earPainOtitis("impOtitisExterna"),
    earPainOtitis("impCerumenImpaction"),
    earPainOtitis("impForeignBody"),
  ],
  mdmPlanSummary: [
    earPainOtitis("planTopicalAntibioticsPrescribed"),
    earPainOtitis("planOralAntibioticsPrescribed"),
    earPainOtitis("planPainControlPrescribed"),
    earPainOtitis("planEntFollowUpRecommended"),
    earPainOtitis("planReturnPrecautionsDiscussed"),
  ],
  mdmAdmitObserveDischarge: [
    earPainOtitis("dispObservation"),
    earPainOtitis("dispAdmission"),
    earPainOtitis("dispDischarge"),
  ],
  reassessment: [
    earPainOtitis("reassessEarPainImproved"),
    earPainOtitis("reassessHearingImproved"),
    earPainOtitis("reassessSymptomsImprovedAfterTreatment"),
  ],
  followUpDisposition: [
    earPainOtitis("dispReturnWorseningPainSwellingFever"),
    earPainOtitis("dispUrgentEntFollowUp"),
    earPainOtitis("dispReturnFacialWeaknessHearingLoss"),
    earPainOtitis("dispReturnAlteredMentalStatus"),
  ],
});

export const SINUS_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    sinusSymptoms("hpiFacialPressure"),
    sinusSymptoms("hpiNasalCongestion"),
    sinusSymptoms("hpiMaxillaryPain"),
    sinusSymptoms("hpiFrontalPain"),
    sinusSymptoms("hpiSymptomsSeveralDays"),
    sinusSymptoms("hpiPurulentNasalDrainage"),
    sinusSymptoms("hpiPostNasalDrainage"),
    sinusSymptoms("hpiRecentUri"),
    sinusSymptoms("hpiOverlappingDentalPain"),
    sinusSymptoms("hpiHeadacheWithSinusSymptoms"),
    sinusSymptoms("hpiPriorAntibiotics"),
    sinusSymptoms("hpiSeasonalAllergies"),
    sinusSymptoms("hpiPriorSinusSurgery"),
  ],
  rosImportantPositives: [
    sinusSymptoms("rosCongestion"),
    sinusSymptoms("rosFacialPain"),
    sinusSymptoms("rosRhinorrhea"),
    sinusSymptoms("rosPostNasalDrip"),
    sinusSymptoms("rosFever"),
    sinusSymptoms("rosCoughFromDrainage"),
    sinusSymptoms("rosSinusHeadache"),
    sinusSymptoms("rosDentalDiscomfort"),
    sinusSymptoms("rosAnosmia"),
    sinusSymptoms("rosFatigue"),
  ],
  rosImportantNegatives: [
    sinusSymptoms("rosDeniesVisionChange"),
    sinusSymptoms("rosDeniesProptosis"),
  ],
  rosRedFlags: [
    sinusSymptoms("rfPeriorbitalSwelling"),
    sinusSymptoms("rfVisionChange"),
    sinusSymptoms("rfHighFever"),
    sinusSymptoms("rfAlteredMentalStatus"),
  ],
  physicalExam: {
    heent: [
      sinusSymptoms("examMaxillarySinusTenderness"),
      sinusSymptoms("examFrontalSinusTenderness"),
      sinusSymptoms("examNasalMucosalEdema"),
      sinusSymptoms("examPurulentNasalDischarge"),
      sinusSymptoms("examPostNasalDrainage"),
      sinusSymptoms("examFacialSwelling"),
      sinusSymptoms("examPeriorbitalSwelling"),
      sinusSymptoms("examProptosis"),
    ],
    general: [sinusSymptoms("examWellAppearing"), sinusSymptoms("examToxicAppearing")],
  },
  mdmWorkingAssessment: [
    sinusSymptoms("waAcuteSinusSymptoms"),
    sinusSymptoms("waConcernForOrbitalComplication"),
    sinusSymptoms("waConcernForIntracranialComplication"),
  ],
  mdmDifferentialSynthesis: [
    sinusSymptoms("diffAcuteBacterialSinusitis"),
    sinusSymptoms("diffViralUri"),
    sinusSymptoms("diffChronicSinusitis"),
    sinusSymptoms("diffAllergicRhinitis"),
    sinusSymptoms("diffDentalInfection"),
    sinusSymptoms("diffPeriapicalAbscess"),
    sinusSymptoms("diffNasalPolypDisease"),
    sinusSymptoms("diffFungalSinusitis"),
    sinusSymptoms("diffFacialCellulitis"),
    sinusSymptoms("diffMigraine"),
    sinusSymptoms("diffClusterHeadache"),
    sinusSymptoms("diffTensionHeadache"),
    sinusSymptoms("diffOtitisMedia"),
    sinusSymptoms("diffPeriorbitalCellulitis"),
    sinusSymptoms("diffOrbitalCellulitis"),
    sinusSymptoms("diffIntracranialExtension"),
    sinusSymptoms("diffCavernousSinusThrombosis"),
    sinusSymptoms("diffInvasiveFungalSinusitis"),
    sinusSymptoms("diffSepsis"),
    sinusSymptoms("diffMeningitis"),
  ],
  mdmDataReviewed: [
    sinusSymptoms("mdmPriorEntRecordsReviewed"),
    sinusSymptoms("mdmPreviousImagingReviewed"),
    sinusSymptoms("mdmCtSinusReviewed"),
    sinusSymptoms("mdmCultureReviewed"),
    sinusSymptoms("mdmAntibioticHistoryReviewed"),
    sinusSymptoms("mdmSpecialistConsultationReviewed"),
  ],
  mdmRiskStratification: [
    sinusSymptoms("riskLowSuspicionOrbitalSpread"),
    sinusSymptoms("riskModerateSuspicionComplicatedSinusitis"),
    sinusSymptoms("riskHighSuspicionOrbitalOrIntracranialSpread"),
  ],
  mdmClinicalRationale: [
    sinusSymptoms("reasoningMostConsistentWithAcuteSinusitis"),
    sinusSymptoms("reasoningLowSuspicionOrbitalComplication"),
    sinusSymptoms("reasoningLowSuspicionIntracranialExtension"),
  ],
  clinicalImpression: [
    sinusSymptoms("impAcuteBacterialSinusitis"),
    sinusSymptoms("impChronicSinusitis"),
    sinusSymptoms("impViralUpperRespiratoryInfection"),
    sinusSymptoms("impAllergicRhinitis"),
  ],
  mdmPlanSummary: [
    sinusSymptoms("planSupportiveCareDiscussed"),
    sinusSymptoms("planIntranasalSteroidsPrescribed"),
    sinusSymptoms("planAntibioticsPrescribed"),
    sinusSymptoms("planSalineIrrigationDiscussed"),
    sinusSymptoms("planEntFollowUpRecommended"),
    sinusSymptoms("planReturnPrecautionsDiscussed"),
  ],
  mdmAdmitObserveDischarge: [
    sinusSymptoms("dispObservation"),
    sinusSymptoms("dispAdmission"),
    sinusSymptoms("dispDischarge"),
  ],
  reassessment: [
    sinusSymptoms("reassessFacialPainImproved"),
    sinusSymptoms("reassessNasalCongestionImproved"),
    sinusSymptoms("reassessOrbitalFindingsStable"),
  ],
  followUpDisposition: [
    sinusSymptoms("dispReturnWorseningHeadacheVisionSwelling"),
    sinusSymptoms("dispUrgentEntFollowUp"),
    sinusSymptoms("dispReturnAlteredMentalStatus"),
    sinusSymptoms("dispReturnVisionChangeProptosis"),
  ],
});

export const DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [dentalPainInfection("hpiToothPainSwellingDrainage"), dentalPainInfection("hpiTraumaFeverFacialSwelling"), dentalPainInfection("hpiSwallowingDifficulty")],
  rosImportantPositives: [dentalPainInfection("rosDentalPain"), dentalPainInfection("rosFacialSwelling"), dentalPainInfection("rosFever")],
  rosImportantNegatives: [dentalPainInfection("rosDeniesDysphagia")],
  rosRedFlags: [dentalPainInfection("rfAirwayConcern"), dentalPainInfection("rfDeepSpaceInfectionConcern")],
  physicalExam: { skin: [dentalPainInfection("examOralSwellingIfDocumented"), dentalPainInfection("examGingivalFindingsIfDocumented"), dentalPainInfection("examAirwayConcernsIfDocumented")], general: [dentalPainInfection("examGeneralAppearance")] },
  mdmWorkingAssessment: [dentalPainInfection("mdmDentalInfectionPresentation")],
  mdmDifferentialSynthesis: [dentalPainInfection("diffDentalInfection"), dentalPainInfection("diffAbscess"), dentalPainInfection("diffGingivitis"), dentalPainInfection("diffDeepSpaceInfectionConcern")],
  mdmDataReviewed: [dentalPainInfection("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [dentalPainInfection("mdmAntibioticPainPlanIfGiven"), dentalPainInfection("mdmDentalOralSurgeryFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [dentalPainInfection("mdmObservationIfHighRisk")],
  reassessment: [dentalPainInfection("reassessSwellingDysphagia")],
  followUpDisposition: [dentalPainInfection("dispReturnWorseningSwellingFeverDysphagia")],
});

export const RASH_SKIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = buildRashSkinComplaintV1Intel(rashSkin);

export const SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL = buildSoreThroatComplaintIntel(soreThroatInfectious);

export const DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL = buildDehydrationViralIllnessComplaintIntel(dehydrationViralIllness);

export const INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS = [
  "fever_complaint_v1",
  "cellulitis_skin_infection_complaint_v1",
  "abscess_soft_tissue_complaint_v1",
  "wound_infection_complaint_v1",
  "ear_pain_otitis_complaint_v1",
  "sinus_symptoms_complaint_v1",
  "dental_pain_infection_complaint_v1",
  "rash_skin_complaint_v1",
  "sore_throat_infectious_complaint_v1",
  "dehydration_viral_illness_complaint_v1"
] as const;

export const INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  fever_complaint_v1: FEVER_COMPLAINT_V1_INTEL,
  cellulitis_skin_infection_complaint_v1: CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  abscess_soft_tissue_complaint_v1: ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  wound_infection_complaint_v1: WOUND_INFECTION_COMPLAINT_V1_INTEL,
  ear_pain_otitis_complaint_v1: EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  sinus_symptoms_complaint_v1: SINUS_SYMPTOMS_COMPLAINT_V1_INTEL,
  dental_pain_infection_complaint_v1: DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL,
  rash_skin_complaint_v1: RASH_SKIN_COMPLAINT_V1_INTEL,
  sore_throat_infectious_complaint_v1: SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL,
  dehydration_viral_illness_complaint_v1: DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
} as const;