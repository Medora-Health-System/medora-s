import {
  chunkIcd10EffectiveIdentityGroups,
  emptyIcd10EffectiveRecomputeStats,
  icd10EffectiveIdentityKey,
  ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
  planIcd10EffectiveClinicianWinners,
  uniqueIcd10EffectiveIdentities,
  type Icd10EffectiveIdentity,
  type Icd10EffectiveIdentityGroup,
  type Icd10EffectiveRecomputeStats,
  type Icd10TerminologyDisplayRow,
} from "@medora/shared";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type { Icd10EffectiveIdentity, Icd10EffectiveRecomputeStats };

export type Icd10EffectiveRecomputeRow = Icd10TerminologyDisplayRow & { id: string };

export type Icd10EffectiveRecomputeStore = {
  findClinicianPreferred(filter: Icd10EffectiveIdentityGroup): Promise<Icd10EffectiveRecomputeRow[]>;
  clearEffective(filter: Icd10EffectiveIdentityGroup): Promise<void>;
  setEffective(ids: readonly string[]): Promise<void>;
};

function toDisplayRow(row: Icd10EffectiveRecomputeRow): Icd10TerminologyDisplayRow {
  return row;
}

function assertSingleEffectivePerIdentity(rows: readonly Icd10EffectiveRecomputeRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.isEffective !== true || row.labelRegister !== "CLINICIAN_PREFERRED") continue;
    const key = icd10EffectiveIdentityKey(row);
    if (seen.has(key)) {
      throw new Error(`DUPLICATE_EFFECTIVE_CLINICIAN_LABEL: ${key}`);
    }
    seen.add(key);
  }
}

export function createInMemoryIcd10EffectiveRecomputeStore(
  seed: readonly Icd10EffectiveRecomputeRow[] = [],
): {
  store: Icd10EffectiveRecomputeStore;
  rows: Map<string, Icd10EffectiveRecomputeRow>;
  stats: { select: number; clear: number; set: number };
} {
  const rows = new Map(seed.map((row) => [row.id, { ...row }]));
  const stats = { select: 0, clear: 0, set: 0 };
  const codeSet = (filter: Icd10EffectiveIdentityGroup) => new Set(filter.codes);
  const store: Icd10EffectiveRecomputeStore = {
    async findClinicianPreferred(filter) {
      stats.select += 1;
      const codes = codeSet(filter);
      return [...rows.values()].filter(
        (row) =>
          row.codeSystem === filter.codeSystem &&
          row.releaseVersion === filter.releaseVersion &&
          row.locale === filter.locale &&
          codes.has(row.code) &&
          row.labelRegister === "CLINICIAN_PREFERRED",
      );
    },
    async clearEffective(filter) {
      stats.clear += 1;
      const codes = codeSet(filter);
      for (const row of rows.values()) {
        if (
          row.codeSystem === filter.codeSystem &&
          row.releaseVersion === filter.releaseVersion &&
          row.locale === filter.locale &&
          codes.has(row.code) &&
          row.labelRegister === "CLINICIAN_PREFERRED" &&
          row.isEffective === true
        ) {
          row.isEffective = false;
        }
      }
      assertSingleEffectivePerIdentity([...rows.values()]);
    },
    async setEffective(ids) {
      stats.set += 1;
      const idSet = new Set(ids);
      for (const row of rows.values()) {
        if (idSet.has(row.id)) row.isEffective = true;
      }
      assertSingleEffectivePerIdentity([...rows.values()]);
    },
  };
  return { store, rows, stats };
}

