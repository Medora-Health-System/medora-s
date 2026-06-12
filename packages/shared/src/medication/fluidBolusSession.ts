/**
 * IV fluid bolus session lifecycle (K.10B.8A).
 * Parsed from OrderEvent metadata — separate from CONTINUOUS_FLUID and MEDICATION_INFUSION.
 */
import { parseFluidBagSizeMl } from "./continuousFluidOrder.js";
import { formatFluidDurationShort } from "./continuousFluidSession.js";

export const FLUID_BOLUS_INFUSION_SCOPE = "FLUID_BOLUS" as const;

export type FluidBolusSessionAction = "START_BOLUS" | "COMPLETE_BOLUS";

export type FluidBolusSessionStatus = "DUE" | "RUNNING" | "COMPLETED";

export type FluidBolusSessionEvent = {
  action: FluidBolusSessionAction;
  at: string;
  sessionKey: string;
  performedByUserId?: string | null;
};

export type FluidBolusSessionSnapshot = {
  sessionKey: string | null;
  status: FluidBolusSessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  bolusVolumeMl: number | null;
  events: FluidBolusSessionEvent[];
};

export type FluidBolusIntakeContribution = {
  volumeMl: number;
  fluidTypeLabel: string | null;
  source: "FLUID_BOLUS";
};

export function resolveFluidBolusIntakeContribution(input: {
  volumeMl: number;
  fluidTypeLabel?: string | null;
}): FluidBolusIntakeContribution | null {
  if (!Number.isFinite(input.volumeMl) || input.volumeMl <= 0) return null;
  return {
    volumeMl: Math.round(input.volumeMl),
    fluidTypeLabel: input.fluidTypeLabel?.trim() || null,
    source: "FLUID_BOLUS",
  };
}

export function parseFluidBolusOrderEventMeta(metadata: unknown): {
  scope: string | null;
  action: FluidBolusSessionAction | null;
  sessionKey: string | null;
  at: string | null;
  orderItemId: string | null;
  bolusVolumeMl: number | null;
  performedByUserId: string | null;
} | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const scope = typeof m.infusionScope === "string" ? m.infusionScope : null;
  if (scope !== FLUID_BOLUS_INFUSION_SCOPE) return null;
  const rawAction = typeof m.fluidAction === "string" ? m.fluidAction.toUpperCase() : null;
  const action =
    rawAction === "START_BOLUS" || rawAction === "COMPLETE_BOLUS" ? rawAction : null;
  const sessionKey =
    typeof m.fluidSessionKey === "string"
      ? m.fluidSessionKey
      : typeof m.infusionSessionKey === "string"
        ? m.infusionSessionKey
        : null;
  const at =
    typeof m.fluidActionAt === "string"
      ? m.fluidActionAt
      : typeof m.completedAt === "string"
        ? m.completedAt
        : null;
  const bolusVolumeMl =
    typeof m.bolusVolumeMl === "number" && Number.isFinite(m.bolusVolumeMl)
      ? Math.round(m.bolusVolumeMl)
      : null;
  return {
    scope,
    action,
    sessionKey,
    at,
    orderItemId: typeof m.orderItemId === "string" ? m.orderItemId : null,
    bolusVolumeMl,
    performedByUserId:
      typeof m.performedByUserId === "string" ? m.performedByUserId : null,
  };
}

