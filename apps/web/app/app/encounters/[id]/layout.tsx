"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
  isClinicCareAmbulatoryEncounterType,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { AiChartReviewPanel } from "@/features/ai-chart-review/AiChartReviewPanel";

type EncounterIdentity = {
  id: string;
  type?: string | null;
};

const AI_CHART_REVIEW_ROLES = new Set(["PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"]);

/**
 * Clinic ambulatory presentation cleanup only.
 *
 * These selectors deliberately scope to the existing Clinic ambulatory workspace test id,
 * so ED / inpatient / closed-chart encounter presentation is unchanged. The underlying
 * shared engines, fields, persistence, audit history, and route contracts remain mounted.
 * Sticky summary rails keep using normal document flow rather than fixed positioning so
 * they never cover the chart or the Medora Assistant rail.
 */
const CLINIC_AMBULATORY_PRESENTATION_CSS = `
[data-testid="clinic-care-active-ambulatory-workspace"] > header > p {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-intake"] > p:first-child {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-intake"] input[type="text"] + div > p:first-child:has(+ input[type="search"]) {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-intake"] details[open]:has(textarea[maxlength="8000"]) > div > div:last-child {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-intake"] a[href*="workspace=ambulatory"][href*="section=intake"] {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-intake"] [style*="position: sticky"][style*="overflow-y: auto"] {
  position: sticky !important;
  top: 12px !important;
  align-self: start !important;
  max-height: none !important;
  overflow-y: visible !important;
}

[data-testid="clinic-care-active-ambulatory-workspace"] [data-testid="provider-template-activation-helper"] {
  display: none !important;
}

[data-testid="clinic-care-active-ambulatory-workspace"] [data-testid="provider-documentation-summary-aside"] {
  position: sticky !important;
  top: 12px !important;
  align-self: start !important;
  max-height: none !important;
  overflow: visible !important;
}

[data-testid="clinic-care-active-ambulatory-workspace"] [data-testid="mar-ambulatory-pending-fallback-hint"] {
  display: none !important;
}

/* Keep the MAR empty state itself visible. Its copy comes from the normal EN/FR/ES
   i18n key (clinicCareD4c7e.mar.emptyFacility); never replace it with CSS content. */

[data-testid="clinic-care-ambulatory-nursing"] > h3 + p {
  display: none !important;
}

[data-testid="clinic-care-active-ambulatory-workspace"]:has([data-testid="encounter-notes-editor"]) h2 + div[style*="margin-top: 6px"] {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-prescriptions"] > h3 + p {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-clinical-summary"] > h3 + p {
  display: none !important;
}

[data-testid="clinic-care-ambulatory-clinical-summary"] [data-testid="encounter-clinical-record-summary"] > div:first-child h2 + div {
  display: none !important;
}
`;

export default function EncounterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const encounterId = params?.id as string;
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const { language } = useI18n();
  const [encounterType, setEncounterType] = useState<string | null>(null);

  const canUseAiChartReview = roles.some((role) => AI_CHART_REVIEW_ROLES.has(role));

  useEffect(() => {
    if (!encounterId || !facilityId || !ready || !canUseAiChartReview) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, { facilityId });
        const encounter = asApiObject<EncounterIdentity>(raw);
        if (!cancelled) setEncounterType(encounter?.type ?? null);
      } catch {
        if (!cancelled) setEncounterType(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canUseAiChartReview, encounterId, facilityId, ready]);

  const navigate = useCallback(
    (section: ClinicCareAmbulatoryWorkspaceSection) => {
      const qs = new URLSearchParams(searchParams?.toString() ?? "");
      qs.set("workspace", CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY);
      qs.set("section", section);
      router.replace(`/app/encounters/${encodeURIComponent(encounterId)}?${qs.toString()}`, { scroll: false });
    },
    [encounterId, router, searchParams]
  );

  const authorizedUserCanSeeAi =
    ready &&
    Boolean(facilityId) &&
    canUseAiChartReview &&
    (searchParams?.get("workspace") === CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY ||
      isClinicCareAmbulatoryEncounterType(encounterType));

  const clinicAmbulatoryPresentationStyle = (
    <style data-testid="clinic-ambulatory-presentation-cleanup">
      {CLINIC_AMBULATORY_PRESENTATION_CSS}
    </style>
  );

  if (!authorizedUserCanSeeAi || !facilityId) {
    return (
      <>
        {clinicAmbulatoryPresentationStyle}
        {children}
      </>
    );
  }

  return (
    <>
      {clinicAmbulatoryPresentationStyle}
      <div
        data-testid="encounter-with-ai-chart-review"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 16,
          width: "100%",
        }}
      >
        <div style={{ flex: "1 1 760px", minWidth: 0 }}>{children}</div>
        <div
          data-testid="ai-chart-review-sticky-rail"
          style={{
            flex: "0 1 320px",
            width: 320,
            maxWidth: "100%",
            padding: "20px 16px 40px 0",
            boxSizing: "border-box",
            position: "sticky",
            top: 12,
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
          }}
        >
          <AiChartReviewPanel
            encounterId={encounterId}
            facilityId={facilityId}
            language={language}
            onNavigate={navigate}
          />
        </div>
      </div>
    </>
  );
}
