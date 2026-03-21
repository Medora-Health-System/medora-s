import { PrismaClient } from "@prisma/client";
import type { HaitiMedicationSeed } from "../data/haiti-medications";

/**
 * Derive a stable, deterministic code from genericName + strength + dosageForm + route.
 * Normalize to UPPERCASE_SNAKE_CASE for offline/sync consistency.
 */
export function deriveMedicationCode(row: {
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

  const strength = row.strength
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
  const routeRaw = row.route.trim().toLowerCase().normalize("NFD").replace(/\u0301/g, "").replace(/é/g, "e");
  const route = routeMap[routeRaw] ?? routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  const parts = [generic, strength, form, route].filter(Boolean);
  return parts.join("_").replace(/_+/g, "_");
}

function buildSearchText(row: HaitiMedicationSeed): string {
  const parts = [
    row.genericName,
    row.displayNameFr,
    row.strength,
    row.dosageForm,
    row.route,
    row.therapeuticClass,
    ...(row.commonAliases ?? []),
  ].filter(Boolean);
  return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function seedHaitiMedicationCatalog(
  prisma: PrismaClient,
  catalog: HaitiMedicationSeed[]
): Promise<Record<string, string>> {
  const codeToId: Record<string, string> = {};

  for (const row of catalog) {
    const code = row.code ?? deriveMedicationCode(row);
    const searchText = buildSearchText(row);

    const upsertBody = {
      name: row.displayNameFr || row.genericName,
      genericName: row.genericName,
      displayNameFr: row.displayNameFr,
      strength: row.strength || null,
      dosageForm: row.dosageForm || null,
      route: row.route || null,
      therapeuticClass: row.therapeuticClass || null,
      sortPriority: row.sortPriority ?? 0,
      isEssential: row.isEssential ?? false,
      isActive: row.isActive !== false,
      searchText,
    };

    const created = await prisma.catalogMedication.upsert({
      where: { code },
      update: upsertBody,
      create: { code, ...upsertBody },
    });
    codeToId[code] = created.id;

    for (const alias of row.commonAliases ?? []) {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) continue;
      await prisma.medicationAlias.upsert({
        where: {
          catalogMedicationId_alias: { catalogMedicationId: created.id, alias: normalized },
        },
        update: {},
        create: {
          catalogMedicationId: created.id,
          alias: normalized,
          language: "fr",
        },
      });
    }
  }

  return codeToId;
}
