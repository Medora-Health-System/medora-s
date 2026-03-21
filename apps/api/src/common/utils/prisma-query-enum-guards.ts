import { EncounterType, FollowUpStatus } from "@prisma/client";

const encounterTypeValues = new Set<string>(Object.values(EncounterType));
const followUpStatusValues = new Set<string>(Object.values(FollowUpStatus));

export function isEncounterType(s: string): s is EncounterType {
  return encounterTypeValues.has(s);
}

export function isFollowUpStatus(s: string): s is FollowUpStatus {
  return followUpStatusValues.has(s);
}
