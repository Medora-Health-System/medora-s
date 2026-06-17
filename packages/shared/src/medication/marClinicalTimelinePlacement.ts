/**
 * MEDUI.ED.MAR.H9K — clinical event time placement for MAR timeline cells.
 * Timeline columns must reflect when care happened clinically, not when it was charted.
 */

import { parseMarUniversalClinicalTimeNotes } from "../mar/marUniversalClinicalTimeGovernance.js";
import type { MarShiftTimelineDosePlacementFluidInput } from "./marShiftTimeline.js";
import { isIvpbSessionDoseKind } from "./medicationDoseKind.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "./medicationDoseStatus.js";

export type MarClinicalTimelinePlacementKind =
  | "ADMINISTERED"
  | "INFUSION_START"
  | "INFUSION_STOP"
  | "IVPB_START"
  | "IVPB_STOP"
  | "BOLUS_START"
  | "BOLUS_COMPLETE";

export type MarClinicalTimelinePlacementInput = {
  kind: MarClinicalTimelinePlacementKind;
  scheduledAt?: Date | string | null;
  administeredAt?: Date | string | null;
  effectiveAdministeredAt?: Date | string | null;
  documentedAt?: Date | string | null;
  clinicalStartAt?: Date | string | null;
  clinicalStopAt?: Date | string | null;
  clinicalCompleteAt?: Date | string | null;
  notes?: string | null;
};

function parseClinicalInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const instant = value instanceof Date ? value : new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function firstClinicalInstant(
  ...candidates: Array<Date | string | null | undefined>
): Date | null {
  for (const candidate of candidates) {
    const parsed = parseClinicalInstant(candidate);
    if (parsed) return parsed;
  }
  return null;
}

/** Prefer effective/clinical timestamps; never use documentation-only time for placement. */
export function resolveMarClinicalAdministrationPlacementInstant(input: {
  administeredAt?: Date | string | null;
  effectiveAdministeredAt?: Date | string | null;
  notes?: string | null;
  scheduledAt?: Date | string | null;
}): Date | null {
  const universal = input.notes ? parseMarUniversalClinicalTimeNotes(input.notes) : null;
  return firstClinicalInstant(
    universal?.clinicalTime,
    input.effectiveAdministeredAt,
    input.administeredAt,
    input.scheduledAt
  );
}

export function resolveMarClinicalTimelinePlacementInstant(
  input: MarClinicalTimelinePlacementInput
): Date | null {
  const universal = input.notes ? parseMarUniversalClinicalTimeNotes(input.notes) : null;

  switch (input.kind) {
    case "ADMINISTERED":
      return resolveMarClinicalAdministrationPlacementInstant({
        administeredAt: input.administeredAt,
        effectiveAdministeredAt: input.effectiveAdministeredAt,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
      });
    case "INFUSION_START":
    case "IVPB_START":
    case "BOLUS_START":
      return firstClinicalInstant(
        universal?.clinicalTime,
        input.clinicalStartAt,
        input.effectiveAdministeredAt,
        input.administeredAt,
        input.scheduledAt
      );
    case "INFUSION_STOP":
    case "IVPB_STOP":
    case "BOLUS_COMPLETE":
      return firstClinicalInstant(
        universal?.clinicalTime,
        input.clinicalCompleteAt,
        input.clinicalStopAt,
        input.effectiveAdministeredAt,
        input.administeredAt,
        input.clinicalStartAt,
        input.scheduledAt
      );
    default:
      return null;
  }
}

export type MarClinicalFluidOverlayInput = {
  fluidStartedAt?: string | null;
  fluidStoppedAt?: string | null;
  fluidCompletedAt?: string | null;
  marStartedAt?: string | null;
  marStoppedAt?: string | null;
  marAdministeredAt?: string | null;
  marNotes?: string | null;
};

