/**
 * MEDUI.D4C.4 — one-click Clinic top-tab → canonical enterprise module.
 * No intermediate "Open…" card; capability guards remain on ClinicCareShell.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export function ClinicCareDirectCanonicalRedirect({
  href,
  labelKey,
}: {
  href: string;
  labelKey: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return (
    <p
      data-testid="clinic-care-direct-redirect"
      data-redirect-href={href}
      style={{ margin: 0, fontSize: 13, color: "#64748b" }}
      role="status"
    >
      {t(labelKey)}
    </p>
  );
}
