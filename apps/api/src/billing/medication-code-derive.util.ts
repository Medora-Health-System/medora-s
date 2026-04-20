/**
 * Narrow substance aliases (spelling / bilingual) — deterministic, not fuzzy search.
 * Extend only when the same international nonproprietary name is intended.
 */
function applyMedicationSubstanceSynonyms(genericName: string): string {
  let x = genericName.trim();
  if (!x) return x;
  x = x.replace(/\bondans[ée]tron\b/gi, "ondansetron");
  x = x.replace(/\bceftriaxone\b/gi, "ceftriaxone");
  x = x.replace(/\bmorphine\b/gi, "morphine");
  x = x.replace(
    /\b(aspirin|acetylsalicylic\s+acid|acide\s+acetylsalicylique|acide\s+acétylsalicylique)\b/gi,
    "aspirin"
  );
  return x;
}

/**
 * Must stay aligned with `prisma/helpers/seed-haiti-medication-catalog` — used at runtime
 * to retry BillingCatalog matching when `CatalogMedication.code` and derived key differ.
 *
 * Phase 4.9: stable catalog `code` should be matched first by callers; this derives a seed-aligned
 * key from generic/strength/form/route when catalog code alone does not match BillingCatalog.
 */
export function deriveMedicationCodeForBilling(row: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  const rawGeneric = applyMedicationSubstanceSynonyms(row.genericName?.trim() ?? "");
  if (!rawGeneric) return "";

  const generic = rawGeneric
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s*[/／]\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  const strength = (row.strength ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\//g, "_PER_")
    .replace(/,/g, "")
    .replace(/[^A-Z0-9_.]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "0";

  const formMap: Record<string, string> = {
    "comprimé": "COMPRIME",
    "gélule": "CAPSULE",
    capsule: "CAPSULE",
    "suspension buvable": "SUSPENSION_BUVABLE",
    sirop: "SIROP",
    suppositoire: "SUPPOSITOIRE",
    injectable: "INJECTABLE",
    perfusion: "PERFUSION",
    "crème": "CREME",
    pommade: "POMMADE",
    lotion: "LOTION",
    ovule: "OVULE",
    shampooing: "SHAMPOOING",
    inhalateur: "INHALATEUR",
    "solution de nébulisation": "SOLUTION_NEBULISATION",
    collyre: "COLLYRE",
    "pommade ophtalmique": "POMMADE_OPHTALMIQUE",
    "spray nasal": "SPRAY_NASAL",
    "poudre pour solution buvable": "POUDRE_SOLUTION_BUVABLE",
    "comprimé dispersible": "COMPRIME_DISPERSIBLE",
  };
  const formRaw = (row.dosageForm ?? "comprimé").trim().toLowerCase() || "comprimé";
  const form = formMap[formRaw] ?? formRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  const routeMap: Record<string, string> = {
    orale: "ORAL",
    oral: "ORAL",
    injectable: "INJECTION",
    "injectable-intramusculaire": "INTRAMUSCULAR",
    intramusculaire: "INTRAMUSCULAR",
    intraveineuse: "INTRAVENOUS",
    rectale: "RECTAL",
    topique: "TOPICAL",
    vaginale: "VAGINAL",
    ophtalmique: "OPHTHALMIC",
    nasale: "NASAL",
    "sous-cutanée": "SUBCUTANEOUS",
    "sous-cutanee": "SUBCUTANEOUS",
    inhalée: "INHALATION",
    inhalee: "INHALATION",
  };
  const routeRaw = (row.route ?? "orale").trim().toLowerCase().normalize("NFD").replace(/\u0301/g, "").replace(/é/g, "e") || "orale";
  const route = routeMap[routeRaw] ?? routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  const parts = [generic, strength, form, route].filter(Boolean);
  return parts.join("_").replace(/_+/g, "_");
}

export type MedicationDeriveInput = {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
};

/**
 * Multiple deterministic derived keys for the same administration (combo products: try first substance only).
 */
export function collectMedicationDerivedBillingKeys(input: MedicationDeriveInput): string[] {
  const keys: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !keys.includes(t)) keys.push(t);
  };

  const primary = deriveMedicationCodeForBilling(input);
  if (primary) push(primary);

  const g = input.genericName?.trim() ?? "";
  if (!g) return keys;

  const splitCombo = /[+＋／/]/u;
  if (splitCombo.test(g)) {
    const first = g.split(splitCombo)[0]?.trim();
    if (first && first.length > 0 && first !== g) {
      push(
        deriveMedicationCodeForBilling({
          ...input,
          genericName: first,
        })
      );
    }
  }

  return keys;
}

export type MedicationMarLookupInput = {
  /** CatalogMedication.code when present — highest priority. */
  catalogMedicationCode: string | null;
  orderManualLabel: string | null;
  medicationLabelSnapshot: string | null;
  deriveInput: MedicationDeriveInput | null;
};

/**
 * Ordered distinct lookup strings for MAR billing: catalog code → derived generic keys → manual labels.
 * Each string is passed to `mapMedicationToBillingCode` (which applies catalog expansion internally).
 */
export function collectMedicationMarLookupOrder(input: MedicationMarLookupInput): string[] {
  const keys: string[] = [];
  const push = (s: string | null | undefined) => {
    const t = s?.trim();
    if (t && !keys.includes(t)) keys.push(t);
  };

  push(input.catalogMedicationCode);

  if (input.deriveInput?.genericName?.trim()) {
    for (const k of collectMedicationDerivedBillingKeys(input.deriveInput)) {
      push(k);
    }
  }

  push(input.orderManualLabel);
  push(input.medicationLabelSnapshot);

  return keys;
}
