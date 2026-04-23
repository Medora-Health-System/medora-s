/**
 * Normalizes API/proxy error strings for display.
 * Default locale is French (product default); pass `"en"` for English UI (e.g. auth screens).
 */

import type { SupportedLanguage } from "@/i18n/config";

/** Message FR normalisé pour `NotFoundException` consultation (ex. GET /encounters/:id). */
export const USER_FACING_ENCOUNTER_NOT_FOUND_FR = "Consultation introuvable.";

const ENCOUNTER_NOT_FOUND_EN = "Encounter not found.";

const RULES: Array<{ test: (s: string) => boolean; fr: string; en: string }> = [
  {
    test: (s) => /^\s*request failed\s*:\s*\d+\s*$/i.test(s),
    fr: "La requête a échoué. Réessayez.",
    en: "The request failed. Please try again.",
  },
  { test: (s) => /invalid payload/i.test(s), fr: "Données invalides.", en: "Invalid data." },
  { test: (s) => /^bad request$/i.test(s.trim()), fr: "Requête incorrecte.", en: "Bad request." },
  { test: (s) => /not authenticated/i.test(s), fr: "Non authentifié.", en: "Not signed in." },
  { test: (s) => /^unauthorized$/i.test(s.trim()), fr: "Accès non autorisé.", en: "Unauthorized." },
  {
    test: (s) => /authentication required/i.test(s),
    fr: "Authentification requise.",
    en: "Authentication required.",
  },
  { test: (s) => /^forbidden$/i.test(s.trim()), fr: "Accès refusé.", en: "Access denied." },
  {
    test: (s) => /not authorized for this department/i.test(s),
    fr: "Vous n'avez pas accès à ce département.",
    en: "You are not authorized for this department.",
  },
  {
    test: (s) => /dossier insuffisant pour validation mspp/i.test(s),
    fr: "Dossier insuffisant pour validation MSPP.",
    en: "Record insufficient for MSPP validation.",
  },
  {
    test: (s) => /encounter not found/i.test(s),
    fr: USER_FACING_ENCOUNTER_NOT_FOUND_FR,
    en: ENCOUNTER_NOT_FOUND_EN,
  },
  { test: (s) => /patient not found/i.test(s), fr: "Patient introuvable.", en: "Patient not found." },
  {
    test: (s) => /patient already has an open encounter/i.test(s),
    fr: "Une consultation est déjà ouverte pour ce patient. Fermez-la ou ouvrez-la avant d’en créer une nouvelle.",
    en: "This patient already has an open encounter. Close or open it before creating another.",
  },
  { test: (s) => /order not found/i.test(s), fr: "Ordre introuvable.", en: "Order not found." },
  {
    test: (s) => /not found/i.test(s) && !/introuvable/i.test(s),
    fr: "Ressource introuvable.",
    en: "Resource not found.",
  },
  {
    test: (s) => /internal server error/i.test(s),
    fr: "Erreur interne du serveur.",
    en: "Internal server error.",
  },
  {
    test: (s) => /erreur interne du serveur/i.test(s),
    fr: "Erreur interne du serveur.",
    en: "Internal server error.",
  },
  {
    test: (s) => /^request failed \(\d+\)\s*\.?\s*$/i.test(s.trim()),
    fr: "La requête a échoué.",
    en: "The request failed.",
  },
  { test: (s) => /facility id required/i.test(s), fr: "Établissement requis.", en: "Facility is required." },
  {
    test: (s) => /no facility selected/i.test(s),
    fr: "Aucun établissement sélectionné.",
    en: "No facility selected.",
  },
  {
    test: (s) => /proxy error/i.test(s),
    fr: "Erreur de communication avec le serveur.",
    en: "Could not reach the server.",
  },
  {
    test: (s) => /network error|failed to fetch|fetch failed|ecconnrefused|enotfound/i.test(s),
    fr: "Erreur de communication avec le serveur.",
    en: "Could not reach the server.",
  },
  {
    test: (s) => /invalid credentials/i.test(s),
    fr: "Identifiants invalides.",
    en: "Invalid sign-in credentials.",
  },
  {
    test: (s) => /payload too large|request entity too large|413/i.test(s),
    fr: "Requête trop volumineuse : réduisez la taille des fichiers ou contactez l’administrateur.",
    en: "Request too large: reduce file size or contact your administrator.",
  },
  {
    test: (s) => /can only create orders for open encounters/i.test(s),
    fr: "Impossible de créer un ordre : la consultation doit être ouverte.",
    en: "Orders can only be created for an open encounter.",
  },
  {
    test: (s) =>
      /ajoutez d'abord une assurance primaire|ajoutez d’abord une assurance primaire/i.test(s),
    fr: "Ajoutez d’abord une assurance primaire, puis l’assurance secondaire.",
    en: "Add primary insurance first, then secondary insurance.",
  },
  {
    test: (s) => /ce payeur est déjà utilisé sur l'autre rang|ce payeur est déjà utilisé sur l’autre rang/i.test(s),
    fr: "Ce payeur est déjà utilisé pour l’autre couverture (primaire ou secondaire).",
    en: "This payer is already used for the other coverage (primary or secondary).",
  },
  {
    test: (s) =>
      /ce nom de payeur libre est déjà utilisé sur l'autre rang|ce nom de payeur libre est déjà utilisé sur l’autre rang/i.test(s),
    fr: "Ce nom de payeur libre est déjà utilisé pour l’autre couverture.",
    en: "This free-text payer name is already used for the other coverage.",
  },
  {
    test: (s) => /payeur requis \(catalogue ou nom libre\)/i.test(s),
    fr: "Sélectionnez un payeur du catalogue ou saisissez un nom libre.",
    en: "Select a catalog payer or enter a free-text payer name.",
  },
  {
    test: (s) => /payeur invalide ou inactif/i.test(s),
    fr: "Payeur invalide ou inactif. Choisissez un autre payeur.",
    en: "Invalid or inactive payer. Choose another payer.",
  },
  {
    test: (s) => /ne pas combiner payeur catalogue et nom libre/i.test(s),
    fr: "Ne pas combiner payeur catalogue et nom libre : choisissez l’un ou l’autre.",
    en: "Do not combine catalog payer and free text — choose one or the other.",
  },
  {
    test: (s) =>
      /sélectionnez un payeur catalogue ou saisissez un nom libre avant les autres champs/i.test(s),
    fr: "Indiquez d’abord le payeur (catalogue ou nom libre) avant les autres champs.",
    en: "Enter the payer (catalog or free text) before the other fields.",
  },
  {
    test: (s) =>
      /La consultation doit être au stade .*Finalisé.*parcours.*avant clôture/i.test(s),
    fr: "La consultation doit être au stade « Finalisé » (parcours) avant clôture.",
    en: "The encounter must be in Finalized workflow state before closing.",
  },
  {
    test: (s) => /La documentation est incomplète/i.test(s),
    fr: "La documentation est incomplète. Indiquez acknowledgeDeficiencies: true pour clôturer malgré les lacunes, ou complétez la documentation.",
    en: "Documentation is incomplete. Confirm to close despite gaps, or complete the documentation.",
  },
  {
    test: (s) =>
      /billing capture cannot be edited while the encounter is finalized for billing/i.test(s),
    fr: "La saisie facturation ne peut pas être modifiée tant que la consultation est finalisée pour la facturation. Rouvrez la facturation pour modifier.",
    en: "Billing capture cannot be edited while the encounter is finalized for billing. Reopen billing to make changes.",
  },
  {
    test: (s) => /le parcours de cette consultation est terminé/i.test(s),
    fr: "Le parcours de cette consultation est terminé.",
    en: "This encounter's workflow is closed.",
  },
  {
    test: (s) => /encounter is not ready for billing finalization/i.test(s),
    fr: "La consultation n’est pas prête pour la finalisation facturation.",
    en: "This encounter is not ready for billing finalization.",
  },
  {
    test: (s) =>
      /billing events cannot be edited while the encounter is finalized for billing/i.test(s),
    fr: "Les lignes de facturation ne peuvent pas être modifiées tant que la consultation est finalisée pour la facturation. Rouvrez la facturation d’abord.",
    en: "Billing lines cannot be edited while the encounter is finalized for billing. Reopen billing first.",
  },
  {
    test: (s) =>
      /DIAGNOSIS_INVALID_ICD_FORMAT/i.test(s) ||
      /ICD-10-CM-like format/i.test(s) ||
      /letter \+ two digits \+ optional extension/i.test(s),
    fr: "Le code saisi ne respecte pas le format CIM-10 attendu (ex. I10 ou J069). Corrigez ou choisissez une entrée du référentiel.",
    en: "That code does not match the expected ICD-10-style pattern (e.g. I10 or J069). Fix it or pick a catalog entry.",
  },
];

