/**
 * Phase 15F-D.3 — Enterprise command timeline view model (display-only).
 */

import type { SupportedLanguage } from "@/i18n/config";
import {
  clinicalTimelineDisplayLabelKey,
  labRadReconciliationNeedsFollowUp,
  orderAttributionActionForOrderType,
  orderAttributionLabelKey,
  type LabRadReconciliationFlag,
  type UnifiedTimelineEntry,
} from "@medora/shared";

export type UnifiedTimelineApiItem = UnifiedTimelineEntry;

export type CommandTimelineCategory =
  | "ED"
  | "OBSERVATION"
  | "NURSING"
  | "PROVIDER"
  | "ORDERS"
  | "MAR"
  | "INFUSION"
  | "LABORATORY"
  | "RADIOLOGY"
  | "PROCEDURE"
  | "DISCHARGE"
  | "ADMINISTRATIVE";

export type CommandTimelineFilter =
  | "ALL"
  | "ED_OBSERVATION"
  | "ORDERS"
  | "MAR"
  | "LAB"
  | "RADIOLOGY"
  | "PROCEDURES"
  | "DOCUMENTATION"
  | "DISCHARGE"
  | "CORRECTED_ONLY"
  | "NEEDS_FOLLOWUP";

export type CommandTimelineViewMode = "COMPACT" | "DETAILED";

export type CarePhaseMarker = {
  phase: "ED" | "OBSERVATION" | "DISCHARGE";
  reached: boolean;
  latestAtIso: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), template);
}

export function resolveCommandTimelineCategory(item: UnifiedTimelineApiItem): CommandTimelineCategory {
  if (item.chips.includes("INFUSION_STARTED") || item.chips.includes("INFUSION_STOPPED")) {
    return "INFUSION";
  }
  if (
    item.carePhase === "DISCHARGE" ||
    item.displayEventType === "DISCHARGE_SUMMARY_SAVED" ||
    item.displayEventType === "DISPOSITION_SUPPLEMENT_SAVED"
  ) {
    return "DISCHARGE";
  }
  if (item.displayGroup === "OBSERVATION" || item.carePhase === "OBSERVATION") {
    return "OBSERVATION";
  }
  if (item.sourceKind === "MEDICATION_ADMINISTRATION") return "MAR";
  if (item.sourceKind === "ORDER_ITEM_RESULT") {
    return item.displayGroup === "IMAGING" ? "RADIOLOGY" : "LABORATORY";
  }
  if (item.sourceKind === "ORDER_EVENT") {
    const ot = (item.displayGroup === "LABORATORY"
      ? "LAB"
      : item.displayGroup === "IMAGING"
        ? "IMAGING"
        : item.displayGroup === "PROCEDURE"
          ? "CARE"
          : ""
    ).toUpperCase();
    if (ot === "LAB") return "LABORATORY";
    if (ot === "IMAGING") return "RADIOLOGY";
    if (ot === "CARE") return "PROCEDURE";
    if (item.displayGroup === "MEDICATION") return "ORDERS";
    return "ORDERS";
  }
  if (item.sourceKind === "ENCOUNTER_CLINICAL_EVENT") {
    const stored = item.storedEventType.toUpperCase();
    const display = item.displayEventType.toUpperCase();
    if (display === "OBSERVATION_REASSESSMENT_SAVED" || display === "OBSERVATION_ADMISSION_PACKET_SAVED") {
      return "OBSERVATION";
    }
    if (stored === "NURSING_ASSESSMENT_SAVED" || stored === "HANDOFF_NURSING") return "NURSING";
    if (
      stored === "PROVIDER_SIGNED" ||
      stored === "PROVIDER_UNLOCKED" ||
      stored === "PROVIDER_MSE_SAVED" ||
      stored === "HANDOFF_PROVIDER"
    ) {
      return "PROVIDER";
    }
    if (stored === "PROCEDURE_DOCUMENTED" || stored === "IV_INSERTED" || stored === "IV_REMOVED") {
      return "PROCEDURE";
    }
    if (item.carePhase === "ED" || item.carePhase === "VITALS" || item.carePhase === "HANDOFF") {
      return "ED";
    }
    if (item.carePhase === "DOCUMENTATION") return "PROVIDER";
  }
  return "ADMINISTRATIVE";
}

