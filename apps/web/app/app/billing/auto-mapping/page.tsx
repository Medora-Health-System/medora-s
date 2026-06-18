"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { BillingAutoMappingWorkspace } from "@/features/billing/BillingAutoMappingWorkspace";

export default function BillingAutoMappingPage() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready, roles } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const canAccess = roles.includes("BILLING") || roles.includes("ADMIN");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  if (!ready) {
    return (
      <div>
        <h1>{t("billingPage.autoMappingWorkspaceTitle")}</h1>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div>
        <h1>{t("billingPage.autoMappingWorkspaceTitle")}</h1>
        <p>{t("billingPage.autoMappingWorkspaceForbidden")}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/app/billing" style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
          {t("billingPage.autoMappingWorkspaceBack")}
        </Link>
      </div>
      <h1>{t("billingPage.autoMappingWorkspaceTitle")}</h1>
      <p style={{ color: "#475569", maxWidth: 720, lineHeight: 1.45 }}>{t("billingPage.autoMappingWorkspaceSubtitle")}</p>
      {facilityId ? (
        <BillingAutoMappingWorkspace facilityId={facilityId} t={t} locale={encounterBcp47(language)} />
      ) : (
        <p>{t("common.loading")}</p>
      )}
    </div>
  );
}
