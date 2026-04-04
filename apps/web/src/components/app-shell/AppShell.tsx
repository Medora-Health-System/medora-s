"use client";

/**
 * Enveloppe visuelle Medora (en-tête, menu latéral, zone principale).
 * Ne pas dupliquer ce marquage ailleurs : monté une seule fois depuis `app/app/layout.tsx`.
 * L’auth / garde de route reste dans ce layout.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { NAV_ACCENT, type GroupedSidebarSection } from "./sidebarNavConfig";
import { SidebarNavIcon } from "./SidebarNavIcons";

/** Établissements issus de `/api/auth/me` (`facilityRoles`) — `value` du `<select>` = id réel. */
export type AppShellFacilityOption = { id: string; name: string };

export type AppShellProps = {
  children: React.ReactNode;
  /** Toujours une chaîne (évite écart SSR / hydratation si `usePathname()` est null). */
  pathname: string;
  routeRedirecting: boolean;
  /** Session en cours de résolution : même cadre visuel, sans menu ni contenu (évite barre latérale vide = impression d’ancienne UI). */
  bootstrapping?: boolean;
  facilities: AppShellFacilityOption[];
  activeFacility: string;
  onFacilityChange: (facilityId: string) => void;
  userFullName: string;
  userUsername?: string;
  showUserMenu: boolean;
  onToggleUserMenu: () => void;
  onLogout: () => void;
  groupedNavSections: GroupedSidebarSection[];
};

export function AppShell({
  children,
  pathname,
  routeRedirecting,
  bootstrapping = false,
  facilities,
  activeFacility,
  onFacilityChange,
  userFullName,
  userUsername,
  showUserMenu,
  onToggleUserMenu,
  onLogout,
  groupedNavSections,
}: AppShellProps) {
  /** Évite écart SSR/hydratation sur le style « actif » lié à `pathname`. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
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
              onChange={(e) => onFacilityChange(e.target.value)}
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
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={onToggleUserMenu}
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
            {userFullName || t("common.userFallback")}
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
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {userFullName || t("common.userFallback")}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  {userUsername || ""}
                </div>
              </div>

              <Link
                href="/app/settings"
                style={{
                  display: "block",
                  padding: "12px 16px",
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Paramètres
              </Link>

              <button
                type="button"
                onClick={onLogout}
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
                {t("common.logout")}
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
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
            {bootstrapping ? (
              <p
                style={{
                  margin: "8px 10px 0",
                  fontSize: 13,
                  color: "rgba(248,250,252,0.75)",
                  lineHeight: 1.45,
                }}
              >
                {t("common.loading")}
              </p>
            ) : (
              groupedNavSections.map((section, si) => (
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
                      mounted &&
                      (pathname === item.href ||
                        (item.href !== "/app" && pathname.startsWith(item.href + "/")));
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
            ))
            )}
          </nav>
        </aside>

        <main style={{ flex: 1, padding: 24, background: "linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%)" }}>
          {bootstrapping ? (
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0 }}>{t("common.loading")}</p>
            </div>
          ) : routeRedirecting ? (
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0 }}>{t("common.redirecting")}</p>
              {pathname !== "/app" && (
                <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#666" }}>{t("common.unauthorizedRedirect")}</p>
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
