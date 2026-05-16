import {
  careProcedureEffectiveTimeIsLargeBackdate,
  careProcedureEffectiveTimeRequiresDetailedReason,
  careProcedureEffectiveTimeRequiresReason,
  careProcedureEffectiveTimesDiffer,
  CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH,
  isCareProcedureOrderItem,
  parseCareProcedureEffectiveClinicalTimeIso,
  toCareProcedureEffectiveClinicalTimeIsoUtc,
} from "@medora/shared";

export type CareProcedureOrderItemTimeFields = {
  id: string;
  status?: string | null;
  lifecycleState?: string | null;
  catalogItemType?: string | null;
  documentedCompletedAt?: string | Date | null;
  effectiveClinicalAt?: string | Date | null;
  effectiveClinicalAtVersion?: number | null;
  completedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export function canAdjustCareProcedureClinicalTime(roles: string[]): boolean {
  return roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
}

export function canShowCareProcedureClinicalTimeClock(
  orderType: string,
  item: CareProcedureOrderItemTimeFields,
  opts: { encounterOpen: boolean; canAdjust: boolean }
): boolean {
  if (!opts.encounterOpen || !opts.canAdjust) return false;
  if (!isCareProcedureOrderItem(String(item.catalogItemType ?? ""), orderType)) return false;
  const status = String(item.status ?? "").toUpperCase();
  const lifecycle = String(item.lifecycleState ?? "").toUpperCase();
  return status === "COMPLETED" || lifecycle === "COMPLETED";
}

function toDate(raw: string | Date | null | undefined): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "string" && raw.trim()) {
    return parseCareProcedureEffectiveClinicalTimeIso(raw);
  }
  return null;
}

/** Convert browser datetime-local value to UTC ISO for API (never send naive strings). */
export function datetimeLocalValueToUtcIso(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return toCareProcedureEffectiveClinicalTimeIsoUtc(d);
}

export function careProcedureClinicalTimeModalRequiresReason(input: {
  effectiveClinicalTimeIso: string;
  documentedCompletedAt: Date | null;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
}): boolean {
  const effective = parseCareProcedureEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return careProcedureEffectiveTimeRequiresReason({
    effectiveClinicalTime: effective,
    documentedCompletedAt: input.documentedCompletedAt,
    orderCreatedAt: input.orderCreatedAt,
    orderItemCreatedAt: input.orderItemCreatedAt,
    adjustmentVersion: input.adjustmentVersion,
  });
}

export function careProcedureClinicalTimeModalRequiresDetailedReason(input: {
  effectiveClinicalTimeIso: string;
  documentedCompletedAt: Date | null;
  reason: string;
}): boolean {
  const effective = parseCareProcedureEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return careProcedureEffectiveTimeRequiresDetailedReason({
    effectiveClinicalTime: effective,
    documentedCompletedAt: input.documentedCompletedAt,
    reason: input.reason,
  });
}

export function careProcedureClinicalTimeModalIsLargeBackdate(input: {
  effectiveClinicalTimeIso: string;
  documentedCompletedAt: Date | null;
}): boolean {
  const effective = parseCareProcedureEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return careProcedureEffectiveTimeIsLargeBackdate(effective, input.documentedCompletedAt);
}

export function resolveCareProcedureDisplayTimes(item: CareProcedureOrderItemTimeFields): {
  effectiveIso: string | null;
  documentedIso: string | null;
  wasAdjusted: boolean;
  showAdjustedBadge: boolean;
} {
  const effectiveDate = toDate(item.effectiveClinicalAt ?? item.completedAt);
  const documentedDate = toDate(item.documentedCompletedAt ?? item.updatedAt ?? null);
  const effectiveIso = effectiveDate ? toCareProcedureEffectiveClinicalTimeIsoUtc(effectiveDate) : null;
  const documentedIso = documentedDate ? toCareProcedureEffectiveClinicalTimeIsoUtc(documentedDate) : null;
  const wasAdjusted = (item.effectiveClinicalAtVersion ?? 0) > 0;
  const showAdjustedBadge =
    Boolean(effectiveDate && documentedDate && careProcedureEffectiveTimesDiffer(effectiveDate, documentedDate)) ||
    wasAdjusted;
  return { effectiveIso, documentedIso, wasAdjusted, showAdjustedBadge };
}

export { CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH };
