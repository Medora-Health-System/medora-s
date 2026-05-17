"use client";

import React, { useMemo, useState } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  appendDocumentationFragment,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationPreviewSections,
  providerDocumentationTitleKey,
  type ProviderDocumentationEncounterMode,
  type ProviderDocumentationExamSectionId,
  type ProviderDocumentationRiskLevel,
  type ProviderDocumentationWorkspaceState,
} from "@/lib/providerDocumentationModel";

type Chip = { labelKey: string; fragmentKey: string };
type ChipGroup = { titleKey: string; field: keyof ProviderDocumentationWorkspaceState; chips: Chip[] };
type ExamChipGroup = { sectionId: ProviderDocumentationExamSectionId; titleKey: string; chips: Chip[] };

export type ProviderDocumentationWorkspaceProps = {
  encounterMode: ProviderDocumentationEncounterMode;
  value: ProviderDocumentationWorkspaceState;
  onChange: (next: ProviderDocumentationWorkspaceState) => void;
  onSave: () => void | Promise<void>;
  onClear?: () => void;
  saving?: boolean;
  readOnly?: boolean;
  lockedMessage?: string | null;
  saveMessage?: { variant: "success" | "error" | "queued"; text: string } | null;
  lastSaved?: { savedAt: string; savedBy: string } | null;
  latestVitalSigns?: string[];
  keyInformation?: string[];
  encounterSummary?: string[];
  quickActions?: React.ReactNode;
  t: (key: string) => string;
};

const sectionShell: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: "#475569",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  color: "#0f172a",
  background: "#fff",
  lineHeight: 1.45,
};

const chipStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  borderRadius: 9999,
  background: "#eff6ff",
  color: "#1e40af",
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const HPI_CHIPS: ChipGroup[] = [
  {
    titleKey: "providerDocumentationWorkspace.chipLocation",
    field: "hpi",
    chips: [
      ["locChestPain", "erMseHpiChips.locChestPain"],
      ["locAbdominalPain", "erMseHpiChips.locAbdominalPain"],
      ["locHeadache", "erMseHpiChips.locHeadache"],
      ["locFlankPain", "erMseHpiChips.locFlankPain"],
      ["locLimbPain", "erMseHpiChips.locLimbPain"],
      ["locBackPain", "erMseHpiChips.locBackPain"],
    ].map(([labelKey, fragmentKey]) => ({ labelKey: `erMseHpiChips.${labelKey}`, fragmentKey })),
  },
  {
    titleKey: "providerDocumentationWorkspace.chipTiming",
    field: "hpi",
    chips: [
      ["timStartedToday", "erMseHpiChips.timStartedToday"],
      ["timSuddenOnset", "erMseHpiChips.timSuddenOnset"],
      ["timGradualOnset", "erMseHpiChips.timGradualOnset"],
      ["timChronicOrRecurrent", "erMseHpiChips.timChronicOrRecurrent"],
      ["timWorsening", "erMseHpiChips.timWorsening"],
      ["timImproving", "erMseHpiChips.timImproving"],
    ].map(([labelKey, fragmentKey]) => ({ labelKey: `erMseHpiChips.${labelKey}`, fragmentKey })),
  },
  {
    titleKey: "providerDocumentationWorkspace.chipQuality",
    field: "hpi",
    chips: [
      ["qualSharp", "erMseHpiChips.qualSharp"],
      ["qualPressureLike", "erMseHpiChips.qualPressureLike"],
      ["qualBurning", "erMseHpiChips.qualBurning"],
      ["qualAching", "erMseHpiChips.qualAching"],
      ["qualThrobbing", "erMseHpiChips.qualThrobbing"],
      ["qualStabbing", "erMseHpiChips.qualStabbing"],
    ].map(([labelKey, fragmentKey]) => ({ labelKey: `erMseHpiChips.${labelKey}`, fragmentKey })),
  },
  {
    titleKey: "providerDocumentationWorkspace.chipAssociated",
    field: "hpi",
    chips: [
      ["assocNausea", "erMseHpiChips.assocNausea"],
      ["assocVomiting", "erMseHpiChips.assocVomiting"],
      ["assocFever", "erMseHpiChips.assocFever"],
      ["assocDizziness", "erMseHpiChips.assocDizziness"],
      ["assocDiaphoresis", "erMseHpiChips.assocDiaphoresis"],
      ["assocSob", "erMseHpiChips.assocSob"],
    ].map(([labelKey, fragmentKey]) => ({ labelKey: `erMseHpiChips.${labelKey}`, fragmentKey })),
  },
];

