/**
 * Menu latéral du shell authentifié — consommé uniquement via `AppShell` (`app/app/layout.tsx`).
 * Couleurs / regroupements (FR) ; le filtrage RBAC reste dans `app/app/layout.tsx`.
 */

import { ui } from "@/lib/uiLabels";

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

const n = ui.nav;

/**
 * Menu latéral complet (libellés FR) — source unique pour le shell Medora.
 * Filtrer selon les rôles actifs avant affichage.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/app/trackboard", label: n.trackboard, roles: ["ADMIN", "PROVIDER", "RN"], group: "accueil", accent: "slate" },
  { href: "/app/registration", label: n.registration, roles: ["FRONT_DESK", "ADMIN"], group: "accueil", accent: "slate" },
  { href: "/app/nursing", label: n.nursing, roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "teal" },
  { href: "/app/provider", label: n.provider, roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "blue" },
  { href: "/app/patients", label: n.patients, roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
  { href: "/app/encounters", label: n.encounters, roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "slate" },
  {
    href: "/app/hospitalisation",
    label: n.hospitalisation,
    roles: ["ADMIN", "PROVIDER", "RN"],
    group: "soins_dossiers",
    accent: "slate",
  },
  { href: "/app/follow-ups", label: n.followUps, roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
  { href: "/app/rad-worklist", label: n.radWorklist, roles: ["RADIOLOGY", "ADMIN"], group: "examens", accent: "amber" },
  { href: "/app/lab-worklist", label: n.labWorklist, roles: ["LAB", "ADMIN"], group: "examens", accent: "purple" },
  { href: "/app/pharmacy", label: n.pharmacyQueue, roles: ["PHARMACY", "ADMIN"], group: "pharmacie", accent: "green" },
  { href: "/app/pharmacy-worklist", label: n.pharmacyWorklist, roles: ["PHARMACY", "ADMIN"], group: "pharmacie", accent: "green" },
  {
    href: "/app/pharmacy/inventory",
    label: n.pharmacyInventory,
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/dispense",
    label: n.pharmacyDispense,
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/low-stock",
    label: n.pharmacyLowStock,
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/expiring",
    label: n.pharmacyExpiring,
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  { href: "/app/billing", label: n.billing, roles: ["BILLING", "ADMIN", "FRONT_DESK"], group: "facturation", accent: "indigo" },
  { href: "/app/fracture", label: n.fracture, roles: ["ADMIN"], group: "facturation", accent: "slate" },
  {
    href: "/app/public-health/summary",
    label: n.publicHealth,
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  {
    href: "/app/public-health/vaccinations",
    label: n.vaccinations,
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  {
    href: "/app/public-health/disease-reports",
    label: n.diseaseReports,
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  { href: "/app/admin", label: n.admin, roles: ["ADMIN"], group: "admin", accent: "redGray" },
  { href: "/app/admin/users", label: n.adminUsers, roles: ["ADMIN"], group: "admin", accent: "redGray" },
];

export type GroupedSidebarSection = {
  groupId: NavGroupId;
  title: string;
  items: SidebarNavItem[];
};

/** Regroupe les entrées filtrées selon `NAV_GROUP_ORDER` (sections vides exclues). */
export function groupSidebarNavItems(items: SidebarNavItem[]): GroupedSidebarSection[] {
  return NAV_GROUP_ORDER.map((gid) => ({
    groupId: gid,
    title: NAV_GROUP_TITLE[gid],
    items: items.filter((item) => item.group === gid),
  })).filter((section) => section.items.length > 0);
}