function createPrismaEffectiveRecomputeStore(tx: Tx): Icd10EffectiveRecomputeStore {
  return {
    async findClinicianPreferred(filter) {
      const found = await tx.icd10DiagnosisTerminology.findMany({
        where: {
          codeSystem: filter.codeSystem,
          releaseVersion: filter.releaseVersion,
          locale: filter.locale,
          code: { in: filter.codes },
          labelRegister: "CLINICIAN_PREFERRED",
        },
      });
      return found.map((row) => ({
        id: row.id,
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        code: row.code,
        locale: row.locale,
        preferredLabel: row.preferredLabel,
        labelRegister: row.labelRegister,
        provenance: row.provenance,
        exactness: row.exactness,
        status: row.status,
        sourceId: row.sourceId,
        terminologyVersion: row.terminologyVersion,
        sourcePriority: row.sourcePriority,
        isEffective: row.isEffective,
      }));
    },
    async clearEffective(filter) {
      await tx.icd10DiagnosisTerminology.updateMany({
        where: {
          codeSystem: filter.codeSystem,
          releaseVersion: filter.releaseVersion,
          locale: filter.locale,
          code: { in: filter.codes },
          labelRegister: "CLINICIAN_PREFERRED",
          isEffective: true,
        },
        data: { isEffective: false },
      });
    },
    async setEffective(ids) {
      if (ids.length === 0) return;
      await tx.icd10DiagnosisTerminology.updateMany({
        where: { id: { in: [...ids] } },
        data: { isEffective: true },
      });
    },
  };
}

function hasTransaction(tx: Tx): tx is PrismaClient {
  return typeof (tx as PrismaClient).$transaction === "function";
}

async function applyEffectiveBatch(
  store: Icd10EffectiveRecomputeStore,
  batch: Icd10EffectiveIdentityGroup,
): Promise<string[]> {
  const fetched = await store.findClinicianPreferred(batch);
  const winners = planIcd10EffectiveClinicianWinners(fetched.map(toDisplayRow));
  const winnerIds = [...winners.values()]
    .map((winner) => winner?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  // Clear first, then set — never two isEffective=true rows for one identity.
  await store.clearEffective(batch);
  if (winnerIds.length > 0) await store.setEffective(winnerIds);
  return winnerIds;
}

export type Icd10EffectiveRecomputeOptions = {
  batchSize?: number;
  store?: Icd10EffectiveRecomputeStore;
  onBatch?: (info: { index: number; total: number; size: number }) => void;
};

/**
 * Atomically recompute the single effective CLINICIAN_PREFERRED display row.
 * Clears effective flags for that identity, then sets the ranked winner.
 */
export async function recomputeIcd10EffectiveClinicianLabel(
  tx: Tx,
  identity: Icd10EffectiveIdentity,
): Promise<{ effectiveId: string | null }> {
  const stats = await recomputeIcd10EffectiveClinicianLabels(tx, [identity]);
  return { effectiveId: stats.winnerIds[0] ?? null };
}

/**
 * Bounded batched recompute. Groups by codeSystem/release/locale, fetches one
 * IN-list of codes per batch, ranks with pickRankedEligibleClinicianLabel, then
 * clear-then-set inside one transaction per batch when the caller is a PrismaClient.
 */
export async function recomputeIcd10EffectiveClinicianLabels(
  tx: Tx,
  identities: readonly Icd10EffectiveIdentity[],
  options?: Icd10EffectiveRecomputeOptions,
): Promise<Icd10EffectiveRecomputeStats> {
  const unique = uniqueIcd10EffectiveIdentities(identities);
  const batchSize = Math.max(
    1,
    Math.floor(Number(options?.batchSize)) || ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
  );
  const batches = chunkIcd10EffectiveIdentityGroups(unique, batchSize);
  const stats = emptyIcd10EffectiveRecomputeStats(unique.length, batchSize);
  stats.batchCount = batches.length;
  const injected = options?.store;
  const openOwnTransactions = injected == null && hasTransaction(tx);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i]!;
    options?.onBatch?.({ index: i + 1, total: batches.length, size: batch.codes.length });
    stats.failedBatch = i + 1;
    try {
      const run = async (client: Tx | Icd10EffectiveRecomputeStore) => {
        const store = injected ?? createPrismaEffectiveRecomputeStore(client as Tx);
        const winnerIds = await applyEffectiveBatch(store, batch);
        stats.selectOperations += 1;
        stats.clearOperations += 1;
        if (winnerIds.length > 0) stats.setOperations += 1;
        stats.winnerCount += winnerIds.length;
        stats.winnerIds.push(...winnerIds);
      };
      if (openOwnTransactions) {
        await (tx as PrismaClient).$transaction(async (inner) => run(inner), { timeout: 60_000 });
      } else {
        await run(tx);
      }
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      wrapped.message = `EFFECTIVE_RECOMPUTE_BATCH_${i + 1}_FAILED: ${wrapped.message}`;
      throw wrapped;
    }
  }
  stats.failedBatch = null;
  return stats;
}