/** Overlay MAR clinical timestamps onto order-event fluid session reconstruction. */
export function mergeMarClinicalFluidOverlay(
  input: MarClinicalFluidOverlayInput
): {
  clinicalStartAt: string | null;
  clinicalStopAt: string | null;
  clinicalCompleteAt: string | null;
} {
  const startNotes = input.marNotes;
  const stopNotes = input.marNotes;

  const clinicalStart = resolveMarClinicalTimelinePlacementInstant({
    kind: "BOLUS_START",
    clinicalStartAt: input.marStartedAt ?? input.fluidStartedAt,
    administeredAt: input.marAdministeredAt,
    notes: startNotes,
  });
  const clinicalStop = resolveMarClinicalTimelinePlacementInstant({
    kind: "INFUSION_STOP",
    clinicalStopAt: input.marStoppedAt ?? input.fluidStoppedAt,
    clinicalCompleteAt: input.fluidCompletedAt,
    administeredAt: input.marAdministeredAt,
    notes: stopNotes,
  });
  const clinicalComplete = resolveMarClinicalTimelinePlacementInstant({
    kind: "BOLUS_COMPLETE",
    clinicalCompleteAt: input.fluidCompletedAt ?? input.marStoppedAt,
    clinicalStopAt: input.marStoppedAt ?? input.fluidStoppedAt,
    administeredAt: input.marAdministeredAt,
    notes: stopNotes,
  });

  return {
    clinicalStartAt: clinicalStart?.toISOString() ?? input.marStartedAt ?? input.fluidStartedAt ?? null,
    clinicalStopAt: clinicalStop?.toISOString() ?? input.marStoppedAt ?? input.fluidStoppedAt ?? null,
    clinicalCompleteAt:
      clinicalComplete?.toISOString() ?? input.fluidCompletedAt ?? input.marStoppedAt ?? null,
  };
}

export function buildMarInfusionTimelinePlacement(input: {
  doseStatus: MedicationDoseStatus | string;
  scheduledAt: Date;
  startedAt?: string | null;
  stoppedAt?: string | null;
  administeredAt?: string | null;
  notes?: string | null;
  isContinuousFluid?: boolean;
}): Date {
  const status =
    typeof input.doseStatus === "string"
      ? parseMedicationDoseStatus(input.doseStatus)
      : input.doseStatus;

  if (status === "IN_PROGRESS") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: input.isContinuousFluid ? "INFUSION_START" : "INFUSION_START",
        clinicalStartAt: input.startedAt,
        administeredAt: input.administeredAt,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  if (status === "COMPLETED") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "INFUSION_STOP",
        clinicalStopAt: input.stoppedAt,
        administeredAt: input.administeredAt,
        notes: input.notes,
        clinicalStartAt: input.startedAt,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  return input.scheduledAt;
}

export function buildMarBolusTimelinePlacement(input: {
  bolusStatus?: string | null;
  doseStatus: MedicationDoseStatus | string;
  scheduledAt: Date;
  clinicalStartAt?: string | null;
  clinicalCompleteAt?: string | null;
  marNotes?: string | null;
}): Date {
  const status =
    typeof input.doseStatus === "string"
      ? parseMedicationDoseStatus(input.doseStatus)
      : input.doseStatus;
  const bolusStatus = input.bolusStatus?.trim().toUpperCase() ?? "";

  if (bolusStatus === "RUNNING" || status === "IN_PROGRESS") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "BOLUS_START",
        clinicalStartAt: input.clinicalStartAt,
        notes: input.marNotes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  if (bolusStatus === "COMPLETED" || status === "COMPLETED") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "BOLUS_COMPLETE",
        clinicalCompleteAt: input.clinicalCompleteAt,
        clinicalStartAt: input.clinicalStartAt,
        notes: input.marNotes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  return input.scheduledAt;
}