export function commandTimelineCategoryI18nKey(category: CommandTimelineCategory): string {
  return `commandTimeline.categories.${category}`;
}

export function parseReconciliationFlags(payload: unknown): LabRadReconciliationFlag[] {
  const meta = asRecord(payload);
  const raw = meta?.reconciliationFlags;
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is LabRadReconciliationFlag => typeof f === "string");
}

export function itemNeedsOperationalFollowUp(item: UnifiedTimelineApiItem): boolean {
  const flags = parseReconciliationFlags(item.payloadJson);
  if (flags.length > 0 && labRadReconciliationNeedsFollowUp(flags)) return true;
  const meta = asRecord(item.payloadJson);
  return meta?.needsFollowUp === true || meta?.operationalEscalationActive === true;
}

export function matchesCommandTimelineFilter(
  item: UnifiedTimelineApiItem,
  filter: CommandTimelineFilter
): boolean {
  if (filter === "ALL") return true;
  const category = resolveCommandTimelineCategory(item);
  switch (filter) {
    case "ED_OBSERVATION":
      return category === "ED" || category === "OBSERVATION";
    case "ORDERS":
      return category === "ORDERS";
    case "MAR":
      return category === "MAR" || category === "INFUSION";
    case "LAB":
      return category === "LABORATORY";
    case "RADIOLOGY":
      return category === "RADIOLOGY";
    case "PROCEDURES":
      return category === "PROCEDURE";
    case "DOCUMENTATION":
      return category === "NURSING" || category === "PROVIDER";
    case "DISCHARGE":
      return category === "DISCHARGE";
    case "CORRECTED_ONLY":
      return item.hasClinicalTimeCorrection;
    case "NEEDS_FOLLOWUP":
      return itemNeedsOperationalFollowUp(item);
    default:
      return true;
  }
}

/** Preserve API order (documented operational chronology, newest-first). */
export function filterCommandTimelineItems(
  items: UnifiedTimelineApiItem[],
  filter: CommandTimelineFilter
): UnifiedTimelineApiItem[] {
  if (filter === "ALL") return items;
  return items.filter((item) => matchesCommandTimelineFilter(item, filter));
}

export function computeCarePhaseMarkers(items: UnifiedTimelineApiItem[]): CarePhaseMarker[] {
  const phases: CarePhaseMarker[] = [
    { phase: "ED", reached: false, latestAtIso: null },
    { phase: "OBSERVATION", reached: false, latestAtIso: null },
    { phase: "DISCHARGE", reached: false, latestAtIso: null },
  ];
  for (const item of items) {
    const cat = resolveCommandTimelineCategory(item);
    const at = item.documentedAtIso;
    if (cat === "ED" || cat === "NURSING" || cat === "PROVIDER" || cat === "ORDERS") {
      markPhase(phases, "ED", at);
    }
    if (cat === "OBSERVATION") markPhase(phases, "OBSERVATION", at);
    if (cat === "DISCHARGE") markPhase(phases, "DISCHARGE", at);
    if (item.carePhase === "ED") markPhase(phases, "ED", at);
    if (item.carePhase === "OBSERVATION") markPhase(phases, "OBSERVATION", at);
    if (item.carePhase === "DISCHARGE") markPhase(phases, "DISCHARGE", at);
  }
  return phases;
}

function markPhase(phases: CarePhaseMarker[], phase: CarePhaseMarker["phase"], atIso: string) {
  const row = phases.find((p) => p.phase === phase);
  if (!row) return;
  row.reached = true;
  if (!row.latestAtIso || new Date(atIso).getTime() > new Date(row.latestAtIso).getTime()) {
    row.latestAtIso = atIso;
  }
}

