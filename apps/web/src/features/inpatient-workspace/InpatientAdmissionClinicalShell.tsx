"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  ADMISSION_SECTION_COMPLETION_STATES,
  HEAD_TO_TOE_SYSTEM_KEYS,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  NURSING_ADMISSION_STAGES,
  nursingAdmissionStageForSection,
  resolveAuthoritativeCodeStatus,
  resolveAuthoritativeIsolation,
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
  type InpatientClinicalOpsV1,
  type NursingAdmissionDomainReferenceV1,
  type NursingAdmissionStageId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch, asApiObject } from "@/lib/apiClient";
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
import { ClinicalSaveStatus } from "./rapid-documentation/ClinicalRapidControls";
import { AdditionalClinicalDocumentationLauncher } from "./rapid-documentation/AdditionalClinicalDocumentationLauncher";

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
  };
};

type NursingDoc = {
  expectedVersion?: number;
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
};

/**
 * D4A.2.7C — Six-stage nursing admission presentation over 20 durable sections.
 */
export function InpatientAdmissionClinicalShell({
  encounterId,
  nursingLive = false,
  docsLive = false,
  canAdmin = false,
}: Props) {
  const { t, language } = useI18n();
  const { roles } = useFacilityAndRoles();
  const [active, setActive] = useState<InpatientAdmissionClinicalSection>("OVERVIEW");
  const [doc, setDoc] = useState<NursingDoc | null>(null);
  const [completion, setCompletion] = useState<Record<string, unknown> | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [unableReason, setUnableReason] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveUiState>("SAVED");
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
  const [printOpen, setPrintOpen] = useState(false);
  const [clinicalOps, setClinicalOps] = useState<InpatientClinicalOpsV1 | null>(null);
  const [amendMode, setAmendMode] = useState<
    null | "ADDENDUM" | "CORRECTION" | "ENTERED_IN_ERROR"
  >(null);
  const [localDraftBackup, setLocalDraftBackup] = useState<Record<string, unknown> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const expectedVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const canAmend = roles.includes("RN");
  const canLinkDomain = roles.includes("RN") || roles.includes("ADMIN");

  const sectionIndex = INPATIENT_ADMISSION_CLINICAL_SECTIONS.indexOf(active);
  const isFirst = sectionIndex <= 0;
  const isLast = sectionIndex >= INPATIENT_ADMISSION_CLINICAL_SECTIONS.length - 1;
  const signed = Boolean(doc?.nurseSignature?.signed);
  const activeStage = nursingAdmissionStageForSection(active);
  const stageId = (activeStage?.id ?? "ARRIVAL_IDENTITY") as NursingAdmissionStageId;
  const stageIndex = NURSING_ADMISSION_STAGES.findIndex((s) => s.id === stageId);
  const stageSections = (activeStage?.sectionKeys ?? []) as InpatientAdmissionClinicalSection[];


  const applyPayload = useCallback(
    (payload: { documentation?: NursingDoc; completion?: Record<string, unknown> }, sectionId?: InpatientAdmissionClinicalSection) => {
      const d = (payload.documentation ?? null) as NursingDoc | null;
      setDoc(d);
      setCompletion(payload.completion ?? null);
      expectedVersionRef.current = Number(d?.expectedVersion ?? 0);
      const sid = sectionId ?? active;
      const sec = d?.sections?.[sid];
      setAnswers((sec?.answers as Record<string, unknown>) ?? {});
      setUnableReason(typeof sec?.unableReason === "string" ? sec.unableReason : "");
      setDraftNote(typeof sec?.draftText === "string" ? sec.draftText : "");
      dirtyRef.current = false;
      setSaveState("SAVED");
    },
    [active]
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await fetchNursingAdmissionDocumentation(encounterId);
      applyPayload(payload as never);
      setLastSavedAt(new Date().toISOString());
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
        if (!cancelled) setPatient(obj?.patient ?? null);
      } catch {
        if (!cancelled) setPatient(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  useEffect(() => {
    const sec = doc?.sections?.[active];
    setAnswers((sec?.answers as Record<string, unknown>) ?? {});
    setUnableReason(typeof sec?.unableReason === "string" ? sec.unableReason : "");
    setDraftNote(typeof sec?.draftText === "string" ? sec.draftText : "");
    dirtyRef.current = false;
    setSaveState("SAVED");
    panelRef.current?.focus();
  }, [active, doc?.sections]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || signed) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [signed]);

  const persistSection = useCallback(
    async (completionState?: AdmissionSectionCompletionState) => {
      if (!doc || signed) return;
      setSaveState("SAVING");
      setBusy(true);
      try {
        const payload = await patchNursingAdmissionSection(encounterId, {
          sectionId: active,
          draftText: draftNote,
          answers,
          unableReason: unableReason || null,
          completionState: completionState ?? undefined,
          expectedVersion: expectedVersionRef.current,
        });
        applyPayload(payload as never, active);
        dirtyRef.current = false;
        setSaveState("SAVED");
        setLastSavedAt(new Date().toISOString());
      } catch {
        setSaveState("SAVE_FAILED");
      } finally {
        setBusy(false);
      }
    },
    [active, answers, applyPayload, doc, draftNote, encounterId, signed, unableReason]
  );

  const markDirty = (nextAnswers: Record<string, unknown>) => {
    setAnswers(nextAnswers);
    dirtyRef.current = true;
    setSaveState("NOT_SAVED");
    // Explicit Save / Save and continue preserve the existing audited write
    // semantics. Scheduling here used a render-stale closure and could write
    // the pre-click snapshot over a newly selected chip.
  };

  const goTo = (id: InpatientAdmissionClinicalSection) => {
    if (dirtyRef.current && !signed) {
      void persistSection().then(() => setActive(id));
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
  }, [sectionIndex, dirtyRef.current, signed]);

  const verifyItem = async (itemId: string, status: string) => {
    if (!doc || signed) return;
    setBusy(true);
    try {
      await verifyNursingAdmissionPreloadItem(encounterId, {
        itemId,
        status,
        expectedVersion: expectedVersionRef.current,
      });
      await reload();
    } catch {
      setSaveState("SAVE_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const openReview = async () => {
    if (dirtyRef.current) await persistSection();
    try {
      const payload = await fetchNursingAdmissionReview(encounterId);
      setReview(payload.review as Record<string, unknown>);
      applyPayload(payload as never);
    } catch {
      setSaveState("SAVE_FAILED");
    }
  };

  const signAdmission = async () => {
    if (!doc || signed) return;
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
    } catch {
      setSaveState("SAVE_FAILED");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const sectionState = (id: string) =>
    (doc?.sections?.[id]?.completionState as AdmissionSectionCompletionState) ?? "NOT_STARTED";

  const sectionLabel = t("inpatientRapidConvergenceD4a27c.stages.progress")
    .replace("{current}", String(stageIndex + 1))
    .replace("{total}", String(NURSING_ADMISSION_STAGES.length));

  const effectiveSaveCode = signed ? "SIGNED" : saveState;

  const StickyFooter = () => (
    <footer
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 25,
        marginTop: 12,
        padding: "10px 12px",
        borderTop: "1px solid #e2e8f0",
        background: "rgba(248,250,252,0.97)",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
      data-testid="admission-sticky-footer"
    >
      <ClinicalSaveStatus code={effectiveSaveCode} savedAt={lastSavedAt} language={language} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!isFirst ? (
          <button type="button" style={navBtn} onClick={goPrev} disabled={busy}>
            {t("inpatientRapidConvergenceD4a27c.nav.previous")}
          </button>
        ) : null}
        <button
          type="button"
          style={navBtnPrimary}
          disabled={busy || signed}
          onClick={() => void persistSection()}
          data-testid="admission-save"
        >
          {t("inpatientRapidConvergenceD4a27c.nav.save")}
        </button>
        {!isLast ? (
          <>
            <button
              type="button"
              style={navBtn}
              disabled={busy || signed}
              onClick={() => void persistSection().then(() => goNext())}
              data-testid="admission-save-continue"
            >
              {t("inpatientRapidConvergenceD4a27c.nav.saveContinue")}
            </button>
            <button type="button" style={navBtn} onClick={goNext} disabled={busy}>
              {t("inpatientRapidConvergenceD4a27c.nav.next")}
            </button>
          </>
        ) : (
          <>
            <button type="button" style={navBtn} onClick={() => void openReview()} disabled={busy}>
              {t("inpatientRapidConvergenceD4a27c.nav.review")}
            </button>
            <button
              type="button"
              style={{ ...navBtnPrimary, background: "#0f766e" }}
              disabled={busy || signed}
              onClick={() => void signAdmission()}
              data-testid="admission-nurse-sign"
            >
              {signed ? t("hospitalAdmissionD4a1.alreadySigned") : t("inpatientRapidConvergenceD4a27c.nav.sign")}
            </button>
          </>
        )}
      </div>
    </footer>
  );

  const openPrintSummary = () => {
    // Always load authoritative server summary — never print unsaved local state.
    setPrintOpen(true);
  };

  const goToStage = (id: NursingAdmissionStageId) => {
    const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === id);
    const first = stage?.sectionKeys[0] as InpatientAdmissionClinicalSection | undefined;
    if (first) goTo(first);
  };

  return (
    <div data-testid="inpatient-admission-clinical-shell">
      <nav
        aria-label={t("inpatientRapidConvergenceD4a27c.stages.ARRIVAL_IDENTITY")}
        data-testid="nursing-admission-stage-rail"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 10,
          position: "sticky",
          top: 0,
          zIndex: 24,
          background: "rgba(248,250,252,0.96)",
          padding: "8px 0",
        }}
      >
        {NURSING_ADMISSION_STAGES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            data-testid={`admission-stage-${s.id}`}
            onClick={() => goToStage(s.id)}
            style={{
              ...chipBtn,
              fontWeight: s.id === stageId ? 700 : 500,
              borderColor: s.id === stageId ? "#0f766e" : "#e2e8f0",
              background: s.id === stageId ? "#ccfbf1" : "#fff",
            }}
          >
            {idx + 1}. {t(`inpatientRapidConvergenceD4a27c.stages.${s.id}`)}
          </button>
        ))}
      </nav>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }} data-testid="nursing-admission-stages-hint">
        {sectionLabel}
      </p>

      <InpatientLifecycleActionsMenu encounterId={encounterId} canAdmin={canAdmin} />

      {admissionCorrelationUiEnabled() ? <AdmissionJourneyPanel encounterId={encounterId} /> : null}

      {loadError ? (
        <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
          {loadError}
        </p>
      ) : null}

      {saveState === "CONFLICT_DETECTED" || saveState === "SAVE_FAILED" ? (
        <div
          role="alert"
          data-testid="admission-conflict-banner"
          style={{
            marginBottom: 10,
            padding: 10,
            border: "1px solid #f59e0b",
            borderRadius: 10,
            background: "#fffbeb",
            fontSize: 12,
          }}
        >
          <strong>{t("inpatientRapidConvergenceD4a27c.conflict.title")}</strong>
          <p style={{ margin: "6px 0" }}>{t("inpatientRapidConvergenceD4a27c.conflict.body")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              style={chipBtn}
              onClick={() => {
                setLocalDraftBackup({ answers, unableReason, draftNote });
                void reload();
              }}
            >
              {t("inpatientRapidConvergenceD4a27c.conflict.reload")}
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
              {t("inpatientRapidConvergenceD4a27c.conflict.preserve")}
            </button>
            <button type="button" style={chipBtn} onClick={() => void persistSection()}>
              {t("inpatientRapidConvergenceD4a27c.conflict.retry")}
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
              {t("inpatientRapidConvergenceD4a27c.conflict.discard")}
            </button>
          </div>
        </div>
      ) : null}

      <div style={saveBar} data-testid="admission-save-state" role="status">
        <ClinicalSaveStatus code={effectiveSaveCode} savedAt={lastSavedAt} language={language} />
      </div>

      {completion ? (
        <div style={completionBar} data-testid="admission-completion-dashboard">
          <strong>{t("hospitalAdmissionD4a1.completion.title")}</strong>
          <span>
            {t("hospitalAdmissionD4a1.completion.complete")}: {String(completion.complete ?? 0)} /{" "}
            {String(completion.total ?? 0)}
          </span>
          <span data-testid="admission-section-position">{sectionLabel}</span>
        </div>
      ) : null}

      <div style={layout}>
        <nav style={checklistBox} data-testid="inpatient-admission-checklist" aria-label={t("inpatientD3e.admission.checklistTitle")}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {t(`inpatientRapidConvergenceD4a27c.stages.${stageId}`)}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {stageSections.map((section, idx) => (
              <li key={section} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => goTo(section)}
                  data-testid={`admission-section-${section}`}
                  style={{
                    ...sectionBtn,
                    background: active === section ? "#ecfeff" : "#fff",
                    borderColor: active === section ? "#0891b2" : "#e2e8f0",
                  }}
                >
                  <span>
                    {idx + 1}. {t(`hospitalAdmissionD4a0.clinical.sections.${section}`)}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {t(`hospitalAdmissionD4a0.clinical.state.${sectionState(section)}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, cursor: "pointer", color: "#64748b" }}>
              {t("inpatientD3e.admission.checklistTitle")} ({INPATIENT_ADMISSION_CLINICAL_SECTIONS.length})
            </summary>
            <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
              {INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((section, idx) => (
                <li key={section} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => goTo(section)}
                    style={{
                      ...sectionBtn,
                      background: active === section ? "#ecfeff" : "#fff",
                      borderColor: active === section ? "#0891b2" : "#e2e8f0",
                    }}
                  >
                    <span>
                      {idx + 1}. {t(`hospitalAdmissionD4a0.clinical.sections.${section}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <div style={{ marginTop: 10 }}>
            <AdditionalClinicalDocumentationLauncher role="NURSING" encounterType="INPATIENT" compact />
          </div>
        </nav>

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

          {(active === "MEDICAL_HISTORY" ||
            active === "SURGICAL_HISTORY" ||
            active === "HOME_MEDICATIONS" ||
            active === "SOCIAL_HISTORY" ||
            active === "ALLERGIES" ||
            active === "IDENTITY_DEMOGRAPHICS") && (
            <div data-testid="admission-preload-panel" style={{ marginBottom: 10 }}>
              {(doc?.preloadedItems ?? [])
                .filter((item) => {
                  if (active === "MEDICAL_HISTORY") return item.domain === "MEDICAL_HISTORY";
                  if (active === "SURGICAL_HISTORY") return item.domain === "SURGICAL_HISTORY";
                  if (active === "ALLERGIES") return item.domain === "ALLERGIES";
                  if (active === "HOME_MEDICATIONS") return item.domain === "HOME_MEDICATIONS";
                  if (active === "SOCIAL_HISTORY")
                    return ["SMOKING", "ALCOHOL", "RECREATIONAL_DRUGS"].includes(item.domain);
                  return true;
                })
                .map((item) => (
                  <div key={item.itemId} style={preloadCard} data-testid={`preload-${item.itemId}`}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{item.displayLabel}</div>
                    <div style={{ fontSize: 12, color: "#334155" }}>{item.valueText}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {ADMISSION_HISTORY_VERIFICATION_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={busy || signed}
                          onClick={() => void verifyItem(item.itemId, st)}
                          style={chipBtn}
                        >
                          {t(`hospitalAdmissionD4a1.verify.${st}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
            readOnly={signed}
            onChange={markDirty}
            onUnableReasonChange={(r) => {
              setUnableReason(r);
              dirtyRef.current = true;
              setSaveState("NOT_SAVED");
            }}
          />

          <label style={{ display: "block", marginTop: 10, fontSize: 12, fontWeight: 600 }}>
            {t("hospitalAdmissionD4a0.clinical.sectionNotes")}
            <textarea
              value={draftNote}
              disabled={signed}
              onChange={(e) => {
                setDraftNote(e.target.value);
                dirtyRef.current = true;
                setSaveState("NOT_SAVED");
              }}
              rows={2}
              style={textareaStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {ADMISSION_SECTION_COMPLETION_STATES.map((st) => (
              <button
                key={st}
                type="button"
                disabled={busy || signed}
                onClick={() => void persistSection(st)}
                style={chipBtn}
              >
                {t(`hospitalAdmissionD4a0.clinical.state.${st}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            style={{ ...chipBtn, marginTop: 8 }}
            onClick={openPrintSummary}
            data-testid="nursing-admission-open-print"
          >
            {t("hospitalAdmissionD4a25a.print.open")}
          </button>

          <StickyFooter />
        </div>
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
                    {t("hospitalAdmissionD4a25a.review.projected")}: {String(s.projectedState ?? s.completionState)}
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
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 280px) 1fr",
  gap: 12,
  alignItems: "start",
};

const checklistBox: CSSProperties = {
  position: "sticky",
  top: 8,
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  maxHeight: "70vh",
  overflow: "auto",
};

const panel: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const sectionBtn: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  textAlign: "left",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
  color: "#334155",
};

const chipBtn: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 11,
  cursor: "pointer",
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

const completionBar: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  fontSize: 12,
  color: "#155e75",
};

const saveBar: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 8,
  padding: "6px 10px",
  borderRadius: 10,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  fontSize: 12,
  color: "#9a3412",
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
