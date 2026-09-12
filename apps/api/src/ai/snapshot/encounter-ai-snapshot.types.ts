import type { EncounterAiSnapshot } from "@medora/shared";

export interface EncounterAiSnapshotBuildInput {
  facilityId: string;
  encounterId: string;
  actorUserId: string;
}

export interface EncounterAiSnapshotBuilder {
  build(input: EncounterAiSnapshotBuildInput): Promise<EncounterAiSnapshot>;
}
