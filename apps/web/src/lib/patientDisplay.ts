import { getPatientSexLabelFr, ui } from "@/lib/uiLabels";

/**
 * Âge calculé à partir de la date de naissance — non persisté en base.
 * (Formule alignée produit : différence / année moyenne.)
 */
export function calculateAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function formatAgeFr(dob: string | null | undefined): string {
  if (!dob) return ui.common.dash;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return ui.common.dash;
  const now = new Date();
  if (birth.getTime() > now.getTime()) return ui.common.dash;

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

export function sexLabelFr(code: string | null | undefined): string {
  return getPatientSexLabelFr(undefined, code);
}

/** Affichage sexe dossier : `sex` (enum API) + repli `sexAtBirth`. */
export function patientSexDisplayFr(
  sex: string | null | undefined,
  sexAtBirth: string | null | undefined
): string {
  return getPatientSexLabelFr(sex, sexAtBirth);
}

/** @deprecated Utiliser `formatAgeYearsSexFr` — alias pour compatibilité. */
export function sexLabelEnglish(code: string | null | undefined): string {
  return sexLabelFr(code);
}

/** Affichage âge + sexe, ex. « 34 ans • Femme » (âge toujours calculé, jamais lu depuis la DB). */
export function formatAgeYearsSexFr(
  dob: string | null | undefined,
  sexAtBirth: string | null | undefined,
  sex?: string | null | undefined
): string {
  if (!dob) return ui.common.dash;
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return ui.common.dash;
  const age = calculateAge(dob);
  if (!Number.isFinite(age) || age < 0) return ui.common.dash;
  return `${age} ans • ${getPatientSexLabelFr(sex, sexAtBirth)}`;
}

/** @deprecated Utiliser `formatAgeYearsSexFr`. */
export function formatAgeYearsSexEnglish(
  dob: string | null | undefined,
  sexAtBirth: string | null | undefined,
  sex?: string | null | undefined
): string {
  return formatAgeYearsSexFr(dob, sexAtBirth, sex);
}
