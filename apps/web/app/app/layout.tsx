"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getRouteGuardRedirect } from "@/lib/landingRoute";
import { parseApiResponse } from "@/lib/apiClient";
import {
  getEffectiveAccessTtlSecondsForProactiveRefresh,
  getProactiveRefreshIntervalMs,
} from "@/lib/jwtAccessTtl";
/**
 * Shell authentifié unique : `AppShell` + nav (`sidebarNavConfig`).
 * Imports directs vers les fichiers (pas de barrel `app-shell/index`) — évite manifest / chunks client incorrects.
 */
import { AppShell } from "@/components/app-shell/AppShell";
import { SIDEBAR_NAV_ITEMS, groupSidebarNavItems } from "@/components/app-shell/sidebarNavConfig";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [activeFacility, setActiveFacility] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [routeRedirecting, setRouteRedirecting] = useState(false);
  /** Après la 1re réponse /api/auth/me : évite de rendre le menu avec 0 entrée (user encore null). */
  const [sessionReady, setSessionReady] = useState(false);
  /** TTL d’accès (secondes) tel que renvoyé par GET /api/auth/me — aligné sur JWT_ACCESS_TTL (cookies), pas sur NEXT_PUBLIC seul. */
  const [sessionAccessTtlSec, setSessionAccessTtlSec] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!isMountedRef.current) return;
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = await parseApiResponse(res);
      if (!isMountedRef.current) return;
      const d =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as { facilityRoles?: unknown; accessTokenTtlSeconds?: unknown })
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
      if (frs.length > 0 && d) {
        const { accessTokenTtlSeconds: _ttlIgnored, ...userPayload } = d;
        setUser(userPayload);
        const facilityIds: string[] = Array.from(new Set(frs.map((fr: any) => String(fr.facilityId))));
        setFacilities(facilityIds);

        const cookieValue = document.cookie
          .split("; ")
          .find((row) => row.startsWith("medora_facility_id="))
          ?.split("=")[1];

        if (cookieValue && facilityIds.includes(cookieValue)) {
          setActiveFacility(cookieValue);
        } else if (facilityIds.length > 0) {
          setActiveFacility(facilityIds[0]);
          document.cookie = `medora_facility_id=${facilityIds[0]}; path=/; max-age=${365 * 24 * 60 * 60}`;
        }
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      if (isMountedRef.current) {
        router.replace("/login");
      }
    } finally {
      if (isMountedRef.current) {
        setSessionReady(true);
      }
    }
  }, [router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onSessionRefresh = () => {
      void loadSession();
    };
    window.addEventListener("medora:session-refresh", onSessionRefresh);
    return () => window.removeEventListener("medora:session-refresh", onSessionRefresh);
  }, [loadSession]);

  /** Session résolue sans rôle établissement : aligné sur la garde d’accès (pas de shell « vide » durable). */
  useEffect(() => {
    if (!sessionReady || user) return;
    router.replace("/login");
  }, [sessionReady, user, router]);

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
      void fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => {});
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [user, sessionAccessTtlSec]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    router.push("/login");
  };

  // Get user roles for active facility
  const getActiveRoles = (): string[] => {
    if (!user || !activeFacility) return [];
    return user.facilityRoles
      .filter((fr: any) => fr.facilityId === activeFacility)
      .map((fr: any) => fr.role);
  };

  const activeRoles = getActiveRoles();
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
  const pharmacyNavHrefs = new Set([
    "/app/pharmacy",
    "/app/pharmacy-worklist",
    "/app/pharmacy/inventory",
    "/app/pharmacy/dispense",
    "/app/pharmacy/low-stock",
    "/app/pharmacy/expiring",
  ]);

  let navItems = SIDEBAR_NAV_ITEMS.filter((item) => item.roles.some((role) => activeRoles.includes(role)));
  if (isFrontDeskNavRestricted) {
    navItems = navItems.filter((item) => registrationNavHrefs.has(item.href));
  } else if (isPharmacyOnly) {
    navItems = navItems.filter((item) => pharmacyNavHrefs.has(item.href));
  }

  const groupedNavSections = groupSidebarNavItems(navItems);

  const pathname = usePathname() ?? "";
  useEffect(() => {
    if (!user || !activeFacility || !pathname || !pathname.startsWith("/app")) {
      setRouteRedirecting(false);
      return;
    }
    const roles = getActiveRoles();
    const frs = Array.isArray(user.facilityRoles) ? user.facilityRoles : [];
    const hasAnyFacilityRole = frs.length > 0;
    // Évite un faux « non autorisé » si cookie / établissement actif pas encore alignés avec l’entrée facilityRoles (course au chargement).
    if (hasAnyFacilityRole && roles.length === 0) {
      setRouteRedirecting(false);
      return;
    }
    const target = getRouteGuardRedirect(pathname, roles);
    if (target) {
      setRouteRedirecting(true);
      router.replace(target);
    } else {
      setRouteRedirecting(false);
    }
  }, [user, pathname, activeFacility, router]);

  return (
    <AppShell
      pathname={pathname}
      routeRedirecting={routeRedirecting}
      bootstrapping={!sessionReady || !user}
      facilities={facilities}
      activeFacility={activeFacility}
      onFacilityChange={(newFacility) => {
        setActiveFacility(newFacility);
        document.cookie = `medora_facility_id=${newFacility}; path=/; max-age=${365 * 24 * 60 * 60}`;
        window.location.reload();
      }}
      userFullName={user?.fullName ?? ""}
      userUsername={user?.username}
      showUserMenu={showUserMenu}
      onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
      onLogout={handleLogout}
      groupedNavSections={groupedNavSections}
    >
      {children}
    </AppShell>
  );
}
