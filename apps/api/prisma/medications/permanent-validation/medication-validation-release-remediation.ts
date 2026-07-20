/**
 * Idempotent catalog/search remediation for permanent validation release gate.
 * APPLY adds verified brand/synonym aliases; cleans polluted Kayexalate aliases;
 * does not invent RxCUI/NDC or duplicate catalog rows.
 */
import { PrismaClient } from "@prisma/client";

export type RemediationMode = "AUDIT" | "DRY_RUN" | "APPLY" | "VERIFY";

export type AliasRepairSpec = {
  alias: string;
  /** Target generic must contain one of these (case-insensitive). */
  genericContainsAny: string[];
  /** When set, target generic must contain every token (combo products). */
  genericContainsAll?: string[];
  /** Optional preferred code substrings (prefer these rows when present). */
  preferCodeContains?: string[];
  /** Optional dosage/form hints to prefer (e.g. patch, rectal). */
  preferNameOrFormContains?: string[];
  maxTargets?: number;
};

/** Verified brand/synonym repairs from measured critical/full failures. */
export const VALIDATED_ALIAS_REPAIRS: AliasRepairSpec[] = [
  {
    alias: "duragesic",
    genericContainsAny: ["fentanyl"],
    preferNameOrFormContains: ["transdermal", "patch", "system"],
    maxTargets: 8,
  },
  {
    alias: "theo-dur",
    genericContainsAny: ["theophylline"],
    preferNameOrFormContains: ["extended", "er", "sr"],
    maxTargets: 8,
  },
  {
    alias: "principen",
    genericContainsAny: ["ampicillin"],
    maxTargets: 8,
  },
  {
    alias: "nydrazid",
    genericContainsAny: ["isoniazid"],
    maxTargets: 8,
  },
  {
    alias: "nucynta",
    genericContainsAny: ["tapentadol"],
    maxTargets: 8,
  },
  {
    alias: "erythropoietin",
    genericContainsAny: ["epoetin", "erythropoietin"],
    maxTargets: 8,
  },
  {
    alias: "canasa",
    genericContainsAny: ["mesalamine", "mesalazine"],
    preferNameOrFormContains: ["rectal", "suppositor", "canasa"],
    maxTargets: 8,
  },
  {
    alias: "vandazole",
    genericContainsAny: ["metronidazole"],
    preferNameOrFormContains: ["vaginal", "vandazole"],
    maxTargets: 8,
  },
  {
    alias: "diclofenac dr",
    genericContainsAny: ["diclofenac"],
    preferNameOrFormContains: ["delayed", "dr", "enteric"],
    maxTargets: 8,
  },
  {
    alias: "nicoderm",
    genericContainsAny: ["nicotine"],
    preferNameOrFormContains: ["transdermal", "patch"],
    maxTargets: 8,
  },
  {
    alias: "nicotine transdermal system step 3",
    genericContainsAny: ["nicotine"],
    preferNameOrFormContains: ["transdermal", "patch"],
    maxTargets: 6,
  },
  {
    alias: "basaglar kwikpen",
    genericContainsAny: ["insulin glargine", "glargine"],
    preferNameOrFormContains: ["basaglar", "kwikpen", "glargine"],
    maxTargets: 8,
  },
  {
    alias: "caverject impulse",
    genericContainsAny: ["alprostadil"],
    preferNameOrFormContains: ["caverject", "intracavern"],
    maxTargets: 8,
  },
  {
    alias: "kayexalate",
    genericContainsAny: ["polystyrene sulfonate", "polystyrene"],
    preferCodeContains: ["kayexalate", "polystyrene_sulfonate", "polystyrene"],
    maxTargets: 8,
  },
  {
    alias: "amoxicillin clavulanate",
    genericContainsAny: ["amoxicillin"],
    genericContainsAll: ["amoxicillin", "clavulan"],
    preferNameOrFormContains: ["amoxicillin", "clavulan", "augmentin"],
    maxTargets: 10,
  },
  {
    alias: "sacubitril valsartan",
    genericContainsAny: ["sacubitril"],
    genericContainsAll: ["sacubitril", "valsartan"],
    preferNameOrFormContains: ["sacubitril", "entresto"],
    maxTargets: 8,
  },
  {
    alias: "zosyn",
    genericContainsAny: ["piperacillin"],
    genericContainsAll: ["piperacillin", "tazobactam"],
    preferNameOrFormContains: ["zosyn", "piperacillin"],
    maxTargets: 8,
  },
  {
    alias: "rocephin",
    genericContainsAny: ["ceftriaxone"],
    preferNameOrFormContains: ["rocephin", "ceftriaxone"],
    maxTargets: 8,
  },
  {
    alias: "levophed",
    genericContainsAny: ["norepinephrine", "noradrenaline"],
    preferNameOrFormContains: ["levophed", "norepinephrine"],
    maxTargets: 8,
  },
  {
    alias: "asacol",
    genericContainsAny: ["mesalamine", "mesalazine"],
    preferNameOrFormContains: ["asacol", "mesalamine"],
    maxTargets: 8,
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function genericMatches(genericName: string | null | undefined, needles: string[]): boolean {
  const g = norm(genericName || "");
  return needles.some((n) => g.includes(norm(n)));
}

function scoreTarget(
  row: {
    code: string;
    name: string;
    genericName: string | null;
    dosageForm: string | null;
    searchText: string | null;
  },
  spec: AliasRepairSpec
): number {
  let score = 0;
  const hay = `${row.code} ${row.name} ${row.genericName || ""} ${row.dosageForm || ""} ${row.searchText || ""}`.toLowerCase();
  for (const p of spec.preferCodeContains || []) {
    if (row.code.toLowerCase().includes(p.toLowerCase())) score += 5;
  }
  for (const p of spec.preferNameOrFormContains || []) {
    if (hay.includes(p.toLowerCase())) score += 3;
  }
  if (genericMatches(row.genericName, spec.genericContainsAny)) score += 1;
  return score;
}

/** Remove combo aliases attached to wrong single-ingredient / other-combo rows. */
export async function cleanupPollutedComboAliases(
  prisma: PrismaClient,
  dryRun: boolean
): Promise<{ deletedAliases: number }> {
  const specs: Array<{ alias: string; requireAll?: string[]; requireAny?: string[] }> = [
    { alias: "sacubitril valsartan", requireAll: ["sacubitril", "valsartan"] },
    { alias: "amoxicillin clavulanate", requireAll: ["amoxicillin", "clavulan"] },
    { alias: "zosyn", requireAny: ["piperacillin", "tazobactam"] },
    { alias: "rocephin", requireAny: ["ceftriaxone"] },
    { alias: "levophed", requireAny: ["norepinephrine", "noradrenaline"] },
    { alias: "asacol", requireAny: ["mesalamine", "mesalazine"] },
    { alias: "biktarvy", requireAny: ["bictegravir"] },
  ];
  let deletedAliases = 0;
  for (const spec of specs) {
    const rows = await prisma.medicationAlias.findMany({
      where: { alias: { equals: spec.alias, mode: "insensitive" } },
      select: {
        id: true,
        catalogMedication: { select: { genericName: true } },
      },
    });
    const badIds = rows
      .filter((r) => {
        const g = norm(r.catalogMedication.genericName || "");
        if (spec.requireAll?.length) {
          return !spec.requireAll.every((t) => g.includes(norm(t)));
        }
        if (spec.requireAny?.length) {
          return !spec.requireAny.some((t) => g.includes(norm(t)));
        }
        return false;
      })
      .map((r) => r.id);
    if (badIds.length === 0) continue;
    if (!dryRun) {
      const res = await prisma.medicationAlias.deleteMany({ where: { id: { in: badIds } } });
      deletedAliases += res.count;
    } else {
      deletedAliases += badIds.length;
    }
  }
  return { deletedAliases };
}

/** Strip cocktail protocol brand tokens from unrelated searchText rows. */
export async function cleanupPollutedBrandSearchText(
  prisma: PrismaClient,
  dryRun: boolean
): Promise<{ searchTextCleaned: number }> {
  const specs: Array<{ token: string; keepIfGenericAny: string[] }> = [
    { token: "rocephin", keepIfGenericAny: ["ceftriaxone"] },
    { token: "zosyn", keepIfGenericAny: ["piperacillin", "tazobactam"] },
    { token: "levophed", keepIfGenericAny: ["norepinephrine", "noradrenaline"] },
    { token: "asacol", keepIfGenericAny: ["mesalamine", "mesalazine"] },
    { token: "biktarvy", keepIfGenericAny: ["bictegravir"] },
    { token: "augmentin", keepIfGenericAny: ["amoxicillin"] },
    { token: "entresto", keepIfGenericAny: ["sacubitril"] },
  ];
  let searchTextCleaned = 0;
  for (const spec of specs) {
    const dirty = await prisma.catalogMedication.findMany({
      where: {
        searchText: { contains: spec.token, mode: "insensitive" },
        NOT: {
          OR: spec.keepIfGenericAny.map((g) => ({
            genericName: { contains: g, mode: "insensitive" as const },
          })),
        },
      },
      select: { id: true, searchText: true },
    });
    for (const row of dirty) {
      const re = new RegExp(`\\b${spec.token}\\b`, "gi");
      const next = (row.searchText || "").replace(re, " ").replace(/\s+/g, " ").trim();
      if (next === (row.searchText || "").trim()) continue;
      searchTextCleaned += 1;
      if (!dryRun) {
        await prisma.catalogMedication.update({
          where: { id: row.id },
          data: { searchText: next.slice(0, 2000) },
        });
      }
    }
  }
  return { searchTextCleaned };
}

export async function cleanupPollutedKayexalateAliases(
  prisma: PrismaClient,
  dryRun: boolean
): Promise<{ deletedAliases: number; searchTextCleaned: number }> {
  const polluted = await prisma.medicationAlias.findMany({
    where: {
      alias: { equals: "kayexalate", mode: "insensitive" },
      NOT: {
        catalogMedication: {
          OR: [
            { genericName: { contains: "polystyrene", mode: "insensitive" } },
            { code: { contains: "kayexalate", mode: "insensitive" } },
            { name: { contains: "kayexalate", mode: "insensitive" } },
          ],
        },
      },
    },
    select: { id: true, catalogMedicationId: true },
  });

  let deletedAliases = 0;
  if (!dryRun && polluted.length > 0) {
    const res = await prisma.medicationAlias.deleteMany({
      where: { id: { in: polluted.map((p) => p.id) } },
    });
    deletedAliases = res.count;
  } else {
    deletedAliases = polluted.length;
  }

  const dirtySearch = await prisma.catalogMedication.findMany({
    where: {
      searchText: { contains: "kayexalate", mode: "insensitive" },
      NOT: {
        OR: [
          { genericName: { contains: "polystyrene", mode: "insensitive" } },
          { code: { contains: "kayexalate", mode: "insensitive" } },
          { name: { contains: "kayexalate", mode: "insensitive" } },
        ],
      },
    },
    select: { id: true, searchText: true },
  });

  let searchTextCleaned = 0;
  for (const row of dirtySearch) {
    const next = (row.searchText || "")
      .replace(/\bkayexalate\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (next === (row.searchText || "").trim()) continue;
    searchTextCleaned += 1;
    if (!dryRun) {
      await prisma.catalogMedication.update({
        where: { id: row.id },
        data: { searchText: next.slice(0, 2000) },
      });
    }
  }

  return { deletedAliases, searchTextCleaned };
}

export async function applyValidatedAliasRepairs(
  prisma: PrismaClient,
  dryRun: boolean
): Promise<{
  aliasesCreated: number;
  aliasesSkipped: number;
  searchTextUpdated: number;
  familiesTouched: number;
  conflicts: number;
}> {
  let aliasesCreated = 0;
  let aliasesSkipped = 0;
  let searchTextUpdated = 0;
  let familiesTouched = 0;
  let conflicts = 0;

  const catalog = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      genericName: true,
      dosageForm: true,
      searchText: true,
    },
    orderBy: [{ code: "asc" }],
  });

  const existing = await prisma.medicationAlias.findMany({
    select: { catalogMedicationId: true, alias: true },
  });
  const aliasSet = new Set(existing.map((a) => `${a.catalogMedicationId}|${norm(a.alias)}`));

  for (const spec of VALIDATED_ALIAS_REPAIRS) {
    const alias = norm(spec.alias);
    if (alias.length < 2) continue;
    let candidates = catalog.filter((r) => {
      if (!genericMatches(r.genericName, spec.genericContainsAny)) return false;
      if (spec.genericContainsAll?.length) {
        const g = norm(r.genericName || "");
        return spec.genericContainsAll.every((t) => g.includes(norm(t)));
      }
      return true;
    });
    if (candidates.length === 0) {
      conflicts += 1;
      continue;
    }
    candidates = candidates
      .map((r) => ({ r, score: scoreTarget(r, spec) }))
      .sort((a, b) => b.score - a.score || a.r.code.localeCompare(b.r.code))
      .map((x) => x.r)
      .slice(0, spec.maxTargets ?? 8);

    let touched = false;
    for (const row of candidates) {
      const key = `${row.id}|${alias}`;
      if (aliasSet.has(key)) {
        aliasesSkipped += 1;
      } else if (dryRun) {
        aliasesCreated += 1;
        aliasSet.add(key);
        touched = true;
      } else {
        try {
          await prisma.medicationAlias.create({
            data: {
              catalogMedicationId: row.id,
              alias,
              language: "en",
              isPrimary: false,
            },
          });
          aliasesCreated += 1;
          aliasSet.add(key);
          touched = true;
        } catch {
          aliasesSkipped += 1;
          aliasSet.add(key);
        }
      }

      const st = (row.searchText || "").toLowerCase();
      if (!st.includes(alias)) {
        const next = `${row.searchText || ""} ${alias}`.replace(/\s+/g, " ").trim().slice(0, 2000);
        searchTextUpdated += 1;
        touched = true;
        if (!dryRun) {
          await prisma.catalogMedication.update({
            where: { id: row.id },
            data: { searchText: next },
          });
          row.searchText = next;
        }
      }
    }
    if (touched) familiesTouched += 1;
  }

  return { aliasesCreated, aliasesSkipped, searchTextUpdated, familiesTouched, conflicts };
}

export async function runMedicationValidationReleaseRemediation(
  mode: RemediationMode
): Promise<Record<string, unknown>> {
  const prisma = new PrismaClient();
  const dryRun = mode !== "APPLY";
  try {
    const cleanup = await cleanupPollutedKayexalateAliases(prisma, dryRun);
    const comboCleanup = await cleanupPollutedComboAliases(prisma, dryRun);
    const brandSearchTextCleanup = await cleanupPollutedBrandSearchText(prisma, dryRun);
    const aliases = await applyValidatedAliasRepairs(prisma, dryRun);

    // Idempotency probe on APPLY: second pass should create zero aliases.
    let secondPassCreated = 0;
    if (mode === "APPLY" || mode === "VERIFY") {
      const again = await applyValidatedAliasRepairs(prisma, mode !== "APPLY");
      secondPassCreated = again.aliasesCreated;
    }

    return {
      mode,
      cleanup,
      comboCleanup,
      brandSearchTextCleanup,
      aliases,
      idempotency: {
        secondPassAliasesCreated: secondPassCreated,
        pass: mode === "AUDIT" || mode === "DRY_RUN" ? true : secondPassCreated === 0,
      },
      migrationRequired: false,
    };
  } finally {
    await prisma.$disconnect();
  }
}
