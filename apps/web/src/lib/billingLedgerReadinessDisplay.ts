import type { BillingLedgerReadinessStatus, BillingLedgerReason } from "@medora/shared";

export function billingLedgerStatusLabelKey(status: BillingLedgerReadinessStatus): string {
  return `billingLedgerReadiness.status.${status}`;
}

export function billingLedgerReasonLabelKey(reason: BillingLedgerReason): string {
  return `billingLedgerReadiness.reason.${reason}`;
}

export function billingLedgerSideAppliesLabelKey(applies: boolean): string {
  return applies
    ? "billingLedgerReadiness.appliesYes"
    : "billingLedgerReadiness.appliesNo";
}

export function billingLedgerSideBackground(status: BillingLedgerReadinessStatus): string {
  if (status === "READY") return "#f0fdf4";
  if (status === "NOT_APPLICABLE") return "#f8fafc";
  if (status === "BLOCKED") return "#fef2f2";
  return "#fffbeb";
}
