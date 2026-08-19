"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  HEAD_TO_TOE_SYSTEM_KEYS,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  NURSING_ADMISSION_STAGES,
  computeAdmissionCompletionSummary,
  deriveAdmissionSectionCompletion,
  nursingAdmissionStageForSection,
  nursingAdmissionMayCompleteAndSign,
  nursingAdmissionPreloadActionIsSelected,
  nursingAdmissionPreloadLabelKey,
  nursingAdmissionPriorNineteenResolved,
  projectNursingAdmissionStage6,
  projectNursingAdmissionOverview,
  projectNursingAdmissionRailSummary,
  resolveAuthoritativeCodeStatus,
  resolveAuthoritativeIsolation,
  reviewCompletePatchForDomain,
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
  type InpatientClinicalOpsV1,
  type MedSurgNursingAdmissionDocV1,
  type NursingAdmissionDomainReferenceV1,
  type NursingAdmissionStageId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { AdmissionJourneyPanel } from "@/features/hospital-care/AdmissionJourneyPanel";
import {
  fetchInpatientClinicalOps,
  fetchNursingAdmissionDocumentation,
  fetchNursingAdmissionReview,
  patchNursingAdmissionSection,
  signNursingAdmission,
  verifyNursingAdmissionPreloadItem,
} from "@/features/hospital-care/inpatientOperationsApi";
import { InpatientClinicalOpsPanel } from "./InpatientClinicalOpsPanel";
import { NursingAdmissionStructuredSectionForm } from "./NursingAdmissionStructuredSectionForm";
import { InpatientLifecycleActionsMenu } from "./InpatientLifecycleActionsMenu";
import { NursingAdmissionDomainIntegrationPanel } from "./NursingAdmissionDomainIntegrationPanel";
import { NursingAdmissionPrintSummaryModal } from "./NursingAdmissionPrintSummaryModal";
import { NursingAdmissionAmendmentDialog } from "./NursingAdmissionAmendmentDialog";
import {
  NursingAdmissionEncounterActionsSlot,
  NursingAdmissionLeftNavigator,
  NursingAdmissionSaveRail,
  NursingAdmissionStageTracker,
  NursingAdmissionWorkspaceStyles,
} from "./NursingAdmissionWorkspaceChromeInp2b1";
import { ClinicalSaveStatus } from "./rapid-documentation/ClinicalRapidControls";
import { NursingAdmissionReviewDashboard } from "./NursingAdmissionReviewDashboard";
import { createNursingAdmissionSaveCoordinator } from "./nursingAdmissionSaveCoordinator";
import {
  classifyNursingAdmissionSaveFailure,
  nursingAdmissionSaveFailureMessageKey,
  type NursingAdmissionSaveFailureKind,
} from "./nursingAdmissionSaveFailure";
import { NursingAdmissionEnterpriseHistoryEditor, type NursingAdmissionHistoryEditorDomain } from "./NursingAdmissionEnterpriseHistoryEditor";
import { InpatientAllergyEditorModal } from "./InpatientClinicalStatusEditors";

const CANONICAL_PRELOAD_ITEM_ID: Record<string, string> = {
  MEDICAL_HISTORY: "pmh-summary",
  SURGICAL_HISTORY: "psh-summary",
  HOME_MEDICATIONS: "home-meds-summary",
  ALLERGIES: "allergy-note",
};

