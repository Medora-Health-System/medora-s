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
  HEADACHE_COMPLAINT_INTEL,
  PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
  SOB_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
  type ProviderDocumentationComplaintIntelligence,
} from "./providerDocumentationComplaintIntelligence";
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
  complaintIntelligence?: ProviderDocumentationComplaintIntelligence
): TemplateSpec {
  return {
    id,
    majorGroup: "ADULT",
    categoryKey: "providerDocumentationWorkspace.templateMajorGroupAdult",
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
    }
  ),
  traumaTemplate(
    "assault",
    "providerDocumentationWorkspace.templateAssault",
    "providerDocumentationWorkspace.templateAssaultHelp",
    ["erMseHpiChipsTrauma.assaultMechanism", "erMseHpiChipsTrauma.weaponExposureReviewed"],
    ["erMseRosChips.posHeadache", "erMseRosChips.posAbdominalPain"],
    ["providerDocumentationWorkspace.stickerRosNoNeckStiffness"],
    { mdmConsultsDiscussed: ["erMseMdmChips.conNursing", "erMseMdmGuidance.lawEnforcementIfApplicable"] },
    { skin: ["erMseExamChips.skinLacerationPresent", "erMseExamChips.skinWarmDry"] }
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
    { musculoskeletal: ["erMseExamChips.mskTendernessPresent"], neuroPsych: ["erMseExamChips.neuroFollowsCommands"] }
  ),
  traumaTemplate(
    "neck_pain_trauma",
    "providerDocumentationWorkspace.templateNeckPainTrauma",
    "providerDocumentationWorkspace.templateNeckPainTraumaHelp",
    ["erMseHpiChipsTrauma.neckPainMechanism", "erMseHpiChips.timSuddenOnset"],
    ["erMseRosChips.posWeakness"],
    ["providerDocumentationWorkspace.stickerRosNoNeckStiffness", "erMseRosChips.negDeniesWeakness"],
    { mdmDataReviewed: ["erMseMdmChips.planImaging", "erMseMdmGuidance.cspineClearanceConsidered"] },
    { heent: ["erMseExamChips.heentHeadAtraumatic"], musculoskeletal: ["providerDocumentationWorkspace.stickerExamLimitedRom"] }
  ),
  traumaTemplate(
    "crush_injury",
    "providerDocumentationWorkspace.templateCrushInjury",
    "providerDocumentationWorkspace.templateCrushInjuryHelp",
    ["erMseHpiChipsTrauma.crushMechanism", "erMseHpiChipsTrauma.entrapmentReviewed"],
    ["erMseRosChips.posWeakness", "erMseRosChips.rfBleeding"],
    ["providerDocumentationWorkspace.stickerRosNoNumbness"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actIvMonitor", "erMseMdmChips.actPain"] },
    { musculoskeletal: ["erMseExamChips.mskSwellingPresent", "providerDocumentationWorkspace.stickerExamNvIntact"] }
  ),
  traumaTemplate(
    "penetrating_injury",
    "providerDocumentationWorkspace.templatePenetratingInjury",
    "providerDocumentationWorkspace.templatePenetratingInjuryHelp",
    ["erMseHpiChipsTrauma.penetratingMechanism", "erMseHpiChipsTrauma.weaponExposureReviewed"],
    ["erMseRosChips.rfBleeding", "erMseRosChips.posAbdominalPain"],
    ["erMseRosChips.negDeniesSyncope"],
    { mdmImmediateActionsRationale: ["erMseMdmChips.actIvMonitor", "erMseMdmChips.actSafety"] },
    { abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdGuarding"], skin: ["erMseExamChips.skinLacerationPresent"] }
  ),
  traumaTemplate(
    "burn",
    "providerDocumentationWorkspace.templateBurn",
    "providerDocumentationWorkspace.templateBurnHelp",
    ["erMseHpiChipsTrauma.burnMechanism", "erMseHpiChipsTrauma.burnSurfaceAreaReviewed"],
    ["erMseRosChips.posSob"],
    ["erMseRosChips.negDeniesSob", "providerDocumentationWorkspace.stickerRosNoThroatTightness"],
    { mdmPlanSummary: ["erMseMdmChips.actFluids", "erMseMdmChips.planReassess"] },
    { skin: ["erMseExamChips.skinWarmDry", "providerDocumentationWorkspace.stickerExamBurnWoundPresent"], respiratory: ["erMseExamChips.respNoDistress"] }
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
      "providerDocumentationPromptReminders.traumaMechanism",
      "providerDocumentationPromptReminders.pediatricCaregiverHistorian",
      "providerDocumentationPromptReminders.traumaReassessment",
    ],
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
    }
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
    }
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
    }
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
    { general: ["erMseExamChips.genAlert"], heent: ["erMseExamChips.heentDryMm"] }
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
    { cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioTachycardic"], neuroPsych: ["erMseExamChips.neuroAlertOriented"] }
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
    { general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"] }
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
    }
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
      "providerDocumentationPromptReminders.observationPendingResults",
      "providerDocumentationPromptReminders.emtalaReassessment",
    ],
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
