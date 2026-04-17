import type { SupportedLanguage } from "@/i18n/config";
import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Resolve a message path for print HTML (non-React). Falls back to French if missing in EN.
 */
export function printT(language: SupportedLanguage, key: string): string {
  const root = language === "en" ? enMessages : frMessages;
  const v = getByPath(root, key);
  if (typeof v === "string") return v;
  const frVal = getByPath(frMessages, key);
  if (typeof frVal === "string") return frVal;
  return key;
}

export function printDateLocale(language: SupportedLanguage): string {
  return language === "en" ? "en-US" : "fr-FR";
}

/** Patient sex for print HTML — mirrors `getPatientSexLabelFr` using i18n. */
export function printPatientSexLabel(
  language: SupportedLanguage,
  sex: string | null | undefined,
  sexAtBirth: string | null | undefined
): string {
  if (sex && sex !== "UNKNOWN") {
    const k = `encounterChrome.patientSex.${sex}`;
    const v = printT(language, k);
    if (v !== k) return v;
  }
  if (sexAtBirth) {
    const c = String(sexAtBirth).trim();
    const k = `encounterChrome.sexAtBirth.${c}`;
    const v = printT(language, k);
    if (v !== k) return v;
  }
  if (sex === "UNKNOWN") return printT(language, "encounterChrome.patientSex.UNKNOWN");
  return printT(language, "common.dash");
}

export function printOrderItemChartLabel(language: SupportedLanguage, status: string): string {
  if (isOrderItemDoneForChart(status)) {
    return printT(language, "printOutput.orderItemChart.terminalDone");
  }
  const k = `printOutput.orderItemChart.${status}`;
  const v = printT(language, k);
  return v !== k ? v : status;
}
