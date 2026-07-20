import { SOURCE_AUTHORITY_RANK } from "./deficiency.js";
import type { ChartCertificationDeficiency } from "./types.js";

/**
 * Deterministic root-cause deduplication.
 * Higher sourceAuthority wins; effects are OR-merged when authorities equal.
 */
export function dedupeChartCertificationB1Deficiencies(
  deficiencies: readonly ChartCertificationDeficiency[]
): ChartCertificationDeficiency[] {
  const byKey = new Map<string, ChartCertificationDeficiency>();

  for (const d of deficiencies) {
    const key = d.deduplicationKey;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, d);
      continue;
    }
    const existingRank = SOURCE_AUTHORITY_RANK[existing.sourceAuthority] ?? 0;
    const incomingRank = SOURCE_AUTHORITY_RANK[d.sourceAuthority] ?? 0;
    if (incomingRank > existingRank) {
      byKey.set(key, {
        ...d,
        effects: {
          blocksClinicalClosure:
            d.effects.blocksClinicalClosure || existing.effects.blocksClinicalClosure,
          blocksDisposition: d.effects.blocksDisposition || existing.effects.blocksDisposition,
          blocksBilling: d.effects.blocksBilling || existing.effects.blocksBilling,
          suggestsProviderReview:
            d.effects.suggestsProviderReview || existing.effects.suggestsProviderReview,
          suggestsNursingReview:
            d.effects.suggestsNursingReview || existing.effects.suggestsNursingReview,
          suggestsDocumentationReview:
            d.effects.suggestsDocumentationReview || existing.effects.suggestsDocumentationReview,
        },
      });
      continue;
    }
    if (incomingRank === existingRank) {
      byKey.set(key, {
        ...existing,
        effects: {
          blocksClinicalClosure:
            existing.effects.blocksClinicalClosure || d.effects.blocksClinicalClosure,
          blocksDisposition: existing.effects.blocksDisposition || d.effects.blocksDisposition,
          blocksBilling: existing.effects.blocksBilling || d.effects.blocksBilling,
          suggestsProviderReview:
            existing.effects.suggestsProviderReview || d.effects.suggestsProviderReview,
          suggestsNursingReview:
            existing.effects.suggestsNursingReview || d.effects.suggestsNursingReview,
          suggestsDocumentationReview:
            existing.effects.suggestsDocumentationReview || d.effects.suggestsDocumentationReview,
        },
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.stableCode.localeCompare(b.stableCode));
}
