/**
 * MEDUI.ED.POSTCERT.8 — Template adoption dashboard view model.
 * Read-only. No API calls. Baseline scaffold until telemetry is wired.
 */
import {
  aggregateFamilyUsage,
  aggregateTemplateUsage,
  buildProviderDocumentationAnalyticsAggregates,
  rankByNumericField,
} from "./providerDocumentationAnalyticsAggregates";
import { buildCertifiedTemplateAnalyticsCatalog } from "./providerDocumentationAnalyticsModel";
import type { ProviderDocumentationTemplateUsageMetrics } from "./providerDocumentationAnalyticsModel";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";

export type ProviderDocumentationTemplateRanking = ProviderDocumentationTemplateUsageMetrics & {
  catalogChipCount: number;
  readinessRank: number;
};

export type ProviderDocumentationTemplateAnalyticsDashboard = {
  generatedAt: string;
  mostUsedTemplates: ProviderDocumentationTemplateRanking[];
  leastUsedTemplates: ProviderDocumentationTemplateRanking[];
  highestCompletionRate: ProviderDocumentationTemplateRanking[];
  lowestCompletionRate: ProviderDocumentationTemplateRanking[];
  highestAbandonmentRate: ProviderDocumentationTemplateRanking[];
  familyAdoptionBreakdown: ReturnType<typeof aggregateFamilyUsage>;
  featuredTemplates: ProviderDocumentationTemplateRanking[];
};

const FEATURED_TEMPLATE_IDS: ProviderDocumentationTemplateId[] = [
  "stroke_symptoms",
  "weakness",
  "palpitations_complaint_v1",
  "chf_symptoms_complaint_v1",
  "hyperglycemia_complaint_v1",
  "observation_reassessment",
  "medication_refill",
];

function enrichTemplateRankings(
  usage: ProviderDocumentationTemplateUsageMetrics[]
): ProviderDocumentationTemplateRanking[] {
  const catalog = buildCertifiedTemplateAnalyticsCatalog();
  const catalogById = new Map(catalog.map((entry) => [entry.templateId, entry]));

  const enriched = usage.map((item) => ({
    ...item,
    catalogChipCount: catalogById.get(item.templateId)?.totalChipCount ?? 0,
    readinessRank: catalogById.get(item.templateId)?.totalChipCount ?? 0,
  }));

  return rankByNumericField(enriched, "readinessRank", "desc").map((item, index) => ({
    ...item,
    readinessRank: index + 1,
  }));
}

export function buildTemplateAnalyticsDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationTemplateAnalyticsDashboard {
  const usage = aggregateTemplateUsage();
  const enriched = enrichTemplateRankings(usage);

  const byUsage = rankByNumericField(enriched, "usageCount", "desc");
  const byCompletion = rankByNumericField(enriched, "completionRate", "desc");
  const byAbandonment = rankByNumericField(enriched, "abandonmentCount", "desc");

  const featured = FEATURED_TEMPLATE_IDS.map((templateId) =>
    enriched.find((item) => item.templateId === templateId)
  ).filter((item): item is ProviderDocumentationTemplateRanking => item != null);

  return {
    generatedAt,
    mostUsedTemplates: byUsage.slice(0, 10),
    leastUsedTemplates: [...byUsage].reverse().slice(0, 10),
    highestCompletionRate: byCompletion.slice(0, 10),
    lowestCompletionRate: [...byCompletion].reverse().slice(0, 10),
    highestAbandonmentRate: byAbandonment.slice(0, 10),
    familyAdoptionBreakdown: aggregateFamilyUsage(),
    featuredTemplates: featured,
  };
}

export function buildTemplateAnalyticsFromAggregates(): ProviderDocumentationTemplateAnalyticsDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildTemplateAnalyticsDashboard(aggregates.generatedAt);
}
