import {
  formatBedOperationalStatusLabel,
  formatEdSimplifiedBedStatusLabel,
  getBedOperationalStatusVisual,
  resolveEncounterCanonicalBedKey,
  type BedOperationalStatus,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

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

export function bedStatusBadgeSoft(status: BedOperationalStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const visual = getBedOperationalStatusVisual(status);
  switch (visual.intent) {
    case "danger":
      return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
    case "warning":
      return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
    case "occupied":
      return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
    case "pending":
      return { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" };
    case "maintenance":
      return { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" };
    default:
      return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
  }
}

export function shouldShowEdBedStatusChip(status: BedOperationalStatus | null | undefined): boolean {
  return Boolean(status);
}

export function shouldShowHospitalBedStatusChip(status: BedOperationalStatus | null | undefined): boolean {
  return Boolean(status && status !== "AVAILABLE");
}
