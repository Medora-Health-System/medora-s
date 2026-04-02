/**
 * Libellés interface utilisateur (i18n-ready).
 * Langue active : français uniquement pour l’instant.
 * Ne pas utiliser pour les routes API, DTO ou enums backend.
 */

const fr = {
  common: {
    loading: "Chargement…",
    loadingEncounters: "Chargement des consultations…",
    redirecting: "Redirection…",
    actions: "Actions",
    patient: "Patient",
    nir: "NIR",
    type: "Type",
    status: "Statut",
    priority: "Priorité",
    date: "Date",
    arrival: "Arrivée",
    save: "Enregistrer",
    cancel: "Annuler",
    back: "Retour",
    refresh: "Actualiser",
    dash: "—",
    view: "Voir",
    study: "Examen",
    test: "Analyse",
    medication: "Médicament",
    dosage: "Dosage",
    quantity: "Quantité",
    refills: "Renouvellements",
    posology: "Posologie",
    prescriber: "Prescripteur",
    contact: "Contact",
    name: "Nom",
    ageSex: "Âge / Sexe",
    chiefComplaintShort: "Motif",
    room: "Salle",
    /** Indice de gravité (ESI) au tableau de bord */
    esiIndex: "Indice ESI",
    physician: "Médecin",
    nurseAbbr: "Inf.",
    assigned: "Attribué",
    unauthorizedRedirect: "Accès non autorisé. Retour à votre espace.",
    userFallback: "Utilisateur",
    logout: "Déconnexion",
    facilityPrefix: "Établissement",
  },

  /** Liens de navigation (sidebar) */
  nav: {
    trackboard: "Tableau de bord",
    registration: "Accueil",
    nursing: "Soins infirmiers",
    provider: "Médecin",
    patients: "Patients",
    encounters: "Consultations",
    hospitalisation: "Hospitalisation",
    followUps: "Suivis",
    radWorklist: "Liste imagerie",
    labWorklist: "Liste laboratoire",
    pharmacyQueue: "File pharmacie",
    pharmacyWorklist: "Liste pharmacie",
    pharmacyInventory: "Stock pharmacie",
    pharmacyDispense: "Dispenser médicament",
    pharmacyLowStock: "Stock faible",
    pharmacyExpiring: "Stock à péremption",
    billing: "Facturation",
    fracture: "Fracture",
    publicHealth: "Santé publique",
    vaccinations: "Vaccinations",
    diseaseReports: "Déclarations maladies",
    admin: "Administration",
    adminUsers: "Utilisateurs et accès",
  },

  encounter: {
    types: {
      /** Libellés UI — valeurs Prisma inchangées (OUTPATIENT, …) */
      OUTPATIENT: "Clinique",
      INPATIENT: "Hospitalisation",
      EMERGENCY: "Urgences",
      URGENT_CARE: "Soins urgents / intensifs",
    } as Record<string, string>,
    /** Statut de la consultation (féminin) */
    statuses: {
      OPEN: "Ouverte",
      CLOSED: "Terminée",
      CANCELLED: "Annulée",
    } as Record<string, string>,
    /** Variante tableau de bord (consultation au féminin) */
    statusesBoard: {
      OPEN: "Ouverte",
      CLOSED: "Terminée",
      CANCELLED: "Annulée",
    } as Record<string, string>,
  },

  order: {
    priorities: {
      ROUTINE: "Habituelle",
      URGENT: "Urgente",
      STAT: "Immédiate",
    } as Record<string, string>,
  },

  followUp: {
    statuses: {
      OPEN: "Planifié",
      COMPLETED: "Terminé",
      CANCELLED: "Annulé",
    } as Record<string, string>,
  },

  /** Valeurs formulaire d’inscription (DTO `sex`) */
  registrationSex: {
    HOMME: "Homme",
    FEMME: "Femme",
    AUTRE: "Autre",
    INCONNU: "Inconnu",
  } as Record<string, string>,

  /** Enum Prisma `PatientSex` — affichage uniquement */
  patientSex: {
    MALE: "Homme",
    FEMALE: "Femme",
    OTHER: "Autre",
    UNKNOWN: "Inconnu",
  } as Record<string, string>,

  /** Affichage : stockage Prisma M, F, X, U + variantes / inscription */
  sexAtBirth: {
    M: "Homme",
    F: "Femme",
    X: "Autre",
    U: "Inconnu",
    HOMME: "Homme",
    FEMME: "Femme",
    AUTRE: "Autre",
    INCONNU: "Inconnu",
    MALE: "Homme",
    FEMALE: "Femme",
    OTHER: "Autre",
    UNKNOWN: "Inconnu",
  } as Record<string, string>,

  lab: {
    title: "File laboratoire",
    subtitle: "Analyses à traiter.",
    empty: "Aucune analyse en attente.",
    acknowledge: "Accuser réception",
    start: "Démarrer",
    complete: "Terminer",
    viewEncounter: "Voir la consultation",
    alertAckFailed: "Impossible d’acquitter l’analyse.",
    alertStartFailed: "Impossible de démarrer l’analyse.",
    alertCompleteFailed: "Impossible de terminer l’analyse.",
  },

  radiology: {
    title: "File imagerie",
    subtitle: "Examens d’imagerie à traiter.",
    empty: "Aucun examen en attente.",
    start: "Démarrer",
    complete: "Terminer",
    viewEncounter: "Voir la consultation",
    updateStatusFailed: "Impossible de mettre à jour le statut",
  },

  billing: {
    encounterTypeFallback: "—",
  },

  /** Administration — rôles assignables (codes API inchangés, affichage FR uniquement). */
  admin: {
    assignableRoles: {
      ADMIN: "Administration",
      PROVIDER: "Médecin",
      RN: "Infirmier",
      PHARMACY: "Pharmacie",
      FRONT_DESK: "Accueil",
      LAB: "Laboratoire",
      RADIOLOGY: "Radiologie",
      BILLING: "Facturation",
    } as Record<string, string>,
  },

  pathway: {
    nextMilestoneBadge: "Prochain",
    /** Libellés pour enum backend `PathwayType` */
    types: {
      STROKE: "AVC",
      SEPSIS: "Sepsis",
      STEMI: "Infarctus STEMI",
      TRAUMA: "Traumatisme",
    } as Record<string, string>,
  },

  /** Onglet MAR — administration médicamenteuse (consultation). */
  mar: {
    columnWhen: "Date et heure",
    columnNurse: "Professionnel",
    columnNotes: "Notes",
    orderLineOptional: "Ligne d'ordre (optionnel)",
    empty: "Aucune administration enregistrée.",
    submit: "Enregistrer l'administration",
    datetimeLabel: "Date et heure d'administration",
    notesLabel: "Notes",
    noLinkedOrder: "Sans lien ordre",
    closedHint: "Consultation fermée : enregistrement désactivé.",
  },
} as const;

