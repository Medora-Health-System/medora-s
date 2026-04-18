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
import {
  buildErNursingReassessmentPreviewModel,
  erNursingReassessmentFormFromEncounter,
} from "./emergencyNursingReassessmentV1";
import { buildErProviderMsePreviewModel, erProviderMseFormFromEncounter } from "./emergencyProviderMseV1";
import type { SupportedLanguage } from "@/i18n/config";
import { buildTriageDocumentationPreviewModel, triagePreviewSliceFromTriageGet } from "./emergencyTriageDocPreview";
import { buildErResultsCockpitModel } from "./emergencyResultsCockpitModel";
import { erTriageT } from "./erTriageI18nLookup";
import { deriveEmtalaStateFromEncounter } from "./erEmtalaV1";
import { readErHandoffV1FromNursingAssessment } from "@medora/shared";

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

export type EmergencyVisitSummaryModel = {
  motifPresentation: VisitSummaryTextBlock | null;
  triageResume: VisitSummaryTextBlock | null;
  resumeInfirmier: VisitSummaryTextBlock | null;
  evaluationMedicale: VisitSummaryTextBlock | null;
  resultats: VisitSummaryResultsBlock | null;
  disposition: VisitSummaryTextBlock | null;
  /** ER admission handoff (erHandoffV1) — read-only operational lines. */
  handoff: VisitSummaryTextBlock | null;
  emtala: VisitSummaryTextBlock | null;
  timeline: VisitSummaryTimelineEntry[];
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
  if (rt) {
    return interpolate(vs(locale, "resultWithValue"), {
      label,
      crit,
      value: trunc(rt, 200),
    });
  }
  return interpolate(vs(locale, "resultStatusOnly"), {
    label,
    crit,
    status: v.itemStatus ?? "",
  }).trim();
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
};

function formatIsoForLocale(iso: string | null | undefined, locale: SupportedLanguage): string {
  if (!iso) return "—";
  try {
    const tag = locale === "en" ? "en-US" : "fr-FR";
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
 * Aggregate all ER documentation for read-only display.
 */
export function buildEmergencyVisitSummaryModel(
  encounter: EncounterLike,
  triage: Record<string, unknown> | null,
  resultsSnap: EncounterResultsLabRadSnapshot | null,
  locale: SupportedLanguage
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

  const parsed = triagePreviewSliceFromTriageGet(triage);
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
        const tag = locale === "en" ? "en-US" : "fr-FR";
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

  const providerForm = erProviderMseFormFromEncounter(nav);
  const providerPreview = buildErProviderMsePreviewModel(providerForm, locale);
  const providerSecs = nonEmptyPreviewSections(providerPreview.sections.filter((s) => s.id !== "empty"));
  let evaluationMedicale =
    providerSecs.length > 0
      ? flattenSectionsToBlock(vs(locale, "providerFlattenTitle"), providerSecs, locale, 22)
      : null;
  if (!evaluationMedicale && providerPreview.oneLineSummary.trim()) {
    evaluationMedicale = {
      title: vs(locale, "providerNarrativeOnlyTitle"),
      lines: [trunc(providerPreview.oneLineSummary)],
    };
  }
  const sigP = readSignatureFromNursingBlob("erProviderMseV1", nav, locale);
  if (sigP) {
    timeline.push({
      label: vs(locale, "timelineProviderEvalSaved"),
      value: interpolate(vs(locale, "signatureTimeJoin"), { name: sigP.label, time: sigP.at }),
    });
  }

  const discharge = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const admission = hydrateAdmissionFormFromEncounterJson(
    encounter.admissionSummaryJson,
    formatPhysicianName(encounter.physicianAssigned ?? undefined)
  );
  const supplement = erDispositionSupplementFromEncounter(nav);
  const outcome = inferOutcomeUiFromForms(discharge.dischargeMode, supplement);
  const dischargeModeLabel = localizedErDischargeModeLabel(discharge.dischargeMode, supplement, locale);
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
    const yn = (v: boolean) => (locale === "en" ? (v ? "Yes" : "No") : v ? "Oui" : "Non");
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
    if (hLines.length) {
      handoff = { title: vs(locale, "handoffBlockTitle"), lines: hLines };
    }
  }

  return {
    motifPresentation,
    triageResume,
    resumeInfirmier,
    evaluationMedicale,
    resultats,
    disposition,
    handoff,
    emtala,
    timeline,
  };
}
