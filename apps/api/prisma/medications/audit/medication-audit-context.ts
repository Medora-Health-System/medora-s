/**
 * Shared audit context loader — DB first, seed fallback.
 */
import { PrismaClient } from "@prisma/client";
import {
  buildCatalogInventoryArtifact,
  buildCatalogMetricsSnapshot,
  type CatalogMetricsSnapshot,
} from "./medication-catalog-metrics";
import { detectCatalogDuplicateGroups } from "./medication-identifier-audit";
import { runAllSearchProbes } from "./medication-search-probes";
import { type AuditConfidence, type AuditDataSource, ensureAuditEnvLoaded } from "./medication-audit-types";

export type MedicationAuditContext = {
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  metrics: CatalogMetricsSnapshot;
  dbError?: string;
  duplicateGroups: Awaited<ReturnType<typeof detectCatalogDuplicateGroups>>;
  searchProbes: Awaited<ReturnType<typeof runAllSearchProbes>>;
};

async function loadFromDatabase(): Promise<MedicationAuditContext | null> {
  ensureAuditEnvLoaded();
  if (!process.env.DATABASE_URL) return null;
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const metrics = await buildCatalogMetricsSnapshot(prisma, {
      dataSource: "database",
      confidence: "HIGH",
    });
    const duplicateGroups = await detectCatalogDuplicateGroups(prisma);
    let searchProbes: Awaited<ReturnType<typeof runAllSearchProbes>> = [];
    let dbError: string | undefined;
    try {
      searchProbes = await runAllSearchProbes(prisma);
    } catch (probeErr) {
      dbError = probeErr instanceof Error ? probeErr.message : String(probeErr);
      searchProbes = await runAllSearchProbes(null);
    }
    return {
      dataSource: "database",
      confidence: "HIGH",
      metrics,
      duplicateGroups,
      searchProbes,
      dbError,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const metrics = await buildCatalogMetricsSnapshot(null, {
      dataSource: "seed_files_only",
      confidence: "MEDIUM",
      dbError: message,
    });
    return {
      dataSource: "seed_files_only",
      confidence: "MEDIUM",
      metrics,
      dbError: message,
      duplicateGroups: await detectCatalogDuplicateGroups(null),
      searchProbes: await runAllSearchProbes(null),
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

export async function loadMedicationAuditContext(): Promise<MedicationAuditContext> {
  const fromDb = await loadFromDatabase();
  if (fromDb) return fromDb;

  const metrics = await buildCatalogMetricsSnapshot(null, {
    dataSource: "seed_files_only",
    confidence: "MEDIUM",
    dbError: "DATABASE_URL not configured",
  });
  return {
    dataSource: "seed_files_only",
    confidence: "MEDIUM",
    metrics,
    dbError: "DATABASE_URL not configured",
    duplicateGroups: await detectCatalogDuplicateGroups(null),
    searchProbes: await runAllSearchProbes(null),
  };
}

export { buildCatalogInventoryArtifact };
