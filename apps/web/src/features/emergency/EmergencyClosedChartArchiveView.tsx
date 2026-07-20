"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import {
  MEDORA_CARD_SHELL,
  MedoraCard,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { EmergencyErSummaryClosureSurface } from "@/features/emergency/EmergencyErSummaryClosureSurface";
import {
  EncounterClinicalSummaryDisplayMode,
  emergencyAllEncountersArchivePath,
} from "@/features/emergency/edClosedChartDisplayMode";
import { genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import { EMERGENCY_AVATAR_CIRCLE_STYLE } from "@/features/emergency/emergencyEsiDisplay";

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
  providerDocumentationStatus?: string | null;
  providerAddenda?: Array<{ id: string; text: string; createdAt: string }>;
};

type Props = {
  encounter: EncounterShell;
  facilityId: string;
  facilityName: string | null;
  triageSnapshot: Record<string, unknown> | null;
  resultsRefresh: number;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
  canViewBillingReview: boolean;
  canOpenAdminControlledFullChart: boolean;
  onReload: () => Promise<void>;
};

function patientInitials(p: PatientLite | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  return ((f.charAt(0) || "") + (l.charAt(0) || f.charAt(1) || "")).toUpperCase() || "?";
}

function fullPatientName(p: PatientLite | null | undefined, dash: string): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || dash;
}

/**
 * Closed ED chart archive — reuses EmergencyErSummaryClosureSurface / clinical summary
 * in CLOSED_READ_ONLY mode. No active triage, nursing, order, or disposition editors.
 */
export function EmergencyClosedChartArchiveView({
  encounter,
  facilityId,
  facilityName,
  triageSnapshot,
  resultsRefresh,
  canEditNursingDischarge,
  canEditMedicalDischarge,
  canViewBillingReview,
  canOpenAdminControlledFullChart,
  onReload,
}: Props) {
  const { t, language } = useI18n();
  const dash = t("common.dash");
  const patient = encounter.patient ?? null;
  const statusKey = (encounter.status ?? "").trim() || "CLOSED";
  const typeKey = (encounter.type ?? "").trim() || "EMERGENCY";
  const complaint =
    (encounter.chiefComplaint ?? "").trim() || (encounter.visitReason ?? "").trim() || dash;
  const genericHref = genericEncounterPath(encounter.id);
  const resultsHref = `${genericHref}?tab=results`;
  const diagnosticsHref = `${genericHref}?tab=diagnostics`;
  const billingHref = `/app/billing/encounters/${encodeURIComponent(encounter.id)}`;

  return (
    <div
      data-testid="ed-closed-chart-archive"
      data-summary-display-mode={EncounterClinicalSummaryDisplayMode.CLOSED_READ_ONLY}
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #f8fafc 100%)",
        padding: "16px 16px 32px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
            <Link
              href={emergencyAllEncountersArchivePath()}
              data-testid="ed-closed-chart-back-all-encounters"
              style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
            >
              {t("emergencyClosedChart.backToAllEncounters")}
            </Link>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {t("emergencyClosedChart.pageTitle")}
            </h1>
            <span
              data-testid="ed-closed-chart-readonly-badge"
              role="status"
              aria-label={t("emergencyClosedChart.readOnlyAria")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: "#e4e4e7",
                color: "#3f3f46",
                border: "1px solid #d4d4d8",
              }}
            >
              {t("emergencyClosedChart.closedReadOnlyBadge")}
            </span>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
            {t("emergencyClosedChart.pageSubtitle")}
          </p>
        </header>

        <div style={{ marginBottom: 14 }}>
          <MedoraCard leftAccentColor="#71717a" variant="default">
            <MedoraCardInner>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    ...EMERGENCY_AVATAR_CIRCLE_STYLE,
                    background: "#e4e4e7",
                    color: "#3f3f46",
                    border: "1px solid #d4d4d8",
                  }}
                  aria-hidden
                >
                  {patientInitials(patient)}
                </div>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <MedoraCardTitle
                    title={fullPatientName(patient, dash)}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>
                          {t("printOutput.patientChart.nirMrn")}
                        </span>{" "}
                        {(patient?.mrn ?? patient?.nationalId ?? "").trim() || dash}
                        {" · "}
                        {formatPatientAgeSexLine(
                          patient?.dob ?? null,
                          patient?.sexAtBirth ?? null,
                          patient?.sex ?? null,
                          t
                        )}
                      </p>
                    }
                  />
                  <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155" }}>
                    <span style={{ fontWeight: 600, color: "#64748b", fontSize: 12 }}>
                      {t("emergencyTrackboard.chiefComplaintShort")}
                    </span>
                    {" — "}
                    {complaint}
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                    <span style={{ fontWeight: 600, color: "#475569" }}>
                      {t("emergencyTrackboard.arrivalLabel")}
                    </span>{" "}
                    {encounter.createdAt
                      ? formatEncounterChromeDateTime(encounter.createdAt, language)
                      : dash}
                  </p>
                </div>
                <MedoraCardBadgeRow marginTop={0}>
                  <MedoraCardBadge soft={{ bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" }}>
                    {tEncounterStatus(t, statusKey)}
                  </MedoraCardBadge>
                  <MedoraCardBadge soft={{ bg: "#f8fafc", text: "#475569", border: "#e2e8f0" }}>
                    {tEncounterType(t, typeKey)}
                  </MedoraCardBadge>
                  <MedoraCardBadge soft={{ bg: "#f4f4f5", text: "#3f3f46", border: "#d4d4d8" }}>
                    {t("emergencyClosedChart.readOnlyChip")}
                  </MedoraCardBadge>
                </MedoraCardBadgeRow>
              </div>
            </MedoraCardInner>
          </MedoraCard>
        </div>

        <div
          style={{
            ...MEDORA_CARD_SHELL,
            padding: "10px 14px",
            marginBottom: 14,
            background: "#f4f4f5",
            border: "1px solid #e4e4e7",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#3f3f46", fontWeight: 600 }}>
            {t("emergencyClosedChart.archiveBanner")}
          </p>
        </div>

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
    </div>
  );
}
