"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS,
  PROVIDER_DOCUMENTATION_DICTATION_SECTION_TARGETS,
  PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS,
  PROVIDER_DOCUMENTATION_MAJOR_GROUP_KEYS,
  PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  applyCompleteNormalPhysicalExamPrefill,
  applyCompleteNormalRosPrefill,
  toggleDocumentationFragment,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationCompleteness,
  buildProviderDocumentationPreviewSections,
  buildProviderDocumentationSignReadiness,
  providerDocumentationCanSubmitSignature,
  providerDocumentationDictationSectionForTargetId,
  providerDocumentationPrimaryDictationTargetForSection,
  providerDocumentationStateHasContent,
  providerDocumentationTitleKey,
  type ProviderDocumentationDictationSectionId,
  type ProviderDocumentationEncounterMode,
  type ProviderDocumentationExamSectionId,
  type ProviderDocumentationMajorGroup,
  type ProviderDocumentationMetadata,
  type ProviderDocumentationReadinessState,
  type ProviderDocumentationSectionStatus,
  type ProviderDocumentationRiskLevel,
  type ProviderDocumentationTemplateDefinition,
  type ProviderDocumentationTemplateGuidance,
  type ProviderDocumentationTemplateId,
  type ProviderDocumentationTemplateStringField,
  type ProviderDocumentationWorkspaceState,
} from "@/lib/providerDocumentationModel";
import {
  type ProviderDocumentationAutosaveStatus,
  shouldAutosaveProviderDocumentation,
} from "@/lib/providerDocumentationAutosave";
import {
  buildProviderDocumentationDraftKey,
  providerDocumentationStateSignature,
  readProviderDocumentationDraft,
  removeProviderDocumentationDraft,
  shouldRestoreProviderDocumentationDraft,
  writeProviderDocumentationDraft,
} from "@/lib/providerDocumentationDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";
import { ProviderDocumentationAccordionSection } from "@/components/encounters/ProviderDocumentationAccordionSection";
import { ProviderDocumentationChipPanel } from "@/components/encounters/ProviderDocumentationChipPanel";
import {
  accordionSectionsToExpandForDictation,
  defaultExpandedAccordionSections,
  providerDocumentationAccordionSelectedCounts,
  providerDocumentationAccordionSummaries,
  type ProviderDocumentationAccordionSectionId,
} from "@/lib/providerDocumentationSectionSummary";
import {
  isDocumentationChipSelected,
  resolveDocumentationChipStyles,
} from "@/lib/providerDocumentationChipSelection";
import { resolveHpiChipGroupsForTemplate } from "@/lib/providerDocumentationTemplateHpiDimensions";
import {
  DYNAMIC_SUGGESTION_CATEGORY_ORDER,
  DYNAMIC_SUGGESTION_CATEGORY_TITLE_KEYS,
  getProviderDocumentationDynamicSuggestions,
} from "@/lib/providerDocumentationDynamicIntelligence";
import {
  DYNAMIC_CLUSTER_SEVERITY_TITLE_KEYS,
  excludeClusterSuggestionsFromDynamicSuggestions,
  getProviderDocumentationDynamicClinicalClusters,
} from "@/lib/providerDocumentationDynamicClinicalClusters";
import {
  DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS,
  DOCUMENTATION_GUARDRAIL_SEVERITY_ORDER,
  evaluateDocumentationQualityGuardrails,
  type DocumentationGuardrail,
} from "@/lib/providerDocumentationQualityGuardrails";
import {
  computeDocumentationReadinessScore,
  DOCUMENTATION_READINESS_LEVEL_LABEL_KEYS,
  type DocumentationReadinessLevel,
} from "@/lib/providerDocumentationReadinessScore";

type Chip = { labelKey: string; fragmentKey: string };
type ChipGroup = { titleKey: string; field: keyof ProviderDocumentationWorkspaceState; chips: Chip[] };
type ExamChipGroup = { sectionId: ProviderDocumentationExamSectionId; titleKey: string; chips: Chip[] };
type TemplateFieldChip = Chip & { field: ProviderDocumentationTemplateStringField };
type ChipRowOptions = {
  tone?: "warn" | "green";
  fieldText?: string;
  getFieldText?: (chip: Chip) => string;
};
type PreviewSectionId = ReturnType<typeof buildProviderDocumentationPreviewSections>[number]["id"];

