import type {
  ProviderDocumentationMajorGroup,
  ProviderDocumentationTemplateDefinition,
  ProviderDocumentationTemplateGuidance,
  ProviderDocumentationTemplateId,
} from "./providerDocumentationModel";
import {
  ABDOMINAL_COMPLAINT_INTEL,
  CHEST_PAIN_COMPLAINT_INTEL,
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  FLANK_PAIN_COMPLAINT_INTEL,
  FEVER_COMPLAINT_INTEL,
  COUGH_COMPLAINT_INTEL,
  ASTHMA_WHEEZING_COMPLAINT_INTEL,
  URI_RESPIRATORY_COMPLAINT_INTEL,
  FALL_COMPLAINT_INTEL,
  HEAD_INJURY_COMPLAINT_INTEL,
  LACERATION_COMPLAINT_INTEL,
  FRACTURE_CONCERN_COMPLAINT_INTEL,
  PEDIATRIC_FEVER_COMPLAINT_INTEL,
  PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
  HYPERGLYCEMIA_COMPLAINT_INTEL,
  HYPERTENSION_COMPLAINT_INTEL,
  ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  ADULT_DIARRHEA_COMPLAINT_INTEL,
  MEDICATION_REFILL_COMPLAINT_INTEL,
  OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
  MVC_COLLISION_COMPLAINT_INTEL,
  ASSAULT_TRAUMA_COMPLAINT_INTEL,
  NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
  BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  CRUSH_INJURY_COMPLAINT_INTEL,
  PENETRATING_INJURY_COMPLAINT_INTEL,
  BURN_INJURY_COMPLAINT_INTEL,
  PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  MALE_GENITAL_COMPLAINT_INTEL,
  FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  DIARRHEA_COMPLAINT_V1_INTEL,
  CONSTIPATION_COMPLAINT_V1_INTEL,
  GI_BLEED_COMPLAINT_V1_INTEL,
  FLANK_PAIN_COMPLAINT_V1_INTEL,
  HERNIA_COMPLAINT_V1_INTEL,
  RECTAL_PAIN_COMPLAINT_V1_INTEL,
  DYSPHAGIA_COMPLAINT_V1_INTEL,
  COUGH_COMPLAINT_V1_INTEL,
  URI_CONGESTION_COMPLAINT_V1_INTEL,
  SORE_THROAT_COMPLAINT_V1_INTEL,
  ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  HEMOPTYSIS_COMPLAINT_V1_INTEL,
  CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
  PALPITATIONS_COMPLAINT_V1_INTEL,
  HYPERTENSION_COMPLAINT_V1_INTEL,
  LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
  DYSURIA_COMPLAINT_V1_INTEL,
  HEMATURIA_COMPLAINT_V1_INTEL,
  FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL,
  URINARY_RETENTION_COMPLAINT_V1_INTEL,
  TESTICULAR_PAIN_COMPLAINT_V1_INTEL,
  PELVIC_PAIN_COMPLAINT_V1_INTEL,
  VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
  RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
  BACK_PAIN_COMPLAINT_V1_INTEL,
  NECK_PAIN_COMPLAINT_V1_INTEL,
  SHOULDER_INJURY_COMPLAINT_V1_INTEL,
  KNEE_INJURY_COMPLAINT_V1_INTEL,
  ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL,
  HIP_PAIN_INJURY_COMPLAINT_V1_INTEL,
  HAND_WRIST_INJURY_COMPLAINT_V1_INTEL,
  FALL_TRAUMA_COMPLAINT_V1_INTEL,
  MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL,
  LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  FEVER_COMPLAINT_V1_INTEL,
  CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  WOUND_INFECTION_COMPLAINT_V1_INTEL,
  EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  SINUS_SYMPTOMS_COMPLAINT_V1_INTEL,
  DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL,
  RASH_SKIN_COMPLAINT_V1_INTEL,
  SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL,
  DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
  HEADACHE_COMPLAINT_INTEL,
  PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
  SOB_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
  type ProviderDocumentationComplaintIntelligence,
} from "./providerDocumentationComplaintIntelligence";
import type { ProviderDocumentationTemplatePickerSubgroupKey } from "./providerDocumentationModel";
import {
  ADULT_GUIDANCE_ACS,
  ADULT_GUIDANCE_NEURO,
  ADULT_MDM_CARDIOPULMONARY,
  mergeExam,
  mergeFields,
  PEDIATRIC_EXAM_GENERAL,
  PEDIATRIC_GUIDANCE,
  PEDIATRIC_HPI_BASE,
  PEDIATRIC_MDM_BASE,
  TRAUMA_EXAM_NEURO_MSK,
  TRAUMA_GUIDANCE,
  TRAUMA_HPI_MECHANISM,
  TRAUMA_MDM_BASE,
  TRAUMA_ROS_RED_FLAGS,
} from "./providerDocumentationTemplatePresets";

type TemplateSpec = Omit<ProviderDocumentationTemplateDefinition, "id"> & { id: ProviderDocumentationTemplateId };

