/**
 * Advanced medication safety — duplicate therapy, dose/route review hints,
 * and soft interaction/stacking awareness. Review-only; no blocking.
 */

import { medicationSafetyHaystack, type MedicationSafetyCatalogInput } from "./medicationSafetyWarnings.js";

export type AdvancedMedicationSafetySeverity = "info" | "warning" | "critical";

export type AdvancedMedicationSafetyCategory =
  | "DOSE_REVIEW"
  | "DUPLICATE_THERAPY"
  | "DUPLICATE_ACTIVE_MEDICATION"
  | "ROUTE_REVIEW"
  | "SEDATION_STACKING"
  | "OPIOID_STACKING"
  | "ANTICOAGULATION_STACKING"
  | "INSULIN_REVIEW"
  | "INTERACTION_REVIEW";

export type AdvancedMedicationSafetyWarning = {
  severity: AdvancedMedicationSafetySeverity;
  category: AdvancedMedicationSafetyCategory;
  /** i18n leaf: `advancedMedicationSafety.<messageKey>` */
  messageKey: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

/** One medication line for evaluation (order basket, active encounter order, or MAR row). */
export type AdvancedMedicationSafetyLine = {
  lineKey: string;
  catalogItemId?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  code?: string | null;
  name?: string | null;
  displayName?: string | null;
  strength?: string | null;
  route?: string | null;
  dosageForm?: string | null;
  quantity?: number | null;
  notes?: string | null;
  manualLabel?: string | null;
  isControlled?: boolean | null;
  controlledSchedule?: string | null;
  commonAliases?: string[] | null;
};

export function advancedLineToMedicationSafetyCatalogInput(line: AdvancedMedicationSafetyLine): MedicationSafetyCatalogInput {
  return {
    code: line.code ?? undefined,
    name: line.name ?? undefined,
    displayName: line.displayName ?? undefined,
    genericName: line.genericName ?? undefined,
    therapeuticClass: line.therapeuticClass ?? undefined,
    commonAliases: line.commonAliases ?? undefined,
    isControlled: line.isControlled ?? undefined,
    controlledSchedule: line.controlledSchedule ?? undefined,
    strength: line.strength ?? undefined,
    route: line.route ?? undefined,
    manualLabel: line.manualLabel ?? undefined,
  };
}

export function mergeAdvancedMedicationLineWithDraft(
  base: AdvancedMedicationSafetyLine,
  draft: { strength?: string | null; route?: string | null; quantity?: number | null }
): AdvancedMedicationSafetyLine {
  const s = draft.strength?.trim();
  const r = draft.route?.trim();
  const q = draft.quantity;
  return {
    ...base,
    ...(s ? { strength: s } : {}),
    ...(r ? { route: r } : {}),
    ...(q != null && Number.isFinite(q) ? { quantity: q } : {}),
  };
}

function hay(line: AdvancedMedicationSafetyLine): string {
  return medicationSafetyHaystack(advancedLineToMedicationSafetyCatalogInput(line));
}

function parseFirstNumericDose(text: string | null | undefined): number | null {
  if (text == null) return null;
  const s = String(text).trim();
  if (!s) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function doseDataPresent(line: AdvancedMedicationSafetyLine): boolean {
  const q = line.quantity;
  if (typeof q === "number" && Number.isFinite(q) && q > 0) return true;
  if (parseFirstNumericDose(line.strength) != null) return true;
  if (parseFirstNumericDose(line.notes) != null) return true;
  return false;
}

const OPIOID_TOKENS = ["morphine", "hydromorphone", "fentanyl", "oxycodone", "hydrocodone", "tramadol", "codeine", "methadone"] as const;
const BENZO_TOKENS = ["midazolam", "lorazepam", "diazepam", "alprazolam", "clonazepam"] as const;
const SEDATIVE_EXTRA_TOKENS = ["ketamine", "propofol", "dexmedetomidine"] as const;
const ANTICOAG_TOKENS = ["heparin", "enoxaparin", "warfarin", "dalteparin", "tinzaparin", "fondaparinux", "apixaban", "rivaroxaban", "dabigatran"] as const;
const NSAID_TOKENS = ["ibuprofen", "naproxen", "ketorolac", "diclofenac", "celecoxib", "meloxicam", "indomethacin", "piroxicam"] as const;
const ACE_ARB_TOKENS = [
  "lisinopril",
  "enalapril",
  "ramipril",
  "captopril",
  "quinapril",
  "fosinopril",
  "benazepril",
  "perindopril",
  "losartan",
  "valsartan",
  "candesartan",
  "irbesartan",
  "olmesartan",
  "telmisartan",
  "azilsartan",
] as const;
const SECRETAGOGUE_TOKENS = ["glipizide", "glyburide", "glibenclamide", "gliclazide", "glimepiride", "repaglinide", "nateglinide"] as const;

function hayHasAny(h: string, tokens: readonly string[]): boolean {
  const padded = ` ${h} `;
  for (const tok of tokens) {
    if (padded.includes(` ${tok} `)) return true;
  }
  return false;
}

function isOpioidLine(line: AdvancedMedicationSafetyLine): boolean {
  return hayHasAny(hay(line), OPIOID_TOKENS);
}

function isBenzoLine(line: AdvancedMedicationSafetyLine): boolean {
  return hayHasAny(hay(line), BENZO_TOKENS);
}

function isSedativeStackingLine(line: AdvancedMedicationSafetyLine): boolean {
  const h = hay(line);
  return isBenzoLine(line) || hayHasAny(h, SEDATIVE_EXTRA_TOKENS);
}

function isAnticoagLine(line: AdvancedMedicationSafetyLine): boolean {
  return hayHasAny(hay(line), ANTICOAG_TOKENS);
}

function isNsaidLine(line: AdvancedMedicationSafetyLine): boolean {
  const h = hay(line);
  if (hayHasAny(h, NSAID_TOKENS)) return true;
  if (h.includes(" aspirin ") || h.includes(" acetylsalicylic ")) return true;
  return false;
}

function isAceArbLine(line: AdvancedMedicationSafetyLine): boolean {
  return hayHasAny(hay(line), ACE_ARB_TOKENS);
}

function isPotassiumLine(line: AdvancedMedicationSafetyLine): boolean {
  const h = hay(line);
  return h.includes(" potassium ") || h.includes(" kcl ");
}

function isInsulinLine(line: AdvancedMedicationSafetyLine): boolean {
  const h = hay(line);
  return h.includes(" insulin ");
}

function isSecretagogueLine(line: AdvancedMedicationSafetyLine): boolean {
  return hayHasAny(hay(line), SECRETAGOGUE_TOKENS);
}

function isVasopressorLine(line: AdvancedMedicationSafetyLine): boolean {
  const h = hay(line);
  // D4C.5B.3 — do not treat acetaminophen/paracetamol as vasopressors via class mis-tags.
  if (
    h.includes(" acetaminophen ") ||
    h.includes(" paracetamol ") ||
    h.includes(" acetaminophene ")
  ) {
    const realPressor =
      h.includes(" norepinephrine ") ||
      h.includes(" epinephrine ") ||
      h.includes(" phenylephrine ") ||
      h.includes(" dopamine ") ||
      h.includes(" dobutamine ") ||
      h.includes(" vasopressin ") ||
      h.includes(" adrenaline ");
    if (!realPressor) return false;
  }
  const toks = [
    "norepinephrine",
    "epinephrine",
    "phenylephrine",
    "dopamine",
    "dobutamine",
    "vasopressin",
    "adrenaline",
  ] as const;
  return hayHasAny(h, toks);
}

function isHighRiskReviewMed(line: AdvancedMedicationSafetyLine): boolean {
  return (
    isOpioidLine(line) ||
    isBenzoLine(line) ||
    isSedativeStackingLine(line) ||
    isAnticoagLine(line) ||
    isInsulinLine(line) ||
    isVasopressorLine(line) ||
    isPotassiumLine(line)
  );
}

function therapeuticClassNormalized(tc: string | null | undefined): string {
  if (tc == null) return "";
  return tc
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHighRiskTherapeuticClassNorm(norm: string): boolean {
  if (!norm) return false;
  const analgesicFamily = norm.includes("acetaminophen") || norm.includes("paracetamol");
  const needles = [
    "anticoagul",
    "opioid",
    "insulin",
    "sedative",
    "benzodiazepin",
    "potassium",
    "thrombolyt",
    "antithrombot",
    "heparin",
    "analgesic opioid",
  ];
  // D4C.5B.3 — acetaminophen class tags must not inherit vasopressor high-risk.
  if (!analgesicFamily) {
    needles.push("vasopressor");
  }
  return needles.some((n) => norm.includes(n));
}

function genericNormalized(g: string | null | undefined): string {
  if (g == null) return "";
  return therapeuticClassNormalized(g);
}

function pushDedup(
  out: AdvancedMedicationSafetyWarning[],
  seen: Set<string>,
  w: AdvancedMedicationSafetyWarning
) {
  const key = `${w.category}:${w.messageKey}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(w);
}

export type AdvancedMedicationSafetyInput = {
  /** Lines in the current order basket (not yet on the server). */
  stagedLines: AdvancedMedicationSafetyLine[];
  /** Active medication order lines on the encounter (MAR-eligible / open). */
  activeEncounterLines: AdvancedMedicationSafetyLine[];
};

/**
 * Aggregate advanced safety warnings for staged + active medications.
 * Soft / review-only — callers must not block ordering on this result.
 */
export function computeAdvancedMedicationSafetyWarnings(input: AdvancedMedicationSafetyInput): AdvancedMedicationSafetyWarning[] {
  const staged = (input.stagedLines ?? []).filter((x) => x?.lineKey);
  const active = (input.activeEncounterLines ?? []).filter((x) => x?.lineKey);
  const union = [...staged, ...active];
  const out: AdvancedMedicationSafetyWarning[] = [];
  const seen = new Set<string>();

  const activeCatalogIds = new Set<string>();
  for (const a of active) {
    const id = typeof a.catalogItemId === "string" ? a.catalogItemId.trim() : "";
    if (id) activeCatalogIds.add(id);
  }

  // --- Duplicates: staged vs active catalog id
  for (const s of staged) {
    const cid = typeof s.catalogItemId === "string" ? s.catalogItemId.trim() : "";
    if (cid && activeCatalogIds.has(cid)) {
      pushDedup(out, seen, {
        severity: "warning",
        category: "DUPLICATE_ACTIVE_MEDICATION",
        messageKey: "duplicate_active_catalog",
        metadata: { catalogItemId: cid },
      });
    }
  }

  // --- Duplicates: two staged lines same catalog id
  const stagedCatalogCounts = new Map<string, number>();
  for (const s of staged) {
    const cid = typeof s.catalogItemId === "string" ? s.catalogItemId.trim() : "";
    if (!cid) continue;
    stagedCatalogCounts.set(cid, (stagedCatalogCounts.get(cid) ?? 0) + 1);
  }
  for (const [cid, n] of stagedCatalogCounts) {
    if (n >= 2) {
      pushDedup(out, seen, {
        severity: "warning",
        category: "DUPLICATE_THERAPY",
        messageKey: "duplicate_same_catalog_staged",
        metadata: { catalogItemId: cid, count: n },
      });
    }
  }

  // --- Same generic (staged vs staged, staged vs active, active vs active)
  const genericBuckets = new Map<string, number>();
  for (const line of union) {
    const g = genericNormalized(line.genericName);
    if (!g) continue;
    genericBuckets.set(g, (genericBuckets.get(g) ?? 0) + 1);
  }
  for (const [g, count] of genericBuckets) {
    if (count >= 2) {
      pushDedup(out, seen, {
        severity: "warning",
        category: "DUPLICATE_THERAPY",
        messageKey: "duplicate_generic_therapy",
        metadata: { genericKey: g, count },
      });
    }
  }

  // --- Same high-risk therapeutic class twice
  const classBuckets = new Map<string, number>();
  for (const line of union) {
    const tc = therapeuticClassNormalized(line.therapeuticClass);
    if (!tc || !isHighRiskTherapeuticClassNorm(tc)) continue;
    classBuckets.set(tc, (classBuckets.get(tc) ?? 0) + 1);
  }
  for (const [tc, count] of classBuckets) {
    if (count >= 2) {
      pushDedup(out, seen, {
        severity: "warning",
        category: "DUPLICATE_THERAPY",
        messageKey: "duplicate_high_risk_therapeutic_class",
        metadata: { therapeuticClassKey: tc, count },
      });
    }
  }

  // --- Dose / route review (per staged line — order basket or MAR primary line)
  for (const line of staged) {
    if (!isHighRiskReviewMed(line)) continue;

    const hasTextDoseHint =
      Boolean(line.strength?.trim()) || Boolean(line.notes?.trim()) || Boolean(line.manualLabel?.trim());
    if (!doseDataPresent(line)) {
      pushDedup(out, seen, {
        severity: hasTextDoseHint ? "info" : "warning",
        category: "DOSE_REVIEW",
        messageKey: hasTextDoseHint ? "dose_review_unparseable" : "dose_review_required_missing",
        metadata: { lineKey: line.lineKey },
      });
    }

    if (!(line.route?.trim())) {
      pushDedup(out, seen, {
        severity: "warning",
        category: "ROUTE_REVIEW",
        messageKey: "route_review_required",
        metadata: { lineKey: line.lineKey },
      });
    }

    const q = line.quantity;
    if (
      (isInsulinLine(line) || isOpioidLine(line) || isBenzoLine(line) || isVasopressorLine(line) || isAnticoagLine(line)) &&
      typeof q === "number" &&
      Number.isFinite(q) &&
      (q <= 0 || q >= 200 || (isInsulinLine(line) && q > 80))
    ) {
      pushDedup(out, seen, {
        severity: "info",
        category: "DOSE_REVIEW",
        messageKey: "dose_review_unusual_quantity",
        metadata: { lineKey: line.lineKey },
      });
    }
  }

  // --- MAR / single-line context: if only active lines passed (no staged), still run dose/route on each active when caller passes single line as staged — handled by caller passing staged=[current] and active=[siblings].

  // --- Stacking / interactions on union
  const opioidCount = union.filter(isOpioidLine).length;
  const benzoCount = union.filter(isBenzoLine).length;
  const sedativeStackCount = union.filter(isSedativeStackingLine).length;

  if (opioidCount >= 1 && benzoCount >= 1) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "OPIOID_STACKING",
      messageKey: "stacking_opioid_benzodiazepine",
      metadata: {},
    });
  }

  if (opioidCount >= 2) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "OPIOID_STACKING",
      messageKey: "stacking_multiple_opioids",
      metadata: { count: opioidCount },
    });
  }

  if (sedativeStackCount >= 2) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "SEDATION_STACKING",
      messageKey: "stacking_multiple_sedatives",
      metadata: { count: sedativeStackCount },
    });
  }

  if (union.some(isAnticoagLine) && union.some(isNsaidLine)) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "ANTICOAGULATION_STACKING",
      messageKey: "stacking_anticoagulant_nsaid",
      metadata: {},
    });
  }

  if (union.some(isPotassiumLine) && union.some(isAceArbLine)) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "INTERACTION_REVIEW",
      messageKey: "interaction_potassium_ace_arb",
      metadata: {},
    });
  }

  if (union.some(isInsulinLine) && union.some(isSecretagogueLine)) {
    pushDedup(out, seen, {
      severity: "warning",
      category: "INSULIN_REVIEW",
      messageKey: "interaction_insulin_secretagogue",
      metadata: {},
    });
  } else if (union.filter(isInsulinLine).length >= 2) {
    pushDedup(out, seen, {
      severity: "info",
      category: "INSULIN_REVIEW",
      messageKey: "insulin_multiple_review",
      metadata: { count: union.filter(isInsulinLine).length },
    });
  }

  return out;
}

/**
 * Evaluate a single line against sibling encounter lines (e.g. MAR administer preview).
 * `primaryLine` is the medication being acted on; `siblingEncounterLines` are other open MAR rows.
 */
export function computeAdvancedMedicationSafetyForSingleLine(input: {
  primaryLine: AdvancedMedicationSafetyLine;
  siblingEncounterLines: AdvancedMedicationSafetyLine[];
}): AdvancedMedicationSafetyWarning[] {
  return computeAdvancedMedicationSafetyWarnings({
    stagedLines: [input.primaryLine],
    activeEncounterLines: input.siblingEncounterLines,
  });
}
