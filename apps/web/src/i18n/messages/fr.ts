import { labels } from "@/lib/uiLabels";

export default {
  ...labels.fr,
  common: {
    ...labels.fr.common,
    settings: "Paramètres",
    create: "Créer",
    cancel: "Annuler",
    save: "Enregistrer",
    edit: "Modifier",
    delete: "Supprimer",
    activate: "Activer",
    deactivate: "Désactiver",
  },
  navGroups: {
    accueil: "Accueil",
    soins_dossiers: "Soins et dossiers",
    pharmacie: "Pharmacie",
    examens: "Laboratoire et imagerie",
    facturation: "Facturation",
    sante_publique: "Santé publique",
    admin: "Administration",
  },
  adminUsers: {
    title: "Utilisateurs et accès",
    name: "Nom",
    email: "Courriel",
    facility: "Établissement",
    roles: "Rôles",
    status: "Statut",
    actions: "Actions",
  },
};
