import {
  buildMarShiftTimelineCellDisplay,
  computeFluidVolumeFromSession,
  isContinuousFluidOrder,
  isFluidBolusOrder,
  resolveContinuousFluidSessionFromEvents,
  resolveFluidBolusSessionFromEvents,
  resolveFluidDrawerMetrics,
  resolveFluidRate,
  resolveMarShiftTimelineClinicalAction,
  resolveMarShiftTimelineDrawerActions,
  formatFluidRateDisplay,
  parseFluidBagSizeMl,
  type MarShiftTimelineClinicalAction,
  type MarShiftTimelineDrawerAction,
} from "@medora/shared";

export type MarTimelineFluidEnrichment = {
  isContinuousFluid: boolean;
  isFluidBolus: boolean;
  continuousFluidStatus: string | null;
  fluidBolusStatus: string | null;
  fluidSessionKey: string | null;
  fluidRateLabel: string | null;
  fluidBagSizeMl: number | null;
  fluidVolumeInfusedMl: number | null;
  fluidStartedAt: string | null;
  fluidStoppedAt: string | null;
  fluidCompletedAt: string | null;
  fluidBolusVolumeMl: number | null;
  fluidRunningDurationLabel: string | null;
  fluidActiveDurationLabel: string | null;
  fluidTotalDurationLabel: string | null;
  fluidPausedAt: string | null;
  clinicalAction: MarShiftTimelineClinicalAction | null;
  drawerActions: MarShiftTimelineDrawerAction[];
  cellDisplay: ReturnType<typeof buildMarShiftTimelineCellDisplay>;
};

export function resolveMarTimelineFluidEnrichment(input: {
  orderItemId: string;
  medicationLabel: string | null;
  directionsSig: string | null;
  route: string | null;
  doseKind: string;
  doseStatus: string;
  orderEvents: Array<{ metadata: unknown }>;
  requiresWitness: boolean;
  facilityTimeZone: string;
  enrichment?: {
    marAction?: string | null;
    marNotes?: string | null;
  } | null;
  asOf?: string;
}): MarTimelineFluidEnrichment | null {
  const fluidInput = {
    medicationLabel: input.medicationLabel,
    directionsSig: input.directionsSig,
    route: input.route,
  };
  const isBolus = isFluidBolusOrder(fluidInput);
  const isContinuous = !isBolus && isContinuousFluidOrder(fluidInput);
  if (!isBolus && !isContinuous) return null;

  const asOf = input.asOf ?? new Date().toISOString();
  const fluidRate = resolveFluidRate(input.directionsSig);
  const fluidRateLabel = fluidRate ? formatFluidRateDisplay(fluidRate) : null;
  const fluidBagSizeMl = parseFluidBagSizeMl(input.directionsSig);

  if (isBolus) {
    const bolusSession = resolveFluidBolusSessionFromEvents(
      input.orderItemId,
      input.orderEvents,
      input.directionsSig
    );
    const drawerMetrics = resolveFluidDrawerMetrics({
      mode: "bolus",
      session: bolusSession,
      asOf,
    });
    const clinicalAction = resolveMarShiftTimelineClinicalAction(input.doseKind, input.doseStatus as never, {
      isFluidBolus: true,
      fluidBolusStatus: bolusSession.status,
    });
    const cellDisplay = buildMarShiftTimelineCellDisplay({
      medicationLabel: input.medicationLabel,
      doseKind: input.doseKind,
      doseStatus: input.doseStatus as never,
      route: input.route,
      frequencyCode: null,
      requiresWitness: input.requiresWitness,
      facilityTimeZone: input.facilityTimeZone,
      directionsSig: input.directionsSig,
      fluidBolusStatus: bolusSession.status,
      fluidStartedAt: bolusSession.startedAt,
      fluidCompletedAt: bolusSession.completedAt,
      fluidBagSizeMl,
      fluidBolusVolumeMl: bolusSession.bolusVolumeMl,
      marAction: input.enrichment?.marAction,
      marNotes: input.enrichment?.marNotes,
    });
    return {
      isContinuousFluid: false,
      isFluidBolus: true,
      continuousFluidStatus: null,
      fluidBolusStatus: bolusSession.status,
      fluidSessionKey: bolusSession.sessionKey,
      fluidRateLabel,
      fluidBagSizeMl,
      fluidVolumeInfusedMl: drawerMetrics.volumeInfusedMl,
      fluidStartedAt: bolusSession.startedAt,
      fluidStoppedAt: null,
      fluidCompletedAt: bolusSession.completedAt,
      fluidBolusVolumeMl: bolusSession.bolusVolumeMl,
      fluidRunningDurationLabel: drawerMetrics.runningDurationLabel,
      fluidActiveDurationLabel: drawerMetrics.activeDurationLabel,
      fluidTotalDurationLabel: drawerMetrics.totalDurationLabel,
      fluidPausedAt: null,
      clinicalAction,
      drawerActions: resolveMarShiftTimelineDrawerActions(clinicalAction, {
        fluidBolusStatus: bolusSession.status,
      }),
      cellDisplay,
    };
  }

  const fluidSession = resolveContinuousFluidSessionFromEvents(
    input.orderItemId,
    input.orderEvents
  );
  const volumeInfusedMl = computeFluidVolumeFromSession({
    session: fluidSession,
    rate: fluidRate,
    asOf: fluidSession.stoppedAt ?? asOf,
  });
  const drawerMetrics = resolveFluidDrawerMetrics({
    mode: "continuous",
    session: fluidSession,
    directionsSig: input.directionsSig,
    asOf,
  });
  const clinicalAction = resolveMarShiftTimelineClinicalAction(input.doseKind, input.doseStatus as never, {
    isContinuousFluid: true,
    continuousFluidStatus: fluidSession.status,
  });
  const cellDisplay = buildMarShiftTimelineCellDisplay({
    medicationLabel: input.medicationLabel,
    doseKind: input.doseKind,
    doseStatus: input.doseStatus as never,
    route: input.route,
    frequencyCode: null,
    requiresWitness: input.requiresWitness,
    facilityTimeZone: input.facilityTimeZone,
    directionsSig: input.directionsSig,
    continuousFluidStatus: fluidSession.status,
    fluidStartedAt: fluidSession.startedAt,
    fluidStoppedAt: fluidSession.stoppedAt,
    fluidBagSizeMl,
    marAction: input.enrichment?.marAction,
    marNotes: input.enrichment?.marNotes,
  });

  return {
    isContinuousFluid: true,
    isFluidBolus: false,
    continuousFluidStatus: fluidSession.status,
    fluidBolusStatus: null,
    fluidSessionKey: fluidSession.sessionKey,
    fluidRateLabel,
    fluidBagSizeMl,
    fluidVolumeInfusedMl: volumeInfusedMl,
    fluidStartedAt: fluidSession.startedAt,
    fluidStoppedAt: fluidSession.stoppedAt,
    fluidCompletedAt: null,
    fluidBolusVolumeMl: null,
    fluidRunningDurationLabel: drawerMetrics.runningDurationLabel,
    fluidActiveDurationLabel: drawerMetrics.activeDurationLabel,
    fluidTotalDurationLabel: drawerMetrics.totalDurationLabel,
    fluidPausedAt: drawerMetrics.pausedAt,
    clinicalAction,
    drawerActions: resolveMarShiftTimelineDrawerActions(clinicalAction, {
      continuousFluidStatus: fluidSession.status,
    }),
    cellDisplay,
  };
}
