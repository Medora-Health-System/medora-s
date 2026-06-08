import { z } from "zod";

/**
 * M1.8B.6 — canonical medication frequency vocabulary (shared API + Web).
 * Reference catalog only — no persistence, schedule expansion, or MAR wiring in this phase.
 */

export const MEDICATION_FREQUENCY_CATALOG_VERSION = 1 as const;

/** Immutable frequency codes for hospital-grade scheduling (M1.8B.6+). */
export const MEDICATION_FREQUENCY_CODES = [
  "ONCE",
  "NOW",
  "STAT",
  "DAILY",
  "BID",
  "TID",
  "QID",
  "Q2H",
  "Q3H",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "Q24H",
  "WEEKLY",
  "MONTHLY",
  "PRN",
  "AC",
  "PC",
  "HS",
  "ACHS",
  "CONTINUOUS",
  "TAPER",
] as const;

export type MedicationFrequencyCode = (typeof MEDICATION_FREQUENCY_CODES)[number];

export const medicationFrequencyCodeSchema = z.enum(MEDICATION_FREQUENCY_CODES);

/** High-level grouping for order-entry UX and policy resolution. */
export const MEDICATION_FREQUENCY_CATEGORIES = [
  "IMMEDIATE",
  "SINGLE_DOSE",
  "FIXED_DAILY",
  "INTERVAL",
  "MEAL_ANCHORED",
  "MEAL_COMPOSITE",
  "ON_DEMAND",
  "CALENDAR",
  "CONTINUOUS",
  "TAPER",
] as const;

export type MedicationFrequencyCategory = (typeof MEDICATION_FREQUENCY_CATEGORIES)[number];

/**
 * Dispatch key for future ScheduleExpansionService (M1.8B.7).
 * Catalog entries must not embed expansion logic — strategy is declarative only.
 */
export const MEDICATION_FREQUENCY_EXPANSION_STRATEGIES = [
  "SINGLE_IMMEDIATE",
  "SINGLE_SCHEDULED",
  "FIXED_DAILY_CLOCK",
  "INTERVAL_FROM_ANCHOR",
  "MEAL_ANCHORED",
  "MEAL_COMPOSITE",
  "ON_DEMAND",
  "CALENDAR_WEEKLY",
  "CALENDAR_MONTHLY",
  "CONTINUOUS_INFUSION",
  "TAPER_STEP",
] as const;

export type MedicationFrequencyExpansionStrategy =
  (typeof MEDICATION_FREQUENCY_EXPANSION_STRATEGIES)[number];

export const MEDICATION_FREQUENCY_MEAL_ANCHORS = [
  "NONE",
  "AC",
  "PC",
  "HS",
  "ACHS_COMPOSITE",
] as const;

export type MedicationFrequencyMealAnchor = (typeof MEDICATION_FREQUENCY_MEAL_ANCHORS)[number];

export type MedicationFrequencyDefinition = {
  readonly code: MedicationFrequencyCode;
  readonly displayNameEn: string;
  readonly displayNameFr: string;
  readonly clinicalMeaningEn: string;
  readonly clinicalMeaningFr: string;
  readonly category: MedicationFrequencyCategory;
  readonly expansionStrategy: MedicationFrequencyExpansionStrategy;
  /** Minutes between doses for interval-based frequencies; null when not interval-driven. */
  readonly intervalMinutes: number | null;
  /** Expected administrations per 24h when applicable; null for PRN, calendar, continuous, taper. */
  readonly dosesPerDay: number | null;
  readonly mealAnchor: MedicationFrequencyMealAnchor;
  /** True when an interval frequency may carry a PRN modifier (e.g. Q6H PRN). */
  readonly prnModifierAllowed: boolean;
  /** True when compatible with STAT order priority semantics. */
  readonly statCompatible: boolean;
  readonly sortOrder: number;
  readonly catalogVersion: typeof MEDICATION_FREQUENCY_CATALOG_VERSION;
};

