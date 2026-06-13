import {
  formatBedOperationalStatusLabel,
  formatEdSimplifiedBedStatusLabel,
  resolveEncounterCanonicalBedKey,
  type BedOperationalStatus,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

/** K.10B.10C / K.10B.10D centralized bed status colors — no inline palette elsewhere. */
export const BED_STATUS_DISPLAY_COLORS: Record<
  BedOperationalStatus,
  { bg: string; text: string; border: string }
> = {
  AVAILABLE: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  OCCUPIED: { bg: "#eff6ff", text: "#1e3a8a", border: "#bfdbfe" },
  BLOCKED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  DIRTY: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
  CLEANING: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  RESERVED: { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
  TRANSFER_PENDING: { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
  DISCHARGE_PENDING: { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" },
};

export function bedStatusBadgeSoft(status: BedOperationalStatus): {
  bg: string;
  text: string;
  border: string;
} {
  return BED_STATUS_DISPLAY_COLORS[status];
}

export function bedStatusCellBorderColor(status: BedOperationalStatus): string {
  return BED_STATUS_DISPLAY_COLORS[status].border;
}

export function resolveEncounterBedKey(encounterLike: {
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
}): string | null {
  return resolveEncounterCanonicalBedKey(encounterLike);
}

export function lookupBedStatusForEncounter(
  encounterLike: {
    roomLabel?: string | null;
    type?: string | null;
    admissionSummaryJson?: unknown;
  },
  bedIndex: Map<string, FacilityBedBoardBedRow>
): FacilityBedBoardBedRow | null {
  const bedKey = resolveEncounterBedKey(encounterLike);
  if (!bedKey) return null;
  return bedIndex.get(bedKey) ?? null;
}

export function formatHospitalBedStatusLabel(
  status: BedOperationalStatus,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const key = `bedStatus.${status}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return formatBedOperationalStatusLabel(status, language === "fr" ? "fr" : "en");
}

export function formatEdBedStatusChipLabel(
  status: BedOperationalStatus,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const simplifiedKey = `bedStatus.edSimplified.${status}`;
  const translated = t(simplifiedKey);
  if (translated !== simplifiedKey) return translated;
  return formatEdSimplifiedBedStatusLabel(status, language === "fr" ? "fr" : "en");
}

export function shouldShowEdBedStatusChip(status: BedOperationalStatus | null | undefined): boolean {
  return Boolean(status);
}

export function shouldShowHospitalBedStatusChip(status: BedOperationalStatus | null | undefined): boolean {
  return Boolean(status && status !== "AVAILABLE");
}

export function isBedBoardTransferPending(status: BedOperationalStatus): boolean {
  return status === "TRANSFER_PENDING";
}

export function isBedBoardDischargePending(status: BedOperationalStatus): boolean {
  return status === "DISCHARGE_PENDING";
}
