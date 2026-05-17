/**
 * Billing capture must never run on RN acknowledgement — only on documented completion paths.
 */

export function orderItemStatusEligibleForBillingCapture(status: string | null | undefined): boolean {
  return (status ?? "").trim().toUpperCase() === "COMPLETED";
}
