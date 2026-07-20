import {
  DiagnosticCategory,
  DiagnosticLifecycleState,
  type DiagnosticOrderItemSnapshot,
  type NormalizedDiagnosticItem,
} from "./types.js";

const ECG_PROCEDURE_IDS = new Set(["ekg_ecg", "ekg_rhythm_strip"]);

export function classifyDiagnosticCategory(item: DiagnosticOrderItemSnapshot): DiagnosticCategory {
  const orderType = (item.orderType ?? "").trim().toUpperCase();
  const catalog = (item.catalogItemType ?? "").trim().toUpperCase();
  const proc = (item.enterpriseProcedureId ?? "").trim();

  if (orderType === "MEDICATION" || catalog === "MEDICATION") {
    return DiagnosticCategory.MEDICATION;
  }
  if (orderType === "LAB" || catalog === "LAB_TEST") {
    return DiagnosticCategory.LABORATORY;
  }
  if (orderType === "IMAGING" || catalog === "IMAGING_STUDY") {
    return DiagnosticCategory.IMAGING;
  }
  if (
    orderType === "CARE" ||
    catalog === "CARE" ||
    ECG_PROCEDURE_IDS.has(proc)
  ) {
    if (ECG_PROCEDURE_IDS.has(proc)) return DiagnosticCategory.ECG;
    return DiagnosticCategory.PROCEDURE_NON_DIAGNOSTIC;
  }
  return DiagnosticCategory.OTHER;
}

function isCancelled(item: DiagnosticOrderItemSnapshot): boolean {
  const order = (item.orderStatus ?? "").toUpperCase();
  const status = (item.itemStatus ?? "").toUpperCase();
  const life = (item.lifecycleState ?? "").toUpperCase();
  return (
    Boolean(item.cancelledAt) ||
    order === "CANCELLED" ||
    status === "CANCELLED" ||
    life === "CANCELLED"
  );
}

function isEnteredInError(item: DiagnosticOrderItemSnapshot): boolean {
  const med = (item.medicationLifecycleStatus ?? "").toUpperCase();
  return med === "CANCELED_ENTERED_IN_ERROR" || med === "ENTERED_IN_ERROR";
}

function isSuperseded(item: DiagnosticOrderItemSnapshot): boolean {
  return Boolean((item.supersededByOrderItemId ?? "").trim());
}

function hasCollection(item: DiagnosticOrderItemSnapshot): boolean {
  return Boolean(
    (item.effectiveCollectedAt ?? "").trim() || (item.documentedCollectedAt ?? "").trim()
  );
}

function hasPerformance(item: DiagnosticOrderItemSnapshot): boolean {
  return Boolean(
    (item.effectivePerformedAt ?? "").trim() ||
      (item.documentedPerformedAt ?? "").trim() ||
      (item.completedAt ?? "").trim() ||
      (item.documentedCompletedAt ?? "").trim()
  );
}

function itemTerminalComplete(item: DiagnosticOrderItemSnapshot): boolean {
  const status = (item.itemStatus ?? "").toUpperCase();
  const life = (item.lifecycleState ?? "").toUpperCase();
  return (
    status === "COMPLETED" ||
    status === "VERIFIED" ||
    status === "RESULTED" ||
    life === "COMPLETED" ||
    life === "REVIEWED"
  );
}

/**
 * Deterministic normalization of repository Order/OrderItem/Result into Stage B2 lifecycle.
 * Does not mutate persistence enums.
 */
