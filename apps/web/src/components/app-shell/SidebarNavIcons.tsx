"use client";

import React from "react";
import { resolveSidebarNavIconPathname } from "@medora/shared";

/**
 * Sidebar iconography uses the human-designed Tabler Icons project (MIT).
 * Pinned to v3.47.0 so visual meaning cannot drift with upstream releases.
 * Source/license: https://tabler.io/icons and https://tabler.io/license
 *
 * MSPP retains its official brand mark. No generative/AI imagery is used here.
 */
const TABLER_VERSION = "3.47.0";
const TABLER_CDN = `https://cdn.jsdelivr.net/npm/@tabler/icons@${TABLER_VERSION}/icons/outline`;

const HREF_TABLER_ICON: Record<string, string> = {
  "/app/trackboard": "layout-dashboard",
  "/app/clinic-care": "stethoscope",
  "/app/registration": "user-plus",
  "/app/emergency/trackboard": "ambulance",
  "/app/emergency/triage": "clipboard-heart",
  "/app/nursing": "nurse",
  "/app/hospitalisation": "building-hospital",
  "/app/digital-care": "device-mobile-heart",
  "/app/patients": "users",
  "/app/appointments": "calendar-event",
  "/app/follow-ups": "calendar-repeat",
  "/app/pharmacy": "pill",
  "/app/pharmacy-worklist": "clipboard-list",
  "/app/pharmacy/inventory": "packages",
  "/app/pharmacy/dispense": "medicine-syrup",
  "/app/pharmacy/low-stock": "alert-triangle",
  "/app/pharmacy/expiring": "hourglass-low",
  "/app/rad-worklist": "x-ray",
  "/app/lab-worklist": "test-pipe",
  "/app/billing": "receipt-dollar",
  "/app/public-health/summary": "world-heart",
  "/app/public-health/vaccinations": "vaccine",
  "/app/public-health/disease-reports": "report-medical",
  "/app/admin": "settings",
  "/app/admin/users": "user-shield",
  "/app/admin/audit": "clipboard-check",
  "/app/reports": "report-analytics",
  "/app/admin/go-live": "rocket",
  "/app/admin/exports": "file-export",
  "/app/admin/roi": "file-description",
  "/app/admin/roi-monitoring": "chart-line",
  "/app/admin/backup-readiness": "database-export",
  "/app/admin/system-health": "heartbeat",
  "/app/admin/compliance": "shield-check",
  "/app/admin/mspp-access": "lock-access",
  "/app/dental": "dental",
};

function MsppBrandMark(){
  return <img src="/branding/mspp-logo.png" alt="" width={20} height={20} decoding="async" draggable={false} className="pointer-events-none h-5 w-auto max-w-[30px] shrink-0 select-none object-contain object-center opacity-95" aria-hidden/>;
}

const MEDORA_ICON_BLUE = "#60a5fa";

function RadiologyNavIcon(){
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none block h-5 w-5 shrink-0" fill="none" stroke={MEDORA_ICON_BLUE} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5h16" />
      <path d="M6.5 16.5 15.7 7.3" />
      <path d="m14.2 5.8 4 4" />
      <path d="m5.3 15.2 3.5 3.5" />
      <path d="M16.8 4.8 19.2 7.2" />
      <circle cx="18.2" cy="16.3" r="2.2" />
      <path d="M18.2 14.1v4.4M16 16.3h4.4" opacity=".75" />
    </svg>
  );
}

function TablerNavIcon({name}:{name:string}){
  return <span
    aria-hidden
    className="pointer-events-none block h-5 w-5 shrink-0"
    style={{
      backgroundColor: MEDORA_ICON_BLUE,
      WebkitMaskImage: `url("${TABLER_CDN}/${name}.svg")`,
      maskImage: `url("${TABLER_CDN}/${name}.svg")`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    }}
  />;
}

export function SidebarNavIcon({href}:{href:string}){
  if(href==="/app/mspp/dashboard" || href==="/app/mspp/analytics") return <MsppBrandMark/>;
  if(href==="/app/rad-worklist") return <RadiologyNavIcon/>;
  const iconKey=resolveSidebarNavIconPathname(href);
  const name=HREF_TABLER_ICON[iconKey] ?? HREF_TABLER_ICON[href] ?? "circle";
  return <TablerNavIcon name={name}/>;
}
