/** D4A.1 — Admission infirmière médico-chirurgicale (FR). */
export const hospitalAdmissionD4a1Fr = {
  intro:
    "Vérifiez l’historique patient partagé avec provenance, complétez l’admission infirmière médico-chirurgicale structurée, puis transférez au médecin — sans dupliquer le dossier longitudinal.",
  loadError: "Impossible de charger la documentation d’admission infirmière.",
  saveConflict: "Conflit d’enregistrement — documentation actualisée. Réessayez.",
  sign: "Signer l’admission infirmière",
  alreadySigned: "Admission infirmière signée",
  signed: "Admission infirmière signée. Transfert médecin créé.",
  signError: "Impossible de signer l’admission infirmière.",
  preloadEmpty: "Aucun historique longitudinal à précharger pour ce patient.",
  provenance: {
    source: "Source",
    verified: "Vérifié",
  },
  verify: {
    CONFIRMED: "Confirmer",
    UPDATED: "Mettre à jour",
    UNABLE_TO_VERIFY: "Impossible de vérifier",
    UNKNOWN: "Inconnu",
  },
  completion: {
    title: "Avancement de l’admission",
    complete: "Terminé",
    inProgress: "En cours",
  },
  homeMeds: {
    noOrders:
      "La réconciliation des médicaments à domicile ne crée jamais d’ordonnances d’hospitalisation ni de lignes MAR.",
    notOrder: "documentation seulement",
  },
  cash: {
    hint: "Documentez les espèces par dénomination et quantité avec reçu et témoin si sécurisées.",
  },
  wounds: {
    documented: "plaie(s) au dossier",
  },
  headToToe: {
    hint: "L’évaluation de la tête aux pieds réutilise les domaines cliniques Medora existants (EDOC / soins).",
    NEUROLOGIC: "Neurologique",
    HEENT: "Tête-cou",
    RESPIRATORY: "Respiratoire",
    CARDIOVASCULAR: "Cardiovasculaire",
    GI: "Gastro-intestinal",
    GU: "Génito-urinaire",
    MUSCULOSKELETAL: "Musculo-squelettique",
    SKIN: "Peau",
    ENDOCRINE: "Endocrinien",
    PSYCHOSOCIAL: "Psychosocial",
    PAIN: "Douleur",
    SAFETY: "Sécurité",
    EDUCATION: "Éducation",
  },
  handoff: {
    task: "Tâche d’admission médecin",
    pendingSign: "Le transfert médecin est créé à la signature de l’admission infirmière.",
  },
} as const;
