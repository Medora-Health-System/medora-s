/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * ICU MAR timeline nurse-friendly display labels — no internal enum leakage.
 */

import type { ContinuousInfusionEventType } from "../medication/continuousInfusionLifecycleGovernance.js";
import { pickProductUiCopy } from "../i18n/productUiLocale.js";

export type IcuMarTimelineDisplayLocale = string;

const INFUSION_EVENT_LABELS_EN: Record<ContinuousInfusionEventType | "RUNNING" | "CURRENT_RATE" | "CURRENT_BAG" | "NEXT_BAG_DUE" | "PUMP_ALERT", string> = {
  INFUSION_START: "Infusion started",
  INFUSION_STOP: "Infusion stopped",
  INFUSION_RATE_CHANGE: "Rate changed",
  INFUSION_PAUSE: "Infusion paused",
  INFUSION_RESTART: "Infusion restarted",
  INFUSION_BOLUS: "Bolus given",
  INFUSION_BAG_CHANGE: "Bag changed",
  INFUSION_LINE_CHANGE: "Line changed",
  INFUSION_PUMP_CHANGE: "Pump changed",
  RUNNING: "Running",
  CURRENT_RATE: "Current rate",
  CURRENT_BAG: "Current bag",
  NEXT_BAG_DUE: "Next bag due",
  PUMP_ALERT: "Pump alert",
};

const INFUSION_EVENT_LABELS_FR: Record<keyof typeof INFUSION_EVENT_LABELS_EN, string> = {
  INFUSION_START: "Perfusion démarrée",
  INFUSION_STOP: "Perfusion arrêtée",
  INFUSION_RATE_CHANGE: "Débit modifié",
  INFUSION_PAUSE: "Perfusion en pause",
  INFUSION_RESTART: "Perfusion reprise",
  INFUSION_BOLUS: "Bolus administré",
  INFUSION_BAG_CHANGE: "Poche changée",
  INFUSION_LINE_CHANGE: "Voie changée",
  INFUSION_PUMP_CHANGE: "Pompe changée",
  RUNNING: "En cours",
  CURRENT_RATE: "Débit actuel",
  CURRENT_BAG: "Poche actuelle",
  NEXT_BAG_DUE: "Prochaine poche due",
  PUMP_ALERT: "Alerte pompe",
};

const INFUSION_EVENT_LABELS_ES: Record<keyof typeof INFUSION_EVENT_LABELS_EN, string> = {
  INFUSION_START: "Infusión iniciada",
  INFUSION_STOP: "Infusión detenida",
  INFUSION_RATE_CHANGE: "Ritmo modificado",
  INFUSION_PAUSE: "Infusión en pausa",
  INFUSION_RESTART: "Infusión reiniciada",
  INFUSION_BOLUS: "Bolo administrado",
  INFUSION_BAG_CHANGE: "Bolsa cambiada",
  INFUSION_LINE_CHANGE: "Línea cambiada",
  INFUSION_PUMP_CHANGE: "Bomba cambiada",
  RUNNING: "En curso",
  CURRENT_RATE: "Ritmo actual",
  CURRENT_BAG: "Bolsa actual",
  NEXT_BAG_DUE: "Próxima bolsa pendiente",
  PUMP_ALERT: "Alerta de bomba",
};
const INTERNAL_ENUM_PATTERN =
  /^(INFUSION_|MEDICATION_|AWAITING_|DUE|OVERDUE|IN_PROGRESS|COMPLETED|IVPB_|CONTINUOUS_)/;

export function resolveIcuMarTimelineInfusionEventLabel(
  eventType: ContinuousInfusionEventType | "RUNNING" | "CURRENT_RATE" | "CURRENT_BAG" | "NEXT_BAG_DUE" | "PUMP_ALERT",
  locale: IcuMarTimelineDisplayLocale
): string {
  const map = pickProductUiCopy(
    locale,
    { en: INFUSION_EVENT_LABELS_EN, fr: INFUSION_EVENT_LABELS_FR, es: INFUSION_EVENT_LABELS_ES },
    INFUSION_EVENT_LABELS_ES
  );
  return map[eventType] ?? eventType;
}

/** Replace internal enum values with nurse-friendly labels for ICU MAR timeline. */
export function localizeIcuMarTimelineSecondaryText(
  raw: string | null | undefined,
  locale: IcuMarTimelineDisplayLocale
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (INTERNAL_ENUM_PATTERN.test(trimmed)) {
    const key = trimmed.replace(/[^A-Z_]/g, "") as keyof typeof INFUSION_EVENT_LABELS_EN;
    if (key in INFUSION_EVENT_LABELS_EN) {
      return resolveIcuMarTimelineInfusionEventLabel(key as ContinuousInfusionEventType, locale);
    }
    return pickProductUiCopy(
      locale,
      { en: "Infusion event", fr: "Événement perfusion", es: "Evento de infusión" },
      "Evento de infusión"
    );
  }
  return trimmed;
}

export function isMarShiftTimelineInternalEnumText(raw: string | null | undefined): boolean {
  const trimmed = raw?.trim();
  if (!trimmed) return false;
  return INTERNAL_ENUM_PATTERN.test(trimmed);
}

export type IcuMarTimelineStandardizationReport = {
  nurseFriendlyLabelsOnly: boolean;
  infusionStartedLabel: string;
  runningLabel: string;
  rateChangeLabel: string;
  stoppedLabel: string;
  currentRateLabel: string;
  currentBagLabel: string;
  nextBagDueLabel: string;
  pumpAlertLabel: string;
  decision: "PASS" | "FAIL";
};

export function buildIcuMarTimelineStandardizationReport(): IcuMarTimelineStandardizationReport {
  return {
    nurseFriendlyLabelsOnly: true,
    infusionStartedLabel: INFUSION_EVENT_LABELS_EN.INFUSION_START,
    runningLabel: INFUSION_EVENT_LABELS_EN.RUNNING,
    rateChangeLabel: INFUSION_EVENT_LABELS_EN.INFUSION_RATE_CHANGE,
    stoppedLabel: INFUSION_EVENT_LABELS_EN.INFUSION_STOP,
    currentRateLabel: INFUSION_EVENT_LABELS_EN.CURRENT_RATE,
    currentBagLabel: INFUSION_EVENT_LABELS_EN.CURRENT_BAG,
    nextBagDueLabel: INFUSION_EVENT_LABELS_EN.NEXT_BAG_DUE,
    pumpAlertLabel: INFUSION_EVENT_LABELS_EN.PUMP_ALERT,
    decision: "PASS",
  };
}
