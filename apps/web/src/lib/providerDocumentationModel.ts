export type ProviderDocumentationEncounterMode = "ED" | "OBSERVATION";

export type ProviderDocumentationDocumentType =
  | "INITIAL_PROVIDER_NOTE"
  | "OBSERVATION_PROVIDER_PROGRESS_NOTE";

export const PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE =
  "PROVIDER_DOCUMENTATION_WORKSPACE" as const;

export const PROVIDER_DOCUMENTATION_NAMESPACE_KEY = "erProviderMseV1" as const;

export type ProviderDocumentationMetadata = {
  encounterMode: ProviderDocumentationEncounterMode;
  documentType: ProviderDocumentationDocumentType;
  savedAt: string;
  savedBy: string;
  source: typeof PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE;
  activeTemplateId?: ProviderDocumentationTemplateId | null;
};

export type ProviderDocumentationExamSectionId =
  | "general"
  | "heent"
  | "cardiovascular"
  | "respiratory"
  | "abdomen"
  | "neuroPsych"
  | "musculoskeletal"
  | "skin"
  | "reassessment";

export type ProviderDocumentationRiskLevel = "" | "Low" | "Moderate" | "High";

export type ProviderDocumentationTemplateId =
  | "chest_pain"
  | "abdominal_pain"
  | "headache"
  | "back_pain"
  | "uri_respiratory"
  | "trauma_musculoskeletal"
  | "nausea_vomiting"
  | "dizziness_syncope"
  | "allergic_reaction_rash"
  | "urinary_symptoms"
  | "psychiatric_behavioral"
  | "observation_reassessment";

export type ProviderDocumentationWorkspaceState = {
  activeTemplateId: ProviderDocumentationTemplateId | null;
  reasonForVisit: string;
  chiefComplaint: string;
  hpi: string;
  rosFocusedImpression: string;
  rosImportantPositives: string;
  rosImportantNegatives: string;
  rosRedFlags: string;
  physicalExam: Record<ProviderDocumentationExamSectionId, string>;
  mdmWorkingAssessment: string;
  mdmDifferentialSynthesis: string;
  mdmDataReviewed: string;
  mdmRiskLevel: ProviderDocumentationRiskLevel;
  mdmClinicalRationale: string;
  mdmPlanSummary: string;
  mdmImmediateActionsRationale: string;
  mdmConsultsDiscussed: string;
  mdmAdmitObserveDischarge: string;
  clinicalImpression: string;
  treatmentPlan: string;
  followUpDisposition: string;
  providerAddendum: string;
};

export type ProviderDocumentationSavePayload = {
  nursingAssessment: Record<string, unknown>;
  visitReason: string | null;
  clinicianImpression: string | null;
  treatmentPlan: string | null;
};

export type ProviderDocumentationTemplateStringField = Exclude<
  keyof ProviderDocumentationWorkspaceState,
  "activeTemplateId" | "physicalExam" | "mdmRiskLevel"
>;

export type ProviderDocumentationTemplateCategory =
  | "cardiopulmonary"
  | "abdominal_gu"
  | "neuro_behavioral"
  | "respiratory_allergy_skin"
  | "trauma_msk"
  | "observation";

export type ProviderDocumentationTemplateDefinition = {
  id: ProviderDocumentationTemplateId;
  categoryKey: string;
  labelKey: string;
  helperKey: string;
  fields: Partial<Record<ProviderDocumentationTemplateStringField, string[]>>;
  physicalExam: Partial<Record<ProviderDocumentationExamSectionId, string[]>>;
};

export const PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS: ProviderDocumentationExamSectionId[] = [
  "general",
  "heent",
  "cardiovascular",
  "respiratory",
  "abdomen",
  "neuroPsych",
  "musculoskeletal",
  "skin",
  "reassessment",
];

export const PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT = `Review of Systems:
Constitutional: Denies fever, chills, fatigue, or weight changes.
Eyes: Denies vision changes, eye pain, redness, or discharge.
ENT: Denies ear pain, nasal congestion, sore throat, or difficulty swallowing.
Cardiovascular: Denies chest pain, palpitations, or leg swelling.
Respiratory: Denies cough, shortness of breath, wheezing, or chest tightness.
Gastrointestinal: Denies abdominal pain, nausea, vomiting, diarrhea, constipation, or blood in stool.
Genitourinary: Denies painful urination, urinary frequency, urgency, blood in urine, or flank pain.
Musculoskeletal: Denies joint pain, muscle pain, back pain, or swelling.
Skin: Denies rash, itching, wounds, or skin changes.
Neurologic: Denies headache, dizziness, weakness, numbness, tingling, or fainting.
Psychiatric: Denies anxiety, depression, confusion, suicidal thoughts, or sleep disturbance.
Endocrine: Denies excessive thirst, excessive urination, heat or cold intolerance.
Hematologic/Lymphatic: Denies easy bruising, easy bleeding, or swollen lymph nodes.
Allergic/Immunologic: Denies seasonal allergies, hives, or recurrent infections.`;

export const PROVIDER_DOCUMENTATION_EXAM_FIELD_TO_LEGACY_KEY: Record<
  ProviderDocumentationExamSectionId,
  string
> = {
  general: "examGeneralAppearance",
  heent: "examHeent",
  cardiovascular: "examCardiac",
  respiratory: "examRespiratory",
  abdomen: "examAbdomen",
  neuroPsych: "examNeuroMental",
  musculoskeletal: "examMusculoskeletal",
  skin: "examSkin",
  reassessment: "examReassessmentExtra",
};