export const labels = {
  fr,
} as const;

/** Raccourci vers la langue active (FR). */
export const ui = labels.fr;

/** Alias centralisé explicite demandé pour les labels UI globaux. */
export const uiLabels = {
  actions: {
    save: fr.common.save,
    cancel: fr.common.cancel,
    delete: "Supprimer",
    edit: "Modifier",
    create: "Créer",
    continue: "Continuer",
    back: fr.common.back,
    close: "Fermer",
    submit: "Valider",
  },
  statuses: {
    open: fr.encounter.statuses.OPEN,
    closed: fr.encounter.statuses.CLOSED,
    cancelled: fr.encounter.statuses.CANCELLED,
    pending: "En attente",
    inProgress: "En cours",
    completed: "Terminé",
  },
  common: {
    loading: fr.common.loading,
    noData: "Aucune donnée disponible",
    error: "Une erreur est survenue",
    search: "Rechercher",
    filter: "Filtrer",
  },
} as const;

export function getEncounterTypeLabelFr(type: string): string {
  return fr.encounter.types[type] ?? type;
}

export function getEncounterStatusLabelFr(status: string): string {
  return fr.encounter.statuses[status] ?? status;
}

export function getEncounterStatusBoardLabelFr(status: string): string {
  return fr.encounter.statusesBoard[status] ?? status;
}

export function getOrderPriorityLabelFr(priority: string): string {
  return fr.order.priorities[priority as keyof typeof fr.order.priorities] ?? priority;
}

export function getFollowUpStatusLabelFr(status: string): string {
  return fr.followUp.statuses[status] ?? status;
}

export function getRegistrationSexLabel(code: string): string {
  return fr.registrationSex[code] ?? code;
}

export function getAdminAssignableRoleLabelFr(code: string): string {
  const m = (fr.admin.assignableRoles as Record<string, string>)[code];
  return m ?? fr.common.dash;
}

export function getSexAtBirthLabelFr(code: string | null | undefined): string {
  if (!code || !String(code).trim()) return fr.common.dash;
  const c = String(code).trim();
  const mapped = (fr.sexAtBirth as Record<string, string>)[c];
  return mapped ?? "Inconnu";
}

/** Préfère `Patient.sex` canonique, sinon `sexAtBirth` (M/F/X/U). */
export function getPatientSexLabelFr(
  sex: string | null | undefined,
  sexAtBirth: string | null | undefined
): string {
  if (sex && sex !== "UNKNOWN") {
    const m = (fr.patientSex as Record<string, string>)[sex];
    if (m) return m;
  }
  if (sexAtBirth) return getSexAtBirthLabelFr(sexAtBirth);
  if (sex === "UNKNOWN") return fr.patientSex.UNKNOWN;
  return fr.common.dash;
}

export function getPathwayTypeLabelFr(type: string): string {
  return fr.pathway.types[type] ?? type;
}

/** Statuts génériques (fallback pour enums transverses). */
export function getStatusLabelFr(status: string): string {
  const s = (status || "").toUpperCase().trim();
  const map: Record<string, string> = {
    OPEN: uiLabels.statuses.open,
    CLOSED: uiLabels.statuses.closed,
    CANCELLED: uiLabels.statuses.cancelled,
    PENDING: uiLabels.statuses.pending,
    IN_PROGRESS: uiLabels.statuses.inProgress,
    COMPLETED: uiLabels.statuses.completed,
  };
  return map[s] ?? "Statut inconnu";
}
