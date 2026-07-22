"use client";

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
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { AdmissionJourneyPanel } from "@/features/hospital-care/AdmissionJourneyPanel";
import { InpatientClinicalOpsPanel } from "./InpatientClinicalOpsPanel";

function admissionCorrelationUiEnabled(): boolean {
  const v = String(process.env.NEXT_PUBLIC_ADMISSION_CORRELATION_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

type Props = {
  encounterId: string;
  nursingLive?: boolean;
  docsLive?: boolean;
};

/**
 * D4A.0 connected nursing admission clinical shell.
 * Establishes section checklist, provenance/verification gates, belongings/valuables/wound scaffolds.
 * Full Medical/Surgical clinical engine content belongs to later D4A phases.
 */
export function InpatientAdmissionClinicalShell({
  encounterId,
  nursingLive = false,
  docsLive = false,
}: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState<InpatientAdmissionClinicalSection>("OVERVIEW");
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
      </p>
      {admissionCorrelationUiEnabled() ? (
        <AdmissionJourneyPanel encounterId={encounterId} />
      ) : null}

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
                  {t(`hospitalAdmissionD4a0.clinical.state.${states[section] ?? "NOT_STARTED"}`)}
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
        ) : null}

        {active === "BELONGINGS_VALUABLES" ? (
          <div data-testid="belongings-valuables-shell">
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 6px" }}>
              {t("hospitalAdmissionD4a0.clinical.belongingsHint")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
              {BELONGINGS_CATEGORIES.slice(0, 8).map((c) => (
                <li key={c}>{t(`hospitalAdmissionD4a0.belongings.${c}`)}</li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
              {t("hospitalAdmissionD4a0.clinical.cashTotalDemo")}: {cashDemoTotal}
            </p>
          </div>
        ) : null}

        {active === "SKIN_WOUND" ? (
          <p style={{ fontSize: 12, color: "#475569" }} data-testid="wound-poa-shell">
            {t("hospitalAdmissionD4a0.clinical.woundPoaHint")}
          </p>
        ) : null}

        {active === "PROVIDER_ADMISSION" ? (
          <p style={{ fontSize: 12, color: "#475569" }} data-testid="provider-handoff-shell">
            {t("hospitalAdmissionD4a0.clinical.providerHandoff")}
          </p>
        ) : null}

        <label style={{ display: "block", marginTop: 10, fontSize: 12, fontWeight: 600 }}>
          {t("hospitalAdmissionD4a0.clinical.sectionNotes")}
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={3}
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
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {ADMISSION_SECTION_COMPLETION_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSectionState(active, st)}
              style={chipBtn}
            >
              {t(`hospitalAdmissionD4a0.clinical.state.${st}`)}
            </button>
          ))}
        </div>

        {admissionDocumentationSupportsSaveAndResume() ? (
          <button type="button" onClick={saveDraft} style={saveBtn} data-testid="admission-save-draft">
            {t("hospitalAdmissionD4a0.clinical.saveDraft")}
          </button>
        ) : null}
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
