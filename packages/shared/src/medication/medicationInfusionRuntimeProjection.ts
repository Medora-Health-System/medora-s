/**
 * MEDUI.MAR.CONTINUOUS_INFUSION_RUNTIME_COMPLETION.1
 * Unified continuous infusion runtime — one engine for all ICU drips.
 */

import type { ContinuousInfusionEventType } from "./continuousInfusionLifecycleGovernance.js";
import { resolveIcuMarTimelineInfusionEventLabel } from "../mar/icuMarTimelineDisplay.js";
import type { IcuMarTimelineDisplayLocale } from "../mar/icuMarTimelineDisplay.js";

export type MedicationInfusionOrderEventMeta = {
  infusionScope?: string;
  infusionAction?: string;
  orderItemId?: string;
  infusionSessionKey?: string;
  infusionStartedAt?: string;
  infusionStoppedAt?: string;
  route?: string;
  currentRate?: string;
  previousRate?: string;
  rateChangeReason?: string;
  pauseReason?: string;
  restartReason?: string;
  bagLabel?: string;
  previousBag?: string;
  newBag?: string;
  pumpChannel?: string;
  previousPump?: string;
  newPump?: string;
  lineLabel?: string;
  previousLine?: string;
  newLine?: string;
  note?: string;
  eventAt?: string;
  performedByDisplayName?: string;
  performedByRoleSnapshot?: string;
};

export type MedicationInfusionActiveSession = {
  sessionKey: string;
  startedAt: Date;
  route: string;
  paused: boolean;
  currentRate?: string;
  currentBag?: string;
  pumpChannel?: string;
  lineLabel?: string;
};

export type MedicationInfusionRuntimeStatus =
  | "RUNNING"
  | "PAUSED"
  | "STOPPED"
  | "COMPLETED";

export type MedicationInfusionTimelineRow = {
  id: string;
  eventType: ContinuousInfusionEventType;
  label: string;
  eventAt: string;
  detail: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  documentedBy: string | null;
};

export type MedicationInfusionRuntimeProjection = {
  status: MedicationInfusionRuntimeStatus;
  currentRate: string | null;
  concentration: string | null;
  route: string | null;
  pumpChannel: string | null;
  currentBag: string | null;
  remainingVolume: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  startedByDisplay: string | null;
  verifiedByDisplay: string | null;
  paused: boolean;
  timelineRows: MedicationInfusionTimelineRow[];
  highestRate: string | null;
  finalRate: string | null;
  bagChangeCount: number;
  pumpChangeCount: number;
  lineChangeCount: number;
  pauseCount: number;
  restartCount: number;
  totalRuntimeMinutes: number | null;
  stopReason: string | null;
};

export type MedicationInfusionRuntimeAction =
  | "START"
  | "RATE_CHANGE"
  | "PAUSE"
  | "RESTART"
  | "BAG_CHANGE"
  | "PUMP_CHANGE"
  | "LINE_CHANGE"
  | "STOP"
  | "COMPLETE";

export function parseMedicationInfusionOrderEventMeta(
  metadata: unknown
): MedicationInfusionOrderEventMeta | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  if (m.infusionScope !== "MEDICATION_INFUSION") return null;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  return {
    infusionScope: String(m.infusionScope),
    infusionAction: str(m.infusionAction),
    orderItemId: str(m.orderItemId),
    infusionSessionKey: str(m.infusionSessionKey),
    infusionStartedAt: str(m.infusionStartedAt),
    infusionStoppedAt: str(m.infusionStoppedAt),
    route: str(m.route),
    currentRate: str(m.currentRate),
    previousRate: str(m.previousRate),
    rateChangeReason: str(m.rateChangeReason),
    pauseReason: str(m.pauseReason),
    restartReason: str(m.restartReason),
    bagLabel: str(m.bagLabel ?? m.newBag),
    previousBag: str(m.previousBag),
    newBag: str(m.newBag),
    pumpChannel: str(m.pumpChannel ?? m.newPump),
    previousPump: str(m.previousPump),
    newPump: str(m.newPump),
    lineLabel: str(m.lineLabel ?? m.newLine),
    previousLine: str(m.previousLine),
    newLine: str(m.newLine),
    note: str(m.note),
    eventAt: str(m.eventAt),
    performedByDisplayName: str(m.performedByDisplayName),
    performedByRoleSnapshot: str(m.performedByRoleSnapshot),
  };
}

