/**
 * Soft medication safety warnings (look-alike / sound-alike, high-alert classes).
 * UI maps `ruleId` to locale-specific copy; no blocking logic here.
 */

import { shouldSuppressFalseVasopressorAlertForAnalgesic } from "./auth/clinicCareHaitiAmbulatoryOrdersMedicationsResultsD4c5b3.js";

export type MedicationSafetyWarningCategory =
  | "HIGH_RISK"
  | "CONTROLLED_SUBSTANCE"
  | "LOOK_ALIKE_SOUND_ALIKE"
  | "SEDATION_RESPIRATORY_DEPRESSION"
  | "VASOPRESSOR_HIGH_ALERT"
  | "ANTICOAGULATION_HIGH_ALERT"
  | "INSULIN_HIGH_ALERT";

export type MedicationSafetyWarning = {
  category: MedicationSafetyWarningCategory;
  /** Stable id for i18n: `medicationSoftSafety.rule.<ruleId>` */
  ruleId: string;
};

/** Catalog / order snapshot used for rule evaluation (no Prisma types). */
export type MedicationSafetyCatalogInput = {
  code?: string | null;
  name?: string | null;
  /** Preferred display (e.g. displayNameEn or UI label). */
  displayName?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  commonAliases?: string[] | null;
  isControlled?: boolean | null;
  controlledSchedule?: string | null;
  strength?: string | null;
  route?: string | null;
  /** Free-text manual line when not catalog-backed. */
  manualLabel?: string | null;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function medicationSafetyHaystack(m: MedicationSafetyCatalogInput): string {
  const parts: string[] = [];
  const push = (v: string | null | undefined) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) parts.push(s);
  };
  push(m.code);
  push(m.name);
  push(m.displayName);
  push(m.genericName);
  push(m.therapeuticClass);
  push(m.strength);
  push(m.route);
  push(m.manualLabel);
  push(m.controlledSchedule);
  for (const a of m.commonAliases ?? []) push(a);
  return normalizeText(parts.join(" "));
}

function tokensFromHaystack(hay: string): Set<string> {
  const t = new Set<string>();
  for (const tok of hay.split(" ").filter(Boolean)) {
    if (tok.length >= 2) t.add(tok);
  }
  return t;
}

function hasToken(tokens: Set<string>, ...needles: string[]): boolean {
  return needles.some((n) => {
    const x = normalizeText(n);
    return x.length > 0 && tokens.has(x);
  });
}

function hasPhrase(hay: string, phrase: string): boolean {
  const p = normalizeText(phrase);
  if (!p) return false;
  return ` ${hay} `.includes(` ${p} `);
}

