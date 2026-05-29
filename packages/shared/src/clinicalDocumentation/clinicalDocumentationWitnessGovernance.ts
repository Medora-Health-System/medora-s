export const CLINICAL_DOCUMENTATION_WITNESS_STATUSES = [
  "NOT_REQUIRED",
  "PENDING_WITNESS",
  "WITNESSED",
] as const;

export type ClinicalDocumentationWitnessStatus =
  (typeof CLINICAL_DOCUMENTATION_WITNESS_STATUSES)[number];

export type ClinicalDocumentationWitnessFields = {
  authorUserId: string;
  requiresWitnessSignature: boolean;
  witnessedAt: string | null;
  voidedAt: string | null;
};

export function resolveClinicalDocumentationWitnessStatus(input: {
  requiresWitnessSignature: boolean;
  witnessedAt: Date | string | null;
  voidedAt?: Date | string | null;
}): ClinicalDocumentationWitnessStatus {
  if (!input.requiresWitnessSignature) return "NOT_REQUIRED";
  if (input.witnessedAt != null) return "WITNESSED";
  return "PENDING_WITNESS";
}

export function clinicalDocumentationPendingWitness(
  entry: Pick<
    ClinicalDocumentationWitnessFields,
    "requiresWitnessSignature" | "witnessedAt" | "voidedAt"
  >
): boolean {
  return (
    entry.requiresWitnessSignature &&
    !entry.witnessedAt &&
    !entry.voidedAt
  );
}

/** Roles that may witness (aligned with clinical documentation create roles). */
export const CLINICAL_DOCUMENTATION_WITNESS_ROLE_CODES = [
  "RN",
  "PROVIDER",
  "ADMIN",
  "LAB",
  "RADIOLOGY",
  "PHARMACY",
] as const;

export function canActAsClinicalDocumentationWitness(roleCodes: readonly string[]): boolean {
  const upper = new Set(roleCodes.map((c) => String(c).trim().toUpperCase()));
  return CLINICAL_DOCUMENTATION_WITNESS_ROLE_CODES.some((r) => upper.has(r));
}

export function canWitnessClinicalDocumentationEntry(
  entry: ClinicalDocumentationWitnessFields,
  userId: string | undefined,
  roleCodes: readonly string[]
): boolean {
  if (!userId || !clinicalDocumentationPendingWitness(entry)) return false;
  if (entry.authorUserId === userId) return false;
  return canActAsClinicalDocumentationWitness(roleCodes);
}