/**
 * Si le message est déjà principalement français (heuristique simple), le renvoie tel quel.
 * Sinon tente les règles ci-dessus ; en dernier recours renvoie un message générique.
 */
/** Retourne une chaîne vide si `message` est vide, pour permettre `normalize(x) || « repli »`. */
export function normalizeUserFacingError(
  message: string | undefined | null,
  locale: SupportedLanguage = "fr"
): string {
  if (message == null) return "";
  const s = String(message).trim();
  if (!s) return "";

  // Known API messages first so English UI does not show raw French from the server.
  for (const { test, fr, en } of RULES) {
    if (test(s)) return locale === "en" ? en : fr;
  }

  // Déjà du français probable : accents ou mots courts typiques (FR locale only — EN falls through)
  if (locale === "fr") {
    if (/[àâäéèêëïîôùûçœæ]/i.test(s)) return s;
    if (/^(impossible|veuillez|la |le |les |une |un |des |erreur|accès|établissement|données)/i.test(s))
      return s;
  }

  // Phrases anglaises courantes (Nest / HTTP)
  if (/^invalid/i.test(s)) return locale === "en" ? "Invalid data." : "Données invalides.";
  if (/^failed\b/i.test(s))
    return locale === "en"
      ? "The operation failed. Please try again."
      : "L'opération a échoué. Réessayez.";
  if (/server error/i.test(s)) return locale === "en" ? "Server error." : "Erreur serveur.";

  return locale === "en" ? "Something went wrong." : "Une erreur est survenue.";
}

/** Quand aucun message exploitable n’est disponible. */
export function genericUserFacingError(): string {
  return "Une erreur s'est produite.";
}

/** Erreur API « ordre uniquement si consultation ouverte » (message brut EN ou déjà normalisé FR). */
export function isEncounterMustBeOpenForOrderError(message: string | undefined | null): boolean {
  if (message == null) return false;
  const s = String(message);
  return (
    /can only create orders for open encounters/i.test(s) ||
    /consultation doit être ouverte/i.test(s)
  );
}
