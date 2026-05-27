"use client";

import Link from "next/link";
import { NAV_ACCENT, type GroupedSidebarSection } from "./sidebarNavConfig";
import { SidebarNavIcon } from "./SidebarNavIcons";
import { isSidebarNavItemActive } from "./appShellNavHelpers";

export type AppShellSidebarNavProps = {
  groupedNavSections: GroupedSidebarSection[];
  pathname: string;
  mounted: boolean;
  bootstrapping: boolean;
  sidebarCollapsed: boolean;
  /** When false, icon-only links (desktop collapsed sidebar). Mobile drawer always uses true. */
  showLabels: boolean;
  navId: string;
  t: (key: string) => string;
  onNavLinkClick?: () => void;
};

export function AppShellSidebarNav({
  groupedNavSections,
  pathname,
  mounted,
  bootstrapping,
  sidebarCollapsed,
  showLabels,
  navId,
  t,
  onNavLinkClick,
}: AppShellSidebarNavProps) {
  const iconOnly = !showLabels;

  return (
    <nav
      id={navId}
      aria-label={t("appShell.primaryNavigation")}
      style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0, overflowY: "auto" }}
    >
      {bootstrapping ? (
        <p
          style={{
            margin: iconOnly ? "8px 4px 0" : "8px 10px 0",
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
            style={iconOnly && si > 0 ? { marginTop: 8, paddingTop: 8 } : undefined}
          >
            {showLabels ? (
              <div
                className={`px-2.5 text-xs font-bold uppercase tracking-wider text-white/70 mb-2 ${si > 0 ? "mt-6" : ""}`}
              >
                {t(section.title)}
              </div>
            ) : si > 0 ? (
              <div style={{ height: 1, margin: "6px 4px", background: "rgba(255,255,255,0.08)" }} aria-hidden />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {section.items.map((item) => {
                const accent = NAV_ACCENT[item.accent];
                const active = isSidebarNavItemActive(pathname, item.href, mounted);
                const label = t(item.label);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={label}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavLinkClick}
                    className={`group relative isolate origin-left overflow-hidden rounded-lg transition-all duration-150 ease-out hover:scale-[1.01] hover:shadow-sm ${
                      active
                        ? "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-lg before:bg-transparent before:transition-colors hover:before:bg-white/10"
                        : "bg-[rgba(15,23,42,0.38)] hover:bg-white/10"
                    }`}
                    style={{
                      color: active ? "#fff" : "rgba(248,250,252,0.9)",
                      textDecoration: "none",
                      padding: iconOnly ? "10px 6px" : "11px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: iconOnly ? "center" : undefined,
                      gap: iconOnly ? 0 : 10,
                      minHeight: 44,
                      ...(active
                        ? {
                            backgroundColor: accent.activeBg,
                            backgroundImage: "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.1))",
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
                    {showLabels ? (
                      <span className="relative z-10 min-w-0" style={{ lineHeight: 1.3 }}>
                        {label}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </nav>
  );
}
