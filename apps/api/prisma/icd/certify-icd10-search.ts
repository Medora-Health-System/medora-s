/**
 * Diagnosis search certification against the imported active ICD catalog.
 * Mirrors clinical query expansion used by Icd10CatalogService.
 */
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
    if (!report.pass) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
