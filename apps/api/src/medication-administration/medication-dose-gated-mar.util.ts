import { BadRequestException } from "@nestjs/common";
import type { MedicationDoseInstance, MedicationOrderSchedule } from "@prisma/client";
import {
  evaluateDoseGatedMarEligibility,
  type MedicationCatalogSnapshotInput,
  type MedicationDoseGatedMarEligibilityReason,
  type MedicationScheduleClassification,
  type MedicationSchedulingFeatureFlags,
  resolveDoseStatusAfterTerminalMar,
  shouldSkipOrderLineCompletionForDoseGatedMar,
} from "@medora/shared";
import { marValidationBadRequest } from "./mar-create-validation-log.util";

export type LoadedDoseGatedMarContext = {
  doseInstance: MedicationDoseInstance & { medicationOrderSchedule: MedicationOrderSchedule };
  doseGatedMarPathUsed: true;
  scheduleClassification: MedicationScheduleClassification;
  nextDoseStatus: "COMPLETED";
  skipOrderLineCompletion: boolean;
};

const ELIGIBILITY_REASON_MESSAGES: Record<MedicationDoseGatedMarEligibilityReason, string> = {
  DOSE_GATED_MAR_ELIGIBLE: "Éligible.",
  DOSE_GATED_MAR_FLAGS_OFF: "Administration liée à une dose non disponible (fonctionnalité désactivée).",
  SCHEDULE_NOT_ACTIVE: "Le calendrier de médication n'est pas actif pour cette dose.",
  NOT_RECURRING: "Cette dose n'est pas éligible à une administration récurrente.",
  NOT_FIXED_ADMINISTRATION: "Type de dose non pris en charge pour l'administration.",
  INFUSION_LIFECYCLE: "Ce médicament requiert une documentation infusion début/fin.",
  DIRECT_MAR: "Cette ordonnance utilise une administration directe (sans dose planifiée).",
  ON_DEMAND: "Cette ordonnance est à la demande (PRN) — administration par dose non disponible.",
  DOSE_ALREADY_TERMINAL: "Cette dose est déjà terminée. Le MAR a été actualisé.",
  DOSE_STATUS_NOT_ADMINISTRABLE: "Cette dose n'est pas administrable dans son état actuel.",
  DOSE_OUTSIDE_ADMINISTRATION_WINDOW: "Cette dose est en dehors de la fenêtre d'administration.",
  DOSE_ALREADY_HAS_TERMINAL_MAR:
    "Le statut de la dose a été modifié par un autre clinicien. Le MAR a été actualisé.",
  ORDER_ITEM_MISMATCH: "La dose ne correspond pas à la ligne d'ordre indiquée.",
  ENCOUNTER_MISMATCH: "La dose n'appartient pas à cette consultation.",
  FACILITY_MISMATCH: "Établissement invalide pour cette dose.",
  EXPANSION_INELIGIBLE: "Cette ordonnance n'est pas éligible au calendrier de doses.",
};

export function doseGatedMarEligibilityBadRequest(
  reason: MedicationDoseGatedMarEligibilityReason
): BadRequestException {
  return marValidationBadRequest(`DOSE_GATED_MAR_${reason}`, ELIGIBILITY_REASON_MESSAGES[reason]);
}

function parseCatalogSnapshotFromDose(
  json: unknown
): MedicationCatalogSnapshotInput | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationCatalogSnapshotInput;
}

export function resolveLoadedDoseGatedMarContext(input: {
  doseInstance: MedicationDoseInstance & { medicationOrderSchedule: MedicationOrderSchedule };
  featureFlags: MedicationSchedulingFeatureFlags;
  requestOrderItemId: string | null | undefined;
  requestEncounterId: string;
  requestFacilityId: string;
  orderRoute: string | null | undefined;
  marAction: string;
  now?: Date;
}): LoadedDoseGatedMarContext {
  const schedule = input.doseInstance.medicationOrderSchedule;
  const eligibility = evaluateDoseGatedMarEligibility({
    featureFlags: input.featureFlags,
    scheduleClassification: schedule.scheduleClassification,
    scheduleStatus: schedule.scheduleStatus,
    doseKind: input.doseInstance.doseKind,
    doseStatus: input.doseInstance.doseStatus,
    terminalMedicationAdministrationId: input.doseInstance.terminalMedicationAdministrationId,
    frequencyCode: schedule.frequencyCode,
    catalog: parseCatalogSnapshotFromDose(input.doseInstance.medicationCatalogSnapshotJson),
    orderRoute: input.orderRoute ?? null,
    doseOrderItemId: input.doseInstance.orderItemId,
    requestOrderItemId: input.requestOrderItemId ?? input.doseInstance.orderItemId,
    doseEncounterId: input.doseInstance.encounterId,
    requestEncounterId: input.requestEncounterId,
    doseFacilityId: input.doseInstance.facilityId,
    requestFacilityId: input.requestFacilityId,
    now: input.now,
    dueWindowStartAt: input.doseInstance.dueWindowStartAt,
    dueWindowEndAt: input.doseInstance.dueWindowEndAt,
  });

  if (!eligibility.eligible || !eligibility.scheduleClassification) {
    throw doseGatedMarEligibilityBadRequest(eligibility.reason);
  }

  const transition = resolveDoseStatusAfterTerminalMar({
    marAction: input.marAction,
    currentDoseStatus: input.doseInstance.doseStatus,
  });
  if (!transition.ok) {
    throw marValidationBadRequest(
      `DOSE_GATED_MAR_${transition.code}`,
      transition.message
    );
  }

  const skipOrderLineCompletion = shouldSkipOrderLineCompletionForDoseGatedMar({
    featureFlags: input.featureFlags,
    frequencyCode: schedule.frequencyCode,
    scheduleClassification: eligibility.scheduleClassification,
    doseGatedMarPathUsed: true,
  });

  return {
    doseInstance: input.doseInstance,
    doseGatedMarPathUsed: true,
    scheduleClassification: eligibility.scheduleClassification,
    nextDoseStatus: transition.nextStatus,
    skipOrderLineCompletion,
  };
}
