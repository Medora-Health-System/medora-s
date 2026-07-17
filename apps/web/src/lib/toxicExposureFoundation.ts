/**
 * Phase 16 (Commit 1) — toxic exposure documentation foundation. Mirrors
 * `environmentalExposureFoundation.ts` (Phase 15): names standard toxic-exposure
 * documentation vocabulary and detects mentions in free text so a chart note can echo
 * terminology back. Never invents dose, never infers a toxin identity from vague
 * description, and never establishes a diagnosis or disposition.
 */

export type ToxicExposureRoute =
  | "ingestion"
  | "inhalation"
  | "injection"
  | "dermal"
  | "ocular"
  | "unknown"
  | "unspecified";

export type ToxicExposureIntent =
  | "intentional"
  | "accidental"
  | "assault"
  | "unknown"
  | "unspecified";

export type ToxicFormulation = "immediate_release" | "extended_release" | "unknown" | "unspecified";

export type ToxicExposureTiming = "acute" | "chronic" | "acute_on_chronic" | "unspecified";

export type ToxicExposureMixture = "single" | "mixed" | "unknown" | "unspecified";

export type ToxicExposureFindings = {
  substanceOrProductReported: boolean;
  brandOrGenericReported: boolean;
  concentrationReported: boolean;
  formulation: ToxicFormulation;
  amountReported: boolean;
  estimatedMaximumAmountReported: boolean;
  amountUnknown: boolean;
  route: ToxicExposureRoute;
  exposureTimeReported: boolean;
  firstSymptomTimeReported: boolean;
  intent: ToxicExposureIntent;
  mixture: ToxicExposureMixture;
  coIngestantsReported: boolean;
  bodyWeightReported: boolean;
  pregnancyReported: boolean;
  ageReported: boolean;
  prescriptionOwnershipReported: boolean;
  medicationAccessReported: boolean;
  containerOrLabelAvailable: boolean;
  decontaminationBeforeArrivalReported: boolean;
  vomitingReported: boolean;
  priorTreatmentReported: boolean;
  poisonControlReferenceReported: boolean;
  witnessReliabilityReported: boolean;
  timing: ToxicExposureTiming;
  pediatricContextReported: boolean;
  delayedReleaseConcernReported: boolean;
  bodyPackerOrStufferConcernReported: boolean;
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const ROUTE_PATTERNS: Array<{ value: ToxicExposureRoute; pattern: RegExp }> = [
  { value: "ingestion", pattern: /\bingest(ed|ion)?\b|\bswallowed\b|\boverdose\b|\boral exposure\b/ },
  { value: "inhalation", pattern: /\binhal(ed|ation)\b|\bsmoke inhalation\b|\bfume(s)?\b/ },
  { value: "injection", pattern: /\binject(ed|ion)\b|\biv use\b|\bintravenous\b/ },
  { value: "dermal", pattern: /\bdermal\b|\bskin (exposure|contact)\b|\btopical exposure\b/ },
  { value: "ocular", pattern: /\bocular (exposure|splash)\b|\beye (exposure|splash)\b/ },
  { value: "unknown", pattern: /\bunknown (route|exposure)\b|\broute unknown\b/ },
];

const INTENT_PATTERNS: Array<{ value: ToxicExposureIntent; pattern: RegExp }> = [
  { value: "intentional", pattern: /\bintentional\b|\bself.?harm\b|\bsuicid(al|e)\b|\bdeliberate overdose\b/ },
  { value: "accidental", pattern: /\baccidental\b|\bunintentional\b|\bpediatric accidental\b/ },
  { value: "assault", pattern: /\bassault\b|\bhomicidal poisoning\b|\bpoisoned by another\b/ },
  { value: "unknown", pattern: /\bintent unknown\b|\bundetermined intent\b|\bunknown intent\b/ },
];

const FORMULATION_PATTERNS: Array<{ value: ToxicFormulation; pattern: RegExp }> = [
  {
    value: "extended_release",
    pattern: /\bextended.?release\b|\bsustained.?release\b|\bdelayed.?release\b|\bxr\b|\ber\b|\bsr\b/,
  },
  { value: "immediate_release", pattern: /\bimmediate.?release\b|\bir formulation\b/ },
  { value: "unknown", pattern: /\bformulation unknown\b|\bunknown formulation\b/ },
];

const TIMING_PATTERNS: Array<{ value: ToxicExposureTiming; pattern: RegExp }> = [
  { value: "acute_on_chronic", pattern: /\bacute.on.chronic\b|\bacute on chronic\b/ },
  { value: "chronic", pattern: /\bchronic (exposure|toxicity|use)\b/ },
  { value: "acute", pattern: /\bacute (ingestion|exposure|overdose|toxicity)\b/ },
];

const MIXTURE_PATTERNS: Array<{ value: ToxicExposureMixture; pattern: RegExp }> = [
  { value: "mixed", pattern: /\bmixed (overdose|ingestion|exposure)\b|\bco.?ingest(ant|ion)\b|\bpolysubstance\b/ },
  { value: "single", pattern: /\bsingle (agent|substance|ingestion)\b/ },
  { value: "unknown", pattern: /\bunknown ingestion\b|\bingestion of unknown\b/ },
];

/**
 * Documentation advisory only. Detects toxic-exposure vocabulary already present in free
 * text. Never invents a dose when amount is unknown or unreported.
 */
export function parseToxicExposureFromText(text = ""): ToxicExposureFindings {
  const normalized = normalize(text);

  const amountReported = /\b(dose|amount|mg|g|ml|tablets?|pills?|capsules?)\b/.test(normalized) &&
    !/\b(unknown (dose|amount)|dose unknown|amount unknown|unknown quantity)\b/.test(normalized);
  const amountUnknown =
    /\b(unknown (dose|amount)|dose unknown|amount unknown|unknown quantity|maximum possible)\b/.test(
      normalized
    );

  return {
    substanceOrProductReported:
      /\b(substance|product|medication|drug|toxin|pesticide|mushroom|plant|snake|spider|scorpion)\b/.test(
        normalized
      ),
    brandOrGenericReported: /\b(brand|generic|trade name|product name)\b/.test(normalized),
    concentrationReported: /\b(concentration|percent|mg\/ml|ppm)\b/.test(normalized),
    formulation: FORMULATION_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    amountReported,
    estimatedMaximumAmountReported: /\b(maximum (possible|estimated)|pill count|estimated maximum)\b/.test(
      normalized
    ),
    amountUnknown: amountUnknown || (!amountReported && /\bunknown ingestion\b/.test(normalized)),
    route: ROUTE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    exposureTimeReported: /\b(time of (ingestion|exposure)|ingested at|exposure at|last seen well)\b/.test(
      normalized
    ),
    firstSymptomTimeReported: /\b(symptom onset|first symptom|became symptomatic)\b/.test(normalized),
    intent: INTENT_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    mixture: MIXTURE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    coIngestantsReported: /\bco.?ingest|\bpolysubstance|\bmixed overdose\b/.test(normalized),
    bodyWeightReported: /\b(body )?weight\b|\bkg\b|\blbs?\b/.test(normalized),
    pregnancyReported: /\bpregnan(t|cy)\b/.test(normalized),
    ageReported: /\b(year.?old|month.?old|age)\b/.test(normalized),
    prescriptionOwnershipReported: /\b(own prescription|prescribed to patient|borrowed medication)\b/.test(
      normalized
    ),
    medicationAccessReported: /\bmedication access\b|\baccess to medications\b/.test(normalized),
    containerOrLabelAvailable: /\b(container|label|bottle) (available|brought|present)\b/.test(normalized),
    decontaminationBeforeArrivalReported: /\bdecontaminat|\bactivated charcoal before arrival\b/.test(
      normalized
    ),
    vomitingReported: /\bvomit(ed|ing)\b|\bemesis\b/.test(normalized),
    priorTreatmentReported: /\bprior treatment\b|\btreated before arrival\b|\bnaloxone given\b|\bnarcan\b/.test(
      normalized
    ),
    poisonControlReferenceReported:
      /\bpoison control\b|\bpoison.?control (case|reference|number)\b|\bpcn\b/.test(normalized),
    witnessReliabilityReported: /\bwitness (report|reliability)\b|\bunreliable historian\b/.test(normalized),
    timing: TIMING_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    pediatricContextReported: /\bpediatric\b|\bchild\b|\binfant\b|\btoddler\b/.test(normalized),
    delayedReleaseConcernReported:
      /\bextended.?release\b|\bdelayed.?release\b|\bdelayed toxicity\b|\bsustained.?release\b/.test(
        normalized
      ),
    bodyPackerOrStufferConcernReported: /\bbody.?packer\b|\bbody.?stuffer\b|\binternal concealment\b/.test(
      normalized
    ),
  };
}

/** True when documented text explicitly states amount/dose is unknown — never invent a value. */
export function isToxicAmountUnknown(findings: ToxicExposureFindings): boolean {
  return findings.amountUnknown || (!findings.amountReported && findings.mixture === "unknown");
}
