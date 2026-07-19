/**
 * Runtime hard-acceptance probe using real MedicationCatalogService.search.
 * Usage: pnpm exec ts-node --transpile-only prisma/medications/runtime-remediation/probe-provider-search-hard-acceptance.ts
 */
import { PrismaClient } from "@prisma/client";
import { CatalogCanonicalReadService } from "../../../src/medication-master/catalog-canonical-read.service";
import { MedicationProductActivationGovernanceService } from "../../../src/medication-master/medication-product-activation-governance.service";
import { MedicationCatalogService } from "../../../src/medication-catalog/medication-catalog.service";
import type { PrismaService } from "../../../src/prisma/prisma.service";

async function main() {
  const prisma = new PrismaClient() as unknown as PrismaService;
  const url = process.env.DATABASE_URL || "";
  const host = (url.match(/@([^:/]+)/) || [])[1] || "?";
  const db = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || "?";
  console.log(JSON.stringify({ host, database: db, isLocalhost: ["localhost", "127.0.0.1"].includes(host) }));

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
  console.log(JSON.stringify({ facilityIdPrefix: fac.id.slice(0, 8), facilityName: fac.name }));

  const canonical = new CatalogCanonicalReadService(prisma);
  const governance = new MedicationProductActivationGovernanceService(
    prisma,
    {} as never,
    {} as never
  );
  const service = new MedicationCatalogService(prisma, canonical, governance);

  for (const q of ["jard", "Jardiance", "Biktar", "Biktarvy", "bikt", "Empagliflozin"]) {
    const { items } = await service.search(fac.id, { q, limit: 40, purpose: "order" });
    const top = items.slice(0, 15).map((i) => ({
      label: i.label,
      code: i.code,
      strength: i.metadata?.strength ?? null,
      dosageForm: i.metadata?.dosageForm ?? null,
      route: i.metadata?.route ?? null,
    }));
    const strengths = [
      ...new Set(items.map((i) => (i.metadata?.strength || "").toLowerCase()).filter(Boolean)),
    ];
    console.log(JSON.stringify({ q, count: items.length, strengths, top }, null, 2));
  }

  await (prisma as unknown as PrismaClient).$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
