/**
 * Runtime clinical gap inventory using MedicationCatalogService.search
 * against the DATABASE_URL currently configured (local or production).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { MedicationCatalogService } from "../../../src/medication-catalog/medication-catalog.service";
import { CatalogCanonicalReadService } from "../../../src/medication-master/catalog-canonical-read.service";
import { MedicationProductActivationGovernanceService } from "../../../src/medication-master/medication-product-activation-governance.service";
import type { PrismaService } from "../../../src/prisma/prisma.service";
type RuntimeAvailabilityFamilyClass =
  | "AVAILABLE_COMPLETE"
  | "AVAILABLE_PARTIAL"
  | "EXISTS_BUT_HIDDEN"
  | "EXISTS_BUT_INACTIVE"
  | "EXISTS_BUT_NOT_ORDERABLE"
  | "ALIAS_MISSING"
  | "STRENGTH_MISSING"
  | "FORM_MISSING"
  | "ROUTE_MISSING"
  | "FACILITY_FILTERED"
  | "COMPLETELY_ABSENT"
  | "AMBIGUOUS"
  | "SOURCE_REQUIRED";

type InventoryFamily = {
  familyId: string;
  domain: string;
  queries: string[];
  expectedStrengthSubstrings?: string[];
};

async function main() {
  const prisma = new PrismaClient() as unknown as PrismaService;
  const url = process.env.DATABASE_URL || "";
  const host = (url.match(/@([^:/]+)/) || [])[1] || "?";
  const db = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || "?";

  const fac =
    (await (prisma as unknown as PrismaClient).facility.findFirst({
      where: { name: { contains: "Wayne", mode: "insensitive" }, isActive: true },
      select: { id: true, name: true },
    })) ||
    (await (prisma as unknown as PrismaClient).facility.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }));
  if (!fac) throw new Error("No facility");

  const inventory = JSON.parse(
    readFileSync(resolve(__dirname, "data/runtime-clinical-gap-inventory.json"), "utf8")
  ) as { families: InventoryFamily[] };

  const canonical = new CatalogCanonicalReadService(prisma);
  const governance = new MedicationProductActivationGovernanceService(
    prisma,
    {} as never,
    {} as never
  );
  const service = new MedicationCatalogService(prisma, canonical, governance);

  const counts: Record<RuntimeAvailabilityFamilyClass, number> = {
    AVAILABLE_COMPLETE: 0,
    AVAILABLE_PARTIAL: 0,
    EXISTS_BUT_HIDDEN: 0,
    EXISTS_BUT_INACTIVE: 0,
    EXISTS_BUT_NOT_ORDERABLE: 0,
    ALIAS_MISSING: 0,
    STRENGTH_MISSING: 0,
    FORM_MISSING: 0,
    ROUTE_MISSING: 0,
    FACILITY_FILTERED: 0,
    COMPLETELY_ABSENT: 0,
    AMBIGUOUS: 0,
    SOURCE_REQUIRED: 0,
  };

  const results: Array<Record<string, unknown>> = [];
  let searchPassed = 0;
  let orderablePassed = 0;

  for (const family of inventory.families) {
    let anyHit = false;
    let strengthBlob = "";
    let orderable = false;
    const perQuery: Array<Record<string, unknown>> = [];

    for (const q of family.queries) {
      const { items } = await service.search(fac.id, { q, limit: 40, purpose: "order" });
      const strengths = items.map((i) => i.metadata?.strength || "").filter(Boolean);
      strengthBlob += ` ${strengths.join(" ")}`;
      const ord = items.some(
        (i) =>
          Boolean(i.metadata?.strength?.trim()) &&
          Boolean(i.metadata?.dosageForm?.trim()) &&
          Boolean(i.metadata?.route?.trim())
      );
      if (items.length > 0) anyHit = true;
      if (ord) orderable = true;
      perQuery.push({
        q,
        count: items.length,
        strengths: [...new Set(strengths.map((s) => s.toLowerCase()))].slice(0, 12),
      });
    }

    const missingStrengths = (family.expectedStrengthSubstrings || []).filter(
      (s) => !strengthBlob.toLowerCase().includes(s.toLowerCase())
    );

    let classification: RuntimeAvailabilityFamilyClass;
    if (!anyHit) classification = "COMPLETELY_ABSENT";
    else if (!orderable) classification = "EXISTS_BUT_NOT_ORDERABLE";
    else if (missingStrengths.length > 0) classification = "STRENGTH_MISSING";
    else classification = "AVAILABLE_COMPLETE";

    counts[classification] += 1;
    if (anyHit) searchPassed += 1;
    if (orderable) orderablePassed += 1;

    results.push({
      familyId: family.familyId,
      domain: family.domain,
      classification,
      missingStrengths,
      perQuery,
    });
  }

  const n = inventory.families.length;
  const [catalogActive, aliasCount] = await Promise.all([
    (prisma as unknown as PrismaClient).catalogMedication.count({ where: { isActive: true } }),
    (prisma as unknown as PrismaClient).medicationAlias.count(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    database: db,
    isLocalhost: ["localhost", "127.0.0.1"].includes(host),
    facilityIdPrefix: fac.id.slice(0, 8),
    facilityName: fac.name,
    catalogActive,
    aliasCount,
    familyCount: n,
    searchPassRate: n ? searchPassed / n : 0,
    orderabilityPassRate: n ? orderablePassed / n : 0,
    classificationCounts: counts,
    completelyAbsentCount: counts.COMPLETELY_ABSENT,
    results,
  };

  const outDir = resolve(__dirname, "../audit-summaries");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "medication-runtime-clinical-gap-inventory.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    outPath,
    host,
    database: db,
    facilityName: fac.name,
    catalogActive,
    aliasCount,
    familyCount: n,
    searchPassRate: report.searchPassRate,
    orderabilityPassRate: report.orderabilityPassRate,
    classificationCounts: counts,
  }, null, 2));

  await (prisma as unknown as PrismaClient).$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
