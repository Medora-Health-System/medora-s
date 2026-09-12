import { z } from "zod";
import { AiSuggestionCategory } from "./ai-suggestion.schema.js";

export const AiSuggestionFeedbackRating = z.enum(["HELPFUL", "NOT_HELPFUL"]);
export type AiSuggestionFeedbackRating = z.infer<typeof AiSuggestionFeedbackRating>;

/**
 * Minimal provider feedback contract for Phase 1F.
 *
 * Intentionally excludes free-text comments to avoid accidental PHI capture.
 * Feedback is recorded as PHI-safe audit metadata only and never modifies the
 * clinical chart or the AI suggestion itself.
 */
export const AiSuggestionFeedbackRequest = z.object({
  suggestionId: z.string().uuid(),
  category: AiSuggestionCategory,
  snapshotVersion: z.string().min(1).max(255),
  rating: AiSuggestionFeedbackRating,
});

export type AiSuggestionFeedbackRequest = z.infer<typeof AiSuggestionFeedbackRequest>;