export function safeSourceLabel(sourceKind: string, sourceId: string): string {
  const tail = sourceId.length > 8 ? sourceId.slice(-8) : sourceId;
  return `${sourceKind} · …${tail}`;
}

const FRENCH_UI_LEAK_TOKENS = [
  "enregistré",
  "enregistrée",
  "Ordre accusé",
  "Dossier de sortie",
  "Complément de disposition",
  "Prescrit",
  "Réalisé",
  "Signes vitaux",
  "Évaluation infirmière",
  "Triage enregistré",
] as const;

export function commandTimelineEventTitle(
  item: UnifiedTimelineApiItem,
  t: (key: string) => string,
  language: SupportedLanguage
): string {
  const apiTitle =
    language === "en" ? item.titleEn?.trim() : item.titleFr?.trim();
  if (apiTitle) return apiTitle;

  if (item.sourceKind === "ENCOUNTER_CLINICAL_EVENT") {
    const key = clinicalTimelineDisplayLabelKey(item.displayEventType);
    const viaI18n = t(key);
    if (viaI18n !== key) return viaI18n;
  }

  if (item.displayEventType === "OBSERVATION_ADMISSION_PACKET_SAVED") {
    return t("clinicalTimelineDisplay.event.OBSERVATION_ADMISSION_PACKET_SAVED");
  }

  const clinicalKey = `clinicalTimelineDisplay.event.${item.displayEventType}`;
  const clinicalViaI18n = t(clinicalKey);
  if (clinicalViaI18n !== clinicalKey) return clinicalViaI18n;

  return item.displayEventType;
}

/** Regression guard — English command timeline must not surface known French UI tokens. */
export function commandTimelineTitleHasFrenchUiLeak(title: string): boolean {
  const lower = title.toLowerCase();
  return FRENCH_UI_LEAK_TOKENS.some((token) => lower.includes(token.toLowerCase()));
}

export function resolveOrderEventAttributionKind(
  item: UnifiedTimelineApiItem
): ReturnType<typeof orderAttributionActionForOrderType> {
  const et = item.storedEventType.trim().toUpperCase();
  const meta = asRecord(item.payloadJson);
  if (et === "STARTED" && meta?.lifecycleOutcome === "ACKNOWLEDGED") {
    return "ACKNOWLEDGED";
  }
  if (et === "COMPLETED" && meta?.source === "OBSERVATION_TEMPLATE_ORDER") {
    return "PERFORMED";
  }
  const orderType =
    item.displayGroup === "LABORATORY"
      ? "LAB"
      : item.displayGroup === "IMAGING"
        ? "IMAGING"
        : item.displayGroup === "PROCEDURE"
          ? "CARE"
          : null;
  return orderAttributionActionForOrderType(et, orderType);
}

export function buildCommandTimelinePrimaryActorLine(
  item: UnifiedTimelineApiItem,
  t: (key: string) => string
): string {
  const name = item.actor.displayName?.trim() || t("attribution.unknownUser");
  const role = item.actor.role?.trim();
  const dept = item.actor.department?.trim();
  const roleDept = [role, dept].filter(Boolean).join(" · ");

  if (item.sourceKind === "ORDER_EVENT") {
    const et = item.storedEventType.trim().toUpperCase();
    if (et === "CREATED") {
      return fillTemplate(t("commandTimeline.attribution.orderedBy"), {
        name,
        role: roleDept ? ` (${roleDept})` : "",
      });
    }
    const kind = resolveOrderEventAttributionKind(item);
    if (kind) {
      return fillTemplate(t(orderAttributionLabelKey(kind)), {
        name,
        role: roleDept ? `, ${roleDept}` : "",
        datetime: "",
      }).replace(/ · $/, "");
    }
  }

  return fillTemplate(t("commandTimeline.attribution.documentedBy"), {
    name,
    role: roleDept ? ` (${roleDept})` : "",
  });
}

