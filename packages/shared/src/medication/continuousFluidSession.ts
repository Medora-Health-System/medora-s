/**
 * Continuous IV fluid session state + volume accounting (K.10B.8).
 * Parsed from OrderEvent metadata — no dedicated DB table required.
 */
import {
  resolveFluidRateMlPerHrForVolume,
  type FluidRateResolution,
} from "./continuousFluidOrder.js";

export const CONTINUOUS_FLUID_INFUSION_SCOPE = "CONTINUOUS_FLUID" as const;

export type ContinuousFluidSessionAction = "START" | "PAUSE" | "RESUME" | "STOP";

export type ContinuousFluidSessionStatus = "DUE" | "RUNNING" | "PAUSED" | "COMPLETED";

export type ContinuousFluidSessionEvent = {
  action: ContinuousFluidSessionAction;
  at: string;
  sessionKey: string;
  performedByUserId?: string | null;
};

export type ContinuousFluidSessionSnapshot = {
  sessionKey: string | null;
  status: ContinuousFluidSessionStatus;
  startedAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  stoppedAt: string | null;
  events: ContinuousFluidSessionEvent[];
};

export type FluidVolumeInfusedInput = {
  rateMlPerHr: number | null;
  startedAt: Date | string;
  stoppedAt: Date | string;
  pausedIntervals?: Array<{ pausedAt: Date | string; resumedAt: Date | string | null }>;
};

export type FluidIntakeContribution = {
  volumeMl: number;
  fluidTypeLabel: string | null;
  source: "CONTINUOUS_FLUID";
};

function toDate(value: Date | string): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function msBetween(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime());
}

/** Active running milliseconds minus paused intervals. */
export function calculateActiveFluidRunningMs(input: {
  startedAt: Date | string;
  endAt: Date | string;
  pausedIntervals?: Array<{ pausedAt: Date | string; resumedAt: Date | string | null }>;
}): number {
  const start = toDate(input.startedAt);
  const end = toDate(input.endAt);
  if (!start || !end || end < start) return 0;

  let total = msBetween(start, end);
  for (const interval of input.pausedIntervals ?? []) {
    const paused = toDate(interval.pausedAt);
    const resumed = interval.resumedAt ? toDate(interval.resumedAt) : end;
    if (!paused || !resumed || resumed <= paused) continue;
    const pauseStart = paused < start ? start : paused;
    const pauseEnd = resumed > end ? end : resumed;
    if (pauseEnd > pauseStart) {
      total -= msBetween(pauseStart, pauseEnd);
    }
  }
  return Math.max(0, total);
}

/** Volume infused = active hours × rate (mL/hr). */
export function calculateFluidVolumeInfused(input: FluidVolumeInfusedInput): number {
  const rate = input.rateMlPerHr;
  if (rate == null || rate <= 0) return 0;
  const activeMs = calculateActiveFluidRunningMs({
    startedAt: input.startedAt,
    endAt: input.stoppedAt,
    pausedIntervals: input.pausedIntervals,
  });
  const hours = activeMs / (60 * 60 * 1000);
  return Math.round(rate * hours);
}

export function resolveFluidIntakeContribution(input: {
  volumeMl: number;
  fluidTypeLabel?: string | null;
}): FluidIntakeContribution | null {
  if (!Number.isFinite(input.volumeMl) || input.volumeMl <= 0) return null;
  return {
    volumeMl: Math.round(input.volumeMl),
    fluidTypeLabel: input.fluidTypeLabel?.trim() || null,
    source: "CONTINUOUS_FLUID",
  };
}

export function formatFluidDurationShort(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function buildPausedIntervalsFromEvents(
  events: ContinuousFluidSessionEvent[]
): Array<{ pausedAt: string; resumedAt: string | null }> {
  const intervals: Array<{ pausedAt: string; resumedAt: string | null }> = [];
  let openPause: string | null = null;
  for (const ev of events) {
    if (ev.action === "PAUSE") openPause = ev.at;
    if (ev.action === "RESUME" && openPause) {
      intervals.push({ pausedAt: openPause, resumedAt: ev.at });
      openPause = null;
    }
  }
  if (openPause) {
    intervals.push({ pausedAt: openPause, resumedAt: null });
  }
  return intervals;
}

export function parseContinuousFluidOrderEventMeta(
  metadata: unknown
): {
  scope: string | null;
  action: ContinuousFluidSessionAction | null;
  sessionKey: string | null;
  at: string | null;
  orderItemId: string | null;
  performedByUserId: string | null;
} | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const scope = typeof m.infusionScope === "string" ? m.infusionScope : null;
  if (scope !== CONTINUOUS_FLUID_INFUSION_SCOPE) return null;
  const rawAction = typeof m.fluidAction === "string" ? m.fluidAction.toUpperCase() : null;
  const action =
    rawAction === "START" ||
    rawAction === "PAUSE" ||
    rawAction === "RESUME" ||
    rawAction === "STOP"
      ? rawAction
      : null;
  const sessionKey =
    typeof m.fluidSessionKey === "string"
      ? m.fluidSessionKey
      : typeof m.infusionSessionKey === "string"
        ? m.infusionSessionKey
        : null;
  const at =
    typeof m.fluidActionAt === "string"
      ? m.fluidActionAt
      : typeof m.infusionStartedAt === "string"
        ? m.infusionStartedAt
        : typeof m.infusionStoppedAt === "string"
          ? m.infusionStoppedAt
          : null;
  return {
    scope,
    action,
    sessionKey,
    at,
    orderItemId: typeof m.orderItemId === "string" ? m.orderItemId : null,
    performedByUserId:
      typeof m.performedByUserId === "string" ? m.performedByUserId : null,
  };
}

