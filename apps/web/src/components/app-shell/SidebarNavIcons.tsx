"use client";

import React from "react";

/**
 * Sidebar marks: Twemoji SVG for most routes (`public/twemoji/`, see ATTRIBUTION.txt).
 * MSPP routes use the official brand mark + stroke SVGs (no playful emoji) for a calmer executive look.
 */

const HREF_TWEMOJI_SVG: Record<string, string> = {
  "/app/trackboard": "1f4ca.svg",
  "/app/emergency/trackboard": "1f6a8.svg",
  "/app/emergency/triage": "1f4cb.svg",
  "/app/registration": "1f3e0.svg",
  "/app/nursing": "1fac0.svg",
  "/app/provider": "1f9d1-200d-2695-fe0f.svg",
  "/app/patients": "1f465.svg",
  "/app/encounters": "1f4c4.svg",
  "/app/hospitalisation": "1f6cc.svg",
  "/app/follow-ups": "1f504.svg",
  "/app/pharmacy": "1f48a.svg",
  "/app/pharmacy-worklist": "1f4cb.svg",
  "/app/pharmacy/inventory": "1f4e6.svg",
  "/app/pharmacy/dispense": "1f489.svg",
  "/app/pharmacy/low-stock": "26a0.svg",
  "/app/pharmacy/expiring": "23f3.svg",
  "/app/public-health/summary": "1f30d.svg",
  "/app/public-health/vaccinations": "1f489.svg",
  "/app/public-health/disease-reports": "1f6a8.svg",
  "/app/rad-worklist": "1fa7b.svg",
  "/app/lab-worklist": "1f9ea.svg",
  "/app/billing": "1f4b3.svg",
  "/app/fracture": "1f9fe.svg",
  "/app/admin": "2699.svg",
  "/app/admin/users": "1f465.svg",
  "/app/admin/audit": "1f4dc.svg",
  "/app/reports": "1f4ca.svg",
  "/app/admin/go-live": "26a0.svg",
  "/app/admin/exports": "1f4e6.svg",
  "/app/admin/backup-readiness": "1f4c4.svg",
};

function MsppBrandMark() {
  return (
    <img
      src="/branding/mspp-logo.png"
      alt=""
      width={20}
      height={20}
      decoding="async"
      draggable={false}
      className="pointer-events-none h-5 w-auto max-w-[30px] shrink-0 select-none object-contain object-center opacity-95"
      aria-hidden
    />
  );
}

/** Rapport — document outline */
function IconMsppRapport() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/** Alert inbox — bell */
function IconMsppAlerts() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Validation — check circle */
function IconMsppValidation() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/** Accès MSPP (admin plateforme) — lock */
function IconMsppAccessAdmin() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function SidebarNavIcon({ href }: { href: string }) {
  if (href === "/app/mspp/dashboard") {
    return <MsppBrandMark />;
  }
  if (href === "/app/mspp/alerts") {
    return <IconMsppAlerts />;
  }
  if (href === "/app/mspp/rapport" || href === "/app/mspp/bulletin" || href === "/app/mspp/exports") {
    return <IconMsppRapport />;
  }
  if (href === "/app/mspp/validation") {
    return <IconMsppValidation />;
  }
  if (href === "/app/mspp/audit") {
    return <IconMsppRapport />;
  }
  if (href === "/app/mspp/analytics") {
    return <MsppBrandMark />;
  }
  if (href === "/app/admin/mspp-access") {
    return <IconMsppAccessAdmin />;
  }

  const file = HREF_TWEMOJI_SVG[href] ?? "2753.svg";
  return (
    <img
      src={`/twemoji/${file}`}
      alt=""
      width={20}
      height={20}
      decoding="async"
      draggable={false}
      className="pointer-events-none block h-5 w-5 shrink-0 select-none object-contain object-center"
      aria-hidden
    />
  );
}
