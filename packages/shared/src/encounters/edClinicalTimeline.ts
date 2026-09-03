import { productUiBcp47Tag } from "../i18n/productUiLocale.js";

/**
 * ED clinical timeline — read-only chronological aggregation for ED Summary / ER packet / export.
 * Preserves saved clinical text in summaries; UI category labels are localized separately.
 */

export type EdClinicalTimelineCategory =
  | "TRIAGE"
  | "INITIAL_NURSING_ASSESSMENT"
  | "PROVIDER_DOCUMENTATION"
  | "PROVIDER_ADDENDUM"
  | "PROVIDER_ORDER"
  | "MEDICATION_ADMINISTRATION"
  | "PROCEDURE_PROVIDER_NOTE"
  | "NURSING_PROCEDURE_SUPPORT"
  | "NURSING_REASSESSMENT"
  | "RESULT_REVIEWED"
  | "DISPOSITION"
  | "NURSING_DISCHARGE";

export type EdClinicalTimelineLocale = "en" | "fr";

export const ED_CLINICAL_TIMELINE_CATEGORY_LABELS: Record<
  EdClinicalTimelineCategory,
  Record<EdClinicalTimelineLocale, string>
> = {
  TRIAGE: { en: "Triage", fr: "Triage" },
  INITIAL_NURSING_ASSESSMENT: {
    en: "Initial nursing assessment",
    fr: "Évaluation infirmière initiale",
  },
  PROVIDER_DOCUMENTATION: {
    en: "Provider documentation",
    fr: "Documentation médecin",
  },
  PROVIDER_ADDENDUM: { en: "Provider addendum", fr: "Addendum médecin" },
  PROVIDER_ORDER: { en: "Provider order", fr: "Ordre médical" },
  MEDICATION_ADMINISTRATION: {
    en: "Medication administration",
    fr: "Administration médicamenteuse",
  },
  PROCEDURE_PROVIDER_NOTE: {
    en: "Procedure",
    fr: "Procédure",
  },
  NURSING_PROCEDURE_SUPPORT: {
    en: "Nursing procedure support",
    fr: "Soutien infirmier procédure",
  },
  NURSING_REASSESSMENT: {
    en: "Nursing reassessment",
    fr: "Réévaluation infirmière",
  },
  RESULT_REVIEWED: { en: "Result reviewed", fr: "Résultat revu" },
  DISPOSITION: { en: "Disposition", fr: "Disposition" },
  NURSING_DISCHARGE: {
    en: "Nursing discharge",
    fr: "Sortie infirmière",
  },
};

export type EdClinicalTimelineSourceRow = {
  id: string;
  category: EdClinicalTimelineCategory;
  timestampIso: string | null;
  actorName: string | null;
  actorRoleTitle: string | null;
  /** Short reference text — saved clinical content preserved verbatim where supplied. */
  summary: string;
  sourceType: string;
  sourceId: string;
};

export type EdClinicalTimelineEntry = {
  id: string;
  sortKey: string;
  timestampIso: string | null;
  displayTime: string | null;
  category: EdClinicalTimelineCategory;
  categoryLabel: string;
  actorName: string | null;
  actorRoleTitle: string | null;
  actorDisplay: string | null;
  summary: string;
  sourceType: string;
  sourceId: string;
  isUndated: boolean;
};

export type EdClinicalTimelineResult = {
  dated: EdClinicalTimelineEntry[];
  undated: EdClinicalTimelineEntry[];
  all: EdClinicalTimelineEntry[];
};

const MAX_SUMMARY = 220;

function truncSummary(text: string, max = MAX_SUMMARY): string {
  const t = text.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function parseTime(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function formatDisplayTime(iso: string, locale: EdClinicalTimelineLocale): string {
  try {
    const tag = productUiBcp47Tag(locale);
    return new Date(iso).toLocaleString(tag, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function actorDisplayLine(
  name: string | null,
  role: string | null
): string | null {
  const n = name?.trim();
  if (!n) return null;
  const r = role?.trim();
  return r ? `${n}, ${r}` : n;
}

export function categoryLabelForEdClinicalTimeline(
  category: EdClinicalTimelineCategory,
  locale: EdClinicalTimelineLocale
): string {
  return ED_CLINICAL_TIMELINE_CATEGORY_LABELS[category][locale];
}

/** Build sorted timeline entries from source rows (ascending by timestamp). */
export function buildEdClinicalTimeline(
  rows: EdClinicalTimelineSourceRow[],
  locale: EdClinicalTimelineLocale
): EdClinicalTimelineResult {
  const dated: EdClinicalTimelineEntry[] = [];
  const undated: EdClinicalTimelineEntry[] = [];

  for (const row of rows) {
    const summary = truncSummary(row.summary);
    if (!summary) continue;
    const ts = row.timestampIso?.trim() || null;
    const ms = parseTime(ts);
    const isUndated = ms == null;
    const entry: EdClinicalTimelineEntry = {
      id: row.id,
      sortKey: isUndated ? `undated-${row.id}` : ts!,
      timestampIso: ts,
      displayTime: ts ? formatDisplayTime(ts, locale) : null,
      category: row.category,
      categoryLabel: categoryLabelForEdClinicalTimeline(row.category, locale),
      actorName: row.actorName?.trim() || null,
      actorRoleTitle: row.actorRoleTitle?.trim() || null,
      actorDisplay: actorDisplayLine(row.actorName, row.actorRoleTitle),
      summary,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      isUndated,
    };
    if (isUndated) undated.push(entry);
    else dated.push(entry);
  }

  dated.sort((a, b) => parseTime(a.timestampIso)! - parseTime(b.timestampIso)!);
  undated.sort((a, b) => a.id.localeCompare(b.id));

  return { dated, undated, all: [...dated, ...undated] };
}
