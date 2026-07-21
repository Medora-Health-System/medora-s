"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, asApiObject, parseApiResponse } from "@/lib/apiClient";
import { MEDORA_PATIENT_VITALS_UPDATED, hasVitalsJson, type PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { invalidateGetRequestDedupeForPath } from "@/lib/getRequestDedupe";
import { useObservationMarEncounterSummary } from "@/hooks/useObservationMarEncounterSummary";
import {
  EncounterClinicalDataProvider,
  useEncounterClinicalData,
} from "@/hooks/EncounterClinicalDataProvider";
import {
  EncounterClinicalDataRefreshRegistrar,
  EncounterQuickOrdersBridge,
  EncounterClinicalDataRefreshKeyBridge,
  EncounterPassQueuePrefetchBridge,
} from "@/hooks/encounterClinicalDataBridge";
import type { EncounterClinicalRefreshScope } from "@/hooks/encounterClinicalDataTypes";
import { perfClinicalDataLog } from "@/hooks/encounterClinicalDataPerf";
import { usePathwayTimers } from "@/features/pathways/hooks/usePathwayTimers";
import { PathwayMilestoneRow } from "@/features/pathways/components/PathwayMilestoneRow";
import { PathwaySessionSummaryBar } from "@/features/pathways/components/PathwaySessionSummary";
import {
  COMMON_VISIT_REASONS,
} from "@/constants/clinicalTemplates";
import { CancelOrderModal, CreateOrderModal, type CancelOrderConfirmPayload } from "@/components/orders";
import { ProviderMedicationOrderGovernanceSection } from "@/components/orders/ProviderMedicationOrderGovernanceSection";
import {
  auditMedicationOrderGovernancePermissions,
  shouldRenderMedicationGovernance,
} from "@/lib/medicationOrderGovernancePermissions";
import { CareProcedureClinicalTimeModal } from "@/components/orders/CareProcedureClinicalTimeModal";
import {
  canAdjustCareProcedureClinicalTime,
  canShowCareProcedureClinicalTimeClock,
  resolveCareProcedureDisplayTimes,
} from "@/features/orders/careProcedureClinicalTimeDisplay";
import { EmergencyProcedureLauncherModal } from "@/features/emergency/EmergencyProcedureLauncherModal";
import type { ErProcedureLauncherStep } from "@/features/emergency/erProcedureLauncherCatalog";
import { ProcedureOrderDocumentationLinkage } from "@/components/clinical/ProcedureOrderDocumentationLinkage";
import {
  documentationTemplateIdToLauncherStep,
  resolveProcedureDocumentationLinkage,
  type EnterpriseProcedureDocumentationTemplateId,
} from "@medora/shared";
import { parseEncounterDocumentedProcedureTypes } from "@/lib/procedureOrderDocumentationLinkageUi";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { printEncounterChartLivePreview } from "@/components/encounters/EncounterChartLivePreview";
import { getOrderItemChartLabel, isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import {
  medicationLineClinicallyExecuted,
  medicationOrderStatusKeyForEncounterTab,
  orderAllowsWholeCancelOnline,
} from "@/lib/orderEncounterUi";
import {
  formatEncounterChromeDate,
  formatEncounterChromeDateTime,
  formatLatestVitalsLine,
  tEncounterStatus,
  tEncounterType,
  tMedicationFulfillmentIntent,
  tOrderPriority,
  tPathwayStatus,
  tPathwayType,
  tPatientSex,
} from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError, USER_FACING_ENCOUNTER_NOT_FOUND_FR } from "@/lib/userFacingError";
import type { DispositionSafetyReadinessResponse } from "@medora/shared";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterProviderAssigned } from "@/lib/encounterDisplay";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { EncounterProcedureCapturePanel } from "@/components/encounters/EncounterProcedureCapturePanel";
import { EncounterOperationalPanel } from "@/components/encounters/EncounterOperationalPanel";
import {
  EncounterGovernedRoomChip,
  EncounterGovernedRoomInline,
} from "@/components/encounters/EncounterGovernedRoomChip";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import {
  applyEncounterRoomAssignmentUpdate,
  dispatchEncounterRoomAssignmentRefresh,
} from "@/lib/applyEncounterRoomAssignmentUpdate";
import { canAssignEncounterRoom } from "@/lib/governedRoomDisplay";
import { ObservationOrderTemplateModal } from "@/components/encounters/ObservationOrderTemplateModal";
import { ObservationEncounterDisplayPill } from "@/components/encounters/ObservationEncounterDisplayPill";
import { BillingClassificationBadgeReadOnly } from "@/components/encounters/BillingClassificationBadgeReadOnly";
import { EncounterBillingExportReadinessHint } from "@/components/billing/EncounterBillingExportReadinessHint";
import { BillingClassificationHistoryPanel } from "@/components/encounters/BillingClassificationHistoryPanel";
import { ObservationContinueObservationQuickModal } from "@/components/encounters/ObservationContinueObservationQuickModal";
import { ObservationReassessmentModal } from "@/components/encounters/ObservationReassessmentModal";
import { EnterpriseEncounterCommandTimeline } from "@/components/encounters/EnterpriseEncounterCommandTimeline";
import { ObservationTemplateOrdersPanel } from "@/components/encounters/ObservationTemplateOrdersPanel";
import { ordersExcludingObservationTemplate } from "@/lib/observationTemplateOrderRows";
import { dispatchObservationEncounterRefresh } from "@/lib/observationEncounterRefresh";
import { DispositionReadinessBanner } from "@/components/clinical/DispositionReadinessBanner";
import { NursingAssessmentTab } from "@/components/encounters/NursingAssessmentTab";
import { ErHandoffV1NursingSection } from "@/components/encounters/ErHandoffV1Panel";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { mergeVitalsJsonForSave } from "@/features/emergency/emergencyTriageVitalsMerge";
import { triagePreviewSliceFromTriageGet } from "@/features/emergency/emergencyTriageDocPreview";
import { erTriageV1FormFromVitalsJson } from "@/features/emergency/medoraErTriageV1";
import { isTriageStaleConflictError } from "@/features/emergency/triageConcurrency";
import { flipHeightInputMode } from "@/lib/vitalsEntryFlip";
import {
  collectObservationTemplateItemIdsFromOrderItems,
  computeObservationOperationalSnapshot,
  isObservationOrderTemplateProtocol,
  deriveObservationEncounterDisplayStatus,
  deriveObservationTemplateCareOpsIndicators,
  deriveObservationTemplateLineLifecyclePhase,
  isObservationShortStayEncounter,
  observationTemplateItemIdFromPersistedManualLabel,
  mergeObservationTrackboardOpsInput,
  OBSERVATION_ORDER_TEMPLATE_ITEMS,
  temperatureHintPairCelsiusFahrenheit,
  weightHintPairKgPounds,
} from "@medora/shared";
import {
  READINESS_LABEL_KEY,
  ObservationWorkflowActiveHeaderPill,
  ObservationWorkflowEncounterChrome,
  ObservationWorkflowHeaderStatusPill,
} from "@/components/encounters/ObservationWorkflowEncounterChrome";
import { ObservationDocumentationSummaryPanel } from "@/components/encounters/ObservationDocumentationSummaryPanel";
import type { HospitalisationBoardTrackboardOps } from "@/lib/hospitalisationBoardTypes";
import {
  diagnosisDisplayFr,
  nursingAssessmentDisplayLines,
  nursingAssessmentSignatureForLocale,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  parsePhysicianEvalV1ForChart,
} from "@/components/patient-chart/patientChartHelpers";
import {
  admissionFormToPayload,
  CARE_LEVEL_OPTIONS_FR,
  emptyAdmissionForm,
  formatPhysicianName,
  hydrateAdmissionFormFromEncounterJson,
  shouldOfferObservationOrderTemplateCareLevel,
  type AdmissionFormState,
} from "@/lib/encounterAdmission";
import {
  DISCHARGE_MODE_OPTIONS_FR,
  dischargeModeFrToDischargeStatus,
  emptyDischargeForm,
  hydrateDischargeFormFromEncounterJson,
  mergeDischargeForSave,
  type DischargeFormState,
} from "@/lib/encounterDischarge";
import {
  emptyErDispositionSupplementForm,
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
  mergeErDispositionV1IntoNursingAssessment,
  mergeErDischargeForEncounterPatch,
  outcomeUiToDischargeMode,
  type ErDispositionOutcomeUi,
  type ErDispositionSupplementForm,
} from "@/features/emergency/emergencyDispositionV1";
import {
  applyEmtalaV1ComplementToNursingAssessment,
  emtalaDispositionComplementFromNursing,
} from "@/features/emergency/erEmtalaV1";
import {
  appendQuickNoteToField,
  OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES,
  OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES,
} from "@/features/observation/observationDischargeQuickNotes";
import { buildObservationSummaryDraft } from "@/features/observation/observationSummaryDraft";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import { EncounterResultsTab } from "@/components/encounters/EncounterResultsTab";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";
import {
  buildClinicalDraftKey,
  clinicalDraftPayloadSignature,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";
import {
  readEncounterUiState,
  writeEncounterUiState,
} from "@/lib/encounterUiState";
import { fetchEncounterAuditTimeline, type ChartAuditTimelineItem } from "@/lib/chartApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { isEncounterLocked } from "@/lib/encounterLock";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { ProviderDocumentationWorkspace } from "@/components/encounters/ProviderDocumentationWorkspace";
import {
  buildProviderDocumentationMetadata,
  buildProviderDocumentationSavePayload,
  emptyProviderDocumentationWorkspaceState,
  hydrateProviderDocumentationWorkspaceState,
  readProviderDocumentationWorkspaceMetadata,
  type ProviderDocumentationTemplateId,
  type ProviderDocumentationWorkspaceState,
} from "@/lib/providerDocumentationModel";

/** Presentation-only: admission / discharge / close / documentation-deficiency modals on this page. */
function encounterWorkflowModalOverlay(zIndex: number): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    boxSizing: "border-box",
  };
}

function encounterWorkflowModalPanel(maxWidth: number): React.CSSProperties {
  return {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
    maxWidth,
    width: "100%",
    padding: "22px 24px",
    boxSizing: "border-box",
  };
}

function encounterWorkflowModalField(editable: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: editable ? "#fff" : "#f8fafc",
    cursor: editable ? "text" : "not-allowed",
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };
}

function encounterWorkflowModalBtnSecondary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    color: "#334155",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };
}

const ENCOUNTER_TAB_IDS = new Set([
  "summary",
  "triage",
  "nursing",
  "clinic",
  "diagnostics",
  "orders",
  "mar",
  "results",
  "observation_summary",
  "clinical_timeline",
  "command_timeline",
  "notes",
  "pathways",
  "history",
]);

/** Discharge packet modal field rows (key, editor kind, textarea rows). */
const OBSERVATION_DISCHARGE_FIELD_ROWS = [
  ["disposition", "medical", 2],
  ["exitCondition", "nursing", 2],
  ["dischargeInstructions", "medical", 3],
  ["medicationsGiven", "medical", 3],
  ["followUp", "medical", 2],
  ["returnIfWorse", "nursing", 2],
  ["patientDestination", "nursing", 2],
] as const;

/** Button label for documentation-deficiency “go to” actions (maps known API deficiency codes only). */
function documentationDeficiencyNavigateButtonLabel(
  code: string,
  tabs: { id: string; label: string }[],
  tr: (key: string) => string
): string | null {
  switch (code) {
    case "CHIEF_COMPLAINT":
    case "PROVIDER_DOCUMENTATION": {
      const lab = tabs.find((x) => x.id === "clinic")?.label;
      if (!lab) return null;
      return tr("encounterChrome.modals.goToTab").replace("{tab}", lab);
    }
    case "NURSING_ASSESSMENT": {
      const lab = tabs.find((x) => x.id === "nursing")?.label;
      if (!lab) return null;
      return tr("encounterChrome.modals.goToTab").replace("{tab}", lab);
    }
    case "DISCHARGE_SUMMARY":
      return tr("encounterChrome.modals.openDischargeSummary");
    case "ADMISSION_SUMMARY":
      return tr("encounterChrome.modals.openAdmissionPacket");
    default:
      return null;
  }
}

const DISCHARGE_DOCUMENTATION_DRAFT_VERSION = "discharge-documentation-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type DischargeDocumentationDraftPayload = {
  dischargeForm: DischargeFormState;
  obsDischargeOutcomeUi: ErDispositionOutcomeUi;
  obsDispositionSupplement: ErDispositionSupplementForm;
};

function dischargeDocumentationDraftSignature(payload: DischargeDocumentationDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

function dischargeDocumentationDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<DischargeDocumentationDraftPayload>;
  const form = p.dischargeForm;
  const supplement = p.obsDispositionSupplement;
  const formHasContent = Boolean(
    form &&
      Object.values(form).some((value) =>
        typeof value === "boolean" ? value : typeof value === "string" ? value.trim().length > 0 : false
      )
  );
  const supplementHasContent = Boolean(
    supplement &&
      Object.values(supplement).some((value) => (typeof value === "string" ? value.trim().length > 0 : Boolean(value)))
  );
  return formHasContent || supplementHasContent;
}

const ENCOUNTER_PAGE_SHELL: React.CSSProperties = {
  minHeight: "calc(100vh - 48px)",
  backgroundColor: "#f8fafc",
  padding: "24px 16px 32px",
  boxSizing: "border-box",
};

