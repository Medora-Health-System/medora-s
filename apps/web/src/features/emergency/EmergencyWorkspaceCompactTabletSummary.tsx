"use client";

import React from "react";
import Link from "next/link";
import { BillingClassificationBadgeInteractive } from "@/components/encounters/BillingClassificationBadgeInteractive";
import { EmergencyQuickVitalsEditor } from "@/features/emergency/EmergencyQuickVitalsEditor";
import { EmergencyIvAccessModal } from "@/features/emergency/EmergencyIvAccessModal";
import { EmergencyProcedureLauncherModal } from "@/features/emergency/EmergencyProcedureLauncherModal";
import {
  EmergencyWorkspaceAllergiesCard,
  EmergencyWorkspaceVitalsCard,
} from "@/features/emergency/EmergencyWorkspaceClinicalStrip";
import { EncounterGovernedRoomChip } from "@/components/encounters/EncounterGovernedRoomChip";
import type { EncounterRoomContext } from "@/lib/governedRoomDisplay";
import {
  emergencyChartCompactAvatarCircleStyle,
  emergencyChartCompactAvatarClusterStyle,
  emergencyChartCompactBadgeRowStyle,
  emergencyChartCompactClinicalPairGridStyle,
  emergencyChartCompactIdentityRowStyle,
  emergencyChartCompactRoomChipStyle,
  emergencyChartCompactScrollBodyStyle,
  emergencyChartCompactStickyStripStyle,
} from "@/features/emergency/emergencyChartCompactTabletHeader";
import { emergencyChartTouchLinkStyle } from "@/features/emergency/emergencyChartResponsiveLayout";
import type { EsiLevel } from "@/features/emergency/emergencyEsiDisplay";
import {
  esiDisplayChar,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import {
  clinicalStickyActionBarStyle,
  clinicalThumbReachActionStyle,
} from "@/lib/clinicalTouchNavigation";
import {
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import type { ClinicalVitalsDisplayMode } from "@/lib/clinicalViewport";
import { MedoraCardBadge, type PriorityBadgeSoft } from "@/components/medora-card";

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
};

export function EmergencyWorkspaceCompactTabletSummary({
  patient,
  encounterId,
  fid,
  patientInitials,
  headerEsiLevel,
  triageLoading,
  fullPatientName,
  complaintLine,
  encounterRoom,
  statusKey,
  typeKey,
  billingClassKey,
  statusSoft,
  vitalPairs,
  allergyText,
  vitalsDisplayMode,
  vitalsQuickEditEnabled,
  onVitalsEdit,
  vitalsEditAriaLabel,
  canDocumentIvAccess,
  showQuickVitals,
  setShowQuickVitals,
  showIvAccessModal,
  setShowIvAccessModal,
  showProcedureLauncherModal,
  setShowProcedureLauncherModal,
  triageSnapshot,
  onVitalsSaved,
  onIvRecorded,
  onProcedureRecorded,
  encounterOpen,
  canChangeBillingClassification,
  onBillingUpdated,
  showOperationalPanel,
  setShowOperationalPanel,
  onRoomClick,
  roomButtonTitle,
  erChartHref,
  isLocked,
  encounterStatus,
  t,
}: {
  patient: PatientLite | null | undefined;
  encounterId: string;
  fid: string | null;
  patientInitials: string;
  headerEsiLevel: EsiLevel | null;
  triageLoading: boolean;
  fullPatientName: string;
  complaintLine: string;
  encounterRoom: EncounterRoomContext;
  statusKey: string;
  typeKey: string;
  billingClassKey: string | null | undefined;
  statusSoft: (key: string) => PriorityBadgeSoft;
  vitalPairs: { label: string; value: string }[];
  allergyText: string;
  vitalsDisplayMode: ClinicalVitalsDisplayMode;
  vitalsQuickEditEnabled: boolean;
  onVitalsEdit: () => void;
  vitalsEditAriaLabel: string;
  canDocumentIvAccess: boolean;
  showQuickVitals: boolean;
  setShowQuickVitals: (v: boolean) => void;
  showIvAccessModal: boolean;
  setShowIvAccessModal: (v: boolean) => void;
  showProcedureLauncherModal: boolean;
  setShowProcedureLauncherModal: (v: boolean) => void;
  triageSnapshot: Record<string, unknown> | null;
  onVitalsSaved: () => Promise<void>;
  onIvRecorded: () => void;
  onProcedureRecorded: () => void;
  encounterOpen: boolean;
  canChangeBillingClassification: boolean;
  onBillingUpdated: () => void;
  showOperationalPanel: boolean;
  setShowOperationalPanel: React.Dispatch<React.SetStateAction<boolean>>;
  onRoomClick?: () => void;
  roomButtonTitle?: string;
  erChartHref: string;
  isLocked: boolean;
  encounterStatus: string;
  t: (key: string) => string;
}) {
  return (
    <>
      <div
        style={emergencyChartCompactStickyStripStyle()}
        data-testid="emergency-workspace-compact-sticky-strip"
      >
        <div style={emergencyChartCompactIdentityRowStyle()}>
          <div style={emergencyChartCompactAvatarClusterStyle()}>
            <div style={emergencyChartCompactAvatarCircleStyle()} aria-hidden>
              {patientInitials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b" }}>ESI</span>
              <span style={esiUnderAvatarNumberStyle(triageLoading ? null : headerEsiLevel)}>
                {triageLoading ? "…" : esiDisplayChar(headerEsiLevel)}
              </span>
            </div>
          </div>
          <div style={{ flex: "1 1 140px", minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
              {fullPatientName}
            </p>
            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>{t("printOutput.patientChart.nirMrn")}</span>{" "}
              {(patient?.mrn ?? patient?.nationalId ?? "").trim() || t("common.dash")}
              {" · "}
              {formatPatientAgeSexLine(patient?.dob ?? null, patient?.sexAtBirth ?? null, patient?.sex ?? null, t)}
            </p>
          </div>
          <div style={emergencyChartCompactRoomChipStyle()}>
            <EncounterGovernedRoomChip
              encounter={encounterRoom}
              clickable={Boolean(onRoomClick)}
              onClick={onRoomClick}
              labelKey="printOutput.patientChart.room"
              compact
              alignSelf="auto"
            />
          </div>
        </div>
        <div style={emergencyChartCompactBadgeRowStyle()}>
          <MedoraCardBadge soft={statusSoft(statusKey)}>{tEncounterStatus(t, statusKey)}</MedoraCardBadge>
          <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
            {tEncounterType(t, typeKey)}
          </MedoraCardBadge>
          {fid ? (
            <BillingClassificationBadgeInteractive
              encounterId={encounterId}
              facilityId={fid}
              classification={billingClassKey}
              encounterOpen={encounterOpen}
              canEdit={canChangeBillingClassification}
              onUpdated={onBillingUpdated}
            />
          ) : null}
        </div>
      </div>

      <div style={emergencyChartCompactScrollBodyStyle()} data-testid="emergency-workspace-compact-scroll-body">
        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.35 }}>
          <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>
            {t("emergencyTrackboard.chiefComplaintShort")}
          </span>
          {" — "}
          {complaintLine}
        </p>
        <div style={emergencyChartCompactClinicalPairGridStyle()}>
          <EmergencyWorkspaceVitalsCard
            vitalPairs={vitalPairs}
            loading={triageLoading}
            editable={vitalsQuickEditEnabled}
            onEditClick={vitalsQuickEditEnabled ? onVitalsEdit : undefined}
            editAriaLabel={vitalsEditAriaLabel}
            displayMode={vitalsDisplayMode}
          />
          <EmergencyWorkspaceAllergiesCard allergySummary={allergyText} loading={triageLoading} compact />
        </div>
        {canDocumentIvAccess && fid ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              title={t("erIvAccess.openTooltip")}
              aria-label={t("erIvAccess.openAria")}
              disabled={triageLoading || encounterStatus !== "OPEN" || isLocked}
              onClick={() => setShowIvAccessModal(true)}
              style={{
                minWidth: 44,
                minHeight: 44,
                width: 44,
                padding: 0,
                borderRadius: 10,
                border: "1px solid #e9d5ff",
                backgroundColor: "#faf5ff",
                fontSize: 20,
                lineHeight: 1,
                cursor: triageLoading || encounterStatus !== "OPEN" || isLocked ? "not-allowed" : "pointer",
                opacity: triageLoading || encounterStatus !== "OPEN" || isLocked ? 0.45 : 1,
              }}
            >
              💉
            </button>
            <button
              type="button"
              title={t("erProcedureLauncher.openTooltip")}
              aria-label={t("erProcedureLauncher.openAria")}
              disabled={triageLoading || encounterStatus !== "OPEN" || isLocked}
              onClick={() => setShowProcedureLauncherModal(true)}
              style={{
                minWidth: 44,
                minHeight: 44,
                width: 44,
                padding: 0,
                borderRadius: 10,
                border: "1px solid #fcd34d",
                backgroundColor: "#fffbeb",
                fontSize: 20,
                lineHeight: 1,
                cursor: triageLoading || encounterStatus !== "OPEN" || isLocked ? "not-allowed" : "pointer",
                opacity: triageLoading || encounterStatus !== "OPEN" || isLocked ? 0.45 : 1,
              }}
            >
              🧰
            </button>
          </div>
        ) : null}
        {showQuickVitals && vitalsQuickEditEnabled && fid ? (
          <div style={{ minWidth: 0, width: "100%" }}>
            <EmergencyQuickVitalsEditor
              open={showQuickVitals}
              onClose={() => setShowQuickVitals(false)}
              encounterId={encounterId}
              facilityId={fid}
              patientId={patient?.id}
              triageSnapshot={triageSnapshot}
              onSaved={onVitalsSaved}
            />
          </div>
        ) : null}
        {showIvAccessModal && fid ? (
          <EmergencyIvAccessModal
            open={showIvAccessModal}
            onClose={() => setShowIvAccessModal(false)}
            encounterId={encounterId}
            facilityId={fid}
            onRecorded={onIvRecorded}
          />
        ) : null}
        {showProcedureLauncherModal && fid ? (
          <EmergencyProcedureLauncherModal
            open={showProcedureLauncherModal}
            onClose={() => setShowProcedureLauncherModal(false)}
            encounterId={encounterId}
            facilityId={fid}
            onRecorded={onProcedureRecorded}
          />
        ) : null}
        <div style={clinicalStickyActionBarStyle(true)}>
          <Link
            href={erChartHref}
            style={clinicalThumbReachActionStyle(
              emergencyChartTouchLinkStyle({
                fontSize: 13,
                padding: "7px 12px",
                textDecoration: "none",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                backgroundColor: "#eff6ff",
              })
            )}
          >
            {t("emergencyWorkspace.linkFullEncounter")}
          </Link>
        </div>
      </div>
    </>
  );
}