export function buildCommandTimelineExpandedLines(
  item: UnifiedTimelineApiItem,
  t: (key: string) => string,
  formatDt: (iso: string | null) => string
): string[] {
  const lines: string[] = [];
  lines.push(
    fillTemplate(t("commandTimeline.details.source"), {
      label: safeSourceLabel(item.sourceKind, item.sourceId),
    })
  );
  lines.push(
    fillTemplate(t("commandTimeline.details.documentedTime"), {
      datetime: formatDt(item.documentedAtIso),
    })
  );
  if (item.hasClinicalTimeCorrection && item.effectiveClinicalAtIso) {
    lines.push(
      fillTemplate(t("commandTimeline.details.clinicalTime"), {
        datetime: formatDt(item.effectiveClinicalAtIso),
      })
    );
  }
  const flags = parseReconciliationFlags(item.payloadJson);
  if (flags.length > 0) {
    lines.push(
      fillTemplate(t("commandTimeline.details.reconciliation"), {
        flags: flags.join(", "),
      })
    );
  }
  if (item.orderId) {
    lines.push(
      fillTemplate(t("commandTimeline.details.orderRef"), {
        id: item.orderId.length > 10 ? `…${item.orderId.slice(-10)}` : item.orderId,
      })
    );
  }
  return lines.filter((l) => l.trim().length > 0);
}

/** Verify sort order uses documented time only (newest first). */
export function isSortedByDocumentedTimeNewestFirst(items: UnifiedTimelineApiItem[]): boolean {
  for (let i = 1; i < items.length; i++) {
    const prev = new Date(items[i - 1]!.documentedAtIso).getTime();
    const cur = new Date(items[i]!.documentedAtIso).getTime();
    if (prev < cur) return false;
  }
  return true;
}

export function formatCommandTimelineTimeBlock(
  item: UnifiedTimelineApiItem,
  formatDt: (iso: string | null) => string,
  t: (key: string) => string,
  viewMode: CommandTimelineViewMode
): { primary: string; secondary: string | null } {
  const documented = formatDt(item.documentedAtIso);
  if (!item.hasClinicalTimeCorrection || !item.effectiveClinicalAtIso) {
    return {
      primary: fillTemplate(t("commandTimeline.time.documented"), { datetime: documented }),
      secondary: null,
    };
  }
  const clinical = formatDt(item.effectiveClinicalAtIso);
  if (viewMode === "COMPACT") {
    return {
      primary: fillTemplate(t("commandTimeline.time.documented"), { datetime: documented }),
      secondary: fillTemplate(t("commandTimeline.time.clinical"), { datetime: clinical }),
    };
  }
  return {
    primary: fillTemplate(t("commandTimeline.time.clinical"), { datetime: clinical }),
    secondary: fillTemplate(t("commandTimeline.time.documented"), { datetime: documented }),
  };
}

export function commandTimelineFilterI18nKey(filter: CommandTimelineFilter): string {
  return `commandTimeline.filters.${filter}`;
}

export function categoryTone(category: CommandTimelineCategory): {
  accent: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case "ED":
      return { accent: "#2563eb", bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" };
    case "OBSERVATION":
      return { accent: "#7c3aed", bg: "#f5f3ff", text: "#5b21b6", border: "#ddd6fe" };
    case "DISCHARGE":
      return { accent: "#0f766e", bg: "#f0fdfa", text: "#115e59", border: "#99f6e4" };
    case "MAR":
    case "INFUSION":
      return { accent: "#c2410c", bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" };
    case "LABORATORY":
      return { accent: "#0891b2", bg: "#ecfeff", text: "#155e75", border: "#a5f3fc" };
    case "RADIOLOGY":
      return { accent: "#4f46e5", bg: "#eef2ff", text: "#3730a3", border: "#c7d2fe" };
    case "PROCEDURE":
      return { accent: "#b45309", bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
    case "ORDERS":
      return { accent: "#64748b", bg: "#f8fafc", text: "#334155", border: "#e2e8f0" };
    case "NURSING":
      return { accent: "#db2777", bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8" };
    case "PROVIDER":
      return { accent: "#059669", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
    default:
      return { accent: "#64748b", bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
  }
}
