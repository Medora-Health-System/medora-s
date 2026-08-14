"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { EncounterDisplayMode, shouldShowEnterpriseReopenAction } from "@medora/shared";
import { EnterpriseClosedEncounterBanner } from "@/components/encounters/EnterpriseClosedEncounterBanner";
import { EnterpriseClosedEncounterClinicalRecord } from "@/components/encounters/EnterpriseClosedEncounterClinicalRecord";
import { EnterpriseEncounterLifecycleTimeline } from "@/components/encounters/EnterpriseEncounterLifecycleTimeline";
import { EnterpriseReopenEncounterAction } from "@/components/encounters/EnterpriseReopenEncounterAction";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

export type EnterpriseClosedEncounterViewerEncounter = {
  id: string;
  status?: string | null;
  type?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  closedByDisplayFr?: string | null;
  closedByUserId?: string | null;
  reopenCount?: number | null;
  version?: number | null;
  roomLabel?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  triageAcuity?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{
    id: string;
    text: string;
    createdAt: string;
    createdByDisplayFr?: string | null;
  }>;
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
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  } | null;
};

type Props = {
  facilityId: string;
  facilityName?: string | null;
  encounter: EnterpriseClosedEncounterViewerEncounter;
  roleCodes: readonly string[];
  backHref?: string;
  backLabel?: string;
  /** Optional allergy strip text already resolved by the caller. */
  allergiesLine?: string | null;
  careSettingLabel?: string | null;
  onReopened?: () => void | Promise<void>;
  /** Care-setting adapter content (ED summary, etc.) — still read-only. */
  children?: ReactNode;
};

function displayName(
  person: { firstName?: string | null; lastName?: string | null } | null | undefined,
  dash: string
): string {
  return `${(person?.firstName ?? "").trim()} ${(person?.lastName ?? "").trim()}`.trim() || dash;
}

/**
 * MEDUI.D4C.8A/8B — enterprise CLOSED_READ_ONLY shell + clinical record composition.
 * One authority for Clinic, ED (adapter), Observation, Hospital, Inpatient, future Dental.
 */
