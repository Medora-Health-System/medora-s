/**
 * Read-only aggregation for ER visit summary — derives display lines from existing encounter/triage/JSON only.
 * No new clinical inference; reuses preview builders where possible.
 */

import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import type { EncounterLabRadRow, EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import { hydrateAdmissionFormFromEncounterJson, formatPhysicianName } from "@/lib/encounterAdmission";
import { hydrateDischargeFormFromEncounterJson } from "@/lib/encounterDischarge";
import {
  buildErDispositionPreviewModel,
  dispositionPreviewLabelsFromLocale,
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
} from "./emergencyDispositionV1";
import { inferOutcomeHintsFromAdmissionSummary } from "./edHosp1bDispositionOutcomeMapping";
import {
  buildErNursingReassessmentPreviewModel,
  ER_NURSING_REASSESSMENT_V1_KEY,
  erNursingReassessmentFormFromEncounter,
} from "./emergencyNursingReassessmentV1";
import {
  buildErProviderMsePreviewModel,
  ER_PROVIDER_MSE_V1_KEY,
  erProviderMseFormFromEncounter,
} from "./emergencyProviderMseV1";
import { buildProviderDocumentationDisplayModel } from "@/lib/providerDocumentationModel";
import {
  buildVisitSummaryProviderDocumentationBlock,
  providerDocumentationToVisitSummaryBlock,
  type VisitSummaryProviderDocumentationBlock,
} from "./erProviderDocumentationSummary";
import {
  resolveProductUiLanguageOrDefault,
  productUiBcp47Tag,
  pickProductUiCopy,
  type SupportedLanguage,
} from "@/i18n/config";
import {
  buildTriageCarryForwardSummary,
  triageCarryForwardMetaFromVitalsJson,
  type TriageCarryForwardFieldKey,
} from "@medora/shared";
import { buildTriageDocumentationPreviewModel, triagePreviewSliceFromTriageGet } from "./emergencyTriageDocPreview";
import { formatResultAttributionPair } from "@/lib/documentationAttribution";
import { buildErResultsCockpitModel } from "./emergencyResultsCockpitModel";
import { erTriageT } from "./erTriageI18nLookup";
import {
  buildInitialNursingAssessmentSummaryBlock,
  readInitialNursingEvalSignature,
} from "./erInitialNursingAssessmentSummary";
import {
  buildNursingDischargeExecutionSummaryBlock19Y,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { readProviderDischargeDocumentationMeta } from "./providerDischargeDocumentationModel";
import { readNursingDischargeExecutionStored } from "./nursingDischargeExecutionModel";
import { deriveEmtalaStateFromEncounter } from "./erEmtalaV1";
import {
  ER_HANDOFF_V1_KEY,
  readErHandoffV1FromNursingAssessment,
  clinicalDocumentationEventBelongsInAdmissionHistory,
  clinicalDocumentationEventBelongsInDischargeHistory,
  mislabeledDischargeEventIsObservationAdmission,
} from "@medora/shared";

export type VisitSummaryTextBlock = {
  title: string;
  lines: string[];
};

export type VisitSummaryResultsBlock = {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  labLine: string | null;
  imagingLine: string | null;
  priorityLines: string[];
};

export type VisitSummaryTimelineEntry = { label: string; value: string };

/**
 * One historical nursing reassessment column rendered in the Summary tab. Each entry comes from
 * an immutable `EncounterClinicalEvent` row (eventType `NURSING_ASSESSMENT_SAVED`, namespace
 * `erNursingReassessmentV1`) returned by `GET /encounters/:id/nursing-reassessment-events`.
 *
 * The renderer shows newest-first; the entry whose `id === latestEntryId` on the parent model is
 * tagged "Actuel". Lines are pre-flattened structured-preview output limited per entry so the
 * Summary stays scan-friendly. `narrativeExcerpt` is the (truncated) free-text narrative when
 * present, included separately so the UI can format it differently from structured lines.
 */
export type VisitSummaryReassessmentEntry = {
  /** Event row id — stable across renders; doubles as React key. */
  id: string;
  /** Clinically-entered reassessment time (preferred display); `null` when not captured. */
  documentedAt: string | null;
  /** Server save time. Always present; used as fallback display when `documentedAt` is null. */
  savedAt: string;
  /** Pre-formatted display string for the time row (locale-aware). */
  displayWhen: string;
  /** Performer display name captured at save time (immutable on the row). */
  performerDisplayName: string;
  /** Performer initials (uppercase) — drives the small footer badge. */
  performerInitials: string;
  /** Performer role/title (e.g. "RN", "PROVIDER"); empty string when not recorded. */
  performerRoleTitle: string;
  /** Compact structured-preview lines (already truncated). May be empty when the entry is narrative-only. */
  structuredLines: string[];
  /** Free-text narrative excerpt (truncated). Empty string when no narrative was saved. */
  narrativeExcerpt: string;
};

export type VisitSummaryDocumentationHistoryEntry = {
  id: string;
  eventType:
    | "PROVIDER_MSE_SAVED"
    | "HANDOFF_NURSING"
    | "DISCHARGE_SUMMARY_SAVED"
    | "ADMISSION_SUMMARY_SAVED"
    | "OBSERVATION_ADMISSION_PACKET_SAVED"
    | "DISPOSITION_SUPPLEMENT_SAVED"
    | "TRIAGE_ASSESSMENT_SAVED";
  documentedAt: string | null;
  savedAt: string;
  displayWhen: string;
  performerDisplayName: string;
  performerInitials: string;
  performerRoleTitle: string;
  structuredLines: string[];
  narrativeExcerpt: string;
};

export type EmergencyVisitSummaryModel = {
  motifPresentation: VisitSummaryTextBlock | null;
  triageResume: VisitSummaryTextBlock | null;
  /** Carry-forward triage history metadata (19T.1) — no clinical text in lines. */
  triageCarryForward: VisitSummaryTextBlock | null;
  /** Initial nursing assessment (`nursingEvalV1`) — distinct from reassessment history. */
  initialNursingAssessment: VisitSummaryTextBlock | null;
  resumeInfirmier: VisitSummaryTextBlock | null;
  /** Structured provider documentation with status/metadata — drives evaluationMedicale display. */
  providerDocumentation: VisitSummaryProviderDocumentationBlock | null;
  evaluationMedicale: VisitSummaryTextBlock | null;
  resultats: VisitSummaryResultsBlock | null;
  disposition: VisitSummaryTextBlock | null;
  /** ER admission handoff (erHandoffV1) — read-only operational lines. */
  handoff: VisitSummaryTextBlock | null;
  emtala: VisitSummaryTextBlock | null;
  timeline: VisitSummaryTimelineEntry[];
  /**
   * Append-only nursing reassessment column history (newest-first). Empty for legacy encounters
   * with no `NURSING_ASSESSMENT_SAVED` events yet — the existing single-block `resumeInfirmier`
   * still renders in that case so pre-history charts never lose their content.
   */
  nursingReassessmentHistory: VisitSummaryReassessmentEntry[];
  /** Id of the entry to tag as "Actuel" in the UI; `null` when history is empty. */
  nursingReassessmentLatestId: string | null;
  /** Nursing discharge execution (sortie) when documented. */
  nursingDischargeDocumentation: VisitSummaryTextBlock | null;
  /** Provider discharge documentation (Phase 19Y). */
  providerDischargeDocumentation: VisitSummaryTextBlock | null;
  providerMseHistory: VisitSummaryDocumentationHistoryEntry[];
  providerMseLatestId: string | null;
  handoffHistory: VisitSummaryDocumentationHistoryEntry[];
  handoffLatestId: string | null;
  dischargeSummaryHistory: VisitSummaryDocumentationHistoryEntry[];
  dischargeSummaryLatestId: string | null;
  admissionSummaryHistory: VisitSummaryDocumentationHistoryEntry[];
  admissionSummaryLatestId: string | null;
  dispositionSupplementHistory: VisitSummaryDocumentationHistoryEntry[];
  dispositionSupplementLatestId: string | null;
  triageAssessmentHistory: VisitSummaryDocumentationHistoryEntry[];
  triageAssessmentLatestId: string | null;
};

const MAX_LINE = 420;

function trunc(s: string, max = MAX_LINE): string {
  const t = s.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function vs(locale: SupportedLanguage, key: string): string {
  return erTriageT(locale, `erTriage.visitSummary.${key}`);
}

function interpolate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

function flattenSectionsToBlock(
  title: string,
  sections: { title: string; lines: string[] }[],
  locale: SupportedLanguage,
  maxLinesTotal = 24
): VisitSummaryTextBlock | null {
  const lines: string[] = [];
  for (const sec of sections) {
    if (sec.lines.length === 0) continue;
    if (lines.length > 0) lines.push("");
    lines.push(interpolate(vs(locale, "sectionHeader"), { title: sec.title }));
    for (const ln of sec.lines) {
      lines.push(trunc(ln));
      if (lines.length >= maxLinesTotal) break;
    }
    if (lines.length >= maxLinesTotal) break;
  }
  if (lines.length === 0) return null;
  return { title, lines };
}

const CARRY_FORWARD_FIELD_I18N: Record<TriageCarryForwardFieldKey, string> = {
  allergies: "carryForward.carryForwardFieldAllergies",
  homeMedications: "carryForward.carryForwardFieldHomeMedications",
  medicalHistory: "carryForward.carryForwardFieldMedicalHistory",
  surgicalHistory: "carryForward.carryForwardFieldSurgicalHistory",
  smokingHistory: "carryForward.carryForwardFieldSmoking",
  alcoholUse: "carryForward.carryForwardFieldAlcohol",
  substanceUse: "carryForward.carryForwardFieldSubstance",
};

const CARRY_FORWARD_STATUS_I18N: Record<
  "pending_review" | "reviewed" | "modified" | "removed",
  string
> = {
  pending_review: "carryForward.carryForwardStatusPending",
  reviewed: "carryForward.carryForwardStatusReviewed",
  modified: "carryForward.carryForwardStatusModified",
  removed: "carryForward.carryForwardStatusRemoved",
};

const CARRY_FORWARD_SECTION_I18N: Record<
  "allergies" | "homeMedications" | "history" | "socialHistory",
  string
> = {
  allergies: "carryForward.sectionLabelAllergies",
  homeMedications: "carryForward.sectionLabelHomeMedications",
  history: "carryForward.sectionLabelHistory",
  socialHistory: "carryForward.sectionLabelSocialHistory",
};

const CARRY_FORWARD_SECTION_STATUS_I18N: Record<
  "pending_review" | "reviewed" | "modified" | "removed",
  string
> = {
  pending_review: "carryForward.sectionStatusPending",
  reviewed: "carryForward.sectionStatusReviewed",
  modified: "carryForward.sectionStatusModified",
  removed: "carryForward.sectionStatusRemoved",
};

const CARRY_FORWARD_STALENESS_I18N: Record<"fresh" | "stale" | "very_stale", string> = {
  fresh: "triageCarryForwardStalenessFresh",
  stale: "triageCarryForwardStalenessStale",
  very_stale: "triageCarryForwardStalenessVeryStale",
};

function buildTriageCarryForwardSummaryBlock(
  triage: Record<string, unknown> | null,
  locale: SupportedLanguage
): VisitSummaryTextBlock | null {
  if (!triage) return null;
  const meta = triageCarryForwardMetaFromVitalsJson(triage.vitalsJson);
  const summary = buildTriageCarryForwardSummary(meta);
  if (!summary.sections.length || !summary.reviewStatus) return null;

  const fieldLabels = summary.fields
    .map((f) => erTriageT(locale, `erTriage.${CARRY_FORWARD_FIELD_I18N[f.fieldKey]}`))
    .join(", ");
  const statusLabel = erTriageT(locale, `erTriage.${CARRY_FORWARD_STATUS_I18N[summary.reviewStatus]}`);
  const sourceDate = summary.sourceEncounterDate
    ? formatIsoForLocale(summary.sourceEncounterDate, locale)
    : "—";
  const stalenessLabel = summary.staleness
    ? erTriageT(locale, `erTriage.${CARRY_FORWARD_STALENESS_I18N[summary.staleness.level]}`)
    : null;

  const lines = [
    interpolate(vs(locale, "triageCarryForwardLine"), {
      fields: fieldLabels,
      status: statusLabel,
      date: sourceDate,
    }),
  ];
  if (stalenessLabel) {
    lines.push(interpolate(vs(locale, "triageCarryForwardStaleness"), { level: stalenessLabel }));
  }
  for (const section of summary.sections) {
    lines.push(
      interpolate(vs(locale, "triageCarryForwardSectionLine"), {
        section: erTriageT(locale, `erTriage.${CARRY_FORWARD_SECTION_I18N[section.sectionKey]}`),
        status: erTriageT(locale, `erTriage.${CARRY_FORWARD_SECTION_STATUS_I18N[section.reviewStatus]}`),
      })
    );
  }
  if (summary.reviewedBy && summary.reviewedAt) {
    lines.push(
      interpolate(vs(locale, "triageCarryForwardReviewedBy"), {
        name: summary.reviewedBy,
        date: formatIsoForLocale(summary.reviewedAt, locale),
      })
    );
  }
  return { title: vs(locale, "triageCarryForwardTitle"), lines };
}

function nonEmptyPreviewSections(sections: { id: string; title: string; lines: string[] }[]): typeof sections {
  return sections.filter((s) => s.lines.some((l) => l.trim().length > 0) && s.id !== "empty");
}

function oneLineFromRow(row: EncounterLabRadRow | null, locale: SupportedLanguage): string | null {
  if (!row) return null;
  const v = clinicalResultFromOrderItemLike({
    displayLabel: getOrderItemDisplayLabelFromLocale(row.item, locale),
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
    emptyTitleFallback: vs(locale, "examDefaultLabel"),
  });
  const label = v.title.trim() || vs(locale, "examDefaultLabel");
  const rt = (v.resultText ?? "").trim();
  const crit = v.criticalValue ? vs(locale, "criticalValueSuffix") : "";
  let base: string;
  if (rt) {
    base = interpolate(vs(locale, "resultWithValue"), {
      label,
      crit,
      value: trunc(rt, 200),
    });
  } else {
    base = interpolate(vs(locale, "resultStatusOnly"), {
      label,
      crit,
      status: v.itemStatus ?? "",
    }).trim();
  }
  const resultRaw = row.item.result;
  const ackLines =
    resultRaw && typeof resultRaw === "object" && !Array.isArray(resultRaw)
      ? formatResultAttributionPair({
          resultedBy: (resultRaw as { enteredByDisplayFr?: string | null }).enteredByDisplayFr,
          resultedAt: (resultRaw as { verifiedAt?: string | null }).verifiedAt,
          acknowledgedBy: (resultRaw as { acknowledgedByDisplayFr?: string | null }).acknowledgedByDisplayFr,
          acknowledgedAt: (resultRaw as { acknowledgedByProviderAt?: string | null }).acknowledgedByProviderAt,
          language: locale,
        })
      : [];
  if (ackLines.length > 0) {
    return `${base} · ${ackLines.join(" · ")}`;
  }
  return base;
}

/** Build compact lab/rad lines from the same snapshot as EmergencyResultsPanel. */
export function buildVisitSummaryResultsBlock(
  snap: EncounterResultsLabRadSnapshot | null,
  locale: SupportedLanguage
): VisitSummaryResultsBlock {
  const m = buildErResultsCockpitModel(snap);
  if (!m.ready) {
    return {
      loading: true,
      failed: false,
      empty: true,
      labLine: null,
      imagingLine: null,
      priorityLines: [],
    };
  }
  if (m.failed) {
    return {
      loading: false,
      failed: true,
      empty: true,
      labLine: null,
      imagingLine: null,
      priorityLines: [],
    };
  }
  const labLine = oneLineFromRow(m.labLatest, locale);
  const imagingLine = oneLineFromRow(m.imagingLatest, locale);
  const priorityLines = m.priorityRows
    .map((r) => oneLineFromRow(r, locale))
    .filter((x): x is string => Boolean(x));
  return {
    loading: false,
    failed: false,
    empty: m.empty,
    labLine,
    imagingLine,
    priorityLines: priorityLines.slice(0, 8),
  };
}

type EncounterLike = {
  visitReason?: string | null;
  chiefComplaint?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  roomLabel?: string | null;
  status?: string | null;
  type?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  /** Used with discharge JSON for EMTALA disposition context (e.g. admission + supplement alignment). */
  admissionSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{ text?: string; createdAt?: string; createdByDisplayFr?: string | null }> | null;
  encounterNotes?: Array<{
    id?: string;
    noteType?: string;
    body?: string;
    authorDisplayName?: string;
    authorRoleTitle?: string;
    createdAt?: string;
    legacy?: boolean;
    voidedAt?: string | null;
    voidReasonCode?: string | null;
    isAmendment?: boolean;
    amendedFromNoteId?: string | null;
    amendmentReason?: string | null;
    requiresCosign?: boolean;
    cosignedAt?: string | null;
    cosignRoleSnapshot?: string | null;
  }> | null;
  clinicalDocumentationEntries?: Array<{
    id: string;
    encounterId: string;
    category: string;
    cardId: string;
    cardTitleEn: string;
    cardTitleFr: string;
    authorUserId: string;
    authorDisplayName: string;
    authorRoleTitle: string;
    createdAt: string;
    payloadJson: Record<string, unknown>;
    payloadSummary: Array<{ key: string; value: string }>;
    payloadSummaryEn?: Array<{ key: string; value: string }>;
    payloadSummaryFr?: Array<{ key: string; value: string }>;
    voidedAt: string | null;
    requiresWitnessSignature: boolean;
    witnessStatus: string;
    witnessedAt: string | null;
    witnessedByUserId: string | null;
    witnessDisplayName: string | null;
    witnessRoleTitle: string | null;
  }> | null;
};

/** EDOC.2 — persisted structured documentation row on encounter / chart APIs. */
export type ClinicalDocumentationLegalChartEntry = NonNullable<
  EncounterLike["clinicalDocumentationEntries"]
>[number];

export type ClinicalDocumentationPayloadSummaryLine = {
  key: string;
  value: string;
};

function formatIsoForLocale(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    const tag = productUiBcp47Tag(locale);
    return new Date(iso).toLocaleString(tag, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function readSignatureFromNursingBlob(
  key: string,
  nursingAssessment: unknown,
  locale: SupportedLanguage
): { label: string; at: string } | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = (raw as Record<string, unknown>).signature;
  if (!s || typeof s !== "object") return null;
  const at = (s as { savedAt?: unknown }).savedAt;
  const by = (s as { savedByDisplayName?: unknown }).savedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;
  return { label: by.trim(), at: formatIsoForLocale(at, locale) };
}

/**
 * Loose-typed input shape for an entry returned by `GET /encounters/:id/nursing-reassessment-events`.
 * Kept loose so the model stays decoupled from the API client and so unknown / null fields fall
 * back gracefully (`displayName` / `initials` / `snapshot` may all be missing on legacy rows).
 */
export type NursingReassessmentApiEntry = {
  id?: unknown;
  createdAt?: unknown;
  documentedAt?: unknown;
  performerDisplayName?: unknown;
  performerInitials?: unknown;
  performerRoleTitle?: unknown;
  snapshot?: unknown;
};

export type ClinicalDocumentationEventApiEntry = {
  id?: unknown;
  eventType?: unknown;
  createdAt?: unknown;
  createdByUserId?: unknown;
  createdBy?: unknown;
  performerDisplayName?: unknown;
  performerInitials?: unknown;
  performerRoleTitle?: unknown;
  payloadJson?: unknown;
};

const HISTORY_NARRATIVE_MAX = 240;
const HISTORY_STRUCTURED_LINES_MAX = 4;

/**
 * Build the per-entry history list rendered in the Summary tab.
 *
 * Each API entry is converted into a `VisitSummaryReassessmentEntry`:
 *   - `displayWhen` prefers the clinically-entered `documentedAt`, falling back to `createdAt`.
 *   - Structured lines come from running the snapshot through the SAME preview model used for
 *     the existing `resumeInfirmier` block (so per-entry display is consistent with the latest
 *     single-block view), trimmed to a small per-entry budget for scan readability.
 *   - `narrativeExcerpt` is the truncated free-text narrative; surfaced separately so the UI can
 *     visually distinguish nurse prose from structured fields.
 *   - Performer fields are taken **only** from the API row's denormalized snapshot (the row's
 *     immutable performer captured at save time) — never the current logged-in user — so prior
 *     authors stay attributed correctly even when subsequent saves happened.
 */
function buildReassessmentHistoryEntries(
  events: NursingReassessmentApiEntry[],
  locale: SupportedLanguage
): VisitSummaryReassessmentEntry[] {
  const out: VisitSummaryReassessmentEntry[] = [];
  for (const e of events) {
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = typeof e.createdAt === "string" ? e.createdAt : "";
    if (!id || !savedAt) continue;
    const documentedAt =
      typeof e.documentedAt === "string" && e.documentedAt.trim() ? e.documentedAt : null;
    const displayIso = documentedAt ?? savedAt;
    const displayWhen = formatIsoForLocale(displayIso, locale);
    const performerDisplayName =
      typeof e.performerDisplayName === "string" ? e.performerDisplayName.trim() : "";
    const performerInitials =
      typeof e.performerInitials === "string" ? e.performerInitials.trim() : "";
    const performerRoleTitle =
      typeof e.performerRoleTitle === "string" ? e.performerRoleTitle.trim() : "";
    /**
     * Wrap the snapshot under the namespace key so the existing decoder sees the same shape it
     * gets from a live encounter blob. Snapshots that are absent or malformed yield an empty
     * form, which produces an empty preview (we still emit the entry — header + footer make it
     * useful for audit even when content is sparse).
     */
    const wrapped =
      e.snapshot && typeof e.snapshot === "object" && !Array.isArray(e.snapshot)
        ? ({ [ER_NURSING_REASSESSMENT_V1_KEY]: e.snapshot } as Record<string, unknown>)
        : null;
    const form = erNursingReassessmentFormFromEncounter(wrapped);
    const preview = buildErNursingReassessmentPreviewModel(form, locale);
    const structuredLines: string[] = [];
    for (const sec of preview.sections) {
      if (sec.id === "empty") continue;
      for (const ln of sec.lines) {
        const t = ln.trim();
        if (!t) continue;
        structuredLines.push(trunc(t, 200));
        if (structuredLines.length >= HISTORY_STRUCTURED_LINES_MAX) break;
      }
      if (structuredLines.length >= HISTORY_STRUCTURED_LINES_MAX) break;
    }
    const narrativeExcerpt = trunc(preview.narrative, HISTORY_NARRATIVE_MAX);
    out.push({
      id,
      documentedAt,
      savedAt,
      displayWhen,
      performerDisplayName,
      performerInitials,
      performerRoleTitle,
      structuredLines,
      narrativeExcerpt,
    });
  }
  /**
   * Order newest-first by **effective clinical timestamp** so the Summary's "Actuel" entry
   * matches the flowsheet header logic (which already renders `documentedAt ?? createdAt`).
   *
   * The append-only events endpoint returns rows ordered by system `createdAt: desc`. That
   * ordering can diverge from the clinical timeline because the only mutable code path on the
   * backend — same-user, same-session, in-place UPDATE within the recency window
   * (`apps/api/src/encounters/encounters.service.ts`) — leaves `createdAt` pinned at the row's
   * original save time while advancing `documentedAt` (the nurse-entered reassessmentAt). A row
   * opened earlier can therefore carry a later clinical timestamp than a row opened later, and
   * picking `[0]` straight from API order would tag the wrong entry as "Actuel".
   *
   * Tie-break by `savedAt` so two rows with no `documentedAt` keep their server-time ordering.
   * Stable across renders because both fields come directly from the immutable event payload.
   *
   * Append-only safety: this is a pure read-side reorder of an in-memory array. No event row is
   * mutated, deleted, or re-attributed; performer identity stays bound to its row.
   */
  out.sort((a, b) => {
    const aMs = effectiveReassessmentTimestampMs(a.documentedAt, a.savedAt);
    const bMs = effectiveReassessmentTimestampMs(b.documentedAt, b.savedAt);
    if (aMs === bMs) return 0;
    return bMs - aMs;
  });
  return out;
}

/**
 * Resolve the comparable millisecond timestamp for a reassessment history entry, preferring the
 * clinically-entered `documentedAt` and falling back to the server `savedAt` (= row `createdAt`).
 * Unparseable / missing values sort to the bottom (`-Infinity`) so they never falsely steal the
 * "Actuel" slot from a row with a real timestamp. Mirrors the display fallback chain used by the
 * history card and by the bedside flowsheet header.
 */
function effectiveReassessmentTimestampMs(
  documentedAt: string | null,
  savedAt: string
): number {
  const candidates = [documentedAt, savedAt];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (!trimmed) continue;
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) return ms;
  }
  return Number.NEGATIVE_INFINITY;
}

function payloadSnapshot(entry: ClinicalDocumentationEventApiEntry): Record<string, unknown> | null {
  const payload = payloadObject(entry);
  const snapshot = payload?.snapshot;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)
    : null;
}

function payloadObject(entry: ClinicalDocumentationEventApiEntry): Record<string, unknown> | null {
  return entry.payloadJson && typeof entry.payloadJson === "object" && !Array.isArray(entry.payloadJson)
    ? (entry.payloadJson as Record<string, unknown>)
    : null;
}

function payloadSavedAt(entry: ClinicalDocumentationEventApiEntry): string | null {
  const payload = payloadObject(entry);
  return typeof payload?.savedAt === "string" && payload.savedAt.trim() ? payload.savedAt.trim() : null;
}

function createdByDisplayName(entry: ClinicalDocumentationEventApiEntry): string {
  const createdBy =
    entry.createdBy && typeof entry.createdBy === "object" && !Array.isArray(entry.createdBy)
      ? (entry.createdBy as Record<string, unknown>)
      : null;
  const displayName = createdBy?.displayName;
  return typeof displayName === "string" ? displayName.trim() : "";
}

function performerFromEntry(
  entry: ClinicalDocumentationEventApiEntry,
  snapshot: Record<string, unknown> | null
): { displayName: string; initials: string; roleTitle: string } {
  const signature =
    snapshot?.signature && typeof snapshot.signature === "object" && !Array.isArray(snapshot.signature)
      ? (snapshot.signature as Record<string, unknown>)
      : null;
  const display =
    (typeof entry.performerDisplayName === "string" && entry.performerDisplayName.trim()) ||
    (typeof signature?.savedByDisplayName === "string" && signature.savedByDisplayName.trim()) ||
    (typeof snapshot?.handoffLastSavedByDisplayName === "string" && snapshot.handoffLastSavedByDisplayName.trim()) ||
    createdByDisplayName(entry);
  const initials =
    typeof entry.performerInitials === "string" && entry.performerInitials.trim()
      ? entry.performerInitials.trim()
      : display
        .split(/\s+/u)
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
  return {
    displayName: display,
    initials,
    roleTitle: typeof entry.performerRoleTitle === "string" ? entry.performerRoleTitle.trim() : "",
  };
}

function buildHandoffLinesFromStored(
  hf: ReturnType<typeof readErHandoffV1FromNursingAssessment>,
  locale: SupportedLanguage
): string[] {
  const yn = (v: boolean) =>
    pickProductUiCopy(
      locale,
      { en: v ? "Yes" : "No", fr: v ? "Oui" : "Non", es: v ? "Sí" : "No" },
      v ? "Sí" : "No"
    );
  const hLines: string[] = [];
  if (hf.receivingNurseName?.trim()) {
    hLines.push(interpolate(vs(locale, "handoffLineReceivingNurse"), { name: trunc(hf.receivingNurseName, 200) }));
  }
  if (hf.reportGiven === true || hf.reportGiven === false) {
    hLines.push(interpolate(vs(locale, "handoffLineReportGiven"), { value: yn(hf.reportGiven) }));
  }
  if (hf.reportGivenAt?.trim()) {
    hLines.push(
      interpolate(vs(locale, "handoffLineReportAt"), {
        datetime: formatIsoForLocale(hf.reportGivenAt, locale),
      })
    );
  }
  if (hf.readyForInpatientTransfer === true || hf.readyForInpatientTransfer === false) {
    hLines.push(interpolate(vs(locale, "handoffLineReady"), { value: yn(hf.readyForInpatientTransfer) }));
  }
  if (hf.handoffNote?.trim()) {
    hLines.push(interpolate(vs(locale, "handoffLineNote"), { text: trunc(hf.handoffNote, 360) }));
  }
  return hLines;
}

function structuredLinesFromSections(
  sections: { id: string; lines: string[] }[],
  maxLines = HISTORY_STRUCTURED_LINES_MAX
): string[] {
  const structuredLines: string[] = [];
  for (const sec of sections) {
    if (sec.id === "empty") continue;
    for (const ln of sec.lines) {
      const t = ln.trim();
      if (!t) continue;
      structuredLines.push(trunc(t, 200));
      if (structuredLines.length >= maxLines) break;
    }
    if (structuredLines.length >= maxLines) break;
  }
  return structuredLines;
}

function buildProviderMseHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  for (const e of events) {
    if (e.eventType !== "PROVIDER_MSE_SAVED") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = typeof e.createdAt === "string" ? e.createdAt : "";
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const signature =
      snapshot?.signature && typeof snapshot.signature === "object" && !Array.isArray(snapshot.signature)
        ? (snapshot.signature as Record<string, unknown>)
        : null;
    const documentedAt =
      typeof signature?.savedAt === "string" && signature.savedAt.trim() ? signature.savedAt.trim() : null;
    const wrapped = snapshot ? ({ [ER_PROVIDER_MSE_V1_KEY]: snapshot } as Record<string, unknown>) : null;
    const workspace = buildProviderDocumentationDisplayModel({
      nursingAssessment: wrapped,
      locale: resolveProductUiLanguageOrDefault(locale),
    });
    const preview = workspace
      ? null
      : buildErProviderMsePreviewModel(erProviderMseFormFromEncounter(wrapped), locale);
    const structuredLines = workspace
      ? workspace.sections
          .flatMap((section) => section.text.split("\n").map((line) => `${section.label}: ${line}`))
          .map((line) => trunc(line, 200))
          .slice(0, HISTORY_STRUCTURED_LINES_MAX)
      : preview
        ? structuredLinesFromSections(preview.sections)
        : [];
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "PROVIDER_MSE_SAVED",
      documentedAt,
      savedAt,
      displayWhen: formatIsoForLocale(documentedAt ?? savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines,
      narrativeExcerpt: trunc(workspace?.title ?? preview?.oneLineSummary ?? "", HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildHandoffHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  for (const e of events) {
    if (e.eventType !== "HANDOFF_NURSING") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = typeof e.createdAt === "string" ? e.createdAt : "";
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const documentedAt =
      typeof snapshot?.handoffLastSavedAt === "string" && snapshot.handoffLastSavedAt.trim()
        ? snapshot.handoffLastSavedAt.trim()
        : typeof snapshot?.reportGivenAt === "string" && snapshot.reportGivenAt.trim()
          ? snapshot.reportGivenAt.trim()
          : null;
    const wrapped = snapshot ? ({ [ER_HANDOFF_V1_KEY]: snapshot } as Record<string, unknown>) : null;
    const hf = readErHandoffV1FromNursingAssessment(wrapped);
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "HANDOFF_NURSING",
      documentedAt,
      savedAt,
      displayWhen: formatIsoForLocale(documentedAt ?? savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines: buildHandoffLinesFromStored(hf, locale).slice(0, HISTORY_STRUCTURED_LINES_MAX),
      narrativeExcerpt: trunc(hf.handoffNote ?? "", HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildDischargeSummaryHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  const emptyAdmission = hydrateAdmissionFormFromEncounterJson(null, "");
  const emptySupplement = erDispositionSupplementFromEncounter(null);
  for (const e of events) {
    if (e.eventType !== "DISCHARGE_SUMMARY_SAVED") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = payloadSavedAt(e) ?? (typeof e.createdAt === "string" ? e.createdAt : "");
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    if (
      !clinicalDocumentationEventBelongsInDischargeHistory({
        eventType: typeof e.eventType === "string" ? e.eventType : null,
        payloadJson: e.payloadJson,
      })
    ) {
      continue;
    }
    const dischargeForm = hydrateDischargeFormFromEncounterJson(snapshot);
    const outcome = inferOutcomeUiFromForms(dischargeForm.dischargeMode, emptySupplement);
    if (outcome === "ADMISSION" || outcome === "OBSERVATION") continue;
    const modeLabel = localizedErDischargeModeLabel(dischargeForm.dischargeMode, emptySupplement, locale);
    const preview = buildErDispositionPreviewModel(
      dischargeForm,
      emptyAdmission,
      emptySupplement,
      outcome,
      dispositionPreviewLabelsFromLocale(locale),
      modeLabel
    );
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "DISCHARGE_SUMMARY_SAVED",
      documentedAt: savedAt,
      savedAt,
      displayWhen: formatIsoForLocale(savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines: structuredLinesFromSections(preview.sections),
      narrativeExcerpt: trunc(preview.headline, HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildObservationAdmissionFromMislabeledDischargeEvents(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  const emptyDischarge = hydrateDischargeFormFromEncounterJson(null);
  const emptySupplement = erDispositionSupplementFromEncounter(null);
  for (const e of events) {
    if (
      !mislabeledDischargeEventIsObservationAdmission({
        eventType: typeof e.eventType === "string" ? e.eventType : null,
        payloadJson: e.payloadJson,
      })
    ) {
      continue;
    }
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = payloadSavedAt(e) ?? (typeof e.createdAt === "string" ? e.createdAt : "");
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const dischargeForm = hydrateDischargeFormFromEncounterJson(snapshot);
    const modeLabel = localizedErDischargeModeLabel(dischargeForm.dischargeMode, emptySupplement, locale);
    const preview = buildErDispositionPreviewModel(
      dischargeForm,
      hydrateAdmissionFormFromEncounterJson(null, ""),
      emptySupplement,
      "ADMISSION",
      dispositionPreviewLabelsFromLocale(locale),
      modeLabel
    );
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "OBSERVATION_ADMISSION_PACKET_SAVED",
      documentedAt: savedAt,
      savedAt,
      displayWhen: formatIsoForLocale(savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines: structuredLinesFromSections(preview.sections),
      narrativeExcerpt: trunc(preview.headline, HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildAdmissionSummaryHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  const emptyDischarge = hydrateDischargeFormFromEncounterJson(null);
  const emptySupplement = erDispositionSupplementFromEncounter(null);
  for (const e of events) {
    if (e.eventType !== "ADMISSION_SUMMARY_SAVED") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = payloadSavedAt(e) ?? (typeof e.createdAt === "string" ? e.createdAt : "");
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const admissionForm = hydrateAdmissionFormFromEncounterJson(snapshot, "");
    const preview = buildErDispositionPreviewModel(
      emptyDischarge,
      admissionForm,
      emptySupplement,
      "ADMISSION",
      dispositionPreviewLabelsFromLocale(locale),
      ""
    );
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "ADMISSION_SUMMARY_SAVED",
      documentedAt: savedAt,
      savedAt,
      displayWhen: formatIsoForLocale(savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines: structuredLinesFromSections(preview.sections),
      narrativeExcerpt: trunc(preview.headline, HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildDispositionSupplementHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  const emptyDischarge = hydrateDischargeFormFromEncounterJson(null);
  const emptyAdmission = hydrateAdmissionFormFromEncounterJson(null, "");
  for (const e of events) {
    if (e.eventType !== "DISPOSITION_SUPPLEMENT_SAVED") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = payloadSavedAt(e) ?? (typeof e.createdAt === "string" ? e.createdAt : "");
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const wrapped = snapshot ? ({ erDispositionV1: snapshot } as Record<string, unknown>) : null;
    const supplement = erDispositionSupplementFromEncounter(wrapped);
    const preview = buildErDispositionPreviewModel(
      emptyDischarge,
      emptyAdmission,
      supplement,
      "OTHER",
      dispositionPreviewLabelsFromLocale(locale),
      ""
    );
    const signature =
      snapshot?.signature && typeof snapshot.signature === "object" && !Array.isArray(snapshot.signature)
        ? (snapshot.signature as Record<string, unknown>)
        : null;
    const documentedAt =
      typeof signature?.savedAt === "string" && signature.savedAt.trim() ? signature.savedAt.trim() : savedAt;
    const performer = performerFromEntry(e, snapshot);
    out.push({
      id,
      eventType: "DISPOSITION_SUPPLEMENT_SAVED",
      documentedAt,
      savedAt,
      displayWhen: formatIsoForLocale(documentedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines: structuredLinesFromSections(preview.sections),
      narrativeExcerpt: trunc(preview.headline, HISTORY_NARRATIVE_MAX),
    });
  }
  return out;
}

function buildTriageAssessmentHistoryEntries(
  events: ClinicalDocumentationEventApiEntry[],
  locale: SupportedLanguage
): VisitSummaryDocumentationHistoryEntry[] {
  const out: VisitSummaryDocumentationHistoryEntry[] = [];
  for (const e of events) {
    if (e.eventType !== "TRIAGE_ASSESSMENT_SAVED") continue;
    const id = typeof e.id === "string" ? e.id : "";
    const savedAt = payloadSavedAt(e) ?? (typeof e.createdAt === "string" ? e.createdAt : "");
    if (!id || !savedAt) continue;
    const snapshot = payloadSnapshot(e);
    const parsed = triagePreviewSliceFromTriageGet(snapshot, locale);
    const performer = performerFromEntry(e, snapshot);
    let structuredLines: string[] = [];
    let narrativeExcerpt = "";
    if (parsed) {
      const preview = buildTriageDocumentationPreviewModel(parsed.slice, {
        strokeScreen: snapshot?.strokeScreen,
        sepsisScreen: snapshot?.sepsisScreen,
        erV1: parsed.er,
        locale,
      });
      structuredLines = structuredLinesFromSections(preview.sections);
      narrativeExcerpt = trunc(preview.narrative, HISTORY_NARRATIVE_MAX);
    }
    out.push({
      id,
      eventType: "TRIAGE_ASSESSMENT_SAVED",
      documentedAt: savedAt,
      savedAt,
      displayWhen: formatIsoForLocale(savedAt, locale),
      performerDisplayName: performer.displayName,
      performerInitials: performer.initials,
      performerRoleTitle: performer.roleTitle,
      structuredLines,
      narrativeExcerpt,
    });
  }
  return out;
}

/**
 * Aggregate all ER documentation for read-only display.
 *
 * `nursingReassessmentEvents` is optional: when supplied (typically the entries from
 * `GET /encounters/:id/nursing-reassessment-events`), the returned model includes a
 * newest-first `nursingReassessmentHistory` and `nursingReassessmentLatestId`. When omitted or
 * empty, the model still renders the existing single-block `resumeInfirmier` so legacy charts
 * (and the still-loading state) behave exactly as before this change.
 */
export function buildEmergencyVisitSummaryModel(
  encounter: EncounterLike,
  triage: Record<string, unknown> | null,
  resultsSnap: EncounterResultsLabRadSnapshot | null,
  locale: SupportedLanguage,
  nursingReassessmentEvents?: NursingReassessmentApiEntry[] | null,
  clinicalDocumentationEvents?: ClinicalDocumentationEventApiEntry[] | null
): EmergencyVisitSummaryModel {
  const timeline: VisitSummaryTimelineEntry[] = [];

  if (encounter.createdAt) {
    timeline.push({
      label: vs(locale, "timelineConsultOpened"),
      value: formatIsoForLocale(encounter.createdAt, locale),
    });
  }
  if (encounter.updatedAt) {
    timeline.push({
      label: vs(locale, "timelineEncounterLastUpdated"),
      value: formatIsoForLocale(encounter.updatedAt, locale),
    });
  }

  const parsed = triagePreviewSliceFromTriageGet(triage, locale);
  let motifPresentation: VisitSummaryTextBlock | null = null;
  let triageResume: VisitSummaryTextBlock | null = null;

  if (parsed && triage) {
    const { slice, er } = parsed;
    const triageModel = buildTriageDocumentationPreviewModel(slice, {
      strokeScreen: triage.strokeScreen,
      sepsisScreen: triage.sepsisScreen,
      erV1: er,
      locale,
    });

    const chief =
      (encounter.chiefComplaint || "").trim() ||
      (encounter.visitReason || "").trim() ||
      slice.chiefComplaint.trim();
    const motifLines: string[] = [];
    if (chief) motifLines.push(interpolate(vs(locale, "motifLine"), { text: trunc(chief) }));
    if (slice.onsetAt) {
      const d = new Date(slice.onsetAt);
      if (!Number.isNaN(d.getTime())) {
        const tag = productUiBcp47Tag(locale);
        motifLines.push(
          interpolate(vs(locale, "motifOnset"), { datetime: d.toLocaleString(tag) })
        );
      }
    }
    const nar = er.triageNarrative.trim();
    if (nar) motifLines.push(interpolate(vs(locale, "motifNarrative"), { text: trunc(nar, 360) }));
    if (motifLines.length) {
      motifPresentation = { title: vs(locale, "motifBlockTitle"), lines: motifLines };
    }

    const triageSecs = nonEmptyPreviewSections(triageModel.sections);
    triageResume = flattenSectionsToBlock(vs(locale, "triageFlattenTitle"), triageSecs, locale, 20);

    if (triage.triageCompleteAt) {
      timeline.push({
        label: vs(locale, "timelineTriageCompleted"),
        value: formatIsoForLocale(triage.triageCompleteAt as string, locale),
      });
    }
    if (triage.updatedAt) {
      timeline.push({
        label: vs(locale, "timelineTriageUpdated"),
        value: formatIsoForLocale(triage.updatedAt as string, locale),
      });
    }
  } else {
    const chief = (encounter.chiefComplaint || "").trim() || (encounter.visitReason || "").trim();
    if (chief) {
      motifPresentation = {
        title: vs(locale, "motifBlockTitle"),
        lines: [interpolate(vs(locale, "motifLine"), { text: trunc(chief) })],
      };
    }
  }

  const nav = encounter.nursingAssessment;
  const initialNursingAssessment = buildInitialNursingAssessmentSummaryBlock(nav, locale);
  const nursingDischargeDocumentation = buildNursingDischargeExecutionSummaryBlock19Y(nav, locale);
  const providerDischargeDocumentation = buildProviderDischargeDocumentationSummaryBlock(
    encounter.dischargeSummaryJson,
    locale
  );
  const providerDischargeMeta = readProviderDischargeDocumentationMeta(encounter.dischargeSummaryJson);
  if (providerDischargeMeta.documentedAt && providerDischargeMeta.documentedByDisplayName) {
    const who = providerDischargeMeta.documentedByTitle?.trim()
      ? `${providerDischargeMeta.documentedByDisplayName} (${providerDischargeMeta.documentedByTitle})`
      : providerDischargeMeta.documentedByDisplayName;
    timeline.push({
      label: vs(locale, "timelineProviderDischargeDocumented"),
      value: interpolate(vs(locale, "signatureTimeJoin"), {
        name: who,
        time: formatIsoForLocale(providerDischargeMeta.documentedAt, locale),
      }),
    });
  }
  const sigInitialNursing = readInitialNursingEvalSignature(nav);
  if (sigInitialNursing) {
    const nameWithRole = sigInitialNursing.roleTitle
      ? `${sigInitialNursing.documentedBy} (${sigInitialNursing.roleTitle})`
      : sigInitialNursing.documentedBy;
    timeline.push({
      label: vs(locale, "timelineInitialNursingSaved"),
      value: interpolate(vs(locale, "signatureTimeJoin"), {
        name: nameWithRole,
        time: formatIsoForLocale(sigInitialNursing.documentedAtIso, locale),
      }),
    });
  }

  const execStored = readNursingDischargeExecutionStored(nav);
  if (execStored) {
    timeline.push({
      label: vs(locale, "timelineNursingDischargeExecution"),
      value: interpolate(vs(locale, "signatureTimeJoin"), {
        name: execStored.dischargeSortieCompletedByDisplayName,
        time: formatIsoForLocale(execStored.dischargeSortieCompletedAt, locale),
      }),
    });
  }

  const nursingForm = erNursingReassessmentFormFromEncounter(nav);
  const nursingPreview = buildErNursingReassessmentPreviewModel(nursingForm, locale);
  const nursingSecs = nonEmptyPreviewSections(nursingPreview.sections.filter((s) => s.id !== "empty"));
  let resumeInfirmier =
    nursingSecs.length > 0
      ? flattenSectionsToBlock(vs(locale, "nursingFlattenTitle"), nursingSecs, locale, 18)
      : null;
  if (!resumeInfirmier && nursingPreview.narrative.trim()) {
    resumeInfirmier = {
      title: vs(locale, "nursingNarrativeOnlyTitle"),
      lines: [trunc(nursingPreview.narrative)],
    };
  }
  const sigN = readSignatureFromNursingBlob("erNursingReassessmentV1", nav, locale);
  if (sigN) {
    timeline.push({
      label: vs(locale, "timelineNursingReassessmentSaved"),
      value: interpolate(vs(locale, "signatureTimeJoin"), { name: sigN.label, time: sigN.at }),
    });
  }

  const providerDocumentation = buildVisitSummaryProviderDocumentationBlock({
    nursingAssessment: nav,
    locale,
    providerDocumentationStatus: encounter.providerDocumentationStatus,
    providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
    providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr,
    providerAddenda: encounter.providerAddenda,
  });
  let evaluationMedicale = providerDocumentation
    ? providerDocumentationToVisitSummaryBlock(providerDocumentation, locale)
    : null;
  if (!evaluationMedicale) {
    const providerForm = erProviderMseFormFromEncounter(nav);
    const providerPreview = buildErProviderMsePreviewModel(providerForm, locale);
    const providerSecs = nonEmptyPreviewSections(providerPreview?.sections.filter((s) => s.id !== "empty") ?? []);
    evaluationMedicale =
      providerSecs.length > 0
        ? flattenSectionsToBlock(vs(locale, "providerFlattenTitle"), providerSecs, locale, 22)
        : null;
    if (!evaluationMedicale && providerPreview?.oneLineSummary.trim()) {
      evaluationMedicale = {
        title: vs(locale, "providerNarrativeOnlyTitle"),
        lines: [trunc(providerPreview.oneLineSummary)],
      };
    }
    if (evaluationMedicale) {
      const sigP = readSignatureFromNursingBlob("erProviderMseV1", nav, locale);
      if (sigP) {
        evaluationMedicale = {
          ...evaluationMedicale,
          lines: [
            ...evaluationMedicale.lines,
            interpolate(vs(locale, "signatureTimeJoin"), { name: sigP.label, time: sigP.at }),
          ],
        };
      }
    }
  }
  if (evaluationMedicale && providerDocumentation) {
    const sigP = readSignatureFromNursingBlob("erProviderMseV1", nav, locale);
    if (sigP && !providerDocumentation.signedAt) {
      timeline.push({
        label: vs(locale, "timelineProviderEvalSaved"),
        value: interpolate(vs(locale, "signatureTimeJoin"), { name: sigP.label, time: sigP.at }),
      });
    }
  } else {
    const sigP = readSignatureFromNursingBlob("erProviderMseV1", nav, locale);
    if (sigP) {
      timeline.push({
        label: vs(locale, "timelineProviderEvalSaved"),
        value: interpolate(vs(locale, "signatureTimeJoin"), { name: sigP.label, time: sigP.at }),
      });
    }
  }

  const discharge = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const admission = hydrateAdmissionFormFromEncounterJson(
    encounter.admissionSummaryJson,
    formatPhysicianName(encounter.physicianAssigned ?? undefined)
  );
  const supplement = erDispositionSupplementFromEncounter(nav);
  const outcomeHints = inferOutcomeHintsFromAdmissionSummary(encounter.admissionSummaryJson);
  const outcome = inferOutcomeUiFromForms(discharge.dischargeMode, supplement, outcomeHints);
  const dischargeModeLabel = localizedErDischargeModeLabel(
    discharge.dischargeMode,
    supplement,
    locale,
    outcomeHints
  );
  const dispositionPreview = buildErDispositionPreviewModel(
    discharge,
    admission,
    supplement,
    outcome,
    dispositionPreviewLabelsFromLocale(locale),
    dischargeModeLabel
  );
  const dispSecs = nonEmptyPreviewSections(dispositionPreview.sections.filter((s) => s.id !== "empty"));
  let disposition =
    dispSecs.length > 0 ? flattenSectionsToBlock(vs(locale, "dispositionFlattenTitle"), dispSecs, locale, 20) : null;
  if (!disposition && dispositionPreview.headline.trim()) {
    disposition = { title: vs(locale, "dispositionNarrativeOnlyTitle"), lines: [trunc(dispositionPreview.headline)] };
  }
  if (!disposition) {
    const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
    const a = parseAdmissionSummaryForChart(encounter.admissionSummaryJson);
    const fallback: string[] = [];
    if (d?.dischargeMode) {
      fallback.push(
        interpolate(vs(locale, "fallbackDischargeMode"), {
          text: localizedErDischargeModeLabel(d.dischargeMode, supplement, locale),
        })
      );
    }
    if (d?.disposition) {
      fallback.push(interpolate(vs(locale, "fallbackDisposition"), { text: trunc(d.disposition) }));
    }
    if (a?.admissionReason) {
      fallback.push(interpolate(vs(locale, "fallbackAdmissionReason"), { text: trunc(a.admissionReason) }));
    }
    if (fallback.length) {
      disposition = { title: vs(locale, "dispositionNarrativeOnlyTitle"), lines: fallback };
    }
  }
  const sigD = readSignatureFromNursingBlob("erDispositionV1", nav, locale);
  if (sigD) {
    timeline.push({
      label: vs(locale, "timelineDispositionV1Notes"),
      value: interpolate(vs(locale, "signatureTimeJoin"), { name: sigD.label, time: sigD.at }),
    });
  }

  const resultats = buildVisitSummaryResultsBlock(resultsSnap, locale);

  const phys = encounter.physicianAssigned;
  if (phys && (phys.firstName || phys.lastName)) {
    const n = `${phys.firstName ?? ""} ${phys.lastName ?? ""}`.trim();
    if (n) timeline.push({ label: vs(locale, "timelinePhysicianAssigned"), value: n });
  }

  if (encounter.roomLabel?.trim()) {
    timeline.push({ label: vs(locale, "timelineRoom"), value: encounter.roomLabel.trim() });
  }

  const emtalaResolved = deriveEmtalaStateFromEncounter({
    createdAt: encounter.createdAt,
    nursingAssessment: encounter.nursingAssessment,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
    admissionSummaryJson: encounter.admissionSummaryJson,
    physicianAssigned: encounter.physicianAssigned,
    triage: triage
      ? {
          vitalsJson: triage.vitalsJson,
          triageCompleteAt: typeof triage.triageCompleteAt === "string" ? triage.triageCompleteAt : null,
        }
      : null,
  });
  let emtala: VisitSummaryTextBlock | null = null;
  if (emtalaResolved) {
    const elines: string[] = [];
    if (emtalaResolved.emtalaStatus && emtalaResolved.emtalaStatus !== "ARRIVED") {
      const stKey = `emtalaStatus_${emtalaResolved.emtalaStatus}` as
        | "emtalaStatus_ARRIVED"
        | "emtalaStatus_TRIAGED"
        | "emtalaStatus_MSE_IN_PROGRESS"
        | "emtalaStatus_MSE_COMPLETE"
        | "emtalaStatus_DISPOSITIONED"
        | "emtalaStatus_DEPARTED";
      const label = vs(locale, stKey);
      if (label) {
        elines.push(interpolate(vs(locale, "emtalaLineStatus"), { label }));
      }
    }
    if (emtalaResolved.emtalaDispositionCategory) {
      const dKey = `emtalaDisp_${emtalaResolved.emtalaDispositionCategory}` as
        | "emtalaDisp_HOME"
        | "emtalaDisp_ADMISSION"
        | "emtalaDisp_TRANSFER"
        | "emtalaDisp_AMA"
        | "emtalaDisp_LWBS"
        | "emtalaDisp_DECEASED"
        | "emtalaDisp_OTHER";
      const dlabel = vs(locale, dKey);
      if (dlabel) {
        elines.push(interpolate(vs(locale, "emtalaLineDisposition"), { label: dlabel }));
      }
    }
    if (emtalaResolved.emtalaDispositionCategory === "TRANSFER" && emtalaResolved.transferRequestedAt && !emtalaResolved.transferAcceptedAt) {
      elines.push(vs(locale, "emtalaLineTransferPending"));
    }
    if (emtalaResolved.lwbsDocumentedAt) {
      elines.push(
        interpolate(vs(locale, "emtalaLineLwbsWithTime"), {
          time: formatIsoForLocale(emtalaResolved.lwbsDocumentedAt, locale),
        })
      );
    }
    if (emtalaResolved.amaRiskDiscussionDocumented === true) {
      elines.push(vs(locale, "emtalaLineAmaYes"));
    }
    if (emtalaResolved.msePerformed === true) {
      elines.push(vs(locale, "emtalaLineMsePerformedYes"));
    }
    if (elines.length) {
      emtala = { title: vs(locale, "emtalaBlockTitle"), lines: elines };
    }
  }

  let handoff: VisitSummaryTextBlock | null = null;
  if ((encounter.type ?? "").trim() === "EMERGENCY") {
    const hf = readErHandoffV1FromNursingAssessment(encounter.nursingAssessment);
    const hLines = buildHandoffLinesFromStored(hf, locale);
    if (hLines.length) {
      handoff = { title: vs(locale, "handoffBlockTitle"), lines: hLines };
    }
  }

  /**
   * Append-only nursing reassessment column history. Built from the optional API entries when
   * provided; empty otherwise. The latest (first) entry id is what the UI tags "Actuel".
   */
  const nursingReassessmentHistory =
    Array.isArray(nursingReassessmentEvents) && nursingReassessmentEvents.length > 0
      ? buildReassessmentHistoryEntries(nursingReassessmentEvents, locale)
      : [];
  const nursingReassessmentLatestId =
    nursingReassessmentHistory.length > 0 ? nursingReassessmentHistory[0].id : null;
  const documentationEvents = Array.isArray(clinicalDocumentationEvents) ? clinicalDocumentationEvents : [];
  const providerMseHistory = buildProviderMseHistoryEntries(documentationEvents, locale);
  const providerMseLatestId = providerMseHistory.length > 0 ? providerMseHistory[0].id : null;
  const handoffHistory = buildHandoffHistoryEntries(documentationEvents, locale);
  const handoffLatestId = handoffHistory.length > 0 ? handoffHistory[0].id : null;
  const dischargeSummaryHistory = buildDischargeSummaryHistoryEntries(documentationEvents, locale);
  const dischargeSummaryLatestId = dischargeSummaryHistory.length > 0 ? dischargeSummaryHistory[0].id : null;
  const admissionSummaryHistory = [
    ...buildAdmissionSummaryHistoryEntries(documentationEvents, locale),
    ...buildObservationAdmissionFromMislabeledDischargeEvents(documentationEvents, locale),
  ].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  const admissionSummaryLatestId = admissionSummaryHistory.length > 0 ? admissionSummaryHistory[0].id : null;
  const dispositionSupplementHistory = buildDispositionSupplementHistoryEntries(documentationEvents, locale);
  const dispositionSupplementLatestId =
    dispositionSupplementHistory.length > 0 ? dispositionSupplementHistory[0].id : null;
  const triageAssessmentHistory = buildTriageAssessmentHistoryEntries(documentationEvents, locale);
  const triageAssessmentLatestId = triageAssessmentHistory.length > 0 ? triageAssessmentHistory[0].id : null;
  const triageCarryForward = buildTriageCarryForwardSummaryBlock(triage, locale);

  return {
    motifPresentation,
    triageResume,
    triageCarryForward,
    initialNursingAssessment,
    resumeInfirmier,
    providerDocumentation,
    evaluationMedicale,
    resultats,
    disposition,
    handoff: handoffHistory.length > 0 ? null : handoff,
    emtala,
    timeline,
    nursingReassessmentHistory,
    nursingReassessmentLatestId,
    nursingDischargeDocumentation,
    providerDischargeDocumentation,
    providerMseHistory,
    providerMseLatestId,
    handoffHistory,
    handoffLatestId,
    dischargeSummaryHistory,
    dischargeSummaryLatestId,
    admissionSummaryHistory,
    admissionSummaryLatestId,
    dispositionSupplementHistory,
    dispositionSupplementLatestId,
    triageAssessmentHistory,
    triageAssessmentLatestId,
  };
}