function pushDeduped(out: MedicationSafetyWarning[], seen: Set<string>, w: MedicationSafetyWarning) {
  const key = `${w.category}:${w.ruleId}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(w);
}

const OPIOID_TOKENS = ["morphine", "hydromorphone", "fentanyl"] as const;
const BENZO_TOKENS = ["midazolam", "lorazepam"] as const;
const KETAMINE_TOKENS = ["ketamine"] as const;
const PROPOFOL_TOKENS = ["propofol"] as const;

const VASOPRESSOR_TOKENS = [
  "norepinephrine",
  "epinephrine",
  "phenylephrine",
  "dopamine",
  "dobutamine",
  "vasopressin",
  "adrenaline",
] as const;

const ANTICOAG_TOKENS = ["heparin", "enoxaparin", "warfarin", "dalteparin", "tinzaparin", "fondaparinux"] as const;

const HIGH_RISK_EXTRA = ["potassium", "kcl", "rocuronium", "succinylcholine", "vecuronium", "cisatracurium"] as const;

/** LASA pairs: both tokens must appear across this medication + optional siblings. */
const LASA_PAIRS: readonly { ruleId: string; a: string[]; b: string[] }[] = [
  { ruleId: "lasa_hydralazine_hydroxyzine", a: ["hydralazine"], b: ["hydroxyzine"] },
  { ruleId: "lasa_morphine_hydromorphone", a: ["morphine"], b: ["hydromorphone"] },
];

export type MedicationSafetyContext = {
  /** Other medications in the same basket / worklist (same encounter order lines, etc.). */
  siblingMedications?: MedicationSafetyCatalogInput[] | null;
};

function collectTokensAcross(meds: MedicationSafetyCatalogInput[]): Set<string> {
  const u = new Set<string>();
  for (const m of meds) {
    for (const tok of tokensFromHaystack(medicationSafetyHaystack(m))) {
      u.add(tok);
    }
  }
  return u;
}

function lasaPairPresent(
  unionTokens: Set<string>,
  a: readonly string[],
  b: readonly string[]
): boolean {
  const hasA = hasToken(unionTokens, ...a);
  const hasB = hasToken(unionTokens, ...b);
  return hasA && hasB;
}

/**
 * Returns soft warnings for one medication snapshot.
 * Does not mutate; safe for client + server.
 */
export function getMedicationSafetyWarnings(
  med: MedicationSafetyCatalogInput,
  ctx?: MedicationSafetyContext | null
): MedicationSafetyWarning[] {
  const hay = medicationSafetyHaystack(med);
  const tokens = tokensFromHaystack(hay);
  const out: MedicationSafetyWarning[] = [];
  const seen = new Set<string>();

  const siblings = ctx?.siblingMedications?.filter(Boolean) ?? [];
  const unionTokens = collectTokensAcross([med, ...siblings]);

  if (med.isControlled === true) {
    pushDeduped(out, seen, { category: "CONTROLLED_SUBSTANCE", ruleId: "controlled_substance" });
  }

  for (const tok of OPIOID_TOKENS) {
    if (tokens.has(tok)) {
      pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_opioid" });
      pushDeduped(out, seen, { category: "SEDATION_RESPIRATORY_DEPRESSION", ruleId: "sedation_opioid" });
      break;
    }
  }

  for (const tok of BENZO_TOKENS) {
    if (tokens.has(tok)) {
      pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_sedative_hypnotic" });
      pushDeduped(out, seen, { category: "SEDATION_RESPIRATORY_DEPRESSION", ruleId: "sedation_benzodiazepine" });
      break;
    }
  }

  for (const tok of KETAMINE_TOKENS) {
    if (tokens.has(tok)) {
      pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_anesthetic" });
      pushDeduped(out, seen, { category: "SEDATION_RESPIRATORY_DEPRESSION", ruleId: "sedation_ketamine" });
      break;
    }
  }

  for (const tok of PROPOFOL_TOKENS) {
    if (tokens.has(tok)) {
      pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_anesthetic" });
      pushDeduped(out, seen, { category: "SEDATION_RESPIRATORY_DEPRESSION", ruleId: "sedation_propofol" });
      break;
    }
  }

  for (const tok of VASOPRESSOR_TOKENS) {
    if (!tokens.has(tok)) continue;
    // D4C.5B.3 — acetaminophen/paracetamol must not inherit false vasopressor class alerts
    // when therapeuticClass / aliases are mis-tagged.
    if (shouldSuppressFalseVasopressorAlertForAnalgesic(med)) break;
    pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_vasopressor" });
    pushDeduped(out, seen, { category: "VASOPRESSOR_HIGH_ALERT", ruleId: "vasopressor_pressor" });
    break;
  }

  for (const tok of ANTICOAG_TOKENS) {
    if (!tokens.has(tok)) continue;
    pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_anticoagulant" });
    const ruleId =
      tok === "warfarin"
        ? "anticoagulant_warfarin_class"
        : "anticoagulant_heparin_class";
    pushDeduped(out, seen, { category: "ANTICOAGULATION_HIGH_ALERT", ruleId });
    break;
  }

  if (hasPhrase(hay, "insulin") || tokens.has("insulin")) {
    pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_insulin" });
    pushDeduped(out, seen, { category: "INSULIN_HIGH_ALERT", ruleId: "insulin_high_alert" });
  }

  for (const tok of HIGH_RISK_EXTRA) {
    if (tokens.has(tok)) {
      pushDeduped(out, seen, { category: "HIGH_RISK", ruleId: "high_risk_neuromuscular_or_electrolyte" });
      break;
    }
  }

  for (const pair of LASA_PAIRS) {
    if (!lasaPairPresent(unionTokens, pair.a, pair.b)) continue;
    const selfTok = tokensFromHaystack(hay);
    if (hasToken(selfTok, ...pair.a) || hasToken(selfTok, ...pair.b)) {
      pushDeduped(out, seen, { category: "LOOK_ALIKE_SOUND_ALIKE", ruleId: pair.ruleId });
    }
  }

  return out;
}

/** Categories that require an extra MAR “high-risk” acknowledgment in the client UI (S15C). Excludes CONTROLLED_SUBSTANCE (separate UI) and LOOK_ALIKE_SOUND_ALIKE. */
const MAR_HIGH_RISK_ACK_CATEGORIES = new Set<MedicationSafetyWarningCategory>([
  "HIGH_RISK",
  "INSULIN_HIGH_ALERT",
  "ANTICOAGULATION_HIGH_ALERT",
  "VASOPRESSOR_HIGH_ALERT",
  "SEDATION_RESPIRATORY_DEPRESSION",
]);

export function medicationWarningsRequireMarHighRiskAck(warnings: MedicationSafetyWarning[]): boolean {
  return warnings.some((w) => MAR_HIGH_RISK_ACK_CATEGORIES.has(w.category));
}
