import type { MedoraAssistFindingKey } from "@medora/shared";
import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isClinicSetting } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 12 — Clinic TRANSFER_ED selected without required structured transfer fields.
 * Does not create an ED encounter.
 */
export function rule12ClinicTransferIncomplete(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!isClinicSetting(snapshot.encounterContext.careSetting)) return [];
  const checkout = String(snapshot.disposition.checkoutState ?? "").trim().toUpperCase();
  if (checkout !== "TRANSFER_ED") return [];

  let copyKey: MedoraAssistFindingKey | null = null;
  if (!String(snapshot.disposition.transferReason ?? "").trim()) copyKey = "clinicTransferIncomplete";
  else if (!String(snapshot.disposition.transferDestination ?? "").trim()) {
    copyKey = "clinicTransferIncompleteDestination";
  } else if (!String(snapshot.disposition.transferTransport ?? "").trim()) {
    copyKey = "clinicTransferIncompleteTransport";
  }
  if (!copyKey) return [];

  return [
    buildCopiedSuggestion(ctx, {
      category: "DISPOSITION_GAP",
      priority: "HIGH",
      copyKey,
      evidence: [
        {
          sourceType: "DISPOSITION",
          label: "Clinic checkout destination",
          value: checkout,
        },
      ],
    }),
  ];
}
