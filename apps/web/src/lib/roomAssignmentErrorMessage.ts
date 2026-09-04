import { pickProductUiCopy, type SupportedLanguage } from "@/i18n/config";
import { extractApiErrorMeta } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const GENERIC_EN = "Something went wrong.";
const GENERIC_FR = "Une erreur est survenue.";
const GENERIC_ES = "Ocurrió un error.";

function genericCopy(language: string): string {
  return pickProductUiCopy(language, { en: GENERIC_EN, fr: GENERIC_FR, es: GENERIC_ES }, GENERIC_ES);
}

/** Surfaces Nest/API room-assignment errors in the modal (K.10B.10A). */
export function extractRoomAssignmentSaveErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  fallback: string
): string {
  const apiErr = err as Error & { body?: unknown; message?: string };

  if (apiErr.body && typeof apiErr.body === "object" && !Array.isArray(apiErr.body)) {
    const extracted = extractApiErrorMeta(
      apiErr.body as Parameters<typeof extractApiErrorMeta>[0]
    );
    if (extracted.message.trim()) {
      const normalized = normalizeUserFacingError(extracted.message, language);
      if (normalized && normalized !== genericCopy(language)) {
        return normalized;
      }
      if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(extracted.message)) {
        return extracted.message;
      }
      if (
        language === "en" &&
        extracted.message.length <= 500 &&
        !/[^\x00-\x7F]/.test(extracted.message)
      ) {
        return extracted.message;
      }
    }
  }

  const raw = err instanceof Error ? err.message : "";
  const normalized = normalizeUserFacingError(raw || null, language);
  if (normalized && normalized !== genericCopy(language)) {
    return normalized;
  }
  if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(raw)) return raw;
  if (
    language === "en" &&
    raw.length >= 3 &&
    raw.length <= 500 &&
    !/[^\x00-\x7F]/.test(raw)
  ) {
    return raw;
  }
  return fallback;
}
