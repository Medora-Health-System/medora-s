/**
 * Phase 15 (Commit 1) — environmental / exposure emergency red-flag screening
 * (documentation advisory only). Mirrors `dermatologicEmergencyRedFlagEngine.ts`
 * (Phase 14) and `softTissueWoundInfectionRedFlagEngine.ts` (Phase 13). This module never
 * establishes a diagnosis, never autonomously cools or rewarms a patient, never orders
 * oxygen or hyperbaric therapy, never admits, never transfers, and never requests a
 * consult — it only screens documented text for patterns that warrant clinician attention
 * and returns advisory prompts. Shared by the four adaptive templates in
 * `heatEnvironmentalIllnessClinicalIntelligence.ts`,
 * `coldEnvironmentalInjuryClinicalIntelligence.ts`,
 * `submersionElectricalLightningClinicalIntelligence.ts`, and
 * `altitudeDivingRadiationExposureClinicalIntelligence.ts`.
 *
 * A measured core temperature or a single ambient-condition detail is never, by itself, an
 * autonomous rule-in or rule-out of any category below — heat stroke concern in particular
 * requires documented altered mental status, seizure, or coma language in addition to any
 * temperature elevation.
 */

export type EnvironmentalExposureRedFlagCategory =
  | "heat_stroke"
  | "severe_hypothermia"
  | "nonfatal_drowning_respiratory_failure"
  | "high_voltage_electrical"
  | "lightning_cardiac_arrest"
  | "hace"
  | "hape"
  | "decompression_illness"
  | "arterial_gas_embolism"
  | "radiation_emergency"
  | "rhabdomyolysis_multiorgan"
  | "malignant_arrhythmia";

