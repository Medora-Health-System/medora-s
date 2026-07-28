"use client";

/**
 * MEDUI.D4C.7B — Care-setting gate for Consultations.
 * Clinic Care facilities → ambulatory `/app/clinic-care/encounters`.
 * ED/Hospital (no Clinic Care) → legacy open-encounters list (ED trackboard API).
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  D4C7B_GENERIC_ENCOUNTERS_LIST_HREF,
  resolveConsultationsListHrefFromCapabilities,
  resolveFacilityModuleCapabilitiesD4c1,
} from "@medora/shared";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import EncountersLegacyOpenList from "./EncountersLegacyOpenList";

export default function EncountersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const {
    ready,
    facilityId,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();

  const caps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType,
    careProfileJson,
    serviceLines: facilityServiceLines,
    facilityCountry,
  });
  const target = resolveConsultationsListHrefFromCapabilities(caps);
  const redirectToClinic = Boolean(facilityId) && target !== D4C7B_GENERIC_ENCOUNTERS_LIST_HREF;

  useEffect(() => {
    if (!ready || !facilityId) return;
    if (redirectToClinic) {
      router.replace(target);
    }
  }, [ready, facilityId, redirectToClinic, target, router]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (redirectToClinic) {
    return (
      <div style={{ padding: 24 }} data-testid="encounters-clinic-care-redirect">
        <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  return <EncountersLegacyOpenList />;
}
