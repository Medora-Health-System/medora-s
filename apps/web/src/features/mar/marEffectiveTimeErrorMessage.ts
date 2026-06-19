import type { SupportedLanguage } from "@/i18n/config";
import {
  extractApiErrorCodeFromError,
  extractApiErrorCode,
} from "@/features/mar/marInfusionErrorMessage";

export const MAR_EFFECTIVE_TIME_ERROR_CODES = [
  "MAR_EFFECTIVE_TIME_FUTURE",
  "MAR_EFFECTIVE_TIME_BEFORE_ENCOUNTER",
  "MAR_EFFECTIVE_TIME_REASON_REQUIRED",
  "MAR_EFFECTIVE_TIME_REASON_TOO_SHORT",
  "MAR_EFFECTIVE_TIME_INVALID",
  "MAR_EFFECTIVE_TIME_NOT_ADMINISTERED",
  "MAR_EFFECTIVE_TIME_INFUSION_DEFERRED",
  "MAR_EFFECTIVE_TIME_PENDING_SYNC",
  "MAR_EFFECTIVE_TIME_REJECTED",
] as const;

export type MarEffectiveTimeErrorCode = (typeof MAR_EFFECTIVE_TIME_ERROR_CODES)[number];

const MAR_EFFECTIVE_TIME_ERROR_I18N_PREFIX = "marTab.adminTime.apiErrors.";

const MAR_EFFECTIVE_TIME_ERROR_MESSAGES_EN: Record<MarEffectiveTimeErrorCode, string> = {
  MAR_EFFECTIVE_TIME_FUTURE: "Administration time cannot be in the future.",
  MAR_EFFECTIVE_TIME_BEFORE_ENCOUNTER: "Administration time cannot be before the encounter started.",
  MAR_EFFECTIVE_TIME_REASON_REQUIRED: "A reason is required for this time adjustment.",
  MAR_EFFECTIVE_TIME_REASON_TOO_SHORT:
    "A detailed reason is required for large retroactive time corrections.",
  MAR_EFFECTIVE_TIME_INVALID: "Invalid timestamp.",
  MAR_EFFECTIVE_TIME_NOT_ADMINISTERED: "Only documented administrations can have time adjusted.",
  MAR_EFFECTIVE_TIME_INFUSION_DEFERRED: "Time adjustment for IV infusions is not available yet.",
  MAR_EFFECTIVE_TIME_PENDING_SYNC: "Time adjustment is not available while sync is pending.",
  MAR_EFFECTIVE_TIME_REJECTED: "Effective time adjustment rejected.",
};

const MAR_EFFECTIVE_TIME_ERROR_MESSAGES_FR: Record<MarEffectiveTimeErrorCode, string> = {
  MAR_EFFECTIVE_TIME_FUTURE: "L'heure d'administration ne peut pas être dans le futur.",
  MAR_EFFECTIVE_TIME_BEFORE_ENCOUNTER:
    "L'heure d'administration ne peut pas précéder le début de la consultation.",
  MAR_EFFECTIVE_TIME_REASON_REQUIRED: "Un motif est requis pour cet ajustement d'heure.",
  MAR_EFFECTIVE_TIME_REASON_TOO_SHORT:
    "Un motif détaillé est requis pour les corrections d'heure importantes.",
  MAR_EFFECTIVE_TIME_INVALID: "Horodatage invalide.",
  MAR_EFFECTIVE_TIME_NOT_ADMINISTERED:
    "Seules les administrations documentées (administré) peuvent être ajustées.",
  MAR_EFFECTIVE_TIME_INFUSION_DEFERRED:
    "L'ajustement d'heure pour les perfusions IV n'est pas disponible pour l'instant.",
  MAR_EFFECTIVE_TIME_PENDING_SYNC:
    "L'ajustement d'heure n'est pas disponible pendant la synchronisation.",
  MAR_EFFECTIVE_TIME_REJECTED: "Ajustement d'heure refusé.",
};

export function isMarEffectiveTimeErrorCode(code: string): code is MarEffectiveTimeErrorCode {
  return (MAR_EFFECTIVE_TIME_ERROR_CODES as readonly string[]).includes(code);
}

export function marEffectiveTimeErrorMessageForCode(
  code: MarEffectiveTimeErrorCode,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  if (t) {
    const key = `${MAR_EFFECTIVE_TIME_ERROR_I18N_PREFIX}${code}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return language === "en"
    ? MAR_EFFECTIVE_TIME_ERROR_MESSAGES_EN[code]
    : MAR_EFFECTIVE_TIME_ERROR_MESSAGES_FR[code];
}

/** Maps structured MAR effective-time API errors to locale-appropriate UI copy. */
export function resolveMarEffectiveTimeErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  t?: (key: string) => string
): string | null {
  const code = extractApiErrorCodeFromError(err);
  if (!code || !isMarEffectiveTimeErrorCode(code)) return null;
  return marEffectiveTimeErrorMessageForCode(code, language, t);
}

export { extractApiErrorCode };
