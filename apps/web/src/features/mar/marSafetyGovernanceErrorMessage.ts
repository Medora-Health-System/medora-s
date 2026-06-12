import type { SupportedLanguage } from "@/i18n/config";
import {
  extractApiErrorCodeFromError,
  extractApiErrorCode,
} from "@/features/mar/marInfusionErrorMessage";

export const MAR_SAFETY_GOVERNANCE_ERROR_CODES = [
  "MAR_EARLY_ADMIN_REASON_REQUIRED",
  "MAR_LATE_ADMIN_REASON_REQUIRED",
  "MAR_MISSED_REASON_REQUIRED",
] as const;

export type MarSafetyGovernanceErrorCode = (typeof MAR_SAFETY_GOVERNANCE_ERROR_CODES)[number];

const MAR_SAFETY_GOVERNANCE_ERROR_I18N_PREFIX = "marShiftTimeline.safetyGovernanceErrors.";

const MAR_SAFETY_GOVERNANCE_ERROR_MESSAGES_EN: Record<MarSafetyGovernanceErrorCode, string> = {
  MAR_EARLY_ADMIN_REASON_REQUIRED: "Early administration requires a reason.",
  MAR_LATE_ADMIN_REASON_REQUIRED: "Late administration requires a reason.",
  MAR_MISSED_REASON_REQUIRED: "Missed dose requires a reason.",
};

const MAR_SAFETY_GOVERNANCE_ERROR_MESSAGES_FR: Record<MarSafetyGovernanceErrorCode, string> = {
  MAR_EARLY_ADMIN_REASON_REQUIRED: "Une administration anticipée nécessite un motif.",
  MAR_LATE_ADMIN_REASON_REQUIRED: "Une administration tardive nécessite un motif.",
  MAR_MISSED_REASON_REQUIRED: "Une dose manquée nécessite un motif.",
};

export function isMarSafetyGovernanceErrorCode(code: string): code is MarSafetyGovernanceErrorCode {
  return (MAR_SAFETY_GOVERNANCE_ERROR_CODES as readonly string[]).includes(code);
}

export function marSafetyGovernanceErrorMessageForCode(
  code: MarSafetyGovernanceErrorCode,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  if (t) {
    const key = `${MAR_SAFETY_GOVERNANCE_ERROR_I18N_PREFIX}${code}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return language === "en"
    ? MAR_SAFETY_GOVERNANCE_ERROR_MESSAGES_EN[code]
    : MAR_SAFETY_GOVERNANCE_ERROR_MESSAGES_FR[code];
}

/** Maps structured MAR safety governance API errors to locale-appropriate UI copy. */
export function resolveMarSafetyGovernanceErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  t?: (key: string) => string
): string | null {
  const code = extractApiErrorCodeFromError(err);
  if (!code || !isMarSafetyGovernanceErrorCode(code)) return null;
  return marSafetyGovernanceErrorMessageForCode(code, language, t);
}

export { extractApiErrorCode };
