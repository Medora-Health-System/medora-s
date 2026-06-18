export type BillingLedgerArtifactNotReadyPayload = {
  status: "NOT_READY";
  blockers: string[];
  warnings: string[];
  summary: Record<string, unknown> | null;
  message?: string;
};

export function isBillingLedgerArtifactNotReady(
  value: unknown
): value is BillingLedgerArtifactNotReadyPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as BillingLedgerArtifactNotReadyPayload).status === "NOT_READY"
  );
}

export function billingLedgerArtifactNotReadyMessage(
  payload: BillingLedgerArtifactNotReadyPayload,
  fallback: string
): string {
  if (payload.message?.trim()) return payload.message.trim();
  if (payload.blockers.length > 0) return payload.blockers.join(", ");
  return fallback;
}
