"use client";

import React, { useMemo, useState } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS,
  PROVIDER_DOCUMENTATION_TEMPLATE_CATEGORY_KEYS,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  appendDocumentationFragment,
  applyCompleteNormalRosPrefill,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationCompleteness,
  buildProviderDocumentationPreviewSections,
  buildProviderDocumentationSignReadiness,
  providerDocumentationCanSubmitSignature,
  providerDocumentationTitleKey,
  type ProviderDocumentationEncounterMode,
  type ProviderDocumentationExamSectionId,
  type ProviderDocumentationMetadata,
  type ProviderDocumentationReadinessState,
  type ProviderDocumentationSectionStatus,
  type ProviderDocumentationRiskLevel,
  type ProviderDocumentationTemplateDefinition,
  type ProviderDocumentationTemplateId,
  type ProviderDocumentationTemplateStringField,
  type ProviderDocumentationWorkspaceState,
} from "@/lib/providerDocumentationModel";

type Chip = { labelKey: string; fragmentKey: string };
type ChipGroup = { titleKey: string; field: keyof ProviderDocumentationWorkspaceState; chips: Chip[] };
type ExamChipGroup = { sectionId: ProviderDocumentationExamSectionId; titleKey: string; chips: Chip[] };
type PreviewSectionId = ReturnType<typeof buildProviderDocumentationPreviewSections>[number]["id"];

export type ProviderDocumentationWorkspaceProps = {
  encounterMode: ProviderDocumentationEncounterMode;
  value: ProviderDocumentationWorkspaceState;
  onChange: (next: ProviderDocumentationWorkspaceState) => void;
  onSave: () => void | Promise<void>;
  onSign?: () => void | Promise<void>;
  onClear?: () => void;
  saving?: boolean;
  signing?: boolean;
  readOnly?: boolean;
  lockedMessage?: string | null;
  saveMessage?: { variant: "success" | "error" | "queued"; text: string } | null;
  lastSaved?: { savedAt: string; savedBy: string } | null;
  signedMetadata?: { signedAt: string; signedBy: string } | null;
  savedMetadata?: ProviderDocumentationMetadata | null;
  signedOrFinalized?: boolean;
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

const stickyActionHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 12,
  zIndex: 40,
  background: "rgba(255, 255, 255, 0.98)",
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
  padding: "14px 16px",
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
  { sectionId: "reassessment", titleKey: "providerDocumentationWorkspace.examReassessment", chips: ["planReassess"].map((key) => ({ labelKey: `erMseMdmChips.${key}`, fragmentKey: `erMseMdmChips.${key}` })) },
];

const examTitleKeyBySection: Record<ProviderDocumentationExamSectionId, string> = {
  general: "providerDocumentationWorkspace.examGeneral",
  heent: "providerDocumentationWorkspace.examHeent",
  cardiovascular: "providerDocumentationWorkspace.examCardiovascular",
  respiratory: "providerDocumentationWorkspace.examRespiratory",
  abdomen: "providerDocumentationWorkspace.examAbdomen",
  neuroPsych: "providerDocumentationWorkspace.examNeuroPsych",
  musculoskeletal: "providerDocumentationWorkspace.examMusculoskeletal",
  skin: "providerDocumentationWorkspace.examSkin",
  reassessment: "providerDocumentationWorkspace.examReassessment",
};

const previewTitleKeyBySection: Record<PreviewSectionId, string> = {
  hpi: "providerDocumentationWorkspace.previewHpi",
  ros: "providerDocumentationWorkspace.previewRos",
  physicalExam: "providerDocumentationWorkspace.previewExam",
  mdm: "providerDocumentationWorkspace.previewMdm",
  impression: "providerDocumentationWorkspace.previewImpression",
  plan: "providerDocumentationWorkspace.previewPlan",
};

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

function WorkspaceSection({
  title,
  status,
  t,
  children,
}: {
  title: string;
  status?: ProviderDocumentationSectionStatus;
  t: (key: string) => string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionShell}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{title}</h3>
        {status ? <StatusPill status={status} t={t} /> : null}
      </div>
      {children}
    </section>
  );
}