export type EnvironmentalExposureRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type EnvironmentalExposureRedFlagResolution = {
  categories: EnvironmentalExposureRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously diagnose, initiate cooling or rewarming, order oxygen or hyperbaric therapy, admit, transfer, or request a consult — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: EnvironmentalExposureRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "heat_stroke",
    pattern:
      /heat stroke|hyperthermia with (altered mental status|confusion|seizure|coma)|exertional collapse with (confusion|altered mental status)|core temperature elevated with (altered mental status|confusion|seizure|coma)/,
    prompt:
      "Document altered mental status, seizure, or coma together with any measured core temperature and hydration status. Heat stroke concern requires documented neurologic compromise (altered mental status, seizure, or coma) in addition to any temperature elevation — a measured temperature alone does not establish heat stroke. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_hypothermia",
    pattern:
      /severe hypothermia|moderate to severe hypothermia|core temperature (below|less than) (28|29|30)|cardiac arrhythmia with hypothermia|hypothermic cardiac arrest|absent shivering with (altered mental status|core temperature)/,
    prompt:
      "Document the measured core temperature and measurement site/method, shivering status, mental status, and cardiac rhythm. Moderate to severe hypothermia is distinct from mild hypothermia and is not staged from a single temperature reading alone. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "nonfatal_drowning_respiratory_failure",
    pattern:
      /submersion with (respiratory failure|significant respiratory distress|hypoxia)|drowning with (respiratory failure|significant respiratory distress|hypoxia)|near.drowning with (respiratory failure|respiratory distress)/,
    prompt:
      "Document submersion duration, respiratory status, oxygen saturation trend, and level of consciousness after rescue. Submersion with respiratory failure is distinct from a brief, asymptomatic submersion and warrants continued monitoring for evolving respiratory symptoms — this is documented by serial reassessment, not by an unproven delayed-drowning label. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "high_voltage_electrical",
    pattern:
      /high.voltage electrical injury|high voltage (shock|exposure|contact)|electrical injury.*(high voltage|>\s?1000\s?v)/,
    prompt:
      "Document the voltage category if known, contact duration, entry/exit wound location, cardiac rhythm, and mental status. High-voltage electrical injury carries a distinct risk of deep tissue injury, compartment syndrome, and arrhythmia compared with a low-voltage household contact. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "lightning_cardiac_arrest",
    pattern:
      /lightning strike with (cardiac arrest|arrhythmia|loss of consciousness)|lightning injury with (arrest|altered mental status)|lightning.*(cardiopulmonary arrest|asystole)/,
    prompt:
      "Document the lightning-strike mechanism (direct strike, side flash, ground current, or contact), cardiac rhythm, mental status, and any associated fall or blunt trauma. Lightning injury with cardiac arrest or altered mental status is distinct from an uncomplicated lightning contact. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "hace",
    pattern:
      /high.altitude cerebral edema|\bhace\b|altitude illness with (ataxia|confusion|altered mental status)/,
    prompt:
      "Document altitude gained, rate of ascent, ataxia, confusion, and headache severity. High-altitude cerebral edema is distinct from uncomplicated acute mountain sickness and is not established from headache or altitude alone. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "hape",
    pattern:
      /high.altitude pulmonary edema|\bhape\b|altitude illness with (dyspnea at rest|hypoxia|pulmonary)/,
    prompt:
      "Document altitude gained, exertional versus resting dyspnea, cough, and oxygen saturation if measured. High-altitude pulmonary edema is distinct from uncomplicated acute mountain sickness and is not established from altitude alone. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "decompression_illness",
    pattern:
      /decompression (illness|sickness)|\bdcs\b|the bends|dive.*(joint pain|neurologic symptoms) after ascent/,
    prompt:
      "Document dive depth, bottom time, ascent rate, time since surfacing, and joint pain or neurologic symptoms. Decompression illness is distinct from ordinary post-dive fatigue and is not established from dive depth alone. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "arterial_gas_embolism",
    pattern:
      /arterial gas embolism|\bage\b(?! percent)|pulmonary barotrauma with (neurologic symptoms|embolism)|rapid ascent with (loss of consciousness|neurologic symptoms)/,
    prompt:
      "Document the ascent circumstances, onset timing relative to surfacing, and any focal neurologic symptoms or loss of consciousness. Arterial gas embolism is a distinct, immediate-onset diving emergency separate from decompression illness. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "radiation_emergency",
    pattern:
      /radiation emergency|acute radiation syndrome|significant radiation exposure with (vomiting|hematologic)|radiation exposure with (nausea and vomiting within hours)/,
    prompt:
      "Document the radiation source if known, estimated exposure duration, and timing of any nausea, vomiting, or skin changes. A radiation emergency/acute radiation syndrome concern is distinct from a routine, low-dose occupational radiation exposure. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "rhabdomyolysis_multiorgan",
    pattern:
      /rhabdomyolysis with (renal failure|multiorgan)|myoglobinuria with (renal failure|dark urine and weakness)|dark urine with (muscle pain|weakness) and (renal|kidney) concern/,
    prompt:
      "Document muscle pain distribution, urine color, and any renal function or electrolyte results reviewed. Rhabdomyolysis with renal or multiorgan involvement is distinct from isolated exertional muscle soreness. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "malignant_arrhythmia",
    pattern:
      /malignant arrhythmia|ventricular (fibrillation|tachycardia) (after|with) (electrical|lightning|hypothermia)|cardiac arrest (after|with) (electrical injury|lightning|cold exposure)/,
    prompt:
      "Document the cardiac rhythm, timing relative to the exposure, and any resuscitation already performed prior to arrival. A malignant arrhythmia following electrical, lightning, or cold exposure is distinct from a transient, self-resolving palpitation. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis, initiates cooling/rewarming, orders oxygen/hyperbaric therapy, admits, transfers, or requests a consult. */
export function resolveEnvironmentalExposureRedFlags(
  input: EnvironmentalExposureRedFlagInput
): EnvironmentalExposureRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function environmentalExposureRedFlagWarnings(input: EnvironmentalExposureRedFlagInput): string[] {
  return resolveEnvironmentalExposureRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a life-threatening environmental/exposure emergency concern. */
export function isEnvironmentalExposureLifeThreateningFlagged(input: EnvironmentalExposureRedFlagInput): boolean {
  const categories = resolveEnvironmentalExposureRedFlags(input).categories;
  return (
    categories.includes("heat_stroke") ||
    categories.includes("severe_hypothermia") ||
    categories.includes("nonfatal_drowning_respiratory_failure") ||
    categories.includes("high_voltage_electrical") ||
    categories.includes("lightning_cardiac_arrest") ||
    categories.includes("hace") ||
    categories.includes("hape") ||
    categories.includes("decompression_illness") ||
    categories.includes("arterial_gas_embolism") ||
    categories.includes("radiation_emergency") ||
    categories.includes("rhabdomyolysis_multiorgan") ||
    categories.includes("malignant_arrhythmia")
  );
}
