import { z } from "zod";

/** Provider medication order lifecycle statuses (enterprise model). */
export const MEDICATION_ORDER_LIFECYCLE_STATUS_VALUES = [
  "ACTIVE",
  "ON_HOLD",
  "DISCONTINUED",
  "COMPLETED",
  "EXPIRED",
  "SUPERSEDED",
  "CANCELED_ENTERED_IN_ERROR",
] as const;

export type MedicationOrderLifecycleStatus =
  (typeof MEDICATION_ORDER_LIFECYCLE_STATUS_VALUES)[number];

export const MEDICATION_ORDER_DISCONTINUE_REASON_VALUES = [
  "Changement clinique",
  "Effet indésirable",
  "Amélioration clinique",
  "Doublon",
  "Erreur de prescription",
  "Non disponible",
  "Autre",
] as const;

export const medicationOrderDiscontinueDtoSchema = z.object({
  reason: z.enum(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES, {
    errorMap: () => ({ message: "Motif requis." }),
  }),
  note: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500).optional()
  ),
  effectiveAt: z.coerce.date().optional(),
});

export type MedicationOrderDiscontinueDto = z.infer<
  typeof medicationOrderDiscontinueDtoSchema
>;

export const medicationOrderHoldDtoSchema = z.object({
  reason: z.enum(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES, {
    errorMap: () => ({ message: "Motif requis." }),
  }),
  note: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500).optional()
  ),
});

export type MedicationOrderHoldDto = z.infer<typeof medicationOrderHoldDtoSchema>;

export const medicationOrderEditDtoSchema = z.object({
  frequencyCode: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(64).optional()
  ),
  strength: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(128).optional()
  ),
  route: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(64).optional()
  ),
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(8000).optional()
  ),
  intendedAdministrationAt: z.coerce.date().optional(),
  effectiveAt: z.coerce.date().optional(),
  reason: z.enum(MEDICATION_ORDER_DISCONTINUE_REASON_VALUES, {
    errorMap: () => ({ message: "Motif requis." }),
  }),
  note: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500).optional()
  ),
});

export type MedicationOrderEditDto = z.infer<typeof medicationOrderEditDtoSchema>;

export const medicationOrderDiscontinueAndReorderDtoSchema =
  medicationOrderDiscontinueDtoSchema.extend({
    replacement: z.object({
      catalogItemId: z.string().uuid().optional(),
      manualLabel: z.string().trim().max(256).optional(),
      quantity: z.coerce.number().int().positive().optional(),
      strength: z.string().trim().max(128).optional(),
      route: z.string().trim().max(64).optional(),
      frequencyCode: z.string().trim().max(64).optional(),
      notes: z.string().trim().max(8000).optional(),
      medicationFulfillmentIntent: z.enum(["ADMINISTER_CHART", "PHARMACY_DISPENSE"]).optional(),
      intendedAdministrationAt: z.coerce.date().optional(),
    }),
  });

export type MedicationOrderDiscontinueAndReorderDto = z.infer<
  typeof medicationOrderDiscontinueAndReorderDtoSchema
>;

export function parseMedicationOrderLifecycleStatus(
  value: string | null | undefined
): MedicationOrderLifecycleStatus | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return MEDICATION_ORDER_LIFECYCLE_STATUS_VALUES.includes(
    normalized as MedicationOrderLifecycleStatus
  )
    ? (normalized as MedicationOrderLifecycleStatus)
    : null;
}

/** Default lifecycle for legacy rows without explicit status. */
export function resolveMedicationOrderLifecycleStatus(
  value: string | null | undefined
): MedicationOrderLifecycleStatus {
  return parseMedicationOrderLifecycleStatus(value) ?? "ACTIVE";
}

export function isMedicationOrderLifecycleTerminal(
  status: MedicationOrderLifecycleStatus
): boolean {
  return (
    status === "DISCONTINUED" ||
    status === "SUPERSEDED" ||
    status === "CANCELED_ENTERED_IN_ERROR" ||
    status === "COMPLETED" ||
    status === "EXPIRED"
  );
}

export function isMedicationOrderLifecycleMarBlocked(
  status: MedicationOrderLifecycleStatus
): boolean {
  return status === "ON_HOLD" || isMedicationOrderLifecycleTerminal(status);
}

/** Future MAR dose after effective discontinue/hold time should not remain actionable. */
export function isMedicationDoseMarActionableForLifecycle(input: {
  lifecycleStatus: MedicationOrderLifecycleStatus;
  doseStatus: string;
  scheduledAt: Date;
  effectiveAt: Date | null;
  hasActiveInfusion: boolean;
}): boolean {
  if (input.hasActiveInfusion && input.doseStatus === "IN_PROGRESS") {
    return true;
  }
  if (input.lifecycleStatus === "ON_HOLD") {
    return false;
  }
  if (
    input.lifecycleStatus === "DISCONTINUED" ||
    input.lifecycleStatus === "SUPERSEDED" ||
    input.lifecycleStatus === "CANCELED_ENTERED_IN_ERROR"
  ) {
    const effective = input.effectiveAt ?? new Date(0);
    if (input.scheduledAt.getTime() >= effective.getTime()) {
      return false;
    }
    if (input.doseStatus === "COMPLETED" || input.doseStatus === "MISSED") {
      return false;
    }
    return input.scheduledAt.getTime() < effective.getTime();
  }
  return input.lifecycleStatus === "ACTIVE" || input.lifecycleStatus === "COMPLETED";
}

export function medicationOrderLifecycleBlocksMutation(
  status: MedicationOrderLifecycleStatus
): boolean {
  return (
    status === "DISCONTINUED" ||
    status === "SUPERSEDED" ||
    status === "CANCELED_ENTERED_IN_ERROR" ||
    status === "COMPLETED" ||
    status === "EXPIRED"
  );
}

export function medicationOrderLifecycleAllowsResume(
  status: MedicationOrderLifecycleStatus
): boolean {
  return status === "ON_HOLD";
}

export function medicationOrderLifecycleAllowsHold(
  status: MedicationOrderLifecycleStatus
): boolean {
  return status === "ACTIVE";
}

export function medicationOrderLifecycleAllowsEdit(
  status: MedicationOrderLifecycleStatus
): boolean {
  return status === "ACTIVE" || status === "ON_HOLD";
}
