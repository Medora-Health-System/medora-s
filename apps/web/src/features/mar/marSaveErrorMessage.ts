import type { SupportedLanguage } from "@/i18n/config";
import { extractApiErrorMeta } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { resolveMedicationInfusionErrorMessage } from "@/features/mar/marInfusionErrorMessage";

const GENERIC_EN = "Something went wrong.";
const GENERIC_FR = "Une erreur est survenue.";

/** Surfaces Nest validation messages in the MAR modal (avoids generic fallback). */
export function extractMarSaveErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  fallback: string,
  t?: (key: string) => string
): string {
  const infusionMsg = resolveMedicationInfusionErrorMessage(err, language, t);
  if (infusionMsg) return infusionMsg;

  const apiErr = err as Error & { body?: unknown; message?: string };

  if (apiErr.body && typeof apiErr.body === "object" && !Array.isArray(apiErr.body)) {
    const extracted = extractApiErrorMeta(
      apiErr.body as Parameters<typeof extractApiErrorMeta>[0]
    );
    if (extracted.message.trim()) {
      const normalized = normalizeUserFacingError(extracted.message, language);
      if (normalized && normalized !== (language === "en" ? GENERIC_EN : GENERIC_FR)) {
        return normalized;
      }
      if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(extracted.message)) {
        return extracted.message;
      }
      if (
        language === "en" &&
        extracted.message.length <= 500 &&
        !/[^\x00-\x7F]/.test(extracted.message) &&
        !/^(aucune|impossible|ligne|veuillez|horodatage|la perfusion|perfusion)/i.test(extracted.message)
      ) {
        return extracted.message;
      }
    }
  }

  const raw = err instanceof Error ? err.message : "";
  const stripped = raw.replace(/\s*\([A-Z0-9_]+\)\s*$/, "").trim();
  if (/\.json is not a function/i.test(stripped) || /is not a function.*\.json/i.test(stripped)) {
    return fallback;
  }
  const normalized = normalizeUserFacingError(stripped || null, language);
  if (normalized && normalized !== (language === "en" ? GENERIC_EN : GENERIC_FR)) {
    return normalized;
  }
  if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(stripped)) return stripped;
  if (
    language === "en" &&
    stripped.length >= 3 &&
    stripped.length <= 500 &&
    !/[^\x00-\x7F]/.test(stripped) &&
    !/^(aucune|impossible|ligne|veuillez|horodatage|la perfusion|perfusion)/i.test(stripped)
  ) {
    return stripped;
  }
  return fallback;
}
