import type { Prisma } from "@prisma/client";

function asJsonValue(o: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(o)) as Prisma.InputJsonValue;
}

export function providerDocumentationSignedPayloadJson(input: {
  signedAt: string;
  providerDocumentationStatus: string;
  encounterMode?: "ED" | "OBSERVATION" | "AMBULATORY" | null;
  documentType?: "INITIAL_PROVIDER_NOTE" | "OBSERVATION_PROVIDER_PROGRESS_NOTE" | null;
  previousSignedByUserId?: string | null;
  previousSignedAt?: string | null;
  versionNumber?: string | null;
  snapshotHash?: string | null;
  providerDocumentationVersionId?: string | null;
}): Prisma.InputJsonValue {
  const o: Record<string, unknown> = {
    source: "PROVIDER_DOCUMENTATION",
    signedAt: input.signedAt,
    providerDocumentationStatus: input.providerDocumentationStatus,
  };
  if (
    input.encounterMode === "ED" ||
    input.encounterMode === "OBSERVATION" ||
    input.encounterMode === "AMBULATORY"
  ) {
    o.encounterMode = input.encounterMode;
  }
  if (
    input.documentType === "INITIAL_PROVIDER_NOTE" ||
    input.documentType === "OBSERVATION_PROVIDER_PROGRESS_NOTE"
  ) {
    o.documentType = input.documentType;
  }
  if (input.previousSignedByUserId != null && input.previousSignedByUserId !== "") {
    o.previousSignedByUserId = input.previousSignedByUserId;
  }
  if (input.previousSignedAt != null && input.previousSignedAt !== "") {
    o.previousSignedAt = input.previousSignedAt;
  }
  if (input.versionNumber != null && input.versionNumber !== "") {
    o.versionNumber = input.versionNumber;
  }
  if (input.snapshotHash != null && input.snapshotHash !== "") {
    o.snapshotHash = input.snapshotHash;
  }
  if (input.providerDocumentationVersionId != null && input.providerDocumentationVersionId !== "") {
    o.providerDocumentationVersionId = input.providerDocumentationVersionId;
  }
  return asJsonValue(o);
}

export function providerDocumentationUnlockedPayloadJson(input: {
  unlockedAt: string;
  previousSignedByUserId: string | null;
  previousSignedAt: string | null;
  previousStatus: string;
  reason?: string | null;
  providerDocumentationVersionId?: string | null;
  providerDocumentationVersionNumber?: string | null;
}): Prisma.InputJsonValue {
  const o: Record<string, unknown> = {
    source: "PROVIDER_DOCUMENTATION",
    unlockedAt: input.unlockedAt,
    previousSignedByUserId: input.previousSignedByUserId,
    previousSignedAt: input.previousSignedAt,
    previousStatus: input.previousStatus,
  };
  if (input.reason != null && input.reason !== "") {
    o.reason = input.reason;
  }
  if (input.providerDocumentationVersionId != null && input.providerDocumentationVersionId !== "") {
    o.providerDocumentationVersionId = input.providerDocumentationVersionId;
  }
  if (input.providerDocumentationVersionNumber != null && input.providerDocumentationVersionNumber !== "") {
    o.providerDocumentationVersionNumber = input.providerDocumentationVersionNumber;
  }
  return asJsonValue(o);
}
