/**
 * Phase 19O — Dynamic clinical documentation suggestions (v1).
 *
 * Infers suggestions ONLY from provider-entered/selected text in workspace fields.
 * Click-to-insert only; never mutates state; never auto-documents diagnoses or billing.
 */
import type {
  ProviderDocumentationTemplateId,
  ProviderDocumentationTemplateStringField,
  ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";

export type DynamicSuggestionCategory = "differential" | "mdm" | "reassessment" | "disposition";

export type ProviderDocumentationFieldKey = ProviderDocumentationTemplateStringField;

export type DynamicSuggestion = {
  category: DynamicSuggestionCategory;
  labelKey: string;
  fragmentKey: string;
  reasonKey: string;
  targetField: ProviderDocumentationFieldKey;
};

type DynamicSuggestionSeed = Omit<DynamicSuggestion, "reasonKey" | "labelKey"> & {
  fragmentKey: string;
};

type DynamicIntelligenceRule = {
  triggerTerms: string[];
  reasonKey: string;
  suggestions: DynamicSuggestionSeed[];
};

const reason = (key: string) => `providerDocumentationDynamicIntel.reasons.${key}`;
const cp = (key: string) => `providerDocumentationComplaintIntel.chestPain.${key}`;
const sob = (key: string) => `providerDocumentationComplaintIntel.sob.${key}`;
const abd = (key: string) => `providerDocumentationComplaintIntel.abdominal.${key}`;
const stroke = (key: string) => `providerDocumentationComplaintIntel.stroke.${key}`;
const headache = (key: string) => `providerDocumentationComplaintIntel.headache.${key}`;
const dizz = (key: string) => `providerDocumentationComplaintIntel.dizzinessSyncope.${key}`;
const pedFeb = (key: string) => `providerDocumentationComplaintIntel.pediatricFever.${key}`;
const pedAsthma = (key: string) => `providerDocumentationComplaintIntel.pediatricAsthmaWheezing.${key}`;
const maleGen = (key: string) => `providerDocumentationComplaintIntel.maleGenitalComplaint.${key}`;
const femaleGyn = (key: string) => `providerDocumentationComplaintIntel.femalePelvicGynComplaint.${key}`;

const sug = (
  category: DynamicSuggestionCategory,
  fragmentKey: string,
  targetField: ProviderDocumentationFieldKey
): DynamicSuggestionSeed => ({
  category,
  fragmentKey,
  targetField,
});

export function buildDocumentationCorpus(state: ProviderDocumentationWorkspaceState): string {
  return [
    state.hpi,
    state.rosImportantPositives,
    state.rosImportantNegatives,
    state.rosRedFlags,
    ...Object.values(state.physicalExam),
    state.mdmWorkingAssessment,
    state.mdmDifferentialSynthesis,
    state.mdmDataReviewed,
    state.mdmClinicalRationale,
    state.mdmPlanSummary,
    state.mdmImmediateActionsRationale,
    state.mdmConsultsDiscussed,
    state.mdmAdmitObserveDischarge,
    state.clinicalImpression,
    state.treatmentPlan,
    state.followUpDisposition,
  ]
    .join(" ")
    .toLowerCase();
}

function corpusMatches(corpus: string, terms: string[]): boolean {
  return terms.some((term) => corpus.includes(term.toLowerCase()));
}

const CHEST_PAIN_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["exertional", "à l'effort", "with exertion"],
    reasonKey: reason("chestPainExertional"),
    suggestions: [
      sug("differential", cp("diffAcs"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("mdmAcsConsidered"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmHeartScoreConsidered"), "mdmClinicalRationale"),
      sug("mdm", cp("mdmTroponinReviewed"), "mdmDataReviewed"),
      sug("mdm", cp("mdmRepeatTroponinPlanned"), "mdmDataReviewed"),
      sug("mdm", cp("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("mdm", cp("mdmObservationConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    triggerTerms: ["diaphoresis", "diaphorèse", "with diaphoresis"],
    reasonKey: reason("chestPainDiaphoresis"),
    suggestions: [
      sug("differential", cp("diffAcs"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("mdmAcsConsidered"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmTroponinReviewed"), "mdmDataReviewed"),
      sug("mdm", cp("mdmRepeatTroponinPlanned"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["shortness of breath", "dyspn", "essoufflement", "associated shortness of breath"],
    reasonKey: reason("chestPainSob"),
    suggestions: [
      sug("differential", cp("diffPe"), "mdmDifferentialSynthesis"),
      sug("differential", cp("diffAcs"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("mdmPeRiskEvaluated"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmCxrReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["radiating", "irradiation", "left arm", "jaw", "brach"],
    reasonKey: reason("chestPainRadiation"),
    suggestions: [
      sug("differential", cp("diffAcs"), "mdmDifferentialSynthesis"),
      sug("differential", cp("diffAorticDissection"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("mdmAcsConsidered"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmEcgReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["cardiac history", "prior mi", "antécédent cardiaque", "infarctus"],
    reasonKey: reason("chestPainCardiacHistory"),
    suggestions: [
      sug("differential", cp("diffStemiNstemi"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("mdmAcsConsidered"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmTroponinReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["ecg reviewed", "ecg obtained", "écg", "electrocardiogram"],
    reasonKey: reason("chestPainEcgReviewed"),
    suggestions: [
      sug("mdm", cp("mdmTroponinReviewed"), "mdmDataReviewed"),
      sug("mdm", cp("mdmRepeatTroponinPlanned"), "mdmDataReviewed"),
      sug("mdm", cp("mdmHeartScoreConsidered"), "mdmClinicalRationale"),
      sug("reassessment", cp("reassessSerialReassessmentPerformed"), "treatmentPlan"),
    ],
  },
];

const SOB_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["wheezing", "sibilance", "sibilants"],
    reasonKey: reason("sobWheezing"),
    suggestions: [
      sug("differential", sob("diffAsthmaExacerbation"), "mdmDifferentialSynthesis"),
      sug("mdm", sob("mdmRespiratoryReassessmentPerformed"), "mdmClinicalRationale"),
      sug("reassessment", sob("reassessAfterBronchodilator"), "treatmentPlan"),
    ],
  },
  {
    triggerTerms: ["hypox", "oxygen requirement", "spo2", "hypoxique", "hypoxémie"],
    reasonKey: reason("sobHypoxia"),
    suggestions: [
      sug("mdm", sob("mdmOxygenRequirementEvaluated"), "mdmClinicalRationale"),
      sug("mdm", sob("mdmSupplementalOxygen"), "mdmPlanSummary"),
      sug("mdm", sob("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("reassessment", sob("reassessSpo2AfterTreatment"), "treatmentPlan"),
    ],
  },
  {
    triggerTerms: ["chest pain", "douleur thoracique", "chest tightness"],
    reasonKey: reason("sobChestPain"),
    suggestions: [
      sug("differential", sob("diffAcsEquivalent"), "mdmDifferentialSynthesis"),
      sug("mdm", sob("mdmEcgReviewed"), "mdmDataReviewed"),
      sug("mdm", sob("mdmTroponinReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["leg swelling", "gonflement", "edema", "œdème"],
    reasonKey: reason("sobLegSwelling"),
    suggestions: [
      sug("differential", sob("diffPe"), "mdmDifferentialSynthesis"),
      sug("differential", sob("diffChfExacerbation"), "mdmDifferentialSynthesis"),
      sug("mdm", sob("mdmPeConsidered"), "mdmWorkingAssessment"),
    ],
  },
  {
    triggerTerms: ["respiratory distress", "increased work of breathing", "détresse respiratoire"],
    reasonKey: reason("sobRespiratoryDistress"),
    suggestions: [
      sug("mdm", sob("mdmCxrReviewed"), "mdmDataReviewed"),
      sug("mdm", sob("mdmOxygenRequirementEvaluated"), "mdmClinicalRationale"),
      sug("mdm", sob("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", sob("dispAdmissionDiscussed"), "followUpDisposition"),
    ],
  },
];

const ABDOMINAL_PAIN_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["rlq", "right lower quadrant", "fosse iliaque droite"],
    reasonKey: reason("abdominalRlq"),
    suggestions: [
      sug("differential", abd("diffAppendicitis"), "mdmDifferentialSynthesis"),
      sug("mdm", abd("mdmAppendicitisConsidered"), "mdmWorkingAssessment"),
      sug("mdm", abd("mdmCtAbdomenPelvisReviewed"), "mdmDataReviewed"),
      sug("mdm", abd("mdmSurgeryConsultIfIndicated"), "mdmConsultsDiscussed"),
    ],
  },
  {
    triggerTerms: ["guarding", "défense", "rebound"],
    reasonKey: reason("abdominalGuarding"),
    suggestions: [
      sug("differential", abd("diffAppendicitis"), "mdmDifferentialSynthesis"),
      sug("mdm", abd("mdmSurgicalPathologyConsidered"), "mdmWorkingAssessment"),
      sug("mdm", abd("mdmSerialAbdominalExamsPerformed"), "mdmClinicalRationale"),
      sug("reassessment", abd("reassessSerialAbdominalExam"), "treatmentPlan"),
    ],
  },
  {
    triggerTerms: ["fever", "fièvre", "febrile"],
    reasonKey: reason("abdominalFever"),
    suggestions: [
      sug("differential", abd("diffAppendicitis"), "mdmDifferentialSynthesis"),
      sug("differential", abd("diffPyelonephritis"), "mdmDifferentialSynthesis"),
      sug("mdm", abd("mdmLabsReviewed"), "mdmDataReviewed"),
      sug("mdm", abd("mdmUltrasoundReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["vomiting", "vomissements", "nausea"],
    reasonKey: reason("abdominalVomiting"),
    suggestions: [
      sug("differential", abd("diffBowelObstruction"), "mdmDifferentialSynthesis"),
      sug("mdm", abd("mdmSerialAbdominalExamsPerformed"), "mdmClinicalRationale"),
      sug("reassessment", abd("reassessAfterAnalgesia"), "treatmentPlan"),
    ],
  },
];

const STROKE_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["last known well", "dernier moment", "heure connue"],
    reasonKey: reason("strokeLastKnownWell"),
    suggestions: [
      sug("mdm", stroke("mdmLastKnownWellDocumented"), "mdmClinicalRationale"),
      sug("mdm", stroke("mdmThrombolyticEligibilityConsidered"), "mdmClinicalRationale"),
      sug("mdm", stroke("mdmTimeSensitiveWorkflowReviewed"), "mdmClinicalRationale"),
    ],
  },
  {
    triggerTerms: ["unilateral weakness", "faiblesse unilatérale", "weakness"],
    reasonKey: reason("strokeUnilateralWeakness"),
    suggestions: [
      sug("differential", stroke("diffIschemicStroke"), "mdmDifferentialSynthesis"),
      sug("mdm", stroke("mdmStrokeSyndromeConsidered"), "mdmWorkingAssessment"),
      sug("mdm", stroke("mdmCtHeadReviewed"), "mdmDataReviewed"),
      sug("mdm", stroke("mdmThrombolyticEligibilityConsidered"), "mdmClinicalRationale"),
      sug("reassessment", stroke("reassessRepeatNeuroExam"), "treatmentPlan"),
    ],
  },
  {
    triggerTerms: ["speech difficulty", "speech slurring", "trouble de la parole", "dysarthrie"],
    reasonKey: reason("strokeSpeechDifficulty"),
    suggestions: [
      sug("differential", stroke("diffTia"), "mdmDifferentialSynthesis"),
      sug("mdm", stroke("mdmStrokeAlertActivated"), "mdmImmediateActionsRationale"),
      sug("mdm", stroke("mdmCtHeadReviewed"), "mdmDataReviewed"),
      sug("mdm", stroke("mdmTransferStrokeCenterConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    triggerTerms: ["facial droop", "facial asymmetry", "asymétrie faciale"],
    reasonKey: reason("strokeFacialDroop"),
    suggestions: [
      sug("mdm", stroke("mdmStrokeAlertActivated"), "mdmImmediateActionsRationale"),
      sug("mdm", stroke("mdmThrombolyticEligibilityConsidered"), "mdmClinicalRationale"),
      sug("mdm", stroke("mdmNeurologyConsulted"), "mdmConsultsDiscussed"),
      sug("disposition", stroke("dispTransferHigherNeuroCare"), "followUpDisposition"),
    ],
  },
];

const HEADACHE_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["thunderclap", "coup de tonnerre", "sudden severe headache"],
    reasonKey: reason("headacheThunderclap"),
    suggestions: [
      sug("differential", headache("diffSubarachnoidHemorrhage"), "mdmDifferentialSynthesis"),
      sug("mdm", headache("mdmSahConsidered"), "mdmWorkingAssessment"),
      sug("mdm", headache("mdmCtHeadReviewed"), "mdmDataReviewed"),
      sug("mdm", headache("mdmLpConsidered"), "mdmPlanSummary"),
    ],
  },
  {
    triggerTerms: ["neck stiffness", "meningismus", "raideur de la nuque"],
    reasonKey: reason("headacheNeckStiffness"),
    suggestions: [
      sug("differential", headache("diffMeningitis"), "mdmDifferentialSynthesis"),
      sug("mdm", headache("mdmMeningitisConsidered"), "mdmWorkingAssessment"),
      sug("mdm", headache("mdmLpConsidered"), "mdmPlanSummary"),
    ],
  },
  {
    triggerTerms: ["fever", "fièvre"],
    reasonKey: reason("headacheFever"),
    suggestions: [
      sug("differential", headache("diffMeningitis"), "mdmDifferentialSynthesis"),
      sug("mdm", headache("mdmLabsReviewed"), "mdmDataReviewed"),
      sug("mdm", headache("mdmCtHeadReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["focal neurologic", "neurologic deficit", "déficit neurologique", "weakness", "numbness"],
    reasonKey: reason("headacheNeuroDeficit"),
    suggestions: [
      sug("differential", headache("diffIntracranialHemorrhage"), "mdmDifferentialSynthesis"),
      sug("mdm", headache("mdmCtHeadReviewed"), "mdmDataReviewed"),
      sug("reassessment", headache("mdmNeurologicExamReassessed"), "treatmentPlan"),
    ],
  },
];

const DIZZINESS_SYNCOPE_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["true syncope", "syncope", "syncope event", "syncope complète"],
    reasonKey: reason("dizzinessSyncopeEvent"),
    suggestions: [
      sug("mdm", dizz("mdmEcgReviewed"), "mdmDataReviewed"),
      sug("differential", dizz("diffCardiacArrhythmia"), "mdmDifferentialSynthesis"),
      sug("mdm", dizz("mdmTelemetryConsidered"), "mdmPlanSummary"),
      sug("mdm", dizz("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    triggerTerms: ["exertional", "à l'effort", "with exertion"],
    reasonKey: reason("dizzinessExertional"),
    suggestions: [
      sug("differential", dizz("diffAcsEquivalent"), "mdmDifferentialSynthesis"),
      sug("mdm", dizz("mdmEcgReviewed"), "mdmDataReviewed"),
      sug("mdm", dizz("mdmTroponinIfIndicated"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["palpitation", "palpitations"],
    reasonKey: reason("dizzinessPalpitations"),
    suggestions: [
      sug("differential", dizz("diffCardiacArrhythmia"), "mdmDifferentialSynthesis"),
      sug("mdm", dizz("mdmEcgReviewed"), "mdmDataReviewed"),
      sug("mdm", dizz("mdmTelemetryConsidered"), "mdmPlanSummary"),
    ],
  },
  {
    triggerTerms: ["chest pain", "douleur thoracique"],
    reasonKey: reason("dizzinessChestPain"),
    suggestions: [
      sug("differential", dizz("diffAcsEquivalent"), "mdmDifferentialSynthesis"),
      sug("mdm", dizz("mdmEcgReviewed"), "mdmDataReviewed"),
      sug("reassessment", dizz("reassessAmbulatoryReassessment"), "treatmentPlan"),
    ],
  },
];

const PEDIATRIC_FEVER_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["decreased urine output", "diminution diurèse", "urine output", "diurèse"],
    reasonKey: reason("pediatricFeverDecreasedUrineOutput"),
    suggestions: [
      sug("reassessment", pedFeb("reassessHydrationStatusReassessed"), "treatmentPlan"),
      sug("mdm", pedFeb("mdmHydrationStatusAssessed"), "mdmClinicalRationale"),
      sug("disposition", pedFeb("dispReturnLethargyBreathingDehydrationFever"), "followUpDisposition"),
    ],
  },
  {
    triggerTerms: ["toxic appearing", "toxic-appearing", "aspect toxique"],
    reasonKey: reason("pediatricFeverToxicAppearing"),
    suggestions: [
      sug("differential", pedFeb("diffSepsis"), "mdmDifferentialSynthesis"),
      sug("mdm", pedFeb("mdmSepsisConsidered"), "mdmWorkingAssessment"),
      sug("mdm", pedFeb("mdmAdmissionConsideredToxicAppearanceDehydration"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    triggerTerms: ["respiratory distress", "difficulty breathing", "détresse respiratoire", "dyspn"],
    reasonKey: reason("pediatricFeverRespiratoryDistress"),
    suggestions: [
      sug("differential", pedFeb("diffPneumonia"), "mdmDifferentialSynthesis"),
      sug("mdm", pedFeb("mdmChestImagingConsideredIfRespiratoryFindings"), "mdmDataReviewed"),
      sug("disposition", pedFeb("dispCaregiverReturnPrecautionsDiscussed"), "followUpDisposition"),
    ],
  },
];

const PEDIATRIC_ASTHMA_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["retractions", "tirage", "retractions present"],
    reasonKey: reason("pediatricAsthmaRetractions"),
    suggestions: [
      sug("reassessment", pedAsthma("mdmRepeatLungExamPerformed"), "treatmentPlan"),
      sug("mdm", pedAsthma("mdmOxygenRequirementAssessed"), "mdmClinicalRationale"),
      sug("mdm", pedAsthma("mdmAdmissionConsideredPersistentDistress"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    triggerTerms: ["hypox", "hypoxia", "oxygen saturation", "spo2"],
    reasonKey: reason("pediatricAsthmaHypoxia"),
    suggestions: [
      sug("mdm", pedAsthma("mdmOxygenRequirementAssessed"), "mdmClinicalRationale"),
      sug("mdm", pedAsthma("mdmOxygenIfIndicated"), "mdmPlanSummary"),
      sug("disposition", pedAsthma("dispAdmissionPersistentHypoxiaDistressConsidered"), "followUpDisposition"),
    ],
  },
  {
    triggerTerms: ["icu intubation", "prior icu", "intubation", "réanimation"],
    reasonKey: reason("pediatricAsthmaPriorIcu"),
    suggestions: [
      sug("mdm", pedAsthma("mdmAdmissionConsideredPersistentDistress"), "mdmAdmitObserveDischarge"),
      sug("mdm", pedAsthma("mdmSystemicSteroidConsideredAdministered"), "mdmPlanSummary"),
      sug("reassessment", pedAsthma("reassessOxygenSaturationStable"), "treatmentPlan"),
    ],
  },
];

const MALE_GENITAL_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["sudden onset", "sudden testicular", "début brutal", "testicular pain", "douleur testiculaire"],
    reasonKey: reason("maleGenitalSuddenPain"),
    suggestions: [
      sug("differential", maleGen("diffTesticularTorsion"), "mdmDifferentialSynthesis"),
      sug("mdm", maleGen("mdmTesticularTorsionConsidered"), "mdmWorkingAssessment"),
      sug("mdm", maleGen("mdmScrotalUltrasoundConsideredReviewed"), "mdmDataReviewed"),
      sug("mdm", maleGen("mdmUrologyConsultationConsidered"), "mdmConsultsDiscussed"),
    ],
  },
  {
    triggerTerms: ["nausea", "vomiting", "vomissements", "nausée"],
    reasonKey: reason("maleGenitalNauseaVomiting"),
    suggestions: [
      sug("differential", maleGen("diffTesticularTorsion"), "mdmDifferentialSynthesis"),
      sug("mdm", maleGen("mdmEmergentTransferConsultConsideredIfTorsionConcern"), "mdmAdmitObserveDischarge"),
      sug("disposition", maleGen("dispEmergentReturnTorsionSymptoms"), "followUpDisposition"),
    ],
  },
  {
    triggerTerms: ["scrotal swelling", "gonflement scrotal", "scrotum"],
    reasonKey: reason("maleGenitalScrotalSwelling"),
    suggestions: [
      sug("differential", maleGen("diffEpididymitis"), "mdmDifferentialSynthesis"),
      sug("mdm", maleGen("mdmScrotalUltrasoundConsideredReviewed"), "mdmDataReviewed"),
      sug("mdm", maleGen("mdmUrinalysisReviewed"), "mdmDataReviewed"),
    ],
  },
];

const FEMALE_PELVIC_GYN_RULES: DynamicIntelligenceRule[] = [
  {
    triggerTerms: ["pelvic pain", "douleur pelvienne", "pelvien"],
    reasonKey: reason("femalePelvicPain"),
    suggestions: [
      sug("differential", femaleGyn("diffPid"), "mdmDifferentialSynthesis"),
      sug("differential", femaleGyn("diffOvarianTorsionCyst"), "mdmDifferentialSynthesis"),
      sug("mdm", femaleGyn("mdmPelvicUltrasoundConsideredReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["vaginal bleeding", "saignement vaginal", "bleeding"],
    reasonKey: reason("femalePelvicBleeding"),
    suggestions: [
      sug("differential", femaleGyn("diffPregnancyRelatedBleeding"), "mdmDifferentialSynthesis"),
      sug("mdm", femaleGyn("mdmPregnancyTestingReviewed"), "mdmDataReviewed"),
      sug("mdm", femaleGyn("mdmObGynConsultationConsidered"), "mdmConsultsDiscussed"),
    ],
  },
  {
    triggerTerms: ["pregnancy concern", "grossesse", "pregnancy timing", "lmp"],
    reasonKey: reason("femalePelvicPregnancyConcern"),
    suggestions: [
      sug("differential", femaleGyn("diffEctopicPregnancy"), "mdmDifferentialSynthesis"),
      sug("mdm", femaleGyn("mdmEctopicPregnancyConsidered"), "mdmWorkingAssessment"),
      sug("mdm", femaleGyn("mdmPregnancyTestingReviewed"), "mdmDataReviewed"),
      sug("mdm", femaleGyn("mdmPelvicUltrasoundConsideredReviewed"), "mdmDataReviewed"),
    ],
  },
  {
    triggerTerms: ["adnexal tenderness", "adnexal", "annexe"],
    reasonKey: reason("femalePelvicAdnexalTenderness"),
    suggestions: [
      sug("differential", femaleGyn("diffOvarianTorsionCyst"), "mdmDifferentialSynthesis"),
      sug("differential", femaleGyn("diffPid"), "mdmDifferentialSynthesis"),
      sug("mdm", femaleGyn("mdmPelvicUltrasoundConsideredReviewed"), "mdmDataReviewed"),
    ],
  },
];

export const TEMPLATE_DYNAMIC_INTELLIGENCE_RULES: Partial<
  Record<ProviderDocumentationTemplateId, DynamicIntelligenceRule[]>
> = {
  chest_pain: CHEST_PAIN_RULES,
  sob: SOB_RULES,
  abdominal_pain: ABDOMINAL_PAIN_RULES,
  stroke_symptoms: STROKE_RULES,
  headache: HEADACHE_RULES,
  dizziness_syncope: DIZZINESS_SYNCOPE_RULES,
  fever: PEDIATRIC_FEVER_RULES,
  asthma_wheezing: PEDIATRIC_ASTHMA_RULES,
  male_genital_complaint: MALE_GENITAL_RULES,
  female_pelvic_gyn_complaint: FEMALE_PELVIC_GYN_RULES,
};

export const DYNAMIC_INTEL_TEMPLATE_IDS = Object.keys(
  TEMPLATE_DYNAMIC_INTELLIGENCE_RULES
) as ProviderDocumentationTemplateId[];

export function getProviderDocumentationDynamicSuggestions(args: {
  templateId: ProviderDocumentationTemplateId | null;
  state: ProviderDocumentationWorkspaceState;
}): DynamicSuggestion[] {
  if (!args.templateId) return [];
  const rules = TEMPLATE_DYNAMIC_INTELLIGENCE_RULES[args.templateId];
  if (!rules?.length) return [];

  const corpus = buildDocumentationCorpus(args.state);
  const seen = new Set<string>();
  const results: DynamicSuggestion[] = [];

  for (const rule of rules) {
    if (!corpusMatches(corpus, rule.triggerTerms)) continue;
    for (const suggestion of rule.suggestions) {
      if (seen.has(suggestion.fragmentKey)) continue;
      seen.add(suggestion.fragmentKey);
      results.push({
        category: suggestion.category,
        labelKey: suggestion.fragmentKey,
        fragmentKey: suggestion.fragmentKey,
        reasonKey: rule.reasonKey,
        targetField: suggestion.targetField,
      });
    }
  }

  return results;
}

export const DYNAMIC_SUGGESTION_CATEGORY_ORDER: DynamicSuggestionCategory[] = [
  "differential",
  "mdm",
  "reassessment",
  "disposition",
];

export const DYNAMIC_SUGGESTION_CATEGORY_TITLE_KEYS: Record<DynamicSuggestionCategory, string> = {
  differential: "providerDocumentationWorkspace.dynamicSuggestionsCategoryDifferential",
  mdm: "providerDocumentationWorkspace.dynamicSuggestionsCategoryMdm",
  reassessment: "providerDocumentationWorkspace.dynamicSuggestionsCategoryReassessment",
  disposition: "providerDocumentationWorkspace.dynamicSuggestionsCategoryDisposition",
};
