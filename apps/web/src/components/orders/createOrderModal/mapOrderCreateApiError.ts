import { extractApiErrorMeta } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
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
    test: (message) => /Plusieurs lignes identiques au catalogue/i.test(message),
    en: "Duplicate catalog lines are not allowed in the same order.",
    fr: "Plusieurs lignes identiques au catalogue ne sont pas autorisées dans la même commande.",
  },
];

function translateOrderCreateMessage(message: string, language: SupportedLanguage): string {
  for (const rule of ORDER_CREATE_ERROR_RULES) {
    if (rule.test(message)) {
      return language === "en" ? rule.en : rule.fr;
    }
  }
  return normalizeUserFacingError(message, language) || message;
}

export function mapOrderCreateApiError(
  err: unknown,
  t: (key: string) => string,
  language: SupportedLanguage
): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === "object") {
      const extracted = extractApiErrorMeta(body as Parameters<typeof extractApiErrorMeta>[0]);
      if (extracted.message.trim()) {
        return translateOrderCreateMessage(extracted.message.trim(), language);
      }
    }
  }

  const msg = err instanceof Error ? err.message : "";
  if (msg.trim()) {
    return translateOrderCreateMessage(msg.trim(), language);
  }

  return t("createOrderModal.mapOrderCreateError");
}
