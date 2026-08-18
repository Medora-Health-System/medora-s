/** MEDUI.INP.2B.2A — Correction UAT admission infirmière (FR). */
export const inpatientAdmissionInp2b2aFr = {
  addNote: "+ Ajouter une note",
  unableToComplete: "Impossible à terminer",
  notApplicable: "Sans objet",
  derivedStatus: "Statut de la section",
  assignmentTitle: "Lieu et équipe assignés",
  assignmentHint:
    "Projection du moteur d’affectation et de lits hospitaliers. Ce n’est pas une seconde autorité d’unité ou de lit.",
  assignedUnit: "Unité assignée",
  assignedBed: "Lit assigné",
  attendingProvider: "Médecin traitant",
  receivingNurse: "Infirmier(ère) d’accueil",
  notAssigned: "Non assigné",
  conflict: {
    title: "Conflit d’enregistrement",
    body: "Un autre utilisateur ou une autre session a modifié cette section d’admission après le début de votre saisie.",
    reload: "Voir la dernière version",
    preserve: "Garder mon brouillon",
    retry: "Réessayer après revue",
    discard: "Abandonner mon brouillon",
  },
  saveFailed: "Impossible d’enregistrer cette section d’admission. Votre brouillon a été conservé.",
  saveNetwork: "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
  saveDomainLink:
    "La documentation clinique requise n’a pas pu être liée. Votre brouillon d’admission a été conservé. Réessayez ou ouvrez la documentation clinique.",
  saveValidation:
    "Cette section n’a pas pu être enregistrée. Vérifiez les réponses obligatoires et réessayez.",
  savePreloadConfirm:
    "Aucun antécédent partagé à confirmer. Utilisez Mettre à jour pour consigner les antécédents dans le dossier de l’établissement, ou confirmez une fois les antécédents présents.",
  saveAuth: "Votre session a expiré. Reconnectez-vous pour continuer.",
  preloadEmpty:
    "Aucun antécédent partagé n’est encore consigné pour cette section. La mise à jour utilise le dossier d’antécédents de l’établissement.",
  historyEditor: {
    reuseHint:
      "Ceci modifie les antécédents partagés du patient. Cela ne crée pas une seconde liste d’admission infirmière.",
    loadError: "Impossible de charger les antécédents officiels.",
    saveError: "Impossible d’enregistrer les antécédents officiels.",
    title: {
      MEDICAL_HISTORY: "Mettre à jour les antécédents médicaux",
      SURGICAL_HISTORY: "Mettre à jour les antécédents chirurgicaux",
      HOME_MEDICATIONS: "Mettre à jour les médicaments à domicile",
    },
  },
};
