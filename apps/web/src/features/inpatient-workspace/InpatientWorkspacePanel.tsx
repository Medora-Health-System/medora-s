"use client";

import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  INPATIENT_CARE_PLAN_DISCIPLINES,
  INPATIENT_CONSULT_SPECIALTIES,
  INPATIENT_DISCHARGE_DESTINATIONS,
  INPATIENT_NURSING_ASSESSMENT_KINDS,
  INPATIENT_NOTE_KINDS,
  INPATIENT_TIMELINE_EVENT_KINDS,
  hasMeaningfulDischargeSummary,
  synthesizeInpatientDischargeSummaryDraft,
  type InpatientWorkspaceRole,
} from "@medora/shared";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import {
  isInpatientCarePlanEnabledInBrowser,
  isInpatientConsultsEnabledInBrowser,
  isInpatientDepartmentalOrdersEnabledInBrowser,
  isInpatientDischargePlanningEnabledInBrowser,
  isInpatientDocumentationEnabledInBrowser,
  isInpatientMarEnabledInBrowser,
  isInpatientNursingEnabledInBrowser,
  isInpatientWorkspaceEnabledInBrowser,
  inpatientNursingWorkspacePath,
} from "./inpatientWorkspacePaths";
import { InpatientClinicalOpsPanel } from "./InpatientClinicalOpsPanel";
import { InpatientAdmissionClinicalShell } from "./InpatientAdmissionClinicalShell";
import { InpatientProviderWorkspacePanel } from "./InpatientProviderWorkspacePanel";
import { InpatientTechnicianTasksPanel } from "./InpatientTechnicianTasksPanel";
import { InpatientNursingAssessmentSection } from "./InpatientNursingAssessmentSection";
import { ClinicalAvailabilityBanner } from "./rapid-documentation/ClinicalRapidControls";

export type InpatientWorkspaceEncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  providerDocumentationStatus?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | Date | null;
    sexAtBirth?: string | null;
  } | null;
};

