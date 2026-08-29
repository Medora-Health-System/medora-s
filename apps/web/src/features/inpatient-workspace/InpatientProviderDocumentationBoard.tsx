"use client";

/**
 * INP.PROV.1A/1B — Provider Documentation hub.
 * INP.PROV.1B mounts the redesigned 3-column workspace (screenshot visual contract)
 * while reusing durable D4A.26 provider-workspace + clinical-ops engines.
 */

import { canAuthorInpatientProviderDocumentation } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { InpatientProviderDocumentationWorkspaceInpProv1b } from "./InpatientProviderDocumentationWorkspaceInpProv1b";
import type { InpatientWorkspaceEncounterLite } from "./InpatientWorkspacePanel";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { VitalsHistoryEntry } from "@/lib/encounterClinicalSafetyUi";

type Props = {
  encounterId: string;
  facilityId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  roles: string[];
  isLocked: boolean;
  writersEnabled: boolean;
  initialSubtab?: string | null;
  admissionDiagnosis?: string | null;
  room?: string | null;
  latestVitalsEntry?: VitalsHistoryEntry | null;
  allergiesSummary?: string | null;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
};

export function InpatientProviderDocumentationBoard({
  encounterId,
  facilityId,
  encounter,
  roles,
  isLocked,
  writersEnabled,
  allergiesSummary,
  onNavigateSection,
}: Props) {
  const { t } = useI18n();
  const canAuthor = canAuthorInpatientProviderDocumentation(roles) && writersEnabled;
  void encounter;
  void t;

  return (
    <div data-testid="inp-prov-1a-provider-documentation-board">
      {!canAuthor ? (
        <p
          role="status"
          data-testid="inp-prov-1a-view-only"
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          {t("inpatientProviderDocumentationInpProv1a.viewOnlyBanner")}
        </p>
      ) : null}
      <InpatientProviderDocumentationWorkspaceInpProv1b
        encounterId={encounterId}
        facilityId={facilityId}
        patientId={encounter?.patient?.id}
        roles={roles}
        isLocked={isLocked}
        writersEnabled={writersEnabled}
        allergiesSummary={allergiesSummary ?? null}
        onNavigateSection={(section) => {
          onNavigateSection?.(section as InpatientWorkspaceSection);
        }}
      />
    </div>
  );
}
