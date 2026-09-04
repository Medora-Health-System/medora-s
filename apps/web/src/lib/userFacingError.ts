/**
 * Normalizes API/proxy error strings for display.
 * Copy is keyed by product UI locale — never `en ? en : fr`.
 */

import type { ProductUiLanguage } from "@/i18n/config";
import { parseProductUiLanguage, pickProductUiCopy } from "@medora/shared";

/** Message FR normalisé pour `NotFoundException` consultation (ex. GET /encounters/:id). */
export const USER_FACING_ENCOUNTER_NOT_FOUND_FR = "Consultation introuvable.";

const ENCOUNTER_NOT_FOUND_EN = "Encounter not found.";
const ENCOUNTER_NOT_FOUND_ES = "Encuentro no encontrado.";
const ES_GENERIC = "Ocurrió un error.";

type LocaleErrorCopy = { en: string; fr: string; es?: string };

const RULES: Array<{ test: (s: string) => boolean } & LocaleErrorCopy> = [
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
  {
    test: (s) => /réponse json invalide/i.test(s),
    fr: "Réponse JSON invalide du serveur.",
    en: "Invalid JSON response from the server.",
  },
  {
    test: (s) => /payload trop volumineux/i.test(s),
    fr: "Fichier ou texte trop volumineux. Réduisez la taille ou contactez l’administrateur.",
    en: "Payload too large. Reduce file or text size, or contact your administrator.",
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
    es: ENCOUNTER_NOT_FOUND_ES,
  },
  { test: (s) => /patient not found/i.test(s), fr: "Patient introuvable.", en: "Patient not found." },
  {
    test: (s) =>
      /duplicate_active_service_encounter|an active encounter already exists for this patient in a compatible care context/i.test(
        s
      ),
    fr: "Une rencontre active existe déjà pour ce contexte de soins. Ouvrez la rencontre existante.",
    en: "An active encounter already exists for this care context. Open the existing encounter.",
  },
  {
    test: (s) => /patient already has an open encounter/i.test(s),
    fr: "Une rencontre active existe déjà pour ce patient dans un contexte compatible. Ouvrez-la plutôt que d’en créer une autre.",
    en: "An active encounter already exists for this patient in a compatible care context. Open it instead of creating another.",
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
    test: (s) => /PILOT_MEDICATION_ORDER_BLOCKED|médicament pilote|pilot medication/i.test(s),
    fr: "Ce médicament pilote n'est pas disponible pour ce prescripteur ou cet établissement.",
    en: "This pilot medication is not available for this provider or facility.",
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
  {
    test: (s) => /PROCEDURE_INVALID_CODE_FORMAT/i.test(s),
    fr: "Le code d’acte ne correspond pas au format CPT/HCPCS attendu. Corrigez ou choisissez une entrée du référentiel.",
    en: "That procedure code does not match the expected CPT/HCPCS-style pattern. Fix it or pick a catalog entry.",
  },
  {
    test: (s) => /PROCEDURE_DUPLICATE_BLOCKED/i.test(s),
    fr: "Cet acte est déjà enregistré pour cette consultation.",
    en: "This procedure is already recorded for this encounter.",
  },
  {
    test: (s) =>
      /Observation reassessment is only available|not available for an open observation/i.test(s),
    fr: "La réévaluation observation n'est pas disponible pour cet état de dossier (admission ou dossier incomplet).",
    en: "Observation reassessment is not available for this encounter state.",
  },
  {
    test: (s) => /Réévaluation observation\s*:/i.test(s) || /dossier d'admission doit indiquer observation/i.test(s),
    fr: "La réévaluation observation nécessite un dossier d'admission indiquant observation ou court séjour.",
    en: "Observation reassessment requires an active observation or short-stay stay.",
  },
  {
    test: (s) => /INVALID_NDC_FORMAT/i.test(s),
    fr: "Le format NDC est invalide. Utilisez 11 chiffres ou un format avec tirets.",
    en: "Invalid NDC format. Use 11 digits or a supported dashed format.",
  },
];

/**
 * Si le message est déjà principalement français (heuristique simple), le renvoie tel quel.
 * Sinon tente les règles ci-dessus ; en dernier recours renvoie un message générique.
 */
/** Retourne une chaîne vide si `message` est vide, pour permettre `normalize(x) || « repli »`. */
/**
 * Map API / proxy errors to user-facing copy for the given locale.
 * Locale is required — pass `useI18n().language` in UI code (Phase 19U.1).
 * Non-UI modules without UI context should pass an explicit locale; do not omit.
 */
export function normalizeUserFacingError(
  message: string | undefined | null,
  locale: ProductUiLanguage | string
): string {
  if (message == null) return "";
  const s = String(message).trim();
  if (!s) return "";

  const parsed = parseProductUiLanguage(locale);
  const bilingual = parsed === "fr" ? "fr" : parsed === "es" ? "es" : "en";

  // Known API messages first so English UI does not show raw French from the server.
  for (const rule of RULES) {
    if (rule.test(s)) return pickProductUiCopy(locale, rule, ES_GENERIC);
  }

  // Déjà du français probable : accents ou mots courts typiques (FR locale only — EN falls through)
  if (bilingual === "fr") {
    if (/[àâäéèêëïîôùûçœæ]/i.test(s)) return s;
    if (/^(impossible|veuillez|la |le |les |une |un |des |erreur|accès|établissement|données)/i.test(s))
      return s;
  }

  const INVALID_DATA: LocaleErrorCopy = {
    en: "Invalid data.",
    fr: "Données invalides.",
    es: "Datos no válidos.",
  };
  const OPERATION_FAILED: LocaleErrorCopy = {
    en: "The operation failed. Please try again.",
    fr: "L'opération a échoué. Réessayez.",
    es: "La operación falló. Inténtelo de nuevo.",
  };
  const SERVER_ERROR: LocaleErrorCopy = {
    en: "Server error.",
    fr: "Erreur serveur.",
    es: "Error del servidor.",
  };
  const GENERIC: LocaleErrorCopy = {
    en: "Something went wrong.",
    fr: "Une erreur est survenue.",
    es: ES_GENERIC,
  };

  // Phrases anglaises courantes (Nest / HTTP)
  if (/^invalid/i.test(s)) return pickProductUiCopy(locale, INVALID_DATA, ES_GENERIC);
  if (/^failed\b/i.test(s)) return pickProductUiCopy(locale, OPERATION_FAILED, ES_GENERIC);
  if (/server error/i.test(s)) return pickProductUiCopy(locale, SERVER_ERROR, ES_GENERIC);

  /** EN UI: pass through ASCII API errors Nest returns (avoid generic "Something went wrong"). */
  if (bilingual === "en") {
    if (
      /^(aucune|impossible|ligne|veuillez|horodatage|la perfusion|perfusion|un motif|une |le motif|l'heure|l'ajustement|seules les)/i.test(
        s
      )
    ) {
      return "Something went wrong.";
    }
    if (s.length >= 3 && s.length <= 500 && !/[^\x00-\x7F]/.test(s)) {
      return s;
    }
  }

  return pickProductUiCopy(locale, GENERIC, ES_GENERIC);
}

/** Quand aucun message exploitable n’est disponible. */
export function genericUserFacingError(locale: ProductUiLanguage | string = "en"): string {
  return pickProductUiCopy(
    locale,
    {
      en: "Something went wrong.",
      fr: "Une erreur s'est produite.",
      es: ES_GENERIC,
    },
    ES_GENERIC
  );
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
