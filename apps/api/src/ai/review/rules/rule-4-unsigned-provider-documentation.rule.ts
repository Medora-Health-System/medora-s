import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 4 — Unsigned/incomplete provider documentation.
 *
 * Flags provider documentation whose status is not SIGNED. Uses only the
 * providerDocumentationStatus field in the snapshot; never inspects note content.
 */
export function rule4UnsignedProviderDocumentation(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const status = snapshot.clinicalDocumentation.providerDocumentationStatus;
  if (status === "SIGNED") {
    return [];
  }

  return [
    buildAiSuggestion(ctx, {
      category: "DOCUMENTATION_GAP",
      priority: "MEDIUM",
      title: "Unsigned/incomplete provider documentation",
      summary: `Provider documentation status is ${status ?? "not documented"}; expected SIGNED.`,
      reasoningSummary:
        "The snapshot clinicalDocumentation.providerDocumentationStatus is not SIGNED.",
      evidence: [
        {
          sourceType: "NOTE",
          label: "Provider documentation status",
          value: status ?? null,
        },
      ],
    }),
  ];
}
