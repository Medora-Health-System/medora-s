/**
 * Permanent medication validation runner — real MedicationCatalogService.search path.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  PERMANENT_MEDICATION_VALIDATION_SUITE_BENCHMARK_VERSION,
  PERMANENT_MEDICATION_VALIDATION_SUITE_PROGRAM_KEY,
  PERMANENT_MEDICATION_VALIDATION_SUITE_VERSION,
  buildPermanentCriticalBenchmark,
  formatPermanentValidationFailure,
  listPermanentHardAcceptanceBenchmark,
  validateFamilySearchResult,
  type PermanentBenchmarkFamily,
  type PermanentValidationFailure,
  type PermanentValidationSearchItem,
  type PermanentValidationTier,
} from "@medora/shared";
import { MedicationCatalogService } from "../../../src/medication-catalog/medication-catalog.service";
import { CatalogCanonicalReadService } from "../../../src/medication-master/catalog-canonical-read.service";
import { MedicationProductActivationGovernanceService } from "../../../src/medication-master/medication-product-activation-governance.service";
import type { PrismaService } from "../../../src/prisma/prisma.service";

const OUT_DIR = resolve(__dirname, "../audit-summaries");
const UNIVERSAL_BENCHMARK = resolve(
  __dirname,
  "../universal-completion/data/medora-universal-common-medication-benchmark.json"
);

function buildService(prisma: PrismaClient): MedicationCatalogService {
  const prismaService = prisma as unknown as PrismaService;
  const canonical = new CatalogCanonicalReadService(prismaService);
  const governance = new MedicationProductActivationGovernanceService(
    prismaService,
    {} as never,
    {} as never
  );
  return new MedicationCatalogService(prismaService, canonical, governance);
}

function redactHost(databaseUrl: string): { host: string; database: string; isLocalhost: boolean } {
  const host = (databaseUrl.match(/@([^:/]+)/) || [])[1] || "?";
  const database = (databaseUrl.match(/\/([^/?]+)(\?|$)/) || [])[1] || "?";
  return {
    host,
    database,
    isLocalhost: ["localhost", "127.0.0.1"].includes(host),
  };
}

function toSearchItem(i: {
  label?: string | null;
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  searchText?: string | null;
  metadata?: {
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
    genericName?: string | null;
  } | null;
}): PermanentValidationSearchItem {
  return {
    label: i.label,
    code: i.code,
    name: i.name,
    displayNameEn: i.displayNameEn,
    searchText: i.searchText,
    metadata: i.metadata,
  };
}

function loadFullBenchmarkFamilies(): PermanentBenchmarkFamily[] {
  if (!existsSync(UNIVERSAL_BENCHMARK)) return buildPermanentCriticalBenchmark();
  const raw = JSON.parse(readFileSync(UNIVERSAL_BENCHMARK, "utf8")) as {
    version?: string;
    families: Array<{
      familyId: string;
      genericName: string;
      domain?: string;
      brandQueries?: string[];
      genericQueries?: string[];
      expectedStrengthSubstrings?: string[];
    }>;
  };
  return raw.families.map((f) => {
    const brands = [...(f.brandQueries || [])];
    const generics = [...(f.genericQueries || []), f.genericName].filter(Boolean);
    return {
      benchmarkFamilyId: f.familyId,
      canonicalGenericName: f.genericName,
      commonBrandNames: brands,
      commonGenericNames: [...new Set(generics)],
      commonSearchTerms: [...brands, ...generics],
      expectedStrengths: [...(f.expectedStrengthSubstrings || [])].slice(0, 3),
      expectedOrderability: true,
      requiredForED: false,
      clinicalDomains: [f.domain || "GENERAL"],
      hardAcceptance: false,
      source: "MEDORA_UNIVERSAL_COMMON_MEDICATION_BENCHMARK",
      sourceVersion: raw.version || PERMANENT_MEDICATION_VALIDATION_SUITE_BENCHMARK_VERSION,
    };
  });
}

function familiesForTier(tier: PermanentValidationTier): PermanentBenchmarkFamily[] {
  if (tier === "deployment") return listPermanentHardAcceptanceBenchmark();
  if (tier === "critical") return buildPermanentCriticalBenchmark();
  return loadFullBenchmarkFamilies();
}

export async function runPermanentMedicationValidation(
  tier: PermanentValidationTier,
  options: { limit?: number; preferWayne?: boolean } = {}
): Promise<Record<string, unknown>> {
  const started = Date.now();
  const limit = options.limit ?? 40;
  const prisma = new PrismaClient();
  const envMeta = redactHost(process.env.DATABASE_URL || "");
  const service = buildService(prisma);

  const facility =
    (options.preferWayne !== false
      ? await prisma.facility.findFirst({
          where: { name: { contains: "Wayne", mode: "insensitive" }, isActive: true },
          select: { id: true, name: true },
        })
      : null) ||
    (await prisma.facility.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }));

  if (!facility) {
    await prisma.$disconnect();
    throw new Error("No active facility for permanent medication validation");
  }

  const families = familiesForTier(tier);
  const failures: PermanentValidationFailure[] = [];
  let queriesTested = 0;
  let queryPass = 0;
  let brandRankChecks = 0;
  let brandRankPass = 0;
  let genericRankChecks = 0;
  let genericRankPass = 0;
  let orderablePass = 0;
  let orderableChecks = 0;
  const latenciesMs: number[] = [];

  for (const family of families) {
    if (family.intentionalExclusion) continue;
    const queries = [...new Set(family.commonSearchTerms.filter((q) => q.trim().length >= 2))];
    for (const query of queries) {
      queriesTested += 1;
      const t0 = Date.now();
      const { items: rawItems } = await service.search(facility.id, {
        q: query,
        limit,
        purpose: "order",
      });
      latenciesMs.push(Date.now() - t0);
      const items = rawItems.map(toSearchItem);
      const failure = validateFamilySearchResult({ family, query, items });
      if (failure) {
        failures.push({
          ...failure,
          facilityName: facility.name,
          environmentHost: envMeta.host,
        });
      } else {
        queryPass += 1;
      }

      const orderable = items.some(
        (i) =>
          Boolean(i.metadata?.strength?.trim()) &&
          Boolean(i.metadata?.dosageForm?.trim()) &&
          Boolean(i.metadata?.route?.trim())
      );
      if (family.expectedOrderability) {
        orderableChecks += 1;
        if (orderable) orderablePass += 1;
      }

      const qLower = query.toLowerCase();
      if (family.commonBrandNames.some((b) => b.toLowerCase() === qLower)) {
        brandRankChecks += 1;
        if (!failure || failure.classification !== "HIDDEN_BY_RANKING") brandRankPass += 1;
      }
      if (family.canonicalGenericName.toLowerCase() === qLower) {
        genericRankChecks += 1;
        if (!failure || failure.classification !== "HIDDEN_BY_RANKING") genericRankPass += 1;
      }
    }
  }

  const [catalogActive, aliasCount] = await Promise.all([
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationAlias.count(),
  ]);

  latenciesMs.sort((a, b) => a - b);
  const p95 =
    latenciesMs.length > 0
      ? latenciesMs[Math.min(latenciesMs.length - 1, Math.floor(latenciesMs.length * 0.95))]!
      : 0;
  const avg =
    latenciesMs.length > 0
      ? latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length
      : 0;

  const byClass: Record<string, number> = {};
  for (const f of failures) {
    byClass[f.classification] = (byClass[f.classification] || 0) + 1;
  }

  const hardFamilies = families.filter((f) => f.hardAcceptance);
  const hardFailures = failures.filter((f) =>
    hardFamilies.some((h) => h.benchmarkFamilyId === f.familyId)
  );

  const report = {
    programKey: PERMANENT_MEDICATION_VALIDATION_SUITE_PROGRAM_KEY,
    suiteVersion: PERMANENT_MEDICATION_VALIDATION_SUITE_VERSION,
    benchmarkVersion: PERMANENT_MEDICATION_VALIDATION_SUITE_BENCHMARK_VERSION,
    tier,
    usedRealMedicationCatalogService: true,
    usedSnapshotBypass: false,
    environment: envMeta,
    facility: { idPrefix: facility.id.slice(0, 8), name: facility.name },
    catalogActive,
    aliasCount,
    familyCount: families.length,
    queriesTested,
    queryPass,
    searchPassRate: queriesTested > 0 ? queryPass / queriesTested : 0,
    orderabilityPassRate: orderableChecks > 0 ? orderablePass / orderableChecks : 1,
    exactBrandRankingPassRate: brandRankChecks > 0 ? brandRankPass / brandRankChecks : 1,
    exactGenericRankingPassRate: genericRankChecks > 0 ? genericRankPass / genericRankChecks : 1,
    hardAcceptancePass: hardFailures.length === 0,
    hardAcceptanceFailureCount: hardFailures.length,
    failureCountsByClassification: byClass,
    failures: failures.slice(0, 200).map((f) => ({
      ...f,
      formatted: formatPermanentValidationFailure(f),
    })),
    performance: {
      runtimeMs: Date.now() - started,
      avgSearchLatencyMs: Math.round(avg),
      p95SearchLatencyMs: p95,
      searchCalls: queriesTested,
    },
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    sourceChecksumSha256: createHash("sha256")
      .update(JSON.stringify({ tier, families: families.length, catalogActive }))
      .digest("hex"),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outName = `medication-permanent-validation-${tier}.json`;
  writeFileSync(resolve(OUT_DIR, outName), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(OUT_DIR, `medication-permanent-validation-${tier}.md`),
    [
      `# Permanent Medication Validation — ${tier}`,
      "",
      `Benchmark: ${report.benchmarkVersion}`,
      `Facility: ${facility.name}`,
      `Host: ${envMeta.host} (localhost=${envMeta.isLocalhost})`,
      `Families: ${families.length}`,
      `Queries: ${queriesTested}`,
      `Search pass rate: ${report.searchPassRate}`,
      `Orderability pass rate: ${report.orderabilityPassRate}`,
      `Hard acceptance: ${report.hardAcceptancePass ? "PASS" : "FAIL"}`,
      `Failures: ${failures.length}`,
      "",
      ...failures.slice(0, 30).map((f) => `## ${f.familyId}\n\n${formatPermanentValidationFailure(f)}\n`),
    ].join("\n"),
    "utf8"
  );

  await prisma.$disconnect();
  return report;
}

export function permanentValidationExitCode(report: Record<string, unknown>): number {
  if (report.hardAcceptancePass === false) return 1;
  const tier = String(report.tier || "");
  if (tier === "critical" || tier === "deployment") {
    // Critical/deployment: hard acceptance must pass; overall search rate floor.
    return Number(report.searchPassRate) >= 0.9 ? 0 : 1;
  }
  // Full suite: require high bar but allow documented review until production catalog is complete.
  return Number(report.searchPassRate) >= 0.85 && report.hardAcceptancePass === true ? 0 : 1;
}
