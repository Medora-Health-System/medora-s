import { pickProductUiCopy, UNLOCALIZED_CATALOG_SOURCE } from "../i18n/productUiLocale.js";
import { CLINICAL_DOC_SUMMARY_LABEL_ES } from "./clinicalDocumentationSummaryEs.js";
import { CLINICAL_DOCUMENTATION_CARD_DISPLAY_ES } from "./clinicalDocumentationCardDisplayEs.js";

export type ClinicalDocumentationSummaryLocale = string;

export type ClinicalDocumentationPayloadSummaryLine = {
  key: string;
  value: string;
};

export function clinicalDocYesNo(
  v: boolean,
  locale: ClinicalDocumentationSummaryLocale
): string {
  return pickProductUiCopy(
    locale,
    { en: v ? "Yes" : "No", fr: v ? "Oui" : "Non", es: v ? "Sí" : "No" },
    v ? "Sí" : "No"
  );
}

/** Payload summary chrome: EN/FR/ES explicit. ES never inherits FR. */
export function clinicalDocSummaryKey(
  locale: ClinicalDocumentationSummaryLocale,
  en: string,
  fr: string
): string {
  const es = CLINICAL_DOC_SUMMARY_LABEL_ES[en];
  return pickProductUiCopy(locale, { en, fr, es }, es ?? UNLOCALIZED_CATALOG_SOURCE);
}

export function pickLocalizedEnumLabel(
  en: Record<string, string>,
  fr: Record<string, string>,
  value: string,
  locale: ClinicalDocumentationSummaryLocale,
  es?: Record<string, string>
): string {
  const esLabel = es?.[value];
  const picked = pickProductUiCopy(
    locale,
    { en: en[value] ?? "", fr: fr[value] ?? "", es: esLabel },
    esLabel ?? value
  );
  return picked || value;
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
  const es = entry.cardId ? CLINICAL_DOCUMENTATION_CARD_DISPLAY_ES[entry.cardId]?.title : undefined;
  return (
    pickProductUiCopy(
      locale,
      { en: entry.cardTitleEn ?? "", fr: entry.cardTitleFr ?? "", es },
      es ?? entry.cardId ?? ""
    ) ||
    entry.cardId ||
    ""
  );
}

export function pickBilingualDisplayMap<T extends Record<string, string>>(
  locale: ClinicalDocumentationSummaryLocale,
  en: T,
  fr: T,
  es?: T
): T {
  const identity = Object.fromEntries(Object.keys(en).map((k) => [k, k])) as T;
  return pickProductUiCopy(locale, { en, fr, es }, es ?? identity);
}

export function clinicalDocCountItems(
  locale: ClinicalDocumentationSummaryLocale,
  count: number
): string {
  return pickProductUiCopy(
    locale,
    {
      en: `${count} item(s)`,
      fr: `${count} article(s)`,
      es: `${count} artículo(s)`,
    },
    `${count} artículo(s)`
  );
}

export function clinicalDocScoreValue(
  locale: ClinicalDocumentationSummaryLocale,
  score: number
): string {
  return pickProductUiCopy(
    locale,
    { en: `Score: ${score}`, fr: `Score : ${score}`, es: `Puntuación: ${score}` },
    `Puntuación: ${score}`
  );
}


export function clinicalDocVerificationStatus(
  locale: ClinicalDocumentationSummaryLocale,
  status: string | undefined
): string {
  if (status === "VERIFIED") return clinicalDocSummaryKey(locale, "Verified", "Vérifié");
  if (status === "DRAFT") return clinicalDocSummaryKey(locale, "Draft", "Brouillon");
  return clinicalDocSummaryKey(locale, "Pending witness", "Témoin en attente");
}
