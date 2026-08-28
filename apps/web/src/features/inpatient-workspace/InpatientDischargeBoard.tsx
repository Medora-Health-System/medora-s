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
  INPATIENT_DISCHARGE_WORKFLOW_STATES,
  INPATIENT_FINAL_DISPOSITION_CODES_1C,
  INPATIENT_NURSING_EDUCATION_RECIPIENTS,
  INPATIENT_NURSING_TRANSPORT_MODES,
  INPATIENT_NURSING_UNDERSTANDING,
  INPATIENT_PENDING_STUDY_TYPES,
  INPATIENT_TRANSFER_SERVICES,
  INPATIENT_TRANSPORT_MODES,
  dispositionRequiresConditionAtDischarge,
  emptyInpatientNursingDischarge,
  emptyInpatientProviderDischarge,
  extractDischargePlanningFromClinicalOps,
  hasMeaningfulDischargeSummary,
  hydrateInpatientFinalDischarge,
  hydrateInpatientNursingDischarge,
  hydrateInpatientProviderDischarge1C,
  instantToLocalDateTimeInput,
  localDateTimeInputToIso,
  projectInpatientDischargePlanningSummary,
  resolveInpatientDischargeForDisplay,
  synthesizeInpatientDischargeSummaryDraft,
  type InpatientClinicalOpsV1,
  type InpatientDischargeFollowUp1C,
  type InpatientFinalDischargeReadiness,
  type InpatientFinalDischargeV1E,
  type InpatientFinalDisposition1C,
  type InpatientNursingDischargeV1D,
  type InpatientProviderDischargeDiagnosis,
  type InpatientProviderDischargePendingStudy,
  type InpatientProviderDischargeV1C,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { searchIcd10Catalog } from "@/lib/chartApi";
