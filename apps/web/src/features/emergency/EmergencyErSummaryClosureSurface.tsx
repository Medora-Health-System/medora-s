"use client";

/**
 * ER-native final review: facility + patient + disposition + visit summary + print + end encounter.
 * Reuses EmergencyVisitSummaryPanel and the same close-check/close API path as the generic encounter page.
 */

import React, { useCallback, useState, type ComponentProps } from "react";
import type { DispositionSafetyReadinessResponse } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { DispositionReadinessBanner } from "@/components/clinical/DispositionReadinessBanner";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
} from "@/lib/encounterChromeI18n";
import { printErPacket } from "@/features/emergency/erPrintPacket";
import {
  dischargeModeFrToDischargeStatus,
  hydrateDischargeFormFromEncounterJson,
  mergeDischargeForSave,
} from "@/lib/encounterDischarge";
import { parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import {
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
} from "@/features/emergency/emergencyDispositionV1";
import { EmergencyVisitSummaryPanel } from "@/features/emergency/EmergencyVisitSummaryPanel";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

/** API encounters include `patient`; `EncounterLike` does not — widen for header / print / close. */
type ErClosureEncounter = ComponentProps<typeof EmergencyVisitSummaryPanel>["encounter"] & {
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
    globalMrn?: string | null;
  } | null;
  admissionSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{ id: string; text: string; createdAt: string }>;
};

function dischargePayloadForClose(encounter: ErClosureEncounter, canEditNursing: boolean, canEditMedical: boolean) {
  const form = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const merged = mergeDischargeForSave(encounter.dischargeSummaryJson, form, canEditNursing, canEditMedical);
  const out: Record<string, unknown> = {};
  if (merged) {
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "boolean") {
        out[k] = v;
      } else if (typeof v === "string") {
        const t = v.trim();
        if (t) out[k] = t;
      }
    }
  }
  return out;
}

export type EmergencyErSummaryClosureSurfaceProps = {
  encounterId: string;
  facilityId: string;
  facilityName: string | null;
  encounter: ErClosureEncounter;
  triageSnapshot: Record<string, unknown> | null;
  resultsRefresh: number;
  resultsTabHref: string;
  diagnosticsTabHref: string;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
  onReload: () => void | Promise<void>;
  /** Anchor for scroll-into-view from disposition panel (chart view). */
  sectionId?: string;
  ivAccessFetchEnabled?: boolean;
  proceduresFetchEnabled?: boolean;
};

