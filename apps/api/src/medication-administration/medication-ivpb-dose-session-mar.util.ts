import { BadRequestException } from "@nestjs/common";
import type { MedicationDoseInstance, MedicationOrderSchedule } from "@prisma/client";
import {
  evaluateIvpbDoseSessionEligibility,
  type IvpbDoseSessionEligibilityReason,
  medicationIvpbDoseSchedulingEnabled,
  recurringIvpbSkipsSingleDoseOrderLineCompletion,
  resolveIvpbDoseStatusTransition,
  type IvpbDoseStatusTransitionReason,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";
import { marValidationBadRequest } from "./mar-create-validation-log.util";

export type LoadedIvpbDoseSessionMarContext = {
  doseInstance: MedicationDoseInstance & { medicationOrderSchedule: MedicationOrderSchedule };
  ivpbDoseSessionPathUsed: true;
  action: "START" | "STOP";
  nextDoseStatus: "IN_PROGRESS" | "COMPLETED";
  skipOrderLineCompletion: boolean;
  infusionSessionId: string;
};

const ELIGIBILITY_REASON_MESSAGES: Record<IvpbDoseSessionEligibilityReason, string> = {
  IVPB_DOSE_SESSION_ELIGIBLE: "Éligible.",
  NOT_IVPB_SESSION_DOSE_KIND: "Cette dose n'est pas une session IVPB planifiée.",
  NOT_RECURRING_IVPB_SCHEDULE: "Calendrier IVPB récurrent requis pour cette dose.",
  INVALID_DOSE_STATUS: "État de dose invalide.",
  DOSE_ALREADY_TERMINAL: "Cette dose est déjà terminée.",
  DOSE_NOT_IN_PROGRESS: "La dose n'est pas en cours de perfusion.",
  DOSE_NOT_STARTABLE: "Cette dose n'est pas prête à démarrer.",
  DOSE_ALREADY_IN_PROGRESS: "Une perfusion est déjà liée à cette dose.",
  INFUSION_SESSION_REQUIRED_FOR_STOP: "Session de perfusion requise pour arrêter.",
  ACTION_NOT_APPLICABLE: "Action non applicable pour cette dose.",
};

const TRANSITION_REASON_MESSAGES: Record<IvpbDoseStatusTransitionReason, string> = {
  TRANSITION_ALLOWED: "Transition autorisée.",
  INVALID_CURRENT_STATUS: "État de dose invalide.",
  INVALID_TRANSITION: "Transition de dose non autorisée.",
  DOSE_ALREADY_TERMINAL: "Cette dose est déjà terminée.",
  HELD_DOES_NOT_COMPLETE: "Une dose en attente ne peut pas être complétée.",
  MISSED_DOES_NOT_RESTART: "Une dose manquée ne peut pas redémarrer.",
};

export function ivpbDoseSessionEligibilityBadRequest(
  reason: IvpbDoseSessionEligibilityReason
): BadRequestException {
  return marValidationBadRequest(
    `IVPB_DOSE_SESSION_${reason}`,
    ELIGIBILITY_REASON_MESSAGES[reason]
  );
}

export function resolveLoadedIvpbDoseSessionMarContext(input: {
  doseInstance: MedicationDoseInstance & { medicationOrderSchedule: MedicationOrderSchedule };
  featureFlags: MedicationSchedulingFeatureFlags;
  action: "START" | "STOP";
  infusionSessionId: string;
  requestOrderItemId: string;
  requestEncounterId: string;
  requestFacilityId: string;
}): LoadedIvpbDoseSessionMarContext {
  if (!medicationIvpbDoseSchedulingEnabled(input.featureFlags)) {
    throw ivpbDoseSessionEligibilityBadRequest("ACTION_NOT_APPLICABLE");
  }

  if (input.doseInstance.facilityId !== input.requestFacilityId) {
    throw ivpbDoseSessionEligibilityBadRequest("ACTION_NOT_APPLICABLE");
  }
  if (input.doseInstance.encounterId !== input.requestEncounterId) {
    throw ivpbDoseSessionEligibilityBadRequest("ACTION_NOT_APPLICABLE");
  }
  if (input.doseInstance.orderItemId !== input.requestOrderItemId) {
    throw ivpbDoseSessionEligibilityBadRequest("ACTION_NOT_APPLICABLE");
  }

  const eligibility = evaluateIvpbDoseSessionEligibility({
    doseKind: input.doseInstance.doseKind,
    doseStatus: input.doseInstance.doseStatus,
    scheduleClassification: input.doseInstance.scheduleClassificationSnapshot,
    infusionSessionId:
      input.action === "STOP"
        ? input.infusionSessionId
        : input.doseInstance.infusionSessionId,
    action: input.action,
  }) as { eligible: boolean; reason: IvpbDoseSessionEligibilityReason };

  if (!eligibility.eligible) {
    throw ivpbDoseSessionEligibilityBadRequest(eligibility.reason);
  }

  const transition = resolveIvpbDoseStatusTransition({
    currentStatus: input.doseInstance.doseStatus,
    action: input.action,
  });
  if (!transition.ok) {
    throw marValidationBadRequest(
      `IVPB_DOSE_${transition.reason}`,
      TRANSITION_REASON_MESSAGES[transition.reason] ?? transition.message
    );
  }

  if (transition.nextStatus !== "IN_PROGRESS" && transition.nextStatus !== "COMPLETED") {
    throw marValidationBadRequest(
      "IVPB_DOSE_INVALID_TRANSITION",
      "Transition IVPB non prise en charge."
    );
  }

  const skipOrderLineCompletion =
    input.action === "STOP" &&
    recurringIvpbSkipsSingleDoseOrderLineCompletion(
      input.doseInstance.scheduleClassificationSnapshot
    );

  return {
    doseInstance: input.doseInstance,
    ivpbDoseSessionPathUsed: true,
    action: input.action,
    nextDoseStatus: transition.nextStatus,
    skipOrderLineCompletion,
    infusionSessionId: input.infusionSessionId,
  };
}
