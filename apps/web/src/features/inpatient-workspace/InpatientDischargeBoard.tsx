"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  INPATIENT_FINAL_DISPOSITION_CODES_1C,
  INPATIENT_HOME_HEALTH_SERVICES,
  INPATIENT_PENDING_STUDY_TYPES,
  INPATIENT_TRANSFER_REASONS,
  INPATIENT_TRANSFER_SERVICES,
  INPATIENT_TRANSPORT_MODES,
  allRequiredMedReconDecisionsComplete,
  buildInpatientDischargeChartDraft,
  buildInpatientDischargeMedReconPreload,
  demoteInpatientDischargePlanningWorkflowAfterEdit,
  dispositionRequiresConditionAtDischarge,
  dispositionUsesHomeInstructionEngine,
  emptyInpatientNursingDischarge,
  emptyInpatientProviderDischarge,
  extractDischargePlanningFromClinicalOps,
  formatDischargeNarrativeForDisplay,
  formatInpatientDischargeDiagnosisDisplay,
  formatInpatientDischargeHumanLabel,
  formatInpatientDischargePendingStudyTypeLabel,
  formatIcd10ServerResolvedOneLineDisplay,
  hasMeaningfulDischargeSummary,
  hydrateInpatientFinalDischarge,
  hydrateInpatientNursingDischarge,
  hydrateInpatientProviderDischarge1C,
  instantToLocalDateTimeInput,
  isInpatientDischargePlanningOperationallyReady,
  isInpatientMedReconEffectivelyComplete,
  listProtectedChartFieldsWithUpdates,
  localDateTimeInputToIso,
  markClinicianEditedField,
  mergeChartDraftPreservingClinicianEdits,
  projectInpatientDischargePlanningSummary,
  resolveInpatientDischargeForDisplay,
  synthesizeInpatientDischargeSummaryDraft,
  validateInpatientDischargePlanningReady,
  type InpatientClinicalOpsV1,
  type InpatientDischargeChartSnapshot,
  type InpatientDischargeFollowUp1C,
  type InpatientDischargeMedicationLine1C,
  type InpatientFinalDischargeReadiness,
  type InpatientFinalDischargeV1E,
  type InpatientFinalDisposition1C,
  type InpatientNursingDischargeV1D,
  type InpatientProviderDischargeDiagnosis,
  type InpatientProviderDischargePendingStudy,
  type InpatientDischargeMedReconHistoryState,
  type InpatientProviderDischargeV1C,
  type PatientClinicalHistoryHomeMedications,
  type HomeMedicationReconciliationLineV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { Icd10DiagnosisSearchAutocomplete } from "@/components/diagnosis/Icd10DiagnosisSearchAutocomplete";
