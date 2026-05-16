import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "@medora/shared";
import {
  canShowMedicationAdministrationTimeClock,
  pickMedicationAdministrationClockTarget,
  resolveMedicationAdministrationDisplayTimes,
  type MedicationAdministrationTimeFields,
} from "./medicationAdministrationEffectiveTimeDisplay";

export type MarAdminClockTooltipKey =
  | "marTab.adminTime.adjustTooltip"
  | "marTab.adminTime.adjustStartTooltip"
  | "marTab.adminTime.adjustStopTooltip";

export type MarAdminClockActionKind = "admin" | "infusionStart" | "infusionStop" | "none";

export type MedicationAdministrationRowClockAction = {
  show: boolean;
  enabled: boolean;
  administrationId: string | null;
  tooltipKey: MarAdminClockTooltipKey;
  actionKind: MarAdminClockActionKind;
  showAdjustedBadge: boolean;
};

/**
 * Per MAR task-row clock — binds to one MedicationAdministration.id (never orderItemId).
 * Infusion stop terminal rows adjust effectiveAdministeredAt only (OrderEvent unchanged).
 */
export function buildMedicationAdministrationRowClockAction(input: {
  administration: MedicationAdministrationTimeFields | null | undefined;
  encounterOpen: boolean;
  canAdjust: boolean;
}): MedicationAdministrationRowClockAction {
  const none: MedicationAdministrationRowClockAction = {
    show: false,
    enabled: false,
    administrationId: null,
    tooltipKey: "marTab.adminTime.adjustTooltip",
    actionKind: "none",
    showAdjustedBadge: false,
  };

  const { administration, encounterOpen, canAdjust } = input;
  if (!encounterOpen || !canAdjust || !administration?.id?.trim()) {
    return none;
  }

  const enabled = canShowMedicationAdministrationTimeClock(administration, {
    encounterOpen,
    canAdjust,
  });
  if (!enabled) {
    return none;
  }

  const displayTimes = resolveMedicationAdministrationDisplayTimes(administration);
  const infusionStop = medicationAdministrationRowIsInfusionStop(
    administration.notes,
    administration.infusionPhase
  );
  const infusionStart = medicationAdministrationRowIsInfusionStart(
    administration.notes,
    administration.infusionPhase
  );

  return {
    show: true,
    enabled: true,
    administrationId: administration.id,
    tooltipKey: infusionStop
      ? "marTab.adminTime.adjustStopTooltip"
      : infusionStart
        ? "marTab.adminTime.adjustStartTooltip"
        : "marTab.adminTime.adjustTooltip",
    actionKind: infusionStop ? "infusionStop" : infusionStart ? "infusionStart" : "admin",
    showAdjustedBadge: displayTimes.showAdjustedBadge,
  };
}

export function buildMedicationAdministrationTaskRowClockAction(input: {
  administrations: MedicationAdministrationTimeFields[];
  encounterOpen: boolean;
  canAdjust: boolean;
  infusionActive?: boolean;
  activeInfusionSessionKey?: string | null;
}): MedicationAdministrationRowClockAction {
  const target = pickMedicationAdministrationClockTarget(input.administrations, {
    infusionActive: input.infusionActive,
    activeInfusionSessionKey: input.activeInfusionSessionKey,
  });
  if (!target) {
    return {
      show: false,
      enabled: false,
      administrationId: null,
      tooltipKey: input.infusionActive
        ? "marTab.adminTime.adjustStartTooltip"
        : "marTab.adminTime.adjustTooltip",
      actionKind: "none",
      showAdjustedBadge: false,
    };
  }
  return buildMedicationAdministrationRowClockAction({
    administration: target,
    encounterOpen: input.encounterOpen,
    canAdjust: input.canAdjust,
  });
}

export function buildMedicationAdministrationRowDocumentAction(input: {
  encounterOpen: boolean;
  canAdjust: boolean;
}): { show: boolean } {
  return { show: input.encounterOpen && input.canAdjust };
}
