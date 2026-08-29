import type { BedOperationalStatus } from "@medora/shared";
import { formatBedOperationalStatusLabel } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";

/** K.10B.10E deterministic bed status palette — single source for board UI. */
export const BED_STATUS_PRESENTATION_COLORS: Record<
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
  /** Occupied + discharge order — stronger green than AVAILABLE pale mint; never reads as free. */
  DISCHARGE_PENDING: { bg: "#f0fdf4", text: "#166534", border: "#16a34a" },
};

export function resolveBedStatusColor(status: BedOperationalStatus): string {
  return BED_STATUS_PRESENTATION_COLORS[status].text;
}

export function resolveBedStatusBorder(status: BedOperationalStatus): string {
  return BED_STATUS_PRESENTATION_COLORS[status].border;
}

export function resolveBedStatusBackground(status: BedOperationalStatus): string {
  return BED_STATUS_PRESENTATION_COLORS[status].bg;
}

export function resolveBedStatusBadge(status: BedOperationalStatus): {
  bg: string;
  text: string;
  border: string;
} {
  return BED_STATUS_PRESENTATION_COLORS[status];
}

export function resolveBedStatusLabel(
  status: BedOperationalStatus,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const key = `bedStatus.${status}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return formatBedOperationalStatusLabel(status, language === "fr" ? "fr" : "en");
}
