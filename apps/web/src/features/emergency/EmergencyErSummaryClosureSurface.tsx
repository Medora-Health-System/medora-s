"use client";

/**
 * ER-native final review: facility + patient + disposition + visit summary + print + end encounter.
 * Reuses EmergencyVisitSummaryPanel and the same close-check/close API path as the generic encounter page.
 */

import React, { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import type { DispositionSafetyReadinessResponse } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { DispositionReadinessBanner } from "@/components/clinical/DispositionReadinessBanner";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
} from "@/lib/encounterChromeI18n";
import {
  printErPacket,
  type ErPrintDocumentationHistoryEntry,
  type ErPrintReassessmentEntry,
} from "@/features/emergency/erPrintPacket";
import { buildErClinicalTimeline } from "@/features/emergency/erClinicalTimeline";
import {
  edDispositionTouchButtonStyle,
  resolveEdDispositionLayoutMode,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";
import {
  buildProviderDocumentationPrintSection,
  buildVisitSummaryProviderDocumentationBlock,
} from "@/features/emergency/erProviderDocumentationSummary";
import {
  buildErEdSummaryMarEventRows,
  buildErEdSummaryMedicationOrderRows,
} from "@/features/emergency/erEdSummaryMedicationMar";
import { formatDocumentedProcedureClinicalSummary } from "@medora/shared";
import {
  buildEmergencyVisitSummaryModel,
  type ClinicalDocumentationEventApiEntry,
  type NursingReassessmentApiEntry,
} from "@/features/emergency/emergencyVisitSummaryModel";
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
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import type { EdClosureCertificationEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import { EdEncounterCertificationReview } from "@/features/emergency/EdEncounterCertificationReview";
import { EdEncounterBillingReadinessBadge } from "@/features/emergency/EdEncounterBillingReadinessBadge";

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
  medicationMarSummaryEnabled?: boolean;
  summaryReadOnly?: boolean;
  canOpenProcedureDocumentation?: boolean;
  onOpenProcedureDocumentation?: ComponentProps<typeof EmergencyVisitSummaryPanel>["onOpenProcedureDocumentation"];
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
  medicationMarSummaryEnabled = true,
  summaryReadOnly = false,
  canOpenProcedureDocumentation,
  onOpenProcedureDocumentation,
}: EmergencyErSummaryClosureSurfaceProps) {
  const canFetchIvAccess = ivAccessFetchEnabled ?? false;
  const canFetchProcedures = proceduresFetchEnabled ?? false;
  const { t, language } = useI18n();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCertificationReview, setShowCertificationReview] = useState(false);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [deficiencies, setDeficiencies] = useState<Array<{ code: string; labelFr: string }>>([]);
  const [closing, setClosing] = useState(false);
  const [dispositionReadiness, setDispositionReadiness] = useState<DispositionSafetyReadinessResponse | null>(
    null
  );
  const [ackDispositionSafety, setAckDispositionSafety] = useState(false);
  const [layoutMode, setLayoutMode] = useState<EdDispositionLayoutMode>("desktopSplit");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveEdDispositionLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  const handleDispositionReadiness = useCallback((r: DispositionSafetyReadinessResponse | null) => {
    setDispositionReadiness(r);
  }, []);

  const closureCertification = useMemo(
    () =>
      buildEdClosedEncounterCertificationFromEncounter(encounter as EdClosureCertificationEncounter, {
        dispositionReadiness,
      }),
    [encounter, dispositionReadiness]
  );

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

  const handlePrint = useCallback(async () => {
    const p = encounter.patient;
    if (!p || !encounter.createdAt) return;
    /**
     * Pre-fetch the append-only nursing reassessment history so the printed medical record
     * reflects the same per-clinician columns the bedside grid and Summary tab show. Failure
     * is non-fatal: we proceed to print without the history section, preserving the original
     * print behavior. This stays clinician-only (RN/PROVIDER/ADMIN role gate at the API).
     */
    let nursingReassessmentEntries: ErPrintReassessmentEntry[] | null = null;
    let providerMseEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let handoffEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let dischargeSummaryEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let admissionSummaryEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let dispositionSupplementEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let triageAssessmentEntries: ErPrintDocumentationHistoryEntry[] | null = null;
    let nursingReassessmentApiEntries: NursingReassessmentApiEntry[] | null = null;
    try {
      const data = await apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`, {
        facilityId,
      });
      const entries =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as { entries?: unknown }).entries
          : null;
      if (Array.isArray(entries) && entries.length > 0) {
        nursingReassessmentApiEntries = entries as NursingReassessmentApiEntry[];
        /**
         * Reuse the Summary model's history builder so the print output uses the SAME
         * structured-preview lines and narrative excerpt as the on-screen Summary card. This
         * keeps the printed record visually consistent with what the user sees.
         */
        const model = buildEmergencyVisitSummaryModel(
          encounter,
          triageSnapshot,
          null,
          language,
          entries as NursingReassessmentApiEntry[]
        );
        if (model.nursingReassessmentHistory.length > 0) {
          nursingReassessmentEntries = model.nursingReassessmentHistory.map((e) => ({
            documentedAt: e.documentedAt,
            savedAt: e.savedAt,
            performerDisplayName: e.performerDisplayName,
            performerInitials: e.performerInitials,
            performerRoleTitle: e.performerRoleTitle,
            structuredLines: e.structuredLines,
            narrativeExcerpt: e.narrativeExcerpt,
          }));
        }
      }
    } catch {
      /* Non-fatal: print proceeds without the history section. */
    }
    try {
      const data = await apiFetch(
        `/encounters/${encounterId}/clinical-documentation-events?types=PROVIDER_MSE_SAVED,HANDOFF_NURSING,DISCHARGE_SUMMARY_SAVED,ADMISSION_SUMMARY_SAVED,DISPOSITION_SUPPLEMENT_SAVED,TRIAGE_ASSESSMENT_SAVED`,
        { facilityId }
      );
      const entries =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as { entries?: unknown }).entries
          : null;
      if (Array.isArray(entries) && entries.length > 0) {
        const model = buildEmergencyVisitSummaryModel(
          encounter,
          triageSnapshot,
          null,
          language,
          null,
          entries as ClinicalDocumentationEventApiEntry[]
        );
        const toPrintEntries = (history: typeof model.providerMseHistory): ErPrintDocumentationHistoryEntry[] =>
          history.map((e) => ({
            documentedAt: e.documentedAt,
            savedAt: e.savedAt,
            performerDisplayName: e.performerDisplayName,
            performerInitials: e.performerInitials,
            performerRoleTitle: e.performerRoleTitle,
            structuredLines: e.structuredLines,
            narrativeExcerpt: e.narrativeExcerpt,
          }));
        if (model.providerMseHistory.length > 0) {
          providerMseEntries = toPrintEntries(model.providerMseHistory);
        }
        if (model.handoffHistory.length > 0) {
          handoffEntries = toPrintEntries(model.handoffHistory);
        }
        if (model.dischargeSummaryHistory.length > 0) {
          dischargeSummaryEntries = toPrintEntries(model.dischargeSummaryHistory);
        }
        if (model.admissionSummaryHistory.length > 0) {
          admissionSummaryEntries = toPrintEntries(model.admissionSummaryHistory);
        }
        if (model.dispositionSupplementHistory.length > 0) {
          dispositionSupplementEntries = toPrintEntries(model.dispositionSupplementHistory);
        }
        if (model.triageAssessmentHistory.length > 0) {
          triageAssessmentEntries = toPrintEntries(model.triageAssessmentHistory);
        }
      }
    } catch {
      /* Non-fatal: print proceeds without documentation history sections. */
    }
    let medicationOrderRows = null;
    let marEventRows = null;
    let procedureSummaries: string[] | null = null;
    let ordersRaw: unknown[] = [];
    let adminsRaw: unknown[] = [];
    let procedureEntriesRaw: unknown[] = [];
    try {
      const [ordersFetched, adminsFetched, proceduresRaw] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/procedures`, { facilityId }),
      ]);
      ordersRaw = Array.isArray(ordersFetched) ? ordersFetched : [];
      adminsRaw = Array.isArray(adminsFetched) ? adminsFetched : [];
      medicationOrderRows = buildErEdSummaryMedicationOrderRows({ orders: ordersRaw, language, t });
      marEventRows = buildErEdSummaryMarEventRows({ admins: adminsRaw, language, t });
      const procedureEntries =
        proceduresRaw && typeof proceduresRaw === "object" && !Array.isArray(proceduresRaw)
          ? (proceduresRaw as { entries?: unknown }).entries
          : null;
      procedureEntriesRaw = Array.isArray(procedureEntries) ? procedureEntries : [];
      if (procedureEntriesRaw.length > 0) {
        procedureSummaries = procedureEntriesRaw
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const row = entry as Record<string, unknown>;
            const payload = row.payload && typeof row.payload === "object" ? row.payload : row;
            const documentedBy =
              typeof row.documentedByDisplayName === "string" ? row.documentedByDisplayName : null;
            const documentedAt =
              typeof row.documentedAt === "string"
                ? row.documentedAt
                : typeof row.createdAt === "string"
                  ? row.createdAt
                  : "";
            return formatDocumentedProcedureClinicalSummary({
              payloadJson: payload,
              documentedAtIso: documentedAt,
              documentedByDisplayName: documentedBy,
              locale: language === "en" ? "en" : "fr",
            });
          })
          .filter((summary): summary is string => Boolean(summary?.trim()));
      }
    } catch {
      /* Non-fatal: print proceeds without medication/procedure sections. */
    }
    const printSummaryModel = buildEmergencyVisitSummaryModel(
      encounter,
      triageSnapshot,
      null,
      language,
      nursingReassessmentApiEntries,
      null
    );
    const clinicalTimeline = buildErClinicalTimeline({
      locale: language,
      t,
      encounter,
      triageSnapshot,
      nursingReassessmentHistory: printSummaryModel.nursingReassessmentHistory,
      orders: ordersRaw,
      marAdmins: adminsRaw,
      procedureEntries: procedureEntriesRaw,
    });
    const providerDocBlock = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: encounter.nursingAssessment,
      locale: language,
      providerDocumentationStatus: encounter.providerDocumentationStatus,
      providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
      providerDocumentationSignedByDisplayFr: encounter.providerDocumentationSignedByDisplayFr,
      providerAddenda: encounter.providerAddenda,
    });
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
      nursingReassessmentEntries,
      providerMseEntries,
      handoffEntries,
      dischargeSummaryEntries,
      admissionSummaryEntries,
      dispositionSupplementEntries,
      triageAssessmentEntries,
      medicationOrderRows,
      marEventRows,
      procedureSummaries,
      providerDocumentationSection: providerDocBlock
        ? buildProviderDocumentationPrintSection(providerDocBlock, language)
        : null,
      clinicalTimelineEntries: clinicalTimeline.all,
      clinicalDocumentationEntries: encounter.clinicalDocumentationEntries ?? null,
    });
  }, [encounter, encounterId, facilityId, facilityName, language, triageSnapshot, t]);

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
        setShowCertificationReview(false);
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
        setShowCertificationReview(false);
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
        medicationMarSummaryEnabled
        summaryReadOnly={summaryReadOnly}
        canOpenProcedureDocumentation={canOpenProcedureDocumentation ?? false}
        onOpenProcedureDocumentation={onOpenProcedureDocumentation}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "0 4px" }}>
            <EdEncounterBillingReadinessBadge certification={closureCertification} />
          </div>
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
              onClick={() => {
                void handlePrint();
              }}
              disabled={!patient || !encounter.createdAt}
              style={edDispositionTouchButtonStyle(
                {
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: patient && encounter.createdAt ? "#fff" : "#f1f5f9",
                  color: patient && encounter.createdAt ? "#334155" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: patient && encounter.createdAt ? "pointer" : "not-allowed",
                  flex: layoutMode === "mobileStacked" ? "1 1 100%" : undefined,
                },
                layoutMode
              )}
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
              style={edDispositionTouchButtonStyle(
                {
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: closing ? "wait" : "pointer",
                  flex: layoutMode === "mobileStacked" ? "1 1 100%" : undefined,
                },
                layoutMode
              )}
            >
              {t("emergencyErClosure.endEncounter")}
            </button>
          </div>
          {/**
           * Phase 4 — UX boundary clarification: this print emits the disposition-focused ER
           * packet (current `printErPacket`/`getErPrintPacketHtml`). It is NOT a full chart
           * export. The hint disambiguates ER packet vs. patient record vs. discharge summary
           * for clinicians without changing the underlying print payload.
           */}
          <p style={{ margin: "0 4px", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
            {t("emergencyDisposition.printErPacketHint")}
          </p>
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
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={closing}
                onClick={() => {
                  setAckDispositionSafety(false);
                  setShowCloseModal(false);
                }}
                style={edDispositionTouchButtonStyle(
                  {
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#fff",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: closing ? "wait" : "pointer",
                  },
                  layoutMode
                )}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={() => {
                  setShowCloseModal(false);
                  setShowCertificationReview(true);
                }}
                style={edDispositionTouchButtonStyle(
                  {
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: "#b91c1c",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: closing ? "wait" : "pointer",
                  },
                  layoutMode
                )}
              >
                {closing ? t("common.loading") : t("emergencyErClosure.modalConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCertificationReview ? (
        <EdEncounterCertificationReview
          certification={closureCertification}
          dispositionReadiness={dispositionReadiness}
          acknowledgeDispositionSafety={ackDispositionSafety}
          onAcknowledgeDispositionSafetyChange={setAckDispositionSafety}
          closing={closing}
          layoutMode={layoutMode}
          onCancel={() => {
            setShowCertificationReview(false);
            setAckDispositionSafety(false);
          }}
          onContinueClose={() => {
            setShowCertificationReview(false);
            void runCloseCheck();
          }}
        />
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
