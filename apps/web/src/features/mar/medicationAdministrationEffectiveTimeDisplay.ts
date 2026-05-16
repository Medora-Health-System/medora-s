import {
  medicationAdminEffectiveTimeIsLargeBackdate,
  medicationAdminEffectiveTimeRequiresDetailedReason,
  medicationAdminEffectiveTimeRequiresReason,
  medicationAdminEffectiveTimesDiffer,
  medicationAdministrationRowIsInfusionTerminal,
  MEDICATION_ADMIN_LARGE_BACKDATE_MIN_REASON_LENGTH,
  parseMedicationAdministrationEffectiveTimeIso,
  resolveMedicationMarActionFromStorage,
  toMedicationAdministrationEffectiveTimeIsoUtc,
} from "@medora/shared";

export type MedicationAdministrationTimeFields = {
  id: string;
  administeredAt: string | Date;
  createdAt?: string | Date | null;
  effectiveAdministeredAt?: string | Date | null;
  effectiveAdministeredAtVersion?: number | null;
  marAction?: string | null;
  notes?: string | null;
  pendingSync?: boolean;
};

export function canAdjustMedicationAdministrationTime(roles: string[]): boolean {
  return roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
}

function toDate(raw: string | Date | null | undefined): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "string" && raw.trim()) {
    return parseMedicationAdministrationEffectiveTimeIso(raw);
  }
  return null;
}

export function datetimeLocalValueToUtcIso(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return toMedicationAdministrationEffectiveTimeIsoUtc(d);
}

export function canShowMedicationAdministrationTimeClock(
  row: MedicationAdministrationTimeFields,
  opts: { encounterOpen: boolean; canAdjust: boolean }
): boolean {
  if (!opts.encounterOpen || !opts.canAdjust) return false;
  if (!row.id?.trim()) return false;
  if (!toDate(row.administeredAt)) return false;
  if (row.pendingSync) return false;
  const marAction = resolveMedicationMarActionFromStorage({
    marAction: row.marAction ?? null,
    notes: row.notes ?? null,
  });
  if (marAction !== "administered") return false;
  if (medicationAdministrationRowIsInfusionTerminal(row.notes)) return false;
  return true;
}

export function resolveMedicationAdministrationDisplayTimes(row: MedicationAdministrationTimeFields): {
  effectiveIso: string;
  originalAdministeredIso: string;
  documentedSystemIso: string | null;
  showAdjustedBadge: boolean;
} {
  const original = toDate(row.administeredAt);
  const effective = toDate(row.effectiveAdministeredAt) ?? original;
  const documented = toDate(row.createdAt);
  const originalAdministeredIso = original
    ? toMedicationAdministrationEffectiveTimeIsoUtc(original)
    : "";
  const effectiveIso = effective ? toMedicationAdministrationEffectiveTimeIsoUtc(effective) : originalAdministeredIso;
  const documentedSystemIso = documented
    ? toMedicationAdministrationEffectiveTimeIsoUtc(documented)
    : null;
  const wasAdjusted = (row.effectiveAdministeredAtVersion ?? 0) > 0;
  const showAdjustedBadge =
    wasAdjusted ||
    Boolean(original && effective && medicationAdminEffectiveTimesDiffer(effective, original));
  return { effectiveIso, originalAdministeredIso, documentedSystemIso, showAdjustedBadge };
}

export function medicationAdminTimeModalRequiresReason(input: {
  effectiveAdministeredTimeIso: string;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  adjustmentVersion: number;
  controlledMedication: boolean;
  orderCancelledAt: Date | null;
}): boolean {
  const effective = parseMedicationAdministrationEffectiveTimeIso(input.effectiveAdministeredTimeIso);
  if (!effective) return false;
  const orderItemAnchor = input.orderItemCreatedAt ?? input.orderCreatedAt;
  const beforeOrderExisted = effective.getTime() < orderItemAnchor.getTime();
  const afterOrderDiscontinued =
    input.orderCancelledAt != null && effective.getTime() > input.orderCancelledAt.getTime();
  return medicationAdminEffectiveTimeRequiresReason({
    effectiveAdministeredTime: effective,
    originalAdministeredAt: input.originalAdministeredAt,
    systemDocumentedAt: input.systemDocumentedAt,
    orderCreatedAt: input.orderCreatedAt,
    orderItemCreatedAt: input.orderItemCreatedAt,
    adjustmentVersion: input.adjustmentVersion,
    controlledMedication: input.controlledMedication,
    afterOrderDiscontinued,
    beforeOrderExisted,
  });
}

export function medicationAdminTimeModalRequiresDetailedReason(input: {
  effectiveAdministeredTimeIso: string;
  systemDocumentedAt: Date;
  reason: string;
}): boolean {
  const effective = parseMedicationAdministrationEffectiveTimeIso(input.effectiveAdministeredTimeIso);
  if (!effective) return false;
  return medicationAdminEffectiveTimeRequiresDetailedReason({
    effectiveAdministeredTime: effective,
    systemDocumentedAt: input.systemDocumentedAt,
    reason: input.reason,
  });
}

export function medicationAdminTimeModalIsLargeBackdate(input: {
  effectiveAdministeredTimeIso: string;
  systemDocumentedAt: Date;
}): boolean {
  const effective = parseMedicationAdministrationEffectiveTimeIso(input.effectiveAdministeredTimeIso);
  if (!effective) return false;
  return medicationAdminEffectiveTimeIsLargeBackdate(effective, input.systemDocumentedAt);
}

export { MEDICATION_ADMIN_LARGE_BACKDATE_MIN_REASON_LENGTH };
