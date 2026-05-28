import type {
  BillingClassification,
  ClaimAssemblyPackageType,
  ClaimAssemblyPreviewStatus,
  ClaimAssemblyReason,
} from "@medora/shared";

export function claimAssemblyStatusLabelKey(status: ClaimAssemblyPreviewStatus): string {
  return `claimAssemblyPreview.status.${status}`;
}

export function claimAssemblyPackageTypeLabelKey(packageType: ClaimAssemblyPackageType): string {
  return `claimAssemblyPreview.packageType.${packageType}`;
}

export function claimAssemblyReasonLabelKey(reason: ClaimAssemblyReason): string {
  return `claimAssemblyPreview.reason.${reason}`;
}

export function claimAssemblyStatusCardBackground(status: ClaimAssemblyPreviewStatus): string {
  switch (status) {
    case "READY_FOR_EXPORT_REVIEW":
      return "#ecfdf5";
    case "HOLD_FOR_OPEN_ENCOUNTER":
    case "HOLD_FOR_PENDING_RESULTS":
      return "#fffbeb";
    case "NOT_APPLICABLE":
      return "#f8fafc";
    default:
      return "#fff7ed";
  }
}

export function claimAssemblyClassificationFilterOptions(): BillingClassification[] {
  return [
    "CLINIC_VISIT",
    "URGENT_CARE",
    "EMERGENCY_DEPARTMENT",
    "OBSERVATION",
    "INPATIENT",
    "PROCEDURE",
    "TELEHEALTH",
  ];
}

export function claimAssemblyStatusFilterOptions(): ClaimAssemblyPreviewStatus[] {
  return [
    "READY_FOR_EXPORT_REVIEW",
    "NEEDS_CODING_REVIEW",
    "NEEDS_CHARGE_REVIEW",
    "NEEDS_FACILITY_REVIEW",
    "NEEDS_PROVIDER_CLARIFICATION",
    "HOLD_FOR_OPEN_ENCOUNTER",
    "HOLD_FOR_PENDING_RESULTS",
    "NOT_READY",
    "NOT_APPLICABLE",
  ];
}

export function claimAssemblyPackageTypeFilterOptions(): ClaimAssemblyPackageType[] {
  return [
    "PROFESSIONAL_CMS_1500",
    "FACILITY_UB_04",
    "BOTH_PROFESSIONAL_AND_FACILITY",
    "TELEHEALTH_PROFESSIONAL",
    "PROCEDURE_REVIEW",
    "NO_PACKAGE",
  ];
}

export function claimAssemblyNextActionLabelKey(status: ClaimAssemblyPreviewStatus): string {
  return `claimAssemblyPreview.nextAction.${status}`;
}