function ShellList({
  title,
  items,
  testId,
}: {
  title: string;
  items: readonly string[];
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155", fontWeight: 600 }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function InpatientWorkspacePanel({
  section,
  encounterId,
  encounter,
  workspaceEnabled,
  writersEnabled = true,
  workspaceRole = "CHART",
  onRefetchEncounter,
  onNavigateSection,
  assignedRnName,
  assignedPctName,
  attendingName,
  admissionDiagnosis,
  admittedAt,
  room,
  codeStatus,
  isolation,
}: {
  section: InpatientWorkspaceSection;
  encounterId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  workspaceEnabled?: boolean;
  writersEnabled?: boolean;
  workspaceRole?: InpatientWorkspaceRole;
  onRefetchEncounter: () => Promise<void>;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  assignedRnName?: string | null;
  assignedPctName?: string | null;
  attendingName?: string | null;
  admissionDiagnosis?: string | null;
  admittedAt?: string | null;
  room?: string | null;
  codeStatus?: string | null;
  isolation?: string[] | null;
}) {
  const { t, language } = useI18n();
  const { facilityId, roles, userId, facilityTimeZone } = useFacilityAndRoles();
  const enabled = workspaceEnabled ?? isInpatientWorkspaceEnabledInBrowser();
  const ordersLive = isInpatientDepartmentalOrdersEnabledInBrowser();
  const marLive = isInpatientMarEnabledInBrowser();
  const docsLive = isInpatientDocumentationEnabledInBrowser();
  const nursingLive = isInpatientNursingEnabledInBrowser();
  const consultsLive = isInpatientConsultsEnabledInBrowser();
  const carePlanLive = isInpatientCarePlanEnabledInBrowser();
  const dischargeLive = isInpatientDischargePlanningEnabledInBrowser();
  const canPrescribe =
    writersEnabled &&
    (workspaceRole === "PROVIDER" || workspaceRole === "CHART") &&
    (roles.includes("PROVIDER") || roles.includes("ADMIN"));
  const canProviderWrite =
    writersEnabled &&
    (workspaceRole === "PROVIDER" || workspaceRole === "CHART") &&
    (roles.includes("PROVIDER") || roles.includes("ADMIN"));
  const canAck =
    writersEnabled &&
    (roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN"));
  const signed = (encounter?.providerDocumentationStatus ?? "").trim() === "SIGNED";

  if (!writersEnabled) {
    return (
      <ClinicalAvailabilityBanner
        state="ENCOUNTER_MISMATCH"
        message={t("inpatientWorkspaceRecoveryD4a27b.unavailable.writersDisabled")}
      />
    );
  }

  if (!enabled) {
    return (
      <p
        style={{ fontSize: 13, color: "#64748b", lineHeight: 1.45 }}
        data-testid={`inpatient-panel-feature-off-${section}`}
      >
        {t("inpatientD3e.featureUnavailable")}
      </p>
    );
  }

  switch (section) {
    case "overview":
      if (!facilityId) {
        return (
          <p data-testid="inpatient-panel-overview" style={{ fontSize: 13, color: "#64748b" }}>
            {t("inpatientD3e.featureUnavailable")}
          </p>
        );
      }
      return (
        <div data-testid="inpatient-panel-overview">
          <InpatientProviderWorkspacePanel
            mode="overview"
            encounterId={encounterId}
            facilityId={facilityId}
            patientId={encounter?.patient?.id}
            canProviderWrite={canProviderWrite}
            canDocumentDiagnoses={canPrescribe}
            isLocked={signed}
            workspaceRole={workspaceRole}
            onNavigateSection={onNavigateSection}
          />
        </div>
      );
    case "admission":
      return (
        <InpatientAdmissionClinicalShell
          encounterId={encounterId}
          nursingLive={nursingLive}
          docsLive={docsLive}
          canAdmin={roles.includes("ADMIN")}
        />
      );
    case "problemsPlan":
      if (!facilityId) {
        return (
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("inpatientD3e.featureUnavailable")}</p>
        );
      }
      return (
        <InpatientProviderWorkspacePanel
          mode="problemsPlan"
          encounterId={encounterId}
          facilityId={facilityId}
          patientId={encounter?.patient?.id}
          canProviderWrite={canProviderWrite}
          canDocumentDiagnoses={canPrescribe}
          isLocked={signed}
          onNavigateSection={onNavigateSection}
        />
      );
    case "historyPhysical":
      if (!facilityId) {
        return (
          <div data-testid="inpatient-panel-historyPhysical-flag-off">
            <p style={{ fontSize: 13, color: "#64748b" }}>{t("inpatientD3e.docsFlagOff")}</p>
          </div>
        );
      }
      return (
        <div data-testid="inpatient-panel-historyPhysical-live">
          <InpatientProviderWorkspacePanel
            mode="historyPhysical"
            encounterId={encounterId}
            facilityId={facilityId}
            patientId={encounter?.patient?.id}
            canProviderWrite={canProviderWrite}
            canDocumentDiagnoses={canPrescribe}
            isLocked={signed}
            onNavigateSection={onNavigateSection}
          />
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientWorkspaceRecoveryD4a27b.notes.governedHpOnly")}
          </p>
        </div>
      );
    case "progressNotes":
      if (!facilityId) {
        return (
          <div data-testid={`inpatient-panel-${section}-flag-off`}>
            <p style={{ fontSize: 13, color: "#64748b" }}>{t("inpatientD3e.featureUnavailable")}</p>
          </div>
        );
      }
      return (
        <div data-testid={`inpatient-panel-${section}-live`}>
          <InpatientProviderWorkspacePanel
            mode="progressNotes"
            encounterId={encounterId}
            facilityId={facilityId}
            patientId={encounter?.patient?.id}
            canProviderWrite={canProviderWrite}
            canDocumentDiagnoses={canPrescribe}
            isLocked={signed}
            onNavigateSection={onNavigateSection}
          />
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientWorkspaceRecoveryD4a27b.notes.governedProgressOnly")}
          </p>
        </div>
      );
    case "nursing":
      if (!nursingLive || !facilityId) {
        return (
          <div data-testid="inpatient-panel-nursing">
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
              {t("inpatientD3e.nursing.body")}
            </p>
            <ShellList
              title={t("inpatientD3e.nursing.surfacesTitle")}
              items={INPATIENT_NURSING_ASSESSMENT_KINDS.map((k) =>
                t(`inpatientD3e.nursing.surfaces.${k}`)
              )}
              testId="inpatient-nursing-kinds"
            />
          </div>
        );
      }
      return (
        <InpatientNursingAssessmentSection
          encounterId={encounterId}
          facilityId={facilityId}
          encounter={encounter}
          isLocked={signed}
          canEditHandoff={
            writersEnabled && (roles.includes("RN") || roles.includes("ADMIN") || workspaceRole === "NURSING")
          }
          assignedRnName={assignedRnName}
          assignedPctName={assignedPctName}
          attendingName={attendingName}
          nursingTabHref={`${inpatientNursingWorkspacePath(encounterId)}?section=nursing`}
          onRefetch={onRefetchEncounter}
          onNavigateSection={onNavigateSection}
        />
      );
    case "notes":
      if (!facilityId) {
        return (
          <p data-testid="inpatient-panel-notes-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("inpatientD3e.featureUnavailable")}
          </p>
        );
      }
      return (
        <div data-testid="inpatient-panel-notes-live">
          <EmergencyErNotesPanel
            encounterId={encounterId}
            facilityId={facilityId}
            status={encounter?.status}
            isLocked={signed}
            roleCodes={roles}
            onSaved={onRefetchEncounter}
          />
        </div>
      );
    case "tasks":
      return (
        <div data-testid="inpatient-panel-tasks">
          <InpatientTechnicianTasksPanel
            encounterId={encounterId}
            canTechnicianWrite={
              roles.includes("PATIENT_CARE_TECH") || roles.includes("ADMIN")
            }
            canValidateRn={roles.includes("RN") || roles.includes("ADMIN")}
          />
        </div>
      );
    case "orders":
      if (!ordersLive || !facilityId) {
        return (
          <p data-testid="inpatient-panel-orders-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("inpatientD3e.ordersFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="inpatient-panel-orders-live">
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e.ordersOwnershipHint")}
          </p>
          <EmergencyErOrdersPanel
            encounterId={encounterId}
            facilityId={facilityId}
            canPrescribe={canPrescribe}
            encounterSigned={signed}
            encounterForOrderModal={
              encounter ? { patient: encounter.patient ?? null } : null
            }
            onRefetchEncounter={onRefetchEncounter}
            encounterType={encounter?.type ?? "INPATIENT"}
            roles={roles}
          />
        </div>
      );
    case "results":
      if (!ordersLive || !facilityId) {
        return (
          <p data-testid="inpatient-panel-results-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("inpatientD3e.resultsFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="inpatient-panel-results-live">
          <EmergencyResultsPanel
            encounterId={encounterId}
            facilityId={facilityId}
            refreshToken={0}
            canAcknowledgeResults={canAck}
            patient={
              encounter?.patient
                ? {
                    firstName: encounter.patient.firstName ?? null,
                    lastName: encounter.patient.lastName ?? null,
                    mrn: encounter.patient.mrn ?? null,
                    dob:
                      encounter.patient.dob instanceof Date
                        ? encounter.patient.dob.toISOString()
                        : (encounter.patient.dob ?? null),
                    sexAtBirth: encounter.patient.sexAtBirth ?? null,
                  }
                : null
            }
            encounterMeta={{
              id: encounterId,
              createdAt: new Date().toISOString(),
            }}
          />
        </div>
      );
    case "medications":
      if (!marLive || !facilityId || !userId) {
        return (
          <p data-testid="inpatient-panel-meds-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("inpatientD3e.marFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="inpatient-panel-meds-live">
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e.medications.continuationHint")}
          </p>
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="medications" />
          <div style={{ marginTop: 12 }}>
            <MedicationAdministrationTab
              encounterId={encounterId}
              facilityId={facilityId}
              currentUserId={userId}
              encounterStatus={encounter?.status ?? "OPEN"}
              providerDocumentationStatus={encounter?.providerDocumentationStatus}
              roleCodes={roles}
              facilityTimeZone={facilityTimeZone}
              embeddedWorkspaceLayout
            />
          </div>
        </div>
      );
    case "consults":
      if (!consultsLive) {
        return (
          <ShellList
            title={t("inpatientD3e.consults.body")}
            items={INPATIENT_CONSULT_SPECIALTIES.map((s) =>
              t(`inpatientD3e.consults.specialties.${s}`)
            )}
            testId="inpatient-panel-consults"
          />
        );
      }
      return (
        <div data-testid="inpatient-panel-consults-live">
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="consults" />
        </div>
      );
    case "carePlan":
      if (!carePlanLive) {
        return (
          <ShellList
            title={t("inpatientD3e.carePlan.body")}
            items={INPATIENT_CARE_PLAN_DISCIPLINES.map((d) =>
              t(`inpatientD3e.carePlan.disciplines.${d}`)
            )}
            testId="inpatient-panel-care-plan"
          />
        );
      }
      return (
        <div data-testid="inpatient-panel-care-plan-live">
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="carePlan" />
        </div>
      );
    case "dischargePlanning":
      if (!dischargeLive) {
        return (
          <ShellList
            title={t("inpatientD3e.dischargePlanning.body")}
            items={INPATIENT_DISCHARGE_DESTINATIONS.map((d) =>
              t(`inpatientD3e.dischargePlanning.destinations.${d}`)
            )}
            testId="inpatient-panel-discharge"
          />
        );
      }
      return (
        <div data-testid="inpatient-panel-discharge-live">
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="discharge" />
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              data-testid="inpatient-print-discharge-summary"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #0f766e",
                background: "#f0fdfa",
                color: "#115e59",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {
                void (async () => {
                  try {
                    const patient = encounter?.patient;
                    const enc = asApiObject<{
                      createdAt?: string;
                      dischargeSummaryJson?: unknown;
                      physicianAssigned?: {
                        firstName?: string | null;
                        lastName?: string | null;
                      } | null;
                    }>(
                      await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
                        facilityId: facilityId ?? undefined,
                      }).catch(() => null)
                    );
                    let dischargeSummaryJson = enc?.dischargeSummaryJson ?? null;
                    if (!hasMeaningfulDischargeSummary(dischargeSummaryJson)) {
                      const draft = synthesizeInpatientDischargeSummaryDraft({
                        patientName: [patient?.firstName, patient?.lastName].filter(Boolean).join(" "),
                        mrn: patient?.mrn,
                        admissionDiagnosis,
                        admittedAt,
                        room,
                        codeStatus,
                        isolation,
                        attendingName,
                        assignedRnName,
                        language: language === "en" ? "en" : "fr",
                      });
                      await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
                        method: "PATCH",
                        facilityId: facilityId ?? undefined,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ dischargeSummaryJson: draft }),
                      });
                      dischargeSummaryJson = draft;
                      await onRefetchEncounter();
                    }
                    printDischarge({
                      patient: {
                        firstName: patient?.firstName ?? null,
                        lastName: patient?.lastName ?? null,
                        mrn: patient?.mrn ?? null,
                        dob:
                          patient?.dob instanceof Date
                            ? patient.dob.toISOString()
                            : (patient?.dob ?? null),
                        sexAtBirth: patient?.sexAtBirth ?? null,
                      },
                      encounter: {
                        createdAt: enc?.createdAt ?? admittedAt ?? new Date().toISOString(),
                        dischargeSummaryJson,
                        physicianAssigned: enc?.physicianAssigned ?? null,
                      },
                      primaryDiagnosis: admissionDiagnosis ?? null,
                      language,
                    });
                  } catch {
                    window.alert(t("inpatientHeaderNursingD4a33.discharge.printError"));
                  }
                })();
              }}
            >
              {t("inpatientHeaderNursingD4a33.discharge.printSummary")}
            </button>
          </div>
        </div>
      );
    case "timeline":
      if (!facilityId) {
        return (
          <ShellList
            title={t("inpatientD3e.timeline.body")}
            items={INPATIENT_TIMELINE_EVENT_KINDS.map((k) =>
              t(`inpatientD3e.timeline.kinds.${k}`)
            )}
            testId="inpatient-panel-timeline"
          />
        );
      }
      return (
        <InpatientProviderWorkspacePanel
          mode="timeline"
          encounterId={encounterId}
          facilityId={facilityId}
          patientId={encounter?.patient?.id}
          canProviderWrite={canProviderWrite}
          canDocumentDiagnoses={canPrescribe}
          isLocked={signed}
          onNavigateSection={onNavigateSection}
        />
      );
    case "summary":
      if (!facilityId) {
        return (
          <p data-testid="inpatient-panel-summary" style={{ fontSize: 13, color: "#334155" }}>
            {t("inpatientD3e.summary.body")}
          </p>
        );
      }
      return (
        <InpatientProviderWorkspacePanel
          mode="summary"
          encounterId={encounterId}
          facilityId={facilityId}
          patientId={encounter?.patient?.id}
          canProviderWrite={canProviderWrite}
          canDocumentDiagnoses={canPrescribe}
          isLocked={signed}
          onNavigateSection={onNavigateSection}
        />
      );
    default:
      return null;
  }
}
