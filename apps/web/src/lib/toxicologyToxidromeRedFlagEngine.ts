/**
 * Phase 16 (Commit 1) — toxicology / toxidrome red-flag screening (documentation advisory
 * only). Mirrors `environmentalExposureRedFlagEngine.ts` (Phase 15). Never establishes a
 * diagnosis, never selects or doses an antidote, never decontaminates, never admits,
 * never transfers, never medically clears, and never requests a consult.
 */

export type ToxicologyToxidromeRedFlagCategory =
  | "opioid_toxidrome"
  | "sedative_toxidrome"
  | "sympathomimetic"
  | "anticholinergic"
  | "cholinergic_organophosphate"
  | "serotonergic_syndrome_concern"
  | "nms_concern"
  | "withdrawal_delirium_concern"
  | "toxic_alcohol_concern"
  | "severe_cardiovascular_toxicity"
  | "caustic_airway_concern"
  | "severe_envenomation"
  | "unknown_high_risk_ingestion"
  | "intentional_self_harm_linkage"
  | "carbon_monoxide_poisoning_concern"
  | "methemoglobinemia_concern";

export type ToxicologyToxidromeRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type ToxicologyToxidromeRedFlagResolution = {
  categories: ToxicologyToxidromeRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously diagnose, select or dose an antidote, decontaminate, admit, transfer, medically clear, or request a consult — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: ToxicologyToxidromeRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "opioid_toxidrome",
    pattern:
      /opioid (overdose|toxicity|poisoning)|fentanyl overdose|methadone overdose|respiratory depression with (miosis|pinpoint pupils)|pinpoint pupils with (sedation|respiratory depression)/,
    prompt:
      "Document respiratory rate/effort, oxygenation, pupils, mental status, substance/route if known, and any reversal medication actually administered (MAR). Recurrent sedation after reversal is a monitoring concern. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "sedative_toxidrome",
    pattern:
      /benzodiazepine (overdose|poisoning)|sedative.?hypnotic (overdose|poisoning)|sedative toxidrome|gaba.?ergic overdose/,
    prompt:
      "Document mental status, respiratory status, co-ingestants, and long-acting exposure concern. Reversal agents remain MAR-recorded if administered. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "sympathomimetic",
    pattern:
      /sympathomimetic (toxidrome|toxicity)|cocaine (toxicity|overdose)|methamphetamine (intoxication|toxicity)|stimulant (overdose|toxicity) with (agitation|hyperthermia|hypertension)/,
    prompt:
      "Document agitation, temperature, blood pressure, heart rate, chest pain, seizure, and psychosis if present. Avoid unsupported excited-delirium labels. Restraint/sedation only if actually documented. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "anticholinergic",
    pattern:
      /anticholinergic (toxidrome|poisoning|toxicity)|mad as a hatter|dry as a bone|hot as a hare|blind as a bat/,
    prompt:
      "Document mental status, pupils, skin moisture, temperature, bowel sounds, and urinary retention if assessed. Anticholinergic toxidrome is not established from a single finding alone. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "cholinergic_organophosphate",
    pattern:
      /cholinergic (toxidrome|poisoning)|organophosphate (poisoning|toxicity|exposure)|carbamate (poisoning|toxicity)|bronchorrhea|SLUDGE|DUMBELS/,
    prompt:
      "Document secretions, bronchorrhea, miosis, GI symptoms, fasciculations, and contamination/decontamination status. Protect staff; antidote dosing is not automated. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "serotonergic_syndrome_concern",
    pattern:
      /serotonin syndrome|serotonergic toxicity|clonus with (serotonergic|ssri|snri|maoi)|hyperreflexia with (agitation|diaphoresis|hyperthermia)/,
    prompt:
      "Document serotonergic medication exposure, clonus, hyperreflexia, agitation, diaphoresis, temperature, tremor, and GI symptoms. Do not auto-diagnose serotonin syndrome. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "nms_concern",
    pattern:
      /neuroleptic malignant syndrome|\bnms\b|lead.?pipe rigidity|malignant neuroleptic|rigidity with (fever|autonomic instability) after (antipsychotic|neuroleptic)/,
    prompt:
      "Document dopamine-antagonist exposure or dopaminergic withdrawal, lead-pipe rigidity, fever, autonomic instability, mental status, and CK if obtained. Do not auto-diagnose NMS. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "withdrawal_delirium_concern",
    pattern:
      /delirium tremens|withdrawal delirium|alcohol withdrawal with (seizure|delirium)|benzodiazepine withdrawal with (seizure|delirium)/,
    prompt:
      "Document last use, prior withdrawal seizure/DT, CIWA-Ar/COWS if obtained with attribution/timestamp, and serial mental status. Scores do not order medications or disposition. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "toxic_alcohol_concern",
    pattern:
      /toxic alcohol|methanol (poisoning|toxicity)|ethylene glycol|glycol toxicity|isopropanol|visual symptoms with (methanol|toxic alcohol)|osmolar gap with (acidosis|toxic alcohol)/,
    prompt:
      "Document visual symptoms, abdominal/renal symptoms, acid-base findings, osmolar/anion gap if obtained, and co-ingestion. An osmolar gap alone does not diagnose toxic alcohol poisoning. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_cardiovascular_toxicity",
    pattern:
      /beta.?blocker (overdose|poisoning|toxicity)|calcium.?channel.?blocker (overdose|poisoning|toxicity)|digoxin toxicity|sodium.?channel blockade|wide qrs|qtc prolongation with (overdose|toxicity)|clonidine (overdose|toxicity)/,
    prompt:
      "Document ECG (QRS/QTc/PR/rhythm), heart rate, blood pressure, glucose, electrolytes, and serial ECG if obtained. No autonomous antidote or infusion selection. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "caustic_airway_concern",
    pattern:
      /caustic (ingestion|exposure)|corrosive (ingestion|exposure)|alkali ingestion|acid ingestion|drooling with (caustic|corrosive)|stridor after (caustic|corrosive)/,
    prompt:
      "Document substance/concentration/amount, oral pain, drooling, dysphagia, airway findings, and respiratory symptoms. Do not prompt induced vomiting or auto-document neutralization. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_envenomation",
    pattern:
      /snake envenomation|venomous snake|systemic envenomation|coagulopathy with (snake|envenomation)|scorpion (envenomation|sting) with (neurotoxicity|systemic)|black widow|brown recluse with (systemic|necrosis)/,
    prompt:
      "Document species if confidently identified, time, body region, serial circumference, bleeding/neurotoxicity, and prior first aid. Do not recommend cutting, suction, ice, or tight tourniquets. Antivenom remains MAR-owned. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "unknown_high_risk_ingestion",
    pattern:
      /unknown ingestion|unknown overdose|mixed overdose|ingestion of unknown|body.?packer|body.?stuffer|extended.?release overdose|delayed.?release exposure/,
    prompt:
      "Document maximum possible exposure, time last seen well, formulation concern, co-ingestants, and serial monitoring plan. Do not invent a specific toxin or dose. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "intentional_self_harm_linkage",
    pattern:
      /intentional (overdose|ingestion|self.?harm)|suicidal (ingestion|overdose|intent)|self.?harm by poisoning/,
    prompt:
      "Trigger suicide-risk assessment workflow. Capture intent as patient-reported or clinician-determined. Do not state medically cleared. Medical and psychiatric disposition remain separate but coordinated. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "carbon_monoxide_poisoning_concern",
    pattern:
      /carbon monoxide (poisoning|toxicity|exposure)|co poisoning|carboxyhemoglobin|co-oximetry with carbon monoxide/,
    prompt:
      "Document source, enclosed space, fire/multiple victims, neurologic findings, pregnancy, lactate/co-oximetry if obtained. Pulse oximetry alone does not exclude carbon monoxide poisoning. No autonomous hyperbaric recommendation. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "methemoglobinemia_concern",
    pattern:
      /methemoglobinemia|methemoglobin|chocolate.?colored blood|saturation gap|oxidizing exposure with cyanosis/,
    prompt:
      "Document oxidizing exposure, cyanosis, co-oximetry/methemoglobin if obtained, and G6PD/pregnancy if known. Do not diagnose from cyanosis alone. Antidote remains MAR-owned if administered. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis or autonomous treatment action. */
export function resolveToxicologyToxidromeRedFlags(
  input: ToxicologyToxidromeRedFlagInput
): ToxicologyToxidromeRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function toxicologyToxidromeRedFlagWarnings(input: ToxicologyToxidromeRedFlagInput): string[] {
  return resolveToxicologyToxidromeRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a high-risk toxicology concern. */
export function isToxicologyLifeThreateningFlagged(input: ToxicologyToxidromeRedFlagInput): boolean {
  const categories = resolveToxicologyToxidromeRedFlags(input).categories;
  return (
    categories.includes("opioid_toxidrome") ||
    categories.includes("cholinergic_organophosphate") ||
    categories.includes("serotonergic_syndrome_concern") ||
    categories.includes("nms_concern") ||
    categories.includes("withdrawal_delirium_concern") ||
    categories.includes("toxic_alcohol_concern") ||
    categories.includes("severe_cardiovascular_toxicity") ||
    categories.includes("caustic_airway_concern") ||
    categories.includes("severe_envenomation") ||
    categories.includes("unknown_high_risk_ingestion") ||
    categories.includes("carbon_monoxide_poisoning_concern") ||
    categories.includes("methemoglobinemia_concern")
  );
}
