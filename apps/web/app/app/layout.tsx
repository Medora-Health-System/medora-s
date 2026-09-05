"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getRouteGuardRedirect } from "@/lib/landingRoute";
import { fetchAuthMeSession, invalidateAuthMeSessionCache } from "@/lib/authSessionMe";
import {
  beginLoadSessionRequest,
  clearedAuthenticatedSessionState,
  isLatestLoadSessionRequest,
  shouldIgnoreStaleAuthMeResult,
} from "@/lib/authSessionBootstrap";
import { isTransientAuthFailureKind, nextAuthTransientBackoffMs } from "@/lib/authSessionRetry";
import {
  getEffectiveAccessTtlSecondsForProactiveRefresh,
  getProactiveRefreshIntervalMs,
} from "@/lib/jwtAccessTtl";
import { filterSidebarNavItemsByNavigationAreas, buildNavigationProfileFromSession } from "@/features/navigation/navigationVisibility";
/**
 * Shell authentifié unique : `AppShell` + nav (`sidebarNavConfig`).
 * Imports directs vers les fichiers (pas de barrel `app-shell/index`) — évite manifest / chunks client incorrects.
 */
import { AppShell, type AppShellFacilityOption } from "@/components/app-shell/AppShell";
import { PlatformAnnouncementGate } from "@/components/platform-announcement/PlatformAnnouncementGate";
import { SIDEBAR_NAV_ITEMS, groupSidebarNavItems } from "@/components/app-shell/sidebarNavConfig";
import { I18nFacilityLanguageBridge } from "@/i18n/provider";
import { readActiveFacilityLanguage } from "@/i18n/resolveClientUiLanguage";
import { switchActiveFacility } from "@/lib/facilitySwitch";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilities, setFacilities] = useState<AppShellFacilityOption[]>([]);
  const [activeFacility, setActiveFacility] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [routeRedirecting, setRouteRedirecting] = useState(false);
  /** Après la 1re réponse /api/auth/me : évite de rendre le menu avec 0 entrée (user encore null). */
  const [sessionReady, setSessionReady] = useState(false);
  type SessionBootstrapPhase =
    | "loading"
    | "authenticated"
    | "unauthenticated"
    | "recoverable_error"
    | "temporarily_unverifiable";
  const [sessionPhase, setSessionPhase] = useState<SessionBootstrapPhase>("loading");
  const [authRecoveryMessage, setAuthRecoveryMessage] = useState<string | null>(null);
  /** TTL d’accès (secondes) tel que renvoyé par GET /api/auth/me — aligné sur JWT_ACCESS_TTL (cookies), pas sur NEXT_PUBLIC seul. */
  const [sessionAccessTtlSec, setSessionAccessTtlSec] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const loadSessionSeqRef = useRef(0);
  const userRef = useRef(user);
  userRef.current = user;
  const sessionPhaseRef = useRef(sessionPhase);
  sessionPhaseRef.current = sessionPhase;
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearAuthenticatedSession = useCallback(() => {
    const cleared = clearedAuthenticatedSessionState();
    setUser(cleared.user);
    setFacilities(cleared.facilities);
    setActiveFacility(cleared.activeFacility);
    setAuthRecoveryMessage(cleared.authRecoveryMessage);
    setSessionAccessTtlSec(cleared.sessionAccessTtlSec);
  }, []);

  const redirectToLogin = useCallback(() => {
    invalidateAuthMeSessionCache();
    clearAuthenticatedSession();
    setSessionPhase("unauthenticated");
    router.replace("/login");
  }, [clearAuthenticatedSession, router]);

  const loadSession = useCallback(async (opts?: { force?: boolean }) => {
    const requestSeq = beginLoadSessionRequest(loadSessionSeqRef);
    const hadVerifiedSession = Boolean(userRef.current);
    if (opts?.force && !hadVerifiedSession) {
      setSessionPhase("loading");
      setAuthRecoveryMessage(null);
    }
    try {
      const result = await fetchAuthMeSession({ force: opts?.force });
      if (!isMountedRef.current) return;
      if (shouldIgnoreStaleAuthMeResult({
        requestSeq,
        latestSeq: loadSessionSeqRef.current,
        result,
      })) {
        return;
      }

      if (!result.ok) {
        if (result.failureKind === "unauthenticated") {
          redirectToLogin();
          return;
        }
        if (result.failureKind === "forbidden") {
          // 403 is authorization, not an infrastructure outage.
          if (userRef.current) {
            setSessionPhase("authenticated");
            return;
          }
          redirectToLogin();
          return;
        }
        if (isTransientAuthFailureKind(result.failureKind)) {
          if (userRef.current) {
            console.warn("[auth] session_verify_transient_upstream_failure");
            setSessionPhase("temporarily_unverifiable");
            return;
          }
          setSessionPhase("recoverable_error");
          setAuthRecoveryMessage(null);
          return;
        }
        redirectToLogin();
        return;
      }

      if (
        sessionPhaseRef.current === "temporarily_unverifiable" ||
        sessionPhaseRef.current === "recoverable_error"
      ) {
        console.info("[auth] session_verify_recovered");
      }

      const data = result.data;
      if (!data) {
        redirectToLogin();
        return;
      }
      const d =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as { facilityRoles?: unknown; msppRoles?: unknown; accessTokenTtlSeconds?: unknown })
          : null;
      if (
        d &&
        typeof d.accessTokenTtlSeconds === "number" &&
        Number.isFinite(d.accessTokenTtlSeconds) &&
        d.accessTokenTtlSeconds > 0
      ) {
        setSessionAccessTtlSec(Math.floor(d.accessTokenTtlSeconds));
      }
      const frs = d && Array.isArray(d.facilityRoles) ? d.facilityRoles : [];
      const msppRolesFromMe =
        d && Array.isArray(d.msppRoles)
          ? d.msppRoles.filter((x): x is string => typeof x === "string")
          : [];
      const { accessTokenTtlSeconds: _ttlIgnored, ...userPayload } = d ?? {};

      // Facility users: keep pre–Phase 3 behavior (must not depend on MSPP fields).
      if (frs.length > 0 && d) {
        setUser(userPayload);
        setSessionPhase("authenticated");
        setAuthRecoveryMessage(null);
        const nameById = new Map<string, string>();
        for (const fr of frs as { facilityId?: unknown; facilityName?: unknown }[]) {
          const fid = String(fr.facilityId ?? "");
          if (!fid) continue;
          const raw = fr.facilityName;
          const label =
            typeof raw === "string" && raw.trim() ? raw.trim() : fid;
          if (!nameById.has(fid)) nameById.set(fid, label);
        }
        const facilityOptions: AppShellFacilityOption[] = [...nameById.entries()].map(([id, name]) => ({
          id,
          name,
        }));
        const facilityIds = facilityOptions.map((f) => f.id);
        setFacilities(facilityOptions);

        const cookieValue = document.cookie
          .split("; ")
          .find((row) => row.startsWith("medora_facility_id="))
          ?.split("=")[1];

        if (cookieValue && facilityIds.includes(cookieValue)) {
          setActiveFacility(cookieValue);
        } else if (facilityIds.length > 0) {
          // Prefer server-owned switch so httpOnly + readable cookies stay aligned (HF3).
          // Fall back to readable cookie only for display until switch completes.
          const fallbackId = facilityIds[0]!;
          setActiveFacility(fallbackId);
          void switchActiveFacility(fallbackId).then((result) => {
            if (!result.ok || !isMountedRef.current) return;
            setActiveFacility(result.facilityId);
          });
        }
      } else if (msppRolesFromMe.length > 0 && d) {
        // MSPP-only session (no facility roles): optional path, does not affect facility hydration above.
        setUser(userPayload);
        setSessionPhase("authenticated");
        setAuthRecoveryMessage(null);
        setFacilities([]);
        setActiveFacility("");
      } else {
        redirectToLogin();
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      if (!isMountedRef.current) return;
      if (!isLatestLoadSessionRequest(requestSeq, loadSessionSeqRef.current)) return;
      if (userRef.current) {
        setSessionPhase("temporarily_unverifiable");
        return;
      }
      setSessionPhase("recoverable_error");
      setAuthRecoveryMessage(null);
    } finally {
      if (isMountedRef.current && isLatestLoadSessionRequest(requestSeq, loadSessionSeqRef.current)) {
        setSessionReady(true);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (sessionPhase !== "recoverable_error" && sessionPhase !== "temporarily_unverifiable") {
      return;
    }
    let cancelled = false;
    let attempt = 0;
    let timeoutId: number | null = null;
    const schedule = () => {
      const delay = nextAuthTransientBackoffMs(attempt);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        attempt += 1;
        void loadSession({ force: true }).then(() => {
          if (cancelled) return;
          if (
            sessionPhaseRef.current === "recoverable_error" ||
            sessionPhaseRef.current === "temporarily_unverifiable"
          ) {
            schedule();
          }
        });
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [sessionPhase, loadSession]);

  useEffect(() => {
    const onSessionRefresh = () => {
      void loadSession({ force: true });
    };
    window.addEventListener("medora:session-refresh", onSessionRefresh);
    return () => window.removeEventListener("medora:session-refresh", onSessionRefresh);
  }, [loadSession]);

  /** Session résolue sans accès app (ni établissement ni MSPP) — redirect only after user cleared. */
  useEffect(() => {
    if (!sessionReady || user || sessionPhase === "recoverable_error") return;
    if (sessionPhase === "unauthenticated") {
      router.replace("/login");
    }
  }, [sessionReady, user, sessionPhase, router]);

  const sessionContentReady =
    Boolean(user) &&
    (sessionPhase === "authenticated" || sessionPhase === "temporarily_unverifiable");
  const redirectingToLogin = sessionPhase === "unauthenticated" && !user;

  /**
   * Renouvellement proactif : intervalle dérivé du TTL réel (réponse /api/auth/me = même base que les cookies JWT_ACCESS_TTL).
   * Repli : getEffectiveAccessTtlSecondsForProactiveRefresh (NEXT_PUBLIC ou plafond prudent).
   */
  useEffect(() => {
    if (!user) return;
    const ttlSec = sessionAccessTtlSec ?? getEffectiveAccessTtlSecondsForProactiveRefresh();
    const intervalMs = getProactiveRefreshIntervalMs(ttlSec);
    if (process.env.NODE_ENV === "development") {
      if (sessionAccessTtlSec == null && !process.env.NEXT_PUBLIC_JWT_ACCESS_TTL?.trim()) {
        console.warn(
          "[session] accessTokenTtlSeconds absent et NEXT_PUBLIC_JWT_ACCESS_TTL absent : repli sur intervalle prudent (plafond 5 min). Définissez JWT_ACCESS_TTL dans apps/web (aligné sur l’API)."
        );
      }
      if (intervalMs >= ttlSec * 1000) {
        console.warn(
          "[session] Intervalle de refresh >= TTL d’accès — vérifiez JWT_ACCESS_TTL et getProactiveRefreshIntervalMs."
        );
      }
    }
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
          if (!r.ok) {
            if (r.status === 401) {
              window.clearInterval(id);
              router.replace("/login");
            }
          }
        } catch {
          /* transient refresh failure — keep interval; do not logout */
        }
      })();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [user, sessionAccessTtlSec, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    invalidateAuthMeSessionCache();
    clearAuthenticatedSession();
    setSessionPhase("unauthenticated");
    router.push("/login");
  };

  // Get user roles for active facility
  const getActiveRoles = (): string[] => {
    if (!user || !activeFacility) return [];
    return user.facilityRoles
      .filter((fr: any) => fr.facilityId === activeFacility)
      .map((fr: any) => fr.role);
  };

  const getActiveFacilityRoleRows = (): {
    departmentCode?: string | null;
    professionCode?: string | null;
    role?: string | null;
    facilityType?: string | null;
    serviceLines?: readonly string[] | null;
    careProfileJson?: unknown;
    facilityCountry?: string | null;
  }[] => {
    if (!user || !activeFacility) return [];
    return (
      user.facilityRoles as {
        facilityId?: string;
        departmentCode?: string | null;
        professionCode?: string | null;
        role?: string | null;
        facilityType?: string | null;
        serviceLines?: readonly string[] | null;
        careProfileJson?: unknown;
        facilityCountry?: string | null;
      }[]
    ).filter((fr) => fr.facilityId === activeFacility);
  };

  const getActiveFacilityRoleRow = () => getActiveFacilityRoleRows()[0] ?? null;

  const buildNavigationProfile = () => {
    const rows = getActiveFacilityRoleRows();
    const activeRoleRow = rows[0] ?? null;
    const professionCodes = rows
      .map((r) => r.professionCode)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    const departmentCodes = rows
      .map((r) => r.departmentCode)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    return buildNavigationProfileFromSession({
      roleCodes: activeRoles,
      departmentCode: activeRoleRow?.departmentCode ?? null,
      prismaDepartmentCode: activeRoleRow?.departmentCode ?? null,
      professionCodes,
      departmentCodes,
      facilityType: activeRoleRow?.facilityType ?? null,
      facilityServiceLines: activeRoleRow?.serviceLines ?? null,
      careProfileJson: activeRoleRow?.careProfileJson,
      facilityCountry: activeRoleRow?.facilityCountry ?? null,
    });
  };

  const facilityLanguage = readActiveFacilityLanguage(user?.facilityRoles, activeFacility);

  const activeRoles = getActiveRoles();
  const hasMedoraSuperAdminAnywhere =
    Array.isArray(user?.facilityRoles) &&
    user.facilityRoles.some((fr: { role?: unknown }) => fr.role === "MEDORA_SUPER_ADMIN");
  const msppRolesForNav = Array.isArray(user?.msppRoles)
    ? user.msppRoles.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const combinedRolesForNav = [
    ...activeRoles,
    ...(hasMedoraSuperAdminAnywhere && !activeRoles.includes("MEDORA_SUPER_ADMIN")
      ? (["MEDORA_SUPER_ADMIN"] as const)
      : []),
    ...msppRolesForNav,
  ];
  /** Rôles « soins / technique » — accueil seul (FRONT_DESK sans ces rôles) : menu limité à inscription / liste patients / suivis / facturation. */
  const clinicalCareRoles = ["ADMIN", "PROVIDER", "RN", "LAB", "RADIOLOGY", "PHARMACY"];
  const isFrontDeskNavRestricted =
    activeRoles.includes("FRONT_DESK") && !activeRoles.some((r) => clinicalCareRoles.includes(r));
  const isPharmacyOnly = activeRoles.includes("PHARMACY") && !activeRoles.includes("ADMIN") && !activeRoles.some((r) => ["PROVIDER", "RN"].includes(r));
  const registrationNavHrefs = new Set([
    "/app/registration",
    "/app/patients",
    "/app/follow-ups",
    "/app/billing",
  ]);
  const pharmacyNavPathnames = new Set([
    "/app/pharmacy",
    "/app/pharmacy-worklist",
    "/app/pharmacy/inventory",
    "/app/pharmacy/dispense",
    "/app/pharmacy/low-stock",
    "/app/pharmacy/expiring",
  ]);
  const pharmacyHrefPathname = (href: string) => href.split("?")[0] || href;

  let navItems = SIDEBAR_NAV_ITEMS.filter((item) => {
    if (item.platformAdminOnly) {
      if (item.href === "/app/admin/mspp-access") {
        return (
          user?.canCreateFacilities === true || msppRolesForNav.includes("MSPP_ADMIN")
        );
      }
      return user?.canCreateFacilities === true;
    }
    return item.roles.some((role) => combinedRolesForNav.includes(role));
  });
  /** Portail MSPP national : ne pas réduire le menu à « pharmacie seule » ou « accueil seul » (sinon perte d’Accès MSPP / routes nationales). */
  const hasNationalMsppRoles = msppRolesForNav.length > 0;
  if (!hasNationalMsppRoles && isFrontDeskNavRestricted) {
    navItems = navItems.filter((item) => registrationNavHrefs.has(item.href));
  } else if (!hasNationalMsppRoles && isPharmacyOnly) {
    navItems = navItems.filter((item) => pharmacyNavPathnames.has(pharmacyHrefPathname(item.href)));
  }

  if (!hasNationalMsppRoles && !isFrontDeskNavRestricted) {
    navItems = filterSidebarNavItemsByNavigationAreas(navItems, buildNavigationProfile());
  }

  const groupedNavSections = groupSidebarNavItems(navItems);

  const pathname = usePathname() ?? "";
  useEffect(() => {
    if (!user || !pathname || !pathname.startsWith("/app")) {
      setRouteRedirecting(false);
      return;
    }
    const msppRolesForGuard = Array.isArray(user.msppRoles)
      ? user.msppRoles.filter((x: unknown): x is string => typeof x === "string")
      : [];
    if (!activeFacility && msppRolesForGuard.length === 0) {
      setRouteRedirecting(false);
      return;
    }
    const facilityRoleCodes = getActiveRoles();
    const hasMsAnywhere =
      Array.isArray(user.facilityRoles) &&
      user.facilityRoles.some((fr: { role?: unknown }) => fr.role === "MEDORA_SUPER_ADMIN");
    const roles = [
      ...facilityRoleCodes,
      ...(hasMsAnywhere && !facilityRoleCodes.includes("MEDORA_SUPER_ADMIN")
        ? (["MEDORA_SUPER_ADMIN"] as const)
        : []),
      ...msppRolesForGuard,
    ];
    const frs = Array.isArray(user.facilityRoles) ? user.facilityRoles : [];
    const hasAnyFacilityRole = frs.length > 0;
    const hasMspp = msppRolesForGuard.length > 0;
    // Évite un faux « non autorisé » si cookie / établissement actif pas encore alignés avec l’entrée facilityRoles (course au chargement).
    if (hasAnyFacilityRole && facilityRoleCodes.length === 0 && !hasMspp) {
      setRouteRedirecting(false);
      return;
    }
    const target = getRouteGuardRedirect(pathname, roles, {
      canCreateFacilities: user?.canCreateFacilities === true,
      navigationProfile: buildNavigationProfile(),
    });
    if (target) {
      setRouteRedirecting(true);
      router.replace(target);
    } else {
      setRouteRedirecting(false);
    }
  }, [user, pathname, activeFacility, router]);

  return (
    <>
      <I18nFacilityLanguageBridge facilityLanguage={facilityLanguage} />
      <AppShell
        pathname={pathname}
        routeRedirecting={routeRedirecting}
        bootstrapping={sessionPhase === "loading" && !user}
        sessionContentReady={sessionContentReady}
        redirectingToLogin={redirectingToLogin}
        authRecoveryActive={sessionPhase === "recoverable_error" && !user}
        connectivityDegraded={sessionPhase === "temporarily_unverifiable"}
        authRecoveryMessage={sessionPhase === "recoverable_error" ? authRecoveryMessage : null}
        onAuthRecoveryRetry={() => {
          void loadSession({ force: true });
        }}
        onAuthRecoveryLogin={() => {
          invalidateAuthMeSessionCache();
          router.replace("/login");
        }}
        onAuthRecoveryReload={() => {
          window.location.reload();
        }}
        facilities={facilities}
        activeFacility={activeFacility}
        onFacilityChange={(newFacility) => {
          // D4A.2.8-HF3 — server-owned switch updates httpOnly + readable cookies together.
          // Do not mark UI active until the server confirms; never write httpOnly from JS.
          void (async () => {
            const requested = String(newFacility ?? "").trim();
            if (!requested || requested === activeFacility) return;
            const result = await switchActiveFacility(requested);
            if (!result.ok) {
              console.error("[facility-switch] denied or failed", {
                code: result.code,
                status: result.status,
              });
              return;
            }
            setActiveFacility(result.facilityId);
            invalidateAuthMeSessionCache();
            window.location.reload();
          })();
        }}
        userFullName={user?.fullName ?? ""}
        userUsername={user?.username}
        showUserMenu={showUserMenu}
        onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
        onLogout={handleLogout}
        groupedNavSections={groupedNavSections}
      >
        <PlatformAnnouncementGate sessionReady={sessionReady} userId={user?.id} facilityId={activeFacility || undefined}>
          {children}
        </PlatformAnnouncementGate>
      </AppShell>
    </>
  );
}
