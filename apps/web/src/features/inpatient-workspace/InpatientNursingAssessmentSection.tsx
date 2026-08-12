"use client";

import { InpatientNursingAssessmentPanel } from "./InpatientNursingAssessmentPanel";
import type { InpatientWorkspaceEncounterLite } from "./InpatientWorkspacePanel";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

/** Focused bedside nursing composition. Ancillary and team engines remain on their own routes. */
export function InpatientNursingAssessmentSection({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  canEditAssessment,
  onRefetch,
}: {
  encounterId: string;
  facilityId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  isLocked: boolean;
  canEditAssessment: boolean;
  canEditHandoff: boolean;
  assignedRnName?: string | null;
  assignedPctName?: string | null;
  attendingName?: string | null;
  nursingTabHref: string;
  onRefetch: () => void | Promise<void>;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  return (
    <div data-testid="inpatient-panel-nursing-assessment-live">
      <InpatientNursingAssessmentPanel
        encounterId={encounterId}
        facilityId={facilityId}
        patientId={encounter?.patient?.id ?? "unknown-patient"}
        isLocked={isLocked || !canEditAssessment}
        onSaved={onRefetch}
      />
    </div>
  );
}