export function ProviderDocumentationWorkspace({
  encounterMode,
  value,
  onChange,
  onSave,
  onSign,
  onClear,
  saving = false,
  signing = false,
  readOnly = false,
  lockedMessage = null,
  saveMessage = null,
  lastSaved = null,
  signedMetadata = null,
  savedMetadata = null,
  signedOrFinalized = false,
  latestVitalSigns = [],
  keyInformation = [],
  encounterSummary = [],
  quickActions = null,
  t,
}: ProviderDocumentationWorkspaceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const previewSections = useMemo(() => buildProviderDocumentationPreviewSections(value), [value]);
  const activeTemplate = useMemo(
    () => PROVIDER_DOCUMENTATION_TEMPLATES.find((template) => template.id === value.activeTemplateId) ?? null,
    [value.activeTemplateId]
  );
  const completeness = useMemo(
    () =>
      buildProviderDocumentationCompleteness({
        state: value,
        encounterMode,
        savedMetadata,
        signedOrFinalized,
        dispositionContext: null,
        hasPendingResults: false,
        longStayOrInterventionHeavy: false,
      }),
    [encounterMode, savedMetadata, signedOrFinalized, value]
  );
  const sectionStatusById = useMemo(
    () => Object.fromEntries(completeness.sectionStatuses.map((section) => [section.id, section.status])),
    [completeness.sectionStatuses]
  ) as Partial<Record<string, ProviderDocumentationSectionStatus>>;
  const signReadiness = useMemo(
    () =>
      buildProviderDocumentationSignReadiness({
        state: value,
        encounterMode,
        savedMetadata,
        signedOrFinalized,
        dispositionContext: null,
        hasPendingResults: false,
        longStayOrInterventionHeavy: false,
      }),
    [encounterMode, savedMetadata, signedOrFinalized, value]
  );
  const canSubmitSignature = providerDocumentationCanSubmitSignature({
    attestationAccepted,
    signReadiness,
    signedOrFinalized,
  });

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
  const applyCompleteNormalRos = () => {
    if (readOnly) return;
    onChange(
      applyCompleteNormalRosPrefill({
        state: value,
        text: t("providerDocumentationWorkspace.completeNormalRosText"),
      })
    );
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
  const chipRow = <T extends Chip,>(chips: T[], onClick: (chip: T) => void, tone?: "warn" | "green") => (
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
  const templateTextChips = (
    template: ProviderDocumentationTemplateDefinition | null,
    fields: ProviderDocumentationTemplateStringField[],
    titleKey: string
  ) => {
    if (!template) return null;
    const chips = fields.flatMap((field) =>
      (template.fields[field] ?? []).map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey, field }))
    );
    if (!chips.length) return null;
    return (
      <ChipGroupView title={t(titleKey)}>
        {chipRow(chips, (chip) => appendField(chip.field, chip.fragmentKey))}
      </ChipGroupView>
    );
  };
  const templateExamChips = (template: ProviderDocumentationTemplateDefinition | null) => {
    if (!template) return null;
    const groups = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((sectionId) => ({
      sectionId,
      chips: (template.physicalExam[sectionId] ?? []).map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey })),
    })).filter((group) => group.chips.length > 0);
    if (!groups.length) return null;
    return (
      <div style={{ marginBottom: 10 }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
          {t("providerDocumentationWorkspace.activeTemplateStickerHelp")}
        </p>
        {groups.map((group) => (
          <ChipGroupView key={group.sectionId} title={t(examTitleKeyBySection[group.sectionId])}>
            {chipRow(group.chips, (chip) => appendExam(group.sectionId, chip.fragmentKey), "green")}
          </ChipGroupView>
        ))}
      </div>
    );
  };
  const completenessSectionLabel = (sectionId: string) => {
    const labelKey =
      sectionId === "chiefComplaintHpi"
        ? "providerDocumentationWorkspace.completenessChiefComplaintHpi"
        : sectionId === "followUpDisposition"
          ? "providerDocumentationWorkspace.followUpDisposition"
          : previewTitleKeyBySection[sectionId as PreviewSectionId] ?? "common.dash";
    return t(labelKey);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={stickyActionHeaderStyle}
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
            {onSign ? (
              <button
                type="button"
                disabled={readOnly || signing || !canSubmitSignature}
                onClick={() => void onSign()}
                style={primaryButton(readOnly || signing || !canSubmitSignature)}
              >
                {signing ? t("providerDocumentationWorkspace.signing") : t("providerDocumentationWorkspace.signFinalize")}
              </button>
            ) : null}
          </div>
        </div>
        {lockedMessage ? <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400e" }}>{lockedMessage}</p> : null}
        {activeTemplate ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>
            {t("providerDocumentationWorkspace.activeTemplate").replace("{template}", t(activeTemplate.labelKey))}
          </p>
        ) : null}
        {saveMessage ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: saveMessage.variant === "error" ? "#b91c1c" : "#15803d" }}>
            {saveMessage.text}
          </p>
        ) : null}
        {onSign && !signedOrFinalized ? (
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10, fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
            <input
              type="checkbox"
              checked={attestationAccepted}
              disabled={readOnly || signing}
              onChange={(event) => setAttestationAccepted(event.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>{t("providerDocumentationWorkspace.signAttestation")}</span>
          </label>
        ) : null}
        {signedMetadata ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#166534", lineHeight: 1.45, fontWeight: 700 }}>
            {t("providerDocumentationWorkspace.signedBy")} {signedMetadata.signedBy} · {signedMetadata.signedAt}
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
            {PROVIDER_DOCUMENTATION_TEMPLATE_CATEGORY_KEYS.map((categoryKey) => {
              const templates = PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => template.categoryKey === categoryKey);
              if (!templates.length) return null;
              return (
                <div key={categoryKey} style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>
                    {t(categoryKey)}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => applyTemplate(template.id)}
                        title={t(template.helperKey)}
                        style={{
                          padding: "9px 10px",
                          border: value.activeTemplateId === template.id ? "1px solid #0f766e" : "1px solid #dbeafe",
                          borderRadius: 10,
                          background: value.activeTemplateId === template.id ? "#ecfdf5" : "#fff",
                          color: value.activeTemplateId === template.id ? "#0f766e" : "#1e3a8a",
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
                </div>
              );
            })}
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.templateSafetyComment")}
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionPresentation")} status={sectionStatusById.chiefComplaintHpi} t={t}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.reasonForVisit")}>{ta("reasonForVisit", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.chiefComplaint")}>{ta("chiefComplaint", 2)}</Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label={t("providerDocumentationWorkspace.hpi")}>{ta("hpi", 4)}</Field>
              {templateTextChips(activeTemplate, ["hpi"], "providerDocumentationWorkspace.activeTemplateHpi")}
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

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionRos")} status={sectionStatusById.ros} t={t}>
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                border: "1px solid #fde68a",
                borderRadius: 12,
                background: "#fffbeb",
              }}
            >
              <button
                type="button"
                disabled={readOnly}
                onClick={applyCompleteNormalRos}
                style={{
                  ...chipStyle,
                  background: readOnly ? "#f1f5f9" : "#fff",
                  borderColor: readOnly ? "#e2e8f0" : "#fcd34d",
                  color: readOnly ? "#94a3b8" : "#92400e",
                  cursor: readOnly ? "not-allowed" : "pointer",
                }}
              >
                {t("providerDocumentationWorkspace.insertCompleteNormalRos")}
              </button>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#92400e", lineHeight: 1.45 }}>
                {t("providerDocumentationWorkspace.completeNormalRosHelp")}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.focusedImpression")}>{ta("rosFocusedImpression", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantPositives")}>{ta("rosImportantPositives", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantNegatives")}>{ta("rosImportantNegatives", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.redFlags")}>{ta("rosRedFlags", 2)}</Field>
            </div>
            {templateTextChips(
              activeTemplate,
              ["rosFocusedImpression", "rosImportantPositives", "rosImportantNegatives", "rosRedFlags"],
              "providerDocumentationWorkspace.activeTemplateRos"
            )}
            {ROS_CHIPS.map((group) => (
              <ChipGroupView key={group.titleKey} title={t(group.titleKey)}>
                {group.field === "rosImportantNegatives" ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#92400e" }}>{t("providerDocumentationWorkspace.negativesWarning")}</p>
                ) : null}
                {chipRow(group.chips, (chip) => appendField(group.field, chip.fragmentKey), group.field === "rosImportantNegatives" ? "warn" : undefined)}
              </ChipGroupView>
            ))}
          </WorkspaceSection>

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionExam")} status={sectionStatusById.physicalExam} t={t}>
            {templateExamChips(activeTemplate)}
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

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionMdm")} status={sectionStatusById.mdm} t={t}>
            {templateTextChips(
              activeTemplate,
              [
                "mdmWorkingAssessment",
                "mdmDataReviewed",
                "mdmPlanSummary",
                "mdmImmediateActionsRationale",
                "mdmConsultsDiscussed",
                "mdmAdmitObserveDischarge",
              ],
              "providerDocumentationWorkspace.activeTemplateMdm"
            )}
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

          <WorkspaceSection title={t("providerDocumentationWorkspace.sectionPlan")} status={sectionStatusById.plan} t={t}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.clinicalImpression")}>{ta("clinicalImpression", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.treatmentPlan")}>{ta("treatmentPlan", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.followUpDisposition")}>{ta("followUpDisposition", 2)}</Field>
              <Field label={t("providerDocumentationWorkspace.providerAddendum")}>{ta("providerAddendum", 2)}</Field>
            </div>
          </WorkspaceSection>
        </div>

        <aside style={{ position: "sticky", top: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionShell} data-testid="provider-documentation-overview">
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>
              {t("providerDocumentationWorkspace.documentationOverview")}
            </h3>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              <strong>{t("providerDocumentationWorkspace.activeTemplateLabel")}</strong>{" "}
              {activeTemplate ? t(activeTemplate.labelKey) : t("providerDocumentationWorkspace.noActiveTemplate")}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>
              {t("providerDocumentationWorkspace.completedSections")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              {completeness.completedSections.length ? completeness.completedSections.map(completenessSectionLabel).join(", ") : t("common.dash")}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
              {t("providerDocumentationWorkspace.missingKeySections")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              {completeness.missingSections.length ? completeness.missingSections.map(completenessSectionLabel).join(", ") : t("providerDocumentationWorkspace.noMissingKeySections")}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: readinessColor(completeness.readinessState) }}>
              {t("providerDocumentationWorkspace.readyToSaveIndicator")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: readinessColor(completeness.readinessState), lineHeight: 1.45, fontWeight: 700 }}>
              {t(readinessLabelKey(completeness.readinessState))}
            </p>
            {completeness.warnings.length ? (
              <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 11, color: "#92400e", lineHeight: 1.45 }}>
                {completeness.warnings.slice(0, 5).map((warning) => (
                  <li key={warning.id}>{t(warning.messageKey)}</li>
                ))}
              </ul>
            ) : null}
            <p style={{ margin: "8px 0 4px", fontSize: 11, fontWeight: 700, color: signReadiness.readyToSign || signedOrFinalized ? "#166534" : "#92400e" }}>
              {t("providerDocumentationWorkspace.signReadiness")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: signReadiness.readyToSign || signedOrFinalized ? "#166534" : "#92400e", lineHeight: 1.45, fontWeight: 700 }}>
              {signedOrFinalized
                ? t("providerDocumentationWorkspace.signedStatus")
                : signReadiness.readyToSign
                  ? t("providerDocumentationWorkspace.readyToSign")
                  : t("providerDocumentationWorkspace.notReadyToSign")}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
              {t("providerDocumentationWorkspace.missingBeforeSign")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              {signReadiness.missingSections.length
                ? signReadiness.missingSections.map(completenessSectionLabel).join(", ")
                : t("providerDocumentationWorkspace.noMissingKeySections")}
              {!signReadiness.savedBeforeSign && !signedOrFinalized
                ? ` · ${t("providerDocumentationWorkspace.saveRequiredBeforeSign")}`
                : ""}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>
              {t("providerDocumentationWorkspace.saveStatus")}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              {lastSaved ? `${lastSaved.savedBy} · ${lastSaved.savedAt}` : t("providerDocumentationWorkspace.notSavedYet")}
            </p>
            {signedMetadata ? (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#166534" }}>
                  {t("providerDocumentationWorkspace.signedBy")}
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#166534", lineHeight: 1.45 }}>
                  {signedMetadata.signedBy} · {signedMetadata.signedAt}
                </p>
              </>
            ) : null}
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.chipsSafetyComment")}
            </p>
          </div>
          <div style={sectionShell} data-testid="provider-documentation-live-preview">
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>
              {t("providerDocumentationWorkspace.liveDocumentationPreview")}
            </h3>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.previewOnlyNotLegal")}
            </p>
            {previewSections.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                {t("providerDocumentationWorkspace.previewNoDocumentationEnteredYet")}
              </p>
            ) : (
              previewSections.map((section) => (
                <div key={section.id} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                    {t(section.titleKey)}
                  </p>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                    {section.lines.join("\n")}
                  </div>
                </div>
              ))
            )}
          </div>
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
                <>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
                    {t("providerDocumentationWorkspace.previewDraftReadiness")}: {t(readinessLabelKey(completeness.readinessState))}
                    {completeness.missingSections.length
                      ? ` · ${t("providerDocumentationWorkspace.missingKeySections")}: ${completeness.missingSections.map(completenessSectionLabel).join(", ")}`
                      : ""}
                  </p>
                  {previewSections.map((section) => (
                    <div key={section.id} style={{ marginBottom: 10 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>{t(section.titleKey)}</p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                        {section.lines.map((line, idx) => <li key={idx}>{line}</li>)}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </aside>
      </div>
      <div style={{ ...sectionShell, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, color: "#0f172a" }}>
              {t("providerDocumentationWorkspace.finalActions")}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.signSafetyHelp")}
            </p>
          </div>
        </div>
        {onSign && !signReadiness.readyToSign && !signedOrFinalized ? (
          <p style={{ margin: 0, fontSize: 11, color: "#92400e", lineHeight: 1.45 }}>
            {t("providerDocumentationWorkspace.signWarningsAdvisory")}
          </p>
        ) : null}
        {signedMetadata ? (
          <p style={{ margin: 0, fontSize: 12, color: "#166534", lineHeight: 1.45, fontWeight: 700 }}>
            {t("providerDocumentationWorkspace.signedBy")} {signedMetadata.signedBy} · {signedMetadata.signedAt}
          </p>
        ) : null}
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

function StatusPill({ status, t }: { status: ProviderDocumentationSectionStatus; t: (key: string) => string }) {
  const color =
    status === "complete" || status === "saved"
      ? "#166534"
      : status === "recommended"
        ? "#92400e"
        : "#991b1b";
  const background =
    status === "complete" || status === "saved"
      ? "#f0fdf4"
      : status === "recommended"
        ? "#fffbeb"
        : "#fef2f2";
  return (
    <span
      style={{
        borderRadius: 9999,
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 800,
        color,
        background,
        border: `1px solid ${status === "missing" ? "#fecaca" : status === "recommended" ? "#fcd34d" : "#bbf7d0"}`,
        whiteSpace: "nowrap",
      }}
    >
      {t(`providerDocumentationWorkspace.sectionStatus${status[0].toUpperCase()}${status.slice(1)}`)}
    </span>
  );
}

function readinessLabelKey(state: ProviderDocumentationReadinessState): string {
  return `providerDocumentationWorkspace.readiness${state
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")}`;
}

function readinessColor(state: ProviderDocumentationReadinessState): string {
  if (state === "ready_to_save" || state === "saved" || state === "signed_or_finalized") return "#166534";
  if (state === "needs_review") return "#92400e";
  return "#991b1b";
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

