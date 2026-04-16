/**
 * Deterministic ER MSE prefill suggestions from data already documented in the workflow.
 * No network, no AI, no inference beyond explicit structured facts.
 * Wording kept concise and clinician-style (French).
 */

import { formatVitalsHeaderLine } from "@/lib/patientVitals";
import type { ErProviderMseForm } from "./emergencyProviderMseV1";
import {
  sepsisScreenFromUnknown,
  strokeScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";

export type ErMseSmartAssistContext = {
  encounterType?: string | null;
  triage: Record<string, unknown> | null;
  encounterLine?: {
    visitReason?: string | null;
    chiefComplaint?: string | null;
  };
  /** CDS recommendation ids from `buildErCdsRecommendations` (optional). */
  cdsRecommendationIds?: readonly string[];
};

function traumaLevelLabelFr(level: string): string {
  if (level === "LEVEL_1") return "Niveau 1";
  if (level === "LEVEL_2") return "Niveau 2";
  if (level === "LEVEL_3") return "Niveau 3";
  if (level === "LEVEL_4") return "Niveau 4";
  return "non précisé";
}

function pickChiefFromEncounter(enc: ErMseSmartAssistContext["encounterLine"]): string {
  if (!enc) return "";
  const vr = (enc.visitReason ?? "").trim();
  const cc = (enc.chiefComplaint ?? "").trim();
  return vr || cc || "";
}

/** Chief text suggests thoracic pain — deterministic keyword hint only. */
function chiefSuggestsChestPain(chief: string): boolean {
  const s = chief.toLowerCase();
  return (
    s.includes("thoracique") ||
    s.includes("thorax") ||
    s.includes("précordial") ||
    s.includes("precordial")
  );
}

/** Physician-style checklist lines from active CDS ids (no product-style “rappel aide à la décision”). */
function planLinesFromCdsIds(ids: readonly string[] | undefined): string {
  if (!ids?.length) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const line = CDS_PLAN_LINE_FR[id];
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

const CDS_PLAN_LINE_FR: Record<string, string> = {
  cds_er_trauma_protocol: "Protocole trauma à confirmer selon l’évaluation clinique.",
  cds_er_vitals_escalation: "Signes vitaux à risque — réévaluation clinique urgente.",
  cds_er_hypotension: "Hypotension — vigilance hémodynamique et réévaluation.",
  cds_er_tachycardia: "Tachycardie — réévaluation du contexte et des causes.",
  cds_er_hypoxemia: "Hypoxémie — réévaluation respiratoire et support si indiqué.",
  cds_er_tachypnea: "Polypnée — réévaluation ventilatoire.",
  cds_er_temperature_concern: "Température extrême — réévaluation et cause à préciser.",
  cds_er_hemodynamic_trend: "Tendance hémodynamique défavorable sur relevés récents — réévaluation.",
  cds_er_respiratory_trend: "Tendance respiratoire défavorable sur relevés récents — réévaluation.",
  cds_er_esi_urgent: "ESI prioritaire (1–2) — coordination et réévaluation rapide.",
  cds_er_stroke_pathway: "Orientation filière AVC selon protocole local.",
  cds_er_sepsis_bundle: "Réévaluer la prise en charge sepsis selon protocole local.",
};

function vitalsRecordFromSlice(slice: {
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
}): Record<string, number | string | null | undefined> {
  return {
    tempC: slice.tempC ? parseFloat(slice.tempC) : "",
    hr: slice.hr ? parseInt(slice.hr, 10) : "",
    rr: slice.rr ? parseInt(slice.rr, 10) : "",
    bpSys: slice.bpSys ? parseInt(slice.bpSys, 10) : "",
    bpDia: slice.bpDia ? parseInt(slice.bpDia, 10) : "",
    spo2: slice.spo2 ? parseInt(slice.spo2, 10) : "",
    weightKg: slice.weightKg ? parseFloat(slice.weightKg) : "",
    heightCm: slice.heightCm ? parseFloat(slice.heightCm) : "",
  };
}

/**
 * Returns non-empty string fields only. Caller applies to empty MSE fields only.
 */
export function buildErMseSmartAssistSuggestions(ctx: ErMseSmartAssistContext): Partial<ErProviderMseForm> {
  if (ctx.encounterType !== "EMERGENCY") return {};

  const out: Partial<ErProviderMseForm> = {};
  const triage = ctx.triage;
  const parsed = triage ? triagePreviewSliceFromTriageGet(triage) : null;

  const stroke = strokeScreenFromUnknown(triage?.strokeScreen);
  const sepsis = sepsisScreenFromUnknown(triage?.sepsisScreen);
  const sepsisConcern =
    sepsis.suspectedInfection === "yes" &&
    (sepsis.rrGte22 === "yes" || sepsis.sbpLte100 === "yes" || sepsis.alteredMentalStatus === "yes");

  const strokePositive =
    stroke.faceDroop === "yes" ||
    stroke.armWeakness === "yes" ||
    stroke.speechDifficulty === "yes";
  const strokeAlert = stroke.strokeAlertActivated === "yes";

  const chiefTriage = (parsed?.slice.chiefComplaint ?? "").trim();
  const chiefEnc = pickChiefFromEncounter(ctx.encounterLine);
  const chief = chiefTriage || chiefEnc;
  if (chief) {
    out.chiefConcern = chief;
  }

  if (parsed) {
    const { slice, er } = parsed;
    const onset = (slice.onsetAt ?? "").trim();
    if (onset) {
      out.onsetTimingContext = `Début / évolution : ${onset}.`;
    }

    const esi = (slice.esi ?? "").trim();

    const hpiSentences: string[] = [];
    if (esi) {
      hpiSentences.push(`Priorisation ESI ${esi}.`);
    }
    if (strokePositive || strokeAlert) {
      const pos: string[] = [];
      if (stroke.faceDroop === "yes") pos.push("asymétrie faciale");
      if (stroke.armWeakness === "yes") pos.push("faiblesse de membre");
      if (stroke.speechDifficulty === "yes") pos.push("trouble de la parole");
      if (strokeAlert) pos.push("alerte AVC activée");
      if (pos.length) {
        hpiSentences.push(`Dépistage initial : ${pos.join(", ")}.`);
      }
    }
    if (sepsisConcern) {
      hpiSentences.push("Infection suspectée avec critères associés compatibles sepsis (criblage initial).");
    }
    if (hpiSentences.length) {
      out.hpiNarrative = hpiSentences.join(" ");
    }

    const assoc: string[] = [];
    if (stroke.faceDroop === "yes") assoc.push("asymétrie faciale");
    if (stroke.armWeakness === "yes") assoc.push("faiblesse motrice");
    if (stroke.speechDifficulty === "yes") assoc.push("trouble de la parole");
    if (assoc.length) {
      out.associatedSymptoms = assoc.join(" · ");
    }

    if (er.traumaActivation.activated) {
      out.severityKeyConcern = `Trauma ${traumaLevelLabelFr(er.traumaActivation.level)} activé.`;
    } else if (strokePositive || strokeAlert) {
      out.severityKeyConcern = "Alerte AVC au triage.";
    } else if (sepsisConcern) {
      out.severityKeyConcern = "Suspicion infectieuse avec critères de sepsis documentés.";
    } else if (chief && chiefSuggestsChestPain(chief)) {
      out.severityKeyConcern = "Douleur thoracique à préciser.";
    }

    if (strokePositive || strokeAlert) {
      out.focusedImpression = "Suspicion neurologique aiguë (criblage initial positif).";
    } else if (sepsisConcern) {
      out.focusedImpression = "Sepsis possible — corréler clinique et bilan.";
    }

    const vitalsLine = formatVitalsHeaderLine(vitalsRecordFromSlice(slice));
    if (vitalsLine) {
      out.examReassessmentExtra = `SV relevés : ${vitalsLine}.`;
    }

    if (esi) {
      out.mdmWorkingAssessment = `ESI ${esi} — intégrer à la synthèse et au plan.`;
    } else if ((slice.chiefComplaint ?? "").trim() || chiefEnc) {
      out.mdmWorkingAssessment = "Motif à intégrer à la synthèse clinique et au plan.";
    }
  }

  if (!parsed && chiefEnc) {
    out.mdmWorkingAssessment = "Motif à intégrer à la synthèse clinique et au plan.";
  }

  const immediateParts: string[] = [];
  if (parsed?.er.traumaActivation.activated) {
    immediateParts.push(
      `Protocole trauma (${traumaLevelLabelFr(parsed.er.traumaActivation.level)}) à ajuster selon l’évaluation et les ordres.`
    );
  }
  if (sepsisConcern) {
    immediateParts.push("Réévaluer la prise en charge sepsis selon protocole local.");
  }
  if (strokePositive || strokeAlert) {
    immediateParts.push("Orientation filière AVC selon protocole local.");
  }
  if (immediateParts.length) {
    out.mdmImmediateActionsRationale = immediateParts.join("\n\n");
  }

  const plan = planLinesFromCdsIds(ctx.cdsRecommendationIds);
  if (plan) {
    out.mdmPlanSummary = plan;
  }

  return out;
}