export function resolveContinuousFluidSessionFromEvents(
  orderItemId: string,
  events: Array<{ metadata: unknown }>
): ContinuousFluidSessionSnapshot {
  const parsedEvents: ContinuousFluidSessionEvent[] = [];
  let sessionKey: string | null = null;

  for (const row of events) {
    const meta = parseContinuousFluidOrderEventMeta(row.metadata);
    if (!meta || meta.orderItemId !== orderItemId || !meta.action || !meta.at) continue;
    if (meta.sessionKey) sessionKey = meta.sessionKey;
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
      pausedAt: null,
      resumedAt: null,
      stoppedAt: null,
      events: [],
    };
  }

  const starts = parsedEvents.filter((e) => e.action === "START");
  const stops = parsedEvents.filter((e) => e.action === "STOP");
  const startedAt = starts.at(-1)?.at ?? null;
  const stoppedAt = stops.at(-1)?.at ?? null;

  if (stoppedAt) {
    return {
      sessionKey,
      status: "COMPLETED",
      startedAt,
      pausedAt: null,
      resumedAt: null,
      stoppedAt,
      events: parsedEvents,
    };
  }

  if (!startedAt) {
    return {
      sessionKey,
      status: "DUE",
      startedAt: null,
      pausedAt: null,
      resumedAt: null,
      stoppedAt: null,
      events: parsedEvents,
    };
  }

  const last = parsedEvents.at(-1);
  if (last?.action === "PAUSE") {
    return {
      sessionKey,
      status: "PAUSED",
      startedAt,
      pausedAt: last.at,
      resumedAt: null,
      stoppedAt: null,
      events: parsedEvents,
    };
  }

  return {
    sessionKey,
    status: "RUNNING",
    startedAt,
    pausedAt: null,
    resumedAt: last?.action === "RESUME" ? last.at : null,
    stoppedAt: null,
    events: parsedEvents,
  };
}

export type ContinuousFluidTransitionValidationCode =
  | "fluid_stop_before_start"
  | "fluid_resume_when_completed"
  | "fluid_pause_when_completed"
  | "fluid_duplicate_active_session"
  | "fluid_start_when_running"
  | "fluid_pause_when_not_running"
  | "fluid_resume_when_not_paused"
  | "fluid_negative_duration"
  | "fluid_negative_volume";

export function validateContinuousFluidTransition(input: {
  current: ContinuousFluidSessionStatus;
  action: ContinuousFluidSessionAction;
  proposedAt?: Date | string;
  startedAt?: Date | string | null;
}): { code: ContinuousFluidTransitionValidationCode; message: string } | null {
  const { current, action } = input;

  if (action === "START") {
    if (current === "RUNNING" || current === "PAUSED") {
      return {
        code: "fluid_start_when_running",
        message: "A fluid infusion is already active for this line.",
      };
    }
    if (current === "COMPLETED") {
      return {
        code: "fluid_duplicate_active_session",
        message: "Cannot restart a completed fluid infusion on this line.",
      };
    }
    return null;
  }

  if (action === "PAUSE") {
    if (current === "COMPLETED") {
      return { code: "fluid_pause_when_completed", message: "Fluid infusion is already completed." };
    }
    if (current !== "RUNNING") {
      return { code: "fluid_pause_when_not_running", message: "Fluid is not running." };
    }
    return null;
  }

  if (action === "RESUME") {
    if (current === "COMPLETED") {
      return { code: "fluid_resume_when_completed", message: "Fluid infusion is already completed." };
    }
    if (current !== "PAUSED") {
      return { code: "fluid_resume_when_not_paused", message: "Fluid is not paused." };
    }
    return null;
  }

  if (action === "STOP") {
    if (current === "DUE" || !input.startedAt) {
      return { code: "fluid_stop_before_start", message: "Cannot stop fluid before it is started." };
    }
    if (input.proposedAt && input.startedAt) {
      const start = toDate(input.startedAt);
      const stop = toDate(input.proposedAt);
      if (start && stop && stop < start) {
        return { code: "fluid_negative_duration", message: "Stop time cannot be before start time." };
      }
    }
    return null;
  }

  return null;
}

export function computeFluidVolumeFromSession(input: {
  session: ContinuousFluidSessionSnapshot;
  rate: FluidRateResolution | null;
  asOf?: Date | string;
}): number {
  const rateMl = resolveFluidRateMlPerHrForVolume(input.rate);
  if (!input.session.startedAt || rateMl == null) return 0;
  const endAt = input.session.stoppedAt ?? input.asOf ?? new Date().toISOString();
  const volume = calculateFluidVolumeInfused({
    rateMlPerHr: rateMl,
    startedAt: input.session.startedAt,
    stoppedAt: endAt,
    pausedIntervals: buildPausedIntervalsFromEvents(input.session.events),
  });
  if (volume < 0) return 0;
  return volume;
}

export function validateFluidVolumeNonNegative(volumeMl: number): boolean {
  return Number.isFinite(volumeMl) && volumeMl >= 0;
}
