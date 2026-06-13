/**
 * Central role → landing and route guard for /app.
 * Priority for default home (first matching role wins): ADMIN > PROVIDER > RN > PHARMACY > FRONT_DESK > LAB > RADIOLOGY > BILLING.
 * FRONT_DESK (seul) : accueil administratif — inscription, liste patients, suivis, facturation uniquement (voir APP_ROUTE_RULES).
 * Backend RBAC unchanged; this avoids pointless 403s in the UI.
 *
 * MEDUI.NAV.ROLE.1 — when `navigationProfile` is supplied, `/app` landing uses profession + department navigation areas.
 *
 * `APP_ROLE_CODES` must stay aligned with Prisma `RoleCode` and admin user assignment.
 */

import {
  getLandingRouteForNavigationProfile,
  getVisibleNavigationAreas,
  type NavigationArea,
  type NavigationProfileInput,
} from "@medora/shared";

/** Assignable / known app roles (single source for admin UI + docs). */
export const APP_ROLE_CODES = [
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "PROVIDER",
  "RN",
  "PHARMACY",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "BILLING",
] as const;

export type AppRoleCode = (typeof APP_ROLE_CODES)[number];

/** Rôles portail MSPP national (alignés sur `MsppRoleCode` côté API). */
export const MSPP_ROLE_CODES = [
  "MSPP_MINISTRE",
  "MSPP_EPIDEMIOLOGIE",
  "MSPP_VALIDATOR_DEPT",
  "MSPP_VALIDATOR_CENTRAL",
  /** Administration déléguée des accès MSPP (sans pouvoir plateforme). */
  "MSPP_ADMIN",
  /** Modules santé publique partagés (routes Medora inchangées). */
  "MSPP_PUBLIC_HEALTH",
  "MSPP_DISEASE_REPORTS",
  "MSPP_VACCINATIONS",
] as const;

/** Rôles MSPP opérationnels (tableaux de bord, validation) — hors administration des accès. */
export const MSPP_OPERATIONAL_ROLE_CODES = [
  "MSPP_MINISTRE",
  "MSPP_EPIDEMIOLOGIE",
  "MSPP_VALIDATOR_DEPT",
  "MSPP_VALIDATOR_CENTRAL",
] as const;

/** Modules UI `/app/public-health/*` côté MSPP (hors rôles opérationnels nationaux). */
export const MSPP_MODULE_ROLE_CODES = [
  "MSPP_PUBLIC_HEALTH",
  "MSPP_DISEASE_REPORTS",
  "MSPP_VACCINATIONS",
] as const;

