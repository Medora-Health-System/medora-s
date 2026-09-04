import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import { productUiBcp47Tag } from "@/i18n/config";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

/**
 * Resolve a message path for print HTML (non-React).
 * Active locale only — never fall back to another language catalog.
 */
export function printT(language: string, key: string): string {
  return resolveClinicalUiMessage(language, key);
}

export function printDateLocale(language: string): string {
  return productUiBcp47Tag(language);
}

/** Patient sex for print HTML — mirrors `getPatientSexLabelFr` using i18n. */
export function printPatientSexLabel(
  language: string,
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

export function printOrderItemChartLabel(language: string, status: string): string {
  if (isOrderItemDoneForChart(status)) {
    return printT(language, "printOutput.orderItemChart.terminalDone");
  }
  const k = `printOutput.orderItemChart.${status}`;
  const v = printT(language, k);
  return v !== k ? v : status;
}
