import type { Prisma } from "@prisma/client";

/** Payload source for ER nursing handoff saves (`nursingAssessment.erHandoffV1`). */
export const ER_HANDOFF_CLINICAL_EVENT_SOURCE = "ER_HANDOFF_V1" as const;

/**
 * Append-only clinical event payload: full handoff namespace snapshot after save (JSON-sanitized).
 */
export function handoffNursingEncounterPayload(snapshot: unknown): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: ER_HANDOFF_CLINICAL_EVENT_SOURCE,
    namespace: "erHandoffV1",
  };
  if (snapshot !== undefined && snapshot !== null && typeof snapshot === "object") {
    base.snapshot = JSON.parse(JSON.stringify(snapshot));
  }
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}

/** HANDOFF_PROVIDER — explicit provider-to-provider passation (append-only). */
export function handoffProviderEncounterPayload(args: {
  fromUserId: string;
  toUserId: string;
  toDisplayName: string;
  reportGivenAt: string | null;
  notes: string | null;
}): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify({
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      toDisplayName: args.toDisplayName,
      reportGivenAt: args.reportGivenAt,
      notes: args.notes,
    })
  ) as Prisma.InputJsonValue;
}
