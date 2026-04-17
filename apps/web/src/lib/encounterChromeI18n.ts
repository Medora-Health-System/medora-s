import type { SupportedLanguage } from "@/i18n/config";
import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";

export function encounterBcp47(language: SupportedLanguage): string {
  return language === "en" ? "en-US" : "fr-FR";
}

/** Resolves `prefix.code` via `t`; falls back to raw code if missing. */
export function tEnumKey(t: (key: string) => string, prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  const v = t(key);
  return v === key ? code : v;
}

/**
 * Mirrors `getPatientSexLabelFr` using `encounterChrome.patientSex` / `encounterChrome.sexAtBirth`
 * and `common.dash` for unknown empty.
 */
/** Age + sex line for lists (e.g. trackboard), locale-aware via `t` and `encounterChrome.ageYearsSuffix`. */
export function formatPatientAgeSexLine(
  dob: string | null | undefined,
  sexAtBirth: string | null | undefined,
  sex: string | null | undefined,
  t: (key: string) => string
): string {
  const dash = t("common.dash");
  if (!dob) return dash;
  const ts = new Date(dob).getTime();
  if (Number.isNaN(ts)) return dash;
  const age = calculateAge(dob);
  if (!Number.isFinite(age) || age < 0) return dash;
  const ageStr = `${age} ${t("encounterChrome.ageYearsSuffix")}`;
  const sexStr = tPatientSex(sex, sexAtBirth, t);
  return `${ageStr} • ${sexStr}`;
}

export function tPatientSex(
  sex: string | null | undefined,
  sexAtBirth: string | null | undefined,
  t: (key: string) => string
): string {
  const dash = t("common.dash");
  if (sex && sex !== "UNKNOWN") {
    const m = tEnumKey(t, "encounterChrome.patientSex", sex);
    if (m !== sex) return m;
  }
  if (sexAtBirth && String(sexAtBirth).trim()) {
    const c = String(sexAtBirth).trim();
    const m = tEnumKey(t, "encounterChrome.sexAtBirth", c);
    if (m !== c) return m;
    return t("encounterChrome.sexAtBirth.UNKNOWN");
  }
  if (sex === "UNKNOWN") return tEnumKey(t, "encounterChrome.patientSex", "UNKNOWN");
  return dash;
}

export function tEncounterType(t: (key: string) => string, type: string): string {
  return tEnumKey(t, "encounterChrome.encounterTypes", type);
}

export function tEncounterStatus(t: (key: string) => string, status: string): string {
  return tEnumKey(t, "encounterChrome.encounterStatuses", status);
}

export function tPathwayType(t: (key: string) => string, type: string): string {
  return tEnumKey(t, "encounterChrome.pathwayTypes", type);
}

export function tPathwayStatus(t: (key: string) => string, status: string): string {
  return tEnumKey(t, "encounterChrome.pathwayStatuses", status);
}

export function tOrderPriority(t: (key: string) => string, priority: string): string {
  return tEnumKey(t, "encounterChrome.orderPriorities", priority);
}

/** Follow-up row status (mirrors `printOutput.patientChart.followUpStatus`). */
export function tFollowUpStatus(t: (key: string) => string, status: string): string {
  return tEnumKey(t, "printOutput.patientChart.followUpStatus", status);
}

/** Worklist / table: maps backend order-item status to `printOutput.orderItemChart.*`. */
export function tOrderItemStatusForWorklist(t: (key: string) => string, status: string): string {
  if (isOrderItemDoneForChart(status)) return t("printOutput.orderItemChart.terminalDone");
  return tEnumKey(t, "printOutput.orderItemChart", status);
}

export function tMedicationFulfillmentIntent(
  t: (key: string) => string,
  intent: string | null | undefined
): string {
  if (intent === "ADMINISTER_CHART") return t("encounterChrome.medicationIntent.ADMINISTER_CHART");
  return t("encounterChrome.medicationIntent.DISPENSE_PHARMACY");
}

export function formatEncounterChromeDateTime(iso: string, language: SupportedLanguage): string {
  return new Date(iso).toLocaleString(encounterBcp47(language), {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatEncounterChromeDateTimeFromDate(d: Date, language: SupportedLanguage): string {
  return d.toLocaleString(encounterBcp47(language), { dateStyle: "short", timeStyle: "short" });
}

export function formatEncounterChromeDate(iso: string, language: SupportedLanguage): string {
  return new Date(iso).toLocaleDateString(encounterBcp47(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLatestVitalsLine(
  vitals: Record<string, number | string | null | undefined>,
  esi: number | null | undefined,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const base = formatVitalsHeaderLineForLocale(vitals, language);
  const parts: string[] = [];
  if (base) parts.push(base);
  if (esi != null) parts.push(language === "en" ? `ESI ${esi}` : `ESI : ${esi}`);
  return parts.length ? parts.join(" · ") : t("encounterChrome.noVitalsLine");
}