export function findActiveMedicationInfusionSessionFromEvents(
  orderItemId: string,
  events: Array<{ metadata: unknown }>
): MedicationInfusionActiveSession | null {
  let active: MedicationInfusionActiveSession | null = null;
  for (const ev of events) {
    const m = parseMedicationInfusionOrderEventMeta(ev.metadata);
    if (!m || m.orderItemId !== orderItemId) continue;
    if (m.infusionAction === "START" && m.infusionSessionKey && m.infusionStartedAt) {
      const startedAt = new Date(m.infusionStartedAt);
      if (!Number.isNaN(startedAt.getTime())) {
        active = {
          sessionKey: m.infusionSessionKey,
          startedAt,
          route: m.route ?? "",
          paused: false,
        };
      }
    } else if (m.infusionAction === "RATE_CHANGE" && m.infusionSessionKey && m.currentRate) {
      if (active?.sessionKey === m.infusionSessionKey) {
        active.currentRate = m.currentRate;
      }
    } else if (m.infusionAction === "PAUSE" && m.infusionSessionKey) {
      if (active?.sessionKey === m.infusionSessionKey) active.paused = true;
    } else if (m.infusionAction === "RESTART" && m.infusionSessionKey) {
      if (active?.sessionKey === m.infusionSessionKey) active.paused = false;
    } else if (m.infusionAction === "BAG_CHANGE" && m.infusionSessionKey) {
      if (active?.sessionKey === m.infusionSessionKey) {
        active.currentBag = m.newBag ?? m.bagLabel ?? active.currentBag;
      }
    } else if (m.infusionAction === "PUMP_CHANGE" && m.infusionSessionKey) {
      if (active?.sessionKey === m.infusionSessionKey) {
        active.pumpChannel = m.newPump ?? m.pumpChannel ?? active.pumpChannel;
      }
    } else if (m.infusionAction === "LINE_CHANGE" && m.infusionSessionKey) {
      if (active?.sessionKey === m.infusionSessionKey) {
        active.lineLabel = m.newLine ?? m.lineLabel ?? active.lineLabel;
      }
    } else if (m.infusionAction === "STOP" && m.infusionSessionKey && active?.sessionKey === m.infusionSessionKey) {
      active = null;
    }
  }
  return active;
}

function mapInfusionActionToEventType(action: string): ContinuousInfusionEventType | null {
  switch (action) {
    case "START":
      return "INFUSION_START";
    case "STOP":
      return "INFUSION_STOP";
    case "RATE_CHANGE":
      return "INFUSION_RATE_CHANGE";
    case "PAUSE":
      return "INFUSION_PAUSE";
    case "RESTART":
      return "INFUSION_RESTART";
    case "BAG_CHANGE":
      return "INFUSION_BAG_CHANGE";
    case "PUMP_CHANGE":
      return "INFUSION_PUMP_CHANGE";
    case "LINE_CHANGE":
      return "INFUSION_LINE_CHANGE";
    default:
      return null;
  }
}

