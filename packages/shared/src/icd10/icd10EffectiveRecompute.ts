/**
 * Bounded effective-winner planning for ICD-10-CM clinician preferred labels.
 * Ranking is delegated to pickRankedEligibleClinicianLabel — do not add a second algorithm.
 */

import { pickRankedEligibleClinicianLabel } from "./icd10DisplayResolver.js";
import type { Icd10TerminologyDisplayRow } from "./icd10TerminologyTypes.js";

export type Icd10EffectiveIdentity = {
  codeSystem: string;
  releaseVersion: string;
  code: string;
  locale: string;
};

/** Identities per fetch/clear/set batch. Keeps IN-lists and transactions bounded. */
export const ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE = 250;

export function icd10EffectiveIdentityKey(identity: Icd10EffectiveIdentity): string {
  return `${identity.codeSystem}|${identity.releaseVersion}|${identity.code}|${identity.locale}`;
}

export function uniqueIcd10EffectiveIdentities(
  identities: readonly Icd10EffectiveIdentity[],
): Icd10EffectiveIdentity[] {
  const seen = new Set<string>();
  const out: Icd10EffectiveIdentity[] = [];
  for (const identity of identities) {
    const key = icd10EffectiveIdentityKey(identity);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      codeSystem: identity.codeSystem,
      releaseVersion: identity.releaseVersion,
      code: identity.code,
      locale: identity.locale,
    });
  }
  return out;
}

export type Icd10EffectiveIdentityGroup = {
  codeSystem: string;
  releaseVersion: string;
  locale: string;
  codes: string[];
};

/**
 * Group unique identities by release+locale, then chunk codes.
 * A batch never mixes releases or locales, so clears cannot touch unrelated winners.
 */
export function chunkIcd10EffectiveIdentityGroups(
  identities: readonly Icd10EffectiveIdentity[],
  batchSize = ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
): Icd10EffectiveIdentityGroup[] {
  const size = Math.max(1, Math.floor(Number(batchSize)) || ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE);
  const unique = uniqueIcd10EffectiveIdentities(identities);
  const grouped = new Map<string, Icd10EffectiveIdentityGroup>();
  for (const identity of unique) {
    const groupKey = `${identity.codeSystem}|${identity.releaseVersion}|${identity.locale}`;
    const existing = grouped.get(groupKey);
    if (existing) existing.codes.push(identity.code);
    else {
      grouped.set(groupKey, {
        codeSystem: identity.codeSystem,
        releaseVersion: identity.releaseVersion,
        locale: identity.locale,
        codes: [identity.code],
      });
    }
  }
  const batches: Icd10EffectiveIdentityGroup[] = [];
  for (const group of grouped.values()) {
    for (let i = 0; i < group.codes.length; i += size) {
      batches.push({
        codeSystem: group.codeSystem,
        releaseVersion: group.releaseVersion,
        locale: group.locale,
        codes: group.codes.slice(i, i + size),
      });
    }
  }
  return batches;
}

export function groupIcd10TerminologyRowsByEffectiveIdentity(
  rows: readonly Icd10TerminologyDisplayRow[],
): Map<string, Icd10TerminologyDisplayRow[]> {
  const grouped = new Map<string, Icd10TerminologyDisplayRow[]>();
  for (const row of rows) {
    const key = icd10EffectiveIdentityKey(row);
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

/**
 * Canonical winner map: one pickRankedEligibleClinicianLabel call per identity group.
 * Identities with no eligible row map to null (clear effective, set none).
 */
export function planIcd10EffectiveClinicianWinners(
  rows: readonly Icd10TerminologyDisplayRow[],
): Map<string, Icd10TerminologyDisplayRow | null> {
  const winners = new Map<string, Icd10TerminologyDisplayRow | null>();
  for (const [key, group] of groupIcd10TerminologyRowsByEffectiveIdentity(rows)) {
    winners.set(key, pickRankedEligibleClinicianLabel(group));
  }
  return winners;
}

export type Icd10EffectiveRecomputeStats = {
  identityCount: number;
  batchSize: number;
  batchCount: number;
  selectOperations: number;
  clearOperations: number;
  setOperations: number;
  winnerCount: number;
  winnerIds: string[];
  failedBatch: number | null;
};

export function emptyIcd10EffectiveRecomputeStats(
  identityCount: number,
  batchSize: number,
): Icd10EffectiveRecomputeStats {
  return {
    identityCount,
    batchSize,
    batchCount: 0,
    selectOperations: 0,
    clearOperations: 0,
    setOperations: 0,
    winnerCount: 0,
    winnerIds: [],
    failedBatch: null,
  };
}
