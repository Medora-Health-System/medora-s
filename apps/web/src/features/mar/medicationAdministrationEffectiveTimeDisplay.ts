import {
  medicationAdminEffectiveTimeIsLargeBackdate,
  medicationAdminEffectiveTimeRequiresDetailedReason,
  medicationAdminEffectiveTimeRequiresReason,
  medicationAdminEffectiveTimesDiffer,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
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
  infusionPhase?: string | null;
  infusionSessionKey?: string | null;
  pendingSync?: boolean;
};

export type PickMedicationAdministrationClockTargetOpts = {
  infusionActive?: boolean;
  /** Active infusion session from OrderEvent metadata — prevents cross-session clock binding. */
  activeInfusionSessionKey?: string | null;
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
  return true;
}

function administeredMarRows(
  administrations: MedicationAdministrationTimeFields[]
): MedicationAdministrationTimeFields[] {
  return administrations.filter((row) => {
    if (!row.id?.trim() || row.pendingSync) return false;
    if (!toDate(row.administeredAt)) return false;
    const marAction = resolveMedicationMarActionFromStorage({
      marAction: row.marAction ?? null,
      notes: row.notes ?? null,
    });
    return marAction === "administered";
  });
}

function filterBySessionKey(
  rows: MedicationAdministrationTimeFields[],
  sessionKey: string | null | undefined
): MedicationAdministrationTimeFields[] {
  const sk = sessionKey?.trim();
  if (!sk) return rows;
  const matched = rows.filter((row) => row.infusionSessionKey?.trim() === sk);
  return matched.length > 0 ? matched : rows;
}

/** MAR row bound to the 🧭 for a task line (infusion START while active, STOP when completed). */
export function pickMedicationAdministrationClockTarget(
  administrations: MedicationAdministrationTimeFields[],
  opts?: PickMedicationAdministrationClockTargetOpts
): MedicationAdministrationTimeFields | null {
  const eligible = administeredMarRows(administrations);
  if (!eligible.length) return null;

  const byAdministeredDesc = (rows: MedicationAdministrationTimeFields[]) =>
    [...rows].sort(
      (a, b) =>
        new Date(String(b.administeredAt)).getTime() - new Date(String(a.administeredAt)).getTime()
    );

  if (opts?.infusionActive) {
    let starts = eligible.filter((row) =>
      medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)
    );
    starts = filterBySessionKey(starts, opts.activeInfusionSessionKey);
    if (starts.length) return byAdministeredDesc(starts)[0] ?? null;
    return null;
  }

  let stops = eligible.filter((row) =>
    medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)
  );
  stops = filterBySessionKey(stops, opts?.activeInfusionSessionKey);
  if (stops.length) return byAdministeredDesc(stops)[0] ?? null;

  const standard = eligible.filter(
    (row) =>
      !medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase) &&
      !medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)
  );
  return byAdministeredDesc(standard.length ? standard : eligible)[0] ?? null;
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
