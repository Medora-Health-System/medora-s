/**
 * Central role → landing and route guard for /app.
 * Priority for default home (first matching role wins): ADMIN > PROVIDER > RN > PHARMACY > FRONT_DESK > LAB > RADIOLOGY > BILLING.
 * Backend RBAC unchanged; this avoids pointless 403s in the UI.
 *
 * `APP_ROLE_CODES` must stay aligned with Prisma `RoleCode` and admin user assignment.
 */

/** Assignable / known app roles (single source for admin UI + docs). */
export const APP_ROLE_CODES = [
  "ADMIN",
  "PROVIDER",
  "RN",
  "PHARMACY",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "BILLING",
] as const;

export type AppRoleCode = (typeof APP_ROLE_CODES)[number];

const ROLE_LANDING: Array<{ role: string; path: string }> = [
  { role: "ADMIN", path: "/app/admin" },
  { role: "PROVIDER", path: "/app/provider" },
  { role: "RN", path: "/app/nursing" },
  { role: "PHARMACY", path: "/app/pharmacy" },
  { role: "FRONT_DESK", path: "/app/registration" },
  { role: "LAB", path: "/app/lab-worklist" },
  { role: "RADIOLOGY", path: "/app/rad-worklist" },
  { role: "BILLING", path: "/app/billing" },
];

/** When no ROLE_LANDING role matches (edge case), send user to clinical trackboard */
const DEFAULT_LANDING = "/app/trackboard";

/** Libellés français pour l’aperçu « accueil après connexion » (pas d’URL affichée aux utilisateurs finaux si possible). */
export const LANDING_HOME_LABEL_FR: Record<string, string> = {
  "/app/admin": "Espace administration",
  "/app/provider": "Espace médecin",
  "/app/nursing": "Soins infirmiers",
  "/app/pharmacy": "Pharmacie",
  "/app/registration": "Accueil et inscription",
  "/app/lab-worklist": "File laboratoire",
  "/app/rad-worklist": "File imagerie",
  "/app/billing": "Facturation",
  "/app/fracture": "Fracture",
  "/app/trackboard": "Tableau clinique",
};

export function getLandingHomeLabelFr(path: string): string {
  return LANDING_HOME_LABEL_FR[path] ?? path;
}

/** Longest prefix wins. `exact` means pathname must equal prefix (not subpaths). */
type RouteRule = { prefix: string; roles: string[]; exact?: boolean };

