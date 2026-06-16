/**
 * Phase 19P — Multi-trigger dynamic clinical clustering (v2).
 *
 * Suggestion-only, provider-controlled documentation assist. Never auto-inserts.
 */
import type { ProviderDocumentationTemplateId, ProviderDocumentationWorkspaceState } from "./providerDocumentationModel";
import {
  buildDocumentationCorpus,
  type DynamicSuggestion,
  type DynamicSuggestionCategory,
  type ProviderDocumentationFieldKey,
} from "./providerDocumentationDynamicIntelligence";

export type DynamicClinicalClusterSeverity = "low" | "moderate" | "high";

export type DynamicClinicalClusterId =
  | "respiratory_distress"
  | "sepsis_infection"
  | "acs_chest_pain"
  | "stroke_neuro_deficit"
  | "surgical_abdomen"
  | "pediatric_dehydration"
  | "testicular_torsion"
  | "ectopic_pregnancy"
  | "psychiatric_safety"
  | "spine_neuro_red_flag";

type ClusterTriggerGroup = {
  id: string;
  terms: string[];
  reasonKey: string;
};

type ClusterSuggestionSeed = {
  category: DynamicSuggestionCategory;
  fragmentKey: string;
  targetField: ProviderDocumentationFieldKey;
};

type ClusterDefinition = {
  id: DynamicClinicalClusterId;
  titleKey: string;
  templateIds: ProviderDocumentationTemplateId[];
  severity: DynamicClinicalClusterSeverity;
  minTriggerMatches: number;
  triggers: ClusterTriggerGroup[];
  suggestions: ClusterSuggestionSeed[];
};

export type ActiveDynamicClinicalCluster = {
  id: DynamicClinicalClusterId;
  severity: DynamicClinicalClusterSeverity;
  titleKey: string;
  matchedTriggerReasonKeys: string[];
  suggestions: DynamicSuggestion[];
};

const trigger = (id: string, terms: string[], reasonKey: string): ClusterTriggerGroup => ({
  id,
  terms,
  reasonKey,
});

const clusterTrigger = (key: string) => `providerDocumentationDynamicClusters.triggers.${key}`;
const clusterTitle = (key: string) => `providerDocumentationDynamicClusters.titles.${key}`;
const clusterFrag = (key: string) => `providerDocumentationDynamicClusters.fragments.${key}`;

const cp = (key: string) => `providerDocumentationComplaintIntel.chestPain.${key}`;
const sob = (key: string) => `providerDocumentationComplaintIntel.sob.${key}`;
const abd = (key: string) => `providerDocumentationComplaintIntel.abdominal.${key}`;
const stroke = (key: string) => `providerDocumentationComplaintIntel.stroke.${key}`;
const psych = (key: string) => `providerDocumentationComplaintIntel.psychiatricBehavioral.${key}`;
const pedAsthma = (key: string) => `providerDocumentationComplaintIntel.pediatricAsthmaWheezing.${key}`;
const asthma = (key: string) => `providerDocumentationComplaintIntel.asthmaWheezing.${key}`;
const uri = (key: string) => `providerDocumentationComplaintIntel.uriRespiratory.${key}`;
const fever = (key: string) => `providerDocumentationComplaintIntel.fever.${key}`;
const pedFeb = (key: string) => `providerDocumentationComplaintIntel.pediatricFever.${key}`;
const pvd = (key: string) => `providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.${key}`;
const maleGen = (key: string) => `providerDocumentationComplaintIntel.maleGenitalComplaint.${key}`;
const femaleGyn = (key: string) => `providerDocumentationComplaintIntel.femalePelvicGynComplaint.${key}`;
const back = (key: string) => `providerDocumentationComplaintIntel.backPainTrauma.${key}`;

const sug = (
  category: DynamicSuggestionCategory,
  fragmentKey: string,
  targetField: ProviderDocumentationFieldKey
): ClusterSuggestionSeed => ({
  category,
  fragmentKey,
  targetField,
});