import { isDuplicateDischargeDiagnosis } from "@/components/diagnosis/icd10DiagnosisSearchHelpers";
import { icd10ListLocaleQuery } from "@/components/diagnosis/icd10LivePresentation";
import {
  executeInpatientFinalDischarge,
  fetchInpatientClinicalOps,
  fetchInpatientFinalDischarge,
  fetchInpatientNursingDischarge,
  fetchInpatientProviderDischarge,
  fetchNursingAdmissionDocumentation,
  patchInpatientClinicalOps,
  saveInpatientNursingDischarge,
  saveInpatientProviderDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";
import {
  generateInpatientPatientInstructionsFromDiagnoses,
  inpatientDiagnosisHasSpecificInstructionTemplate,
} from "./inpatientPatientInstructionsFromDiagnoses";
import { InpatientDischargeBoardNursing } from "./InpatientDischargeBoardNursing";
import { InpatientDischargeMedicationsPanel } from "./InpatientDischargeMedicationsPanel";
import { InpatientDischargeMedReconPanel } from "./InpatientDischargeMedReconPanel";
import { resolveProductUiLanguageOrDefault, productUiBcp47Tag } from "@/i18n/config";
import {
  badgeAttention,
  badgeComplete,
  badgePending,
  boardCardStyle,
  boardSectionStyle,
  dangerBtn,
  disabledBtn,
  DISCHARGE_BOARD_COLORS,
  fieldStyle,
  fourColGrid,
  identityStrip,
  labelStyle,
  neutralBtn,
  primaryBtn,
  readinessChipStyle,
  secondaryBtn,
  twoColGrid,
} from "./dischargeBoardStyles";

const PREFIX = "inpatientDischargeBoardInpDis1f";

type BoardProps = {
  encounterId: string;
  encounter: {
    id: string;
    status?: string | null;
    type?: string | null;
    patient?: {
      id?: string;
      firstName?: string | null;
      lastName?: string | null;
      mrn?: string | null;
      dob?: string | Date | null;
      sexAtBirth?: string | null;
    } | null;
  } | null;
  roles: string[];
  facilityId?: string | null;
  facilityDisplayName?: string;
  admittedAt?: string | Date | null;
  onDischarged?: () => void;
  onRefetchEncounter?: () => Promise<void>;
};

type PlanningDraft = {
  destination: string;
  transportation: string;
  homeHealth: string;
  specialNeedsEquipment: string;
  careTeamNotified: boolean;
  anticipatedDischargeDate: string;
  barriers: string;
  workflowState: string;
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ageFromDob(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function formatDob(dob: string | Date | null | undefined, locale: string): string {
  if (!dob) return "—";
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale);
}

function formatAdmit(at: string | Date | null | undefined, locale: string): string {
  if (!at) return "—";
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale);
}

function markForStatus(status: string): string {
  if (status === "complete") return "✓";
  if (status === "attention" || status === "blocked") return "!";
  if (status === "not_applicable") return "—";
  return "○";
}

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Check({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function CardShell({
  title,
  badge,
  children,
  id,
  ...rest
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  id?: string;
  "data-testid": string;
}) {
  return (
    <div id={id} style={boardCardStyle} {...rest}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 12,
        lineHeight: 1.35,
      }}
    >
      <span style={{ color: DISCHARGE_BOARD_COLORS.muted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function emptyPlanning(): PlanningDraft {
  return {
    destination: "",
    transportation: "",
    homeHealth: "",
    specialNeedsEquipment: "",
    careTeamNotified: false,
    anticipatedDischargeDate: "",
    barriers: "",
    workflowState: "PLANNING",
  };
}

function serializeMedReconLine(l: {
  id: string;
  sourceLabel: string;
  medicationName: string;
  strength?: string | null;
  dose?: string | null;
  unit?: string | null;
  route?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  catalogMedicationId?: string | null;
  source: string;
  rowKind?: string | null;
  homeRegimen?: string | null;
  dischargeRegimen?: string | null;
  providerPlanRelationship?: string | null;
  providerPlanSummary?: string | null;
  decision: string;
  reason?: string | null;
}) {
  return {
    id: l.id,
    sourceLabel: l.sourceLabel,
    medicationName: l.medicationName,
    strength: l.strength ?? null,
    dose: l.dose ?? null,
    unit: l.unit ?? null,
    route: l.route ?? null,
    frequency: l.frequency ?? null,
    instructions: l.instructions ?? null,
    catalogMedicationId: l.catalogMedicationId ?? null,
    source: l.source,
    rowKind: l.rowKind ?? null,
    homeRegimen: l.homeRegimen ?? null,
    dischargeRegimen: l.dischargeRegimen ?? null,
    providerPlanRelationship: l.providerPlanRelationship ?? null,
    providerPlanSummary: l.providerPlanSummary ?? null,
    decision: l.decision,
    reason: l.reason ?? null,
  };
}

export function InpatientDischargeBoard({
  encounterId,
  encounter,
  roles,
  facilityId,
  facilityDisplayName = "Hospital",
  admittedAt,
  onDischarged,
  onRefetchEncounter,
}: BoardProps) {
  const { t, language } = useI18n();
  const dateLocale = productUiBcp47Tag(language);
  const tp = (key: string) => t(`${PREFIX}.${key}`);
  const validationLabel = (code: string) => {
    const key = `${PREFIX}.validation.${code}`;
    const labeled = t(key);
    return labeled === key ? code.replace(/_/g, " ") : labeled;
  };
  const enumLabel = (i18nKey: string, code: string) => {
    const labeled = tp(i18nKey);
    const full = `${PREFIX}.${i18nKey}`;
    if (!labeled || labeled === full || labeled === i18nKey) {
      return formatInpatientDischargeHumanLabel(code) || code;
    }
    return labeled;
  };

  /** Provider clinical write: PROVIDER role only — never ADMIN masquerading. */
  const canProvider = roles.includes("PROVIDER");
  const canNursing = roles.includes("RN");
  const canOps = canProvider || canNursing || roles.includes("ADMIN");
  const canExecuteFinal = canProvider || canNursing || roles.includes("ADMIN");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [providerDoc, setProviderDoc] = useState<InpatientProviderDischargeV1C>(
    emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C
  );
  const [liveDxPresentationByCode, setLiveDxPresentationByCode] = useState<
    Record<string, { displayLabel: string; displayResolution: string }>
  >({});
  const [providerRevision, setProviderRevision] = useState(0);
  const [nursingDoc, setNursingDoc] = useState<InpatientNursingDischargeV1D>(
    emptyInpatientNursingDischarge()
  );
  const [nursingRevision, setNursingRevision] = useState(0);
  const [canCompleteNursing, setCanCompleteNursing] = useState(false);
  const [medReconStatus, setMedReconStatus] = useState<string>("UNKNOWN");
  const [ops, setOps] = useState<InpatientClinicalOpsV1 | null>(null);
  const [planning, setPlanning] = useState<PlanningDraft>(emptyPlanning());
  const [planningOpen, setPlanningOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [finalReadiness, setFinalReadiness] = useState<InpatientFinalDischargeReadiness | null>(
    null
  );
  const [completed, setCompleted] = useState<InpatientFinalDischargeV1E | null>(null);
  const [encounterClosed, setEncounterClosed] = useState(false);
  const [canRunFinal, setCanRunFinal] = useState(false);
  const [dirtyProvider, setDirtyProvider] = useState(false);
  const [dirtyNursing, setDirtyNursing] = useState(false);
  const [dirtyPlanning, setDirtyPlanning] = useState(false);
  const [instructionSuggestionPending, setInstructionSuggestionPending] = useState(false);
  const [chartBootstrap, setChartBootstrap] = useState<InpatientDischargeChartSnapshot | null>(
    null
  );
  const [providerCanAuthor, setProviderCanAuthor] = useState(false);
  const [serverProviderFinalized, setServerProviderFinalized] = useState(false);
  const [waitingProviderFinalize, setWaitingProviderFinalize] = useState(false);
  const [savedMedReconLines, setSavedMedReconLines] = useState<unknown[]>([]);
  const [admissionHomeMedLines, setAdmissionHomeMedLines] = useState<
    HomeMedicationReconciliationLineV1[]
  >([]);
  const [patientHomeMedications, setPatientHomeMedications] =
    useState<PatientClinicalHistoryHomeMedications | null>(null);
  const [medHistoryLoadFailed, setMedHistoryLoadFailed] = useState(false);

  const dirty = dirtyProvider || dirtyNursing || dirtyPlanning;
  const readOnly = encounterClosed || Boolean(completed);
  const planningDisplayReady = isInpatientDischargePlanningOperationallyReady({
    workflowState: planning.workflowState,
    dirty: dirtyPlanning,
  });

  const applyPlanningFromOps = useCallback((nextOps: InpatientClinicalOpsV1 | null) => {
    const plan = nextOps?.dischargePlanning;
    setPlanning({
      destination: plan?.destination ?? "",
      transportation: plan?.transportation ?? "",
      homeHealth: plan?.homeHealth ?? "",
      specialNeedsEquipment: plan?.specialNeedsEquipment ?? "",
      careTeamNotified: plan?.careTeamNotified === true,
      anticipatedDischargeDate: plan?.anticipatedDischargeDate?.slice(0, 10) ?? "",
      barriers: plan?.barriers ?? "",
      workflowState: plan?.workflowState ?? "PLANNING",
    });
    setDirtyPlanning(false);
  }, []);

  const loadAll = useCallback(
    async (opts?: { confirmDirty?: boolean }) => {
      if (opts?.confirmDirty && dirty) {
        if (!window.confirm(tp("discardConfirm"))) return;
      }
      setLoading(true);
      setError(null);
      setValidationErrors([]);
      try {
        const patientId = encounter?.patient?.id ?? null;
        const historyFetches = Promise.allSettled([
          fetchNursingAdmissionDocumentation(encounterId),
          patientId
            ? apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile`, {
                facilityId: facilityId ?? undefined,
              })
            : Promise.resolve(null),
        ]);

        const [providerRes, nursingRes, finalRes, opsRes, historySettled] = await Promise.all([
          fetchInpatientProviderDischarge(encounterId),
          fetchInpatientNursingDischarge(encounterId),
          fetchInpatientFinalDischarge(encounterId),
          fetchInpatientClinicalOps(encounterId),
          historyFetches,
        ]);

        const hydratedProvider =
          hydrateInpatientProviderDischarge1C(providerRes.documentation) ??
          (emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C);
        const bootstrap =
          (providerRes.chartBootstrap as InpatientDischargeChartSnapshot | undefined) ?? null;
        setChartBootstrap(bootstrap);
        setProviderCanAuthor(providerRes.canAuthor === true);

        let nextProvider = hydratedProvider;
        const emptyCourse =
          !hydratedProvider.hospitalCourse &&
          !hydratedProvider.reasonForHospitalization &&
          (hydratedProvider.dischargeDiagnoses?.length ?? 0) === 0 &&
          !hydratedProvider.documentedAt &&
          !hydratedProvider.providerDocumentationFinalizedAt;
        if (emptyCourse && bootstrap && providerRes.canAuthor === true) {
          const draft = buildInpatientDischargeChartDraft({
            ...bootstrap,
            language: resolveProductUiLanguageOrDefault(language),
          });
          nextProvider = mergeChartDraftPreservingClinicianEdits({
            existing: hydratedProvider,
            draft,
          }).next;
          setDirtyProvider(true);
        } else {
          setDirtyProvider(false);
        }
        setProviderDoc(nextProvider);
        setProviderRevision(providerRes.revision ?? hydratedProvider.revision ?? 0);

        const hydratedNursing =
          hydrateInpatientNursingDischarge(nursingRes.documentation) ??
          emptyInpatientNursingDischarge();
        setNursingDoc(hydratedNursing);
        setNursingRevision(nursingRes.revision ?? hydratedNursing.revision ?? 0);
        setCanCompleteNursing(nursingRes.canComplete === true);
        setMedReconStatus(nursingRes.medicationReconciliationStatus ?? "UNKNOWN");
        setServerProviderFinalized(nursingRes.providerFinalized === true);
        setWaitingProviderFinalize(nursingRes.providerFinalized !== true);
        setSavedMedReconLines(
          Array.isArray(nursingRes.medicationReconciliationLines)
            ? (nursingRes.medicationReconciliationLines as unknown[])
            : []
        );
        setDirtyNursing(false);

        const [admissionSettled, profileSettled] = historySettled;
        let historyFailed = false;
        if (admissionSettled.status === "fulfilled") {
          const doc = admissionSettled.value?.documentation as
            | { homeMedicationLines?: HomeMedicationReconciliationLineV1[] }
            | undefined;
          setAdmissionHomeMedLines(
            Array.isArray(doc?.homeMedicationLines) ? doc!.homeMedicationLines! : []
          );
        } else {
          historyFailed = true;
          setAdmissionHomeMedLines([]);
        }
        if (profileSettled.status === "fulfilled" && profileSettled.value) {
          const profile = asApiObject(profileSettled.value) as {
            homeMedications?: PatientClinicalHistoryHomeMedications;
          };
          setPatientHomeMedications(profile.homeMedications ?? null);
        } else if (patientId && profileSettled.status === "rejected") {
          historyFailed = true;
          setPatientHomeMedications(null);
        } else {
          setPatientHomeMedications(null);
        }
        setMedHistoryLoadFailed(historyFailed);

        const opsRaw = opsRes.ops as InpatientClinicalOpsV1;
        setOps(opsRaw);
        applyPlanningFromOps(opsRaw);

        const readiness = finalRes.readiness as InpatientFinalDischargeReadiness;
        setFinalReadiness(readiness);
        const done =
          (finalRes.completed as InpatientFinalDischargeV1E | null) ??
          hydrateInpatientFinalDischarge(
            (finalRes as { completed?: unknown }).completed
          );
        setCompleted(done);
        const closed =
          String(finalRes.status ?? "").toUpperCase() === "CLOSED" ||
          String(encounter?.status ?? "").toUpperCase() === "CLOSED" ||
          Boolean(done);
        setEncounterClosed(closed);
        setCanRunFinal(finalRes.canExecute === true && canExecuteFinal && !closed);
      } catch {
        setError(tp("errors.load"));
      } finally {
        setLoading(false);
      }
    },
    // tp uses t — include dirty/canExecute/encounter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyPlanningFromOps, canExecuteFinal, dirty, encounter?.patient?.id, encounter?.status, encounterId, facilityId, language, t]
  );

  useEffect(() => {
    void loadAll();
    // initial mount only for encounterId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const planningSummary = useMemo(
    () =>
      projectInpatientDischargePlanningSummary({
        ops,
        providerDispositionCode: providerDoc.finalDisposition?.code,
      }),
    [ops, providerDoc.finalDisposition?.code]
  );

  const dispositionCode = providerDoc.finalDisposition?.code?.toUpperCase() ?? "";
  const showCondition = dispositionRequiresConditionAtDischarge(dispositionCode);
  const providerFinalized =
    Boolean(providerDoc.providerDocumentationFinalizedAt) || serverProviderFinalized;
  const nursingCompleted = nursingDoc.executionStatus === "COMPLETED";
  const providerWriteEnabled = canProvider && providerCanAuthor && !readOnly;

  useEffect(() => {
    const patientId = encounter?.patient?.id ?? null;
    if (!patientId || !facilityId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(
          `/patients/${encodeURIComponent(patientId)}/diagnoses?status=ACTIVE&limit=200${icd10ListLocaleQuery(language)}`,
          { facilityId }
        );
        const items = Array.isArray((data as { items?: unknown }).items)
          ? (data as { items: Record<string, unknown>[] }).items
          : [];
        const next: Record<string, { displayLabel: string; displayResolution: string }> = {};
        for (const item of items) {
          const code = String(item.code ?? "").trim().toUpperCase();
          if (!code) continue;
          next[code] = {
            displayLabel: typeof item.displayLabel === "string" ? item.displayLabel : String(item.code ?? ""),
            displayResolution:
              typeof item.displayResolution === "string" ? item.displayResolution : "UNLOCALIZED_CODE",
          };
        }
        if (!cancelled) {
          setLiveDxPresentationByCode((prev) => ({ ...next, ...prev }));
        }
      } catch {
        if (!cancelled) {
          /* keep any search-hit presentation already in memory */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounter?.patient?.id, encounterId, facilityId, language]);

  const inpatientDxTitle = (row: { code?: string | null; description?: string | null }) => {
    if (!providerWriteEnabled) {
      return formatInpatientDischargeDiagnosisDisplay(row) || tp("none");
    }
    const code = (row.code ?? "").trim();
    const live = liveDxPresentationByCode[code.toUpperCase()];
    return (
      formatIcd10ServerResolvedOneLineDisplay({
        code,
        displayLabel: live?.displayLabel,
        displayResolution: live?.displayResolution,
      }).primary || tp("none")
    );
  };

  const chipRows = useMemo(() => {
    const r = finalReadiness;
    return [
      {
        id: "planning",
        label: tp("readiness.planning"),
        status: planningDisplayReady ? "complete" : "incomplete",
        target: "inp-dis-1f-card-planning",
      },
      {
        id: "provider",
        label: tp("readiness.provider"),
        status: r?.provider ?? (providerFinalized ? "complete" : "incomplete"),
        target: "inp-dis-provider-details",
      },
      {
        id: "medRec",
        label: tp("readiness.medRec"),
        status:
          r?.medicationReconciliation ??
          (medReconStatus === "COMPLETE"
            ? "complete"
            : medReconStatus === "INCOMPLETE"
              ? "attention"
              : "incomplete"),
        target: "inp-dis-med-rec",
      },
      {
        id: "nursing",
        label: tp("readiness.nursing"),
        status: r?.nursing ?? (nursingCompleted ? "complete" : "incomplete"),
        target: "inp-dis-nursing-details",
      },
      {
        id: "disposition",
        label: tp("readiness.disposition"),
        status: r?.disposition ?? (dispositionCode ? "complete" : "incomplete"),
        target: "inp-dis-disposition",
      },
      {
        id: "departure",
        label: tp("readiness.departure"),
        status: r?.departure ?? (nursingDoc.departure?.departedAt ? "complete" : "incomplete"),
        target: "inp-dis-nursing-departure",
      },
      {
        id: "final",
        label: tp("readiness.final"),
        status: completed || encounterClosed ? "complete" : r?.ready ? "complete" : "incomplete",
        target: "inp-dis-final",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    completed,
    dispositionCode,
    encounterClosed,
    finalReadiness,
    medReconStatus,
    nursingCompleted,
    nursingDoc.departure?.departedAt,
    planningDisplayReady,
    providerFinalized,
    t,
  ]);

  const patient = encounter?.patient;
  const patientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") || "—";
  const age = ageFromDob(patient?.dob ?? null);
  const sexKey = String(patient?.sexAtBirth ?? "")
    .trim()
    .toUpperCase();
  const sexLabel = sexKey ? tp(`sexLabels.${sexKey}`) : tp("none");

  const touchProvider = (updater: (prev: InpatientProviderDischargeV1C) => InpatientProviderDischargeV1C) => {
    setProviderDoc(updater);
    setDirtyProvider(true);
  };

  const touchNursing = (updater: (prev: InpatientNursingDischargeV1D) => InpatientNursingDischargeV1D) => {
    setNursingDoc(updater);
    setDirtyNursing(true);
  };

  const touchPlanning = (patch: Partial<PlanningDraft>) => {
    setPlanning((p) => ({
      ...p,
      ...patch,
      workflowState: demoteInpatientDischargePlanningWorkflowAfterEdit(p.workflowState),
    }));
    setDirtyPlanning(true);
  };

  const setDisposition = (code: string) => {
    const next: InpatientFinalDisposition1C = {
      ...(providerDoc.finalDisposition ?? { code }),
      code,
      labelSnapshot: code ? enumLabel(`dispositionCodes.${code}`, code) : null,
    };
    touchProvider((prev) => ({
      ...prev,
      finalDisposition: code ? next : null,
    }));
  };

  const patchDispositionDetails = (partial: Partial<InpatientFinalDisposition1C>) => {
    touchProvider((prev) => ({
      ...prev,
      finalDisposition: {
        ...(prev.finalDisposition ?? { code: dispositionCode || "OTHER" }),
        code: prev.finalDisposition?.code ?? dispositionCode ?? "OTHER",
        ...partial,
      },
    }));
  };

  const saveProvider = async (saveMode: "draft" | "complete") => {
    if (!providerWriteEnabled) return;
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await saveInpatientProviderDischarge(encounterId, {
        documentation: providerDoc as unknown as Record<string, unknown>,
        expectedRevision: providerRevision,
        saveMode,
      });
      const hydrated =
        hydrateInpatientProviderDischarge1C(res.documentation) ??
        (emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C);
      setProviderDoc(hydrated);
      setProviderRevision(res.revision ?? hydrated.revision ?? 0);
      setDirtyProvider(false);
      await loadAll();
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[] } };
      if (err.status === 409) setError(tp("errors.conflict"));
      else if (err.status === 403) setError(tp("errors.forbidden"));
      else if (Array.isArray(err.body?.errors)) setValidationErrors(err.body.errors);
      else setError(tp("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const saveNursing = async (saveMode: "draft" | "complete") => {
    if (!canNursing || readOnly) return;
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await saveInpatientNursingDischarge(encounterId, {
        documentation: nursingDoc as unknown as Record<string, unknown>,
        expectedRevision: nursingRevision,
        saveMode,
      });
      const hydrated =
        hydrateInpatientNursingDischarge(res.documentation) ?? emptyInpatientNursingDischarge();
      setNursingDoc(hydrated);
      setNursingRevision(res.revision ?? hydrated.revision ?? 0);
      setDirtyNursing(false);
      await loadAll();
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[] } };
      if (err.status === 409) setError(tp("errors.conflict"));
      else if (err.status === 403) setError(tp("errors.forbidden"));
      else if (Array.isArray(err.body?.errors)) setValidationErrors(err.body.errors);
      else setError(tp("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const savePlanning = async (workflowStateOverride?: string) => {
    if (!canOps || readOnly) return;
    const nextWorkflow = workflowStateOverride || planning.workflowState || "PLANNING";
    if (nextWorkflow === "READY") {
      const ready = validateInpatientDischargePlanningReady(planning);
      if (!ready.ok) {
        setValidationErrors(ready.errors);
        return;
      }
    }
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await patchInpatientClinicalOps(encounterId, {
        setDischargePlanning: {
          destination: planning.destination || null,
          transportation: planning.transportation || null,
          homeHealth: planning.homeHealth || null,
          specialNeedsEquipment: planning.specialNeedsEquipment || null,
          careTeamNotified: planning.careTeamNotified,
          anticipatedDischargeDate: planning.anticipatedDischargeDate || null,
          barriers: planning.barriers || null,
          workflowState: nextWorkflow,
        },
      });
      const nextOps = res.ops as InpatientClinicalOpsV1;
      setOps(nextOps);
      applyPlanningFromOps(nextOps);
    } catch {
      setError(tp("errors.planning"));
    } finally {
      setSaving(false);
    }
  };

  const markPlanningReady = async () => {
    await savePlanning("READY");
  };

  const executeFinal = async () => {
    if (!finalReadiness || !canRunFinal || readOnly) return;
    const dest = finalReadiness.dispositionLabel || finalReadiness.dispositionCode || "";
    const ok = window.confirm(
      `${tp("final.confirmTitle")}\n${dest ? `${dest}\n` : ""}${tp("final.confirmBody")}`
    );
    if (!ok) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await executeInpatientFinalDischarge(encounterId, {
        expectedProviderRevision: finalReadiness.providerRevision,
        expectedNursingRevision: finalReadiness.nursingRevision,
      });
      setCompleted((res.completed as InpatientFinalDischargeV1E) ?? null);
      setFinalReadiness((res.readiness as InpatientFinalDischargeReadiness) ?? finalReadiness);
      setEncounterClosed(true);
      setCanRunFinal(false);
      onDischarged?.();
      await onRefetchEncounter?.();
    } catch (e: unknown) {
      const err = e as {
        status?: number;
        body?: { errors?: string[]; blockers?: Array<{ code: string }> };
      };
      if (err.status === 409) setError(tp("errors.conflict"));
      else if (err.status === 403) setError(tp("errors.forbidden"));
      else if (Array.isArray(err.body?.errors) && err.body.errors.length) {
        setValidationErrors(err.body.errors);
        setError(tp("errors.execute"));
      } else setError(tp("errors.execute"));
    } finally {
      setExecuting(false);
    }
  };

  const handlePrint = async () => {
    try {
      const patientLite = encounter?.patient;
      const enc = asApiObject<{
        createdAt?: string;
        dischargeSummaryJson?: unknown;
        physicianAssigned?: {
          firstName?: string | null;
          lastName?: string | null;
        } | null;
      }>(
        await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
          facilityId: facilityId ?? undefined,
        }).catch(() => null)
      );
      const stored = enc?.dischargeSummaryJson ?? null;
      const planningCtx = extractDischargePlanningFromClinicalOps(
        (ops as unknown as Record<string, unknown>) ?? {}
      );
      const fallbackDraft = !hasMeaningfulDischargeSummary(stored)
        ? synthesizeInpatientDischargeSummaryDraft({
            patientName,
            mrn: patientLite?.mrn,
            admittedAt:
              admittedAt instanceof Date
                ? admittedAt.toISOString()
                : (admittedAt ?? null),
            dischargeDestination: planning.destination || planningSummary.plannedDestination,
            dischargeWorkflowState: planning.workflowState || planningSummary.workflowState,
            language: resolveProductUiLanguageOrDefault(language),
          })
        : null;
      const dischargeSummaryJson = resolveInpatientDischargeForDisplay({
        stored,
        planning: planningCtx,
        fallbackDraft,
      });
      printDischarge({
        patient: {
          firstName: patientLite?.firstName ?? null,
          lastName: patientLite?.lastName ?? null,
          mrn: patientLite?.mrn ?? null,
          dob:
            patientLite?.dob instanceof Date
              ? patientLite.dob.toISOString()
              : (patientLite?.dob ?? null),
          sexAtBirth: patientLite?.sexAtBirth ?? null,
        },
        encounter: {
          createdAt:
            enc?.createdAt ??
            (admittedAt instanceof Date ? admittedAt.toISOString() : admittedAt) ??
            new Date().toISOString(),
          dischargeSummaryJson,
          physicianAssigned: enc?.physicianAssigned ?? null,
        },
        language,
      });
    } catch {
      window.alert(tp("errors.print"));
    }
  };

  const generateInstructions = (forceReplaceEdited = false) => {
    if (!providerDoc.dischargeDiagnoses.length || readOnly || !canProvider) return;
    const usable = providerDoc.dischargeDiagnoses.filter((d) => (d.description ?? "").trim());
    if (!usable.length) return;
    const { instructions, followUps } = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: usable,
      locale: resolveProductUiLanguageOrDefault(language),
      facilityDisplayName,
    });
    touchProvider((prev) => {
      const prevPi = prev.patientInstructions;
      const edited = prevPi?.clinicianEdited === true;
      if (edited && !forceReplaceEdited) {
        setInstructionSuggestionPending(true);
        return prev;
      }
      setInstructionSuggestionPending(false);
      return {
        ...prev,
        patientInstructions: {
          ...instructions,
          clinicianEdited: false,
          generatedAt: new Date().toISOString(),
          patientInstructionsGiven: false,
        },
        followUps: followUps.length ? followUps : prev.followUps ?? [],
        fieldProvenance: {
          ...prev.fieldProvenance,
          lastInstructionDraftAt: new Date().toISOString(),
        },
      };
    });
  };

  const courseLanguage = resolveProductUiLanguageOrDefault(language);
  const chartDraft = useMemo(() => {
    if (!chartBootstrap) return null;
    return buildInpatientDischargeChartDraft({
      ...chartBootstrap,
      dischargeDiagnoses: providerDoc.dischargeDiagnoses.length
        ? providerDoc.dischargeDiagnoses
        : chartBootstrap.dischargeDiagnoses,
      language: courseLanguage,
    });
  }, [chartBootstrap, courseLanguage, providerDoc.dischargeDiagnoses]);

  const protectedChartUpdates = useMemo(() => {
    if (!chartDraft) return [];
    return listProtectedChartFieldsWithUpdates({
      existing: providerDoc,
      draft: chartDraft,
    });
  }, [chartDraft, providerDoc]);

  const refreshFromChart = () => {
    if (!chartBootstrap || !chartDraft || readOnly || !canProvider) return;
    const protectedUpdates = listProtectedChartFieldsWithUpdates({
      existing: providerDoc,
      draft: chartDraft,
    });
    let forceReplaceFields: string[] = [];
    if (protectedUpdates.length) {
      const fieldLines = protectedUpdates
        .map((field) => `- ${tp(`chartFields.${field}`)}`)
        .join("\n");
      const confirmed = window.confirm(
        `${tp("refreshConfirmIntro")}\n${fieldLines}\n\n${tp("refreshConfirmContinue")}`
      );
      if (!confirmed) {
        const { next } = mergeChartDraftPreservingClinicianEdits({
          existing: providerDoc,
          draft: chartDraft,
          forceReplaceFields: [],
        });
        setProviderDoc(next);
        setDirtyProvider(true);
        return;
      }
      forceReplaceFields = protectedUpdates;
    }
    const { next } = mergeChartDraftPreservingClinicianEdits({
      existing: providerDoc,
      draft: chartDraft,
      forceReplaceFields,
    });
    setProviderDoc(next);
    setDirtyProvider(true);
  };

  const addDischargeDiagnosis = (input: {
    code?: string | null;
    description: string;
  }) => {
    const description = input.description.trim();
    if (!description) return;
    const code = input.code?.trim() || null;
    if (
      isDuplicateDischargeDiagnosis(
        { code, description },
        providerDoc.dischargeDiagnoses
      )
    ) {
      return;
    }
    const nextRows = [
      ...providerDoc.dischargeDiagnoses,
      {
        id: newId("dx"),
        code: code ?? "",
        description,
        isPrimary: providerDoc.dischargeDiagnoses.length === 0,
        sortOrder: providerDoc.dischargeDiagnoses.length,
      } satisfies InpatientProviderDischargeDiagnosis,
    ];
    const editedInstructions = providerDoc.patientInstructions?.clinicianEdited === true;
    touchProvider((prev) => ({
      ...prev,
      dischargeDiagnoses: nextRows,
    }));
    if (editedInstructions) {
      setInstructionSuggestionPending(true);
    } else {
      const { instructions, followUps } = generateInpatientPatientInstructionsFromDiagnoses({
        diagnoses: nextRows,
        locale: courseLanguage,
        facilityDisplayName,
      });
      touchProvider((prev) => ({
        ...prev,
        dischargeDiagnoses: nextRows,
        patientInstructions: {
          ...instructions,
          clinicianEdited: false,
          generatedAt: new Date().toISOString(),
          patientInstructionsGiven: false,
        },
        followUps: followUps.length ? followUps : prev.followUps ?? [],
      }));
    }
  };

  const medReconPreload = useMemo(() => {
    return buildInpatientDischargeMedReconPreload({
      existingDischargeReconLines: savedMedReconLines,
      clinicalOpsLines: ops?.medicationReconciliation ?? [],
      admissionHomeMedicationLines: admissionHomeMedLines,
      patientHomeMedications,
      providerDischargeMedications: providerDoc.dischargeMedications ?? [],
      historyLoadFailed: medHistoryLoadFailed,
    });
  }, [
    admissionHomeMedLines,
    medHistoryLoadFailed,
    ops?.medicationReconciliation,
    patientHomeMedications,
    providerDoc.dischargeMedications,
    savedMedReconLines,
  ]);

  const medReconLines = medReconPreload.lines;
  const medReconHistoryState: InpatientDischargeMedReconHistoryState =
    medReconPreload.historyState;

  const medReconFinalized = isInpatientMedReconEffectivelyComplete({
    storedComplete:
      medReconStatus === "COMPLETE" ||
      finalReadiness?.medicationReconciliation === "complete",
    lines: medReconLines,
  });

  const completeMedRec = async () => {
    if (!canOps || readOnly) return;
    if (medReconLines.length > 0 && !allRequiredMedReconDecisionsComplete(medReconLines)) {
      setError(tp("medRecon.finalizeBlocked"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patchInpatientClinicalOps(encounterId, {
        finalizeInpatientMedRecon: {
          markComplete: true,
          lines: medReconLines.map(serializeMedReconLine),
        },
      });
      await loadAll();
    } catch {
      setError(tp("errors.medRec"));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (complete: boolean, labelComplete: string, labelPending: string) => (
    <span style={complete ? badgeComplete : badgePending}>
      {complete ? labelComplete : labelPending}
    </span>
  );

  if (loading) {
    return (
      <div data-testid="inp-dis-1f-board" style={{ padding: 12, color: DISCHARGE_BOARD_COLORS.muted }}>
        {tp("loading")}
      </div>
    );
  }

  const responsiveFourCol: CSSProperties = {
    ...fourColGrid,
  };

  return (
    <div
      data-testid="inp-dis-1f-board"
      style={{ display: "grid", gap: 12, fontSize: 13, color: DISCHARGE_BOARD_COLORS.text }}
    >
      {/* Header */}
      <div style={{ ...boardSectionStyle, gap: 10 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "grid", gap: 6, minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{tp("title")}</h2>
            <div style={identityStrip} data-testid="inp-dis-1f-identity">
              <strong style={{ fontSize: 15 }}>{patientName}</strong>
              <span>
                {tp("mrn")}: {patient?.mrn || tp("none")}
              </span>
              <span>
                {tp("dob")}: {formatDob(patient?.dob ?? null, dateLocale)}
                {age != null ? ` (${age} ${tp("years")})` : ""}
              </span>
              <span>
                {tp("sex")}: {sexLabel}
              </span>
              <span>
                {tp("encounter")} #{encounterId.slice(0, 8)}
              </span>
              <span>
                {tp("admit")}: {formatAdmit(admittedAt ?? null, dateLocale)}
              </span>
              <span style={badgeComplete}>{tp("inpatientBadge")}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              data-testid="inp-dis-1f-refresh"
              style={neutralBtn}
              onClick={() => void loadAll({ confirmDirty: true })}
            >
              {tp("refresh")}
            </button>
            <button
              type="button"
              data-testid="inp-dis-1f-print"
              style={secondaryBtn}
              onClick={() => void handlePrint()}
            >
              {tp("print")}
            </button>
          </div>
        </div>
      </div>

      {/* Readiness chips */}
      <div
        data-testid="inp-dis-1f-readiness"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {chipRows.map((chip) => (
          <button
            key={chip.id}
            type="button"
            data-testid={`inp-dis-1f-chip-${chip.id}`}
            style={readinessChipStyle(chip.status)}
            onClick={() => scrollToId(chip.target)}
          >
            {markForStatus(chip.status)} {chip.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, color: DISCHARGE_BOARD_COLORS.danger, fontSize: 12 }}>
          {error}
        </p>
      ) : null}
      {validationErrors.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, color: DISCHARGE_BOARD_COLORS.danger, fontSize: 12 }}>
          {validationErrors.map((code) => (
            <li key={code}>{validationLabel(code)}</li>
          ))}
        </ul>
      ) : null}

      {/* Four column cards */}
      <div
        style={responsiveFourCol}
        className="inp-dis-1f-four-col"
        data-testid="inp-dis-1f-four-cards"
      >
        <style>{`
          @media (max-width: 1100px) {
            [data-testid="inp-dis-1f-four-cards"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 640px) {
            [data-testid="inp-dis-1f-four-cards"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <CardShell
          data-testid="inp-dis-1f-card-provider"
          title={tp("cards.provider")}
          badge={statusBadge(
            providerFinalized,
            tp("cards.finalized"),
            providerDoc.providerDocumentationFinalizedAt ? tp("cards.finalized") : tp("cards.draft")
          )}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <FactRow
              label={tp("clinicalSummary.diagnoses")}
              value={String(providerDoc.dischargeDiagnoses?.length ?? 0)}
            />
            <FactRow
              label={tp("clinicalSummary.hospitalCourse")}
              value={
                providerDoc.hospitalCourse?.trim()
                  ? tp("readiness.complete")
                  : tp("readiness.incomplete")
              }
            />
            <FactRow
              label={tp("clinicalSummary.followUp")}
              value={
                (providerDoc.followUps?.length ?? 0) > 0
                  ? tp("readiness.complete")
                  : tp("readiness.incomplete")
              }
            />
            <FactRow
              label={tp("disposition.finalDisposition")}
              value={
                dispositionCode
                  ? tp(`dispositionCodes.${dispositionCode}`)
                  : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("disposition.condition")}
              value={
                providerDoc.conditionAtDischarge?.status
                  ? tp(`condition.${providerDoc.conditionAtDischarge.status}`)
                  : tp("notDocumented")
              }
            />
            {providerDoc.documentedByDisplayNameSnapshot ? (
              <FactRow
                label={tp("readiness.provider")}
                value={providerDoc.documentedByDisplayNameSnapshot}
              />
            ) : null}
            {providerDoc.providerDocumentationFinalizedAt ? (
              <FactRow
                label={tp("cards.finalized")}
                value={new Date(providerDoc.providerDocumentationFinalizedAt).toLocaleString(
                  dateLocale
                )}
              />
            ) : null}
          </div>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => scrollToId("inp-dis-provider-details")}
          >
            {tp("cards.providerCta")}
          </button>
        </CardShell>

        <CardShell
          data-testid="inp-dis-1f-card-nursing"
          title={tp("cards.nursing")}
          badge={statusBadge(
            nursingCompleted,
            tp("cards.completed"),
            tp("cards.inProgress")
          )}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <FactRow
              label={tp("nursing.instructionsReviewed")}
              value={
                nursingDoc.education?.instructionsReviewed ? tp("yes") : tp("no")
              }
            />
            <FactRow
              label={tp("nursing.ivLines")}
              value={
                nursingDoc.devices?.ivRemoved ? tp("nursing.ivRemoved") : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("nursing.belongings")}
              value={
                nursingDoc.belongings?.returned
                  ? tp("nursing.belongingsReturned")
                  : nursingDoc.belongings?.unknown
                    ? tp("nursing.belongingsUnknown")
                    : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("nursing.transport")}
              value={
                nursingDoc.transport?.mode
                  ? tp(`transportModes.${nursingDoc.transport.mode}`)
                  : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("nursing.departure")}
              value={
                nursingDoc.departure?.departedAt
                  ? new Date(nursingDoc.departure.departedAt).toLocaleString(dateLocale)
                  : tp("notDocumented")
              }
            />
            {nursingDoc.completedByDisplayNameSnapshot ? (
              <FactRow
                label={tp("completedBy")}
                value={nursingDoc.completedByDisplayNameSnapshot}
              />
            ) : null}
          </div>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => scrollToId("inp-dis-nursing-details")}
          >
            {tp("cards.nursingCta")}
          </button>
        </CardShell>

        <CardShell
          id="inp-dis-1f-card-planning"
          data-testid="inp-dis-1f-card-planning"
          title={tp("cards.planning")}
          badge={
            planningDisplayReady ? (
              <span style={badgeComplete}>{tp("readiness.ready")}</span>
            ) : (
              <span style={badgePending}>{tp("cards.pending")}</span>
            )
          }
        >
          <div style={{ display: "grid", gap: 4 }}>
            <FactRow
              label={tp("planning.plannedDestination")}
              value={
                planningSummary.plannedDestination
                  ? (() => {
                      const code = planningSummary.plannedDestination;
                      const labeled = enumLabel(`dispositionCodes.${code}`, code);
                      return labeled;
                    })()
                  : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("planning.homeHealth")}
              value={planningSummary.homeHealth || tp("none")}
            />
            <FactRow
              label={tp("planning.transportPlan")}
              value={
                planningSummary.transportPlan
                  ? (() => {
                      const m = planningSummary.transportPlan;
                      const labeled = tp(`transportModes.${m}`);
                      return labeled.startsWith(PREFIX) ? m : labeled;
                    })()
                  : tp("notDocumented")
              }
            />
            <FactRow
              label={tp("planning.specialNeeds")}
              value={planningSummary.specialNeedsEquipment || tp("none")}
            />
            <FactRow
              label={tp("careTeamNotified")}
              value={
                planningSummary.careTeamNotified === true
                  ? tp("yes")
                  : planningSummary.careTeamNotified === false
                    ? tp("no")
                    : tp("none")
              }
            />
          </div>
          {planningSummary.differsFromProviderDisposition ? (
            <span style={badgeAttention}>{tp("differsFromProvider")}</span>
          ) : null}
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => setPlanningOpen((v) => !v)}
          >
            {planningOpen ? tp("hideDetails") : tp("cards.planningCta")}
          </button>
        </CardShell>

        <CardShell
          id="inp-dis-final"
          data-testid="inp-dis-1f-card-final"
          title={tp("cards.final")}
          badge={
            completed || encounterClosed ? (
              <span style={badgeComplete}>{tp("cards.completed")}</span>
            ) : finalReadiness?.ready ? (
              <span style={badgeComplete}>{tp("cards.ready")}</span>
            ) : (
              <span style={badgeAttention}>{tp("cards.blocked")}</span>
            )
          }
        >
          {completed || encounterClosed ? (
            <div style={{ display: "grid", gap: 4 }}>
              <strong>
                {completed?.dispositionLabelSnapshot ||
                  completed?.clinicalDispositionCode ||
                  finalReadiness?.dispositionLabel ||
                  tp("final.completedTitle")}
              </strong>
              {completed?.dischargedAt ? (
                <span style={{ fontSize: 12 }}>
                  {tp("dischargedAt")}:{" "}
                  {new Date(completed.dischargedAt).toLocaleString(dateLocale)}
                </span>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {finalReadiness?.ready ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#059669",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                    aria-hidden
                  >
                    ✓
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tp("cards.allComplete")}</div>
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#b45309" }}>
                  {(finalReadiness?.blockers ?? []).slice(0, 4).map((b) => (
                    <li key={b.code}>{validationLabel(b.code)}</li>
                  ))}
                </ul>
              )}
              <FactRow
                label={tp("disposition.finalDisposition")}
                value={
                  finalReadiness?.dispositionLabel ||
                  (dispositionCode ? tp(`dispositionCodes.${dispositionCode}`) : tp("none"))
                }
              />
              <FactRow
                label={tp("nursing.departure")}
                value={
                  finalReadiness?.departedAt
                    ? new Date(finalReadiness.departedAt).toLocaleString(dateLocale)
                    : tp("notDocumented")
                }
              />
              <FactRow
                label={tp("planning.workflowState")}
                value={
                  finalReadiness?.ready ? tp("cards.ready") : tp("cards.blocked")
                }
              />
              <button
                type="button"
                data-testid="inp-dis-1f-discharge-patient"
                style={
                  canRunFinal && !executing ? primaryBtn : disabledBtn(primaryBtn)
                }
                disabled={!canRunFinal || executing}
                onClick={() => void executeFinal()}
              >
                {executing ? tp("actions.discharging") : tp("actions.dischargePatient")}
              </button>
              {!finalReadiness?.ready ? (
                <button
                  type="button"
                  style={neutralBtn}
                  onClick={() => {
                    const first = finalReadiness?.blockers?.[0]?.code;
                    if (first?.includes("MEDICATION")) scrollToId("inp-dis-med-rec");
                    else if (first?.includes("NURSING") || first?.includes("DEPARTURE"))
                      scrollToId("inp-dis-nursing-details");
                    else scrollToId("inp-dis-provider-details");
                  }}
                >
                  {tp("cards.reviewBefore")}
                </button>
              ) : null}
            </div>
          )}
        </CardShell>
      </div>

      {/* Med Rec strip */}
      <div id="inp-dis-med-rec" data-testid="inp-dis-1f-med-rec" style={boardSectionStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <strong>{tp("readiness.medRec")}</strong>
          <span
            style={
              finalReadiness?.medicationReconciliation === "not_applicable"
                ? badgePending
                : medReconFinalized
                  ? badgeComplete
                  : badgeAttention
            }
          >
            {finalReadiness?.medicationReconciliation === "not_applicable"
              ? tp("readiness.not_applicable")
              : medReconFinalized
                ? tp("readiness.complete")
                : tp("readiness.attention")}
          </span>
          {!readOnly &&
          canOps &&
          !medReconFinalized &&
          finalReadiness?.medicationReconciliation !== "not_applicable" &&
          (medReconLines.length === 0 ||
            allRequiredMedReconDecisionsComplete(medReconLines)) ? (
            <button
              type="button"
              style={secondaryBtn}
              disabled={saving}
              onClick={() => void completeMedRec()}
            >
              {tp("completeMedRec")}
            </button>
          ) : null}
        </div>
      </div>

      {/* Planning details panel */}
      {planningOpen ? (
        <div data-testid="inp-dis-1f-planning-details" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("cards.planning")}</h3>
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              minWidth: 0,
            }}
          >
            <label>
              <span style={labelStyle}>{tp("planning.plannedDestination")}</span>
              <select
                data-testid="inp-dis-1j-planning-destination"
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.destination}
                onChange={(e) => touchPlanning({ destination: e.target.value })}
              >
                <option value="">—</option>
                {INPATIENT_FINAL_DISPOSITION_CODES_1C.map((code) => (
                  <option key={code} value={code}>
                    {enumLabel(`dispositionCodes.${code}`, code)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.transportPlan")}</span>
              <input
                data-testid="inp-dis-1j-planning-transport"
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.transportation}
                onChange={(e) => touchPlanning({ transportation: e.target.value })}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.anticipatedDate")}</span>
              <input
                type="date"
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.anticipatedDischargeDate}
                onChange={(e) => touchPlanning({ anticipatedDischargeDate: e.target.value })}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.homeHealth")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.homeHealth}
                onChange={(e) => touchPlanning({ homeHealth: e.target.value })}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.specialNeeds")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.specialNeedsEquipment}
                onChange={(e) => touchPlanning({ specialNeedsEquipment: e.target.value })}
              />
            </label>
          </div>
          <label>
            <span style={labelStyle}>{tp("planning.barriers")}</span>
            <textarea
              style={{ ...fieldStyle, minHeight: 48 }}
              disabled={readOnly || !canOps}
              value={planning.barriers}
              onChange={(e) => touchPlanning({ barriers: e.target.value })}
            />
          </label>
          <Check
            label={tp("careTeamNotified")}
            checked={planning.careTeamNotified}
            disabled={readOnly || !canOps}
            onChange={(v) => touchPlanning({ careTeamNotified: v })}
          />
          {!readOnly && canOps ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                data-testid="inp-dis-1j-save-planning"
                style={secondaryBtn}
                disabled={saving}
                onClick={() => void savePlanning()}
              >
                {saving ? tp("actions.saving") : tp("savePlanning")}
              </button>
              <button
                type="button"
                data-testid="inp-dis-1j-mark-planning-ready"
                style={primaryBtn}
                disabled={saving}
                onClick={() => void markPlanningReady()}
              >
                {tp("planning.markReady")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Clinical summary + pending studies */}
      <div style={twoColGrid} data-testid="inp-dis-1f-summary-row">
        <div data-testid="inp-dis-1f-clinical-summary" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("clinicalSummary.title")}</h3>
          <div>
            <strong style={{ fontSize: 12 }}>{tp("clinicalSummary.diagnoses")}</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {providerDoc.dischargeDiagnoses.length === 0 ? (
                <li>{tp("notDocumented")}</li>
              ) : (
                providerDoc.dischargeDiagnoses.map((dx) => (
                  <li key={dx.id}>
                    {dx.isPrimary ? <strong>{tp("clinicalSummaryPrimary")} — </strong> : null}
                    {inpatientDxTitle(dx) || tp("none")}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <strong style={{ fontSize: 12 }}>{tp("clinicalSummary.hospitalCourse")}</strong>
            <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
              {(() => {
                const course = formatDischargeNarrativeForDisplay(
                  providerDoc.hospitalCourse,
                  courseLanguage
                );
                if (!course) return tp("notDocumented");
                return course.length > 280 ? `${course.slice(0, 280)}…` : course;
              })()}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: 12 }}>{tp("clinicalSummary.followUp")}</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {(providerDoc.followUps ?? []).length === 0 ? (
                <li>{tp("notDocumented")}</li>
              ) : (
                (providerDoc.followUps ?? []).map((fu) => (
                  <li key={fu.id}>
                    {fu.specialty}
                    {fu.timing ? ` — ${fu.timing}` : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
          {!providerDoc.noKnownPendingStudies && providerDoc.pendingStudies.length > 0 ? (
            <div>
              <strong style={{ fontSize: 12 }}>{tp("pendingStudies.title")}</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {providerDoc.pendingStudies.map((row) => (
                  <li key={row.id}>
                    {formatInpatientDischargePendingStudyTypeLabel(row.type, courseLanguage)}
                    {row.description ? ` — ${row.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div data-testid="inp-dis-1f-pending-studies" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("pendingStudies.title")}</h3>
          <Check
            label={tp("noKnownPending")}
            checked={providerDoc.noKnownPendingStudies === true}
            disabled={!providerWriteEnabled}
            onChange={(v) =>
              touchProvider((prev) => ({
                ...prev,
                noKnownPendingStudies: v,
                pendingStudies: v ? [] : prev.pendingStudies,
              }))
            }
          />
          {!providerDoc.noKnownPendingStudies
            ? providerDoc.pendingStudies.map((row, index) => (
                <div key={row.id} style={{ display: "grid", gap: 6 }}>
                  <select
                    style={fieldStyle}
                    disabled={!providerWriteEnabled}
                    value={row.type}
                    onChange={(e) => {
                      const next = [...providerDoc.pendingStudies];
                      next[index] = {
                        ...row,
                        type: e.target.value as InpatientProviderDischargePendingStudy["type"],
                      };
                      touchProvider((prev) => ({ ...prev, pendingStudies: next }));
                    }}
                  >
                    {INPATIENT_PENDING_STUDY_TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {tp(`pendingStudyTypes.${ty}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    style={fieldStyle}
                    disabled={!providerWriteEnabled}
                    value={row.description ?? ""}
                    onChange={(e) => {
                      const next = [...providerDoc.pendingStudies];
                      next[index] = { ...row, description: e.target.value };
                      touchProvider((prev) => ({ ...prev, pendingStudies: next }));
                    }}
                  />
                  {providerWriteEnabled ? (
                    <button
                      type="button"
                      style={dangerBtn}
                      onClick={() =>
                        touchProvider((prev) => ({
                          ...prev,
                          pendingStudies: prev.pendingStudies.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      {tp("remove")}
                    </button>
                  ) : null}
                </div>
              ))
            : null}
          {!readOnly && canProvider && !providerDoc.noKnownPendingStudies ? (
            <button
              type="button"
              style={neutralBtn}
              onClick={() =>
                touchProvider((prev) => ({
                  ...prev,
                  pendingStudies: [
                    ...prev.pendingStudies,
                    {
                      id: newId("ps"),
                      type: "LAB",
                      description: "",
                      responsibleParty: null,
                      followUpPlan: null,
                    },
                  ],
                }))
              }
            >
              {tp("addPendingStudy")}
            </button>
          ) : null}
        </div>
      </div>

      {/* Provider details: diagnoses + hospital course */}
      <div id="inp-dis-provider-details" data-testid="inp-dis-1f-provider-details" style={boardSectionStyle}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{tp("diagnoses.title")}</h3>
        {providerDoc.dischargeDiagnoses.length > 0 &&
        providerDoc.dischargeDiagnoses.every((d) => !d.isPrimary) ? (
          <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>{tp("noPrimaryWarning")}</p>
        ) : null}
        {providerDoc.dischargeDiagnoses.map((row, index) => (
          <div
            key={row.id}
            data-testid={`inp-dis-1i-dx-card-${row.id}`}
            style={{
              display: "grid",
              gap: 4,
              padding: "8px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            {row.isPrimary ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>{tp("primary")}</span>
            ) : null}
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#0f172a",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {inpatientDxTitle(row)}
            </div>
            {row.code ? (
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 400 }}>{row.code}</div>
            ) : null}
            {providerWriteEnabled ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={neutralBtn}
                  disabled={readOnly || !canProvider || row.isPrimary}
                  onClick={() =>
                    touchProvider((prev) => ({
                      ...prev,
                      dischargeDiagnoses: prev.dischargeDiagnoses.map((d, i) => ({
                        ...d,
                        isPrimary: i === index,
                      })),
                    }))
                  }
                >
                  {row.isPrimary ? tp("primary") : tp("setPrimary")}
                </button>
                {row.isPrimary ? (
                  <button
                    type="button"
                    style={neutralBtn}
                    disabled={readOnly || !canProvider}
                    onClick={() =>
                      touchProvider((prev) => ({
                        ...prev,
                        dischargeDiagnoses: prev.dischargeDiagnoses.map((d) => ({
                          ...d,
                          isPrimary: false,
                        })),
                      }))
                    }
                  >
                    {tp("removePrimary")}
                  </button>
                ) : null}
                <button
                  type="button"
                  style={dangerBtn}
                  onClick={() =>
                    touchProvider((prev) => ({
                      ...prev,
                      dischargeDiagnoses: prev.dischargeDiagnoses.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {tp("remove")}
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {providerWriteEnabled ? (
          <div style={{ display: "grid", gap: 8 }}>
            <Icd10DiagnosisSearchAutocomplete
              language={resolveProductUiLanguageOrDefault(language)}
              disabled={!providerWriteEnabled}
              label={tp("searchDiagnoses")}
              placeholder={tp("searchDiagnosesPlaceholder")}
              searchingLabel={t("diagnosisEntry.icdSearching")}
              noResultsLabel={t("diagnosisEntry.icdNoResults")}
              searchFailedLabel={tp("unableToSearchDiagnoses")}
              alreadyAddedLabel={tp("alreadyAdded")}
              selectedDiagnoses={providerDoc.dischargeDiagnoses}
              onSelect={(hit, description) => {
                setLiveDxPresentationByCode((prev) => ({
                  ...prev,
                  [hit.code.trim().toUpperCase()]: {
                    displayLabel: hit.displayLabel,
                    displayResolution: hit.displayResolution,
                  },
                }));
                addDischargeDiagnosis({ code: hit.code, description });
              }}
            />
            {(chartBootstrap?.suggestedChartDiagnoses ?? []).filter(
              (s) =>
                s.description &&
                !isDuplicateDischargeDiagnosis(s, providerDoc.dischargeDiagnoses)
            ).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>{tp("suggestedFromChart")}</span>
                {(chartBootstrap?.suggestedChartDiagnoses ?? []).map((s, i) =>
                  !s.description ||
                  isDuplicateDischargeDiagnosis(s, providerDoc.dischargeDiagnoses) ? null : (
                    <button
                      key={`${s.code ?? "s"}-${i}`}
                      type="button"
                      style={secondaryBtn}
                      onClick={() =>
                        addDischargeDiagnosis({
                          code: s.code,
                          description: s.description,
                        })
                      }
                    >
                      {tp("addSuggested")}: {formatInpatientDischargeDiagnosisDisplay(s)}
                    </button>
                  )
                )}
              </div>
            ) : null}
            <button type="button" style={secondaryBtn} onClick={() => generateInstructions()}>
              {tp("refreshInstructions")}
            </button>
          </div>
        ) : null}
        {instructionSuggestionPending ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              fontSize: 12,
              color: "#92400e",
            }}
          >
            <span>{tp("suggestedInstructionUpdates")}</span>
            {providerWriteEnabled ? (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => generateInstructions(true)}
              >
                {tp("applySuggestedInstructions")}
              </button>
            ) : null}
          </div>
        ) : null}
        {providerDoc.dischargeDiagnoses.some((d) => (d.description ?? "").trim()) &&
        !providerDoc.dischargeDiagnoses.some((d) =>
          inpatientDiagnosisHasSpecificInstructionTemplate(d)
        ) ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{tp("noDiagnosisTemplate")}</p>
        ) : null}
        {providerDoc.patientInstructions ||
        dispositionUsesHomeInstructionEngine(dispositionCode) ? (
          <div style={{ display: "grid", gap: 8 }}>
            {(
              [
                ["returnPrecautions", "returnPrecautions"],
                ["diagnosisInstructions", "diagnosisInstructions"],
                ["followUpInstructions", "followUpInstructions"],
                ["medicationInstructions", "medicationInstructions"],
              ] as const
            ).map(([labelKey, field]) => (
              <label key={field}>
                <span style={labelStyle}>{tp(`instructions.${labelKey}`)}</span>
                <textarea
                  style={{ ...fieldStyle, minHeight: 64 }}
                  disabled={!providerWriteEnabled}
                  value={providerDoc.patientInstructions?.[field] ?? ""}
                  onChange={(e) =>
                    touchProvider((prev) => ({
                      ...prev,
                      patientInstructions: {
                        ...prev.patientInstructions,
                        [field]: e.target.value,
                        clinicianEdited: true,
                        patientInstructionsGiven: prev.patientInstructions?.patientInstructionsGiven === true,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {/* Hospital course collapsible */}
      <div data-testid="inp-dis-1f-hospital-course" style={boardSectionStyle}>
        <button
          type="button"
          style={{ ...neutralBtn, justifySelf: "start" }}
          onClick={() => setCourseOpen((v) => !v)}
        >
          {courseOpen ? tp("courseExpanded") : tp("courseCollapsed")}
        </button>
        {courseOpen ? (
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{tp("hospitalCourse.title")}</h3>
            {providerWriteEnabled && protectedChartUpdates.length > 0 ? (
              <div
                data-testid="inp-dis-1i-chart-updates"
                style={{ fontSize: 12, color: "#92400e" }}
              >
                {tp("chartUpdatesAvailable")}
              </div>
            ) : null}
            {providerWriteEnabled && chartBootstrap ? (
              <button type="button" style={secondaryBtn} onClick={refreshFromChart}>
                {protectedChartUpdates.length ? tp("reviewChartUpdates") : tp("refreshChart")}
              </button>
            ) : null}
            {(
              [
                ["admissionDiagnosis", "admissionDiagnosis"],
                ["reason", "reasonForHospitalization"],
                ["course", "hospitalCourse"],
                ["consultations", "consultations"],
                ["procedures", "proceduresAndTreatments"],
                ["findings", "significantFindings"],
                ["complications", "complications"],
              ] as const
            ).map(([labelKey, field]) => (
              <label key={field}>
                <span style={labelStyle}>{tp(`hospitalCourse.${labelKey}`)}</span>
                {field === "admissionDiagnosis" ? (
                  <input
                    style={fieldStyle}
                    disabled={!providerWriteEnabled}
                    value={providerDoc.admissionDiagnosis?.description ?? ""}
                    onChange={(e) =>
                      touchProvider((prev) => ({
                        ...prev,
                        admissionDiagnosis: {
                          description: e.target.value,
                          code: prev.admissionDiagnosis?.code ?? null,
                        },
                        fieldProvenance: markClinicianEditedField(
                          prev.fieldProvenance,
                          "admissionDiagnosis"
                        ),
                      }))
                    }
                  />
                ) : (
                  <>
                    <textarea
                      style={{
                        ...fieldStyle,
                        minHeight: field === "hospitalCourse" ? 88 : 52,
                      }}
                      disabled={!providerWriteEnabled}
                      value={(providerDoc[field] as string | null | undefined) ?? ""}
                      onChange={(e) =>
                        touchProvider((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                          fieldProvenance: markClinicianEditedField(prev.fieldProvenance, field),
                        }))
                      }
                    />
                    {!String((providerDoc[field] as string | null | undefined) ?? "").trim() &&
                    field === "consultations" ? (
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {tp("emptyChart.consultations")}
                      </span>
                    ) : null}
                    {!String((providerDoc[field] as string | null | undefined) ?? "").trim() &&
                    field === "proceduresAndTreatments" ? (
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {tp("emptyChart.procedures")}
                      </span>
                    ) : null}
                    {!String((providerDoc[field] as string | null | undefined) ?? "").trim() &&
                    field === "significantFindings" ? (
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {tp("emptyChart.findings")}
                      </span>
                    ) : null}
                    {!String((providerDoc[field] as string | null | undefined) ?? "").trim() &&
                    field === "complications" ? (
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {tp("emptyChart.complications")}
                      </span>
                    ) : null}
                  </>
                )}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {/* Disposition + condition */}
      <div id="inp-dis-disposition" data-testid="inp-dis-1f-disposition" style={boardSectionStyle}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{tp("disposition.title")}</h3>
        <label>
          <span style={labelStyle}>{tp("disposition.finalDisposition")}</span>
          <select
            style={fieldStyle}
            disabled={!providerWriteEnabled}
            value={dispositionCode}
            onChange={(e) => setDisposition(e.target.value)}
          >
            <option value="">—</option>
            {INPATIENT_FINAL_DISPOSITION_CODES_1C.map((code) => (
              <option key={code} value={code}>
                {enumLabel(`dispositionCodes.${code}`, code)}
              </option>
            ))}
          </select>
        </label>
        {showCondition ? (
          <>
            <label>
              <span style={labelStyle}>{tp("disposition.condition")}</span>
              <select
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                value={providerDoc.conditionAtDischarge?.status ?? ""}
                onChange={(e) => {
                  const status = e.target.value;
                  touchProvider((prev) => ({
                    ...prev,
                    conditionAtDischarge: status
                      ? {
                          status: status as (typeof INPATIENT_CONDITION_AT_DISCHARGE_STATUSES)[number],
                          narrative: prev.conditionAtDischarge?.narrative ?? null,
                        }
                      : null,
                  }));
                }}
              >
                <option value="">—</option>
                {INPATIENT_CONDITION_AT_DISCHARGE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {enumLabel(`condition.${status}`, status)}
                  </option>
                ))}
              </select>
            </label>
            {providerDoc.conditionAtDischarge?.status === "OTHER" ? (
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                placeholder={tp("disposition.conditionNarrative")}
                value={providerDoc.conditionAtDischarge.narrative ?? ""}
                onChange={(e) =>
                  touchProvider((prev) => ({
                    ...prev,
                    conditionAtDischarge: { status: "OTHER", narrative: e.target.value },
                  }))
                }
              />
            ) : null}
          </>
        ) : null}

        {dispositionCode === "TRANSFER_ACUTE_CARE" ||
        dispositionCode === "BEHAVIORAL_HEALTH_FACILITY" ? (
          <div data-testid="inp-dis-1f-transfer-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.receivingHospital")}
              value={providerDoc.finalDisposition?.transfer?.receivingHospital ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    receivingHospital: e.target.value,
                  },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.transfer?.receivingService ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    receivingService: e.target.value,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.receivingService")}</option>
              {INPATIENT_TRANSFER_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.receivingPhysician")}
              value={providerDoc.finalDisposition?.transfer?.receivingPhysician ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    receivingPhysician: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.acceptedBy")}
              value={providerDoc.finalDisposition?.transfer?.acceptedBy ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    acceptedBy: e.target.value,
                    transferAccepted: true,
                  },
                })
              }
            />
            <label>
              <span style={labelStyle}>{tp("disposition.acceptedAt")}</span>
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                type="datetime-local"
                value={instantToLocalDateTimeInput(
                  providerDoc.finalDisposition?.transfer?.acceptedAt
                )}
                onChange={(e) =>
                  patchDispositionDetails({
                    transfer: {
                      ...providerDoc.finalDisposition?.transfer,
                      acceptedAt: localDateTimeInputToIso(e.target.value),
                    },
                  })
                }
              />
            </label>
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.transfer?.reasonCode ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    reasonCode: e.target.value || null,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.transferReason")}</option>
              {INPATIENT_TRANSFER_REASONS.map((s) => (
                <option key={s} value={s}>
                  {tp(`transferReasons.${s}`)}
                </option>
              ))}
            </select>
            <textarea
              style={{ ...fieldStyle, minHeight: 48 }}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.reasonNarrative")}
              value={providerDoc.finalDisposition?.transfer?.reasonNarrative ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    reasonNarrative: e.target.value,
                  },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.transfer?.transportMode ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    transportMode: e.target.value,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.transportMode")}</option>
              {INPATIENT_TRANSPORT_MODES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.conditionAtTransfer")}
              value={providerDoc.finalDisposition?.transfer?.conditionAtTransfer ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    conditionAtTransfer: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.documentsSent")}
              value={providerDoc.finalDisposition?.transfer?.documentsSent ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    documentsSent: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.pendingResultsCommunicated")}
              value={providerDoc.finalDisposition?.transfer?.pendingResultsCommunicated ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  transfer: {
                    ...providerDoc.finalDisposition?.transfer,
                    pendingResultsCommunicated: e.target.value,
                  },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "SKILLED_NURSING_FACILITY" ||
        dispositionCode === "ACUTE_REHAB" ||
        dispositionCode === "LONG_TERM_ACUTE_CARE" ||
        dispositionCode === "ASSISTED_LIVING" ||
        dispositionCode === "HOSPICE" ? (
          <div data-testid="inp-dis-1f-snf-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.facilityName")}
              value={
                providerDoc.finalDisposition?.snf?.facilityName ??
                providerDoc.finalDisposition?.destinationDetails ??
                ""
              }
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...providerDoc.finalDisposition?.snf, facilityName: e.target.value },
                  destinationDetails: e.target.value,
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.facilityAddress")}
              value={providerDoc.finalDisposition?.snf?.facilityAddress ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...providerDoc.finalDisposition?.snf, facilityAddress: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.facilityPhone")}
              value={providerDoc.finalDisposition?.snf?.facilityPhone ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...providerDoc.finalDisposition?.snf, facilityPhone: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.acceptingProvider")}
              value={providerDoc.finalDisposition?.snf?.acceptingProvider ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...providerDoc.finalDisposition?.snf, acceptingProvider: e.target.value },
                })
              }
            />
            <label>
              <span style={labelStyle}>{tp("disposition.transferAt")}</span>
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                type="datetime-local"
                value={instantToLocalDateTimeInput(providerDoc.finalDisposition?.snf?.transferAt)}
                onChange={(e) =>
                  patchDispositionDetails({
                    snf: {
                      ...providerDoc.finalDisposition?.snf,
                      transferAt: localDateTimeInputToIso(e.target.value),
                    },
                  })
                }
              />
            </label>
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.snf?.transportMode ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: {
                    ...providerDoc.finalDisposition?.snf,
                    transportMode: e.target.value || null,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.transportMode")}</option>
              {INPATIENT_TRANSPORT_MODES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.documentsSent")}
              value={providerDoc.finalDisposition?.snf?.documentsSent ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: {
                    ...providerDoc.finalDisposition?.snf,
                    documentsSent: e.target.value,
                  },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "HOME_WITH_HOME_HEALTH" ? (
          <div data-testid="inp-dis-1f-home-health-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.agencyName")}
              value={providerDoc.finalDisposition?.homeHealth?.agencyName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  homeHealth: {
                    ...providerDoc.finalDisposition?.homeHealth,
                    agencyName: e.target.value,
                  },
                })
              }
            />
            <div style={{ display: "grid", gap: 4 }}>
              <span style={labelStyle}>{tp("disposition.homeHealthServices")}</span>
              {INPATIENT_HOME_HEALTH_SERVICES.map((svc) => {
                const selected = (providerDoc.finalDisposition?.homeHealth?.services ?? []).includes(
                  svc
                );
                return (
                  <Check
                    key={svc}
                    label={tp(`homeHealthServices.${svc}`)}
                    checked={selected}
                    disabled={!providerWriteEnabled}
                    onChange={(v) => {
                      const prev = providerDoc.finalDisposition?.homeHealth?.services ?? [];
                      const next = v
                        ? Array.from(new Set([...prev, svc]))
                        : prev.filter((s) => s !== svc);
                      patchDispositionDetails({
                        homeHealth: {
                          ...providerDoc.finalDisposition?.homeHealth,
                          services: next,
                        },
                      });
                    }}
                  />
                );
              })}
            </div>
            <textarea
              style={{ ...fieldStyle, minHeight: 48 }}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.startOfCareNotes")}
              value={providerDoc.finalDisposition?.homeHealth?.startOfCareNotes ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  homeHealth: {
                    ...providerDoc.finalDisposition?.homeHealth,
                    startOfCareNotes: e.target.value,
                  },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "CORRECTIONAL_FACILITY" ? (
          <div data-testid="inp-dis-1f-correctional-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.facilityName")}
              value={providerDoc.finalDisposition?.correctional?.facilityName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: {
                    ...providerDoc.finalDisposition?.correctional,
                    facilityName: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.agencyName")}
              value={providerDoc.finalDisposition?.correctional?.agencyName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: {
                    ...providerDoc.finalDisposition?.correctional,
                    agencyName: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.officerName")}
              value={providerDoc.finalDisposition?.correctional?.officerName ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: {
                    ...providerDoc.finalDisposition?.correctional,
                    officerName: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.badgeId")}
              value={providerDoc.finalDisposition?.correctional?.badgeId ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  correctional: {
                    ...providerDoc.finalDisposition?.correctional,
                    badgeId: e.target.value,
                  },
                })
              }
            />
            <label>
              <span style={labelStyle}>{tp("disposition.custodyTransferredAt")}</span>
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                type="datetime-local"
                value={instantToLocalDateTimeInput(
                  providerDoc.finalDisposition?.correctional?.custodyTransferredAt
                )}
                onChange={(e) =>
                  patchDispositionDetails({
                    correctional: {
                      ...providerDoc.finalDisposition?.correctional,
                      custodyTransferredAt: localDateTimeInputToIso(e.target.value),
                    },
                  })
                }
              />
            </label>
            <Check
              label={tp("disposition.transportByLawEnforcement")}
              checked={
                providerDoc.finalDisposition?.correctional?.transportByLawEnforcement === true
              }
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  correctional: {
                    ...providerDoc.finalDisposition?.correctional,
                    transportByLawEnforcement: v,
                  },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "AGAINST_MEDICAL_ADVICE" ? (
          <div data-testid="inp-dis-1f-ama-details" style={{ display: "grid", gap: 8 }}>
            <Check
              label={tp("disposition.ama.capacityDocumented")}
              checked={providerDoc.finalDisposition?.ama?.capacityDocumented === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, capacityDocumented: v },
                })
              }
            />
            <Check
              label={tp("disposition.ama.risksDiscussed")}
              checked={providerDoc.finalDisposition?.ama?.risksDiscussed === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, risksDiscussed: v },
                })
              }
            />
            <Check
              label={tp("disposition.ama.alternativesDiscussed")}
              checked={providerDoc.finalDisposition?.ama?.alternativesDiscussed === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, alternativesDiscussed: v },
                })
              }
            />
            <Check
              label={tp("disposition.ama.treatmentOffered")}
              checked={providerDoc.finalDisposition?.ama?.treatmentOffered === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, treatmentOffered: v },
                })
              }
            />
            <Check
              label={tp("disposition.ama.returnPrecautionsReviewed")}
              checked={providerDoc.finalDisposition?.ama?.returnPrecautionsReviewed === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, returnPrecautionsReviewed: v },
                })
              }
            />
            <textarea
              style={{ ...fieldStyle, minHeight: 56 }}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.ama.notes")}
              value={providerDoc.finalDisposition?.ama?.notes ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  ama: { ...providerDoc.finalDisposition?.ama, notes: e.target.value },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.otherDetails")}
              value={providerDoc.finalDisposition?.destinationDetails ?? ""}
              onChange={(e) => patchDispositionDetails({ destinationDetails: e.target.value })}
            />
          </div>
        ) : null}

        {dispositionCode === "ELOPED" ? (
          <div data-testid="inp-dis-1f-eloped-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.lastKnownAt")}
              value={providerDoc.finalDisposition?.eloped?.lastKnownAt ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    lastKnownAt: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.lastKnownLocation")}
              value={providerDoc.finalDisposition?.eloped?.lastKnownLocation ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    lastKnownLocation: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.conditionWhenLastObserved")}
              value={providerDoc.finalDisposition?.eloped?.conditionWhenLastObserved ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    conditionWhenLastObserved: e.target.value,
                  },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.eloped?.ivOrLinesPresent ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    ivOrLinesPresent: (e.target.value || null) as "YES" | "NO" | "UNKNOWN" | null,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.ivOrLinesPresent")}</option>
              <option value="YES">{tp("yes")}</option>
              <option value="NO">{tp("no")}</option>
              <option value="UNKNOWN">{tp("nursing.belongingsUnknown")}</option>
            </select>
            <Check
              label={tp("disposition.providerNotified")}
              checked={providerDoc.finalDisposition?.eloped?.providerNotified === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  eloped: { ...providerDoc.finalDisposition?.eloped, providerNotified: v },
                })
              }
            />
            <Check
              label={tp("disposition.nursingSupervisorNotified")}
              checked={providerDoc.finalDisposition?.eloped?.nursingSupervisorNotified === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    nursingSupervisorNotified: v,
                  },
                })
              }
            />
            <Check
              label={tp("disposition.securityNotified")}
              checked={providerDoc.finalDisposition?.eloped?.securityNotified === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  eloped: { ...providerDoc.finalDisposition?.eloped, securityNotified: v },
                })
              }
            />
            <Check
              label={tp("disposition.lawEnforcementNotified")}
              checked={providerDoc.finalDisposition?.eloped?.lawEnforcementNotified === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    lawEnforcementNotified: v,
                  },
                })
              }
            />
            <Check
              label={tp("disposition.emergencyContactAttempted")}
              checked={providerDoc.finalDisposition?.eloped?.emergencyContactAttempted === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  eloped: {
                    ...providerDoc.finalDisposition?.eloped,
                    emergencyContactAttempted: v,
                  },
                })
              }
            />
            <textarea
              style={{ ...fieldStyle, minHeight: 56 }}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.otherDetails")}
              value={providerDoc.finalDisposition?.eloped?.notes ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  eloped: { ...providerDoc.finalDisposition?.eloped, notes: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "DECEASED" ? (
          <div data-testid="inp-dis-1f-deceased-details" style={{ display: "grid", gap: 8 }}>
            <label>
              <span style={labelStyle}>{tp("disposition.pronouncedAt")}</span>
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                type="datetime-local"
                value={instantToLocalDateTimeInput(
                  providerDoc.finalDisposition?.deceased?.pronouncedAt
                )}
                onChange={(e) =>
                  patchDispositionDetails({
                    deceased: {
                      ...providerDoc.finalDisposition?.deceased,
                      pronouncedAt: localDateTimeInputToIso(e.target.value),
                    },
                  })
                }
              />
            </label>
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.pronouncedBy")}
              value={providerDoc.finalDisposition?.deceased?.pronouncedBy ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    pronouncedBy: e.target.value,
                  },
                })
              }
            />
            <textarea
              style={{ ...fieldStyle, minHeight: 48 }}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.preliminaryContext")}
              value={providerDoc.finalDisposition?.deceased?.preliminaryContext ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    preliminaryContext: e.target.value,
                  },
                })
              }
            />
            <Check
              label={tp("disposition.nextOfKinNotified")}
              checked={providerDoc.finalDisposition?.deceased?.nextOfKinNotified === true}
              disabled={!providerWriteEnabled}
              onChange={(v) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    nextOfKinNotified: v,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.notifiedBy")}
              value={providerDoc.finalDisposition?.deceased?.notifiedBy ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    notifiedBy: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.medicalExaminerStatus")}
              value={providerDoc.finalDisposition?.deceased?.medicalExaminerStatus ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    medicalExaminerStatus: e.target.value,
                  },
                })
              }
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("disposition.organDonationReferralStatus")}
              value={providerDoc.finalDisposition?.deceased?.organDonationReferralStatus ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    organDonationReferralStatus: e.target.value,
                  },
                })
              }
            />
            <select
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              value={providerDoc.finalDisposition?.deceased?.bodyDisposition ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  deceased: {
                    ...providerDoc.finalDisposition?.deceased,
                    bodyDisposition: (e.target.value || null) as
                      | "MORGUE"
                      | "FUNERAL_HOME"
                      | "MEDICAL_EXAMINER"
                      | "OTHER"
                      | null,
                  },
                })
              }
            >
              <option value="">— {tp("disposition.bodyDisposition")}</option>
              {(["MORGUE", "FUNERAL_HOME", "MEDICAL_EXAMINER", "OTHER"] as const).map((d) => (
                <option key={d} value={d}>
                  {tp(`nursing.decedent.${d}`)}
                </option>
              ))}
            </select>
            {providerDoc.finalDisposition?.deceased?.bodyDisposition === "OTHER" ? (
              <input
                style={fieldStyle}
                disabled={!providerWriteEnabled}
                placeholder={tp("disposition.bodyDispositionOther")}
                value={providerDoc.finalDisposition?.deceased?.bodyDispositionOther ?? ""}
                onChange={(e) =>
                  patchDispositionDetails({
                    deceased: {
                      ...providerDoc.finalDisposition?.deceased,
                      bodyDispositionOther: e.target.value,
                    },
                  })
                }
              />
            ) : null}
          </div>
        ) : null}

        {dispositionCode === "OTHER" ? (
          <input
            style={fieldStyle}
            disabled={!providerWriteEnabled}
            placeholder={tp("disposition.otherDetails")}
            value={providerDoc.finalDisposition?.destinationDetails ?? ""}
            onChange={(e) => patchDispositionDetails({ destinationDetails: e.target.value })}
          />
        ) : null}
      </div>

      {/* Follow-up editor */}
      <div data-testid="inp-dis-1f-follow-up" style={boardSectionStyle}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{tp("followUpEditor.title")}</h3>
        {(providerDoc.followUps ?? []).map((row, index) => (
          <div
            key={row.id}
            style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr auto" }}
          >
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("followUpEditor.specialty")}
              value={row.specialty}
              onChange={(e) => {
                const next = [...(providerDoc.followUps ?? [])];
                next[index] = { ...row, specialty: e.target.value };
                touchProvider((prev) => ({ ...prev, followUps: next }));
              }}
            />
            <input
              style={fieldStyle}
              disabled={!providerWriteEnabled}
              placeholder={tp("followUpEditor.timing")}
              value={row.timing ?? ""}
              onChange={(e) => {
                const next = [...(providerDoc.followUps ?? [])];
                next[index] = { ...row, timing: e.target.value };
                touchProvider((prev) => ({ ...prev, followUps: next }));
              }}
            />
            <button
              type="button"
              style={dangerBtn}
              disabled={!providerWriteEnabled}
              onClick={() =>
                touchProvider((prev) => ({
                  ...prev,
                  followUps: (prev.followUps ?? []).filter((_, i) => i !== index),
                }))
              }
            >
              {tp("remove")}
            </button>
          </div>
        ))}
        {providerWriteEnabled ? (
          <button
            type="button"
            style={neutralBtn}
            onClick={() =>
              touchProvider((prev) => ({
                ...prev,
                followUps: [
                  ...(prev.followUps ?? []),
                  {
                    id: newId("fu"),
                    specialty: "",
                    timing: "",
                    source: "MANUAL",
                  } satisfies InpatientDischargeFollowUp1C,
                ],
              }))
            }
          >
            {tp("addFollowUp")}
          </button>
        ) : null}
      </div>

      {/* Nursing execution — disposition-aware cards */}
      <div data-testid="inp-dis-1g-provider-meds-section" style={boardSectionStyle}>
        <InpatientDischargeMedicationsPanel
          facilityId={facilityId ?? null}
          lines={providerDoc.dischargeMedications ?? []}
          disabled={!providerWriteEnabled}
          onChange={(next) =>
            touchProvider((prev) => ({
              ...prev,
              dischargeMedications: next,
              fieldProvenance: markClinicianEditedField(
                prev.fieldProvenance,
                "dischargeMedications"
              ),
            }))
          }
        />
      </div>

      <div data-testid="inp-dis-1g-med-recon-section" style={boardSectionStyle}>
        <InpatientDischargeMedReconPanel
          encounterId={encounterId}
          facilityId={facilityId ?? null}
          initialLines={medReconLines}
          historyState={medReconHistoryState}
          finalized={medReconFinalized}
          disabled={readOnly || (!canNursing && !canProvider)}
          onSaved={async () => {
            await loadAll();
          }}
        />
      </div>

      {canNursing && waitingProviderFinalize && !canCompleteNursing ? (
        <p
          data-testid="inp-dis-1g-waiting-provider"
          style={{ margin: "0 0 8px", fontSize: 13, color: "#b45309" }}
        >
          {tp("validation.WAITING_PROVIDER_FINALIZE")}
        </p>
      ) : null}

      <InpatientDischargeBoardNursing
        nursingDoc={nursingDoc}
        dispositionCode={dispositionCode}
        readOnly={readOnly}
        canNursing={canNursing}
        tp={tp}
        touchNursing={touchNursing}
      />

      {/* Completed by */}
      {(nursingDoc.completedByDisplayNameSnapshot ||
        providerDoc.documentedByDisplayNameSnapshot ||
        completed?.dischargedByDisplayNameSnapshot) && (
        <div data-testid="inp-dis-1f-completed-by" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("completedBy")}</h3>
          {providerDoc.documentedByDisplayNameSnapshot ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {tp("cards.provider")}: {providerDoc.documentedByDisplayNameSnapshot}
              {providerDoc.providerDocumentationFinalizedAt
                ? ` — ${new Date(providerDoc.providerDocumentationFinalizedAt).toLocaleString(dateLocale)}`
                : ""}
            </p>
          ) : null}
          {nursingDoc.completedByDisplayNameSnapshot ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {tp("cards.nursing")}: {nursingDoc.completedByDisplayNameSnapshot}
              {nursingDoc.completedAt
                ? ` — ${new Date(nursingDoc.completedAt).toLocaleString(dateLocale)}`
                : ""}
            </p>
          ) : null}
          {completed?.dischargedByDisplayNameSnapshot ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {tp("dischargedBy")}: {completed.dischargedByDisplayNameSnapshot}
            </p>
          ) : null}
        </div>
      )}

      {/* Bottom action bar */}
      {!readOnly ? (
        <div
          data-testid="inp-dis-1f-bottom-bar"
          style={{
            ...boardSectionStyle,
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            background: "#fff",
          }}
        >
          {providerWriteEnabled ? (
            <>
              <button
                type="button"
                style={neutralBtn}
                disabled={saving}
                onClick={() => void saveProvider("draft")}
              >
                {saving ? tp("actions.saving") : tp("actions.saveDraft")}
              </button>
              <button
                type="button"
                style={secondaryBtn}
                disabled={saving}
                onClick={() => void saveProvider("complete")}
              >
                {saving ? tp("actions.saving") : tp("actions.finalizeProvider")}
              </button>
            </>
          ) : null}
          {canNursing ? (
            <>
              <button
                type="button"
                style={neutralBtn}
                disabled={saving}
                onClick={() => void saveNursing("draft")}
              >
                {saving ? tp("actions.saving") : tp("actions.saveNursingDraft")}
              </button>
              <button
                type="button"
                style={secondaryBtn}
                disabled={saving || !canCompleteNursing}
                onClick={() => void saveNursing("complete")}
              >
                {saving ? tp("actions.saving") : tp("actions.completeNursing")}
              </button>
            </>
          ) : null}
          {canExecuteFinal ? (
            <button
              type="button"
              data-testid="inp-dis-1f-discharge-patient-bar"
              style={canRunFinal && !executing ? primaryBtn : disabledBtn(primaryBtn)}
              disabled={!canRunFinal || executing}
              onClick={() => void executeFinal()}
            >
              {executing ? tp("actions.discharging") : tp("actions.dischargePatient")}
            </button>
          ) : null}
          <button
            type="button"
            style={neutralBtn}
            disabled={saving || executing}
            onClick={() => void loadAll({ confirmDirty: true })}
          >
            {tp("actions.reload")}
          </button>
        </div>
      ) : (
        <div data-testid="inp-dis-1f-bottom-bar" style={boardSectionStyle}>
          <span style={badgeComplete}>{tp("final.completedTitle")}</span>
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => void handlePrint()}
          >
            {tp("print")}
          </button>
        </div>
      )}
    </div>
  );
}
