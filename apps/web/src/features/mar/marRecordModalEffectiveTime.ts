import {
  medicationAdminTimeModalIsLargeBackdate,
} from "./medicationAdministrationEffectiveTimeDisplay";

/** PATCH effective-administered-time body (must match medicationAdministrationEffectiveTimeDtoSchema). */
export function buildMarPatchEffectiveTimeRequestBody(input: {
  effectiveTimeUtcIso: string;
  reason?: string;
}): { effectiveAdministeredTime: string; reason?: string } {
  const iso = input.effectiveTimeUtcIso.trim();
  const reason = input.reason?.trim();
  return {
    effectiveAdministeredTime: iso,
    ...(reason ? { reason } : {}),
  };
}

/** Build create payload fields; effectiveAdministeredAt is always UTC ISO (never local storage). */
export function buildMarCreateEffectiveTimeRequestFields(input: {
  effectiveTimeLocal: string;
  effectiveTimeReason: string;
  toUtcIso: (local: string) => string | null;
}): { effectiveAdministeredAt: string; effectiveAdministeredAtReason?: string } | null {
  const trimmed = input.effectiveTimeLocal.trim();
  if (!trimmed) return null;
  const iso = input.toUtcIso(trimmed);
  if (!iso) return null;
  const reason = input.effectiveTimeReason.trim();
  return {
    effectiveAdministeredAt: iso,
    ...(reason ? { effectiveAdministeredAtReason: reason } : {}),
  };
}

export function marRecordModalEffectiveTimeClientError(input: {
  effectiveTimeLocal: string;
  effectiveTimeReason: string;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  orderCancelledAt: Date | null;
  controlledMedication: boolean;
  toUtcIso: (local: string) => string | null;
  t: (key: string) => string;
}): string | null {
  const trimmed = input.effectiveTimeLocal.trim();
  if (!trimmed) return null;
  const iso = input.toUtcIso(trimmed);
  if (!iso) return input.t("marTab.adminTime.invalidTime");

  return null;
}

/** Amber supervisory warning in Record modal when delta > 24h (does not block save). */
export function marRecordModalShowsLargeBackdateSupervisoryWarning(input: {
  effectiveTimeLocal: string;
  documentedAt: Date;
  toUtcIso: (local: string) => string | null;
}): boolean {
  const trimmed = input.effectiveTimeLocal.trim();
  if (!trimmed) return false;
  const iso = input.toUtcIso(trimmed);
  if (!iso) return false;
  return medicationAdminTimeModalIsLargeBackdate({
    effectiveAdministeredTimeIso: iso,
    systemDocumentedAt: input.documentedAt,
  });
}
