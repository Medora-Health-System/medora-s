import { z } from "zod";

/**
 * Clinical AI suggestion categories.
 *
 * These describe potential chart-review observations. They do NOT authorize
 * autonomous action, diagnosis, or billing manipulation. Every suggestion
 * requires provider review.
 */
export const AiSuggestionCategory = z.enum([
  "CLINICAL_SAFETY",
  "DIAGNOSTIC_GAP",
  "RESULT_FOLLOWUP",
  "MEDICATION_CONSIDERATION",
  "ORDER_CONSIDERATION",
  "REASSESSMENT_GAP",
  "DOCUMENTATION_GAP",
  "MDM_GAP",
  "DISPOSITION_GAP",
  "DISCHARGE_SAFETY",
  "FOLLOW_UP_GAP",
  "CONTRADICTION",
  "DUPLICATION",
  "PENDING_ACTION",
]);

export type AiSuggestionCategory = z.infer<typeof AiSuggestionCategory>;

export const AiSuggestionPriority = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export type AiSuggestionPriority = z.infer<typeof AiSuggestionPriority>;

export const AiSuggestionEvidenceSourceType = z.enum([
  "ENCOUNTER",
  "PATIENT",
  "TRIAGE",
  "VITAL",
  "ORDER",
  "RESULT",
  "MEDICATION",
  "DIAGNOSIS",
  "NOTE",
  "MDM",
  "DISPOSITION",
  "FOLLOW_UP",
  "PROCEDURE",
]);

export type AiSuggestionEvidenceSourceType = z.infer<typeof AiSuggestionEvidenceSourceType>;

/**
 * A single chart fact supporting a suggestion.
 *
 * No free-text clinical narrative, patient identifiers, or credentials.
 */
export const AiSuggestionEvidence = z.object({
  sourceType: AiSuggestionEvidenceSourceType,
  sourceId: z.string().max(255).optional(),
  label: z.string().max(500),
  value: z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]).optional(),
});

export type AiSuggestionEvidence = z.infer<typeof AiSuggestionEvidence>;

/**
 * Recommended actions are informational / navigation only.
 *
 * The enum intentionally excludes autonomous clinical mutations such as
 * placing orders, signing documentation, or modifying the chart.
 */
export const AiSuggestionActionType = z.enum(["REVIEW", "NAVIGATE", "ACKNOWLEDGE", "DISMISS"]);

export type AiSuggestionActionType = z.infer<typeof AiSuggestionActionType>;

export const AiSuggestionRecommendedAction = z.object({
  actionType: AiSuggestionActionType,
  targetSection: z.string().max(100).optional(),
  label: z.string().max(500),
  deepLink: z.string().max(500).optional(),
});

export type AiSuggestionRecommendedAction = z.infer<typeof AiSuggestionRecommendedAction>;

export const AiSuggestionStatus = z.enum(["PENDING", "ACKNOWLEDGED", "DISMISSED"]);

export type AiSuggestionStatus = z.infer<typeof AiSuggestionStatus>;

/**
 * A single AI chart-review suggestion.
 *
 * No raw model chain-of-thought, no hidden reasoning, and no fields that
 * would allow autonomous chart modification.
 */
export const AiSuggestion = z.object({
  id: z.string().uuid(),
  category: AiSuggestionCategory,
  priority: AiSuggestionPriority,
  title: z.string().max(200),
  summary: z.string().max(2000),
  reasoningSummary: z.string().max(2000),
  evidence: z.array(AiSuggestionEvidence).max(50),
  recommendedActions: z.array(AiSuggestionRecommendedAction).max(10),
  clinicalDisclaimer: z.string().max(1000),
  source: z.string().max(100),
  generatedAt: z.string().datetime(),
  snapshotVersion: z.string().max(255),
  status: AiSuggestionStatus,
});

export type AiSuggestion = z.infer<typeof AiSuggestion>;

/**
 * Container returned by a clinical review run.
 */
export const AiClinicalReviewOutput = z.object({
  suggestions: z.array(AiSuggestion).max(200),
});

export type AiClinicalReviewOutput = z.infer<typeof AiClinicalReviewOutput>;
