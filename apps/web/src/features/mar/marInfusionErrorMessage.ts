import {
  isMedicationInfusionErrorCode,
  MEDICATION_INFUSION_ERROR_MESSAGES_FR,
  type MedicationInfusionErrorCode,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";

const INFUSION_ERROR_I18N_PREFIX = "marShiftTimeline.infusionErrors.";

/** English fallbacks when i18n `t()` is unavailable (tests). */
const MEDICATION_INFUSION_ERROR_MESSAGES_EN: Record<MedicationInfusionErrorCode, string> = {
  NO_ACTIVE_INFUSION: "No active infusion was found for this medication.",
  STOP_BEFORE_START: "Stop time cannot be before start time.",
  INFUSION_ALREADY_STOPPED: "Infusion is already stopped for this line.",
  INVALID_STOP_TIME: "Invalid stop time.",
  INVALID_START_TIME: "Invalid infusion start time.",
  INFUSION_NOT_ELIGIBLE:
    "This line is not eligible for infusion (route / label). Use routine bedside administration.",
  ORDER_LINE_TERMINAL: "Order line is already completed or cancelled.",
  INFUSION_STOP_REASON_REQUIRED: "A structured infusion stop reason is required.",
  INVALID_INFUSION_STOP_REASON: "Invalid infusion stop reason.",
};

export function extractApiErrorCode(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  const raw = o.errorCode ?? o.code;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function extractApiErrorCodeFromError(err: unknown): string | null {
  const apiErr = err as Error & { body?: unknown; errorCode?: string };
  if (typeof apiErr.errorCode === "string" && apiErr.errorCode.trim()) {
    return apiErr.errorCode.trim();
  }
  return extractApiErrorCode(apiErr.body);
}

export function infusionErrorMessageForCode(
  code: MedicationInfusionErrorCode,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  if (t) {
    const key = `${INFUSION_ERROR_I18N_PREFIX}${code}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return language === "en"
    ? MEDICATION_INFUSION_ERROR_MESSAGES_EN[code]
    : MEDICATION_INFUSION_ERROR_MESSAGES_FR[code];
}

/** Maps structured infusion API errors to locale-appropriate UI copy. */
export function resolveMedicationInfusionErrorMessage(
  err: unknown,
  language: SupportedLanguage,
  t?: (key: string) => string
): string | null {
  const code = extractApiErrorCodeFromError(err);
  if (!code || !isMedicationInfusionErrorCode(code)) return null;
  return infusionErrorMessageForCode(code, language, t);
}