const ROLE_LANDING: Array<{ role: string; path: string }> = [
  { role: "ADMIN", path: "/app/admin" },
  { role: "MEDORA_SUPER_ADMIN", path: "/app/admin" },
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

/**
 * Phase 19V — default post-login landing for clinical trackboard roles.
 * ED trackboard is the primary operational home after sign-in.
 */
export const DEFAULT_POST_LOGIN_PATH = "/app/emergency/trackboard";

/** Facility roles that should land on the trackboard after normal sign-in (not role-home dashboards). */
const TRACKBOARD_DEFAULT_ROLES: readonly string[] = ["ADMIN", "PROVIDER", "RN"];

/**
 * Landing path → i18n key (`landingHome.*` in `messages/en.ts` and `messages/fr.ts`).
 * Used for role-home previews (e.g. admin user editor); unknown paths fall back to the raw path.
 */
export const LANDING_HOME_I18N_KEY_BY_PATH: Record<string, string> = {
  "/app/admin": "landingHome.previewAdmin",
  "/app/provider": "landingHome.previewProvider",
  "/app/nursing": "landingHome.previewNursing",
  "/app/pharmacy": "landingHome.previewPharmacy",
  "/app/registration": "landingHome.previewRegistration",
  "/app/lab-worklist": "landingHome.previewLabWorklist",
  "/app/rad-worklist": "landingHome.previewRadWorklist",
  "/app/billing": "landingHome.previewBilling",
  "/app/fracture": "landingHome.previewFracture",
  "/app/trackboard": "landingHome.previewTrackboard",
  "/app/emergency/trackboard": "landingHome.previewTrackboard",
};

export function getLandingHomeLabel(path: string, t: (key: string) => string): string {
  const key = LANDING_HOME_I18N_KEY_BY_PATH[path];
  return key ? t(key) : path;
}

/** Longest prefix wins. `exact` means pathname must equal prefix (not subpaths). */
type RouteRule = { prefix: string; roles: string[]; exact?: boolean };

const APP_ROUTE_RULES: RouteRule[] = [
  {
    prefix: "/app/public-health/disease-reports",
    roles: [
      "ADMIN",
      "PROVIDER",
      "RN",
      "MSPP_ADMIN",
      "MSPP_DISEASE_REPORTS",
    ],
  },
  {
    prefix: "/app/public-health/vaccinations",
    roles: [
      "ADMIN",
      "PROVIDER",
      "RN",
      "MSPP_ADMIN",
      "MSPP_VACCINATIONS",
    ],
  },
  {
    prefix: "/app/public-health/summary",
    roles: [
      "ADMIN",
      "PROVIDER",
      "RN",
      "MSPP_ADMIN",
      "MSPP_PUBLIC_HEALTH",
    ],
  },
  { prefix: "/app/pharmacy/dispense", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/inventory", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/low-stock", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy/expiring", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy-worklist", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/pharmacy", roles: ["ADMIN", "PHARMACY"] },
  { prefix: "/app/lab-worklist", roles: ["ADMIN", "LAB", "RN"] },
  { prefix: "/app/rad-worklist", roles: ["ADMIN", "RADIOLOGY"] },
  { prefix: "/app/registration", roles: ["ADMIN", "FRONT_DESK"] },
  { prefix: "/app/follow-ups", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK"] },
  /** Dossier patient, face sheet, assurance primaire — accès accueil pour parcours inscription. */
  {
    prefix: "/app/patients/",
    roles: ["ADMIN", "PROVIDER", "RN", "BILLING", "LAB", "RADIOLOGY", "PHARMACY", "FRONT_DESK"],
  },
  { prefix: "/app/patients", roles: ["ADMIN", "PROVIDER", "RN", "FRONT_DESK", "BILLING"], exact: true },
  {
    prefix: "/app/encounters/",
    roles: ["ADMIN", "PROVIDER", "RN", "BILLING", "LAB", "RADIOLOGY", "PHARMACY"],
  },
  { prefix: "/app/encounters", roles: ["ADMIN", "PROVIDER", "RN", "BILLING"], exact: true },
  { prefix: "/app/provider", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/nursing", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/trackboard", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/emergency", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/hospitalisation", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/billing", roles: ["ADMIN", "BILLING", "FRONT_DESK"] },
  { prefix: "/app/fracture", roles: ["ADMIN"] },
  {
    prefix: "/app/admin/roi",
    roles: ["ADMIN"],
  },
  {
    prefix: "/app/admin/roi-monitoring",
    roles: ["MEDORA_SUPER_ADMIN"],
  },
  {
    prefix: "/app/admin/system-health",
    roles: ["MEDORA_SUPER_ADMIN"],
  },
  {
    prefix: "/app/admin/backup-readiness",
    roles: ["MEDORA_SUPER_ADMIN"],
  },
  {
    prefix: "/app/admin/exports",
    roles: ["MEDORA_SUPER_ADMIN"],
  },
  {
    prefix: "/app/admin/compliance",
    roles: ["MEDORA_SUPER_ADMIN"],
  },
  { prefix: "/app/reports", roles: ["ADMIN", "MEDORA_SUPER_ADMIN"] },
  { prefix: "/app/admin/go-live", roles: ["ADMIN", "MEDORA_SUPER_ADMIN"] },
  { prefix: "/app/admin", roles: ["ADMIN", "MEDORA_SUPER_ADMIN"] },
  { prefix: "/app/admin/users", roles: ["ADMIN", "MEDORA_SUPER_ADMIN"] },
  { prefix: "/app/users", roles: ["ADMIN", "MEDORA_SUPER_ADMIN"] },
  { prefix: "/app/lab", roles: ["ADMIN", "LAB", "PROVIDER", "RN"] },
  { prefix: "/app/radiology", roles: ["ADMIN", "RADIOLOGY", "PROVIDER", "RN"] },
  { prefix: "/app/imaging", roles: ["ADMIN", "RADIOLOGY", "PROVIDER", "RN"] },
  { prefix: "/app/results", roles: ["ADMIN", "PROVIDER", "RN", "LAB"] },
  { prefix: "/app/orders", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/medications", roles: ["ADMIN", "PROVIDER", "RN"] },
  { prefix: "/app/settings", roles: ["ADMIN", "PROVIDER", "RN"] },
];

/**
 * Détail consultation `/app/encounters/:id` (un seul segment après `encounters`).
 * Aligné avec le garde du layout (`app/app/layout.tsx`) : ne pas appliquer `getRouteGuardRedirect` ici
 * pour éviter un rebond silencieux vers le tableau de bord — la page consultation applique le RBAC.
 */
export function isEncounterDetailPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/app\/encounters\/[^/]+$/.test(pathname);
}

function normalizeRoleSet(roles: string[]): Set<string> {
  return new Set(roles.map((r) => (r ?? "").toUpperCase().trim()).filter(Boolean));
}

function hasTrackboardDefaultLanding(set: Set<string>): boolean {
  return TRACKBOARD_DEFAULT_ROLES.some((role) => set.has(role));
}

function isDefaultLandingPath(pathname: string): boolean {
  return (
    pathname === DEFAULT_LANDING ||
    pathname.startsWith(`${DEFAULT_LANDING}/`) ||
    pathname === DEFAULT_POST_LOGIN_PATH ||
    pathname.startsWith(`${DEFAULT_POST_LOGIN_PATH}/`)
  );
}

function pathMatchesRule(pathname: string, rule: RouteRule): boolean {
  const { prefix, exact } = rule;
  if (exact) return pathname === prefix;
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** MEDUI.NAV.ROLE.1 — path prefixes allowed when navigation area is visible (UI route guard only). */
const NAVIGATION_AREA_ROUTE_PREFIXES: Partial<Record<NavigationArea, readonly string[]>> = {
  DASHBOARD: ["/app/trackboard", "/app/provider", "/app/nursing"],
  REGISTRATION: ["/app/registration", "/app/patients"],
  EMERGENCY: ["/app/emergency"],
  HOSPITAL: ["/app/hospitalisation"],
  LABORATORY: ["/app/lab-worklist", "/app/lab"],
  RADIOLOGY: ["/app/rad-worklist", "/app/radiology", "/app/imaging"],
  PHARMACY: ["/app/pharmacy", "/app/pharmacy-worklist"],
  BILLING: ["/app/billing"],
  ADMINISTRATION: ["/app/admin"],
};

function pathMatchesNavigationAreaPrefix(pathname: string, area: NavigationArea): boolean {
  const prefixes = NAVIGATION_AREA_ROUTE_PREFIXES[area];
  if (!prefixes?.length) return false;
  const normalized = normalizeAppPathnameForRouteRules(pathname);
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

/** Allows floor/lab/rad technicians to open routes tied to their navigation areas. */
function isAppPathAllowedForNavigationProfile(
  pathname: string,
  profile: NavigationProfileInput
): boolean {
  const visibleAreas = getVisibleNavigationAreas(profile);
  return visibleAreas.some((area) => pathMatchesNavigationAreaPrefix(pathname, area));
}

/** Legacy EN spelling; redirects to `/app/hospitalisation`. Same RBAC as canonical (no duplicate rule). */
function normalizeAppPathnameForRouteRules(pathname: string): string {
  if (pathname === "/app/hospitalization") return "/app/hospitalisation";
  return pathname;
}

/** S22 — Medora platform operations UI; not facility administrators (`ADMIN` alone). */
const PLATFORM_OPERATOR_ONLY_PREFIXES = [
  "/app/admin/system-health",
  "/app/admin/backup-readiness",
  "/app/admin/exports",
  "/app/admin/compliance",
  "/app/admin/roi-monitoring",
] as const;

function isPlatformOperatorOnlyAppPath(pathname: string): boolean {
  const p = normalizeAppPathnameForRouteRules(pathname);
  return PLATFORM_OPERATOR_ONLY_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Sorted longest prefix first for first-match semantics */
function sortedRouteRules(): RouteRule[] {
  return [...APP_ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
}

/**
 * Default landing path after login / when opening /app root.
 * First matching role in ROLE_LANDING order wins unless navigationProfile is supplied.
 */
export function getLandingRouteForRoles(
  roles: string[],
  options?: LandingRouteOptions
): string {
  const set = normalizeRoleSet(roles);
  const hasFacilityAppRole = APP_ROLE_CODES.some((r) => set.has(r));
  const hasMsppOperational = MSPP_OPERATIONAL_ROLE_CODES.some((r) => set.has(r));
  const hasMsppAdminOnly = set.has("MSPP_ADMIN") && !hasMsppOperational;
  const hasAnyMspp = MSPP_ROLE_CODES.some((r) => set.has(r));
  if (!hasFacilityAppRole && hasAnyMspp) {
    if (hasMsppAdminOnly) {
      return "/app/admin/mspp-access";
    }
    /** Utilisateur MSPP avec seulement des rôles modules (pas tableau de bord national). */
    const moduleOnly =
      !hasMsppOperational &&
      !set.has("MSPP_ADMIN") &&
      MSPP_MODULE_ROLE_CODES.some((r) => set.has(r));
    if (moduleOnly) {
      if (set.has("MSPP_PUBLIC_HEALTH")) return "/app/public-health/summary";
      if (set.has("MSPP_DISEASE_REPORTS")) return "/app/public-health/disease-reports";
      if (set.has("MSPP_VACCINATIONS")) return "/app/public-health/vaccinations";
    }
    return "/app/mspp/dashboard";
  }
  if (options?.navigationProfile && hasFacilityAppRole) {
    return getLandingRouteForNavigationProfile(options.navigationProfile);
  }
  if (hasTrackboardDefaultLanding(set)) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  for (const { role, path } of ROLE_LANDING) {
    if (set.has(role)) return path;
  }
  if (hasAnyMspp) return "/app/mspp/dashboard";
  return DEFAULT_LANDING;
}

/**
 * Whether the user may open this pathname under /app (for active facility roles).
 * Platform-only admin paths require `MEDORA_SUPER_ADMIN`. Otherwise `ADMIN` retains broad /app access;
 * others use longest matching APP_ROUTE_RULES prefix.
 */
export function isAppPathAllowedForRoles(
  pathname: string,
  roles: string[],
  options?: { canCreateFacilities?: boolean; navigationProfile?: NavigationProfileInput }
): boolean {
  if (!pathname.startsWith("/app")) return false;
  const pathForRules = normalizeAppPathnameForRouteRules(pathname);
  const set = normalizeRoleSet(roles);
  if (
    options?.navigationProfile &&
    isAppPathAllowedForNavigationProfile(pathForRules, options.navigationProfile)
  ) {
    return true;
  }
  if (isPlatformOperatorOnlyAppPath(pathForRules)) {
    return set.has("MEDORA_SUPER_ADMIN");
  }
  /** Compte principal plateforme (`canCreateFacilities` depuis `/auth/me`) : hub `/app/admin` et sous-routes (hors pages réservées opérateur Medora — voir ci-dessus). */
  if (
    options?.canCreateFacilities === true &&
    (pathForRules === "/app/admin" || pathForRules.startsWith("/app/admin/"))
  ) {
    return true;
  }
  if (
    pathForRules === "/app/admin/mspp-access" ||
    pathForRules.startsWith("/app/admin/mspp-access/")
  ) {
    if (set.has("MSPP_ADMIN")) return true;
  }
  if (set.has("ADMIN")) return true;
  if (pathname === "/app/mspp" || pathname.startsWith("/app/mspp/")) {
    return MSPP_OPERATIONAL_ROLE_CODES.some((r) => set.has(r));
  }
  // Brief /app visit before layout redirects to role home
  if (pathname === "/app" && set.size > 0) return true;

  // Edge-case roles: landing is a trackboard path
  const landing = getLandingRouteForRoles(roles);
  if (isDefaultLandingPath(pathname) && set.size > 0 && isDefaultLandingPath(landing)) {
    return true;
  }

  for (const rule of sortedRouteRules()) {
    if (!pathMatchesRule(pathForRules, rule)) continue;
    return rule.roles.some((r) => set.has(r));
  }
  return false;
}

/**
 * If the user must not stay on `pathname`, returns their safe home path; otherwise null.
 */
export function getRouteGuardRedirect(
  pathname: string,
  roles: string[],
  options?: LandingRouteOptions
): string | null {
  if (!pathname.startsWith("/app")) return null;
  if (pathname === "/app") {
    return getLandingRouteForRoles(roles, options);
  }
  const set = normalizeRoleSet(roles);
  const pathForRules = normalizeAppPathnameForRouteRules(pathname);
  if (isPlatformOperatorOnlyAppPath(pathForRules) && !set.has("MEDORA_SUPER_ADMIN")) {
    return getLandingRouteForRoles(roles);
  }
  if (set.has("ADMIN")) return null;
  if (!isAppPathAllowedForRoles(pathname, roles, options)) return getLandingRouteForRoles(roles, options);
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
export type AuthFacilityRole = {
  facilityId: string;
  role: string;
  departmentCode?: string | null;
};

export type LandingRouteOptions = {
  canCreateFacilities?: boolean;
  /** MEDUI.NAV.ROLE.1 — profession + department landing for `/app` root only. */
  navigationProfile?: NavigationProfileInput;
};

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
  redirectParam: string | null | undefined,
  msppRoles?: string[]
): string {
  const fid = getDefaultSessionFacilityId(facilityRoles);
  const roles = getRoleCodesForSessionFacility(facilityRoles, fid);
  const mspp = (msppRoles ?? []).map((r) => String(r).trim()).filter(Boolean);
  const merged = [...roles, ...mspp];
  const parsed = parseLoginRedirectParam(redirectParam ?? null);
  if (parsed && isAppPathAllowedForRoles(parsed, merged)) return parsed;
  const activeRow = fid ? facilityRoles.find((fr) => fr.facilityId === fid) : undefined;
  return getLandingRouteForRoles(merged, {
    navigationProfile: {
      roleCodes: roles,
      departmentCode: activeRow?.departmentCode ?? null,
      prismaDepartmentCode: activeRow?.departmentCode ?? null,
    },
  });
}
