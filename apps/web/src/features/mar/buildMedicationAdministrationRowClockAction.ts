import { medicationAdministrationRowIsInfusionTerminal } from "@medora/shared";
import {
  canShowMedicationAdministrationTimeClock,
  resolveMedicationAdministrationDisplayTimes,
  type MedicationAdministrationTimeFields,
} from "./medicationAdministrationEffectiveTimeDisplay";

export type MarAdminClockTooltipKey =
  | "marTab.adminTime.adjustTooltip"
  | "marTab.adminTime.adjustStopTooltip"
  | "marTab.adminTime.infusionDeferred";

export type MedicationAdministrationRowClockAction = {
  /** Render the compact clock control (enabled or disabled). */
  show: boolean;
  enabled: boolean;
  administrationId: string | null;
  tooltipKey: MarAdminClockTooltipKey;
  showAdjustedBadge: boolean;
};

/**
 * Per MAR task-row clock target — always binds to a specific MedicationAdministration.id (never orderItemId).
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
    showAdjustedBadge: false,
  };

  const { administration, encounterOpen, canAdjust } = input;
  if (!encounterOpen || !canAdjust || !administration?.id?.trim()) {
    return none;
  }

  const displayTimes = resolveMedicationAdministrationDisplayTimes(administration);
  const infusionTerminal = medicationAdministrationRowIsInfusionTerminal(administration.notes);

  if (infusionTerminal) {
    return {
      show: true,
      enabled: false,
      administrationId: administration.id,
      tooltipKey: "marTab.adminTime.infusionDeferred",
      showAdjustedBadge: displayTimes.showAdjustedBadge,
    };
  }

  const enabled = canShowMedicationAdministrationTimeClock(administration, {
    encounterOpen,
    canAdjust,
  });

  if (!enabled) {
    return none;
  }

  return {
    show: true,
    enabled: true,
    administrationId: administration.id,
    tooltipKey: "marTab.adminTime.adjustTooltip",
    showAdjustedBadge: displayTimes.showAdjustedBadge,
  };
}
