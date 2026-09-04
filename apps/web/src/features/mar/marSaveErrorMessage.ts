import { pickProductUiCopy, type SupportedLanguage } from "@/i18n/config";
import { extractApiErrorMeta } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { resolveMedicationInfusionErrorMessage } from "@/features/mar/marInfusionErrorMessage";
import { resolveMarEffectiveTimeErrorMessage } from "@/features/mar/marEffectiveTimeErrorMessage";
import { resolveMarSafetyGovernanceErrorMessage } from "@/features/mar/marSafetyGovernanceErrorMessage";

const GENERIC_EN = "Something went wrong.";
const GENERIC_FR = "Une erreur est survenue.";
const GENERIC_ES = "Ocurrió un error.";

function genericCopy(language: string): string {
  return pickProductUiCopy(language, { en: GENERIC_EN, fr: GENERIC_FR, es: GENERIC_ES }, GENERIC_ES);
}

function looksLikeFrenchUserFacingMessage(message: string): boolean {
  return /^(aucune|impossible|ligne|veuillez|horodatage|la perfusion|perfusion|un motif|une |le motif|l'heure|l'ajustement|seules les)/i.test(
    message.trim()
  );
}

/** Surfaces Nest validation messages in the MAR modal (avoids generic fallback). */
export function extractMarSaveErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  fallback: string,
  t?: (key: string) => string
): string {
  const infusionMsg = resolveMedicationInfusionErrorMessage(err, language, t);
  if (infusionMsg) return infusionMsg;

  const safetyGovernanceMsg = resolveMarSafetyGovernanceErrorMessage(err, language, t);
  if (safetyGovernanceMsg) return safetyGovernanceMsg;

  const effectiveTimeMsg = resolveMarEffectiveTimeErrorMessage(err, language, t);
  if (effectiveTimeMsg) return effectiveTimeMsg;

  const apiErr = err as Error & { body?: unknown; message?: string };

  if (apiErr.body && typeof apiErr.body === "object" && !Array.isArray(apiErr.body)) {
    const extracted = extractApiErrorMeta(
      apiErr.body as Parameters<typeof extractApiErrorMeta>[0]
    );
    if (extracted.message.trim()) {
      const normalized = normalizeUserFacingError(extracted.message, language);
      if (
        normalized &&
        normalized !== genericCopy(language) &&
        !(language === "en" && looksLikeFrenchUserFacingMessage(normalized))
      ) {
        return normalized;
      }
      if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(extracted.message)) {
        return extracted.message;
      }
      if (
        language === "en" &&
        extracted.message.length <= 500 &&
        !/[^\x00-\x7F]/.test(extracted.message) &&
        !looksLikeFrenchUserFacingMessage(extracted.message)
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
  if (
    normalized &&
    normalized !== genericCopy(language) &&
    !(language === "en" && looksLikeFrenchUserFacingMessage(normalized))
  ) {
    return normalized;
  }
  if (language === "fr" && /[àâäéèêëïîôùûçœæ]/i.test(stripped)) return stripped;
  if (
    language === "en" &&
    stripped.length >= 3 &&
    stripped.length <= 500 &&
    !/[^\x00-\x7F]/.test(stripped) &&
    !looksLikeFrenchUserFacingMessage(stripped)
  ) {
    return stripped;
  }
  return fallback;
}
