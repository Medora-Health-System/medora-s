/**
 * ED Summary clinical timeline adapter — maps encounter-local read models to shared timeline rows.
 */

import {
  buildEdClinicalTimeline,
  type EdClinicalTimelineEntry,
  type EdClinicalTimelineLocale,
  type EdClinicalTimelineResult,
  type EdClinicalTimelineSourceRow,
} from "@medora/shared";
import { formatDocumentedProcedureClinicalSummary } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { readInitialNursingEvalSignature } from "./erInitialNursingAssessmentSummary";
import { readDischargeSortieExecutionFromEncounter } from "./emergencyDispositionV1";
import {
  buildErEdSummaryMarEventRows,
  buildErEdSummaryMedicationOrderRows,
} from "./erEdSummaryMedicationMar";
import {
  buildVisitSummaryProviderDocumentationBlock,
} from "./erProviderDocumentationSummary";
import type {
  NursingReassessmentApiEntry,
  VisitSummaryReassessmentEntry,
} from "./emergencyVisitSummaryModel";
import { erTriageT } from "./erTriageI18nLookup";

function timelineLocale(language: SupportedLanguage): EdClinicalTimelineLocale {
  return language === "en" ? "en" : "fr";
}

function vs(locale: SupportedLanguage, key: string): string {
  return erTriageT(locale, `erTriage.visitSummary.${key}`);
}

function pushRow(rows: EdClinicalTimelineSourceRow[], row: EdClinicalTimelineSourceRow | null): void {
  if (row?.summary.trim()) rows.push(row);
}

export type ErClinicalTimelineBuildInput = {
  locale: SupportedLanguage;
  t: (key: string) => string;
  encounter: {
    createdAt?: string | null;
    nursingAssessment?: unknown;
    dischargeSummaryJson?: unknown;
    providerDocumentationStatus?: string | null;
    providerDocumentationSignedAt?: string | null;
    providerDocumentationSignedByDisplayFr?: string | null;
    providerAddenda?: Array<{
      id?: unknown;
      text?: unknown;
      createdAt?: unknown;
      createdByDisplayFr?: unknown;
    }> | null;
  };
  triageSnapshot?: Record<string, unknown> | null;
  nursingReassessmentHistory?: VisitSummaryReassessmentEntry[];
  orders?: unknown[];
  marAdmins?: unknown[];
  procedureEntries?: unknown[];
  resultAcknowledgements?: Array<{
    id: string;
    label: string;
    acknowledgedAt: string | null;
    acknowledgedBy: string | null;
  }>;
};

