/**
 * Navigation latérale : couleurs par module, regroupements (FR), clés d’icônes.
 * Utilisé uniquement pour le rendu — la logique de rôles reste dans layout.tsx.
 */

export type NavAccent =
  | "slate"
  | "teal"
  | "blue"
  | "green"
  | "purple"
  | "amber"
  | "indigo"
  | "orange"
  | "redGray";

/** Couleurs discrètes : bordure active, icône, fond léger */
export const NAV_ACCENT: Record<
  NavAccent,
  { border: string; icon: string; pillBg: string; hoverBg: string; activeBg: string }
> = {
  slate: {
    border: "#64748b",
    icon: "#475569",
    pillBg: "rgba(100,116,139,0.14)",
    hoverBg: "rgba(100,116,139,0.1)",
    activeBg: "rgba(100,116,139,0.2)",
  },
  teal: {
    border: "#0d9488",
    icon: "#0f766e",
    pillBg: "rgba(13,148,136,0.14)",
    hoverBg: "rgba(13,148,136,0.1)",
    activeBg: "rgba(13,148,136,0.22)",
  },
  blue: {
    border: "#2563eb",
    icon: "#1d4ed8",
    pillBg: "rgba(37,99,235,0.14)",
    hoverBg: "rgba(37,99,235,0.1)",
    activeBg: "rgba(37,99,235,0.22)",
  },
  green: {
    border: "#16a34a",
    icon: "#15803d",
    pillBg: "rgba(22,163,74,0.14)",
    hoverBg: "rgba(22,163,74,0.1)",
    activeBg: "rgba(22,163,74,0.22)",
  },
  purple: {
    border: "#9333ea",
    icon: "#7e22ce",
    pillBg: "rgba(147,51,234,0.14)",
    hoverBg: "rgba(147,51,234,0.1)",
    activeBg: "rgba(147,51,234,0.22)",
  },
  amber: {
    border: "#d97706",
    icon: "#b45309",
    pillBg: "rgba(217,119,6,0.14)",
    hoverBg: "rgba(217,119,6,0.1)",
    activeBg: "rgba(217,119,6,0.22)",
  },
  indigo: {
    border: "#4f46e5",
    icon: "#4338ca",
    pillBg: "rgba(79,70,229,0.14)",
    hoverBg: "rgba(79,70,229,0.1)",
    activeBg: "rgba(79,70,229,0.22)",
  },
  orange: {
    border: "#ea580c",
    icon: "#c2410c",
    pillBg: "rgba(234,88,12,0.14)",
    hoverBg: "rgba(234,88,12,0.1)",
    activeBg: "rgba(234,88,12,0.22)",
  },
  redGray: {
    border: "#78716c",
    icon: "#991b1b",
    pillBg: "rgba(120,113,108,0.16)",
    hoverBg: "rgba(120,113,108,0.1)",
    activeBg: "rgba(153,27,27,0.12)",
  },
};

export type NavGroupId =
  | "accueil"
  | "soins_dossiers"
  | "pharmacie"
  | "examens"
  | "facturation"
  | "sante_publique"
  | "admin";

/** Titres de section affichés au-dessus du premier lien du groupe (FR) */
export const NAV_GROUP_TITLE: Record<NavGroupId, string> = {
  accueil: "Accueil",
  soins_dossiers: "Soins et dossiers",
  pharmacie: "Pharmacie",
  examens: "Laboratoire et imagerie",
  facturation: "Facturation",
  sante_publique: "Santé publique",
  admin: "Administration",
};

export type SidebarNavItem = {
  href: string;
  label: string;
  roles: string[];
  group: NavGroupId;
  accent: NavAccent;
};

/** Ordre d’affichage des sections dans la barre latérale */
export const NAV_GROUP_ORDER: NavGroupId[] = [
  "accueil",
  "soins_dossiers",
  "pharmacie",
  "examens",
  "facturation",
  "sante_publique",
  "admin",
];
