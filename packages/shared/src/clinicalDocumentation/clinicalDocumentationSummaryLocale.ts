export type ClinicalDocumentationSummaryLocale = "en" | "fr";

export type ClinicalDocumentationPayloadSummaryLine = {
  key: string;
  value: string;
};

export function clinicalDocYesNo(
  v: boolean,
  locale: ClinicalDocumentationSummaryLocale
): string {
  return locale === "en" ? (v ? "Yes" : "No") : v ? "Oui" : "Non";
}

export function pickLocalizedEnumLabel(
  en: Record<string, string>,
  fr: Record<string, string>,
  value: string,
  locale: ClinicalDocumentationSummaryLocale
): string {
  const map = locale === "en" ? en : fr;
  return map[value] ?? value;
}

export type ClinicalDocumentationSummaryEntry = {
  payloadSummary?: ClinicalDocumentationPayloadSummaryLine[];
  payloadSummaryEn?: ClinicalDocumentationPayloadSummaryLine[];
  payloadSummaryFr?: ClinicalDocumentationPayloadSummaryLine[];
  cardTitleEn?: string;
  cardTitleFr?: string;
  cardId?: string;
  payloadJson?: Record<string, unknown>;
};

export function selectClinicalDocumentationCardTitle(
  entry: ClinicalDocumentationSummaryEntry,
  locale: ClinicalDocumentationSummaryLocale
): string {
  if (locale === "en") {
    return entry.cardTitleEn ?? entry.cardTitleFr ?? entry.cardId ?? "";
  }
  return entry.cardTitleFr ?? entry.cardTitleEn ?? entry.cardId ?? "";
}