function parseRateNumber(rate: string | null | undefined): number | null {
  if (!rate?.trim()) return null;
  const match = rate.match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function buildMedicationInfusionRuntimeProjection(input: {
  orderItemId: string;
  events: Array<{ metadata: unknown }>;
  locale?: IcuMarTimelineDisplayLocale;
  concentration?: string | null;
  remainingVolume?: string | null;
  startedByDisplay?: string | null;
  verifiedByDisplay?: string | null;
  stopReason?: string | null;
}): MedicationInfusionRuntimeProjection | null {
  const locale = input.locale ?? "fr";
  const active = findActiveMedicationInfusionSessionFromEvents(input.orderItemId, input.events);
  const rows: MedicationInfusionTimelineRow[] = [];
  let stoppedAt: string | null = null;
  let bagChangeCount = 0;
  let pumpChangeCount = 0;
  let lineChangeCount = 0;
  let pauseCount = 0;
  let restartCount = 0;
  let highestRateNum: number | null = null;
  let highestRate: string | null = null;
  let finalRate: string | null = null;
  let sessionStartedAt: string | null = null;

  for (const ev of input.events) {
    const m = parseMedicationInfusionOrderEventMeta(ev.metadata);
    if (!m || m.orderItemId !== input.orderItemId) continue;
    const eventType = m.infusionAction ? mapInfusionActionToEventType(m.infusionAction) : null;
    if (!eventType) continue;

    const eventAt =
      m.eventAt ??
      (m.infusionAction === "START" ? m.infusionStartedAt : null) ??
      (m.infusionAction === "STOP" ? m.infusionStoppedAt : null) ??
      new Date().toISOString();

    if (m.infusionAction === "START") sessionStartedAt = eventAt;
    if (m.infusionAction === "STOP") stoppedAt = eventAt;

    let detail: string | null = null;
    let previousValue: string | null = null;
    let newValue: string | null = null;
    let reason: string | null = null;

    switch (m.infusionAction) {
      case "RATE_CHANGE":
        previousValue = m.previousRate ?? null;
        newValue = m.currentRate ?? null;
        reason = m.rateChangeReason ?? null;
        detail = newValue;
        finalRate = newValue;
        {
          const n = parseRateNumber(newValue);
          if (n != null && (highestRateNum == null || n > highestRateNum)) {
            highestRateNum = n;
            highestRate = newValue;
          }
        }
        break;
      case "PAUSE":
        pauseCount += 1;
        reason = m.pauseReason ?? null;
        break;
      case "RESTART":
        restartCount += 1;
        reason = m.restartReason ?? null;
        break;
      case "BAG_CHANGE":
        bagChangeCount += 1;
        previousValue = m.previousBag ?? null;
        newValue = m.newBag ?? m.bagLabel ?? null;
        break;
      case "PUMP_CHANGE":
        pumpChangeCount += 1;
        previousValue = m.previousPump ?? null;
        newValue = m.newPump ?? m.pumpChannel ?? null;
        break;
      case "LINE_CHANGE":
        lineChangeCount += 1;
        previousValue = m.previousLine ?? null;
        newValue = m.newLine ?? m.lineLabel ?? null;
        break;
      case "START":
        newValue = m.currentRate ?? null;
        if (newValue) finalRate = newValue;
        break;
      case "STOP":
        reason = input.stopReason ?? m.note ?? null;
        break;
      default:
        break;
    }

    rows.push({
      id: `${input.orderItemId}:${m.infusionAction}:${eventAt}`,
      eventType,
      label: resolveIcuMarTimelineInfusionEventLabel(eventType, locale),
      eventAt,
      detail,
      previousValue,
      newValue,
      reason,
      documentedBy: m.performedByDisplayName ?? null,
    });
  }

  if (rows.length === 0 && !active) return null;

  const startedAt = sessionStartedAt ?? (active ? active.startedAt.toISOString() : null);
  let totalRuntimeMinutes: number | null = null;
  if (startedAt) {
    const endMs = stoppedAt ? new Date(stoppedAt).getTime() : Date.now();
    const startMs = new Date(startedAt).getTime();
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      totalRuntimeMinutes = Math.round((endMs - startMs) / 60_000);
    }
  }

  const status: MedicationInfusionRuntimeStatus = active
    ? active.paused
      ? "PAUSED"
      : "RUNNING"
    : stoppedAt
      ? input.stopReason === "COMPLETED"
        ? "COMPLETED"
        : "STOPPED"
      : "STOPPED";

  return {
    status,
    currentRate: active?.currentRate ?? finalRate,
    concentration: input.concentration ?? null,
    route: active?.route ?? null,
    pumpChannel: active?.pumpChannel ?? null,
    currentBag: active?.currentBag ?? null,
    remainingVolume: input.remainingVolume ?? null,
    startedAt,
    stoppedAt,
    startedByDisplay: input.startedByDisplay ?? null,
    verifiedByDisplay: input.verifiedByDisplay ?? null,
    paused: active?.paused ?? false,
    timelineRows: rows.sort(
      (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()
    ),
    highestRate,
    finalRate: active?.currentRate ?? finalRate,
    bagChangeCount,
    pumpChangeCount,
    lineChangeCount,
    pauseCount,
    restartCount,
    totalRuntimeMinutes,
    stopReason: input.stopReason ?? null,
  };
}

export function resolveMedicationInfusionCellSecondaryText(input: {
  doseStatus: string;
  infusionRuntime: MedicationInfusionRuntimeProjection | null;
  locale: IcuMarTimelineDisplayLocale;
  rateLabel?: string | null;
}): string {
  if (input.doseStatus !== "IN_PROGRESS") {
    return input.rateLabel?.trim() || "START";
  }
  if (!input.infusionRuntime) {
    return input.rateLabel?.trim() || resolveIcuMarTimelineInfusionEventLabel("RUNNING", input.locale);
  }
  if (input.infusionRuntime.paused) {
    return resolveIcuMarTimelineInfusionEventLabel("INFUSION_PAUSE", input.locale);
  }
  const rate = input.infusionRuntime.currentRate?.trim();
  if (rate) {
    return `${resolveIcuMarTimelineInfusionEventLabel("CURRENT_RATE", input.locale)} · ${rate}`;
  }
  return resolveIcuMarTimelineInfusionEventLabel("RUNNING", input.locale);
}

export type MedicationInfusionRuntimeSafetyResult =
  | { ok: true }
  | { ok: false; code: string };

/** Append-only safety gates — duplicate prevention and invalid transitions. */
export function validateMedicationInfusionRuntimeAction(input: {
  action: MedicationInfusionRuntimeAction;
  active: MedicationInfusionActiveSession | null;
  newRate?: string | null;
  previousRate?: string | null;
}): MedicationInfusionRuntimeSafetyResult {
  const { action, active } = input;
  if (action === "START") {
    if (active) return { ok: false, code: "DUPLICATE_RUNNING_INFUSION" };
    return { ok: true };
  }
  if (!active) {
    return { ok: false, code: "NO_ACTIVE_INFUSION" };
  }
  if (action === "PAUSE" && active.paused) return { ok: false, code: "DUPLICATE_PAUSE" };
  if (action === "RESTART" && !active.paused) return { ok: false, code: "NOT_PAUSED" };
  if (action === "RATE_CHANGE") {
    if (active.paused) return { ok: false, code: "RATE_CHANGE_WHILE_PAUSED" };
    const rate = input.newRate?.trim();
    if (!rate) return { ok: false, code: "INVALID_RATE" };
    const n = parseRateNumber(rate);
    if (n != null && n < 0) return { ok: false, code: "NEGATIVE_RATE" };
  }
  if (action === "BAG_CHANGE" || action === "PUMP_CHANGE" || action === "LINE_CHANGE") {
    if (active.paused) return { ok: false, code: "DEVICE_CHANGE_WHILE_PAUSED" };
  }
  if (action === "STOP" || action === "COMPLETE") {
    if (!active) return { ok: false, code: "DUPLICATE_STOP" };
  }
  return { ok: true };
}

export type MedicationInfusionEncounterSummaryRow = {
  orderItemId: string;
  medicationLabel: string;
  status: MedicationInfusionRuntimeStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  totalRuntimeMinutes: number | null;
  currentRate: string | null;
  highestRate: string | null;
  finalRate: string | null;
  bagChangeCount: number;
  pumpChangeCount: number;
  lineChangeCount: number;
  pauseCount: number;
  restartCount: number;
  stopReason: string | null;
  documentedBy: string | null;
  timelineRows: MedicationInfusionTimelineRow[];
};

export function resolveMedicationInfusionEncounterSummaryStatusLabel(
  status: MedicationInfusionRuntimeStatus,
  locale: IcuMarTimelineDisplayLocale
): string {
  switch (status) {
    case "RUNNING":
      return locale === "fr" ? "Perfusion en cours" : "Infusion running";
    case "PAUSED":
      return locale === "fr" ? "En pause" : "Paused";
    case "STOPPED":
      return resolveIcuMarTimelineInfusionEventLabel("INFUSION_STOP", locale);
    case "COMPLETED":
      return locale === "fr" ? "Perfusion terminée" : "Infusion completed";
    default:
      return locale === "fr" ? "Perfusion" : "Infusion";
  }
}

export function resolveMedicationInfusionStopReasonSummaryLabel(
  stopReason: string | null | undefined,
  locale: IcuMarTimelineDisplayLocale
): string | null {
  const raw = stopReason?.trim();
  if (!raw) return null;
  const normalized = raw.toUpperCase();
  if (normalized === "COMPLETED") {
    return locale === "fr" ? "Perfusion terminée" : "Infusion completed";
  }
  if (normalized === "ORDER_CANCELLED") {
    return locale === "fr" ? "Ordonnance annulée" : "Order cancelled";
  }
  if (/^(RATE_CHANGE|PAUSE|RESTART|BAG_CHANGE|PUMP_CHANGE|LINE_CHANGE|INFUSING|STOPPED|COMPLETED)$/.test(normalized)) {
    return null;
  }
  return raw;
}

function readInfusionStopReasonFromEvents(
  orderItemId: string,
  events: Array<{ metadata: unknown }>
): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const m = parseMedicationInfusionOrderEventMeta(events[i]?.metadata);
    if (!m || m.orderItemId !== orderItemId || m.infusionAction !== "STOP") continue;
    const meta = events[i]?.metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const stopReasonCode = (meta as Record<string, unknown>).stopReasonCode;
      if (typeof stopReasonCode === "string" && stopReasonCode.trim()) return stopReasonCode.trim();
    }
    return m.note ?? null;
  }
  return null;
}

