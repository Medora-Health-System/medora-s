"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ADMISSION_CONDITION_STATUSES,
  ED_ADMISSION_LEVEL_OF_CARE_OPTIONS,
  HOSPITAL_ADMITTING_SERVICES,
  applyProposalsToFlatFieldsIfEmpty,
  buildSmartAdmissionProposals,
  emptyAdmissionPacketV1,
  inferPlacementEncounterTypeFromCareLevel,
  isDirectAdmissionErrorCode,
  isHospitalAdmittingService,
  isHospitalRequestedLevelOfCare,
  markFieldPhysicianEdited,
  mergeProposalFieldWithoutOverwrite,
  replaceFieldWithUpdatedProposal,
  buildNarrativeFromStructuredPlanItems,
  projectEdDispositionState,
  readAdmissionPacketV1,
  readAmaDispositionV1,
  readDeceasedDispositionV1,
  readEdDispositionDecisionFromNursingAssessment,
  readElopementDispositionV1,
  readLwbsDispositionV1,
  readOtherDispositionV1,
  resolveEdDispositionPath,
  resolveEdDispositionPrintKind,
  shouldUseHomeDischargePrintLayout,
  validateSmartAdmissionServiceLocCompatibility,
  type AdmissionPacketV1,
  type HospitalAdmittingService,
  type HospitalRequestedLevelOfCare,
} from "@medora/shared";
import { buildSmartAdmissionChartContext } from "./smartAdmissionChartContext";
import { ProposalSourcesDisclosure } from "./ProposalSourcesDisclosure";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { hospitalAdmissionReviewPath } from "@/features/hospital-care/hospitalCarePaths";
import { isInternalPlacementWorkflowUiEnabled } from "./AdmissionObservationDecisionBoard";
import { useEncounterDiagnosisRows } from "./useEncounterDiagnosisRows";
import type { EncounterDiagnosisApiRow } from "./encounterClinicalRecordAdapter";
import {
  hydrateDischargeFormFromEncounterJson,
  emptyDischargeForm,
  type DischargeFormState,
} from "@/lib/encounterDischarge";
import {
  admissionFormToPayload,
  hydrateAdmissionFormFromEncounterJson,
  emptyAdmissionForm,
  formatPhysicianName,
  type AdmissionFormState,
} from "@/lib/encounterAdmission";
import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { MedoraCard, MedoraCardActions, MedoraCardIdentity, MedoraCardInner, MedoraCardTitle } from "@/components/medora-card";
import { AdmissionObservationDecisionBoard } from "./AdmissionObservationDecisionBoard";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import {
  buildErDispositionPreviewModel,
  emptyErDispositionSupplementForm,
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  mergeErDischargeForEncounterPatch,
  mergeErDispositionV1IntoNursingAssessment,
  outcomeUiToDischargeMode,
  readDispositionSignatureFromEncounter,
  type ErDispositionDecisionPersist,
  type ErDispositionOutcomeUi,
  type ErDispositionPreviewLabels,
  type ErDispositionSupplementForm,
} from "./emergencyDispositionV1";
import {
  ED_HOSP_1B_PROVIDER_OUTCOMES,
  canonicalEdDispositionEnginePath,
  inferOutcomeHintsFromAdmissionSummary,
  isAdmissionDecisionOutcome,
  isInternalPlacementDestinationLocked,
  isObservationAdmissionDestinationSwitchBlocked,
  legacyCareLevelForOutcomeUi,
  requestedEncounterTypeForOutcomeUi,
} from "./edHosp1bDispositionOutcomeMapping";
import type { InternalPlacementProjectionDto } from "./internalPlacementApi";
import { projectEdDispositionReadiness } from "./edDispositionReadinessProjection";
import {
  ED_DISPOSITION_BOARD_COLORS,
  edBoardCardStyle,
  edReadinessChipStyle,
} from "./edDispositionBoardStyles";
import {
  applyEmtalaV1ComplementToNursingAssessment,
  emptyEmtalaDispositionComplementForm,
  emtalaDispositionComplementFromNursing,
  type EmtalaDispositionComplementForm,
} from "./erEmtalaV1";
import {
  buildProviderDischargeJsonForSave,
  ProviderDischargeDocumentationSection,
  validateProviderDischargeDocumentation,
} from "@/features/emergency/ProviderDischargeDocumentationSection";
import {
  applyProviderDischargeDocumentationToDischargeForm,
  hydrateProviderDischargeDocumentationForm,
  type ProviderDischargeValidationErrors,
} from "@/features/emergency/providerDischargeDocumentationModel";
import { buildProviderDischargeDocumentationPreviewSections } from "@/features/emergency/providerDischargeDocumentationSummary";
import type { PatientSpecificDischargeContext } from "@/features/emergency/providerDischargePatientSpecificAdditions";
import { buildPatientSpecificDischargeContext } from "@/features/emergency/providerDischargePatientSpecificAdditions";
import {
  mergeMedicationNamesForDischargeContext,
  type DischargeMedicationSourceInput,
} from "@/features/emergency/providerDischargeMedicationContext";
import { EdDispositionPreviewPanel } from "@/features/emergency/EdDispositionPreviewPanel";
import {
  AmaDispositionBoard,
  DeceasedDispositionBoard,
  ElopementDispositionBoard,
  GovernedOtherDispositionBoard,
  LwbsDispositionBoard,
} from "@/features/emergency/EdDispositionPathwayBoards";
import {
  emptyAmaDispositionForm,
  emptyDeceasedDispositionForm,
  emptyElopementDispositionForm,
  emptyLwbsDispositionForm,
  emptyOtherDispositionForm,
  mergePathwayBoardsIntoNursingAssessment,
} from "@/features/emergency/edDispositionPathwayPersist";
import {
  edDispositionTouchButtonStyle,
  edDispositionWorkspaceStyle,
  resolveEdDispositionLayoutMode,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";
import { erHandoffV1SatisfiesInpatientTransferConfirm } from "@medora/shared";

type PhysicianLite = { id?: string; firstName?: string | null; lastName?: string | null } | null;

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  createdAt?: string | null;
  version?: number | null;
  patient?: PatientLite | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  updatedAt?: string | null;
  physicianAssigned?: PhysicianLite;
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const PREVIEW_ACCENTS: Record<string, string> = {
  mode: "#64748b",
  discharge: "#475569",
  providerDoc: "#0f766e",
  providerPlanning: "#0369a1",
  providerMeta: "#64748b",
  admission: "#6a1b9a",
  erExtra: "#b45309",
  empty: "#cbd5e1",
};

export function EmergencyDispositionPanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  canPrescribe,
  canEditNursingDischarge,
  canEditMedicalDischarge,
  patientSpecificDischargeContext,
  dischargeMedicationSources,
  facilityName,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  canPrescribe: boolean;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
  patientSpecificDischargeContext?: PatientSpecificDischargeContext;
  /** Optional medication sources (orders, MAR, home meds) for discharge personalization. */
  dischargeMedicationSources?: DischargeMedicationSourceInput;
  facilityName?: string | null;
}) {
  const { t, language } = useI18n();
  const router = useRouter();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const placementWorkflowUiEnabled = isInternalPlacementWorkflowUiEnabled();

  const OUTCOME_OPTIONS = useMemo(
    (): { id: ErDispositionOutcomeUi; label: string }[] =>
      ED_HOSP_1B_PROVIDER_OUTCOMES.map((id) => ({
        id,
        label: t(`emergencyDisposition.outcome${id}` as Parameters<typeof t>[0]),
      })),
    [t]
  );

  const dispositionPreviewLabels = useMemo(
    (): ErDispositionPreviewLabels => ({
      dischargeModeLinePrefix: t("emergencyDisposition.preview.dischargeModeLinePrefix"),
      sectionDecisionShared: t("emergencyDisposition.preview.sectionDecisionShared"),
      sectionDischargeFields: t("emergencyDisposition.preview.sectionDischargeFields"),
      lineDispositionSummary: t("emergencyDisposition.preview.lineDispositionSummary"),
      lineExitCondition: t("emergencyDisposition.preview.lineExitCondition"),
      lineInstructions: t("emergencyDisposition.preview.lineInstructions"),
      lineMedicationsGiven: t("emergencyDisposition.preview.lineMedicationsGiven"),
      lineFollowUp: t("emergencyDisposition.preview.lineFollowUp"),
      lineReturnIfWorse: t("emergencyDisposition.preview.lineReturnIfWorse"),
      linePatientDestination: t("emergencyDisposition.preview.linePatientDestination"),
      sectionAdmission: t("emergencyDisposition.preview.sectionAdmission"),
      lineAdmissionReason: t("emergencyDisposition.preview.lineAdmissionReason"),
      lineServiceUnit: t("emergencyDisposition.preview.lineServiceUnit"),
      lineAdmissionDiagnosis: t("emergencyDisposition.preview.lineAdmissionDiagnosis"),
      lineCareLevel: t("emergencyDisposition.preview.lineCareLevel"),
      lineConditionAdmission: t("emergencyDisposition.preview.lineConditionAdmission"),
      lineInitialPlan: t("emergencyDisposition.preview.lineInitialPlan"),
      lineResponsiblePhysician: t("emergencyDisposition.preview.lineResponsiblePhysician"),
      sectionErExtra: t("emergencyDisposition.preview.sectionErExtra"),
      lineTransferNote: t("emergencyDisposition.preview.lineTransferNote"),
      lineAmaRisks: t("emergencyDisposition.preview.lineAmaRisks"),
      lineLwbsDetail: t("emergencyDisposition.preview.lineLwbsDetail"),
      lineDeceasedNote: t("emergencyDisposition.preview.lineDeceasedNote"),
      sectionEmptyTitle: t("emergencyDisposition.preview.sectionEmptyTitle"),
      sectionEmptyLine: t("emergencyDisposition.preview.sectionEmptyLine"),
      headlinePrefix: t("emergencyDisposition.preview.headlinePrefix"),
    }),
    [t]
  );

  const [dischargeForm, setDischargeForm] = useState<DischargeFormState>(() => emptyDischargeForm());
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [supplementForm, setSupplementForm] = useState<ErDispositionSupplementForm>(() =>
    emptyErDispositionSupplementForm()
  );
  const [emtalaComplement, setEmtalaComplement] = useState<EmtalaDispositionComplementForm>(() =>
    emptyEmtalaDispositionComplementForm()
  );
  const [outcomeUi, setOutcomeUi] = useState<ErDispositionOutcomeUi>("HOME");
  const [activePlacement, setActivePlacement] = useState<InternalPlacementProjectionDto | null>(null);
  const [providerDischargeDoc, setProviderDischargeDoc] = useState(() =>
    hydrateProviderDischargeDocumentationForm(encounter.dischargeSummaryJson)
  );
  const [providerDischargeValidationErrors, setProviderDischargeValidationErrors] =
    useState<ProviderDischargeValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  /** Cancel-admission modal local state (admission decision is encounter-level, not an order). */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pathwayChangeConfirm, setPathwayChangeConfirm] = useState<ErDispositionOutcomeUi | null>(
    null
  );
  const [pathwayChangeReason, setPathwayChangeReason] = useState("");
  const [amaBoard, setAmaBoard] = useState(emptyAmaDispositionForm);
  const [lwbsBoard, setLwbsBoard] = useState(emptyLwbsDispositionForm);
  const [elopementBoard, setElopementBoard] = useState(emptyElopementDispositionForm);
  const [deceasedBoard, setDeceasedBoard] = useState(emptyDeceasedDispositionForm);
  const [otherBoard, setOtherBoard] = useState(emptyOtherDispositionForm);
  const [primaryDiagnosisId, setPrimaryDiagnosisId] = useState<string>("");
  const [secondaryDiagnosisIds, setSecondaryDiagnosisIds] = useState<string[]>([]);
  const [admissionPacket, setAdmissionPacket] = useState<AdmissionPacketV1>(() =>
    emptyAdmissionPacketV1()
  );
  const [serviceOtherClarification, setServiceOtherClarification] = useState("");
  const [locOtherClarification, setLocOtherClarification] = useState("");
  const [conditionStatus, setConditionStatus] = useState<string>("");
  const [proposalsApplied, setProposalsApplied] = useState(false);
  const encounterDiagnoses = useEncounterDiagnosisRows({
    encounterId,
    patientId: encounter.patient?.id,
    facilityId,
  });
  const hasSavedAdmission = useMemo(
    () => parseAdmissionSummaryForChart(encounter.admissionSummaryJson) != null,
    [encounter.admissionSummaryJson]
  );
  useEffect(() => {
    const raw = encounter.admissionSummaryJson;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const dx = (raw as { admissionDiagnosesV1?: unknown }).admissionDiagnosesV1;
    if (!dx || typeof dx !== "object" || Array.isArray(dx)) return;
    const obj = dx as {
      primaryDiagnosisId?: string | null;
      secondaryDiagnosisIds?: string[];
    };
    if (obj.primaryDiagnosisId) setPrimaryDiagnosisId(obj.primaryDiagnosisId);
    if (Array.isArray(obj.secondaryDiagnosisIds)) {
      setSecondaryDiagnosisIds(
        obj.secondaryDiagnosisIds.filter((id) => id && id !== obj.primaryDiagnosisId)
      );
    }
  }, [encounter.admissionSummaryJson]);

  const formatDxRow = useCallback((row: EncounterDiagnosisApiRow) => {
    const code = String(row.code ?? "").trim();
    const system = String(row.diagnosisType ?? "ICD-10").trim() || "ICD-10";
    const desc = String(row.description ?? "").trim();
    return [code && `${system} ${code}`, desc].filter(Boolean).join(" — ") || desc || code || row.id;
  }, []);

  useEffect(() => {
    const packet = readAdmissionPacketV1(encounter.admissionSummaryJson);
    setAdmissionPacket(packet);
    setServiceOtherClarification(packet.admittingServiceOtherClarification ?? "");
    setLocOtherClarification(packet.levelOfCareOtherClarification ?? "");
    setConditionStatus(packet.conditionStatus ?? "");
    if (packet.admittingServiceCode) {
      setAdmissionForm((prev) =>
        prev.serviceUnit ? prev : { ...prev, serviceUnit: packet.admittingServiceCode ?? "" }
      );
    }
    if (packet.levelOfCareCode) {
      setAdmissionForm((prev) =>
        prev.careLevel ? prev : { ...prev, careLevel: packet.levelOfCareCode ?? "" }
      );
    }
  }, [encounter.admissionSummaryJson]);

  const [newerProposalAvailable, setNewerProposalAvailable] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<AdmissionPacketV1 | null>(null);

  // Apply smart proposals once when admission fields are empty (documented sources only).
  // Never overwrite PHYSICIAN_EDITED — surface newer proposal availability instead.
  useEffect(() => {
    if ((outcomeUi !== "ADMISSION" && outcomeUi !== "OBSERVATION") || !canPrescribe) return;
    const primaryRow = encounterDiagnoses.find((d) => d.id === primaryDiagnosisId);
    const secondaryRows = encounterDiagnoses.filter((d) => secondaryDiagnosisIds.includes(d.id));
    const ctx = buildSmartAdmissionChartContext({
      encounter,
      primaryDiagnosisDisplay: primaryRow ? formatDxRow(primaryRow) : null,
      secondaryDiagnosisDisplays: secondaryRows.map(formatDxRow),
    });
    const proposed = buildSmartAdmissionProposals(ctx);
    if (!proposed.fields.admissionReason && !proposed.fields.initialPlan) {
      setProposalsApplied(true);
      return;
    }
    if (!proposalsApplied) {
      if (admissionForm.admissionReason.trim() || admissionForm.initialPlan.trim()) {
        const reasonMerge = mergeProposalFieldWithoutOverwrite(
          admissionPacket.fields.admissionReason,
          proposed.fields.admissionReason
        );
        if (reasonMerge.newerProposalAvailable) {
          setNewerProposalAvailable(true);
          setPendingProposal(proposed);
        }
        setProposalsApplied(true);
        return;
      }
      setAdmissionPacket(proposed);
      const flat = applyProposalsToFlatFieldsIfEmpty(admissionForm, proposed);
      setAdmissionForm((prev) => ({ ...prev, ...flat }));
      if (proposed.admittingServiceCode) {
        setAdmissionForm((prev) => ({ ...prev, serviceUnit: proposed.admittingServiceCode ?? "" }));
      }
      if (proposed.levelOfCareCode) {
        setAdmissionForm((prev) => ({ ...prev, careLevel: proposed.levelOfCareCode ?? "" }));
      }
      setProposalsApplied(true);
      return;
    }
    const reasonMerge = mergeProposalFieldWithoutOverwrite(
      admissionPacket.fields.admissionReason,
      proposed.fields.admissionReason
    );
    if (reasonMerge.newerProposalAvailable) {
      setNewerProposalAvailable(true);
      setPendingProposal(proposed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- proposal refresh without overwrite
  }, [outcomeUi, canPrescribe, encounterDiagnoses, primaryDiagnosisId, formatDxRow]);

  const dispositionState = useMemo(
    () =>
      projectEdDispositionState({
        status: encounter.status ?? "OPEN",
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
      }),
    [
      encounter.status,
      encounter.dischargeSummaryJson,
      encounter.admissionSummaryJson,
      encounter.nursingAssessment,
    ]
  );

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const hydrateAll = useCallback(() => {
    const d = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
    const sup = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
    const defPhys = formatPhysicianName(encounter.physicianAssigned ?? undefined);
    const a = hydrateAdmissionFormFromEncounterJson(encounter.admissionSummaryJson, defPhys);
    const inferred = inferOutcomeUiFromForms(
      d.dischargeMode,
      sup,
      inferOutcomeHintsFromAdmissionSummary(encounter.admissionSummaryJson)
    );
    // Align dischargeMode with inferred outcome when JSON has no mode yet (e.g. new encounter).
    // Otherwise the radio shows HOME but form.dischargeMode stays "", and PATCH omits dischargeSummaryJson.dischargeMode
    // — the ER board badge reads dischargeMode from dischargeSummaryJson only.
    const dischargeModeSynced =
      d.dischargeMode.trim().length > 0 ? d.dischargeMode : outcomeUiToDischargeMode(inferred);
    setDischargeForm({ ...d, dischargeMode: dischargeModeSynced });
    setProviderDischargeDoc(hydrateProviderDischargeDocumentationForm(encounter.dischargeSummaryJson));
    setAmaBoard(readAmaDispositionV1(encounter.nursingAssessment));
    setLwbsBoard(readLwbsDispositionV1(encounter.nursingAssessment));
    setElopementBoard(readElopementDispositionV1(encounter.nursingAssessment));
    setDeceasedBoard(readDeceasedDispositionV1(encounter.nursingAssessment));
    setOtherBoard(readOtherDispositionV1(encounter.nursingAssessment));
    setAdmissionForm(a);
    setSupplementForm(sup);
    setOutcomeUi(inferred);
    setEmtalaComplement(emtalaDispositionComplementFromNursing(encounter.nursingAssessment));
  }, [
    encounter.dischargeSummaryJson,
    encounter.admissionSummaryJson,
    encounter.nursingAssessment,
    encounter.physicianAssigned,
  ]);

  useEffect(() => {
    hydrateAll();
  }, [hydrateAll, encounter.updatedAt]);

  const applyOutcomeFromUi = useCallback((o: ErDispositionOutcomeUi) => {
    setOutcomeUi(o);
    setDischargeForm((prev) => ({ ...prev, dischargeMode: outcomeUiToDischargeMode(o) }));
    const nextCare = legacyCareLevelForOutcomeUi(o);
    if (nextCare) {
      setAdmissionForm((prev) => ({
        ...prev,
        careLevel: legacyCareLevelForOutcomeUi(o, prev.careLevel) ?? prev.careLevel,
      }));
    }
  }, []);

  const placementDestLocked = isInternalPlacementDestinationLocked(activePlacement?.status);

  const setOutcomeFromUi = (o: ErDispositionOutcomeUi) => {
    if (
      isObservationAdmissionDestinationSwitchBlocked({
        placementStatus: activePlacement?.status,
        placementRequestedEncounterType: activePlacement?.requestedEncounterType,
        nextOutcome: o,
      })
    ) {
      setSaveInfo(t("emergencyDisposition.committedPlacementBlocksTypeSwitch"));
      return;
    }
    if (dispositionState.requiresCorrectionToChangePathway) {
      setPathwayChangeConfirm(o);
      if (o !== outcomeUi) setPathwayChangeReason("");
      return;
    }
    if (o === outcomeUi) return;
    applyOutcomeFromUi(o);
  };

  const [layoutMode, setLayoutMode] = useState<EdDispositionLayoutMode>("desktopSplit");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveEdDispositionLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  const dischargeModeDisplayLabel = useMemo(() => {
    const opt = OUTCOME_OPTIONS.find((o) => o.id === outcomeUi);
    return opt?.label ?? dischargeForm.dischargeMode.trim();
  }, [OUTCOME_OPTIONS, outcomeUi, dischargeForm.dischargeMode]);

  const wiredMedicationNames = useMemo(
    () =>
      mergeMedicationNamesForDischargeContext({
        nursingAssessment: encounter.nursingAssessment,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        providerDischargeForm: providerDischargeDoc,
        ...dischargeMedicationSources,
        explicitMedicationNames: [
          ...(dischargeMedicationSources?.explicitMedicationNames ?? []),
          ...(patientSpecificDischargeContext?.medicationNames ?? []),
        ],
      }),
    [
      dischargeMedicationSources,
      encounter.dischargeSummaryJson,
      encounter.nursingAssessment,
      patientSpecificDischargeContext?.medicationNames,
      providerDischargeDoc,
    ]
  );

  const resolvedPatientDischargeContext = useMemo((): PatientSpecificDischargeContext | undefined => {
    const base = buildPatientSpecificDischargeContext({
      patientDob: encounter.patient?.dob ?? null,
      diagnosisCodes: providerDischargeDoc.diagnosisRefs.map((r) => r.code),
      diagnosisLabels: providerDischargeDoc.diagnosisRefs.map((r) => r.label),
      medicationNames: wiredMedicationNames.length ? wiredMedicationNames : undefined,
      patientAgeYears: patientSpecificDischargeContext?.patientAgeYears,
    });
    if (!patientSpecificDischargeContext) return base;
    return {
      ...base,
      ...patientSpecificDischargeContext,
      diagnosisCodes: [
        ...(base.diagnosisCodes ?? []),
        ...(patientSpecificDischargeContext.diagnosisCodes ?? []),
      ],
      diagnosisLabels: [
        ...(base.diagnosisLabels ?? []),
        ...(patientSpecificDischargeContext.diagnosisLabels ?? []),
      ],
      medicationNames: wiredMedicationNames.length ? wiredMedicationNames : base.medicationNames,
    };
  }, [
    encounter.patient?.dob,
    patientSpecificDischargeContext,
    providerDischargeDoc.diagnosisRefs,
    wiredMedicationNames,
  ]);

  const previewModel = useMemo(() => {
    const base = buildErDispositionPreviewModel(
      dischargeForm,
      admissionForm,
      supplementForm,
      outcomeUi,
      dispositionPreviewLabels,
      dischargeModeDisplayLabel
    );
    const providerSections = buildProviderDischargeDocumentationPreviewSections(
      providerDischargeDoc,
      encounter.dischargeSummaryJson,
      language,
      { patientContext: resolvedPatientDischargeContext }
    );
    if (!providerSections.length) return base;
    const sections = [...base.sections.filter((s) => s.id !== "discharge"), ...providerSections];
    return { ...base, sections };
  }, [
    dischargeForm,
    admissionForm,
    supplementForm,
    outcomeUi,
    dispositionPreviewLabels,
    dischargeModeDisplayLabel,
    providerDischargeDoc,
    encounter.dischargeSummaryJson,
    language,
    patientSpecificDischargeContext,
    resolvedPatientDischargeContext,
  ]);

  const storedSig = useMemo(
    () => readDispositionSignatureFromEncounter(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );

  const handlePrintDischargeSummary = useCallback(() => {
    const p = encounter.patient;
    if (!p || !encounter.createdAt) return;
    const resolvedPath = resolveEdDispositionPath({
      dischargeSummaryJson: encounter.dischargeSummaryJson,
      admissionSummaryJson: encounter.admissionSummaryJson,
      nursingAssessment: encounter.nursingAssessment,
    });
    const pathForPrint =
      resolvedPath !== "NONE" ? resolvedPath : canonicalEdDispositionEnginePath(outcomeUi);
    // D2.5 — Home Discharge print layout is HOME-only.
    if (!shouldUseHomeDischargePrintLayout(pathForPrint)) {
      const kind = resolveEdDispositionPrintKind(pathForPrint);
      window.alert(
        language === "en"
          ? `Print routing: ${kind}. Dedicated pathway print layouts ship with closed-chart archive; Home Discharge layout is not used for this pathway.`
          : `Routage d’impression : ${kind}. Les mises en page dédiées sont fournies via l’archive fermée ; la synthèse domicile n’est pas utilisée pour ce parcours.`
      );
      return;
    }
    printDischarge({
      patient: p,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        physicianAssigned: encounter.physicianAssigned ?? null,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: null,
      language,
      patientSpecificDischargeContext: resolvedPatientDischargeContext,
      dischargeMedicationSources,
    });
  }, [
    dischargeMedicationSources,
    encounter.createdAt,
    encounter.dischargeSummaryJson,
    encounter.admissionSummaryJson,
    encounter.nursingAssessment,
    outcomeUi,
    encounter.patient,
    encounter.physicianAssigned,
    facilityName,
    language,
    resolvedPatientDischargeContext,
  ]);

  const canPrintDischargeSummary = Boolean(encounter.patient && encounter.createdAt);

  const patchDischarge = useCallback((patch: Partial<DischargeFormState>) => {
    setDischargeForm((f) => ({ ...f, ...patch }));
  }, []);

  const onProviderDischargeDocChange = useCallback((next: typeof providerDischargeDoc) => {
    setProviderDischargeDoc(next);
    setProviderDischargeValidationErrors(null);
    setDischargeForm((f) => applyProviderDischargeDocumentationToDischargeForm(f, next));
  }, []);

  const patchAdmission = useCallback((patch: Partial<AdmissionFormState>) => {
    setAdmissionForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchSupplement = useCallback((patch: Partial<ErDispositionSupplementForm>) => {
    setSupplementForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchEmtalaComplement = useCallback((patch: Partial<EmtalaDispositionComplementForm>) => {
    setEmtalaComplement((f) => ({ ...f, ...patch }));
  }, []);

  const handleSave = async (
    mode: "DRAFT" | "SIGN" = "DRAFT",
    outcomeOverride?: ErDispositionOutcomeUi
  ) => {
    if (formDisabled) return;
    if (mode === "SIGN" && !canEditMedicalDischarge && !canPrescribe) {
      setSaveInfo(t("emergencyDisposition.signDecisionUnauthorized"));
      return;
    }

    const effectiveOutcome = outcomeOverride ?? outcomeUi;

    if (
      isObservationAdmissionDestinationSwitchBlocked({
        placementStatus: activePlacement?.status,
        placementRequestedEncounterType: activePlacement?.requestedEncounterType,
        nextOutcome: effectiveOutcome,
      })
    ) {
      setSaveInfo(t("emergencyDisposition.committedPlacementBlocksTypeSwitch"));
      return;
    }

    // D2.5 — Home discharge packet participates in validation/save for HOME only.
    const showProviderDischargeOnSave = effectiveOutcome === "HOME";

    const homeStrict = effectiveOutcome === "HOME" && (mode === "SIGN" || canEditMedicalDischarge);
    if (
      canEditMedicalDischarge &&
      showProviderDischargeOnSave &&
      (providerDischargeDoc.diagnosisRefs.length > 0 || homeStrict)
    ) {
      const validationErrors = validateProviderDischargeDocumentation(
        providerDischargeDoc,
        {
          requiredDescription: t("providerDischargeDocumentation19Y.validation.requiredDescription"),
          requiredInstructions: t("providerDischargeDocumentation19Y.validation.requiredInstructions"),
          requiredMedication: t("providerDischargeDocumentation19Y.validation.requiredMedication"),
          requiredReturnPrecautions: t(
            "providerDischargeDocumentation19Y.validation.requiredReturnPrecautions"
          ),
          requiredFollowUp: t("providerDischargeDocumentation19Y.validation.requiredFollowUp"),
        },
        effectiveOutcome === "HOME"
          ? {
              requireFinalDiagnosis: mode === "SIGN" || providerDischargeDoc.diagnosisRefs.length > 0,
              requireInstructionsCommunicated: mode === "SIGN",
              messages: {
                requiredFinalDiagnosis: t("emergencyDisposition.homeValidation.requiredFinalDiagnosis"),
                requiredInstructionsCommunicated: t(
                  "emergencyDisposition.homeValidation.requiredInstructionsCommunicated"
                ),
              },
            }
          : undefined
      );
      if (validationErrors) {
        setProviderDischargeValidationErrors(validationErrors);
        setSaveInfo(t("providerDischargeDocumentation19Y.validation.saveBlocked"));
        return;
      }
    }
    setProviderDischargeValidationErrors(null);

    setSaving(true);
    setSaveInfo(null);
    try {
      let savedByDisplayName = t("emergencyDisposition.signerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const signature = { savedAt: new Date().toISOString(), savedByDisplayName };
      const priorDecision = readEdDispositionDecisionFromNursingAssessment(encounter.nursingAssessment);
      const priorPath = resolveEdDispositionPath({
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
      });
      const decisionPersist: ErDispositionDecisionPersist = {
        documentationStatus: mode === "SIGN" ? "SIGNED" : "DRAFT",
        revision: priorDecision.revision,
        ...(mode === "SIGN"
          ? { signedAt: signature.savedAt, signedByDisplayName: savedByDisplayName }
          : priorDecision.signedAt
            ? {
                signedAt: priorDecision.signedAt,
                signedByDisplayName: priorDecision.signedByDisplayName ?? undefined,
              }
            : {}),
        ...(priorDecision.previousPath ? { previousPath: priorDecision.previousPath } : {}),
        ...(priorDecision.revisionReason ? { revisionReason: priorDecision.revisionReason } : {}),
      };
      if (
        mode === "DRAFT" &&
        dispositionState.decisionSigned &&
        priorPath !== "NONE" &&
        priorPath !== effectiveOutcome &&
        pathwayChangeReason.trim()
      ) {
        decisionPersist.previousPath = priorPath;
        decisionPersist.revisionReason = pathwayChangeReason.trim().slice(0, 500);
        decisionPersist.revision = priorDecision.revision + 1;
        decisionPersist.documentationStatus = "DRAFT";
      }

      const dischargeFormForSave =
        outcomeOverride != null
          ? { ...dischargeForm, dischargeMode: outcomeUiToDischargeMode(effectiveOutcome) }
          : dischargeForm;

      const mergedDischarge = mergeErDischargeForEncounterPatch(
        encounter.dischargeSummaryJson,
        dischargeFormForSave,
        canEditNursingDischarge,
        canEditMedicalDischarge,
        effectiveOutcome
      );

      const admissionPayload = admissionFormToPayload(admissionForm);

      // Governed writer for admission packet (avoids PATCH role singleton 403 + correlation wipe).
      if (
        isAdmissionDecisionOutcome(effectiveOutcome) &&
        canPrescribe &&
        encounter.status === "OPEN" &&
        Object.keys(admissionPayload).length > 0
      ) {
        if (mode === "SIGN" && !primaryDiagnosisId.trim()) {
          setSaveInfo(t("emergencyDisposition.errors.primaryDiagnosisRequired"));
          setSaving(false);
          return;
        }
        const secondaryIds = secondaryDiagnosisIds.filter((id) => id !== primaryDiagnosisId);
        const primaryRow = encounterDiagnoses.find((d) => d.id === primaryDiagnosisId);
        const secondaryRows = encounterDiagnoses.filter((d) => secondaryIds.includes(d.id));
        const serviceRaw = admissionForm.serviceUnit.trim().toUpperCase();
        const locRaw = admissionForm.careLevel.trim().toUpperCase();
        const serviceCode: HospitalAdmittingService | null | undefined = isHospitalAdmittingService(
          serviceRaw
        )
          ? serviceRaw
          : admissionPacket.admittingServiceCode;
        const locCode: HospitalRequestedLevelOfCare | null | undefined =
          isHospitalRequestedLevelOfCare(locRaw) ? locRaw : admissionPacket.levelOfCareCode;
        const packetToSave: AdmissionPacketV1 = {
          ...admissionPacket,
          version: 1,
          admittingServiceCode: serviceCode ?? null,
          admittingServiceOtherClarification:
            serviceCode === "OTHER" ? serviceOtherClarification.trim() || null : null,
          levelOfCareCode: locCode ?? null,
          levelOfCareOtherClarification:
            locCode === "OTHER" ? locOtherClarification.trim() || null : null,
          conditionStatus: (conditionStatus || null) as AdmissionPacketV1["conditionStatus"],
          fields: {
            ...admissionPacket.fields,
            admissionReason: markFieldPhysicianEdited(
              admissionPacket.fields.admissionReason,
              admissionForm.admissionReason
            ),
            serviceUnit: markFieldPhysicianEdited(
              admissionPacket.fields.serviceUnit,
              admissionForm.serviceUnit
            ),
            careLevel: markFieldPhysicianEdited(
              admissionPacket.fields.careLevel,
              admissionForm.careLevel
            ),
            conditionAtAdmission: markFieldPhysicianEdited(
              admissionPacket.fields.conditionAtAdmission,
              admissionForm.conditionAtAdmission
            ),
            initialPlan: markFieldPhysicianEdited(
              admissionPacket.fields.initialPlan,
              admissionForm.initialPlan
            ),
          },
        };
        const compat = validateSmartAdmissionServiceLocCompatibility({
          admittingServiceCode: packetToSave.admittingServiceCode,
          admittingServiceOtherClarification: packetToSave.admittingServiceOtherClarification,
          levelOfCareCode: packetToSave.levelOfCareCode,
          levelOfCareOtherClarification: packetToSave.levelOfCareOtherClarification,
        });
        if (!compat.ok) {
          setSaveInfo(
            t(`emergencyDisposition.errors.${compat.errors[0]}`) ||
              t("emergencyDisposition.saveFailed")
          );
          setSaving(false);
          return;
        }
        const clientRequestId =
          mode === "SIGN"
            ? `adm-sign-${encounterId}-${typeof encounter.version === "number" ? encounter.version : "v"}`
            : null;
        await apiFetch(`/encounters/${encounterId}/admission/decision`, {
          method: "POST",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            expectedVersion:
              typeof encounter.version === "number" ? encounter.version : undefined,
            clientRequestId,
            admissionSummary: {
              ...admissionPayload,
              serviceUnit: serviceCode || admissionForm.serviceUnit,
              careLevel: locCode || admissionForm.careLevel,
            },
            admissionPacket: packetToSave,
            requestedEncounterType:
              requestedEncounterTypeForOutcomeUi(effectiveOutcome) ??
              inferPlacementEncounterTypeFromCareLevel(locCode || admissionForm.careLevel),
            admissionDiagnoses: {
              primaryDiagnosisId: primaryDiagnosisId || null,
              secondaryDiagnosisIds: secondaryIds,
              primaryDisplay: primaryRow ? formatDxRow(primaryRow) : null,
              secondaryDisplays: secondaryRows.map(formatDxRow),
              clarificationText: admissionForm.admissionDiagnosis.trim() || null,
            },
          }),
        });
      }

      const body: Record<string, unknown> = {};
      /**
       * Phase 15F-D — observation admission must not PATCH discharge summary (avoids
       * DISCHARGE_SUMMARY_SAVED timeline noise). Trackboard disposition uses admission packet + erDispositionV1.
       */
      if (mergedDischarge !== null && !isAdmissionDecisionOutcome(effectiveOutcome)) {
        if (canEditMedicalDischarge && effectiveOutcome === "HOME") {
          body.dischargeSummaryJson = buildProviderDischargeJsonForSave(
            encounter.dischargeSummaryJson,
            providerDischargeDoc,
            { documentedAt: signature.savedAt, documentedByDisplayName: savedByDisplayName },
            mergedDischarge
          );
        } else {
          // Non-HOME pathways: persist mode/shared nursing fields without Home discharge packet.
          body.dischargeSummaryJson = mergedDischarge;
        }
      }
      const naWithDisp = mergeErDispositionV1IntoNursingAssessment(
        encounter.nursingAssessment,
        supplementForm,
        signature,
        decisionPersist
      );
      const naWithPathway = mergePathwayBoardsIntoNursingAssessment(naWithDisp, effectiveOutcome, {
        ama: amaBoard,
        lwbs: lwbsBoard,
        elopement: elopementBoard,
        deceased: deceasedBoard,
        other: otherBoard,
      });
      body.nursingAssessment = applyEmtalaV1ComplementToNursingAssessment(naWithPathway, {
        outcome: effectiveOutcome,
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
      if (outcomeOverride) applyOutcomeFromUi(outcomeOverride);
      await onSaved();
      setPathwayChangeConfirm(null);
      setPathwayChangeReason("");
      if (mode === "SIGN" && isAdmissionDecisionOutcome(effectiveOutcome)) {
        setSaveInfo(
          placementWorkflowUiEnabled
            ? t("emergencyDisposition.signAdmissionOkPlacementOn")
            : t("emergencyDisposition.signAdmissionOk")
        );
        // D4A.2.2 — authoritative post-SIGN view is Admission Review (not census/IP/placement).
        router.push(hospitalAdmissionReviewPath(encounterId));
        return;
      }
      setSaveInfo(
        queued
          ? t("emergencyDisposition.saveQueued")
          : mode === "SIGN"
            ? t("emergencyDisposition.signDecisionOk")
            : isAdmissionDecisionOutcome(effectiveOutcome)
              ? t("emergencyDisposition.saveOkObservationAdmission")
              : t("emergencyDisposition.saveOk")
      );
    } catch (e) {
      console.error(e);
      const err = e as Error & { errorCode?: string | null; status?: number; body?: unknown };
      const code = err.errorCode ?? null;
      const requestId =
        err.body && typeof err.body === "object" && !Array.isArray(err.body)
          ? String((err.body as { requestId?: string }).requestId ?? "")
          : "";
      let msg =
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
        t("emergencyDisposition.saveFailed");
      if (err.status === 403) {
        msg = t("emergencyDisposition.errors.permissionDenied");
      } else if (code && isDirectAdmissionErrorCode(code)) {
        msg = t(`emergencyDisposition.errors.${code}`);
      } else if (code === "PATIENT_NOT_FOUND_IN_FACILITY") {
        msg = t("emergencyDisposition.errors.PATIENT_NOT_FOUND_IN_FACILITY");
      }
      if (requestId) {
        msg = `${msg} (${t("emergencyDisposition.errors.requestId")}: ${requestId})`;
      }
      setSaveInfo(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdmissionConfirm = async () => {
    if (cancelSaving) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelError(t("emergencyDisposition.cancelAdmissionReasonRequired"));
      return;
    }
    if (reason.length > 500) {
      setCancelError(t("emergencyDisposition.cancelAdmissionReasonTooLong"));
      return;
    }
    setCancelSaving(true);
    setCancelError(null);
    try {
      await apiFetch(`/encounters/${encounterId}/admission/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      await onSaved();
      setCancelOpen(false);
      setCancelReason("");
      setSaveInfo(t("emergencyDisposition.cancelAdmissionSuccess"));
    } catch (e) {
      setCancelError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("emergencyDisposition.cancelAdmissionFailed")
      );
    } finally {
      setCancelSaving(false);
    }
  };

  const medDisabled = formDisabled || !canEditMedicalDischarge;
  const nurDisabled = formDisabled || !canEditNursingDischarge;
  const outcomeDisabled = formDisabled || (!canEditMedicalDischarge && !canEditNursingDischarge);

  const ta = (
    rows: number,
    value: string,
    onChange: (v: string) => void,
    disabledField: boolean,
    placeholder?: string
  ) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabledField}
      rows={rows}
      placeholder={placeholder}
      style={{
        ...inputBase,
        resize: "vertical",
        minHeight: rows * 22,
        backgroundColor: disabledField ? "#f8fafc" : "#fff",
      }}
    />
  );

  const showAdmissionFields = isAdmissionDecisionOutcome(outcomeUi);
  const observationHandoffReady = useMemo(
    () => erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );
  const showObservationHandoffStatus = showAdmissionFields && hasSavedAdmission;
  // D2.5 — Home packet mounts for HOME only; other pathways use dedicated boards.
  const showProviderDischargeDocumentation = outcomeUi === "HOME";

  const readinessChips = useMemo(
    () =>
      projectEdDispositionReadiness({
        outcomeUi,
        dispositionState,
        hasSavedAdmission,
        nursingAssessment: encounter.nursingAssessment,
        providerDischargeDoc,
      }),
    [
      outcomeUi,
      dispositionState,
      hasSavedAdmission,
      encounter.nursingAssessment,
      providerDischargeDoc,
    ]
  );

  const requestedPlacementType = requestedEncounterTypeForOutcomeUi(outcomeUi);

  const showTransferExtra = outcomeUi === "TRANSFER";
  // Legacy thin textareas removed for AMA/LWBS/DECEASED — dedicated boards own those fields.
  const showAmaExtra = false;
  const showLwbsExtra = false;
  const showDeceasedExtra = false;

  return (
    <>
    <MedoraCard leftAccentColor="#64748b" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="D">
          <MedoraCardTitle
            title={t("emergencyDisposition.cardTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyDisposition.cardSubline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        {encounter.type === "INPATIENT" ? (
          <p
            style={{
              margin: "10px 0 0 0",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e9d5ff",
              backgroundColor: "#faf5ff",
              fontSize: 13,
              color: "#5b21b6",
              lineHeight: 1.45,
            }}
          >
            {t("emergencyDisposition.inpatientBanner")}
          </p>
        ) : null}

        {saveInfo ? (
          <div style={{ margin: "10px 0 0 0" }}>
            <p
              data-testid="emergency-disposition-save-info"
              style={{
                margin: 0,
                fontSize: 13,
                color:
                  saveInfo.toLowerCase().includes("impossible") ||
                  saveInfo.toLowerCase().includes("unable")
                    ? "#b91c1c"
                    : "#15803d",
                lineHeight: 1.45,
              }}
            >
              {saveInfo}
            </p>
            {isAdmissionDecisionOutcome(outcomeUi) &&
            (saveInfo === t("emergencyDisposition.signAdmissionOk") ||
              saveInfo === t("emergencyDisposition.signAdmissionOkPlacementOn")) ? (
              <Link
                href={hospitalAdmissionReviewPath(encounterId)}
                data-testid="emergency-disposition-open-admission-review"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f766e",
                }}
              >
                {t("admissionWorkflowVisibility.dispositionSuccess.openReview")}
              </Link>
            ) : null}
          </div>
        ) : null}

        {showObservationHandoffStatus ? (
          <p
            style={{
              margin: "10px 0 0 0",
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${observationHandoffReady ? "#bbf7d0" : "#fde68a"}`,
              backgroundColor: observationHandoffReady ? "#f0fdf4" : "#fffbeb",
              fontSize: 13,
              color: observationHandoffReady ? "#166534" : "#92400e",
              lineHeight: 1.45,
            }}
          >
            {observationHandoffReady
              ? t("emergencyDisposition.observationActive")
              : t("emergencyDisposition.observationHandoffAwaitingRn")}
          </p>
        ) : null}

        <div
          data-testid="ed-disposition-readiness"
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            minWidth: 0,
          }}
        >
          {readinessChips.map((chip) => (
            <span
              key={chip.id}
              data-testid={`ed-disposition-readiness-${chip.id}`}
              data-readiness-state={chip.state}
              style={edReadinessChipStyle(chip.state)}
            >
              {t(`emergencyDisposition.readiness.${chip.id}` as Parameters<typeof t>[0])}
              {" · "}
              {t(
                chip.state === "ready"
                  ? "emergencyDisposition.readiness.ready"
                  : "emergencyDisposition.readiness.pending"
              )}
            </span>
          ))}
        </div>

        <div
          data-testid="ed-disposition-summary-cards"
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            minWidth: 0,
          }}
        >
          {([
            {
              id: "provider",
              titleKey: "summaryProviderTitle",
              value: dispositionState.decisionSigned
                ? t("emergencyDisposition.decisionSignedBadge")
                : t("emergencyDisposition.decisionDraftBadge"),
            },
            ...(readinessChips.some((c) => c.id === "nursing")
              ? [
                  {
                    id: "nursing",
                    titleKey: "summaryNursingTitle",
                    value:
                      readinessChips.find((c) => c.id === "nursing")?.state === "ready"
                        ? t("emergencyDisposition.readiness.ready")
                        : t("emergencyDisposition.readiness.pending"),
                  },
                ]
              : []),
            {
              id: "pathway",
              titleKey: "summaryPathwayTitle",
              value: t(`emergencyDisposition.boardTitle.${outcomeUi}` as Parameters<typeof t>[0]),
            },
            {
              id: "final",
              titleKey: "summaryFinalTitle",
              value:
                readinessChips.find((c) => c.id === "final")?.state === "ready"
                  ? t("emergencyDisposition.readiness.ready")
                  : t("emergencyDisposition.readiness.pending"),
            },
          ] as const).map((card) => (
            <div key={card.id} data-testid={`ed-disposition-summary-${card.id}`} style={edBoardCardStyle}>
              <p style={{ ...sectionHeading, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                {t(`emergencyDisposition.${card.titleKey}` as Parameters<typeof t>[0])}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: ED_DISPOSITION_BOARD_COLORS.text,
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{ ...edDispositionWorkspaceStyle(layoutMode), marginTop: 12 }}
          data-testid="ed-disposition-workspace-layout"
          data-layout-mode={layoutMode}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div
              data-testid="ed-disposition-active-board"
              data-disposition-board={
                outcomeUi === "HOME"
                  ? "HOME_DISCHARGE"
                  : outcomeUi === "OBSERVATION"
                    ? "OBSERVATION"
                    : outcomeUi === "ADMISSION"
                      ? "ADMISSION"
                      : outcomeUi === "TRANSFER"
                        ? "EXTERNAL_TRANSFER"
                        : outcomeUi === "AMA"
                          ? "AMA"
                          : outcomeUi === "LWBS"
                            ? "LWBS"
                            : outcomeUi === "ELOPEMENT"
                              ? "ELOPEMENT"
                              : outcomeUi === "DECEASED"
                                ? "DECEASED"
                                : "OTHER_GOVERNED"
              }
              data-disposition-workflow-state={dispositionState.workflowState}
              data-decision-status={dispositionState.decisionStatus}
            >
              <p style={sectionHeading}>{t("emergencyDisposition.sectionPrimaryDecision")}</p>
              <p
                style={{
                  margin: "8px 0 0 0",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d4d4d8",
                  background: "#f4f4f5",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#3f3f46",
                  letterSpacing: "0.02em",
                }}
                role="status"
              >
                {t(`emergencyDisposition.boardTitle.${outcomeUi}`)}
                {" · "}
                {dispositionState.decisionSigned
                  ? t("emergencyDisposition.decisionSignedBadge")
                  : t("emergencyDisposition.decisionDraftBadge")}
              </p>
              <div
                role="radiogroup"
                aria-label={t("emergencyDisposition.outcomeSelectionLegend")}
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  minWidth: 0,
                }}
              >
                {OUTCOME_OPTIONS.map((opt) => {
                  const showOption =
                    opt.id === outcomeUi ||
                    !dispositionState.decisionSigned ||
                    pathwayChangeConfirm != null;
                  const destSwitchBlocked = isObservationAdmissionDestinationSwitchBlocked({
                    placementStatus: activePlacement?.status,
                    placementRequestedEncounterType: activePlacement?.requestedEncounterType,
                    nextOutcome: opt.id,
                  });
                  const optionDisabled = outcomeDisabled || destSwitchBlocked;
                  return (
                    <label
                      key={opt.id}
                      data-testid={`ed-disposition-outcome-${opt.id}`}
                      style={{
                        display: showOption ? "flex" : "none",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        color: optionDisabled ? "#94a3b8" : "#0f172a",
                        cursor: optionDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="er-disposition-outcome"
                        checked={
                          pathwayChangeConfirm != null
                            ? pathwayChangeConfirm === opt.id
                            : outcomeUi === opt.id
                        }
                        disabled={optionDisabled}
                        onChange={() => setOutcomeFromUi(opt.id)}
                        style={{ marginTop: 2 }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
                {placementDestLocked &&
                (outcomeUi === "OBSERVATION" || outcomeUi === "ADMISSION") ? (
                  <p
                    role="status"
                    data-testid="ed-disposition-committed-placement-lock"
                    style={{ margin: "4px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.4 }}
                  >
                    {t("emergencyDisposition.committedPlacementBlocksTypeSwitch")}
                  </p>
                ) : null}
                {dispositionState.decisionSigned && !formDisabled && pathwayChangeConfirm == null ? (
                  <button
                    type="button"
                    data-testid="ed-disposition-change-pathway"
                    onClick={() => setPathwayChangeConfirm(outcomeUi)}
                    style={{
                      marginTop: 6,
                      alignSelf: "flex-start",
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {t("emergencyDisposition.changePathwayAction")}
                  </button>
                ) : null}
              </div>
            </div>

            {showAdmissionFields && canPrescribe ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #f3e8ff",
                  backgroundColor: "#faf5ff",
                  minWidth: 0,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#6b21a8" }}>
                  {outcomeUi === "OBSERVATION"
                    ? t("emergencyDisposition.boardTitle.OBSERVATION")
                    : t("emergencyDisposition.admissionWarningTitle")}
                </p>
              </div>
            ) : null}

            {showAdmissionFields && !canPrescribe ? (
              <p style={{ margin: 0, fontSize: 13, color: "#b45309", lineHeight: 1.45 }}>
                {t("emergencyDisposition.admissionRoleHint")}
              </p>
            ) : null}

            {showProviderDischargeDocumentation ? (
              <>
                <ProviderDischargeDocumentationSection
                  facilityId={facilityId}
                  patientId={encounter.patient?.id}
                  encounterId={encounterId}
                  providerForm={providerDischargeDoc}
                  onProviderFormChange={onProviderDischargeDocChange}
                  disabled={medDisabled}
                  validationErrors={providerDischargeValidationErrors}
                  layoutMode={layoutMode}
                />
              </>
            ) : null}

            {outcomeUi === "AMA" ? (
              <AmaDispositionBoard
                value={amaBoard}
                onChange={setAmaBoard}
                nursingAssessment={encounter.nursingAssessment}
                disabled={formDisabled}
              />
            ) : null}
            {outcomeUi === "LWBS" ? (
              <LwbsDispositionBoard
                value={lwbsBoard}
                onChange={setLwbsBoard}
                nursingAssessment={encounter.nursingAssessment}
                disabled={formDisabled}
              />
            ) : null}
            {outcomeUi === "ELOPEMENT" ? (
              <ElopementDispositionBoard
                value={elopementBoard}
                onChange={setElopementBoard}
                nursingAssessment={encounter.nursingAssessment}
                disabled={formDisabled}
              />
            ) : null}
            {outcomeUi === "DECEASED" ? (
              <DeceasedDispositionBoard
                value={deceasedBoard}
                onChange={setDeceasedBoard}
                nursingAssessment={encounter.nursingAssessment}
                disabled={formDisabled}
              />
            ) : null}
            {outcomeUi === "OTHER" ? (
              <GovernedOtherDispositionBoard
                value={otherBoard}
                onChange={setOtherBoard}
                disabled={formDisabled}
              />
            ) : null}

            {showAdmissionFields && canPrescribe ? (
              <div>
                <AdmissionObservationDecisionBoard
                  encounterId={encounterId}
                  requestedEncounterType={requestedPlacementType ?? "INPATIENT"}
                  disabled={medDisabled}
                  onPlacementChange={(placement) => {
                    setActivePlacement(placement);
                    if (
                      !placement ||
                      !isInternalPlacementDestinationLocked(placement.status)
                    ) {
                      return;
                    }
                    const dest = String(placement.requestedEncounterType ?? "")
                      .trim()
                      .toUpperCase();
                    if (dest === "OBSERVATION" && outcomeUi === "ADMISSION") {
                      applyOutcomeFromUi("OBSERVATION");
                    } else if (dest === "INPATIENT" && outcomeUi === "OBSERVATION") {
                      applyOutcomeFromUi("ADMISSION");
                    }
                  }}
                />
                <p style={sectionHeading}>
                  {outcomeUi === "OBSERVATION"
                    ? t("emergencyDisposition.sectionObservationPhysician")
                    : t("emergencyDisposition.sectionAdmissionPhysician")}
                </p>
                {newerProposalAvailable && pendingProposal ? (
                  <div
                    role="status"
                    data-testid="newer-proposal-available"
                    style={{
                      marginBottom: 8,
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #fcd34d",
                      background: "#fffbeb",
                      fontSize: 12,
                      color: "#92400e",
                    }}
                  >
                    <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                      {t("emergencyDisposition.newerProposalAvailable")}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setNewerProposalAvailable(false);
                          setPendingProposal(null);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #d97706",
                          background: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t("emergencyDisposition.keepPhysicianText")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fresh = pendingProposal;
                          if (!fresh?.fields.admissionReason) return;
                          setAdmissionPacket((prev) => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              admissionReason: replaceFieldWithUpdatedProposal(
                                prev.fields.admissionReason,
                                fresh.fields.admissionReason!
                              ),
                              initialPlan: fresh.fields.initialPlan
                                ? replaceFieldWithUpdatedProposal(
                                    prev.fields.initialPlan,
                                    fresh.fields.initialPlan
                                  )
                                : prev.fields.initialPlan,
                            },
                            structuredInitialPlan:
                              fresh.structuredInitialPlan ?? prev.structuredInitialPlan,
                          }));
                          setAdmissionForm((prev) => ({
                            ...prev,
                            admissionReason: fresh.fields.admissionReason?.value ?? prev.admissionReason,
                            initialPlan: fresh.fields.initialPlan?.value ?? prev.initialPlan,
                          }));
                          setNewerProposalAvailable(false);
                          setPendingProposal(null);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #1d4ed8",
                          background: "#1d4ed8",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t("emergencyDisposition.replaceWithUpdatedProposal")}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmissionReason")}</label>
                    <ProposalSourcesDisclosure
                      origin={admissionPacket.fields.admissionReason?.origin}
                      sources={admissionPacket.fields.admissionReason?.sources}
                      testId="admission-reason-sources"
                    />
                    {ta(2, admissionForm.admissionReason, (v) => patchAdmission({ admissionReason: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmittingService")}</label>
                    <select
                      value={
                        isHospitalAdmittingService(admissionForm.serviceUnit)
                          ? admissionForm.serviceUnit.trim().toUpperCase()
                          : ""
                      }
                      onChange={(e) => patchAdmission({ serviceUnit: e.target.value })}
                      disabled={medDisabled}
                      data-testid="admission-admitting-service"
                      style={{
                        ...inputBase,
                        cursor: medDisabled ? "not-allowed" : "pointer",
                        backgroundColor: medDisabled ? "#f8fafc" : "#fff",
                      }}
                    >
                      <option value="">—</option>
                      {HOSPITAL_ADMITTING_SERVICES.map((code) => (
                        <option key={code} value={code}>
                          {t(`hospitalAdmissionD4a0.service.${code}`)}
                        </option>
                      ))}
                    </select>
                    {admissionForm.serviceUnit === "OTHER" ? (
                      <div style={{ marginTop: 6 }}>
                        <label style={labelStyle}>{t("emergencyDisposition.labelServiceOtherClarification")}</label>
                        <input
                          type="text"
                          value={serviceOtherClarification}
                          onChange={(e) => setServiceOtherClarification(e.target.value)}
                          disabled={medDisabled}
                          style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmissionDiagnoses")}</label>
                    {encounterDiagnoses.length === 0 ? (
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
                        {t("emergencyDisposition.admissionDiagnosesEmpty")}{" "}
                        <a href={`#diagnostics`} style={{ color: "#1d4ed8", fontWeight: 600 }}>
                          {t("emergencyDisposition.openDiagnosesWorkflow")}
                        </a>
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                        <label style={{ ...labelStyle, fontWeight: 500 }}>
                          {t("emergencyDisposition.primaryAdmissionDiagnosis")} *
                          <select
                            value={primaryDiagnosisId}
                            disabled={medDisabled}
                            onChange={(e) => {
                              const next = e.target.value;
                              setPrimaryDiagnosisId(next);
                              setSecondaryDiagnosisIds((prev) => prev.filter((id) => id !== next));
                            }}
                            style={{ ...inputBase, marginTop: 4 }}
                            data-testid="admission-primary-diagnosis"
                          >
                            <option value="">—</option>
                            {encounterDiagnoses.map((d) => (
                              <option key={d.id} value={d.id}>
                                {formatDxRow(d)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <fieldset style={{ margin: 0, border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                          <legend style={{ fontSize: 12, fontWeight: 600, color: "#475569", padding: "0 4px" }}>
                            {t("emergencyDisposition.secondaryAdmissionDiagnoses")}
                          </legend>
                          {encounterDiagnoses.map((d) => (
                            <label
                              key={d.id}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                fontSize: 12,
                                marginBottom: 4,
                                color: "#334155",
                              }}
                            >
                              <input
                                type="checkbox"
                                disabled={medDisabled || d.id === primaryDiagnosisId}
                                checked={secondaryDiagnosisIds.includes(d.id)}
                                onChange={(e) => {
                                  setSecondaryDiagnosisIds((prev) =>
                                    e.target.checked
                                      ? [...prev.filter((x) => x !== d.id && x !== primaryDiagnosisId), d.id]
                                      : prev.filter((x) => x !== d.id)
                                  );
                                }}
                              />
                              <span>{formatDxRow(d)}</span>
                            </label>
                          ))}
                        </fieldset>
                      </div>
                    )}
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmissionDiagnosisClarification")}</label>
                    {ta(2, admissionForm.admissionDiagnosis, (v) => patchAdmission({ admissionDiagnosis: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelCareLevel")}</label>
                    <select
                      value={
                        isHospitalRequestedLevelOfCare(admissionForm.careLevel)
                          ? admissionForm.careLevel.trim().toUpperCase()
                          : ""
                      }
                      onChange={(e) => patchAdmission({ careLevel: e.target.value })}
                      disabled={medDisabled}
                      data-testid="admission-level-of-care"
                      style={{
                        ...inputBase,
                        cursor: medDisabled ? "not-allowed" : "pointer",
                        backgroundColor: medDisabled ? "#f8fafc" : "#fff",
                      }}
                    >
                      <option value="">—</option>
                      {ED_ADMISSION_LEVEL_OF_CARE_OPTIONS.map((code) => (
                        <option key={code} value={code}>
                          {t(`hospitalAdmissionD4a0.level.${code}`)}
                        </option>
                      ))}
                    </select>
                    {admissionForm.careLevel === "OTHER" ? (
                      <div style={{ marginTop: 6 }}>
                        <label style={labelStyle}>{t("emergencyDisposition.labelLocOtherClarification")}</label>
                        <input
                          type="text"
                          value={locOtherClarification}
                          onChange={(e) => setLocOtherClarification(e.target.value)}
                          disabled={medDisabled}
                          style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelConditionStatus")}</label>
                    <select
                      value={conditionStatus}
                      onChange={(e) => setConditionStatus(e.target.value)}
                      disabled={medDisabled}
                      data-testid="admission-condition-status"
                      style={{
                        ...inputBase,
                        cursor: medDisabled ? "not-allowed" : "pointer",
                        backgroundColor: medDisabled ? "#f8fafc" : "#fff",
                      }}
                    >
                      <option value="">—</option>
                      {ADMISSION_CONDITION_STATUSES.map((code) => (
                        <option key={code} value={code}>
                          {t(`emergencyDisposition.conditionStatus.${code}`)}
                        </option>
                      ))}
                    </select>
                    <label style={{ ...labelStyle, marginTop: 8 }}>
                      {t("emergencyDisposition.labelConditionAdmission")}
                    </label>
                    {ta(2, admissionForm.conditionAtAdmission, (v) => patchAdmission({ conditionAtAdmission: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelInitialPlan")}</label>
                    <ProposalSourcesDisclosure
                      origin={admissionPacket.fields.initialPlan?.origin}
                      sources={admissionPacket.fields.initialPlan?.sources}
                      testId="initial-plan-sources"
                    />
                    {ta(2, admissionForm.initialPlan, (v) => patchAdmission({ initialPlan: v }), medDisabled)}
                    {(admissionPacket.structuredInitialPlan?.items?.length ?? 0) > 0 ? (
                      <fieldset
                        style={{
                          margin: "8px 0 0",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: 8,
                        }}
                        data-testid="structured-initial-plan"
                      >
                        <legend style={{ fontSize: 12, fontWeight: 600, color: "#475569", padding: "0 4px" }}>
                          {t("emergencyDisposition.structuredPlanTitle")}
                        </legend>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {admissionPacket.structuredInitialPlan!.items.map((item) => (
                            <li
                              key={item.id}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: 6,
                                fontSize: 12,
                                color: "#334155",
                              }}
                            >
                              <input
                                type="checkbox"
                                id={`plan-item-${item.id}`}
                                disabled={medDisabled}
                                checked={item.selectedForNarrative}
                                aria-label={item.display}
                                onChange={(e) => {
                                  const selected = e.target.checked;
                                  setAdmissionPacket((prev) => {
                                    const items = (prev.structuredInitialPlan?.items ?? []).map((row) =>
                                      row.id === item.id ? { ...row, selectedForNarrative: selected } : row
                                    );
                                    const narrative = buildNarrativeFromStructuredPlanItems(items);
                                    setAdmissionForm((f) =>
                                      f.initialPlan.trim() &&
                                      f.initialPlan !== (prev.fields.initialPlan?.value ?? "")
                                        ? f
                                        : { ...f, initialPlan: narrative }
                                    );
                                    return {
                                      ...prev,
                                      structuredInitialPlan: { items },
                                      fields: {
                                        ...prev.fields,
                                        initialPlan: markFieldPhysicianEdited(
                                          prev.fields.initialPlan,
                                          narrative
                                        ),
                                      },
                                    };
                                  });
                                }}
                              />
                              <label htmlFor={`plan-item-${item.id}`} style={{ flex: 1, cursor: "pointer" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginRight: 6,
                                    padding: "1px 8px",
                                    borderRadius: 9999,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background:
                                      item.status === "ACTIVE_ORDER" ? "#dbeafe" : "#f1f5f9",
                                    color: item.status === "ACTIVE_ORDER" ? "#1e40af" : "#475569",
                                  }}
                                >
                                  {item.status === "ACTIVE_ORDER"
                                    ? t("emergencyDisposition.planStatus.activeOrder")
                                    : item.status === "DISCONTINUED"
                                      ? t("emergencyDisposition.planStatus.discontinued")
                                      : t("emergencyDisposition.planStatus.planOnly")}
                                </span>
                                {item.display}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </fieldset>
                    ) : null}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelResponsiblePhysician")}</label>
                    <input
                      type="text"
                      value={admissionForm.responsiblePhysicianName}
                      onChange={(e) => patchAdmission({ responsiblePhysicianName: e.target.value })}
                      disabled={medDisabled}
                      style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  {hasSavedAdmission && !formDisabled ? (
                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 10,
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCancelOpen(true);
                          setCancelError(null);
                          setCancelReason("");
                        }}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: "1px solid #fecaca",
                          backgroundColor: "#fff",
                          color: "#b91c1c",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {t("emergencyDisposition.cancelAdmissionButton")}
                      </button>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {t("emergencyDisposition.cancelAdmissionHint")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {(showTransferExtra || showAmaExtra || showLwbsExtra || showDeceasedExtra) && (
              <div>
                <p style={sectionHeading}>{t("emergencyDisposition.sectionErSupplement")}</p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {showTransferExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelTransferHandoff")}</label>
                      {ta(
                        2,
                        supplementForm.transferHandoffNote,
                        (v) => patchSupplement({ transferHandoffNote: v }),
                        formDisabled,
                        t("emergencyDisposition.transferPlaceholder")
                      )}
                    </div>
                  ) : null}
                  {showAmaExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelAmaRisks")}</label>
                      {ta(2, supplementForm.amaRisksDiscussed, (v) => patchSupplement({ amaRisksDiscussed: v }), formDisabled)}
                    </div>
                  ) : null}
                  {showLwbsExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelLwbs")}</label>
                      {ta(
                        2,
                        supplementForm.lwbsNarrative,
                        (v) => patchSupplement({ lwbsNarrative: v }),
                        formDisabled,
                        t("emergencyDisposition.lwbsPlaceholder")
                      )}
                    </div>
                  ) : null}
                  {showDeceasedExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelDeceasedNotes")}</label>
                      {ta(
                        3,
                        supplementForm.deceasedPlaceholderNote,
                        (v) => patchSupplement({ deceasedPlaceholderNote: v }),
                        formDisabled,
                        t("emergencyDisposition.deceasedPlaceholder")
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #bae6fd",
                backgroundColor: "#f0f9ff",
              }}
            >
              <p style={sectionHeading}>{t("emergencyDisposition.emtalaBlock")}</p>
              {showTransferExtra ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferRequestedAt")}</label>
                    <input
                      type="datetime-local"
                      value={emtalaComplement.transferRequestedAt}
                      onChange={(e) => patchEmtalaComplement({ transferRequestedAt: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferAcceptedAt")}</label>
                    <input
                      type="datetime-local"
                      value={emtalaComplement.transferAcceptedAt}
                      onChange={(e) => patchEmtalaComplement({ transferAcceptedAt: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAcceptingFacility")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.acceptingFacilityName}
                      onChange={(e) => patchEmtalaComplement({ acceptingFacilityName: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAcceptingClinician")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.acceptingClinicianName}
                      onChange={(e) => patchEmtalaComplement({ acceptingClinicianName: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferMode")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.transferMode}
                      onChange={(e) => patchEmtalaComplement({ transferMode: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferReason")}</label>
                    {ta(
                      2,
                      emtalaComplement.transferReason,
                      (v) => patchEmtalaComplement({ transferReason: v }),
                      formDisabled
                    )}
                  </div>
                </div>
              ) : null}
              {showAmaExtra ? (
                <div style={{ marginTop: showTransferExtra ? 8 : 6 }}>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAmaRiskDoc")}</label>
                  <select
                    value={emtalaComplement.amaRiskDiscussionDocumented}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        amaRiskDiscussionDocumented: e.target.value as EmtalaDispositionComplementForm["amaRiskDiscussionDocumented"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
              ) : null}
              {showLwbsExtra ? (
                <div style={{ marginTop: 8 }}>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelLwbsDocumentedAt")}</label>
                  <input
                    type="datetime-local"
                    value={emtalaComplement.lwbsDocumentedAt}
                    onChange={(e) => patchEmtalaComplement({ lwbsDocumentedAt: e.target.value })}
                    disabled={formDisabled}
                    style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              ) : null}
              <p style={{ ...sectionHeading, marginTop: 10 }}>{t("emergencyDisposition.emtalaAttestSection")}</p>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelMsePerformed")}</label>
                  <select
                    value={emtalaComplement.msePerformed}
                    onChange={(e) =>
                      patchEmtalaComplement({ msePerformed: e.target.value as EmtalaDispositionComplementForm["msePerformed"] })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelEmcConsidered")}</label>
                  <select
                    value={emtalaComplement.emergencyConditionConsidered}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        emergencyConditionConsidered: e.target.value as EmtalaDispositionComplementForm["emergencyConditionConsidered"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelStabilizing")}</label>
                  <select
                    value={emtalaComplement.stabilizingTreatmentProvidedOrNotApplicable}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        stabilizingTreatmentProvidedOrNotApplicable: e.target.value as EmtalaDispositionComplementForm["stabilizingTreatmentProvidedOrNotApplicable"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", width: "100%", minWidth: 0 }}>
              <button
                type="button"
                data-testid="ed-disposition-save-draft"
                onClick={() => void handleSave("DRAFT")}
                disabled={formDisabled || saving}
                style={edDispositionTouchButtonStyle(
                  {
                    padding: "9px 16px",
                    borderRadius: 10,
                    border: "1px solid #64748b",
                    backgroundColor: formDisabled ? "#f1f5f9" : "#475569",
                    color: formDisabled ? "#94a3b8" : "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: formDisabled || saving ? "not-allowed" : "pointer",
                  },
                  layoutMode
                )}
              >
                {saving
                  ? t("emergencyDisposition.saveButtonSaving")
                  : t("emergencyDisposition.saveDraftButton")}
              </button>
              {(canEditMedicalDischarge || canPrescribe) && !formDisabled ? (
                <button
                  type="button"
                  data-testid="ed-disposition-sign-decision"
                  onClick={() => void handleSave("SIGN")}
                  disabled={saving}
                  style={edDispositionTouchButtonStyle(
                    {
                      padding: "9px 16px",
                      borderRadius: 10,
                      border: "1px solid #1d4ed8",
                      backgroundColor: "#1d4ed8",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: saving ? "not-allowed" : "pointer",
                    },
                    layoutMode
                  )}
                >
                  {outcomeUi === "OBSERVATION"
                    ? t("emergencyDisposition.signObservationButton")
                    : outcomeUi === "ADMISSION"
                    ? t("emergencyDisposition.signAdmissionButton")
                    : outcomeUi === "HOME"
                      ? t("emergencyDisposition.signHomeDischargeButton")
                      : outcomeUi === "TRANSFER"
                        ? t("emergencyDisposition.signTransferButton")
                        : outcomeUi === "AMA"
                          ? t("emergencyDisposition.signAmaButton")
                          : t("emergencyDisposition.signDecisionButton")}
                </button>
              ) : null}
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", flex: "1 1 220px" }}>
                {t("emergencyDisposition.decisionDoesNotClose")}
              </p>
              {isLocked ? (
                <span style={{ fontSize: 12, color: "#b45309" }}>{t("emergencyDisposition.lockedSigned")}</span>
              ) : null}
              {isReadOnly ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>{t("emergencyDisposition.readOnlyClosed")}</span>
              ) : null}
            </div>
          </div>

          <EdDispositionPreviewPanel title={t("emergencyDisposition.previewColumnTitle")} layoutMode={layoutMode}>
            <div
              style={{
                marginTop: layoutMode === "desktopSplit" ? 10 : 0,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              {previewModel.sections.map((sec, idx) => (
                <div key={sec.id} style={{ marginBottom: idx === previewModel.sections.length - 1 ? 0 : 12 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: PREVIEW_ACCENTS[sec.id] ?? "#64748b",
                    }}
                  >
                    {sec.title}
                  </p>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: 16, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                    {sec.lines.map((line, i) => (
                      <li key={i} style={{ marginBottom: 3 }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {previewModel.headline ? (
                <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#0f172a", lineHeight: 1.45, fontWeight: 600 }}>
                  {previewModel.headline}
                </p>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#475569" }}>
                {t("emergencyDisposition.signatureHeading")}
              </p>
              {storedSig ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                  {storedSig.savedByDisplayName}
                  <br />
                  {new Date(storedSig.savedAt).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
                </p>
              ) : (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>{t("common.dash")}</p>
              )}
            </div>

            <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
              <button
                type="button"
                onClick={handlePrintDischargeSummary}
                disabled={!canPrintDischargeSummary}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: canPrintDischargeSummary ? "#f8fafc" : "#f1f5f9",
                  color: canPrintDischargeSummary ? "#334155" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canPrintDischargeSummary ? "pointer" : "not-allowed",
                }}
              >
                {t("emergencyDisposition.printDischargeSummary")}
              </button>
            </MedoraCardActions>
          </EdDispositionPreviewPanel>
        </div>
      </MedoraCardInner>
    </MedoraCard>
    {cancelOpen ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("emergencyDisposition.cancelAdmissionTitle")}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16,
        }}
        onClick={() => {
          if (!cancelSaving) setCancelOpen(false);
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 460,
            backgroundColor: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            {t("emergencyDisposition.cancelAdmissionTitle")}
          </p>
          <p style={{ margin: "6px 0 12px 0", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
            {t("emergencyDisposition.cancelAdmissionBody")}
          </p>
          <label style={labelStyle}>{t("emergencyDisposition.cancelAdmissionReasonLabel")}</label>
          <textarea
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError(null);
            }}
            disabled={cancelSaving}
            rows={3}
            maxLength={500}
            placeholder={t("emergencyDisposition.cancelAdmissionReasonPlaceholder")}
            style={{
              ...inputBase,
              minHeight: 76,
              resize: "vertical",
              backgroundColor: cancelSaving ? "#f8fafc" : "#fff",
            }}
          />
          {cancelError ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#b91c1c" }}>{cancelError}</p>
          ) : null}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              disabled={cancelSaving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 13,
                cursor: cancelSaving ? "not-allowed" : "pointer",
              }}
            >
              {t("emergencyDisposition.cancelAdmissionKeep")}
            </button>
            <button
              type="button"
              onClick={() => void handleCancelAdmissionConfirm()}
              disabled={cancelSaving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #b91c1c",
                backgroundColor: cancelSaving ? "#fecaca" : "#b91c1c",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: cancelSaving ? "not-allowed" : "pointer",
              }}
            >
              {cancelSaving
                ? t("emergencyDisposition.cancelAdmissionSaving")
                : t("emergencyDisposition.cancelAdmissionConfirm")}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {pathwayChangeConfirm != null && pathwayChangeConfirm !== outcomeUi ? (
      <div
        role="dialog"
        aria-modal="true"
        data-testid="ed-disposition-pathway-change-modal"
        aria-label={t("emergencyDisposition.pathwayChangeTitle")}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16,
        }}
        onClick={() => {
          if (!saving) {
            setPathwayChangeConfirm(null);
            setPathwayChangeReason("");
          }
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 460,
            backgroundColor: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            {t("emergencyDisposition.pathwayChangeTitle")}
          </p>
          <p style={{ margin: "6px 0 12px 0", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
            {t("emergencyDisposition.pathwayChangeBody")}
          </p>
          <label style={labelStyle}>{t("emergencyDisposition.pathwayChangeReasonLabel")}</label>
          <textarea
            value={pathwayChangeReason}
            onChange={(e) => setPathwayChangeReason(e.target.value)}
            disabled={saving}
            rows={3}
            maxLength={500}
            style={{
              ...inputBase,
              minHeight: 76,
              resize: "vertical",
            }}
          />
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPathwayChangeConfirm(null);
                setPathwayChangeReason("");
              }}
              disabled={saving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {t("emergencyDisposition.pathwayChangeCancel")}
            </button>
            <button
              type="button"
              data-testid="ed-disposition-pathway-change-confirm"
              onClick={() => {
                if (pathwayChangeReason.trim().length < 3) {
                  setSaveInfo(t("emergencyDisposition.pathwayChangeReasonRequired"));
                  return;
                }
                if (
                  isObservationAdmissionDestinationSwitchBlocked({
                    placementStatus: activePlacement?.status,
                    placementRequestedEncounterType: activePlacement?.requestedEncounterType,
                    nextOutcome: pathwayChangeConfirm,
                  })
                ) {
                  setSaveInfo(t("emergencyDisposition.committedPlacementBlocksTypeSwitch"));
                  return;
                }
                void handleSave("DRAFT", pathwayChangeConfirm);
              }}
              disabled={saving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #b45309",
                backgroundColor: "#b45309",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {t("emergencyDisposition.pathwayChangeConfirm")}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