const APP_ROUTE_RULES: RouteRule[] = [
  { prefix: "/app/public-health/disease-reports", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/public-health/vaccinations", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/public-health/summary", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/pharmacy/dispense", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/inventory", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/low-stock", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/expiring", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy-worklist", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/lab-worklist", roles: ["ADMIN", "LAB"] },
  { prefix: "/app/rad-worklist", roles: ["ADMIN", "RADIOLOGY"] },
  { prefix: "/app/registration", roles: ["ADMIN", "FRONT_DESK"] },
  { prefix: "/app/follow-ups", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK"] },
  /** Détail consultation = dossier clinique : pas d’accueil (FRONT_DESK). La liste /app/encounters reste autorisée (exact). */
  {
    prefix: "/app/encounters/",
    roles: ["ADMIN", "PROVIDER", "RN", "BILLING", "LAB", "RADIOLOGY", "PHARMACY"],
  },
  { prefix: "/app/encounters", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK", "BILLING"], exact: true },
  { prefix: "/app/patients", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK"] },
  { prefix: "/app/provider", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/nursing", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/trackboard", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK"] },
  { prefix: "/app/billing", roles: ["ADMIN", "BILLING", "FRONT_DESK"] },
  { prefix: "/app/fracture", roles: ["ADMIN", "FRONT_DESK"] },
  { prefix: "/app/admin", roles: ["ADMIN"] },
  { prefix: "/app/admin/users", roles: ["ADMIN"] },
  { prefix: "/app/users", roles: ["ADMIN"] },
  { prefix: "/app/lab", roles: ["ADMIN", "LAB", "PROVIDER", "RN"] },
  { prefix: "/app/radiology", roles: ["ADMIN", "RADIOLOGY", "PROVIDER", "RN"] },
  { prefix: "/app/imaging", roles: ["ADMIN", "RADIOLOGY", "PROVIDER", "RN"] },
  { prefix: "/app/results", roles: ["ADMIN", "PROVIDER", "RN", "LAB"] },
  { prefix: "/app/orders", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/medications", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/settings", roles: ["ADMIN", "PROVIDER", "RN"] },
];

function normalizeRoleSet(roles: string[]): Set<string> {
  return new Set(roles.map((r) => (r ?? "").toUpperCase().trim()).filter(Boolean));
}

function pathMatchesRule(pathname: string, rule: RouteRule): boolean {
  const { prefix, exact } = rule;
  if (exact) return pathname === prefix;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Sorted longest prefix first for first-match semantics */
function sortedRouteRules(): RouteRule[] {
  return [...APP_ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
}

/**
 * Default landing path after login / when opening /app root.
 * First matching role in ROLE_LANDING order wins.
 */
export function getLandingRouteForRoles(roles: string[]): string {
  const set = normalizeRoleSet(roles);
  for (const { role, path } of ROLE_LANDING) {
    if (set.has(role)) return path;
  }
  return DEFAULT_LANDING;
}

/**
 * Whether the user may open this pathname under /app (for active facility roles).
 * ADMIN: all /app paths. Others: longest matching APP_ROUTE_RULES prefix must allow a role they hold.
 */
export function isAppPathAllowedForRoles(pathname: string, roles: string[]): boolean {
  if (!pathname.startsWith("/app")) return false;
  const set = normalizeRoleSet(roles);
  if (set.has("ADMIN")) return true;
  // Brief /app visit before layout redirects to role home
  if (pathname === "/app" && set.size > 0) return true;

  // Edge-case roles: landing is DEFAULT_LANDING (trackboard)
  if (
    (pathname === DEFAULT_LANDING || pathname.startsWith(`${DEFAULT_LANDING}/`)) &&
    set.size > 0 &&
    getLandingRouteForRoles(roles) === DEFAULT_LANDING
  ) {
    return true;
  }

  for (const rule of sortedRouteRules()) {
    if (!pathMatchesRule(pathname, rule)) continue;
    return rule.roles.some((r) => set.has(r));
  }
  return false;
}

/**
 * If the user must not stay on `pathname`, returns their safe home path; otherwise null.
 */
export function getRouteGuardRedirect(pathname: string, roles: string[]): string | null {
  if (!pathname.startsWith("/app")) return null;
  if (pathname === "/app") {
    return getLandingRouteForRoles(roles);
  }
  const set = normalizeRoleSet(roles);
  if (set.has("ADMIN")) return null;
  if (!isAppPathAllowedForRoles(pathname, roles)) return getLandingRouteForRoles(roles);
  return null;
}

/**
 * Safe redirect target from login `?redirect=` (internal /app only).
 */
export function parseLoginRedirectParam(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (!decoded.startsWith("/app")) return null;
  const q = decoded.indexOf("?");
  const pathOnly = q >= 0 ? decoded.slice(0, q) : decoded;
  if (pathOnly.includes("..")) return null;
  return pathOnly || null;
}

/**
 * After login: use redirect if allowed for the user's roles.
 */
export function getPostLoginDestination(roles: string[], redirectParam: string | null | undefined): string {
  const parsed = parseLoginRedirectParam(redirectParam ?? null);
  if (parsed && isAppPathAllowedForRoles(parsed, roles)) return parsed;
  return getLandingRouteForRoles(roles);
}

/** Entrée `facilityRoles` telle que renvoyée par `/auth/login` et `/auth/me`. */
export type AuthFacilityRole = { facilityId: string; role: string };

/** Tri stable (identique au tri côté API) pour choisir l’établissement de session. */
export function sortAuthFacilityRoles<T extends { facilityId: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.facilityId.localeCompare(b.facilityId, "en"));
}

/** Premier établissement après tri — aligné sur le cookie `medora_facility_id` après connexion. */
export function getDefaultSessionFacilityId(facilityRoles: AuthFacilityRole[]): string | null {
  const sorted = sortAuthFacilityRoles(facilityRoles);
  return sorted[0]?.facilityId ?? null;
}

/** Rôles actifs uniquement pour l’établissement de session (évite un mélange multi-établissements au login). */
export function getRoleCodesForSessionFacility(
  facilityRoles: AuthFacilityRole[],
  facilityId: string | null
): string[] {
  const codes = (r: string) => Boolean(r && String(r).trim());
  if (!facilityId) {
    return [...new Set(facilityRoles.map((fr) => fr.role).filter(codes))];
  }
  return facilityRoles
    .filter((fr) => fr.facilityId === facilityId && codes(fr.role))
    .map((fr) => fr.role);
}

/**
 * Destination après login : `?redirect=` autorisé ou landing selon les rôles **de l’établissement par défaut**.
 */
export function getPostLoginDestinationForAuthUser(
  facilityRoles: AuthFacilityRole[],
  redirectParam: string | null | undefined
): string {
  const fid = getDefaultSessionFacilityId(facilityRoles);
  const roles = getRoleCodesForSessionFacility(facilityRoles, fid);
  return getPostLoginDestination(roles, redirectParam);
}