export const MEDICATION_FREQUENCY_CATALOG: readonly MedicationFrequencyDefinition[] = [
  {
    code: "ONCE",
    displayNameEn: "Once",
    displayNameFr: "Une fois",
    clinicalMeaningEn: "Single dose at a specified time or at order placement.",
    clinicalMeaningFr: "Dose unique à l'heure prévue ou à la commande.",
    category: "SINGLE_DOSE",
    expansionStrategy: "SINGLE_SCHEDULED",
    intervalMinutes: null,
    dosesPerDay: 1,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 10,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "NOW",
    displayNameEn: "Now",
    displayNameFr: "Maintenant",
    clinicalMeaningEn: "Administer immediately upon order (routine urgency).",
    clinicalMeaningFr: "Administrer immédiatement à la commande (urgence routinière).",
    category: "IMMEDIATE",
    expansionStrategy: "SINGLE_IMMEDIATE",
    intervalMinutes: null,
    dosesPerDay: 1,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: true,
    sortOrder: 20,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "STAT",
    displayNameEn: "STAT",
    displayNameFr: "STAT",
    clinicalMeaningEn: "Immediate life-sustaining dose; highest clinical urgency.",
    clinicalMeaningFr: "Dose immédiate vitale; urgence clinique maximale.",
    category: "IMMEDIATE",
    expansionStrategy: "SINGLE_IMMEDIATE",
    intervalMinutes: null,
    dosesPerDay: 1,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: true,
    sortOrder: 30,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "DAILY",
    displayNameEn: "Daily",
    displayNameFr: "Quotidien",
    clinicalMeaningEn: "Once daily at facility default clock time.",
    clinicalMeaningFr: "Une fois par jour à l'heure par défaut de l'établissement.",
    category: "FIXED_DAILY",
    expansionStrategy: "FIXED_DAILY_CLOCK",
    intervalMinutes: 1440,
    dosesPerDay: 1,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 40,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "BID",
    displayNameEn: "BID (twice daily)",
    displayNameFr: "BID (deux fois par jour)",
    clinicalMeaningEn: "Two doses per 24 hours at facility default clock times.",
    clinicalMeaningFr: "Deux doses par 24 h aux heures par défaut de l'établissement.",
    category: "FIXED_DAILY",
    expansionStrategy: "FIXED_DAILY_CLOCK",
    intervalMinutes: null,
    dosesPerDay: 2,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 50,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "TID",
    displayNameEn: "TID (three times daily)",
    displayNameFr: "TID (trois fois par jour)",
    clinicalMeaningEn: "Three doses per 24 hours at facility default clock times.",
    clinicalMeaningFr: "Trois doses par 24 h aux heures par défaut de l'établissement.",
    category: "FIXED_DAILY",
    expansionStrategy: "FIXED_DAILY_CLOCK",
    intervalMinutes: null,
    dosesPerDay: 3,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 60,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "QID",
    displayNameEn: "QID (four times daily)",
    displayNameFr: "QID (quatre fois par jour)",
    clinicalMeaningEn: "Four doses per 24 hours at facility default clock times.",
    clinicalMeaningFr: "Quatre doses par 24 h aux heures par défaut de l'établissement.",
    category: "FIXED_DAILY",
    expansionStrategy: "FIXED_DAILY_CLOCK",
    intervalMinutes: null,
    dosesPerDay: 4,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 70,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q2H",
    displayNameEn: "Every 2 hours",
    displayNameFr: "Toutes les 2 heures",
    clinicalMeaningEn: "Dose every 2 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 2 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 120,
    dosesPerDay: 12,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 80,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q3H",
    displayNameEn: "Every 3 hours",
    displayNameFr: "Toutes les 3 heures",
    clinicalMeaningEn: "Dose every 3 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 3 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 180,
    dosesPerDay: 8,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 90,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q4H",
    displayNameEn: "Every 4 hours",
    displayNameFr: "Toutes les 4 heures",
    clinicalMeaningEn: "Dose every 4 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 4 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 240,
    dosesPerDay: 6,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 100,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q6H",
    displayNameEn: "Every 6 hours",
    displayNameFr: "Toutes les 6 heures",
    clinicalMeaningEn: "Dose every 6 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 6 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 360,
    dosesPerDay: 4,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 110,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q8H",
    displayNameEn: "Every 8 hours",
    displayNameFr: "Toutes les 8 heures",
    clinicalMeaningEn: "Dose every 8 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 8 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 480,
    dosesPerDay: 3,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 120,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q12H",
    displayNameEn: "Every 12 hours",
    displayNameFr: "Toutes les 12 heures",
    clinicalMeaningEn: "Dose every 12 hours from schedule anchor.",
    clinicalMeaningFr: "Dose toutes les 12 h à partir de l'ancre de planification.",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 720,
    dosesPerDay: 2,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 130,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "Q24H",
    displayNameEn: "Every 24 hours",
    displayNameFr: "Toutes les 24 heures",
    clinicalMeaningEn: "Dose every 24 hours from schedule anchor (interval-driven daily).",
    clinicalMeaningFr: "Dose toutes les 24 h à partir de l'ancre (quotidien par intervalle).",
    category: "INTERVAL",
    expansionStrategy: "INTERVAL_FROM_ANCHOR",
    intervalMinutes: 1440,
    dosesPerDay: 1,
    mealAnchor: "NONE",
    prnModifierAllowed: true,
    statCompatible: false,
    sortOrder: 140,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "WEEKLY",
    displayNameEn: "Weekly",
    displayNameFr: "Hebdomadaire",
    clinicalMeaningEn: "Once per week on a specified day.",
    clinicalMeaningFr: "Une fois par semaine à un jour précis.",
    category: "CALENDAR",
    expansionStrategy: "CALENDAR_WEEKLY",
    intervalMinutes: null,
    dosesPerDay: null,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 150,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "MONTHLY",
    displayNameEn: "Monthly",
    displayNameFr: "Mensuel",
    clinicalMeaningEn: "Once per month on a specified day.",
    clinicalMeaningFr: "Une fois par mois à un jour précis.",
    category: "CALENDAR",
    expansionStrategy: "CALENDAR_MONTHLY",
    intervalMinutes: null,
    dosesPerDay: null,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 160,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "PRN",
    displayNameEn: "PRN (as needed)",
    displayNameFr: "PRN (selon besoin)",
    clinicalMeaningEn: "Nurse-initiated when clinical indication is met; not standing scheduled.",
    clinicalMeaningFr: "À l'initiative de l'infirmière selon l'indication clinique; non planifié.",
    category: "ON_DEMAND",
    expansionStrategy: "ON_DEMAND",
    intervalMinutes: null,
    dosesPerDay: null,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 170,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "AC",
    displayNameEn: "Before meals (AC)",
    displayNameFr: "Avant les repas (AC)",
    clinicalMeaningEn: "Before each meal (breakfast, lunch, dinner) per facility meal schedule.",
    clinicalMeaningFr: "Avant chaque repas selon l'horaire de l'établissement.",
    category: "MEAL_ANCHORED",
    expansionStrategy: "MEAL_ANCHORED",
    intervalMinutes: null,
    dosesPerDay: 3,
    mealAnchor: "AC",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 180,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "PC",
    displayNameEn: "After meals (PC)",
    displayNameFr: "Après les repas (PC)",
    clinicalMeaningEn: "After each meal (breakfast, lunch, dinner) per facility meal schedule.",
    clinicalMeaningFr: "Après chaque repas selon l'horaire de l'établissement.",
    category: "MEAL_ANCHORED",
    expansionStrategy: "MEAL_ANCHORED",
    intervalMinutes: null,
    dosesPerDay: 3,
    mealAnchor: "PC",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 190,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "HS",
    displayNameEn: "At bedtime (HS)",
    displayNameFr: "Au coucher (HS)",
    clinicalMeaningEn: "At hour of sleep per facility bedtime anchor.",
    clinicalMeaningFr: "À l'heure du coucher selon l'établissement.",
    category: "MEAL_ANCHORED",
    expansionStrategy: "MEAL_ANCHORED",
    intervalMinutes: null,
    dosesPerDay: 1,
    mealAnchor: "HS",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 200,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "ACHS",
    displayNameEn: "Before meals and at bedtime (ACHS)",
    displayNameFr: "Avant les repas et au coucher (ACHS)",
    clinicalMeaningEn: "Before breakfast, lunch, and dinner plus at bedtime (3 AC + 1 HS).",
    clinicalMeaningFr: "Avant chaque repas et au coucher (3 AC + 1 HS).",
    category: "MEAL_COMPOSITE",
    expansionStrategy: "MEAL_COMPOSITE",
    intervalMinutes: null,
    dosesPerDay: 4,
    mealAnchor: "ACHS_COMPOSITE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 210,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "CONTINUOUS",
    displayNameEn: "Continuous infusion",
    displayNameFr: "Perfusion continue",
    clinicalMeaningEn: "Continuous IV infusion until stopped; uses infusion START/STOP lifecycle.",
    clinicalMeaningFr: "Perfusion IV continue jusqu'à arrêt; cycle DÉMARRER/ARRÊTER.",
    category: "CONTINUOUS",
    expansionStrategy: "CONTINUOUS_INFUSION",
    intervalMinutes: null,
    dosesPerDay: null,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 220,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
  {
    code: "TAPER",
    displayNameEn: "Taper",
    displayNameFr: "Décroissance (taper)",
    clinicalMeaningEn: "Stepwise dose or frequency reduction over time (future taper table).",
    clinicalMeaningFr: "Réduction progressive de dose ou de fréquence (table de taper future).",
    category: "TAPER",
    expansionStrategy: "TAPER_STEP",
    intervalMinutes: null,
    dosesPerDay: null,
    mealAnchor: "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    sortOrder: 230,
    catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
  },
] as const;

export const MEDICATION_FREQUENCY_CATALOG_EXPECTED_COUNT = MEDICATION_FREQUENCY_CODES.length;

export const MEDICATION_FREQUENCY_BY_CODE: Readonly<
  Record<MedicationFrequencyCode, MedicationFrequencyDefinition>
> = Object.freeze(
  MEDICATION_FREQUENCY_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.code] = entry;
      return acc;
    },
    {} as Record<MedicationFrequencyCode, MedicationFrequencyDefinition>
  )
);