export function buildMarIvpbTimelinePlacement(input: {
  doseStatus: MedicationDoseStatus | string;
  scheduledAt: Date;
  startedAt?: string | null;
  stoppedAt?: string | null;
  administeredAt?: string | null;
  notes?: string | null;
}): Date {
  const status =
    typeof input.doseStatus === "string"
      ? parseMedicationDoseStatus(input.doseStatus)
      : input.doseStatus;

  if (status === "IN_PROGRESS") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "IVPB_START",
        clinicalStartAt: input.startedAt,
        administeredAt: input.administeredAt,
        notes: input.notes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  if (status === "COMPLETED") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "IVPB_STOP",
        clinicalStopAt: input.stoppedAt,
        administeredAt: input.administeredAt,
        notes: input.notes,
        clinicalStartAt: input.startedAt,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  return input.scheduledAt;
}

/** H9K — dose-level placement used by shift timeline and universal clinical time governance. */
export function resolveMarClinicalDoseTimelinePlacementInstant(input: {
  doseStatus: MedicationDoseStatus | string;
  doseKind?: string | null;
  scheduledAt: Date;
  enrichment?: {
    startedAt?: string | null;
    stoppedAt?: string | null;
    administeredAt?: string | null;
    administrationNotes?: string | null;
  } | null;
  fluid?: MarShiftTimelineDosePlacementFluidInput | null;
}): Date {
  const status =
    typeof input.doseStatus === "string"
      ? parseMedicationDoseStatus(input.doseStatus)
      : input.doseStatus;
  if (!status) return input.scheduledAt;

  const fluid = input.fluid;
  if (fluid?.isFluidBolus) {
    const merged = mergeMarClinicalFluidOverlay({
      fluidStartedAt: fluid.fluidStartedAt,
      fluidStoppedAt: fluid.fluidStoppedAt,
      fluidCompletedAt: fluid.fluidCompletedAt,
      marStartedAt: input.enrichment?.startedAt,
      marStoppedAt: input.enrichment?.stoppedAt,
      marAdministeredAt: input.enrichment?.administeredAt,
      marNotes: input.enrichment?.administrationNotes,
    });
    return buildMarBolusTimelinePlacement({
      bolusStatus: fluid.fluidBolusStatus,
      doseStatus: status,
      scheduledAt: input.scheduledAt,
      clinicalStartAt: merged.clinicalStartAt,
      clinicalCompleteAt: merged.clinicalCompleteAt,
      marNotes: input.enrichment?.administrationNotes,
    });
  }

  if (fluid?.isContinuousFluid) {
    const merged = mergeMarClinicalFluidOverlay({
      fluidStartedAt: fluid.fluidStartedAt,
      fluidStoppedAt: fluid.fluidStoppedAt,
      marStartedAt: input.enrichment?.startedAt,
      marStoppedAt: input.enrichment?.stoppedAt,
      marAdministeredAt: input.enrichment?.administeredAt,
      marNotes: input.enrichment?.administrationNotes,
    });
    return buildMarInfusionTimelinePlacement({
      doseStatus: status,
      scheduledAt: input.scheduledAt,
      startedAt: merged.clinicalStartAt,
      stoppedAt: merged.clinicalStopAt,
      administeredAt: input.enrichment?.administeredAt,
      notes: input.enrichment?.administrationNotes,
      isContinuousFluid: true,
    });
  }

  const enrichment = input.enrichment;
  if (isIvpbSessionDoseKind(input.doseKind)) {
    return buildMarIvpbTimelinePlacement({
      doseStatus: status,
      scheduledAt: input.scheduledAt,
      startedAt: enrichment?.startedAt,
      stoppedAt: enrichment?.stoppedAt,
      administeredAt: enrichment?.administeredAt,
      notes: enrichment?.administrationNotes,
    });
  }

  if (status === "COMPLETED" || isTerminalMedicationDoseStatus(status)) {
    return (
      resolveMarClinicalAdministrationPlacementInstant({
        administeredAt: enrichment?.administeredAt,
        notes: enrichment?.administrationNotes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      resolveMarClinicalTimelinePlacementInstant({
        kind: "INFUSION_START",
        clinicalStartAt: enrichment?.startedAt,
        administeredAt: enrichment?.administeredAt,
        notes: enrichment?.administrationNotes,
        scheduledAt: input.scheduledAt,
      }) ?? input.scheduledAt
    );
  }

  return input.scheduledAt;
}
