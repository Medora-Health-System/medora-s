import type { SupportedLanguage } from "@/i18n/config";
import { formatPatientAgeSexLine, tPatientSex } from "@/lib/encounterChromeI18n";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

/** Fallback display when age/identifier is unavailable (matches `common.dash` in i18n). */
export const DISPLAY_DASH = "—";

/**
 * Âge calculé à partir de la date de naissance — non persisté en base.
 * (Formule alignée produit : différence / année moyenne.)
 */
export function calculateAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function formatAgeFr(dob: string | null | undefined): string {
  if (!dob) return DISPLAY_DASH;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return DISPLAY_DASH;
  const now = new Date();
  if (birth.getTime() > now.getTime()) return DISPLAY_DASH;

  const years = calculateAge(dob);
  if (years >= 1) return `${years} an${years > 1 ? "s" : ""}`;

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (months >= 1) return `${months} mois`;

  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
  return `${days} jour${days > 1 ? "s" : ""}`;
}

/**
 * Age-only line for forms (locale via `t()`). Prefer over `formatAgeFr` in UI with i18n.
 */
export function formatPatientAgeOnlyLine(
  dob: string | null | undefined,
  t: (key: string) => string
): string {
  const dash = t("common.dash");
  if (!dob) return dash;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return dash;
  const now = new Date();
  if (birth.getTime() > now.getTime()) return dash;

  const years = calculateAge(dob);
  if (years >= 1) {
    return `${years} ${t("encounterChrome.ageYearsSuffix")}`;
  }

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (months >= 1) {
    const unit =
      months === 1 ? t("patientsListPage.ageMonthLabel") : t("patientsListPage.ageMonthsLabel");
    return `${months} ${unit}`;
  }

  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
  const dayUnit =
    days === 1 ? t("patientsListPage.ageDayLabel") : t("patientsListPage.ageDaysLabel");
  return `${days} ${dayUnit}`;
}

export function sexLabelFr(code: string | null | undefined): string {
  return patientSexDisplayFr(undefined, code);
}

/** Affichage sexe dossier : `sex` (enum API) + repli `sexAtBirth` (messages FR via i18n). */
export function patientSexDisplayFr(
  sex: string | null | undefined,
  sexAtBirth: string | null | undefined
): string {
  const t = (k: string) => i18nMessage("fr", k);
  return tPatientSex(sex, sexAtBirth, t);
}

/** @deprecated Utiliser `formatAgeYearsSexForLocale` — alias pour compatibilité. */
export function sexLabelEnglish(code: string | null | undefined): string {
  return sexLabelFr(code);
}

/** Affichage âge + sexe selon la langue de l’établissement. */
export function formatAgeYearsSexForLocale(
  dob: string | null | undefined,
  sexAtBirth: string | null | undefined,
  sex: string | null | undefined,
  locale: SupportedLanguage
): string {
  const t = (k: string) => i18nMessage(locale, k);
  return formatPatientAgeSexLine(dob, sexAtBirth, sex, t);
}

/** @deprecated Utiliser `formatAgeYearsSexForLocale`. */
export function formatAgeYearsSexEnglish(
  dob: string | null | undefined,
  sexAtBirth: string | null | undefined,
  sex?: string | null | undefined
): string {
  return formatAgeYearsSexForLocale(dob, sexAtBirth, sex ?? null, "en");
}

/** Standard UUID v4 pattern — hide as user-facing primary identifier when no better label exists. */
const UUID_V4_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FormatPrimaryIdentifierOptions = {
  /**
   * When true, UUID-shaped dossier numbers are shown (operational MSPP / surveillance views).
   * Default false keeps legacy behavior for general UI where a UUID is not a meaningful human identifier.
   */
  allowUuidLike?: boolean;
};

/**
 * Returns the value for display in patient identifier columns, or null if empty or UUID-shaped
 * (e.g. fallback global dossier number stored as UUID).
 */
export function formatPrimaryIdentifierForDisplay(
  value: string | null | undefined,
  options?: FormatPrimaryIdentifierOptions
): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (!options?.allowUuidLike && UUID_V4_LIKE.test(v)) return null;
  return v;
}
