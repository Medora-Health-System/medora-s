/**
 * MEDUI.INP.2B.2 — Inline SVG icons for nursing admission rapid selection.
 * Bundled assets only; no remote images.
 */

"use client";

import type { CSSProperties, ReactNode } from "react";

const iconBox: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
};

function SvgWrap({ children }: { children: ReactNode }) {
  return (
    <span style={iconBox} aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        {children}
      </svg>
    </span>
  );
}

export function AdmissionSourceIcon({ code }: { code: string }) {
  switch (code) {
    case "EMERGENCY_DEPARTMENT":
      return (
        <SvgWrap>
          <path d="M12 3v18M3 12h18" strokeLinecap="round" />
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </SvgWrap>
      );
    case "DIRECT_ADMISSION":
      return (
        <SvgWrap>
          <path d="M4 18V8l8-4 8 4v10" />
          <path d="M9 18v-6h6v6" />
        </SvgWrap>
      );
    case "OUTSIDE_HOSPITAL_TRANSFER":
      return (
        <SvgWrap>
          <rect x="3" y="7" width="8" height="10" rx="1" />
          <rect x="13" y="7" width="8" height="10" rx="1" />
          <path d="M11 12h2" />
        </SvgWrap>
      );
    case "SNF_TRANSFER":
      return (
        <SvgWrap>
          <path d="M4 20V10l8-5 8 5v10" />
          <path d="M8 20v-4h8v4" />
        </SvgWrap>
      );
    case "LONG_TERM_CARE":
      return (
        <SvgWrap>
          <path d="M3 20h18" />
          <path d="M6 20v-8h4v8M14 20v-5h4v5" />
          <path d="M10 8h4v3h-4z" />
        </SvgWrap>
      );
    case "REHABILITATION_TRANSFER":
      return (
        <SvgWrap>
          <circle cx="8" cy="6" r="2" />
          <path d="M8 8v6M8 14l-2 4M8 14l4 4" />
          <path d="M16 10h4M18 8v4" />
        </SvgWrap>
      );
    case "CLINIC":
      return (
        <SvgWrap>
          <path d="M12 4a3 3 0 0 1 3 3v1h2a2 2 0 0 1 2 2v8H5V10a2 2 0 0 1 2-2h2V7a3 3 0 0 1 3-3z" />
          <path d="M10 14h4" />
        </SvgWrap>
      );
    case "PROCEDURAL_AREA":
      return (
        <SvgWrap>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </SvgWrap>
      );
    default:
      return (
        <SvgWrap>
          <circle cx="12" cy="12" r="8" />
          <path d="M8 12h8" />
        </SvgWrap>
      );
  }
}

export function ModeOfArrivalIcon({ code }: { code: string }) {
  switch (code) {
    case "AMBULATORY":
      return (
        <SvgWrap>
          <circle cx="9" cy="5" r="2" />
          <path d="M9 7v4l-3 5M9 11l4 5" />
          <path d="M15 7l2 4-2 4" />
        </SvgWrap>
      );
    case "WHEELCHAIR":
      return (
        <SvgWrap>
          <circle cx="8" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 16V8h8v8M10 8h6" />
        </SvgWrap>
      );
    case "STRETCHER":
      return (
        <SvgWrap>
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <path d="M5 14v3M19 14v3" />
          <path d="M8 10V8h8v2" />
        </SvgWrap>
      );
    case "EMS":
      return (
        <SvgWrap>
          <rect x="3" y="8" width="14" height="8" rx="1" />
          <path d="M17 12h4" />
          <path d="M7 8V6h6v2" />
        </SvgWrap>
      );
    case "PRIVATE_VEHICLE":
      return (
        <SvgWrap>
          <path d="M4 14h16l-2-6H6z" />
          <circle cx="7" cy="16" r="2" />
          <circle cx="17" cy="16" r="2" />
        </SvgWrap>
      );
    case "AIR_TRANSPORT":
      return (
        <SvgWrap>
          <path d="M3 12h6l3-5 3 5h6l-4 2 2 5-5-3-5 3-5-2 5z" />
        </SvgWrap>
      );
    default:
      return (
        <SvgWrap>
          <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </SvgWrap>
      );
  }
}
