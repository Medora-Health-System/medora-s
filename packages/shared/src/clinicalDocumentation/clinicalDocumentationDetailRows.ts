import {
  ciwaArPayloadSchema,
  cowsPayloadSchema,
  EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS,
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  summarizeFoundationCatalogCompletionPayload,
} from "./foundationCatalogCompletionPayloads.js";
import {
  selectClinicalDocumentationPayloadSummary,
  summarizeClinicalDocumentationPayload,
} from "./clinicalDocumentationEntry.js";
import type { ClinicalDocumentationSummaryLocale } from "./clinicalDocumentationSummaryLocale.js";
import type { ClinicalDataProjectionEntry } from "./clinicalDataSummaryProjection.js";

export type ClinicalDocumentationDetailRow = {
  label: string;
  value: string;
};

const CIWA_ITEM_LABELS_EN: Record<string, string> = {
  nauseaVomiting: "Nausea/vomiting",
  tremor: "Tremor",
  paroxysmalSweats: "Paroxysmal sweats",
  anxiety: "Anxiety",
  agitation: "Agitation",
  tactileDisturbances: "Tactile disturbances",
  auditoryDisturbances: "Auditory disturbances",
  visualDisturbances: "Visual disturbances",
  headache: "Headache",
  orientationClouding: "Orientation/clouding",
};

const CIWA_ITEM_LABELS_FR: Record<string, string> = {
  nauseaVomiting: "Nausées/vomissements",
  tremor: "Tremblements",
  paroxysmalSweats: "Sueurs paroxystiques",
  anxiety: "Anxiété",
  agitation: "Agitation",
  tactileDisturbances: "Troubles tactiles",
  auditoryDisturbances: "Troubles auditifs",
  visualDisturbances: "Troubles visuels",
  headache: "Céphalée",
  orientationClouding: "Orientation/confusion",
};

const COWS_ITEM_LABELS_EN: Record<string, string> = {
  restingPulse: "Resting pulse",
  sweating: "Sweating",
  restlessness: "Restlessness",
  pupilSize: "Pupil size",
  boneJointAches: "Bone/joint aches",
  runnyNoseTearing: "Runny nose/tearing",
  giUpset: "GI upset",
  tremor: "Tremor",
  yawning: "Yawning",
  anxietyIrritability: "Anxiety/irritability",
  goosefleshSkin: "Gooseflesh skin",
};

const COWS_ITEM_LABELS_FR: Record<string, string> = {
  restingPulse: "Pouls au repos",
  sweating: "Sueurs",
  restlessness: "Agitation motrice",
  pupilSize: "Taille pupilles",
  boneJointAches: "Douleurs os/articulations",
  runnyNoseTearing: "Écoulement nasal/larmoiement",
  giUpset: "Troubles digestifs",
  tremor: "Tremblements",
  yawning: "Bâillements",
  anxietyIrritability: "Anxiété/irritabilité",
  goosefleshSkin: "Chair de poule",
};

function dedupeRows(rows: ClinicalDocumentationDetailRow[]): ClinicalDocumentationDetailRow[] {
  const seen = new Set<string>();
  const out: ClinicalDocumentationDetailRow[] = [];
  for (const row of rows) {
    const key = `${row.label}::${row.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function appendCiwaComponentRows(
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDocumentationDetailRow[] {
  const parsed = ciwaArPayloadSchema.safeParse(payload);
  if (!parsed.success) return [];
  const labels = locale === "en" ? CIWA_ITEM_LABELS_EN : CIWA_ITEM_LABELS_FR;
  return Object.entries(labels).map(([field, label]) => ({
    label,
    value: String(parsed.data[field as keyof typeof parsed.data] ?? ""),
  }));
}

function appendCowsComponentRows(
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDocumentationDetailRow[] {
  const parsed = cowsPayloadSchema.safeParse(payload);
  if (!parsed.success) return [];
  const labels = locale === "en" ? COWS_ITEM_LABELS_EN : COWS_ITEM_LABELS_FR;
  return Object.entries(labels).map(([field, label]) => ({
    label,
    value: String(parsed.data[field as keyof typeof parsed.data] ?? ""),
  }));
}

/** Compact documented-field rows for Clinical Data detail views. */
export function buildClinicalDocumentationDetailRows(
  entry: ClinicalDataProjectionEntry,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDocumentationDetailRow[] {
  let rows: ClinicalDocumentationDetailRow[] = [];

  if ((EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS as readonly string[]).includes(entry.cardId)) {
    const foundation = summarizeFoundationCatalogCompletionPayload(
      entry.cardId,
      entry.payloadJson ?? {},
      locale
    );
    if (foundation.length > 0) {
      rows = foundation.map((line) => ({ label: line.key, value: line.value }));
    }
  }

  if (rows.length === 0) {
    const stored = selectClinicalDocumentationPayloadSummary(entry, locale);
    rows =
      stored.length > 0 && !stored.some((line) => line.key === "Documentation type")
        ? stored.map((line) => ({ label: line.key, value: line.value }))
        : summarizeClinicalDocumentationPayload(entry.cardId, entry.payloadJson ?? {}, locale).map(
            (line) => ({ label: line.key, value: line.value })
          );
  }

  if (entry.cardId === SCORE_CIWA_AR_CARD_ID) {
    return dedupeRows([...rows, ...appendCiwaComponentRows(entry.payloadJson ?? {}, locale)]);
  }
  if (entry.cardId === SCORE_COWS_CARD_ID) {
    return dedupeRows([...rows, ...appendCowsComponentRows(entry.payloadJson ?? {}, locale)]);
  }
  return dedupeRows(rows.filter((row) => row.label.trim() && row.value.trim()));
}

export function formatClinicalDocumentationDetailInline(
  rows: readonly ClinicalDocumentationDetailRow[],
  maxItems = 6
): string {
  return rows
    .slice(0, maxItems)
    .map((row) => `${row.label} ${row.value}`)
    .join(" · ");
}

/** Structured display lines for ED Summary and legal chart views. */
export function resolveClinicalDocumentationStructuredDisplayLines(
  entry: ClinicalDataProjectionEntry,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  const detailRows = buildClinicalDocumentationDetailRows(entry, locale);
  if (detailRows.length > 0) {
    return detailRows.map((row) => ({ key: row.label, value: row.value }));
  }
  return selectClinicalDocumentationPayloadSummary(entry, locale);
}