export type ProviderDocumentationWorkspaceProps = {
  encounterId: string;
  encounterMode: ProviderDocumentationEncounterMode;
  providerUserId?: string | null;
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

const AUTOSAVE_DEBOUNCE_MS = 2000;

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
  padding: "9px 12px",
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

const examDictationIdBySection: Record<ProviderDocumentationExamSectionId, string> = {
  general: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamGeneral,
  heent: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamHeent,
  cardiovascular: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamCardiovascular,
  respiratory: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamRespiratory,
  abdomen: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamAbdomen,
  neuroPsych: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamNeuroPsych,
  musculoskeletal: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamMusculoskeletal,
  skin: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamSkin,
  reassessment: PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.physicalExamReassessment,
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

const TEMPLATE_PICKER_COLUMN_ACCENT: Record<
  ProviderDocumentationMajorGroup,
  { headingBg: string; headingBorder: string; headingColor: string; activeBg: string; activeBorder: string; activeColor: string }
> = {
  TRAUMA: {
    headingBg: "#ecfdf5",
    headingBorder: "#86efac",
    headingColor: "#166534",
    activeBg: "#ecfdf5",
    activeBorder: "#0f766e",
    activeColor: "#0f766e",
  },
  PEDIATRIC: {
    headingBg: "#eff6ff",
    headingBorder: "#93c5fd",
    headingColor: "#1e40af",
    activeBg: "#eff6ff",
    activeBorder: "#2563eb",
    activeColor: "#1d4ed8",
  },
  ADULT: {
    headingBg: "#f5f3ff",
    headingBorder: "#c4b5fd",
    headingColor: "#5b21b6",
    activeBg: "#f5f3ff",
    activeBorder: "#7c3aed",
    activeColor: "#6d28d9",
  },
};

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

const DICTATION_NAV_TARGETS = PROVIDER_DOCUMENTATION_DICTATION_SECTION_TARGETS.map((section) => ({
  sectionId: section.sectionId,
  labelKey: section.labelKey,
  id: section.primaryTargetId,
}));

export function ProviderDocumentationWorkspace({
  encounterId,
  encounterMode,
  providerUserId = null,
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
  const [autosaveStatus, setAutosaveStatus] = useState<ProviderDocumentationAutosaveStatus>("idle");
  const [autosaveSavedAt, setAutosaveSavedAt] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [activeDictationSection, setActiveDictationSection] = useState<ProviderDocumentationDictationSectionId | null>(null);
  const [highlightedDictationTargetId, setHighlightedDictationTargetId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<ProviderDocumentationAccordionSectionId>>(
    () => new Set(["hpi"])
  );
  const initializedDefaultExpandRef = useRef(false);
  const latestSignatureRef = useRef(providerDocumentationStateSignature(value));
  const lastSavedSignatureRef = useRef(providerDocumentationStateSignature(value));
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);
  const previewSections = useMemo(() => buildProviderDocumentationPreviewSections(value), [value]);
  const activeTemplate = useMemo(
    () => PROVIDER_DOCUMENTATION_TEMPLATES.find((template) => template.id === value.activeTemplateId) ?? null,
    [value.activeTemplateId]
  );
  const hpiChipGroups = useMemo(
    () => resolveHpiChipGroupsForTemplate(value.activeTemplateId, HPI_CHIPS),
    [value.activeTemplateId]
  );
  const dynamicClusters = useMemo(
    () =>
      getProviderDocumentationDynamicClinicalClusters({
        templateId: value.activeTemplateId,
        state: value,
      }),
    [value]
  );
  const dynamicSuggestions = useMemo(() => {
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: value.activeTemplateId,
      state: value,
    });
    return excludeClusterSuggestionsFromDynamicSuggestions(suggestions, dynamicClusters);
  }, [dynamicClusters, value]);
  const qualityGuardrails = useMemo(
    () =>
      evaluateDocumentationQualityGuardrails({
        templateId: value.activeTemplateId,
        state: value,
        dynamicClusters,
      }),
    [dynamicClusters, value]
  );
  const documentationReadiness = useMemo(
    () =>
      computeDocumentationReadinessScore({
        templateId: value.activeTemplateId,
        state: value,
        guardrails: qualityGuardrails,
        dynamicClusters,
      }),
    [dynamicClusters, qualityGuardrails, value]
  );
  const [collapsedClusterIds, setCollapsedClusterIds] = useState<Set<string>>(() => new Set());
  const [qualityGuardrailsExpanded, setQualityGuardrailsExpanded] = useState(true);
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
  const currentSignature = useMemo(() => providerDocumentationStateSignature(value), [value]);
  const draftKey = useMemo(
    () => buildProviderDocumentationDraftKey({ encounterId, encounterMode, providerUserId }),
    [encounterId, encounterMode, providerUserId]
  );
  const hasDraftableContent = useMemo(() => providerDocumentationStateHasContent(value), [value]);
  const accordionSummaries = useMemo(() => providerDocumentationAccordionSummaries(value), [value]);
  const accordionSelectedCounts = useMemo(() => providerDocumentationAccordionSelectedCounts(value), [value]);

  useEffect(() => {
    if (initializedDefaultExpandRef.current) return;
    initializedDefaultExpandRef.current = true;
    setExpandedSections(
      new Set(
        defaultExpandedAccordionSections({
          missingSectionIds: completeness.missingSections,
        })
      )
    );
  }, [completeness.missingSections]);

  useEffect(() => {
    latestSignatureRef.current = currentSignature;
  }, [currentSignature]);

  useEffect(() => {
    if (signedOrFinalized || readOnly) return;
    if (typeof window === "undefined") return;
    if (restoredDraftKeyRef.current === draftKey) return;
    restoredDraftKeyRef.current = draftKey;
    const draft = readProviderDocumentationDraft(window.localStorage, draftKey);
    if (
      shouldRestoreProviderDocumentationDraft({
        draft,
        encounterId,
        encounterMode,
        providerUserId,
        serverSavedAt: savedMetadata?.savedAt ?? null,
      })
    ) {
      setAutosaveStatus("restore_available");
      setDraftRestoredAt(draft?.updatedAt ?? null);
      onChange({ ...draft!.state, physicalExam: { ...draft!.state.physicalExam } });
    }
  }, [draftKey, encounterId, encounterMode, onChange, providerUserId, readOnly, savedMetadata?.savedAt, signedOrFinalized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (signedOrFinalized || readOnly) return;
    if (!hasDraftableContent || currentSignature === lastSavedSignatureRef.current) {
      try {
        removeProviderDocumentationDraft(window.localStorage, draftKey);
      } catch {
        /* Local draft cleanup is best-effort; provider text stays in React state. */
      }
      return;
    }
    const now = new Date().toISOString();
    try {
      writeProviderDocumentationDraft(window.localStorage, draftKey, {
        schemaVersion: 1,
        encounterId,
        encounterMode,
        providerUserId: providerUserId?.trim() || "unknown-provider",
        updatedAt: now,
        serverSavedAt: savedMetadata?.savedAt ?? null,
        state: value,
      });
      setAutosaveStatus((status) => (status === "saving" || status === "failed" ? status : "unsaved"));
    } catch {
      setAutosaveStatus("failed");
    }
  }, [
    currentSignature,
    draftKey,
    encounterId,
    encounterMode,
    hasDraftableContent,
    providerUserId,
    readOnly,
    savedMetadata?.savedAt,
    signedOrFinalized,
    value,
  ]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const shouldAutosave = shouldAutosaveProviderDocumentation({
      currentSignature,
      lastSavedSignature: lastSavedSignatureRef.current,
      readOnly,
      signedOrFinalized,
      saving,
      hasContent: hasDraftableContent,
    });
    if (!shouldAutosave) return;

    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      const signatureToSave = latestSignatureRef.current;
      setAutosaveStatus("saving");
      Promise.resolve(onSave())
        .then(() => {
          if (latestSignatureRef.current === signatureToSave) {
            lastSavedSignatureRef.current = signatureToSave;
            if (typeof window !== "undefined") {
              try {
                removeProviderDocumentationDraft(window.localStorage, draftKey);
              } catch {
                /* Draft cleanup is best-effort after a confirmed save. */
              }
            }
            setAutosaveSavedAt(new Date().toISOString());
            setAutosaveStatus("saved");
          } else {
            setAutosaveStatus("unsaved");
          }
        })
        .catch(() => {
          setAutosaveStatus("failed");
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [currentSignature, draftKey, hasDraftableContent, onSave, readOnly, saving, signedOrFinalized]);

  useClinicalBeforeUnloadWarning({
    dirty: currentSignature !== lastSavedSignatureRef.current,
    workflowEditable: !readOnly,
    signedOrFinalized,
  });

  const runManualSave = async () => {
    setAutosaveStatus("saving");
    const signatureToSave = latestSignatureRef.current;
    try {
      await onSave();
      if (latestSignatureRef.current === signatureToSave) {
        lastSavedSignatureRef.current = signatureToSave;
        if (typeof window !== "undefined") {
          try {
            removeProviderDocumentationDraft(window.localStorage, draftKey);
          } catch {
            /* Draft cleanup is best-effort after a confirmed save. */
          }
        }
        setAutosaveSavedAt(new Date().toISOString());
        setAutosaveStatus("saved");
      }
    } catch {
      setAutosaveStatus("failed");
    }
  };

  useEffect(() => {
    if (!saveMessage) return;
    if (saveMessage.variant === "error") setAutosaveStatus("failed");
    if (saveMessage.variant === "success" || saveMessage.variant === "queued") setAutosaveStatus("saved");
  }, [saveMessage]);

  useEffect(() => {
    if (!highlightedDictationTargetId) return;
    const timer = setTimeout(() => setHighlightedDictationTargetId(null), 1200);
    return () => clearTimeout(timer);
  }, [highlightedDictationTargetId]);

  const patch = (patchValue: Partial<ProviderDocumentationWorkspaceState>) => {
    onChange({ ...value, ...patchValue });
  };
  const toggleField = (field: keyof ProviderDocumentationWorkspaceState, fragmentKey: string) => {
    const current = value[field];
    if (typeof current !== "string") return;
    patch({
      [field]: toggleDocumentationFragment(current, t(fragmentKey)),
    } as Partial<ProviderDocumentationWorkspaceState>);
  };
  const toggleExam = (sectionId: ProviderDocumentationExamSectionId, fragmentKey: string) => {
    onChange({
      ...value,
      physicalExam: {
        ...value.physicalExam,
        [sectionId]: toggleDocumentationFragment(value.physicalExam[sectionId], t(fragmentKey)),
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
  const applyCompleteNormalExam = () => {
    if (readOnly) return;
    onChange(
      applyCompleteNormalPhysicalExamPrefill({
        state: value,
        resolveFragment: t,
      })
    );
  };
  const markActiveDictationTarget = (id: string | undefined) => {
    const section = providerDocumentationDictationSectionForTargetId(id);
    if (section) setActiveDictationSection(section);
  };
  const focusDictationTarget = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!el || el.disabled) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    markActiveDictationTarget(id);
    setHighlightedDictationTargetId(id);
  };
  const focusDictationSection = (sectionId: ProviderDocumentationDictationSectionId) => {
    const primaryTarget = providerDocumentationPrimaryDictationTargetForSection(sectionId);
    setExpandedSections((previous) => {
      const next = new Set(previous);
      for (const accordionId of accordionSectionsToExpandForDictation(sectionId, primaryTarget)) {
        next.add(accordionId);
      }
      return next;
    });
    if (typeof document !== "undefined") {
      const accordionId = accordionSectionsToExpandForDictation(sectionId, primaryTarget)[0];
      document
        .querySelector(`[data-testid="provider-documentation-accordion-${accordionId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    focusDictationTarget(primaryTarget);
  };
  const toggleAccordionSection = (sectionId: ProviderDocumentationAccordionSectionId) => {
    setExpandedSections((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };
  const isAccordionExpanded = (sectionId: ProviderDocumentationAccordionSectionId) => expandedSections.has(sectionId);
  const jumpToGuardrailSection = (sectionId: ProviderDocumentationAccordionSectionId) => {
    setExpandedSections((previous) => {
      const next = new Set(previous);
      next.add(sectionId);
      return next;
    });
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="provider-documentation-accordion-${sectionId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const handleSignClick = () => {
    if (qualityGuardrails.length > 0 && !signedOrFinalized) {
      setExpandedSections((previous) => {
        const next = new Set(previous);
        next.add("actions");
        return next;
      });
      setQualityGuardrailsExpanded(true);
      if (typeof document !== "undefined") {
        requestAnimationFrame(() => {
          document
            .querySelector('[data-testid="provider-documentation-quality-guardrails"]')
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    }
    void onSign?.();
  };
  const guardrailSeverityLabelKey = (severity: DocumentationGuardrail["severity"]) =>
    severity === "high"
      ? "providerDocumentationQualityGuardrails.severityHigh"
      : severity === "warning"
        ? "providerDocumentationQualityGuardrails.severityWarning"
        : "providerDocumentationQualityGuardrails.severityInfo";
  const guardrailSeverityStyles = (severity: DocumentationGuardrail["severity"]) =>
    severity === "high"
      ? { background: "#ffedd5", color: "#c2410c", borderColor: "#fdba74" }
      : severity === "warning"
        ? { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }
        : { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
  const readinessLevelStyles = (level: DocumentationReadinessLevel) =>
    level === "strong"
      ? { background: "#dcfce7", color: "#166534", borderColor: "#86efac" }
      : level === "moderate"
        ? { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }
        : { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
  const readinessSummaryKey = (level: DocumentationReadinessLevel) =>
    level === "strong"
      ? "providerDocumentationReadinessScore.summaryStrong"
      : level === "moderate"
        ? "providerDocumentationReadinessScore.summaryModerate"
        : "providerDocumentationReadinessScore.summaryLow";
  const renderDocumentationReadinessPanel = () => {
    if (signedOrFinalized) return null;
    const levelStyle = readinessLevelStyles(documentationReadiness.level);
    const topWarnings = qualityGuardrails
      .filter((guardrail) => guardrail.severity === "high" || guardrail.severity === "warning")
      .slice(0, 3);
    return (
      <div
        data-testid="provider-documentation-readiness-score"
        style={{
          marginBottom: 10,
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 8,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
            {t("providerDocumentationReadinessScore.panelTitle")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{documentationReadiness.score}%</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                border: "1px solid",
                ...levelStyle,
              }}
            >
              {t(DOCUMENTATION_READINESS_LEVEL_LABEL_KEYS[documentationReadiness.level])}
            </span>
          </div>
        </div>
        <p style={{ margin: "6px 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
          {t(readinessSummaryKey(documentationReadiness.level))}
        </p>
        {documentationReadiness.strongSections.length > 0 ? (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
              {t("providerDocumentationReadinessScore.strongSections")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#334155" }}>
              {documentationReadiness.strongSections.map((sectionKey) => (
                <li key={sectionKey}>{t(sectionKey)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {documentationReadiness.needsAttentionSections.length > 0 ? (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 2 }}>
              {t("providerDocumentationReadinessScore.needsAttentionSections")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#334155" }}>
              {documentationReadiness.needsAttentionSections.map((sectionKey) => (
                <li key={sectionKey}>{t(sectionKey)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {documentationReadiness.warningCount > 0 ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
              {t("providerDocumentationReadinessScore.warnings")}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 10, color: "#64748b" }}>
              {t("providerDocumentationReadinessScore.warningCount").replace(
                "{count}",
                String(documentationReadiness.warningCount)
              )}
              {documentationReadiness.highSeverityWarningCount > 0
                ? ` · ${t("providerDocumentationReadinessScore.highSeverityWarningCount").replace(
                    "{count}",
                    String(documentationReadiness.highSeverityWarningCount)
                  )}`
                : ""}
            </p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#475569" }}>
              {topWarnings.map((guardrail) => (
                <li key={guardrail.id}>{t(guardrail.descriptionKey)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };
  const renderQualityGuardrailsPanel = (compact = false) => {
    if (qualityGuardrails.length === 0 || signedOrFinalized) return null;
    const grouped = DOCUMENTATION_GUARDRAIL_SEVERITY_ORDER.map((severity) => ({
      severity,
      items: qualityGuardrails.filter((guardrail) => guardrail.severity === severity),
    })).filter((group) => group.items.length > 0);
    return (
      <div
        data-testid="provider-documentation-quality-guardrails"
        style={{
          marginBottom: compact ? 0 : 10,
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 8,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
              {t("providerDocumentationQualityGuardrails.panelTitle")}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
              {t("providerDocumentationQualityGuardrails.panelHelp")}
            </div>
          </div>
          {!compact ? (
            <button
              type="button"
              onClick={() => setQualityGuardrailsExpanded((expanded) => !expanded)}
              style={{
                ...chipStyle,
                fontSize: 10,
                padding: "2px 8px",
                background: "#fff",
                borderColor: "#cbd5e1",
                color: "#475569",
              }}
            >
              {qualityGuardrailsExpanded
                ? t("providerDocumentationWorkspace.dynamicClustersCollapse")
                : t("providerDocumentationWorkspace.dynamicClustersExpand")}
            </button>
          ) : null}
        </div>
        {qualityGuardrailsExpanded ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {grouped.map((group) => (
              <div key={group.severity}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                  {t(guardrailSeverityLabelKey(group.severity)).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.map((guardrail) => {
                    const severityStyle = guardrailSeverityStyles(guardrail.severity);
                    return (
                      <div
                        key={guardrail.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "6px 8px",
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>{t(guardrail.titleKey)}</span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 9999,
                              border: "1px solid",
                              ...severityStyle,
                            }}
                          >
                            {t(guardrailSeverityLabelKey(guardrail.severity))}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                          {t(guardrail.descriptionKey)}
                        </p>
                        {guardrail.suggestedSection ? (
                          <button
                            type="button"
                            onClick={() => jumpToGuardrailSection(guardrail.suggestedSection!)}
                            style={{
                              marginTop: 4,
                              padding: 0,
                              border: "none",
                              background: "transparent",
                              color: "#2563eb",
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            {t("providerDocumentationQualityGuardrails.jumpToSection")}:{" "}
                            {t(DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS[guardrail.suggestedSection])}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };
  const focusRelativeDictationTarget = (direction: 1 | -1) => {
    if (typeof document === "undefined") return;
    const activeId = document.activeElement?.id;
    const activeSection = providerDocumentationDictationSectionForTargetId(activeId) ?? activeDictationSection;
    const currentIndex = DICTATION_NAV_TARGETS.findIndex((target) => target.sectionId === activeSection);
    const nextIndex =
      currentIndex >= 0
        ? Math.min(DICTATION_NAV_TARGETS.length - 1, Math.max(0, currentIndex + direction))
        : direction > 0
          ? 0
          : DICTATION_NAV_TARGETS.length - 1;
    focusDictationSection(DICTATION_NAV_TARGETS[nextIndex].sectionId);
  };
  const ta = (field: keyof ProviderDocumentationWorkspaceState, rows = 2, dictationId?: string) => (
    <textarea
      id={dictationId}
      data-dictation-ready={dictationId ? "true" : undefined}
      value={String(value[field] ?? "")}
      onChange={(e) => patch({ [field]: e.target.value } as Partial<ProviderDocumentationWorkspaceState>)}
      onFocus={() => markActiveDictationTarget(dictationId)}
      disabled={readOnly}
      rows={rows}
      style={{
        ...inputBase,
        resize: "vertical",
        minHeight: rows * 24,
        background: readOnly ? "#f8fafc" : highlightedDictationTargetId === dictationId ? "#fefce8" : "#fff",
        boxShadow: highlightedDictationTargetId === dictationId ? "0 0 0 3px rgba(20, 184, 166, 0.18)" : undefined,
        transition: "background 160ms ease, box-shadow 160ms ease",
      }}
    />
  );
  const chipRow = <T extends Chip,>(
    chips: T[],
    onClick: (chip: T) => void,
    options?: ChipRowOptions | "warn" | "green"
  ) => {
    const resolved: ChipRowOptions = typeof options === "string" ? { tone: options } : (options ?? {});
    const resolveFieldText = (chip: T) => resolved.getFieldText?.(chip) ?? resolved.fieldText ?? "";

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {chips.map((chip) => {
          const fragment = t(chip.fragmentKey);
          const selected = isDocumentationChipSelected(resolveFieldText(chip), fragment);
          const toneStyles = resolveDocumentationChipStyles({
            selected,
            readOnly: Boolean(readOnly),
            tone: resolved.tone,
          });

          return (
            <button
              key={chip.labelKey}
              type="button"
              disabled={readOnly}
              aria-pressed={selected}
              onClick={() => onClick(chip)}
              style={{
                ...chipStyle,
                background: toneStyles.background,
                borderColor: toneStyles.borderColor,
                color: toneStyles.color,
                borderWidth: selected ? 2 : 1,
                cursor: readOnly ? "not-allowed" : "pointer",
              }}
            >
              {selected ? "✓ " : ""}
              {t(chip.labelKey)}
            </button>
          );
        })}
      </div>
    );
  };
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
        {chipRow(chips, (chip) => toggleField(chip.field, chip.fragmentKey), {
          getFieldText: (chip) => String(value[(chip as TemplateFieldChip).field] ?? ""),
        })}
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
            {chipRow(group.chips, (chip) => toggleExam(group.sectionId, chip.fragmentKey), {
              tone: "green",
              fieldText: value.physicalExam[group.sectionId],
            })}
          </ChipGroupView>
        ))}
      </div>
    );
  };
  const templateGuidanceChips = (
    template: ProviderDocumentationTemplateDefinition | null,
    guidanceKey: keyof ProviderDocumentationTemplateGuidance,
    field: ProviderDocumentationTemplateStringField,
    titleKey: string
  ) => {
    if (!template?.guidance?.[guidanceKey]?.length) return null;
    const chips = template.guidance[guidanceKey]!.map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey }));
    return (
      <ChipGroupView title={t(titleKey)}>
        {chipRow(chips, (chip) => toggleField(field, chip.fragmentKey), { fieldText: String(value[field] ?? "") })}
      </ChipGroupView>
    );
  };
  const templatePromptReminders = (template: ProviderDocumentationTemplateDefinition | null) => {
    if (!template?.promptReminderKeys?.length) return null;
    return (
      <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fcd34d" }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
          {t("providerDocumentationWorkspace.activeTemplatePromptReminders")}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#78350f", lineHeight: 1.45 }}>
          {template.promptReminderKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    );
  };
  const templateReassessmentGuidanceChips = (template: ProviderDocumentationTemplateDefinition | null) => {
    if (!template?.guidance?.reassessment?.length) return null;
    const chips = template.guidance.reassessment.map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey }));
    return (
      <ChipGroupView title={t("providerDocumentationWorkspace.activeTemplateSmartSentences")}>
        {chipRow(chips, (chip) => toggleExam("reassessment", chip.fragmentKey), {
          tone: "green",
          fieldText: value.physicalExam.reassessment,
        })}
      </ChipGroupView>
    );
  };
  const complaintIntelligenceFieldChips = (
    template: ProviderDocumentationTemplateDefinition | null,
    field:
      | "hpi"
      | "rosImportantPositives"
      | "rosImportantNegatives"
      | "rosRedFlags"
      | "mdmWorkingAssessment"
      | "mdmDifferentialSynthesis"
      | "mdmDataReviewed"
      | "mdmClinicalRationale"
      | "mdmPlanSummary"
      | "mdmImmediateActionsRationale"
      | "mdmAdmitObserveDischarge",
    titleKey: string
  ) => {
    const keys = template?.complaintIntelligence?.[field];
    if (!keys?.length) return null;
    const chips = keys.map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey }));
    return (
      <ChipGroupView title={t(titleKey)}>
        {chipRow(chips, (chip) => toggleField(field, chip.fragmentKey), { fieldText: String(value[field] ?? "") })}
      </ChipGroupView>
    );
  };
  const complaintIntelligenceExamChips = (template: ProviderDocumentationTemplateDefinition | null) => {
    const exam = template?.complaintIntelligence?.physicalExam;
    if (!exam) return null;
    const groups = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS.map((sectionId) => ({
      sectionId,
      chips: (exam[sectionId] ?? []).map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey })),
    })).filter((group) => group.chips.length > 0);
    if (!groups.length) return null;
    return (
      <div style={{ marginBottom: 10 }}>
        {groups.map((group) => (
          <ChipGroupView key={group.sectionId} title={t(examTitleKeyBySection[group.sectionId])}>
            {chipRow(group.chips, (chip) => toggleExam(group.sectionId, chip.fragmentKey), {
              tone: "green",
              fieldText: value.physicalExam[group.sectionId],
            })}
          </ChipGroupView>
        ))}
      </div>
    );
  };
  const complaintIntelligenceReassessmentChips = (template: ProviderDocumentationTemplateDefinition | null) => {
    const keys = template?.complaintIntelligence?.reassessment;
    if (!keys?.length) return null;
    const chips = keys.map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey }));
    return (
      <ChipGroupView title={t("providerDocumentationWorkspace.complaintIntelSectionReassessment")}>
        {chipRow(chips, (chip) => toggleExam("reassessment", chip.fragmentKey), {
          tone: "green",
          fieldText: value.physicalExam.reassessment,
        })}
      </ChipGroupView>
    );
  };
  const complaintIntelligenceDispositionChips = (template: ProviderDocumentationTemplateDefinition | null) => {
    const keys = template?.complaintIntelligence?.followUpDisposition;
    if (!keys?.length) return null;
    const chips = keys.map((fragmentKey) => ({ labelKey: fragmentKey, fragmentKey }));
    return (
      <ChipGroupView title={t("providerDocumentationWorkspace.complaintIntelSectionDisposition")}>
        {chipRow(chips, (chip) => toggleField("followUpDisposition", chip.fragmentKey), {
          fieldText: value.followUpDisposition,
        })}
      </ChipGroupView>
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
            <button type="button" disabled={readOnly || saving} onClick={() => void runManualSave()} style={primaryButton(readOnly || saving)}>
              {saving ? t("providerDocumentationWorkspace.saving") : t("providerDocumentationWorkspace.save")}
            </button>
            {onSign ? (
              <button
                type="button"
                disabled={readOnly || signing || !canSubmitSignature}
                onClick={handleSignClick}
                style={primaryButton(readOnly || signing || !canSubmitSignature)}
              >
                {signing ? t("providerDocumentationWorkspace.signing") : t("providerDocumentationWorkspace.signFinalize")}
              </button>
            ) : null}
            {qualityGuardrails.length > 0 && !signedOrFinalized ? (
              <button
                type="button"
                onClick={() => {
                  setExpandedSections((previous) => {
                    const next = new Set(previous);
                    next.add("actions");
                    return next;
                  });
                  setQualityGuardrailsExpanded(true);
                  if (typeof document !== "undefined") {
                    requestAnimationFrame(() => {
                      document
                        .querySelector('[data-testid="provider-documentation-quality-guardrails"]')
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    });
                  }
                }}
                style={{
                  ...secondaryButton(false),
                  borderColor: "#fdba74",
                  color: "#c2410c",
                  background: "#fff7ed",
                }}
              >
                {t("providerDocumentationQualityGuardrails.panelTitle")} ({qualityGuardrails.length})
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
        <p style={{ margin: "10px 0 0", fontSize: 11, color: autosaveStatus === "failed" ? "#b91c1c" : autosaveStatus === "unsaved" ? "#92400e" : "#64748b", lineHeight: 1.45 }}>
          {t(autosaveStatusLabelKey(autosaveStatus))}
          {autosaveSavedAt ? ` · ${new Date(autosaveSavedAt).toLocaleTimeString()}` : ""}
          {draftRestoredAt ? ` · ${t("providerDocumentationWorkspace.draftRestored")}` : ""}
        </p>
        {signedMetadata ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#166534", lineHeight: 1.45, fontWeight: 700 }}>
            {t("providerDocumentationWorkspace.signedBy")} {signedMetadata.signedBy} · {signedMetadata.signedAt}
          </p>
        ) : null}
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          <strong>{t("providerDocumentationWorkspace.dictationReady")}</strong>
          {t("providerDocumentationWorkspace.dictationInstruction")
            ? ` — ${t("providerDocumentationWorkspace.dictationInstruction")}`
            : ""}
          {activeDictationSection ? (
            <>
              {" · "}
              {t("providerDocumentationWorkspace.dictationActiveSection")}{" "}
              {t(
                DICTATION_NAV_TARGETS.find((target) => target.sectionId === activeDictationSection)?.labelKey ??
                  "providerDocumentationWorkspace.dictationReady"
              )}
            </>
          ) : null}
          {t("providerDocumentationWorkspace.dictationDragonHelp")
            ? ` · ${t("providerDocumentationWorkspace.dictationDragonHelp")}`
            : ""}
        </p>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button type="button" onClick={() => focusRelativeDictationTarget(-1)} style={secondaryButton(false)}>
              {t("providerDocumentationWorkspace.dictationPreviousSection")}
            </button>
            <button type="button" onClick={() => focusRelativeDictationTarget(1)} style={secondaryButton(false)}>
              {t("providerDocumentationWorkspace.dictationNextSection")}
            </button>
            {DICTATION_NAV_TARGETS.map((target) => (
              <button key={target.id} type="button" onClick={() => focusDictationSection(target.sectionId)} style={secondaryButton(false)}>
                {t(target.labelKey)}
              </button>
            ))}
        </div>
        {showTemplates ? (
          <div
            data-testid="provider-documentation-template-picker"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#f8fafc",
            }}
          >
            <div
              data-testid="provider-template-picker-columns"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {PROVIDER_DOCUMENTATION_MAJOR_GROUP_KEYS.map((majorGroup) => {
                const templates = PROVIDER_DOCUMENTATION_TEMPLATES.filter((template) => template.majorGroup === majorGroup);
                if (!templates.length) return null;
                const accent = TEMPLATE_PICKER_COLUMN_ACCENT[majorGroup];
                return (
                  <div
                    key={majorGroup}
                    data-testid={`provider-template-picker-column-${majorGroup.toLowerCase()}`}
                    style={{
                      flex: "1 1 280px",
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                        padding: "5px 10px",
                        borderRadius: 9999,
                        border: `1px solid ${accent.headingBorder}`,
                        background: accent.headingBg,
                        color: accent.headingColor,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {t(PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS[majorGroup])}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {templates.map((template) => {
                        const isActive = value.activeTemplateId === template.id;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            disabled={readOnly}
                            onClick={() => applyTemplate(template.id)}
                            title={t(template.helperKey)}
                            aria-label={t(template.labelKey)}
                            aria-pressed={isActive}
                            data-testid={`provider-template-picker-item-${template.id}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              width: "100%",
                              padding: "8px 10px",
                              border: isActive ? `1px solid ${accent.activeBorder}` : "1px solid #e2e8f0",
                              borderRadius: 10,
                              background: isActive ? accent.activeBg : "#fff",
                              color: isActive ? accent.activeColor : "#0f172a",
                              textAlign: "left",
                              fontSize: 12,
                              fontWeight: isActive ? 700 : 600,
                              cursor: readOnly ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                              lineHeight: 1.35,
                            }}
                          >
                            <span style={{ minWidth: 0 }}>{t(template.labelKey)}</span>
                            <span aria-hidden style={{ color: isActive ? accent.activeColor : "#94a3b8", fontSize: 14, flexShrink: 0 }}>
                              ›
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.templateSafetyComment")}
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <ProviderDocumentationAccordionSection
            sectionId="presentation"
            title={t("providerDocumentationWorkspace.sectionPresentation")}
            summary={accordionSummaries.presentation}
            selectedCount={accordionSelectedCounts.presentation}
            status={sectionStatusById.chiefComplaintHpi}
            expanded={isAccordionExpanded("presentation")}
            onToggle={() => toggleAccordionSection("presentation")}
            t={t}
          >
            <Field
              label={t("providerDocumentationWorkspace.chiefComplaint")}
              voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")}
              dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.chiefComplaint}
              dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")}
              readOnly={readOnly}
              readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}
            >
              {ta("chiefComplaint", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.chiefComplaint)}
            </Field>
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="hpi"
            title={t("providerDocumentationWorkspace.sectionHpi")}
            summary={accordionSummaries.hpi}
            selectedCount={accordionSelectedCounts.hpi}
            status={sectionStatusById.chiefComplaintHpi}
            expanded={isAccordionExpanded("hpi")}
            onToggle={() => toggleAccordionSection("hpi")}
            t={t}
          >
            <Field
              label={t("providerDocumentationWorkspace.hpi")}
              voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")}
              dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.hpi}
              dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")}
              readOnly={readOnly}
              readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}
            >
              {ta("hpi", 4, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.hpi)}
            </Field>
            {templateTextChips(activeTemplate, ["hpi"], "providerDocumentationWorkspace.activeTemplateHpi")}
            {complaintIntelligenceFieldChips(activeTemplate, "hpi", "providerDocumentationWorkspace.complaintIntelSectionHpi")}
            {hpiChipGroups.map((group) => (
              <ChipGroupView key={group.titleKey} title={t(group.titleKey)}>
                {chipRow(group.chips, (chip) => toggleField(group.field, chip.fragmentKey), {
                  fieldText: value.hpi,
                })}
              </ChipGroupView>
            ))}
            {encounterMode === "OBSERVATION" ? (
              <ChipGroupView title={t("providerDocumentationWorkspace.observationChips")}>
                {chipRow(OBSERVATION_CHIPS, (chip) => toggleField("hpi", chip.fragmentKey), {
                  tone: "green",
                  fieldText: value.hpi,
                })}
              </ChipGroupView>
            ) : null}
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="ros"
            title={t("providerDocumentationWorkspace.sectionRos")}
            summary={accordionSummaries.ros}
            selectedCount={accordionSelectedCounts.ros}
            status={sectionStatusById.ros}
            expanded={isAccordionExpanded("ros")}
            onToggle={() => toggleAccordionSection("ros")}
            t={t}
          >
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
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#92400e", lineHeight: 1.45, fontWeight: 600 }}>
                {t("providerDocumentationWorkspace.completeNormalRosHelp")}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.focusedImpression")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosFocusedImpression} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("rosFocusedImpression", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosFocusedImpression)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantPositives")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosImportantPositives} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("rosImportantPositives", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosImportantPositives)}</Field>
              <Field label={t("providerDocumentationWorkspace.importantNegatives")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosImportantNegatives} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("rosImportantNegatives", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosImportantNegatives)}</Field>
              <Field label={t("providerDocumentationWorkspace.redFlags")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosRedFlags} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("rosRedFlags", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.rosRedFlags)}</Field>
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
                {chipRow(group.chips, (chip) => toggleField(group.field, chip.fragmentKey), {
                  tone: group.field === "rosImportantNegatives" ? "warn" : undefined,
                  fieldText: String(value[group.field] ?? ""),
                })}
              </ChipGroupView>
            ))}
            {complaintIntelligenceFieldChips(activeTemplate, "rosImportantPositives", "providerDocumentationWorkspace.complaintIntelSectionRosPositives")}
            {complaintIntelligenceFieldChips(activeTemplate, "rosImportantNegatives", "providerDocumentationWorkspace.complaintIntelSectionRosNegatives")}
            {complaintIntelligenceFieldChips(activeTemplate, "rosRedFlags", "providerDocumentationWorkspace.complaintIntelSectionRosRedFlags")}
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="physicalExam"
            title={t("providerDocumentationWorkspace.sectionExam")}
            summary={accordionSummaries.physicalExam}
            selectedCount={accordionSelectedCounts.physicalExam}
            status={sectionStatusById.physicalExam}
            expanded={isAccordionExpanded("physicalExam")}
            onToggle={() => toggleAccordionSection("physicalExam")}
            t={t}
          >
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                disabled={readOnly}
                onClick={applyCompleteNormalExam}
                style={{
                  ...chipStyle,
                  background: readOnly ? "#f1f5f9" : "#f0fdf4",
                  borderColor: readOnly ? "#e2e8f0" : "#86efac",
                  color: readOnly ? "#94a3b8" : "#166534",
                  cursor: readOnly ? "not-allowed" : "pointer",
                }}
              >
                {t("providerDocumentationWorkspace.insertCompleteNormalExam")}
              </button>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#166534", lineHeight: 1.45, fontWeight: 600 }}>
                {t("providerDocumentationWorkspace.completeNormalExamHelp")}
              </p>
            </div>
            {templateExamChips(activeTemplate)}
            {EXAM_CHIPS.map((group) => (
              <ProviderDocumentationChipPanel
                key={group.sectionId}
                title={t(group.titleKey)}
                selectedCount={value.physicalExam[group.sectionId].trim() ? 1 : 0}
                tone="green"
              >
                <Field
                  label={t(group.titleKey)}
                  voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")}
                  dictationTargetId={examDictationIdBySection[group.sectionId]}
                  dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")}
                  readOnly={readOnly}
                  readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}
                >
                  <textarea
                    id={examDictationIdBySection[group.sectionId]}
                    data-dictation-ready="true"
                    value={value.physicalExam[group.sectionId]}
                    disabled={readOnly}
                    onFocus={() => markActiveDictationTarget(examDictationIdBySection[group.sectionId])}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        physicalExam: { ...value.physicalExam, [group.sectionId]: e.target.value },
                      })
                    }
                    rows={2}
                    style={{
                      ...inputBase,
                      resize: "vertical",
                      background: readOnly
                        ? "#f8fafc"
                        : highlightedDictationTargetId === examDictationIdBySection[group.sectionId]
                          ? "#fefce8"
                          : "#fff",
                      boxShadow:
                        highlightedDictationTargetId === examDictationIdBySection[group.sectionId]
                          ? "0 0 0 3px rgba(20, 184, 166, 0.18)"
                          : undefined,
                      transition: "background 160ms ease, box-shadow 160ms ease",
                    }}
                  />
                </Field>
                {chipRow(group.chips, (chip) => toggleExam(group.sectionId, chip.fragmentKey), {
                  tone: "green",
                  fieldText: value.physicalExam[group.sectionId],
                })}
              </ProviderDocumentationChipPanel>
            ))}
            {templateReassessmentGuidanceChips(activeTemplate)}
            {complaintIntelligenceExamChips(activeTemplate)}
            {complaintIntelligenceReassessmentChips(activeTemplate)}
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="mdm"
            title={t("providerDocumentationWorkspace.sectionMdm")}
            summary={accordionSummaries.mdm}
            selectedCount={accordionSelectedCounts.mdm}
            status={sectionStatusById.mdm}
            expanded={isAccordionExpanded("mdm")}
            onToggle={() => toggleAccordionSection("mdm")}
            t={t}
          >
            {templatePromptReminders(activeTemplate)}
            {templateGuidanceChips(
              activeTemplate,
              "mdmClinicalRationale",
              "mdmClinicalRationale",
              "providerDocumentationWorkspace.activeTemplateMdmGuidance"
            )}
            {templateGuidanceChips(
              activeTemplate,
              "mdmDifferentialSynthesis",
              "mdmDifferentialSynthesis",
              "providerDocumentationWorkspace.activeTemplateGuidance"
            )}
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
                {chipRow(group.chips, (chip) => toggleField(group.field, chip.fragmentKey), {
                  fieldText: String(value[group.field] ?? ""),
                })}
              </ChipGroupView>
            ))}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmWorkingAssessment", "providerDocumentationWorkspace.complaintIntelSectionMdmAssessment")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmDifferentialSynthesis", "providerDocumentationWorkspace.complaintIntelSectionDifferential")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmDataReviewed", "providerDocumentationWorkspace.complaintIntelSectionMdmData")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmClinicalRationale", "providerDocumentationWorkspace.complaintIntelSectionMdmRationale")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmPlanSummary", "providerDocumentationWorkspace.complaintIntelSectionMdmPlan")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmImmediateActionsRationale", "providerDocumentationWorkspace.complaintIntelSectionMdmActions")}
            {complaintIntelligenceFieldChips(activeTemplate, "mdmAdmitObserveDischarge", "providerDocumentationWorkspace.complaintIntelSectionMdmDisposition")}
            {dynamicClusters.length > 0 ? (
              <ProviderDocumentationChipPanel title={t("providerDocumentationWorkspace.dynamicClustersTitle")}>
                {dynamicClusters.map((cluster) => {
                  const collapsed = collapsedClusterIds.has(cluster.id);
                  const severityStyles =
                    cluster.severity === "high"
                      ? { background: "#ffedd5", color: "#c2410c", borderColor: "#fdba74" }
                      : cluster.severity === "moderate"
                        ? { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }
                        : { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
                  return (
                    <div
                      key={cluster.id}
                      style={{
                        marginBottom: 8,
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: 8,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{t(cluster.titleKey)}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              border: "1px solid",
                              ...severityStyles,
                            }}
                          >
                            {t(DYNAMIC_CLUSTER_SEVERITY_TITLE_KEYS[cluster.severity])}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedClusterIds((previous) => {
                              const next = new Set(previous);
                              if (next.has(cluster.id)) next.delete(cluster.id);
                              else next.add(cluster.id);
                              return next;
                            })
                          }
                          style={{
                            ...chipStyle,
                            fontSize: 10,
                            padding: "2px 8px",
                            background: "#fff",
                            borderColor: "#cbd5e1",
                            color: "#475569",
                          }}
                        >
                          {collapsed
                            ? t("providerDocumentationWorkspace.dynamicClustersExpand")
                            : t("providerDocumentationWorkspace.dynamicClustersCollapse")}
                        </button>
                      </div>
                      {!collapsed ? (
                        <>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, marginBottom: 2 }}>
                            {t("providerDocumentationWorkspace.dynamicClustersMatchedBecause")}
                          </div>
                          <ul style={{ margin: "0 0 8px", paddingLeft: 16, fontSize: 11, color: "#475569" }}>
                            {cluster.matchedTriggerReasonKeys.map((reasonKey) => (
                              <li key={reasonKey}>{t(reasonKey)}</li>
                            ))}
                          </ul>
                          {DYNAMIC_SUGGESTION_CATEGORY_ORDER.map((category) => {
                            const items = cluster.suggestions.filter((suggestion) => suggestion.category === category);
                            if (items.length === 0) return null;
                            return (
                              <div key={`${cluster.id}-${category}`} style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                                  {t(DYNAMIC_SUGGESTION_CATEGORY_TITLE_KEYS[category])}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {items.map((suggestion) => {
                                    const fieldValue = String(value[suggestion.targetField] ?? "");
                                    const fragment = t(suggestion.fragmentKey);
                                    const selected = isDocumentationChipSelected(fieldValue, fragment);
                                    const toneStyles = resolveDocumentationChipStyles({
                                      selected,
                                      readOnly: Boolean(readOnly),
                                    });
                                    return (
                                      <button
                                        key={suggestion.fragmentKey}
                                        type="button"
                                        disabled={readOnly}
                                        aria-pressed={selected}
                                        onClick={() => toggleField(suggestion.targetField, suggestion.fragmentKey)}
                                        style={{
                                          ...chipStyle,
                                          background: toneStyles.background,
                                          borderColor: toneStyles.borderColor,
                                          color: toneStyles.color,
                                          borderWidth: selected ? 2 : 1,
                                          cursor: readOnly ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        {selected ? "✓ " : ""}
                                        {t(suggestion.labelKey)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </ProviderDocumentationChipPanel>
            ) : null}
            {dynamicSuggestions.length > 0 ? (
              <ProviderDocumentationChipPanel title={t("providerDocumentationWorkspace.dynamicSuggestionsTitle")}>
                {DYNAMIC_SUGGESTION_CATEGORY_ORDER.map((category) => {
                  const items = dynamicSuggestions.filter((suggestion) => suggestion.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                        {t(DYNAMIC_SUGGESTION_CATEGORY_TITLE_KEYS[category])}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {items.map((suggestion) => {
                          const fieldValue = String(value[suggestion.targetField] ?? "");
                          const fragment = t(suggestion.fragmentKey);
                          const selected = isDocumentationChipSelected(fieldValue, fragment);
                          const toneStyles = resolveDocumentationChipStyles({
                            selected,
                            readOnly: Boolean(readOnly),
                          });
                          return (
                            <div key={suggestion.fragmentKey}>
                              <button
                                type="button"
                                disabled={readOnly}
                                aria-pressed={selected}
                                onClick={() => toggleField(suggestion.targetField, suggestion.fragmentKey)}
                                style={{
                                  ...chipStyle,
                                  background: toneStyles.background,
                                  borderColor: toneStyles.borderColor,
                                  color: toneStyles.color,
                                  borderWidth: selected ? 2 : 1,
                                  cursor: readOnly ? "not-allowed" : "pointer",
                                }}
                              >
                                {selected ? "✓ " : ""}
                                {t(suggestion.labelKey)}
                              </button>
                              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, marginLeft: 2 }}>
                                {t("providerDocumentationWorkspace.dynamicSuggestionReasonPrefix")}{" "}
                                {t(suggestion.reasonKey)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </ProviderDocumentationChipPanel>
            ) : null}
            <p style={{ margin: "8px 0", fontSize: 11, color: "#64748b" }}>
              {t("providerDocumentationWorkspace.chipsSafetyComment")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.workingAssessment")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmWorkingAssessment} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmWorkingAssessment", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmWorkingAssessment)}</Field>
              <Field label={t("providerDocumentationWorkspace.differential")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmDifferentialSynthesis} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmDifferentialSynthesis", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmDifferentialSynthesis)}</Field>
              <Field label={t("providerDocumentationWorkspace.dataReviewed")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmDataReviewed} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmDataReviewed", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmDataReviewed)}</Field>
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
              <Field label={t("providerDocumentationWorkspace.clinicalRationale")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmClinicalRationale} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmClinicalRationale", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmClinicalRationale)}</Field>
              <Field label={t("providerDocumentationWorkspace.planSummary")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmPlanSummary} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmPlanSummary", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmPlanSummary)}</Field>
              <Field label={t("providerDocumentationWorkspace.immediateActions")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmImmediateActionsRationale} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmImmediateActionsRationale", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmImmediateActionsRationale)}</Field>
              <Field label={t("providerDocumentationWorkspace.consults")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmConsultsDiscussed} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmConsultsDiscussed", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmConsultsDiscussed)}</Field>
              <Field label={t("providerDocumentationWorkspace.admitObserveDischarge")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmAdmitObserveDischarge} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("mdmAdmitObserveDischarge", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.mdmAdmitObserveDischarge)}</Field>
            </div>
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="impressionPlan"
            title={t("providerDocumentationWorkspace.sectionPlan")}
            summary={accordionSummaries.impressionPlan}
            selectedCount={accordionSelectedCounts.impressionPlan}
            status={sectionStatusById.plan}
            expanded={isAccordionExpanded("impressionPlan")}
            onToggle={() => toggleAccordionSection("impressionPlan")}
            t={t}
          >
            {templateGuidanceChips(
              activeTemplate,
              "followUpDisposition",
              "followUpDisposition",
              "providerDocumentationWorkspace.activeTemplateSmartSentences"
            )}
            {templateGuidanceChips(
              activeTemplate,
              "providerAddendum",
              "providerAddendum",
              "providerDocumentationWorkspace.activeTemplateSmartSentences"
            )}
            {complaintIntelligenceDispositionChips(activeTemplate)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <Field label={t("providerDocumentationWorkspace.clinicalImpression")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.clinicalImpression} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("clinicalImpression", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.clinicalImpression)}</Field>
              <Field label={t("providerDocumentationWorkspace.treatmentPlan")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.treatmentPlan} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("treatmentPlan", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.treatmentPlan)}</Field>
              <Field label={t("providerDocumentationWorkspace.followUpDisposition")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.followUpDisposition} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("followUpDisposition", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.followUpDisposition)}</Field>
              <Field label={t("providerDocumentationWorkspace.providerAddendum")} voiceReadyLabel={t("providerDocumentationWorkspace.voiceReadyField")} dictationTargetId={PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.providerAddendum} dictationLabel={t("providerDocumentationWorkspace.dictationFocusField")} readOnly={readOnly} readOnlyLabel={t("providerDocumentationWorkspace.dictationReadOnlyField")}>{ta("providerAddendum", 2, PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.providerAddendum)}</Field>
            </div>
          </ProviderDocumentationAccordionSection>

          <ProviderDocumentationAccordionSection
            sectionId="actions"
            title={t("providerDocumentationWorkspace.finalActions")}
            summary={
              signedOrFinalized
                ? t("providerDocumentationWorkspace.signedStatus")
                : signReadiness.readyToSign
                  ? t("providerDocumentationWorkspace.readyToSign")
                  : t("providerDocumentationWorkspace.notReadyToSign")
            }
            selectedCount={accordionSelectedCounts.actions}
            expanded={isAccordionExpanded("actions")}
            onToggle={() => toggleAccordionSection("actions")}
            t={t}
          >
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("providerDocumentationWorkspace.signSafetyHelp")}
            </p>
            {renderDocumentationReadinessPanel()}
            {renderQualityGuardrailsPanel()}
            {qualityGuardrails.length > 0 && !signedOrFinalized ? (
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
                {t("providerDocumentationQualityGuardrails.signReviewHint")}
              </p>
            ) : null}
            {onSign && !signReadiness.readyToSign && !signedOrFinalized ? (
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#92400e", lineHeight: 1.45 }}>
                {t("providerDocumentationWorkspace.signWarningsAdvisory")}
              </p>
            ) : null}
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: signReadiness.readyToSign || signedOrFinalized ? "#166534" : "#92400e" }}>
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
            {onSign && !signedOrFinalized ? (
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
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
              <p style={{ margin: 0, fontSize: 12, color: "#166534", lineHeight: 1.45, fontWeight: 700 }}>
                {t("providerDocumentationWorkspace.signedBy")} {signedMetadata.signedBy} · {signedMetadata.signedAt}
              </p>
            ) : null}
          </ProviderDocumentationAccordionSection>
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
            <p style={{ margin: "6px 0 0", fontSize: 11, color: autosaveStatus === "failed" ? "#b91c1c" : "#64748b", lineHeight: 1.45 }}>
              {t(autosaveStatusLabelKey(autosaveStatus))}
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
    </div>
  );
}

function Field({
  label,
  dictationTargetId,
  dictationLabel,
  readOnly = false,
  readOnlyLabel,
  children,
}: {
  label: string;
  voiceReadyLabel?: string;
  dictationTargetId?: string;
  dictationLabel?: string;
  readOnly?: boolean;
  readOnlyLabel?: string;
  children: React.ReactNode;
}) {
  const focusDictationField = () => {
    if (!dictationTargetId || typeof document === "undefined") return;
    const el = document.getElementById(dictationTargetId) as HTMLTextAreaElement | null;
    if (!el || el.disabled) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    el.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.18)";
    el.style.background = "#fefce8";
    window.setTimeout(() => {
      el.style.boxShadow = "";
      el.style.background = "";
    }, 1200);
  };
  const microphoneTitle = readOnly ? readOnlyLabel : dictationLabel;
  return (
    <div style={{ display: "block" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
        {dictationTargetId ? (
          <button
            type="button"
            disabled={readOnly}
            title={microphoneTitle}
            aria-label={microphoneTitle}
            onClick={focusDictationField}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 9999,
              border: "1px solid #cbd5e1",
              background: readOnly ? "#f1f5f9" : "#fff",
              color: readOnly ? "#94a3b8" : "#0f766e",
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
          >
            <MicrophoneGlyph />
          </button>
        ) : null}
      </span>
      {children}
    </div>
  );
}

function MicrophoneGlyph() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 10.25c1.2 0 2.1-.9 2.1-2.1V3.6c0-1.2-.9-2.1-2.1-2.1s-2.1.9-2.1 2.1v4.55c0 1.2.9 2.1 2.1 2.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.75 7.75a4.25 4.25 0 0 0 8.5 0M8 12v2.5M5.75 14.5h4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChipGroupView({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ProviderDocumentationChipPanel title={title}>
      {children}
    </ProviderDocumentationChipPanel>
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

function autosaveStatusLabelKey(status: ProviderDocumentationAutosaveStatus): string {
  return `providerDocumentationWorkspace.autosave${status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")}`;
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