export function EnterpriseClosedEncounterViewer({
  facilityId,
  facilityName,
  encounter,
  roleCodes,
  backHref,
  backLabel,
  allergiesLine,
  careSettingLabel,
  onReopened,
  children,
}: Props) {
  const { t, language } = useI18n();
  const dash = t("common.dash");
  const [lifecycleRefresh, setLifecycleRefresh] = useState(0);
  const [reopenNotice, setReopenNotice] = useState<string | null>(null);

  const patient = encounter.patient ?? null;
  const patientName = displayName(patient, dash);
  const mrn = (patient?.mrn ?? patient?.nationalId ?? "").trim() || dash;
  const closedBy =
    (encounter.closedByDisplayFr ?? "").trim() ||
    (encounter.closedByUserId ? t("enterpriseClosedEncounterD4c8a.header.closedByIdOnly") : dash);
  const provider = displayName(encounter.physicianAssigned, dash);
  const nurse = displayName(encounter.nurseAssigned, dash);
  const complaint =
    (encounter.chiefComplaint ?? "").trim() || (encounter.visitReason ?? "").trim() || dash;
  const reopenCount = Number(encounter.reopenCount ?? 0);
  const showReopen = shouldShowEnterpriseReopenAction({
    status: encounter.status,
    roleCodes,
  });

  const identityRows = useMemo(
    () => [
      { label: t("enterpriseClosedEncounterD4c8a.header.mrn"), value: mrn },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.ageSex"),
        value: formatPatientAgeSexLine(
          patient?.dob ?? null,
          patient?.sexAtBirth ?? null,
          patient?.sex ?? null,
          t
        ),
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.facility"),
        value: (facilityName ?? "").trim() || dash,
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.encounterType"),
        value: tEncounterType(t, encounter.type ?? "UNKNOWN"),
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.status"),
        value: tEncounterStatus(t, encounter.status ?? "CLOSED"),
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.visitAt"),
        value: encounter.createdAt
          ? formatEncounterChromeDateTime(encounter.createdAt, language)
          : dash,
      },
      { label: t("enterpriseClosedEncounterD4c8a.header.provider"), value: provider },
      { label: t("enterpriseClosedEncounterD4c8a.header.nurse"), value: nurse },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.location"),
        value: (encounter.roomLabel ?? "").trim() || t("enterpriseClosedEncounterD4c8a.header.notDocumented"),
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.allergies"),
        value: (allergiesLine ?? "").trim() || t("enterpriseClosedEncounterD4c8a.header.notDocumented"),
      },
      {
        label: t("enterpriseClosedEncounterD4c8a.header.chiefComplaint"),
        value: complaint,
      },
      ...(reopenCount > 0
        ? [
            {
              label: t("enterpriseClosedEncounterD4c8a.header.reopenCount"),
              value: String(reopenCount),
            },
          ]
        : []),
    ],
    [
      allergiesLine,
      complaint,
      dash,
      encounter.createdAt,
      encounter.roomLabel,
      encounter.status,
      encounter.type,
      facilityName,
      language,
      mrn,
      nurse,
      patient?.dob,
      patient?.sex,
      patient?.sexAtBirth,
      provider,
      reopenCount,
      t,
    ]
  );

  return (
    <div
      data-testid="enterprise-closed-encounter-viewer"
      data-display-mode={EncounterDisplayMode.CLOSED_READ_ONLY}
      data-encounter-status={String(encounter.status ?? "").toUpperCase() || "CLOSED"}
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #f8fafc 100%)",
        padding: "16px 16px 32px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
        {backHref ? (
          <p style={{ margin: "0 0 10px", fontSize: 13 }}>
            <Link href={backHref} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {backLabel ?? t("enterpriseClosedEncounterD4c8a.back")}
            </Link>
          </p>
        ) : null}

        <EnterpriseClosedEncounterBanner
          closedAt={encounter.closedAt}
          closedByDisplay={closedBy !== dash ? closedBy : null}
          careSettingLabel={careSettingLabel}
          previouslyReopened={reopenCount > 0}
          actions={
            showReopen ? (
              <EnterpriseReopenEncounterAction
                facilityId={facilityId}
                encounterId={encounter.id}
                encounterStatus={encounter.status}
                roleCodes={roleCodes}
                expectedVersion={typeof encounter.version === "number" ? encounter.version : undefined}
                variant="button"
                onSuccess={async () => {
                  setReopenNotice(t("enterpriseEncounterLifecycleD4c7k.reopen.success"));
                  setLifecycleRefresh((n) => n + 1);
                  await onReopened?.();
                }}
              />
            ) : null
          }
        />

        {reopenNotice ? (
          <p role="status" style={{ margin: "0 0 12px", fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
            {reopenNotice}
          </p>
        ) : null}

        <section style={{ ...MEDORA_CARD_SHELL, padding: 16, marginBottom: 0 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
            {patientName}
          </h1>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            {t("enterpriseClosedEncounterD4c8a.header.subtitle")}
          </p>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "10px 16px",
            }}
          >
            {identityRows.map((row) => (
              <div key={row.label}>
                <dt style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  {row.label}
                </dt>
                <dd style={{ margin: "2px 0 0", fontSize: 14, color: "#0f172a" }}>{row.value}</dd>
              </div>
            ))}
          </dl>
          {patient?.id ? (
            <p style={{ margin: "12px 0 0", fontSize: 13 }}>
              <Link
                href={`/app/patients/${encodeURIComponent(patient.id)}`}
                style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
              >
                {t("enterpriseClosedEncounterD4c8a.summary.openPatientIndex")}
              </Link>
            </p>
          ) : null}
        </section>

        <EnterpriseClosedEncounterClinicalRecord facilityId={facilityId} encounter={encounter} />

        {children}

        <EnterpriseEncounterLifecycleTimeline
          facilityId={facilityId}
          encounterId={encounter.id}
          refreshKey={lifecycleRefresh}
        />
      </div>
    </div>
  );
}
