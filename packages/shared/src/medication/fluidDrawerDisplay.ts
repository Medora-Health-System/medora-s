/**
 * MAR fluid drawer duration / volume display (K.10B.8A).
 */
import {
  buildPausedIntervalsFromEvents,
  calculateActiveFluidRunningMs,
  computeFluidVolumeFromSession,
  formatFluidDurationShort,
  type ContinuousFluidSessionSnapshot,
} from "./continuousFluidSession.js";
import {
  resolveFluidRate,
  resolveFluidRateMlPerHrForVolume,
} from "./continuousFluidOrder.js";
import {
  computeFluidBolusDurationMs,
  type FluidBolusSessionSnapshot,
} from "./fluidBolusSession.js";

export type FluidDrawerDisplayMetrics = {
  startedAt: string | null;
  pausedAt: string | null;
  stoppedAt: string | null;
  completedAt: string | null;
  runningDurationLabel: string | null;
  activeDurationLabel: string | null;
  totalDurationLabel: string | null;
  volumeInfusedMl: number | null;
  showNumericVolume: boolean;
  bolusVolumeMl: number | null;
};

function msToDurationLabel(ms: number): string {
  return formatFluidDurationShort(Math.max(0, ms));
}

/** Drawer metrics for continuous fluid sessions. */
export function resolveContinuousFluidDrawerMetrics(input: {
  session: ContinuousFluidSessionSnapshot;
  directionsSig?: string | null;
  asOf?: string;
}): FluidDrawerDisplayMetrics {
  const rate = resolveFluidRate(input.directionsSig);
  const rateMl = resolveFluidRateMlPerHrForVolume(rate);
  const showNumericVolume =
    rate?.kind === "rate" && rateMl != null && rateMl > 0;
  const asOf = input.asOf ?? new Date().toISOString();
  const endAt = input.session.stoppedAt ?? asOf;

  const totalMs =
    input.session.startedAt && endAt
      ? Math.max(
          0,
          new Date(endAt).getTime() - new Date(input.session.startedAt).getTime()
        )
      : 0;

  const activeMs =
    input.session.startedAt && endAt
      ? calculateActiveFluidRunningMs({
          startedAt: input.session.startedAt,
          endAt,
          pausedIntervals: buildPausedIntervalsFromEvents(input.session.events),
        })
      : 0;

  const volumeInfusedMl = showNumericVolume
    ? computeFluidVolumeFromSession({
        session: input.session,
        rate,
        asOf: endAt,
      })
    : null;

  const pausedAt =
    input.session.status === "PAUSED"
      ? input.session.pausedAt
      : null;

  let runningDurationLabel: string | null = null;
  let activeDurationLabel: string | null = null;
  let totalDurationLabel: string | null = null;

  if (input.session.status === "RUNNING") {
    runningDurationLabel = msToDurationLabel(activeMs);
    activeDurationLabel = runningDurationLabel;
  } else if (input.session.status === "PAUSED") {
    activeDurationLabel = msToDurationLabel(activeMs);
  } else if (input.session.status === "COMPLETED") {
    totalDurationLabel = msToDurationLabel(totalMs);
    activeDurationLabel = msToDurationLabel(activeMs);
  }

  return {
    startedAt: input.session.startedAt,
    pausedAt,
    stoppedAt: input.session.stoppedAt,
    completedAt: null,
    runningDurationLabel,
    activeDurationLabel,
    totalDurationLabel,
    volumeInfusedMl,
    showNumericVolume,
    bolusVolumeMl: null,
  };
}

/** Drawer metrics for fluid bolus sessions. */
export function resolveFluidBolusDrawerMetrics(input: {
  session: FluidBolusSessionSnapshot;
  asOf?: string;
}): FluidDrawerDisplayMetrics {
  const asOf = input.asOf ?? new Date().toISOString();
  const endAt = input.session.completedAt ?? asOf;
  const durationMs =
    input.session.startedAt && endAt
      ? computeFluidBolusDurationMs({
          startedAt: input.session.startedAt,
          completedAt: endAt,
        })
      : 0;

  const volumeMl =
    input.session.status === "COMPLETED"
      ? input.session.bolusVolumeMl
      : null;

  return {
    startedAt: input.session.startedAt,
    pausedAt: null,
    stoppedAt: null,
    completedAt: input.session.completedAt,
    runningDurationLabel:
      input.session.status === "RUNNING" ? msToDurationLabel(durationMs) : null,
    activeDurationLabel:
      input.session.status === "RUNNING" ? msToDurationLabel(durationMs) : null,
    totalDurationLabel:
      input.session.status === "COMPLETED" ? msToDurationLabel(durationMs) : null,
    volumeInfusedMl: volumeMl,
    showNumericVolume: volumeMl != null,
    bolusVolumeMl: input.session.bolusVolumeMl,
  };
}

export function resolveFluidDrawerMetrics(input: {
  mode: "continuous" | "bolus";
  session: ContinuousFluidSessionSnapshot | FluidBolusSessionSnapshot;
  directionsSig?: string | null;
  asOf?: string;
}): FluidDrawerDisplayMetrics {
  if (input.mode === "bolus") {
    return resolveFluidBolusDrawerMetrics({
      session: input.session as FluidBolusSessionSnapshot,
      asOf: input.asOf,
    });
  }
  return resolveContinuousFluidDrawerMetrics({
    session: input.session as ContinuousFluidSessionSnapshot,
    directionsSig: input.directionsSig,
    asOf: input.asOf,
  });
}
