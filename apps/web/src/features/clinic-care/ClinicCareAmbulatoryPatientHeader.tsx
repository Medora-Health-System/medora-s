/**
 * MEDUI.D4C.5B — Persistent ambulatory patient header.
 * Parameterized for AMBULATORY care setting: no ESI, no ED badge, no trauma.
 * Reuses enterprise chrome helpers + ED clinical-strip primitives (vitals / allergies) —
 * no parallel ClinicPatientChart header engine.
 */

"use client";

import React from "react";
import type { SupportedLanguage } from "@/i18n/config";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
} from "@/lib/encounterChromeI18n";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { EncounterGovernedRoomChip, type EncounterGovernedRoomChipProps } from "@/components/encounters/EncounterGovernedRoomChip";
import {
  EmergencyWorkspaceAllergiesCard,
  EmergencyWorkspaceVitalsCard,
} from "@/features/emergency/EmergencyWorkspaceClinicalStrip";

type PatientLite = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
};

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

function patientInitials(p: PatientLite | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function statusSoft(status: string): PriorityBadgeSoft {
  return STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
}

export function ClinicCareAmbulatoryPatientHeader({
  patient,
  chiefComplaint,
  arrivedAt,
  statusKey,
  vitalPairs,
  vitalsLoading = false,
  allergyText,
  allergiesLoading = false,
  encounterRoom,
  onRoomClick,
  roomClickable = false,
  providerName,
  workflowStateLabel,
  followUpDateLabel,
  language,
  t,
  children,
}: {
  patient: PatientLite | null | undefined;
  chiefComplaint?: string | null;
  arrivedAt?: string | null;
  statusKey?: string | null;
  /** Optional — some sections (e.g. Intake, before vitals captured) may have none yet. */
  vitalPairs?: { label: string; value: string }[];
  vitalsLoading?: boolean;
  allergyText?: string | null;
  allergiesLoading?: boolean;
  encounterRoom: EncounterGovernedRoomChipProps["encounter"];
  onRoomClick?: () => void;
  roomClickable?: boolean;
  providerName?: string | null;
  workflowStateLabel?: string | null;
  followUpDateLabel?: string | null;
  language: SupportedLanguage;
  t: (key: string) => string;
  /** Workflow action buttons slot. */
  children?: React.ReactNode;
}) {
  const dash = t("common.dash");
  const fullName = `${(patient?.firstName ?? "").trim()} ${(patient?.lastName ?? "").trim()}`.trim() || dash;
  const status = (statusKey ?? "").trim() || "OPEN";
  const notDocumented = t("clinicCareD4c5b2.empty.notDocumented");
  const displayVitalPairs =
    Array.isArray(vitalPairs) && vitalPairs.length > 0
      ? vitalPairs
      : [
          { label: "TA", value: notDocumented },
          { label: "FC", value: notDocumented },
          { label: "FR", value: notDocumented },
          { label: "T°", value: notDocumented },
          { label: "SpO₂", value: notDocumented },
        ];

  return (
    <div data-testid="clinic-care-ambulatory-patient-header">
    <MedoraCard leftAccentColor="#0d9488" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials={patientInitials(patient)}>
          <MedoraCardTitle
            title={fullName}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>{t("printOutput.patientChart.nirMrn")}</span>{" "}
                {(patient?.mrn ?? patient?.nationalId ?? "").trim() || dash}
                {" · "}
                {formatPatientAgeSexLine(patient?.dob ?? null, patient?.sexAtBirth ?? null, patient?.sex ?? null, t)}
              </p>
            }
          />
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600, color: "#64748b", fontSize: 12 }}>
              {t("clinicCareD4c5b.header.motif")}
            </span>
            {" — "}
            {(chiefComplaint ?? "").trim() || notDocumented}
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
            <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicCareD4c5b.header.arrived")}</span>{" "}
            {arrivedAt ? formatEncounterChromeDateTime(arrivedAt, language) : notDocumented}
            {providerName ? (
              <>
                {" · "}
                <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicCareD4c5b.header.provider")}</span>{" "}
                {providerName}
              </>
            ) : (
              <>
                {" · "}
                <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicCareD4c5b.header.provider")}</span>{" "}
                {notDocumented}
              </>
            )}
            {workflowStateLabel ? (
              <>
                {" · "}
                <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicCareD4c5b.header.status")}</span>{" "}
                {workflowStateLabel}
              </>
            ) : null}
            {followUpDateLabel ? (
              <>
                {" · "}
                <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicCareD4c5b2.header.followUp")}</span>{" "}
                {followUpDateLabel}
              </>
            ) : null}
          </p>
        </MedoraCardIdentity>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            flex: "1 1 320px",
            minWidth: 260,
            alignItems: "stretch",
          }}
        >
          <EmergencyWorkspaceVitalsCard vitalPairs={displayVitalPairs} loading={vitalsLoading} />
          <EmergencyWorkspaceAllergiesCard
            allergySummary={(allergyText ?? "").trim() || t("clinicCareD4c5b.header.allergiesUnknown")}
            loading={allergiesLoading}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <EncounterGovernedRoomChip
            encounter={encounterRoom}
            clickable={roomClickable}
            onClick={roomClickable ? onRoomClick : undefined}
            labelKey="printOutput.patientChart.room"
          />
          <MedoraCardBadgeRow marginTop={0}>
            <MedoraCardBadge soft={statusSoft(status)}>{tEncounterStatus(t, status)}</MedoraCardBadge>
            <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
              {t("clinicCareD4c5b.careSetting")}
            </MedoraCardBadge>
          </MedoraCardBadgeRow>
          {children ? <MedoraCardActions inline gap={8}>{children}</MedoraCardActions> : null}
        </div>
      </MedoraCardInner>
    </MedoraCard>
    </div>
  );
}

export { patientInitials as clinicCareAmbulatoryPatientHeaderInitials };
