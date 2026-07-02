import { extractApiErrorMeta } from "@/lib/apiClient";
import type { SupportedLanguage } from "@/i18n/config";

const ORDER_CREATE_ERROR_RULES: Array<{
  test: (message: string) => boolean;
  en: string;
  fr: string;
}> = [
  {
    test: (message) => /catalogue ou un libellé manuel/i.test(message),
    en: "Each line must reference the catalog or include a manual label.",
    fr: "Chaque ligne doit référencer le catalogue ou un libellé manuel.",
  },
  {
    test: (message) => /combiner catalogue et libellé manuel/i.test(message),
    en: "Do not combine catalog and manual label on the same line.",
    fr: "Ne pas combiner catalogue et libellé manuel sur la même ligne.",
  },
  {
    test: (message) => /Invalid uuid/i.test(message),
    en: "A catalog line is missing a valid catalog item id.",
    fr: "Une ligne catalogue n'a pas d'identifiant catalogue valide.",
  },
  {
    test: (message) => /ligne catalogue identique est déjà en cours/i.test(message),
    en: "An identical catalog line is already active for this encounter.",
    fr: "Une ligne catalogue identique est déjà en cours pour cette consultation.",
  },
  {
    test: (message) => /Plusieurs lignes identiques au catalogue/i.test(message),
    en: "Duplicate catalog lines are not allowed in the same order.",
    fr: "Plusieurs lignes identiques au catalogue ne sont pas autorisées dans la même commande.",
  },
  {
    test: (message) => /Verbal order attestation is required/i.test(message),
    en: "Verbal order attestation is required for RN standing orders.",
    fr: "L'attestation d'ordre verbal est requise pour les ordres permanents infirmiers.",
  },
  {
    test: (message) => /Invalid verbal order attestation/i.test(message),
    en: "Verbal order attestation is incomplete or invalid.",
    fr: "L'attestation d'ordre verbal est incomplète ou invalide.",
  },
  {
    test: (message) => /Verbal order provider is required/i.test(message),
    en: "Verbal order provider is required.",
    fr: "Le médecin prescripteur de l'ordre verbal est requis.",
  },
  {
    test: (message) => /Enterprise order set provenance/i.test(message),
    en: "Order set metadata could not be validated for this submit.",
    fr: "Les métadonnées du protocole n'ont pas pu être validées pour cet envoi.",
  },
  {
    test: (message) => /Placed item/i.test(message),
    en: "Order set staged items did not match the server registry.",
    fr: "Les éléments préparés du protocole ne correspondent pas au registre serveur.",
  },
  {
    test: (message) => /Données invalides/i.test(message),
    en: "Invalid order data.",
    fr: "Données invalides.",
  },
];

export function extractRawOrderCreateErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === "object") {
      const extracted = extractApiErrorMeta(body as Parameters<typeof extractApiErrorMeta>[0]);
      if (extracted.message.trim()) {
        return extracted.message.trim();
      }
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  return "";
}

export function translateOrderCreateMessage(message: string, language: SupportedLanguage): string {
  const trimmed = message.trim();
  if (!trimmed) return "";

  for (const rule of ORDER_CREATE_ERROR_RULES) {
    if (rule.test(trimmed)) {
      return language === "en" ? rule.en : rule.fr;
    }
  }

  if (language === "en" && !/[^\x00-\x7F]/.test(trimmed)) {
    return trimmed;
  }

  if (language === "fr") {
    return trimmed;
  }

  return trimmed;
}

export function mapOrderCreateApiError(
  err: unknown,
  t: (key: string) => string,
  language: SupportedLanguage
): string {
  const raw = extractRawOrderCreateErrorMessage(err);
  if (raw) {
    return translateOrderCreateMessage(raw, language);
  }

  return t("createOrderModal.mapOrderCreateError");
}
