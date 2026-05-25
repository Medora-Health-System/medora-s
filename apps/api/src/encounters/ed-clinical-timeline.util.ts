/**
 * ED clinical timeline for chart export — mirrors web read-model aggregation using manifest inputs.
 */

import {
  buildEdClinicalTimeline,
  type EdClinicalTimelineCategory,
  type EdClinicalTimelineLocale,
  type EdClinicalTimelineSourceRow,
} from "@medora/shared";
import type { ChartExportManifest } from "./chart-export.service";

function pushRow(rows: EdClinicalTimelineSourceRow[], row: EdClinicalTimelineSourceRow | null): void {
  if (row?.summary.trim()) rows.push(row);
}

function categoryFromDisplayEventType(eventType: string): EdClinicalTimelineCategory | null {
  const t = eventType.trim().toUpperCase();
  if (t.includes("TRIAGE")) return "TRIAGE";
  if (t.includes("NURSING") && t.includes("REASSESSMENT")) return "NURSING_REASSESSMENT";
  if (t.includes("PROCEDURE")) return "PROCEDURE_PROVIDER_NOTE";
  if (t.includes("DISPOSITION")) return "DISPOSITION";
  if (t.includes("PROVIDER") || t.includes("MSE")) return "PROVIDER_DOCUMENTATION";
  return null;
}