const ROS_CHIPS: ChipGroup[] = [
  {
    titleKey: "providerDocumentationWorkspace.rosPositiveSymptoms",
    field: "rosImportantPositives",
    chips: [
      "posSob",
      "posChestPain",
      "posFever",
      "posVomiting",
      "posDizziness",
      "posWeakness",
      "posAbdominalPain",
      "posHeadache",
    ].map((key) => ({ labelKey: `erMseRosChips.${key}`, fragmentKey: `erMseRosChips.${key}` })),
  },
  {
    titleKey: "providerDocumentationWorkspace.rosRedFlags",
    field: "rosRedFlags",
    chips: [
      "rfSyncope",
      "rfAlteredMs",
      "rfSeverePain",
      "rfNeuroDeficit",
      "rfHypotensionConcern",
      "rfRespDistress",
      "rfBleeding",
      "rfPregnancyConcern",
    ].map((key) => ({ labelKey: `erMseRosChips.${key}`, fragmentKey: `erMseRosChips.${key}` })),
  },
  {
    titleKey: "providerDocumentationWorkspace.rosNegativeSymptoms",
    field: "rosImportantNegatives",
    chips: [
      "negDeniesChestPain",
      "negDeniesSob",
      "negDeniesFever",
      "negDeniesVomiting",
      "negDeniesWeakness",
      "negDeniesSyncope",
      "negDeniesAbdominalPain",
      "negDeniesHeadache",
    ].map((key) => ({ labelKey: `erMseRosChips.${key}`, fragmentKey: `erMseRosChips.${key}` })),
  },
];