function traumaTemplate(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  hpi: string[],
  rosPositives: string[],
  rosNegatives: string[],
  fields: ReturnType<typeof mergeFields>,
  physicalExam: ReturnType<typeof mergeExam>,
  guidance: ProviderDocumentationTemplateGuidance = TRAUMA_GUIDANCE,
  promptReminderKeys?: string[],
  complaintIntelligence?: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return {
    id,
    majorGroup: "TRAUMA",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupTrauma",
    labelKey,
    helperKey,
    fields: mergeFields(
      {
        hpi: [...TRAUMA_HPI_MECHANISM, ...hpi],
        rosImportantPositives: rosPositives,
        rosImportantNegatives: rosNegatives,
        rosRedFlags: TRAUMA_ROS_RED_FLAGS,
      },
      TRAUMA_MDM_BASE,
      fields
    ),
    physicalExam: mergeExam(TRAUMA_EXAM_NEURO_MSK, physicalExam),
    guidance,
    promptReminderKeys: promptReminderKeys ?? [
      "providerDocumentationPromptReminders.traumaMechanism",
      "providerDocumentationPromptReminders.traumaCspine",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    complaintIntelligence,
  };
}

function pediatricTemplate(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  hpi: string[],
  rosPositives: string[],
  rosNegatives: string[],
  rosRedFlags: string[],
  fields: ReturnType<typeof mergeFields>,
  physicalExam: ReturnType<typeof mergeExam>,
  guidance: ProviderDocumentationTemplateGuidance = PEDIATRIC_GUIDANCE,
  promptReminderKeys?: string[],
  complaintIntelligence?: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return {
    id,
    majorGroup: "PEDIATRIC",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupPediatric",
    labelKey,
    helperKey,
    fields: mergeFields(
      {
        hpi: [...PEDIATRIC_HPI_BASE, ...hpi],
        rosImportantPositives: rosPositives,
        rosImportantNegatives: rosNegatives,
        rosRedFlags,
      },
      PEDIATRIC_MDM_BASE,
      fields
    ),
    physicalExam: mergeExam(PEDIATRIC_EXAM_GENERAL, physicalExam),
    guidance,
    promptReminderKeys: promptReminderKeys ?? [
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.pediatricToxicityAppearance",
    ],
    complaintIntelligence,
  };
}

function adultTemplate(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  hpi: string[],
  rosPositives: string[],
  rosNegatives: string[],
  rosRedFlags: string[],
  fields: ReturnType<typeof mergeFields>,
  physicalExam: ReturnType<typeof mergeExam>,
  guidance?: ProviderDocumentationTemplateGuidance,
  promptReminderKeys?: string[],
  complaintIntelligence?: ProviderDocumentationComplaintIntelligence,
  pickerSubgroupKey?: ProviderDocumentationTemplatePickerSubgroupKey
): TemplateSpec {
  return {
    id,
    majorGroup: "ADULT",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupAdult",
    pickerSubgroupKey,
    labelKey,
    helperKey,
    fields: mergeFields({
      hpi,
      rosImportantPositives: rosPositives,
      rosImportantNegatives: rosNegatives,
      rosRedFlags,
      mdmWorkingAssessment: ["erMseMdmChips.waUndifferentiated"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmGuidance.externalRecordsReviewed"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
      ...fields,
    }),
    physicalExam,
    guidance,
    promptReminderKeys,
    complaintIntelligence,
  };
}

export const PROVIDER_DOCUMENTATION_MAJOR_GROUP_KEYS: ProviderDocumentationMajorGroup[] = [
  "TRAUMA",
  "PEDIATRIC",
  "ADULT",
];

export const PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS: Record<ProviderDocumentationMajorGroup, string> = {
  TRAUMA: "providerDocumentationWorkspace.templateMajorGroupTrauma",
  PEDIATRIC: "providerDocumentationWorkspace.templateMajorGroupPediatric",
  ADULT: "providerDocumentationWorkspace.templateMajorGroupAdult",
};

export const PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS: Record<
  ProviderDocumentationTemplatePickerSubgroupKey,
  string
> = {
  gi_abdominal: "providerDocumentationWorkspace.templateSubgroupGiAbdominal",
  respiratory_ent: "providerDocumentationWorkspace.templateSubgroupRespiratoryEnt",
  cardiac_vascular: "providerDocumentationWorkspace.templateSubgroupCardiacVascular",
  gu_renal: "providerDocumentationWorkspace.templateSubgroupGuRenal",
  msk_trauma: "providerDocumentationWorkspace.templateSubgroupMskTrauma",
  infectious_ent: "providerDocumentationWorkspace.templateSubgroupInfectiousEnt",
};

function respiratoryComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["erMseHpiChips.assocCough", "erMseHpiChips.assocSob", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posCough", "erMseRosChips.posSob", "erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesHemoptysis"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypoxia"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"],
      mdmPlanSummary: ["erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
      heent: ["erMseExamChips.heentOropharynxClear"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.cardiopulmonaryDifferentialReviewed"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.adultUriInfectiousWorkup",
      "providerDocumentationPromptReminders.sobWorkupReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence,
    "respiratory_ent"
  );
}

function cardiacVascularComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["erMseHpiChips.assocChestPain", "erMseHpiChips.assocSob", "erMseHpiChips.assocPalpitations"],
    ["erMseRosChips.posChestPain", "erMseRosChips.posSob", "erMseRosChips.posDizziness"],
    ["erMseRosChips.negDeniesSyncope", "erMseRosChips.negDeniesHemoptysis"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfSyncope"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary", "erMseMdmChips.waUndifferentiated"],
      mdmDataReviewed: ["erMseMdmChips.planEcg", "erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actIvMonitor"],
      mdmPlanSummary: ["erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioNoMurmur", "erMseExamChips.cardioPeripheralPulsesPresent"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.cardiopulmonaryDifferentialReviewed"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.sobWorkupReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence,
    "cardiac_vascular"
  );
}

function guRenalComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["providerDocumentationWorkspace.stickerHpiDysuria", "erMseHpiChips.timStartedToday"],
    ["providerDocumentationWorkspace.stickerRosDysuria", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfPregnancyConcern", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdTendernessPresent", "providerDocumentationWorkspace.stickerExamNoCvaTenderness"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.abdominalDifferentialReviewed"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.adultUtiUrinaryWorkupReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence,
    "gu_renal"
  );
}

function mskTraumaComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["erMseHpiChipsTrauma.mechanismReviewed", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posWeakness", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesSyncope", "erMseRosChips.negDeniesWeakness"],
    ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waTrauma", "erMseMdmChips.waUndifferentiated"],
      mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmChips.planLabs"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actPain", "erMseMdmChips.actSafety"],
      mdmPlanSummary: ["erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      musculoskeletal: ["erMseExamChips.mskTendernessPresent", "erMseExamChips.mskRomNormal", "erMseExamChips.mskDeformityNoted"],
      neuroPsych: ["erMseExamChips.neuroFollowsCommands", "erMseExamChips.neuroFocalDeficitNoted"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.traumaSurveyDocumented"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.traumaMechanism",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    complaintIntelligence,
    "msk_trauma"
  );
}

function infectiousEntComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["erMseHpiChips.assocCough", "erMseHpiChips.assocFever", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posFever", "erMseRosChips.posCough", "erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesSob", "erMseRosChips.negDeniesWeakness"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfAlteredMs", "erMseRosChips.rfBleeding"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waUndifferentiated"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actFluids", "erMseMdmChips.actAntiemetic"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      heent: ["erMseExamChips.heentOropharynxClear", "erMseExamChips.heentDryMm"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
      skin: ["erMseExamChips.skinWarmDry", "erMseExamChips.skinRashPresent"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.acuteIllnessDocumented"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.adultUriInfectiousWorkup",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence,
    "infectious_ent"
  );
}

function giComplaintV1Template(
  id: ProviderDocumentationTemplateId,
  labelKey: string,
  helperKey: string,
  complaintIntelligence: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return adultTemplate(
    id,
    labelKey,
    helperKey,
    ["erMseHpiChips.locAbdominalPain", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posAbdominalPain", "erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdTendernessPresent"],
    },
    {
      mdmDifferentialSynthesis: ["erMseMdmGuidance.abdominalDifferentialReviewed"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.adultAbdominalRedFlags",
      "providerDocumentationPromptReminders.adultAbdominalSerialExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence,
    "gi_abdominal"
  );
}

/** @deprecated Use PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS — kept for legacy tests. */
export const PROVIDER_DOCUMENTATION_TEMPLATE_CATEGORY_KEYS = Object.values(
  PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS
);

export const PROVIDER_DOCUMENTATION_TEMPLATES: ProviderDocumentationTemplateDefinition[] = [
  // ── TRAUMA ──────────────────────────────────────────────────────────────
  traumaTemplate(
    "fall",
    "providerDocumentationWorkspace.templateFall",
    "providerDocumentationWorkspace.templateFallHelp",
    ["erMseHpiChipsTrauma.fallMechanism", "erMseHpiChipsTrauma.fromHeightReviewed"],
    ["erMseRosChips.posWeakness"],
    ["erMseRosChips.negDeniesSyncope", "erMseHpiChipsTrauma.negDeniesHeadStrike"],
    {},
    { musculoskeletal: ["erMseExamChips.mskTendernessPresent"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaFallSyncopeReminder",
      "providerDocumentationPromptReminders.traumaAnticoagulant",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    FALL_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "mvc",
    "providerDocumentationWorkspace.templateMvc",
    "providerDocumentationWorkspace.templateMvcHelp",
    ["erMseHpiChipsTrauma.mvcMechanism", "erMseHpiChipsTrauma.restraintUseReviewed"],
    ["erMseRosChips.posChestPain", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesLossOfConsciousness", "erMseHpiChipsTrauma.negDeniesEjection"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmGuidance.traumaSurveyDocumented"] },
    {
      cardiovascular: ["erMseExamChips.cardioRrr"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaMvcMechanismReminder",
      "providerDocumentationPromptReminders.traumaCspine",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    MVC_COLLISION_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "assault",
    "providerDocumentationWorkspace.templateAssault",
    "providerDocumentationWorkspace.templateAssaultHelp",
    ["erMseHpiChipsTrauma.assaultMechanism", "erMseHpiChipsTrauma.weaponExposureReviewed"],
    ["erMseRosChips.posHeadache", "erMseRosChips.posAbdominalPain"],
    ["providerDocumentationWorkspace.stickerRosNoNeckStiffness"],
    { mdmConsultsDiscussed: ["erMseMdmChips.conNursing", "erMseMdmGuidance.lawEnforcementIfApplicable"] },
    { skin: ["erMseExamChips.skinLacerationPresent", "erMseExamChips.skinWarmDry"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaAssaultSafetyReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    ASSAULT_TRAUMA_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "head_injury",
    "providerDocumentationWorkspace.templateHeadInjury",
    "providerDocumentationWorkspace.templateHeadInjuryHelp",
    ["erMseHpiChipsTrauma.headStrikeMechanism", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posHeadache", "erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesWeakness", "providerDocumentationWorkspace.stickerRosNoNeckStiffness"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmGuidance.anticoagulantRiskReviewed"] },
    {
      heent: ["erMseExamChips.heentHeadAtraumatic", "erMseExamChips.heentPerrla"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear"],
    },
    {
      ...TRAUMA_GUIDANCE,
      mdmDifferentialSynthesis: [
        "erMseMdmGuidance.intracranialHemorrhageConsidered",
        "erMseMdmGuidance.skullFractureConsidered",
      ],
    },
    [
      "providerDocumentationPromptReminders.traumaHeadInjuryRedFlags",
      "providerDocumentationPromptReminders.traumaAnticoagulant",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    HEAD_INJURY_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "laceration",
    "providerDocumentationWorkspace.templateLaceration",
    "providerDocumentationWorkspace.templateLacerationHelp",
    ["erMseHpiChipsTrauma.lacerationMechanism", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.rfBleeding"],
    ["erMseRosChips.negDeniesWeakness", "erMseRosChips.negDeniesNumbness"],
    { mdmPlanSummary: ["erMseMdmGuidance.tetanusConsidered", "erMseMdmChips.planReassess"] },
    {
      skin: ["erMseExamChips.skinLacerationPresent", "providerDocumentationWorkspace.stickerExamCapRefillIntact"],
      neuroPsych: ["providerDocumentationWorkspace.stickerExamNvIntact"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaLacerationWoundCare",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    LACERATION_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "trauma_musculoskeletal",
    "providerDocumentationWorkspace.templateTraumaMsk",
    "providerDocumentationWorkspace.templateTraumaMskHelp",
    ["erMseHpiChips.locLimbPain", "erMseHpiChips.timSuddenOnset", "erMseHpiChips.qualAching"],
    ["erMseRosChips.posWeakness"],
    ["erMseRosChips.negDeniesWeakness", "providerDocumentationWorkspace.stickerRosNoNumbness"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actPain", "erMseMdmChips.actSafety"] },
    {
      musculoskeletal: [
        "erMseExamChips.mskRomNormal",
        "erMseExamChips.mskDeformityNoted",
        "providerDocumentationWorkspace.stickerExamNvIntact",
      ],
    }
  ),
  traumaTemplate(
    "back_pain",
    "providerDocumentationWorkspace.templateBackPain",
    "providerDocumentationWorkspace.templateBackPainHelp",
    ["erMseHpiChips.locBackPain", "erMseHpiChipsTrauma.mechanismReviewed", "erMseHpiChips.qualAching"],
    ["erMseRosChips.posWeakness"],
    ["erMseRosChips.negDeniesFever", "providerDocumentationWorkspace.stickerRosNoBowelBladder"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging"] },
    { musculoskeletal: ["erMseExamChips.mskTendernessPresent"], neuroPsych: ["erMseExamChips.neuroFollowsCommands"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaBackSpineRedFlagsReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    BACK_PAIN_TRAUMA_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "neck_pain_trauma",
    "providerDocumentationWorkspace.templateNeckPainTrauma",
    "providerDocumentationWorkspace.templateNeckPainTraumaHelp",
    ["erMseHpiChipsTrauma.neckPainMechanism", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posWeakness"],
    ["providerDocumentationWorkspace.stickerRosNoNeckStiffness", "erMseRosChips.negDeniesWeakness"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmGuidance.cspineClearanceConsidered"] },
    { heent: ["erMseExamChips.heentHeadAtraumatic"], musculoskeletal: ["providerDocumentationWorkspace.stickerExamLimitedRom"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaNeckSpineCspineReminder",
      "providerDocumentationPromptReminders.traumaCspine",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    NECK_PAIN_TRAUMA_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "crush_injury",
    "providerDocumentationWorkspace.templateCrushInjury",
    "providerDocumentationWorkspace.templateCrushInjuryHelp",
    ["erMseHpiChipsTrauma.crushMechanism", "erMseHpiChipsTrauma.entrapmentReviewed"],
    ["erMseRosChips.posWeakness", "erMseRosChips.rfBleeding"],
    ["providerDocumentationWorkspace.stickerRosNoNumbness"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actIvMonitor", "erMseMdmChips.actPain"] },
    { musculoskeletal: ["erMseExamChips.mskSwellingPresent", "providerDocumentationWorkspace.stickerExamNvIntact"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaCrushRhabdoReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    CRUSH_INJURY_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "penetrating_injury",
    "providerDocumentationWorkspace.templatePenetratingInjury",
    "providerDocumentationWorkspace.templatePenetratingInjuryHelp",
    ["erMseHpiChipsTrauma.penetratingMechanism", "erMseHpiChipsTrauma.weaponExposureReviewed"],
    ["erMseRosChips.rfBleeding", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesSyncope"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actIvMonitor", "erMseMdmChips.actSafety"] },
    { abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdGuarding"], skin: ["erMseExamChips.skinLacerationPresent"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaPenetratingInjuryReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    PENETRATING_INJURY_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "burn",
    "providerDocumentationWorkspace.templateBurn",
    "providerDocumentationWorkspace.templateBurnHelp",
    ["erMseHpiChipsTrauma.burnMechanism", "erMseHpiChipsTrauma.burnSurfaceAreaReviewed"],
    ["erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesSob", "providerDocumentationWorkspace.stickerRosNoThroatTightness"],
    { mdmPlanSummary: ["erMseMdmChips.actFluids", "erMseMdmChips.planReassess"] },
    { skin: ["erMseExamChips.skinWarmDry", "providerDocumentationWorkspace.stickerExamBurnWoundPresent"], respiratory: ["erMseExamChips.respNoDistress"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaBurnAirwayReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    BURN_INJURY_COMPLAINT_INTEL
  ),
  traumaTemplate(
    "fracture_concern",
    "providerDocumentationWorkspace.templateFractureConcern",
    "providerDocumentationWorkspace.templateFractureConcernHelp",
    ["erMseHpiChips.locLimbPain", "erMseHpiChipsTrauma.mechanismReviewed", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posWeakness"],
    ["providerDocumentationWorkspace.stickerRosNoNumbness"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging"] },
    { musculoskeletal: ["erMseExamChips.mskDeformityNoted", "providerDocumentationWorkspace.stickerExamNvIntact"] },
    undefined,
    [
      "providerDocumentationPromptReminders.traumaFractureOrthopedicReminder",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    FRACTURE_CONCERN_COMPLAINT_INTEL
  ),

  // ── PEDIATRIC ───────────────────────────────────────────────────────────
  pediatricTemplate(
    "fever",
    "providerDocumentationWorkspace.templatePediatricFever",
    "providerDocumentationWorkspace.templatePediatricFeverHelp",
    ["erMseHpiChipsPediatric.feverDuration", "erMseHpiChipsPediatric.immunizationStatusReviewed"],
    ["erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesSob", "erMseRosChips.negDeniesVomiting"],
    ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfRespDistress"],
    { mdmWorkingAssessment: ["erMseMdmChips.waInfectious"], mdmDataReviewed: ["erMseMdmChips.planLabs"] },
    { skin: ["erMseExamChips.skinWarmDry"] },
    undefined,
    [
      "providerDocumentationPromptReminders.pediatricFeverSourceReminder",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PEDIATRIC_FEVER_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "uri_respiratory",
    "providerDocumentationWorkspace.templateUriRespiratory",
    "providerDocumentationWorkspace.templateUriRespiratoryHelp",
    ["erMseHpiChipsPediatric.coughDuration", "erMseHpiChips.timGradualOnset"],
    ["erMseRosChips.posFever", "erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesChestPain", "providerDocumentationWorkspace.stickerRosNoHemoptysis"],
    ["erMseRosChips.rfRespDistress"],
    { mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waCardiopulmonary"] },
    { respiratory: ["erMseExamChips.respClearBs", "erMseExamChips.respWheezing"] },
    undefined,
    [
      "providerDocumentationPromptReminders.adultUriInfectiousWorkup",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    URI_RESPIRATORY_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "nausea_vomiting",
    "providerDocumentationWorkspace.templateNauseaVomiting",
    "providerDocumentationWorkspace.templateNauseaVomitingHelp",
    ["erMseHpiChips.assocNausea", "erMseHpiChips.assocVomiting", "erMseHpiChipsPediatric.intakeOutputReviewed"],
    ["erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesChestPain", "providerDocumentationWorkspace.stickerRosNoBloodInEmesis"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfAlteredMs"],
    { mdmPlanSummary: ["erMseMdmChips.actAntiemetic", "erMseMdmChips.actFluids", "erMseMdmChips.planReassess"] },
    { abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender"], heent: ["erMseExamChips.heentDryMm"] },
    undefined,
    [
      "providerDocumentationPromptReminders.pediatricGastroDehydrationReminder",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "diarrhea",
    "providerDocumentationWorkspace.templatePediatricDiarrhea",
    "providerDocumentationWorkspace.templatePediatricDiarrheaHelp",
    ["erMseHpiChipsPediatric.diarrheaDuration", "erMseHpiChipsPediatric.intakeOutputReviewed"],
    ["erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfHypotensionConcern"],
    { mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waAbdominal"] },
    { abdomen: ["erMseExamChips.abdSoft"], heent: ["erMseExamChips.heentDryMm"] },
    undefined,
    [
      "providerDocumentationPromptReminders.pediatricGastroDehydrationReminder",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "ear_pain",
    "providerDocumentationWorkspace.templatePediatricEarPain",
    "providerDocumentationWorkspace.templatePediatricEarPainHelp",
    ["erMseHpiChipsPediatric.earPainLaterality", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfAlteredMs"],
    { mdmWorkingAssessment: ["erMseMdmChips.waInfectious"] },
    { heent: ["erMseExamChips.heentOropharynxClear"] }
  ),
  pediatricTemplate(
    "asthma_wheezing",
    "providerDocumentationWorkspace.templatePediatricAsthma",
    "providerDocumentationWorkspace.templatePediatricAsthmaHelp",
    ["erMseHpiChipsPediatric.wheezingHistory", "erMseHpiChips.assocSob"],
    ["erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfRespDistress"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"], mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary"] },
    { respiratory: ["erMseExamChips.respWheezing", "erMseExamChips.respIncreasedWob"] },
    undefined,
    [
      "providerDocumentationPromptReminders.pediatricAsthmaWheezingReminder",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "seizure",
    "providerDocumentationWorkspace.templatePediatricSeizure",
    "providerDocumentationWorkspace.templatePediatricSeizureHelp",
    ["erMseHpiChipsPediatric.seizureDescription", "erMseHpiChipsPediatric.postIctalStatusReviewed"],
    ["erMseRosChips.posWeakness"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfNeuroDeficit"],
    { mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"], mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"] },
    { neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroFollowsCommands"] }
  ),
  pediatricTemplate(
    "pediatric_rash",
    "providerDocumentationWorkspace.templatePediatricRash",
    "providerDocumentationWorkspace.templatePediatricRashHelp",
    ["providerDocumentationWorkspace.stickerHpiRash", "erMseHpiChips.timStartedToday"],
    ["providerDocumentationWorkspace.stickerRosPruritus", "erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfRespDistress"],
    { mdmWorkingAssessment: ["providerDocumentationWorkspace.stickerMdmAllergicProcess"] },
    { skin: ["erMseExamChips.skinRashPresent"] }
  ),
  pediatricTemplate(
    "dehydration",
    "providerDocumentationWorkspace.templatePediatricDehydration",
    "providerDocumentationWorkspace.templatePediatricDehydrationHelp",
    ["erMseHpiChipsPediatric.intakeOutputReviewed", "erMseHpiChipsPediatric.hydrationStatusReviewed"],
    ["erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfAlteredMs"],
    { mdmPlanSummary: ["erMseMdmChips.actFluids", "erMseMdmChips.planReassess"] },
    { heent: ["erMseExamChips.heentDryMm"], abdomen: ["erMseExamChips.abdSoft"] }
  ),
  {
    id: "pediatric_trauma",
    majorGroup: "PEDIATRIC",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupPediatric",
    labelKey: "providerDocumentationWorkspace.templatePediatricTrauma",
    helperKey: "providerDocumentationWorkspace.templatePediatricTraumaHelp",
    fields: mergeFields(
      {
        hpi: [...PEDIATRIC_HPI_BASE, ...TRAUMA_HPI_MECHANISM],
        rosImportantPositives: ["erMseRosChips.posWeakness"],
        rosImportantNegatives: ["erMseRosChips.negDeniesWeakness"],
        rosRedFlags: TRAUMA_ROS_RED_FLAGS,
      },
      TRAUMA_MDM_BASE,
      PEDIATRIC_MDM_BASE,
      { mdmDataReviewed: ["erMseMdmGuidance.independentHistorianPediatric"] }
    ),
    physicalExam: mergeExam(PEDIATRIC_EXAM_GENERAL, TRAUMA_EXAM_NEURO_MSK),
    guidance: { ...TRAUMA_GUIDANCE, ...PEDIATRIC_GUIDANCE },
    promptReminderKeys: [
      "providerDocumentationPromptReminders.traumaPediatricTraumaReminder",
      "providerDocumentationPromptReminders.traumaMechanism",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
    complaintIntelligence: PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  },
  pediatricTemplate(
    "abdominal_pain_pediatric",
    "providerDocumentationWorkspace.templatePediatricAbdominalPain",
    "providerDocumentationWorkspace.templatePediatricAbdominalPainHelp",
    ["erMseHpiChips.locAbdominalPain", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posAbdominalPain", "erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfPregnancyConcern"],
    { mdmWorkingAssessment: ["erMseMdmChips.waAbdominal"], mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"] },
    { abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdTendernessPresent"] },
    undefined,
    [
      "providerDocumentationPromptReminders.pediatricAbdominalRedFlags",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "cough",
    "providerDocumentationWorkspace.templatePediatricCough",
    "providerDocumentationWorkspace.templatePediatricCoughHelp",
    ["erMseHpiChipsPediatric.coughDuration", "erMseHpiChips.timGradualOnset"],
    ["erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfRespDistress"],
    { mdmWorkingAssessment: ["erMseMdmChips.waInfectious"] },
    { respiratory: ["erMseExamChips.respClearBs"] },
    undefined,
    [
      "providerDocumentationPromptReminders.coughRespiratoryWorkup",
      "providerDocumentationPromptReminders.pediatricHydration",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    COUGH_COMPLAINT_INTEL
  ),
  pediatricTemplate(
    "croup",
    "providerDocumentationWorkspace.templatePediatricCroup",
    "providerDocumentationWorkspace.templatePediatricCroupHelp",
    ["erMseHpiChipsPediatric.barkingCough", "erMseHpiChipsPediatric.stridorReviewed"],
    ["erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfRespDistress"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"], mdmWorkingAssessment: ["erMseMdmChips.waInfectious"] },
    { respiratory: ["erMseExamChips.respIncreasedWob", "erMseExamChips.respWheezing"], heent: ["erMseExamChips.heentOropharynxClear"] }
  ),
  pediatricTemplate(
    "rsv_like_illness",
    "providerDocumentationWorkspace.templatePediatricRsvLike",
    "providerDocumentationWorkspace.templatePediatricRsvLikeHelp",
    ["erMseHpiChipsPediatric.coughDuration", "erMseHpiChips.assocSob", "erMseHpiChipsPediatric.feedingIntakeReviewed"],
    ["erMseRosChips.posSob", "erMseRosChips.posFever"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"], mdmWorkingAssessment: ["erMseMdmChips.waInfectious"] },
    { respiratory: ["erMseExamChips.respWheezing", "erMseExamChips.respIncreasedWob"] }
  ),

  // ── ADULT ───────────────────────────────────────────────────────────────
  adultTemplate(
    "chest_pain",
    "providerDocumentationWorkspace.templateChestPain",
    "providerDocumentationWorkspace.templateChestPainHelp",
    ["erMseHpiChips.locChestPain", "erMseHpiChips.timStartedToday", "erMseHpiChips.qualPressureLike", "erMseHpiChips.assocSob"],
    ["erMseRosChips.posChestPain", "erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope", "erMseRosChips.negDeniesVomiting"],
    ["erMseRosChips.rfSyncope", "erMseRosChips.rfHypotensionConcern"],
    mergeFields(ADULT_MDM_CARDIOPULMONARY, { mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary"] }),
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioNoMurmur", "erMseExamChips.cardioPeripheralPulsesPresent"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
      musculoskeletal: ["providerDocumentationWorkspace.stickerExamChestWallTenderness"],
    },
    ADULT_GUIDANCE_ACS,
    [
      "providerDocumentationPromptReminders.adultAcsExclusion",
      "providerDocumentationPromptReminders.adultEcgReview",
      "providerDocumentationPromptReminders.chestPainHeartScoreReminder",
      "providerDocumentationPromptReminders.chestPainSerialTroponinReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    CHEST_PAIN_COMPLAINT_INTEL
  ),
  adultTemplate(
    "abdominal_pain",
    "providerDocumentationWorkspace.templateAbdominalPain",
    "providerDocumentationWorkspace.templateAbdominalPainHelp",
    ["erMseHpiChips.locAbdominalPain", "erMseHpiChips.timStartedToday", "erMseHpiChips.timWorsening"],
    ["erMseRosChips.posAbdominalPain", "erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope", "providerDocumentationWorkspace.stickerRosNoCvaPain"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfPregnancyConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      abdomen: [
        "erMseExamChips.abdSoft",
        "providerDocumentationWorkspace.stickerExamAbdNonDistended",
        "erMseExamChips.abdNonTender",
        "erMseExamChips.abdTendernessPresent",
        "providerDocumentationWorkspace.stickerExamNoCvaTenderness",
      ],
    },
    {
      mdmClinicalRationale: ["erMseMdmGuidance.acuteIllnessDocumented", "erMseMdmGuidance.surgicalAbdomenConsidered"],
      mdmDifferentialSynthesis: ["erMseMdmGuidance.abdominalDifferentialReviewed"],
      reassessment: ["providerDocumentationSmartSentences.reassessedAfterAnalgesia"],
      followUpDisposition: ["providerDocumentationSmartSentences.returnPrecautionsWorseningPain"],
    },
    [
      "providerDocumentationPromptReminders.adultAbdominalRedFlags",
      "providerDocumentationPromptReminders.adultAbdominalSerialExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    ABDOMINAL_COMPLAINT_INTEL
  ),
  adultTemplate(
    "sob",
    "providerDocumentationWorkspace.templateAdultSob",
    "providerDocumentationWorkspace.templateAdultSobHelp",
    ["erMseHpiChips.assocSob", "erMseHpiChips.timStartedToday", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posSob", "erMseRosChips.posChestPain"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
    mergeFields(ADULT_MDM_CARDIOPULMONARY, { mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"] }),
    {
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing", "erMseExamChips.respCrackles"],
      cardiovascular: ["erMseExamChips.cardioRrr"],
    },
    ADULT_GUIDANCE_ACS,
    [
      "providerDocumentationPromptReminders.adultDyspneaPeConsidered",
      "providerDocumentationPromptReminders.sobWorkupReminder",
      "providerDocumentationPromptReminders.adultEcgReview",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    SOB_COMPLAINT_INTEL
  ),
  adultTemplate(
    "adult_uri_respiratory",
    "providerDocumentationWorkspace.templateAdultUriRespiratory",
    "providerDocumentationWorkspace.templateAdultUriRespiratoryHelp",
    ["erMseHpiChips.timStartedToday", "erMseHpiChips.timGradualOnset", "erMseHpiChips.assocSob"],
    ["erMseRosChips.posFever", "erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesSyncope", "providerDocumentationWorkspace.stickerRosNoHemoptysis"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waCardiopulmonary"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentOropharynxClear"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultUriInfectiousWorkup",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    URI_RESPIRATORY_COMPLAINT_INTEL
  ),
  adultTemplate(
    "adult_nausea_vomiting",
    "providerDocumentationWorkspace.templateAdultNauseaVomiting",
    "providerDocumentationWorkspace.templateAdultNauseaVomitingHelp",
    ["erMseHpiChips.assocNausea", "erMseHpiChips.assocVomiting", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posVomiting", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesFever", "providerDocumentationWorkspace.stickerRosNoBloodInEmesis"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.actAntiemetic", "erMseMdmChips.actFluids", "erMseMdmChips.planReassess"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      heent: ["erMseExamChips.heentDryMm"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender", "providerDocumentationWorkspace.stickerExamBowelSoundsPresent"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultNauseaVomitingGiReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL
  ),
  adultTemplate(
    "adult_diarrhea",
    "providerDocumentationWorkspace.templateAdultDiarrhea",
    "providerDocumentationWorkspace.templateAdultDiarrheaHelp",
    ["erMseHpiChipsPediatric.diarrheaDuration", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posVomiting", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesFever"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waAbdominal"],
      mdmPlanSummary: ["erMseMdmChips.actFluids", "erMseMdmChips.planReassess"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender"],
      heent: ["erMseExamChips.heentDryMm"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultDiarrheaInfectiousReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    ADULT_DIARRHEA_COMPLAINT_INTEL
  ),
  adultTemplate(
    "adult_seizure",
    "providerDocumentationWorkspace.templateAdultSeizure",
    "providerDocumentationWorkspace.templateAdultSeizureHelp",
    ["erMseHpiChipsPediatric.seizureDescription", "erMseHpiChips.timSuddenOnset", "erMseHpiChipsPediatric.postIctalStatusReviewed"],
    ["erMseRosChips.posWeakness", "erMseRosChips.posHeadache"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfNeuroDeficit"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroFollowsCommands", "erMseExamChips.neuroFocalDeficitNoted"],
    },
    ADULT_GUIDANCE_NEURO
  ),
  adultTemplate(
    "stroke_symptoms",
    "providerDocumentationWorkspace.templateStrokeSymptoms",
    "providerDocumentationWorkspace.templateStrokeSymptomsHelp",
    ["erMseHpiChips.timSuddenOnset", "erMseHpiChipsPediatric.seizureDescription"],
    ["erMseRosChips.posWeakness", "erMseRosChips.posDizziness"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmChips.planLabs", "erMseMdmGuidance.strokeActivationConsidered"],
      mdmPlanSummary: ["erMseMdmChips.planReassess", "erMseMdmGuidance.transferConsidered"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispAdmit", "erMseMdmChips.dispTransfer"],
    },
    { neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear", "erMseExamChips.neuroFocalDeficitNoted"] },
    ADULT_GUIDANCE_NEURO,
    [
      "providerDocumentationPromptReminders.adultStrokeTimeSensitive",
      "providerDocumentationPromptReminders.adultNeuroRepeatExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    STROKE_SYMPTOMS_COMPLAINT_INTEL
  ),
  adultTemplate(
    "dizziness_syncope",
    "providerDocumentationWorkspace.templateDizzinessSyncope",
    "providerDocumentationWorkspace.templateDizzinessSyncopeHelp",
    ["erMseHpiChips.assocDizziness", "erMseHpiChips.timSuddenOnset", "erMseHpiChips.timImproving"],
    ["erMseRosChips.posDizziness"],
    ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesSob", "erMseRosChips.negDeniesWeakness"],
    ["erMseRosChips.rfSyncope", "erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic", "erMseMdmChips.waCardiopulmonary"],
      mdmDataReviewed: ["erMseMdmChips.planEcg", "erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.actSafety", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit", "erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioPeripheralPulsesPresent"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear", "erMseExamChips.neuroFollowsCommands"],
    },
    ADULT_GUIDANCE_NEURO,
    [
      "providerDocumentationPromptReminders.adultSyncopeWorkup",
      "providerDocumentationPromptReminders.adultNeuroRepeatExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    DIZZINESS_SYNCOPE_COMPLAINT_INTEL
  ),
  adultTemplate(
    "headache",
    "providerDocumentationWorkspace.templateHeadache",
    "providerDocumentationWorkspace.templateHeadacheHelp",
    ["erMseHpiChips.locHeadache", "erMseHpiChips.timStartedToday", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posHeadache", "erMseRosChips.posDizziness"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSyncope", "providerDocumentationWorkspace.stickerRosNoNeckStiffness"],
    ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmDataReviewed: ["erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentPerrla"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear"],
    },
    ADULT_GUIDANCE_NEURO,
    [
      "providerDocumentationPromptReminders.adultHeadacheRedFlags",
      "providerDocumentationPromptReminders.adultNeuroRepeatExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    HEADACHE_COMPLAINT_INTEL
  ),
  adultTemplate(
    "psychiatric_behavioral",
    "providerDocumentationWorkspace.templatePsychBehavioral",
    "providerDocumentationWorkspace.templatePsychBehavioralHelp",
    ["providerDocumentationWorkspace.stickerHpiBehavioralConcern", "erMseHpiChips.timStartedToday"],
    ["providerDocumentationWorkspace.stickerRosAnxiety", "providerDocumentationWorkspace.stickerRosMoodConcern"],
    ["providerDocumentationWorkspace.stickerRosNoMedicalComplaint", "providerDocumentationWorkspace.stickerRosNoIntoxicationReported"],
    ["erMseRosChips.rfAlteredMs", "providerDocumentationWorkspace.stickerRosSafetyConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waMedIntox", "providerDocumentationWorkspace.stickerMdmBehavioralConcern"],
      mdmDataReviewed: ["providerDocumentationWorkspace.stickerMdmCollateralReviewed"],
      mdmPlanSummary: ["erMseMdmChips.actSafety", "erMseMdmChips.planReassess"],
      mdmConsultsDiscussed: ["erMseMdmChips.conSpecialist", "erMseMdmChips.conNursing"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispTransfer"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.psychCalmCooperative", "erMseExamChips.psychAgitated", "erMseExamChips.psychAnxious"],
      skin: ["erMseExamChips.skinWarmDry"],
    },
    {
      mdmClinicalRationale: ["erMseMdmGuidance.behavioralRiskAddressed", "erMseMdmGuidance.medicalClearanceConsidered"],
      reassessment: ["providerDocumentationSmartSentences.behavioralReassessment"],
      followUpDisposition: ["providerDocumentationSmartSentences.safetyPlanDiscussed"],
    },
    [
      "providerDocumentationPromptReminders.adultPsychSafetyRisk",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL
  ),
  adultTemplate(
    "urinary_symptoms",
    "providerDocumentationWorkspace.templateUrinarySymptoms",
    "providerDocumentationWorkspace.templateUrinarySymptomsHelp",
    ["providerDocumentationWorkspace.stickerHpiDysuria", "erMseHpiChips.timStartedToday"],
    ["providerDocumentationWorkspace.stickerRosDysuria", "providerDocumentationWorkspace.stickerRosFrequency"],
    ["erMseRosChips.negDeniesFever", "providerDocumentationWorkspace.stickerRosNoVomiting"],
    ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfPregnancyConcern", "erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waAbdominal"],
      mdmDataReviewed: ["erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender", "providerDocumentationWorkspace.stickerExamNoCvaTenderness"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultUtiUrinaryWorkupReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL
  ),
  adultTemplate(
    "male_genital_complaint",
    "providerDocumentationWorkspace.templateMaleGenitalComplaint",
    "providerDocumentationWorkspace.templateMaleGenitalComplaintHelp",
    ["providerDocumentationWorkspace.stickerHpiDysuria", "erMseHpiChips.timSuddenOnset"],
    ["providerDocumentationWorkspace.stickerRosDysuria", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesWeakness"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfPregnancyConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
    },
    {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultMaleGenitalTorsionReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    MALE_GENITAL_COMPLAINT_INTEL
  ),
  adultTemplate(
    "female_pelvic_gyn_complaint",
    "providerDocumentationWorkspace.templateFemalePelvicGynComplaint",
    "providerDocumentationWorkspace.templateFemalePelvicGynComplaintHelp",
    ["erMseHpiChips.locAbdominalPain", "erMseHpiChips.timStartedToday"],
    ["erMseRosChips.posAbdominalPain", "providerDocumentationWorkspace.stickerRosDysuria"],
    ["erMseRosChips.negDeniesFever", "erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfPregnancyConcern", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdTendernessPresent"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultFemalePelvicGynReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    FEMALE_PELVIC_GYN_COMPLAINT_INTEL
  ),
  adultTemplate(
    "flank_pain",
    "providerDocumentationWorkspace.templateFlankPain",
    "providerDocumentationWorkspace.templateFlankPainHelp",
    ["erMseHpiChips.locFlankPain", "erMseHpiChips.timStartedToday", "erMseHpiChips.qualStabbing"],
    ["providerDocumentationWorkspace.stickerRosDysuria"],
    ["erMseRosChips.negDeniesFever", "providerDocumentationWorkspace.stickerRosNoVomiting"],
    ["erMseRosChips.rfSeverePain", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
    },
    { abdomen: ["erMseExamChips.abdSoft", "providerDocumentationWorkspace.stickerExamNoCvaTenderness"] },
    undefined,
    [
      "providerDocumentationPromptReminders.adultFlankPainWorkup",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    FLANK_PAIN_COMPLAINT_INTEL
  ),
  adultTemplate(
    "weakness",
    "providerDocumentationWorkspace.templateWeakness",
    "providerDocumentationWorkspace.templateWeaknessHelp",
    ["erMseHpiChips.timStartedToday", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posWeakness"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
    },
    { neuroPsych: ["erMseExamChips.neuroFollowsCommands", "erMseExamChips.neuroFocalDeficitNoted"] },
    ADULT_GUIDANCE_NEURO,
    [
      "providerDocumentationPromptReminders.adultWeaknessWorkup",
      "providerDocumentationPromptReminders.adultNeuroRepeatExam",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    WEAKNESS_COMPLAINT_INTEL
  ),
  adultTemplate(
    "hyperglycemia",
    "providerDocumentationWorkspace.templateHyperglycemia",
    "providerDocumentationWorkspace.templateHyperglycemiaHelp",
    ["erMseHpiChips.timStartedToday", "erMseHpiChipsPediatric.hydrationStatusReviewed"],
    ["erMseRosChips.posVomiting"],
    ["erMseRosChips.negDeniesChestPain"],
    ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["erMseMdmGuidance.chronicIllnessExacerbationConsidered"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmGuidance.prescriptionDrugManagementReviewed"],
      mdmPlanSummary: ["erMseMdmChips.actFluids", "erMseMdmChips.planReassess"],
    },
    { general: ["erMseExamChips.genAlert"], heent: ["erMseExamChips.heentDryMm"] },
    undefined,
    [
      "providerDocumentationPromptReminders.adultHyperglycemiaDkaReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    HYPERGLYCEMIA_COMPLAINT_INTEL
  ),
  adultTemplate(
    "hypertension",
    "providerDocumentationWorkspace.templateHypertension",
    "providerDocumentationWorkspace.templateHypertensionHelp",
    ["erMseHpiChips.timStartedToday", "erMseHpiChips.timChronicOrRecurrent"],
    ["erMseRosChips.posHeadache", "erMseRosChips.posChestPain"],
    ["erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
    {
      mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary", "erMseMdmGuidance.chronicIllnessExacerbationConsidered"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmGuidance.prescriptionDrugManagementReviewed"],
    },
    { cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioTachycardic"], neuroPsych: ["erMseExamChips.neuroAlertOriented"] },
    undefined,
    [
      "providerDocumentationPromptReminders.adultHypertensionEmergencyReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    HYPERTENSION_COMPLAINT_INTEL
  ),
  adultTemplate(
    "medication_refill",
    "providerDocumentationWorkspace.templateMedicationRefill",
    "providerDocumentationWorkspace.templateMedicationRefillHelp",
    ["erMseHpiChips.timChronicOrRecurrent"],
    ["providerDocumentationWorkspace.stickerRosNoMedicalComplaint"],
    ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesSob"],
    ["erMseRosChips.rfAlteredMs"],
    {
      mdmWorkingAssessment: ["erMseMdmGuidance.chronicIllnessStableConsidered"],
      mdmDataReviewed: ["erMseMdmGuidance.prescriptionDrugManagementReviewed", "erMseMdmGuidance.externalRecordsReviewed"],
      mdmPlanSummary: ["erMseMdmGuidance.medicationContinuationDiscussed"],
    },
    { general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"] },
    undefined,
    [
      "providerDocumentationPromptReminders.adultMedicationRefillSafetyReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    MEDICATION_REFILL_COMPLAINT_INTEL
  ),
  adultTemplate(
    "allergic_reaction_rash",
    "providerDocumentationWorkspace.templateAllergicReactionRash",
    "providerDocumentationWorkspace.templateAllergicReactionRashHelp",
    ["providerDocumentationWorkspace.stickerHpiRash", "erMseHpiChips.timStartedToday", "erMseHpiChips.timWorsening"],
    ["providerDocumentationWorkspace.stickerRosPruritus", "erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesSob", "providerDocumentationWorkspace.stickerRosNoThroatTightness"],
    ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
    {
      mdmWorkingAssessment: ["providerDocumentationWorkspace.stickerMdmAllergicProcess"],
      mdmDataReviewed: ["providerDocumentationWorkspace.stickerMdmMedicationExposureReviewed"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    {
      general: ["erMseExamChips.genAlert"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
      skin: ["erMseExamChips.skinRashPresent", "providerDocumentationWorkspace.stickerExamUrticariaPresent"],
      heent: ["providerDocumentationWorkspace.stickerExamNoOropharyngealSwelling"],
    },
    undefined,
    [
      "providerDocumentationPromptReminders.adultAllergicAnaphylaxisReminder",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    ALLERGIC_REACTION_RASH_COMPLAINT_INTEL
  ),
  giComplaintV1Template(
    "abdominal_pain_complaint_v1",
    "providerDocumentationWorkspace.templateAbdominalPainComplaintV1",
    "providerDocumentationWorkspace.templateAbdominalPainComplaintV1Help",
    ABDOMINAL_PAIN_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "nausea_vomiting_complaint_v1",
    "providerDocumentationWorkspace.templateNauseaVomitingComplaintV1",
    "providerDocumentationWorkspace.templateNauseaVomitingComplaintV1Help",
    NAUSEA_VOMITING_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "diarrhea_complaint_v1",
    "providerDocumentationWorkspace.templateDiarrheaComplaintV1",
    "providerDocumentationWorkspace.templateDiarrheaComplaintV1Help",
    DIARRHEA_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "constipation_complaint_v1",
    "providerDocumentationWorkspace.templateConstipationComplaintV1",
    "providerDocumentationWorkspace.templateConstipationComplaintV1Help",
    CONSTIPATION_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "gi_bleed_complaint_v1",
    "providerDocumentationWorkspace.templateGiBleedComplaintV1",
    "providerDocumentationWorkspace.templateGiBleedComplaintV1Help",
    GI_BLEED_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "flank_pain_complaint_v1",
    "providerDocumentationWorkspace.templateFlankPainComplaintV1",
    "providerDocumentationWorkspace.templateFlankPainComplaintV1Help",
    FLANK_PAIN_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "hernia_complaint_v1",
    "providerDocumentationWorkspace.templateHerniaComplaintV1",
    "providerDocumentationWorkspace.templateHerniaComplaintV1Help",
    HERNIA_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "rectal_pain_complaint_v1",
    "providerDocumentationWorkspace.templateRectalPainComplaintV1",
    "providerDocumentationWorkspace.templateRectalPainComplaintV1Help",
    RECTAL_PAIN_COMPLAINT_V1_INTEL
  ),
  giComplaintV1Template(
    "dysphagia_complaint_v1",
    "providerDocumentationWorkspace.templateDysphagiaComplaintV1",
    "providerDocumentationWorkspace.templateDysphagiaComplaintV1Help",
    DYSPHAGIA_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "cough_complaint_v1",
    "providerDocumentationWorkspace.templateCoughComplaintV1",
    "providerDocumentationWorkspace.templateCoughComplaintV1Help",
    COUGH_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "uri_congestion_complaint_v1",
    "providerDocumentationWorkspace.templateUriCongestionComplaintV1",
    "providerDocumentationWorkspace.templateUriCongestionComplaintV1Help",
    URI_CONGESTION_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "sore_throat_complaint_v1",
    "providerDocumentationWorkspace.templateSoreThroatComplaintV1",
    "providerDocumentationWorkspace.templateSoreThroatComplaintV1Help",
    SORE_THROAT_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "asthma_wheezing_complaint_v1",
    "providerDocumentationWorkspace.templateAsthmaWheezingComplaintV1",
    "providerDocumentationWorkspace.templateAsthmaWheezingComplaintV1Help",
    ASTHMA_WHEEZING_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "copd_exacerbation_complaint_v1",
    "providerDocumentationWorkspace.templateCopdExacerbationComplaintV1",
    "providerDocumentationWorkspace.templateCopdExacerbationComplaintV1Help",
    COPD_EXACERBATION_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "pneumonia_symptoms_complaint_v1",
    "providerDocumentationWorkspace.templatePneumoniaSymptomsComplaintV1",
    "providerDocumentationWorkspace.templatePneumoniaSymptomsComplaintV1Help",
    PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "hemoptysis_complaint_v1",
    "providerDocumentationWorkspace.templateHemoptysisComplaintV1",
    "providerDocumentationWorkspace.templateHemoptysisComplaintV1Help",
    HEMOPTYSIS_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "chest_congestion_complaint_v1",
    "providerDocumentationWorkspace.templateChestCongestionComplaintV1",
    "providerDocumentationWorkspace.templateChestCongestionComplaintV1Help",
    CHEST_CONGESTION_COMPLAINT_V1_INTEL
  ),
  respiratoryComplaintV1Template(
    "flu_like_illness_complaint_v1",
    "providerDocumentationWorkspace.templateFluLikeIllnessComplaintV1",
    "providerDocumentationWorkspace.templateFluLikeIllnessComplaintV1Help",
    FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "palpitations_complaint_v1",
    "providerDocumentationWorkspace.templatePalpitationsComplaintV1",
    "providerDocumentationWorkspace.templatePalpitationsComplaintV1Help",
    PALPITATIONS_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "hypertension_complaint_v1",
    "providerDocumentationWorkspace.templateHypertensionComplaintV1",
    "providerDocumentationWorkspace.templateHypertensionComplaintV1Help",
    HYPERTENSION_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "leg_swelling_dvt_complaint_v1",
    "providerDocumentationWorkspace.templateLegSwellingDvtComplaintV1",
    "providerDocumentationWorkspace.templateLegSwellingDvtComplaintV1Help",
    LEG_SWELLING_DVT_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "chf_symptoms_complaint_v1",
    "providerDocumentationWorkspace.templateChfSymptomsComplaintV1",
    "providerDocumentationWorkspace.templateChfSymptomsComplaintV1Help",
    CHF_SYMPTOMS_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "afib_rapid_rate_complaint_v1",
    "providerDocumentationWorkspace.templateAfibRapidRateComplaintV1",
    "providerDocumentationWorkspace.templateAfibRapidRateComplaintV1Help",
    AFIB_RAPID_RATE_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "generalized_weakness_cardiac_equivalent_complaint_v1",
    "providerDocumentationWorkspace.templateGeneralizedWeaknessCardiacEquivalentComplaintV1",
    "providerDocumentationWorkspace.templateGeneralizedWeaknessCardiacEquivalentComplaintV1Help",
    GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "near_syncope_complaint_v1",
    "providerDocumentationWorkspace.templateNearSyncopeComplaintV1",
    "providerDocumentationWorkspace.templateNearSyncopeComplaintV1Help",
    NEAR_SYNCOPE_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "exertional_dyspnea_complaint_v1",
    "providerDocumentationWorkspace.templateExertionalDyspneaComplaintV1",
    "providerDocumentationWorkspace.templateExertionalDyspneaComplaintV1Help",
    EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL
  ),
  cardiacVascularComplaintV1Template(
    "edema_volume_overload_complaint_v1",
    "providerDocumentationWorkspace.templateEdemaVolumeOverloadComplaintV1",
    "providerDocumentationWorkspace.templateEdemaVolumeOverloadComplaintV1Help",
    EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "dysuria_complaint_v1",
    "providerDocumentationWorkspace.templateDysuriaComplaintV1",
    "providerDocumentationWorkspace.templateDysuriaComplaintV1Help",
    DYSURIA_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "hematuria_complaint_v1",
    "providerDocumentationWorkspace.templateHematuriaComplaintV1",
    "providerDocumentationWorkspace.templateHematuriaComplaintV1Help",
    HEMATURIA_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "flank_pain_renal_complaint_v1",
    "providerDocumentationWorkspace.templateFlankPainRenalComplaintV1",
    "providerDocumentationWorkspace.templateFlankPainRenalComplaintV1Help",
    FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "urinary_retention_complaint_v1",
    "providerDocumentationWorkspace.templateUrinaryRetentionComplaintV1",
    "providerDocumentationWorkspace.templateUrinaryRetentionComplaintV1Help",
    URINARY_RETENTION_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "testicular_pain_complaint_v1",
    "providerDocumentationWorkspace.templateTesticularPainComplaintV1",
    "providerDocumentationWorkspace.templateTesticularPainComplaintV1Help",
    TESTICULAR_PAIN_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "pelvic_pain_complaint_v1",
    "providerDocumentationWorkspace.templatePelvicPainComplaintV1",
    "providerDocumentationWorkspace.templatePelvicPainComplaintV1Help",
    PELVIC_PAIN_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "vaginal_bleeding_complaint_v1",
    "providerDocumentationWorkspace.templateVaginalBleedingComplaintV1",
    "providerDocumentationWorkspace.templateVaginalBleedingComplaintV1Help",
    VAGINAL_BLEEDING_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "vaginal_discharge_complaint_v1",
    "providerDocumentationWorkspace.templateVaginalDischargeComplaintV1",
    "providerDocumentationWorkspace.templateVaginalDischargeComplaintV1Help",
    VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL
  ),
  guRenalComplaintV1Template(
    "renal_failure_symptoms_complaint_v1",
    "providerDocumentationWorkspace.templateRenalFailureSymptomsComplaintV1",
    "providerDocumentationWorkspace.templateRenalFailureSymptomsComplaintV1Help",
    RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "back_pain_complaint_v1",
    "providerDocumentationWorkspace.templateBackPainComplaintV1",
    "providerDocumentationWorkspace.templateBackPainComplaintV1Help",
    BACK_PAIN_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "neck_pain_complaint_v1",
    "providerDocumentationWorkspace.templateNeckPainComplaintV1",
    "providerDocumentationWorkspace.templateNeckPainComplaintV1Help",
    NECK_PAIN_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "shoulder_injury_complaint_v1",
    "providerDocumentationWorkspace.templateShoulderInjuryComplaintV1",
    "providerDocumentationWorkspace.templateShoulderInjuryComplaintV1Help",
    SHOULDER_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "knee_injury_complaint_v1",
    "providerDocumentationWorkspace.templateKneeInjuryComplaintV1",
    "providerDocumentationWorkspace.templateKneeInjuryComplaintV1Help",
    KNEE_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "ankle_foot_injury_complaint_v1",
    "providerDocumentationWorkspace.templateAnkleFootInjuryComplaintV1",
    "providerDocumentationWorkspace.templateAnkleFootInjuryComplaintV1Help",
    ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "hip_pain_injury_complaint_v1",
    "providerDocumentationWorkspace.templateHipPainInjuryComplaintV1",
    "providerDocumentationWorkspace.templateHipPainInjuryComplaintV1Help",
    HIP_PAIN_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "hand_wrist_injury_complaint_v1",
    "providerDocumentationWorkspace.templateHandWristInjuryComplaintV1",
    "providerDocumentationWorkspace.templateHandWristInjuryComplaintV1Help",
    HAND_WRIST_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "fall_trauma_complaint_v1",
    "providerDocumentationWorkspace.templateFallTraumaComplaintV1",
    "providerDocumentationWorkspace.templateFallTraumaComplaintV1Help",
    FALL_TRAUMA_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "minor_head_injury_complaint_v1",
    "providerDocumentationWorkspace.templateMinorHeadInjuryComplaintV1",
    "providerDocumentationWorkspace.templateMinorHeadInjuryComplaintV1Help",
    MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL
  ),
  mskTraumaComplaintV1Template(
    "laceration_soft_tissue_complaint_v1",
    "providerDocumentationWorkspace.templateLacerationSoftTissueComplaintV1",
    "providerDocumentationWorkspace.templateLacerationSoftTissueComplaintV1Help",
    LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "fever_complaint_v1",
    "providerDocumentationWorkspace.templateFeverComplaintV1",
    "providerDocumentationWorkspace.templateFeverComplaintV1Help",
    FEVER_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "cellulitis_skin_infection_complaint_v1",
    "providerDocumentationWorkspace.templateCellulitisSkinInfectionComplaintV1",
    "providerDocumentationWorkspace.templateCellulitisSkinInfectionComplaintV1Help",
    CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "abscess_soft_tissue_complaint_v1",
    "providerDocumentationWorkspace.templateAbscessSoftTissueComplaintV1",
    "providerDocumentationWorkspace.templateAbscessSoftTissueComplaintV1Help",
    ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "wound_infection_complaint_v1",
    "providerDocumentationWorkspace.templateWoundInfectionComplaintV1",
    "providerDocumentationWorkspace.templateWoundInfectionComplaintV1Help",
    WOUND_INFECTION_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "ear_pain_otitis_complaint_v1",
    "providerDocumentationWorkspace.templateEarPainOtitisComplaintV1",
    "providerDocumentationWorkspace.templateEarPainOtitisComplaintV1Help",
    EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "sinus_symptoms_complaint_v1",
    "providerDocumentationWorkspace.templateSinusSymptomsComplaintV1",
    "providerDocumentationWorkspace.templateSinusSymptomsComplaintV1Help",
    SINUS_SYMPTOMS_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "dental_pain_infection_complaint_v1",
    "providerDocumentationWorkspace.templateDentalPainInfectionComplaintV1",
    "providerDocumentationWorkspace.templateDentalPainInfectionComplaintV1Help",
    DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "rash_skin_complaint_v1",
    "providerDocumentationWorkspace.templateRashSkinComplaintV1",
    "providerDocumentationWorkspace.templateRashSkinComplaintV1Help",
    RASH_SKIN_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "sore_throat_infectious_complaint_v1",
    "providerDocumentationWorkspace.templateSoreThroatInfectiousComplaintV1",
    "providerDocumentationWorkspace.templateSoreThroatInfectiousComplaintV1Help",
    SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL
  ),
  infectiousEntComplaintV1Template(
    "dehydration_viral_illness_complaint_v1",
    "providerDocumentationWorkspace.templateDehydrationViralIllnessComplaintV1",
    "providerDocumentationWorkspace.templateDehydrationViralIllnessComplaintV1Help",
    DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL
  ),
  {
    id: "observation_reassessment",
    majorGroup: "ADULT",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupAdult",
    labelKey: "providerDocumentationWorkspace.templateObservationReassessment",
    helperKey: "providerDocumentationWorkspace.templateObservationReassessmentHelp",
    fields: {
      hpi: [
        "providerDocumentationWorkspace.obsSymptomsImproving",
        "providerDocumentationWorkspace.obsSymptomsUnchanged",
        "providerDocumentationWorkspace.obsSymptomsWorsening",
        "providerDocumentationWorkspace.obsVitalsStable",
        "providerDocumentationWorkspace.obsToleratingPo",
        "providerDocumentationWorkspace.obsPainControlled",
      ],
      rosImportantPositives: ["providerDocumentationWorkspace.obsSymptomsImproving"],
      rosImportantNegatives: ["providerDocumentationWorkspace.obsVitalsStable"],
      rosRedFlags: ["providerDocumentationWorkspace.obsTransferConsidered"],
      rosFocusedImpression: [
        "providerDocumentationWorkspace.obsAwaitingLab",
        "providerDocumentationWorkspace.obsAwaitingImaging",
      ],
      mdmWorkingAssessment: ["erMseMdmChips.waUndifferentiated"],
      mdmDataReviewed: [
        "providerDocumentationWorkspace.stickerObsPendingLabsReviewed",
        "providerDocumentationWorkspace.stickerObsPendingImagingReviewed",
      ],
      mdmPlanSummary: ["providerDocumentationWorkspace.obsContinuedMonitoring", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: [
        "providerDocumentationWorkspace.obsDischargeReadiness",
        "providerDocumentationWorkspace.obsTransferConsidered",
      ],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      respiratory: ["erMseExamChips.respNoDistress"],
      cardiovascular: ["erMseExamChips.cardioPeripheralPulsesPresent"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented"],
    },
    guidance: {
      reassessment: ["providerDocumentationSmartSentences.observationIntervalReassessment"],
      followUpDisposition: ["providerDocumentationSmartSentences.observationDischargeReadiness"],
    },
    promptReminderKeys: [
      "providerDocumentationPromptReminders.adultObservationReassessmentReminder",
      "providerDocumentationPromptReminders.observationPendingResults",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
    complaintIntelligence: OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
  },
];

export function providerDocumentationTemplatesByMajorGroup(
  majorGroup: ProviderDocumentationMajorGroup
): ProviderDocumentationTemplateDefinition[] {
  return PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => template.majorGroup === majorGroup);
}

export function providerDocumentationMajorGroupForTemplateId(
  templateId: ProviderDocumentationTemplateId
): ProviderDocumentationMajorGroup | null {
  return PROVIDER_DOCUMENTATION_TEMPLATES.find((template) => template.id === templateId)?.majorGroup ?? null;
}
