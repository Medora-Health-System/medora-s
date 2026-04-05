"use client";

import React from "react";

/**
 * Color emoji-style sidebar icons: Twemoji SVG assets (not system emoji characters).
 * Files live in `public/twemoji/` — see `public/twemoji/ATTRIBUTION.txt` (CC-BY 4.0).
 */
const HREF_TWEMOJI_SVG: Record<string, string> = {
  "/app/trackboard": "1f4ca.svg",
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
};

export function SidebarNavIcon({ href }: { href: string }) {
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
