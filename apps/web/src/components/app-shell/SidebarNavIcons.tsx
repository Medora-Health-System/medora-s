"use client";

import React from "react";
import type { NavAccent } from "./sidebarNavConfig";
import { NAV_ACCENT } from "./sidebarNavConfig";

/** Props communes SVG — flexShrink/display uniquement dans `style` (évite fuites d’attributs DOM invalides). */
const ICON_SVG_PROPS = {
  width: 18,
  height: 18,
  style: { display: "block", flexShrink: 0 } as React.CSSProperties,
};

/**
 * Icônes SVG légères (pas de dépendance externe), couleur = accent du module.
 */
export function SidebarNavIcon({ href, accent }: { href: string; accent: NavAccent }) {
  const stroke = NAV_ACCENT[accent].icon;

  if (href === "/app/trackboard")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  if (href === "/app/registration")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    );
  if (href === "/app/nursing")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  if (href === "/app/provider")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    );
  if (href === "/app/patients")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (href === "/app/encounters")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    );
  if (href === "/app/follow-ups")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  if (href === "/app/rad-worklist")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  if (href === "/app/lab-worklist")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M9 3h6l2 4v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7l2-4z" />
        <path d="M9 11h6" />
        <path d="M10 15h4" />
      </svg>
    );
  if (href === "/app/pharmacy")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M4 6h16" />
        <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
        <path d="M10 10h4" />
      </svg>
    );
  if (href === "/app/pharmacy-worklist")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    );
  if (href === "/app/pharmacy/inventory")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    );
  if (href === "/app/pharmacy/dispense")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M10.5 20.5l10-10a2.2 2.2 0 0 0-3-3l-10 10-4 8 8-4z" />
        <circle cx="8" cy="8" r="1.5" fill="none" stroke={stroke} />
      </svg>
    );
  if (href === "/app/pharmacy/low-stock")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  if (href === "/app/pharmacy/expiring")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M12 14v4M12 18h.01" />
      </svg>
    );
  if (href === "/app/billing")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    );
  if (href === "/app/fracture")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M14.5 2H17a2 2 0 0 1 2 2v3M2 7h4M2 11h4M2 15h4M2 19h4" />
        <path d="M7 2v20M9 7l6-3 6 3v12l-6 3-6-3V7z" />
      </svg>
    );
  if (href === "/app/public-health/summary")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 5-7" />
      </svg>
    );
  if (href === "/app/public-health/vaccinations")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M18 2l4 4" />
        <path d="M17 7l3-3" />
        <path d="M19 9L9 19l-4 4-4-4 4-4 10-10z" />
      </svg>
    );
  if (href === "/app/public-health/disease-reports")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M12 18v-2M12 12h.01" />
      </svg>
    );
  if (href === "/app/admin")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.66l1.42-1.42" />
      </svg>
    );
  if (href === "/app/admin/users")
    return (
      <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );

  return (
    <svg {...ICON_SVG_PROPS} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