import {
  executeInpatientFinalDischarge,
  fetchInpatientClinicalOps,
  fetchInpatientFinalDischarge,
  fetchInpatientNursingDischarge,
  fetchInpatientProviderDischarge,
  patchInpatientClinicalOps,
  saveInpatientNursingDischarge,
  saveInpatientProviderDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";
import { generateInpatientPatientInstructionsFromDiagnoses } from "./inpatientPatientInstructionsFromDiagnoses";
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

function ensureEducation(
  prev: InpatientNursingDischargeV1D["education"] | null | undefined
): NonNullable<InpatientNursingDischargeV1D["education"]> {
  return {
    instructionsReviewed: prev?.instructionsReviewed === true,
    medicationInstructionsReviewed: prev?.medicationInstructionsReviewed === true,
    followUpReviewed: prev?.followUpReviewed === true,
    returnPrecautionsReviewed: prev?.returnPrecautionsReviewed === true,
    patientUnderstanding: prev?.patientUnderstanding ?? null,
    recipient: prev?.recipient ?? null,
    recipientName: prev?.recipientName ?? null,
    interpreterUsed: prev?.interpreterUsed,
    interpreterDetails: prev?.interpreterDetails ?? null,
    patientDeclinedInstructions: prev?.patientDeclinedInstructions,
    leftBeforeInstructionsComplete: prev?.leftBeforeInstructionsComplete,
  };
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
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const tp = (key: string) => t(`${PREFIX}.${key}`);

  const canProvider = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canNursing = roles.includes("RN") || roles.includes("ADMIN");
  const canOps = canProvider || canNursing;
  const canExecuteFinal = canOps;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [providerDoc, setProviderDoc] = useState<InpatientProviderDischargeV1C>(
    emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C
  );
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
  const [icdQuery, setIcdQuery] = useState("");
  const [icdHits, setIcdHits] = useState<Array<{ code: string; description: string }>>([]);

  const dirty = dirtyProvider || dirtyNursing || dirtyPlanning;
  const readOnly = encounterClosed || Boolean(completed);

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
        const [providerRes, nursingRes, finalRes, opsRes] = await Promise.all([
          fetchInpatientProviderDischarge(encounterId),
          fetchInpatientNursingDischarge(encounterId),
          fetchInpatientFinalDischarge(encounterId),
          fetchInpatientClinicalOps(encounterId),
        ]);

        const hydratedProvider =
          hydrateInpatientProviderDischarge1C(providerRes.documentation) ??
          (emptyInpatientProviderDischarge() as InpatientProviderDischargeV1C);
        setProviderDoc(hydratedProvider);
        setProviderRevision(providerRes.revision ?? hydratedProvider.revision ?? 0);
        setDirtyProvider(false);

        const hydratedNursing =
          hydrateInpatientNursingDischarge(nursingRes.documentation) ??
          emptyInpatientNursingDischarge();
        setNursingDoc(hydratedNursing);
        setNursingRevision(nursingRes.revision ?? hydratedNursing.revision ?? 0);
        setCanCompleteNursing(nursingRes.canComplete === true);
        setMedReconStatus(nursingRes.medicationReconciliationStatus ?? "UNKNOWN");
        setDirtyNursing(false);

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
    [applyPlanningFromOps, canExecuteFinal, dirty, encounter?.status, encounterId, t]
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
  const providerFinalized = Boolean(providerDoc.providerDocumentationFinalizedAt);
  const nursingCompleted = nursingDoc.executionStatus === "COMPLETED";

  const chipRows = useMemo(() => {
    const r = finalReadiness;
    return [
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

  const setDisposition = (code: string) => {
    const next: InpatientFinalDisposition1C = {
      ...(providerDoc.finalDisposition ?? { code }),
      code,
      labelSnapshot: code ? tp(`dispositionCodes.${code}`) : null,
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
    if (!canProvider || readOnly) return;
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

  const savePlanning = async () => {
    if (!canOps || readOnly) return;
    setSaving(true);
    setError(null);
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
          workflowState: planning.workflowState || "PLANNING",
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

  const completeMedRec = async () => {
    if (!canOps || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await patchInpatientClinicalOps(encounterId, {
        finalizeInpatientMedRecon: { markComplete: true },
      });
      await loadAll();
    } catch {
      setError(tp("errors.medRec"));
    } finally {
      setSaving(false);
    }
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
            language: language === "en" ? "en" : "fr",
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

  const searchIcd = async () => {
    const q = icdQuery.trim();
    if (q.length < 2) {
      setIcdHits([]);
      return;
    }
    try {
      const res = await searchIcd10Catalog(q, 8);
      setIcdHits(
        (res.items ?? []).map((item) => ({
          code: item.code,
          description: item.shortDescription || item.longDescription || item.code,
        }))
      );
    } catch {
      setIcdHits([]);
    }
  };

  const generateInstructions = () => {
    if (!providerDoc.dischargeDiagnoses.length || readOnly || !canProvider) return;
    const { instructions, followUps } = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: providerDoc.dischargeDiagnoses,
      locale: language === "en" ? "en" : "fr",
      facilityDisplayName,
    });
    touchProvider((prev) => ({
      ...prev,
      patientInstructions: { ...instructions, clinicianEdited: false },
      followUps: followUps.length ? followUps : prev.followUps ?? [],
    }));
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
            <li key={code}>{tp(`validation.${code}`)}</li>
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
          data-testid="inp-dis-1f-card-planning"
          title={tp("cards.planning")}
          badge={
            planningSummary.workflowState === "READY" ||
            planningSummary.workflowState === "COMPLETED" ? (
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
                      const labeled = tp(`dispositionCodes.${code}`);
                      return labeled.startsWith(PREFIX) ? code : labeled;
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
                    <li key={b.code}>{tp(`validation.${b.code}`)}</li>
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
              medReconStatus === "COMPLETE" ||
              finalReadiness?.medicationReconciliation === "complete"
                ? badgeComplete
                : finalReadiness?.medicationReconciliation === "not_applicable"
                  ? badgePending
                  : badgeAttention
            }
          >
            {finalReadiness?.medicationReconciliation === "not_applicable"
              ? tp("readiness.not_applicable")
              : medReconStatus === "COMPLETE" ||
                  finalReadiness?.medicationReconciliation === "complete"
                ? tp("readiness.complete")
                : tp("readiness.attention")}
          </span>
          {!readOnly &&
          canOps &&
          medReconStatus !== "COMPLETE" &&
          finalReadiness?.medicationReconciliation !== "complete" &&
          finalReadiness?.medicationReconciliation !== "not_applicable" ? (
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
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <label>
              <span style={labelStyle}>{tp("planning.plannedDestination")}</span>
              <select
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.destination}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, destination: e.target.value }));
                  setDirtyPlanning(true);
                }}
              >
                <option value="">—</option>
                {INPATIENT_FINAL_DISPOSITION_CODES_1C.map((code) => (
                  <option key={code} value={code}>
                    {tp(`dispositionCodes.${code}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.workflowState")}</span>
              <select
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.workflowState}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, workflowState: e.target.value }));
                  setDirtyPlanning(true);
                }}
              >
                {INPATIENT_DISCHARGE_WORKFLOW_STATES.map((s) => (
                  <option key={s} value={s}>
                    {tp(`workflowStates.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.transportPlan")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.transportation}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, transportation: e.target.value }));
                  setDirtyPlanning(true);
                }}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.anticipatedDate")}</span>
              <input
                type="date"
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.anticipatedDischargeDate}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, anticipatedDischargeDate: e.target.value }));
                  setDirtyPlanning(true);
                }}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.homeHealth")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.homeHealth}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, homeHealth: e.target.value }));
                  setDirtyPlanning(true);
                }}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("planning.specialNeeds")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canOps}
                value={planning.specialNeedsEquipment}
                onChange={(e) => {
                  setPlanning((p) => ({ ...p, specialNeedsEquipment: e.target.value }));
                  setDirtyPlanning(true);
                }}
              />
            </label>
          </div>
          <label>
            <span style={labelStyle}>{tp("planning.barriers")}</span>
            <textarea
              style={{ ...fieldStyle, minHeight: 48 }}
              disabled={readOnly || !canOps}
              value={planning.barriers}
              onChange={(e) => {
                setPlanning((p) => ({ ...p, barriers: e.target.value }));
                setDirtyPlanning(true);
              }}
            />
          </label>
          <Check
            label={tp("careTeamNotified")}
            checked={planning.careTeamNotified}
            disabled={readOnly || !canOps}
            onChange={(v) => {
              setPlanning((p) => ({ ...p, careTeamNotified: v }));
              setDirtyPlanning(true);
            }}
          />
          {!readOnly && canOps ? (
            <button
              type="button"
              style={secondaryBtn}
              disabled={saving}
              onClick={() => void savePlanning()}
            >
              {saving ? tp("actions.saving") : tp("savePlanning")}
            </button>
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
                    {dx.isPrimary ? <strong>{tp("primary")}: </strong> : null}
                    {dx.code ? `${dx.code} — ` : ""}
                    {dx.description || tp("none")}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <strong style={{ fontSize: 12 }}>{tp("clinicalSummary.hospitalCourse")}</strong>
            <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
              {(providerDoc.hospitalCourse || "").slice(0, 280) || tp("notDocumented")}
              {(providerDoc.hospitalCourse || "").length > 280 ? "…" : ""}
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
        </div>

        <div data-testid="inp-dis-1f-pending-studies" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("pendingStudies.title")}</h3>
          <Check
            label={tp("noKnownPending")}
            checked={providerDoc.noKnownPendingStudies === true}
            disabled={readOnly || !canProvider}
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
                    disabled={readOnly || !canProvider}
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
                    disabled={readOnly || !canProvider}
                    value={row.description ?? ""}
                    onChange={(e) => {
                      const next = [...providerDoc.pendingStudies];
                      next[index] = { ...row, description: e.target.value };
                      touchProvider((prev) => ({ ...prev, pendingStudies: next }));
                    }}
                  />
                  {!readOnly && canProvider ? (
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
        {providerDoc.dischargeDiagnoses.map((row, index) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gap: 6,
              gridTemplateColumns: "120px 1fr auto",
              alignItems: "end",
            }}
          >
            <label>
              <span style={labelStyle}>{tp("diagnoses.code")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canProvider}
                value={row.code ?? ""}
                onChange={(e) => {
                  const next = [...providerDoc.dischargeDiagnoses];
                  next[index] = { ...row, code: e.target.value };
                  touchProvider((prev) => ({ ...prev, dischargeDiagnoses: next }));
                }}
              />
            </label>
            <label>
              <span style={labelStyle}>{tp("diagnoses.description")}</span>
              <input
                style={fieldStyle}
                disabled={readOnly || !canProvider}
                value={row.description}
                onChange={(e) => {
                  const next = [...providerDoc.dischargeDiagnoses];
                  next[index] = { ...row, description: e.target.value };
                  touchProvider((prev) => ({ ...prev, dischargeDiagnoses: next }));
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 6 }}>
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
              <button
                type="button"
                style={dangerBtn}
                disabled={readOnly || !canProvider}
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
          </div>
        ))}
        {!readOnly && canProvider ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              style={neutralBtn}
              onClick={() =>
                touchProvider((prev) => ({
                  ...prev,
                  dischargeDiagnoses: [
                    ...prev.dischargeDiagnoses,
                    {
                      id: newId("dx"),
                      code: "",
                      description: "",
                      isPrimary: prev.dischargeDiagnoses.length === 0,
                      sortOrder: prev.dischargeDiagnoses.length,
                    } satisfies InpatientProviderDischargeDiagnosis,
                  ],
                }))
              }
            >
              {tp("addDiagnosis")}
            </button>
            <input
              style={{ ...fieldStyle, maxWidth: 220 }}
              placeholder={tp("diagnoses.code")}
              value={icdQuery}
              onChange={(e) => setIcdQuery(e.target.value)}
              onBlur={() => void searchIcd()}
            />
            {icdHits.map((hit) => (
              <button
                key={hit.code}
                type="button"
                style={secondaryBtn}
                onClick={() => {
                  touchProvider((prev) => ({
                    ...prev,
                    dischargeDiagnoses: [
                      ...prev.dischargeDiagnoses,
                      {
                        id: newId("dx"),
                        code: hit.code,
                        description: hit.description,
                        isPrimary: prev.dischargeDiagnoses.length === 0,
                        sortOrder: prev.dischargeDiagnoses.length,
                      },
                    ],
                  }));
                  setIcdHits([]);
                  setIcdQuery("");
                }}
              >
                {hit.code}
              </button>
            ))}
            <button type="button" style={secondaryBtn} onClick={generateInstructions}>
              {tp("generateInstructions")}
            </button>
          </div>
        ) : null}
        {providerDoc.patientInstructions ? (
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
                  disabled={readOnly || !canProvider}
                  value={providerDoc.patientInstructions?.[field] ?? ""}
                  onChange={(e) =>
                    touchProvider((prev) => ({
                      ...prev,
                      patientInstructions: {
                        ...prev.patientInstructions,
                        [field]: e.target.value,
                        clinicianEdited: true,
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
                    disabled={readOnly || !canProvider}
                    value={providerDoc.admissionDiagnosis?.description ?? ""}
                    onChange={(e) =>
                      touchProvider((prev) => ({
                        ...prev,
                        admissionDiagnosis: {
                          description: e.target.value,
                          code: prev.admissionDiagnosis?.code ?? null,
                        },
                      }))
                    }
                  />
                ) : (
                  <textarea
                    style={{
                      ...fieldStyle,
                      minHeight: field === "hospitalCourse" ? 88 : 52,
                    }}
                    disabled={readOnly || !canProvider}
                    value={(providerDoc[field] as string | null | undefined) ?? ""}
                    onChange={(e) =>
                      touchProvider((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
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
            disabled={readOnly || !canProvider}
            value={dispositionCode}
            onChange={(e) => setDisposition(e.target.value)}
          >
            <option value="">—</option>
            {INPATIENT_FINAL_DISPOSITION_CODES_1C.map((code) => (
              <option key={code} value={code}>
                {tp(`dispositionCodes.${code}`)}
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
                disabled={readOnly || !canProvider}
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
                    {tp(`condition.${status}`)}
                  </option>
                ))}
              </select>
            </label>
            {providerDoc.conditionAtDischarge?.status === "OTHER" ? (
              <input
                style={fieldStyle}
                disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
            <select
              style={fieldStyle}
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
              placeholder={tp("disposition.facilityPhone")}
              value={providerDoc.finalDisposition?.snf?.facilityPhone ?? ""}
              onChange={(e) =>
                patchDispositionDetails({
                  snf: { ...providerDoc.finalDisposition?.snf, facilityPhone: e.target.value },
                })
              }
            />
          </div>
        ) : null}

        {dispositionCode === "HOME_WITH_HOME_HEALTH" ? (
          <input
            style={fieldStyle}
            disabled={readOnly || !canProvider}
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
        ) : null}

        {dispositionCode === "CORRECTIONAL_FACILITY" ? (
          <div data-testid="inp-dis-1f-correctional-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
          </div>
        ) : null}

        {dispositionCode === "ELOPED" ? (
          <div data-testid="inp-dis-1f-eloped-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
          </div>
        ) : null}

        {dispositionCode === "DECEASED" ? (
          <div data-testid="inp-dis-1f-deceased-details" style={{ display: "grid", gap: 8 }}>
            <input
              style={fieldStyle}
              disabled={readOnly || !canProvider}
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
            <input
              style={fieldStyle}
              disabled={readOnly || !canProvider}
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
          </div>
        ) : null}

        {dispositionCode === "OTHER" || dispositionCode === "AGAINST_MEDICAL_ADVICE" ? (
          <input
            style={fieldStyle}
            disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
              disabled={readOnly || !canProvider}
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
        {!readOnly && canProvider ? (
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

      {/* Nursing execution */}
      <div id="inp-dis-nursing-details" style={{ display: "grid", gap: 10 }}>
        <div data-testid="inp-dis-1f-nursing-education" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("nursing.education")}</h3>
          <Check
            label={tp("nursing.instructionsReviewed")}
            checked={nursingDoc.education?.instructionsReviewed === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: { ...ensureEducation(prev.education), instructionsReviewed: v },
              }))
            }
          />
          <Check
            label={tp("nursing.medicationReviewed")}
            checked={nursingDoc.education?.medicationInstructionsReviewed === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  medicationInstructionsReviewed: v,
                },
              }))
            }
          />
          <Check
            label={tp("nursing.followUpReviewed")}
            checked={nursingDoc.education?.followUpReviewed === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: { ...ensureEducation(prev.education), followUpReviewed: v },
              }))
            }
          />
          <Check
            label={tp("nursing.returnPrecautions")}
            checked={nursingDoc.education?.returnPrecautionsReviewed === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  returnPrecautionsReviewed: v,
                },
              }))
            }
          />
          <select
            style={fieldStyle}
            disabled={readOnly || !canNursing}
            value={nursingDoc.education?.patientUnderstanding ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  patientUnderstanding: (e.target.value || null) as
                    | (typeof INPATIENT_NURSING_UNDERSTANDING)[number]
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.understanding")}</option>
            {INPATIENT_NURSING_UNDERSTANDING.map((u) => (
              <option key={u} value={u}>
                {tp(`understanding.${u}`)}
              </option>
            ))}
          </select>
          <select
            style={fieldStyle}
            disabled={readOnly || !canNursing}
            value={nursingDoc.education?.recipient ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  recipient: (e.target.value || null) as
                    | (typeof INPATIENT_NURSING_EDUCATION_RECIPIENTS)[number]
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.reviewedWith")}</option>
            {INPATIENT_NURSING_EDUCATION_RECIPIENTS.map((u) => (
              <option key={u} value={u}>
                {tp(`recipients.${u}`)}
              </option>
            ))}
          </select>
        </div>

        <div data-testid="inp-dis-1f-nursing-iv" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("nursing.ivLines")}</h3>
          <Check
            label={tp("nursing.ivRemoved")}
            checked={nursingDoc.devices?.ivRemoved === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                devices: { ...prev.devices, ivRemoved: v },
              }))
            }
          />
        </div>

        <div data-testid="inp-dis-1f-nursing-belongings" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("nursing.belongings")}</h3>
          <Check
            label={tp("nursing.belongingsReturned")}
            checked={nursingDoc.belongings?.returned === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), returned: v },
              }))
            }
          />
          <Check
            label={tp("nursing.belongingsUnknown")}
            checked={nursingDoc.belongings?.unknown === true}
            disabled={readOnly || !canNursing}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), unknown: v },
              }))
            }
          />
        </div>

        <div data-testid="inp-dis-1f-nursing-transport" style={boardSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("nursing.transport")}</h3>
          <select
            style={fieldStyle}
            disabled={readOnly || !canNursing}
            value={nursingDoc.transport?.mode ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                transport: { ...prev.transport, mode: e.target.value || null },
                departure: { ...prev.departure, mode: e.target.value || null },
              }))
            }
          >
            <option value="">— {tp("nursing.transportMode")}</option>
            {INPATIENT_NURSING_TRANSPORT_MODES.map((m) => (
              <option key={m} value={m}>
                {(() => {
                  const labeled = tp(`transportModes.${m}`);
                  return labeled.startsWith(PREFIX) ? m.replace(/_/g, " ") : labeled;
                })()}
              </option>
            ))}
          </select>
        </div>

        <div
          id="inp-dis-nursing-departure"
          data-testid="inp-dis-1f-nursing-departure"
          style={boardSectionStyle}
        >
          <h3 style={{ margin: 0, fontSize: 14 }}>{tp("nursing.departure")}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...fieldStyle, flex: 1 }}
              disabled={readOnly || !canNursing}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.departure?.departedAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  departure: {
                    ...prev.departure,
                    departedAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
            {!readOnly && canNursing ? (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() =>
                  touchNursing((prev) => ({
                    ...prev,
                    departure: { ...prev.departure, departedAt: new Date().toISOString() },
                  }))
                }
              >
                {tp("setToNow")}
              </button>
            ) : null}
          </div>
          <input
            style={fieldStyle}
            disabled={readOnly || !canNursing}
            placeholder={tp("nursing.conditionAtDeparture")}
            value={nursingDoc.departure?.conditionAtDeparture ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                departure: { ...prev.departure, conditionAtDeparture: e.target.value },
              }))
            }
          />
        </div>
      </div>

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
          {canProvider ? (
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
