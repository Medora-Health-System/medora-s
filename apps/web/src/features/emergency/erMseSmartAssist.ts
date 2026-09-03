/**
 * Deterministic ER MSE prefill suggestions from data already documented in the workflow.
 * No network, no AI, no inference beyond explicit structured facts.
 * Display wording resolved via `erMseSmartAssist` messages (FR/EN).
 */

import type { SupportedLanguage } from "@/i18n/config";
import { getClinicalUiMessages } from "@/i18n/messages/registry";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import type { ErProviderMseForm } from "./emergencyProviderMseV1";
import {
  sepsisScreenFromUnknown,
  strokeScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
  vitalsCanonicalRecordFromTriageSlice,
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

function mseRoot(locale: SupportedLanguage): Record<string, unknown> | undefined {
  const root = getClinicalUiMessages(locale) as Record<string, unknown>;
  const block = root.erMseSmartAssist;
  return block !== null && typeof block === "object" ? (block as Record<string, unknown>) : undefined;
}

/** Resolve a dot path under `erMseSmartAssist` (e.g. `traumaLevels.LEVEL_1`, `cdsPlan.cds_er_hypotension`). */
function mseT(locale: SupportedLanguage, path: string): string {
  const base = mseRoot(locale);
  if (!base) return "";
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = base;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return "";
    }
  }
  return typeof cur === "string" ? cur : "";
}

function interpolate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

function mseI(locale: SupportedLanguage, path: string, vars: Record<string, string>): string {
  return interpolate(mseT(locale, path), vars);
}

function traumaLevelLabel(locale: SupportedLanguage, level: string): string {
  const key = level === "LEVEL_1" || level === "LEVEL_2" || level === "LEVEL_3" || level === "LEVEL_4" ? level : "";
  if (key) return mseT(locale, `traumaLevels.${key}`);
  return mseT(locale, "traumaLevels.unspecified");
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

function planLinesFromCdsIds(ids: readonly string[] | undefined, locale: SupportedLanguage): string {
  if (!ids?.length) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const line = mseT(locale, `cdsPlan.${id}`);
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/**
 * Returns non-empty string fields only. Caller applies to empty MSE fields only.
 */
export function buildErMseSmartAssistSuggestions(
  ctx: ErMseSmartAssistContext,
  locale: SupportedLanguage
): Partial<ErProviderMseForm> {
  if (ctx.encounterType !== "EMERGENCY") return {};

  const out: Partial<ErProviderMseForm> = {};
  const triage = ctx.triage;
  const parsed = triage ? triagePreviewSliceFromTriageGet(triage, locale) : null;

  const stroke = strokeScreenFromUnknown(triage?.strokeScreen);
  const sepsis = sepsisScreenFromUnknown(triage?.sepsisScreen);
  const sepsisConcern =
    sepsis.suspectedInfection === "yes" &&
    (sepsis.rrGte22 === "yes" || sepsis.sbpLte100 === "yes" || sepsis.alteredMentalStatus === "yes");

  const strokePositive =
    stroke.faceDroop === "yes" || stroke.armWeakness === "yes" || stroke.speechDifficulty === "yes";
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
      out.onsetTimingContext = mseI(locale, "onsetEvolution", { onset });
    }

    const esi = (slice.esi ?? "").trim();

    const hpiSentences: string[] = [];
    if (esi) {
      hpiSentences.push(mseI(locale, "hpiEsiPriority", { esi }));
    }
    if (strokePositive || strokeAlert) {
      const pos: string[] = [];
      if (stroke.faceDroop === "yes") pos.push(mseT(locale, "strokeHpiFace"));
      if (stroke.armWeakness === "yes") pos.push(mseT(locale, "strokeHpiArm"));
      if (stroke.speechDifficulty === "yes") pos.push(mseT(locale, "strokeHpiSpeech"));
      if (strokeAlert) pos.push(mseT(locale, "strokeHpiAlert"));
      if (pos.length) {
        hpiSentences.push(mseI(locale, "strokeScreenIntro", { items: pos.join(", ") }));
      }
    }
    if (sepsisConcern) {
      hpiSentences.push(mseT(locale, "hpiSepsisSuspected"));
    }
    if (hpiSentences.length) {
      out.hpiNarrative = hpiSentences.join(" ");
    }

    const assoc: string[] = [];
    if (stroke.faceDroop === "yes") assoc.push(mseT(locale, "strokeAssocFace"));
    if (stroke.armWeakness === "yes") assoc.push(mseT(locale, "strokeAssocArm"));
    if (stroke.speechDifficulty === "yes") assoc.push(mseT(locale, "strokeAssocSpeech"));
    if (assoc.length) {
      out.associatedSymptoms = assoc.join(mseT(locale, "assocSep"));
    }

    if (er.traumaActivation.activated) {
      const levelLabel = traumaLevelLabel(locale, er.traumaActivation.level);
      out.severityKeyConcern = mseI(locale, "severityTraumaActivated", { level: levelLabel });
    } else if (strokePositive || strokeAlert) {
      out.severityKeyConcern = mseT(locale, "severityStrokeAlertTriage");
    } else if (sepsisConcern) {
      out.severityKeyConcern = mseT(locale, "severitySepsisConcern");
    } else if (chief && chiefSuggestsChestPain(chief)) {
      out.severityKeyConcern = mseT(locale, "severityChestPainSpecify");
    }

    if (strokePositive || strokeAlert) {
      out.focusedImpression = mseT(locale, "focusedNeuroAcute");
    } else if (sepsisConcern) {
      out.focusedImpression = mseT(locale, "focusedSepsisPossible");
    }

    const vitalsLine = formatVitalsHeaderLineForLocale(vitalsCanonicalRecordFromTriageSlice(slice), locale);
    if (vitalsLine) {
      out.examReassessmentExtra = mseI(locale, "vitalsRecordedLine", { line: vitalsLine });
    }

    if (esi) {
      out.mdmWorkingAssessment = mseI(locale, "mdmWorkingEsi", { esi });
    } else if ((slice.chiefComplaint ?? "").trim() || chiefEnc) {
      out.mdmWorkingAssessment = mseT(locale, "mdmWorkingMotif");
    }
  }

  if (!parsed && chiefEnc) {
    out.mdmWorkingAssessment = mseT(locale, "mdmWorkingMotif");
  }

  const immediateParts: string[] = [];
  if (parsed?.er.traumaActivation.activated) {
    const levelLabel = traumaLevelLabel(locale, parsed.er.traumaActivation.level);
    immediateParts.push(mseI(locale, "immediateTraumaProtocol", { level: levelLabel }));
  }
  if (sepsisConcern) {
    immediateParts.push(mseT(locale, "immediateSepsisReassess"));
  }
  if (strokePositive || strokeAlert) {
    immediateParts.push(mseT(locale, "immediateStrokePathway"));
  }
  if (immediateParts.length) {
    out.mdmImmediateActionsRationale = immediateParts.join("\n\n");
  }

  const plan = planLinesFromCdsIds(ctx.cdsRecommendationIds, locale);
  if (plan) {
    out.mdmPlanSummary = plan;
  }

  return out;
}
