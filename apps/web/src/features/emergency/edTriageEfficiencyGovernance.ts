/**
 * ED triage efficiency & screening governance helpers (MEDUI.ED.TRIAGE.2).
 * Pure functions — safe for unit tests without DOM.
 */

import type { Icd10SearchHit } from "@/lib/chartApi";
import type { SupportedLanguage } from "@/i18n/config";
import {
  applySurgicalHistoryCatalogSelection,
  type SurgicalHistoryCatalogEntry,
  type SurgicalHistorySearchLocale,
} from "@medora/shared";
import { getLocalizedDiagnosisDisplayLabel } from "./diagnosisFrenchDisplayLabels";
import { appendIfNotPresent, safeTrim, type ErTriageV1Form, type ErYesNoUnknown } from "./medoraErTriageV1";

export const ER_TRIAGE_PPE_NONE_CODE = "NONE";

export function shouldShowTravelDetails(travelOutsideCountry14d: ErYesNoUnknown): boolean {
  return travelOutsideCountry14d === "yes";
}

export function shouldShowSafetyAssessment(feelsSafeAtHome: ErYesNoUnknown): boolean {
  return feelsSafeAtHome === "no" || feelsSafeAtHome === "unknown";
}

export function safetyAssessmentRequiresAllFields(feelsSafeAtHome: ErYesNoUnknown): boolean {
  return feelsSafeAtHome === "no";
}

export function safetyAssessmentHasDocumentedConcern(er: ErTriageV1Form): boolean {
  return (
    er.safetyImmediateDanger === "yes" ||
    er.safetyAbuseNeglect === "yes" ||
    er.safetyHumanTrafficking === "yes" ||
    er.safetySelfHarm === "yes" ||
    er.safetyNeedsSocialWork === "yes" ||
    safeTrim(er.safetyAssessmentNotes) !== ""
  );
}

export function travelDetailsHasContent(er: ErTriageV1Form): boolean {
  return (
    safeTrim(er.travelDestinationCountry) !== "" ||
    safeTrim(er.travelDateOrReturn) !== "" ||
    safeTrim(er.travelExposureConcern) !== "" ||
    safeTrim(er.travelScreeningNotes) !== ""
  );
}

export function togglePpeSelection(
  er: ErTriageV1Form,
  code: string,
  label: string
): Partial<ErTriageV1Form> {
  const current = er.ppeSelections;
  if (current.includes(code)) {
    return { ppeSelections: current.filter((c) => c !== code) };
  }
  if (code === ER_TRIAGE_PPE_NONE_CODE) {
    return {
      ppeSelections: [ER_TRIAGE_PPE_NONE_CODE],
      ppeNote: label,
    };
  }
  const withoutNone = current.filter((c) => c !== ER_TRIAGE_PPE_NONE_CODE);
  let nextNote = er.ppeNote;
  if (current.includes(ER_TRIAGE_PPE_NONE_CODE)) {
    nextNote = label;
  } else {
    nextNote = appendIfNotPresent(er.ppeNote, label);
  }
  return {
    ppeSelections: [...withoutNone, code],
    ppeNote: nextNote,
  };
}

export function appendDiagnosisToPmh(
  currentPmh: string,
  hit: Icd10SearchHit,
  locale: SupportedLanguage
): string {
  const label = getLocalizedDiagnosisDisplayLabel(hit, locale).trim();
  if (!label) return currentPmh;
  return appendIfNotPresent(currentPmh, label);
}

export function applySurgicalHistoryPick(
  currentPsh: string,
  entry: SurgicalHistoryCatalogEntry,
  locale: SupportedLanguage
): string {
  return applySurgicalHistoryCatalogSelection(currentPsh, entry, locale as SurgicalHistorySearchLocale);
}
