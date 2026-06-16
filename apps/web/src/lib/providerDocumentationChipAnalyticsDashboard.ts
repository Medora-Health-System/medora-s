/**
 * MEDUI.ED.POSTCERT.8 — Chip analytics dashboard view model.
 * Chip identifiers and counts only. No note text. Read-only.
 */
import {
  aggregateChipUsage,
  aggregateFamilyUsage,
  buildProviderDocumentationAnalyticsAggregates,
  rankByNumericField,
} from "./providerDocumentationAnalyticsAggregates";
import type { ProviderDocumentationAnalyticsChipCategory } from "./providerDocumentationAnalyticsModel";
import type { ProviderDocumentationChipUsageAggregate } from "./providerDocumentationAnalyticsAggregates";

export type ProviderDocumentationChipRanking = ProviderDocumentationChipUsageAggregate & {
  rank: number;
};

export type ProviderDocumentationChipAnalyticsDashboard = {
  generatedAt: string;
  mostInsertedHpiChips: ProviderDocumentationChipRanking[];
  mostInsertedRosChips: ProviderDocumentationChipRanking[];
  mostInsertedExamChips: ProviderDocumentationChipRanking[];
  mostInsertedMdmChips: ProviderDocumentationChipRanking[];
  leastUsedChips: ProviderDocumentationChipRanking[];
  unusedChips: ProviderDocumentationChipRanking[];
  adoptionRateByFamily: {
    familyId: string;
    displayName: string;
    chipCount: number;
    insertedCount: number;
    adoptionRate: number;
  }[];
};

function rankChips(
  chips: ProviderDocumentationChipUsageAggregate[],
  category?: ProviderDocumentationAnalyticsChipCategory
): ProviderDocumentationChipRanking[] {
  const filtered = category ? chips.filter((chip) => chip.chipCategory === category) : chips;
  const ranked = rankByNumericField(filtered, "insertedCount", "desc");
  return ranked.map((chip, index) => ({ ...chip, rank: index + 1 }));
}

export function buildChipAnalyticsDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationChipAnalyticsDashboard {
  const chips = aggregateChipUsage();
  const familyUsage = aggregateFamilyUsage();

  const unused = chips.filter((chip) => chip.insertedCount === 0);
  const leastUsed = rankByNumericField(chips, "insertedCount", "asc").slice(0, 20);

  const adoptionRateByFamily = familyUsage.map((family) => {
    const familyChips = chips.filter((chip) => chip.familyId === family.familyId);
    const insertedCount = familyChips.reduce((sum, chip) => sum + chip.insertedCount, 0);
    const chipCount = familyChips.length;
    return {
      familyId: family.familyId,
      displayName: family.displayName,
      chipCount,
      insertedCount,
      adoptionRate: chipCount === 0 ? 0 : insertedCount / chipCount,
    };
  });

  return {
    generatedAt,
    mostInsertedHpiChips: rankChips(chips, "hpi").slice(0, 15),
    mostInsertedRosChips: rankChips(chips, "ros").slice(0, 15),
    mostInsertedExamChips: rankChips(chips, "exam").slice(0, 15),
    mostInsertedMdmChips: rankChips(chips, "mdm").slice(0, 15),
    leastUsedChips: leastUsed.map((chip, index) => ({ ...chip, rank: index + 1 })),
    unusedChips: unused.slice(0, 50).map((chip, index) => ({ ...chip, rank: index + 1 })),
    adoptionRateByFamily,
  };
}

export function buildChipAnalyticsFromAggregates(): ProviderDocumentationChipAnalyticsDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildChipAnalyticsDashboard(aggregates.generatedAt);
}
