import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildCopiedSuggestion } from "../review.utils.js";

const UNSIGNED_STATES = new Set(["DRAFT", "UNSIGNED", "IN_PROGRESS", "PENDING_SIGNATURE"]);

/**
 * Rule 4 — Unsigned provider documentation.
 * Flags only an explicit non-signed status. Absence of documentation is not treated as unsigned.
 */
export function rule4UnsignedProviderDocumentation(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const status = String(snapshot.clinicalDocumentation.providerDocumentationStatus ?? "")
    .trim()
    .toUpperCase();
  if (!status || status === "SIGNED" || !UNSIGNED_STATES.has(status)) return [];

  return [
    buildCopiedSuggestion(ctx, {
      category: "DOCUMENTATION_GAP",
      priority: "MEDIUM",
      copyKey: "unsignedDocumentation",
      evidence: [
        {
          sourceType: "NOTE",
          label: "Provider documentation status",
          value: status,
        },
      ],
    }),
  ];
}