export const DYNAMIC_CLINICAL_CLUSTER_DEFINITIONS: ClusterDefinition[] = [
  {
    id: "respiratory_distress",
    titleKey: clusterTitle("respiratoryDistress"),
    templateIds: ["sob", "asthma_wheezing", "uri_respiratory"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("hypoxia", ["hypoxia", "hypoxique", "spo2", "sp o2", "oxygen requirement", "low oxygen"], clusterTrigger("hypoxia")),
      trigger("wheezing", ["wheezing", "wheeze", "sibilance", "sibilant"], clusterTrigger("wheezing")),
      trigger("tachypnea", ["tachypnea", "tachypnée", "tachypneic", "rapid breathing", "respiratory rate elevated"], clusterTrigger("tachypnea")),
      trigger("retractions", ["retractions", "retraction", " tirage"], clusterTrigger("retractions")),
      trigger("accessory_muscles", ["accessory muscle", "accessory muscles", "muscles accessoires"], clusterTrigger("accessoryMuscleUse")),
      trigger("respiratory_distress", ["respiratory distress", "distress respiratoire", "increased work of breathing", "work of breathing"], clusterTrigger("respiratoryDistress")),
      trigger("unable_sentences", ["unable to speak full sentences", "cannot speak full sentences", "speaking in phrases", "inability to speak"], clusterTrigger("unableFullSentences")),
    ],
    suggestions: [
      sug("differential", pedAsthma("diffAsthmaExacerbation"), "mdmDifferentialSynthesis"),
      sug("differential", sob("diffPneumonia"), "mdmDifferentialSynthesis"),
      sug("differential", pedAsthma("diffRespiratoryFailure"), "mdmDifferentialSynthesis"),
      sug("mdm", sob("mdmRespiratoryReassessmentPerformed"), "mdmClinicalRationale"),
      sug("mdm", asthma("mdmOxygenRequirementAssessed"), "mdmDataReviewed"),
      sug("mdm", clusterFrag("continuousPulseOxConsidered"), "mdmDataReviewed"),
      sug("mdm", clusterFrag("escalationRespiratorySupportConsidered"), "mdmImmediateActionsRationale"),
      sug("mdm", sob("mdmCxrReviewed"), "mdmDataReviewed"),
      sug("mdm", sob("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("reassessment", asthma("mdmRepeatLungExamPerformed"), "mdmPlanSummary"),
      sug("reassessment", pedAsthma("mdmRepeatLungExamPerformed"), "mdmPlanSummary"),
      sug("reassessment", pedAsthma("reassessWorkOfBreathingImproved"), "mdmPlanSummary"),
      sug("reassessment", clusterFrag("ambulatoryPulseOxReassessed"), "mdmPlanSummary"),
      sug("disposition", sob("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", clusterFrag("icuEscalationConsideredIfWorsening"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "sepsis_infection",
    titleKey: clusterTitle("sepsisInfection"),
    templateIds: ["fever", "urinary_symptoms", "abdominal_pain", "diarrhea", "flank_pain"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("fever", ["fever", "febrile", "fièvre", "hyperthermia"], clusterTrigger("fever")),
      trigger("tachycardia", ["tachycardia", "tachycardic", "tachycardie", "heart rate elevated"], clusterTrigger("tachycardia")),
      trigger("hypotension", ["hypotension", "hypotensive", "hypotension", "blood pressure low"], clusterTrigger("hypotension")),
      trigger("toxic", ["toxic appearing", "toxic-appearing", "toxic appearance", "aspect toxique"], clusterTrigger("toxicAppearing")),
      trigger("ams", ["altered mental status", "confusion", "lethargy", "altered mentation", "confus"], clusterTrigger("alteredMentalStatus")),
      trigger("rigors", ["rigors", "frissons", "shaking chills"], clusterTrigger("rigors")),
      trigger("dehydration", ["dehydration", "dehydrated", "dry mucous membranes", "déshydratation"], clusterTrigger("dehydration")),
      trigger("lactate", ["lactate", "lactic acid", "elevated lactate"], clusterTrigger("elevatedLactate")),
    ],
    suggestions: [
      sug("differential", fever("diffSepsis"), "mdmDifferentialSynthesis"),
      sug("differential", clusterFrag("bacteremiaConsidered"), "mdmDifferentialSynthesis"),
      sug("mdm", fever("mdmIvFluidsAdministeredIfIndicated"), "mdmImmediateActionsRationale"),
      sug("mdm", fever("mdmSerialVitalSignsReviewed"), "mdmDataReviewed"),
      sug("mdm", clusterFrag("sourceInvestigationPerformed"), "mdmClinicalRationale"),
      sug("mdm", fever("mdmAntibioticsConsidered"), "mdmPlanSummary"),
      sug("mdm", fever("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("reassessment", fever("examPerfusionAssessed"), "mdmPlanSummary"),
      sug("reassessment", fever("reassessVitalsImprovedOnReassessment"), "mdmPlanSummary"),
      sug("reassessment", clusterFrag("mentalStatusReassessmentPerformed"), "mdmPlanSummary"),
      sug("disposition", fever("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", fever("mdmObservationConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", clusterFrag("escalationIfWorseningHemodynamics"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "acs_chest_pain",
    titleKey: clusterTitle("acsChestPain"),
    templateIds: ["chest_pain"],
    severity: "high",
    minTriggerMatches: 3,
    triggers: [
      trigger("exertional", ["exertional", "à l'effort", "with exertion", "on exertion"], clusterTrigger("exertionalPain")),
      trigger("diaphoresis", ["diaphoresis", "diaphorèse", "diaphoretic", "sweating"], clusterTrigger("diaphoresis")),
      trigger("radiation", ["radiating", "irradiation", "left arm", "jaw", "brach"], clusterTrigger("radiation")),
      trigger("sob", ["shortness of breath", "dyspn", "essoufflement", "sob"], clusterTrigger("shortnessOfBreath")),
      trigger("cardiac_history", ["cardiac history", "prior mi", "coronary", "cad", "antécédent cardiaque"], clusterTrigger("cardiacHistory")),
      trigger("ecg", ["ecg reviewed", "ekg reviewed", "electrocardiogram", "ecg obtained"], clusterTrigger("abnormalEcgReviewed")),
    ],
    suggestions: [
      sug("differential", cp("diffAcuteCoronarySyndrome"), "mdmDifferentialSynthesis"),
      sug("differential", cp("diffStemi"), "mdmDifferentialSynthesis"),
      sug("differential", clusterFrag("unstableAnginaConsidered"), "mdmDifferentialSynthesis"),
      sug("mdm", cp("waConcernForAcs"), "mdmWorkingAssessment"),
      sug("mdm", cp("mdmTroponinReviewed"), "mdmDataReviewed"),
      sug("mdm", cp("planSerialTroponinsOrdered"), "mdmPlanSummary"),
      sug("mdm", cp("riskAcsConcernHigh"), "mdmClinicalRationale"),
      sug("mdm", clusterFrag("cardiologyConsultationConsidered"), "mdmConsultsDiscussed"),
      sug("mdm", cp("dispAdmission"), "mdmAdmitObserveDischarge"),
      sug("mdm", cp("dispObservation"), "mdmAdmitObserveDischarge"),
      sug("reassessment", cp("reassessChestPainImproved"), "treatmentPlan"),
      sug("reassessment", cp("reassessRepeatEkgUnchanged"), "treatmentPlan"),
      sug("disposition", cp("dispAdmission"), "mdmAdmitObserveDischarge"),
      sug("disposition", clusterFrag("telemetryConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "stroke_neuro_deficit",
    titleKey: clusterTitle("strokeNeuroDeficit"),
    templateIds: ["stroke_symptoms"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("weakness", ["unilateral weakness", "weakness", "faiblesse", "hemiparesis", "hemiplegia"], clusterTrigger("unilateralWeakness")),
      trigger("facial_droop", ["facial droop", "facial asymmetry", "affaissement facial"], clusterTrigger("facialDroop")),
      trigger("speech", ["speech difficulty", "slurred speech", "aphasia", "dysarthria", "trouble speaking"], clusterTrigger("speechDifficulty")),
      trigger("sudden_onset", ["sudden onset", "abrupt onset", "début brutal"], clusterTrigger("suddenOnset")),
      trigger("last_known_well", ["last known well", "lkw", "dernière fois vu normal"], clusterTrigger("lastKnownWell")),
      trigger("gait", ["gait disturbance", "gait instability", "difficulty walking", "trouble walking"], clusterTrigger("gaitDisturbance")),
    ],
    suggestions: [
      sug("differential", stroke("diffIschemicStroke"), "mdmDifferentialSynthesis"),
      sug("differential", stroke("diffIntracranialHemorrhage"), "mdmDifferentialSynthesis"),
      sug("mdm", stroke("mdmStrokeAlertActivated"), "mdmImmediateActionsRationale"),
      sug("mdm", stroke("mdmThrombolyticEligibilityConsidered"), "mdmClinicalRationale"),
      sug("mdm", stroke("mdmCtaHeadNeckReviewed"), "mdmDataReviewed"),
      sug("mdm", stroke("mdmNeurologyConsulted"), "mdmConsultsDiscussed"),
      sug("reassessment", stroke("reassessRepeatNeuroExam"), "mdmPlanSummary"),
      sug("reassessment", clusterFrag("airwaySwallowReassessmentPerformed"), "mdmPlanSummary"),
      sug("disposition", stroke("mdmTransferConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", stroke("mdmAdmissionNeuroMonitoring"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "surgical_abdomen",
    titleKey: clusterTitle("surgicalAbdomen"),
    templateIds: ["abdominal_pain"],
    severity: "high",
    minTriggerMatches: 3,
    triggers: [
      trigger("rlq", ["rlq pain", "rlq", "right lower quadrant", "foie iliaque droit", "fosse iliaque droite"], clusterTrigger("rlqPain")),
      trigger("guarding", ["guarding", "défense", "rigidity", "rigid abdomen"], clusterTrigger("guarding")),
      trigger("rebound", ["rebound", "rebond", "peritoneal signs", "peritonitis"], clusterTrigger("rebound")),
      trigger("vomiting", ["vomiting", "vomit", "vomissements", "emesis"], clusterTrigger("vomiting")),
      trigger("fever", ["fever", "febrile", "fièvre"], clusterTrigger("fever")),
      trigger("peritoneal", ["peritoneal signs", "peritonitis", "acute abdomen"], clusterTrigger("peritonealSigns")),
    ],
    suggestions: [
      sug("differential", abd("diffAppendicitis"), "mdmDifferentialSynthesis"),
      sug("differential", clusterFrag("perforationConsidered"), "mdmDifferentialSynthesis"),
      sug("differential", clusterFrag("surgicalAbdomenConsidered"), "mdmDifferentialSynthesis"),
      sug("mdm", abd("mdmSerialAbdominalExamsPerformed"), "mdmClinicalRationale"),
      sug("mdm", abd("mdmSurgeryConsultIfIndicated"), "mdmConsultsDiscussed"),
      sug("mdm", abd("mdmCtAbdomenPelvisReviewed"), "mdmDataReviewed"),
      sug("mdm", abd("mdmUltrasoundReviewed"), "mdmDataReviewed"),
      sug("mdm", clusterFrag("npoStatusConsidered"), "mdmImmediateActionsRationale"),
      sug("reassessment", abd("reassessSerialAbdominalExam"), "mdmPlanSummary"),
      sug("reassessment", clusterFrag("repeatPainVitalsReassessment"), "mdmPlanSummary"),
      sug("disposition", abd("mdmAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", abd("mdmObservationConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "pediatric_dehydration",
    titleKey: clusterTitle("pediatricDehydration"),
    templateIds: ["diarrhea", "nausea_vomiting", "dehydration", "fever"],
    severity: "moderate",
    minTriggerMatches: 2,
    triggers: [
      trigger("decreased_uop", ["decreased urine output", "decreased uop", "oliguria", "fewer wet diapers"], clusterTrigger("decreasedUrineOutput")),
      trigger("vomiting", ["vomiting", "vomit", "vomissements"], clusterTrigger("vomiting")),
      trigger("diarrhea", ["diarrhea", "diarrhée", "loose stools"], clusterTrigger("diarrhea")),
      trigger("poor_po", ["poor po intake", "decreased oral intake", "poor intake", "refusing fluids"], clusterTrigger("poorPoIntake")),
      trigger("dry_mucosa", ["dry mucous membranes", "dry mucosa", "muqueuses sèches"], clusterTrigger("dryMucousMembranes")),
      trigger("lethargy", ["lethargy", "lethargic", "léthargie", "decreased activity"], clusterTrigger("lethargy")),
    ],
    suggestions: [
      sug("differential", pvd("diffDehydration"), "mdmDifferentialSynthesis"),
      sug("mdm", pvd("mdmOralRehydrationTrialPerformed"), "mdmImmediateActionsRationale"),
      sug("mdm", pvd("mdmIvFluidsConsideredAdministered"), "mdmImmediateActionsRationale"),
      sug("mdm", pedFeb("reasoningWeightBasedDosingUsed"), "mdmClinicalRationale"),
      sug("reassessment", pvd("reassessToleratingOralIntake"), "mdmPlanSummary"),
      sug("disposition", pedFeb("dispAdmission"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "testicular_torsion",
    titleKey: clusterTitle("testicularTorsion"),
    templateIds: ["male_genital_complaint"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("sudden_pain", ["sudden testicular pain", "sudden scrotal pain", "acute testicular pain", "severe sudden testicular"], clusterTrigger("suddenTesticularPain")),
      trigger("nausea", ["nausea", "vomiting", "vomissements", "nausea vomiting"], clusterTrigger("nauseaVomiting")),
      trigger("swelling", ["scrotal swelling", "testicular swelling", "swollen scrotum"], clusterTrigger("scrotalSwelling")),
      trigger("cremasteric", ["absent cremasteric", "cremasteric reflex absent", "cremasteric reflex"], clusterTrigger("absentCremastericReflex")),
    ],
    suggestions: [
      sug("differential", maleGen("diffTesticularTorsion"), "mdmDifferentialSynthesis"),
      sug("mdm", maleGen("mdmScrotalUltrasoundReviewed"), "mdmDataReviewed"),
      sug("mdm", maleGen("planUrologyFollowUpRecommended"), "mdmPlanSummary"),
      sug("mdm", maleGen("riskTorsionConcernHigh"), "mdmWorkingAssessment"),
      sug("reassessment", maleGen("reassessPainImproved"), "mdmPlanSummary"),
      sug("disposition", maleGen("dispEmergentReturnTorsionSymptoms"), "followUpDisposition"),
    ],
  },
  {
    id: "ectopic_pregnancy",
    titleKey: clusterTitle("ectopicPregnancy"),
    templateIds: ["female_pelvic_gyn_complaint"],
    severity: "high",
    minTriggerMatches: 3,
    triggers: [
      trigger("pelvic_pain", ["pelvic pain", "douleur pelvienne", "lower abdominal pain"], clusterTrigger("pelvicPain")),
      trigger("bleeding", ["vaginal bleeding", "bleeding", "saignement", "spotting"], clusterTrigger("vaginalBleeding")),
      trigger("pregnancy", ["pregnancy concern", "pregnant", "possible pregnancy", "grossesse"], clusterTrigger("pregnancyConcern")),
      trigger("syncope", ["syncope", "dizziness", "lightheaded", "étourdissement"], clusterTrigger("syncopeDizziness")),
      trigger("adnexal", ["adnexal tenderness", "adnexal", "annexe"], clusterTrigger("adnexalTenderness")),
    ],
    suggestions: [
      sug("differential", femaleGyn("diffEctopicPregnancy"), "mdmDifferentialSynthesis"),
      sug("mdm", femaleGyn("mdmPregnancyTestReviewed"), "mdmDataReviewed"),
      sug("mdm", femaleGyn("mdmPelvicUltrasoundReviewed"), "mdmDataReviewed"),
      sug("mdm", femaleGyn("planObGynFollowUpRecommended"), "mdmPlanSummary"),
      sug("mdm", clusterFrag("hemodynamicMonitoringConsidered"), "mdmDataReviewed"),
      sug("reassessment", clusterFrag("repeatPelvicReassessment"), "mdmPlanSummary"),
      sug("reassessment", femaleGyn("reassessRemainsHemodynamicallyStable"), "mdmPlanSummary"),
      sug("disposition", clusterFrag("admissionTransferConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "psychiatric_safety",
    titleKey: clusterTitle("psychiatricSafety"),
    templateIds: ["psychiatric_behavioral"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("si", ["suicidal thoughts", "suicidal ideation", "suicide", "idées suicidaires"], clusterTrigger("suicidalThoughts")),
      trigger("hi", ["homicidal thoughts", "homicidal ideation", "idées homicidaires"], clusterTrigger("homicidalThoughts")),
      trigger("hallucinations", ["hallucinations", "hallucination", "auditory hallucinations"], clusterTrigger("hallucinations")),
      trigger("weapons", ["access to weapons", "weapon access", "firearm", "arme"], clusterTrigger("accessToWeapons")),
      trigger("unsafe_discharge", ["unsafe discharge", "not safe for discharge", "unsafe environment"], clusterTrigger("unsafeDischargeConcern")),
      trigger("agitation", ["severe agitation", "agitation", "agité", "violent behavior"], clusterTrigger("severeAgitation")),
    ],
    suggestions: [
      sug("differential", psych("diffBehavioralCrisis"), "mdmDifferentialSynthesis"),
      sug("mdm", psych("mdmInvoluntaryHoldConsidered"), "mdmImmediateActionsRationale"),
      sug("mdm", psych("mdmPsychiatricConsultationRequested"), "mdmConsultsDiscussed"),
      sug("mdm", psych("mdmPatientPlacedOnSafetyPrecautions"), "mdmImmediateActionsRationale"),
      sug("mdm", psych("mdmCollateralInformationReviewed"), "mdmClinicalRationale"),
      sug("reassessment", psych("reassessBehaviorReassessed"), "mdmPlanSummary"),
      sug("reassessment", psych("mdmSuicideRiskAssessed"), "mdmPlanSummary"),
      sug("disposition", psych("mdmPsychiatricAdmissionConsidered"), "mdmAdmitObserveDischarge"),
      sug("disposition", psych("mdmSafetyPlanConsidered"), "mdmAdmitObserveDischarge"),
    ],
  },
  {
    id: "spine_neuro_red_flag",
    titleKey: clusterTitle("spineNeuroRedFlag"),
    templateIds: ["back_pain", "neck_pain_trauma"],
    severity: "high",
    minTriggerMatches: 2,
    triggers: [
      trigger("saddle", ["saddle anesthesia", "saddle anaesthesia", "anesthésie en selle"], clusterTrigger("saddleAnesthesia")),
      trigger("bowel_bladder", ["bowel/bladder dysfunction", "bowel bladder", "urinary retention", "fecal incontinence", "incontinence"], clusterTrigger("bowelBladderDysfunction")),
      trigger("weakness", ["weakness", "faiblesse", "lower extremity weakness"], clusterTrigger("weakness")),
      trigger("ambulate", ["inability to ambulate", "unable to walk", "cannot walk", "non-ambulatory"], clusterTrigger("inabilityToAmbulate")),
      trigger("back_pain", ["severe back pain", "back pain", "douleur dorsale"], clusterTrigger("severeBackPain")),
      trigger("spinal_tenderness", ["spinal tenderness", "midline tenderness", "midline spinal", "paraspinal tenderness"], clusterTrigger("spinalTenderness")),
    ],
    suggestions: [
      sug("differential", back("diffCaudaEquina"), "mdmDifferentialSynthesis"),
      sug("differential", back("diffSpinalCordInjury"), "mdmDifferentialSynthesis"),
      sug("mdm", clusterFrag("emergentMriConsidered"), "mdmDataReviewed"),
      sug("mdm", clusterFrag("spineConsultationConsidered"), "mdmConsultsDiscussed"),
      sug("mdm", back("reasoningNoEvidenceSpinalCordInjury"), "mdmClinicalRationale"),
      sug("reassessment", back("reassessNoClinicalDeterioration"), "mdmPlanSummary"),
      sug("reassessment", back("reassessAmbulationImproved"), "mdmPlanSummary"),
      sug("disposition", back("dispAdmission"), "mdmAdmitObserveDischarge"),
    ],
  },
];

export const DYNAMIC_CLINICAL_CLUSTER_IDS = DYNAMIC_CLINICAL_CLUSTER_DEFINITIONS.map(
  (cluster) => cluster.id
);

function resolveClusterSeverity(
  cluster: ClusterDefinition,
  matchedCount: number
): DynamicClinicalClusterSeverity {
  if (cluster.id === "pediatric_dehydration") {
    return matchedCount >= 3 ? "high" : "moderate";
  }
  return cluster.severity;
}

function matchTriggerGroups(corpus: string, triggers: ClusterTriggerGroup[]): ClusterTriggerGroup[] {
  return triggers.filter((group) =>
    group.terms.some((term) => corpus.includes(term.toLowerCase()))
  );
}

function buildClusterSuggestions(cluster: ClusterDefinition): DynamicSuggestion[] {
  const patternReasonKey = cluster.titleKey;
  const seen = new Set<string>();
  const results: DynamicSuggestion[] = [];

  for (const seed of cluster.suggestions) {
    if (seen.has(seed.fragmentKey)) continue;
    seen.add(seed.fragmentKey);
    results.push({
      category: seed.category,
      labelKey: seed.fragmentKey,
      fragmentKey: seed.fragmentKey,
      reasonKey: patternReasonKey,
      targetField: seed.targetField,
    });
  }

  return results;
}

export function getProviderDocumentationDynamicClinicalClusters(args: {
  templateId: ProviderDocumentationTemplateId | null;
  state: ProviderDocumentationWorkspaceState;
}): ActiveDynamicClinicalCluster[] {
  if (!args.templateId) return [];

  const corpus = buildDocumentationCorpus(args.state);
  const results: ActiveDynamicClinicalCluster[] = [];

  for (const cluster of DYNAMIC_CLINICAL_CLUSTER_DEFINITIONS) {
    if (!cluster.templateIds.includes(args.templateId)) continue;

    const matchedGroups = matchTriggerGroups(corpus, cluster.triggers);
    if (matchedGroups.length < cluster.minTriggerMatches) continue;

    results.push({
      id: cluster.id,
      severity: resolveClusterSeverity(cluster, matchedGroups.length),
      titleKey: cluster.titleKey,
      matchedTriggerReasonKeys: matchedGroups.map((group) => group.reasonKey),
      suggestions: buildClusterSuggestions(cluster),
    });
  }

  return results;
}

export function excludeClusterSuggestionsFromDynamicSuggestions(
  suggestions: DynamicSuggestion[],
  clusters: ActiveDynamicClinicalCluster[]
): DynamicSuggestion[] {
  const clusterFragmentKeys = new Set(
    clusters.flatMap((cluster) => cluster.suggestions.map((suggestion) => suggestion.fragmentKey))
  );
  return suggestions.filter((suggestion) => !clusterFragmentKeys.has(suggestion.fragmentKey));
}

export const DYNAMIC_CLUSTER_SEVERITY_TITLE_KEYS: Record<DynamicClinicalClusterSeverity, string> = {
  low: "providerDocumentationDynamicClusters.severity.low",
  moderate: "providerDocumentationDynamicClusters.severity.moderate",
  high: "providerDocumentationDynamicClusters.severity.high",
};
