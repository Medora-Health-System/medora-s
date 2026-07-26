"use client";

/**
 * MEDUI.D4A.3.3 / 3.3A / D4B.2 — Inpatient Nursing Assessment hosts:
 * - Enterprise nursing clinical workspace (D4B.2) section chrome
 * - Shared ED reassessment engine
 * - Enterprise handoff and team execution
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adaptNursingHandoffToEnterpriseClinicalDocument,
  adaptNursingReassessmentToEnterpriseClinicalDocument,
  type EnterpriseClinicalDocument,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { EnterpriseNursingClinicalWorkspaceD4b2 } from "@/features/clinical-documentation/EnterpriseNursingClinicalWorkspaceD4b2";
import { EnterpriseRespiratoryTherapyWorkspaceD4b4 } from "@/features/clinical-documentation/EnterpriseRespiratoryTherapyWorkspaceD4b4";
import { EnterpriseRehabilitationWorkspacesD4b5 } from "@/features/clinical-documentation/EnterpriseRehabilitationWorkspacesD4b5";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { InpatientNursingHandoffPanel } from "./InpatientNursingHandoffPanel";
import { InpatientNursingTeamExecutionPanel } from "./InpatientNursingTeamExecutionPanel";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { InpatientWorkspaceEncounterLite } from "./InpatientWorkspacePanel";

function readHandoffProjection(
  nursingAssessment: unknown,
  ids: { encounterId: string; patientId: string; facilityId: string }
): EnterpriseClinicalDocument | null {
  const root = nursingAssessment && typeof nursingAssessment === "object" ? (nursingAssessment as Record<string, unknown>) : null;
  const handoff = root?.erHandoffV1;
  if (!handoff || typeof handoff !== "object") return null;
  const h = handoff as Record<string, unknown>;
  const history = Array.isArray(h.history) ? h.history : [];
  return adaptNursingHandoffToEnterpriseClinicalDocument({
    encounterId: ids.encounterId,
    patientId: ids.patientId,
    facilityId: ids.facilityId,
    careSetting: "INPATIENT",
    signedAt: typeof h.signedAt === "string" ? h.signedAt : null,
    signerUserId: typeof h.signerUserId === "string" ? h.signerUserId : typeof h.nurseUserId === "string" ? h.nurseUserId : null,
    signerDisplayName:
      typeof h.signerDisplayName === "string"
        ? h.signerDisplayName
        : typeof h.nurseName === "string"
          ? h.nurseName
          : null,
    historyCount: history.length,
  });
}

function readReassessmentProjection(
  nursingAssessment: unknown,
  ids: { encounterId: string; patientId: string; facilityId: string }
): EnterpriseClinicalDocument | null {
  const root = nursingAssessment && typeof nursingAssessment === "object" ? (nursingAssessment as Record<string, unknown>) : null;
  const reassessment = root?.erNursingReassessmentV1;
  const hasContent = reassessment != null && typeof reassessment === "object";
  if (!hasContent) return null;
  const r = reassessment as Record<string, unknown>;
  return adaptNursingReassessmentToEnterpriseClinicalDocument({
    encounterId: ids.encounterId,
    patientId: ids.patientId,
    facilityId: ids.facilityId,
    careSetting: "INPATIENT",
    hasContent: true,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
    authorUserId: typeof r.updatedByUserId === "string" ? r.updatedByUserId : null,
    authorDisplayName: typeof r.updatedByDisplayName === "string" ? r.updatedByDisplayName : null,
  });
}

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
  const { roles } = useFacilityAndRoles();
  const [nursingAssessment, setNursingAssessment] = useState<unknown>(null);

  const loadNursingAssessment = useCallback(async () => {
    try {
      const enc = asApiObject<{ nursingAssessment?: unknown; patientId?: string }>(
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

  const patientId = encounter?.patient?.id ?? "unknown-patient";

  const projectedDocuments = useMemo(() => {
    const docs: EnterpriseClinicalDocument[] = [];
    const ids = { encounterId, patientId, facilityId };
    const reassessment = readReassessmentProjection(nursingAssessment, ids);
    if (reassessment) docs.push(reassessment);
    const handoff = readHandoffProjection(nursingAssessment, ids);
    if (handoff) docs.push(handoff);
    return docs;
  }, [nursingAssessment, encounterId, patientId, facilityId]);

  const liveEngine = (
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
  );

  const handoff = (
    <div aria-label={t("inpatientHeaderNursingD4a33.handoff.sectionTitle")}>
      <InpatientNursingHandoffPanel
        encounterId={encounterId}
        facilityId={facilityId}
        nursingAssessment={nursingAssessment}
        isLocked={isLocked}
        canEdit={canEditHandoff}
        onUpdated={refresh}
      />
    </div>
  );

  return (
    <div data-testid="inpatient-panel-nursing-assessment-live" style={{ display: "grid", gap: 14 }}>
      <EnterpriseNursingClinicalWorkspaceD4b2
        encounterId={encounterId}
        patientId={patientId}
        facilityId={facilityId}
        careSetting="INPATIENT"
        isLocked={isLocked}
        documents={projectedDocuments}
        liveEngineSlot={liveEngine}
        handoffSlot={handoff}
        onNavigateStickySection={(section) => {
          if (section === "admission") onNavigateSection?.("admission");
          if (section === "notes") onNavigateSection?.("notes");
          if (section === "dischargePlanning") onNavigateSection?.("dischargePlanning");
          if (section === "carePlan") onNavigateSection?.("carePlan");
          if (section === "nursing") onNavigateSection?.("nursing");
        }}
      />

      <EnterpriseRespiratoryTherapyWorkspaceD4b4
        encounterId={encounterId}
        patientId={patientId}
        facilityId={facilityId}
        careSetting="INPATIENT"
        roleCodes={roles}
        isLocked={isLocked}
      />

      <EnterpriseRehabilitationWorkspacesD4b5
        encounterId={encounterId}
        patientId={patientId}
        facilityId={facilityId}
        careSetting="INPATIENT"
        roleCodes={roles}
        isLocked={isLocked}
      />

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
