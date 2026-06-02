/**
 * Deterministic CatalogMedication.code derivation (mirrors Haiti catalog seed).
 * Used for billing remediation manifests and validation — keep aligned with
 * `apps/api/prisma/helpers/seed-haiti-medication-catalog.ts`.
 */
export function deriveMedicationCatalogCode(row: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  const generic = row.genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  const strength =
    row.strength
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
  const formRaw = row.dosageForm.trim().toLowerCase();
  const form =
    formMap[formRaw] ?? formRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

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
  const routeRaw = row.route
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0301/g, "")
    .replace(/é/g, "e");
  const route =
    routeMap[routeRaw] ?? routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  const parts = [generic, strength, form, route].filter(Boolean);
  return parts.join("_").replace(/_+/g, "_");
}
