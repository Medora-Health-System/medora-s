/**
 * Phase 9 — safety-knowledge duplicate detection (not patient medication evaluation).
 */
import type { PrismaClient } from "@prisma/client";
import {
  buildSymmetricInteractionPairKey,
  classifyReversedSymmetricPair,
  classifySymmetricPairDuplicate,
  type MedicationSafetyDuplicateClassification,
} from "@medora/shared";

export type SafetyDuplicateCheckResult = {
  classification: MedicationSafetyDuplicateClassification;
  existingId?: string;
  normalizedPairKey?: string;
  notes: string;
  evaluatesPatientMedications: false;
};

export async function checkDrugInteractionDuplicate(
  prisma: PrismaClient,
  input: {
    leftMedicationId: string;
    rightMedicationId: string;
    interactionScope: string;
    sourceVersionId: string;
    directional?: boolean;
  }
): Promise<SafetyDuplicateCheckResult> {
  const directional = input.directional ?? false;
  if (!input.leftMedicationId?.trim() || !input.rightMedicationId?.trim()) {
    return {
      classification: "UNRESOLVED_IDENTITY",
      notes: "One or both medication identities are unresolved.",
      evaluatesPatientMedications: false,
    };
  }

  const normalizedPairKey = directional
    ? [
        "DIR",
        input.leftMedicationId.trim().toLowerCase(),
        input.rightMedicationId.trim().toLowerCase(),
        input.interactionScope.trim().toUpperCase(),
        input.sourceVersionId.trim().toLowerCase(),
      ].join("|")
    : buildSymmetricInteractionPairKey({
        leftMedicationId: input.leftMedicationId,
        rightMedicationId: input.rightMedicationId,
        interactionScope: input.interactionScope,
        sourceVersionId: input.sourceVersionId,
      });

  const existing = await prisma.medicationDrugInteraction.findFirst({
    where: {
      normalizedPairKey,
      status: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] },
    },
  });

  if (existing) {
    const classification = classifySymmetricPairDuplicate({
      existingNormalizedPairKey: existing.normalizedPairKey,
      candidateNormalizedPairKey: normalizedPairKey,
      existingDirectional: existing.directional,
      candidateDirectional: directional,
    });
    return {
      classification:
        classification === "NOT_DUPLICATE" ? "SOURCE_VERSION_DUPLICATE" : classification,
      existingId: existing.id,
      normalizedPairKey,
      notes: "Matching safety-knowledge interaction already exists.",
      evaluatesPatientMedications: false,
    };
  }

  if (!directional) {
    const reversedClass = classifyReversedSymmetricPair({
      leftId: input.rightMedicationId,
      rightId: input.leftMedicationId,
      existingPairKey: normalizedPairKey,
      interactionScope: input.interactionScope,
      sourceVersionId: input.sourceVersionId,
    });
    if (reversedClass === "REVERSED_PAIR_DUPLICATE") {
      // Same key by construction; no separate row — treat as exact when found above.
      return {
        classification: "NOT_DUPLICATE",
        normalizedPairKey,
        notes: "Reversed input collapses to the same normalized pair key (idempotent).",
        evaluatesPatientMedications: false,
      };
    }
  }

  return {
    classification: "NOT_DUPLICATE",
    normalizedPairKey,
    notes: "No active safety-knowledge duplicate found.",
    evaluatesPatientMedications: false,
  };
}

export async function summarizeSafetyDuplicateQueue(prisma: PrismaClient) {
  const rows = await prisma.medicationDrugInteraction.findMany({
    select: { normalizedPairKey: true },
    where: { status: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] } },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.normalizedPairKey, (counts.get(row.normalizedPairKey) ?? 0) + 1);
  }
  let possibleDuplicatePairKeys = 0;
  for (const n of counts.values()) {
    if (n > 1) possibleDuplicatePairKeys += 1;
  }
  return {
    possibleDuplicatePairKeys,
    evaluatesPatientMedications: false as const,
    patientAllergyRecordsEvaluated: false as const,
    orderBlockingEnabled: false as const,
  };
}
