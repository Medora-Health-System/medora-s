"use client";

/**
 * Legacy compact timeline shell — delegates to enterprise command timeline (Phase 15F-D.3).
 */
import { EnterpriseEncounterCommandTimeline } from "@/components/encounters/EnterpriseEncounterCommandTimeline";

export function ClinicalTimeline({
  encounterId,
  facilityId,
  refreshToken,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken?: number;
}) {
  return (
    <EnterpriseEncounterCommandTimeline
      encounterId={encounterId}
      facilityId={facilityId}
      refreshToken={refreshToken}
      embedded
      limit={40}
    />
  );
}
