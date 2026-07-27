/**
 * MEDUI.D4B.8 — French strings for enterprise provider clinical workspace.
 * Product UI language for end users.
 */
export const enterpriseProviderClinicalWorkspaceD4b8Fr = {
  title: "Espace clinique médecin",
  subtitle:
    "Couche de composition d’entreprise sur la documentation médecin existante — note ≠ ordonnance ≠ mutation de diagnostic ≠ autorisation de sortie",
  foundationBanner:
    "S’appuie sur la fondation de documentation clinique d’entreprise (D4B.1). Compose ProviderDocumentationWorkspace, inpatientProviderWorkspace (D4A.26) et EncounterNote — sans inventer un moteur parallèle de notes ou de signature. L’identité serveur fait autorité. L’affectation n’est pas une autorisation. L’attestation et la co-signature ne remplacent pas la paternité. Les notes ne créent pas d’ordonnances, ne modifient pas le diagnostic ni la liste de problèmes, n’altèrent pas le MAR, ne font pas la réconciliation médicamenteuse, n’accusent pas réception des résultats, n’autorisent pas la sortie, et ne réécrivent pas les plans de soins (D4B.6) ni la coordination (D4B.7). Pas d’IA ambiante. Pas de codage E/M automatique.",
  edLimitedBanner:
    "Urgences : projection et compatibilité limitées uniquement. Préserver le flux de documentation médecin des urgences existant. Les surfaces de composition complètes sont disponibles en Observation et Hospitalisation.",
  edCompatibilityBanner:
    "Les notes médecin aux urgences restent sur le chemin EmergencyErNotesPanel / ProviderDocumentationWorkspace existant. Cet espace projette les limites et les surfaces de revue sans remplacer la documentation des urgences.",
  loading: "Chargement de l’espace clinique médecin…",
  empty: "Aucune note médecin pour cette rencontre pour le moment.",
  error: "Impossible de charger l’espace clinique médecin.",
  composition: {
    heading: "Composition — pas de remplacement",
    body: "La documentation est rédigée et signée via les moteurs Medora existants. D4B.8 héberge les projections, les limites de capacité et l’intégration optionnelle de ProviderDocumentationWorkspace.",
    noFork:
      "Pas de ProviderNoteV2 / moteur de signature indépendant — EncounterNote et la coquille de documentation médecin restent durables.",
    useExistingEditor:
      "Utiliser ProviderDocumentationWorkspace / D4A.26 / EncounterNote pour brouillon et signature. Cet espace ne finalise pas les notes localement.",
  },
  sections: {
    overview: "Vue d’ensemble",
    census: "Recensement",
    documentation: "Documentation",
    historyPhysical: "Histoire et examen physique",
    progressNotes: "Notes d’évolution",
    consultNotes: "Notes de consultation",
    assessmentPlan: "Évaluation et plan",
    medicalDecisionMaking: "Prise de décision médicale",
    clinicalReview: "Revue clinique",
    nursingProjection: "Projection infirmière",
    rtProjection: "Projection respiratoire",
    rehabProjection: "Projection réadaptation",
    techProjection: "Projection technicien",
    carePlanProjection: "Projection plan de soins",
    careCoordinationProjection: "Projection coordination des soins",
    ordersResultsMeds: "Ordonnances, résultats et médicaments",
    timeline: "Chronologie",
    handoff: "Transmission limitée",
    deferredBoundaries: "Limites et reports",
  },
  capabilities: {
    viewCensus: "Voir le recensement",
    viewPatientWorkspace: "Voir l’espace patient",
    viewInterdisciplinaryProjections: "Voir les projections interdisciplinaires",
    createHpDraft: "Créer un brouillon H&P (via moteurs existants)",
    finalizeHp: "Signer le H&P (via API de signature existantes)",
    createProgressDraft: "Créer un brouillon de note d’évolution (via moteurs existants)",
    finalizeProgress: "Signer la note d’évolution (via API de signature existantes)",
    createConsultDraft: "Créer un brouillon de note de consultation (via moteurs existants)",
    finalizeConsult: "Signer la note de consultation (via API de signature existantes)",
    documentAssessmentPlan: "Documenter l’évaluation et le plan",
    documentMdm: "Documenter la prise de décision médicale",
    amendOwnNote: "Amender sa propre note (amendement EncounterNote)",
    correctOwnNote: "Corriger sa propre note (correction EncounterNote)",
    enterNoteInError: "Saisir la note en erreur (EIE EncounterNote)",
    attestResidentNote: "Attester une note de résident",
    cosignAppNote: "Co-signer une note d’IPA / assistant",
    cosignStudentNote: "Co-signer une note d’étudiant",
    reviewRecommendations: "Revoir les recommandations",
    reviewCarePlan: "Revoir le plan de soins",
    reviewCareCoordination: "Revoir la coordination des soins",
    viewOrdersResultsMeds: "Voir ordonnances, résultats et médicaments",
    limitedHandoff: "Transmission limitée",
    printExportAuthorized: "Imprimer / exporter lorsque autorisé",
  },
  noteTypes: {
    providerHistoryAndPhysical: "Histoire et examen physique",
    providerProgressNote: "Note d’évolution",
    providerConsultNote: "Note de consultation",
    providerAssessmentPlan: "Évaluation et plan",
    providerCrossCover: "Note de couverture",
    providerEventNote: "Note d’événement",
    providerAttestation: "Attestation",
    providerAddendum: "Addendum",
    providerAmendment: "Amendement",
    providerCorrection: "Correction",
    providerEnteredInError: "Saisie en erreur",
  },
  overview: {
    sectionsHint:
      "Composer la documentation H&P, évolution et consultation existante ; revoir A&P et PDM sans codage E/M ; revoir les projections interdisciplinaires — sans créer d’ordonnances ni autoriser la sortie.",
    authorityHeading: "Limites d’autorité (toutes fausses dans cet espace)",
  },
  boundaries: {
    orders: "Le texte de la note n’est pas une ordonnance. Les ordonnances sont créées ailleurs.",
    diagnosis:
      "Les références diagnostiques dans les notes ne modifient pas le diagnostic ni la liste de problèmes et ne sont pas des diagnostics de facturation.",
    mar: "La projection MAR n’est pas une administration de médicament et n’altère pas le MAR.",
    results: "Inclure un résultat dans une note n’est pas un accusé de réception du résultat.",
    carePlan:
      "La projection du plan de soins est en lecture seule — cet espace ne réécrit jamais la paternité D4B.6.",
    careCoord:
      "La projection de coordination est en lecture seule — cet espace ne réécrit jamais les épisodes D4B.7.",
    discharge: "Les indices de préparation et de planification ne sont pas une autorisation de sortie.",
    attestation: "L’attestation et la co-signature ne remplacent pas la paternité d’origine.",
  },
  deferred:
    "Reporté (D4B.9+) : notes de procédure / opératoire / anesthésie, résumé de sortie, réconciliation médicamenteuse, facturation / codage E/M / CDI, documentation par IA ambiante.",
  census: {
    empty: "Aucune ligne de recensement pour cet espace pour le moment.",
  },
  documents: {
    empty: "Aucun document médecin adapté projeté pour le moment.",
  },
  projections: {
    empty: "Aucune projection pour le moment.",
  },
  messages: {
    ED_LIMITED:
      "Cadre urgences : création de brouillon D4B.8 limitée — utiliser l’éditeur d’urgences existant.",
    CAPABILITY_DENIED: "Capacité refusée pour ce profil de rôle.",
    CARE_SETTING_DENIED: "Type de note non autorisé pour ce cadre de soins.",
    DEFERRED_NOTE_TYPE: "Ce type de note est reporté.",
    UNKNOWN_NOTE_TYPE: "Type de note inconnu.",
    OK: "OK",
  },
};
