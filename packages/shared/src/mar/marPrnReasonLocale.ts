import { pickProductUiCopy } from "../i18n/productUiLocale.js";

export const MAR_PRN_REASON_CODES = [
  "mild_pain",
  "moderate_pain",
  "severe_pain",
  "nausea",
  "vomiting",
  "nausea_vomiting",
  "wheezing",
  "shortness_of_breath",
  "cough",
  "low_o2",
  "itching",
  "rash",
  "allergic_reaction",
  "hives",
  "fever",
  "insomnia",
  "anxiety",
  "agitation",
  "other",
] as const;

export type MarPrnReasonCode = (typeof MAR_PRN_REASON_CODES)[number];

export function isMarPrnReasonCode(value: string | null | undefined): value is MarPrnReasonCode {
  const v = value?.trim();
  return Boolean(v && (MAR_PRN_REASON_CODES as readonly string[]).includes(v));
}

export function marPrnReasonLabelFr(code: MarPrnReasonCode): string {
  const labels: Record<MarPrnReasonCode, string> = {
    mild_pain: "Douleur légère",
    moderate_pain: "Douleur modérée",
    severe_pain: "Douleur sévère",
    nausea: "Nausées",
    vomiting: "Vomissements",
    nausea_vomiting: "Nausées/vomissements",
    wheezing: "Sifflements",
    shortness_of_breath: "Dyspnée",
    cough: "Toux",
    low_o2: "O2 bas",
    itching: "Démangeaisons",
    rash: "Éruption cutanée",
    allergic_reaction: "Réaction allergique",
    hives: "Urticaire",
    fever: "Fièvre",
    insomnia: "Insomnie",
    anxiety: "Anxiété",
    agitation: "Agitation",
    other: "Autre",
  };
  return labels[code];
}

export function marPrnReasonLabelEn(code: MarPrnReasonCode): string {
  const labels: Record<MarPrnReasonCode, string> = {
    mild_pain: "Mild pain",
    moderate_pain: "Moderate pain",
    severe_pain: "Severe pain",
    nausea: "Nausea",
    vomiting: "Vomiting",
    nausea_vomiting: "Nausea/vomiting",
    wheezing: "Wheezing",
    shortness_of_breath: "Shortness of breath",
    cough: "Cough",
    low_o2: "Low O2",
    itching: "Itching",
    rash: "Rash",
    allergic_reaction: "Allergic reaction",
    hives: "Hives",
    fever: "Fever",
    insomnia: "Insomnia",
    anxiety: "Anxiety",
    agitation: "Agitation",
    other: "Other",
  };
  return labels[code];
}

export function marPrnReasonLabelEs(code: MarPrnReasonCode): string {
  const labels: Record<MarPrnReasonCode, string> = {
    mild_pain: "Dolor leve",
    moderate_pain: "Dolor moderado",
    severe_pain: "Dolor intenso",
    nausea: "Náuseas",
    vomiting: "Vómitos",
    nausea_vomiting: "Náuseas/vómitos",
    wheezing: "Sibilancias",
    shortness_of_breath: "Disnea",
    cough: "Tos",
    low_o2: "O2 bajo",
    itching: "Prurito",
    rash: "Erupción",
    allergic_reaction: "Reacción alérgica",
    hives: "Urticaria",
    fever: "Fiebre",
    insomnia: "Insomnio",
    anxiety: "Ansiedad",
    agitation: "Agitación",
    other: "Otro",
  };
  return labels[code];
}

export function marPrnReasonLabel(
  code: MarPrnReasonCode,
  locale: string = "en"
): string {
  return pickProductUiCopy(
    locale,
    { en: marPrnReasonLabelEn(code), fr: marPrnReasonLabelFr(code), es: marPrnReasonLabelEs(code) },
    marPrnReasonLabelEs(code)
  );
}

const MAR_PRN_REASON_LEGACY_LABEL_TO_CODE: Record<string, MarPrnReasonCode> = (() => {
  const map: Record<string, MarPrnReasonCode> = {};
  for (const code of MAR_PRN_REASON_CODES) {
    map[marPrnReasonLabelFr(code).trim().toLowerCase()] = code;
    map[marPrnReasonLabelEs(code).trim().toLowerCase()] = code;
    map[code.replace(/_/g, " ").trim().toLowerCase()] = code;
  }
  map["nausées"] = "nausea";
  map["nausea/vomiting"] = "nausea_vomiting";
  map["nausea / vomiting"] = "nausea_vomiting";
  return map;
})();

/** Maps stored French/English labels or codes to canonical PRN reason code. */
export function normalizeMarPrnReasonCodeFromStoredValue(
  value: string | null | undefined
): MarPrnReasonCode | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isMarPrnReasonCode(trimmed)) return trimmed;
  const normalized = trimmed.toLowerCase();
  return MAR_PRN_REASON_LEGACY_LABEL_TO_CODE[normalized] ?? null;
}

/** Alias for {@link normalizeMarPrnReasonCodeFromStoredValue}. */
export const normalizeMarPrnReasonCode = normalizeMarPrnReasonCodeFromStoredValue;

/** Localized PRN reason for UI — prefers stable code; backward-compatible with legacy stored labels. */
export function formatMarPrnReasonForLocale(
  input: { code?: string | null; label?: string | null },
  locale: string = "en"
): string | null {
  const code =
    (input.code && isMarPrnReasonCode(input.code) ? input.code : null) ??
    normalizeMarPrnReasonCodeFromStoredValue(input.code) ??
    normalizeMarPrnReasonCodeFromStoredValue(input.label);
  if (code) return marPrnReasonLabel(code, locale);
  const freeText = input.label?.trim() || input.code?.trim();
  return freeText || null;
}
