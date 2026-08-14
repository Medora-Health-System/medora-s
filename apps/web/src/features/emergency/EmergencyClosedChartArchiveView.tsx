"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { EnterpriseClosedEncounterViewer } from "@/components/encounters/EnterpriseClosedEncounterViewer";
import { EmergencyErSummaryClosureSurface } from "@/features/emergency/EmergencyErSummaryClosureSurface";
import {
  EncounterClinicalSummaryDisplayMode,
  emergencyAllEncountersArchivePath,
} from "@/features/emergency/edClosedChartDisplayMode";
import { genericEncounterPath } from "@/features/emergency/emergencyRoutes";

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
};

type EncounterShell = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  closedByDisplayFr?: string | null;
  closedByUserId?: string | null;
  reopenCount?: number | null;
  version?: number | null;
  roomLabel?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  patient?: PatientLite | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  physicianAssigned?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  nurseAssigned?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  providerDocumentationStatus?: string | null;
  providerAddenda?: Array<{ id: string; text: string; createdAt: string }>;
};

type Props = {
  encounter: EncounterShell;
  facilityId: string;
  facilityName: string | null;
  roleCodes: readonly string[];
  triageSnapshot: Record<string, unknown> | null;
  resultsRefresh: number;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
  canViewBillingReview: boolean;
  canOpenAdminControlledFullChart: boolean;
  onReload: () => Promise<void>;
};

/**
 * ED closed chart archive — thin care-setting adapter over the enterprise
 * CLOSED_READ_ONLY shell (MEDUI.D4C.8A). Preserves ED clinical summary surface.
 */
export function EmergencyClosedChartArchiveView({
  encounter,
  facilityId,
  facilityName,
  roleCodes,
  triageSnapshot,
  resultsRefresh,
  canEditNursingDischarge,
  canEditMedicalDischarge,
  canViewBillingReview,
  canOpenAdminControlledFullChart,
  onReload,
}: Props) {
  const { t } = useI18n();
  const genericHref = genericEncounterPath(encounter.id);
  const resultsHref = `${genericHref}?tab=results`;
  const diagnosticsHref = `${genericHref}?tab=diagnostics`;
  const billingHref = `/app/billing/encounters/${encodeURIComponent(encounter.id)}`;

  return (
    <div data-testid="ed-closed-chart-archive">
      <EnterpriseClosedEncounterViewer
        facilityId={facilityId}
        facilityName={facilityName}
        encounter={encounter}
        roleCodes={roleCodes}
        backHref={emergencyAllEncountersArchivePath()}
        backLabel={t("emergencyClosedChart.backToAllEncounters")}
        careSettingLabel={t("enterpriseClosedEncounterD4c8a.careSetting.emergency")}
        onReopened={onReload}
      >
        <div style={{ marginTop: 14 }}>
          <EmergencyErSummaryClosureSurface
            sectionId="er-er-summary-closure"
            encounterId={encounter.id}
            facilityId={facilityId}
            facilityName={facilityName}
            encounter={encounter as any}
            triageSnapshot={triageSnapshot}
            resultsRefresh={resultsRefresh}
            resultsTabHref={resultsHref}
            diagnosticsTabHref={diagnosticsHref}
            canEditNursingDischarge={canEditNursingDischarge}
            canEditMedicalDischarge={canEditMedicalDischarge}
            onReload={onReload}
            ivAccessFetchEnabled={false}
            proceduresFetchEnabled={false}
            summaryReadOnly
            summaryDisplayMode={EncounterClinicalSummaryDisplayMode.CLOSED_READ_ONLY}
            canOpenProcedureDocumentation={false}
          />

          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {canViewBillingReview ? (
              <Link
                href={billingHref}
                data-testid="ed-closed-chart-billing-review"
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("emergencyClosedChart.openBillingReview")}
              </Link>
            ) : null}
            {canOpenAdminControlledFullChart ? (
              <Link
                href={genericHref}
                data-testid="ed-closed-chart-admin-full-chart"
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e4e4e7",
                  background: "#fafafa",
                  color: "#52525b",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("emergencyClosedChart.adminControlledFullChart")}
              </Link>
            ) : null}
          </div>
        </div>
      </EnterpriseClosedEncounterViewer>
    </div>
  );
}
