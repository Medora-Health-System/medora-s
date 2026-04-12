/**
 * Read-only escalation tier for MSPP national dashboard (classification only — not an outbreak declaration).
 */
import type { MsppReportingCategory, MsppSurveillancePriority } from "../public-health/haiti-disease-notifiable-catalog";
import { MsppSignalLevel, type MsppSignalLevelValue } from "./mspp.constants";

export type MsppEscalationLevel = "NONE" | "WATCH" | "PRIORITY" | "URGENT";

export type MsppEscalationReasonCode =
  | "ROUTINE_LOW_SIGNAL"
  | "ROUTINE_MEDIUM_SIGNAL"
  | "ROUTINE_HIGH_SIGNAL"
  | "IMMEDIATE_HIGH_SIGNAL"
  | "IMMEDIATE_MEDIUM_SIGNAL"
  | "IMMEDIATE_LOW_SIGNAL"
  | "WEEKLY_HIGH_PRIORITY_DISEASE"
  | "WEEKLY_HIGH_SIGNAL"
  | "WEEKLY_MEDIUM_SIGNAL"
  | "WEEKLY_LOW_SIGNAL";

/**
 * Combines governed catalog fields (when matched) with the existing sanitary signal level.
 * Unknown catalog entries are treated as ROUTINE reporting + LOW surveillance priority for tiering.
 */
export function computeMsppEscalation(params: {
  signalLevel: MsppSignalLevelValue;
  reportingCategory: MsppReportingCategory | null;
  surveillancePriority: MsppSurveillancePriority | null;
}): { level: MsppEscalationLevel; reasonCode: MsppEscalationReasonCode } {
  const sl = params.signalLevel;
  const rc = params.reportingCategory ?? "ROUTINE";
  const sp = params.surveillancePriority ?? "LOW";

  if (rc === "ROUTINE") {
    if (sl === MsppSignalLevel.LOW) return { level: "NONE", reasonCode: "ROUTINE_LOW_SIGNAL" };
    if (sl === MsppSignalLevel.MEDIUM) return { level: "WATCH", reasonCode: "ROUTINE_MEDIUM_SIGNAL" };
    return { level: "WATCH", reasonCode: "ROUTINE_HIGH_SIGNAL" };
  }

  if (rc === "IMMEDIATE") {
    if (sl === MsppSignalLevel.HIGH) return { level: "URGENT", reasonCode: "IMMEDIATE_HIGH_SIGNAL" };
    if (sl === MsppSignalLevel.MEDIUM) return { level: "PRIORITY", reasonCode: "IMMEDIATE_MEDIUM_SIGNAL" };
    return { level: "WATCH", reasonCode: "IMMEDIATE_LOW_SIGNAL" };
  }

  if (sl === MsppSignalLevel.HIGH && sp === "HIGH") {
    return { level: "PRIORITY", reasonCode: "WEEKLY_HIGH_PRIORITY_DISEASE" };
  }
  if (sl === MsppSignalLevel.HIGH) {
    return { level: "WATCH", reasonCode: "WEEKLY_HIGH_SIGNAL" };
  }
  if (sl === MsppSignalLevel.MEDIUM) {
    return { level: "WATCH", reasonCode: "WEEKLY_MEDIUM_SIGNAL" };
  }
  return { level: "NONE", reasonCode: "WEEKLY_LOW_SIGNAL" };
}