export function normalizeDiagnosticOrderItem(
  item: DiagnosticOrderItemSnapshot
): NormalizedDiagnosticItem {
  const category = classifyDiagnosticCategory(item);
  const sourceStatus = `${item.orderStatus}/${item.itemStatus}/${item.lifecycleState ?? ""}`;

  const base: Omit<NormalizedDiagnosticItem, "normalizedLifecycle" | "exclusionReason" | "resultRequired" | "reviewRequired" | "criticalAckRequired" | "responsibleRole" | "sourceAuthority"> = {
    orderId: item.orderId,
    orderItemId: item.orderItemId,
    category,
    sourceStatus,
    lifecycleState: item.lifecycleState,
    placedAt: item.placedAt,
    updatedAt: item.updatedAt,
    orderedBy: item.orderedBy,
    snapshot: item,
  };

  if (item.isFutureOutpatient) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.FUTURE_NOT_APPLICABLE,
      exclusionReason: "FUTURE_OUTPATIENT",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "SYSTEM",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (category === DiagnosticCategory.MEDICATION) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.EXCLUDED_MEDICATION,
      exclusionReason: "MEDICATION_ORDERS_DEFERRED_B3",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (category === DiagnosticCategory.PROCEDURE_NON_DIAGNOSTIC) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.EXCLUDED_PROCEDURE,
      exclusionReason: "NON_DIAGNOSTIC_PROCEDURE_DEFERRED",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (item.statusConflict) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.UNKNOWN,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: true,
      criticalAckRequired: Boolean(item.result?.criticalValue),
      responsibleRole: category === DiagnosticCategory.LABORATORY ? "LABORATORY" : "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (isEnteredInError(item)) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.ENTERED_IN_ERROR,
      exclusionReason: "ENTERED_IN_ERROR",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "SYSTEM",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (isSuperseded(item)) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.DUPLICATE_SUPERSEDED,
      exclusionReason: "SUPERSEDED",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "SYSTEM",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (isCancelled(item)) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.CANCELLED_VALID,
      exclusionReason: "CANCELLED",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (item.refusalDocumented) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.REFUSED_VALID,
      exclusionReason: "REFUSED",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "NURSING",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (item.notPerformedDocumented) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.NOT_PERFORMED_VALID,
      exclusionReason: "NOT_PERFORMED",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (item.unableToObtain) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.NOT_PERFORMED_VALID,
      exclusionReason: "UNABLE_TO_OBTAIN",
      resultRequired: false,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "NURSING",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  const result = item.result;
  const criticalAckRequired = Boolean(result?.criticalValue);
  const isLab = category === DiagnosticCategory.LABORATORY;
  const isImaging = category === DiagnosticCategory.IMAGING;
  const isEcg = category === DiagnosticCategory.ECG;

  if (item.sendOut && !result?.verifiedAt && item.followUpActive && item.followUpOwnerPresent) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.EXTERNAL_FOLLOW_UP,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: false,
      criticalAckRequired,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (isLab && item.specimenRejected) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.BLOCKING_UNRESOLVED,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "LABORATORY",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (isLab && !hasCollection(item) && !result) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.BLOCKING_UNRESOLVED,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: "NURSING",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if ((isImaging || isEcg) && !hasPerformance(item) && !result && !itemTerminalComplete(item)) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.BLOCKING_UNRESOLVED,
      exclusionReason: null,
      resultRequired: isImaging,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: isEcg ? "NURSING" : "IMAGING",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (!result || !result.hasResultPayload) {
    if (isEcg && hasPerformance(item)) {
      return {
        ...base,
        normalizedLifecycle: DiagnosticLifecycleState.PENDING_REVIEW,
        exclusionReason: null,
        resultRequired: false,
        reviewRequired: true,
        criticalAckRequired: false,
        responsibleRole: "PROVIDER",
        sourceAuthority: "STAGE_B2_EVALUATED",
      };
    }
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.BLOCKING_UNRESOLVED,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: false,
      criticalAckRequired: false,
      responsibleRole: isLab ? "LABORATORY" : "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  const verified = Boolean(result.verifiedAt);
  const acknowledged = Boolean(result.acknowledgedByProviderAt);
  const status = (item.itemStatus ?? "").toUpperCase();
  const life = (item.lifecycleState ?? "").toUpperCase();
  const reviewed = status === "VERIFIED" || life === "REVIEWED" || acknowledged;

  if (criticalAckRequired && !acknowledged) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.BLOCKING_UNRESOLVED,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: true,
      criticalAckRequired: true,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (!verified && result.preliminaryAcceptable) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.PENDING_ACCEPTABLE,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: false,
      criticalAckRequired,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (!verified) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.PENDING_REVIEW,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: true,
      criticalAckRequired,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  if (!reviewed) {
    return {
      ...base,
      normalizedLifecycle: DiagnosticLifecycleState.PENDING_REVIEW,
      exclusionReason: null,
      resultRequired: true,
      reviewRequired: true,
      criticalAckRequired,
      responsibleRole: "PROVIDER",
      sourceAuthority: "STAGE_B2_EVALUATED",
    };
  }

  return {
    ...base,
    normalizedLifecycle: DiagnosticLifecycleState.COMPLETE,
    exclusionReason: null,
    resultRequired: true,
    reviewRequired: true,
    criticalAckRequired,
    responsibleRole: "PROVIDER",
    sourceAuthority: "STAGE_B2_EVALUATED",
  };
}

export function normalizeAllDiagnosticItems(
  items: readonly DiagnosticOrderItemSnapshot[]
): NormalizedDiagnosticItem[] {
  return items.map(normalizeDiagnosticOrderItem);
}

export function isB2IncludedCategory(category: DiagnosticCategory): boolean {
  return (
    category === DiagnosticCategory.LABORATORY ||
    category === DiagnosticCategory.IMAGING ||
    category === DiagnosticCategory.ECG
  );
}

export function computeDiagnosticRevision(
  items: readonly DiagnosticOrderItemSnapshot[],
  ecgDocs: readonly { updatedAt: string | null }[]
): string {
  let max = "";
  for (const i of items) {
    for (const t of [i.updatedAt, i.placedAt, i.result?.updatedAt, i.result?.verifiedAt, i.result?.acknowledgedByProviderAt]) {
      if (t && t > max) max = t;
    }
  }
  for (const e of ecgDocs) {
    if (e.updatedAt && e.updatedAt > max) max = e.updatedAt;
  }
  return max || "none";
}
