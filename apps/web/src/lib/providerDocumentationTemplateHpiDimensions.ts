import type {
  ProviderDocumentationTemplateId,
  ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";

export type ProviderDocumentationHpiDimensionChip = {
  labelKey: string;
  fragmentKey: string;
};

export type ProviderDocumentationHpiDimensionGroup = {
  titleKey: string;
  field: keyof ProviderDocumentationWorkspaceState;
  chips: ProviderDocumentationHpiDimensionChip[];
};

export const HPI_DIMENSION_TITLE_KEYS = {
  location: "providerDocumentationWorkspace.chipLocation",
  context: "providerDocumentationWorkspace.chipContext",
  dyspneaContext: "providerDocumentationWorkspace.chipDyspneaContext",
  timing: "providerDocumentationWorkspace.chipTiming",
  quality: "providerDocumentationWorkspace.chipQuality",
  associated: "providerDocumentationWorkspace.chipAssociated",
  intervalCourse: "providerDocumentationWorkspace.chipIntervalCourse",
} as const;

const HPI_DIM_NS = "providerDocumentationTemplateHpiDimensions";
const LOC_NS = "providerDocumentationTemplateLocation";

const dimChip = (namespace: string, template: string, key: string): ProviderDocumentationHpiDimensionChip => {
  const fragmentKey = `${namespace}.${template}.${key}`;
  return { labelKey: fragmentKey, fragmentKey };
};

const hpiChip = (template: string, key: string) => dimChip(HPI_DIM_NS, template, key);
const locChip = (template: string, key: string) => dimChip(LOC_NS, template, key);

const dimGroup = (
  titleKey: string,
  template: string,
  keys: string[],
  namespace: string = HPI_DIM_NS
): ProviderDocumentationHpiDimensionGroup => ({
  titleKey,
  field: "hpi",
  chips: keys.map((key) => dimChip(namespace, template, key)),
});

const hpiGroup = (titleKey: string, template: string, keys: string[]) =>
  dimGroup(titleKey, template, keys, HPI_DIM_NS);

const locGroup = (titleKey: string, template: string, keys: string[]) =>
  dimGroup(titleKey, template, keys, LOC_NS);

const CHEST_PAIN_LOCATION_KEYS = [
  "midChest",
  "substernalChest",
  "leftUpperChest",
  "rightUpperChest",
  "leftSidedChestPain",
  "rightSidedChestPain",
  "epigastric",
  "chestWall",
  "retrosternal",
  "radiatingToLeftArm",
  "radiatingToJaw",
  "radiatingToBack",
];

const SOB_CONTEXT_KEYS = [
  "atRest",
  "withExertion",
  "lyingFlat",
  "nighttimeSymptoms",
  "associatedChestTightness",
  "associatedWheezing",
];

const ABDOMINAL_LOCATION_KEYS = [
  "epigastric",
  "periumbilical",
  "rightUpperQuadrant",
  "leftUpperQuadrant",
  "rightLowerQuadrant",
  "leftLowerQuadrant",
  "suprapubic",
  "flank",
  "diffuse",
  "generalized",
  "pelvic",
  "radiatingToBack",
];

export const TEMPLATE_HPI_DIMENSION_GROUPS: Partial<
  Record<ProviderDocumentationTemplateId, ProviderDocumentationHpiDimensionGroup[]>
> = {
  chest_pain: [
    locGroup(HPI_DIMENSION_TITLE_KEYS.location, "chestPain", CHEST_PAIN_LOCATION_KEYS),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "chestPain", [
      "timSuddenOnset",
      "timGradualOnset",
      "timExertional",
      "timAtRest",
      "timIntermittent",
      "timConstant",
      "timRecurrentEpisodes",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "chestPain", [
      "qualPressureLike",
      "qualSharp",
      "qualBurning",
      "qualPleuritic",
      "qualTightness",
      "qualReproducible",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "chestPain", [
      "assocShortnessOfBreath",
      "assocDiaphoresis",
      "assocNausea",
      "assocDizziness",
      "assocPalpitations",
      "assocSyncope",
    ]),
  ],
  sob: [
    locGroup(HPI_DIMENSION_TITLE_KEYS.dyspneaContext, "sob", SOB_CONTEXT_KEYS),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "sob", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timProgressive",
      "timRecurrent",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "sob", [
      "qualAirHunger",
      "qualChestTightness",
      "qualWheezingSensation",
      "qualUnableToTakeDeepBreath",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "sob", [
      "assocCough",
      "assocFever",
      "assocChestPain",
      "assocLegSwelling",
      "assocDizziness",
      "assocWheezing",
    ]),
  ],
  abdominal_pain: [
    locGroup(HPI_DIMENSION_TITLE_KEYS.location, "abdominal", ABDOMINAL_LOCATION_KEYS),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "abdominalPain", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timAfterEating",
      "timWorsening",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "abdominalPain", [
      "qualCramping",
      "qualSharp",
      "qualBurning",
      "qualPressure",
      "qualColicky",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "abdominalPain", [
      "assocNausea",
      "assocVomiting",
      "assocDiarrhea",
      "assocConstipation",
      "assocFever",
      "assocUrinarySymptoms",
      "assocBloodInStoolOrVomit",
    ]),
  ],
  adult_nausea_vomiting: [
    locGroup(HPI_DIMENSION_TITLE_KEYS.location, "abdominal", ABDOMINAL_LOCATION_KEYS),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "adultNauseaVomiting", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timAfterEating",
      "timWorsening",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "adultNauseaVomiting", [
      "qualCramping",
      "qualSharp",
      "qualBurning",
      "qualPressure",
      "qualColicky",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "adultNauseaVomiting", [
      "assocNausea",
      "assocVomiting",
      "assocDiarrhea",
      "assocConstipation",
      "assocFever",
      "assocUrinarySymptoms",
      "assocBloodInStoolOrVomit",
    ]),
  ],
  adult_diarrhea: [
    locGroup(HPI_DIMENSION_TITLE_KEYS.location, "abdominal", ABDOMINAL_LOCATION_KEYS),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "adultDiarrhea", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timAfterEating",
      "timWorsening",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "adultDiarrhea", [
      "qualCramping",
      "qualSharp",
      "qualBurning",
      "qualPressure",
      "qualColicky",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "adultDiarrhea", [
      "assocNausea",
      "assocVomiting",
      "assocDiarrhea",
      "assocConstipation",
      "assocFever",
      "assocUrinarySymptoms",
      "assocBloodInStoolOrVomit",
    ]),
  ],
  headache: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.location, "headache", [
      "locFrontal",
      "locTemporal",
      "locOccipital",
      "locUnilateral",
      "locBilateral",
      "locBehindEye",
      "locDiffuse",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "headache", [
      "timThunderclap",
      "timSuddenOnset",
      "timGradualOnset",
      "timPersistent",
      "timRecurrent",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "headache", [
      "qualThrobbing",
      "qualPressure",
      "qualSharp",
      "qualWorstHeadache",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "headache", [
      "assocPhotophobia",
      "assocPhonophobia",
      "assocNauseaVomiting",
      "assocNeckStiffness",
      "assocVisionChanges",
      "assocFocalNeurologicSymptoms",
    ]),
  ],
  dizziness_syncope: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.context, "dizzinessSyncope", [
      "ctxRoomSpinning",
      "ctxLightheaded",
      "ctxNearSyncope",
      "ctxCompleteSyncope",
      "ctxPositional",
      "ctxExertional",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "dizzinessSyncope", [
      "timSuddenOnset",
      "timIntermittentEpisodes",
      "timPersistent",
      "timRecurrent",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "dizzinessSyncope", [
      "qualVertigo",
      "qualPresyncope",
      "qualImbalance",
      "qualWeaknessSensation",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "dizzinessSyncope", [
      "assocPalpitations",
      "assocChestPain",
      "assocShortnessOfBreath",
      "assocNausea",
      "assocHeadache",
      "assocFallOrInjury",
    ]),
  ],
  stroke_symptoms: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.context, "strokeSymptoms", [
      "ctxFacial",
      "ctxArm",
      "ctxLeg",
      "ctxUnilateral",
      "ctxSpeech",
      "ctxVision",
      "ctxGaitBalance",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "strokeSymptoms", [
      "timLastKnownWell",
      "timSuddenOnset",
      "timWakeUpSymptoms",
      "timImproving",
      "timPersistent",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "strokeSymptoms", [
      "qualWeakness",
      "qualNumbness",
      "qualSpeechDifficulty",
      "qualVisionLoss",
      "qualConfusion",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "strokeSymptoms", [
      "assocHeadache",
      "assocDizziness",
      "assocSeizureActivity",
      "assocAnticoagulationReviewed",
      "assocPriorStrokeHistory",
    ]),
  ],
  psychiatric_behavioral: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.context, "psychiatricBehavioral", [
      "ctxSuicidalThoughts",
      "ctxHomicidalThoughts",
      "ctxHallucinations",
      "ctxParanoia",
      "ctxAgitation",
      "ctxAnxiety",
      "ctxDepression",
      "ctxSubstanceUse",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "psychiatricBehavioral", [
      "timAcuteWorsening",
      "timChronicSymptoms",
      "timRecentStressor",
      "timMedicationLapse",
      "timRecurrentEpisode",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "psychiatricBehavioral", [
      "qualIntrusiveThoughts",
      "qualPanicSymptoms",
      "qualDepressedMood",
      "qualRacingThoughts",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "psychiatricBehavioral", [
      "assocInsomnia",
      "assocSubstanceUse",
      "assocSafetyConcerns",
      "assocAccessToWeaponsReviewed",
      "assocCollateralInformationReviewed",
    ]),
  ],
  urinary_symptoms: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.location, "urinarySymptoms", [
      "locSuprapubic",
      "locUrethral",
      "locFlank",
      "locPelvic",
      "locLowerAbdomen",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "urinarySymptoms", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timRecurrent",
      "timWorsening",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "urinarySymptoms", [
      "qualBurning",
      "qualPressure",
      "qualUrgency",
      "qualFrequency",
      "qualHesitancy",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "urinarySymptoms", [
      "assocDysuria",
      "assocHematuria",
      "assocFever",
      "assocFlankPain",
      "assocNausea",
      "assocVaginalDischarge",
    ]),
  ],
  flank_pain: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.location, "flankPain", [
      "locRightFlank",
      "locLeftFlank",
      "locBilateralFlank",
      "locCvaArea",
      "locRadiatingToGroin",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "flankPain", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timColicky",
      "timWorsening",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "flankPain", [
      "qualColicky",
      "qualSharp",
      "qualAching",
      "qualSevere",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "flankPain", [
      "assocNausea",
      "assocVomiting",
      "assocDysuria",
      "assocHematuria",
      "assocFever",
      "assocUrinaryFrequency",
    ]),
  ],
  male_genital_complaint: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.location, "maleGenitalComplaint", [
      "locTesticle",
      "locRightTesticle",
      "locLeftTesticle",
      "locScrotum",
      "locGroin",
      "locPenis",
      "locSuprapubic",
      "locLowerAbdomen",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "maleGenitalComplaint", [
      "timSuddenOnset",
      "timGradualOnset",
      "timBeganToday",
      "timIntermittent",
      "timConstant",
      "timWorsening",
      "timRecurrentSymptoms",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "maleGenitalComplaint", [
      "qualSharpPain",
      "qualAchingPain",
      "qualThrobbingPain",
      "qualPressureDiscomfort",
      "qualBurningWithUrination",
      "qualSwellingSensation",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "maleGenitalComplaint", [
      "assocNauseaVomiting",
      "assocDysuria",
      "assocUrinaryFrequency",
      "assocPenileDischarge",
      "assocScrotalSwelling",
      "assocFever",
      "assocAbdominalPain",
      "assocStiExposureReviewedIfClinicallyAppropriate",
    ]),
  ],
  female_pelvic_gyn_complaint: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.location, "femalePelvicGynComplaint", [
      "locPelvic",
      "locSuprapubic",
      "locRightLowerPelvic",
      "locLeftLowerPelvic",
      "locVaginal",
      "locAdnexalArea",
      "locLowerAbdomen",
      "locBackFlankIfRelevant",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "femalePelvicGynComplaint", [
      "timSuddenOnset",
      "timGradualOnset",
      "timIntermittent",
      "timConstant",
      "timWorsening",
      "timLmpReviewed",
      "timPregnancyTimingReviewedIfApplicable",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "femalePelvicGynComplaint", [
      "qualCramping",
      "qualSharpPain",
      "qualPressure",
      "qualBurning",
      "qualHeavyBleeding",
      "qualSpotting",
      "qualDischarge",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "femalePelvicGynComplaint", [
      "assocVaginalBleeding",
      "assocVaginalDischarge",
      "assocDysuria",
      "assocFever",
      "assocNauseaVomiting",
      "assocDizzinessSyncope",
      "assocPregnancyConcern",
      "assocStiExposureReviewedIfClinicallyAppropriate",
    ]),
  ],
  medication_refill: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.context, "medicationRefill", [
      "ctxMedicationNameReviewed",
      "ctxDoseReviewed",
      "ctxLastDoseReviewed",
      "ctxRefillLapse",
      "ctxPharmacyAccessIssue",
      "ctxPcpAccessIssue",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.timing, "medicationRefill", [
      "timRanOutToday",
      "timMissedSeveralDoses",
      "timChronicMedication",
      "timRecentMedicationChange",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "medicationRefill", [
      "qualBridgeRefillRequest",
      "qualChronicDiseaseManagement",
      "qualWithdrawalSymptomsReviewed",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "medicationRefill", [
      "assocAdverseEffectReviewed",
      "assocControlledSubstanceStatusReviewed",
      "assocPdmpReviewedIfApplicable",
      "assocFollowUpPlanReviewed",
    ]),
  ],
  observation_reassessment: [
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.context, "observationReassessment", [
      "ctxObservationReasonReviewed",
      "ctxIntervalSymptomsReviewed",
      "ctxPendingResultsReviewed",
      "ctxConsultantRecommendationsReviewed",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.intervalCourse, "observationReassessment", [
      "timIntervalReassessment",
      "timAfterTreatment",
      "timAfterObservationPeriod",
      "timBeforeDischarge",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.quality, "observationReassessment", [
      "qualImproved",
      "qualUnchanged",
      "qualWorsened",
      "qualPersistentSymptoms",
    ]),
    hpiGroup(HPI_DIMENSION_TITLE_KEYS.associated, "observationReassessment", [
      "assocRepeatVitalsReviewed",
      "assocRepeatExamDocumented",
      "assocPoChallenge",
      "assocAmbulationTrial",
      "assocFamilyCaregiverUpdate",
    ]),
  ],
};

export const CUSTOM_HPI_DIMENSION_TEMPLATE_IDS = Object.keys(
  TEMPLATE_HPI_DIMENSION_GROUPS
) as ProviderDocumentationTemplateId[];

export function getTemplateHpiDimensionGroups(
  templateId: ProviderDocumentationTemplateId | null
): ProviderDocumentationHpiDimensionGroup[] | null {
  if (!templateId) return null;
  return TEMPLATE_HPI_DIMENSION_GROUPS[templateId] ?? null;
}

export function templateUsesCustomHpiDimensions(
  templateId: ProviderDocumentationTemplateId | null
): boolean {
  return Boolean(templateId && TEMPLATE_HPI_DIMENSION_GROUPS[templateId]);
}

export function resolveHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const custom = getTemplateHpiDimensionGroups(templateId);
  if (custom) return custom as T[];
  return baseGroups;
}

/** @deprecated Use templateUsesCustomHpiDimensions */
export function templateUsesComplaintSpecificLocationChips(
  templateId: ProviderDocumentationTemplateId | null
): boolean {
  return templateUsesCustomHpiDimensions(templateId);
}

export const HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY = HPI_DIMENSION_TITLE_KEYS.location;

export { hpiChip, locChip };
