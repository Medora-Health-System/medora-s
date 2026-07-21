/**
 * D2.5 — pathway-aware closed-chart summary / print routing.
 * Never route AMA/LWBS/Elopement/Deceased to Home Discharge print layout.
 */

import type { EdDispositionPath } from "./edEncounterLifecycle.js";

export const EdDispositionPrintKind = {
  NONE: "NONE",
  HOME_DISCHARGE: "HOME_DISCHARGE",
  AMA_INFORMED_REFUSAL: "AMA_INFORMED_REFUSAL",
  LWBS_EVENT: "LWBS_EVENT",
  ELOPEMENT_EVENT: "ELOPEMENT_EVENT",
  DEATH_PRONOUNCEMENT: "DEATH_PRONOUNCEMENT",
  GOVERNED_OTHER: "GOVERNED_OTHER",
  ADMISSION_SHELL: "ADMISSION_SHELL",
  TRANSFER_SHELL: "TRANSFER_SHELL",
} as const;

export type EdDispositionPrintKind =
  (typeof EdDispositionPrintKind)[keyof typeof EdDispositionPrintKind];

/** French print titles (product UI language). */
export const ED_DISPOSITION_PRINT_TITLE_FR: Record<EdDispositionPrintKind, string> = {
  NONE: "",
  HOME_DISCHARGE: "Synthèse de sortie à domicile",
  AMA_INFORMED_REFUSAL: "Synthèse LAMA / refus éclairé",
  LWBS_EVENT: "Synthèse d’événement LWBS",
  ELOPEMENT_EVENT: "Synthèse d’événement de fugue",
  DEATH_PRONOUNCEMENT: "Synthèse décès / constatation",
  GOVERNED_OTHER: "Synthèse de disposition autre (gouvernée)",
  ADMISSION_SHELL: "Synthèse d’admission",
  TRANSFER_SHELL: "Synthèse de transfert",
};

/** English print titles (locale parity). */
export const ED_DISPOSITION_PRINT_TITLE_EN: Record<EdDispositionPrintKind, string> = {
  NONE: "",
  HOME_DISCHARGE: "Home Discharge Summary",
  AMA_INFORMED_REFUSAL: "AMA / Informed Refusal Summary",
  LWBS_EVENT: "LWBS Event Summary",
  ELOPEMENT_EVENT: "Elopement Event Summary",
  DEATH_PRONOUNCEMENT: "Death / Pronouncement Summary",
  GOVERNED_OTHER: "Governed Other Disposition Summary",
  ADMISSION_SHELL: "Admission Summary",
  TRANSFER_SHELL: "Transfer Summary",
};

export function resolveEdDispositionPrintKind(path: EdDispositionPath): EdDispositionPrintKind {
  switch (path) {
    case "HOME":
      return EdDispositionPrintKind.HOME_DISCHARGE;
    case "AMA":
      return EdDispositionPrintKind.AMA_INFORMED_REFUSAL;
    case "LWBS":
      return EdDispositionPrintKind.LWBS_EVENT;
    case "ELOPEMENT":
      return EdDispositionPrintKind.ELOPEMENT_EVENT;
    case "DECEASED":
      return EdDispositionPrintKind.DEATH_PRONOUNCEMENT;
    case "OTHER":
      return EdDispositionPrintKind.GOVERNED_OTHER;
    case "ADMISSION":
      return EdDispositionPrintKind.ADMISSION_SHELL;
    case "TRANSFER":
      return EdDispositionPrintKind.TRANSFER_SHELL;
    case "NONE":
    default:
      return EdDispositionPrintKind.NONE;
  }
}

export function shouldUseHomeDischargePrintLayout(path: EdDispositionPath): boolean {
  return path === "HOME";
}
