/**
 * D3D — Observation orders boundary vs ED orders (same order engine, separate encounter scope).
 */

export type ObservationOrderLane = "COMPLETED_ED" | "ACTIVE_OBSERVATION" | "PENDING_OBSERVATION";

export type ObservationOrderBucketInput = {
  orderEncounterId: string;
  observationEncounterId: string;
  originatingEdEncounterId?: string | null;
  status?: string | null;
};

export function classifyObservationOrderLane(
  input: ObservationOrderBucketInput
): ObservationOrderLane {
  const orderEnc = String(input.orderEncounterId).trim();
  const obsEnc = String(input.observationEncounterId).trim();
  const edEnc = String(input.originatingEdEncounterId ?? "").trim();
  const status = String(input.status ?? "").trim().toUpperCase();

  if (edEnc && orderEnc === edEnc) {
    return "COMPLETED_ED";
  }
  if (orderEnc === obsEnc) {
    if (status === "PENDING" || status === "DRAFT" || status === "SUBMITTED") {
      return "PENDING_OBSERVATION";
    }
    return "ACTIVE_OBSERVATION";
  }
  // Unknown encounter — treat as non-Observation (do not merge into Obs active).
  return "COMPLETED_ED";
}

/** Observation must not silently inherit ED order rows as active Obs orders. */
export function observationOrdersMustNotDuplicateEdOrders(): boolean {
  return true;
}
