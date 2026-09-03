import {
  formatBedOperationalStatusLabel,
  formatEdSimplifiedBedStatusLabel,
  resolveEncounterCanonicalBedKey,
  type BedOperationalStatus,
} from "@medora/shared";
import { resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

/** K.10B.10C / K.10B.10D centralized bed status colors — delegates to K.10B.10E presentation. */
export { BED_STATUS_PRESENTATION_COLORS as BED_STATUS_DISPLAY_COLORS } from "@/lib/bedStatusPresentation";
import { resolveBedStatusBadge, resolveBedStatusBorder } from "@/lib/bedStatusPresentation";

export function bedStatusBadgeSoft(status: BedOperationalStatus): {
  bg: string;
  text: string;
  border: string;
} {
  return resolveBedStatusBadge(status);
}

export function bedStatusCellBorderColor(status: BedOperationalStatus): string {
  return resolveBedStatusBorder(status);
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
  return formatBedOperationalStatusLabel(status, resolveProductUiLanguageOrDefault(language));
}

export function formatEdBedStatusChipLabel(
  status: BedOperationalStatus,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const simplifiedKey = `bedStatus.edSimplified.${status}`;
  const translated = t(simplifiedKey);
  if (translated !== simplifiedKey) return translated;
  return formatEdSimplifiedBedStatusLabel(status, resolveProductUiLanguageOrDefault(language));
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
