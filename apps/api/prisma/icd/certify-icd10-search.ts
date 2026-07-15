/**
 * Diagnosis search certification against the imported active ICD catalog.
 * Mirrors clinical query expansion used by Icd10CatalogService.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveIcd10ClinicalQueryExpansion } from "../../src/diagnoses/icd10-clinical-query-expansion";

type SearchRow = {
  code: string;
  shortDescription: string;
  releaseVersion: string | null;
};

const REQUIRED_QUERIES: Array<{
  q: string;
  mustContainDescription?: string;
  mustMatchCodePrefix?: string;
}> = [
  { q: "Achilles tendon rupture", mustContainDescription: "Achilles" },
  { q: "Achilles laceration", mustContainDescription: "Achilles" },
  { q: "rotator cuff tear", mustContainDescription: "rotator cuff" },
  { q: "biceps tendon rupture", mustContainDescription: "biceps" },
  { q: "triceps tendon rupture", mustContainDescription: "triceps" },
  { q: "quadriceps tendon rupture", mustContainDescription: "quadriceps" },
  { q: "patellar tendon rupture", mustContainDescription: "quadriceps", mustMatchCodePrefix: "S76.1" },
  { q: "hamstring tendon injury", mustContainDescription: "post grp", mustMatchCodePrefix: "S76.3" },
  { q: "flexor tendon laceration", mustContainDescription: "flexor" },
  { q: "extensor tendon laceration", mustContainDescription: "extensor" },
  { q: "mallet finger", mustContainDescription: "mallet" },
  { q: "ACL tear", mustContainDescription: "anterior cruciate", mustMatchCodePrefix: "S83.51" },
  { q: "PCL tear", mustContainDescription: "posterior cruciate", mustMatchCodePrefix: "S83.52" },
  { q: "MCL tear", mustContainDescription: "medial collateral", mustMatchCodePrefix: "S83.41" },
  { q: "LCL tear", mustContainDescription: "lateral collateral", mustMatchCodePrefix: "S83.42" },
  { q: "high ankle sprain", mustContainDescription: "tibiofibular", mustMatchCodePrefix: "S93.43" },
  { q: "syndesmotic ligament injury", mustContainDescription: "tibiofibular" },
  { q: "thumb UCL tear", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "skier's thumb", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "gamekeeper's thumb", mustContainDescription: "thumb", mustMatchCodePrefix: "S63.64" },
  { q: "scapholunate ligament injury", mustMatchCodePrefix: "S63." },
  { q: "elbow UCL injury", mustContainDescription: "ulnar collateral" },
  // Crush / amputation / foreign body (Phase 4 production certification)
  { q: "crush injury", mustContainDescription: "crush" },
  { q: "crushed hand", mustContainDescription: "hand", mustMatchCodePrefix: "S67" },
  { q: "crushed finger", mustContainDescription: "finger", mustMatchCodePrefix: "S67" },
  { q: "crushed foot", mustContainDescription: "foot", mustMatchCodePrefix: "S97" },
  { q: "industrial crush injury", mustContainDescription: "crush" },
  { q: "prolonged compression", mustMatchCodePrefix: "T79.6" },
  { q: "degloving injury", mustContainDescription: "crush" },
  { q: "compartment syndrome after crush", mustMatchCodePrefix: "T79.6" },
  { q: "rhabdomyolysis after crush", mustMatchCodePrefix: "T79.6" },
  { q: "traumatic amputation", mustContainDescription: "amp" },
  { q: "partial amputation", mustContainDescription: "partial" },
  { q: "complete amputation", mustContainDescription: "complete" },
  { q: "severed finger", mustMatchCodePrefix: "S68" },
  { q: "finger cut off", mustMatchCodePrefix: "S68" },
  { q: "thumb cut off", mustContainDescription: "thmb", mustMatchCodePrefix: "S68" },
  { q: "toe cut off", mustContainDescription: "toe", mustMatchCodePrefix: "S98" },
  { q: "avulsed digit", mustMatchCodePrefix: "S68" },
  { q: "hand amputation", mustContainDescription: "hand", mustMatchCodePrefix: "S68" },
  { q: "foot amputation", mustContainDescription: "foot", mustMatchCodePrefix: "S98" },
  { q: "foreign body", mustContainDescription: "foreign body" },
  { q: "retained foreign body", mustContainDescription: "fb" },
  { q: "splinter", mustContainDescription: "foreign body" },
  { q: "glass in skin", mustContainDescription: "foreign body" },
  { q: "metal fragment", mustContainDescription: "foreign body" },
  { q: "needle fragment", mustContainDescription: "foreign body" },
  { q: "fishhook", mustContainDescription: "foreign body" },
  { q: "foreign body eye", mustMatchCodePrefix: "T15" },
  { q: "foreign body ear", mustMatchCodePrefix: "T16" },
  { q: "foreign body nose", mustMatchCodePrefix: "T17" },
  { q: "foreign body hand", mustContainDescription: "foreign body" },
  { q: "foreign body foot", mustContainDescription: "foreign body" },
  { q: "swallowed foreign body", mustMatchCodePrefix: "T18" },
  { q: "aspirated foreign body", mustMatchCodePrefix: "T17" },
  // Burn / inhalation / frostbite / electrical (Phase 5)
  { q: "burn", mustContainDescription: "burn" },
  { q: "thermal burn", mustContainDescription: "burn" },
  { q: "first-degree burn", mustContainDescription: "first degree" },
  { q: "second-degree burn", mustContainDescription: "second degree" },
  { q: "third-degree burn", mustContainDescription: "third degree" },
  { q: "superficial burn", mustContainDescription: "first degree" },
  { q: "partial-thickness burn", mustContainDescription: "second degree" },
  { q: "full-thickness burn", mustContainDescription: "third degree" },
  { q: "facial burn", mustMatchCodePrefix: "T20" },
  { q: "hand burn", mustMatchCodePrefix: "T23" },
  { q: "foot burn", mustMatchCodePrefix: "T25" },
  { q: "genital burn", mustContainDescription: "genital" },
  { q: "chemical burn", mustContainDescription: "corrosion" },
  { q: "acid burn", mustContainDescription: "corrosion" },
  { q: "alkali burn", mustContainDescription: "corrosion" },
  { q: "electrical burn", mustMatchCodePrefix: "T75" },
  { q: "lightning injury", mustMatchCodePrefix: "T75.0" },
  { q: "smoke inhalation", mustMatchCodePrefix: "T27" },
  { q: "inhalation injury", mustMatchCodePrefix: "T27" },
  { q: "airway burn", mustMatchCodePrefix: "T27" },
  { q: "frostbite", mustContainDescription: "frostbite" },
  { q: "cold injury", mustContainDescription: "frostbite" },
  { q: "sunburn", mustMatchCodePrefix: "L55" },
  { q: "scald", mustContainDescription: "burn" },
  { q: "grease burn", mustContainDescription: "burn" },
  { q: "steam burn", mustContainDescription: "burn" },
  // Penetrating trauma (Phase 6)
  { q: "gunshot wound", mustMatchCodePrefix: "S" },
  { q: "bullet wound", mustMatchCodePrefix: "S" },
  { q: "firearm injury", mustMatchCodePrefix: "S" },
  { q: "retained bullet", mustMatchCodePrefix: "S" },
  { q: "retained projectile", mustMatchCodePrefix: "S" },
  { q: "shotgun injury", mustMatchCodePrefix: "S" },
  { q: "pellet wound", mustMatchCodePrefix: "S" },
  { q: "BB gun injury", mustMatchCodePrefix: "S" },
  { q: "stab wound", mustMatchCodePrefix: "S" },
  { q: "knife wound", mustMatchCodePrefix: "S" },
  { q: "penetrating trauma", mustContainDescription: "wound" },
  { q: "penetrating wound", mustContainDescription: "wound" },
  { q: "puncture wound", mustContainDescription: "pnctr", mustMatchCodePrefix: "S" },
  { q: "impalement", mustMatchCodePrefix: "S" },
  { q: "through-and-through wound", mustMatchCodePrefix: "S" },
  { q: "penetrating chest wound", mustContainDescription: "thorax", mustMatchCodePrefix: "S21" },
  { q: "penetrating abdominal wound", mustContainDescription: "abd", mustMatchCodePrefix: "S31" },
  { q: "penetrating neck wound", mustContainDescription: "neck", mustMatchCodePrefix: "S11" },
  { q: "penetrating head wound", mustContainDescription: "scalp", mustMatchCodePrefix: "S01" },
  { q: "penetrating hand wound", mustContainDescription: "hand", mustMatchCodePrefix: "S61" },
  { q: "penetrating eye injury", mustMatchCodePrefix: "S05" },
  { q: "gunshot", mustMatchCodePrefix: "S" },
  { q: "firearm", mustMatchCodePrefix: "S" },
  { q: "bullet", mustMatchCodePrefix: "S" },
  { q: "stab", mustMatchCodePrefix: "S" },
  { q: "knife", mustMatchCodePrefix: "S" },
  // French aliases expand to English ICD search terms
  { q: "blessure par balle", mustMatchCodePrefix: "S" },
  { q: "plaie par balle", mustMatchCodePrefix: "S" },
  { q: "blessure par arme à feu", mustMatchCodePrefix: "S" },
  { q: "projectile retenu", mustMatchCodePrefix: "S" },
  { q: "plaie par arme blanche", mustMatchCodePrefix: "S" },
  { q: "coup de couteau", mustMatchCodePrefix: "S" },
  { q: "traumatisme pénétrant", mustContainDescription: "wound" },
  { q: "plaie pénétrante", mustContainDescription: "wound" },
  { q: "empalement", mustMatchCodePrefix: "S" },
  { q: "blessure thoracique pénétrante", mustMatchCodePrefix: "S21" },
  { q: "blessure abdominale pénétrante", mustMatchCodePrefix: "S31" },
  { q: "blessure cervicale pénétrante", mustMatchCodePrefix: "S11" },
  { q: "blessure oculaire pénétrante", mustMatchCodePrefix: "S05" },
];

function encounterChar(code: string): string {
  return code.replace(/\./g, "").slice(-1).toUpperCase();
}

function joinSqlOr(conditions: Prisma.Sql[]) {
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`${acc} OR ${condition}`;
  }, Prisma.empty);
}

async function searchCatalog(prisma: PrismaClient, q: string, take = 25): Promise<SearchRow[]> {
  const pattern = `%${q}%`;
  const lower = `%${q.toLowerCase()}%`;
  const expansion = resolveIcd10ClinicalQueryExpansion(q);
  const or: Prisma.Sql[] = [
    Prisma.sql`"shortDescription" ILIKE ${pattern}`,
    Prisma.sql`"longDescription" ILIKE ${pattern}`,
    Prisma.sql`"searchText" ILIKE ${lower}`,
  ];
  for (const phrase of expansion?.anyOf ?? []) {
    const p = `%${phrase}%`;
    const lp = `%${phrase.toLowerCase()}%`;
    or.push(Prisma.sql`"shortDescription" ILIKE ${p}`);
    or.push(Prisma.sql`"longDescription" ILIKE ${p}`);
    or.push(Prisma.sql`"searchText" ILIKE ${lp}`);
  }
  if (expansion?.allOf?.length) {
    const andParts = expansion.allOf.map((phrase) => {
      const p = `%${phrase}%`;
      const lp = `%${phrase.toLowerCase()}%`;
      return Prisma.sql`(
        "shortDescription" ILIKE ${p}
        OR "longDescription" ILIKE ${p}
        OR "searchText" ILIKE ${lp}
      )`;
    });
    or.push(andParts.reduce((acc, part, index) => (index === 0 ? part : Prisma.sql`${acc} AND ${part}`)));
  }
  const matchSql = joinSqlOr(or);
  return prisma.$queryRaw<SearchRow[]>`
    SELECT "code", "shortDescription", "releaseVersion"
    FROM "Icd10DiagnosisCode"
    WHERE "isActive" = TRUE
      AND "isSelectable" = TRUE
      AND (${matchSql})
    ORDER BY
      CASE WHEN "releaseVersion" LIKE '%DEV-SAMPLE%' THEN 1 ELSE 0 END ASC,
      "isBillable" DESC,
      CASE
        WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'A' THEN 0
        WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'D' THEN 1
        WHEN RIGHT(REPLACE("code", '.', ''), 1) = 'S' THEN 2
        ELSE 0
      END ASC,
      CASE
        WHEN "code" LIKE 'S%' OR "code" LIKE 'M66%' OR "code" LIKE 'M75%' THEN 0
        ELSE 1
      END ASC,
      LENGTH("shortDescription") ASC,
      "code" ASC
    LIMIT ${take};
  `;
}

async function main() {
  const prisma = new PrismaClient();
  const failures: string[] = [];
  try {
    for (const req of REQUIRED_QUERIES) {
      const rows = await searchCatalog(prisma, req.q);
      if (rows.length === 0) {
        failures.push(`No results for "${req.q}"`);
        continue;
      }
      if (req.mustContainDescription) {
        const needle = req.mustContainDescription.toLowerCase();
        const hit = rows.some((r) => r.shortDescription.toLowerCase().includes(needle));
        if (!hit) failures.push(`"${req.q}" missing description containing "${req.mustContainDescription}"`);
      }
      if (req.mustMatchCodePrefix) {
        const hit = rows.some((r) => r.code.startsWith(req.mustMatchCodePrefix!));
        if (!hit) {
          failures.push(
            `"${req.q}" missing code prefix ${req.mustMatchCodePrefix} (top=${rows[0]?.code ?? "none"})`,
          );
        }
      }
      const firstNonDev = rows.find((r) => !(r.releaseVersion ?? "").includes("DEV-SAMPLE")) ?? rows[0];
      const firstSequelaIdx = rows.findIndex((r) => encounterChar(r.code) === "S");
      const firstInitialIdx = rows.findIndex((r) => encounterChar(r.code) === "A");
      if (firstSequelaIdx === 0 && firstInitialIdx > 0) {
        failures.push(`"${req.q}" sequela dominates (first=${firstNonDev.code})`);
      }
      if (encounterChar(firstNonDev.code) === "S" && rows.some((r) => encounterChar(r.code) === "A")) {
        failures.push(`"${req.q}" ranked sequela before available initial encounter`);
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      queryCount: REQUIRED_QUERIES.length,
      failures,
      pass: failures.length === 0,
    };
    console.log(JSON.stringify(report, null, 2));
    const summaryDir = resolve(__dirname, "certification-summaries");
    mkdirSync(summaryDir, { recursive: true });
    writeFileSync(join(summaryDir, "fy2026-search-summary.json"), JSON.stringify(report, null, 2));
    const burnQueryCount = REQUIRED_QUERIES.filter((row) =>
      /burn|frostbite|inhalation|sunburn|scald|grease|steam|lightning|chemical|acid|alkali|electrical|airway|cold injury|genital|facial|hand burn|foot burn|circumferential|thermal|partial-thickness|full-thickness|first-degree|second-degree|third-degree|superficial burn/.test(
        row.q.toLowerCase()
      )
    ).length;
    writeFileSync(
      join(summaryDir, "fy2026-burn-search-summary.json"),
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          queryCount: burnQueryCount,
          failures: failures.filter((f) =>
            /burn|frostbite|inhalation|sunburn|scald|grease|steam|lightning|chemical|acid|alkali|electrical|airway|cold injury|genital|facial|hand burn|foot burn|thermal|partial|full-thickness|first-degree|second-degree|third-degree|superficial/.test(
              f.toLowerCase()
            )
          ),
          pass: failures.length === 0,
        },
        null,
        2
      )
    );
    const penetratingQueryPattern =
      /penetrating|gunshot|firearm|bullet|stab|knife|impalement|retained projectile|retained bullet|shotgun|pellet|bb gun|puncture|through-and-through|blessure par balle|plaie par balle|arme à feu|projectile retenu|arme blanche|coup de couteau|traumatisme pénétrant|plaie pénétrante|empalement|blessure thoracique|blessure abdominale|blessure cervicale|blessure oculaire/;
    const penetratingQueryCount = REQUIRED_QUERIES.filter((row) => penetratingQueryPattern.test(row.q)).length;
    const penetratingSummary = JSON.stringify(
      {
        generatedAt: report.generatedAt,
        queryCount: penetratingQueryCount,
        failures: failures.filter((failure) => penetratingQueryPattern.test(failure.toLowerCase())),
        pass: failures.filter((failure) => penetratingQueryPattern.test(failure.toLowerCase())).length === 0,
      },
      null,
      2
    );
    writeFileSync(join(summaryDir, "fy2026-penetrating-trauma-search-summary.json"), penetratingSummary);
    const releaseSummaryDir = join(summaryDir, "2026");
    mkdirSync(releaseSummaryDir, { recursive: true });
    writeFileSync(join(releaseSummaryDir, "fy2026-penetrating-trauma-search-summary.json"), penetratingSummary);
    if (!report.pass) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