export default function EncounterDetailPage() {
  const params = useParams();
  const encounterId = params.id as string;
  const session = useFacilityAndRoles();
  const { facilityId, roles, ready: rolesReady } = session;
  const { t } = useI18n();

  const canFetchEncounterOrders =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY");
  const canFetchMarTab = roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

  if (!facilityId || !encounterId) {
    return (
      <div style={{ ...ENCOUNTER_PAGE_SHELL, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>{t("common.loading")}</div>
      </div>
    );
  }

  if (!rolesReady) {
    return (
      <div style={{ ...ENCOUNTER_PAGE_SHELL, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <EncounterClinicalDataProvider
      encounterId={encounterId}
      facilityId={facilityId}
      canFetchOrders={canFetchEncounterOrders}
      canFetchMarData={canFetchMarTab}
      prefetchPassQueue={false}
      pendingSyncFirstName={t("marTab.pendingSyncFirstName")}
      pendingSyncLastName={t("marTab.pendingSyncLastName")}
    >
      <EncounterDetailPageInner session={session} />
    </EncounterClinicalDataProvider>
  );
}

function EncounterDetailPageInner({ session }: { session: ReturnType<typeof useFacilityAndRoles> }) {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useI18n();
  const encounterId = params.id as string;
  const { facilityId, userId, canPrescribe, roles, ready: rolesReady, facilities } = session;
  const encounterDetailPath = `/app/encounters/${encounterId}`;
  const [encounter, setEncounter] = useState<any>(null);
  const [encounterFetchError, setEncounterFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [tabBootstrapped, setTabBootstrapped] = useState(false);
  const [quickTriage, setQuickTriage] = useState<any>(null);
  const [quickOrders, setQuickOrders] = useState<any[]>([]);
  const [quickDiagnosisCount, setQuickDiagnosisCount] = useState<number | null>(null);
  /** Premier diagnostic de la consultation (liste déjà chargée) — pour impression sortie sans fetch supplémentaire. */
  const [quickPrimaryDiagnosis, setQuickPrimaryDiagnosis] = useState<string | null>(null);
  const [quickContextLoading, setQuickContextLoading] = useState(false);
  /** Signes vitaux / ordres / diagnostics : échec partiel sans quitter la route. */
  const [quickContextNotice, setQuickContextNotice] = useState<string | null>(null);
  const [medicationModalRequestTick, setMedicationModalRequestTick] = useState(0);
  const [careModalRequestTick, setCareModalRequestTick] = useState(0);
  const [careModalPresetLabel, setCareModalPresetLabel] = useState<string | null>(null);
  const [encounterResultsRefresh, setEncounterResultsRefresh] = useState(0);
  const [auditTimelineItems, setAuditTimelineItems] = useState<ChartAuditTimelineItem[] | null>(null);
  const [auditTimelineLoading, setAuditTimelineLoading] = useState(false);
  const [auditTimelineError, setAuditTimelineError] = useState<string | null>(null);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showDocumentationDeficiencyModal, setShowDocumentationDeficiencyModal] = useState(false);
  const [documentationDeficiencies, setDocumentationDeficiencies] = useState<
    Array<{ code: string; labelFr: string }>
  >([]);
  const [closingEncounter, setClosingEncounter] = useState(false);
  /** Clôture mise en file hors ligne — la consultation reste ouverte côté serveur jusqu’à sync. */
  const [queuedClosePendingSync, setQueuedClosePendingSync] = useState(false);
  /** Dossier de sortie PATCH mis en file — données pas encore confirmées côté serveur. */
  const [queuedDischargeSaveNotice, setQueuedDischargeSaveNotice] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  /** Objet fusionné enregistré avant la modale de confirmation finale (ou null si clôture sans étape dossier). */
  const [pendingDischarge, setPendingDischarge] = useState<Record<string, unknown> | null>(null);
  const [dispositionReadiness, setDispositionReadiness] = useState<DispositionSafetyReadinessResponse | null>(null);
  const [ackDispositionSafety, setAckDispositionSafety] = useState(false);
  const [dischargeForm, setDischargeForm] = useState<DischargeFormState>(() => emptyDischargeForm());
  const [obsDischargeOutcomeUi, setObsDischargeOutcomeUi] = useState<ErDispositionOutcomeUi>("HOME");
  const [obsDispositionSupplement, setObsDispositionSupplement] = useState<ErDispositionSupplementForm>(() =>
    emptyErDispositionSupplementForm()
  );
  const [dischargeDraftRestoredAt, setDischargeDraftRestoredAt] = useState<string | null>(null);
  const [dischargeDraftSavedLocallyAt, setDischargeDraftSavedLocallyAt] = useState<string | null>(null);
  const dischargeServerSignatureRef = useRef<string>("");
  const dischargeRestoringRef = useRef(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [showObservationOrderTemplateModal, setShowObservationOrderTemplateModal] = useState(false);
  const [clinicalTimelineRefresh, setClinicalTimelineRefresh] = useState(0);
  const [observationReassessmentModalRole, setObservationReassessmentModalRole] = useState<null | "PROVIDER" | "RN">(
    null
  );
  const [showContinueObservationQuickModal, setShowContinueObservationQuickModal] = useState(false);
  const [showRoomAssignmentModal, setShowRoomAssignmentModal] = useState(false);
  /** Distingue la 1re ouverture (libellé dédié) des rechargements (ex. après clôture). */
  const encounterHasLoadedOnceRef = useRef(false);
  const quickContextLoadedKeyRef = useRef<string | null>(null);
  const clinicalDataRefreshRef = useRef<
    ((
      scope?: EncounterClinicalRefreshScope,
      options?: { reason?: string; force?: boolean }
    ) => Promise<void>) | null
  >(null);
  const clinicalData = useEncounterClinicalData();

  /** Aligné sur GET /encounters/:id — lecture seule pour LAB/RADIOLOGY (workflow technicien). */
  const canViewEncounterDetail =
    roles.includes("FRONT_DESK") ||
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY");

  const canViewBillingExportReadiness =
    roles.includes("BILLING") ||
    roles.includes("ADMIN") ||
    roles.includes("PROVIDER") ||
    roles.includes("FRONT_DESK");

  /**
   * Lab/Radiology techniciens : accès dossier en lecture seule. Aucun écrit clinique
   * (triage, soins, MSE, sortie/clôture, MAR, prescription) n'est exposé pour ces rôles.
   */
  const isReadOnlyTechnicianViewer =
    (roles.includes("LAB") || roles.includes("RADIOLOGY")) &&
    !roles.includes("RN") &&
    !roles.includes("PROVIDER") &&
    !roles.includes("ADMIN");

  const canFetchEncounterTriage =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  /** Aligné sur GET /encounters/:encounterId/orders (lecture ordres). */
  const canFetchEncounterOrders =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY");
  /** Aligné sur POST /orders/:id/result/acknowledge (RN, PROVIDER, ADMIN). LAB/RADIOLOGY exclus. */
  const canAcknowledgeResults =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canFetchPatientDiagnosesList = canFetchEncounterTriage;
  /** Matches POST /encounters/:id/diagnoses roles (RN, provider, admin). */
  const canDocumentEncounterDiagnoses =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  /** Matches POST /encounters/:id/procedure-capture (RN, provider, admin, billing). */
  const canCaptureStructuredProcedures =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING");
  const canFetchMarTab =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canManageEncounterClosure =
    roles.includes("PROVIDER") || roles.includes("ADMIN") || roles.includes("RN");

  const canEditNursingDischarge = roles.includes("RN") || roles.includes("ADMIN");
  const canEditMedicalDischarge = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const showNursingTab =
    roles.includes("RN") || roles.includes("ADMIN") || roles.includes("PROVIDER");

  useEffect(() => {
    setTabBootstrapped(false);
    encounterHasLoadedOnceRef.current = false;
    setQueuedDischargeSaveNotice(false);
  }, [encounterId]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!isAppPathAllowedForRoles(encounterDetailPath, roles)) {
      router.replace(getLandingRouteForRoles(roles));
      return;
    }
    if (!canViewEncounterDetail) {
      router.replace(getLandingRouteForRoles(roles));
    }
  }, [rolesReady, encounterDetailPath, roles, router, canViewEncounterDetail]);

  useEffect(() => {
    if (!showCloseConfirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closingEncounter) setShowCloseConfirmModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCloseConfirmModal, closingEncounter]);

  useEffect(() => {
    if (!showDocumentationDeficiencyModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closingEncounter) {
        setShowDocumentationDeficiencyModal(false);
        setDocumentationDeficiencies([]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDocumentationDeficiencyModal, closingEncounter]);

  useEffect(() => {
    if (encounter?.status === "CLOSED") setQueuedClosePendingSync(false);
  }, [encounter?.status]);

  useEffect(() => {
    if (!queuedDischargeSaveNotice || !pendingDischarge) return;
    const parsed = parseDischargeSummaryForChart(encounter?.dischargeSummaryJson);
    if (!parsed) return;
    const matches = Object.entries(pendingDischarge).every(([k, v]) => {
      const parsedV = (parsed as Record<string, unknown>)[k];
      if (typeof v === "boolean") return parsedV === v;
      const sv = typeof parsedV === "string" ? parsedV.trim() : "";
      return sv === String(v).trim();
    });
    if (matches) setQueuedDischargeSaveNotice(false);
  }, [encounter?.dischargeSummaryJson, pendingDischarge, queuedDischargeSaveNotice]);

  useEffect(() => {
    if (!showDischargeModal || !encounter) return;
    const base = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
    const obsWorkflow = Boolean(
      isObservationShortStayEncounter({
        type: encounter.type,
        status: encounter.status,
        admittedAt: encounter.admittedAt,
        admissionSummaryJson: encounter.admissionSummaryJson,
      })
    );
    if (obsWorkflow) {
      const sup = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
      const inferred = inferOutcomeUiFromForms(base.dischargeMode, sup);
      const mode = base.dischargeMode.trim() ? base.dischargeMode : outcomeUiToDischargeMode(inferred);
      const hydratedPayload = {
        dischargeForm: { ...base, dischargeMode: mode },
        obsDischargeOutcomeUi: inferred,
        obsDispositionSupplement: sup,
      };
      dischargeServerSignatureRef.current = dischargeDocumentationDraftSignature(hydratedPayload);
      setObsDispositionSupplement(sup);
      setObsDischargeOutcomeUi(inferred);
      setDischargeForm(hydratedPayload.dischargeForm);
    } else {
      const defaultOutcomeUi: ErDispositionOutcomeUi = "HOME";
      const defaultSupplement = emptyErDispositionSupplementForm();
      dischargeServerSignatureRef.current = dischargeDocumentationDraftSignature({
        dischargeForm: base,
        obsDischargeOutcomeUi: defaultOutcomeUi,
        obsDispositionSupplement: defaultSupplement,
      });
      setDischargeForm(base);
      setObsDischargeOutcomeUi(defaultOutcomeUi);
      setObsDispositionSupplement(defaultSupplement);
    }
  }, [
    showDischargeModal,
    encounter?.id,
    encounter?.type,
    encounter?.status,
    encounter?.admittedAt,
    encounter?.admissionSummaryJson,
    encounter?.dischargeSummaryJson,
    encounter?.nursingAssessment,
  ]);

  const dischargeDraftScope = useMemo<ClinicalDraftScope | null>(() => {
    if (!encounter?.id || !facilityId) return null;
    return {
      workflowType: "DISCHARGE_DOCUMENTATION",
      encounterId: encounter.id,
      patientId: encounter.patient?.id ?? null,
      facilityId,
      userId: userId || UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: DISCHARGE_DOCUMENTATION_DRAFT_VERSION,
    };
  }, [encounter?.id, encounter?.patient?.id, facilityId, userId]);
  const dischargeDraftKey = useMemo(
    () => (dischargeDraftScope ? buildClinicalDraftKey(dischargeDraftScope) : null),
    [dischargeDraftScope]
  );
  const dischargeDraftPayload = useMemo<DischargeDocumentationDraftPayload>(
    () => ({ dischargeForm, obsDischargeOutcomeUi, obsDispositionSupplement }),
    [dischargeForm, obsDischargeOutcomeUi, obsDispositionSupplement]
  );
  const dischargeDraftDirty =
    showDischargeModal &&
    dischargeDocumentationDraftSignature(dischargeDraftPayload) !== dischargeServerSignatureRef.current;
  const dischargeDraftEditable =
    showDischargeModal && Boolean(encounter) && encounter?.status === "OPEN" && !isEncounterLocked(encounter);

  useEffect(() => {
    if (!showDischargeModal || !dischargeDraftKey || !dischargeDraftScope) return;
    setDischargeDraftRestoredAt(null);
    setDischargeDraftSavedLocallyAt(null);

    if (typeof window === "undefined") return;
    const draft = readClinicalDraft<DischargeDocumentationDraftPayload>(window.localStorage, dischargeDraftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: dischargeDraftScope,
      workflowEditable: dischargeDraftEditable,
      encounterStatus: typeof encounter?.status === "string" ? encounter.status : null,
      serverSavedAt: typeof encounter?.updatedAt === "string" ? encounter.updatedAt : null,
      hasPayloadContent: dischargeDocumentationDraftHasContent,
    });
    if (canRestore && draft) {
      dischargeRestoringRef.current = true;
      setDischargeForm(draft.payload.dischargeForm);
      setObsDischargeOutcomeUi(draft.payload.obsDischargeOutcomeUi);
      setObsDispositionSupplement(draft.payload.obsDispositionSupplement);
      setDischargeDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDischargeDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
      queueMicrotask(() => {
        dischargeRestoringRef.current = false;
      });
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, dischargeDraftKey);
    }
    // Restore exactly once each time the discharge modal opens for the current encounter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDischargeModal, dischargeDraftKey]);

  useEffect(() => {
    if (!showDischargeModal || !dischargeDraftKey || !dischargeDraftScope || dischargeRestoringRef.current) return;
    if (!dischargeDraftEditable) return;
    if (!dischargeDraftDirty || !dischargeDocumentationDraftHasContent(dischargeDraftPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, dischargeDraftKey);
      setDischargeDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      dischargeDraftKey,
      createClinicalDraft({
        scope: dischargeDraftScope,
        payload: dischargeDraftPayload,
        savedLocallyAt,
        lastServerSavedAt: typeof encounter?.updatedAt === "string" ? encounter.updatedAt : null,
      })
    );
    setDischargeDraftSavedLocallyAt(savedLocallyAt);
  }, [
    dischargeDraftDirty,
    dischargeDraftEditable,
    dischargeDraftKey,
    dischargeDraftPayload,
    dischargeDraftScope,
    encounter?.updatedAt,
    showDischargeModal,
  ]);

  useClinicalBeforeUnloadWarning({
    dirty: dischargeDraftDirty && Boolean(dischargeDraftSavedLocallyAt),
    workflowEditable: dischargeDraftEditable,
  });

  useEffect(() => {
    if (!showAdmissionModal || !encounter) return;
    const def = formatPhysicianName(encounter.physicianAssigned);
    setAdmissionForm(hydrateAdmissionFormFromEncounterJson(encounter.admissionSummaryJson, def));
  }, [showAdmissionModal, encounter?.id, encounter?.physicianAssigned]);

  useEffect(() => {
    if (!encounterId || !facilityId || !rolesReady) return;
    if (!canViewEncounterDetail) {
      setEncounter(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setEncounterFetchError(null);
    (async () => {
      const cacheKey = `encounter:${facilityId}:${encounterId}`;
      try {
        const data = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        const enc = asApiObject(data);
        if (!cancelled) {
          setEncounter(enc);
          if (enc) encounterHasLoadedOnceRef.current = true;
        }
        if (enc) {
          void setCachedRecord("encounter_summaries", cacheKey, enc, {
            facilityId,
            encounterId,
            patientId: (enc as { patient?: { id?: string } }).patient?.id ?? undefined,
          });
        }
      } catch (error) {
        console.error("Failed to load encounter:", error);
        if (process.env.NODE_ENV === "development") {
          console.warn("[encounterDetail] échec chargement consultation", { encounterId, facilityId, error });
        }
        const msg = normalizeUserFacingError(error instanceof Error ? error.message : null, language);
        if (!cancelled) setEncounterFetchError(msg || t("encounterChrome.errLoadEncounter"));
        const cached = await getCachedRecord<any>("encounter_summaries", cacheKey);
        if (!cancelled) {
          setEncounter(cached?.data ?? null);
          if (cached?.data) encounterHasLoadedOnceRef.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, rolesReady, canViewEncounterDetail, t]);

  useEffect(() => {
    if (!encounter || !facilityId || !rolesReady || tabBootstrapped) return;
    const tabParam =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tabParam && ENCOUNTER_TAB_IDS.has(tabParam)) {
      setActiveTab(tabParam);
    } else if (typeof window !== "undefined") {
      const persisted = readEncounterUiState(window.sessionStorage, encounterId);
      if (persisted?.activeTab && ENCOUNTER_TAB_IDS.has(persisted.activeTab)) {
        setActiveTab(persisted.activeTab);
      } else if (roles.includes("PROVIDER") || roles.includes("ADMIN")) {
        setActiveTab("clinic");
      } else if (roles.includes("RN")) {
        setActiveTab("triage");
      }
      if (persisted?.scrollY != null && !tabParam) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: persisted.scrollY, behavior: "auto" });
        });
      }
    } else if (roles.includes("PROVIDER") || roles.includes("ADMIN")) {
      setActiveTab("clinic");
    } else if (roles.includes("RN")) {
      setActiveTab("triage");
    }
    setTabBootstrapped(true);
  }, [encounter, encounterId, facilityId, rolesReady, roles, tabBootstrapped]);

  useEffect(() => {
    if (!tabBootstrapped || !encounterId || typeof window === "undefined") return;
    writeEncounterUiState(window.sessionStorage, encounterId, { activeTab });
  }, [activeTab, encounterId, tabBootstrapped]);

  useEffect(() => {
    if (!tabBootstrapped || !encounterId || typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        writeEncounterUiState(window.sessionStorage, encounterId, { scrollY: window.scrollY });
      }, 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [encounterId, tabBootstrapped]);

  useEffect(() => {
    if (activeTab !== "history" || !encounterId || !facilityId) return;
    let cancelled = false;
    (async () => {
      setAuditTimelineLoading(true);
      setAuditTimelineError(null);
      try {
        const rows = await fetchEncounterAuditTimeline(facilityId, encounterId);
        if (!cancelled) setAuditTimelineItems(rows);
      } catch (e) {
        if (!cancelled) {
          setAuditTimelineError(
            normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("encounterChrome.errAuditTimelineLoad")
          );
          setAuditTimelineItems(null);
        }
      } finally {
        if (!cancelled) setAuditTimelineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, encounterId, facilityId, t]);

  const loadQuickContext = useCallback(async (opts?: { force?: boolean }) => {
    if (!encounter?.id || !facilityId || !rolesReady) return;
    const loadKey = `${facilityId}:${encounter.id}`;
    if (!opts?.force && quickContextLoadedKeyRef.current === loadKey) {
      return;
    }
    quickContextLoadedKeyRef.current = loadKey;
    setQuickContextLoading(true);
    setQuickContextNotice(null);
    const patientId = encounter.patient?.id as string;
    const triageCacheKey = `encounter-triage:${facilityId}:${encounter.id}`;
    if (opts?.force) {
      invalidateGetRequestDedupeForPath(`/encounters/${encounter.id}/triage`, facilityId);
    }
    const triageP = canFetchEncounterTriage
      ? apiFetch(`/encounters/${encounter.id}/triage`, { facilityId })
      : Promise.resolve(null);
    const dxP =
      canFetchPatientDiagnosesList && patientId
        ? apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId })
        : Promise.resolve(null);
    const [triRes, dxRes] = await Promise.allSettled([triageP, dxP]);
    const tri = triRes.status === "fulfilled" ? triRes.value : null;
    const dx = dxRes.status === "fulfilled" ? dxRes.value : null;

    const failedLabels: string[] = [];
    if (canFetchEncounterTriage && triRes.status === "rejected") {
      failedLabels.push(t("encounterChrome.quickContextFailedVitals"));
    }
    if (canFetchPatientDiagnosesList && patientId && dxRes.status === "rejected") {
      failedLabels.push(t("encounterChrome.quickContextFailedDiagnoses"));
    }

    if (tri) {
      void setCachedRecord("latest_vitals", triageCacheKey, tri, {
        facilityId,
        encounterId: encounter.id,
        patientId,
      });
      setQuickTriage(tri);
    } else {
      const cachedTri = await getCachedRecord<any>("latest_vitals", triageCacheKey);
      setQuickTriage(cachedTri?.data ?? null);
    }
    if (dx && typeof dx === "object" && Array.isArray((dx as any).items)) {
      const items = (dx as {
        items: Array<{
          encounterId?: string;
          description?: string | null;
          code: string;
          sortOrder?: number;
          createdAt?: string;
        }>;
      }).items
        .filter((d) => d.encounterId === encounter.id)
        .sort((a, b) => {
          const sa = typeof a.sortOrder === "number" ? a.sortOrder : 0;
          const sb = typeof b.sortOrder === "number" ? b.sortOrder : 0;
          if (sa !== sb) return sa - sb;
          return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
        });
      setQuickDiagnosisCount(items.length);
      setQuickPrimaryDiagnosis(
        items.length > 0 ? diagnosisDisplayFr(items[0].description, items[0].code) : null
      );
    } else {
      setQuickDiagnosisCount(null);
      setQuickPrimaryDiagnosis(null);
    }
    if (failedLabels.length > 0) {
      setQuickContextNotice(
        t("encounterChrome.quickContextPartialLoadNotice").replace("{labels}", failedLabels.join(", "))
      );
    }
    setQuickContextLoading(false);
  }, [
    encounter?.id,
    facilityId,
    encounter?.patient?.id,
    rolesReady,
    canFetchEncounterTriage,
    canFetchPatientDiagnosesList,
    t,
  ]);

  useEffect(() => {
    quickContextLoadedKeyRef.current = null;
  }, [encounterId, facilityId]);

  useEffect(() => {
    if (!encounter?.id || !facilityId || !rolesReady) return;
    void loadQuickContext();
  }, [encounter?.id, facilityId, rolesReady, loadQuickContext]);

  useEffect(() => {
    if (!encounter?.patient?.id) return;
    const onVitalsUpdated = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId?: string }>;
      if (e.detail?.patientId !== encounter.patient.id) return;
      quickContextLoadedKeyRef.current = null;
      void loadQuickContext({ force: true });
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
  }, [encounter?.patient?.id, loadQuickContext]);

  const refreshQuickOrdersOnly = useCallback(async () => {
    if (!encounter?.id || !facilityId || !canFetchEncounterOrders) return;
    if (clinicalDataRefreshRef.current) {
      await clinicalDataRefreshRef.current("orders");
      return;
    }
    const pendingOrders = await getPendingCreateOrdersForEncounter(facilityId, encounter.id).catch(
      () => [] as Record<string, unknown>[]
    );
    try {
      const ords = await apiFetch(`/encounters/${encounter.id}/orders`, { facilityId });
      setQuickOrders(mergeOrders(Array.isArray(ords) ? ords : [], pendingOrders));
    } catch {
      setQuickOrders(pendingOrders);
    }
  }, [encounter?.id, facilityId, canFetchEncounterOrders]);

  const mergeEncounterFromOperationalPatch = useCallback((patch: Record<string, unknown>) => {
    setEncounter((prev: any) => {
      if (!prev) return prev;
      const next: Record<string, unknown> = { ...prev, ...patch };
      const patchPatient = patch.patient;
      if (prev.patient && patchPatient && typeof patchPatient === "object" && !Array.isArray(patchPatient)) {
        next.patient = { ...prev.patient, ...patchPatient };
      }
      const uid = patch.physicianAssignedUserId as string | null | undefined;
      const rel = patch.physicianAssigned as typeof prev.physicianAssigned | null | undefined;
      if (
        uid &&
        uid === prev.physicianAssigned?.id &&
        rel === null &&
        prev.physicianAssigned
      ) {
        next.physicianAssigned = prev.physicianAssigned;
      }
      return next;
    });
  }, []);

  const loadEncounter = useCallback(async (opts?: { silent?: boolean }): Promise<any | null> => {
    if (!canViewEncounterDetail) return null;
    if (!opts?.silent) setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}`, { facilityId });
      const enc = asApiObject(data);
      setEncounter(enc);
      if (enc) encounterHasLoadedOnceRef.current = true;
      return enc;
    } catch (error) {
      console.error("Failed to load encounter:", error);
      return null;
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [canViewEncounterDetail, encounterId, facilityId]);

  /** Re-fetch encounter metadata + bump dependent UI keys (no clinical bundle refetch). */
  const refreshObservationEncounterMetadata = useCallback(async () => {
    await loadEncounter({ silent: true });
    setClinicalTimelineRefresh((n) => n + 1);
    setEncounterResultsRefresh((x) => x + 1);
    if (encounterId && facilityId) {
      dispatchObservationEncounterRefresh({ encounterId, facilityId });
    }
  }, [loadEncounter, encounterId, facilityId]);

  /** Re-fetch encounter + order timeline surfaces after observation disposition or order-line mutations. */
  const refreshObservationClinicalSurfaces = useCallback(async () => {
    await Promise.all([
      loadEncounter({ silent: true }),
      clinicalDataRefreshRef.current
        ? clinicalDataRefreshRef.current("ordersAndEvents", { reason: "observation-surface", force: true })
        : refreshQuickOrdersOnly(),
    ]);
    setClinicalTimelineRefresh((n) => n + 1);
    setEncounterResultsRefresh((x) => x + 1);
    if (encounterId && facilityId) {
      dispatchObservationEncounterRefresh({ encounterId, facilityId });
    }
  }, [loadEncounter, refreshQuickOrdersOnly, encounterId, facilityId]);

  const refreshAfterOrderCreated = useCallback(async () => {
    if (clinicalDataRefreshRef.current) {
      await clinicalDataRefreshRef.current("orderMutation", { reason: "mutation", force: true });
    } else {
      await refreshQuickOrdersOnly();
    }
    await refreshObservationEncounterMetadata();
  }, [refreshQuickOrdersOnly, refreshObservationEncounterMetadata]);

  const handlePrintDischarge = useCallback(() => {
    if (!encounter?.patient) return;
    const facilityName = facilities.find((f) => f.id === facilityId)?.name;
    const dischargeSummaryJsonForPrint =
      pendingDischarge != null && Object.keys(pendingDischarge).length > 0
        ? pendingDischarge
        : encounter.dischargeSummaryJson;
    printDischarge({
      patient: encounter.patient,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: dischargeSummaryJsonForPrint,
        physicianAssigned: encounter.physicianAssigned ?? null,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: quickPrimaryDiagnosis,
      language,
    });
  }, [encounter, facilityId, facilities, quickPrimaryDiagnosis, pendingDischarge, language]);

  /**
   * Phase 5C — encounter-level live chart preview. Composes a printable view
   * from existing read endpoints only (no new backend, no snapshot, no audit
   * action). Mirrors the popup-blocker-safe lifecycle of `printDischarge` /
   * `printErPacket` / `printPatientChart`.
   */
  const handlePrintEncounterChartPreview = useCallback(() => {
    if (!encounter || !facilityId) return;
    const facilityName = facilities.find((f) => f.id === facilityId)?.name ?? null;
    void printEncounterChartLivePreview({
      encounter,
      triage: quickTriage,
      orders: quickOrders,
      facilityId,
      facilityName,
      language,
    });
  }, [encounter, facilityId, facilities, quickTriage, quickOrders, language]);

  useEffect(() => {
    if (!encounter?.id || !encounter?.patient?.id) return;
    const onResultSaved = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId?: string; encounterId?: string }>;
      if (e.detail?.patientId && e.detail.patientId !== encounter.patient.id) return;
      if (e.detail?.encounterId && e.detail.encounterId !== encounter.id) return;
      void refreshQuickOrdersOnly();
      void loadEncounter({ silent: true });
      setEncounterResultsRefresh((t) => t + 1);
    };
    window.addEventListener(MEDORA_CHART_RESULT_UPDATED, onResultSaved);
    return () => window.removeEventListener(MEDORA_CHART_RESULT_UPDATED, onResultSaved);
  }, [encounter?.id, encounter?.patient?.id, loadEncounter, refreshQuickOrdersOnly]);

  const openCloseConfirmModal = () => {
    setPendingDischarge(null);
    setAckDispositionSafety(false);
    setShowCloseConfirmModal(true);
  };

  const openDischargeThenClose = () => {
    setShowDischargeModal(true);
  };

  const submitAdmission = async () => {
    if (!encounter) return;
    const payload = admissionFormToPayload(admissionForm);
    if (Object.keys(payload).length === 0) {
      alert(t("encounterChrome.modals.admissionNeedOneField"));
      return;
    }
    setSavingAdmission(true);
    try {
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionSummaryJson: payload }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      const encAfter = await loadEncounter({ silent: true });
      setShowAdmissionModal(false);
      if (queued) {
        alert(t("encounterChrome.modals.admissionSaveQueued"));
        return;
      }
      if (!encAfter) return;
      const parsedAfter = parseAdmissionSummaryForChart(encAfter.admissionSummaryJson);
      const workflowAfter = isObservationShortStayEncounter({
        type: encAfter.type,
        status: encAfter.status,
        admittedAt: encAfter.admittedAt,
        admissionSummaryJson: encAfter.admissionSummaryJson,
      });
      const offerFromServerCare = shouldOfferObservationOrderTemplateCareLevel(parsedAfter?.careLevel);
      const offerFromLocalCare = shouldOfferObservationOrderTemplateCareLevel(admissionForm.careLevel);
      if (canPrescribe && workflowAfter && (offerFromServerCare || offerFromLocalCare)) {
        await refreshQuickOrdersOnly();
        setShowObservationOrderTemplateModal(true);
      }
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      alert(msg || t("encounterChrome.modals.admissionSaveFailed"));
    } finally {
      setSavingAdmission(false);
    }
  };

  const submitDischargeAndConfirmClose = async () => {
    if (!encounter) return;
    try {
      if (observationWorkflowActive) {
        const merged = mergeErDischargeForEncounterPatch(
          encounter.dischargeSummaryJson,
          dischargeForm,
          canEditNursingDischarge,
          canEditMedicalDischarge,
          obsDischargeOutcomeUi
        );
        let savedByDisplayName = t("emergencyDisposition.signerFallback");
        try {
          const meRes = await fetch("/api/auth/me");
          const me = await parseApiResponse(meRes);
          if (me && typeof me === "object" && !Array.isArray(me)) {
            const fn = (me as { fullName?: string }).fullName?.trim();
            if (fn) savedByDisplayName = fn;
          }
        } catch {
          /* ignore */
        }
        const signature = { savedAt: new Date().toISOString(), savedByDisplayName };
        const naWithDisp = mergeErDispositionV1IntoNursingAssessment(
          encounter.nursingAssessment,
          obsDispositionSupplement,
          signature
        );
        const emtalaComplement = emtalaDispositionComplementFromNursing(encounter.nursingAssessment);
        const body: Record<string, unknown> = {};
        if (merged !== null) {
          body.dischargeSummaryJson = merged;
        }
        body.nursingAssessment = applyEmtalaV1ComplementToNursingAssessment(naWithDisp, {
          outcome: obsDischargeOutcomeUi,
          complement: emtalaComplement,
          dispositionDecidedAtIso: signature.savedAt,
        });
        const res = await apiFetch(`/encounters/${encounterId}`, {
          method: "PATCH",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const queued =
          res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
        setQueuedDischargeSaveNotice(queued);
        await refreshObservationClinicalSurfaces();
        if (!queued && dischargeDraftKey && typeof window !== "undefined") {
          removeClinicalDraft(window.localStorage, dischargeDraftKey);
          setDischargeDraftRestoredAt(null);
          setDischargeDraftSavedLocallyAt(null);
        }
        const pending: Record<string, unknown> | null =
          merged ??
          (dischargeForm.dischargeMode.trim() ? { dischargeMode: dischargeForm.dischargeMode.trim() } : null);
        setPendingDischarge(pending);
        setShowDischargeModal(false);
        setShowCloseConfirmModal(true);
        return;
      }

      const merged = mergeDischargeForSave(
        encounter.dischargeSummaryJson,
        dischargeForm,
        canEditNursingDischarge,
        canEditMedicalDischarge
      );
      if (merged !== null) {
        const res = await apiFetch(`/encounters/${encounterId}`, {
          method: "PATCH",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dischargeSummaryJson: merged }),
        });
        const queued =
          res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
        setQueuedDischargeSaveNotice(queued);
        await refreshObservationClinicalSurfaces();
        if (!queued && dischargeDraftKey && typeof window !== "undefined") {
          removeClinicalDraft(window.localStorage, dischargeDraftKey);
          setDischargeDraftRestoredAt(null);
          setDischargeDraftSavedLocallyAt(null);
        }
      } else {
        setQueuedDischargeSaveNotice(false);
        if (dischargeDraftKey && typeof window !== "undefined") {
          removeClinicalDraft(window.localStorage, dischargeDraftKey);
          setDischargeDraftRestoredAt(null);
          setDischargeDraftSavedLocallyAt(null);
        }
      }
      setPendingDischarge(merged);
      setShowDischargeModal(false);
      setShowCloseConfirmModal(true);
    } catch {
      alert(t("encounterChrome.modals.closeDischargeSaveFailed"));
    }
  };

  const buildDischargePayloadFromPending = () => {
    const dischargePayload: Record<string, unknown> = {};
    if (pendingDischarge) {
      for (const [k, v] of Object.entries(pendingDischarge)) {
        if (typeof v === "boolean") {
          dischargePayload[k] = v;
        } else if (typeof v === "string") {
          const t = v.trim();
          if (t) dischargePayload[k] = t;
        }
      }
    }
    return dischargePayload;
  };

  const handleDispositionReadiness = useCallback((r: DispositionSafetyReadinessResponse | null) => {
    setDispositionReadiness(r);
  }, []);

  const executeCloseEncounter = async (acknowledgeDeficiencies: boolean, acknowledgeDispositionSafetyOverride?: boolean) => {
    setClosingEncounter(true);
    try {
      const dischargePayload = buildDischargePayloadFromPending();
      const body: Record<string, unknown> = {};
      if (Object.keys(dischargePayload).length > 0) body.discharge = dischargePayload;
      if (acknowledgeDeficiencies) body.acknowledgeDeficiencies = true;
      if (acknowledgeDispositionSafetyOverride) body.acknowledgeDispositionSafety = true;
      const derivedStatus = dischargeModeFrToDischargeStatus(
        typeof pendingDischarge?.dischargeMode === "string" ? pendingDischarge.dischargeMode : undefined
      );
      if (derivedStatus) body.dischargeStatus = derivedStatus;
      const res = await apiFetch(`/encounters/${encounterId}/close`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;

      setShowCloseConfirmModal(false);
      setShowDocumentationDeficiencyModal(false);
      setDocumentationDeficiencies([]);
      setAckDispositionSafety(false);

      if (queued) {
        setQueuedClosePendingSync(true);
        setPendingDischarge(null);
        setQueuedDischargeSaveNotice(false);
        await refreshObservationClinicalSurfaces();
        return;
      }

      setQueuedClosePendingSync(false);
      setPendingDischarge(null);
      setQueuedDischargeSaveNotice(false);
      if (dischargeDraftKey && typeof window !== "undefined") {
        removeClinicalDraft(window.localStorage, dischargeDraftKey);
        setDischargeDraftRestoredAt(null);
        setDischargeDraftSavedLocallyAt(null);
      }
      if (acknowledgeDeficiencies) {
        alert(t("encounterChrome.modals.closeSuccessDespiteDeficiencies"));
      }
      await refreshObservationClinicalSurfaces();
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterChrome.modals.closeEncounterFailed")
      );
    } finally {
      setClosingEncounter(false);
    }
  };

  const runCloseDocumentationCheckAndProceed = async () => {
    if (!encounter) return;
    setClosingEncounter(true);
    try {
      const dischargePayload = buildDischargePayloadFromPending();
      const derivedStatus = dischargeModeFrToDischargeStatus(
        typeof pendingDischarge?.dischargeMode === "string" ? pendingDischarge.dischargeMode : undefined
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
        setShowCloseConfirmModal(false);
        setDocumentationDeficiencies(result.deficiencies);
        setShowDocumentationDeficiencyModal(true);
        return;
      }
      await executeCloseEncounter(false, ackDispositionSafety);
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterChrome.modals.closeDocumentCheckFailed")
      );
    } finally {
      setClosingEncounter(false);
    }
  };

  const encounterPageShell = ENCOUNTER_PAGE_SHELL;

  const handleDocumentationDeficiencyNavigate = useCallback((code: string) => {
    setShowDocumentationDeficiencyModal(false);
    setDocumentationDeficiencies([]);
    setAckDispositionSafety(false);
    switch (code) {
      case "CHIEF_COMPLAINT":
      case "PROVIDER_DOCUMENTATION":
        setActiveTab("clinic");
        return;
      case "NURSING_ASSESSMENT":
        if (showNursingTab) setActiveTab("nursing");
        return;
      case "DISCHARGE_SUMMARY":
        setShowDischargeModal(true);
        return;
      case "ADMISSION_SUMMARY":
        setShowAdmissionModal(true);
        return;
      default:
        return;
    }
  }, [showNursingTab]);

  /** Parsed admission packet — must run before any early return (React #310). */
  const admissionPreviewForChrome = useMemo(
    () => parseAdmissionSummaryForChart(encounter?.admissionSummaryJson),
    [encounter?.admissionSummaryJson]
  );

  const observationInitialReasonForSummary = useMemo(() => {
    if (!encounter) return "";
    const fromAdmission = admissionPreviewForChrome?.admissionReason?.trim();
    if (fromAdmission) return fromAdmission;
    const vr = typeof encounter.visitReason === "string" ? encounter.visitReason.trim() : "";
    if (vr) return vr;
    const cc = typeof encounter.chiefComplaint === "string" ? encounter.chiefComplaint.trim() : "";
    return cc;
  }, [encounter, admissionPreviewForChrome?.admissionReason]);

  /** INPATIENT observation lane: do not gate on `careLevel` alone (see `isObservationShortStayEncounter`). */
  const observationWorkflowActive = useMemo(
    () =>
      Boolean(
        encounter &&
          isObservationShortStayEncounter({
            type: encounter.type,
            status: encounter.status,
            admittedAt: encounter.admittedAt,
            admissionSummaryJson: encounter.admissionSummaryJson,
          })
      ),
    [encounter, encounter?.type, encounter?.status, encounter?.admittedAt, encounter?.admissionSummaryJson]
  );

  const observationDisplayStatus = useMemo(
    () =>
      encounter
        ? deriveObservationEncounterDisplayStatus({
            type: encounter.type,
            status: encounter.status,
            admittedAt: encounter.admittedAt,
            admissionSummaryJson: encounter.admissionSummaryJson,
            dischargeSummaryJson: encounter.dischargeSummaryJson,
            dischargedAt: encounter.dischargedAt,
            updatedAt: encounter.updatedAt,
          })
        : { phase: "NOT_OBSERVATION" as const, closedOrDischargedAtIso: null, dischargeMode: null },
    [
      encounter,
      encounter?.type,
      encounter?.status,
      encounter?.admittedAt,
      encounter?.admissionSummaryJson,
      encounter?.dischargeSummaryJson,
      encounter?.dischargedAt,
      encounter?.updatedAt,
    ]
  );

  /** Tab list depends on observation lane — defined after `observationWorkflowActive` (React #310 safe). */
  const tabs = useMemo(
    () =>
      isReadOnlyTechnicianViewer
        ? [
            { id: "summary", label: t("encounterChrome.tabs.summary") },
            { id: "triage", label: t("encounterChrome.tabs.triage") },
            { id: "orders", label: t("encounterChrome.tabs.orders") },
            { id: "results", label: t("encounterChrome.tabs.results") },
            { id: "command_timeline", label: t("encounterChrome.tabs.commandTimeline") },
            ...(observationWorkflowActive
              ? [
                  { id: "observation_summary", label: t("encounterChrome.tabs.observationSummary") },
                  { id: "clinical_timeline", label: t("encounterChrome.tabs.clinicalTimeline") },
                ]
              : []),
            { id: "history", label: t("encounterChrome.tabs.history") },
          ]
        : [
            { id: "summary", label: t("encounterChrome.tabs.summary") },
            { id: "triage", label: t("encounterChrome.tabs.triage") },
            ...(showNursingTab ? [{ id: "nursing", label: t("encounterChrome.tabs.nursing") }] : []),
            { id: "clinic", label: t("encounterChrome.tabs.clinic") },
            { id: "diagnostics", label: t("encounterChrome.tabs.diagnostics") },
            { id: "orders", label: t("encounterChrome.tabs.orders") },
            ...(canFetchMarTab ? [{ id: "mar" as const, label: t("encounterChrome.tabs.mar") }] : []),
            { id: "results", label: t("encounterChrome.tabs.results") },
            { id: "command_timeline", label: t("encounterChrome.tabs.commandTimeline") },
            ...(observationWorkflowActive
              ? [
                  { id: "observation_summary", label: t("encounterChrome.tabs.observationSummary") },
                  { id: "clinical_timeline", label: t("encounterChrome.tabs.clinicalTimeline") },
                ]
              : []),
            { id: "notes", label: t("encounterChrome.tabs.notes") },
            { id: "pathways", label: t("encounterChrome.tabs.pathways") },
            { id: "history", label: t("encounterChrome.tabs.history") },
          ],
    [t, showNursingTab, canFetchMarTab, isReadOnlyTechnicianViewer, observationWorkflowActive]
  );

  useEffect(() => {
    if (!observationWorkflowActive && (activeTab === "observation_summary" || activeTab === "clinical_timeline")) {
      const providerLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
      const rnOnly = roles.includes("RN") && !providerLike;
      setActiveTab(rnOnly ? "triage" : providerLike ? "clinic" : "summary");
    }
  }, [observationWorkflowActive, activeTab, roles]);

  const observationTrackboardOpsInput = useMemo(
    () =>
      mergeObservationTrackboardOpsInput(
        encounter?.trackboardOps as HospitalisationBoardTrackboardOps | undefined,
        quickTriage?.triageCompleteAt ?? quickTriage?.updatedAt ?? undefined
      ),
    [encounter?.trackboardOps, quickTriage?.triageCompleteAt, quickTriage?.updatedAt]
  );

  /**
   * INPATIENT + OPEN observation LOS snapshot. Must run before any early return — same hook
   * count on loading / error / loaded paths (React #310).
   */
  const observationOpsClient = useMemo(() => {
    if (!encounter || encounter.type !== "INPATIENT" || encounter.status !== "OPEN") return null;
    return computeObservationOperationalSnapshot({
      encounterType: encounter.type,
      status: encounter.status,
      workflowState: String(encounter.workflowState ?? ""),
      admittedAt: encounter.admittedAt,
      createdAt: encounter.createdAt,
      physicianAssignedUserId: encounter.physicianAssignedUserId ?? null,
      nurseAssignedUserId: encounter.nurseAssignedUserId ?? null,
      providerDocumentationStatus: encounter.providerDocumentationStatus,
      providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
      trackboardOps: observationTrackboardOpsInput,
    });
  }, [
    encounter,
    encounter?.type,
    encounter?.status,
    encounter?.workflowState,
    encounter?.admittedAt,
    encounter?.createdAt,
    encounter?.physicianAssignedUserId,
    encounter?.nurseAssignedUserId,
    encounter?.providerDocumentationStatus,
    encounter?.providerDocumentationSignedAt,
    observationTrackboardOpsInput,
  ]);

  const medicationMarSummaryRefreshKey = useMemo(
    () =>
      `${String((encounter as { updatedAt?: string } | null)?.updatedAt ?? "")}-${encounterResultsRefresh}-${clinicalTimelineRefresh}`,
    [encounter, encounterResultsRefresh, clinicalTimelineRefresh]
  );

  const observationMarEncounterDigest = useObservationMarEncounterSummary({
    encounterId,
    facilityId,
    refreshKey: medicationMarSummaryRefreshKey,
    enabled: Boolean(
      rolesReady &&
        facilityId &&
        encounterId &&
        encounter &&
        observationWorkflowActive &&
        observationOpsClient &&
        canFetchEncounterOrders
    ),
    language,
    t,
    clinicalData,
    pollingEnabled: activeTab !== "mar" && activeTab !== "orders",
  });

  const existingObservationTemplateItemIds = useMemo(() => {
    const collected: { manualLabel?: string | null; status?: string | null; lifecycleState?: string | null }[] = [];
    for (const o of quickOrders) {
      if (!o || (o as { type?: string }).type !== "CARE" || (o as { cancelledAt?: string | null }).cancelledAt)
        continue;
      if (!isObservationOrderTemplateProtocol((o as { authority?: { protocolName?: string | null } }).authority?.protocolName ?? null))
        continue;
      const items = Array.isArray((o as { items?: unknown }).items) ? (o as { items: unknown[] }).items : [];
      for (const it of items) {
        const row = it as {
          manualLabel?: string | null;
          status?: string | null;
          lifecycleState?: string | null;
        };
        collected.push({
          manualLabel: row.manualLabel ?? null,
          status: row.status ?? null,
          lifecycleState: row.lifecycleState ?? null,
        });
      }
    }
    return collectObservationTemplateItemIdsFromOrderItems(collected);
  }, [quickOrders]);

  const observationTemplateHasAppliedLines = existingObservationTemplateItemIds.length > 0;

  const observationTemplateCareOps = useMemo(() => {
    const rows: { lifecyclePhase: ReturnType<typeof deriveObservationTemplateLineLifecyclePhase>; templateItemId: string | null }[] = [];
    for (const o of quickOrders) {
      if (!o || (o as { type?: string }).type !== "CARE" || (o as { cancelledAt?: string | null }).cancelledAt)
        continue;
      if (
        !isObservationOrderTemplateProtocol(
          (o as { authority?: { protocolName?: string | null } }).authority?.protocolName ?? null
        )
      ) {
        continue;
      }
      const items = Array.isArray((o as { items?: unknown }).items) ? (o as { items: unknown[] }).items : [];
      for (const it of items) {
        const row = it as { manualLabel?: string | null; status?: string | null; lifecycleState?: string | null };
        const status = String(row.status ?? row.lifecycleState ?? "PLACED").toUpperCase();
        const cancelled =
          status === "CANCELLED" || String(row.lifecycleState ?? "").toUpperCase() === "CANCELLED";
        const templateItemId =
          observationTemplateItemIdFromPersistedManualLabel(row.manualLabel ?? null) ?? null;
        rows.push({
          lifecyclePhase: deriveObservationTemplateLineLifecyclePhase({ status, cancelled }),
          templateItemId,
        });
      }
    }
    return deriveObservationTemplateCareOpsIndicators(rows);
  }, [quickOrders]);

  if (!facilityId || !encounterId) {
    return (
      <div style={{ ...encounterPageShell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>{t("common.loading")}</div>
      </div>
    );
  }

  if (!rolesReady) {
    return (
      <div style={{ ...encounterPageShell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>{t("common.loading")}</div>
      </div>
    );
  }

  if (rolesReady && !canViewEncounterDetail) {
    return null;
  }

  if (loading && canViewEncounterDetail) {
    return (
      <div style={{ ...encounterPageShell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>
          {encounterHasLoadedOnceRef.current ? t("common.loading") : t("encounterChrome.loadingOpeningEncounter")}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...encounterPageShell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, color: "#475569" }}>{t("common.loading")}</div>
      </div>
    );
  }

  if (!encounter) {
    const isEncounterNotFound =
      encounterFetchError != null && encounterFetchError.trim() === USER_FACING_ENCOUNTER_NOT_FOUND_FR;
    return (
      <div style={encounterPageShell}>
        <div style={{ maxWidth: 520, margin: "0 auto", width: "100%", textAlign: "center" }}>
          {isEncounterNotFound ? (
            <>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                {t("encounterChrome.notFoundTitle")}
              </p>
              <p style={{ margin: "14px 0 0 0", color: "#64748b", lineHeight: 1.55 }}>
                {t("encounterChrome.notFoundBodyEstablishment")}
              </p>
              <p style={{ margin: "20px 0 0 0" }}>
                <Link href="/app/encounters">{t("encounterChrome.backToEncounterList")}</Link>
              </p>
            </>
          ) : encounterFetchError ? (
            <>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                {t("encounterChrome.loadFailedTitle")}
              </p>
              {encounterFetchError.trim() !== t("encounterChrome.errLoadEncounter").trim() &&
              encounterFetchError.trim() !== t("encounterChrome.loadFailedTitle").trim() ? (
                <p style={{ margin: "14px 0 0 0", color: "#b91c1c", lineHeight: 1.55 }}>{encounterFetchError}</p>
              ) : null}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                {t("encounterChrome.notFoundTitle")}
              </p>
              <p style={{ margin: "14px 0 0 0", color: "#64748b", lineHeight: 1.55 }}>
                {t("encounterChrome.notFoundBodyGeneric")}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const isProviderLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
  /** Dossier médical signé : saisie verrouillée (addendum et navigation restent possibles). */
  const isLocked = isEncounterLocked(encounter);
  const isRNOnly = roles.includes("RN") && !isProviderLike;
  const canAssignRoom =
    canAssignEncounterRoom(roles) && encounter.status === "OPEN" && !isLocked;
  const encounterRoomContext = {
    roomLabel: encounter.roomLabel,
    type: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
    governedRoomDisplay: encounter.governedRoomDisplay,
    governedRoomUnit: encounter.governedRoomUnit,
    governedRoomHasAssignment: encounter.governedRoomHasAssignment,
  };
  const openRoomAssignmentModal = canAssignRoom ? () => setShowRoomAssignmentModal(true) : undefined;

  const canAddObsProviderReassessment =
    observationWorkflowActive && encounter.status === "OPEN" && isProviderLike;
  const canAddObsNursingReassessment =
    observationWorkflowActive &&
    encounter.status === "OPEN" &&
    (roles.includes("RN") || roles.includes("ADMIN"));
  const canEditOperational = roles.includes("RN") || roles.includes("ADMIN");
  /** Admission depuis la consultation — réservé médecin / admin (aligné sur `canPrescribe`). */
  const canAdmitPatient = canPrescribe && encounter.status === "OPEN";
  const patient = encounter.patient;
  const motif =
    (encounter.visitReason || encounter.chiefComplaint || quickTriage?.chiefComplaint || "").trim() ||
    t("common.dash");
  const vitalsJson = (quickTriage?.vitalsJson || {}) as Record<string, number | string | null | undefined>;
  const vitalsAtRaw = quickTriage?.triageCompleteAt || quickTriage?.updatedAt || null;
  const vitalsAt = vitalsAtRaw ? formatEncounterChromeDateTime(vitalsAtRaw, language) : null;
  const vitalsLine = hasVitalsJson(vitalsJson)
    ? formatLatestVitalsLine(vitalsJson, quickTriage?.esi ?? null, language, t)
    : t("encounterChrome.noVitalsLine");
  const medOrderCount = quickOrders.filter((o) => o.type === "MEDICATION").length;
  const totalOrderCount = quickOrders.length;
  const ageText =
    patient?.dob && !Number.isNaN(new Date(patient.dob).getTime())
      ? `${calculateAge(patient.dob)} ${t("encounterChrome.ageYearsSuffix")}`
      : t("common.dash");
  const sexText = tPatientSex(patient?.sex ?? null, patient?.sexAtBirth ?? null, t);
  const patientDob =
    patient?.dob != null ? formatEncounterChromeDate(patient.dob, language) : null;

  const dischargePreviewForPrint = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const showPrintDischarge =
    encounter.status === "OPEN" || dischargePreviewForPrint !== null;
  const showEncounterHospitalizationBanner = encounter.type === "INPATIENT";
  const showConfirmInpatientTransfer =
    encounter.status === "OPEN" && encounter.type === "EMERGENCY" && admissionPreviewForChrome != null;

  const showObservationOrdersEntry =
    observationWorkflowActive && observationDisplayStatus.phase === "ACTIVE" && canPrescribe;

  const renderDischargeFieldRow = (key: keyof DischargeFormState, kind: "medical" | "nursing", rows: number) => {
    const editable =
      !isLocked &&
      ((kind === "nursing" && canEditNursingDischarge) || (kind === "medical" && canEditMedicalDischarge));
    const label = t(`encounterChrome.modals.dischargeField.${key}`);
    const quickList =
      observationWorkflowActive && editable
        ? kind === "medical"
          ? OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES.filter((n) => n.field === key)
          : OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES.filter((n) => n.field === key)
        : [];
    return (
      <label key={String(key)} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "#334155" }}>
          {label}
          {!editable ? (
            <span style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 6 }}>{t("encounterChrome.modals.readOnly")}</span>
          ) : null}
        </span>
        {quickList.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {kind === "medical"
                ? t("observationDischarge.quickNotesGroupProvider")
                : t("observationDischarge.quickNotesGroupNursing")}
            </span>
            {quickList.map((n) => (
              <button
                key={n.id}
                type="button"
                disabled={!editable}
                onClick={() =>
                  setDischargeForm((f) => ({
                    ...f,
                    [key]: appendQuickNoteToField(f[key] as string, t(n.insertKey)),
                  }))
                }
                style={{
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 9999,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  color: "#475569",
                  cursor: editable ? "pointer" : "not-allowed",
                  opacity: editable ? 1 : 0.65,
                }}
              >
                {t(n.chipLabelKey)}
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          readOnly={!editable}
          value={dischargeForm[key] as string}
          onChange={(e) => setDischargeForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={rows}
          style={encounterWorkflowModalField(editable)}
        />
      </label>
    );
  };

  const quickBtn: React.CSSProperties = {
    padding: "8px 14px",
    fontSize: 13,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color: "#334155",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  };

  return (
    <div style={encounterPageShell}>
      <EncounterClinicalDataRefreshRegistrar refreshRef={clinicalDataRefreshRef} />
      <EncounterQuickOrdersBridge canFetchOrders={canFetchEncounterOrders} setQuickOrders={setQuickOrders} />
      <EncounterClinicalDataRefreshKeyBridge refreshKey={medicationMarSummaryRefreshKey} />
      <EncounterPassQueuePrefetchBridge active={activeTab === "mar" && canFetchMarTab} />
      <div style={{ maxWidth: 1152, margin: "0 auto", width: "100%" }}>
        {quickContextNotice ? (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #fde68a",
              backgroundColor: "#fffbeb",
              fontSize: 13,
              color: "#78350f",
              lineHeight: 1.5,
            }}
          >
            {quickContextNotice}
          </div>
        ) : null}
        {isLocked ? (
          <div
            role="status"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #bae6fd",
              backgroundColor: "#f0f9ff",
              fontSize: 13,
              color: "#0369a1",
              lineHeight: 1.5,
            }}
          >
            {t("encounterChrome.lockedSignedBanner")}
          </div>
        ) : null}
        {queuedClosePendingSync && encounter?.status === "OPEN" ? (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              fontSize: 13,
              color: "#b91c1c",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {t("encounterChrome.queuedCloseBanner")}
          </div>
        ) : null}
        {queuedDischargeSaveNotice ? (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              fontSize: 13,
              color: "#b91c1c",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {t("encounterChrome.queuedDischargeBanner")}
          </div>
        ) : null}
        {showEncounterHospitalizationBanner ? (
          <div
            style={{
              marginBottom: 16,
              backgroundColor: MEDORA_CARD_SHELL.background,
              border: MEDORA_CARD_SHELL.border,
              borderRadius: MEDORA_CARD_SHELL.radius,
              boxShadow: MEDORA_CARD_SHELL.boxShadow,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#6d28d9",
                marginBottom: 8,
              }}
            >
              {t("encounterChrome.hospitalizationBadge")}
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>
              {t("encounterChrome.hospitalizationLead").replace("{type}", tEncounterType(t, encounter.type))}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              <div>
                <EncounterGovernedRoomInline
                  encounter={encounterRoomContext}
                  clickable={canAssignRoom}
                  onClick={openRoomAssignmentModal}
                />
              </div>
              {encounter.admittedAt ? (
                <div>
                  <span style={{ color: "#64748b" }}>{t("encounterChrome.labelAdmission")}:</span>{" "}
                  {t("encounterChrome.admissionDecisionRecorded").replace(
                    "{datetime}",
                    formatEncounterChromeDateTime(encounter.admittedAt, language)
                  )}
                </div>
              ) : admissionPreviewForChrome ? (
                <div>
                  <span style={{ color: "#64748b" }}>{t("encounterChrome.admissionRecordLabel")}:</span>{" "}
                  {t("encounterChrome.admissionRecordFilled")}
                </div>
              ) : (
                <div>
                  <span style={{ color: "#64748b" }}>{t("encounterChrome.admissionRecordLabel")}:</span>{" "}
                  {t("encounterChrome.admissionRecordEmpty")}
                </div>
              )}
              {observationOpsClient && encounter.status === "OPEN" ? (
                <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
                  <span style={{ color: "#64748b" }}>{t("encounterChrome.observationLosLabel")}:</span>{" "}
                  {observationOpsClient.losLabel}
                  {observationOpsClient.overnightUtcSpan ? (
                    <>
                      {" · "}
                      <span style={{ fontWeight: 600 }}>{t("encounterChrome.observationOvernightUtc")}</span>
                    </>
                  ) : null}
                  {observationOpsClient.extendedStay24h ? (
                    <>
                      {" · "}
                      <span style={{ fontWeight: 600 }}>{t("encounterChrome.observationExtended24h")}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
              {showObservationOrdersEntry ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowObservationOrderTemplateModal(true)}
                    style={{
                      ...quickBtn,
                      borderColor: "#c4b5fd",
                      background: "#faf5ff",
                      fontWeight: 600,
                      color: "#5b21b6",
                    }}
                  >
                    {t("encounterChrome.observationOrderTemplateBannerButton")}
                  </button>
                  {observationTemplateHasAppliedLines ? (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#64748b",
                        lineHeight: 1.5,
                        maxWidth: 520,
                      }}
                    >
                      {existingObservationTemplateItemIds.length >= OBSERVATION_ORDER_TEMPLATE_ITEMS.length
                        ? t("encounterChrome.observationOrderTemplateBannerComplete")
                        : t("encounterChrome.observationOrderTemplateBannerPartial")}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {admissionPreviewForChrome?.admissionReason ? (
                <div style={{ wordBreak: "break-word" }}>
                  <span style={{ color: "#64748b" }}>{t("encounterChrome.labelAdmissionReason")}:</span>{" "}
                  {admissionPreviewForChrome.admissionReason}
                </div>
              ) : null}
              {dischargePreviewForPrint ? (
                <div
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    color: "#334155",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{t("encounterChrome.labelDischargeSummary")}:</span>{" "}
                  {t("encounterChrome.dischargeSummaryRecordedHint")}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              backgroundColor: MEDORA_CARD_SHELL.background,
              border: MEDORA_CARD_SHELL.border,
              borderRadius: MEDORA_CARD_SHELL.radius,
              boxShadow: MEDORA_CARD_SHELL.boxShadow,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <h1 style={{ margin: "0 0 10px 0", fontSize: 22, lineHeight: 1.25, fontWeight: 700, color: "#0f172a" }}>
                  {patient.firstName} {patient.lastName}
                </h1>
                <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.55 }}>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelAge")}:</span> {ageText}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelSex")}:</span> {sexText}
                  </div>
                  {patientDob && (
                    <div>
                      <span style={{ color: "#64748b" }}>{t("encounterChrome.labelDob")}:</span> {patientDob}
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelNirMrn")}:</span>{" "}
                    {patient.mrn || t("common.dash")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelStatus")}:</span>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: encounter.status === "OPEN" ? "#e3f2fd" : "#f5f5f5",
                        color: encounter.status === "OPEN" ? "#1565c0" : "#616161",
                      }}
                    >
                      {tEncounterStatus(t, encounter.status)}
                    </span>
                    {encounter.admittedAt || admissionPreviewForChrome ? (
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: "#f3e5f5",
                          color: "#6a1b9a",
                        }}
                        title={
                          encounter.admittedAt
                            ? t("encounterChrome.tooltipAdmissionDecision").replace(
                                "{datetime}",
                                formatEncounterChromeDateTime(encounter.admittedAt, language)
                              )
                            : t("encounterChrome.tooltipAdmissionRecorded")
                        }
                      >
                        {t("encounterChrome.patientAdmittedBadge")}
                      </span>
                    ) : null}
                    <ObservationEncounterDisplayPill
                      status={observationDisplayStatus}
                      t={t}
                      language={language}
                    />
                    {observationDisplayStatus.phase === "ACTIVE" && observationOpsClient ? (
                      <ObservationWorkflowHeaderStatusPill snapshot={observationOpsClient} t={t} />
                    ) : null}
                    <BillingClassificationBadgeReadOnly
                      classification={(encounter as { billingClassification?: string }).billingClassification}
                    />
                    <EncounterBillingExportReadinessHint
                      facilityId={facilityId}
                      encounterId={encounterId}
                      enabled={canViewBillingExportReadiness}
                    />
                    <EncounterGovernedRoomChip
                      encounter={encounterRoomContext}
                      clickable={canAssignRoom}
                      onClick={openRoomAssignmentModal}
                      alignSelf="center"
                      compact
                    />
                  </div>
                </div>
              </div>

              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "10px 16px",
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelChiefComplaint")}:</span>{" "}
                    <span style={{ wordBreak: "break-word" }}>{motif}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelEncounterType")}:</span>{" "}
                    {tEncounterType(t, encounter.type)}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelVisitDiagnoses")}:</span>{" "}
                    {quickContextLoading ? "…" : quickDiagnosisCount !== null ? quickDiagnosisCount : t("common.dash")}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelPrescriptions")}:</span>{" "}
                    {quickContextLoading ? "…" : medOrderCount}
                    {totalOrderCount > 0 && (
                      <span style={{ color: "#64748b" }}>
                        {" "}
                        · {t("encounterChrome.labelOrdersTotal")}: {totalOrderCount}
                      </span>
                    )}
                  </div>
                  {encounter.followUpDate && (
                    <div>
                      <span style={{ color: "#64748b" }}>{t("encounterChrome.labelFollowUp")}:</span>{" "}
                      {formatEncounterChromeDate(encounter.followUpDate, language)}
                    </div>
                  )}
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelAssignedPhysician")}:</span>{" "}
                    {formatEncounterProviderAssigned(encounter)}
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>{t("encounterChrome.labelOpenedAt")}:</span>{" "}
                    {formatEncounterChromeDateTime(encounter.createdAt, language)}
                  </div>
                  {encounter.status === "CLOSED" && (encounter.dischargedAt || encounter.updatedAt) && (
                    <div style={{ gridColumn: "1 / -1", color: "#334155", fontSize: 13 }}>
                      {encounter.closedByDisplayFr?.trim()
                        ? t("encounterChrome.closedByLine")
                            .replace("{name}", encounter.closedByDisplayFr.trim())
                            .replace(
                              "{datetime}",
                              formatEncounterChromeDateTime(
                                encounter.dischargedAt ?? encounter.updatedAt,
                                language
                              )
                            )
                        : t("encounterChrome.closedAtLine").replace(
                            "{datetime}",
                            formatEncounterChromeDateTime(
                              encounter.dischargedAt ?? encounter.updatedAt,
                              language
                            )
                          )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flex: "0 0 auto" }}>
                <Link
                  href={`/app/patients/${patient.id}`}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#1a1a1a",
                    textDecoration: "none",
                    fontWeight: 600,
                    background: "#fff",
                  }}
                >
                  {t("encounterChrome.backToPatientChart")}
                </Link>
                {observationWorkflowActive && observationDisplayStatus.phase === "ACTIVE" ? (
                  <ObservationWorkflowActiveHeaderPill t={t} />
                ) : null}
                {canAdmitPatient && !observationWorkflowActive && (
                  <button
                    type="button"
                    onClick={() => setShowAdmissionModal(true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#6a1b9a",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {t("encounterChrome.admitPatient")}
                  </button>
                )}
                {encounter.status === "OPEN" && canManageEncounterClosure && (
                  <>
                    <button
                      type="button"
                      onClick={openDischargeThenClose}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#37474f",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {t("encounterChrome.dischargeSummary")}
                    </button>
                    <button
                      type="button"
                      onClick={openCloseConfirmModal}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#c62828",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {t("encounterChrome.finishEncounter")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        {observationDisplayStatus.phase === "ACTIVE" && observationWorkflowActive && observationOpsClient ? (
          <ObservationWorkflowEncounterChrome
            compact
            snapshot={observationOpsClient}
            trackboardOps={observationTrackboardOpsInput}
            providerDocumentationStatus={encounter.providerDocumentationStatus}
            providerDocumentationSignedAt={encounter.providerDocumentationSignedAt}
            formatDateTime={(iso) => formatEncounterChromeDateTime(iso, language)}
            t={t}
            setActiveTab={(tab) => setActiveTab(tab)}
            onOpenDischarge={openDischargeThenClose}
            showNursingTab={showNursingTab}
            canAddProviderReassessment={canAddObsProviderReassessment}
            canAddNursingReassessment={canAddObsNursingReassessment}
            onOpenObservationReassessment={(role) => setObservationReassessmentModalRole(role)}
            onOpenContinueObservationQuick={() => setShowContinueObservationQuickModal(true)}
            marEncounterDigest={{
              summary: observationMarEncounterDigest.summary,
              loading: observationMarEncounterDigest.loading,
            }}
            canOpenMarTab={canFetchMarTab}
            templateCareOps={observationTemplateCareOps}
          />
        ) : null}
        <EncounterOperationalPanel
          encounterId={encounterId}
          facilityId={facilityId}
          canEdit={canEditOperational && encounter.status === "OPEN"}
          roomLabel={encounter.roomLabel}
          physicianAssigned={encounter.physicianAssigned}
          showConfirmInpatientTransfer={showConfirmInpatientTransfer}
          nursingAssessment={encounter.nursingAssessment}
          onSaved={mergeEncounterFromOperationalPatch}
          onUpdated={() => void refreshObservationClinicalSurfaces()}
        />
      </div>

      <div
        style={{
          backgroundColor: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: 6,
            padding: "10px 12px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                padding: "10px 16px",
                borderRadius: 10,
                border:
                  activeTab === tab.id ? "1px solid #bfdbfe" : "1px solid transparent",
                backgroundColor: activeTab === tab.id ? "#eff6ff" : "transparent",
                color: activeTab === tab.id ? "#0f172a" : "#64748b",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 500,
                boxShadow:
                  activeTab === tab.id ? "0 1px 2px rgba(15, 23, 42, 0.06)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "10px 14px 12px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 6,
                  letterSpacing: "0.01em",
                }}
              >
                {t("encounterChrome.lastVitals")}
              </div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                {quickContextLoading ? t("common.loading") : vitalsLine}
                {vitalsJson?.allergyNote && String(vitalsJson.allergyNote).trim() !== "" && (
                  <div style={{ marginTop: 4, color: "#c62828", fontWeight: 700 }}>
                    ⚠️ {t("encounterChrome.allergyPrefix")}: {String(vitalsJson.allergyNote).trim()}
                  </div>
                )}
                {vitalsAt && (
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {t("encounterChrome.vitalsRecordedAt")}: {vitalsAt}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: "2 1 280px", minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 8,
                  letterSpacing: "0.01em",
                }}
              >
                {t("encounterChrome.quickActions")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {isRNOnly && (
                  <>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("triage")}>
                      {t("encounterChrome.rnEnterVitals")}
                    </button>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
                      {t("encounterChrome.rnViewMedicalEval")}
                    </button>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("orders")}>
                      {t("encounterChrome.rnViewOrders")}
                    </button>
                    {encounter.status === "OPEN" && canManageEncounterClosure ? (
                      <>
                        <button
                          type="button"
                          style={{
                            ...quickBtn,
                            backgroundColor: "#37474f",
                            color: "#fff",
                            borderColor: "#37474f",
                          }}
                          onClick={openDischargeThenClose}
                        >
                          {t("encounterChrome.dischargeSummary")}
                        </button>
                        <button
                          type="button"
                          style={{ ...quickBtn, borderColor: "#c62828", color: "#c62828" }}
                          onClick={openCloseConfirmModal}
                        >
                          {t("encounterChrome.finishEncounter")}
                        </button>
                      </>
                    ) : null}
                    <Link
                      href={`/app/patients/${patient.id}`}
                      style={{ ...quickBtn, display: "inline-block", textDecoration: "none", color: "inherit" }}
                    >
                      {t("encounterChrome.backToPatientChart")}
                    </Link>
                  </>
                )}
                {isProviderLike && (
                  <>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
                      {t("encounterChrome.providerMedicalEval")}
                    </button>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("diagnostics")}>
                      {t("encounterChrome.providerAddDiagnosis")}
                    </button>
                    {canPrescribe ? (
                      <>
                        <button
                          type="button"
                          style={quickBtn}
                          onClick={() => {
                            setActiveTab("orders");
                            setMedicationModalRequestTick((tick) => tick + 1);
                          }}
                        >
                          {t("encounterChrome.providerCreatePrescription")}
                        </button>
                        <button
                          type="button"
                          style={quickBtn}
                          onClick={() => {
                            setActiveTab("orders");
                            setCareModalPresetLabel(t("orders.ivLine"));
                            setCareModalRequestTick((tick) => tick + 1);
                          }}
                        >
                          {t("encounterChrome.providerPrescribeIv")}
                        </button>
                        <button
                          type="button"
                          style={quickBtn}
                          onClick={() => {
                            setActiveTab("orders");
                            setCareModalPresetLabel(t("orders.oxygenTherapy"));
                            setCareModalRequestTick((tick) => tick + 1);
                          }}
                        >
                          {t("encounterChrome.providerPrescribeOxygen")}
                        </button>
                        <button
                          type="button"
                          style={quickBtn}
                          onClick={() => {
                            setActiveTab("orders");
                            setCareModalPresetLabel(t("orders.dressingWoundCare"));
                            setCareModalRequestTick((tick) => tick + 1);
                          }}
                        >
                          {t("encounterChrome.providerPrescribeWoundCare")}
                        </button>
                      </>
                    ) : null}
                    {canAdmitPatient && !observationWorkflowActive ? (
                      <button
                        type="button"
                        style={{
                          ...quickBtn,
                          backgroundColor: "#f3e5f5",
                          borderColor: "#6a1b9a",
                          color: "#4a148c",
                          fontWeight: 600,
                        }}
                        onClick={() => setShowAdmissionModal(true)}
                      >
                        {t("encounterChrome.admitPatient")}
                      </button>
                    ) : null}
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("triage")}>
                      {t("encounterChrome.providerViewVitals")}
                    </button>
                  </>
                )}
                {!isRNOnly && !isProviderLike && (
                  <>
                    <button type="button" style={quickBtn} onClick={() => setActiveTab("summary")}>
                      {t("encounterChrome.otherRoleSummary")}
                    </button>
                    <Link
                      href={`/app/patients/${patient.id}`}
                      style={{ ...quickBtn, display: "inline-block", textDecoration: "none", color: "inherit" }}
                    >
                      {t("encounterChrome.backToPatientChart")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "20px 22px 28px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          {activeTab === "summary" && (
            <EncounterSummaryTab
              encounter={encounter}
              showPrintDischarge={showPrintDischarge}
              onPrintDischarge={handlePrintDischarge}
              onPrintEncounterPreview={
                canFetchEncounterTriage ? handlePrintEncounterChartPreview : undefined
              }
            />
          )}
          {activeTab === "clinic" && (
            <ClinicVisitTab
              encounter={encounter}
              facilityId={facilityId}
              onUpdate={loadEncounter}
              canSignProviderDocumentation={isProviderLike}
              observationMdmGuidanceActive={observationWorkflowActive}
            />
          )}
          {activeTab === "triage" && (
            <TriageVitalsTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} isLocked={isLocked} />
          )}
          {activeTab === "nursing" && showNursingTab && (
            observationWorkflowActive ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <EmergencyNursingReassessmentPanel
                  encounterId={encounterId}
                  facilityId={facilityId}
                  encounter={encounter}
                  isLocked={isLocked}
                  onSaved={async () => {
                    setClinicalTimelineRefresh((n) => n + 1);
                    await loadEncounter({ silent: true });
                  }}
                  nursingTabHref={`/app/encounters/${encounterId}`}
                  variant="observationEncounter"
                />
                <ErHandoffV1NursingSection
                  encounter={encounter}
                  encounterId={encounterId}
                  facilityId={facilityId}
                  isLocked={isLocked}
                  canEditErHandoff={canEditOperational && encounter.status === "OPEN"}
                  onUpdated={() => void refreshObservationClinicalSurfaces()}
                  onSaved={mergeEncounterFromOperationalPatch}
                />
              </div>
            ) : (
              <NursingAssessmentTab
                encounterId={encounterId}
                facilityId={facilityId}
                encounter={encounter}
                onUpdate={loadEncounter}
                isLocked={isLocked}
                canEditErInpatientHandoff={canEditOperational && encounter.status === "OPEN"}
                onHandoffSaved={mergeEncounterFromOperationalPatch}
              />
            )
          )}
          {activeTab === "diagnostics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <EncounterDiagnosticsPanel
                encounterId={encounter.id}
                patientId={patient.id}
                facilityId={facilityId}
                canDocumentDiagnoses={canDocumentEncounterDiagnoses}
                isLocked={isLocked}
              />
              <EncounterProcedureCapturePanel
                encounterId={encounter.id}
                facilityId={facilityId}
                canCapture={canCaptureStructuredProcedures}
                isLocked={isLocked}
              />
            </div>
          )}
          {activeTab === "pathways" && (
            <PathwaysTab encounterId={encounterId} encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} isLocked={isLocked} />
          )}
          {activeTab === "notes" && <NotesTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} isLocked={isLocked} />}
          {activeTab === "orders" && (
            <OrdersTab
              encounterId={encounterId}
              encounter={encounter}
              facilityId={facilityId}
              canPrescribe={canPrescribe}
              roles={roles}
              medicationModalRequestTick={medicationModalRequestTick}
              careModalRequestTick={careModalRequestTick}
              careModalPresetLabel={careModalPresetLabel}
              onOrdersUpdated={refreshObservationEncounterMetadata}
              onRefetchEncounter={refreshObservationEncounterMetadata}
            />
          )}
          {activeTab === "mar" && canFetchMarTab && (
            <MedicationAdministrationTab
              encounterId={encounterId}
              facilityId={facilityId}
              currentUserId={userId}
              encounterStatus={encounter.status}
              providerDocumentationStatus={encounter.providerDocumentationStatus}
              roleCodes={roles}
              facilityTimeZone={session.facilityTimeZone}
              encounterAllergySource={{
                vitals: encounter.vitals,
                nursingAssessment: encounter.nursingAssessment,
                triage: quickTriage,
              }}
            />
          )}
          {activeTab === "results" && (
            <EncounterResultsTab
              encounterId={encounterId}
              facilityId={facilityId}
              refreshToken={encounterResultsRefresh}
              canAcknowledgeResults={canAcknowledgeResults}
            />
          )}
          {activeTab === "observation_summary" && observationWorkflowActive && observationOpsClient ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {encounter.status === "OPEN" && canManageEncounterClosure ? (
                <DispositionReadinessBanner
                  encounterId={encounterId}
                  facilityId={facilityId}
                  refreshKey={`${String((encounter as { updatedAt?: string }).updatedAt ?? "")}-${encounterResultsRefresh}`}
                  onReadinessChange={handleDispositionReadiness}
                />
              ) : null}
              <ObservationDocumentationSummaryPanel
                snapshot={observationOpsClient}
                initialObservationReason={observationInitialReasonForSummary}
                resultsPendingCount={observationTrackboardOpsInput.resultsPendingCount ?? 0}
                criticalResultsUnacknowledged={Boolean(observationTrackboardOpsInput.criticalResultUnacknowledged)}
                dispositionReadiness={dispositionReadiness}
                formatDateTime={(iso) => formatEncounterChromeDateTime(iso, language)}
                t={t}
                encounterId={encounterId}
                facilityId={facilityId}
                medicationMarSummaryRefreshKey={medicationMarSummaryRefreshKey}
                marEncounterDigest={{
                  summary: observationMarEncounterDigest.summary,
                  loading: observationMarEncounterDigest.loading,
                  error: observationMarEncounterDigest.error,
                }}
              />
            </div>
          ) : null}
          {activeTab === "command_timeline" && facilityId ? (
            <div style={{ marginTop: 0 }}>
              <EnterpriseEncounterCommandTimeline
                encounterId={encounterId}
                facilityId={facilityId}
                refreshToken={clinicalTimelineRefresh}
              />
            </div>
          ) : null}
          {activeTab === "clinical_timeline" && observationWorkflowActive ? (
            <div style={{ marginTop: 0 }}>
              <EnterpriseEncounterCommandTimeline
                encounterId={encounterId}
                facilityId={facilityId}
                refreshToken={clinicalTimelineRefresh}
                embedded
                defaultViewMode="COMPACT"
                limit={40}
              />
            </div>
          ) : null}
          {activeTab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  backgroundColor: MEDORA_CARD_SHELL.background,
                  border: MEDORA_CARD_SHELL.border,
                  borderRadius: MEDORA_CARD_SHELL.radius,
                  boxShadow: MEDORA_CARD_SHELL.boxShadow,
                  padding: "16px 18px",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                  {t("encounterChrome.historyTabBlurb")}
                </p>
              </div>
              <BillingClassificationHistoryPanel
                transitions={(encounter as { billingClassificationTransitionJson?: unknown }).billingClassificationTransitionJson}
                currentClassification={(encounter as { billingClassification?: string }).billingClassification}
                createdAt={encounter.createdAt ?? null}
              />
              {auditTimelineLoading ? (
                <div style={{ fontSize: 14, color: "#64748b", padding: "4px 2px" }}>
                  {t("encounterChrome.historyLoading")}
                </div>
              ) : auditTimelineError ? (
                <div
                  role="alert"
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid #fecaca",
                    backgroundColor: "#fef2f2",
                    fontSize: 14,
                    color: "#b91c1c",
                    lineHeight: 1.5,
                  }}
                >
                  {auditTimelineError}
                </div>
              ) : (auditTimelineItems?.length ?? 0) === 0 ? (
                <div
                  style={{
                    backgroundColor: MEDORA_CARD_SHELL.background,
                    border: MEDORA_CARD_SHELL.border,
                    borderRadius: MEDORA_CARD_SHELL.radius,
                    boxShadow: MEDORA_CARD_SHELL.boxShadow,
                    padding: "20px 22px",
                    fontSize: 14,
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  {t("encounterChrome.historyEmpty")}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: MEDORA_CARD_SHELL.background,
                    border: MEDORA_CARD_SHELL.border,
                    borderRadius: MEDORA_CARD_SHELL.radius,
                    boxShadow: MEDORA_CARD_SHELL.boxShadow,
                    overflow: "hidden",
                  }}
                >
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {(auditTimelineItems ?? []).map((it, idx, arr) => (
                      <li
                        key={it.id}
                        style={{
                          padding: "14px 18px",
                          borderBottom: idx < arr.length - 1 ? "1px solid #e2e8f0" : "none",
                          fontSize: 14,
                          lineHeight: 1.45,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{it.shortLabel}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          {formatEncounterChromeDateTime(it.createdAt, language)}
                        </div>
                        {it.userDisplayFr ? (
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                            {t("encounterChrome.byPrefix")} {it.userDisplayFr}
                          </div>
                        ) : null}
                        {it.detailFr ? (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.45 }}>
                            {it.detailFr}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {showDischargeModal && (
        <div
          style={encounterWorkflowModalOverlay(2100)}
          onClick={() => setShowDischargeModal(false)}
          role="presentation"
        >
          <div
            style={{
              ...encounterWorkflowModalPanel(observationWorkflowActive ? 600 : 520),
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discharge-title"
          >
            <div style={{ flexShrink: 0, padding: "18px 24px 0" }}>
              <h2
                id="discharge-title"
                style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}
              >
                {observationWorkflowActive
                  ? t("encounterChrome.modals.dischargeTitleObservation")
                  : t("encounterChrome.modals.dischargeTitle")}
              </h2>
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                  {t("encounterChrome.modals.dischargeIntro")}
                </p>
              </div>
              {dischargeDraftRestoredAt ? (
                <p style={{ margin: "0 0 10px", color: "#0369a1", fontSize: 12, fontWeight: 600 }}>
                  {t("encounterChrome.modals.localDraftRestored")}
                </p>
              ) : null}
              {dischargeDraftSavedLocallyAt ? (
                <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 12 }}>
                  {t("encounterChrome.modals.localDraftSaved")}
                </p>
              ) : null}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 24px 8px" }}>
            {observationWorkflowActive ? (
              <details
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                }}
              >
                <summary
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#92400e",
                    cursor: "pointer",
                    listStyle: "none",
                  }}
                >
                  {t("observationDischarge.reminderDetailsSummary")}
                </summary>
                <p style={{ margin: "10px 0 10px 0", fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
                  {t("encounterChrome.modals.observationDischargeReminderFootnote")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#451a03", lineHeight: 1.5 }}>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderLos")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderReassessments")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderVitals")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderPendingResults")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderActiveMedsReviewed")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderMarComplete")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderPrnDocumented")}</li>
                  <li style={{ marginBottom: 4 }}>{t("encounterChrome.modals.observationDischargeReminderIvInfusionsAccounted")}</li>
                  <li style={{ marginBottom: 0 }}>{t("encounterChrome.modals.observationDischargeReminderCourse")}</li>
                </ul>
              </details>
            ) : null}
            {observationWorkflowActive ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  backgroundColor: "#f0fdf4",
                }}
              >
                <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
                  {t("observationDischarge.modalHelper")}
                </p>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#14532d", marginBottom: 8 }}>
                  {t("observationDischarge.outcomeTitle")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {(
                    [
                      "HOME",
                      "TRANSFER",
                      "AMA",
                      "DECEASED",
                      "LWBS",
                      "ELOPEMENT",
                      "OTHER",
                      "ADMISSION",
                    ] as readonly ErDispositionOutcomeUi[]
                  ).map((oid) => {
                    const outcomeDisabled =
                      isLocked || (!canEditNursingDischarge && !canEditMedicalDischarge);
                    const active = obsDischargeOutcomeUi === oid;
                    return (
                      <button
                        key={oid}
                        type="button"
                        disabled={outcomeDisabled}
                        onClick={() => {
                          setObsDischargeOutcomeUi(oid);
                          setDischargeForm((f) => ({ ...f, dischargeMode: outcomeUiToDischargeMode(oid) }));
                        }}
                        style={{
                          padding: "6px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 9999,
                          border: active ? "1px solid #22c55e" : "1px solid #cbd5e1",
                          backgroundColor: active ? "#dcfce7" : "#fff",
                          color: active ? "#14532d" : "#334155",
                          cursor: outcomeDisabled ? "not-allowed" : "pointer",
                          opacity: outcomeDisabled ? 0.65 : 1,
                        }}
                      >
                        {t(
                          (
                            {
                              HOME: "emergencyDisposition.outcomeHOME",
                              ADMISSION: "emergencyDisposition.outcomeADMISSION",
                              TRANSFER: "emergencyDisposition.outcomeTRANSFER",
                              AMA: "emergencyDisposition.outcomeAMA",
                              LWBS: "emergencyDisposition.outcomeLWBS",
                              ELOPEMENT: "emergencyDisposition.outcomeELOPEMENT",
                              DECEASED: "emergencyDisposition.outcomeDECEASED",
                              OTHER: "emergencyDisposition.outcomeOTHER",
                            } as const
                          )[oid]
                        )}
                      </button>
                    );
                  })}
                </div>
                {!isLocked && (canEditNursingDischarge || canEditMedicalDischarge) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {obsDischargeOutcomeUi === "TRANSFER" ? (
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{t("emergencyDisposition.labelTransferHandoff")}</span>
                        <textarea
                          value={obsDispositionSupplement.transferHandoffNote}
                          onChange={(e) =>
                            setObsDispositionSupplement((s) => ({ ...s, transferHandoffNote: e.target.value }))
                          }
                          rows={2}
                          placeholder={t("emergencyDisposition.transferPlaceholder")}
                          style={encounterWorkflowModalField(true)}
                        />
                      </label>
                    ) : null}
                    {obsDischargeOutcomeUi === "AMA" ? (
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{t("emergencyDisposition.labelAmaRisks")}</span>
                        <textarea
                          value={obsDispositionSupplement.amaRisksDiscussed}
                          onChange={(e) =>
                            setObsDispositionSupplement((s) => ({ ...s, amaRisksDiscussed: e.target.value }))
                          }
                          rows={2}
                          style={encounterWorkflowModalField(true)}
                        />
                      </label>
                    ) : null}
                    {obsDischargeOutcomeUi === "LWBS" ? (
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{t("emergencyDisposition.labelLwbs")}</span>
                        <textarea
                          value={obsDispositionSupplement.lwbsNarrative}
                          onChange={(e) =>
                            setObsDispositionSupplement((s) => ({ ...s, lwbsNarrative: e.target.value }))
                          }
                          rows={2}
                          placeholder={t("emergencyDisposition.lwbsPlaceholder")}
                          style={encounterWorkflowModalField(true)}
                        />
                      </label>
                    ) : null}
                    {obsDischargeOutcomeUi === "DECEASED" ? (
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{t("emergencyDisposition.labelDeceasedNotes")}</span>
                        <textarea
                          value={obsDispositionSupplement.deceasedPlaceholderNote}
                          onChange={(e) =>
                            setObsDispositionSupplement((s) => ({ ...s, deceasedPlaceholderNote: e.target.value }))
                          }
                          rows={2}
                          placeholder={t("emergencyDisposition.deceasedPlaceholder")}
                          style={encounterWorkflowModalField(true)}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {observationWorkflowActive && !isLocked && canEditMedicalDischarge ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #bae6fd",
                  backgroundColor: "#f0f9ff",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#0369a1", lineHeight: 1.45 }}>
                  {t("observationDischarge.insertSummaryHint")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const labels = {
                      draftBanner: t("observationDischarge.summaryDraft.banner"),
                      motifLabel: t("observationDischarge.summaryDraft.motifLabel"),
                      losLabel: t("observationDischarge.summaryDraft.losLabel"),
                      laneProviderLabel: t("observationDischarge.summaryDraft.laneProviderLabel"),
                      laneRnLabel: t("observationDischarge.summaryDraft.laneRnLabel"),
                      laneOverdue: t("observationDischarge.summaryDraft.laneOverdue"),
                      laneDue: t("observationDischarge.summaryDraft.laneDue"),
                      laneOk: t("observationDischarge.summaryDraft.laneOk"),
                      pendingLabel: t("observationDischarge.summaryDraft.pendingLabel"),
                      pendingNone: t("observationDischarge.summaryDraft.pendingNone"),
                      pendingCount: t("observationDischarge.summaryDraft.pendingCount"),
                      criticalLabsFlag: t("observationDischarge.summaryDraft.criticalLabsFlag"),
                      vitalsStale: t("observationDischarge.summaryDraft.vitalsStale"),
                      vitalsOk: t("observationDischarge.summaryDraft.vitalsOk"),
                      extended24h: t("observationDischarge.summaryDraft.extended24h"),
                    };
                    const readinessLineLabels =
                      observationOpsClient?.readinessLines
                        .filter((r) => r.active)
                        .map((r) => t(READINESS_LABEL_KEY[r.id])) ?? [];
                    const draft = buildObservationSummaryDraft(
                      observationOpsClient ?? null,
                      Number(encounter.trackboardOps?.resultsPendingCount ?? 0),
                      Boolean(encounter.trackboardOps?.criticalResultUnacknowledged),
                      motif,
                      labels,
                      { readinessLineLabels }
                    );
                    setDischargeForm((f) => ({
                      ...f,
                      disposition: appendQuickNoteToField(f.disposition, draft),
                    }));
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "1px solid #7dd3fc",
                    backgroundColor: "#fff",
                    color: "#0c4a6e",
                    cursor: "pointer",
                  }}
                >
                  {t("observationDischarge.insertSummaryButton")}
                </button>
              </div>
            ) : null}
            {observationWorkflowActive ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t("observationDischarge.sectionProviderClinical")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {renderDischargeFieldRow("disposition", "medical", 2)}
                    {renderDischargeFieldRow("dischargeInstructions", "medical", 3)}
                    {renderDischargeFieldRow("medicationsGiven", "medical", 3)}
                  </div>
                </div>
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t("observationDischarge.sectionFollowUp")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {renderDischargeFieldRow("followUp", "medical", 2)}
                  </div>
                </div>
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t("observationDischarge.sectionNursing")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {renderDischargeFieldRow("exitCondition", "nursing", 2)}
                    {renderDischargeFieldRow("returnIfWorse", "nursing", 2)}
                    {renderDischargeFieldRow("patientDestination", "nursing", 2)}
                  </div>
                </div>
              </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {OBSERVATION_DISCHARGE_FIELD_ROWS.map(([key, kind, rows]) =>
                renderDischargeFieldRow(key as keyof DischargeFormState, kind, rows)
              )}
            </div>
            )}
            {!observationWorkflowActive ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.dischargeMode")}
                  {!canEditNursingDischarge || isLocked ? (
                    <span style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 6 }}>
                      {t("encounterChrome.modals.readOnly")}
                    </span>
                  ) : null}
                </span>
                <select
                  disabled={!canEditNursingDischarge || isLocked}
                  value={dischargeForm.dischargeMode}
                  onChange={(e) => setDischargeForm((f) => ({ ...f, dischargeMode: e.target.value }))}
                  style={{
                    ...encounterWorkflowModalField(canEditNursingDischarge && !isLocked),
                    cursor: !canEditNursingDischarge || isLocked ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">{t("encounterChrome.modals.selectPlaceholder")}</option>
                  {DISCHARGE_MODE_OPTIONS_FR.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  padding: "8px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  backgroundColor: "#f8fafc",
                }}
              >
                <span style={{ fontWeight: 600, color: "#334155" }}>{t("encounterChrome.modals.dischargeMode")}: </span>
                {dischargeForm.dischargeMode.trim()
                  ? localizedErDischargeModeLabel(dischargeForm.dischargeMode, obsDispositionSupplement, language)
                  : t("encounterChrome.modals.selectPlaceholder")}
              </div>
            )}
            </div>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
                padding: "14px 24px 18px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#fafafa",
              }}
            >
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                style={encounterWorkflowModalBtnSecondary(false)}
              >
                {t("encounterChrome.modals.cancel")}
              </button>
              <button
                type="button"
                onClick={submitDischargeAndConfirmClose}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                }}
              >
                {t("encounterChrome.modals.continueToClose")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmissionModal && (
        <div
          style={encounterWorkflowModalOverlay(2150)}
          onClick={() => !savingAdmission && setShowAdmissionModal(false)}
          role="presentation"
        >
          <div
            style={{
              ...encounterWorkflowModalPanel(560),
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admission-title"
          >
            <h2
              id="admission-title"
              style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 600, color: "#5b21b6", lineHeight: 1.3 }}
            >
              {t("encounterChrome.modals.admissionTitle")}
            </h2>
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                backgroundColor: "#faf5ff",
                border: "1px solid #e9d5ff",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                {t("encounterChrome.modals.admissionIntro")}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.admissionReason")}
                </span>
                <textarea
                  value={admissionForm.admissionReason}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, admissionReason: e.target.value }))}
                  rows={2}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.serviceUnit")}
                </span>
                <input
                  type="text"
                  value={admissionForm.serviceUnit}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, serviceUnit: e.target.value }))}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.admissionDiagnosis")}
                </span>
                <textarea
                  value={admissionForm.admissionDiagnosis}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, admissionDiagnosis: e.target.value }))}
                  rows={2}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.careLevel")}
                </span>
                <input
                  type="text"
                  list="medora-care-level-suggestions"
                  placeholder={t("encounterChrome.modals.admissionField.careLevelPlaceholder")}
                  value={admissionForm.careLevel}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, careLevel: e.target.value }))}
                  style={encounterWorkflowModalField(true)}
                />
                <datalist id="medora-care-level-suggestions">
                  {CARE_LEVEL_OPTIONS_FR.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.conditionAtAdmission")}
                </span>
                <textarea
                  value={admissionForm.conditionAtAdmission}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, conditionAtAdmission: e.target.value }))}
                  rows={3}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.initialPlan")}
                </span>
                <textarea
                  value={admissionForm.initialPlan}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, initialPlan: e.target.value }))}
                  rows={3}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {t("encounterChrome.modals.admissionField.responsiblePhysician")}
                </span>
                <input
                  type="text"
                  value={admissionForm.responsiblePhysicianName}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, responsiblePhysicianName: e.target.value }))}
                  style={encounterWorkflowModalField(true)}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={savingAdmission}
                onClick={() => setShowAdmissionModal(false)}
                style={encounterWorkflowModalBtnSecondary(savingAdmission)}
              >
                {t("encounterChrome.modals.cancel")}
              </button>
              <button
                type="button"
                disabled={savingAdmission}
                onClick={() => void submitAdmission()}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#6d28d9",
                  color: "white",
                  cursor: savingAdmission ? "not-allowed" : "pointer",
                  opacity: savingAdmission ? 0.85 : 1,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                }}
              >
                {savingAdmission ? "…" : t("encounterChrome.modals.saveAdmission")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ObservationOrderTemplateModal
        open={showObservationOrderTemplateModal}
        encounterId={encounterId}
        facilityId={facilityId}
        existingTemplateItemIds={existingObservationTemplateItemIds}
        onClose={() => setShowObservationOrderTemplateModal(false)}
        onOrdersCreated={refreshAfterOrderCreated}
      />

      <ObservationReassessmentModal
        open={observationReassessmentModalRole !== null}
        defaultRole={observationReassessmentModalRole ?? "PROVIDER"}
        encounterId={encounterId}
        facilityId={facilityId}
        encounterStatus={typeof encounter?.status === "string" ? encounter.status : null}
        onClose={() => setObservationReassessmentModalRole(null)}
        onSaved={refreshObservationClinicalSurfaces}
      />

      <ObservationContinueObservationQuickModal
        open={showContinueObservationQuickModal}
        encounterId={encounterId}
        facilityId={facilityId}
        encounterStatus={typeof encounter?.status === "string" ? encounter.status : null}
        onClose={() => setShowContinueObservationQuickModal(false)}
        onSaved={refreshObservationClinicalSurfaces}
      />

      {facilityId && encounter && showRoomAssignmentModal ? (
        <RoomAssignmentModal
          open
          facilityId={facilityId}
          encounter={{
            id: encounter.id,
            roomLabel: encounter.roomLabel,
            type: encounter.type,
            admissionSummaryJson: encounter.admissionSummaryJson,
          }}
          onClose={() => setShowRoomAssignmentModal(false)}
          onSaved={(patch) => {
            setEncounter((prev: typeof encounter) =>
              prev ? applyEncounterRoomAssignmentUpdate(prev, patch) : prev
            );
            if (facilityId) {
              dispatchEncounterRoomAssignmentRefresh({
                encounterId: encounter.id,
                facilityId,
                patch,
              });
            }
            void loadEncounter({ silent: true });
          }}
        />
      ) : null}

      {showCloseConfirmModal && (
        <div
          style={encounterWorkflowModalOverlay(2000)}
          onClick={() => !closingEncounter && setShowCloseConfirmModal(false)}
          role="presentation"
        >
          <div
            style={encounterWorkflowModalPanel(420)}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-encounter-confirm-title"
          >
            <h2
              id="close-encounter-confirm-title"
              style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}
            >
              {t("encounterChrome.modals.closeEncounterTitle")}
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#475569", lineHeight: 1.55 }}>
              {t("encounterChrome.modals.closeEncounterBody")}
            </p>
            {dispositionReadiness && !dispositionReadiness.canClose ? (
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: closingEncounter ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={ackDispositionSafety}
                  disabled={closingEncounter}
                  onChange={(e) => setAckDispositionSafety(e.target.checked)}
                />
                <span>{t("dispositionReadiness.overrideCheckbox")}</span>
              </label>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => {
                  setShowCloseConfirmModal(false);
                  setPendingDischarge(null);
                  setAckDispositionSafety(false);
                }}
                style={encounterWorkflowModalBtnSecondary(closingEncounter)}
              >
                {t("encounterChrome.modals.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  closingEncounter ||
                  Boolean(dispositionReadiness && !dispositionReadiness.canClose && !ackDispositionSafety)
                }
                onClick={() => void runCloseDocumentationCheckAndProceed()}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#b91c1c",
                  color: "white",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                  opacity: closingEncounter ? 0.85 : 1,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                }}
              >
                {closingEncounter ? "…" : t("encounterChrome.modals.finish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocumentationDeficiencyModal && (
        <div
          style={encounterWorkflowModalOverlay(2100)}
          onClick={() => {
            if (!closingEncounter) {
              setShowDocumentationDeficiencyModal(false);
              setDocumentationDeficiencies([]);
              setAckDispositionSafety(false);
            }
          }}
          role="presentation"
        >
          <div
            style={{
              ...encounterWorkflowModalPanel(480),
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="documentation-deficiency-title"
          >
            <h2
              id="documentation-deficiency-title"
              style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}
            >
              {t("encounterChrome.modals.documentationDeficiencyTitle")}
            </h2>
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "#92400e", lineHeight: 1.55, fontWeight: 600 }}>
                {t("encounterChrome.modals.documentationDeficiencyLead")}
              </p>
            </div>
            <ul
              style={{
                margin: "0 0 18px 0",
                padding: "12px 14px 12px 28px",
                fontSize: 14,
                color: "#334155",
                lineHeight: 1.55,
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              {documentationDeficiencies.map((d) => {
                const k = `encounterChrome.modals.documentationDeficiencies.${d.code}`;
                const v = t(k);
                const fallback =
                  v !== k ? v : language === "en" ? d.code.replace(/_/g, " ") : d.labelFr;
                const navLabel = documentationDeficiencyNavigateButtonLabel(d.code, tabs, t);
                return (
                  <li key={d.code} style={{ marginBottom: 10 }}>
                    <div style={{ marginBottom: navLabel ? 6 : 0 }}>{fallback}</div>
                    {navLabel ? (
                      <button
                        type="button"
                        disabled={closingEncounter}
                        onClick={() => handleDocumentationDeficiencyNavigate(d.code)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#1d4ed8",
                          cursor: closingEncounter ? "not-allowed" : "pointer",
                          opacity: closingEncounter ? 0.65 : 1,
                        }}
                      >
                        {navLabel}
                      </button>
                    ) : null}
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
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: closingEncounter ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={ackDispositionSafety}
                  disabled={closingEncounter}
                  onChange={(e) => setAckDispositionSafety(e.target.checked)}
                />
                <span>{t("dispositionReadiness.overrideCheckbox")}</span>
              </label>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => {
                  setShowDocumentationDeficiencyModal(false);
                  setDocumentationDeficiencies([]);
                  setAckDispositionSafety(false);
                }}
                style={encounterWorkflowModalBtnSecondary(closingEncounter)}
              >
                {t("encounterChrome.modals.backToChart")}
              </button>
              <button
                type="button"
                disabled={
                  closingEncounter ||
                  Boolean(dispositionReadiness && !dispositionReadiness.canClose && !ackDispositionSafety)
                }
                onClick={() => void executeCloseEncounter(true, ackDispositionSafety)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#57534e",
                  color: "white",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                  opacity: closingEncounter ? 0.85 : 1,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                }}
              >
                {closingEncounter ? "…" : t("encounterChrome.modals.closeAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EncounterSummaryTab({
  encounter,
  showPrintDischarge,
  onPrintDischarge,
  onPrintEncounterPreview,
}: {
  encounter: any;
  showPrintDischarge: boolean;
  onPrintDischarge: () => void;
  /** Phase 5C — encounter-level live chart preview action; gated by chart-read RBAC. */
  onPrintEncounterPreview?: () => void;
}) {
  const { t, language } = useI18n();
  const reason = encounter.visitReason || encounter.chiefComplaint;
  const nursingLines = nursingAssessmentDisplayLines(encounter?.nursingAssessment, language);
  const nursingSig = nursingAssessmentSignatureForLocale(encounter?.nursingAssessment, language, t);
  const physicianDocSections = parsePhysicianEvalV1ForChart(encounter?.nursingAssessment, language);
  const dischargePreview = parseDischargeSummaryForChart(encounter?.dischargeSummaryJson);
  const admissionPreview = parseAdmissionSummaryForChart(encounter?.admissionSummaryJson);
  const summaryCard: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
    padding: "18px 20px",
  };
  const summaryMutedBlock: React.CSSProperties = {
    marginTop: 10,
    padding: "12px 14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    whiteSpace: "pre-wrap",
  };
  const summaryMutedBlockBlue: React.CSSProperties = {
    ...summaryMutedBlock,
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={summaryCard}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>
          {t("encounterChrome.summaryTab.title")}
        </h3>
        <p style={{ color: "#64748b", fontSize: 13, margin: "8px 0 0 0", lineHeight: 1.5 }}>
          {t("encounterChrome.summaryTab.intro")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14, color: "#334155", marginTop: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "#0f172a" }}>{t("encounterChrome.summaryTab.assignedPhysician")}:</strong>{" "}
            {formatEncounterProviderAssigned(encounter)}
          </div>
          {reason && (
            <div style={{ gridColumn: "1 / -1" }}>
              <strong style={{ color: "#0f172a" }}>{t("encounterChrome.summaryTab.chiefComplaint")}:</strong> {reason}
            </div>
          )}
          {nursingLines.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <strong style={{ color: "#0f172a" }}>{t("encounterChrome.summaryTab.nursingSynthesis")}</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "#334155", lineHeight: 1.5 }}>
                {nursingLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {nursingSig ? (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>{nursingSig}</div>
              ) : null}
            </div>
          )}
          {encounter.followUpDate && (
            <div style={{ gridColumn: "1 / -1" }}>
              <strong style={{ color: "#0f172a" }}>{t("encounterChrome.summaryTab.followUpDate")}:</strong>{" "}
              {formatEncounterChromeDate(encounter.followUpDate, language)}
            </div>
          )}
        </div>
      </div>
      {physicianDocSections.length > 0 && (
        <div style={summaryCard}>
          <strong style={{ fontSize: 15, color: "#0f172a" }}>
            {t("encounterChrome.summaryTab.physicianDocSections")}
          </strong>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            {physicianDocSections.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{s.label}</div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "#334155", marginTop: 4, lineHeight: 1.5 }}>
                  {s.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(encounter.clinicianImpression || encounter.providerNote) && (
        <div style={summaryCard}>
          <strong style={{ fontSize: 15, color: "#0f172a" }}>{t("encounterChrome.summaryTab.impression")}</strong>
          <div style={{ ...summaryMutedBlock, marginTop: 10, color: "#334155", fontSize: 14, lineHeight: 1.55 }}>
            {encounter.clinicianImpression || encounter.providerNote}
          </div>
        </div>
      )}
      {encounter.treatmentPlan && (
        <div style={summaryCard}>
          <strong style={{ fontSize: 15, color: "#0f172a" }}>{t("encounterChrome.summaryTab.treatmentPlan")}</strong>
          <div style={{ ...summaryMutedBlockBlue, marginTop: 10, color: "#334155", fontSize: 14, lineHeight: 1.55 }}>
            {encounter.treatmentPlan}
          </div>
        </div>
      )}
      {(admissionPreview || encounter.admittedAt) && (
        <div style={summaryCard}>
          <strong style={{ fontSize: 15, color: "#6a1b9a" }}>{t("encounterChrome.summaryTab.admissionDecision")}</strong>
          {encounter.admittedAt ? (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              {t("encounterChrome.summaryTab.recordedOn")}{" "}
              {formatEncounterChromeDateTime(encounter.admittedAt, language)}
            </div>
          ) : null}
          {admissionPreview ? (
            <div
              style={{
                marginTop: 10,
                padding: "14px 16px",
                backgroundColor: "#faf5ff",
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
                color: "#334155",
                border: "1px solid #e9d5ff",
                borderLeft: "4px solid #6a1b9a",
              }}
            >
              {admissionPreview.admissionReason ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.admissionReason")}: </span>
                  {admissionPreview.admissionReason}
                </div>
              ) : null}
              {admissionPreview.serviceUnit ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.serviceUnit")}: </span>
                  {admissionPreview.serviceUnit}
                </div>
              ) : null}
              {admissionPreview.admissionDiagnosis ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.admissionDiagnosis")}: </span>
                  {admissionPreview.admissionDiagnosis}
                </div>
              ) : null}
              {admissionPreview.careLevel ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.careLevel")}: </span>
                  {admissionPreview.careLevel}
                </div>
              ) : null}
              {admissionPreview.conditionAtAdmission ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.conditionAtAdmission")}: </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{admissionPreview.conditionAtAdmission}</span>
                </div>
              ) : null}
              {admissionPreview.initialPlan ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.initialPlan")}: </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{admissionPreview.initialPlan}</span>
                </div>
              ) : null}
              {admissionPreview.responsiblePhysicianName ? (
                <div>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.responsiblePhysician")}: </span>
                  {admissionPreview.responsiblePhysicianName}
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748b" }}>
              {t("encounterChrome.summaryTab.admissionIncompleteHint")}
            </p>
          )}
        </div>
      )}
      {onPrintEncounterPreview && (
        <div style={summaryCard}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 15, color: "#0f172a" }}>
              {t("encounterChrome.summaryTab.encounterChartPreviewSection")}
            </strong>
            <button
              type="button"
              onClick={onPrintEncounterPreview}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                color: "#0f172a",
                cursor: "pointer",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              }}
            >
              {t("encounterChrome.summaryTab.printEncounterChartPreview")}
            </button>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#757575",
              lineHeight: 1.45,
            }}
          >
            {t("encounterChrome.summaryTab.printEncounterChartPreviewHint")}
          </p>
        </div>
      )}
      {showPrintDischarge && (
        <div style={summaryCard}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: dischargePreview ? 10 : 0,
            }}
          >
            <strong style={{ fontSize: 15, color: "#0f172a" }}>{t("encounterChrome.summaryTab.dischargeSection")}</strong>
            <button
              type="button"
              onClick={onPrintDischarge}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                color: "#0f172a",
                cursor: "pointer",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              }}
            >
              {t("encounterChrome.summaryTab.printDischarge")}
            </button>
          </div>
          {dischargePreview ? (
            <div
              style={{
                marginTop: 4,
                padding: "14px 16px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
                color: "#334155",
              }}
            >
              {dischargePreview.disposition ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewDisposition")}: </span>
                  {dischargePreview.disposition}
                </div>
              ) : null}
              {dischargePreview.exitCondition ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewExitCondition")}: </span>
                  {dischargePreview.exitCondition}
                </div>
              ) : null}
              {dischargePreview.dischargeInstructions ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewInstructions")}: </span>
                  {dischargePreview.dischargeInstructions}
                </div>
              ) : null}
              {dischargePreview.medicationsGiven ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewMedications")}: </span>
                  {dischargePreview.medicationsGiven}
                </div>
              ) : null}
              {dischargePreview.followUp ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewFollowUp")}: </span>
                  {dischargePreview.followUp}
                </div>
              ) : null}
              {dischargePreview.returnIfWorse ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewReturnIfWorse")}: </span>
                  {dischargePreview.returnIfWorse}
                </div>
              ) : null}
              {dischargePreview.patientDestination ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewDestination")}: </span>
                  {dischargePreview.patientDestination}
                </div>
              ) : null}
              {dischargePreview.dischargeMode ? (
                <div>
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.summaryTab.dischargePreviewMode")}: </span>
                  {dischargePreview.dischargeMode}
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              {t("encounterChrome.summaryTab.noStructuredDischargeHint")}
            </p>
          )}
        </div>
      )}
      {encounter.notes && (
        <div style={summaryCard}>
          <strong style={{ fontSize: 15, color: "#0f172a" }}>{t("encounterChrome.summaryTab.nurseNotesOther")}</strong>
          <div style={{ ...summaryMutedBlock, marginTop: 10, color: "#334155", fontSize: 14, lineHeight: 1.55 }}>
            {encounter.notes}
          </div>
        </div>
      )}
    </div>
  );
}


/** Aligné sur la validation serveur avant signature de l’évaluation médicale. */
function encounterHasSignableProviderContentForUi(enc: {
  clinicianImpression?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
}): boolean {
  const note = (enc.clinicianImpression || enc.providerNote || "").trim();
  const plan = (enc.treatmentPlan || "").trim();
  if (note || plan) return true;
  const raw = enc.nursingAssessment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const pe = (raw as Record<string, unknown>).physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return false;
  const o = pe as Record<string, unknown>;
  return ["hpi", "ros", "physicalExam", "mdm"].some(
    (k) => typeof o[k] === "string" && (o[k] as string).trim().length > 0
  );
}

function parsePhysicianEvalV1FromEncounter(enc: { nursingAssessment?: unknown } | null | undefined): {
  hpi: string;
  ros: string;
  physicalExam: string;
  mdm: string;
} {
  const raw = enc?.nursingAssessment;
  const pe =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as { physicianEvalV1?: unknown }).physicianEvalV1
      : null;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) {
    return { hpi: "", ros: "", physicalExam: "", mdm: "" };
  }
  const o = pe as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    hpi: s(o.hpi),
    ros: s(o.ros),
    physicalExam: s(o.physicalExam),
    mdm: s(o.mdm),
  };
}

function ClinicVisitTab({
  encounter,
  facilityId,
  onUpdate,
  canSignProviderDocumentation,
  observationMdmGuidanceActive = false,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
  canSignProviderDocumentation: boolean;
  observationMdmGuidanceActive?: boolean;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const impressionSnippetKeys = [
    "encounterClinicTab.snippetImpression0",
    "encounterClinicTab.snippetImpression1",
    "encounterClinicTab.snippetImpression2",
    "encounterClinicTab.snippetImpression3",
    "encounterClinicTab.snippetImpression4",
  ] as const;
  const planSnippetKeys = [
    "encounterClinicTab.snippetPlan0",
    "encounterClinicTab.snippetPlan1",
    "encounterClinicTab.snippetPlan2",
    "encounterClinicTab.snippetPlan3",
    "encounterClinicTab.snippetPlan4",
  ] as const;
  const observationMdmSnippetKeys = [
    "encounterClinicTab.observationMdmSnippetContinuedRationale",
    "encounterClinicTab.observationMdmSnippetResponseToTreatment",
    "encounterClinicTab.observationMdmSnippetPendingResultsReviewed",
    "encounterClinicTab.observationMdmSnippetDischargeReadiness",
  ] as const;
  const [visitReason, setVisitReason] = useState(encounter.visitReason || encounter.chiefComplaint || "");
  const [impression, setImpression] = useState(encounter.clinicianImpression || encounter.providerNote || "");
  const [plan, setPlan] = useState(encounter.treatmentPlan || "");
  const [followUp, setFollowUp] = useState(
    encounter.followUpDate ? new Date(encounter.followUpDate).toISOString().slice(0, 10) : ""
  );
  const [hpi, setHpi] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).hpi);
  const [ros, setRos] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).ros);
  const [physicalExam, setPhysicalExam] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).physicalExam);
  const [mdm, setMdm] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).mdm);
  const [providerActiveTemplateId, setProviderActiveTemplateId] = useState<ProviderDocumentationTemplateId | null>(
    () => readProviderDocumentationWorkspaceMetadata(encounter.nursingAssessment)?.activeTemplateId ?? null
  );
  const [providerWorkspaceDraft, setProviderWorkspaceDraft] = useState<ProviderDocumentationWorkspaceState>(() =>
    hydrateProviderDocumentationWorkspaceState({ encounter })
  );
  const [saving, setSaving] = useState(false);
  const [signingDoc, setSigningDoc] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [addendumText, setAddendumText] = useState("");
  const [addendumSaving, setAddendumSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "queued" | "err"; text: string } | null>(null);
  const readOnly = encounter.status !== "OPEN";
  const docSigned = isEncounterLocked(encounter);
  const fieldsLocked = readOnly || docSigned;
  const showLegacyProviderDocumentation = false;

  const providerWorkspaceValue = providerWorkspaceDraft;

  const setProviderWorkspaceValue = useCallback((next: ProviderDocumentationWorkspaceState) => {
    setProviderWorkspaceDraft(next);
    setProviderActiveTemplateId(next.activeTemplateId);
    setVisitReason(next.reasonForVisit || next.chiefComplaint);
    setHpi(next.hpi);
    setRos(
      [next.rosFocusedImpression, next.rosImportantPositives, next.rosImportantNegatives, next.rosRedFlags]
        .filter(Boolean)
        .join("\n")
    );
    setPhysicalExam(
      [
        next.physicalExam.general,
        next.physicalExam.heent,
        next.physicalExam.cardiovascular,
        next.physicalExam.respiratory,
        next.physicalExam.abdomen,
        next.physicalExam.neuroPsych,
        next.physicalExam.musculoskeletal,
        next.physicalExam.skin,
      ]
        .filter(Boolean)
        .join("\n")
    );
    setMdm(
      [
        next.mdmWorkingAssessment,
        next.mdmDifferentialSynthesis,
        next.mdmDataReviewed,
        next.mdmRiskLevel,
        next.mdmClinicalRationale,
        next.mdmPlanSummary,
        next.mdmImmediateActionsRationale,
        next.mdmConsultsDiscussed,
        next.mdmAdmitObserveDischarge,
      ]
        .filter(Boolean)
        .join("\n")
    );
    setImpression(next.clinicalImpression);
    setPlan(next.treatmentPlan);
  }, []);

  const clinicEncounterSyncRef = useRef({
    encounterId: encounter.id,
    docSigned: isEncounterLocked(encounter),
  });

  const syncClinicFieldsFromEncounter = useCallback((enc: typeof encounter) => {
    setVisitReason(enc.visitReason || enc.chiefComplaint || "");
    setImpression(enc.clinicianImpression || enc.providerNote || "");
    setPlan(enc.treatmentPlan || "");
    setFollowUp(enc.followUpDate ? new Date(enc.followUpDate).toISOString().slice(0, 10) : "");
    const pe = parsePhysicianEvalV1FromEncounter(enc);
    setProviderActiveTemplateId(
      readProviderDocumentationWorkspaceMetadata(enc.nursingAssessment)?.activeTemplateId ?? null
    );
    setProviderWorkspaceDraft(hydrateProviderDocumentationWorkspaceState({ encounter: enc }));
    setHpi(pe.hpi);
    setRos(pe.ros);
    setPhysicalExam(pe.physicalExam);
    setMdm(pe.mdm);
  }, []);

  useEffect(() => {
    const docSignedNow = isEncounterLocked(encounter);
    const sync = clinicEncounterSyncRef.current;
    const encounterChanged = sync.encounterId !== encounter.id;
    const signStateChanged = sync.docSigned !== docSignedNow;

    if (encounterChanged || signStateChanged) {
      sync.encounterId = encounter.id;
      sync.docSigned = docSignedNow;
      syncClinicFieldsFromEncounter(encounter);
    }
  }, [
    encounter,
    encounter.id,
    encounter.nursingAssessment,
    encounter.providerDocumentationStatus,
    encounter.providerDocumentationSignedAt,
    syncClinicFieldsFromEncounter,
  ]);

  const handleAddAddendum = async () => {
    const trimmed = addendumText.trim();
    if (!trimmed) return;
    setMessage(null);
    setAddendumSaving(true);
    try {
      await apiFetch(`/encounters/${encounter.id}/provider-addenda`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      setAddendumText("");
      setMessage({ type: "ok", text: t("encounterClinicTab.toastAddendumSaved") });
      onUpdate();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("encounterClinicTab.errSave"),
      });
    } finally {
      setAddendumSaving(false);
    }
  };

  const handleSignDocumentation = async () => {
    setMessage(null);
    setSigningDoc(true);
    try {
      await apiFetch(`/encounters/${encounter.id}/sign-provider-documentation`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestationAccepted: true }),
      });
      setMessage({ type: "ok", text: t("encounterClinicTab.toastSigned") });
      onUpdate();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("encounterClinicTab.errSign"),
      });
    } finally {
      setSigningDoc(false);
    }
  };

  const handleUnlockDocumentation = async () => {
    setMessage(null);
    setUnlocking(true);
    try {
      const reason = unlockReason.trim();
      await apiFetch(`/encounters/${encounter.id}/unlock-provider-documentation`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      setShowUnlockModal(false);
      setUnlockReason("");
      setMessage({ type: "ok", text: t("encounterClinicTab.toastUnlocked") });
      onUpdate();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("encounterClinicTab.errUnlock"),
      });
    } finally {
      setUnlocking(false);
    }
  };

  const save = async () => {
    setMessage(null);
    setSaving(true);
    try {
      let savedByDisplayName = t("erMseProviderPanel.defaultSignerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* fallback only */
      }
      const providerPayload = buildProviderDocumentationSavePayload({
        previousNursingAssessment: encounter.nursingAssessment,
        state: providerWorkspaceValue,
        metadata: buildProviderDocumentationMetadata({
          encounterMode: "OBSERVATION",
          savedAt: new Date().toISOString(),
          savedBy: savedByDisplayName,
          activeTemplateId: providerWorkspaceValue.activeTemplateId,
        }),
      });
      const payload: Record<string, unknown> = {
        ...providerPayload,
        followUpDate: followUp ? new Date(followUp + "T12:00:00").toISOString() : null,
      };

      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setMessage({
        type: queued ? "queued" : "ok",
        text: queued ? t("encounterClinicTab.toastSavedQueued") : t("encounterClinicTab.toastSaved"),
      });
      onUpdate();
    } catch (e: any) {
      setMessage({
        type: "err",
        text: normalizeUserFacingError(e?.message, language) || t("encounterClinicTab.errSave"),
      });
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const clinicShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };
  const clinicField: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: fieldsLocked ? "#f8fafc" : "#fff",
  };
  const clinicSelect: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: fieldsLocked ? "#f8fafc" : "#fff",
    minWidth: 200,
  };
  const clinicSnippetBtn: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#f8fafc",
    color: "#334155",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const clinicDateInput: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: fieldsLocked ? "#f8fafc" : "#fff",
  };

  return (
    <div style={{ maxWidth: "none", display: "flex", flexDirection: "column", gap: 16 }}>
      <ProviderDocumentationWorkspace
        encounterId={encounter.id}
        encounterMode="OBSERVATION"
        value={providerWorkspaceValue}
        onChange={setProviderWorkspaceValue}
        onSave={save}
        onSign={canSignProviderDocumentation && !readOnly ? handleSignDocumentation : undefined}
        onClear={() => setProviderWorkspaceValue(emptyProviderDocumentationWorkspaceState())}
        saving={saving}
        signing={signingDoc}
        readOnly={fieldsLocked}
        lockedMessage={
          docSigned
            ? t("erMseProviderPanel.lockedDocumentation")
            : readOnly
              ? t("erMseProviderPanel.readOnlyEncounter")
              : null
        }
        saveMessage={
          message
            ? {
                variant: message.type === "err" ? "error" : message.type === "queued" ? "queued" : "success",
                text: message.text,
              }
            : null
        }
        keyInformation={[
          observationMdmGuidanceActive
            ? t("encounterClinicTab.observationMdmGuidanceTitle")
            : t("encounterClinicTab.title"),
        ]}
        encounterSummary={[
          encounter.type ? tEncounterType(t, encounter.type) : t("common.dash"),
          encounter.status ? tEncounterStatus(t, encounter.status) : t("common.dash"),
        ]}
        savedMetadata={readProviderDocumentationWorkspaceMetadata(encounter.nursingAssessment)}
        signedMetadata={
          docSigned && encounter.providerDocumentationSignedByDisplayFr && encounter.providerDocumentationSignedAt
            ? {
                signedBy: encounter.providerDocumentationSignedByDisplayFr,
                signedAt: new Date(encounter.providerDocumentationSignedAt).toLocaleString(dateLocale),
              }
            : null
        }
        signedOrFinalized={docSigned}
        t={t}
      />
      <div style={{ ...clinicShell, padding: "16px 18px" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
          {t("encounterClinicTab.title")}
        </h3>
      </div>
      {docSigned &&
      encounter.providerDocumentationSignedByDisplayFr &&
      encounter.providerDocumentationSignedAt ? (
        <div
          role="status"
          style={{
            ...clinicShell,
            padding: "14px 16px",
            backgroundColor: "#eff6ff",
            border: "1px solid #93c5fd",
            fontSize: 14,
            color: "#1e3a8a",
            lineHeight: 1.45,
          }}
        >
          {(() => {
            const dt = new Date(encounter.providerDocumentationSignedAt).toLocaleString(dateLocale);
            const tmpl = t("encounterClinicTab.signedBanner").replace("{datetime}", dt);
            const parts = tmpl.split("{name}");
            if (parts.length === 2) {
              return (
                <>
                  {parts[0]}
                  <strong>{encounter.providerDocumentationSignedByDisplayFr}</strong>
                  {parts[1]}
                </>
              );
            }
            return (
              <>
                {tmpl.replace("{name}", encounter.providerDocumentationSignedByDisplayFr)}
              </>
            );
          })()}
        </div>
      ) : null}
      {docSigned && canSignProviderDocumentation && !readOnly ? (
        <div
          style={{
            ...clinicShell,
            padding: "12px 16px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            border: "1px solid #fde68a",
            backgroundColor: "#fffbeb",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.45, maxWidth: 480 }}>
            {t("encounterClinicTab.unlockHint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setUnlockReason("");
              setShowUnlockModal(true);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #d97706",
              backgroundColor: "#fff",
              color: "#92400e",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t("encounterClinicTab.unlockChart")}
          </button>
        </div>
      ) : null}
      {(encounter.providerAddenda ?? []).length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {(encounter.providerAddenda ?? []).map((ad: { id: string; text: string; createdAt: string; createdByDisplayFr?: string | null }) => (
            <div
              key={ad.id}
              style={{
                ...clinicShell,
                marginBottom: 12,
                padding: "14px 16px",
                backgroundColor: "#f8fafc",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {(() => {
                  const dt = new Date(ad.createdAt).toLocaleString(dateLocale);
                  const tmpl = t("encounterClinicTab.addendumByLine").replace("{datetime}", dt);
                  const parts = tmpl.split("{name}");
                  if (parts.length === 2) {
                    return (
                      <>
                        {parts[0]}
                        <strong>{ad.createdByDisplayFr ?? "—"}</strong>
                        {parts[1]}
                      </>
                    );
                  }
                  return <>{tmpl.replace("{name}", ad.createdByDisplayFr ?? "—")}</>;
                })()}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{ad.text}</div>
            </div>
          ))}
        </div>
      ) : null}
      {docSigned && canSignProviderDocumentation && !readOnly ? (
        <div style={{ ...clinicShell, padding: "16px 18px" }}>
          <h4 style={{ marginTop: 0, marginBottom: 10, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {t("encounterClinicTab.addendumSectionTitle")}
          </h4>
          <textarea
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            rows={4}
            maxLength={5000}
            style={{ ...clinicField, marginBottom: 10 }}
            placeholder={t("encounterClinicTab.addendumPlaceholder")}
          />
          <button
            type="button"
            onClick={() => void handleAddAddendum()}
            disabled={addendumSaving || !addendumText.trim()}
            style={{
              padding: "10px 18px",
              backgroundColor: "#334155",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: addendumSaving || !addendumText.trim() ? "not-allowed" : "pointer",
              opacity: addendumSaving || !addendumText.trim() ? 0.65 : 1,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
            }}
          >
            {addendumSaving ? t("encounterClinicTab.addendumSaving") : t("encounterClinicTab.addendumSave")}
          </button>
        </div>
      ) : null}
      {showLegacyProviderDocumentation ? (
        <>
          <div style={{ ...clinicShell, padding: "12px 16px" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
              {readOnly ? t("encounterClinicTab.helperClosed") : t("encounterClinicTab.helperOpen")}
            </p>
          </div>
          <div style={{ ...clinicShell, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelVisitReason")}
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <select
            disabled={fieldsLocked}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) setVisitReason(v);
            }}
            style={clinicSelect}
            aria-label={t("encounterClinicTab.visitReasonAria")}
          >
            <option value="">{t("encounterClinicTab.commonReasonsPlaceholder")}</option>
            {COMMON_VISIT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <input
          disabled={fieldsLocked}
          value={visitReason}
          onChange={(e) => setVisitReason(e.target.value)}
          style={clinicField}
          placeholder={t("encounterClinicTab.visitReasonPlaceholder")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelHpi")}
        </label>
        <textarea
          disabled={fieldsLocked}
          value={hpi}
          onChange={(e) => setHpi(e.target.value)}
          rows={4}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderHpi")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelRos")}
        </label>
        <textarea
          disabled={fieldsLocked}
          value={ros}
          onChange={(e) => setRos(e.target.value)}
          rows={4}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderRos")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelPhysicalExam")}
        </label>
        <textarea
          disabled={fieldsLocked}
          value={physicalExam}
          onChange={(e) => setPhysicalExam(e.target.value)}
          rows={4}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderPhysicalExam")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelMdm")}
        </label>
        {observationMdmGuidanceActive ? (
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
              {t("encounterClinicTab.observationMdmGuidanceTitle")}
            </div>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("encounterClinicTab.observationMdmGuidanceFootnote")}
            </p>
            {!fieldsLocked && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>{t("encounterClinicTab.observationMdmGuidanceInsert")}</span>
                {observationMdmSnippetKeys.map((snippetKey) => {
                  const snippet = t(snippetKey);
                  return (
                    <button
                      key={snippetKey}
                      type="button"
                      onClick={() => setMdm((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
                      style={clinicSnippetBtn}
                      title={snippet}
                    >
                      {snippet.length > 40 ? snippet.slice(0, 39) + "…" : snippet}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
        <textarea
          disabled={fieldsLocked}
          value={mdm}
          onChange={(e) => setMdm(e.target.value)}
          rows={4}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderMdm")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelImpression")}
        </label>
        {!fieldsLocked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
              {t("encounterClinicTab.insertLabel")}
            </span>
            {impressionSnippetKeys.map((snippetKey) => {
              const snippet = t(snippetKey);
              return (
                <button
                  key={snippetKey}
                  type="button"
                  onClick={() => setImpression((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
                  style={clinicSnippetBtn}
                  title={snippet}
                >
                  {snippet.length > 36 ? snippet.slice(0, 35) + "…" : snippet}
                </button>
              );
            })}
          </div>
        )}
        <textarea
          disabled={fieldsLocked}
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          rows={4}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderImpression")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelPlan")}
        </label>
        {!fieldsLocked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
              {t("encounterClinicTab.insertLabel")}
            </span>
            {planSnippetKeys.map((snippetKey) => {
              const snippet = t(snippetKey);
              return (
                <button
                  key={snippetKey}
                  type="button"
                  onClick={() => setPlan((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
                  style={clinicSnippetBtn}
                  title={snippet}
                >
                  {snippet.length > 36 ? snippet.slice(0, 35) + "…" : snippet}
                </button>
              );
            })}
          </div>
        )}
        <textarea
          disabled={fieldsLocked}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={5}
          style={clinicField}
          placeholder={t("encounterClinicTab.placeholderPlan")}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" }}>
          {t("encounterClinicTab.labelFollowUpDate")}
        </label>
        <input
          type="date"
          disabled={fieldsLocked}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          style={clinicDateInput}
        />
      </div>
      </div>
        </>
      ) : null}
      <div style={{ ...clinicShell, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      {message && (
        <p
          role={message.type === "queued" ? "alert" : undefined}
          style={{
            margin: 0,
            color:
              message.type === "ok" ? "#15803d" : message.type === "queued" ? "#b91c1c" : "#b91c1c",
            fontWeight: message.type === "queued" ? 600 : undefined,
            lineHeight: 1.45,
            fontSize: 14,
          }}
        >
          {message.text}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        {showLegacyProviderDocumentation && !readOnly && !docSigned && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "10px 24px",
              backgroundColor: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
            }}
          >
            {saving ? t("encounterClinicTab.saving") : t("encounterClinicTab.saveVisit")}
          </button>
        )}
        {showLegacyProviderDocumentation && canSignProviderDocumentation && !readOnly && !docSigned && (
          <button
            type="button"
            onClick={() => void handleSignDocumentation()}
            disabled={
              signingDoc || !encounterHasSignableProviderContentForUi(encounter)
            }
            style={{
              padding: "10px 24px",
              backgroundColor: "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor:
                signingDoc || !encounterHasSignableProviderContentForUi(encounter)
                  ? "not-allowed"
                  : "pointer",
              opacity: signingDoc || !encounterHasSignableProviderContentForUi(encounter) ? 0.65 : 1,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
            }}
          >
            {signingDoc ? t("encounterClinicTab.signing") : t("encounterClinicTab.signDocumentation")}
          </button>
        )}
      </div>
      </div>
      {showUnlockModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-chart-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 85,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              borderRadius: 14,
              backgroundColor: MEDORA_CARD_SHELL.background,
              border: MEDORA_CARD_SHELL.border,
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
              padding: "22px 24px",
              boxSizing: "border-box",
            }}
          >
            <h2 id="unlock-chart-title" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
              {t("encounterClinicTab.unlockModalTitle")}
            </h2>
            <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
              {t("encounterClinicTab.unlockModalBody")}
            </p>
            <label
              style={{ display: "block", marginTop: 14, fontSize: 13, fontWeight: 600, color: "#334155" }}
              htmlFor="unlock-chart-reason"
            >
              {t("encounterClinicTab.unlockReasonLabel")}
            </label>
            <textarea
              id="unlock-chart-reason"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
              maxLength={2000}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                color: "#0f172a",
              }}
              placeholder={t("encounterClinicTab.unlockReasonPlaceholder")}
            />
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={unlocking}
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason("");
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#334155",
                  cursor: unlocking ? "wait" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={unlocking}
                onClick={() => void handleUnlockDocumentation()}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#c2410c",
                  color: "#fff",
                  cursor: unlocking ? "wait" : "pointer",
                }}
              >
                {unlocking ? t("encounterClinicTab.unlocking") : t("encounterClinicTab.unlockConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TriageVitalsTab({
  encounter,
  facilityId,
  onUpdate,
  isLocked,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
  isLocked: boolean;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [triage, setTriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const vitals = (triage?.vitalsJson as any) || {};
  const [formData, setFormData] = useState({
    chiefComplaint: "",
    onsetAt: "",
    esi: "",
    tempC: "",
    hr: "",
    rr: "",
    bpSys: "",
    bpDia: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    tempInputUnit: "C" as "C" | "F",
    weightInputUnit: "kg" as "kg" | "lb",
    heightInputMode: "cm" as "cm" | "ftin",
    heightFeet: "",
    heightInches: "",
    allergyNote: "",
    strokeScreen: "",
    sepsisScreen: "",
    triageCompleteAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  useEffect(() => {
    void loadTriage();
  }, [encounter.id, facilityId, language]);

  const loadTriage = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      setTriage(data);
      if (data) {
        const d = data as Record<string, unknown>;
        const parsed = triagePreviewSliceFromTriageGet(d, language);
        const s = parsed?.slice;
        const v = (data.vitalsJson || {}) as Record<string, number | string | null>;
        setFormData({
          chiefComplaint: (data.chiefComplaint as string) || "",
          onsetAt: data.onsetAt ? new Date(data.onsetAt).toISOString().slice(0, 16) : "",
          esi: data.esi?.toString() || "",
          tempC: s?.tempC ?? v.tempC?.toString() ?? "",
          hr: v.hr?.toString() ?? "",
          rr: v.rr?.toString() ?? "",
          bpSys: v.bpSys?.toString() ?? "",
          bpDia: v.bpDia?.toString() ?? "",
          spo2: v.spo2?.toString() ?? "",
          weightKg: s?.weightKg ?? v.weightKg?.toString() ?? "",
          heightCm: s?.heightCm ?? v.heightCm?.toString() ?? "",
          tempInputUnit: s?.tempInputUnit ?? "C",
          weightInputUnit: s?.weightInputUnit ?? "kg",
          heightInputMode: s?.heightInputMode ?? "cm",
          heightFeet: s?.heightFeet ?? "",
          heightInches: s?.heightInches ?? "",
          allergyNote:
            (data.vitalsJson as { allergyNote?: string | null } | null | undefined)?.allergyNote ?? "",
          strokeScreen: data.strokeScreen ? JSON.stringify(data.strokeScreen, null, 2) : "",
          sepsisScreen: data.sepsisScreen ? JSON.stringify(data.sepsisScreen, null, 2) : "",
          triageCompleteAt: data.triageCompleteAt ? new Date(data.triageCompleteAt).toISOString().slice(0, 16) : "",
        });
      }
    } catch (error) {
      console.error("Failed to load triage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveFeedback(null);

    const screenWarnings: string[] = [];

    let strokeScreenParsed: unknown = null;
    if (formData.strokeScreen.trim()) {
      try {
        strokeScreenParsed = JSON.parse(formData.strokeScreen);
      } catch {
        strokeScreenParsed = null;
        screenWarnings.push(t("encounterTriageTab.warnStrokeJson"));
      }
    }

    let sepsisScreenParsed: unknown = null;
    if (formData.sepsisScreen.trim()) {
      try {
        sepsisScreenParsed = JSON.parse(formData.sepsisScreen);
      } catch {
        sepsisScreenParsed = null;
        screenWarnings.push(t("encounterTriageTab.warnSepsisJson"));
      }
    }

    try {
      const erV1 = erTriageV1FormFromVitalsJson(triage?.vitalsJson ?? null);
      const vitalsMerged = mergeVitalsJsonForSave(triage?.vitalsJson, {
        tempC: formData.tempC,
        hr: formData.hr,
        rr: formData.rr,
        bpSys: formData.bpSys,
        bpDia: formData.bpDia,
        spo2: formData.spo2,
        weightKg: formData.weightKg,
        heightCm: formData.heightCm,
        allergyNote: formData.allergyNote,
        erV1,
        tempInputUnit: formData.tempInputUnit,
        weightInputUnit: formData.weightInputUnit,
        heightInputMode: formData.heightInputMode,
        heightFeet: formData.heightFeet,
        heightInches: formData.heightInches,
        painScore: erV1.painScale0to10 ?? "",
      });

      const lastKnownTriageUpdatedAt =
        triage?.updatedAt
          ? typeof triage.updatedAt === "string"
            ? triage.updatedAt
            : new Date(triage.updatedAt).toISOString()
          : null;

      const payload: any = {
        chiefComplaint: formData.chiefComplaint || null,
        onsetAt: formData.onsetAt ? new Date(formData.onsetAt).toISOString() : null,
        esi: formData.esi ? parseInt(formData.esi) : null,
        vitalsJson: vitalsMerged,
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: formData.triageCompleteAt ? new Date(formData.triageCompleteAt).toISOString() : null,
        lastKnownTriageUpdatedAt,
      };

      const res = await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
      if (
        patientIdForEvent &&
        triage &&
        hasVitalsJson(triage.vitalsJson) &&
        triage.id
      ) {
        const u = triage.updatedAt;
        supersededSnapshot = {
          encounterId: encounter.id,
          encounterType: encounter.type ?? "—",
          triageId: triage.id,
          updatedAt: typeof u === "string" ? u : new Date(u).toISOString(),
          triageCompleteAt: triage.triageCompleteAt
            ? new Date(triage.triageCompleteAt).toISOString()
            : null,
          vitalsJson: { ...(triage.vitalsJson as object) } as Record<string, unknown>,
        };
      }
      if (patientIdForEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId: patientIdForEvent, supersededSnapshot },
          })
        );
      }

      loadTriage();
      onUpdate();
      const baseMsg = (res as any)?.queued
        ? t("encounterTriageTab.savedQueued")
        : t("encounterTriageTab.saved");
      setSaveFeedback({
        text: screenWarnings.length ? `${baseMsg} ${screenWarnings.join(" ")}` : baseMsg,
        isError: false,
      });
    } catch (error) {
      console.error("Save error:", error);
      if (isTriageStaleConflictError(error)) {
        /**
         * Stale-token 409: another user saved between our load and save. Local form state is
         * preserved so the clinician keeps their draft; they refresh and re-apply if needed.
         */
        setSaveFeedback({ text: t("erTriage.panel.staleConflict"), isError: true });
      } else {
        setSaveFeedback({ text: t("encounterTriageTab.saveFailed"), isError: true });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>{t("encounterTriageTab.loading")}</div>;
  }

  const triageUpdatedLine =
    triage?.updatedByDisplayFr?.trim() && triage.updatedAt
      ? t("encounterTriageTab.lastUpdatedBy")
          .replace("{name}", triage.updatedByDisplayFr.trim())
          .replace("{datetime}", new Date(triage.updatedAt).toLocaleString(dateLocale))
      : null;

  return (
    <div>
      <h3 style={{ marginBottom: triageUpdatedLine ? 8 : undefined }}>{t("encounterTriageTab.title")}</h3>
      {triageUpdatedLine ? (
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#424242" }}>{triageUpdatedLine}</p>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("encounterTriageTab.chiefComplaint")}
          </label>
          <input
            type="text"
            value={formData.chiefComplaint}
            onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("encounterTriageTab.onsetAt")}
          </label>
          <input
            type="datetime-local"
            value={formData.onsetAt}
            onChange={(e) => setFormData({ ...formData, onsetAt: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("encounterTriageTab.esiLabel")}
          </label>
          <select
            value={formData.esi}
            onChange={(e) => setFormData({ ...formData, esi: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          >
            <option value="">{t("encounterTriageTab.esiChoose")}</option>
            <option value="1">{t("encounterTriageTab.esi1")}</option>
            <option value="2">{t("encounterTriageTab.esi2")}</option>
            <option value="3">{t("encounterTriageTab.esi3")}</option>
            <option value="4">{t("encounterTriageTab.esi4")}</option>
            <option value="5">{t("encounterTriageTab.esi5")}</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("encounterTriageTab.triageCompleteAt")}
          </label>
          <input
            type="datetime-local"
            value={formData.triageCompleteAt}
            onChange={(e) => setFormData({ ...formData, triageCompleteAt: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      </div>

      <h4 style={{ marginTop: 24, marginBottom: 16 }}>{t("encounterTriageTab.valuesHeading")}</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("vitalsUnits.tempLabel")}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={formData.tempInputUnit}
              onChange={(e) => {
                const u = e.target.value as "C" | "F";
                setFormData({ ...formData, tempInputUnit: u });
              }}
              disabled={formDisabled}
              style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, fontWeight: 600 }}
            >
              <option value="F">{t("vitalsUnits.unitF")}</option>
              <option value="C">{t("vitalsUnits.unitC")}</option>
            </select>
            <input
              type="number"
              step="0.1"
              value={formData.tempC}
              onChange={(e) => setFormData({ ...formData, tempC: e.target.value })}
              disabled={formDisabled}
              style={{ flex: 1, minWidth: 0, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          {(() => {
            if (!formData.tempC.trim()) return null;
            const pair = temperatureHintPairCelsiusFahrenheit(formData.tempC, formData.tempInputUnit);
            if (!pair) return null;
            return (
              <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#666" }}>
                {formData.tempInputUnit === "F"
                  ? t("vitalsUnits.tempHintC").replace("{n}", pair.celsius.toFixed(1))
                  : t("vitalsUnits.tempHintF").replace("{n}", pair.fahrenheit.toFixed(1))}
              </p>
            );
          })()}
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.heartRate")}</label>
          <input
            type="number"
            value={formData.hr}
            onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.respiratoryRate")}</label>
          <input
            type="number"
            value={formData.rr}
            onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.bpSys")}</label>
          <input
            type="number"
            value={formData.bpSys}
            onChange={(e) => setFormData({ ...formData, bpSys: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.bpDia")}</label>
          <input
            type="number"
            value={formData.bpDia}
            onChange={(e) => setFormData({ ...formData, bpDia: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.spo2")}</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.spo2}
            onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
            disabled={formDisabled}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("vitalsUnits.weightLabel")}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={formData.weightInputUnit}
              onChange={(e) => {
                const u = e.target.value as "kg" | "lb";
                setFormData({ ...formData, weightInputUnit: u });
              }}
              disabled={formDisabled}
              style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, fontWeight: 600 }}
            >
              <option value="lb">{t("vitalsUnits.unitLb")}</option>
              <option value="kg">{t("vitalsUnits.unitKg")}</option>
            </select>
            <input
              type="number"
              step="0.1"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              disabled={formDisabled}
              style={{ flex: 1, minWidth: 0, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          {(() => {
            if (!formData.weightKg.trim()) return null;
            const pair = weightHintPairKgPounds(formData.weightKg, formData.weightInputUnit);
            if (!pair) return null;
            return (
              <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#666" }}>
                {formData.weightInputUnit === "lb"
                  ? t("vitalsUnits.weightHintKg").replace("{n}", pair.kg.toFixed(1))
                  : t("vitalsUnits.weightHintLb").replace("{n}", pair.pounds.toFixed(1))}
              </p>
            );
          })()}
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("vitalsUnits.heightLabel")}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={formData.heightInputMode}
              onChange={(e) => {
                const m = e.target.value as "cm" | "ftin";
                const h = flipHeightInputMode({
                  heightCmStr: formData.heightCm,
                  heightFeetStr: formData.heightFeet,
                  heightInchesStr: formData.heightInches,
                  from: formData.heightInputMode,
                  to: m,
                });
                setFormData({ ...formData, heightInputMode: m, ...h });
              }}
              disabled={formDisabled}
              style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, fontWeight: 600 }}
            >
              <option value="ftin">{t("vitalsUnits.unitFtIn")}</option>
              <option value="cm">{t("vitalsUnits.unitCm")}</option>
            </select>
            {formData.heightInputMode === "cm" ? (
              <input
                type="number"
                step="0.1"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                disabled={formDisabled}
                style={{ flex: 1, minWidth: 0, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder={t("vitalsUnits.feetPh")}
                  value={formData.heightFeet}
                  onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value })}
                  disabled={formDisabled}
                  style={{ width: 72, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                />
                <span style={{ fontSize: 12, color: "#666" }}>′</span>
                <input
                  type="number"
                  min={0}
                  max={11.9}
                  step={0.1}
                  placeholder={t("vitalsUnits.inchesPh")}
                  value={formData.heightInches}
                  onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                  disabled={formDisabled}
                  style={{ width: 72, padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
                />
                <span style={{ fontSize: 12, color: "#666" }}>″</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("encounterTriageTab.allergyNote")}</label>
        <textarea
          value={formData.allergyNote}
          onChange={(e) => setFormData({ ...formData, allergyNote: e.target.value })}
          disabled={formDisabled}
          maxLength={2000}
          rows={4}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, minHeight: 80 }}
        />
      </div>

      {!formDisabled && (
        <div style={{ marginTop: 24 }}>
          {saveFeedback && (
            <div
              style={{
                marginBottom: 10,
                color: saveFeedback.isError ? "#c62828" : "#2e7d32",
                fontSize: 13,
              }}
            >
              {saveFeedback.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? t("encounterTriageTab.saving") : t("encounterTriageTab.save")}
          </button>
        </div>
      )}
      {formDisabled && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fff3cd", borderRadius: 4, color: "#856404" }}>
          {isReadOnly ? t("encounterTriageTab.readOnlyClosed") : t("encounterTriageTab.readOnlySigned")}
        </div>
      )}
    </div>
  );
}

function NotesTab({
  encounter,
  facilityId,
  onUpdate,
  isLocked,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
  isLocked: boolean;
}) {
  const { t } = useI18n();
  const noteSnippets = useMemo(
    () =>
      t("encounterChrome.notesTab.snippets")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [t]
  );
  const [notes, setNotes] = useState(encounter.notes || "");
  const [saving, setSaving] = useState(false);
  const notesReadOnly = encounter.status !== "OPEN" || isLocked;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      onUpdate();
      alert(queued ? t("encounterChrome.notesTab.saveQueued") : t("encounterChrome.notesTab.saveOk"));
    } catch (error) {
      alert(t("encounterChrome.notesTab.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const notesShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...notesShell, padding: "16px 18px" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{t("encounterChrome.tabs.notes")}</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 0 0", lineHeight: 1.45 }}>
          {t("encounterChrome.notesTab.shortcutsBelow")}
        </p>
      </div>
      <div style={{ ...notesShell, padding: "16px 18px" }}>
        {notesReadOnly ? (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              backgroundColor: "#fffbeb",
              borderRadius: 10,
              border: "1px solid #fde68a",
              fontSize: 13,
              color: "#92400e",
              lineHeight: 1.45,
            }}
          >
            {t("encounterChrome.notesTab.readOnlyHint")}
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
          {!notesReadOnly && noteSnippets.length > 0 ? (
            <span style={{ fontSize: 13, color: "#64748b" }}>{t("encounterChrome.notesTab.insertLabel")}</span>
          ) : null}
          {noteSnippets.slice(0, 6).map((snippet) => (
            <button
              key={snippet.slice(0, 20)}
              type="button"
              disabled={notesReadOnly}
              onClick={() => setNotes((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#f8fafc",
                color: "#334155",
                cursor: notesReadOnly ? "not-allowed" : "pointer",
                opacity: notesReadOnly ? 0.65 : 1,
                whiteSpace: "nowrap",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
              title={snippet}
            >
              {snippet.length > 32 ? snippet.slice(0, 31) + "…" : snippet}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          readOnly={notesReadOnly}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 14,
            color: "#0f172a",
            background: notesReadOnly ? "#f8fafc" : "#fff",
            cursor: notesReadOnly ? "not-allowed" : "text",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
          placeholder={t("encounterChrome.notesTab.placeholder")}
        />
        <button
          onClick={handleSave}
          disabled={saving || notesReadOnly}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving || notesReadOnly ? "not-allowed" : "pointer",
            opacity: saving || notesReadOnly ? 0.6 : 1,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
        >
          {saving ? t("encounterChrome.notesTab.saving") : t("encounterChrome.notesTab.save")}
        </button>
      </div>
    </div>
  );
}

function PathwaysTab({
  encounterId,
  encounter,
  facilityId,
  onUpdate,
  isLocked,
}: {
  encounterId: string;
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
  isLocked: boolean;
}) {
  const { t, language } = useI18n();
  const [pathway, setPathway] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Use the timer hook - no more polling needed!
  const { milestoneViews, summary } = usePathwayTimers(pathway, {
    autoMarkMissedInUI: true,
  });

  useEffect(() => {
    loadPathway();
  }, [encounterId, facilityId]);

  const loadPathway = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/pathways`, { facilityId });
      setPathway(data && typeof data === "object" && !Array.isArray(data) ? data : null);
    } catch (error) {
      console.error("Failed to load pathway:", error);
      setPathway(null);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (type: string) => {
    if (
      !confirm(
        t("encounterChrome.pathways.confirmActivate").replace("{type}", tPathwayType(t, type))
      )
    )
      return;
    setActivating(true);
    try {
      await apiFetch(`/encounters/${encounterId}/pathways/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        facilityId,
      });
      await loadPathway();
      onUpdate(); // Refresh encounter
    } catch (error: any) {
      alert(
        `${t("encounterChrome.pathways.activateFailed")} ${
          normalizeUserFacingError(error?.message, language) || t("encounterChrome.pathways.confirmUnknownError")
        }`
      );
    } finally {
      setActivating(false);
    }
  };

  const handlePause = async () => {
    if (!pathway?.id) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/pause`, {
        method: "POST",
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert(t("encounterChrome.pathways.pauseFailed"));
    }
  };

  const handleComplete = async () => {
    if (!pathway?.id) return;
    if (!confirm(t("encounterChrome.pathways.completeConfirm"))) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/complete`, {
        method: "POST",
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert(t("encounterChrome.pathways.completeFailed"));
    }
  };

  const handleMarkMilestone = async (milestoneId: string) => {
    if (!pathway?.id) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "MET" }),
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert(t("encounterChrome.pathways.milestoneFailed"));
    }
  };

  const jumpToNextDue = () => {
    if (!summary?.nextDue) return;
    const nextDueId = summary.nextDue.id;
    const el = rowRefs.current[nextDueId];
    if (!el) return;

    // Set flash state
    setFlashId(nextDueId);
    setTimeout(() => {
      setFlashId((cur) => (cur === nextDueId ? null : cur));
    }, 1500);

    // Scroll to element
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "16px 18px",
          backgroundColor: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {t("encounterChrome.pathways.loading")}
      </div>
    );
  }

  const pathwayControlsLocked = encounter.status !== "OPEN" || isLocked;

  const pathwayShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...pathwayShell, padding: "16px 18px" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
          {t("encounterChrome.pathways.titleEd")}
        </h3>
      </div>
      {!pathway ? (
        <div style={{ ...pathwayShell, padding: "18px 20px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#334155", lineHeight: 1.55 }}>
            {t("encounterChrome.pathways.noActive")}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["STROKE", "SEPSIS", "STEMI", "TRAUMA"].map((type) => (
              <button
                key={type}
                onClick={() => handleActivate(type)}
                disabled={activating || pathwayControlsLocked}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#1d4ed8",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: activating || pathwayControlsLocked ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: activating || pathwayControlsLocked ? 0.6 : 1,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
                }}
              >
                {t("encounterChrome.pathways.activate")} {tPathwayType(t, type)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...pathwayShell, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                  {t("encounterChrome.pathways.pathwayLabel")} {tPathwayType(t, pathway.type)} –{" "}
                  {tPathwayStatus(t, pathway.status)}
                </h4>
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  {t("encounterChrome.pathways.activatedOn")}{" "}
                  {formatEncounterChromeDateTime(pathway.activatedAt, language)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {pathway.status === "ACTIVE" && (
                  <button
                    onClick={handlePause}
                    disabled={pathwayControlsLocked}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ea580c",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      cursor: pathwayControlsLocked ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    {t("encounterChrome.pathways.pause")}
                  </button>
                )}
                {pathway.status !== "COMPLETED" && (
                  <button
                    onClick={handleComplete}
                    disabled={pathwayControlsLocked}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#15803d",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      cursor: pathwayControlsLocked ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    {t("encounterChrome.pathways.complete")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...pathwayShell, padding: "16px 18px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              {t("encounterChrome.pathways.milestonesTitle")}
            </h4>
            {summary && (
              <PathwaySessionSummaryBar
                summary={summary}
                pathwayStatus={pathway.status}
                onJumpToNextDue={jumpToNextDue}
              />
            )}
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
              {(Array.isArray(milestoneViews) ? milestoneViews : []).map((milestone) => (
                <PathwayMilestoneRow
                  key={milestone.id}
                  ref={(el) => {
                    rowRefs.current[milestone.id] = el;
                  }}
                  milestone={milestone}
                  pathwayStatus={pathway.status}
                  onMarkMet={handleMarkMilestone}
                  pathwayControlsLocked={pathwayControlsLocked}
                  isNextDue={summary?.nextDue?.id === milestone.id}
                  isFlashing={flashId === milestone.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Aligné sur `assertCanTransition(…, CANCELLED)` côté serveur — ordre parent. */
function canAttemptWholeOrderCancel(order: { status?: string; pendingSync?: boolean }, encounterOpen: boolean): boolean {
  if (!encounterOpen) return false;
  if (order.pendingSync) return false;
  const st = order.status ?? "";
  if (st === "CANCELLED") return false;
  if (
    st === "COMPLETED" ||
    st === "RESULTED" ||
    st === "VERIFIED" ||
    st === "IN_PROGRESS" ||
    st === "STARTED"
  ) {
    return false;
  }
  return true;
}

function CareOrderItemClinicalTimeBlock({
  it,
  order,
  language,
  t,
  canAdjustClinicalTime,
  encounterOpen,
  onOpenAdjust,
}: {
  it: Record<string, unknown>;
  order: { type?: string; id?: string };
  language: string;
  t: (key: string) => string;
  canAdjustClinicalTime: boolean;
  encounterOpen: boolean;
  onOpenAdjust: () => void;
}) {
  const { effectiveIso, documentedIso, showAdjustedBadge } = resolveCareProcedureDisplayTimes(
    it as Parameters<typeof resolveCareProcedureDisplayTimes>[0]
  );
  const showClock = canShowCareProcedureClinicalTimeClock(String(order.type ?? ""), it as Parameters<typeof canShowCareProcedureClinicalTimeClock>[1], {
    encounterOpen,
    canAdjust: canAdjustClinicalTime,
  });
  if (!effectiveIso && !documentedIso && !showClock) return null;
  return (
    <div style={{ marginTop: 4 }}>
      {!effectiveIso && showClock ? (
        <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          <span>{t("encounterChrome.ordersTab.careClinicalTime.adjustClinicalTime")}</span>
          <button
            type="button"
            title={t("encounterChrome.ordersTab.careClinicalTime.adjustClinicalTime")}
            aria-label={t("encounterChrome.ordersTab.careClinicalTime.adjustClinicalTime")}
            onClick={onOpenAdjust}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            🧭
          </button>
        </div>
      ) : null}
      {effectiveIso ? (
        <CareEffectiveTimeRow>
          <span>
            {formatEncounterChromeDateTime(effectiveIso, language as "fr" | "en")}
          </span>
          {showAdjustedBadge ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#64748b",
                backgroundColor: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 9999,
                padding: "1px 6px",
                lineHeight: 1.35,
              }}
            >
              {t("encounterChrome.ordersTab.careClinicalTime.adjustedBadge")}
            </span>
          ) : null}
          {showClock ? (
            <button
              type="button"
              title={t("encounterChrome.ordersTab.careClinicalTime.adjustClinicalTime")}
              aria-label={t("encounterChrome.ordersTab.careClinicalTime.adjustClinicalTime")}
              onClick={onOpenAdjust}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              🧭
            </button>
          ) : null}
        </CareEffectiveTimeRow>
      ) : null}
      {documentedIso && documentedIso !== effectiveIso ? (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          {t("encounterChrome.ordersTab.careClinicalTime.documentedAt").replace(
            "{datetime}",
            formatEncounterChromeDateTime(documentedIso, language as "fr" | "en")
          )}
        </div>
      ) : null}
    </div>
  );
}

function CareEffectiveTimeRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "#0f766e",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}


function OrdersTab({
  encounterId,
  encounter,
  facilityId,
  canPrescribe,
  roles,
  medicationModalRequestTick = 0,
  careModalRequestTick = 0,
  careModalPresetLabel = null,
  onOrdersUpdated,
  onRefetchEncounter,
}: {
  encounterId: string;
  encounter: any;
  facilityId: string;
  canPrescribe: boolean;
  roles: string[];
  medicationModalRequestTick?: number;
  careModalRequestTick?: number;
  careModalPresetLabel?: string | null;
  onOrdersUpdated?: () => void | Promise<void>;
  onRefetchEncounter?: () => Promise<void>;
}) {
  const { t, language } = useI18n();
  const orderItemLineLabel = (it: any) => getOrderItemDisplayLabelFromLocale(it, language);
  const clinicalData = useEncounterClinicalData();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProcedureLauncher, setShowProcedureLauncher] = useState(false);
  const [procedureLauncherInitialStep, setProcedureLauncherInitialStep] =
    useState<ErProcedureLauncherStep | null>(null);
  const [documentedProcedureTypes, setDocumentedProcedureTypes] = useState<string[]>([]);
  const [createModalInitialTab, setCreateModalInitialTab] = useState<OrderModalTab>("LAB");
  /** Libellé CARE à injecter uniquement à l’ouverture via action rapide (évite de réutiliser un ancien preset avec une ordonnance). */
  const [carePresetForOpenModal, setCarePresetForOpenModal] = useState<string | null>(null);
  const isRn = roles.includes("RN") || roles.includes("ADMIN");
  const governancePermission = useMemo(
    () => auditMedicationOrderGovernancePermissions({ canPrescribeProp: canPrescribe, roles }),
    [canPrescribe, roles]
  );
  const effectiveCanPrescribe = governancePermission.effectiveCanPrescribe;
  const canAdjustCareClinicalTime = canAdjustCareProcedureClinicalTime(roles);
  const canUseRnOrderAuthority = roles.includes("RN") && !effectiveCanPrescribe;
  const canCreateOrders = canPrescribe || canUseRnOrderAuthority;
  const canOpenProcedureDocumentation =
    canPrescribe || roles.includes("RN") || roles.includes("ADMIN");
  const canCancelWholeOrder =
    roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN");
  const encounterOpen = encounter?.status === "OPEN";
  const encounterSigned = encounter?.providerDocumentationStatus === "SIGNED";
  const displayOrders = useMemo(() => ordersExcludingObservationTemplate(orders), [orders]);
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [ordersFeedback, setOrdersFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [careClinicalTimeModal, setCareClinicalTimeModal] = useState<{
    orderId: string;
    item: Record<string, unknown>;
    orderCreatedAt: string;
  } | null>(null);
  const [careClinicalTimeSaving, setCareClinicalTimeSaving] = useState(false);

  const handlePrintRx = (order: any) => {
    if (order.type !== "MEDICATION") return;
    printRx({
      order: {
        createdAt: order.createdAt,
        prescriberName: order.prescriberName,
        prescriberLicense: order.prescriberLicense,
        prescriberContact: order.prescriberContact,
        authority: order.authority ?? { source: order.source },
        createdByDisplay: order.createdByDisplay,
        lastActionDisplay: order.lastActionDisplay,
        items: order.items || [],
      },
      patient: encounter?.patient ?? {},
      language,
    });
  };

  useEffect(() => {
    if (!clinicalData) return;
    perfClinicalDataLog("Orders tab using shared orders cache");
    setOrders(clinicalData.orders as any[]);
    const awaitingFirstPayload = clinicalData.orders.length === 0;
    setLoading(clinicalData.loading.orders && awaitingFirstPayload && !manualRefreshing);
  }, [
    clinicalData,
    clinicalData.orders,
    clinicalData.loading.orders,
    manualRefreshing,
  ]);

  useEffect(() => {
    const hasEnterpriseCareLines = (displayOrders as Array<{
      type?: string;
      items?: Array<{ enterpriseProcedureId?: string | null }>;
    }>).some(
      (order) =>
        order.type === "CARE" &&
        Array.isArray(order.items) &&
        order.items.some(
          (it) => typeof it.enterpriseProcedureId === "string" && it.enterpriseProcedureId.trim().length > 0
        )
    );
    if (!hasEnterpriseCareLines || !encounterId || !facilityId) {
      setDocumentedProcedureTypes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/procedures`, { facilityId });
        if (!cancelled) setDocumentedProcedureTypes(parseEncounterDocumentedProcedureTypes(data));
      } catch {
        if (!cancelled) setDocumentedProcedureTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [displayOrders, encounterId, facilityId]);

  const openProcedureDocumentation = (step: ErProcedureLauncherStep) => {
    setProcedureLauncherInitialStep(step);
    setShowProcedureLauncher(true);
  };

  const loadOrders = async (opts?: { silent?: boolean; manual?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    if (opts?.manual) setManualRefreshing(true);
    try {
      await clinicalData.refresh("orders", { reason: opts?.manual ? "manual" : "load", force: true });
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      if (!opts?.silent) setLoading(false);
      if (opts?.manual) setManualRefreshing(false);
    }
  };

  const refreshOrdersAfterMutation = async () => {
    await clinicalData.refresh("orderMutation", { reason: "mutation", force: true });
    await onOrdersUpdated?.();
  };

  const confirmCancelWholeOrder = async (payload: CancelOrderConfirmPayload) => {
    if (!cancelConfirmOrderId || cancelSubmitting) return;
    setCancelSubmitting(true);
    setOrdersFeedback(null);
    try {
      await apiFetch(`/orders/${cancelConfirmOrderId}/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: payload.cancellationReason,
          ...(payload.cancellationDetails ? { cancellationDetails: payload.cancellationDetails } : {}),
        }),
      });
      setCancelConfirmOrderId(null);
      setOrdersFeedback({ type: "ok", text: t("encounterChrome.ordersTab.orderCanceledOk") });
      await refreshOrdersAfterMutation();
      await onRefetchEncounter?.();
    } catch (e: unknown) {
      setOrdersFeedback({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterChrome.ordersTab.cancelFailed"),
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  useEffect(() => {
    if (medicationModalRequestTick <= 0 || !canCreateOrders) return;
    setCreateModalInitialTab("MEDICATION");
    setCarePresetForOpenModal(null);
    setShowCreateModal(true);
  }, [medicationModalRequestTick, canCreateOrders]);

  useEffect(() => {
    if (careModalRequestTick <= 0 || !canCreateOrders) return;
    setCreateModalInitialTab("CARE");
    setCarePresetForOpenModal(careModalPresetLabel?.trim() ?? null);
    setShowCreateModal(true);
  }, [careModalRequestTick, canCreateOrders, careModalPresetLabel]);

  if (loading) {
    return (
      <div
        style={{
          padding: "16px 18px",
          backgroundColor: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {t("encounterChrome.ordersTab.loading")}
      </div>
    );
  }

  const ordersShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ObservationTemplateOrdersPanel
        encounterId={encounterId}
        facilityId={facilityId}
        orders={orders}
        encounterOpen={encounterOpen}
        roles={roles}
        onOrdersUpdated={async () => {
          await refreshOrdersAfterMutation();
        }}
      />
      <div
        style={{
          ...ordersShell,
          padding: "16px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            {t("encounterChrome.ordersTab.title")}
          </h3>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748b", maxWidth: 480, lineHeight: 1.45 }}>
            {t("encounterChrome.ordersTab.subtitle")}
          </p>
        </div>
        {canCreateOrders ? (
          <button
            onClick={() => {
              setCreateModalInitialTab("LAB");
              setShowCreateModal(true);
            }}
            style={{
              padding: "10px 18px",
              backgroundColor: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
            }}
          >
            {t("encounterChrome.ordersTab.createOrder")}
          </button>
        ) : null}
      </div>

      {ordersFeedback ? (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 14,
            backgroundColor: ordersFeedback.type === "ok" ? "#f0fdf4" : "#fef2f2",
            color: ordersFeedback.type === "ok" ? "#166534" : "#b91c1c",
            border: `1px solid ${ordersFeedback.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {ordersFeedback.text}
        </div>
      ) : null}

      {displayOrders.length === 0 ? (
        <div style={{ ...ordersShell, padding: "22px 20px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
          {orders.length === 0
            ? t("encounterChrome.ordersTab.emptyNone")
            : t("encounterChrome.observationTemplateOrders.otherOrdersEmpty")}
        </div>
      ) : (
        <div style={{ ...ordersShell, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterChrome.ordersTab.tableHeaderType")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterChrome.ordersTab.tableHeaderStatus")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterChrome.ordersTab.tableHeaderPriority")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterChrome.ordersTab.tableHeaderClinicalDetail")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterChrome.ordersTab.tableHeaderOrderEntry")}
                </th>
                {(canPrescribe || isRn) && (
                  <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                    {t("encounterChrome.ordersTab.tableHeaderActions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayOrders.map((order: any) => {
                const orderStatusBadgeKey =
                  order.type === "MEDICATION" ? medicationOrderStatusKeyForEncounterTab(order) : order.status;
                return (
                <tr
                  key={order.id}
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    backgroundColor: (order as { pendingSync?: boolean }).pendingSync ? "#fff8e1" : undefined,
                  }}
                >
                  <td style={{ padding: 12, verticalAlign: "top" }}>
                    {(order as { pendingSync?: boolean }).pendingSync ? (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#856404",
                          marginBottom: 8,
                          padding: "4px 8px",
                          backgroundColor: "#fff3cd",
                          borderRadius: 4,
                          display: "inline-block",
                        }}
                      >
                        {t("encounterChrome.ordersTab.pendingSync")}
                      </div>
                    ) : null}
                    {order.type === "LAB" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{t("encounterChrome.ordersTab.labSection")}</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>{t("encounterChrome.ordersTab.labItemsLabel")}</strong>{" "}
                          {(order.items || [])
                            .map((it: any) => getOrderItemDisplayLabelFromLocale(it, language))
                            .filter(Boolean)
                            .join(", ") || t("common.dash")}
                        </div>
                      </>
                    ) : order.type === "IMAGING" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{t("encounterChrome.ordersTab.imagingSection")}</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>{t("encounterChrome.ordersTab.imagingItemsLabel")}</strong>{" "}
                          {(order.items || [])
                            .map((it: any) => getOrderItemDisplayLabelFromLocale(it, language))
                            .filter(Boolean)
                            .join(", ") || t("common.dash")}
                        </div>
                      </>
                    ) : order.type === "MEDICATION" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{t("encounterChrome.ordersTab.medicationSection")}</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>{t("encounterChrome.ordersTab.medicationItemsLabel")}</strong>{" "}
                          {(order.items || [])
                            .map((it: any) => getOrderItemDisplayLabelFromLocale(it, language))
                            .filter(Boolean)
                            .join(", ") || t("common.dash")}
                        </div>
                      </>
                    ) : order.type === "CARE" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{t("encounterChrome.ordersTab.careSection")}</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>{t("encounterChrome.ordersTab.careItemsLabel")}</strong>{" "}
                          {(order.items || [])
                            .map((it: any) => getOrderItemDisplayLabelFromLocale(it, language))
                            .filter(Boolean)
                            .join(", ") || t("common.dash")}
                        </div>
                      </>
                    ) : (
                      <span>{String(order.type)}</span>
                    )}
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          orderStatusBadgeKey === "PENDING"
                            ? "#fff3cd"
                            : isOrderItemDoneForChart(orderStatusBadgeKey)
                              ? "#d4edda"
                              : orderStatusBadgeKey === "CANCELLED"
                                ? "#ffebee"
                                : orderStatusBadgeKey === "IN_PROGRESS"
                                  ? "#e3f2fd"
                                  : "#f5f5f5",
                        color:
                          orderStatusBadgeKey === "PENDING"
                            ? "#856404"
                            : isOrderItemDoneForChart(orderStatusBadgeKey)
                              ? "#155724"
                              : orderStatusBadgeKey === "CANCELLED"
                                ? "#b71c1c"
                                : orderStatusBadgeKey === "IN_PROGRESS"
                                  ? "#1565c0"
                                  : "#666",
                      }}
                    >
                      {getOrderItemChartLabel(orderStatusBadgeKey, language)}
                    </span>
                    {order.status === "CANCELLED" &&
                    ((order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr ||
                      (order as { cancelledAt?: string | null }).cancelledAt ||
                      (order as { cancellationReason?: string | null }).cancellationReason) ? (
                      <div style={{ fontSize: 12, color: "#616161", marginTop: 8, lineHeight: 1.45 }}>
                        {(order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr ? (
                          <>
                            {t("encounterChrome.ordersTab.canceledBy")}{" "}
                            <strong>{(order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr}</strong>
                            {(order as { cancelledAt?: string | null }).cancelledAt ? (
                              <>
                                {" "}
                                {t("encounterChrome.chartTabs.onDate")}{" "}
                                {formatEncounterChromeDateTime(
                                  String((order as { cancelledAt?: string | null }).cancelledAt),
                                  language
                                )}
                              </>
                            ) : null}
                          </>
                        ) : null}
                        {(order as { cancellationReason?: string | null }).cancellationReason ? (
                          <>
                            <br />
                            {t("encounterChrome.ordersTab.reason")}:{" "}
                            {(order as { cancellationReason?: string | null }).cancellationReason}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top" }}>{tOrderPriority(t, order.priority)}</td>
                  <td style={{ padding: 12, verticalAlign: "top", fontSize: 13 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(order.items || []).map((it: any) => (
                        <li key={it.id} style={{ marginBottom: 8 }}>
                          <strong>{orderItemLineLabel(it)}</strong>
                          {order.type === "MEDICATION" && !medicationLineClinicallyExecuted(it) ? (
                            <div style={{ fontSize: 12, color: "#555" }}>
                              {tMedicationFulfillmentIntent(t, it.medicationFulfillmentIntent)} ·{" "}
                              {t("encounterChrome.ordersTab.qtyAbbrev")}: {it.quantity ?? t("common.dash")}
                              {it.refillCount != null
                                ? ` · ${t("encounterChrome.ordersTab.refills")}: ${it.refillCount}`
                                : ""}
                              {it.notes ? ` · ${t("encounterChrome.ordersTab.dosing")}: ${it.notes}` : ""}
                            </div>
                          ) : null}
                          {it.completedAt && it.completedByNurse ? (
                            <div style={{ fontSize: 12, color: "#2e7d32" }}>
                              {t("encounterChrome.ordersTab.administeredBy")} {it.completedByNurse.firstName}{" "}
                              {it.completedByNurse.lastName} {t("encounterChrome.chartTabs.onDate")}{" "}
                              {formatEncounterChromeDateTime(it.completedAt, language)}
                            </div>
                          ) : order.type === "MEDICATION" &&
                            Array.isArray(it.medicationAdministrations) &&
                            it.medicationAdministrations[0]?.administeredAt &&
                            it.medicationAdministrations[0]?.administeredBy ? (
                            <div style={{ fontSize: 12, color: "#2e7d32" }}>
                              {t("encounterChrome.ordersTab.administeredBy")}{" "}
                              {it.medicationAdministrations[0].administeredBy.firstName}{" "}
                              {it.medicationAdministrations[0].administeredBy.lastName}{" "}
                              {t("encounterChrome.chartTabs.onDate")}{" "}
                              {formatEncounterChromeDateTime(
                                it.medicationAdministrations[0].administeredAt,
                                language
                              )}
                            </div>
                          ) : order.type === "MEDICATION" && it.pharmacyDispenseRecord?.dispensedAt ? (
                            <div style={{ fontSize: 12, color: "#1565c0" }}>
                              {t("encounterChrome.ordersTab.dispensedBy")}{" "}
                              {it.pharmacyDispenseRecord.dispensedBy?.firstName ?? ""}{" "}
                              {it.pharmacyDispenseRecord.dispensedBy?.lastName ?? ""}{" "}
                              {t("encounterChrome.chartTabs.onDate")}{" "}
                              {formatEncounterChromeDateTime(it.pharmacyDispenseRecord.dispensedAt, language)}
                            </div>
                          ) : null}
                          {shouldRenderMedicationGovernance(String(order.type), it, {
                            canPrescribeProp: effectiveCanPrescribe,
                            roles,
                            encounterSigned,
                          }) ? (
                            <ProviderMedicationOrderGovernanceSection
                              orderType={String(order.type)}
                              orderId={String(order.id)}
                              orderItem={it}
                              facilityId={facilityId}
                              permissions={{
                                canPrescribeProp: effectiveCanPrescribe,
                                roles,
                                encounterSigned,
                              }}
                              ordersRaw={displayOrders}
                              orderEventsRaw={clinicalData?.orderEvents ?? []}
                              itemStatus={String(it.status ?? "")}
                              onUpdated={() => {
                                void onOrdersUpdated?.();
                                void onRefetchEncounter?.();
                                void clinicalData?.refresh("ordersAndEvents", {
                                  reason: "mutation",
                                  force: true,
                                });
                              }}
                            />
                          ) : null}
                          {order.type === "CARE" ? (
                            <CareOrderItemClinicalTimeBlock
                              it={it}
                              order={order}
                              language={language}
                              t={t}
                              canAdjustClinicalTime={canAdjustCareClinicalTime}
                              encounterOpen={encounterOpen}
                              onOpenAdjust={() =>
                                setCareClinicalTimeModal({
                                  orderId: String(order.id),
                                  item: it,
                                  orderCreatedAt: String(order.createdAt),
                                })
                              }
                            />
                          ) : null}
                          {order.type === "CARE" &&
                          typeof it.enterpriseProcedureId === "string" &&
                          it.enterpriseProcedureId.trim() ? (
                            (() => {
                              const linkage = resolveProcedureDocumentationLinkage({
                                enterpriseProcedureId: it.enterpriseProcedureId,
                                orderItemId: String(it.id ?? ""),
                                orderStatus: String(it.status ?? ""),
                                documentedProcedureTypes,
                              });
                              const launcherStep = linkage.documentationTemplateId
                                ? documentationTemplateIdToLauncherStep(
                                    linkage.documentationTemplateId as EnterpriseProcedureDocumentationTemplateId
                                  )
                                : null;
                              return (
                                <ProcedureOrderDocumentationLinkage
                                  linkage={linkage}
                                  canOpenDocumentation={canOpenProcedureDocumentation}
                                  onOpenProcedureDocumentation={
                                    launcherStep
                                      ? () => openProcedureDocumentation(launcherStep as ErProcedureLauncherStep)
                                      : undefined
                                  }
                                />
                              );
                            })()
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top", whiteSpace: "normal", fontSize: 13 }}>
                    {(() => {
                      const attributionLines = formatOrderAttributionLines(order, t, language);
                      return attributionLines[0] ?? (order.orderedByDisplayFr?.trim()
                        ? t("encounterChrome.ordersTab.orderedByLine")
                            .replace("{name}", order.orderedByDisplayFr.trim())
                            .replace("{datetime}", formatEncounterChromeDateTime(order.createdAt, language))
                        : formatEncounterChromeDateTime(order.createdAt, language));
                    })()}
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                      {formatOrderAuthority(order, t)}
                    </div>
                    {formatOrderAttributionLines(order, t, language)
                      .slice(1)
                      .map((line) => (
                        <div key={line} style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                          {line}
                        </div>
                      ))}
                  </td>
                  {(canPrescribe || isRn) && (
                    <td style={{ padding: 12, verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                        {canPrescribe && order.type === "MEDICATION" && !(order as { pendingSync?: boolean }).pendingSync ? (
                          <button
                            type="button"
                            onClick={() => handlePrintRx(order)}
                            style={{ padding: "4px 12px", fontSize: 13, cursor: "pointer", border: "1px solid #ddd", borderRadius: 4 }}
                          >
                            {t("encounterChrome.ordersTab.print")}
                          </button>
                        ) : null}
                        {canCancelWholeOrder &&
                        canAttemptWholeOrderCancel(order, encounterOpen) &&
                        orderAllowsWholeCancelOnline(order) ? (
                          <button
                            type="button"
                            disabled={cancelSubmitting}
                            onClick={() => {
                              setOrdersFeedback(null);
                              setCancelConfirmOrderId(order.id);
                            }}
                            style={{
                              padding: "4px 12px",
                              fontSize: 13,
                              cursor: cancelSubmitting ? "not-allowed" : "pointer",
                              border: "1px solid #e57373",
                              borderRadius: 4,
                              backgroundColor: "#fff",
                              color: "#c62828",
                            }}
                          >
                            {t("encounterChrome.ordersTab.cancelOrder")}
                          </button>
                        ) : null}
                      </div>
                      {order.type === "MEDICATION" && order.prescriberName ? (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                          {t("encounterChrome.ordersTab.prescriberLabel")}: {order.prescriberName}
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CancelOrderModal
        variant="parentOrder"
        open={cancelConfirmOrderId !== null}
        orderId={cancelConfirmOrderId}
        submitting={cancelSubmitting}
        onClose={() => {
          if (cancelSubmitting) return;
          setCancelConfirmOrderId(null);
        }}
        onConfirm={confirmCancelWholeOrder}
      />

      {showCreateModal && (
        <CreateOrderModal
          key={`${encounterId}-${createModalInitialTab}-${medicationModalRequestTick}-${careModalRequestTick}-${carePresetForOpenModal ?? ""}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          canUseRnOrderAuthority={canUseRnOrderAuthority}
          isRn={roles.includes("RN")}
          encounter={encounter}
          initialOrderTab={createModalInitialTab}
          initialCareManualLabel={carePresetForOpenModal}
          onClose={() => setShowCreateModal(false)}
          onRefetchEncounter={onRefetchEncounter}
          onOpenEkgProcedureDocumentation={() => {
            setShowCreateModal(false);
            openProcedureDocumentation("EKG");
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            await refreshOrdersAfterMutation();
          }}
        />
      )}
      {showProcedureLauncher ? (
        <EmergencyProcedureLauncherModal
          open={showProcedureLauncher}
          onClose={() => {
            setShowProcedureLauncher(false);
            setProcedureLauncherInitialStep(null);
          }}
          encounterId={encounterId}
          facilityId={facilityId}
          initialStep={procedureLauncherInitialStep}
          onRecorded={() => {
            setShowProcedureLauncher(false);
            setProcedureLauncherInitialStep(null);
            void onRefetchEncounter?.();
            void refreshOrdersAfterMutation();
          }}
        />
      ) : null}
      {careClinicalTimeModal ? (
        <CareProcedureClinicalTimeModal
          open
          lineLabel={orderItemLineLabel(careClinicalTimeModal.item)}
          defaultEffectiveIso={
            resolveCareProcedureDisplayTimes(
              careClinicalTimeModal.item as Parameters<typeof resolveCareProcedureDisplayTimes>[0]
            ).effectiveIso ?? new Date().toISOString()
          }
          documentedCompletedAt={(() => {
            const raw = careClinicalTimeModal.item.documentedCompletedAt ?? careClinicalTimeModal.item.updatedAt;
            if (!raw) return null;
            const d = new Date(String(raw));
            return Number.isNaN(d.getTime()) ? null : d;
          })()}
          orderCreatedAt={new Date(careClinicalTimeModal.orderCreatedAt)}
          orderItemCreatedAt={new Date(String(careClinicalTimeModal.item.createdAt ?? careClinicalTimeModal.orderCreatedAt))}
          adjustmentVersion={Number(careClinicalTimeModal.item.effectiveClinicalAtVersion ?? 0)}
          t={t}
          saving={careClinicalTimeSaving}
          onClose={() => {
            if (careClinicalTimeSaving) return;
            setCareClinicalTimeModal(null);
          }}
          onSave={async (payload) => {
            setCareClinicalTimeSaving(true);
            try {
              await apiFetch(
                `/orders/items/${String(careClinicalTimeModal.item.id)}/effective-clinical-time`,
                {
                  method: "PATCH",
                  facilityId,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...payload,
                    orderId: careClinicalTimeModal.orderId,
                  }),
                }
              );
              setCareClinicalTimeModal(null);
              setOrdersFeedback({
                type: "ok",
                text: t("encounterChrome.ordersTab.careClinicalTime.clinicalTimeAdjusted"),
              });
              await refreshOrdersAfterMutation();
            } catch (e: unknown) {
              throw new Error(
                normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
                  t("encounterChrome.ordersTab.careClinicalTime.saveFailed")
              );
            } finally {
              setCareClinicalTimeSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}


