import type { AiSuggestion, EncounterAiSnapshot } from "@medora/shared";

export interface SuggestionContext {
  generatedAt: string;
  snapshotVersion: string;
}

export type DeterministicRule = (
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) => AiSuggestion[];
