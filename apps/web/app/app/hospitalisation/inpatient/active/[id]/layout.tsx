"use client";

import React, { useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ClinicCareAmbulatoryWorkspaceSection } from "@medora/shared";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { AiChartReviewPanel } from "@/features/ai-chart-review/AiChartReviewPanel";
import { inpatientProviderWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import type { InpatientWorkspaceSection } from "@/features/inpatient-workspace/inpatientWorkspaceSections";

const AI_CHART_REVIEW_ROLES = new Set(["PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"]);

const INPATIENT_SECTION_BY_CLINIC_SECTION: Record<
  ClinicCareAmbulatoryWorkspaceSection,
  InpatientWorkspaceSection
> = {
  intake: "admission",
  "medical-evaluation": "providerDocumentation",
  orders: "orders",
  medications: "medications",
  results: "results",
  diagnoses: "problemsPlan",
  "clinical-data": "overview",
  nursing: "nursing",
  notes: "notes",
  prescriptions: "orders",
  "follow-up": "dischargePlanning",
  summary: "summary",
};

export default function InpatientActiveEncounterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const encounterId = String(params?.id ?? "").trim();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const { language } = useI18n();
  const canUseAi = useMemo(
    () => roles.some((role) => AI_CHART_REVIEW_ROLES.has(String(role).toUpperCase())),
    [roles]
  );

  const navigate = useCallback(
    (section: ClinicCareAmbulatoryWorkspaceSection) => {
      const inpatientSection = INPATIENT_SECTION_BY_CLINIC_SECTION[section] ?? "overview";
      const base = inpatientProviderWorkspacePath(encounterId);
      router.replace(`${base}?section=${encodeURIComponent(inpatientSection)}`, { scroll: false });
    },
    [encounterId, router]
  );

  if (!ready || !facilityId || !encounterId || !canUseAi) return <>{children}</>;

  return (
    <div
      data-testid="inpatient-with-ai-chart-review"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16, width: "100%" }}
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
  );
}
