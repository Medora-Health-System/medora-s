import { pickRankedEligibleClinicianLabel, type Icd10TerminologyDisplayRow } from "@medora/shared";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type Icd10EffectiveIdentity = {
  codeSystem: string;
  releaseVersion: string;
  code: string;
  locale: string;
};

function toDisplayRow(row: {
  id: string;
  codeSystem: string;
  releaseVersion: string;
  code: string;
  locale: string;
  preferredLabel: string;
  labelRegister: Icd10TerminologyDisplayRow["labelRegister"];
  provenance: Icd10TerminologyDisplayRow["provenance"];
  exactness: Icd10TerminologyDisplayRow["exactness"];
  status: Icd10TerminologyDisplayRow["status"];
  sourceId: string;
  terminologyVersion: string;
  sourcePriority: number;
  isEffective: boolean;
}): Icd10TerminologyDisplayRow {
  return row;
}

/**
 * Atomically recompute the single effective CLINICIAN_PREFERRED display row.
 * Clears all flags first, then sets the ranked winner — never two/zero after commit
 * when at least one eligible row exists.
 */
export async function recomputeIcd10EffectiveClinicianLabel(
  tx: Tx,
  identity: Icd10EffectiveIdentity,
): Promise<{ effectiveId: string | null }> {
  const rows = await tx.icd10DiagnosisTerminology.findMany({
    where: {
      codeSystem: identity.codeSystem,
      releaseVersion: identity.releaseVersion,
      code: identity.code,
      locale: identity.locale,
      labelRegister: "CLINICIAN_PREFERRED",
    },
  });
  const winner = pickRankedEligibleClinicianLabel(rows.map(toDisplayRow));
  await tx.icd10DiagnosisTerminology.updateMany({
    where: {
      codeSystem: identity.codeSystem,
      releaseVersion: identity.releaseVersion,
      code: identity.code,
      locale: identity.locale,
      labelRegister: "CLINICIAN_PREFERRED",
    },
    data: { isEffective: false },
  });
  if (!winner?.id) return { effectiveId: null };
  await tx.icd10DiagnosisTerminology.update({
    where: { id: winner.id },
    data: { isEffective: true },
  });
  return { effectiveId: winner.id };
}

export async function recomputeIcd10EffectiveClinicianLabels(
  tx: Tx,
  identities: readonly Icd10EffectiveIdentity[],
): Promise<void> {
  const seen = new Set<string>();
  for (const identity of identities) {
    const key = `${identity.codeSystem}|${identity.releaseVersion}|${identity.code}|${identity.locale}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await recomputeIcd10EffectiveClinicianLabel(tx, identity);
  }
}