function readLatestInfusionDocumentedBy(
  projection: MedicationInfusionRuntimeProjection
): string | null {
  for (let i = projection.timelineRows.length - 1; i >= 0; i -= 1) {
    const by = projection.timelineRows[i]?.documentedBy?.trim();
    if (by) return by;
  }
  return projection.startedByDisplay;
}

/** Encounter summary / permanent record projection — one read model. */
export function buildMedicationInfusionEncounterSummaryRow(input: {
  orderItemId: string;
  medicationLabel: string;
  projection: MedicationInfusionRuntimeProjection;
}): MedicationInfusionEncounterSummaryRow {
  return {
    orderItemId: input.orderItemId,
    medicationLabel: input.medicationLabel,
    status: input.projection.status,
    startedAt: input.projection.startedAt,
    stoppedAt: input.projection.stoppedAt,
    totalRuntimeMinutes: input.projection.totalRuntimeMinutes,
    currentRate: input.projection.currentRate,
    highestRate: input.projection.highestRate,
    finalRate: input.projection.finalRate,
    bagChangeCount: input.projection.bagChangeCount,
    pumpChangeCount: input.projection.pumpChangeCount,
    lineChangeCount: input.projection.lineChangeCount,
    pauseCount: input.projection.pauseCount,
    restartCount: input.projection.restartCount,
    stopReason: input.projection.stopReason,
    documentedBy: readLatestInfusionDocumentedBy(input.projection),
    timelineRows: input.projection.timelineRows,
  };
}

