"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

/**
 * MEDUI.D4C.2A — thin Clinic nested module panel.
 * Reuses existing global operational modules without forking clinical engines.
 * Deep clinical work may still open enterprise routes; chrome stays in Clinic shell.
 */
export function ClinicCareEmbeddedModule({
  titleKey,
  descriptionKey,
  href,
  hrefLabelKey,
  children,
}: {
  titleKey: string;
  descriptionKey: string;
  href: string;
  hrefLabelKey: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div data-testid="clinic-care-embedded-module">
      <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
        {t(titleKey)}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
        {t(descriptionKey)}
      </p>
      {children}
      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 36,
          padding: "0 14px",
          borderRadius: 10,
          border: `1px solid ${CLINIC_CARE_SHELL.border}`,
          background: "#fff",
          color: "#0f766e",
          fontWeight: 600,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        {t(hrefLabelKey)}
      </Link>
    </div>
  );
}
