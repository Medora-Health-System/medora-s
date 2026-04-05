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
        className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700/60 bg-slate-950 px-6 text-slate-100"
        style={{ boxShadow: "inset 0 -1px 0 rgba(148,163,184,0.06)" }}
      >
        <div className="flex min-w-0 items-center gap-6">
          <h1 className="m-0 shrink-0 select-none text-lg font-bold leading-none tracking-tight">
            <span className="text-blue-400">Medora</span>
            <span className="text-teal-400">-S</span>
          </h1>
          {facilities.length > 0 && (
            <select
              value={activeFacility}
              onChange={(e) => onFacilityChange(e.target.value)}
              className="min-h-[38px] max-w-[min(100vw-12rem,28rem)] cursor-pointer truncate rounded-lg border border-slate-600/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none transition-colors hover:border-slate-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleUserMenu}
            className="flex max-w-[min(100vw-8rem,18rem)] items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/80 px-4 py-2 text-left text-sm font-medium text-slate-100 shadow-sm outline-none transition-colors hover:border-slate-500 hover:bg-slate-800/90 focus-visible:ring-2 focus-visible:ring-teal-500/30"
          >
            <span className="min-w-0 truncate">{userFullName || t("common.userFallback")}</span>
            <span className="shrink-0 text-[10px] leading-none text-slate-400" aria-hidden>
              ▾
            </span>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full z-[1000] mt-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-lg shadow-black/40">
              <div className="border-b border-slate-700/80 px-4 py-3">
                <div className="text-sm font-medium text-slate-100">
                  {userFullName || t("common.userFallback")}
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">{userUsername || ""}</div>
              </div>

              <Link
                href="/app/settings"
                className="block px-4 py-3 text-sm text-slate-100 no-underline transition-colors hover:bg-slate-800/90"
              >
                {t("common.settings")}
              </Link>

              <button
                type="button"
                onClick={onLogout}
                className="w-full cursor-pointer border-0 bg-transparent px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:bg-slate-800/90"
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
              <div
                key={section.groupId}
                className={si > 0 ? "border-t border-white/10" : undefined}
              >
                <div
                  className={`px-2.5 text-xs font-bold uppercase tracking-wider text-white/70 mb-2 ${si > 0 ? "mt-6" : ""}`}
                >
                  {t(section.title)}
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
                        className={`group relative isolate origin-left overflow-hidden rounded-lg transition-all duration-150 ease-out hover:scale-[1.01] hover:shadow-sm ${
                          active
                            ? "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-lg before:bg-transparent before:transition-colors hover:before:bg-white/10"
                            : "bg-[rgba(15,23,42,0.38)] hover:bg-white/10"
                        }`}
                        style={{
                          color: active ? "#fff" : "rgba(248,250,252,0.9)",
                          textDecoration: "none",
                          padding: "9px 10px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          ...(active
                            ? {
                                backgroundColor: accent.activeBg,
                                backgroundImage:
                                  "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.1))",
                                boxShadow: `inset 3px 0 0 ${accent.border}, 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`,
                              }
                            : {
                                boxShadow: "inset 3px 0 0 transparent",
                              }),
                          border: "1px solid rgba(148,163,184,0.1)",
                        }}
                      >
                        <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-sm transition-all duration-200 group-hover:bg-white/20">
                          <SidebarNavIcon href={item.href} />
                        </span>
                        <span className="relative z-10" style={{ lineHeight: 1.3 }}>
                          {t(item.label)}
                        </span>
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
