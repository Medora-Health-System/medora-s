/**
 * Menu latéral du shell authentifié — consommé uniquement via `AppShell` (`app/app/layout.tsx`).
 * Libellés : clés i18n (`nav.*`, `navGroups.*`) ; résolution dans `AppShell` via `t()`.
 * Le filtrage RBAC reste dans `app/app/layout.tsx`.
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

export type SidebarNavItem = {
  href: string;
  /** Clé i18n (ex. `nav.trackboard`) — affichage via `t(label)` dans `AppShell`. */
  label: string;
  roles: string[];
  group: NavGroupId;
  accent: NavAccent;
};

type SidebarNavItemDef = Omit<SidebarNavItem, "label"> & { labelKey: string };

const SIDEBAR_NAV_DEFS: SidebarNavItemDef[] = [
  { href: "/app/trackboard", labelKey: "nav.trackboard", roles: ["ADMIN", "PROVIDER", "RN"], group: "accueil", accent: "slate" },
  { href: "/app/registration", labelKey: "nav.registration", roles: ["FRONT_DESK", "ADMIN"], group: "accueil", accent: "slate" },
  { href: "/app/nursing", labelKey: "nav.nursing", roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "teal" },
  { href: "/app/provider", labelKey: "nav.provider", roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "blue" },
  { href: "/app/patients", labelKey: "nav.patients", roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
  { href: "/app/encounters", labelKey: "nav.encounters", roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "slate" },
  {
    href: "/app/hospitalisation",
    labelKey: "nav.hospitalisation",
    roles: ["ADMIN", "PROVIDER", "RN"],
    group: "soins_dossiers",
    accent: "slate",
  },
  { href: "/app/follow-ups", labelKey: "nav.followUps", roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
  { href: "/app/rad-worklist", labelKey: "nav.radWorklist", roles: ["RADIOLOGY", "ADMIN"], group: "examens", accent: "amber" },
  { href: "/app/lab-worklist", labelKey: "nav.labWorklist", roles: ["LAB", "ADMIN"], group: "examens", accent: "purple" },
  { href: "/app/pharmacy", labelKey: "nav.pharmacyQueue", roles: ["PHARMACY", "ADMIN"], group: "pharmacie", accent: "green" },
  { href: "/app/pharmacy-worklist", labelKey: "nav.pharmacyWorklist", roles: ["PHARMACY", "ADMIN"], group: "pharmacie", accent: "green" },
  {
    href: "/app/pharmacy/inventory",
    labelKey: "nav.pharmacyInventory",
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/dispense",
    labelKey: "nav.pharmacyDispense",
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/low-stock",
    labelKey: "nav.pharmacyLowStock",
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  {
    href: "/app/pharmacy/expiring",
    labelKey: "nav.pharmacyExpiring",
    roles: ["PHARMACY", "ADMIN"],
    group: "pharmacie",
    accent: "green",
  },
  { href: "/app/billing", labelKey: "nav.billing", roles: ["BILLING", "ADMIN", "FRONT_DESK"], group: "facturation", accent: "indigo" },
  { href: "/app/fracture", labelKey: "nav.fracture", roles: ["ADMIN"], group: "facturation", accent: "slate" },
  {
    href: "/app/public-health/summary",
    labelKey: "nav.publicHealth",
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  {
    href: "/app/public-health/vaccinations",
    labelKey: "nav.vaccinations",
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  {
    href: "/app/public-health/disease-reports",
    labelKey: "nav.diseaseReports",
    roles: ["RN", "PROVIDER", "ADMIN"],
    group: "sante_publique",
    accent: "orange",
  },
  { href: "/app/admin", labelKey: "nav.admin", roles: ["ADMIN"], group: "admin", accent: "redGray" },
  { href: "/app/admin/users", labelKey: "nav.adminUsers", roles: ["ADMIN"], group: "admin", accent: "redGray" },
];

/**
 * Menu latéral : `label` contient la clé i18n (ex. `nav.trackboard`) pour `t()` dans `AppShell`.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = SIDEBAR_NAV_DEFS.map((d) => ({
  href: d.href,
  roles: d.roles,
  group: d.group,
  accent: d.accent,
  label: d.labelKey,
}));

export function getSidebarNavItems(t: (key: string) => string): SidebarNavItem[] {
  return SIDEBAR_NAV_DEFS.map((d) => ({
    href: d.href,
    roles: d.roles,
    group: d.group,
    accent: d.accent,
    label: t(d.labelKey),
  }));
}

export function getNavGroupTitle(groupId: NavGroupId, t: (key: string) => string): string {
  return t(`navGroups.${groupId}`);
}

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

export type GroupedSidebarSection = {
  groupId: NavGroupId;
  /** Clé i18n (ex. `navGroups.accueil`) — affichage via `t(title)` dans `AppShell`. */
  title: string;
  items: SidebarNavItem[];
};

/** Regroupe les entrées filtrées selon `NAV_GROUP_ORDER` (sections vides exclues). */
export function groupSidebarNavItems(items: SidebarNavItem[]): GroupedSidebarSection[] {
  return NAV_GROUP_ORDER.map((gid) => ({
    groupId: gid,
    title: `navGroups.${gid}`,
    items: items.filter((item) => item.group === gid),
  })).filter((section) => section.items.length > 0);
}
