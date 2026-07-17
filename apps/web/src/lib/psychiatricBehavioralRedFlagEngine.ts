/**
 * Phase 18 (Commit 1) — psychiatric / behavioral red-flag screening (documentation advisory only).
 * Mirrors `obGynUrologyRedFlagEngine.ts` (Phase 17). Never establishes a diagnosis, suicide-risk
 * classification, capacity determination, hold, restraint, medication selection, medical clearance,
 * or disposition.
 */

export type PsychiatricBehavioralRedFlagCategory =
  | "active_suicidal_intent_with_plan_or_means"
  | "recent_high_lethality_attempt"
  | "active_homicidal_intent"
  | "severe_psychosis_impairing_safety"
  | "severe_mania_dangerous_behavior"
  | "catatonia_concern"
  | "delirium_medical_emergency"
  | "postpartum_psychosis_concern"
  | "eating_disorder_medical_instability"
  | "unsafe_intoxication_or_withdrawal";

export type PsychiatricBehavioralRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type PsychiatricBehavioralRedFlagResolution = {
  categories: PsychiatricBehavioralRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously diagnose, classify suicide risk, determine capacity, initiate holds or restraints, select medications, medically clear, or choose disposition — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: PsychiatricBehavioralRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "active_suicidal_intent_with_plan_or_means",
    pattern:
      /active suicidal (ideation|intent)|suicidal ideation with (plan|intent)|plan to (die|kill self|end life)|intent to (die|kill self)|access to (means|weapons|firearms)|lethal means/,
    prompt:
      "Document suicidal ideation in the patient's words, plan, intent, prior attempts, and means access if reported. Do not state low suicide risk or that the patient is safe for discharge. C-SSRS or monitoring forms are documentation prompts only — not score-driven disposition. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "recent_high_lethality_attempt",
    pattern:
      /recent (suicide attempt|high.?lethality attempt)|suicide attempt (today|last night|within \d+ (hours|days))|overdose attempt|hanging attempt|jump attempt/,
    prompt:
      "Document timing, method, injuries, resuscitation, and collateral if available. NSSI is not equivalent to a suicide attempt unless documented as such. Do not state medically cleared or safe for discharge. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "active_homicidal_intent",
    pattern:
      /active homicidal (ideation|intent)|homicidal ideation with (plan|intent)|plan to harm (others|someone)|intent to kill (others|someone)|threat to harm/,
    prompt:
      "Document homicidal ideation, identified target if reported, plan, intent, access to weapons, and collateral if available. Do not state the patient lacks homicidal risk without documented assessment. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_psychosis_impairing_safety",
    pattern:
      /severe psychosis|psychosis impairing safety|command hallucinations|paranoia with (aggression|unsafe behavior)|disorganized behavior with safety concern/,
    prompt:
      "Document perceptual disturbances, thought process, behavior, and collateral if available. Do not state the patient is not psychotic unless supported by documented exam. Do not auto-diagnose schizophrenia. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_mania_dangerous_behavior",
    pattern:
      /severe mania|manic episode with (agitation|dangerous behavior)|grandiosity with unsafe behavior|flight of ideas with agitation|bipolar mania with aggression/,
    prompt:
      "Document mood, speech, sleep, behavior, and collateral if available. Do not autonomously select mood stabilizers or antipsychotics. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "catatonia_concern",
    pattern:
      /catatonia|catatonic|catalepsy|waxy flexibility|mutism with rigidity|posturing|negativism|stupor with rigidity/,
    prompt:
      "Document motor exam, vital signs, and medical contributors if assessed. Catatonia may reflect medical or psychiatric etiology — do not presume purely psychiatric cause. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "delirium_medical_emergency",
    pattern:
      /delirium|acute confusional state|acute encephalopathy|fluctuating mental status|inattention with (fever|infection|toxins|metabolic)|hospital.?acquired delirium/,
    prompt:
      "HIGH-VISIBILITY ADVISORY: Delirium is a medical emergency until evaluated — do not presume primary psychiatric illness. Document onset, fluctuation, infection, toxins, metabolic contributors, and collateral. Do not state medically cleared or attribute to psychiatric cause without evaluation. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "postpartum_psychosis_concern",
    pattern:
      /postpartum psychosis|puerperal psychosis|psychosis (in|after) (postpartum|delivery)|post.?partum psychotic symptoms|peripartum psychosis/,
    prompt:
      "HIGH-VISIBILITY ADVISORY: Postpartum psychosis is an obstetric-behavioral emergency — document postpartum interval, psychotic symptoms, infant safety, and collateral. Do not state safe for discharge or low risk without clinician-selected assessment. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "eating_disorder_medical_instability",
    pattern:
      /eating disorder (with )?(bradycardia|hypotension|electrolyte|medical instability)|anorexia with (bradycardia|hypotension|syncope)|refeeding concern|severe malnutrition with instability/,
    prompt:
      "Document vital signs, weight change, oral intake, electrolytes if obtained, and ECG if obtained. Do not state medically stable for discharge without documented reassessment. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "unsafe_intoxication_or_withdrawal",
    pattern:
      /unsafe intoxication|severe withdrawal|alcohol withdrawal (seizure|risk)|opioid withdrawal with agitation|benzodiazepine withdrawal|autonomic instability with withdrawal|intoxication impairing safety/,
    prompt:
      "Document substance, timing, vital signs, autonomic signs, and overlap with Phase 16 toxicology ownership. Preserve toxicology linkage for intentional overdose. Do not state medically cleared. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis or autonomous treatment action. */
export function resolvePsychiatricBehavioralRedFlags(
  input: PsychiatricBehavioralRedFlagInput
): PsychiatricBehavioralRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function psychiatricBehavioralRedFlagWarnings(input: PsychiatricBehavioralRedFlagInput): string[] {
  return resolvePsychiatricBehavioralRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a high-risk psychiatric or behavioral concern. */
export function isPsychiatricBehavioralLifeThreateningFlagged(input: PsychiatricBehavioralRedFlagInput): boolean {
  const categories = resolvePsychiatricBehavioralRedFlags(input).categories;
  return (
    categories.includes("active_suicidal_intent_with_plan_or_means") ||
    categories.includes("recent_high_lethality_attempt") ||
    categories.includes("active_homicidal_intent") ||
    categories.includes("severe_psychosis_impairing_safety") ||
    categories.includes("severe_mania_dangerous_behavior") ||
    categories.includes("catatonia_concern") ||
    categories.includes("delirium_medical_emergency") ||
    categories.includes("postpartum_psychosis_concern") ||
    categories.includes("eating_disorder_medical_instability") ||
    categories.includes("unsafe_intoxication_or_withdrawal")
  );
}