export const PROVIDER_DOCUMENTATION_TEMPLATES: ProviderDocumentationTemplateDefinition[] = [
  {
    id: "chest_pain",
    categoryKey: "providerDocumentationWorkspace.templateCategoryCardiopulmonary",
    labelKey: "providerDocumentationWorkspace.templateChestPain",
    helperKey: "providerDocumentationWorkspace.templateChestPainHelp",
    fields: {
      hpi: [
        "erMseHpiChips.locChestPain",
        "erMseHpiChips.timStartedToday",
        "erMseHpiChips.qualPressureLike",
        "erMseHpiChips.assocSob",
      ],
      rosImportantPositives: ["erMseRosChips.posChestPain", "erMseRosChips.posSob"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesFever",
        "erMseRosChips.negDeniesSyncope",
        "erMseRosChips.negDeniesVomiting",
      ],
      rosRedFlags: ["erMseRosChips.rfSyncope", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waCardiopulmonary"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planEcg"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess", "erMseMdmChips.planSdM"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      cardiovascular: [
        "erMseExamChips.cardioRrr",
        "erMseExamChips.cardioNoMurmur",
        "erMseExamChips.cardioPeripheralPulsesPresent",
      ],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs"],
      musculoskeletal: ["providerDocumentationWorkspace.stickerExamChestWallTenderness"],
    },
  },
  {
    id: "abdominal_pain",
    categoryKey: "providerDocumentationWorkspace.templateCategoryAbdominalGu",
    labelKey: "providerDocumentationWorkspace.templateAbdominalPain",
    helperKey: "providerDocumentationWorkspace.templateAbdominalPainHelp",
    fields: {
      hpi: [
        "erMseHpiChips.locAbdominalPain",
        "erMseHpiChips.timStartedToday",
        "erMseHpiChips.timWorsening",
      ],
      rosImportantPositives: ["erMseRosChips.posAbdominalPain", "erMseRosChips.posVomiting"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesFever",
        "erMseRosChips.negDeniesSyncope",
        "providerDocumentationWorkspace.stickerRosNoCvaPain",
      ],
      rosRedFlags: [
        "erMseRosChips.rfSeverePain",
        "erMseRosChips.rfHypotensionConcern",
        "erMseRosChips.rfPregnancyConcern",
      ],
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      abdomen: [
        "erMseExamChips.abdSoft",
        "providerDocumentationWorkspace.stickerExamAbdNonDistended",
        "erMseExamChips.abdNonTender",
        "erMseExamChips.abdTendernessPresent",
        "erMseExamChips.abdGuarding",
        "providerDocumentationWorkspace.stickerExamReboundPresent",
        "providerDocumentationWorkspace.stickerExamBowelSoundsPresent",
        "providerDocumentationWorkspace.stickerExamNoCvaTenderness",
      ],
    },
  },
  {
    id: "headache",
    categoryKey: "providerDocumentationWorkspace.templateCategoryNeuroBehavioral",
    labelKey: "providerDocumentationWorkspace.templateHeadache",
    helperKey: "providerDocumentationWorkspace.templateHeadacheHelp",
    fields: {
      hpi: ["erMseHpiChips.locHeadache", "erMseHpiChips.timStartedToday", "erMseHpiChips.timSuddenOnset"],
      rosImportantPositives: ["erMseRosChips.posHeadache", "erMseRosChips.posDizziness"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesFever",
        "erMseRosChips.negDeniesSyncope",
        "providerDocumentationWorkspace.stickerRosNoNeckStiffness",
      ],
      rosRedFlags: ["erMseRosChips.rfAlteredMs", "erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic"],
      mdmDataReviewed: ["erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentPerrla"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear"],
    },
  },
  {
    id: "back_pain",
    categoryKey: "providerDocumentationWorkspace.templateCategoryTraumaMsk",
    labelKey: "providerDocumentationWorkspace.templateBackPain",
    helperKey: "providerDocumentationWorkspace.templateBackPainHelp",
    fields: {
      hpi: ["erMseHpiChips.locBackPain", "erMseHpiChips.timStartedToday", "erMseHpiChips.qualAching"],
      rosImportantPositives: ["erMseRosChips.posWeakness"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesFever",
        "erMseRosChips.negDeniesWeakness",
        "providerDocumentationWorkspace.stickerRosNoBowelBladder",
      ],
      rosRedFlags: ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain"],
      mdmWorkingAssessment: ["erMseMdmChips.waTrauma"],
      mdmDataReviewed: ["erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      neuroPsych: ["erMseExamChips.neuroFollowsCommands"],
      musculoskeletal: ["erMseExamChips.mskRomNormal", "erMseExamChips.mskTendernessPresent"],
    },
  },
  {
    id: "uri_respiratory",
    categoryKey: "providerDocumentationWorkspace.templateCategoryRespiratoryAllergySkin",
    labelKey: "providerDocumentationWorkspace.templateUriRespiratory",
    helperKey: "providerDocumentationWorkspace.templateUriRespiratoryHelp",
    fields: {
      hpi: ["erMseHpiChips.timStartedToday", "erMseHpiChips.timGradualOnset", "erMseHpiChips.assocSob"],
      rosImportantPositives: ["erMseRosChips.posFever", "erMseRosChips.posSob"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesChestPain",
        "erMseRosChips.negDeniesSyncope",
        "providerDocumentationWorkspace.stickerRosNoHemoptysis",
      ],
      rosRedFlags: ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waCardiopulmonary"],
      mdmDataReviewed: ["erMseMdmChips.planLabs", "erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actOxygen"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      heent: ["erMseExamChips.heentOropharynxClear"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
    },
  },
  {
    id: "trauma_musculoskeletal",
    categoryKey: "providerDocumentationWorkspace.templateCategoryTraumaMsk",
    labelKey: "providerDocumentationWorkspace.templateTraumaMsk",
    helperKey: "providerDocumentationWorkspace.templateTraumaMskHelp",
    fields: {
      hpi: ["erMseHpiChips.locLimbPain", "erMseHpiChips.timSuddenOnset", "erMseHpiChips.qualAching"],
      rosImportantPositives: ["erMseRosChips.posWeakness"],
      rosImportantNegatives: ["erMseRosChips.negDeniesWeakness", "providerDocumentationWorkspace.stickerRosNoNumbness"],
      rosRedFlags: ["erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfSeverePain", "erMseRosChips.rfBleeding"],
      mdmWorkingAssessment: ["erMseMdmChips.waTrauma"],
      mdmDataReviewed: ["erMseMdmChips.planImaging"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmImmediateActionsRationale: ["erMseMdmChips.actPain", "erMseMdmChips.actSafety"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      musculoskeletal: [
        "erMseExamChips.mskRomNormal",
        "erMseExamChips.mskTendernessPresent",
        "erMseExamChips.mskSwellingPresent",
        "erMseExamChips.mskDeformityNoted",
        "providerDocumentationWorkspace.stickerExamLimitedRom",
        "providerDocumentationWorkspace.stickerExamNvIntact",
        "providerDocumentationWorkspace.stickerExamCapRefillIntact",
      ],
      skin: ["erMseExamChips.skinLacerationPresent"],
      neuroPsych: ["erMseExamChips.neuroFocalDeficitNoted"],
    },
  },
  {
    id: "nausea_vomiting",
    categoryKey: "providerDocumentationWorkspace.templateCategoryAbdominalGu",
    labelKey: "providerDocumentationWorkspace.templateNauseaVomiting",
    helperKey: "providerDocumentationWorkspace.templateNauseaVomitingHelp",
    fields: {
      hpi: ["erMseHpiChips.assocNausea", "erMseHpiChips.assocVomiting", "erMseHpiChips.timStartedToday"],
      rosImportantPositives: ["erMseRosChips.posVomiting", "erMseRosChips.posAbdominalPain"],
      rosImportantNegatives: [
        "erMseRosChips.negDeniesChestPain",
        "erMseRosChips.negDeniesFever",
        "providerDocumentationWorkspace.stickerRosNoBloodInEmesis",
      ],
      rosRedFlags: ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfAlteredMs"],
      mdmWorkingAssessment: ["erMseMdmChips.waAbdominal", "erMseMdmChips.waInfectious"],
      mdmDataReviewed: ["erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.actAntiemetic", "erMseMdmChips.actFluids", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      heent: ["erMseExamChips.heentDryMm"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender", "providerDocumentationWorkspace.stickerExamBowelSoundsPresent"],
    },
  },
  {
    id: "dizziness_syncope",
    categoryKey: "providerDocumentationWorkspace.templateCategoryNeuroBehavioral",
    labelKey: "providerDocumentationWorkspace.templateDizzinessSyncope",
    helperKey: "providerDocumentationWorkspace.templateDizzinessSyncopeHelp",
    fields: {
      hpi: ["erMseHpiChips.assocDizziness", "erMseHpiChips.timSuddenOnset", "erMseHpiChips.timImproving"],
      rosImportantPositives: ["erMseRosChips.posDizziness"],
      rosImportantNegatives: ["erMseRosChips.negDeniesChestPain", "erMseRosChips.negDeniesSob", "erMseRosChips.negDeniesWeakness"],
      rosRedFlags: ["erMseRosChips.rfSyncope", "erMseRosChips.rfNeuroDeficit", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waNeurologic", "erMseMdmChips.waCardiopulmonary"],
      mdmDataReviewed: ["erMseMdmChips.planEcg", "erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.actSafety", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispAdmit", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      cardiovascular: ["erMseExamChips.cardioRrr", "erMseExamChips.cardioPeripheralPulsesPresent"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.neuroSpeechClear", "erMseExamChips.neuroFollowsCommands"],
    },
  },
  {
    id: "allergic_reaction_rash",
    categoryKey: "providerDocumentationWorkspace.templateCategoryRespiratoryAllergySkin",
    labelKey: "providerDocumentationWorkspace.templateAllergicReactionRash",
    helperKey: "providerDocumentationWorkspace.templateAllergicReactionRashHelp",
    fields: {
      hpi: ["providerDocumentationWorkspace.stickerHpiRash", "erMseHpiChips.timStartedToday", "erMseHpiChips.timWorsening"],
      rosImportantPositives: ["providerDocumentationWorkspace.stickerRosPruritus", "erMseRosChips.posSob"],
      rosImportantNegatives: ["erMseRosChips.negDeniesSob", "providerDocumentationWorkspace.stickerRosNoThroatTightness"],
      rosRedFlags: ["erMseRosChips.rfRespDistress", "erMseRosChips.rfHypotensionConcern"],
      mdmWorkingAssessment: ["providerDocumentationWorkspace.stickerMdmAllergicProcess"],
      mdmDataReviewed: ["providerDocumentationWorkspace.stickerMdmMedicationExposureReviewed"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      respiratory: ["erMseExamChips.respNoDistress", "erMseExamChips.respClearBs", "erMseExamChips.respWheezing"],
      skin: ["erMseExamChips.skinRashPresent", "providerDocumentationWorkspace.stickerExamUrticariaPresent"],
      heent: ["providerDocumentationWorkspace.stickerExamNoOropharyngealSwelling"],
    },
  },
  {
    id: "urinary_symptoms",
    categoryKey: "providerDocumentationWorkspace.templateCategoryAbdominalGu",
    labelKey: "providerDocumentationWorkspace.templateUrinarySymptoms",
    helperKey: "providerDocumentationWorkspace.templateUrinarySymptomsHelp",
    fields: {
      hpi: ["providerDocumentationWorkspace.stickerHpiDysuria", "erMseHpiChips.locFlankPain", "erMseHpiChips.timStartedToday"],
      rosImportantPositives: ["providerDocumentationWorkspace.stickerRosDysuria", "providerDocumentationWorkspace.stickerRosFrequency"],
      rosImportantNegatives: ["erMseRosChips.negDeniesFever", "providerDocumentationWorkspace.stickerRosNoVomiting", "providerDocumentationWorkspace.stickerRosNoCvaPain"],
      rosRedFlags: ["erMseRosChips.rfHypotensionConcern", "erMseRosChips.rfPregnancyConcern", "erMseRosChips.rfAlteredMs"],
      mdmWorkingAssessment: ["erMseMdmChips.waInfectious", "erMseMdmChips.waAbdominal"],
      mdmDataReviewed: ["erMseMdmChips.planLabs"],
      mdmPlanSummary: ["erMseMdmChips.planMeds", "erMseMdmChips.planReassess"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispReturnPrecautions"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert", "erMseExamChips.genNoAcuteDistress"],
      abdomen: ["erMseExamChips.abdSoft", "erMseExamChips.abdNonTender", "providerDocumentationWorkspace.stickerExamNoCvaTenderness"],
    },
  },
  {
    id: "psychiatric_behavioral",
    categoryKey: "providerDocumentationWorkspace.templateCategoryNeuroBehavioral",
    labelKey: "providerDocumentationWorkspace.templatePsychBehavioral",
    helperKey: "providerDocumentationWorkspace.templatePsychBehavioralHelp",
    fields: {
      hpi: ["providerDocumentationWorkspace.stickerHpiBehavioralConcern", "erMseHpiChips.timStartedToday"],
      rosImportantPositives: ["providerDocumentationWorkspace.stickerRosAnxiety", "providerDocumentationWorkspace.stickerRosMoodConcern"],
      rosImportantNegatives: ["providerDocumentationWorkspace.stickerRosNoMedicalComplaint", "providerDocumentationWorkspace.stickerRosNoIntoxicationReported"],
      rosRedFlags: ["erMseRosChips.rfAlteredMs", "providerDocumentationWorkspace.stickerRosSafetyConcern"],
      mdmWorkingAssessment: ["erMseMdmChips.waMedIntox", "providerDocumentationWorkspace.stickerMdmBehavioralConcern"],
      mdmDataReviewed: ["providerDocumentationWorkspace.stickerMdmCollateralReviewed"],
      mdmPlanSummary: ["erMseMdmChips.actSafety", "erMseMdmChips.planReassess"],
      mdmConsultsDiscussed: ["erMseMdmChips.conSpecialist", "erMseMdmChips.conNursing"],
      mdmAdmitObserveDischarge: ["erMseMdmChips.dispObs", "erMseMdmChips.dispTransfer"],
    },
    physicalExam: {
      general: ["erMseExamChips.genAlert"],
      neuroPsych: ["erMseExamChips.neuroAlertOriented", "erMseExamChips.psychCalmCooperative", "erMseExamChips.psychAgitated", "erMseExamChips.psychAnxious"],
      skin: ["erMseExamChips.skinWarmDry"],
    },
  },
  {
    id: "observation_reassessment",
    categoryKey: "providerDocumentationWorkspace.templateCategoryObservation",
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
      mdmPlanSummary: [
        "providerDocumentationWorkspace.obsContinuedMonitoring",
        "erMseMdmChips.planReassess",
      ],
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
  },
];

export const PROVIDER_DOCUMENTATION_TEMPLATE_CATEGORY_KEYS = [
  "providerDocumentationWorkspace.templateCategoryCardiopulmonary",
  "providerDocumentationWorkspace.templateCategoryAbdominalGu",
  "providerDocumentationWorkspace.templateCategoryNeuroBehavioral",
  "providerDocumentationWorkspace.templateCategoryRespiratoryAllergySkin",
  "providerDocumentationWorkspace.templateCategoryTraumaMsk",
  "providerDocumentationWorkspace.templateCategoryObservation",
] as const;

export const PROVIDER_DOCUMENTATION_REQUIRED_SECTION_IDS = [
  "hpi",
  "ros",
  "physicalExam",
  "mdm",
  "impression",
  "plan",
] as const satisfies ReadonlyArray<ProviderDocumentationPreviewSection["id"]>;

export function documentTypeForEncounterMode(
  encounterMode: ProviderDocumentationEncounterMode
): ProviderDocumentationDocumentType {
  return encounterMode === "ED"
    ? "INITIAL_PROVIDER_NOTE"
    : "OBSERVATION_PROVIDER_PROGRESS_NOTE";
}

export function providerDocumentationTitleKey(
  encounterMode: ProviderDocumentationEncounterMode
): string {
  return encounterMode === "ED"
    ? "providerDocumentationWorkspace.titleEd"
    : "providerDocumentationWorkspace.titleObservation";
}

export function providerDocumentationTimelineLabel(
  encounterMode: ProviderDocumentationEncounterMode
): string {
  return encounterMode === "ED"
    ? "ED provider documentation saved"
    : "Observation provider progress note saved";
}

export type ProviderDocumentationSectionStatus = "complete" | "missing" | "recommended" | "saved";

export type ProviderDocumentationCompletenessSectionId =
  | "chiefComplaintHpi"
  | "ros"
  | "physicalExam"
  | "mdm"
  | "impression"
  | "plan"
  | "followUpDisposition";

export type ProviderDocumentationReadinessState =
  | "incomplete"
  | "needs_review"
  | "ready_to_save"
  | "saved"
  | "signed_or_finalized";

export type ProviderDocumentationWarningId =
  | "missingHpi"
  | "missingRos"
  | "missingPhysicalExam"
  | "missingMdm"
  | "missingImpression"
  | "missingPlan"
  | "missingSavedMetadata"
  | "edMissingChiefComplaint"
  | "edMissingDispositionReasoning"
  | "edReassessmentRecommended"
  | "edMdmRecommendedBeforeFinalization"
  | "observationMissingIntervalStatus"
  | "observationMissingResponseToTreatment"
  | "observationMissingVitalsTrend"
  | "observationPendingResultsRecommended"
  | "observationMissingReadinessOrRationale"
  | "observationMissingTransferDischargeReasoning";

export type ProviderDocumentationWarning = {
  id: ProviderDocumentationWarningId;
  messageKey: string;
  severity: "info" | "warning" | "critical";
};

export type ProviderDocumentationCompletenessSection = {
  id: ProviderDocumentationCompletenessSectionId;
  labelKey: string;
  status: ProviderDocumentationSectionStatus;
};

export type ProviderDocumentationCompleteness = {
  completedSections: ProviderDocumentationCompletenessSectionId[];
  missingSections: ProviderDocumentationCompletenessSectionId[];
  recommendedSections: ProviderDocumentationCompletenessSectionId[];
  sectionStatuses: ProviderDocumentationCompletenessSection[];
  warnings: ProviderDocumentationWarning[];
  readinessState: ProviderDocumentationReadinessState;
};

export type ProviderDocumentationCompletenessInput = {
  state: ProviderDocumentationWorkspaceState;
  encounterMode: ProviderDocumentationEncounterMode;
  documentType?: ProviderDocumentationDocumentType;
  savedMetadata?: ProviderDocumentationMetadata | null;
  signedOrFinalized?: boolean;
  dispositionContext?: "DISCHARGE" | "ADMISSION" | "TRANSFER" | "OBSERVATION" | null;
  hasPendingResults?: boolean;
  longStayOrInterventionHeavy?: boolean;
};

export function emptyProviderDocumentationWorkspaceState(): ProviderDocumentationWorkspaceState {
  return {
    activeTemplateId: null,
    reasonForVisit: "",
    chiefComplaint: "",
    hpi: "",
    rosFocusedImpression: "",
    rosImportantPositives: "",
    rosImportantNegatives: "",
    rosRedFlags: "",
    physicalExam: {
      general: "",
      heent: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      neuroPsych: "",
      musculoskeletal: "",
      skin: "",
      reassessment: "",
    },
    mdmWorkingAssessment: "",
    mdmDifferentialSynthesis: "",
    mdmDataReviewed: "",
    mdmRiskLevel: "",
    mdmClinicalRationale: "",
    mdmPlanSummary: "",
    mdmImmediateActionsRationale: "",
    mdmConsultsDiscussed: "",
    mdmAdmitObserveDischarge: "",
    clinicalImpression: "",
    treatmentPlan: "",
    followUpDisposition: "",
    providerAddendum: "",
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFragment(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function appendDocumentationFragment(current: string, fragment: string): string {
  const clean = normalizeFragment(fragment);
  if (!clean) return current;
  const currentTrimmed = current.trim();
  if (!currentTrimmed) return clean;
  const parts = currentTrimmed
    .split(/\s*;\s*/u)
    .map((p) => normalizeFragment(p))
    .filter(Boolean);
  const alreadyPresent = parts.some((p) => p.toLocaleLowerCase() === clean.toLocaleLowerCase());
  if (alreadyPresent) return current;
  return `${currentTrimmed}; ${clean}`;
}

function appendDocumentationBlock(current: string, block: string): string {
  const clean = block.trim();
  if (!clean) return current;
  const currentTrimmed = current.trim();
  if (!currentTrimmed) return clean;
  const normalizeBlock = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalizeBlock(currentTrimmed).includes(normalizeBlock(clean))) return current;
  return `${currentTrimmed}\n\n${clean}`;
}

export function providerDocumentationTemplateById(
  templateId: ProviderDocumentationTemplateId
): ProviderDocumentationTemplateDefinition {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId);
  if (!template) {
    throw new Error(`Unknown provider documentation template: ${templateId}`);
  }
  return template;
}

export function providerDocumentationCompletedSectionIds(
  state: ProviderDocumentationWorkspaceState
): ProviderDocumentationPreviewSection["id"][] {
  return buildProviderDocumentationPreviewSections(state).map((section) => section.id);
}

export function providerDocumentationMissingSectionIds(
  state: ProviderDocumentationWorkspaceState
): ProviderDocumentationPreviewSection["id"][] {
  const completed = new Set(providerDocumentationCompletedSectionIds(state));
  return PROVIDER_DOCUMENTATION_REQUIRED_SECTION_IDS.filter((sectionId) => !completed.has(sectionId));
}

const COMPLETENESS_SECTION_LABEL_KEYS: Record<ProviderDocumentationCompletenessSectionId, string> = {
  chiefComplaintHpi: "providerDocumentationWorkspace.completenessChiefComplaintHpi",
  ros: "providerDocumentationWorkspace.previewRos",
  physicalExam: "providerDocumentationWorkspace.previewExam",
  mdm: "providerDocumentationWorkspace.previewMdm",
  impression: "providerDocumentationWorkspace.previewImpression",
  plan: "providerDocumentationWorkspace.previewPlan",
  followUpDisposition: "providerDocumentationWorkspace.followUpDisposition",
};

function hasText(...values: string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

function dispositionReasoningPresent(state: ProviderDocumentationWorkspaceState): boolean {
  return hasText(state.mdmAdmitObserveDischarge, state.followUpDisposition);
}

function observationReadinessOrRationalePresent(state: ProviderDocumentationWorkspaceState): boolean {
  return hasText(state.mdmAdmitObserveDischarge, state.followUpDisposition, state.mdmPlanSummary);
}

function observationResponseToTreatmentPresent(state: ProviderDocumentationWorkspaceState): boolean {
  const text = [
    state.hpi,
    state.rosFocusedImpression,
    state.mdmPlanSummary,
    state.followUpDisposition,
  ].join(" ");
  return /improv|unchanged|worsen|response|tolerating|pain controlled|amélioration|inchangé|aggrav/i.test(text);
}

function observationVitalsTrendPresent(state: ProviderDocumentationWorkspaceState): boolean {
  return /vital|vitals|signes vitaux|stable|trend|tendance/i.test(
    [state.hpi, state.rosFocusedImpression, state.mdmDataReviewed, state.mdmPlanSummary].join(" ")
  );
}

function observationPendingResultsAddressed(state: ProviderDocumentationWorkspaceState): boolean {
  return /pending|awaiting|lab|imaging|result|résultat|labo|imagerie|attente/i.test(
    [state.rosFocusedImpression, state.mdmDataReviewed, state.mdmPlanSummary].join(" ")
  );
}

function sectionStatus(input: {
  id: ProviderDocumentationCompletenessSectionId;
  complete: boolean;
  recommended: boolean;
  saved: boolean;
}): ProviderDocumentationCompletenessSection {
  return {
    id: input.id,
    labelKey: COMPLETENESS_SECTION_LABEL_KEYS[input.id],
    status: input.saved && input.complete ? "saved" : input.complete ? "complete" : input.recommended ? "recommended" : "missing",
  };
}

export function buildProviderDocumentationWarnings(
  input: ProviderDocumentationCompletenessInput
): ProviderDocumentationWarning[] {
  const { state, encounterMode } = input;
  const warnings: ProviderDocumentationWarning[] = [];
  const add = (warning: ProviderDocumentationWarning) => warnings.push(warning);

  if (!hasText(state.hpi, state.chiefComplaint)) {
    add({ id: "missingHpi", messageKey: "providerDocumentationWorkspace.warningMissingHpi", severity: "critical" });
  }
  if (!hasText(state.rosFocusedImpression, state.rosImportantPositives, state.rosImportantNegatives, state.rosRedFlags)) {
    add({ id: "missingRos", messageKey: "providerDocumentationWorkspace.warningMissingRos", severity: "warning" });
  }
  if (!PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.some((id) => state.physicalExam[id].trim())) {
    add({ id: "missingPhysicalExam", messageKey: "providerDocumentationWorkspace.warningMissingPhysicalExam", severity: "critical" });
  }
  if (!hasText(state.mdmWorkingAssessment, state.mdmDifferentialSynthesis, state.mdmDataReviewed, state.mdmPlanSummary, state.mdmAdmitObserveDischarge)) {
    add({ id: "missingMdm", messageKey: "providerDocumentationWorkspace.warningMissingMdm", severity: "critical" });
  }
  if (!hasText(state.clinicalImpression)) {
    add({ id: "missingImpression", messageKey: "providerDocumentationWorkspace.warningMissingImpression", severity: "warning" });
  }
  if (!hasText(state.treatmentPlan)) {
    add({ id: "missingPlan", messageKey: "providerDocumentationWorkspace.warningMissingPlan", severity: "warning" });
  }
  if (!input.savedMetadata) {
    add({ id: "missingSavedMetadata", messageKey: "providerDocumentationWorkspace.warningMissingSavedMetadata", severity: "info" });
  }

  if (encounterMode === "ED") {
    if (!hasText(state.chiefComplaint, state.reasonForVisit)) {
      add({ id: "edMissingChiefComplaint", messageKey: "providerDocumentationWorkspace.warningEdMissingChiefComplaint", severity: "warning" });
    }
    if (!dispositionReasoningPresent(state)) {
      add({ id: "edMissingDispositionReasoning", messageKey: "providerDocumentationWorkspace.warningEdDispositionReasoning", severity: "warning" });
    }
    if (input.longStayOrInterventionHeavy && !hasText(state.providerAddendum, state.followUpDisposition, state.mdmClinicalRationale)) {
      add({ id: "edReassessmentRecommended", messageKey: "providerDocumentationWorkspace.warningEdReassessment", severity: "warning" });
    }
    if (!hasText(state.mdmWorkingAssessment, state.mdmPlanSummary)) {
      add({ id: "edMdmRecommendedBeforeFinalization", messageKey: "providerDocumentationWorkspace.warningEdMdmBeforeFinalization", severity: "critical" });
    }
  } else {
    if (!hasText(state.hpi, state.rosFocusedImpression)) {
      add({ id: "observationMissingIntervalStatus", messageKey: "providerDocumentationWorkspace.warningObsIntervalStatus", severity: "warning" });
    }
    if (!observationResponseToTreatmentPresent(state)) {
      add({ id: "observationMissingResponseToTreatment", messageKey: "providerDocumentationWorkspace.warningObsResponseToTreatment", severity: "warning" });
    }
    if (!observationVitalsTrendPresent(state)) {
      add({ id: "observationMissingVitalsTrend", messageKey: "providerDocumentationWorkspace.warningObsVitalsTrend", severity: "warning" });
    }
    if (input.hasPendingResults && !observationPendingResultsAddressed(state)) {
      add({ id: "observationPendingResultsRecommended", messageKey: "providerDocumentationWorkspace.warningObsPendingResults", severity: "warning" });
    }
    if (!observationReadinessOrRationalePresent(state)) {
      add({ id: "observationMissingReadinessOrRationale", messageKey: "providerDocumentationWorkspace.warningObsReadinessOrRationale", severity: "warning" });
    }
    if (!dispositionReasoningPresent(state)) {
      add({ id: "observationMissingTransferDischargeReasoning", messageKey: "providerDocumentationWorkspace.warningObsTransferDischarge", severity: "warning" });
    }
  }

  return warnings;
}

export function buildProviderDocumentationCompleteness(
  input: ProviderDocumentationCompletenessInput
): ProviderDocumentationCompleteness {
  const { state } = input;
  const saved = Boolean(input.savedMetadata);
  const checks: Array<{ id: ProviderDocumentationCompletenessSectionId; complete: boolean; recommended: boolean }> = [
    { id: "chiefComplaintHpi", complete: hasText(state.chiefComplaint, state.hpi), recommended: true },
    { id: "ros", complete: hasText(state.rosFocusedImpression, state.rosImportantPositives, state.rosImportantNegatives, state.rosRedFlags), recommended: true },
    { id: "physicalExam", complete: PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.some((id) => state.physicalExam[id].trim()), recommended: true },
    { id: "mdm", complete: hasText(state.mdmWorkingAssessment, state.mdmDifferentialSynthesis, state.mdmDataReviewed, state.mdmPlanSummary, state.mdmAdmitObserveDischarge), recommended: true },
    { id: "impression", complete: hasText(state.clinicalImpression), recommended: true },
    { id: "plan", complete: hasText(state.treatmentPlan), recommended: true },
    { id: "followUpDisposition", complete: hasText(state.followUpDisposition, state.mdmAdmitObserveDischarge), recommended: input.encounterMode === "OBSERVATION" || Boolean(input.dispositionContext) },
  ];
  const sectionStatuses = checks.map((check) => sectionStatus({ ...check, saved }));
  const completedSections = checks.filter((check) => check.complete).map((check) => check.id);
  const missingSections = checks.filter((check) => !check.complete && check.recommended).map((check) => check.id);
  const recommendedSections = checks.filter((check) => check.recommended).map((check) => check.id);
  const warnings = buildProviderDocumentationWarnings(input);
  return {
    completedSections,
    missingSections,
    recommendedSections,
    sectionStatuses,
    warnings,
    readinessState: buildProviderDocumentationReadiness({ ...input, warnings, missingSections }),
  };
}

export function buildProviderDocumentationReadiness(
  input: ProviderDocumentationCompletenessInput & {
    warnings?: ProviderDocumentationWarning[];
    missingSections?: ProviderDocumentationCompletenessSectionId[];
  }
): ProviderDocumentationReadinessState {
  if (input.signedOrFinalized) return "signed_or_finalized";
  if (input.savedMetadata) return "saved";
  const warnings = input.warnings ?? buildProviderDocumentationWarnings(input);
  const hasCritical = warnings.some((warning) => warning.severity === "critical");
  if (hasCritical) return "incomplete";
  const missing = input.missingSections ?? buildProviderDocumentationCompleteness(input).missingSections;
  if (missing.length || warnings.length) return "needs_review";
  return "ready_to_save";
}

export function applyProviderDocumentationTemplate(input: {
  state: ProviderDocumentationWorkspaceState;
  templateId: ProviderDocumentationTemplateId;
  resolveFragment: (key: string) => string;
}): ProviderDocumentationWorkspaceState {
  const template = providerDocumentationTemplateById(input.templateId);
  const next: ProviderDocumentationWorkspaceState = {
    ...input.state,
    activeTemplateId: input.templateId,
    physicalExam: { ...input.state.physicalExam },
  };

  for (const [field, fragmentKeys] of Object.entries(template.fields) as Array<
    [ProviderDocumentationTemplateStringField, string[] | undefined]
  >) {
    if (!fragmentKeys) continue;
    let current = next[field];
    for (const key of fragmentKeys) {
      current = appendDocumentationFragment(current, input.resolveFragment(key));
    }
    next[field] = current;
  }

  for (const [sectionId, fragmentKeys] of Object.entries(template.physicalExam) as Array<
    [ProviderDocumentationExamSectionId, string[] | undefined]
  >) {
    if (!fragmentKeys) continue;
    let current = next.physicalExam[sectionId];
    for (const key of fragmentKeys) {
      current = appendDocumentationFragment(current, input.resolveFragment(key));
    }
    next.physicalExam[sectionId] = current;
  }

  return next;
}

export function applyCompleteNormalRosPrefill(input: {
  state: ProviderDocumentationWorkspaceState;
  text?: string;
}): ProviderDocumentationWorkspaceState {
  return {
    ...input.state,
    rosFocusedImpression: appendDocumentationBlock(
      input.state.rosFocusedImpression,
      input.text ?? PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT
    ),
  };
}

export function hydrateProviderDocumentationWorkspaceState(input: {
  encounter?: {
    visitReason?: string | null;
    chiefComplaint?: string | null;
    clinicianImpression?: string | null;
    providerNote?: string | null;
    treatmentPlan?: string | null;
    nursingAssessment?: unknown;
  } | null;
}): ProviderDocumentationWorkspaceState {
  const state = emptyProviderDocumentationWorkspaceState();
  const encounter = input.encounter;
  const nursing = asObject(encounter?.nursingAssessment);
  const stored = asObject(nursing?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const legacyPhysicianEval = asObject(nursing?.physicianEvalV1);
  const storedMetadata = asObject(stored?.workspaceMetadata);

  state.activeTemplateId = templateIdFromUnknown(storedMetadata?.activeTemplateId);
  state.reasonForVisit = str(encounter?.visitReason);
  state.chiefComplaint =
    str(stored?.chiefConcern) || str(encounter?.chiefComplaint) || str(encounter?.visitReason);
  state.hpi = str(stored?.hpiNarrative) || str(legacyPhysicianEval?.hpi);
  state.rosFocusedImpression = str(stored?.focusedImpression);
  state.rosImportantPositives = str(stored?.importantPositives);
  state.rosImportantNegatives = str(stored?.importantNegatives);
  state.rosRedFlags = str(stored?.redFlagsText);
  state.mdmWorkingAssessment = str(stored?.mdmWorkingAssessment);
  state.mdmDifferentialSynthesis =
    str(stored?.differentialAssessmentText) || str(legacyPhysicianEval?.mdm);
  state.mdmDataReviewed = str(stored?.mdmDataReviewed);
  state.mdmRiskLevel = riskLevelFromUnknown(stored?.mdmRiskLevel);
  state.mdmClinicalRationale = str(stored?.mdmClinicalRationale);
  state.mdmPlanSummary = str(stored?.mdmPlanSummary);
  state.mdmImmediateActionsRationale = str(stored?.mdmImmediateActionsRationale);
  state.mdmConsultsDiscussed = str(stored?.mdmConsultsDiscussed);
  state.mdmAdmitObserveDischarge = str(stored?.mdmAdmitObserveDischarge);
  state.clinicalImpression =
    str(stored?.clinicalImpression) ||
    str(encounter?.clinicianImpression) ||
    str(encounter?.providerNote);
  state.treatmentPlan = str(stored?.treatmentPlan) || str(encounter?.treatmentPlan);
  state.followUpDisposition = str(stored?.followUpDisposition);
  state.providerAddendum = str(stored?.mdmProviderAddendum) || str(stored?.providerAddendum);

  const legacyExam = str(legacyPhysicianEval?.physicalExam);
  for (const sectionId of PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS) {
    const legacyKey = PROVIDER_DOCUMENTATION_EXAM_FIELD_TO_LEGACY_KEY[sectionId];
    state.physicalExam[sectionId] = str(stored?.[legacyKey]);
  }
  if (legacyExam && PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.every((id) => !state.physicalExam[id])) {
    state.physicalExam.general = legacyExam;
  }

  return state;
}

function riskLevelFromUnknown(value: unknown): ProviderDocumentationRiskLevel {
  if (value === "Low" || value === "Moderate" || value === "High") return value;
  return "";
}

function templateIdFromUnknown(value: unknown): ProviderDocumentationTemplateId | null {
  return typeof value === "string" && PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === value)
    ? (value as ProviderDocumentationTemplateId)
    : null;
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function joinNonEmpty(values: string[], separator = "\n\n"): string {
  return values.map((v) => v.trim()).filter(Boolean).join(separator);
}

export function providerDocumentationStateHasContent(
  state: ProviderDocumentationWorkspaceState
): boolean {
  return Boolean(
    state.reasonForVisit.trim() ||
      state.chiefComplaint.trim() ||
      state.hpi.trim() ||
      state.rosFocusedImpression.trim() ||
      state.rosImportantPositives.trim() ||
      state.rosImportantNegatives.trim() ||
      state.rosRedFlags.trim() ||
      PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.some((id) => state.physicalExam[id].trim()) ||
      state.mdmWorkingAssessment.trim() ||
      state.mdmDifferentialSynthesis.trim() ||
      state.mdmDataReviewed.trim() ||
      state.mdmRiskLevel ||
      state.mdmClinicalRationale.trim() ||
      state.mdmPlanSummary.trim() ||
      state.mdmImmediateActionsRationale.trim() ||
      state.mdmConsultsDiscussed.trim() ||
      state.mdmAdmitObserveDischarge.trim() ||
      state.clinicalImpression.trim() ||
      state.treatmentPlan.trim() ||
      state.followUpDisposition.trim() ||
      state.providerAddendum.trim()
  );
}

export function buildProviderDocumentationMetadata(input: {
  encounterMode: ProviderDocumentationEncounterMode;
  savedAt: string;
  savedBy: string;
  activeTemplateId?: ProviderDocumentationTemplateId | null;
}): ProviderDocumentationMetadata {
  return {
    encounterMode: input.encounterMode,
    documentType: documentTypeForEncounterMode(input.encounterMode),
    savedAt: input.savedAt,
    savedBy: input.savedBy,
    source: PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE,
    activeTemplateId: input.activeTemplateId ?? null,
  };
}

export function buildProviderDocumentationSavePayload(input: {
  previousNursingAssessment: unknown;
  state: ProviderDocumentationWorkspaceState;
  metadata: ProviderDocumentationMetadata;
}): ProviderDocumentationSavePayload {
  const previous = asObject(input.previousNursingAssessment) ?? {};
  const nursingAssessment: Record<string, unknown> = { ...previous };
  const s = input.state;
  const stored: Record<string, unknown> = {
    chiefConcern: s.chiefComplaint.trim(),
    hpiNarrative: s.hpi.trim(),
    onsetTimingContext: "",
    associatedSymptoms: "",
    severityKeyConcern: "",
    focusedImpression: s.rosFocusedImpression.trim(),
    importantPositives: s.rosImportantPositives.trim(),
    importantNegatives: s.rosImportantNegatives.trim(),
    redFlagsText: s.rosRedFlags.trim(),
    differentialAssessmentText: s.mdmDifferentialSynthesis.trim(),
    examGeneralAppearance: s.physicalExam.general.trim(),
    examNeuroMental: s.physicalExam.neuroPsych.trim(),
    examHeent: s.physicalExam.heent.trim(),
    examCardiac: s.physicalExam.cardiovascular.trim(),
    examRespiratory: s.physicalExam.respiratory.trim(),
    examAbdomen: s.physicalExam.abdomen.trim(),
    examMusculoskeletal: s.physicalExam.musculoskeletal.trim(),
    examSkin: s.physicalExam.skin.trim(),
    examPsychBehavior: "",
    examReassessmentExtra: s.physicalExam.reassessment.trim(),
    mdmWorkingAssessment: s.mdmWorkingAssessment.trim(),
    mdmPlanSummary: s.mdmPlanSummary.trim(),
    mdmImmediateActionsRationale: s.mdmImmediateActionsRationale.trim(),
    mdmConsultsDiscussed: s.mdmConsultsDiscussed.trim(),
    mdmAdmitObserveDischarge: s.mdmAdmitObserveDischarge.trim(),
    mdmProviderAddendum: s.providerAddendum.trim(),
    mdmDataReviewed: s.mdmDataReviewed.trim(),
    mdmRiskLevel: s.mdmRiskLevel,
    mdmClinicalRationale: s.mdmClinicalRationale.trim(),
    clinicalImpression: s.clinicalImpression.trim(),
    treatmentPlan: s.treatmentPlan.trim(),
    followUpDisposition: s.followUpDisposition.trim(),
    signature: {
      savedAt: input.metadata.savedAt,
      savedByDisplayName: input.metadata.savedBy,
    },
    workspaceMetadata: input.metadata,
  };
  const workspaceMetadata = {
    ...input.metadata,
    activeTemplateId: s.activeTemplateId ?? input.metadata.activeTemplateId ?? null,
  };
  stored.workspaceMetadata = workspaceMetadata;

  if (providerDocumentationStateHasContent(s)) {
    nursingAssessment[PROVIDER_DOCUMENTATION_NAMESPACE_KEY] = stored;
  } else {
    delete nursingAssessment[PROVIDER_DOCUMENTATION_NAMESPACE_KEY];
  }

  const physicianEvalV1: Record<string, string> = {};
  if (s.hpi.trim()) physicianEvalV1.hpi = s.hpi.trim();
  const ros = joinNonEmpty([
    s.rosFocusedImpression,
    s.rosImportantPositives,
    s.rosImportantNegatives,
    s.rosRedFlags,
  ]);
  if (ros) physicianEvalV1.ros = ros;
  const physicalExam = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((id) => s.physicalExam[id])
    .map((v) => v.trim())
    .filter(Boolean)
    .join("\n");
  if (physicalExam) physicianEvalV1.physicalExam = physicalExam;
  const mdm = joinNonEmpty([
    s.mdmWorkingAssessment,
    s.mdmDifferentialSynthesis,
    s.mdmDataReviewed,
    s.mdmRiskLevel,
    s.mdmClinicalRationale,
    s.mdmPlanSummary,
    s.mdmImmediateActionsRationale,
    s.mdmConsultsDiscussed,
    s.mdmAdmitObserveDischarge,
  ]);
  if (mdm) physicianEvalV1.mdm = mdm;
  if (Object.keys(physicianEvalV1).length > 0) nursingAssessment.physicianEvalV1 = physicianEvalV1;
  else delete nursingAssessment.physicianEvalV1;

  return {
    nursingAssessment,
    visitReason: trimmedOrNull(s.reasonForVisit || s.chiefComplaint),
    clinicianImpression: trimmedOrNull(s.clinicalImpression),
    treatmentPlan: trimmedOrNull(s.treatmentPlan),
  };
}

export type ProviderDocumentationPreviewSection = {
  id: "hpi" | "ros" | "physicalExam" | "mdm" | "impression" | "plan";
  titleKey: string;
  lines: string[];
};

export type ProviderDocumentationDisplayLocale = "en" | "fr";

export type ProviderDocumentationDisplaySection = {
  id: ProviderDocumentationPreviewSection["id"];
  label: string;
  text: string;
};

export type ProviderDocumentationDisplayModel = {
  encounterMode: ProviderDocumentationEncounterMode;
  documentType: ProviderDocumentationDocumentType;
  title: string;
  savedAt: string | null;
  savedBy: string | null;
  sections: ProviderDocumentationDisplaySection[];
};

const PROVIDER_DOCUMENTATION_DISPLAY_LABELS: Record<
  ProviderDocumentationDisplayLocale,
  {
    titleEd: string;
    titleObservation: string;
    hpi: string;
    ros: string;
    physicalExam: string;
    mdm: string;
    impression: string;
    plan: string;
  }
> = {
  en: {
    titleEd: "ED provider documentation",
    titleObservation: "Observation provider progress note",
    hpi: "HPI",
    ros: "ROS",
    physicalExam: "Physical Exam",
    mdm: "MDM",
    impression: "Impression",
    plan: "Plan",
  },
  fr: {
    titleEd: "Documentation médecin urgences",
    titleObservation: "Note d'évolution médecin observation",
    hpi: "HPI",
    ros: "Revue ciblée",
    physicalExam: "Examen physique",
    mdm: "Décision médicale",
    impression: "Impression",
    plan: "Plan",
  },
};

export function buildProviderDocumentationPreviewSections(
  state: ProviderDocumentationWorkspaceState
): ProviderDocumentationPreviewSection[] {
  const sections: ProviderDocumentationPreviewSection[] = [];
  const hpi = [state.chiefComplaint, state.hpi].map((v) => v.trim()).filter(Boolean);
  if (hpi.length) sections.push({ id: "hpi", titleKey: "providerDocumentationWorkspace.previewHpi", lines: hpi });

  const ros = [
    state.rosFocusedImpression,
    state.rosImportantPositives,
    state.rosImportantNegatives,
    state.rosRedFlags,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (ros.length) sections.push({ id: "ros", titleKey: "providerDocumentationWorkspace.previewRos", lines: ros });

  const exam = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((id) => state.physicalExam[id].trim()).filter(Boolean);
  if (exam.length) {
    sections.push({ id: "physicalExam", titleKey: "providerDocumentationWorkspace.previewExam", lines: exam });
  }

  const mdm = [
    state.mdmWorkingAssessment,
    state.mdmDifferentialSynthesis,
    state.mdmDataReviewed,
    state.mdmRiskLevel,
    state.mdmClinicalRationale,
    state.mdmPlanSummary,
    state.mdmImmediateActionsRationale,
    state.mdmConsultsDiscussed,
    state.mdmAdmitObserveDischarge,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (mdm.length) sections.push({ id: "mdm", titleKey: "providerDocumentationWorkspace.previewMdm", lines: mdm });

  if (state.clinicalImpression.trim()) {
    sections.push({
      id: "impression",
      titleKey: "providerDocumentationWorkspace.previewImpression",
      lines: [state.clinicalImpression.trim()],
    });
  }

  const plan = [state.treatmentPlan, state.followUpDisposition, state.providerAddendum]
    .map((v) => v.trim())
    .filter(Boolean);
  if (plan.length) sections.push({ id: "plan", titleKey: "providerDocumentationWorkspace.previewPlan", lines: plan });

  return sections;
}

function providerDocumentationDisplayTitle(
  encounterMode: ProviderDocumentationEncounterMode,
  locale: ProviderDocumentationDisplayLocale
): string {
  const labels = PROVIDER_DOCUMENTATION_DISPLAY_LABELS[locale];
  return encounterMode === "OBSERVATION" ? labels.titleObservation : labels.titleEd;
}

export function readProviderDocumentationWorkspaceMetadata(
  nursingAssessment: unknown
): ProviderDocumentationMetadata | null {
  const root = asObject(nursingAssessment);
  const stored = asObject(root?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const meta = asObject(stored?.workspaceMetadata);
  if (meta?.source !== PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE) return null;
  const encounterMode = meta.encounterMode === "OBSERVATION" ? "OBSERVATION" : meta.encounterMode === "ED" ? "ED" : null;
  const documentType =
    meta.documentType === "OBSERVATION_PROVIDER_PROGRESS_NOTE" || meta.documentType === "INITIAL_PROVIDER_NOTE"
      ? meta.documentType
      : null;
  const savedAt = typeof meta.savedAt === "string" ? meta.savedAt : null;
  const savedBy = typeof meta.savedBy === "string" ? meta.savedBy : null;
  if (!encounterMode || !documentType || !savedAt || !savedBy) return null;
  return {
    encounterMode,
    documentType,
    savedAt,
    savedBy,
    source: PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE,
    activeTemplateId: templateIdFromUnknown(meta.activeTemplateId),
  };
}

export function hasProviderDocumentationWorkspaceNote(nursingAssessment: unknown): boolean {
  return readProviderDocumentationWorkspaceMetadata(nursingAssessment) !== null;
}

export function buildProviderDocumentationDisplayModel(input: {
  nursingAssessment: unknown;
  locale: ProviderDocumentationDisplayLocale;
  fallbackEncounterMode?: ProviderDocumentationEncounterMode;
}): ProviderDocumentationDisplayModel | null {
  const metadata = readProviderDocumentationWorkspaceMetadata(input.nursingAssessment);
  if (!metadata) return null;
  const state = hydrateProviderDocumentationWorkspaceState({
    encounter: { nursingAssessment: input.nursingAssessment },
  });
  const preview = buildProviderDocumentationPreviewSections(state);
  const labels = PROVIDER_DOCUMENTATION_DISPLAY_LABELS[input.locale];
  const labelById: Record<ProviderDocumentationPreviewSection["id"], string> = {
    hpi: labels.hpi,
    ros: labels.ros,
    physicalExam: labels.physicalExam,
    mdm: labels.mdm,
    impression: labels.impression,
    plan: labels.plan,
  };
  const sections = preview
    .map((section): ProviderDocumentationDisplaySection => ({
      id: section.id,
      label: labelById[section.id],
      text: section.lines.map((line) => line.trim()).filter(Boolean).join("\n"),
    }))
    .filter((section) => section.text.trim().length > 0);
  if (sections.length === 0) return null;
  return {
    encounterMode: metadata.encounterMode ?? input.fallbackEncounterMode ?? "ED",
    documentType: metadata.documentType,
    title: providerDocumentationDisplayTitle(metadata.encounterMode, input.locale),
    savedAt: metadata.savedAt,
    savedBy: metadata.savedBy,
    sections,
  };
}

