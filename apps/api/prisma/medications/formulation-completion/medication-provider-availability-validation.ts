/**
 * Provider-facing availability validation using the production search path
 * (MedicationCatalogService.search) — not a bypass validator.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  MEDICATION_PROVIDER_CLINICAL_CORPUS,
  listHardAcceptanceFamilies,
  type ProviderClinicalCorpusFamily,
} from "@medora/shared";
import { MedicationCatalogService } from "../../../src/medication-catalog/medication-catalog.service";
import { CatalogCanonicalReadService } from "../../../src/medication-master/catalog-canonical-read.service";
import { MedicationProductActivationGovernanceService } from "../../../src/medication-master/medication-product-activation-governance.service";
import { PrismaService } from "../../../src/prisma/prisma.service";

const OUT_DIR = resolve(__dirname, "../audit-summaries");

export type ProviderAvailabilityValidationReport = {
  generatedAt: string;
  facilityId: string;
  corpusSize: number;
  queryCount: number;
  searchPassed: number;
  searchFailed: number;
  searchPassRate: number;
  orderablePassed: number;
  orderableFailed: number;
  orderabilityPassRate: number;
  exactRankingPassed: number;
  exactRankingChecks: number;
  exactRankingPassRate: number;
  hardAcceptance: {
    pass: boolean;
    failures: Array<{ familyId: string; query: string; reason: string }>;
  };
  absentFamilies: string[];
  partialFamilies: string[];
  failedQueries: Array<{ query: string; familyId: string; reason: string }>;
  uiLimit: number;
};

function writeArtifact(name: string, payload: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

async function resolveFacilityId(prisma: PrismaClient): Promise<string> {
  const fac = await prisma.facility.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!fac) throw new Error("No active facility for provider availability validation");
  return fac.id;
}

function buildService(prisma: PrismaClient): MedicationCatalogService {
  const prismaService = prisma as unknown as PrismaService;
  const canonical = new CatalogCanonicalReadService(prismaService);
  // filterProviderSearchCatalogIds uses prisma only; explorer/audit unused on search path.
  const governance = new MedicationProductActivationGovernanceService(
    prismaService,
    {} as never,
    {} as never
  );
  return new MedicationCatalogService(prismaService, canonical, governance);
}

function familyQueries(family: ProviderClinicalCorpusFamily): string[] {
  return [...family.brandQueries, ...family.genericQueries].filter((q) => q.trim().length >= 2);
}

export async function runProviderAvailabilityValidation(
  prisma: PrismaClient,
  options: { limit?: number } = {}
): Promise<ProviderAvailabilityValidationReport> {
  const limit = options.limit ?? 40;
  const facilityId = await resolveFacilityId(prisma);
  const service = buildService(prisma);
  const failedQueries: ProviderAvailabilityValidationReport["failedQueries"] = [];
  const absentFamilies: string[] = [];
  const partialFamilies: string[] = [];
  const hardFailures: Array<{ familyId: string; query: string; reason: string }> = [];

  let searchPassed = 0;
  let searchFailed = 0;
  let orderablePassed = 0;
  let orderableFailed = 0;
  let exactRankingPassed = 0;
  let exactRankingChecks = 0;
  let queryCount = 0;

  for (const family of MEDICATION_PROVIDER_CLINICAL_CORPUS) {
    const queries = familyQueries(family);
    let familyHit = false;
    let familyStrengthOk = true;

    for (const query of queries) {
      queryCount += 1;
      const { items } = await service.search(facilityId, {
        q: query,
        limit,
        purpose: "order",
      });
      if (items.length === 0) {
        searchFailed += 1;
        failedQueries.push({ query, familyId: family.id, reason: "NO_RESULTS" });
        if (family.hardAcceptance) {
          hardFailures.push({ familyId: family.id, query, reason: "NO_RESULTS" });
        }
        continue;
      }
      searchPassed += 1;
      familyHit = true;

      const orderable = items.filter(
        (i) =>
          Boolean(i.metadata?.strength?.trim()) &&
          Boolean(i.metadata?.dosageForm?.trim()) &&
          Boolean(i.metadata?.route?.trim())
      );
      if (orderable.length === 0) {
        orderableFailed += 1;
        failedQueries.push({ query, familyId: family.id, reason: "NOT_ORDERABLE_SHAPE" });
        if (family.hardAcceptance) {
          hardFailures.push({ familyId: family.id, query, reason: "NOT_ORDERABLE_SHAPE" });
        }
      } else {
        orderablePassed += 1;
      }

      if (family.requiredStrengthSubstrings?.length) {
        const blob = items
          .map((i) => `${i.metadata?.strength || ""} ${i.secondaryText || ""}`.toLowerCase())
          .join(" | ");
        const missing = family.requiredStrengthSubstrings.filter(
          (s) => !blob.includes(s.toLowerCase())
        );
        if (missing.length > 0) {
          familyStrengthOk = false;
          failedQueries.push({
            query,
            familyId: family.id,
            reason: `MISSING_STRENGTHS:${missing.join(",")}`,
          });
          if (family.hardAcceptance) {
            hardFailures.push({
              familyId: family.id,
              query,
              reason: `MISSING_STRENGTHS:${missing.join(",")}`,
            });
          }
        }
      }

      // Exact brand ranking: first result should relate to brand/generic family tokens.
      if (family.brandQueries.some((b) => b.toLowerCase() === query.toLowerCase())) {
        exactRankingChecks += 1;
        const top = items[0];
        const hay = [
          top?.displayNameEn,
          top?.displayNameFr,
          top?.name,
          top?.metadata?.genericName,
          top?.searchText,
          ...(top?.metadata?.commonAliases ?? []),
        ]
          .join(" ")
          .toLowerCase();
        const tokens = [
          ...family.brandQueries.map((b) => b.toLowerCase()),
          ...family.genericQueries.map((g) => g.toLowerCase().split(/\s+/)[0]!),
        ];
        const ok = tokens.some((t) => t.length >= 3 && hay.includes(t));
        if (ok) exactRankingPassed += 1;
        else {
          failedQueries.push({ query, familyId: family.id, reason: "RANKING_MISS" });
          if (family.hardAcceptance) {
            hardFailures.push({ familyId: family.id, query, reason: "RANKING_MISS" });
          }
        }
      }
    }

    if (!familyHit) absentFamilies.push(family.id);
    else if (!familyStrengthOk) partialFamilies.push(family.id);
  }

  // Hard acceptance jar ranking: tirzepatide must not outrank jardiance.
  {
    const { items } = await service.search(facilityId, { q: "jar", limit, purpose: "order" });
    const topHay = items
      .slice(0, 3)
      .map((i) =>
        [i.displayNameEn, i.metadata?.genericName, ...(i.metadata?.commonAliases ?? [])]
          .join(" ")
          .toLowerCase()
      )
      .join(" || ");
    const hasJardiance =
      topHay.includes("jardiance") || topHay.includes("empagliflozin");
    const tirzFirst =
      items[0] &&
      ((items[0].metadata?.genericName || "").toLowerCase().includes("tirzepatide") ||
        (items[0].displayNameEn || "").toLowerCase().includes("tirzepatide"));
    if (!hasJardiance || tirzFirst) {
      hardFailures.push({
        familyId: "jardiance",
        query: "jar",
        reason: tirzFirst ? "TIRZEPATIDE_OUTRANKS" : "JARDIANCE_NOT_IN_TOP",
      });
    }
  }

  const hardFamilies = listHardAcceptanceFamilies();
  for (const family of hardFamilies) {
    for (const query of familyQueries(family)) {
      const { items } = await service.search(facilityId, { q: query, limit, purpose: "order" });
      if (items.length === 0) {
        hardFailures.push({ familyId: family.id, query, reason: "HARD_NO_RESULTS" });
      }
    }
  }

  const uniqueHardFailures = [
    ...new Map(hardFailures.map((f) => [`${f.familyId}:${f.query}:${f.reason}`, f])).values(),
  ];

  const report: ProviderAvailabilityValidationReport = {
    generatedAt: new Date().toISOString(),
    facilityId,
    corpusSize: MEDICATION_PROVIDER_CLINICAL_CORPUS.length,
    queryCount,
    searchPassed,
    searchFailed,
    searchPassRate: queryCount > 0 ? searchPassed / queryCount : 0,
    orderablePassed,
    orderableFailed,
    orderabilityPassRate:
      orderablePassed + orderableFailed > 0
        ? orderablePassed / (orderablePassed + orderableFailed)
        : 0,
    exactRankingPassed,
    exactRankingChecks,
    exactRankingPassRate:
      exactRankingChecks > 0 ? exactRankingPassed / exactRankingChecks : 1,
    hardAcceptance: {
      pass: uniqueHardFailures.length === 0,
      failures: uniqueHardFailures,
    },
    absentFamilies: [...new Set(absentFamilies)].slice(0, 200),
    partialFamilies: [...new Set(partialFamilies)].slice(0, 200),
    failedQueries: failedQueries.slice(0, 400),
    uiLimit: limit,
  };

  writeArtifact("medication-provider-availability-validation.json", report);
  return report;
}

export function loadProviderAvailabilityValidationReport(): ProviderAvailabilityValidationReport | null {
  const path = resolve(OUT_DIR, "medication-provider-availability-validation.json");
  if (!existsSync(path)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return JSON.parse(require("node:fs").readFileSync(path, "utf8")) as ProviderAvailabilityValidationReport;
  } catch {
    return null;
  }
}
