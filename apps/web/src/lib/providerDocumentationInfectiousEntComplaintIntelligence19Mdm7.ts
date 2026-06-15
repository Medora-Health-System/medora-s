/** Phase 19MDM.7 — Infectious / ENT complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
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

export const FEVER_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [fever("hpiDurationTmaxAntipyretics"), fever("hpiCoughSoreThroatUri"), fever("hpiUrinaryAbdominalRash"), fever("hpiImmunocompromisedTravelContacts")],
  rosImportantPositives: [fever("rosFever"), fever("rosCough"), fever("rosSoreThroat")],
  rosImportantNegatives: [fever("rosDeniesAlteredMentalStatus")],
  rosRedFlags: [fever("rfPersistentHighFever"), fever("rfAlteredMentalStatus")],
  physicalExam: { skin: [fever("examHydrationIfDocumented"), fever("examRespiratoryStatusIfDocumented"), fever("examMentalStatusIfDocumented"), fever("examSkinFindingsIfDocumented")], general: [fever("examGeneralAppearance")] },
  mdmWorkingAssessment: [fever("mdmFeverPresentation")],
  mdmDifferentialSynthesis: [fever("diffViralSyndrome"), fever("diffPneumonia"), fever("diffUti"), fever("diffCellulitis"), fever("diffSepsisConsideration"), fever("diffMeningitisConsideration")],
  mdmDataReviewed: [fever("mdmLabsImagingReviewedIfObtained")],
  mdmClinicalRationale: [fever("mdmAntipyreticFluidPlanIfGiven"), fever("mdmInfectiousDiseaseFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [fever("mdmObservationIfHighRisk")],
  reassessment: [fever("reassessFeverHydrationStatus")],
  followUpDisposition: [fever("dispReturnWorseningFeverConfusionDehydration")],
});

export const CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [cellulitisSkinInfection("hpiRednessSwellingWarmth"), cellulitisSkinInfection("hpiDrainageTraumaInsectBite"), cellulitisSkinInfection("hpiFeverStreakingImmunocompromised")],
  rosImportantPositives: [cellulitisSkinInfection("rosSkinRedness"), cellulitisSkinInfection("rosSwelling"), cellulitisSkinInfection("rosFever")],
  rosImportantNegatives: [cellulitisSkinInfection("rosDeniesDrainage")],
  rosRedFlags: [cellulitisSkinInfection("rfRapidSpreadConcern"), cellulitisSkinInfection("rfFeverConcern")],
  physicalExam: { skin: [cellulitisSkinInfection("examErythemaExtentIfDocumented"), cellulitisSkinInfection("examFluctuanceDrainageIfDocumented"), cellulitisSkinInfection("examNeurovascularStatusIfDocumented")], general: [cellulitisSkinInfection("examGeneralAppearance")] },
  mdmWorkingAssessment: [cellulitisSkinInfection("mdmCellulitisPresentation")],
  mdmDifferentialSynthesis: [cellulitisSkinInfection("diffCellulitis"), cellulitisSkinInfection("diffAbscess"), cellulitisSkinInfection("diffNecrotizingInfectionConcern"), cellulitisSkinInfection("diffDvt"), cellulitisSkinInfection("diffDermatitis")],
  mdmDataReviewed: [cellulitisSkinInfection("mdmLabsImagingReviewedIfObtained")],
  mdmClinicalRationale: [cellulitisSkinInfection("mdmAntibioticPlanIfGiven"), cellulitisSkinInfection("mdmRecheckFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [cellulitisSkinInfection("mdmObservationIfHighRisk")],
  reassessment: [cellulitisSkinInfection("reassessSpreadFever")],
  followUpDisposition: [cellulitisSkinInfection("dispReturnWorseningRednessFeverDrainage")],
});

export const ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [abscessSoftTissue("hpiSwellingDrainagePriorAbscess"), abscessSoftTissue("hpiFeverDiabetesImmunocompromised"), abscessSoftTissue("hpiIvDrugUseIfApplicable")],
  rosImportantPositives: [abscessSoftTissue("rosSwelling"), abscessSoftTissue("rosPain"), abscessSoftTissue("rosFever")],
  rosImportantNegatives: [abscessSoftTissue("rosDeniesSpreadingRedness")],
  rosRedFlags: [abscessSoftTissue("rfNecrotizingConcern"), abscessSoftTissue("rfSeverePainConcern")],
  physicalExam: { skin: [abscessSoftTissue("examFluctuanceIfDocumented"), abscessSoftTissue("examSurroundingErythema"), abscessSoftTissue("examDrainageLocationIfDocumented")], general: [abscessSoftTissue("examGeneralAppearance")] },
  mdmWorkingAssessment: [abscessSoftTissue("mdmAbscessPresentation")],
  mdmDifferentialSynthesis: [abscessSoftTissue("diffAbscess"), abscessSoftTissue("diffCellulitis"), abscessSoftTissue("diffInfectedCyst"), abscessSoftTissue("diffNecrotizingInfectionConcern")],
  mdmDataReviewed: [abscessSoftTissue("mdmCultureReviewedIfObtained")],
  mdmClinicalRationale: [abscessSoftTissue("mdmIdProcedureReassessmentIfPerformed"), abscessSoftTissue("mdmSurgicalFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [abscessSoftTissue("mdmObservationIfHighRisk")],
  reassessment: [abscessSoftTissue("reassessPainSwellingAfterProcedure")],
  followUpDisposition: [abscessSoftTissue("dispReturnWorseningPainFeverWoundCare")],
});

export const WOUND_INFECTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [woundInfection("hpiInjurySurgeryTiming"), woundInfection("hpiDrainageRednessPain"), woundInfection("hpiFeverForeignBodyTetanus")],
  rosImportantPositives: [woundInfection("rosWoundPain"), woundInfection("rosDrainage"), woundInfection("rosFever")],
  rosImportantNegatives: [woundInfection("rosDeniesForeignBodySensation")],
  rosRedFlags: [woundInfection("rfDeepInfectionConcern"), woundInfection("rfJointInvolvementConcern")],
  physicalExam: { skin: [woundInfection("examWoundAppearanceIfDocumented"), woundInfection("examDrainageErythemaIfDocumented"), woundInfection("examRomNearJointIfDocumented")], general: [woundInfection("examGeneralAppearance")] },
  mdmWorkingAssessment: [woundInfection("mdmWoundInfectionPresentation")],
  mdmDifferentialSynthesis: [woundInfection("diffSuperficialInfection"), woundInfection("diffAbscess"), woundInfection("diffRetainedForeignBody"), woundInfection("diffDeepSoftTissueInfection")],
  mdmDataReviewed: [woundInfection("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [woundInfection("mdmWoundCarePlanIfGiven"), woundInfection("mdmWoundFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [woundInfection("mdmObservationIfHighRisk")],
  reassessment: [woundInfection("reassessDrainageRedness")],
  followUpDisposition: [woundInfection("dispReturnWorseningDrainageFever")],
});

export const EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [
    earPainOtitis("hpiOnsetHearingDrainageFever"),
    earPainOtitis("hpiLateralityReviewed"),
    earPainOtitis("hpiUriSymptoms"),
    earPainOtitis("hpiSwimmingExposure"),
    earPainOtitis("hpiTraumaToEar"),
    earPainOtitis("hpiForeignBodyConcern"),
    earPainOtitis("hpiMastoidPainDizziness"),
    earPainOtitis("hpiTinnitusReviewed"),
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
    earPainOtitis("rfMastoiditisConcern"),
    earPainOtitis("rfSevereEarPain"),
    earPainOtitis("rfAlteredMs"),
    earPainOtitis("rfHypotensionConcern"),
    earPainOtitis("rfFacialNerveConcern"),
  ],
  physicalExam: {
    heent: [
      earPainOtitis("examTmFindingsIfDocumented"),
      earPainOtitis("examCanalFindingsIfDocumented"),
      earPainOtitis("examExternalEarFindingsIfDocumented"),
      earPainOtitis("examMastoidTendernessIfDocumented"),
      earPainOtitis("examDrainageFindingsIfDocumented"),
      earPainOtitis("examForeignBodyFindingsIfDocumented"),
      earPainOtitis("examFacialNerveIfDocumented"),
    ],
    general: [earPainOtitis("examGeneralAppearance")],
  },
  mdmWorkingAssessment: [
    earPainOtitis("mdmEarPainPresentation"),
    earPainOtitis("mdmMastoiditisConsidered"),
    earPainOtitis("mdmMalignantOtitisExternaConsidered"),
  ],
  mdmDifferentialSynthesis: [
    earPainOtitis("diffOtitisMedia"),
    earPainOtitis("diffOtitisExterna"),
    earPainOtitis("diffMastoiditis"),
    earPainOtitis("diffCerumenImpaction"),
    earPainOtitis("diffForeignBody"),
    earPainOtitis("diffTmPerforation"),
    earPainOtitis("diffEustachianTubeDysfunction"),
    earPainOtitis("diffDentalTmjReferredPain"),
    earPainOtitis("diffCholesteatoma"),
    earPainOtitis("diffHearingLossSyndrome"),
    earPainOtitis("diffMalignantOtitisExterna"),
    earPainOtitis("diffCellulitis"),
    earPainOtitis("diffViralUriAssociatedOtalgia"),
    earPainOtitis("diffIntracranialExtensionConcern"),
    earPainOtitis("diffSepsisConcern"),
  ],
  mdmDataReviewed: [
    earPainOtitis("mdmOtoscopyDocumented"),
    earPainOtitis("mdmHearingAssessmentReviewed"),
    earPainOtitis("mdmPriorEntRecordsReviewed"),
    earPainOtitis("mdmCultureReviewedIfObtained"),
    earPainOtitis("mdmCtTemporalBoneConsidered"),
    earPainOtitis("mdmLabsReviewedIfSevereInfection"),
  ],
  mdmClinicalRationale: [
    earPainOtitis("mdmTopicalTherapyIfGiven"),
    earPainOtitis("mdmAntibioticPlanIfGiven"),
    earPainOtitis("mdmPainControlAddressed"),
    earPainOtitis("mdmEntConsultationIfIndicated"),
    earPainOtitis("mdmForeignBodyRemovalPlanIfPerformed"),
  ],
  mdmPlanSummary: [
    earPainOtitis("mdmTopicalAntibioticPlan"),
    earPainOtitis("mdmOralAntibioticPlan"),
    earPainOtitis("mdmObservationPlan"),
  ],
  mdmImmediateActionsRationale: [
    earPainOtitis("mdmPainControlInitiated"),
    earPainOtitis("mdmForeignBodyRemovalAttempted"),
  ],
  mdmAdmitObserveDischarge: [
    earPainOtitis("mdmObservationIfHighRisk"),
    earPainOtitis("mdmAdmissionIfIndicated"),
    earPainOtitis("mdmDischargeAfterReassurance"),
  ],
  reassessment: [
    earPainOtitis("reassessPainHearing"),
    earPainOtitis("reassessMastoidFindings"),
    earPainOtitis("reassessResponseToTreatment"),
  ],
  followUpDisposition: [
    earPainOtitis("dispReturnWorseningPainSwellingFever"),
    earPainOtitis("dispUrgentEntFollowUp"),
    earPainOtitis("dispReturnFacialWeaknessHearingLoss"),
    earPainOtitis("dispReturnAlteredMentalStatus"),
  ],
});

export const SINUS_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [sinusSymptoms("hpiCongestionFacialPainPressure"), sinusSymptoms("hpiFeverDrainage"), sinusSymptoms("hpiHeadacheDentalVisionSymptoms")],
  rosImportantPositives: [sinusSymptoms("rosCongestion"), sinusSymptoms("rosFacialPain"), sinusSymptoms("rosFever")],
  rosImportantNegatives: [sinusSymptoms("rosDeniesVisionChange")],
  rosRedFlags: [sinusSymptoms("rfPeriorbitalSwellingConcern"), sinusSymptoms("rfSevereHeadacheConcern")],
  physicalExam: { skin: [sinusSymptoms("examSinusTendernessIfDocumented"), sinusSymptoms("examEntFindingsIfDocumented")], general: [sinusSymptoms("examGeneralAppearance")] },
  mdmWorkingAssessment: [sinusSymptoms("mdmSinusSymptomsPresentation")],
  mdmDifferentialSynthesis: [sinusSymptoms("diffViralUri"), sinusSymptoms("diffSinusitis"), sinusSymptoms("diffDentalSource"), sinusSymptoms("diffAllergicRhinitis"), sinusSymptoms("diffDeeperInfectionConcern")],
  mdmDataReviewed: [sinusSymptoms("mdmImagingReviewedIfObtained")],
  mdmClinicalRationale: [sinusSymptoms("mdmSymptomaticPlanIfGiven"), sinusSymptoms("mdmEntDentalFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [sinusSymptoms("mdmObservationIfHighRisk")],
  reassessment: [sinusSymptoms("reassessHeadacheSwelling")],
  followUpDisposition: [sinusSymptoms("dispReturnWorseningHeadacheVisionSwelling")],
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

export const RASH_SKIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [rashSkin("hpiOnsetSpreadItchingPain"), rashSkin("hpiExposuresMedication"), rashSkin("hpiFeverMucosalInvolvement")],
  rosImportantPositives: [rashSkin("rosRash"), rashSkin("rosItching"), rashSkin("rosFever")],
  rosImportantNegatives: [rashSkin("rosDeniesMucosalInvolvement")],
  rosRedFlags: [rashSkin("rfPurpuraConcern"), rashSkin("rfMucosalInvolvementConcern")],
  physicalExam: { skin: [rashSkin("examDistributionIfDocumented"), rashSkin("examBlanchingVesiclesPurpuraIfDocumented")], general: [rashSkin("examGeneralAppearance")] },
  mdmWorkingAssessment: [rashSkin("mdmRashPresentation")],
  mdmDifferentialSynthesis: [rashSkin("diffDermatitis"), rashSkin("diffAllergicReaction"), rashSkin("diffViralExanthem"), rashSkin("diffCellulitis"), rashSkin("diffVasculiticEmergentRashConcern")],
  mdmDataReviewed: [rashSkin("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [rashSkin("mdmAntihistamineSteroidPlanIfGiven"), rashSkin("mdmDermatologyFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [rashSkin("mdmObservationIfHighRisk")],
  reassessment: [rashSkin("reassessRashSpreadFever")],
  followUpDisposition: [rashSkin("dispReturnWorseningRashFeverMucosal")],
});

export const SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [soreThroatInfectious("hpiFeverCoughSwallowingPain"), soreThroatInfectious("hpiDroolingVoiceChange"), soreThroatInfectious("hpiNeckSwellingRashContacts")],
  rosImportantPositives: [soreThroatInfectious("rosSoreThroat"), soreThroatInfectious("rosFever"), soreThroatInfectious("rosDysphagia")],
  rosImportantNegatives: [soreThroatInfectious("rosDeniesDrooling")],
  rosRedFlags: [soreThroatInfectious("rfAirwayConcern"), soreThroatInfectious("rfNeckSwellingConcern")],
  physicalExam: { skin: [soreThroatInfectious("examTonsilsUvulaExudatesIfDocumented"), soreThroatInfectious("examAirwayFindingsIfDocumented"), soreThroatInfectious("examNeckSwellingIfDocumented")], general: [soreThroatInfectious("examGeneralAppearance")] },
  mdmWorkingAssessment: [soreThroatInfectious("mdmSoreThroatPresentation")],
  mdmDifferentialSynthesis: [soreThroatInfectious("diffViralPharyngitis"), soreThroatInfectious("diffStrep"), soreThroatInfectious("diffPtaRpaConcern"), soreThroatInfectious("diffMono"), soreThroatInfectious("diffViralSyndrome")],
  mdmDataReviewed: [soreThroatInfectious("mdmRapidStrepCultureReviewedIfObtained")],
  mdmClinicalRationale: [soreThroatInfectious("mdmHydrationAirwayPrecautionsIfApplicable"), soreThroatInfectious("mdmEntFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [soreThroatInfectious("mdmObservationIfHighRisk")],
  reassessment: [soreThroatInfectious("reassessAirwayHydration")],
  followUpDisposition: [soreThroatInfectious("dispReturnAirwaySymptomsWorseningPainFever")],
});

export const DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [dehydrationViralIllness("hpiVomitingDiarrheaOralIntake"), dehydrationViralIllness("hpiUrineOutputFeverDizziness"), dehydrationViralIllness("hpiWeaknessSickContacts")],
  rosImportantPositives: [dehydrationViralIllness("rosVomiting"), dehydrationViralIllness("rosDiarrhea"), dehydrationViralIllness("rosDizziness")],
  rosImportantNegatives: [dehydrationViralIllness("rosDeniesBloodInStool")],
  rosRedFlags: [dehydrationViralIllness("rfSevereDehydrationConcern"), dehydrationViralIllness("rfAlteredMentalStatus")],
  physicalExam: { skin: [dehydrationViralIllness("examHydrationIfDocumented"), dehydrationViralIllness("examMentalStatusIfDocumented"), dehydrationViralIllness("examPerfusionIfDocumented")], general: [dehydrationViralIllness("examGeneralAppearance")] },
  mdmWorkingAssessment: [dehydrationViralIllness("mdmDehydrationViralIllnessPresentation")],
  mdmDifferentialSynthesis: [dehydrationViralIllness("diffViralSyndrome"), dehydrationViralIllness("diffDehydration"), dehydrationViralIllness("diffElectrolyteMetabolicConcern"), dehydrationViralIllness("diffGiIllness")],
  mdmDataReviewed: [dehydrationViralIllness("mdmLabsReviewedIfObtained")],
  mdmClinicalRationale: [dehydrationViralIllness("mdmFluidPlanReassessmentIfGiven"), dehydrationViralIllness("mdmPcpFollowUpIfIndicated")],
  mdmAdmitObserveDischarge: [dehydrationViralIllness("mdmObservationIfHighRisk")],
  reassessment: [dehydrationViralIllness("reassessHydrationTolerancePo")],
  followUpDisposition: [dehydrationViralIllness("dispReturnInabilityToToleratePoWorseningWeakness")],
});

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