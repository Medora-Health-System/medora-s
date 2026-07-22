"use client";

<<<<<<< HEAD
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  ADMISSION_SECTION_COMPLETION_STATES,
  BELONGINGS_CATEGORIES,
  HEAD_TO_TOE_SYSTEM_KEYS,
  HOME_MEDICATION_RECON_STATUSES,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
=======
import { useMemo, useState, type CSSProperties } from "react";
import {
  ADMISSION_SECTION_COMPLETION_STATES,
  BELONGINGS_CATEGORIES,
  HOME_MEDICATION_RECON_STATUSES,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  admissionDocumentationSupportsSaveAndResume,
  preloadedHistoryMustRetainProvenance,
  preloadedHistoryRequiresVerification,
  sumCashDenominationTotal,
>>>>>>> origin/main
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { AdmissionJourneyPanel } from "@/features/hospital-care/AdmissionJourneyPanel";
<<<<<<< HEAD
import {
  fetchNursingAdmissionDocumentation,
  patchNursingAdmissionSection,
  signNursingAdmission,
  verifyNursingAdmissionPreloadItem,
} from "@/features/hospital-care/inpatientOperationsApi";
=======
>>>>>>> origin/main
import { InpatientClinicalOpsPanel } from "./InpatientClinicalOpsPanel";

function admissionCorrelationUiEnabled(): boolean {
  const v = String(process.env.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

<<<<<<< HEAD
type PreloadItem = {
  itemId: string;
  domain: string;
  displayLabel: string;
  valueText?: string | null;
  provenance?: {
    sourceType?: string;
    sourceEncounterId?: string | null;
    verified?: boolean;
    verifiedByUserId?: string | null;
    verifiedAt?: string | null;
    verificationStatus?: string;
  };
};

type NursingDoc = {
  expectedVersion?: number;
  preloadedItems?: PreloadItem[];
  homeMedicationLines?: Array<{
    lineId: string;
    medicationLabel: string;
    status: string;
    createsInpatientOrder?: boolean;
  }>;
  sections?: Record<
    string,
    { completionState?: string; draftText?: string | null; expectedVersion?: number }
  >;
  headToToe?: Array<{ system: string; status?: string; reuseDomain?: string }>;
  nurseSignature?: {
    signed?: boolean;
    signedAt?: string | null;
    signedByUserId?: string | null;
    credentials?: string | null;
  } | null;
  providerHandoff?: {
    taskId?: string;
    status?: string;
    outstandingSectionIds?: string[];
  } | null;
  belongings?: unknown[];
  cashDenominations?: unknown[];
  wounds?: Array<{ presentOnAdmission?: boolean; anatomicalLocation?: string }>;
};

=======
>>>>>>> origin/main
type Props = {
  encounterId: string;
  nursingLive?: boolean;
  docsLive?: boolean;
};

/**
<<<<<<< HEAD
 * D4A.1 — Structured Med/Surg nursing admission clinical shell.
 * Longitudinal patient history is preloaded with provenance; encounter records verification only.
=======
 * D4A.0 connected nursing admission clinical shell.
 * Establishes section checklist, provenance/verification gates, belongings/valuables/wound scaffolds.
 * Full Medical/Surgical clinical engine content belongs to later D4A phases.
>>>>>>> origin/main
 */
export function InpatientAdmissionClinicalShell({
  encounterId,
  nursingLive = false,
  docsLive = false,
}: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState<InpatientAdmissionClinicalSection>("OVERVIEW");
<<<<<<< HEAD
  const [doc, setDoc] = useState<NursingDoc | null>(null);
  const [completion, setCompletion] = useState<Record<string, unknown> | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyPayload = useCallback((payload: {
    documentation?: NursingDoc;
    completion?: Record<string, unknown>;
  }) => {
    const d = (payload.documentation ?? null) as NursingDoc | null;
    setDoc(d);
    setCompletion(payload.completion ?? null);
    const sectionDraft = d?.sections?.[active]?.draftText;
    setDraftNote(typeof sectionDraft === "string" ? sectionDraft : "");
  }, [active]);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await fetchNursingAdmissionDocumentation(encounterId);
      applyPayload(payload as never);
    } catch {
      setLoadError(t("hospitalAdmissionD4a1.loadError"));
    }
  }, [applyPayload, encounterId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const sectionDraft = doc?.sections?.[active]?.draftText;
    setDraftNote(typeof sectionDraft === "string" ? sectionDraft : "");
  }, [active, doc?.sections]);

  const expectedVersion = Number(doc?.expectedVersion ?? 0);

  const saveDraft = async (completionState?: AdmissionSectionCompletionState) => {
    if (!doc) return;
    setBusy(true);
    setSaveMsg(null);
    try {
      const payload = await patchNursingAdmissionSection(encounterId, {
        sectionId: active,
        draftText: draftNote,
        completionState: completionState ?? undefined,
        expectedVersion,
      });
      applyPayload(payload as never);
      setSaveMsg(t("hospitalAdmissionD4a0.clinical.draftSaved"));
    } catch {
      setSaveMsg(t("hospitalAdmissionD4a1.saveConflict"));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const verifyItem = async (itemId: string, status: string) => {
    if (!doc) return;
    setBusy(true);
    try {
      const payload = await verifyNursingAdmissionPreloadItem(encounterId, {
        itemId,
        status,
        expectedVersion,
      });
      applyPayload({
        documentation: payload.documentation as NursingDoc,
        completion: completion ?? undefined,
      });
      await reload();
    } catch {
      setSaveMsg(t("hospitalAdmissionD4a1.saveConflict"));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const signAdmission = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const payload = await signNursingAdmission(encounterId, {
        expectedVersion,
        credentials: "RN",
        createProviderHandoff: true,
      });
      applyPayload(payload as never);
      setSaveMsg(t("hospitalAdmissionD4a1.signed"));
    } catch {
      setSaveMsg(t("hospitalAdmissionD4a1.signError"));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const sectionState = (id: string) =>
    (doc?.sections?.[id]?.completionState as AdmissionSectionCompletionState) ?? "NOT_STARTED";

  return (
    <div data-testid="inpatient-admission-clinical-shell">
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }} data-testid="d4a1-cert">
        {MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
        {t("hospitalAdmissionD4a1.intro")}
=======
  const [states, setStates] = useState<Record<string, AdmissionSectionCompletionState>>(() => {
    const init: Record<string, AdmissionSectionCompletionState> = {};
    for (const s of INPATIENT_ADMISSION_CLINICAL_SECTIONS) init[s] = "NOT_STARTED";
    return init;
  });
  const [draftNote, setDraftNote] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Demo cash totals for shell contract (not persisted until D4A writers land).
  const cashDemoTotal = useMemo(
    () =>
      sumCashDenominationTotal([
        { currency: "USD", denomination: 100, quantity: 0 },
        { currency: "USD", denomination: 20, quantity: 0 },
      ]),
    []
  );

  const setSectionState = (section: InpatientAdmissionClinicalSection, state: AdmissionSectionCompletionState) => {
    setStates((prev) => ({ ...prev, [section]: state }));
  };

  const saveDraft = () => {
    setSectionState(active, states[active] === "NOT_STARTED" ? "IN_PROGRESS" : states[active]!);
    setSaveMsg(t("hospitalAdmissionD4a0.clinical.draftSaved"));
  };

  return (
    <div data-testid="inpatient-admission-clinical-shell">
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
        {t("inpatientD3e.admission.body")}
>>>>>>> origin/main
      </p>
      {admissionCorrelationUiEnabled() ? (
        <AdmissionJourneyPanel encounterId={encounterId} />
      ) : null}

<<<<<<< HEAD
      {loadError ? (
        <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
          {loadError}
        </p>
      ) : null}

      {completion ? (
        <div style={completionBar} data-testid="admission-completion-dashboard">
          <strong>{t("hospitalAdmissionD4a1.completion.title")}</strong>
          <span>
            {t("hospitalAdmissionD4a1.completion.complete")}: {String(completion.complete ?? 0)} /{" "}
            {String(completion.total ?? 0)}
          </span>
          <span>
            {t("hospitalAdmissionD4a1.completion.inProgress")}:{" "}
            {String(completion.inProgress ?? 0)}
          </span>
        </div>
      ) : null}

=======
>>>>>>> origin/main
      <div style={checklistBox} data-testid="inpatient-admission-checklist">
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {t("inpatientD3e.admission.checklistTitle")}
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((section) => (
            <li key={section} style={{ marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => setActive(section)}
                data-testid={`admission-section-${section}`}
                style={{
                  ...sectionBtn,
                  background: active === section ? "#ecfeff" : "#fff",
                  borderColor: active === section ? "#0891b2" : "#e2e8f0",
                }}
              >
                <span>{t(`hospitalAdmissionD4a0.clinical.sections.${section}`)}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
<<<<<<< HEAD
                  {t(`hospitalAdmissionD4a0.clinical.state.${sectionState(section)}`)}
=======
                  {t(`hospitalAdmissionD4a0.clinical.state.${states[section] ?? "NOT_STARTED"}`)}
>>>>>>> origin/main
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={panel} data-testid={`admission-section-panel-${active}`}>
        <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#0f172a" }}>
          {t(`hospitalAdmissionD4a0.clinical.sections.${active}`)}
        </h4>

        {(active === "MEDICAL_HISTORY" ||
          active === "SURGICAL_HISTORY" ||
          active === "HOME_MEDICATIONS" ||
          active === "SOCIAL_HISTORY" ||
<<<<<<< HEAD
          active === "ALLERGIES" ||
          active === "IDENTITY_DEMOGRAPHICS") && (
          <div data-testid="admission-preload-panel">
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px" }}>
              {t("hospitalAdmissionD4a0.clinical.preloadProvenance")}
            </p>
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
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {t("hospitalAdmissionD4a1.provenance.source")}:{" "}
                    {item.provenance?.sourceType ?? "—"}
                    {item.provenance?.sourceEncounterId
                      ? ` · ${item.provenance.sourceEncounterId}`
                      : ""}
                    {" · "}
                    {t("hospitalAdmissionD4a1.provenance.verified")}:{" "}
                    {item.provenance?.verified
                      ? t("common.yes")
                      : t("common.no")}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {ADMISSION_HISTORY_VERIFICATION_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={busy}
                        onClick={() => void verifyItem(item.itemId, st)}
                        style={chipBtn}
                        data-testid={`verify-${item.itemId}-${st}`}
                      >
                        {t(`hospitalAdmissionD4a1.verify.${st}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {(doc?.preloadedItems ?? []).length === 0 ? (
              <p style={{ fontSize: 12, color: "#64748b" }}>
                {t("hospitalAdmissionD4a1.preloadEmpty")}
              </p>
            ) : null}
          </div>
        )}

        {active === "HOME_MEDICATIONS" ? (
          <div data-testid="home-med-recon-panel" style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#475569" }}>
              {t("hospitalAdmissionD4a1.homeMeds.noOrders")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {(doc?.homeMedicationLines ?? []).map((line) => (
                <li key={line.lineId}>
                  {line.medicationLabel} — {line.status}
                  {line.createsInpatientOrder === false
                    ? ` · ${t("hospitalAdmissionD4a1.homeMeds.notOrder")}`
                    : ""}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 11, color: "#64748b" }}>
              {t("hospitalAdmissionD4a0.clinical.homeMedStatuses")}:{" "}
              {HOME_MEDICATION_RECON_STATUSES.join(", ")}
            </p>
          </div>
=======
          active === "ALLERGIES") && (
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px" }} data-testid="ed-preload-provenance">
            {preloadedHistoryMustRetainProvenance() && preloadedHistoryRequiresVerification()
              ? t("hospitalAdmissionD4a0.clinical.preloadProvenance")
              : null}
          </p>
        )}

        {active === "HOME_MEDICATIONS" ? (
          <p style={{ fontSize: 12, color: "#475569" }}>
            {t("hospitalAdmissionD4a0.clinical.homeMedStatuses")}:{" "}
            {HOME_MEDICATION_RECON_STATUSES.join(", ")}
          </p>
>>>>>>> origin/main
        ) : null}

        {active === "BELONGINGS_VALUABLES" ? (
          <div data-testid="belongings-valuables-shell">
<<<<<<< HEAD
            <p style={{ fontSize: 12, color: "#475569" }}>
=======
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 6px" }}>
>>>>>>> origin/main
              {t("hospitalAdmissionD4a0.clinical.belongingsHint")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
              {BELONGINGS_CATEGORIES.slice(0, 8).map((c) => (
                <li key={c}>{t(`hospitalAdmissionD4a0.belongings.${c}`)}</li>
              ))}
            </ul>
<<<<<<< HEAD
            <p style={{ fontSize: 12, marginTop: 6 }}>
              {t("hospitalAdmissionD4a1.cash.hint")}
=======
            <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              {t("hospitalAdmissionD4a0.clinical.cashTotalDemo")}: {cashDemoTotal}
>>>>>>> origin/main
            </p>
          </div>
        ) : null}

        {active === "SKIN_WOUND" ? (
          <p style={{ fontSize: 12, color: "#475569" }} data-testid="wound-poa-shell">
            {t("hospitalAdmissionD4a0.clinical.woundPoaHint")}
<<<<<<< HEAD
            {(doc?.wounds?.length ?? 0) > 0
              ? ` · ${doc?.wounds?.length} ${t("hospitalAdmissionD4a1.wounds.documented")}`
              : ""}
          </p>
        ) : null}

        {active === "NURSING_ADMISSION_ASSESSMENT" ? (
          <div data-testid="head-to-toe-shell">
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
              {t("hospitalAdmissionD4a1.headToToe.hint")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {(doc?.headToToe ??
                HEAD_TO_TOE_SYSTEM_KEYS.map((s) => ({
                  system: s,
                  reuseDomain: undefined as string | undefined,
                }))).map((row) => (
                  <li key={row.system}>
                    {t(`hospitalAdmissionD4a1.headToToe.${row.system}`)}
                    {"reuseDomain" in row && row.reuseDomain ? ` · ${row.reuseDomain}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {active === "PROVIDER_ADMISSION" ? (
          <div data-testid="provider-handoff-shell">
            <p style={{ fontSize: 12, color: "#475569" }}>
              {t("hospitalAdmissionD4a0.clinical.providerHandoff")}
            </p>
            {doc?.providerHandoff ? (
              <p style={{ fontSize: 12, color: "#0f766e" }} data-testid="provider-handoff-task">
                {t("hospitalAdmissionD4a1.handoff.task")}: {doc.providerHandoff.taskId} (
                {doc.providerHandoff.status})
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "#64748b" }}>
                {t("hospitalAdmissionD4a1.handoff.pendingSign")}
              </p>
            )}
          </div>
=======
          </p>
        ) : null}

        {active === "PROVIDER_ADMISSION" ? (
          <p style={{ fontSize: 12, color: "#475569" }} data-testid="provider-handoff-shell">
            {t("hospitalAdmissionD4a0.clinical.providerHandoff")}
          </p>
>>>>>>> origin/main
        ) : null}

        <label style={{ display: "block", marginTop: 10, fontSize: 12, fontWeight: 600 }}>
          {t("hospitalAdmissionD4a0.clinical.sectionNotes")}
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={3}
<<<<<<< HEAD
            style={textareaStyle}
=======
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              padding: 8,
              fontSize: 13,
              boxSizing: "border-box",
            }}
>>>>>>> origin/main
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {ADMISSION_SECTION_COMPLETION_STATES.map((st) => (
            <button
              key={st}
              type="button"
<<<<<<< HEAD
              disabled={busy}
              onClick={() => void saveDraft(st)}
=======
              onClick={() => setSectionState(active, st)}
>>>>>>> origin/main
              style={chipBtn}
            >
              {t(`hospitalAdmissionD4a0.clinical.state.${st}`)}
            </button>
          ))}
        </div>

<<<<<<< HEAD
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveDraft()}
          style={saveBtn}
          data-testid="admission-save-draft"
        >
          {t("hospitalAdmissionD4a0.clinical.saveDraft")}
        </button>

        <button
          type="button"
          disabled={busy || Boolean(doc?.nurseSignature?.signed)}
          onClick={() => void signAdmission()}
          style={{ ...saveBtn, background: "#0f766e", marginLeft: 8 }}
          data-testid="admission-nurse-sign"
        >
          {doc?.nurseSignature?.signed
            ? t("hospitalAdmissionD4a1.alreadySigned")
            : t("hospitalAdmissionD4a1.sign")}
        </button>

=======
        {admissionDocumentationSupportsSaveAndResume() ? (
          <button type="button" onClick={saveDraft} style={saveBtn} data-testid="admission-save-draft">
            {t("hospitalAdmissionD4a0.clinical.saveDraft")}
          </button>
        ) : null}
>>>>>>> origin/main
        {saveMsg ? (
          <p style={{ fontSize: 12, color: "#0f766e", marginTop: 6 }} role="status">
            {saveMsg}
          </p>
        ) : null}
      </div>

      {nursingLive || docsLive ? (
        <div style={{ marginTop: 12 }}>
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="nursing" />
        </div>
      ) : null}
    </div>
  );
}

const checklistBox: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const panel: CSSProperties = {
  marginTop: 10,
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

const saveBtn: CSSProperties = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
<<<<<<< HEAD

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
=======
>>>>>>> origin/main
