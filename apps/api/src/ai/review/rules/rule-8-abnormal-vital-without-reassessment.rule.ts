import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  chronologicalVitals,
  laterVitalAfter,
  vitalHeartRate,
  vitalSpo2,
  vitalSystolic,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

const TACHYCARDIA_HR = 130;
const HYPOTENSION_SBP = 90;
const HYPOXIA_SPO2 = 90;

/**
 * Rule 8 — Abnormal vital without a later same-key reassessment.
 * Does not claim the abnormality persisted when no later measurement exists.
 */
export function rule8AbnormalVitalWithoutReassessment(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const vitals = chronologicalVitals(snapshot);
  const age = snapshot.patientContext.age;
  const adultOrUnknown = age == null || age >= 12;
  const hypotensionEligible = age == null || age >= 18;

  const lastUnreassessedHr = [...vitals].reverse().find((entry) => {
    const hr = vitalHeartRate(entry);
    return hr !== null && hr >= TACHYCARDIA_HR && entry.recordedAt;
  });
  if (adultOrUnknown && lastUnreassessedHr?.recordedAt) {
    const hr = vitalHeartRate(lastUnreassessedHr);
    if (hr !== null && !laterVitalAfter(snapshot, lastUnreassessedHr.recordedAt, vitalHeartRate)) {
      suggestions.push(
        buildCopiedSuggestion(ctx, {
          category: "CLINICAL_SAFETY",
          priority: "HIGH",
          copyKey: "tachycardiaWithoutReassessment",
          vars: { hr: String(Math.round(hr)) },
          evidence: [
            {
              sourceType: "VITAL",
              label: "Heart rate",
              value: hr,
            },
          ],
        })
      );
    }
  }

  const lastUnreassessedSbp = [...vitals].reverse().find((entry) => {
    const sbp = vitalSystolic(entry);
    return sbp !== null && sbp < HYPOTENSION_SBP && entry.recordedAt;
  });
  if (hypotensionEligible && lastUnreassessedSbp?.recordedAt) {
    const sbp = vitalSystolic(lastUnreassessedSbp);
    if (sbp !== null && !laterVitalAfter(snapshot, lastUnreassessedSbp.recordedAt, vitalSystolic)) {
      suggestions.push(
        buildCopiedSuggestion(ctx, {
          category: "CLINICAL_SAFETY",
          priority: "HIGH",
          copyKey: "hypotensionWithoutReassessment",
          vars: { sbp: String(Math.round(sbp)) },
          evidence: [
            {
              sourceType: "VITAL",
              label: "Systolic blood pressure",
              value: sbp,
            },
          ],
        })
      );
    }
  }

  const lastUnreassessedSpo2 = [...vitals].reverse().find((entry) => {
    const spo2 = vitalSpo2(entry);
    return spo2 !== null && spo2 < HYPOXIA_SPO2 && entry.recordedAt;
  });
  if (lastUnreassessedSpo2?.recordedAt) {
    const spo2 = vitalSpo2(lastUnreassessedSpo2);
    if (spo2 !== null && !laterVitalAfter(snapshot, lastUnreassessedSpo2.recordedAt, vitalSpo2)) {
      suggestions.push(
        buildCopiedSuggestion(ctx, {
          category: "CLINICAL_SAFETY",
          priority: "HIGH",
          copyKey: "hypoxiaWithoutReassessment",
          vars: { spo2: String(Math.round(spo2)) },
          evidence: [
            {
              sourceType: "VITAL",
              label: "Oxygen saturation",
              value: spo2,
            },
          ],
        })
      );
    }
  }

  return suggestions;
}
