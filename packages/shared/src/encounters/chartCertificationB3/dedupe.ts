import { dedupeChartCertificationB2Deficiencies } from "../chartCertificationB2/dedupe.js";
import type { ChartCertificationDeficiency } from "../chartCertificationB1/types.js";

/**
 * B2 dedupe + B3 root-cause family suppression.
 */
export function dedupeChartCertificationB3Deficiencies(
  deficiencies: readonly ChartCertificationDeficiency[]
): ChartCertificationDeficiency[] {
  const keyed = dedupeChartCertificationB2Deficiencies(deficiencies);

  return keyed.filter((d) => {
    if (d.stableCode === "MAR_DOSE_UNRESOLVED" && d.sourceEntityId) {
      const entity = d.sourceEntityId;
      if (
        keyed.some(
          (x) =>
            (x.stableCode === "MAR_REFUSAL_REASON_MISSING" ||
              x.stableCode === "MEDICATION_ORDER_ROUTE_MISSING" ||
              x.stableCode === "MEDICATION_ORDER_DOSE_MISSING") &&
            (x.sourceEntityId === entity ||
              x.deduplicationKey.includes(entity) ||
              (d.deduplicationKey.includes(x.sourceEntityId ?? "") && Boolean(x.sourceEntityId)))
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "POST_MEDICATION_REASSESSMENT_MISSING" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            (x.stableCode === "PRN_EFFECTIVENESS_REASSESSMENT_MISSING" ||
              x.stableCode === "PAIN_REASSESSMENT_MISSING") &&
            (x.sourceEntityId === d.sourceEntityId ||
              x.deduplicationKey.includes(d.sourceEntityId!))
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "INFUSION_STOP_TIME_MISSING" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            x.stableCode === "INFUSION_UNRESOLVED_AT_DISPOSITION" &&
            (x.sourceEntityId === d.sourceEntityId ||
              x.deduplicationKey === d.deduplicationKey ||
              x.deduplicationKey.includes(d.sourceEntityId!))
        )
      ) {
        return false;
      }
    }
    return true;
  });
}
