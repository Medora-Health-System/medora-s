import type { SupportedLanguage } from "@/i18n/config";
import { formatApiErrorJson } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const GENERIC_EN = "Something went wrong.";
const GENERIC_FR = "Une erreur est survenue.";

/** Surfaces Nest validation messages in the MAR modal (avoids generic fallback). */
export function extractMarSaveErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  fallback: string
): string {
  const apiErr = err as Error & { body?: unknown; message?: string };

  if (apiErr.body && typeof apiErr.body === "object" && !Array.isArray(apiErr.body)) {
    const extracted = formatApiErrorJson(
      apiErr.body as Parameters<typeof formatApiErrorJson>[0]
    );
    if (extracted.trim()) {
      const normalized = normalizeUserFacingError(extracted, language);
      if (normalized && normalized !== (language === "en" ? GENERIC_EN : GENERIC_FR)) {
        return normalized;
      }
      if (/[àâäéèêëïîôùûçœæ]/i.test(extracted)) return extracted;
      if (language === "en" && extracted.length <= 500) return extracted;
      if (extracted.length >= 3 && extracted.length <= 500) return extracted;
    }
  }

  const raw = err instanceof Error ? err.message : "";
  const stripped = raw.replace(/\s*\([A-Z0-9_]+\)\s*$/, "").trim();
  const normalized = normalizeUserFacingError(stripped || null, language);
  if (normalized && normalized !== (language === "en" ? GENERIC_EN : GENERIC_FR)) {
    return normalized;
  }
  if (/[àâäéèêëïîôùûçœæ]/i.test(stripped)) return stripped;
  if (stripped.length >= 3 && stripped.length <= 500) return stripped;
  return fallback;
}
