/**
 * Toute chaîne affichée à l’utilisateur doit être en français.
 * Normalise les messages d’erreur renvoyés par l’API / le proxy (souvent en anglais).
 */

/** Message FR normalisé pour `NotFoundException` consultation (ex. GET /encounters/:id). */
export const USER_FACING_ENCOUNTER_NOT_FOUND_FR = "Consultation introuvable.";

const RULES: Array<{ test: (s: string) => boolean; fr: string }> = [
  { test: (s) => /^\s*request failed\s*:\s*\d+\s*$/i.test(s), fr: "La requête a échoué. Réessayez." },
  { test: (s) => /invalid payload/i.test(s), fr: "Données invalides." },
  { test: (s) => /^bad request$/i.test(s.trim()), fr: "Requête incorrecte." },
  { test: (s) => /not authenticated/i.test(s), fr: "Non authentifié." },
  { test: (s) => /^unauthorized$/i.test(s.trim()), fr: "Accès non autorisé." },
  { test: (s) => /authentication required/i.test(s), fr: "Authentification requise." },
  { test: (s) => /^forbidden$/i.test(s.trim()), fr: "Accès refusé." },
  /** Avant le filtre générique « not found » : « Encounter not found » contient « not found ». */
  { test: (s) => /encounter not found/i.test(s), fr: USER_FACING_ENCOUNTER_NOT_FOUND_FR },
  { test: (s) => /patient not found/i.test(s), fr: "Patient introuvable." },
  {
    test: (s) => /patient already has an open encounter/i.test(s),
    fr: "Une consultation est déjà ouverte pour ce patient. Fermez-la ou ouvrez-la avant d’en créer une nouvelle.",
  },
  { test: (s) => /order not found/i.test(s), fr: "Ordre introuvable." },
  { test: (s) => /not found/i.test(s) && !/introuvable/i.test(s), fr: "Ressource introuvable." },
  { test: (s) => /internal server error/i.test(s), fr: "Erreur interne du serveur." },
  { test: (s) => /facility id required/i.test(s), fr: "Établissement requis." },
  { test: (s) => /no facility selected/i.test(s), fr: "Aucun établissement sélectionné." },
  { test: (s) => /proxy error/i.test(s), fr: "Erreur de communication avec le serveur." },
  { test: (s) => /network error|failed to fetch|fetch failed|ecconnrefused|enotfound/i.test(s), fr: "Erreur de communication avec le serveur." },
  { test: (s) => /invalid credentials/i.test(s), fr: "Identifiants invalides." },
  {
    test: (s) => /payload too large|request entity too large|413/i.test(s),
    fr: "Requête trop volumineuse : réduisez la taille des fichiers ou contactez l’administrateur.",
  },
  {
    test: (s) => /can only create orders for open encounters/i.test(s),
    fr: "Impossible de créer un ordre : la consultation doit être ouverte.",
  },
];

/**
 * Si le message est déjà principalement français (heuristique simple), le renvoie tel quel.
 * Sinon tente les règles ci-dessus ; en dernier recours renvoie un message générique FR.
 */
/** Retourne une chaîne vide si `message` est vide, pour permettre `normalize(x) || « repli »`. */
export function normalizeUserFacingError(message: string | undefined | null): string {
  if (message == null) return "";
  const s = String(message).trim();
  if (!s) return "";

  // Déjà du français probable : accents ou mots courts typiques
  if (/[àâäéèêëïîôùûçœæ]/i.test(s)) return s;
  if (/^(impossible|veuillez|la |le |les |une |un |des |erreur|accès|établissement|données)/i.test(s)) return s;

  for (const { test, fr } of RULES) {
    if (test(s)) return fr;
  }

  // Phrases anglaises courantes (Nest / HTTP)
  if (/^invalid/i.test(s)) return "Données invalides.";
  if (/^failed\b/i.test(s)) return "L'opération a échoué. Réessayez.";
  if (/server error/i.test(s)) return "Erreur serveur.";

  // Ne jamais exposer un fallback anglais brut.
  return "Une erreur est survenue.";
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
