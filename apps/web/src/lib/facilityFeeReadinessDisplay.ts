import type {
  FacilityFeeOperationalCategory,
  FacilityFeeReadinessStatus,
  FacilityFeeReason,
  ObservationOperationalStatus,
} from "@medora/shared";

export function facilityFeeCategoryLabelKey(category: FacilityFeeOperationalCategory): string {
  return `facilityFeeReadiness.category.${category}`;
}

export function facilityFeeStatusLabelKey(status: FacilityFeeReadinessStatus): string {
  return `facilityFeeReadiness.status.${status}`;
}

export function observationOperationalStatusLabelKey(status: ObservationOperationalStatus): string {
  return `facilityFeeReadiness.observationStatus.${status}`;
}

export function facilityFeeReasonLabelKey(reason: FacilityFeeReason): string {
  return `facilityFeeReadiness.reason.${reason}`;
}

export function facilityFeeCardBackground(requiresManualReview: boolean): string {
  return requiresManualReview ? "#fffbeb" : "#f0fdf4";
}
