"use client";

/**
 * Enveloppe visuelle Medora (en-tête, menu latéral, zone principale).
 * Ne pas dupliquer ce marquage ailleurs : monté une seule fois depuis `app/app/layout.tsx`.
 * L’auth / garde de route reste dans ce layout.
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { type GroupedSidebarSection } from "./sidebarNavConfig";
import { AppShellSidebarNav } from "./AppShellSidebarNav";
import type { ClinicalViewportMode } from "@/lib/clinicalViewport";
import {
  appShellForceSidebarCollapsed,
  appShellUsesMobileDrawer,
  appShellUsesPersistentSidebar,
  resolveActiveNavLabel,
  resolveAppShellNavLayout,
} from "./appShellNavHelpers";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "medora_sidebar_collapsed";
const SIDEBAR_WIDTH_EXPANDED = 244;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const MOBILE_DRAWER_ID = "medora-app-mobile-nav-drawer";

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

function FacilitySelect({
  facilities,
  activeFacility,
  onFacilityChange,
  className,
}: {
  facilities: AppShellFacilityOption[];
  activeFacility: string;
  onFacilityChange: (facilityId: string) => void;
  className?: string;
}) {
  if (facilities.length === 0) return null;
  return (
    <select
      value={activeFacility}
      onChange={(e) => onFacilityChange(e.target.value)}
      className={
        className ??
        "min-h-[38px] max-w-[min(100vw-12rem,28rem)] cursor-pointer truncate rounded-lg border border-slate-600/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none transition-colors hover:border-slate-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
      }
    >
      {facilities.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (raw === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const [navViewportMode, setNavViewportMode] = useState<ClinicalViewportMode>("desktop");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setNavViewportMode(resolveAppShellNavLayout(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const persistentSidebar = appShellUsesPersistentSidebar(navViewportMode);
  const mobileDrawerNav = appShellUsesMobileDrawer(navViewportMode);
  const forceSidebarCollapsed = appShellForceSidebarCollapsed(navViewportMode);
  const sidebarCollapsedEffective = forceSidebarCollapsed || sidebarCollapsed;

  useEffect(() => {
    if (!mobileDrawerNav) setMobileNavOpen(false);
  }, [mobileDrawerNav]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const { t } = useI18n();
  const isMsppArea = pathname.startsWith("/app/mspp");
  const activeSectionTitle = useMemo(
    () => resolveActiveNavLabel(pathname, groupedNavSections, t, mounted),
    [groupedNavSections, mounted, pathname, t]
  );

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        className="relative flex h-14 shrink-0 items-center justify-between border-b border-slate-700/60 bg-slate-950 px-3 text-slate-100 md:px-5 lg:px-6"
        style={{ boxShadow: "inset 0 -1px 0 rgba(148,163,184,0.06)" }}
      >
        {isMsppArea ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-full items-center justify-center px-14 sm:px-24 md:px-32"
            aria-hidden
          >
            <p
              className="line-clamp-2 max-w-[min(72vw,28rem)] text-center text-[10px] font-semibold uppercase leading-snug tracking-wide text-slate-200/95 sm:max-w-[min(65vw,32rem)] sm:text-[11px] md:max-w-[min(55vw,36rem)] md:text-sm lg:text-xl lg:leading-snug"
              title={t("appShell.msppMinistryTitle")}
            >
              {t("appShell.msppMinistryTitle")}
            </p>
          </div>
        ) : null}

        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 md:gap-4 lg:gap-6">
          {mobileDrawerNav ? (
            <button
              type="button"
              data-testid="app-shell-mobile-menu-button"
              aria-label={t("appShell.mobileMenuOpen")}
              aria-expanded={mobileNavOpen}
              aria-controls={MOBILE_DRAWER_ID}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-600/70 bg-slate-900/80 text-slate-100 outline-none transition-colors hover:border-slate-500 hover:bg-slate-800/90 focus-visible:ring-2 focus-visible:ring-teal-500/30"
            >
              <span className="sr-only">{t("appShell.mobileMenuOpen")}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}

          <h1 className="m-0 shrink-0 select-none text-base font-bold leading-none tracking-tight md:text-lg">
            <span className="text-blue-400">Medora</span>
            <span className="text-teal-400">-S</span>
          </h1>

          {mobileDrawerNav && activeSectionTitle ? (
            <p
              className="min-w-0 truncate text-sm font-medium text-slate-200"
              title={activeSectionTitle}
              data-testid="app-shell-mobile-section-title"
            >
              {activeSectionTitle}
            </p>
          ) : null}

          {navViewportMode === "desktop" || navViewportMode === "tablet" ? (
            <FacilitySelect
              facilities={facilities}
              activeFacility={activeFacility}
              onFacilityChange={onFacilityChange}
            />
          ) : null}
        </div>

        <div className="relative z-10 flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleUserMenu}
            className="flex max-w-[min(100vw-8rem,18rem)] min-h-[44px] items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-2 text-left text-sm font-medium text-slate-100 shadow-sm outline-none transition-colors hover:border-slate-500 hover:bg-slate-800/90 focus-visible:ring-2 focus-visible:ring-teal-500/30 md:px-4"
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

      {mobileDrawerNav && mobileNavOpen ? (
        <>
          <button
            type="button"
            data-testid="app-shell-mobile-nav-backdrop"
            aria-label={t("appShell.mobileMenuBackdrop")}
            className="fixed inset-0 z-40 bg-slate-950/60"
            onClick={closeMobileNav}
          />
          <aside
            id={MOBILE_DRAWER_ID}
            role="dialog"
            aria-modal="true"
            aria-label={t("appShell.mobileNavDrawerLabel")}
            data-testid="app-shell-mobile-nav-drawer"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2rem,280px)] flex-col border-r border-slate-700/40 bg-gradient-to-b from-slate-800 to-slate-950 text-slate-50 shadow-2xl"
            style={{ padding: "16px 12px 24px", boxSizing: "border-box" }}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-slate-100">{t("appShell.mobileNavDrawerLabel")}</p>
              <button
                type="button"
                data-testid="app-shell-mobile-nav-close"
                aria-label={t("appShell.mobileMenuClose")}
                onClick={closeMobileNav}
                className="inline-flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-600/70 bg-slate-900/80 text-slate-100 outline-none transition-colors hover:border-slate-500 hover:bg-slate-800/90 focus-visible:ring-2 focus-visible:ring-teal-500/30"
              >
                <span aria-hidden>×</span>
              </button>
            </div>
            {facilities.length > 0 ? (
              <div className="mb-4 shrink-0">
                <FacilitySelect
                  facilities={facilities}
                  activeFacility={activeFacility}
                  onFacilityChange={onFacilityChange}
                  className="min-h-[44px] w-full max-w-none cursor-pointer truncate rounded-lg border border-slate-600/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none transition-colors hover:border-slate-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            ) : null}
            <AppShellSidebarNav
              groupedNavSections={groupedNavSections}
              pathname={pathname}
              mounted={mounted}
              bootstrapping={bootstrapping}
              sidebarCollapsed={false}
              showLabels
              navId="medora-app-mobile-nav"
              t={t}
              onNavLinkClick={closeMobileNav}
            />
          </aside>
        </>
      ) : null}

      <div style={{ display: "flex", flex: 1, minWidth: 0, minHeight: 0 }}>
        {persistentSidebar ? (
          <aside
            data-testid="app-shell-desktop-sidebar"
            data-nav-viewport-mode={navViewportMode}
            style={{
              width: sidebarCollapsedEffective ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
              flexShrink: 0,
              transition: "width 0.2s ease",
              background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              color: "#f8fafc",
              padding: sidebarCollapsedEffective ? "12px 6px 20px" : "18px 12px 24px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(148,163,184,0.12)",
              boxShadow: "4px 0 20px rgba(15,23,42,0.35)",
              overflowX: "hidden",
              boxSizing: "border-box",
            }}
          >
            {navViewportMode === "desktop" ? (
              <div style={{ marginBottom: sidebarCollapsedEffective ? 8 : 10, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-expanded={!sidebarCollapsedEffective}
                  aria-controls="medora-app-sidebar-nav"
                  aria-label={sidebarCollapsedEffective ? t("appShell.sidebarExpand") : t("appShell.sidebarCollapse")}
                  title={sidebarCollapsedEffective ? t("appShell.sidebarExpand") : t("appShell.sidebarCollapse")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: sidebarCollapsedEffective ? "center" : "flex-start",
                    gap: 8,
                    padding: sidebarCollapsedEffective ? "8px 4px" : "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.2)",
                    background: "rgba(15,23,42,0.5)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>
                    {sidebarCollapsedEffective ? "»" : "«"}
                  </span>
                  {!sidebarCollapsedEffective ? (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t("appShell.sidebarCollapse")}
                    </span>
                  ) : null}
                </button>
              </div>
            ) : null}
            <AppShellSidebarNav
              groupedNavSections={groupedNavSections}
              pathname={pathname}
              mounted={mounted}
              bootstrapping={bootstrapping}
              sidebarCollapsed={sidebarCollapsedEffective}
              showLabels={!sidebarCollapsedEffective}
              navId="medora-app-sidebar-nav"
              t={t}
            />
          </aside>
        ) : null}

        <main
          data-testid="app-shell-main-content"
          className="box-border flex-1 min-w-0 bg-gradient-to-b from-[#f0f4f8] to-[#e8eef3] px-3 py-3 md:px-5 md:py-5 lg:p-6"
        >
          {bootstrapping ? (
            <div className="p-3 md:p-4 lg:p-6">
              <p style={{ margin: 0 }}>{t("common.loading")}</p>
            </div>
          ) : routeRedirecting ? (
            <div className="p-3 md:p-4 lg:p-6">
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