export function buildEdClinicalTimelineForChartExport(
  manifest: ChartExportManifest,
  locale: EdClinicalTimelineLocale = "en"
): ChartExportManifest["edClinicalTimeline"] {
  const rows: EdClinicalTimelineSourceRow[] = [];
  const enc = manifest.encounter;

  if (manifest.triage?.triageCompleteAt) {
    pushRow(rows, {
      id: "triage-complete",
      category: "TRIAGE",
      timestampIso: manifest.triage.triageCompleteAt,
      actorName: null,
      actorRoleTitle: null,
      summary: locale === "fr" ? "Triage initial terminé." : "Initial triage completed.",
      sourceType: "TRIAGE",
      sourceId: "triage-complete",
    });
  }

  const initial = enc.nursingDocumentation?.initialAssessment;
  if (initial && initial.sections.length > 0) {
    pushRow(rows, {
      id: "initial-nursing-assessment",
      category: "INITIAL_NURSING_ASSESSMENT",
      timestampIso: initial.documentedAt,
      actorName: initial.documentedBy,
      actorRoleTitle: null,
      summary:
        locale === "fr"
          ? "Évaluation infirmière initiale enregistrée."
          : "Initial nursing assessment saved.",
      sourceType: "NURSING_EVAL_V1",
      sourceId: "initial-nursing-assessment",
    });
  }

  const workspace = enc.providerDocumentation.workspaceNote;
  if (workspace && workspace.sections.length > 0) {
    const isSigned = enc.providerDocumentation.status === "SIGNED";
    pushRow(rows, {
      id: "provider-documentation",
      category: "PROVIDER_DOCUMENTATION",
      timestampIso: isSigned ? enc.providerDocumentation.signedAt : workspace.savedAt,
      actorName: isSigned ? enc.providerDocumentation.signedByDisplayFr : workspace.savedBy,
      actorRoleTitle: null,
      summary: isSigned
        ? locale === "fr"
          ? "Note médicale urgences signée."
          : "Provider ED note signed."
        : locale === "fr"
          ? "Note médicale urgences enregistrée."
          : "Provider ED note saved.",
      sourceType: "PROVIDER_DOCUMENTATION",
      sourceId: "provider-documentation",
    });
  }

  for (const addendum of enc.providerAddenda) {
    const text = addendum.text?.trim();
    if (!text) continue;
    pushRow(rows, {
      id: addendum.id,
      category: "PROVIDER_ADDENDUM",
      timestampIso: addendum.createdAt,
      actorName: addendum.createdByDisplayFr,
      actorRoleTitle: null,
      summary: text.length > 180 ? `${text.slice(0, 180)}…` : text,
      sourceType: "PROVIDER_ADDENDUM",
      sourceId: addendum.id,
    });
  }

  for (const order of manifest.orders) {
    for (const item of order.items) {
      if (item.catalogItemType !== "MEDICATION") continue;
      const label = item.manualLabel ?? item.manualSecondaryText ?? "Medication order";
      pushRow(rows, {
        id: item.id,
        category: "PROVIDER_ORDER",
        timestampIso: order.createdAt,
        actorName: order.items[0] ? null : null,
        actorRoleTitle: null,
        summary: `${label} — ${item.status}`.trim(),
        sourceType: "ORDER",
        sourceId: item.id,
      });
    }
  }

  for (const mar of manifest.medicationAdministrations) {
    const label = mar.medicationLabelSnapshot ?? "Medication";
    pushRow(rows, {
      id: mar.id,
      category: "MEDICATION_ADMINISTRATION",
      timestampIso: mar.administeredAt,
      actorName: mar.administeredByDisplayFr,
      actorRoleTitle: null,
      summary: `${label} — ${mar.marAction ?? "administered"}`.trim(),
      sourceType: "MAR",
      sourceId: mar.id,
    });
  }

  for (const proc of manifest.procedures.entries) {
    const summary =
      locale === "fr"
        ? proc.clinicalSummaryFr ?? proc.procedureNameFr ?? "Procedure documented"
        : proc.clinicalSummaryEn ?? proc.procedureNameEn ?? "Procedure documented";
    const short = summary.split("—")[0]?.trim() || summary;
    pushRow(rows, {
      id: proc.id,
      category:
        proc.documentationRole === "NURSING"
          ? "NURSING_PROCEDURE_SUPPORT"
          : "PROCEDURE_PROVIDER_NOTE",
      timestampIso: proc.documentedAtIso ?? proc.performedAtIso ?? null,
      actorName: proc.documentedByDisplayFr ?? proc.performedByDisplayFr ?? null,
      actorRoleTitle: null,
      summary: short.length > 160 ? `${short.slice(0, 160)}…` : short,
      sourceType: "PROCEDURE",
      sourceId: proc.id,
    });
  }

  for (const item of manifest.clinicalTimeline.items) {
    const displayEventType =
      "displayEventType" in item && typeof item.displayEventType === "string"
        ? item.displayEventType
        : item.eventType;
    const cat = categoryFromDisplayEventType(displayEventType);
    if (!cat || cat === "PROVIDER_DOCUMENTATION" || cat === "TRIAGE") continue;
    const summary =
      "displayLabelFr" in item && typeof item.displayLabelFr === "string"
        ? item.displayLabelFr
        : item.eventType;
    pushRow(rows, {
      id: item.id,
      category: cat,
      timestampIso: item.createdAt,
      actorName: item.createdByDisplayFr,
      actorRoleTitle: null,
      summary,
      sourceType: "CLINICAL_EVENT",
      sourceId: item.id,
    });
  }

  const discharge = enc.nursingDocumentation?.dischargeExecution;
  if (discharge) {
    pushRow(rows, {
      id: "nursing-discharge",
      category: "NURSING_DISCHARGE",
      timestampIso: discharge.documentedAt,
      actorName: discharge.documentedBy,
      actorRoleTitle: null,
      summary:
        discharge.executionNote?.trim() ||
        (locale === "fr"
          ? "Exécution de sortie infirmière terminée."
          : "Nursing discharge execution completed."),
      sourceType: "NURSING_DISCHARGE",
      sourceId: "nursing-discharge",
    });
  }

  for (const result of manifest.results) {
    if (!result.acknowledgedByProviderAt) continue;
    pushRow(rows, {
      id: result.orderItemId,
      category: "RESULT_REVIEWED",
      timestampIso: result.acknowledgedByProviderAt,
      actorName: result.acknowledgedByDisplayFr,
      actorRoleTitle: null,
      summary: result.resultText?.trim() || "Result reviewed",
      sourceType: "RESULT",
      sourceId: result.orderItemId,
    });
  }

  const built = buildEdClinicalTimeline(rows, locale);
  if (built.all.length === 0) return null;

  return {
    items: built.all.map((entry) => ({
      id: entry.id,
      sortKey: entry.sortKey,
      timestampIso: entry.timestampIso,
      category: entry.category,
      categoryLabel: entry.categoryLabel,
      actorName: entry.actorName,
      actorRoleTitle: entry.actorRoleTitle,
      summary: entry.summary,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      isUndated: entry.isUndated,
    })),
  };
}
