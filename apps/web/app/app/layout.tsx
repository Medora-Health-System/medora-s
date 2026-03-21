"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getRouteGuardRedirect } from "@/lib/landingRoute";
import { ui } from "@/lib/uiLabels";
import { parseApiResponse } from "@/lib/apiClient";
import { getProactiveRefreshIntervalMs, parseJwtAccessTtlSeconds } from "@/lib/jwtAccessTtl";
import {
  NAV_ACCENT,
  NAV_GROUP_ORDER,
  NAV_GROUP_TITLE,
  SidebarNavIcon,
  type SidebarNavItem,
} from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [activeFacility, setActiveFacility] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [routeRedirecting, setRouteRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await parseApiResponse(res);
        if (cancelled) return;
        const d = data && typeof data === "object" && !Array.isArray(data) ? (data as { facilityRoles?: unknown }) : null;
        const frs = d && Array.isArray(d.facilityRoles) ? d.facilityRoles : [];
        if (frs.length > 0) {
          setUser(d);
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
        router.replace("/login");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /** Renouvellement proactif : intervalle dérivé du TTL (NEXT_PUBLIC_JWT_ACCESS_TTL = JWT_ACCESS_TTL API), toujours avant expiration du jeton. */
  useEffect(() => {
    if (!user) return;
    const ttlSec = parseJwtAccessTtlSeconds(process.env.NEXT_PUBLIC_JWT_ACCESS_TTL);
    const intervalMs = getProactiveRefreshIntervalMs(ttlSec);
    if (process.env.NODE_ENV === "development") {
      if (!process.env.NEXT_PUBLIC_JWT_ACCESS_TTL?.trim()) {
        console.warn(
          "[session] NEXT_PUBLIC_JWT_ACCESS_TTL est absent : défaut 8h côté client. Alignez sur JWT_ACCESS_TTL de l’API en production."
        );
      }
      if (intervalMs >= ttlSec * 1000) {
        console.warn(
          "[session] Intervalle de refresh >= TTL d’accès — vérifiez NEXT_PUBLIC_JWT_ACCESS_TTL et getProactiveRefreshIntervalMs."
        );
      }
    }
    const id = window.setInterval(() => {
      void fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => {});
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [user]);

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

  // Liens + rôles inchangés ; couleur / groupe = rendu uniquement (voir sidebarNavConfig).
  const n = ui.nav;
  const allNavItems: SidebarNavItem[] = [
    { href: "/app/trackboard", label: n.trackboard, roles: ["ADMIN", "PROVIDER", "RN"], group: "accueil", accent: "slate" },
    { href: "/app/registration", label: n.registration, roles: ["FRONT_DESK", "ADMIN"], group: "accueil", accent: "slate" },
    { href: "/app/nursing", label: n.nursing, roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "teal" },
    { href: "/app/provider", label: n.provider, roles: ["RN", "PROVIDER", "ADMIN"], group: "soins_dossiers", accent: "blue" },
    { href: "/app/patients", label: n.patients, roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
    { href: "/app/encounters", label: n.encounters, roles: ["RN", "PROVIDER", "ADMIN", "FRONT_DESK"], group: "soins_dossiers", accent: "slate" },
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
    { href: "/app/fracture", label: n.fracture, roles: ["FRONT_DESK", "ADMIN"], group: "facturation", accent: "slate" },
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

  // Filter nav items based on user roles. Registration (FRONT_DESK only) and Pharmacy get restricted dashboards.
  const activeRoles = getActiveRoles();
  const clinicalRoles = ["ADMIN", "PROVIDER", "RN", "LAB", "RADIOLOGY", "BILLING"];
  const isRegistrationOnly = activeRoles.includes("FRONT_DESK") && !activeRoles.some((r) => clinicalRoles.includes(r));
  const isPharmacyOnly = activeRoles.includes("PHARMACY") && !activeRoles.includes("ADMIN") && !activeRoles.some((r) => ["PROVIDER", "RN"].includes(r));
  const registrationNavHrefs = new Set([
    "/app/registration",
    "/app/patients",
    "/app/encounters",
    "/app/follow-ups",
    "/app/billing",
    "/app/fracture",
  ]);
  const pharmacyNavHrefs = new Set([
    "/app/pharmacy",
    "/app/pharmacy-worklist",
    "/app/pharmacy/inventory",
    "/app/pharmacy/dispense",
    "/app/pharmacy/low-stock",
    "/app/pharmacy/expiring",
  ]);

  let navItems = allNavItems.filter((item) => item.roles.some((role) => activeRoles.includes(role)));
  if (isRegistrationOnly) {
    navItems = navItems.filter((item) => registrationNavHrefs.has(item.href));
  } else if (isPharmacyOnly) {
    navItems = navItems.filter((item) => pharmacyNavHrefs.has(item.href));
  }

  const groupedNavSections = NAV_GROUP_ORDER.map((gid) => ({
    groupId: gid,
    title: NAV_GROUP_TITLE[gid],
    items: navItems.filter((item) => item.group === gid),
  })).filter((section) => section.items.length > 0);

  const pathname = usePathname();
  useEffect(() => {
    if (!user || !activeFacility || !pathname || !pathname.startsWith("/app")) {
      setRouteRedirecting(false);
      return;
    }
    const roles = getActiveRoles();
    const target = getRouteGuardRedirect(pathname, roles);
    if (target) {
      setRouteRedirecting(true);
      router.replace(target);
    } else {
      setRouteRedirecting(false);
    }
  }, [user, pathname, activeFacility, router]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Topbar */}
      <header
        style={{
          backgroundColor: "#1a1a1a",
          color: "white",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Medora S</h1>
          {facilities.length > 0 && (
            <select
              value={activeFacility}
              onChange={(e) => {
                const newFacility = e.target.value;
                setActiveFacility(newFacility);
                // Update cookie
                document.cookie = `medora_facility_id=${newFacility}; path=/; max-age=${365 * 24 * 60 * 60}`;
                // Refresh page to update all components
                window.location.reload();
              }}
              style={{
                backgroundColor: "#2a2a2a",
                color: "white",
                border: "1px solid #444",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {facilities.map((facilityId) => (
                <option key={facilityId} value={facilityId}>
                  {ui.common.facilityPrefix} {facilityId.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {user?.fullName || ui.common.userFallback}
            <span>▼</span>
          </button>
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                backgroundColor: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: 4,
                minWidth: 200,
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                zIndex: 1000,
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #444" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.fullName || ui.common.userFallback}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  {user?.username || ""}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {ui.common.logout}
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 244,
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            color: "#f8fafc",
            padding: "18px 12px 24px",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(148,163,184,0.12)",
            boxShadow: "4px 0 20px rgba(15,23,42,0.35)",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {groupedNavSections.map((section, si) => (
              <div key={section.groupId} style={{ marginTop: si > 0 ? 16 : 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(248,250,252,0.42)",
                    padding: "0 10px 8px",
                    borderBottom: "1px solid rgba(148,163,184,0.12)",
                    marginBottom: 8,
                  }}
                >
                  {section.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {section.items.map((item) => {
                    const accent = NAV_ACCENT[item.accent];
                    const active =
                      pathname === item.href ||
                      (item.href !== "/app" && pathname?.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          color: active ? "#fff" : "rgba(248,250,252,0.9)",
                          textDecoration: "none",
                          padding: "9px 10px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          transition: "background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          backgroundColor: active ? accent.activeBg : "rgba(15,23,42,0.38)",
                          boxShadow: active ? `inset 3px 0 0 ${accent.border}` : "inset 3px 0 0 transparent",
                          border: "1px solid rgba(148,163,184,0.1)",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor = accent.hoverBg;
                            e.currentTarget.style.boxShadow = `inset 3px 0 0 ${accent.border}`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.38)";
                            e.currentTarget.style.boxShadow = "inset 3px 0 0 transparent";
                          }
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: active ? accent.pillBg : "rgba(15,23,42,0.35)",
                            flexShrink: 0,
                          }}
                        >
                          <SidebarNavIcon href={item.href} accent={item.accent} />
                        </span>
                        <span style={{ lineHeight: 1.3 }}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 24, background: "linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%)" }}>
          {routeRedirecting ? (
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0 }}>{ui.common.redirecting}</p>
              {pathname !== "/app" && (
                <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#666" }}>
                  {ui.common.unauthorizedRedirect}
                </p>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

