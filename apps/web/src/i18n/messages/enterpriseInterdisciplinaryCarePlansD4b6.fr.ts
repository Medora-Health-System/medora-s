/**
 * MEDUI.D4B.6 — Chaînes françaises pour les plans de soins interdisciplinaires.
 */
export const enterpriseInterdisciplinaryCarePlansD4b6Fr = {
  title: "Plan de soins interdisciplinaire",
  subtitle:
    "Parcourir → prévisualiser → personnaliser → activer → suivi → révision — ce n’est ni un diagnostic, ni une ordonnance, ni une autorisation de sortie",
  careSetting: {
    EMERGENCY: "Urgences",
    OBSERVATION: "Observation",
    INPATIENT: "Hospitalisation",
  },
  loading: "Chargement des plans de soins…",
  empty: "Aucun plan de soins actif pour cette rencontre.",
  emptyTemplates: "Aucun modèle correspondant.",
  emptyContributions: "Aucune contribution de discipline projetée pour le moment.",
  emptyLegacy: "Aucun élément de plan de soins D3E héritage.",
  error: "Impossible de charger l’espace plans de soins.",
  searchPlaceholder: "Rechercher un modèle (chute, douleur, IC…)",
  previewAction: "Prévisualiser",
  activateAction: "Activer pour le patient",
  customizeHint:
    "Les modifications optionnelles s’appliquent uniquement à ce patient — le modèle source reste inchangé.",
  foundationBanner:
    "Utilise la fondation de documentation clinique d’entreprise (D4B.1). Le plan de soins n’est pas un diagnostic. Les interventions ne sont pas des ordonnances. Les recommandations de sécurité n’autorisent ni contention ni isolement. La préparation à la sortie n’autorise pas la sortie. L’activation ne modifie jamais le catalogue source.",
  nursingBoundary:
    "L’initiation / mise à jour du plan infirmier (EDOC.19 / D4B.2) reste sous paternité infirmière. Cet espace projette les contributions sans les écraser.",
  rtBoundary:
    "Les contributions respiratoires (D4B.4) restent sous paternité RT. Oxygène et ventilation restent sous autorité d’ordonnance / RT — pas sous le plan de soins.",
  rehabBoundary:
    "Les objectifs PT / OT / orthophonie (D4B.5) restent des contributions distinctes — pas un plan « thérapie » générique ni le plan interdisciplinaire complet à eux seuls.",
  techBoundary:
    "Le progrès des tâches technicien (D4B.3) reste attribué au technicien. Les notes de progrès du plan ne réécrivent pas l’exécutant d’origine.",
  edLimitedBanner:
    "Urgences : projection et sensibilisation limitées uniquement. L’activation complète des modèles et le suivi sont disponibles en Observation et Hospitalisation.",
  deferred:
    "Reporté : espaces CM / travail social / UR / pharmacie / nutrition, grands catalogues NANDA, auto-activation depuis le diagnostic, facturation (voir D4B.7+).",
  sections: {
    overview: "Vue d’ensemble",
    templateCatalog: "Catalogue de modèles",
    templatePreview: "Aperçu du modèle",
    activePlans: "Plans actifs",
    goalsOutcomes: "Objectifs et résultats",
    interventions: "Interventions",
    monitoring: "Surveillance",
    education: "Éducation",
    safety: "Recommandations de sécurité",
    progress: "Progrès",
    review: "Révision",
    nursingContributions: "Contributions infirmières",
    rtContributions: "Contributions respiratoires",
    rehabContributions: "Contributions de réadaptation",
    techProgress: "Progrès technicien",
    legacyD3eStub: "Ébauche D3E héritage",
    history: "Historique",
    deferredBoundaries: "Limites et reports",
  },
  capabilities: {
    browseTemplates: "Parcourir les modèles",
    previewTemplate: "Prévisualiser un modèle",
    customize: "Personnaliser le plan patient",
    activate: "Activer le plan",
    progress: "Enregistrer le progrès",
    review: "Réviser le plan",
    revise: "Modifier le plan",
    complete: "Terminer le plan",
    discontinue: "Interrompre le plan",
    enterInError: "Saisie par erreur",
    contributeNursing: "Contribution infirmière",
    contributeRt: "Contribution respiratoire",
    contributeRehab: "Contribution de réadaptation",
    interventionProgress: "Progrès d’intervention",
    monitoring: "Documentation de surveillance",
    education: "Documentation d’éducation",
    safety: "Recommandation de sécurité",
    viewContributions: "Voir les contributions de discipline",
    viewLegacy: "Voir l’ébauche D3E",
  },
  overview: {
    sectionsHint:
      "Parcourez les modèles validés, activez des plans spécifiques au patient, puis suivez le progrès et la révision.",
    templatesHeading: "Modèles actifs",
    plansHeading: "Plans du patient",
    contributionsHeading: "Contributions de discipline",
  },
  lifecycle: {
    DRAFT: "Brouillon",
    DRAFT_CUSTOMIZATION: "Personnalisation (brouillon)",
    ACTIVE: "Actif",
    ON_HOLD: "En attente",
    UNDER_REVIEW: "En révision",
    IN_PROGRESS: "En cours",
    IN_REVIEW: "En révision",
    REVISED: "Révisé",
    COMPLETED: "Terminé",
    DISCONTINUED: "Interrompu",
    ENTERED_IN_ERROR: "Saisi par erreur",
  },
  templates: {
    fallRisk: {
      title: "Risque de chute",
      description:
        "Prévenir les chutes et blessures par précautions au lit, soutien à la mobilité et éducation.",
      focus: "Focus — risque de chute",
      focusBody: "Le patient présente un risque élevé de chute pendant cette rencontre.",
      goal: "Objectif — aucune chute avec blessure",
      goalBody: "Le patient restera sans chute avec blessure durant le séjour.",
      outcome: "Résultat — mobilité sécuritaire",
      outcomeBody: "Transferts et marche sécuritaires avec aide appropriée.",
      intervention: "Intervention — précautions anti-chute",
      interventionBody:
        "Sonnette à portée ; aide aux transferts ; chaussures antidérapantes ; lit bas. Recommandation seulement — ne crée pas d’ordonnances.",
      monitoring: "Surveillance — réévaluation du risque de chute",
      monitoringBody: "Réévaluer le risque de chute à chaque quart et après changement d’état.",
      education: "Éducation — appeler avant de se lever",
      educationBody: "Enseigner au patient/famille d’appeler avant de se lever.",
      safety: "Recommandation de sécurité — précautions anti-chute",
      safetyBody:
        "Recommander des précautions anti-chute. N’autorise pas indépendamment contention ou isolement.",
    },
    aspirationRisk: {
      title: "Risque d’aspiration",
      description:
        "Réduire le risque d’aspiration avec dépistage, précautions alimentaires et collaboration orthophonie.",
      focus: "Focus — risque d’aspiration",
      focusBody:
        "Le patient est à risque d’aspiration lié à une déglutition altérée ou à une conscience altérée.",
      goal: "Objectif — aucun événement d’aspiration",
      goalBody: "Le patient restera sans aspiration observée pendant la rencontre.",
      outcome: "Résultat — prise orale sécuritaire si indiquée",
      outcomeBody: "Prise orale seulement lorsque le dépistage/évaluation le permet.",
      intervention: "Intervention — précautions alimentaires",
      interventionBody:
        "Position semi-assise ; supervision des repas si indiqué ; suivre le dépistage de déglutition. Ne finalise pas les ordonnances de régime.",
      monitoring: "Surveillance — signes respiratoires aux repas",
      monitoringBody: "Surveiller toux, désaturation ou changement de voix à la prise orale.",
      education: "Éducation — précautions d’aspiration",
      educationBody: "Enseigner le positionnement et quand interrompre la prise orale.",
      safety: "Recommandation de sécurité — précautions d’aspiration",
      safetyBody:
        "Recommander des précautions d’aspiration. N’active pas l’isolement et ne change pas le régime.",
    },
    acutePain: {
      title: "Douleur aiguë",
      description:
        "Évaluer, réévaluer et soutenir le confort sans prescrire ni administrer via le plan.",
      focus: "Focus — douleur aiguë",
      focusBody:
        "Le patient signale ou présente des signes de douleur aiguë nécessitant un plan infirmier structuré.",
      goal: "Objectif — confort acceptable",
      goalBody: "Le patient rapporte une douleur acceptable pour l’activité et le repos.",
      outcome: "Résultat — fonction avec confort",
      outcomeBody: "Le patient participe aux soins nécessaires avec un inconfort tolérable.",
      intervention: "Intervention — confort non pharmacologique",
      interventionBody:
        "Positionnement, froid/chaleur si prescrit ailleurs, environnement calme. Le plan ne prescrit ni n’administre de médicaments.",
      monitoring: "Surveillance — réévaluation de la douleur",
      monitoringBody:
        "Réévaluer la douleur après interventions selon la pratique ; le MAR reste le dossier médicamenteux.",
      education: "Éducation — signaler la douleur tôt",
      educationBody: "Enseigner au patient de signaler la douleur avant qu’elle ne devienne sévère.",
    },
    pneumonia: {
      title: "Pneumonie",
      description:
        "Soutenir la récupération respiratoire avec surveillance, mobilisation et collaboration RT — pas d’ordonnances d’antibiotiques.",
      focus: "Focus — soins de pneumonie",
      focusBody:
        "Le patient a une pneumonie ou une infection respiratoire basse suspectée nécessitant un soutien interdisciplinaire.",
      goal: "Objectif — meilleure oxygénation et clairance",
      goalBody:
        "Le patient montrera une amélioration de l’effort respiratoire et de la clairance des sécrétions selon le contexte clinique.",
      outcome: "Résultat — état respiratoire stable",
      outcomeBody: "SpO2 stable et détresse réduite par rapport au début de cette maladie.",
      intervention: "Intervention — hygiène pulmonaire",
      interventionBody:
        "Encourager la respiration profonde, la mobilité selon tolérance, collaboration RT. Ne modifie pas O2/ventilation et ne crée pas d’ordonnances.",
      monitoring: "Surveillance — signes vitaux et effort respiratoire",
      monitoringBody: "Surveiller fréquence respiratoire, SpO2 et effort selon le protocole.",
      education: "Éducation — respiration et récupération",
      educationBody: "Enseigner les techniques respiratoires et quand signaler une dyspnée aggravée.",
    },
    chf: {
      title: "Insuffisance cardiaque (IC)",
      description:
        "Surveillance liquidienne et symptomatique avec éducation — régime et médicaments restent sous ordonnance / MAR.",
      focus: "Focus — insuffisance cardiaque",
      focusBody:
        "Le patient présente une exacerbation d’insuffisance cardiaque ou un risque de décompensation.",
      goal: "Objectif — euvolemie vers le baseline",
      goalBody:
        "Le patient progressera vers son état liquidien de base sans signes évitables de surcharge.",
      outcome: "Résultat — contrôle des symptômes",
      outcomeBody: "Dyspnée et œdème réduits par rapport à l’admission lorsque cliniquement attendu.",
      intervention: "Intervention — poids quotidiens et positionnement",
      interventionBody:
        "Poids quotidiens, tête de lit élevée, activité selon tolérance. Ne finalise pas les ordonnances de régime ou de liquides.",
      monitoring: "Surveillance — poids, entrées/sorties, respiration",
      monitoringBody: "Suivre la tendance du poids, les E/S et les symptômes respiratoires à chaque quart.",
      education: "Éducation — poids et sodium",
      educationBody:
        "Enseigner le suivi du poids quotidien et quand signaler une prise rapide ou une dyspnée aggravée.",
    },
    impairedMobility: {
      title: "Mobilité altérée",
      description:
        "Coordonner soins infirmiers, PT/OT et aide technicien pour une mobilité sécuritaire sans fusionner les disciplines.",
      focus: "Focus — mobilité altérée",
      focusBody: "Le patient a une mobilité limitée nécessitant un soutien interdisciplinaire structuré.",
      goal: "Objectif — mobilité progressive sécuritaire",
      goalBody: "Le patient augmentera sa mobilité sécuritaire avec le niveau d’aide approprié.",
      outcome: "Résultat — progrès des transferts et de la marche",
      outcomeBody: "Progrès documentés des transferts/marche sans chute avec blessure.",
      intervention: "Intervention — mobilité assistée",
      interventionBody:
        "Aider selon les consignes PT/OT et l’évaluation infirmière. Les recommandations d’équipement ne sont pas un achat.",
      monitoring: "Surveillance — tolérance à l’activité",
      monitoringBody: "Surveiller fatigue, étourdissements et intégrité cutanée lors des essais de mobilité.",
      education: "Éducation — techniques de transfert sécuritaires",
      educationBody: "Enseigner au patient/famille les transferts sécuritaires et l’usage d’aides techniques.",
    },
    pressureInjuryRisk: {
      title: "Risque d’escarre",
      description:
        "Protection cutanée et sensibilisation au changement de position — les évaluations de plaies restent infirmières.",
      focus: "Focus — risque d’escarre",
      focusBody: "Le patient est à risque d’escarre lié à l’immobilité ou à une vulnérabilité cutanée.",
      goal: "Objectif — peau intacte",
      goalBody:
        "Le patient conservera une peau intacte ou n’aura pas de nouvelles escarres liées à des lacunes de soins.",
      outcome: "Résultat — points de pression protégés",
      outcomeBody: "Les points de pression restent sans nouvelle lésion de stade 2 ou plus.",
      intervention: "Intervention — repositionnement et décharge",
      interventionBody:
        "Repositionner selon l’horaire ; décharger les talons ; peau propre et sèche. Ne crée pas d’ordonnances VAC ou DME.",
      monitoring: "Surveillance — inspection cutanée",
      monitoringBody: "Inspecter les points de pression à chaque quart ; escalader les nouveautés à l’évaluation infirmière.",
      education: "Éducation — importance du repositionnement",
      educationBody: "Enseigner pourquoi le repositionnement fréquent est important.",
      safety: "Recommandation de sécurité — protection cutanée",
      safetyBody: "Recommander des précautions anti-escarre. N’autorise pas la contention.",
    },
    dischargeReadiness: {
      title: "Préparation à la sortie (partiel)",
      description:
        "Liste de contrôle et éducation vers la préparation — n’autorise pas la sortie (D4B.7 CM/TS/UR).",
      focus: "Focus — préparation à la sortie",
      focusBody: "Le patient nécessite une préparation structurée pour une transition de soins sécuritaire.",
      goal: "Objectif — enseignement et obstacles identifiés",
      goalBody:
        "Enseignements clés complétés et obstacles à une sortie sécuritaire identifiés pour l’équipe.",
      outcome: "Résultat — documentation de préparation",
      outcomeBody:
        "Statut de préparation documenté pour la transmission à la planification de sortie — ce n’est pas une autorisation.",
      intervention: "Intervention — teach-back et revue des obstacles",
      interventionBody:
        "Compléter le teach-back sur médicaments, suivi et signes d’alerte. N’autorise pas la sortie.",
      monitoring: "Surveillance — obstacles restants",
      monitoringBody:
        "Suivre les obstacles d’éducation, d’équipement ou sociaux comme recommandations seulement.",
      education: "Éducation — essentiels après les soins",
      educationBody: "Revoir les essentiels après les soins avec teach-back.",
    },
    deferred: {
      copd: {
        title: "Exacerbation BPCO (complet) — reporté",
        description: "Parcours BPCO complet reporté en attendant la qualité du contenu et les limites d’ordonnances RT.",
      },
      sepsis: {
        title: "Parcours sepsis (complet) — reporté",
        description: "Parcours sepsis complet reporté — ne doit pas auto-commander des bundles depuis le plan.",
      },
      diabetes: {
        title: "Diabète endocrinien (complet) — reporté",
        description: "Processus diabète complet reporté ; les changements médicamenteux restent sous prescription / MAR.",
      },
      stroke: {
        title: "Parcours AVC (complet) — reporté",
        description: "Parcours AVC complet reporté au-delà des starters aspiration/mobilité.",
      },
      behavioral: {
        title: "Santé comportementale (complet) — reporté",
        description: "Protocoles comportementaux complets reportés ; l’autorisation de contention reste hors périmètre.",
      },
    },
  },
  deferrals: {
    copd: "Reporté — parcours d’exacerbation BPCO complet",
    sepsis: "Reporté — parcours sepsis complet / risque d’auto-bundle",
    diabetes: "Reporté — processus endocrinien diabète complet",
    stroke: "Reporté — parcours AVC complet",
    behavioral: "Reporté — protocoles de santé comportementale complets",
  },
};
