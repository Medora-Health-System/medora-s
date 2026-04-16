/**
 * Deterministic ER MSE prefill suggestions from data already documented in the workflow.
 * No network, no AI, no inference beyond explicit structured facts.
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

/** French reminders only — factual linkage to active CDS rules, no orders. */
function planLinesFromCdsIds(ids: readonly string[] | undefined): string {
  if (!ids?.length) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const line = CDS_REMINDER_FR[id];
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/** Neutral wording; keys mirror `ErCdsRecommendationId` where applicable. */
const CDS_REMINDER_FR: Record<string, string> = {
  cds_er_trauma_protocol:
    "Rappel (aide à la décision) : protocole trauma — à confirmer manuellement dans les ordres si indiqué.",
  cds_er_vitals_escalation:
    "Rappel (aide à la décision) : signes vitaux à risque — réévaluation urgente documentée.",
  cds_er_hypotension:
    "Rappel (aide à la décision) : hypotension — vigilance hémodynamique (assistif uniquement).",
  cds_er_tachycardia:
    "Rappel (aide à la décision) : tachycardie — réévaluation (assistif uniquement).",
  cds_er_hypoxemia:
    "Rappel (aide à la décision) : hypoxémie — attention respiratoire (assistif uniquement).",
  cds_er_tachypnea:
    "Rappel (aide à la décision) : polypnée — réévaluation (assistif uniquement).",
  cds_er_temperature_concern:
    "Rappel (aide à la décision) : température extrême — réévaluation (assistif uniquement).",
  cds_er_hemodynamic_trend:
    "Rappel (aide à la décision) : tendance hémodynamique défavorable sur relevés récents (assistif uniquement).",
  cds_er_respiratory_trend:
    "Rappel (aide à la décision) : tendance respiratoire défavorable sur relevés récents (assistif uniquement).",
  cds_er_esi_urgent: "Rappel (aide à la décision) : ESI prioritaire (1–2) documenté au triage.",
  cds_er_stroke_pathway:
    "Rappel (aide à la décision) : filière AVC — revue selon protocole local (assistif uniquement).",
  cds_er_sepsis_bundle:
    "Rappel (aide à la décision) : bundle sepsis — revue selon protocole local (assistif uniquement).",
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
      out.onsetTimingContext = `Début / chronologie (champ triage) : ${onset}.`;
    }

    const esi = (slice.esi ?? "").trim();
    const hpiParts: string[] = [];
    if (esi) {
      hpiParts.push(`ESI documenté au triage : ${esi}.`);
    }
    if (strokePositive || strokeAlert) {
      const bits: string[] = [];
      if (stroke.faceDroop === "yes") bits.push("asymétrie faciale");
      if (stroke.armWeakness === "yes") bits.push("faiblesse du membre");
      if (stroke.speechDifficulty === "yes") bits.push("trouble de la parole");
      if (strokeAlert) bits.push("alerte AVC activée au triage");
      hpiParts.push(
        `Dépistage structuré au triage : ${bits.length ? bits.join(", ") + " (éléments renseignés comme présents)." : "éléments documentés dans l’écran de dépistage."}`
      );
    }
    if (sepsisConcern) {
      hpiParts.push(
        "Écran sepsis au triage : infection suspectée avec au moins un critère associé renseigné (données factuelles du formulaire)."
      );
    }
    if (hpiParts.length) {
      out.hpiNarrative = hpiParts.join("\n\n");
    }

    const assoc: string[] = [];
    if (stroke.faceDroop === "yes") assoc.push("asymétrie faciale (oui au dépistage)");
    if (stroke.armWeakness === "yes") assoc.push("faiblesse moteure d’un membre (oui au dépistage)");
    if (stroke.speechDifficulty === "yes") assoc.push("trouble de la parole (oui au dépistage)");
    if (assoc.length) {
      out.associatedSymptoms = assoc.join(" · ");
    }

    if (er.traumaActivation.activated) {
      const lvl = traumaLevelLabelFr(er.traumaActivation.level);
      out.severityKeyConcern = `Trauma activé — ${lvl} (documenté au triage dans le bilan initial).`;
    }

    if (strokePositive || strokeAlert) {
      out.focusedImpression =
        "Dépistage AVC au triage : au moins un élément positif ou une alerte documentée (voir HPI).";
    } else if (sepsisConcern) {
      out.focusedImpression =
        "Écran sepsis au triage : infection suspectée avec critères associés renseignés (données factuelles).";
    }

    const vitalsLine = formatVitalsHeaderLine(vitalsRecordFromSlice(slice));
    if (vitalsLine) {
      out.examReassessmentExtra = `Signes vitaux au triage (dernier relevé documenté) : ${vitalsLine}.`;
    }

    if (esi || chief) {
      out.mdmWorkingAssessment = [
        "Synthèse factuelle à partir du triage :",
        esi ? `ESI : ${esi}.` : null,
        chief ? `Motif / préoccupation principale : ${chief}.` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
  } else if (chiefEnc) {
    out.mdmWorkingAssessment = `Motif / préoccupation (dossier consultation) : ${chiefEnc}.`;
  }

  const immediateParts: string[] = [];
  if (parsed?.er.traumaActivation.activated) {
    immediateParts.push(
      `Trauma activé (${traumaLevelLabelFr(parsed.er.traumaActivation.level)}) — adapter la prise en charge selon protocole local (décision manuelle).`
    );
  }
  if (sepsisConcern) {
    immediateParts.push(
      "Critères documentés sur l’écran sepsis au triage — revoir la prise en charge selon protocole local si indiqué."
    );
  }
  if (strokePositive || strokeAlert) {
    immediateParts.push(
      "Éléments de dépistage AVC documentés au triage — orientation selon protocole local (décision manuelle)."
    );
  }
  if (immediateParts.length) {
    out.mdmImmediateActionsRationale = immediateParts.join("\n\n");
  }

  const plan = planLinesFromCdsIds(ctx.cdsRecommendationIds);
  if (plan) {
    out.mdmPlanSummary = `Rappels issus de l’aide à la décision (assistif, sans commande automatique) :\n${plan}`;
  }

  return out;
}
