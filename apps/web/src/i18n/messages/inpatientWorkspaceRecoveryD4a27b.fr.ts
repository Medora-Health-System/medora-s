/** D4A.2.7B — Récupération des espaces hospitaliers (FR). */
export const inpatientWorkspaceRecoveryD4a27bFr = {
  roleLabel: "Espace de travail",
  roles: {
    PROVIDER: "Médecin",
    NURSING: "Soins infirmiers",
    TECHNICIAN: "Technicien",
    CHART: "Dossier partagé",
  },
  header: {
    mrn: "NIP",
    dob: "Date de naissance",
    age: "Âge",
    sex: "Sexe",
    language: "Langue préférée",
    encounterType: "Type de rencontre",
    hospitalDay: "Jour d’hospitalisation",
    admittedAt: "Date et heure d’admission",
    unitRoomBed: "Unité / chambre / lit",
    attending: "Médecin traitant",
    rn: "Infirmier(ère) assigné(e)",
    status: "Statut de la rencontre",
    chiefConcern: "Motif principal",
    codeStatus: "Statut de code",
    isolation: "Précautions d’isolement",
    allergies: "Allergies",
    quickActions: "Actions",
    actions: {
      vitals: "Documenter les signes vitaux",
      orders: "Revoir les ordonnances",
      mar: "Ouvrir le MAR",
      results: "Revoir les résultats",
      fullChart: "Ouvrir le dossier complet",
    },
  },
  unavailable: {
    title: "Dossier d’hospitalisation indisponible",
    writersDisabled:
      "Les rédacteurs de documentation sont désactivés jusqu’à la résolution de la rencontre d’hospitalisation.",
    retry: "Réessayer",
    returnCensus: "Retour au recensement",
    openSource: "Ouvrir la rencontre source",
  },
  errors: {
    MISSING_ID: "Identifiant de rencontre d’hospitalisation manquant.",
    NOT_FOUND: "Impossible de trouver cette rencontre dans l’établissement actuel.",
    FACILITY_MISMATCH: "Cette rencontre appartient à un autre établissement.",
    WRONG_ENCOUNTER_TYPE:
      "Cette rencontre n’est pas un dossier d’hospitalisation. La rédaction reste bloquée.",
    ENCOUNTER_TYPE_MISMATCH:
      "Le type de rencontre ne correspond pas à l’espace d’hospitalisation. La rédaction reste bloquée.",
    ED_ENCOUNTER_REJECTED:
      "Une rencontre des urgences ne peut pas être ouverte comme espace d’hospitalisation.",
    OBSERVATION_ENCOUNTER_REJECTED:
      "Cette rencontre d’observation doit être ouverte dans l’espace Observation.",
    UNAUTHORIZED: "Accès restreint pour ce dossier d’hospitalisation.",
    FORBIDDEN: "Vous n’avez pas l’autorisation d’ouvrir ce dossier d’hospitalisation.",
    FEATURE_DISABLED:
      "L’espace clinique d’hospitalisation n’est pas configuré pour cet établissement.",
    SCHEMA_COMPATIBILITY:
      "Problème de compatibilité du schéma hospitalier. Contactez un administrateur. La rédaction reste bloquée.",
    SERVER_ERROR:
      "Erreur serveur lors de l’ouverture du dossier d’hospitalisation. Réessayez ou contactez le support.",
    NETWORK: "Temporairement indisponible. Vérifiez la connexion et réessayez.",
    UNKNOWN:
      "Impossible de résoudre la rencontre d’hospitalisation active pour cet épisode hospitalier.",
  },
  states: {
    LOADING: "Chargement…",
    AVAILABLE: "Disponible",
    NO_DATA_DOCUMENTED: "Aucune donnée documentée",
    NOT_APPLICABLE: "Non applicable",
    NOT_CONFIGURED: "Non configuré pour cet établissement",
    TEMPORARILY_UNAVAILABLE: "Temporairement indisponible",
    ACCESS_RESTRICTED: "Accès restreint",
    ENCOUNTER_MISMATCH: "Incohérence de rencontre",
    SOURCE_UNAVAILABLE: "Source indisponible",
    SAVE_FAILED: "Échec de l’enregistrement",
    CONFLICT_DETECTED: "Conflit détecté",
  },
  notes: {
    governedHpOnly:
      "L’histoire et l’examen physique utilisent le flux légal gouverné. Le rédacteur de notes générique n’est pas affiché ici.",
    governedProgressOnly:
      "Les notes d’évolution utilisent le service de dossier légal. Le rédacteur générique n’est pas dupliqué ici.",
    governedNursingOnly:
      "La documentation infirmière utilise l’admission et les évaluations. Le rédacteur générique n’est pas dupliqué ici.",
  },
  resultsTitle: "Résultats et examens",
  additionalDocumentation: "Documentation clinique supplémentaire",
  admin: {
    observationOperations: "Opérations d’observation",
  },
  save: {
    notSaved: "Non enregistré",
    saving: "Enregistrement…",
    savedAt: "Enregistré à",
    saveFailed: "Échec de l’enregistrement",
    conflict: "Conflit détecté",
    readOnly: "Lecture seule",
    signed: "Signé",
    amended: "Amendé",
  },
};
