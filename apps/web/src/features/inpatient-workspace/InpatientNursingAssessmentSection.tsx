"use client";

/**
 * MEDUI.D4A.3.3 / 3.3A — Inpatient Nursing Assessment hosts the shared ED reassessment engine
 * plus enterprise handoff and team execution.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { InpatientNursingHandoffPanel } from "./InpatientNursingHandoffPanel";
import { InpatientNursingTeamExecutionPanel } from "./InpatientNursingTeamExecutionPanel";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { InpatientWorkspaceEncounterLite } from "./InpatientWorkspacePanel";

export function InpatientNursingAssessmentSection({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  canEditHandoff,
  assignedRnName,
  assignedPctName,
  attendingName,
  nursingTabHref,
  onRefetch,
  onNavigateSection,
}: {
  encounterId: string;
  facilityId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  isLocked: boolean;
  canEditHandoff: boolean;
  assignedRnName?: string | null;
  assignedPctName?: string | null;
  attendingName?: string | null;
  nursingTabHref: string;
  onRefetch: () => void | Promise<void>;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  const { t } = useI18n();
  const [nursingAssessment, setNursingAssessment] = useState<unknown>(null);

  const loadNursingAssessment = useCallback(async () => {
    try {
      const enc = asApiObject<{ nursingAssessment?: unknown }>(
        await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, { facilityId })
      );
      setNursingAssessment(enc?.nursingAssessment ?? null);
    } catch {
      setNursingAssessment(null);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadNursingAssessment();
  }, [loadNursingAssessment]);

  const refresh = async () => {
    await onRefetch();
    await loadNursingAssessment();
  };

  return (
    <div data-testid="inpatient-panel-nursing-assessment-live">
      <EmergencyNursingReassessmentPanel
        encounterId={encounterId}
        facilityId={facilityId}
        encounter={{
          id: encounterId,
          status: encounter?.status ?? "OPEN",
          type: encounter?.type ?? "INPATIENT",
          nursingAssessment,
        }}
        isLocked={isLocked}
        onSaved={refresh}
        nursingTabHref={nursingTabHref}
        variant="inpatientEncounter"
      />

      <div style={{ marginTop: 14 }} aria-label={t("inpatientHeaderNursingD4a33.handoff.sectionTitle")}>
        <InpatientNursingHandoffPanel
          encounterId={encounterId}
          facilityId={facilityId}
          nursingAssessment={nursingAssessment}
          isLocked={isLocked}
          canEdit={canEditHandoff}
          onUpdated={refresh}
        />
      </div>

      <InpatientNursingTeamExecutionPanel
        encounterId={encounterId}
        facilityId={facilityId}
        assignedRnName={assignedRnName}
        assignedPctName={assignedPctName}
        attendingName={attendingName}
        onNavigateSection={onNavigateSection}
      />
    </div>
  );
}
