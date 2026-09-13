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

  if (!authorizedUserCanSeeAi || !facilityId) return <>{children}</>;

  return (
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
      <div style={{ flex: "0 1 320px", width: 320, maxWidth: "100%", padding: "20px 16px 40px 0", boxSizing: "border-box" }}>
        <AiChartReviewPanel
          encounterId={encounterId}
          facilityId={facilityId}
          language={language}
          onNavigate={navigate}
        />
      </div>
    </div>
  );
}
