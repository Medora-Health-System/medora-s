/**
 * Read-only aggregation for ER visit summary — derives display lines from existing encounter/triage/JSON only.
 * No new clinical inference; reuses preview builders where possible.
 */

import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import type { EncounterLabRadRow, EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { hydrateAdmissionFormFromEncounterJson, formatPhysicianName } from "@/lib/encounterAdmission";
import { hydrateDischargeFormFromEncounterJson } from "@/lib/encounterDischarge";
import { buildErDispositionPreviewModel, erDispositionSupplementFromEncounter, inferOutcomeUiFromForms } from "./emergencyDispositionV1";
import {
  buildErNursingReassessmentPreviewModel,
  erNursingReassessmentFormFromEncounter,
} from "./emergencyNursingReassessmentV1";
import { buildErProviderMsePreviewModel, erProviderMseFormFromEncounter } from "./emergencyProviderMseV1";
import { buildTriageDocumentationPreviewModel, triagePreviewSliceFromTriageGet } from "./emergencyTriageDocPreview";
import { buildErResultsCockpitModel } from "./emergencyResultsCockpitModel";

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
  timeline: VisitSummaryTimelineEntry[];
};

const MAX_LINE = 420;

function trunc(s: string, max = MAX_LINE): string {
  const t = s.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function flattenSectionsToBlock(
  title: string,
  sections: { title: string; lines: string[] }[],
  maxLinesTotal = 24
): VisitSummaryTextBlock | null {
  const lines: string[] = [];
  for (const sec of sections) {
    if (sec.lines.length === 0) continue;
    if (lines.length > 0) lines.push("");
    lines.push(`— ${sec.title} —`);
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

function oneLineFromRow(row: EncounterLabRadRow | null): string | null {
  if (!row) return null;
  const v = clinicalResultFromOrderItemLike({
    displayLabelFr: getOrderItemDisplayLabelFr(row.item),
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
  });
  const label = v.title.trim() || "Examen";
  const rt = (v.resultText ?? "").trim();
  const crit = v.criticalValue ? " [valeur critique]" : "";
  if (rt) return `${label}${crit} : ${trunc(rt, 200)}`;
  return `${label}${crit} — ${v.itemStatus ?? ""}`.trim();
}

/** Build compact lab/rad lines from the same snapshot as EmergencyResultsPanel. */
export function buildVisitSummaryResultsBlock(snap: EncounterResultsLabRadSnapshot | null): VisitSummaryResultsBlock {
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
  const labLine = oneLineFromRow(m.labLatest);
  const imagingLine = oneLineFromRow(m.imagingLatest);
  const priorityLines = m.priorityRows
    .map((r) => oneLineFromRow(r))
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
  admissionSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

function formatIsoFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function readSignatureFromNursingBlob(
  key: string,
  nursingAssessment: unknown
): { label: string; at: string } | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = (raw as Record<string, unknown>).signature;
  if (!s || typeof s !== "object") return null;
  const at = (s as { savedAt?: unknown }).savedAt;
  const by = (s as { savedByDisplayName?: unknown }).savedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;
  return { label: by.trim(), at: formatIsoFr(at) };
}

/**
 * Aggregate all ER documentation for read-only display.
 */
export function buildEmergencyVisitSummaryModel(
  encounter: EncounterLike,
  triage: Record<string, unknown> | null,
  resultsSnap: EncounterResultsLabRadSnapshot | null
): EmergencyVisitSummaryModel {
  const timeline: VisitSummaryTimelineEntry[] = [];

  if (encounter.createdAt) {
    timeline.push({ label: "Consultation ouverte", value: formatIsoFr(encounter.createdAt) });
  }
  if (encounter.updatedAt) {
    timeline.push({ label: "Dernière mise à jour (consultation)", value: formatIsoFr(encounter.updatedAt) });
  }

  const parsed = triagePreviewSliceFromTriageGet(triage);
  let motifPresentation: VisitSummaryTextBlock | null = null;
  let triageResume: VisitSummaryTextBlock | null = null;

  if (parsed && triage) {
    const { slice, er } = parsed;
    const strokeScreenPresent = Boolean(triage.strokeScreen);
    const sepsisScreenPresent = Boolean(triage.sepsisScreen);
    const triageModel = buildTriageDocumentationPreviewModel(slice, {
      strokeScreenPresent,
      sepsisScreenPresent,
      erV1: er,
    });

    const chief =
      (encounter.chiefComplaint || "").trim() ||
      (encounter.visitReason || "").trim() ||
      slice.chiefComplaint.trim();
    const motifLines: string[] = [];
    if (chief) motifLines.push(`Motif : ${trunc(chief)}`);
    if (slice.onsetAt) {
      const d = new Date(slice.onsetAt);
      if (!Number.isNaN(d.getTime())) motifLines.push(`Début des symptômes : ${d.toLocaleString("fr-FR")}`);
    }
    const nar = er.triageNarrative.trim();
    if (nar) motifLines.push(`Récit triage : ${trunc(nar, 360)}`);
    if (motifLines.length) {
      motifPresentation = { title: "Motif & présentation", lines: motifLines };
    }

    const triageSecs = nonEmptyPreviewSections(triageModel.sections);
    triageResume = flattenSectionsToBlock("Triage (résumé)", triageSecs, 20);

    if (triage.triageCompleteAt) {
      timeline.push({ label: "Triage complété", value: formatIsoFr(triage.triageCompleteAt as string) });
    }
    if (triage.updatedAt) {
      timeline.push({ label: "Triage (mis à jour)", value: formatIsoFr(triage.updatedAt as string) });
    }
  } else {
    const chief = (encounter.chiefComplaint || "").trim() || (encounter.visitReason || "").trim();
    if (chief) {
      motifPresentation = { title: "Motif & présentation", lines: [`Motif : ${trunc(chief)}`] };
    }
  }

  const nav = encounter.nursingAssessment;
  const nursingForm = erNursingReassessmentFormFromEncounter(nav);
  const nursingPreview = buildErNursingReassessmentPreviewModel(nursingForm);
  const nursingSecs = nonEmptyPreviewSections(nursingPreview.sections.filter((s) => s.id !== "empty"));
  let resumeInfirmier =
    nursingSecs.length > 0
      ? flattenSectionsToBlock("Résumé infirmier (réévaluation)", nursingSecs, 18)
      : null;
  if (!resumeInfirmier && nursingPreview.narrative.trim()) {
    resumeInfirmier = {
      title: "Résumé infirmier (réévaluation)",
      lines: [trunc(nursingPreview.narrative)],
    };
  }
  const sigN = readSignatureFromNursingBlob("erNursingReassessmentV1", nav);
  if (sigN) timeline.push({ label: "Réévaluation infirmière (saisie)", value: `${sigN.label} — ${sigN.at}` });

  const providerForm = erProviderMseFormFromEncounter(nav);
  const providerPreview = buildErProviderMsePreviewModel(providerForm);
  const providerSecs = nonEmptyPreviewSections(providerPreview.sections.filter((s) => s.id !== "empty"));
  let evaluationMedicale =
    providerSecs.length > 0
      ? flattenSectionsToBlock("Évaluation médicale (urgences)", providerSecs, 22)
      : null;
  if (!evaluationMedicale && providerPreview.oneLineSummary.trim()) {
    evaluationMedicale = {
      title: "Évaluation médicale (urgences)",
      lines: [trunc(providerPreview.oneLineSummary)],
    };
  }
  const sigP = readSignatureFromNursingBlob("erProviderMseV1", nav);
  if (sigP) timeline.push({ label: "Évaluation médicale (saisie)", value: `${sigP.label} — ${sigP.at}` });

  const discharge = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const admission = hydrateAdmissionFormFromEncounterJson(
    encounter.admissionSummaryJson,
    formatPhysicianName(encounter.physicianAssigned ?? undefined)
  );
  const supplement = erDispositionSupplementFromEncounter(nav);
  const outcome = inferOutcomeUiFromForms(discharge.dischargeMode, supplement);
  const dispositionPreview = buildErDispositionPreviewModel(discharge, admission, supplement, outcome);
  const dispSecs = nonEmptyPreviewSections(dispositionPreview.sections.filter((s) => s.id !== "empty"));
  let disposition =
    dispSecs.length > 0 ? flattenSectionsToBlock("Disposition", dispSecs, 20) : null;
  if (!disposition && dispositionPreview.headline.trim()) {
    disposition = { title: "Disposition", lines: [trunc(dispositionPreview.headline)] };
  }
  if (!disposition) {
    const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
    const a = parseAdmissionSummaryForChart(encounter.admissionSummaryJson);
    const fallback: string[] = [];
    if (d?.dischargeMode) fallback.push(`Mode de sortie (dossier) : ${d.dischargeMode}`);
    if (d?.disposition) fallback.push(`Disposition : ${trunc(d.disposition)}`);
    if (a?.admissionReason) fallback.push(`Motif d'admission : ${trunc(a.admissionReason)}`);
    if (fallback.length) disposition = { title: "Disposition", lines: fallback };
  }
  const sigD = readSignatureFromNursingBlob("erDispositionV1", nav);
  if (sigD) timeline.push({ label: "Disposition urgence V1 (notes)", value: `${sigD.label} — ${sigD.at}` });

  const resultats = buildVisitSummaryResultsBlock(resultsSnap);

  const phys = encounter.physicianAssigned;
  if (phys && (phys.firstName || phys.lastName)) {
    const n = `${phys.firstName ?? ""} ${phys.lastName ?? ""}`.trim();
    if (n) timeline.push({ label: "Médecin assigné", value: n });
  }

  if (encounter.roomLabel?.trim()) {
    timeline.push({ label: "Salle", value: encounter.roomLabel.trim() });
  }

  return {
    motifPresentation,
    triageResume,
    resumeInfirmier,
    evaluationMedicale,
    resultats,
    disposition,
    timeline,
  };
}
