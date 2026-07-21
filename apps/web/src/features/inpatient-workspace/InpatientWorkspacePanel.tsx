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
} from "@medora/shared";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import {
  isInpatientDepartmentalOrdersEnabledInBrowser,
  isInpatientDocumentationEnabledInBrowser,
  isInpatientMarEnabledInBrowser,
  isInpatientWorkspaceEnabledInBrowser,
} from "./inpatientWorkspacePaths";

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
  onRefetchEncounter,
}: {
  section: InpatientWorkspaceSection;
  encounterId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  workspaceEnabled?: boolean;
  onRefetchEncounter: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { facilityId, roles, userId, facilityTimeZone } = useFacilityAndRoles();
  const enabled = workspaceEnabled ?? isInpatientWorkspaceEnabledInBrowser();
  const ordersLive = isInpatientDepartmentalOrdersEnabledInBrowser();
  const marLive = isInpatientMarEnabledInBrowser();
  const docsLive = isInpatientDocumentationEnabledInBrowser();
  const canPrescribe = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canAck =
    roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN");
  const signed = (encounter?.providerDocumentationStatus ?? "").trim() === "SIGNED";

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
      return (
        <div data-testid="inpatient-panel-overview">
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
            {t("inpatientD3e.overview.body")}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e.overview.encounterId")}: {encounterId}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e.sharedOrderEngineHint")}
          </p>
        </div>
      );
    case "historyPhysical":
    case "progressNotes":
      if (!docsLive || !facilityId) {
        return (
          <div data-testid={`inpatient-panel-${section}-flag-off`}>
            <p style={{ fontSize: 13, color: "#64748b" }}>{t("inpatientD3e.docsFlagOff")}</p>
            <ShellList
              title={t("inpatientD3e.historyPhysical.kindsTitle")}
              items={INPATIENT_NOTE_KINDS.map((k) => t(`inpatientD3e.historyPhysical.kinds.${k}`))}
              testId="inpatient-hp-kinds-shell"
            />
          </div>
        );
      }
      return (
        <div data-testid={`inpatient-panel-${section}-live`}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientD3e.historyPhysical.reuseNotesHint")}
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
    case "nursing":
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
    case "consults":
      return (
        <ShellList
          title={t("inpatientD3e.consults.body")}
          items={INPATIENT_CONSULT_SPECIALTIES.map((s) =>
            t(`inpatientD3e.consults.specialties.${s}`)
          )}
          testId="inpatient-panel-consults"
        />
      );
    case "carePlan":
      return (
        <ShellList
          title={t("inpatientD3e.carePlan.body")}
          items={INPATIENT_CARE_PLAN_DISCIPLINES.map((d) =>
            t(`inpatientD3e.carePlan.disciplines.${d}`)
          )}
          testId="inpatient-panel-care-plan"
        />
      );
    case "dischargePlanning":
      return (
        <ShellList
          title={t("inpatientD3e.dischargePlanning.body")}
          items={INPATIENT_DISCHARGE_DESTINATIONS.map((d) =>
            t(`inpatientD3e.dischargePlanning.destinations.${d}`)
          )}
          testId="inpatient-panel-discharge"
        />
      );
    case "timeline":
      return (
        <ShellList
          title={t("inpatientD3e.timeline.body")}
          items={INPATIENT_TIMELINE_EVENT_KINDS.map((k) =>
            t(`inpatientD3e.timeline.kinds.${k}`)
          )}
          testId="inpatient-panel-timeline"
        />
      );
    case "summary":
      return (
        <p data-testid="inpatient-panel-summary" style={{ fontSize: 13, color: "#334155" }}>
          {t("inpatientD3e.summary.body")}
        </p>
      );
    default:
      return null;
  }
}
