import { z } from "zod";
import { AiSuggestionCategory } from "./ai-suggestion.schema.js";

export const AiSuggestionFeedbackRating = z.enum(["HELPFUL", "NOT_HELPFUL"]);
export type AiSuggestionFeedbackRating = z.infer<typeof AiSuggestionFeedbackRating>;

/**
 * Minimal provider feedback contract for Phase 1F.
 *
 * Intentionally excludes free-text comments to avoid accidental PHI capture.
 * The object is strict so unexpected fields are rejected rather than silently
 * accepted at the API boundary.
 */
export const AiSuggestionFeedbackRequest = z.object({
  suggestionId: z.string().uuid(),
  category: AiSuggestionCategory,
  snapshotVersion: z.string().min(1).max(255),
  rating: AiSuggestionFeedbackRating,
}).strict();

export type AiSuggestionFeedbackRequest = z.infer<typeof AiSuggestionFeedbackRequest>;
