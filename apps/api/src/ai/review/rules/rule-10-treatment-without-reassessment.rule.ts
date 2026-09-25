import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  administeredAtMs,
  laterVitalAfter,
  looksLikeIvFluid,
  looksLikePainMedication,
  parseIsoMs,
  vitalHeartRate,
  vitalPain,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

const TACHYCARDIA_HR = 130;

/**
 * Rule 10 — Treatment given without a later documented response reassessment.
 * Pain reassessment is tied only to recognized analgesic names already in the order label.
 * IV-fluid response is tied only when tachycardia is documented before the infusion.
 */
export function rule10TreatmentWithoutReassessment(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const careSetting = snapshot.encounterContext.careSetting;
  if (careSetting === "OFFICE_OUTPATIENT_CLINIC") return suggestions;
  const ordersById = new Map(
    (snapshot.treatments.medicationOrders ?? []).map((order) => [order.id, order])
  );
  const administrations = snapshot.treatments.medicationAdministrations ?? [];

  for (const admin of administrations) {
    const administeredAt = admin.administeredAt;
    const adminMs = administeredAtMs(admin);
    if (!administeredAt || adminMs === null) continue;
    const order = admin.orderItemId ? ordersById.get(admin.orderItemId) : undefined;
    const label = order?.displayLabel?.trim();
    if (!label) continue;

    if (looksLikePainMedication(label) && !laterVitalAfter(snapshot, administeredAt, vitalPain)) {
      suggestions.push(
        buildCopiedSuggestion(ctx, {
          category: "REASSESSMENT_GAP",
          priority: "MEDIUM",
          copyKey: "painMedWithoutReassessment",
          vars: { medication: label },
          evidence: [
            {
              sourceType: "MEDICATION",
              sourceId: admin.id,
              label: "Analgesic administration",
              value: label,
            },
          ],
        })
      );
    }

    if (looksLikeIvFluid({ displayLabel: label, route: order?.route })) {
      const priorTachycardia = (snapshot.presentation.vitalTrend ?? [])
        .concat(snapshot.presentation.latestVitals ? [snapshot.presentation.latestVitals] : [])
        .some((entry) => {
          const time = parseIsoMs(entry.recordedAt);
          const hr = vitalHeartRate(entry);
          return time !== null && time < adminMs && hr !== null && hr >= TACHYCARDIA_HR;
        });
      if (priorTachycardia && !laterVitalAfter(snapshot, administeredAt, vitalHeartRate)) {
        suggestions.push(
          buildCopiedSuggestion(ctx, {
            category: "REASSESSMENT_GAP",
            priority: "MEDIUM",
            copyKey: "ivFluidsWithoutHrReassessment",
            evidence: [
              {
                sourceType: "MEDICATION",
                sourceId: admin.id,
                label: "IV fluid administration",
                value: label,
              },
            ],
          })
        );
      }
    }
  }

  return suggestions;
}
