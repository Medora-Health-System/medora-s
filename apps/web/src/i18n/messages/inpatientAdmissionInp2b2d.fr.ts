/** MEDUI.INP.2B.2D — Convergence finale admission infirmière (FR). */
export const inpatientAdmissionInp2b2dFr = {
  preload: {
    pmh: "Antécédents médicaux",
    psh: "Antécédents chirurgicaux",
    homeMeds: "Médicaments à domicile",
    allergies: "Allergies",
    smoking: "Tabac",
    alcohol: "Alcool",
    recreational: "Substances récréatives",
  },
  confirmedComplete: "Confirmé",
  pendingProjection: "Projection en attente — ce n’est pas une transmission terminée",
  source: "Source",
  notifyArrival: "Consignez que le médecin a été notifié de l’arrivée",
  homeMedSearch: "Rechercher un médicament (au moins 3 caractères)",
  homeMedFrequency: "Fréquence",
  homeMedAdd: "Ajouter un médicament",
  homeMedRemove: "Retirer",
  homeMedNoOrder:
    "Ceci consigne l’historique des médicaments à domicile. Cela ne crée ni ordonnance ni dose MAR.",
  handoffStatus: {
    NOT_STARTED: "Non commencé",
    PROVIDER_NOTIFIED: "Médecin notifié",
    ORDERS_PENDING: "Ordres en attente",
    ORDERS_RECEIVED: "Ordres reçus",
    HP_PENDING: "H&P médecin en attente (non requis pour la signature infirmière)",
    HP_COMPLETE: "H&P médecin terminé",
    ESCALATION_REQUIRED: "Escalade requise",
  },
  yn: {
    YES: "Oui",
    NO: "Non",
    UNKNOWN: "Inconnu",
  },
  medRecon: {
    COMPLETE: "Terminé",
    IN_PROGRESS: "En cours",
    NOT_STARTED: "Non commencé",
  },
  codeStatusNotDocumented: "Non consigné dans l’en-tête patient",
};