const EXAM_CHIPS: ExamChipGroup[] = [
  { sectionId: "general", titleKey: "providerDocumentationWorkspace.examGeneral", chips: ["genAlert", "genNoAcuteDistress", "genUncomfortableAppearing", "genToxicAppearing"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "heent", titleKey: "providerDocumentationWorkspace.examHeent", chips: ["heentHeadAtraumatic", "heentPerrla", "heentOropharynxClear"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "cardiovascular", titleKey: "providerDocumentationWorkspace.examCardiovascular", chips: ["cardioRrr", "cardioNoMurmur", "cardioPeripheralPulsesPresent", "cardioTachycardic"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "respiratory", titleKey: "providerDocumentationWorkspace.examRespiratory", chips: ["respNoDistress", "respClearBs", "respWheezing", "respCrackles", "respIncreasedWob"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "abdomen", titleKey: "providerDocumentationWorkspace.examAbdomen", chips: ["abdSoft", "abdNonTender", "abdTendernessPresent", "abdGuarding"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "neuroPsych", titleKey: "providerDocumentationWorkspace.examNeuroPsych", chips: ["neuroAlertOriented", "neuroFollowsCommands", "neuroSpeechClear", "neuroFocalDeficitNoted", "psychAppropriateAffect", "psychAnxious"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "musculoskeletal", titleKey: "providerDocumentationWorkspace.examMusculoskeletal", chips: ["mskRomNormal", "mskTendernessPresent", "mskSwellingPresent", "mskDeformityNoted"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "skin", titleKey: "providerDocumentationWorkspace.examSkin", chips: ["skinWarmDry", "skinRashPresent", "skinLacerationPresent", "skinDiaphoresis"].map((key) => ({ labelKey: `erMseExamChips.${key}`, fragmentKey: `erMseExamChips.${key}` })) },
];

const MDM_CHIPS: ChipGroup[] = [
  { titleKey: "erMseMdmChips.catWorkingAssessment", field: "mdmWorkingAssessment", chips: ["waUndifferentiated", "waInfectious", "waCardiopulmonary", "waNeurologic", "waAbdominal", "waTrauma", "waMedIntox"].map((key) => ({ labelKey: `erMseMdmChips.${key}`, fragmentKey: `erMseMdmChips.${key}` })) },
  { titleKey: "erMseMdmChips.catPlanSummary", field: "mdmPlanSummary", chips: ["planLabs", "planImaging", "planEcg", "planMeds", "planReassess", "planSdM"].map((key) => ({ labelKey: `erMseMdmChips.${key}`, fragmentKey: `erMseMdmChips.${key}` })) },
  { titleKey: "erMseMdmChips.catDisposition", field: "mdmAdmitObserveDischarge", chips: ["dispDcCriteria", "dispObs", "dispAdmit", "dispTransfer", "dispReturnPrecautions"].map((key) => ({ labelKey: `erMseMdmChips.${key}`, fragmentKey: `erMseMdmChips.${key}` })) },
];

const OBSERVATION_CHIPS: Chip[] = [
  "obsSymptomsImproving",
  "obsSymptomsUnchanged",
  "obsSymptomsWorsening",
  "obsVitalsStable",
  "obsAwaitingLab",
  "obsAwaitingImaging",
  "obsToleratingPo",
  "obsPainControlled",
  "obsContinuedMonitoring",
  "obsDischargeReadiness",
  "obsTransferConsidered",
].map((key) => ({
  labelKey: `providerDocumentationWorkspace.${key}`,
  fragmentKey: `providerDocumentationWorkspace.${key}`,
}));

function WorkspaceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionShell}>
      <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{title}</h3>
      {children}
    </section>
  );
}

export function ProviderDocumentationWorkspace({
  encounterMode,
  value,
  onChange,
  onSave,
  onClear,
  saving = false,
  readOnly = false,
  lockedMessage = null,
  saveMessage = null,
  lastSaved = null,
  latestVitalSigns = [],
  keyInformation = [],
  encounterSummary = [],
  quickActions = null,
  t,
}: ProviderDocumentationWorkspaceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const previewSections = useMemo(() => buildProviderDocumentationPreviewSections(value), [value]);

  const patch = (patchValue: Partial<ProviderDocumentationWorkspaceState>) => {
    onChange({ ...value, ...patchValue });
  };
  const appendField = (field: keyof ProviderDocumentationWorkspaceState, fragmentKey: string) => {
    const current = value[field];
    if (typeof current !== "string") return;
    patch({ [field]: appendDocumentationFragment(current, t(fragmentKey)) } as Partial<ProviderDocumentationWorkspaceState>);
  };
  const appendExam = (sectionId: ProviderDocumentationExamSectionId, fragmentKey: string) => {
    onChange({
      ...value,
      physicalExam: {
        ...value.physicalExam,
        [sectionId]: appendDocumentationFragment(value.physicalExam[sectionId], t(fragmentKey)),
      },
    });
  };
  const applyTemplate = (templateId: (typeof PROVIDER_DOCUMENTATION_TEMPLATES)[number]["id"]) => {
    if (readOnly) return;
    onChange(
      applyProviderDocumentationTemplate({
        state: value,
        templateId,
        resolveFragment: t,
      })
    );
    setShowTemplates(false);
  };
  const ta = (field: keyof ProviderDocumentationWorkspaceState, rows = 2) => (
    <textarea
      value={String(value[field] ?? "")}
      onChange={(e) => patch({ [field]: e.target.value } as Partial<ProviderDocumentationWorkspaceState>)}
      disabled={readOnly}
      rows={rows}
      style={{ ...inputBase, resize: "vertical", minHeight: rows * 24, background: readOnly ? "#f8fafc" : "#fff" }}
    />
  );
  const chipRow = (chips: Chip[], onClick: (chip: Chip) => void, tone?: "warn" | "green") => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {chips.map((chip) => (
        <button
          key={chip.labelKey}
          type="button"
          disabled={readOnly}
          onClick={() => onClick(chip)}
          style={{
            ...chipStyle,
            background: readOnly ? "#f1f5f9" : tone === "warn" ? "#fffbeb" : tone === "green" ? "#f0fdf4" : "#eff6ff",
            borderColor: readOnly ? "#e2e8f0" : tone === "warn" ? "#fcd34d" : tone === "green" ? "#bbf7d0" : "#dbeafe",
            color: readOnly ? "#94a3b8" : tone === "warn" ? "#92400e" : tone === "green" ? "#166534" : "#1e40af",
            cursor: readOnly ? "not-allowed" : "pointer",
          }}
        >
          {t(chip.labelKey)}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
          padding: "14px 16px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {t(providerDocumentationTitleKey(encounterMode))}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("providerDocumentationWorkspace.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setShowTemplates((visible) => !visible)}
              style={secondaryButton(readOnly)}
            >
              {t("providerDocumentationWorkspace.templates")}
            </button>
            <button type="button" disabled={readOnly || !onClear} onClick={onClear} style={secondaryButton(readOnly || !onClear)}>{t("providerDocumentationWorkspace.clear")}</button>
            <button type="button" onClick={() => setShowPreview((v) => !v)} style={secondaryButton(false)}>{t("providerDocumentationWorkspace.preview")}</button>
            <button type="button" disabled={readOnly || saving} onClick={() => void onSave()} style={primaryButton(readOnly || saving)}>
              {saving ? t("providerDocumentationWorkspace.saving") : t("providerDocumentationWorkspace.save")}
            </button>
          </div>
        </div>
        {lockedMessage ? <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400e" }}>{lockedMessage}</p> : null}
        {saveMessage ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: saveMessage.variant === "error" ? "#b91c1c" : "#15803d" }}>
            {saveMessage.text}
          </p>
        ) : null}
        {showTemplates ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#f8fafc",
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.templatePickerHelp")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              {PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => applyTemplate(template.id)}
                  title={t(template.helperKey)}
                  style={{
                    padding: "9px 10px",
                    border: "1px solid #dbeafe",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#1e3a8a",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: readOnly ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ display: "block" }}>{t(template.labelKey)}</span>
                  <span style={{ display: "block", marginTop: 3, color: "#64748b", fontSize: 11, fontWeight: 500 }}>
                    {t(template.helperKey)}
                  </span>
                </button>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.templateSafetyComment")}
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionPresentation")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.reasonForVisit")}>{ta("reasonForVisit", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.chiefComplaint")}>{ta("chiefComplaint", 2)}</Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label={t("providerDocumentationWorkspace.hpi")}>{ta("hpi", 4)}</Field>
              {HPI_CHIPS.map((group) => (
                <ChipGroupView key={group.titleKey} title={t(group.titleKey)}>
                  {chipRow(group.chips, (chip) => appendField(group.field, chip.fragmentKey))}
                </ChipGroupView>
              ))}
              {encounterMode === "OBSERVATION" ? (
                <ChipGroupView title={t("providerDocumentationWorkspace.observationChips")}>
                  {chipRow(OBSERVATION_CHIPS, (chip) => appendField("hpi", chip.fragmentKey), "green")}
                </ChipGroupView>
              ) : null}
            </div>
          </WorkspaceSection>

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionRos")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.focusedImpression")}>{ta("rosFocusedImpression", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantPositives")}>{ta("rosImportantPositives", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantNegatives")}>{ta("rosImportantNegatives", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.redFlags")}>{ta("rosRedFlags", 2)}</Field>
            </div>
            {ROS_CHIPS.map((group) => (
              <ChipGroupView key={group.titleKey} title={t(group.titleKey)}>
                {group.field === "rosImportantNegatives" ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#92400e" }}>{t("providerDocumentationWorkspace.negativesWarning")}</p>
                ) : null}
                {chipRow(group.chips, (chip) => appendField(group.field, chip.fragmentKey), group.field === "rosImportantNegatives" ? "warn" : undefined)}
              </ChipGroupView>
            ))}
          </WorkspaceSection>

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionExam")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {EXAM_CHIPS.map((group) => (
                <div key={group.sectionId} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#f8fafc" }}>
                  <Field label={t(group.titleKey)}>
                    <textarea
                      value={value.physicalExam[group.sectionId]}
                      disabled={readOnly}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          physicalExam: { ...value.physicalExam, [group.sectionId]: e.target.value },
                        })
                      }
                      rows={2}
                      style={{ ...inputBase, resize: "vertical", background: readOnly ? "#f8fafc" : "#fff" }}
                    />
                  </Field>
                  {chipRow(group.chips, (chip) => appendExam(group.sectionId, chip.fragmentKey), "green")}
                </div>
              ))}
            </div>
          </WorkspaceSection>

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionMdm")}>
            {MDM_CHIPS.map((group) => (
              <ChipGroupView key={group.titleKey} title={t(group.titleKey)}>
                {chipRow(group.chips, (chip) => appendField(group.field, chip.fragmentKey))}
              </ChipGroupView>
            ))}
            <p style={{ margin: "8px 0", fontSize: 11, color: "#64748b" }}>
              {t("providerDocumentationWorkspace.chipsSafetyComment")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.workingAssessment")}>{ta("mdmWorkingAssessment", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.differential")}>{ta("mdmDifferentialSynthesis", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.dataReviewed")}>{ta("mdmDataReviewed", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.riskLevel")}>
                <select
                  value={value.mdmRiskLevel}
                  disabled={readOnly}
                  onChange={(e) => patch({ mdmRiskLevel: e.target.value as ProviderDocumentationRiskLevel })}
                  style={inputBase}
                >
                  <option value="">{t("common.dash")}</option>
                  <option value="Low">{t("providerDocumentationWorkspace.riskLow")}</option>
                  <option value="Moderate">{t("providerDocumentationWorkspace.riskModerate")}</option>
                  <option value="High">{t("providerDocumentationWorkspace.riskHigh")}</option>
                </select>
              </Field>
              <Field label={t("providerDocumentationWorkspace.clinicalRationale")}>{ta("mdmClinicalRationale", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.planSummary")}>{ta("mdmPlanSummary", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.immediateActions")}>{ta("mdmImmediateActionsRationale", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.consults")}>{ta("mdmConsultsDiscussed", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.admitObserveDischarge")}>{ta("mdmAdmitObserveDischarge", 2)}</Field>
            </div>
          </WorkspaceSection>

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionPlan")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.clinicalImpression")}>{ta("clinicalImpression", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.treatmentPlan")}>{ta("treatmentPlan", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.followUpDisposition")}>{ta("followUpDisposition", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.providerAddendum")}>{ta("providerAddendum", 2)}</Field>
            </div>
          </WorkspaceSection>
        </div>

        <aside style={{ position: "sticky", top: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <ContextCard title={t("providerDocumentationWorkspace.latestVitals")} lines={latestVitalSigns} empty={t("common.dash")} />
          <ContextCard title={t("providerDocumentationWorkspace.keyInformation")} lines={keyInformation} empty={t("common.dash")} />
          <ContextCard title={t("providerDocumentationWorkspace.encounterSummary")} lines={encounterSummary} empty={t("common.dash")} />
          <div style={sectionShell}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>{t("providerDocumentationWorkspace.quickActions")}</h3>
            {quickActions ?? <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.dash")}</p>}
          </div>
          <div style={sectionShell}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>{t("providerDocumentationWorkspace.lastSaved")}</h3>
            <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
              {lastSaved ? `${lastSaved.savedBy} · ${lastSaved.savedAt}` : t("common.dash")}
            </p>
          </div>
          {showPreview ? (
            <div style={sectionShell}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>{t("providerDocumentationWorkspace.previewTitle")}</h3>
              {previewSections.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("providerDocumentationWorkspace.previewEmpty")}</p>
              ) : (
                previewSections.map((section) => (
                  <div key={section.id} style={{ marginBottom: 10 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>{t(section.titleKey)}</p>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                      {section.lines.map((line, idx) => <li key={idx}>{line}</li>)}
                    </ul>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function ChipGroupView({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ContextCard({ title, lines, empty }: { title: string; lines: string[]; empty: string }) {
  return (
    <div style={sectionShell}>
      <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>{title}</h3>
      {lines.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
          {lines.map((line, idx) => <li key={idx}>{line}</li>)}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{empty}</p>
      )}
    </div>
  );
}

function secondaryButton(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "7px 12px",
    background: "#fff",
    color: disabled ? "#94a3b8" : "#334155",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #2563eb",
    borderRadius: 10,
    padding: "7px 12px",
    background: disabled ? "#f1f5f9" : "#2563eb",
    color: disabled ? "#94a3b8" : "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

