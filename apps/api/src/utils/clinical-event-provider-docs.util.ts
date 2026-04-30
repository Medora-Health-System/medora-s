import type { Prisma } from "@prisma/client";

function asJsonValue(o: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(o)) as Prisma.InputJsonValue;
}

export function providerDocumentationSignedPayloadJson(input: {
  signedAt: string;
  providerDocumentationStatus: string;
  previousSignedByUserId?: string | null;
  previousSignedAt?: string | null;
}): Prisma.InputJsonValue {
  const o: Record<string, unknown> = {
    source: "PROVIDER_DOCUMENTATION",
    signedAt: input.signedAt,
    providerDocumentationStatus: input.providerDocumentationStatus,
  };
  if (input.previousSignedByUserId != null && input.previousSignedByUserId !== "") {
    o.previousSignedByUserId = input.previousSignedByUserId;
  }
  if (input.previousSignedAt != null && input.previousSignedAt !== "") {
    o.previousSignedAt = input.previousSignedAt;
  }
  return asJsonValue(o);
}

export function providerDocumentationUnlockedPayloadJson(input: {
  unlockedAt: string;
  previousSignedByUserId: string | null;
  previousSignedAt: string | null;
  previousStatus: string;
  reason?: string | null;
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
  return asJsonValue(o);
}