export function EmergencyErSummaryClosureSurface({
  encounterId,
  facilityId,
  facilityName,
  encounter,
  triageSnapshot,
  resultsRefresh,
  resultsTabHref,
  diagnosticsTabHref,
  canEditNursingDischarge,
  canEditMedicalDischarge,
  onReload,
  sectionId,
  ivAccessFetchEnabled,
  proceduresFetchEnabled,
}: EmergencyErSummaryClosureSurfaceProps) {
  const canFetchIvAccess = ivAccessFetchEnabled ?? false;
  const canFetchProcedures = proceduresFetchEnabled ?? false;
  const { t, language } = useI18n();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [deficiencies, setDeficiencies] = useState<Array<{ code: string; labelFr: string }>>([]);
  const [closing, setClosing] = useState(false);
  const [dispositionReadiness, setDispositionReadiness] = useState<DispositionSafetyReadinessResponse | null>(
    null
  );
  const [ackDispositionSafety, setAckDispositionSafety] = useState(false);

  const handleDispositionReadiness = useCallback((r: DispositionSafetyReadinessResponse | null) => {
    setDispositionReadiness(r);
  }, []);

  const patient = encounter.patient;
  const dash = t("common.dash");
  const name =
    `${(patient?.firstName ?? "").trim()} ${(patient?.lastName ?? "").trim()}`.trim() || dash;
  const ageSex = formatPatientAgeSexLine(
    patient?.dob ?? null,
    patient?.sexAtBirth ?? null,
    patient?.sex ?? null,
    t
  );
  const nir = (patient?.mrn ?? patient?.nationalId ?? "").trim() || dash;

  const supplement = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
  const dischargeForm = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
  const dispositionLabel = localizedErDischargeModeLabel(dischargeForm.dischargeMode, supplement, language);
  const outcomeUi = inferOutcomeUiFromForms(dischargeForm.dischargeMode, supplement);

  const contextKey = `emergencyErClosure.context.${outcomeUi}`;
  const contextLine = t(contextKey);
  const showContext = contextLine !== contextKey;

  const handlePrint = useCallback(() => {
    const p = encounter.patient;
    if (!p || !encounter.createdAt) return;
    printErPacket({
      patient: p,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
        physicianAssigned: encounter.physicianAssigned ?? null,
        providerDocumentationStatus: encounter.providerDocumentationStatus ?? null,
        providerDocumentationSignedAt: encounter.providerDocumentationSignedAt ?? null,
        providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr ?? null,
        providerAddenda: encounter.providerAddenda,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: null,
      triageSnapshot,
      language,
    });
  }, [encounter, facilityName, language, triageSnapshot]);

  const executeClose = useCallback(
    async (acknowledgeDeficiencies: boolean, acknowledgeDispositionSafetyOverride?: boolean) => {
      setClosing(true);
      try {
        const dischargePayload = dischargePayloadForClose(
          encounter,
          canEditNursingDischarge,
          canEditMedicalDischarge
        );
        const form = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
        const derivedStatus = dischargeModeFrToDischargeStatus(
          parseDischargeSummaryForChart(encounter.dischargeSummaryJson)?.dischargeMode ?? form.dischargeMode
        );
        const body: Record<string, unknown> = {};
        if (Object.keys(dischargePayload).length > 0) body.discharge = dischargePayload;
        if (acknowledgeDeficiencies) body.acknowledgeDeficiencies = true;
        if (acknowledgeDispositionSafetyOverride) body.acknowledgeDispositionSafety = true;
        if (derivedStatus) body.dischargeStatus = derivedStatus;

        const res = await apiFetch(`/encounters/${encounterId}/close`, {
          method: "POST",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const queued =
          res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
        setShowCloseModal(false);
        setShowDeficiencyModal(false);
        setDeficiencies([]);
        setAckDispositionSafety(false);
        if (queued) {
          alert(t("emergencyErClosure.closeQueuedNotice"));
        }
        await Promise.resolve(onReload());
      } catch (e) {
        alert(
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
            t("emergencyErClosure.closeFailed")
        );
      } finally {
        setClosing(false);
      }
    },
    [
      canEditMedicalDischarge,
      canEditNursingDischarge,
      encounter,
      encounterId,
      facilityId,
      language,
      onReload,
      t,
    ]
  );

  const runCloseCheck = useCallback(async () => {
    setClosing(true);
    try {
      const dischargePayload = dischargePayloadForClose(
        encounter,
        canEditNursingDischarge,
        canEditMedicalDischarge
      );
      const form = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
      const derivedStatus = dischargeModeFrToDischargeStatus(
        parseDischargeSummaryForChart(encounter.dischargeSummaryJson)?.dischargeMode ?? form.dischargeMode
      );
      const checkBody: Record<string, unknown> = {};
      if (Object.keys(dischargePayload).length > 0) checkBody.discharge = dischargePayload;
      if (derivedStatus) checkBody.dischargeStatus = derivedStatus;

      const check = await apiFetch(`/encounters/${encounterId}/close-check`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkBody),
      });
      const result = asApiObject(check) as {
        hasDeficiencies?: boolean;
        deficiencies?: Array<{ code: string; labelFr: string }>;
      };
      if (result.hasDeficiencies && result.deficiencies && result.deficiencies.length > 0) {
        setShowCloseModal(false);
        setDeficiencies(result.deficiencies);
        setShowDeficiencyModal(true);
        return;
      }
      await executeClose(false, ackDispositionSafety);
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("emergencyErClosure.closeCheckFailed")
      );
    } finally {
      setClosing(false);
    }
  }, [
    canEditMedicalDischarge,
    canEditNursingDischarge,
    encounter,
    encounterId,
    executeClose,
    facilityId,
    ackDispositionSafety,
    language,
    t,
  ]);

  const shell = MEDORA_CARD_SHELL;
  const open = encounter.status === "OPEN";

  return (
    <div id={sectionId} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          backgroundColor: shell.background,
          border: shell.border,
          borderRadius: shell.radius,
          boxShadow: shell.boxShadow,
          padding: "16px 18px",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b" }}>
          {t("emergencyErClosure.finalReviewLabel")}
        </p>
        <p style={{ margin: "6px 0 0 0", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
          {facilityName?.trim() || t("emergencyErClosure.facilityFallback")}
        </p>
        <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
          <strong style={{ color: "#0f172a" }}>{name}</strong>
          <span style={{ color: "#94a3b8" }}> · </span>
          <span>{t("encounterChrome.labelNirMrn")}</span> {nir}
          <span style={{ color: "#94a3b8" }}> · </span>
          {ageSex}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            {t("emergencyErClosure.dispositionOutcomeLabel")}
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 14, fontWeight: 600, color: "#1e3a8a" }}>
            {dispositionLabel.trim() || dash}
          </p>
          {showContext ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#475569", lineHeight: 1.45 }}>{contextLine}</p>
          ) : null}
        </div>
        {encounter.createdAt ? (
          <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b" }}>
            {t("emergencyErClosure.arrivalLabel")}{" "}
            {formatEncounterChromeDateTime(encounter.createdAt, language)}
          </p>
        ) : null}
      </div>

      <EmergencyVisitSummaryPanel
        encounterId={encounterId}
        facilityId={facilityId}
        encounter={encounter}
        triageSnapshot={triageSnapshot}
        resultsRefresh={resultsRefresh}
        resultsTabHref={resultsTabHref}
        diagnosticsTabHref={diagnosticsTabHref}
        ivAccessFetchEnabled={canFetchIvAccess}
        proceduresFetchEnabled={canFetchProcedures}
      />

      {open ? (
        <div style={{ marginTop: 2 }}>
          <DispositionReadinessBanner
            encounterId={encounterId}
            facilityId={facilityId}
            refreshKey={`${String((encounter as { updatedAt?: string }).updatedAt ?? "")}-${resultsRefresh}`}
            onReadinessChange={handleDispositionReadiness}
          />
        </div>
      ) : null}

      {open ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            disabled={!patient || !encounter.createdAt}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: patient && encounter.createdAt ? "#fff" : "#f1f5f9",
              color: patient && encounter.createdAt ? "#334155" : "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              cursor: patient && encounter.createdAt ? "pointer" : "not-allowed",
            }}
          >
            {t("emergencyDisposition.printChart")}
          </button>
          <button
            type="button"
            onClick={() => {
              setAckDispositionSafety(false);
              setShowCloseModal(true);
            }}
            disabled={closing}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
              cursor: closing ? "wait" : "pointer",
            }}
          >
            {t("emergencyErClosure.endEncounter")}
          </button>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyErClosure.encounterAlreadyClosed")}</p>
      )}

      {showCloseModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              borderRadius: 14,
              backgroundColor: "#fff",
              padding: "20px 22px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
              {t("emergencyErClosure.modalTitle")}
            </h2>
            <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
              {t("emergencyErClosure.modalBody")}
            </p>
            {dispositionReadiness && !dispositionReadiness.canClose ? (
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 14,
                  fontSize: 13,
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: closing ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={ackDispositionSafety}
                  disabled={closing}
                  onChange={(e) => setAckDispositionSafety(e.target.checked)}
                />
                <span>{t("dispositionReadiness.overrideCheckbox")}</span>
              </label>
            ) : null}
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={closing}
                onClick={() => {
                  setAckDispositionSafety(false);
                  setShowCloseModal(false);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: closing ? "wait" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  closing ||
                  Boolean(dispositionReadiness && !dispositionReadiness.canClose && !ackDispositionSafety)
                }
                onClick={() => void runCloseCheck()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#b91c1c",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: closing ? "wait" : "pointer",
                }}
              >
                {closing ? t("common.loading") : t("emergencyErClosure.modalConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeficiencyModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 81,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              borderRadius: 14,
              backgroundColor: "#fff",
              padding: "20px 22px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#92400e" }}>
              {t("emergencyErClosure.deficiencyTitle")}
            </h2>
            <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
              {t("encounterChrome.modals.documentationDeficiencyLead")}
            </p>
            <ul style={{ margin: "12px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#451a03", lineHeight: 1.45 }}>
              {deficiencies.map((d) => {
                const k = `encounterChrome.modals.documentationDeficiencies.${d.code}`;
                const label = t(k);
                const fallback =
                  label !== k ? label : language === "en" ? d.code.replace(/_/g, " ") : d.labelFr;
                return (
                  <li key={d.code} style={{ marginBottom: 4 }}>
                    {fallback}
                  </li>
                );
              })}
            </ul>
            {dispositionReadiness && !dispositionReadiness.canClose ? (
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 12,
                  fontSize: 13,
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: closing ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={ackDispositionSafety}
                  disabled={closing}
                  onChange={(e) => setAckDispositionSafety(e.target.checked)}
                />
                <span>{t("dispositionReadiness.overrideCheckbox")}</span>
              </label>
            ) : null}
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={closing}
                onClick={() => {
                  setShowDeficiencyModal(false);
                  setDeficiencies([]);
                  setAckDispositionSafety(false);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: closing ? "wait" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  closing ||
                  Boolean(dispositionReadiness && !dispositionReadiness.canClose && !ackDispositionSafety)
                }
                onClick={() => void executeClose(true, ackDispositionSafety)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#c2410c",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: closing ? "wait" : "pointer",
                }}
              >
                {closing ? t("common.loading") : t("emergencyErClosure.closeDespiteDeficiencies")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