export function buildErClinicalTimelineSourceRows(
  input: ErClinicalTimelineBuildInput
): EdClinicalTimelineSourceRow[] {
  const { locale, t, encounter } = input;
  const rows: EdClinicalTimelineSourceRow[] = [];
  const nav = encounter.nursingAssessment;

  const triageCompleteAt =
    input.triageSnapshot && typeof input.triageSnapshot.triageCompleteAt === "string"
      ? input.triageSnapshot.triageCompleteAt
      : null;
  if (triageCompleteAt) {
    pushRow(rows, {
      id: "triage-complete",
      category: "TRIAGE",
      timestampIso: triageCompleteAt,
      actorName: null,
      actorRoleTitle: null,
      summary: vs(locale, "clinicalTimelineTriageCompleted"),
      sourceType: "TRIAGE",
      sourceId: "triage-complete",
    });
  }

  const initialSig = readInitialNursingEvalSignature(nav);
  if (initialSig) {
    pushRow(rows, {
      id: "initial-nursing-assessment",
      category: "INITIAL_NURSING_ASSESSMENT",
      timestampIso: initialSig.documentedAtIso,
      actorName: initialSig.documentedBy,
      actorRoleTitle: initialSig.roleTitle,
      summary: vs(locale, "clinicalTimelineInitialNursingSaved"),
      sourceType: "NURSING_EVAL_V1",
      sourceId: "initial-nursing-assessment",
    });
  }

  const providerBlock = buildVisitSummaryProviderDocumentationBlock({
    nursingAssessment: nav,
    locale,
    providerDocumentationStatus: encounter.providerDocumentationStatus,
    providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
    providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr,
    providerAddenda: encounter.providerAddenda,
  });
  if (providerBlock) {
    const isSigned = (encounter.providerDocumentationStatus ?? "").trim().toUpperCase() === "SIGNED";
    const inner =
      nav && typeof nav === "object" && !Array.isArray(nav)
        ? (nav as Record<string, unknown>).erProviderMseV1
        : null;
    const meta =
      inner && typeof inner === "object" && !Array.isArray(inner)
        ? (inner as Record<string, unknown>).workspaceMetadata
        : null;
    const workspaceSavedIso =
      meta && typeof meta === "object" && typeof (meta as { savedAt?: unknown }).savedAt === "string"
        ? ((meta as { savedAt: string }).savedAt)
        : null;
    pushRow(rows, {
      id: "provider-documentation-current",
      category: "PROVIDER_DOCUMENTATION",
      timestampIso: isSigned
        ? encounter.providerDocumentationSignedAt ?? workspaceSavedIso
        : workspaceSavedIso ?? encounter.createdAt ?? null,
      actorName: isSigned ? providerBlock.signedBy : providerBlock.savedBy,
      actorRoleTitle: null,
      summary: isSigned
        ? vs(locale, "clinicalTimelineProviderSigned")
        : vs(locale, "clinicalTimelineProviderSaved"),
      sourceType: "PROVIDER_DOCUMENTATION",
      sourceId: "provider-documentation-current",
    });
  }

  const addenda = Array.isArray(encounter.providerAddenda) ? encounter.providerAddenda : [];
  for (const addendum of addenda) {
    const id = typeof addendum.id === "string" ? addendum.id : `addendum-${rows.length}`;
    const text = typeof addendum.text === "string" ? addendum.text.trim() : "";
    if (!text) continue;
    pushRow(rows, {
      id,
      category: "PROVIDER_ADDENDUM",
      timestampIso: typeof addendum.createdAt === "string" ? addendum.createdAt : null,
      actorName:
        typeof addendum.createdByDisplayFr === "string" ? addendum.createdByDisplayFr.trim() : null,
      actorRoleTitle: null,
      summary: text.length > 180 ? `${text.slice(0, 180)}…` : text,
      sourceType: "PROVIDER_ADDENDUM",
      sourceId: id,
    });
  }

  const orderRows = buildErEdSummaryMedicationOrderRows({
    orders: input.orders ?? [],
    language: locale,
    t,
  });
  for (const order of orderRows) {
    const rawOrder = (input.orders ?? []).find((o) => {
      if (!o || typeof o !== "object" || Array.isArray(o)) return false;
      const items = (o as { items?: unknown }).items;
      if (!Array.isArray(items)) return false;
      return items.some((it) => it && typeof it === "object" && (it as { id?: unknown }).id === order.id);
    }) as Record<string, unknown> | undefined;
    const createdAt =
      rawOrder && typeof rawOrder.createdAt === "string" ? rawOrder.createdAt : null;
    pushRow(rows, {
      id: order.id,
      category: "PROVIDER_ORDER",
      timestampIso: createdAt,
      actorName: order.orderedBy !== "—" ? order.orderedBy : null,
      actorRoleTitle: null,
      summary: `${order.medicationName} — ${order.route} ${order.dose}`.trim(),
      sourceType: "ORDER",
      sourceId: order.id,
    });
  }

  const marRows = buildErEdSummaryMarEventRows({
    admins: input.marAdmins ?? [],
    language: locale,
    t,
  });
  for (const mar of marRows) {
    const site =
      mar.injectionSite && mar.injectionSite !== "—"
        ? `; ${vs(locale, "clinicalTimelineMarSite")}: ${mar.injectionSite}`
        : "";
    pushRow(rows, {
      id: mar.id,
      category: "MEDICATION_ADMINISTRATION",
      timestampIso: null,
      actorName: mar.administeredBy !== "—" ? mar.administeredBy : null,
      actorRoleTitle: null,
      summary: `${mar.medicationName} — ${mar.action}${site}`.trim(),
      sourceType: "MAR",
      sourceId: mar.id,
    });
    const last = rows[rows.length - 1];
    if (last?.sourceId === mar.id) {
      const admin = (input.marAdmins ?? []).find(
        (a) => a && typeof a === "object" && (a as { id?: unknown }).id === mar.id
      ) as { administeredAt?: unknown } | undefined;
      last.timestampIso =
        typeof admin?.administeredAt === "string" ? admin.administeredAt : null;
    }
  }

  for (const entryRaw of input.procedureEntries ?? []) {
    if (!entryRaw || typeof entryRaw !== "object") continue;
    const entry = entryRaw as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : `proc-${rows.length}`;
    const payload = entry.payload && typeof entry.payload === "object" ? entry.payload : entry;
    const documentedBy =
      typeof entry.documentedByDisplayName === "string" ? entry.documentedByDisplayName : null;
    const documentedAt =
      typeof entry.documentedAt === "string"
        ? entry.documentedAt
        : typeof entry.createdAt === "string"
          ? entry.createdAt
          : null;
    const role =
      typeof entry.documentationRole === "string" ? entry.documentationRole.trim().toUpperCase() : "PROVIDER";
    const summary = formatDocumentedProcedureClinicalSummary({
      payloadJson: payload,
      documentedAtIso: documentedAt ?? "",
      documentedByDisplayName: documentedBy,
      locale: locale === "en" ? "en" : "fr",
    });
    if (!summary?.trim()) continue;
    const shortSummary = summary.split("—")[0]?.trim() || summary;
    pushRow(rows, {
      id,
      category: role === "NURSING" ? "NURSING_PROCEDURE_SUPPORT" : "PROCEDURE_PROVIDER_NOTE",
      timestampIso: documentedAt,
      actorName: documentedBy,
      actorRoleTitle: null,
      summary: shortSummary.length > 160 ? `${shortSummary.slice(0, 160)}…` : shortSummary,
      sourceType: "PROCEDURE",
      sourceId: id,
    });
  }

  for (const entry of input.nursingReassessmentHistory ?? []) {
    const summary =
      entry.narrativeExcerpt.trim() ||
      entry.structuredLines[0]?.trim() ||
      vs(locale, "clinicalTimelineNursingReassessmentSaved");
    pushRow(rows, {
      id: entry.id,
      category: "NURSING_REASSESSMENT",
      timestampIso: entry.documentedAt ?? entry.savedAt,
      actorName: entry.performerDisplayName,
      actorRoleTitle: entry.performerRoleTitle || null,
      summary,
      sourceType: "NURSING_REASSESSMENT",
      sourceId: entry.id,
    });
  }

  for (const result of input.resultAcknowledgements ?? []) {
    if (!result.acknowledgedAt) continue;
    pushRow(rows, {
      id: result.id,
      category: "RESULT_REVIEWED",
      timestampIso: result.acknowledgedAt,
      actorName: result.acknowledgedBy,
      actorRoleTitle: null,
      summary: result.label,
      sourceType: "RESULT",
      sourceId: result.id,
    });
  }

  const sortie = readDischargeSortieExecutionFromEncounter(nav);
  if (sortie) {
    pushRow(rows, {
      id: "nursing-discharge",
      category: "NURSING_DISCHARGE",
      timestampIso: sortie.dischargeSortieCompletedAt,
      actorName: sortie.dischargeSortieCompletedByDisplayName,
      actorRoleTitle: null,
      summary:
        sortie.dischargeSortieExecutionNote?.trim() ||
        vs(locale, "clinicalTimelineNursingDischargeCompleted"),
      sourceType: "NURSING_DISCHARGE",
      sourceId: "nursing-discharge",
    });
  }

  return rows;
}

export function buildErClinicalTimeline(
  input: ErClinicalTimelineBuildInput
): EdClinicalTimelineResult {
  return buildEdClinicalTimeline(
    buildErClinicalTimelineSourceRows(input),
    timelineLocale(input.locale)
  );
}

export type { EdClinicalTimelineResult };
