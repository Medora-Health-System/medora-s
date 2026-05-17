/**
 * Web i18n for unified encounter timeline (Phase 15F-D.2).
 */

import type { SupportedLanguage } from "@/i18n/config";
import type {
  UnifiedTimelineChip,
  UnifiedTimelineDisplayGroup,
  UnifiedTimelineEntry,
} from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { summarizeClinicalTimelineRow } from "@/lib/clinicalTimelineDisplayUi";

export type UnifiedTimelineApiItem = UnifiedTimelineEntry;

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), template);
}

export function unifiedTimelineGroupLabel(
  group: UnifiedTimelineDisplayGroup,
  t: (key: string) => string
): string {
  return t(`unifiedTimeline.groups.${group}`);
}

export function unifiedTimelineChipLabel(chip: UnifiedTimelineChip, t: (key: string) => string): string {
  return t(`unifiedTimeline.chips.${chip}`);
}

export function summarizeUnifiedTimelineItem(
  item: UnifiedTimelineApiItem,
  language: SupportedLanguage,
  t: (key: string) => string
): { label: string; summary: string; groupLabel: string; chipLabels: string[] } {
  const groupLabel = unifiedTimelineGroupLabel(item.displayGroup, t);
  const chipLabels = item.chips.map((c) => unifiedTimelineChipLabel(c, t));

  const localizedTitle =
    language === "en" ? item.titleEn?.trim() : item.titleFr?.trim();
  const localizedSummary =
    language === "en" ? item.summaryEn?.trim() : item.summaryFr?.trim();

  if (item.sourceKind === "ENCOUNTER_CLINICAL_EVENT" && item.payloadJson != null) {
    const clinical = summarizeClinicalTimelineRow(
      {
        eventType: item.storedEventType,
        payloadJson: item.payloadJson,
        createdAt: item.documentedAtIso,
      },
      t
    );
    return {
      label: localizedTitle || clinical.label,
      summary: localizedSummary || clinical.summary,
      groupLabel,
      chipLabels,
    };
  }

  return {
    label: localizedTitle || item.displayEventType,
    summary: localizedSummary || "",
    groupLabel,
    chipLabels,
  };
}

export function formatUnifiedTimelineCorrectionLine(
  item: UnifiedTimelineApiItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string | null {
  if (!item.hasClinicalTimeCorrection || !item.effectiveClinicalAtIso) return null;
  const documented = formatEncounterChromeDateTime(item.documentedAtIso, language);
  const corrected = formatEncounterChromeDateTime(item.effectiveClinicalAtIso, language);
  return `${fillTemplate(t("clinicalTimelineDisplay.documentedAt"), { datetime: documented })} · ${fillTemplate(t("clinicalTimelineDisplay.correctedClinicalTime"), { datetime: corrected })}`;
}