export function isMedicationFrequencyCode(raw: string | null | undefined): raw is MedicationFrequencyCode {
  if (raw == null || typeof raw !== "string") return false;
  const t = raw.trim().toUpperCase();
  return medicationFrequencyCodeSchema.safeParse(t).success;
}

export function parseMedicationFrequencyCode(
  raw: string | null | undefined
): MedicationFrequencyCode | null {
  if (!isMedicationFrequencyCode(raw)) return null;
  return raw.trim().toUpperCase() as MedicationFrequencyCode;
}

export function getMedicationFrequencyDefinition(
  code: MedicationFrequencyCode | string | null | undefined
): MedicationFrequencyDefinition | null {
  const parsed = parseMedicationFrequencyCode(
    typeof code === "string" ? code : code == null ? null : String(code)
  );
  if (!parsed) return null;
  return MEDICATION_FREQUENCY_BY_CODE[parsed] ?? null;
}

/** ED-safe default when structured frequency is introduced behind a feature flag. */
export const MEDICATION_FREQUENCY_ED_DEFAULT_CODE: MedicationFrequencyCode = "NOW";

/** Frequencies suitable for ER administer-only order entry (future UI). */
export const MEDICATION_FREQUENCY_ER_PICKER_CODES: readonly MedicationFrequencyCode[] = [
  "NOW",
  "ONCE",
  "STAT",
  "PRN",
] as const;

/** True when future schedule expansion would produce standing scheduled instances. */
export function medicationFrequencyProducesScheduledInstances(
  code: MedicationFrequencyCode | string | null | undefined
): boolean {
  const def = getMedicationFrequencyDefinition(code);
  if (!def) return false;
  return def.expansionStrategy !== "ON_DEMAND" && def.expansionStrategy !== "CONTINUOUS_INFUSION";
}

/** True when frequency is compatible with existing infusion START/STOP MAR workflow. */
export function medicationFrequencyUsesInfusionLifecycle(
  code: MedicationFrequencyCode | string | null | undefined
): boolean {
  const def = getMedicationFrequencyDefinition(code);
  return def?.expansionStrategy === "CONTINUOUS_INFUSION";
}
