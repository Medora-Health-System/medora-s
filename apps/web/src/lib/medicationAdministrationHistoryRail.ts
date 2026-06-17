import {
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  resolveClinicalViewportMode,
  type ClinicalViewportMode,
} from "@/lib/clinicalViewport";
import type { MedicationAdministrationHistoryEntry, MedicationAdministrationHistoryEventType } from "@medora/shared";
import type { PriorityBadgeSoft } from "@/components/medora-card/medoraCardTokens";
import {
  NEUTRAL_BADGE,
  PATHWAY_BADGE,
  PRIORITY_BADGE_SOFT,
  SYNC_PENDING_BADGE,
} from "@/components/medora-card/medoraCardTokens";

export type MarAdministrationHistoryRailLayoutMode = "sideRail" | "stacked";

export type MedicationAdministrationHistoryRailEntry = {
  id: string;
  medicationLine: string;
  statusLabelKey: string;
  eventType: MedicationAdministrationHistoryEventType;
  clinicalTimeLabel: string;
  documentedTimeLabel: string | null;
  performerLine: string | null;
  reasonLine: string | null;
  prnIndicationLine: string | null;
  showAdjustedTime: boolean;
  badgeSoft: PriorityBadgeSoft;
  ariaStatusLabel: string;
};

const HISTORY_BADGE_SOFT: Record<MedicationAdministrationHistoryEventType, PriorityBadgeSoft> = {
  ADMINISTERED: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  PRN_ADMINISTERED: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  REFUSED: { bg: "#f3f4f6", text: "#4b5563", border: "#d1d5db" },
  HELD: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  MISSED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  NOT_AVAILABLE: NEUTRAL_BADGE,
  MD_CHANGED: PATHWAY_BADGE,
  INFUSION_START: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  INFUSION_STOP: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
  ORDER_CANCELED: { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" },
};

export function resolveMarAdministrationHistoryRailLayoutMode(
  viewportWidth: number
): MarAdministrationHistoryRailLayoutMode {
  return viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN ? "sideRail" : "stacked";
}

export function resolveMarAdministrationHistoryRailDefaultExpanded(
  viewportMode: ClinicalViewportMode
): boolean {
  return viewportMode === "desktop";
}

export function resolveClinicalViewportModeFromWidth(viewportWidth: number): ClinicalViewportMode {
  return resolveClinicalViewportMode(viewportWidth);
}

export function marAdministrationHistoryRailStorageKey(
  facilityId: string,
  encounterId: string,
  userId: string
): string {
  return `medora.marHistoryRail.expanded.${facilityId}.${encounterId}.${userId}`;
}

export function readStoredMarAdministrationHistoryRailExpanded(
  facilityId: string,
  encounterId: string,
  userId: string
): boolean | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(
      marAdministrationHistoryRailStorageKey(facilityId, encounterId, userId)
    );
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredMarAdministrationHistoryRailExpanded(
  facilityId: string,
  encounterId: string,
  userId: string,
  expanded: boolean
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      marAdministrationHistoryRailStorageKey(facilityId, encounterId, userId),
      expanded ? "1" : "0"
    );
  } catch {
    /* ignore */
  }
}

function formatMedicationLine(entry: MedicationAdministrationHistoryEntry): string {
  const label = entry.medicationLabel.trim() || "Medication";
  const dose = entry.doseDisplay?.trim();
  const route = entry.route?.trim();
  const parts = [label];
  if (dose) parts.push(dose);
  if (route) parts.push(route);
  if (entry.isPrn && entry.eventType === "PRN_ADMINISTERED") {
    return `${parts.join(" ")} PRN`;
  }
  return parts.join(" ");
}

function formatPerformerLine(entry: MedicationAdministrationHistoryEntry): string | null {
  const name = entry.performedByDisplay?.trim();
  const role = entry.performedByRole?.trim();
  if (!name && !role) return null;
  if (name && role) return `${name} ${role}`;
  return name ?? role ?? null;
}

function formatReasonLine(
  entry: MedicationAdministrationHistoryEntry,
  t: (key: string) => string
): string | null {
  const code = entry.reasonCode?.trim();
  const detail = entry.reasonDetail?.trim();
  if (!code && !detail) return null;
  const prefix = t("marAdministrationHistory.reasonPrefix");
  if (code && detail) return `${prefix}${code} — ${detail}`;
  return `${prefix}${detail ?? code}`;
}

export function buildMedicationAdministrationHistoryRailEntry(
  entry: MedicationAdministrationHistoryEntry,
  input: {
    formatClinicalTime: (iso: string) => string;
    t: (key: string) => string;
  }
): MedicationAdministrationHistoryRailEntry {
  const statusLabelKey = `marAdministrationHistory.eventType.${entry.eventType}`;
  const badgeSoft = HISTORY_BADGE_SOFT[entry.eventType] ?? NEUTRAL_BADGE;
  const showAdjustedTime =
    entry.documentedAt != null &&
    entry.documentedAt.trim() !== "" &&
    entry.documentedAt !== entry.eventAt;

  return {
    id: entry.id,
    medicationLine: formatMedicationLine(entry),
    statusLabelKey,
    eventType: entry.eventType,
    clinicalTimeLabel: input.formatClinicalTime(entry.eventAt),
    documentedTimeLabel: showAdjustedTime
      ? input.formatClinicalTime(entry.documentedAt!)
      : null,
    performerLine: formatPerformerLine(entry),
    reasonLine: formatReasonLine(entry, input.t),
    prnIndicationLine: entry.prnIndication?.trim()
      ? `${input.t("marAdministrationHistory.prnIndicationPrefix")}${entry.prnIndication.trim()}`
      : null,
    showAdjustedTime,
    badgeSoft,
    ariaStatusLabel: input.t(statusLabelKey),
  };
}

export function buildMedicationAdministrationHistoryRailEntries(
  entries: MedicationAdministrationHistoryEntry[],
  input: {
    formatClinicalTime: (iso: string) => string;
    t: (key: string) => string;
  }
): MedicationAdministrationHistoryRailEntry[] {
  return entries.map((entry) => buildMedicationAdministrationHistoryRailEntry(entry, input));
}

export function marAdministrationHistoryRailSideWidthPercent(): number {
  return 30;
}

export function marAdministrationHistoryRailTimelineWidthPercent(): number {
  return 70;
}

export function isClinicalViewportTabletOrBelow(viewportWidth: number): boolean {
  return viewportWidth < CLINICAL_VIEWPORT_DESKTOP_MIN;
}

export function isClinicalViewportMobile(viewportWidth: number): boolean {
  return viewportWidth < CLINICAL_VIEWPORT_TABLET_MIN;
}

/** History rail badge palette is informational only — never reuse operational MAR timeline colors. */
export function marAdministrationHistoryRailBadgeForEventType(
  eventType: MedicationAdministrationHistoryEventType
): PriorityBadgeSoft {
  return HISTORY_BADGE_SOFT[eventType] ?? PRIORITY_BADGE_SOFT.ROUTINE;
}
