/**
 * MEDUI.D4B.1 — French strings for enterprise clinical document foundation primitives.
 */
export const enterpriseClinicalDocumentD4b1Fr = {
  status: {
    DRAFT: "Brouillon",
    IN_PROGRESS: "En cours",
    READY_FOR_SIGNATURE: "Prêt pour signature",
    SIGNED: "Signé",
    COSIGN_REQUIRED: "Contresignature requise",
    COSIGNED: "Contresigné",
    AMENDED: "Rectifié",
    CORRECTED: "Corrigé",
    ENTERED_IN_ERROR: "Saisi par erreur",
    VOIDED: "Annulé",
  },
  labels: {
    amended: "Document rectifié",
    addendum: "Addendum",
    unsignedDraft: "Brouillon non signé — pas un dossier légal définitif",
    enteredInError: "Saisi par erreur — documentation clinique non valide",
    templateVersion: "Version du modèle",
    author: "Auteur",
    signer: "Signataire",
    cosigner: "Contresignataire",
    serviceAt: "Heure de service",
    signedAt: "Signé le",
    completeness: "Complétude",
    complete: "Complet",
    incomplete: "Incomplet",
    signatureReady: "Prêt à signer",
    notSignatureReady: "Pas prêt à signer",
    versionHistory: "Historique des versions",
    legalRecord: "Dossier légal",
    validationIssues: "Problèmes de validation",
  },
  validation: {
    requiredField: "Champ obligatoire manquant",
    mutuallyExclusive: "Des champs mutuellement exclusifs sont tous deux présents",
    hardStop: "À corriger avant la signature",
    warning: "Avertissement",
  },
  documentTypes: {
    encounterNoteProvider: "Note de consultation — médecin",
    encounterNoteNursing: "Note de consultation — infirmier(ère)",
    encounterNoteTechnician: "Note de consultation — technicien",
    edocStructuredEntry: "Entrée de documentation clinique structurée",
    providerDocumentationShell: "Documentation médecin",
    nursingAdmission: "Évaluation d’admission infirmière",
  },
  legal: {
    footer:
      "Document clinique Medora — statut et paternité affichés pour le dossier légal.",
  },
};
