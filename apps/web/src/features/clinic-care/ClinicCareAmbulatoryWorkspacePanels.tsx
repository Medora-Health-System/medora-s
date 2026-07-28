/**
 * MEDUI.D4C.5B — Active Clinic Workspace section mounts.
 * Every tile reuses an existing enterprise / ED-shared engine — no ClinicIntake,
 * ClinicOrder, ClinicResult, or parallel clinical documentation system.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ClinicCareAmbulatoryWorkspaceSection } from "@medora/shared";
import { filterAmbulatoryClinicalDataDocuments } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  fetchClinicalDocumentationEntries,
  type ClinicalDocumentationEntryRow,
} from "@/lib/clinicalDocumentationApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyClinicalDataPanel } from "@/features/emergency/EmergencyClinicalDataPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { EnterpriseNursingClinicalWorkspaceD4b2 } from "@/features/clinical-documentation/EnterpriseNursingClinicalWorkspaceD4b2";
import { ClinicCareAmbulatoryClinicalSummaryPanel } from "@/features/clinic-care/ClinicCareAmbulatoryClinicalSummaryPanel";
import { ClinicCareAmbulatoryMedicalEvaluationPanel } from "@/features/clinic-care/ClinicCareAmbulatoryMedicalEvaluationPanel";

export type ClinicCareAmbulatoryWorkspaceEncounter = {
  id: string;
  status?: string | null;
  type?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  clinicianImpression?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  followUpDate?: string | null;
  nursingAssessment?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
};

const sectionShell: React.CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "14px 16px",
};

function IntakeSection({
  encounter,
  facilityId,
  canEdit,
  onUpdate,
}: {
  encounter: ClinicCareAmbulatoryWorkspaceEncounter;
  facilityId: string;
  canEdit: boolean;
  onUpdate: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [chiefComplaint, setChiefComplaint] = useState(
    encounter.chiefComplaint || encounter.visitReason || ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setChiefComplaint(encounter.chiefComplaint || encounter.visitReason || "");
  }, [encounter.id, encounter.chiefComplaint, encounter.visitReason]);

  const save = useCallback(async () => {
    setMessage(null);
    setSaving(true);
    try {
      await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ chiefComplaint: chiefComplaint.trim() }),
      });
      setMessage({ error: false, text: t("clinicCareD4c5b.saved") });
      await onUpdate();
    } catch (e) {
      setMessage({
        error: true,
        text: normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("clinicCareD4c5b.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }, [encounter.id, facilityId, chiefComplaint, onUpdate, t, language]);

  return (
    <div style={sectionShell} data-testid="clinic-care-ambulatory-intake">
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("clinicCareD4c5b.intake.title")}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5b.intake.hint")}</p>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {t("clinicCareD4c5b.intake.chiefComplaint")}
      </label>
      <textarea
        value={chiefComplaint}
        onChange={(e) => setChiefComplaint(e.target.value)}
        disabled={!canEdit || saving}
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 14,
          color: "#0f172a",
          backgroundColor: !canEdit ? "#f8fafc" : "#fff",
          resize: "vertical",
        }}
      />
      {canEdit ? (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "#0d9488",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {message ? (
            <span style={{ fontSize: 12, color: message.error ? "#b91c1c" : "#166534" }}>{message.text}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClinicalDataSection({
  encounterId,
  facilityId,
  facilityTimeZone,
}: {
  encounterId: string;
  facilityId: string;
  facilityTimeZone?: string | null;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ClinicalDocumentationEntryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchClinicalDocumentationEntries(encounterId, facilityId);
        if (!cancelled) setEntries(res.entries ?? []);
      } catch {
        if (!cancelled) setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId]);

  const ambulatoryEntries = useMemo(
    () =>
      filterAmbulatoryClinicalDataDocuments(
        entries.map((e) => ({ id: e.id, typeId: e.cardId, category: e.category }))
      ),
    [entries]
  );

  return (
    <div data-testid="clinic-care-ambulatory-clinical-data">
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
        {t("clinicCareD4c5b.clinicalDataHint")}
        {entries.length > 0 ? ` (${ambulatoryEntries.length}/${entries.length})` : ""}
      </p>
      <EmergencyClinicalDataPanel
        encounterId={encounterId}
        facilityId={facilityId}
        facilityTimeZone={facilityTimeZone}
      />
    </div>
  );
}

function FollowUpSection({
  encounter,
  facilityId,
  canEdit,
  onUpdate,
}: {
  encounter: ClinicCareAmbulatoryWorkspaceEncounter;
  facilityId: string;
  canEdit: boolean;
  onUpdate: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [followUp, setFollowUp] = useState(
    encounter.followUpDate ? new Date(encounter.followUpDate).toISOString().slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setFollowUp(encounter.followUpDate ? new Date(encounter.followUpDate).toISOString().slice(0, 10) : "");
  }, [encounter.id, encounter.followUpDate]);

  const hasDocumentation = Boolean(
    (encounter.clinicianImpression || encounter.providerNote || "").trim() ||
      (encounter.treatmentPlan || "").trim()
  );

  const save = useCallback(async () => {
    setMessage(null);
    setSaving(true);
    try {
      await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ followUpDate: followUp ? new Date(`${followUp}T12:00:00`).toISOString() : null }),
      });
      setMessage({ error: false, text: t("clinicCareD4c5b.saved") });
      await onUpdate();
    } catch (e) {
      setMessage({
        error: true,
        text: normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("clinicCareD4c5b.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }, [encounter.id, facilityId, followUp, onUpdate, t, language]);

  const checklistItem = (label: string, done: boolean) => (
    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: done ? "#166534" : "#64748b" }}>
      <span aria-hidden>{done ? "✅" : "⬜"}</span>
      {label}
    </li>
  );

  return (
    <div style={sectionShell} data-testid="clinic-care-ambulatory-follow-up">
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("clinicCareD4c5b.followUp.title")}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5b.followUp.completeHint")}</p>

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {t("clinicCareD4c5b.followUp.followUpSet")}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <input
          type="date"
          value={followUp}
          disabled={!canEdit || saving}
          onChange={(e) => setFollowUp(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 14,
            backgroundColor: !canEdit ? "#f8fafc" : "#fff",
          }}
        />
        {canEdit ? (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "#0d9488",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        ) : null}
        {message ? (
          <span style={{ fontSize: 12, color: message.error ? "#b91c1c" : "#166534" }}>{message.text}</span>
        ) : null}
      </div>

      <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#475569" }}>
        {t("clinicCareD4c5b.followUp.checklist")}
      </h4>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {checklistItem(t("clinicCareD4c5b.followUp.document"), hasDocumentation)}
        {checklistItem(t("clinicCareD4c5b.followUp.followUpSet"), Boolean(followUp))}
      </ul>
      <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8" }}>
        {formatEncounterChromeDateTime(new Date().toISOString(), language)}
      </p>
    </div>
  );
}

export function ClinicCareAmbulatoryWorkspacePanels({
  section,
  encounter,
  facilityId,
  facilityTimeZone,
  roles,
  userId,
  canPrescribe,
  isLocked,
  resultsRefresh = 0,
  onUpdate,
}: {
  section: ClinicCareAmbulatoryWorkspaceSection;
  encounter: ClinicCareAmbulatoryWorkspaceEncounter;
  facilityId: string;
  facilityTimeZone?: string | null;
  roles: string[];
  userId: string;
  canPrescribe: boolean;
  isLocked: boolean;
  resultsRefresh?: number;
  onUpdate: () => void | Promise<void>;
}) {
  const canEditIntake = roles.includes("RN") || roles.includes("FRONT_DESK") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canDocumentDiagnoses = roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canEditFollowUp = roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const patientId = encounter.patient?.id ?? "";

  switch (section) {
    case "intake":
      return (
        <IntakeSection
          encounter={encounter}
          facilityId={facilityId}
          canEdit={canEditIntake && encounter.status === "OPEN" && !isLocked}
          onUpdate={onUpdate}
        />
      );

    case "medical-evaluation":
      return (
        <ClinicCareAmbulatoryMedicalEvaluationPanel
          encounter={encounter}
          facilityId={facilityId}
          roles={roles}
          onUpdate={onUpdate}
        />
      );

    case "orders":
      return (
        <div data-testid="clinic-care-ambulatory-orders-mount">
          <EmergencyErOrdersPanel
            encounterId={encounter.id}
            facilityId={facilityId}
            canPrescribe={canPrescribe}
            encounterSigned={encounter.providerDocumentationStatus === "SIGNED" || isLocked}
            encounterForOrderModal={{ patient: encounter.patient }}
            onRefetchEncounter={async () => {
              await onUpdate();
            }}
            roles={roles}
          />
        </div>
      );

    case "medications":
      return (
        <MedicationAdministrationTab
          encounterId={encounter.id}
          facilityId={facilityId}
          currentUserId={userId}
          encounterStatus={encounter.status ?? "OPEN"}
          providerDocumentationStatus={encounter.providerDocumentationStatus}
          roleCodes={roles}
          facilityTimeZone={facilityTimeZone}
          embeddedWorkspaceLayout
        />
      );

    case "results":
      return (
        <div data-testid="clinic-care-ambulatory-results-mount">
          <EmergencyResultsPanel
            encounterId={encounter.id}
            facilityId={facilityId}
            refreshToken={resultsRefresh}
            canAcknowledgeResults={
              roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN")
            }
          />
        </div>
      );

    case "diagnoses":
      return (
        <EncounterDiagnosticsPanel
          encounterId={encounter.id}
          patientId={patientId}
          facilityId={facilityId}
          canDocumentDiagnoses={canDocumentDiagnoses}
          isLocked={isLocked}
        />
      );

    case "clinical-data":
      return (
        <ClinicalDataSection
          encounterId={encounter.id}
          facilityId={facilityId}
          facilityTimeZone={facilityTimeZone}
        />
      );

    case "nursing":
      return (
        <div data-testid="clinic-care-ambulatory-nursing">
          {/*
            AMBULATORY is not yet a supported EnterpriseNursingClinicalWorkspaceD4b2 careSetting.
            OBSERVATION is used as the closest non-ED, non-trauma document set for the ambulatory
            MVP (no liveEngineSlot — avoids pulling in ED/trauma reassessment forms).
          */}
          <EnterpriseNursingClinicalWorkspaceD4b2
            encounterId={encounter.id}
            patientId={patientId || "unknown-patient"}
            facilityId={facilityId}
            careSetting="OBSERVATION"
            isLocked={isLocked}
          />
        </div>
      );

    case "notes":
      return (
        <EmergencyErNotesPanel
          encounterId={encounter.id}
          facilityId={facilityId}
          status={encounter.status}
          isLocked={isLocked}
          roleCodes={roles}
          onSaved={onUpdate}
        />
      );

    case "follow-up":
      return (
        <FollowUpSection
          encounter={encounter}
          facilityId={facilityId}
          canEdit={canEditFollowUp && encounter.status === "OPEN" && !isLocked}
          onUpdate={onUpdate}
        />
      );

    case "summary":
      return (
        <ClinicCareAmbulatoryClinicalSummaryPanel
          encounterId={encounter.id}
          facilityId={facilityId}
          facilityTimeZone={facilityTimeZone}
        />
      );

    default:
      return null;
  }
}