export function resolveFluidBolusSessionFromEvents(
  orderItemId: string,
  events: Array<{ metadata: unknown }>,
  directionsSig?: string | null
): FluidBolusSessionSnapshot {
  const parsedEvents: FluidBolusSessionEvent[] = [];
  let sessionKey: string | null = null;
  let bolusVolumeMl: number | null = parseFluidBagSizeMl(directionsSig);

  for (const row of events) {
    const meta = parseFluidBolusOrderEventMeta(row.metadata);
    if (!meta || meta.orderItemId !== orderItemId || !meta.action || !meta.at) continue;
    if (meta.sessionKey) sessionKey = meta.sessionKey;
    if (meta.bolusVolumeMl != null) bolusVolumeMl = meta.bolusVolumeMl;
    parsedEvents.push({
      action: meta.action,
      at: meta.at,
      sessionKey: meta.sessionKey ?? sessionKey ?? "",
      performedByUserId: meta.performedByUserId,
    });
  }

  if (parsedEvents.length === 0) {
    return {
      sessionKey: null,
      status: "DUE",
      startedAt: null,
      completedAt: null,
      bolusVolumeMl,
      events: [],
    };
  }

  const starts = parsedEvents.filter((e) => e.action === "START_BOLUS");
  const completes = parsedEvents.filter((e) => e.action === "COMPLETE_BOLUS");
  const startedAt = starts.at(-1)?.at ?? null;
  const completedAt = completes.at(-1)?.at ?? null;

  if (completedAt) {
    return {
      sessionKey,
      status: "COMPLETED",
      startedAt,
      completedAt,
      bolusVolumeMl,
      events: parsedEvents,
    };
  }

  if (startedAt) {
    return {
      sessionKey,
      status: "RUNNING",
      startedAt,
      completedAt: null,
      bolusVolumeMl,
      events: parsedEvents,
    };
  }

  return {
    sessionKey,
    status: "DUE",
    startedAt: null,
    completedAt: null,
    bolusVolumeMl,
    events: parsedEvents,
  };
}

export type FluidBolusTransitionValidationCode =
  | "bolus_start_without_volume"
  | "bolus_duplicate_active"
  | "bolus_complete_before_start"
  | "bolus_complete_when_completed"
  | "bolus_negative_duration";

export function validateFluidBolusTransition(input: {
  current: FluidBolusSessionStatus;
  action: FluidBolusSessionAction;
  bolusVolumeMl?: number | null;
  startedAt?: string | null;
  proposedAt?: Date | string;
}): { code: FluidBolusTransitionValidationCode; message: string } | null {
  const { current, action } = input;

  if (action === "START_BOLUS") {
    if (!input.bolusVolumeMl || input.bolusVolumeMl <= 0) {
      return {
        code: "bolus_start_without_volume",
        message: "Bolus volume is required.",
      };
    }
    if (current === "RUNNING") {
      return {
        code: "bolus_duplicate_active",
        message: "A bolus is already active for this line.",
      };
    }
    if (current === "COMPLETED") {
      return {
        code: "bolus_duplicate_active",
        message: "Cannot restart a completed bolus on this line.",
      };
    }
    return null;
  }

  if (action === "COMPLETE_BOLUS") {
    if (current === "DUE" || !input.startedAt) {
      return {
        code: "bolus_complete_before_start",
        message: "Cannot complete bolus before it is started.",
      };
    }
    if (current === "COMPLETED") {
      return {
        code: "bolus_complete_when_completed",
        message: "Bolus is already completed.",
      };
    }
    if (input.proposedAt && input.startedAt) {
      const start = new Date(input.startedAt);
      const end = new Date(input.proposedAt);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        return {
          code: "bolus_negative_duration",
          message: "Completion time cannot be before start time.",
        };
      }
    }
    return null;
  }

  return null;
}

export function formatFluidBolusCompletedTimeRange(input: {
  startedAt: string;
  completedAt: string;
  facilityTimeZone?: string | null;
  formatTime: (iso: string, tz?: string | null) => string;
}): string {
  const start = input.formatTime(input.startedAt, input.facilityTimeZone);
  const end = input.formatTime(input.completedAt, input.facilityTimeZone);
  return `${start}–${end}`;
}

export function computeFluidBolusDurationMs(input: {
  startedAt: string;
  completedAt: string;
}): number {
  const start = new Date(input.startedAt);
  const end = new Date(input.completedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return end.getTime() - start.getTime();
}

export function formatFluidBolusDurationLabel(input: {
  startedAt: string;
  completedAt: string;
}): string {
  return formatFluidDurationShort(
    computeFluidBolusDurationMs({ startedAt: input.startedAt, completedAt: input.completedAt })
  );
}
