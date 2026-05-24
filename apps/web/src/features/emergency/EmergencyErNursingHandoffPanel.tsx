"use client";

import React, { useCallback, useMemo, useState } from "react";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { erDispositionBadgeFromEncounterJson } from "@/features/emergency/erTrackboardDispositionBadge";
import { erDispositionBadgeDisplayLabel } from "@/features/emergency/erDispositionBadgeI18n";
import { useI18n } from "@/lib/i18n";
import {
  mergeDischargeSortieExecutionIntoNursingAssessment,
  readDischargeSortieExecutionFromEncounter,
  readDispositionSignatureFromEncounter,
} from "@/features/emergency/emergencyDispositionV1";

type PatientLite = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

type EncounterLite = {
  id: string;
  status?: string | null;
  createdAt?: string | null;
  patient?: PatientLite | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
};

const inputNote: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 12,
  color: "#0f172a",
  backgroundColor: "#fff",
  minHeight: 56,
  resize: "vertical" as const,
};

/**
 * Suite opérationnelle après décision médicale : lecture dossier partagé + actions synthèse / impression sortie.
 * Exécution sortie infirmière (sortie à domicile) : persistée sous `nursingAssessment.erDispositionExecutionV1` (PATCH consultation).
 */
export function EmergencyErNursingHandoffPanel({
  encounter,
  encounterId,
  facilityId,
  onSaved,
  canRecordDischargeSortieExecution,
  onSummaryClosureClick,
  facilityName,
}: {
  encounter: EncounterLite;
  /** Requis pour enregistrer l’exécution sortie infirmière (sortie à domicile). */
  encounterId?: string;
  facilityId?: string;
  onSaved?: () => void | Promise<void>;
  /** RN / ADMIN : bouton de confirmation d’exécution sortie. */
  canRecordDischargeSortieExecution?: boolean;
  /** When set, Summary & closure stays in the ER workflow (no navigation to the generic encounter page). */
  onSummaryClosureClick?: () => void;
  facilityName?: string | null;
}) {
  const { t, language } = useI18n();
  const badge = useMemo(
    () =>
      erDispositionBadgeFromEncounterJson({
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
      }),
    [encounter.dischargeSummaryJson, encounter.admissionSummaryJson, encounter.nursingAssessment]
  );
  const discharge = useMemo(
    () => parseDischargeSummaryForChart(encounter.dischargeSummaryJson),
    [encounter.dischargeSummaryJson]
  );
  const admission = useMemo(
    () => parseAdmissionSummaryForChart(encounter.admissionSummaryJson),
    [encounter.admissionSummaryJson]
  );
  const sig = useMemo(
    () => readDispositionSignatureFromEncounter(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );
  const sortieExec = useMemo(
    () => readDischargeSortieExecutionFromEncounter(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );

  const [executionNoteDraft, setExecutionNoteDraft] = useState("");
  const [savingExec, setSavingExec] = useState(false);
  const [execSaveInfo, setExecSaveInfo] = useState<string | null>(null);

  const modeLine = discharge?.dischargeMode?.trim() || "";
  const hasDispositionText =
    Boolean(modeLine) ||
    Boolean(discharge?.disposition?.trim()) ||
    Boolean(badge?.shortLabel);

  const admissionLikely =
    Boolean(admission?.admissionReason?.trim()) ||
    Boolean(admission?.careLevel?.trim()) ||
    Boolean(admission?.serviceUnit?.trim());

  const statusOpen = (encounter.status ?? "").trim() === "OPEN";
  const docSigned = encounter.providerDocumentationStatus === "SIGNED";
  const isDischargeDisposition = badge?.variant === "discharge";
  const showDischargePending =
    isDischargeDisposition && statusOpen && !sortieExec;
  const showDischargeCompleted = Boolean(sortieExec && isDischargeDisposition);

  const canSaveSortieExecution =
    Boolean(encounterId && facilityId && onSaved) &&
    Boolean(canRecordDischargeSortieExecution) &&
    statusOpen &&
    isDischargeDisposition &&
    !sortieExec;

  const handleConfirmSortieExecution = useCallback(async () => {
    if (!canSaveSortieExecution || !encounterId || !facilityId || !onSaved) return;
    setSavingExec(true);
    setExecSaveInfo(null);
    try {
      let name = t("emergencyErNursingHandoff.signerFallbackNurse");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) name = fn;
        }
      } catch {
        /* repli */
      }
      const payload = mergeDischargeSortieExecutionIntoNursingAssessment(encounter.nursingAssessment, {
        dischargeSortieCompletedAt: new Date().toISOString(),
        dischargeSortieCompletedByDisplayName: name,
        dischargeSortieExecutionNote: executionNoteDraft.trim() || undefined,
      });
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: payload }),
      });
      setExecutionNoteDraft("");
      await onSaved();
      setExecSaveInfo(t("emergencyErNursingHandoff.execSavedOk"));
    } catch (e) {
      console.error(e);
      setExecSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("emergencyErNursingHandoff.execSaveFailed")
      );
    } finally {
      setSavingExec(false);
    }
  }, [
    canSaveSortieExecution,
    encounter.nursingAssessment,
    encounterId,
    executionNoteDraft,
    facilityId,
    onSaved,
    t,
  ]);

  const formatDt = (iso: string | null | undefined) => {
    if (!iso) return t("common.dash");
    try {
      return formatEncounterChromeDateTime(iso, language);
    } catch {
      return t("common.dash");
    }
  };

  const handlePrint = () => {
    const p = encounter.patient;
    if (!p || !encounter.createdAt) return;
    printDischarge({
      patient: p,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        physicianAssigned: encounter.physicianAssigned ?? null,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: null,
      language,
    });
  };

  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="E">
          <MedoraCardTitle
            title={t("emergencyErNursingHandoff.panelTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyErNursingHandoff.panelSubline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {badge ? (
            <MedoraCardBadgeRow marginTop={0}>
              <MedoraCardBadge soft={{ bg: "#f1f5f9", text: "#0f172a", border: "#cbd5e1" }}>
                {t("emergencyErNursingHandoff.dispositionDecisionPrefix")} : {erDispositionBadgeDisplayLabel(badge, t)}
              </MedoraCardBadge>
            </MedoraCardBadgeRow>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyErNursingHandoff.noDispositionBadge")}</p>
          )}
        </div>

        {showDischargeCompleted ? (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #6ee7b7",
              backgroundColor: "#ecfdf5",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#047857", lineHeight: 1.4 }}>
              {t("emergencyErNursingHandoff.sortieCompletedTitle")}
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#065f46", lineHeight: 1.4 }}>
              {sortieExec?.dischargeSortieCompletedByDisplayName} — {formatDt(sortieExec?.dischargeSortieCompletedAt)}
            </p>
            {sortieExec?.dischargeSortieExecutionNote ? (
              <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#334155", lineHeight: 1.45 }}>
                <span style={{ fontWeight: 600 }}>{t("emergencyErNursingHandoff.notePrefix")}</span>{" "}
                {sortieExec.dischargeSortieExecutionNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {showDischargePending ? (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #a7f3d0",
              backgroundColor: "#ecfdf5",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#065f46", lineHeight: 1.4 }}>
              {t("emergencyErNursingHandoff.sortiePendingTitle")}
            </p>
            <ul
              style={{
                margin: "6px 0 0 0",
                paddingLeft: 18,
                fontSize: 11,
                color: "#14532d",
                lineHeight: 1.45,
              }}
            >
              <li>{t("emergencyErNursingHandoff.sortiePendingLi1")}</li>
              <li>{t("emergencyErNursingHandoff.sortiePendingLi2")}</li>
              <li>{t("emergencyErNursingHandoff.sortiePendingLi3")}</li>
            </ul>
            {canSaveSortieExecution ? (
              <>
                <label style={{ display: "block", marginTop: 8, fontSize: 11, fontWeight: 600, color: "#475569" }}>
                  {t("emergencyErNursingHandoff.executionNoteLabel")}
                </label>
                <textarea
                  value={executionNoteDraft}
                  onChange={(e) => setExecutionNoteDraft(e.target.value)}
                  placeholder={t("emergencyErNursingHandoff.executionNotePlaceholder")}
                  style={{ ...inputNote, marginTop: 4 }}
                  rows={2}
                  disabled={savingExec}
                />
                <button
                  type="button"
                  onClick={() => void handleConfirmSortieExecution()}
                  disabled={savingExec}
                  style={{
                    marginTop: 8,
                    padding: "7px 12px",
                    borderRadius: 10,
                    border: "1px solid #059669",
                    backgroundColor: savingExec ? "#d1fae5" : "#10b981",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: savingExec ? "wait" : "pointer",
                  }}
                >
                  {savingExec ? t("emergencyErNursingHandoff.savingExecution") : t("emergencyErNursingHandoff.confirmExecution")}
                </button>
                {execSaveInfo ? (
                  <p
                    style={{
                      margin: "6px 0 0 0",
                      fontSize: 11,
                      color: execSaveInfo === t("emergencyErNursingHandoff.execSavedOk") ? "#047857" : "#b91c1c",
                    }}
                  >
                    {execSaveInfo}
                  </p>
                ) : null}
              </>
            ) : (
              <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                {t("emergencyErNursingHandoff.roleDeniedHint")}
              </p>
            )}
          </div>
        ) : null}

        {docSigned &&
        encounter.providerDocumentationSignedAt &&
        encounter.providerDocumentationSignedByDisplayFr ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#1e40af", lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600 }}>{t("emergencyErNursingHandoff.signedEvalLabel")}</span>{" "}
            {encounter.providerDocumentationSignedByDisplayFr} — {formatDt(encounter.providerDocumentationSignedAt)}
          </p>
        ) : null}

        {modeLine ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "#64748b" }}>{t("emergencyErNursingHandoff.modeSortieLabel")}</span>{" "}
            {modeLine}
          </p>
        ) : null}

        {sig ? (
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.35 }}>
            <span style={{ fontWeight: 600 }}>{t("emergencyErNursingHandoff.dispositionRecordedLabel")}</span>{" "}
            {sig.savedByDisplayName} —{" "}
            {formatDt(sig.savedAt)}
          </p>
        ) : null}

        {!hasDispositionText && !admissionLikely ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
            {t("emergencyErNursingHandoff.waitingPhysicianDisposition")}
          </p>
        ) : null}

        {admissionLikely ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#5b21b6", lineHeight: 1.45 }}>
            {t("emergencyErNursingHandoff.admissionPacketPrefix")}{" "}
            {admission?.careLevel?.trim() || t("common.dash")}
            {admission?.serviceUnit?.trim() ? ` · ${admission.serviceUnit.trim()}` : null}
          </p>
        ) : null}

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!encounter.patient || !encounter.createdAt}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: encounter.patient && encounter.createdAt ? "#f8fafc" : "#f1f5f9",
              color: encounter.patient && encounter.createdAt ? "#334155" : "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              cursor: encounter.patient && encounter.createdAt ? "pointer" : "not-allowed",
            }}
          >
            {t("emergencyErNursingHandoff.printDischargeDoc")}
          </button>
          {onSummaryClosureClick ? (
            <button
              type="button"
              onClick={onSummaryClosureClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#334155",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("emergencyErNursingHandoff.linkSummaryClosure")}
            </button>
          ) : null}
        </MedoraCardActions>
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.35 }}>
          {t("emergencyErNursingHandoff.footerHint")}
        </p>
      </MedoraCardInner>
    </MedoraCard>
  );
}
