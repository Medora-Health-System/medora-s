"use client";

import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  OBSERVATION_DISPOSITION_PATHWAYS,
  OBSERVATION_TIMELINE_KINDS,
} from "@medora/shared";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import type { ObservationWorkspaceSection } from "./observationWorkspaceSections";
import {
  isObservationDepartmentalOrdersEnabledInBrowser,
  isObservationDocumentationEnabledInBrowser,
  isObservationMarEnabledInBrowser,
  isObservationWorkspaceEnabledInBrowser,
} from "./observationWorkspacePaths";

export type ObservationWorkspaceEncounterLite = {
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

export function ObservationWorkspacePanel({
  section,
  encounterId,
  encounter,
  workspaceEnabled,
  onRefetchEncounter,
}: {
  section: ObservationWorkspaceSection;
  encounterId: string;
  encounter: ObservationWorkspaceEncounterLite | null;
  workspaceEnabled?: boolean;
  onRefetchEncounter: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { facilityId, roles, userId, facilityTimeZone } = useFacilityAndRoles();
  const enabled = workspaceEnabled ?? isObservationWorkspaceEnabledInBrowser();
  const ordersLive = isObservationDepartmentalOrdersEnabledInBrowser();
  const marLive = isObservationMarEnabledInBrowser();
  const docsLive = isObservationDocumentationEnabledInBrowser();
  const canPrescribe = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canAck =
    roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN");
  const signed = (encounter?.providerDocumentationStatus ?? "").trim() === "SIGNED";

  if (!enabled) {
    return (
      <p
        style={{ fontSize: 13, color: "#64748b", lineHeight: 1.45 }}
        data-testid={`observation-panel-feature-off-${section}`}
      >
        {t("observationD3d.featureUnavailable")}
      </p>
    );
  }

  switch (section) {
    case "overview":
      return (
        <div data-testid="observation-panel-overview">
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
            {t("observationD3d.overview.body")}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("observationD3d.overview.encounterId")}: {encounterId}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("observationD3da.sharedOrderEngineHint")}
          </p>
        </div>
      );
    case "orders":
      if (!ordersLive || !facilityId) {
        return (
          <p data-testid="observation-panel-orders-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("observationD3da.ordersFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="observation-panel-orders-live">
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("observationD3da.ordersOwnershipHint")}
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
          <p data-testid="observation-panel-results-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("observationD3da.resultsFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="observation-panel-results-live">
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
          <p data-testid="observation-panel-mar-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("observationD3da.marFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="observation-panel-mar-live">
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("observationD3da.marSeparateHint")}
          </p>
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
      );
    case "providerNotes":
      if (!docsLive || !facilityId) {
        return (
          <p data-testid="observation-panel-notes-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("observationD3da.docsFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="observation-panel-notes-live">
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientWorkspaceRecoveryD4a27b.notes.governedProgressOnly")}
          </p>
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
    case "problemsPlan":
      return (
        <p data-testid="observation-panel-problems" style={{ margin: 0, fontSize: 13 }}>
          {t("inpatientRapidConvergenceD4a27c.observation.providerNav.problemsPlan")}
        </p>
      );
    case "assessments":
    case "vitals":
    case "tasks":
    case "education": {
      const nursingLabelKey =
        section === "assessments"
          ? "inpatientRapidConvergenceD4a27c.observation.nursingNav.assessments"
          : section === "vitals"
            ? "inpatientRapidConvergenceD4a27c.observation.nursingNav.vitals"
            : section === "tasks"
              ? "inpatientRapidConvergenceD4a27c.observation.nursingNav.tasks"
              : "inpatientRapidConvergenceD4a27c.observation.nursingNav.education";
      return (
        <div data-testid={`observation-panel-${section}`}>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>{t(nursingLabelKey)}</p>
        </div>
      );
    }
    case "nursing":
    case "reassessment":
      if (!docsLive || !facilityId) {
        return (
          <p data-testid="observation-panel-nursing-flag-off" style={{ fontSize: 13, color: "#64748b" }}>
            {t("observationD3da.docsFlagOff")}
          </p>
        );
      }
      return (
        <div data-testid="observation-panel-nursing-live">
          <EmergencyNursingReassessmentPanel
            encounterId={encounterId}
            facilityId={facilityId}
            encounter={{
              id: encounterId,
              status: encounter?.status ?? "OPEN",
              type: encounter?.type ?? "INPATIENT",
            }}
            isLocked={signed}
            onSaved={onRefetchEncounter}
            nursingTabHref={`/app/hospitalisation/observation/active/${encounterId}?section=nursing`}
            variant="observationEncounter"
          />
        </div>
      );
    case "carePlan":
      return (
        <p data-testid="observation-panel-care-plan" style={{ margin: 0, fontSize: 13 }}>
          {t("observationD3d.carePlan.body")}
        </p>
      );
    case "summary":
      return (
        <p data-testid="observation-panel-summary" style={{ margin: 0, fontSize: 13 }}>
          {t("observationD3d.summary.body")}
        </p>
      );
    case "disposition":
      return (
        <ul data-testid="observation-panel-disposition" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_DISPOSITION_PATHWAYS.map((pathway) => (
            <li key={pathway} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.disposition.pathways.${pathway}`)}
            </li>
          ))}
        </ul>
      );
    case "timeline":
      return (
        <ul data-testid="observation-panel-timeline" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_TIMELINE_KINDS.map((kind) => (
            <li key={kind} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.timeline.kinds.${kind}`)}
            </li>
          ))}
          <li style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
            {t("observationD3da.timelineOrdersHint")}
          </li>
        </ul>
      );
    default:
      return null;
  }
}