function admissionCorrelationUiEnabled(): boolean {
  const v = String(process.env.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

type PreloadItem = {
  itemId: string;
  domain: string;
  displayLabel: string;
  valueText?: string | null;
  provenance?: {
    sourceType?: string;
    sourceEncounterId?: string | null;
    verified?: boolean;
    verificationStatus?: string | null;
    verifiedAt?: string | null;
  };
};

type NursingDoc = {
  expectedVersion?: number;
  clinicalDocumentedAt?: string | null;
  updatedAt?: string | null;
  updatedByUserId?: string | null;
  preloadedItems?: PreloadItem[];
  homeMedicationLines?: Array<{ lineId: string; medicationLabel: string; status: string }>;
  sections?: Record<
    string,
    {
      completionState?: string;
      draftText?: string | null;
      answers?: Record<string, unknown> | null;
      unableReason?: string | null;
      expectedVersion?: number;
    }
  >;
  headToToe?: Array<{ system: string; reuseDomain?: string }>;
  nurseSignature?: {
    signed?: boolean;
    signedAt?: string | null;
    signedByUserId?: string | null;
  } | null;
  providerHandoff?: { taskId?: string; status?: string } | null;
  wounds?: unknown[];
  domainReferences?: NursingAdmissionDomainReferenceV1[];
  amendments?: Array<{
    amendmentId: string;
    type: string;
    reason: string;
    sectionId?: string | null;
    createdAt: string;
  }>;
};

type SaveUiState =
  | "NOT_SAVED"
  | "SAVING"
  | "SAVED"
  | "SAVE_FAILED"
  | "CONFLICT_DETECTED"
  | "READ_ONLY"
  | "SIGNED"
  | "AMENDED";

type Props = {
  encounterId: string;
  nursingLive?: boolean;
  docsLive?: boolean;
  canAdmin?: boolean;
  /** INP.2A — providers may read admission without nursing write authority. */
  readOnly?: boolean;
  room?: string | null;
  attendingName?: string | null;
  assignedRnName?: string | null;
};

/**
 * D4A.2.7C — Six-stage nursing admission presentation over 20 durable sections.
 */
export function InpatientAdmissionClinicalShell({
  encounterId,
  nursingLive = false,
  docsLive = false,
  canAdmin = false,
  readOnly = false,
  room = null,
  attendingName = null,
  assignedRnName = null,
}: Props) {
  const { t, language } = useI18n();
  const { roles, facilityId } = useFacilityAndRoles();
  const [active, setActive] = useState<InpatientAdmissionClinicalSection>("OVERVIEW");
  const [doc, setDoc] = useState<NursingDoc | null>(null);
  const [completion, setCompletion] = useState<Record<string, unknown> | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [unableReason, setUnableReason] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveUiState>("SAVED");
  const [saveFailureKind, setSaveFailureKind] = useState<NursingAdmissionSaveFailureKind | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [patient, setPatient] = useState<{
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    preferredName?: string | null;
  } | null>(null);
  const [encounterPlacement, setEncounterPlacement] = useState<{
    unit: string | null;
    bed: string | null;
  }>({ unit: null, bed: null });
  const [printOpen, setPrintOpen] = useState(false);
  const [clinicalOps, setClinicalOps] = useState<InpatientClinicalOpsV1 | null>(null);
  const [amendMode, setAmendMode] = useState<
    null | "ADDENDUM" | "CORRECTION" | "ENTERED_IN_ERROR"
  >(null);
  const [clinicalDocumentedAt, setClinicalDocumentedAt] = useState<string | null>(null);
  const [localDraftBackup, setLocalDraftBackup] = useState<Record<string, unknown> | null>(null);
  const [stage6Orders, setStage6Orders] = useState<unknown[]>([]);
  const [historyEditorDomain, setHistoryEditorDomain] = useState<NursingAdmissionHistoryEditorDomain | null>(null);
  const [historyEditorItemId, setHistoryEditorItemId] = useState<string | null>(null);
  const [historyEditorSocialFocus, setHistoryEditorSocialFocus] = useState<
    "smoking" | "alcohol" | "substances" | undefined
  >(undefined);
  const stage6PersistRef = useRef(false);
  const [allergyEditorOpen, setAllergyEditorOpen] = useState(false);
  const [allergyEditorItemId, setAllergyEditorItemId] = useState<string | null>(null);
  const [conflictDebug, setConflictDebug] = useState<{
    section: string;
    expectedVersion: number;
    operation: string;
  } | null>(null);
  const persistModeRef = useRef<"DRAFT" | "CONTINUE" | "EXPLICIT">("DRAFT");
  const explicitCompletionRef = useRef<AdmissionSectionCompletionState | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const expectedVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const draftsRef = useRef<
    Partial<Record<string, { answers: Record<string, unknown>; unableReason: string; draftNote: string }>>
  >({});
  const docRef = useRef<NursingDoc | null>(null);
  const answersRef = useRef(answers);
  const draftNoteRef = useRef(draftNote);
  const unableReasonRef = useRef(unableReason);
  const clinicalDocumentedAtRef = useRef(clinicalDocumentedAt);
  const activeRef = useRef(active);
  const canAmend = !readOnly && roles.includes("RN");
  const canLinkDomain = !readOnly && (roles.includes("RN") || roles.includes("ADMIN"));

  const sectionIndex = INPATIENT_ADMISSION_CLINICAL_SECTIONS.indexOf(active);
  const isFirst = sectionIndex <= 0;
  const isLast = sectionIndex >= INPATIENT_ADMISSION_CLINICAL_SECTIONS.length - 1;
  const signed = Boolean(doc?.nurseSignature?.signed);
  const writeBlocked = readOnly || signed;
  const activeStage = nursingAdmissionStageForSection(active);
  const stageId = (activeStage?.id ?? "ARRIVAL_IDENTITY") as NursingAdmissionStageId;
  const stageIndex = NURSING_ADMISSION_STAGES.findIndex((s) => s.id === stageId);


  const applyPayload = useCallback(
    (
      payload: { documentation?: NursingDoc; completion?: Record<string, unknown> },
      sectionId?: InpatientAdmissionClinicalSection,
      opts?: { preserveDirtyAnswers?: boolean }
    ) => {
      const d = (payload.documentation ?? null) as NursingDoc | null;
      setDoc(d);
      setCompletion(payload.completion ?? null);
      expectedVersionRef.current = Number(d?.expectedVersion ?? 0);
      const sid = sectionId ?? activeRef.current;
      const sec = d?.sections?.[sid];
      if (!opts?.preserveDirtyAnswers) {
        setAnswers((sec?.answers as Record<string, unknown>) ?? {});
        setUnableReason(typeof sec?.unableReason === "string" ? sec.unableReason : "");
        setDraftNote(typeof sec?.draftText === "string" ? sec.draftText : "");
        dirtyRef.current = false;
        setSaveState("SAVED");
      }
      if (typeof d?.clinicalDocumentedAt === "string" && d.clinicalDocumentedAt) {
        setClinicalDocumentedAt(d.clinicalDocumentedAt);
      } else if (d?.clinicalDocumentedAt === null) {
        setClinicalDocumentedAt(null);
      }
    },
    []
  );

  const reload = useCallback(async (opts?: { preserveDirtyAnswers?: boolean }) => {
    setLoadError(null);
    try {
      const payload = await fetchNursingAdmissionDocumentation(encounterId);
      applyPayload(payload as never, undefined, { preserveDirtyAnswers: opts?.preserveDirtyAnswers });
      if (!opts?.preserveDirtyAnswers) {
        setLastSavedAt(new Date().toISOString());
      }
      try {
        const opsPayload = await fetchInpatientClinicalOps(encounterId);
        setClinicalOps((opsPayload.ops as InpatientClinicalOpsV1) ?? null);
      } catch {
        setClinicalOps(null);
      }
    } catch {
      setLoadError(t("hospitalAdmissionD4a1.loadError"));
    }
  }, [applyPayload, encounterId, t]);

  const codeStatus = resolveAuthoritativeCodeStatus(clinicalOps);
  const isolation = resolveAuthoritativeIsolation(clinicalOps);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await apiFetch(`/encounters/${encounterId}`);
        const obj = asApiObject<{
          assignedBedKey?: string | null;
          requestedUnit?: string | null;
          patient?: {
            id?: string;
            firstName?: string | null;
            lastName?: string | null;
            mrn?: string | null;
            dob?: string | null;
            sexAtBirth?: string | null;
            preferredName?: string | null;
          } | null;
        }>(raw);
        if (!cancelled) {
          setPatient(obj?.patient ?? null);
          setEncounterPlacement({
            bed: obj?.assignedBedKey ?? null,
            unit: obj?.requestedUnit ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setPatient(null);
          setEncounterPlacement({ unit: null, bed: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    draftNoteRef.current = draftNote;
  }, [draftNote]);

  useEffect(() => {
    unableReasonRef.current = unableReason;
  }, [unableReason]);

  useEffect(() => {
    clinicalDocumentedAtRef.current = clinicalDocumentedAt;
  }, [clinicalDocumentedAt]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const stash = draftsRef.current[active];
    if (stash) {
      setAnswers(stash.answers);
      setUnableReason(stash.unableReason);
      setDraftNote(stash.draftNote);
      dirtyRef.current = true;
      setSaveState("NOT_SAVED");
      panelRef.current?.focus();
      return;
    }
    const sec = docRef.current?.sections?.[active];
    setAnswers((sec?.answers as Record<string, unknown>) ?? {});
    setUnableReason(typeof sec?.unableReason === "string" ? sec.unableReason : "");
    setDraftNote(typeof sec?.draftText === "string" ? sec.draftText : "");
    dirtyRef.current = false;
    setSaveState("SAVED");
    panelRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || writeBlocked) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [writeBlocked]);

  const runSectionSaveImpl = useCallback(async () => {
    if (!docRef.current) {
      setSaveFailureKind("UNKNOWN");
      setSaveState("SAVE_FAILED");
      return { ok: false as const };
    }
    if (writeBlocked) return { ok: false as const };
    const sectionId = activeRef.current;
    const previousState =
      (docRef.current.sections?.[sectionId]?.completionState as AdmissionSectionCompletionState) ??
      "NOT_STARTED";
    const completionState = deriveAdmissionSectionCompletion({
      sectionId,
      answers: answersRef.current,
      unableReason: unableReasonRef.current,
      previousState,
      mode: persistModeRef.current,
      explicitState: explicitCompletionRef.current,
    });
    setSaveState("SAVING");
    setBusy(true);
    try {
      const payload = await patchNursingAdmissionSection(encounterId, {
        sectionId,
        draftText: draftNoteRef.current,
        answers: answersRef.current,
        unableReason: unableReasonRef.current || null,
        completionState,
        expectedVersion: expectedVersionRef.current,
        clinicalDocumentedAt: clinicalDocumentedAtRef.current,
      });
      const nextDoc = (payload as { documentation?: NursingDoc }).documentation;
      const nextVersion = Number(nextDoc?.expectedVersion ?? expectedVersionRef.current);
      expectedVersionRef.current = nextVersion;
      const savedAnswers = (nextDoc?.sections?.[sectionId]?.answers as Record<string, unknown>) ?? null;
      const preserve = JSON.stringify(answersRef.current) !== JSON.stringify(savedAnswers ?? {});
      applyPayload(payload as never, sectionId, { preserveDirtyAnswers: preserve });
      if (!preserve) {
        delete draftsRef.current[sectionId];
        dirtyRef.current = false;
        setSaveState("SAVED");
        setLastSavedAt(new Date().toISOString());
        setSaveFailureKind(null);
      } else {
        dirtyRef.current = true;
        setSaveState("NOT_SAVED");
      }
      return {
        ok: true as const,
        expectedVersion: nextVersion,
        savedAnswers,
      };
    } catch (err) {
      const classified = classifyNursingAdmissionSaveFailure(err);
      if (classified.kind === "CONFLICT") {
        setLocalDraftBackup({
          answers: answersRef.current,
          unableReason: unableReasonRef.current,
          draftNote: draftNoteRef.current,
        });
        setConflictDebug({
          section: sectionId,
          expectedVersion: expectedVersionRef.current,
          operation: "SECTION",
        });
        setSaveState("CONFLICT_DETECTED");
        return { ok: false as const, conflict: true };
      }
      setSaveFailureKind(classified.kind);
      setSaveState("SAVE_FAILED");
      return { ok: false as const };
    } finally {
      setBusy(false);
    }
  }, [applyPayload, encounterId, writeBlocked]);

  const runVerifyImpl = useCallback(
    async (itemId: string, status: string) => {
      if (writeBlocked) return { ok: false as const };
      setBusy(true);
      try {
        const payload = await verifyNursingAdmissionPreloadItem(encounterId, {
          itemId,
          status,
          expectedVersion: expectedVersionRef.current,
        });
        const nextDoc = (payload as { documentation?: NursingDoc }).documentation;
        const nextVersion = Number(nextDoc?.expectedVersion ?? expectedVersionRef.current);
        expectedVersionRef.current = nextVersion;
        applyPayload(payload as never, activeRef.current, { preserveDirtyAnswers: dirtyRef.current });
        return { ok: true as const, expectedVersion: nextVersion };
      } catch (err) {
        const classified = classifyNursingAdmissionSaveFailure(err);
        if (classified.kind === "CONFLICT") {
          setLocalDraftBackup({
            answers: answersRef.current,
            unableReason: unableReasonRef.current,
            draftNote: draftNoteRef.current,
          });
          setConflictDebug({
            section: activeRef.current,
            expectedVersion: expectedVersionRef.current,
            operation: "VERIFY",
          });
          setSaveState("CONFLICT_DETECTED");
          return { ok: false as const, conflict: true };
        }
        setSaveFailureKind(classified.kind);
        setSaveState("SAVE_FAILED");
        return { ok: false as const };
      } finally {
        setBusy(false);
      }
    },
    [applyPayload, encounterId, writeBlocked]
  );

  const runSectionSaveImplRef = useRef(runSectionSaveImpl);
  runSectionSaveImplRef.current = runSectionSaveImpl;
  const runVerifyImplRef = useRef(runVerifyImpl);
  runVerifyImplRef.current = runVerifyImpl;
  const writeBlockedRef = useRef(writeBlocked);
  writeBlockedRef.current = writeBlocked;

  const coordinatorRef = useRef<ReturnType<typeof createNursingAdmissionSaveCoordinator> | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createNursingAdmissionSaveCoordinator({
      isWriteBlocked: () => writeBlockedRef.current,
      getExpectedVersion: () => expectedVersionRef.current,
      setExpectedVersion: (next) => {
        expectedVersionRef.current = next;
      },
      localAnswers: () => answersRef.current,
      runSectionSave: () => runSectionSaveImplRef.current(),
      runVerify: (itemId, status) => runVerifyImplRef.current(itemId, status),
    });
  }

  const persistSection = useCallback(
    async (completionState?: AdmissionSectionCompletionState, mode: "DRAFT" | "CONTINUE" | "EXPLICIT" = "DRAFT") => {
      persistModeRef.current = mode;
      explicitCompletionRef.current = completionState;
      const result = await coordinatorRef.current!.requestSectionSave();
      return result.ok;
    },
    []
  );

  useEffect(() => {
    if (saveState !== "NOT_SAVED" || writeBlocked || busy) return;
    const handle = window.setTimeout(() => {
      persistModeRef.current = "DRAFT";
      void persistSection(undefined, "DRAFT");
    }, 2500);
    return () => window.clearTimeout(handle);
  }, [saveState, answers, draftNote, unableReason, clinicalDocumentedAt, persistSection, writeBlocked, busy]);

  useEffect(() => {
    if (active !== "PROVIDER_ADMISSION") return;
    void (async () => {
      try {
        const payload = await fetchNursingAdmissionReview(encounterId);
        setReview(payload.review as Record<string, unknown>);
        applyPayload(payload as never);
      } catch {
        /* review fetch is best-effort on stage entry */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, encounterId]);

  useEffect(() => {
    if (active !== "PROVIDER_ADMISSION" || writeBlocked || signed || !doc || !facilityId) return;
    if (!nursingAdmissionPriorNineteenResolved(doc as MedSurgNursingAdmissionDocV1)) return;
    if (stage6PersistRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const orders = await fetchOrdersForEncounter(facilityId, encounterId);
        if (cancelled) return;
        setStage6Orders(orders);
        const projection = projectNursingAdmissionStage6({
          doc: doc as MedSurgNursingAdmissionDocV1,
          ops: clinicalOps,
          orders,
        });
        if (!projection.nursingResponsibilitiesSatisfied) return;
        const already =
          doc.sections?.PROVIDER_ADMISSION?.completionState === "COMPLETE" &&
          String((doc.sections?.PROVIDER_ADMISSION?.answers as Record<string, unknown> | undefined)?.handoffStatus ?? "") ===
            projection.answers.handoffStatus;
        if (already) return;
        stage6PersistRef.current = true;
        const nextAnswers = { ...answersRef.current, ...projection.answers };
        answersRef.current = nextAnswers;
        setAnswers(nextAnswers);
        dirtyRef.current = true;
        const ok = await persistSection(undefined, "CONTINUE");
        if (!ok) stage6PersistRef.current = false;
      } catch {
        stage6PersistRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, clinicalOps, doc, encounterId, facilityId, persistSection, signed, writeBlocked]);

  const markDirty = (nextAnswers: Record<string, unknown>) => {
    setAnswers(nextAnswers);
    dirtyRef.current = true;
    setSaveState("NOT_SAVED");
    draftsRef.current[activeRef.current] = {
      answers: nextAnswers,
      unableReason: unableReasonRef.current,
      draftNote: draftNoteRef.current,
    };
  };

  const goTo = (id: InpatientAdmissionClinicalSection) => {
    if (id === activeRef.current) return;
    if (dirtyRef.current && !writeBlocked) {
      void persistSection(undefined, "DRAFT").then((ok) => {
        if (ok) setActive(id);
      });
      return;
    }
    setActive(id);
  };

  const goPrev = () => {
    if (isFirst) return;
    goTo(INPATIENT_ADMISSION_CLINICAL_SECTIONS[sectionIndex - 1]!);
  };
  const goNext = () => {
    if (isLast) return;
    goTo(INPATIENT_ADMISSION_CLINICAL_SECTIONS[sectionIndex + 1]!);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex, dirtyRef.current, writeBlocked]);

  const verifyItem = async (itemId: string, status: string) => {
    if (!doc || writeBlocked) return;
    if (status === "UPDATED") {
      const domain =
        (doc.preloadedItems ?? []).find((i) => i.itemId === itemId)?.domain ??
        (itemId === CANONICAL_PRELOAD_ITEM_ID.ALLERGIES
          ? "ALLERGIES"
          : itemId === CANONICAL_PRELOAD_ITEM_ID.MEDICAL_HISTORY
            ? "MEDICAL_HISTORY"
            : itemId === CANONICAL_PRELOAD_ITEM_ID.SURGICAL_HISTORY
              ? "SURGICAL_HISTORY"
              : itemId === CANONICAL_PRELOAD_ITEM_ID.HOME_MEDICATIONS
                ? "HOME_MEDICATIONS"
                : undefined);
      if (domain === "ALLERGIES") {
        setAllergyEditorItemId(itemId);
        setAllergyEditorOpen(true);
        return;
      }
      if (domain === "MEDICAL_HISTORY" || domain === "SURGICAL_HISTORY" || domain === "HOME_MEDICATIONS") {
        setHistoryEditorItemId(itemId);
        setHistoryEditorDomain(domain);
        setHistoryEditorSocialFocus(undefined);
        return;
      }
      if (domain === "SMOKING" || domain === "ALCOHOL" || domain === "RECREATIONAL_DRUGS") {
        setHistoryEditorItemId(itemId);
        setHistoryEditorDomain("SOCIAL_HISTORY");
        setHistoryEditorSocialFocus(
          domain === "SMOKING" ? "smoking" : domain === "ALCOHOL" ? "alcohol" : "substances"
        );
        return;
      }
    }
    if (dirtyRef.current) {
      const saved = await persistSection(undefined, "DRAFT");
      if (!saved) return;
    }
    const result = await coordinatorRef.current!.requestVerify(itemId, status);
    if (!result.ok) return;
    const domain = (docRef.current?.preloadedItems ?? []).find((i) => i.itemId === itemId)?.domain;
    const reviewPatch = reviewCompletePatchForDomain(domain, status);
    if (reviewPatch) {
      const nextAnswers = { ...answersRef.current, ...reviewPatch };
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      dirtyRef.current = true;
      await persistSection(undefined, "CONTINUE");
    }
  };

  const openReview = async () => {
    if (dirtyRef.current) await persistSection();
    try {
      const payload = await fetchNursingAdmissionReview(encounterId);
      setReview(payload.review as Record<string, unknown>);
      applyPayload(payload as never);
    } catch (err) {
      setSaveFailureKind(classifyNursingAdmissionSaveFailure(err).kind);
      setSaveState("SAVE_FAILED");
    }
  };

  const signAdmission = async () => {
    if (!doc || writeBlocked) return;
    if (dirtyRef.current) await persistSection();
    setBusy(true);
    try {
      const payload = await signNursingAdmission(encounterId, {
        expectedVersion: expectedVersionRef.current,
        credentials: "RN",
        createProviderHandoff: true,
      });
      applyPayload(payload as never);
      await openReview();
    } catch (err) {
      setSaveFailureKind(classifyNursingAdmissionSaveFailure(err).kind);
      setSaveState("SAVE_FAILED");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const sectionState = (id: string) =>
    (doc?.sections?.[id]?.completionState as AdmissionSectionCompletionState) ?? "NOT_STARTED";

  const completionSummary = doc
    ? computeAdmissionCompletionSummary(doc as Parameters<typeof computeAdmissionCompletionSummary>[0])
    : null;

  const effectiveSaveCode = signed ? "SIGNED" : readOnly ? "READ_ONLY" : saveState;

  const openPrintSummary = () => {
    // Always load authoritative server summary — never print unsaved local state.
    setPrintOpen(true);
  };

  const goToStage = (id: NursingAdmissionStageId) => {
    const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === id);
    const first = stage?.sectionKeys[0] as InpatientAdmissionClinicalSection | undefined;
    if (first) goTo(first);
  };

  const allergiesSummary =
    (doc?.preloadedItems ?? [])
      .filter((item) => item.domain === "ALLERGIES")
      .map((item) => item.valueText || item.displayLabel)
      .filter(Boolean)
      .join("; ") || null;
  const admissionProjection = projectNursingAdmissionOverview(
    doc as Parameters<typeof projectNursingAdmissionOverview>[0]
  );
  const railSummary = projectNursingAdmissionRailSummary({
    doc: doc as Parameters<typeof projectNursingAdmissionRailSummary>[0]["doc"],
    activeSectionId: active,
  });
  const showReviewDashboard = active === "PROVIDER_ADMISSION";

  return (
    <div data-testid="inpatient-admission-clinical-shell">
      <NursingAdmissionWorkspaceStyles />
      <NursingAdmissionStageTracker
        stageId={stageId}
        sectionState={sectionState}
        lastSavedAt={lastSavedAt}
        saveCode={effectiveSaveCode}
        language={language}
        onStage={goToStage}
      />

      <NursingAdmissionEncounterActionsSlot>
        <InpatientLifecycleActionsMenu encounterId={encounterId} canAdmin={canAdmin} />
        <button
          type="button"
          style={{ ...chipBtn, marginTop: 8 }}
          onClick={openPrintSummary}
          data-testid="nursing-admission-open-print"
        >
          {t("hospitalAdmissionD4a25a.print.open")}
        </button>
      </NursingAdmissionEncounterActionsSlot>

      {admissionCorrelationUiEnabled() ? <AdmissionJourneyPanel encounterId={encounterId} /> : null}

      <div className="nursing-admission-workspace-2b1" data-testid="nursing-admission-layout-2b1">
        <NursingAdmissionLeftNavigator
          stageId={stageId}
          active={active}
          stageIndex={stageIndex}
          complete={completionSummary?.resolved ?? 0}
          total={completionSummary?.total ?? 20}
          sectionState={sectionState}
          onSection={goTo}
        />
        <div data-testid="nursing-admission-main">

      {loadError ? (
        <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
          {loadError}
        </p>
      ) : null}

      {saveState === "CONFLICT_DETECTED" ? (
        <div
          role="alert"
          data-testid="admission-conflict-banner"
          data-conflict-section={conflictDebug?.section ?? active}
          data-conflict-expected-version={String(conflictDebug?.expectedVersion ?? expectedVersionRef.current)}
          data-conflict-operation={conflictDebug?.operation ?? "SECTION"}
          style={{
            marginBottom: 10,
            padding: 10,
            border: "1px solid #f59e0b",
            borderRadius: 10,
            background: "#fffbeb",
            fontSize: 12,
          }}
        >
          <strong>{t("inpatientAdmissionInp2b2a.conflict.title")}</strong>
          <p style={{ margin: "6px 0" }}>{t("inpatientAdmissionInp2b2a.conflict.body")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              style={chipBtn}
              onClick={() => {
                setLocalDraftBackup({ answers, unableReason, draftNote });
                void reload();
              }}
            >
              {t("inpatientAdmissionInp2b2a.conflict.reload")}
            </button>
            <button
              type="button"
              style={chipBtn}
              onClick={() => {
                if (localDraftBackup) {
                  setAnswers((localDraftBackup.answers as Record<string, unknown>) ?? answers);
                  setUnableReason(String(localDraftBackup.unableReason ?? unableReason));
                  setDraftNote(String(localDraftBackup.draftNote ?? draftNote));
                  dirtyRef.current = true;
                  setSaveState("NOT_SAVED");
                }
              }}
            >
              {t("inpatientAdmissionInp2b2a.conflict.preserve")}
            </button>
            <button type="button" style={chipBtn} onClick={() => void persistSection(undefined, "DRAFT")}>
              {t("inpatientAdmissionInp2b2a.conflict.retry")}
            </button>
            <button
              type="button"
              style={chipBtn}
              onClick={() => {
                if (window.confirm(t("inpatientRapidConvergenceD4a27c.conflict.discardConfirm"))) {
                  dirtyRef.current = false;
                  void reload();
                }
              }}
            >
              {t("inpatientAdmissionInp2b2a.conflict.discard")}
            </button>
          </div>
        </div>
      ) : null}

      {saveState === "SAVE_FAILED" ? (
        <p role="alert" data-testid="admission-save-failed" style={{ color: "#b91c1c", fontSize: 12 }}>
          {t(nursingAdmissionSaveFailureMessageKey(saveFailureKind ?? "UNKNOWN"))}
        </p>
      ) : null}

      <div
        ref={panelRef}
        tabIndex={-1}
        style={panel}
        data-testid={`admission-section-panel-${active}`}
      >
        <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#0f172a" }}>
          {t(`hospitalAdmissionD4a0.clinical.sections.${active}`)}
        </h4>

          <NursingAdmissionDomainIntegrationPanel
            sectionId={active}
            encounterId={encounterId}
            expectedVersion={expectedVersionRef.current}
            domainReferences={doc?.domainReferences ?? []}
            patient={patient}
            signed={signed}
            canLink={canLinkDomain}
            authoritativeCodeStatus={codeStatus}
            authoritativeIsolation={isolation}
            onLinked={(documentation) => {
              applyPayload({ documentation: documentation as NursingDoc, completion: completion ?? undefined });
            }}
          />

          {showReviewDashboard ? (
            <NursingAdmissionReviewDashboard
              doc={(doc ?? null) as MedSurgNursingAdmissionDocV1 | null}
              review={review}
              readOnly={writeBlocked}
              signed={signed}
              onNavigate={goTo}
              onComplete={() => void signAdmission()}
              completionAllowed={
                Boolean(completionSummary?.allRequiredComplete) ||
                (doc
                  ? nursingAdmissionMayCompleteAndSign({
                      doc: doc as MedSurgNursingAdmissionDocV1,
                      ops: clinicalOps,
                      orders: stage6Orders,
                    })
                  : false)
              }
            />
          ) : (
            <>
          {(active === "MEDICAL_HISTORY" ||
            active === "SURGICAL_HISTORY" ||
            active === "HOME_MEDICATIONS" ||
            active === "SOCIAL_HISTORY" ||
            active === "ALLERGIES" ||
            active === "IDENTITY_DEMOGRAPHICS") && (
            <div data-testid="admission-preload-panel" style={{ marginBottom: 10 }}>
              {(() => {
                const sectionItems = (doc?.preloadedItems ?? []).filter((item) => {
                  if (active === "MEDICAL_HISTORY") return item.domain === "MEDICAL_HISTORY";
                  if (active === "SURGICAL_HISTORY") return item.domain === "SURGICAL_HISTORY";
                  if (active === "ALLERGIES") return item.domain === "ALLERGIES";
                  if (active === "HOME_MEDICATIONS") return item.domain === "HOME_MEDICATIONS";
                  if (active === "SOCIAL_HISTORY")
                    return ["SMOKING", "ALCOHOL", "RECREATIONAL_DRUGS"].includes(item.domain);
                  return true;
                });
                if (
                  sectionItems.length === 0 &&
                  (active === "MEDICAL_HISTORY" ||
                    active === "SURGICAL_HISTORY" ||
                    active === "HOME_MEDICATIONS" ||
                    active === "ALLERGIES" ||
                    active === "SOCIAL_HISTORY")
                ) {
                  return (
                    <div data-testid="admission-preload-empty" style={preloadCard}>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        {t("inpatientAdmissionInp2b2a.preloadEmpty")}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                        <button
                          type="button"
                          disabled={busy || writeBlocked}
                          style={chipBtn}
                          data-testid="admission-preload-empty-update"
                          onClick={() => {
                            if (active === "SOCIAL_HISTORY") {
                              setHistoryEditorItemId("smoking");
                              setHistoryEditorDomain("SOCIAL_HISTORY");
                              setHistoryEditorSocialFocus("smoking");
                              return;
                            }
                            const itemId = CANONICAL_PRELOAD_ITEM_ID[active];
                            if (!itemId) return;
                            void verifyItem(itemId, "UPDATED");
                          }}
                        >
                          {t("hospitalAdmissionD4a1.verify.UPDATED")}
                        </button>
                      </div>
                    </div>
                  );
                }
                return sectionItems.map((item) => (
                  <div key={item.itemId} style={preloadCard} data-testid={`preload-${item.itemId}`}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>
                      {nursingAdmissionPreloadLabelKey(item.itemId)
                        ? t(nursingAdmissionPreloadLabelKey(item.itemId)!)
                        : item.displayLabel}
                    </div>
                    <div style={{ fontSize: 12, color: "#334155" }}>{item.valueText}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {ADMISSION_HISTORY_VERIFICATION_STATUSES.map((st) => {
                        const selected = nursingAdmissionPreloadActionIsSelected({
                          verificationStatus: item.provenance?.verificationStatus,
                          verifiedAt: item.provenance?.verifiedAt,
                          action: st,
                        });
                        return (
                        <button
                          key={st}
                          type="button"
                          disabled={busy || writeBlocked}
                          onClick={() => void verifyItem(item.itemId, st)}
                          data-testid={`admission-preload-action-${item.itemId}-${st}`}
                          data-selected={selected ? "true" : "false"}
                          style={selected ? chipSelected : chipBtn}
                        >
                          {t(`hospitalAdmissionD4a1.verify.${st}`)}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {active === "NURSING_ADMISSION_ASSESSMENT" ? (
            <p style={{ fontSize: 11, color: "#64748b" }} data-testid="head-to-toe-shell">
              {t("hospitalAdmissionD4a1.headToToe.hint")} ·{" "}
              {HEAD_TO_TOE_SYSTEM_KEYS.length} systems
            </p>
          ) : null}

          <NursingAdmissionStructuredSectionForm
            sectionId={active}
            answers={answers}
            unableReason={unableReason}
            readOnly={writeBlocked}
            assignmentProjection={{
              unit: encounterPlacement.unit ?? room ?? null,
              bed: encounterPlacement.bed ?? room ?? null,
              attending: attendingName,
              receivingNurse: assignedRnName,
            }}
            onChange={markDirty}
            onUnableReasonChange={(r) => {
              setUnableReason(r);
              unableReasonRef.current = r;
              dirtyRef.current = true;
              setSaveState("NOT_SAVED");
            }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748b" }} data-testid="admission-derived-status">
              {t("inpatientAdmissionInp2b2a.derivedStatus")}: {t(`inpatientAdmissionInp2b1.status.${sectionState(active)}`)}
            </span>
            <button
              type="button"
              style={chipBtn}
              disabled={busy || writeBlocked}
              onClick={() => void persistSection("NOT_APPLICABLE", "EXPLICIT")}
              data-testid="admission-mark-na"
            >
              {t("inpatientAdmissionInp2b2a.notApplicable")}
            </button>
          </div>

          {isLast && !showReviewDashboard ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" style={navBtn} onClick={() => void openReview()} disabled={busy}>
                {t("inpatientRapidConvergenceD4a27c.nav.review")}
              </button>
              <button
                type="button"
                style={{ ...navBtnPrimary, background: "#0f766e" }}
                disabled={busy || writeBlocked}
                onClick={() => void signAdmission()}
                data-testid="admission-nurse-sign"
              >
                {signed ? t("hospitalAdmissionD4a1.alreadySigned") : t("inpatientRapidConvergenceD4a27c.nav.sign")}
              </button>
            </div>
          ) : null}

          <footer
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid #e2e8f0",
              fontSize: 12,
              color: "#64748b",
            }}
            data-testid="admission-sticky-footer"
          >
            <ClinicalSaveStatus code={effectiveSaveCode} savedAt={lastSavedAt} language={language} />
          </footer>
            </>
          )}
        </div>
        </div>
        <NursingAdmissionSaveRail
          codeStatus={codeStatus}
          isolation={isolation}
          allergiesSummary={allergiesSummary}
          projection={admissionProjection}
          railSummary={railSummary}
          activeSection={active}
          clinicalDocumentedAt={clinicalDocumentedAt}
          onClinicalTimeChange={(iso) => {
            setClinicalDocumentedAt(iso);
            clinicalDocumentedAtRef.current = iso;
            dirtyRef.current = true;
            setSaveState("NOT_SAVED");
          }}
          saveCode={effectiveSaveCode}
          lastSavedAt={lastSavedAt}
          language={language}
          writeBlocked={writeBlocked}
          busy={busy}
          isFirst={isFirst}
          isLast={isLast}
          onPrevious={goPrev}
          onSaveDraft={() => void persistSection(undefined, "DRAFT")}
          onSaveContinue={() =>
            void persistSection(undefined, "CONTINUE").then((ok) => {
              if (ok && !isLast) goNext();
            })
          }
          onNext={() => {
            if (dirtyRef.current && !writeBlocked) {
              void persistSection(undefined, "CONTINUE").then((ok) => {
                if (ok) goNext();
              });
              return;
            }
            goNext();
          }}
        />
      </div>

      {signed ? (
        <div data-testid="nursing-admission-amendments" style={{ ...panel, marginTop: 12 }}>
          <h4 style={{ margin: "0 0 6px" }}>{t("hospitalAdmissionD4a25a.amendments.title")}</h4>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("hospitalAdmissionD4a25a.amendments.lockedHint")}{" "}
            {t("hospitalAdmissionD4a25a.amendments.noUnlock")}
          </p>
          {!canAmend ? (
            <p style={{ fontSize: 12 }}>{t("hospitalAdmissionD4a25a.amendments.providerViewOnly")}</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" style={chipBtn} onClick={() => setAmendMode("ADDENDUM")}>
                {t("hospitalAdmissionD4a25a.amendments.addAddendum")}
              </button>
              <button type="button" style={chipBtn} onClick={() => setAmendMode("CORRECTION")}>
                {t("hospitalAdmissionD4a25a.amendments.addCorrection")}
              </button>
              <button type="button" style={chipBtn} onClick={() => setAmendMode("ENTERED_IN_ERROR")}>
                {t("hospitalAdmissionD4a25a.amendments.enteredInError")}
              </button>
            </div>
          )}
          <h5 style={{ margin: "0 0 6px", fontSize: 13 }}>
            {t("hospitalAdmissionD4a25a.amendments.history")}
          </h5>
          {(doc?.amendments ?? []).length === 0 ? (
            <p style={{ fontSize: 12 }}>{t("hospitalAdmissionD4a25a.amendments.empty")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {(doc?.amendments ?? []).map((a) => (
                <li key={a.amendmentId}>
                  {a.type} · {a.sectionId || "—"} · {a.reason} · {a.createdAt}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {review ? (
        <div style={panel} data-testid="nursing-admission-review">
          <h4 style={{ margin: "0 0 8px" }}>{t("hospitalAdmissionD4a25.review.title")}</h4>
          <p style={{ fontSize: 12 }}>{t("hospitalAdmissionD4a25.review.attestation")}</p>
          <p style={{ fontSize: 12, color: "#0f766e" }}>
            {t("hospitalAdmissionD4a25a.review.providerHpNotRequired")}{" "}
            {t("hospitalAdmissionD4a25a.review.handoffMayRemainPending")}
          </p>
          <ul style={{ fontSize: 12 }}>
            {Array.isArray(review.sections)
              ? (review.sections as Array<Record<string, unknown>>).map((s) => (
                  <li key={String(s.sectionId)}>
                    {t(`hospitalAdmissionD4a0.clinical.sections.${String(s.sectionId)}`)}
                    {" — "}
                    {t("hospitalAdmissionD4a25a.review.projected")}:{" "}
                    {t(`inpatientAdmissionInp2b1.status.${String(s.projectedState ?? s.completionState)}`)}
                    {" · "}
                    {t("hospitalAdmissionD4a25a.review.amendments")}: {String(s.amendmentCount ?? 0)}
                  </li>
                ))
              : null}
          </ul>
          <ul style={{ fontSize: 12 }}>
            {Array.isArray(review.warnings)
              ? (review.warnings as string[]).map((w) => (
                  <li key={w}>
                    <span aria-hidden="true">⚠ </span>
                    {w}
                  </li>
                ))
              : null}
          </ul>
        </div>
      ) : null}

      {nursingLive || docsLive ? (
        <div style={{ marginTop: 12 }}>
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="nursing" />
        </div>
      ) : null}

      <NursingAdmissionPrintSummaryModal
        encounterId={encounterId}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
      <NursingAdmissionAmendmentDialog
        encounterId={encounterId}
        expectedVersion={expectedVersionRef.current}
        expectedAmendmentVersion={(doc?.amendments ?? []).length}
        open={amendMode != null}
        mode={amendMode ?? "ADDENDUM"}
        onClose={() => setAmendMode(null)}
        onSaved={(documentation) => {
          applyPayload({ documentation: documentation as NursingDoc, completion: completion ?? undefined });
        }}
      />
      {patient?.id && historyEditorDomain ? (
        <NursingAdmissionEnterpriseHistoryEditor
          open
          domain={historyEditorDomain}
          patientId={patient.id}
          encounterId={encounterId}
          onClose={() => {
            setHistoryEditorDomain(null);
            setHistoryEditorItemId(null);
            setHistoryEditorSocialFocus(undefined);
          }}
          socialFocus={historyEditorSocialFocus}
          onSaved={async () => {
            await reload({ preserveDirtyAnswers: dirtyRef.current });
            if (historyEditorItemId) {
              await coordinatorRef.current!.requestVerify(historyEditorItemId, "UPDATED");
              const domainForPatch =
                historyEditorDomain === "SOCIAL_HISTORY"
                  ? historyEditorSocialFocus === "alcohol"
                    ? "ALCOHOL"
                    : historyEditorSocialFocus === "substances"
                      ? "RECREATIONAL_DRUGS"
                      : "SMOKING"
                  : historyEditorDomain;
              const reviewPatch = reviewCompletePatchForDomain(domainForPatch ?? undefined, "UPDATED");
              if (reviewPatch) {
                const nextAnswers = { ...answersRef.current, ...reviewPatch };
                answersRef.current = nextAnswers;
                setAnswers(nextAnswers);
                dirtyRef.current = true;
                await persistSection(undefined, "CONTINUE");
              }
            }
          }}
        />
      ) : null}
      {patient?.id && facilityId && allergyEditorOpen ? (
        <InpatientAllergyEditorModal
          open={allergyEditorOpen}
          onClose={() => {
            setAllergyEditorOpen(false);
            setAllergyEditorItemId(null);
          }}
          encounterId={encounterId}
          facilityId={facilityId}
          patientId={patient.id}
          onSaved={async () => {
            await reload({ preserveDirtyAnswers: dirtyRef.current });
            if (allergyEditorItemId) {
              await coordinatorRef.current!.requestVerify(allergyEditorItemId, "UPDATED");
              const reviewPatch = reviewCompletePatchForDomain("ALLERGIES", "UPDATED");
              if (reviewPatch) {
                const nextAnswers = { ...answersRef.current, ...reviewPatch };
                answersRef.current = nextAnswers;
                setAnswers(nextAnswers);
                dirtyRef.current = true;
                await persistSection(undefined, "CONTINUE");
              }
            }
          }}
        />
      ) : null}
    </div>
  );
}

const panel: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const chipBtn: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 11,
  cursor: "pointer",
};

const chipSelected: CSSProperties = {
  ...chipBtn,
  borderColor: "#0f766e",
  background: "#ccfbf1",
  color: "#115e59",
  fontWeight: 600,
};

const navRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "space-between",
  margin: "8px 0",
};

const navBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const navBtnPrimary: CSSProperties = {
  ...navBtn,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
};

const preloadCard: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const textareaStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 8,
  fontSize: 13,
  boxSizing: "border-box",
};
