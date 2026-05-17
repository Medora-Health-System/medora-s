import {
  labRadEffectiveTimeIsLargeBackdate,
  labRadEffectiveTimeRequiresDetailedReason,
  labRadEffectiveTimeRequiresReason,
  labRadEffectiveTimesDiffer,
  parseLabRadiologyEffectiveClinicalTimeIso,
  toLabRadiologyEffectiveClinicalTimeIsoUtc,
} from "@medora/shared";

export function labRadModalRequiresReason(input: {
  effectiveClinicalTimeIso: string;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date;
  adjustmentVersion: number;
}): boolean {
  const effective = parseLabRadiologyEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return labRadEffectiveTimeRequiresReason({
    effectiveTime: effective,
    documentedAt: input.documentedAt,
    orderCreatedAt: input.orderCreatedAt,
    orderItemCreatedAt: input.orderItemCreatedAt,
    adjustmentVersion: input.adjustmentVersion,
  });
}

export function labRadModalRequiresDetailedReason(input: {
  effectiveClinicalTimeIso: string;
  documentedAt: Date;
  reason: string;
}): boolean {
  const effective = parseLabRadiologyEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return labRadEffectiveTimeRequiresDetailedReason({
    effectiveTime: effective,
    documentedAt: input.documentedAt,
    reason: input.reason,
  });
}

export function labRadModalIsLargeBackdate(input: {
  effectiveClinicalTimeIso: string;
  documentedAt: Date;
}): boolean {
  const effective = parseLabRadiologyEffectiveClinicalTimeIso(input.effectiveClinicalTimeIso);
  if (!effective) return false;
  return labRadEffectiveTimeIsLargeBackdate(effective, input.documentedAt);
}

export function datetimeLocalValueToUtcIso(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return toLabRadiologyEffectiveClinicalTimeIsoUtc(d);
}

export function resolveLabRadMilestoneDisplay(input: {
  documentedAt: string | Date | null | undefined;
  effectiveAt: string | Date | null | undefined;
  version: number;
}): {
  clinicalIso: string | null;
  documentedIso: string | null;
  showAdjustedBadge: boolean;
  showDualLabels: boolean;
} {
  const documented = toDate(input.documentedAt);
  if (!documented) {
    return { clinicalIso: null, documentedIso: null, showAdjustedBadge: false, showDualLabels: false };
  }
  const documentedIso = toLabRadiologyEffectiveClinicalTimeIsoUtc(documented);
  const effective = toDate(input.effectiveAt) ?? documented;
  const clinicalIso = toLabRadiologyEffectiveClinicalTimeIsoUtc(effective);
  const timesDiffer = labRadEffectiveTimesDiffer(effective, documented);
  const showAdjustedBadge = (input.version ?? 0) > 0 || timesDiffer;
  const showDualLabels = showAdjustedBadge && timesDiffer;
  return { clinicalIso, documentedIso, showAdjustedBadge, showDualLabels };
}

function toDate(raw: string | Date | null | undefined): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "string" && raw.trim()) {
    return parseLabRadiologyEffectiveClinicalTimeIso(raw);
  }
  return null;
}