export function buildMedicationInfusionEncounterSummaryRows(input: {
  orderItems: Array<{ orderItemId: string; orderId: string; medicationLabel: string }>;
  eventsByOrderId: ReadonlyMap<string, Array<{ metadata: unknown }>>;
  locale?: IcuMarTimelineDisplayLocale;
}): MedicationInfusionEncounterSummaryRow[] {
  const locale = input.locale ?? "fr";
  const rows: MedicationInfusionEncounterSummaryRow[] = [];

  for (const item of input.orderItems) {
    const events = input.eventsByOrderId.get(item.orderId) ?? [];
    const hasInfusion = events.some((ev) => {
      const m = parseMedicationInfusionOrderEventMeta(ev.metadata);
      return m?.orderItemId === item.orderItemId && m.infusionAction === "START";
    });
    if (!hasInfusion) continue;

    const stopReason = readInfusionStopReasonFromEvents(item.orderItemId, events);
    const projection = buildMedicationInfusionRuntimeProjection({
      orderItemId: item.orderItemId,
      events,
      locale,
      stopReason,
    });
    if (!projection) continue;

    rows.push(
      buildMedicationInfusionEncounterSummaryRow({
        orderItemId: item.orderItemId,
        medicationLabel: item.medicationLabel,
        projection,
      })
    );
  }

  return rows.sort(
    (a, b) =>
      new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime()
  );
}
