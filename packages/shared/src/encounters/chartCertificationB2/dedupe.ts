import { dedupeChartCertificationB1Deficiencies } from "../chartCertificationB1/dedupe.js";
import type { ChartCertificationDeficiency } from "../chartCertificationB1/types.js";

/**
 * B1 key dedupe + B2 root-cause family suppression (prefer specific modality codes).
 */
export function dedupeChartCertificationB2Deficiencies(
  deficiencies: readonly ChartCertificationDeficiency[]
): ChartCertificationDeficiency[] {
  const keyed = dedupeChartCertificationB1Deficiencies(deficiencies);

  return keyed.filter((d) => {
    if (d.stableCode === "IMAGING_NOT_PERFORMED" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            x.stableCode === "IMAGING_REPORT_MISSING" && x.sourceEntityId === d.sourceEntityId
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "ECG_NOT_ACQUIRED" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            x.stableCode === "ECG_INTERPRETATION_MISSING" &&
            (x.sourceEntityId === d.sourceEntityId ||
              x.deduplicationKey.includes(d.sourceEntityId!))
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "RESULT_REVIEW_REQUIRED" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            (x.stableCode === "LAB_RESULT_UNREVIEWED" ||
              x.stableCode === "IMAGING_FINAL_REPORT_UNREVIEWED") &&
            x.sourceEntityId === d.sourceEntityId
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "CRITICAL_RESULT_ACKNOWLEDGMENT_MISSING" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            (x.stableCode === "LAB_CRITICAL_RESULT_UNACKNOWLEDGED" ||
              x.stableCode === "IMAGING_CRITICAL_FINDING_UNACKNOWLEDGED") &&
            x.sourceEntityId === d.sourceEntityId
        )
      ) {
        return false;
      }
    }
    if (d.stableCode === "DIAGNOSTIC_ORDER_PENDING" && d.sourceEntityId) {
      if (
        keyed.some(
          (x) =>
            (x.stableCode === "LAB_RESULT_MISSING" ||
              x.stableCode === "LAB_SPECIMEN_NOT_COLLECTED" ||
              x.stableCode === "IMAGING_NOT_PERFORMED") &&
            x.sourceEntityId === d.sourceEntityId
        )
      ) {
        return false;
      }
    }
    return true;
  });
}
