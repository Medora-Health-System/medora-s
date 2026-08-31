"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { createDiagnosis } from "@/lib/chartApi";
import { Icd10DiagnosisEntryPanel } from "@/components/diagnosis/Icd10DiagnosisEntryPanel";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { BillingClassificationBadgeInteractive } from "@/components/encounters/BillingClassificationBadgeInteractive";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { printFacilityInfoFromEnterpriseSource } from "@/lib/printFacilityHeader";
import { canDocumentEdTriage } from "@medora/shared";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import type { PatientTriageVitalsResponse } from "@/lib/patientVitals";
import {
  buildVitalsTimelineNewestFirst,
  hasVitalsJson,
  hasMeaningfulVitalMeasurement,
  MEDORA_PATIENT_VITALS_UPDATED,
  pickLatestMeaningfulVitalsSnapshot,
  snapshotKey,
  vitalsSnapshotMeasuredAtMs,
} from "@/lib/patientVitals";
import { snapshotsToVitalSummaryReadings, VitalSummaryPanel } from "@/components/patients/VitalSummaryPanel";
import {
  esiDisplayChar,
  esiLevelFromUnknown,
  EMERGENCY_AVATAR_CIRCLE_STYLE,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import {
  buildAllergyStripSummary,
  buildErWorkspaceVitalPairs,
  triagePreviewSliceFromTriageGet,
} from "@/features/emergency/emergencyTriageDocPreview";
import {
  buildErCdsRecommendations,
  type ErCdsNavigableSection,
  type ErCdsRecommendation,
} from "@/features/emergency/erClinicalDecisionSupport";
import { ErClinicalDecisionSupportPanel } from "@/features/emergency/ErClinicalDecisionSupportPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyQuickVitalsEditor } from "@/features/emergency/EmergencyQuickVitalsEditor";
import {
  VitalReadingEditModal,
  VitalReadingVoidModal,
} from "@/features/emergency/VitalReadingGovernanceModals";
import type { VitalSummaryReading } from "@/components/patients/VitalSummaryPanel";
import {
  EmergencyWorkspaceAllergiesCard,
  EmergencyWorkspaceVitalsCard,
} from "@/features/emergency/EmergencyWorkspaceClinicalStrip";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { EmergencyProviderMsePanel } from "@/features/emergency/EmergencyProviderMsePanel";
import { EmergencyDispositionPanel } from "@/features/emergency/EmergencyDispositionPanel";
import { EmergencyErSummaryClosureSurface } from "@/features/emergency/EmergencyErSummaryClosureSurface";
import { EmergencyIvAccessModal } from "@/features/emergency/EmergencyIvAccessModal";
import { EmergencyProcedureLauncherModal } from "@/features/emergency/EmergencyProcedureLauncherModal";
import { EmergencyTriagePanel } from "@/features/emergency/EmergencyTriagePanel";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyErNursingHandoffPanel } from "@/features/emergency/EmergencyErNursingHandoffPanel";
import { NursingDischargeExecutionSection } from "@/features/emergency/NursingDischargeExecutionSection";
import { AdaptiveDispositionNursingSection } from "@/features/emergency/AdaptiveDispositionNursingSection";
import { edBoardSectionStyle, edSectionHeadingStyle } from "@/features/emergency/edDispositionBoardStyles";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { EmergencyClinicalDataPanel } from "@/features/emergency/EmergencyClinicalDataPanel";
import { emergencyChartPath, genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import { isEdEncounterClosedForArchive } from "@/features/emergency/edClosedChartDisplayMode";
import { erDispositionBadgeFromEncounterJson } from "@/features/emergency/erTrackboardDispositionBadge";
import {
  isHomeNursingForbiddenForPathway,
  pathwayFromDispositionBadgeVariant,
} from "@medora/shared";
import {
  parseErWorkspaceSection,
  type ErWorkspaceSection,
} from "@/features/emergency/erWorkspaceSections";
import {
  deriveEdWorkspaceCapabilities,
  applyEdWorkspaceEncounterTileFilter,
  edWorkspaceTileToSection,
  getDefaultEdWorkspaceTile,
  getVisibleEdWorkspaceTiles,
  isErWorkspaceSectionVisible,
  resolveEdWorkspaceRoleGroup,
} from "@/features/emergency/edWorkspaceTileVisibility";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { EncounterOperationalPanel } from "@/components/encounters/EncounterOperationalPanel";
import { EncounterGovernedRoomChip } from "@/components/encounters/EncounterGovernedRoomChip";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import {
  applyEncounterRoomAssignmentUpdate,
  dispatchEncounterRoomAssignmentRefresh,
} from "@/lib/applyEncounterRoomAssignmentUpdate";
import { canAssignEncounterRoom } from "@/lib/governedRoomDisplay";
import { ErHandoffV1NursingSection } from "@/components/encounters/ErHandoffV1Panel";
import { isEncounterLocked } from "@/lib/encounterLock";
import {
  MEDORA_CARD_SHELL,
  MedoraCard,
  MedoraCardActions,
  MedoraCardActionsMediaStyle,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { EmergencyErWorkspaceSectionNav, type ErDashboardTile } from "@/features/emergency/EmergencyErWorkspaceSectionNav";
import { EmergencyErWorkspaceBottomRail } from "@/features/emergency/EmergencyErWorkspaceBottomRail";
import { EmergencyWorkspaceCompactTabletSummary } from "@/features/emergency/EmergencyWorkspaceCompactTabletSummary";
import {
  emergencyChartCompactCardInnerPaddingStyle,
  emergencyChartPatientSummaryOuterStyle,
  emergencyChartUsesCompactTabletHeader,
  emergencyChartWorkspaceContentContainmentStyle,
} from "@/features/emergency/emergencyChartCompactTabletHeader";
import { emergencyChartUsesBottomRail } from "@/features/emergency/emergencyChartTouchNavigationMode";
import { clinicalPatientSummaryStackStyle } from "@/lib/clinicalViewport";
import {
  clinicalSafeScrollPaddingStyle,
  clinicalStickyActionBarStyle,
  clinicalThumbReachActionStyle,
} from "@/lib/clinicalTouchNavigation";
import {
  emergencyChartHeaderRailStyle,
  emergencyChartPageShellStyle,
  emergencyChartPatientSummaryShellStyle,
  emergencyChartTouchLinkStyle,
  emergencyChartViewportModeFromLayout,
  emergencyChartVitalsDisplayMode,
  resolveEmergencyChartLayoutMode,
  type EmergencyChartLayoutMode,
} from "@/features/emergency/emergencyChartResponsiveLayout";

const EMERGENCY_TYPE = "EMERGENCY" as const;

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
};

type EncounterShell = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  roomLabel?: string | null;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  admittedAt?: string | null;
  patient?: PatientLite | null;
  /** Required by `NursingAssessmentTab` (same payload as GET /encounters/:id). */
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  physicianAssigned?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{ id: string; text: string; createdAt: string }>;
  notes?: string | null;
};

function patientInitials(p: PatientLite | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: PatientLite | null | undefined, t: (key: string) => string): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || t("common.dash");
}

function statusSoft(status: string): PriorityBadgeSoft {
  return STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
}

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};

const shellBox: React.CSSProperties = {
  backgroundColor: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: "14px 16px",
};

export type { ErWorkspaceSection } from "@/features/emergency/erWorkspaceSections";

export function EmergencyActiveWorkspaceView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useI18n();
  const encounterId = params.id as string;
  const {
    facilityId: facilityIdFromHook,
    facilities,
    roles,
    ready: rolesReady,
    canPrescribe,
    userId,
    facilityTimeZone,
    careProfileJson,
    facilityCountry,
  } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  /** Bumped after embedded saves so les résultats embarqués se rechargent (même idée que l’onglet consultation). */
  const [resultsRefresh, setResultsRefresh] = useState(0);
  /** Recharge le GET triage pour le bandeau clinique partagé (après enregistrement triage, etc.). */
  const [triageRefresh, setTriageRefresh] = useState(0);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  /** GET `/patients/:id/triage?latest=true` — vitals timeline for CDS trends (existing endpoint). */
  const [patientVitalsTimeline, setPatientVitalsTimeline] = useState<PatientTriageVitalsResponse | null>(
    null
  );
  const [triageLoading, setTriageLoading] = useState(false);
  const [showQuickVitals, setShowQuickVitals] = useState(false);
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [editVitalReading, setEditVitalReading] = useState<VitalSummaryReading | null>(null);
  const [voidVitalReading, setVoidVitalReading] = useState<VitalSummaryReading | null>(null);
  const [showIvAccessModal, setShowIvAccessModal] = useState(false);
  const [showProcedureLauncherModal, setShowProcedureLauncherModal] = useState(false);

  const [activeSection, setActiveSection] = useState<ErWorkspaceSection>(() => {
    return parseErWorkspaceSection(searchParams.get("section")) ?? "triage";
  });
  const [layoutMode, setLayoutMode] = useState<EmergencyChartLayoutMode>("desktopSplit");
  const [viewportWidth, setViewportWidth] = useState(1280);

  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOperationalPanel, setShowOperationalPanel] = useState(false);
  const [showRoomAssignmentModal, setShowRoomAssignmentModal] = useState(false);
  const [showCreateDx, setShowCreateDx] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dxSubmitting, setDxSubmitting] = useState(false);
  const [dxError, setDxError] = useState<string | null>(null);

  const fid = facilityId || facilityIdFromHook;
  const facilityName = facilities.find((x) => x.id === fid)?.name ?? null;

  const edWorkspaceRoleInput = useMemo(() => {
    const caps = deriveEdWorkspaceCapabilities(roles);
    return {
      roleCodes: roles,
      canPrescribe,
      canAdministerMedication: caps.canAdministerMedication,
      canManageOrders: caps.canManageOrders,
    };
  }, [roles, canPrescribe]);

  const edWorkspaceRoleGroup = useMemo(
    () => resolveEdWorkspaceRoleGroup(edWorkspaceRoleInput),
    [edWorkspaceRoleInput]
  );
  const summaryReadOnly = edWorkspaceRoleGroup === "TECH";

  const visibleEdWorkspaceTileIds = useMemo(() => {
    const base = getVisibleEdWorkspaceTiles(edWorkspaceRoleInput);
    return applyEdWorkspaceEncounterTileFilter(base, {
      ...edWorkspaceRoleInput,
      encounterType: encounter?.type ?? null,
      facilityUnit: encounter?.governedRoomUnit ?? null,
    });
  }, [edWorkspaceRoleInput, encounter?.type, encounter?.governedRoomUnit]);

  const visibleEdWorkspaceSections = useMemo(
    () => new Set(visibleEdWorkspaceTileIds.map(edWorkspaceTileToSection)),
    [visibleEdWorkspaceTileIds]
  );

  const canViewEncounterDetail =
    roles.includes("FRONT_DESK") ||
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY");

  const canFetchEncounterTriage = useMemo(
    () =>
      canDocumentEdTriage({
        roleCodes: roles,
        encounterType: encounter?.type ?? null,
        facilityUnit: encounter?.governedRoomUnit ?? null,
      }),
    [roles, encounter?.type, encounter?.governedRoomUnit]
  );

  /** Lab/Radiology techniciens : accès workspace urgences en lecture seule (workflow technicien). */
  const isReadOnlyTechnicianViewer =
    (roles.includes("LAB") || roles.includes("RADIOLOGY")) &&
    !roles.includes("RN") &&
    !roles.includes("PROVIDER") &&
    !roles.includes("ADMIN");

  /** Aligné sur POST /orders/:id/result/acknowledge (RN, PROVIDER, ADMIN). LAB/RADIOLOGY exclus. */
  const canAcknowledgeResults =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

  const showNursingTab =
    roles.includes("RN") || roles.includes("ADMIN") || roles.includes("PROVIDER");

  const canFetchMarTab =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

  const canEditNursingDischarge = roles.includes("RN") || roles.includes("ADMIN");
  const canEditMedicalDischarge = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canDocumentEncounterDiagnoses =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canRecordDischargeSortieExecution = roles.includes("RN") || roles.includes("ADMIN");
  /** Phase A/D4A.2: hide HOME nursing when disposition is non-HOME. */
  const dispositionNursingPathway = useMemo(() => {
    if (!encounter) return "HOME" as const;
    const badge = erDispositionBadgeFromEncounterJson(encounter);
    return pathwayFromDispositionBadgeVariant(badge?.variant ?? null);
  }, [encounter]);
  const showHomeNursingDischargeExecution = useMemo(() => {
    if (!encounter) return false;
    return !isHomeNursingForbiddenForPathway(dispositionNursingPathway);
  }, [encounter, dispositionNursingPathway]);
  const admissionDecisionSigned = useMemo(() => {
    const raw = encounter?.admissionSummaryJson;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    return String((raw as { admissionDecisionMode?: string }).admissionDecisionMode ?? "") === "SIGN";
  }, [encounter?.admissionSummaryJson]);

  const canDocumentIvAccess =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY") ||
    roles.includes("ADMIN");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setViewportWidth(window.innerWidth);
      setLayoutMode(resolveEmergencyChartLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const genericEncounterHref = genericEncounterPath(encounterId);
  const erChartHref = emergencyChartPath(encounterId);
  const tabHref = (tab: string) => `${genericEncounterHref}?tab=${encodeURIComponent(tab)}`;

  const load = useCallback(async () => {
    if (!encounterId || !fid || !rolesReady || !canViewEncounterDetail) {
      if (rolesReady && !canViewEncounterDetail) {
        setEncounter(null);
        setLoading(false);
        setError(t("emergencyWorkspace.errUnauthorizedEncounter"));
      }
      return;
    }
    setError(null);
    const cacheKey = `encounter:${fid}:${encounterId}`;
    const cached = await getCachedRecord<EncounterShell>("encounter_summaries", cacheKey);
    if (cached?.data) {
      setEncounter(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`, { facilityId: fid });
      const enc = asApiObject<EncounterShell>(raw);
      if (enc) {
        setEncounter(enc);
        void setCachedRecord("encounter_summaries", cacheKey, enc, {
          facilityId: fid,
          encounterId,
          patientId: enc.patient?.id ?? undefined,
        });
      } else {
        setEncounter(null);
        setError(t("emergencyWorkspace.errEncounterUnavailable"));
      }

    } catch (e) {
      console.error(e);
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      setError(msg || t("emergencyWorkspace.errLoadEncounter"));
      const cached = await getCachedRecord<EncounterShell>("encounter_summaries", cacheKey);
      if (cached?.data) {
        setEncounter(cached.data);
        setError((msg || t("emergencyWorkspace.errCachePrefix")) + t("emergencyWorkspace.errCacheStale"));
      } else {
        setEncounter(null);
      }
    } finally {
      setLoading(false);
    }
  }, [encounterId, fid, rolesReady, canViewEncounterDetail, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Closed encounters must not open the active editable workspace for normal users. */
  useEffect(() => {
    if (!encounter?.id) return;
    if (!isEdEncounterClosedForArchive(encounter.status)) return;
    router.replace(emergencyChartPath(encounter.id));
  }, [encounter, router]);

  const onEmbeddedEncounterUpdate = useCallback(async () => {
    await load();
    setResultsRefresh((r) => r + 1);
    setTriageRefresh((r) => r + 1);
  }, [load]);

  const goToErSummaryClosure = useCallback(() => {
    setActiveSection("visitSummary");
  }, []);

  const showConfirmInpatientTransfer = useMemo(() => {
    if (!encounter || encounter.status !== "OPEN") return false;
    if ((encounter.type ?? "").trim() !== EMERGENCY_TYPE) return false;
    return parseAdmissionSummaryForChart(encounter.admissionSummaryJson) != null;
  }, [encounter]);

  const loadTriageForStrip = useCallback(async () => {
    if (!encounterId || !fid) return;
    setTriageLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId: fid });
      setTriageSnapshot(
        data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null
      );
    } catch {
      setTriageSnapshot(null);
    } finally {
      setTriageLoading(false);
    }
  }, [encounterId, fid, triageRefresh]);

  useEffect(() => {
    if (!encounterId || !fid) return;
    void loadTriageForStrip();
  }, [encounterId, fid, loadTriageForStrip]);

  const loadPatientTriageForCds = useCallback(async () => {
    const pid = encounter?.patient?.id?.trim();
    if (!fid || !pid) {
      setPatientVitalsTimeline(null);
      return;
    }
    try {
      const data = (await apiFetch(`/patients/${pid}/triage?latest=true`, {
        facilityId: fid,
      })) as PatientTriageVitalsResponse;
      setPatientVitalsTimeline({
        latest: data?.latest ?? null,
        history: Array.isArray(data?.history) ? data.history : [],
      });
    } catch {
      setPatientVitalsTimeline(null);
    }
  }, [encounter?.patient?.id, fid, triageRefresh]);

  useEffect(() => {
    void loadPatientTriageForCds();
  }, [loadPatientTriageForCds]);

  /** Keep ED vitals summary aligned when vitals are saved from this workspace or elsewhere. */
  useEffect(() => {
    const pid = encounter?.patient?.id?.trim();
    if (!pid) return;
    const onVitals = (ev: Event) => {
      const d = (ev as CustomEvent<{ patientId?: string }>).detail;
      if (d?.patientId === pid) setTriageRefresh((r) => r + 1);
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitals);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitals);
  }, [encounter?.patient?.id]);

  const encounterVitalSnapshotsNewestFirst = useMemo(() => {
    if (!patientVitalsTimeline || !encounterId) return [];
    const merged = buildVitalsTimelineNewestFirst(
      patientVitalsTimeline.latest,
      patientVitalsTimeline.history,
      []
    );
    return merged.filter((s) => s.encounterId === encounterId && hasVitalsJson(s.vitalsJson));
  }, [patientVitalsTimeline, encounterId]);

  const encounterLatestMeaningfulVital = useMemo(
    () => pickLatestMeaningfulVitalsSnapshot(encounterVitalSnapshotsNewestFirst),
    [encounterVitalSnapshotsNewestFirst]
  );

  const encounterVitalSummaryReadings = useMemo(() => {
    return snapshotsToVitalSummaryReadings(encounterVitalSnapshotsNewestFirst, language, t);
  }, [encounterVitalSnapshotsNewestFirst, language, t]);

  const encounterVitalsSnapshotsOldestFirst = useMemo(() => {
    const meaningful = encounterVitalSnapshotsNewestFirst.filter((s) =>
      hasMeaningfulVitalMeasurement(s.vitalsJson)
    );
    if (meaningful.length < 2) return null;
    return [...meaningful].sort(
      (a, b) => vitalsSnapshotMeasuredAtMs(a) - vitalsSnapshotMeasuredAtMs(b)
    );
  }, [encounterVitalSnapshotsNewestFirst]);

  const clinicalStripModel = useMemo(() => {
    const parsed = triagePreviewSliceFromTriageGet(triageSnapshot, language);
    const emptySlice = {
      chiefComplaint: "",
      onsetAt: "",
      esi: "",
      tempC: "",
      hr: "",
      rr: "",
      bpSys: "",
      bpDia: "",
      spo2: "",
      weightKg: "",
      heightCm: "",
      allergyNote: "",
      triageCompleteAt: "",
      heightFeet: "",
      heightInches: "",
    };
    if (!parsed) {
      return {
        esi: "",
        allergyText: "",
        pairs: buildErWorkspaceVitalPairs(emptySlice, language),
      };
    }
    // Prefer newest meaningful reading for the header grid so a later context-only row cannot blank it.
    const meaningful = encounterLatestMeaningfulVital?.vitalsJson;
    const sliceForPairs =
      meaningful && hasMeaningfulVitalMeasurement(meaningful)
        ? {
            ...parsed.slice,
            tempC:
              meaningful.tempC != null && meaningful.tempC !== ""
                ? String(meaningful.tempC)
                : parsed.slice.tempC,
            hr: meaningful.hr != null && meaningful.hr !== "" ? String(meaningful.hr) : parsed.slice.hr,
            rr: meaningful.rr != null && meaningful.rr !== "" ? String(meaningful.rr) : parsed.slice.rr,
            bpSys:
              meaningful.bpSys != null && meaningful.bpSys !== ""
                ? String(meaningful.bpSys)
                : parsed.slice.bpSys,
            bpDia:
              meaningful.bpDia != null && meaningful.bpDia !== ""
                ? String(meaningful.bpDia)
                : parsed.slice.bpDia,
            spo2:
              meaningful.spo2 != null && meaningful.spo2 !== ""
                ? String(meaningful.spo2)
                : parsed.slice.spo2,
            weightKg:
              meaningful.weightKg != null && meaningful.weightKg !== ""
                ? String(meaningful.weightKg)
                : parsed.slice.weightKg,
            heightCm:
              meaningful.heightCm != null && meaningful.heightCm !== ""
                ? String(meaningful.heightCm)
                : parsed.slice.heightCm,
          }
        : hasMeaningfulVitalMeasurement({
            tempC: parsed.slice.tempC,
            hr: parsed.slice.hr,
            rr: parsed.slice.rr,
            bpSys: parsed.slice.bpSys,
            bpDia: parsed.slice.bpDia,
            spo2: parsed.slice.spo2,
            weightKg: parsed.slice.weightKg,
            heightCm: parsed.slice.heightCm,
          })
          ? parsed.slice
          : { ...parsed.slice, tempC: "", hr: "", rr: "", bpSys: "", bpDia: "", spo2: "", weightKg: "", heightCm: "" };

    return {
      esi: parsed.slice.esi,
      allergyText: buildAllergyStripSummary(parsed.slice, parsed.er, language),
      pairs: buildErWorkspaceVitalPairs(sliceForPairs as typeof parsed.slice, language),
    };
  }, [triageSnapshot, language, encounterLatestMeaningfulVital]);

  const erCdsRecommendations = useMemo(
    () =>
      buildErCdsRecommendations({
        encounterType: encounter?.type,
        triage: triageSnapshot,
        encounterVitalsSnapshotsOldestFirst,
      }),
    [encounter?.type, triageSnapshot, encounterVitalsSnapshotsOldestFirst]
  );

  const mseAssistContext = useMemo(
    () =>
      encounter && encounter.type === EMERGENCY_TYPE
        ? {
            encounterType: encounter.type,
            triage: triageSnapshot,
            encounterLine: {
              visitReason: encounter.visitReason,
              chiefComplaint: encounter.chiefComplaint,
            },
            cdsRecommendationIds: erCdsRecommendations.map((r) => r.id),
          }
        : null,
    [encounter, triageSnapshot, erCdsRecommendations]
  );

  /** CDS v2 — one-shot UI intent for order-assist preselection (never auto-submits). */
  const [cdsIntent, setCdsIntent] = useState<string | null>(null);

  const handleErCdsNavigate = useCallback(
    (section: ErCdsNavigableSection, recommendation: ErCdsRecommendation) => {
      setActiveSection(section);
      if (recommendation.preselectKey) {
        setCdsIntent(recommendation.preselectKey);
      } else {
        setCdsIntent(null);
      }
    },
    []
  );

  const handleConsumeIntent = useCallback(() => {
    setCdsIntent(null);
  }, []);

  const complaintLine = useMemo(() => {
    if (!encounter) return t("common.dash");
    const raw =
      (encounter.visitReason || "").trim() || (encounter.chiefComplaint || "").trim();
    return raw || t("common.dash");
  }, [encounter, t]);

  const tDxEntry = useCallback((key: string) => t(key), [t]);

  useEffect(() => {
    if (!rolesReady) return;
    if (isErWorkspaceSectionVisible(activeSection, edWorkspaceRoleInput)) return;
    setActiveSection(edWorkspaceTileToSection(getDefaultEdWorkspaceTile(edWorkspaceRoleInput)));
  }, [rolesReady, activeSection, edWorkspaceRoleInput]);

  const sectionTitle = useMemo(
    (): Record<ErWorkspaceSection, string> => ({
      triage: t("emergencyWorkspace.sectionTitle.triage"),
      visitSummary: t("emergencyWorkspace.sectionTitle.visitSummary"),
      results: t("emergencyWorkspace.sectionTitle.results"),
      mar: t("emergencyWorkspace.sectionTitle.mar"),
      orders: t("emergencyWorkspace.sectionTitle.orders"),
      diagnostics: t("emergencyWorkspace.sectionTitle.diagnostics"),
      clinicalData: t("emergencyWorkspace.sectionTitle.clinicalData"),
      notes: t("emergencyWorkspace.sectionTitle.notes"),
      nursing: t("emergencyWorkspace.sectionTitle.nursing"),
      providerMse: t("emergencyWorkspace.sectionTitle.providerMse"),
      disposition: t("emergencyWorkspace.sectionTitle.disposition"),
    }),
    [t]
  );

  const erDashboardTilesAll = useMemo(
    (): ErDashboardTile[] => [
      {
        kind: "section",
        id: "triage",
        accent: "#b91c1c",
        initials: "T",
        ariaLabel: t("emergencyWorkspace.tileAria.triage"),
        disabled: !canFetchEncounterTriage,
      },
      {
        kind: "section",
        id: "providerMse",
        accent: "#4f46e5",
        initials: "ME",
        ariaLabel: t("emergencyWorkspace.tileAria.providerMse"),
        disabled: !showNursingTab,
      },
      {
        kind: "section",
        id: "orders",
        accent: "#7c3aed",
        initials: "O",
        ariaLabel: t("emergencyWorkspace.tileAria.orders"),
        disabled: false,
      },
      {
        kind: "section",
        id: "mar",
        accent: "#059669",
        initials: "M",
        ariaLabel: t("emergencyWorkspace.tileAria.mar"),
        disabled: !canFetchMarTab,
      },
      {
        kind: "section",
        id: "results",
        accent: "#6366f1",
        initials: "R",
        ariaLabel: t("emergencyWorkspace.tileAria.results"),
        disabled: false,
      },
      {
        kind: "section",
        id: "diagnostics",
        accent: "#9333ea",
        initials: "Dx",
        ariaLabel: t("emergencyWorkspace.tileAria.diagnostics"),
        disabled: false,
      },
      {
        kind: "section",
        id: "clinicalData",
        accent: "#0284c7",
        initials: "CD",
        ariaLabel: t("emergencyWorkspace.tileAria.clinicalData"),
        disabled: false,
        dataTestId: "ed-dashboard-tile-clinical-data",
      },
      {
        kind: "section",
        id: "nursing",
        accent: "#0ea5e9",
        initials: "NA",
        ariaLabel: t("emergencyWorkspace.tileAria.nursing"),
        disabled: !showNursingTab,
      },
      {
        kind: "section",
        id: "notes",
        accent: "#475569",
        initials: "N",
        ariaLabel: t("emergencyWorkspace.tileAria.notes"),
        disabled: false,
      },
      {
        kind: "section",
        id: "disposition",
        accent: "#94a3b8",
        initials: "D",
        ariaLabel: t("emergencyWorkspace.tileAria.disposition"),
        disabled: false,
      },
      {
        kind: "section",
        id: "visitSummary",
        accent: "#0f172a",
        initials: "S",
        ariaLabel: t("emergencyWorkspace.tileAria.visitSummary"),
        disabled: false,
      },
    ],
    [t, canFetchEncounterTriage, showNursingTab, canFetchMarTab]
  );

  const erDashboardTiles = useMemo(
    () => erDashboardTilesAll.filter((tile) => visibleEdWorkspaceSections.has(tile.id)),
    [erDashboardTilesAll, visibleEdWorkspaceSections]
  );

  const closeCreateDx = useCallback(() => {
    if (dxSubmitting) return;
    setShowCreateDx(false);
    setDxError(null);
  }, [dxSubmitting]);

  if (!rolesReady || !fid) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{t("emergencyWorkspace.loading")}</div>
    );
  }

  if (!canViewEncounterDetail) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? t("emergencyWorkspace.errUnauthorizedShort")}</p>
      </div>
    );
  }

  if (!encounter && loading) {
    return (
      <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", color: "#64748b" }}>
        <p style={{ margin: "0 0 12px 0", fontSize: 13 }}>
          <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            {t("emergencyWorkspace.backTrackboard")}
          </Link>
        </p>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "1.35rem", fontWeight: 600, color: "#0f172a" }}>
          {t("emergencyWorkspace.pageTitle")}
        </h1>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            background: "#fff",
            padding: 20,
            fontSize: 14,
          }}
        >
          {t("emergencyWorkspace.loading")}
        </div>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? t("emergencyWorkspace.errEncounterNotFound")}</p>
        <p style={{ margin: "16px 0 0 0" }}>
          <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600 }}>
            {t("emergencyWorkspace.backTrackboardLong")}
          </Link>
        </p>
      </div>
    );
  }

  if (isEdEncounterClosedForArchive(encounter.status)) {
    return (
      <div
        data-testid="ed-active-workspace-closed-redirect"
        style={{ padding: 24, fontSize: 14, color: "#64748b" }}
      >
        {t("common.loading")}
      </div>
    );
  }

  const patient = encounter.patient;
  const statusKey = (encounter.status ?? "").trim() || "OPEN";
  const typeKey = (encounter.type ?? "").trim() || "—";
  const billingClassKey = String((encounter as { billingClassification?: string }).billingClassification ?? "").trim();
  const encounterRoomContext = {
    roomLabel: encounter.roomLabel,
    type: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
    governedRoomDisplay: encounter.governedRoomDisplay,
    governedRoomUnit: encounter.governedRoomUnit,
    governedRoomHasAssignment: encounter.governedRoomHasAssignment,
  };
  const isEmergencyType = encounter.type === EMERGENCY_TYPE;
  const isLocked = isEncounterLocked(encounter);
  const canAssignRoom =
    canAssignEncounterRoom(roles) && encounter.status === "OPEN" && !isLocked;
  const vitalsQuickEditEnabled =
    canFetchEncounterTriage && encounter.status === "OPEN" && !isLocked;

  const canEditOperationalEncounter = roles.includes("RN") || roles.includes("ADMIN");
  const canChangeBillingClassification =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    roles.includes("FRONT_DESK") ||
    roles.includes("BILLING");
  const physicianAssignedForOperational =
    encounter.physicianAssigned?.id != null && String(encounter.physicianAssigned.id).trim() !== ""
      ? {
          id: String(encounter.physicianAssigned.id),
          firstName: encounter.physicianAssigned.firstName ?? "",
          lastName: encounter.physicianAssigned.lastName ?? "",
        }
      : null;

  const headerEsiLevel = esiLevelFromUnknown(clinicalStripModel.esi.trim());

  const formatEncounterDt = (iso: string | null | undefined) =>
    iso ? formatEncounterChromeDateTime(iso, language) : t("common.dash");

  const usesBottomRail = emergencyChartUsesBottomRail(layoutMode);
  const touchScrollPadding = clinicalSafeScrollPaddingStyle(usesBottomRail);
  const usesTouchActionBar = layoutMode !== "desktopSplit";
  const compactTabletHeader = emergencyChartUsesCompactTabletHeader(layoutMode, viewportWidth);
  const vitalsDisplayMode = emergencyChartVitalsDisplayMode(layoutMode, viewportWidth);

  return (
    <div style={{ ...emergencyChartPageShellStyle(layoutMode), ...touchScrollPadding }}>
      <div style={{ width: "100%", maxWidth: "none", minWidth: 0, boxSizing: "border-box" }}>
        <MedoraCardActionsMediaStyle />

        <header style={{ marginBottom: compactTabletHeader ? 10 : 20 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
            <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyWorkspace.backTrackboard")}
            </Link>
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: compactTabletHeader ? "1.25rem" : "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("emergencyWorkspace.pageTitle")}
          </h1>
        </header>

        {!isEmergencyType && (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>{t("emergencyWorkspace.notEmergencyBanner")}</p>
          </div>
        )}

        {error && (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fecaca", backgroundColor: "#fef2f2" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>{error}</p>
          </div>
        )}

        <div
          style={{
            ...emergencyChartPatientSummaryOuterStyle(layoutMode, compactTabletHeader),
            ...emergencyChartPatientSummaryShellStyle(layoutMode, viewportWidth),
          }}
          data-compact-tablet-header={compactTabletHeader ? "true" : "false"}
        >
        <MedoraCard leftAccentColor="#2563eb" variant="default">
          {compactTabletHeader ? (
            <div style={emergencyChartCompactCardInnerPaddingStyle()}>
              <EmergencyWorkspaceCompactTabletSummary
                patient={patient ?? undefined}
                encounterId={encounterId}
                fid={fid}
                patientInitials={patientInitials(patient ?? undefined)}
                headerEsiLevel={headerEsiLevel}
                triageLoading={triageLoading}
                fullPatientName={fullPatientName(patient ?? undefined, t)}
                complaintLine={complaintLine}
                encounterRoom={encounterRoomContext}
                statusKey={statusKey}
                typeKey={typeKey}
                billingClassKey={billingClassKey}
                statusSoft={statusSoft}
                vitalPairs={clinicalStripModel.pairs}
                allergyText={clinicalStripModel.allergyText}
                vitalsDisplayMode={vitalsDisplayMode}
                vitalsQuickEditEnabled={vitalsQuickEditEnabled}
                onVitalsEdit={() => {
                  setShowQuickVitals(true);
                  setShowVitalsHistory(true);
                }}
                vitalsEditAriaLabel={t("erQuickVitals.vitalsEditAria")}
                canDocumentIvAccess={canDocumentIvAccess}
                showQuickVitals={showQuickVitals}
                setShowQuickVitals={setShowQuickVitals}
                showIvAccessModal={showIvAccessModal}
                setShowIvAccessModal={setShowIvAccessModal}
                showProcedureLauncherModal={showProcedureLauncherModal}
                setShowProcedureLauncherModal={setShowProcedureLauncherModal}
                triageSnapshot={triageSnapshot}
                onVitalsSaved={async () => {
                  setTriageRefresh((r) => r + 1);
                }}
                onIvRecorded={() => setResultsRefresh((r) => r + 1)}
                onProcedureRecorded={() => setResultsRefresh((r) => r + 1)}
                encounterOpen={encounter.status === "OPEN"}
                canChangeBillingClassification={canChangeBillingClassification}
                onBillingUpdated={load}
                showOperationalPanel={showOperationalPanel}
                setShowOperationalPanel={setShowOperationalPanel}
                onRoomClick={
                  canAssignRoom && fid ? () => setShowRoomAssignmentModal(true) : undefined
                }
                roomButtonTitle={t("roomAssignment.changeRoomTooltip")}
                erChartHref={erChartHref}
                isLocked={isLocked}
                encounterStatus={encounter.status ?? "OPEN"}
                t={t}
              />
            </div>
          ) : (
          <MedoraCardInner>
            <div style={clinicalPatientSummaryStackStyle(emergencyChartViewportModeFromLayout(layoutMode))}>
              {/* Gauche : initiales + ESI sous le cercle (pas de gros badge séparé) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                  width: 48,
                }}
              >
                <div style={EMERGENCY_AVATAR_CIRCLE_STYLE} aria-hidden>
                  {patientInitials(patient ?? undefined)}
                </div>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  ESI
                </span>
                <span style={esiUnderAvatarNumberStyle(triageLoading ? null : headerEsiLevel)}>
                  {triageLoading ? "…" : esiDisplayChar(headerEsiLevel)}
                </span>
              </div>

              {/* Centre : identité patient */}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <MedoraCardTitle
                  title={fullPatientName(patient ?? undefined, t)}
                  subline={
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("printOutput.patientChart.nirMrn")}</span>{" "}
                      {(patient?.mrn ?? patient?.nationalId ?? "").trim() || t("common.dash")}
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.ageSexLabel")}</span>{" "}
                      {formatPatientAgeSexLine(
                        patient?.dob ?? null,
                        patient?.sexAtBirth ?? null,
                        patient?.sex ?? null,
                        t
                      )}
                    </p>
                  }
                />
                <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: 12 }}>
                    {t("emergencyTrackboard.chiefComplaintShort")}
                  </span>
                  {" — "}
                  {complaintLine}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                  <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.arrivalLabel")}</span>{" "}
                  {formatEncounterDt(encounter.createdAt ?? null)}
                  {encounter.admittedAt ? (
                    <>
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyWorkspace.admissionLabel")}</span>{" "}
                      {formatEncounterDt(encounter.admittedAt)}
                    </>
                  ) : null}
                </p>
              </div>

              {/* SV + allergies : cartes compactes */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: "1 1 320px",
                  minWidth: 280,
                  alignItems: "stretch",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
                  <EmergencyWorkspaceVitalsCard
                    vitalPairs={clinicalStripModel.pairs}
                    loading={triageLoading}
                    editable={vitalsQuickEditEnabled}
                    onEditClick={
                      vitalsQuickEditEnabled
                        ? () => {
                            setShowQuickVitals(true);
                            setShowVitalsHistory(true);
                          }
                        : undefined
                    }
                    editAriaLabel={t("erQuickVitals.vitalsEditAria")}
                    displayMode={vitalsDisplayMode}
                  />
                  <EmergencyWorkspaceAllergiesCard
                    allergySummary={clinicalStripModel.allergyText}
                    loading={triageLoading}
                  />
                  {canDocumentIvAccess && fid ? (
                    <button
                      type="button"
                      title={t("erIvAccess.openTooltip")}
                      aria-label={t("erIvAccess.openAria")}
                      disabled={
                        triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter
                      }
                      onClick={() => setShowIvAccessModal(true)}
                      style={{
                        alignSelf: "stretch",
                        minWidth: 44,
                        width: 44,
                        padding: 0,
                        borderRadius: 10,
                        border: "1px solid #e9d5ff",
                        backgroundColor: "#faf5ff",
                        fontSize: 20,
                        lineHeight: 1,
                        cursor:
                          triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter ? 0.45 : 1,
                      }}
                    >
                      💉
                    </button>
                  ) : null}
                  {canDocumentIvAccess && fid ? (
                    <button
                      type="button"
                      title={t("erProcedureLauncher.openTooltip")}
                      aria-label={t("erProcedureLauncher.openAria")}
                      disabled={
                        triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter
                      }
                      onClick={() => setShowProcedureLauncherModal(true)}
                      style={{
                        alignSelf: "stretch",
                        minWidth: 44,
                        width: 44,
                        padding: 0,
                        borderRadius: 10,
                        border: "1px solid #fcd34d",
                        backgroundColor: "#fffbeb",
                        fontSize: 20,
                        lineHeight: 1,
                        cursor:
                          triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          triageLoading || encounter?.status !== "OPEN" || isLocked || !encounter ? 0.45 : 1,
                      }}
                    >
                      🧰
                    </button>
                  ) : null}
                </div>
                {(showVitalsHistory || showQuickVitals) && fid ? (
                  <div style={{ minWidth: 0, maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                    <VitalSummaryPanel
                      readings={encounterVitalSummaryReadings}
                      latestReadingId={
                        encounterLatestMeaningfulVital
                          ? snapshotKey(encounterLatestMeaningfulVital)
                          : undefined
                      }
                      onClose={() => {
                        setShowVitalsHistory(false);
                        if (!vitalsQuickEditEnabled) setShowQuickVitals(false);
                      }}
                      onViewFullHistory={
                        patient?.id
                          ? () => {
                              router.push(`/app/patients/${patient.id}`);
                            }
                          : undefined
                      }
                      actionsEnabled={Boolean(vitalsQuickEditEnabled && encounter?.status === "OPEN" && !isLocked)}
                      onEditReading={
                        vitalsQuickEditEnabled
                          ? (r) => setEditVitalReading(r)
                          : undefined
                      }
                      onVoidReading={
                        vitalsQuickEditEnabled
                          ? (r) => setVoidVitalReading(r)
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                {showQuickVitals && vitalsQuickEditEnabled && fid ? (
                  <EmergencyQuickVitalsEditor
                    open={showQuickVitals}
                    onClose={() => setShowQuickVitals(false)}
                    encounterId={encounterId}
                    facilityId={fid}
                    patientId={patient?.id}
                    triageSnapshot={triageSnapshot}
                    onSaved={async () => {
                      setTriageRefresh((r) => r + 1);
                      setShowVitalsHistory(true);
                    }}
                  />
                ) : null}
                {fid ? (
                  <>
                    <VitalReadingEditModal
                      open={Boolean(editVitalReading)}
                      reading={editVitalReading}
                      encounterId={encounterId}
                      facilityId={fid}
                      onClose={() => setEditVitalReading(null)}
                      onDone={async () => {
                        setTriageRefresh((r) => r + 1);
                      }}
                    />
                    <VitalReadingVoidModal
                      open={Boolean(voidVitalReading)}
                      reading={voidVitalReading}
                      encounterId={encounterId}
                      facilityId={fid}
                      onClose={() => setVoidVitalReading(null)}
                      onDone={async () => {
                        setTriageRefresh((r) => r + 1);
                      }}
                    />
                  </>
                ) : null}
                {showIvAccessModal && fid ? (
                  <EmergencyIvAccessModal
                    open={showIvAccessModal}
                    onClose={() => setShowIvAccessModal(false)}
                    encounterId={encounterId}
                    facilityId={fid}
                    onRecorded={() => setResultsRefresh((r) => r + 1)}
                  />
                ) : null}
                {showProcedureLauncherModal && fid ? (
                  <EmergencyProcedureLauncherModal
                    open={showProcedureLauncherModal}
                    onClose={() => setShowProcedureLauncherModal(false)}
                    encounterId={encounterId}
                    facilityId={fid}
                    onRecorded={() => setResultsRefresh((r) => r + 1)}
                  />
                ) : null}
              </div>

              {/* Droite : salle (haut) + statut + lien — style salle distinct d’ESI (bleu, pas rouge) */}
              <div style={emergencyChartHeaderRailStyle(layoutMode)}>
                <EncounterGovernedRoomChip
                  encounter={encounterRoomContext}
                  clickable={canAssignRoom}
                  onClick={
                    canAssignRoom && fid ? () => setShowRoomAssignmentModal(true) : undefined
                  }
                  labelKey="printOutput.patientChart.room"
                />
                <MedoraCardBadgeRow marginTop={0}>
                  <MedoraCardBadge soft={statusSoft(statusKey)}>{tEncounterStatus(t, statusKey)}</MedoraCardBadge>
                  <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                    {tEncounterType(t, typeKey)}
                  </MedoraCardBadge>
                  {fid ? (
                    <BillingClassificationBadgeInteractive
                      encounterId={encounter.id}
                      facilityId={fid}
                      classification={billingClassKey}
                      encounterOpen={encounter.status === "OPEN"}
                      canEdit={canChangeBillingClassification}
                      onUpdated={load}
                    />
                  ) : null}
                </MedoraCardBadgeRow>
                <div style={clinicalStickyActionBarStyle(usesTouchActionBar)}>
                <Link
                  href={erChartHref}
                  style={clinicalThumbReachActionStyle(
                    emergencyChartTouchLinkStyle({
                      ...linkPill,
                      alignSelf: layoutMode === "mobileStacked" ? "stretch" : "flex-end",
                      fontSize: 13,
                      padding: "7px 12px",
                      textDecoration: "none",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      backgroundColor: "#eff6ff",
                    })
                  )}
                >
                  {t("emergencyWorkspace.linkFullEncounter")}
                </Link>
                </div>
              </div>
            </div>
          </MedoraCardInner>
          )}
        </MedoraCard>
        </div>

        {erCdsRecommendations.length > 0 && (
          <ErClinicalDecisionSupportPanel
            recommendations={erCdsRecommendations}
            onNavigate={handleErCdsNavigate}
          />
        )}

        {showOperationalPanel && fid ? (
          <EncounterOperationalPanel
            encounterId={encounter.id}
            facilityId={fid}
            canEdit={canEditOperationalEncounter && encounter.status === "OPEN"}
            roomLabel={encounter.roomLabel}
            physicianAssigned={physicianAssignedForOperational}
            showConfirmInpatientTransfer={showConfirmInpatientTransfer}
            nursingAssessment={encounter.nursingAssessment}
            onUpdated={async () => {
              setShowOperationalPanel(false);
              await load();
            }}
          />
        ) : null}

        <EmergencyErWorkspaceSectionNav
          tiles={erDashboardTiles}
          activeSection={activeSection}
          onSelect={setActiveSection}
          layoutMode={layoutMode}
          heading={t("emergencyWorkspace.dashboardHeading")}
        />

        <section
          aria-label={t("emergencyWorkspace.activeZoneAria")}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
            width: "100%",
            ...emergencyChartWorkspaceContentContainmentStyle(compactTabletHeader),
          }}
          data-testid="emergency-active-workspace-content"
          data-layout-mode={layoutMode}
          data-compact-tablet-header={compactTabletHeader ? "true" : "false"}
        >
          {activeSection !== "mar" ? (
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
              {sectionTitle[activeSection]}
            </h2>
          ) : null}

          {activeSection === "visitSummary" ? (
            <EmergencyErSummaryClosureSurface
              encounterId={encounterId}
              facilityId={fid}
              facilityName={facilityName}
              facilityCareProfileJson={careProfileJson}
              facilityCountry={facilityCountry}
              encounter={encounter}
              triageSnapshot={triageSnapshot}
              resultsRefresh={resultsRefresh}
              resultsTabHref={tabHref("results")}
              diagnosticsTabHref={tabHref("diagnostics")}
              canEditNursingDischarge={canEditNursingDischarge}
              canEditMedicalDischarge={canEditMedicalDischarge}
              onReload={onEmbeddedEncounterUpdate}
              ivAccessFetchEnabled={canDocumentIvAccess}
              proceduresFetchEnabled={canDocumentIvAccess}
              medicationMarSummaryEnabled
              summaryReadOnly={summaryReadOnly}
            />
          ) : null}

          {activeSection === "diagnostics" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <EncounterDiagnosticsPanel
                key={refreshTick}
                encounterId={encounter.id}
                patientId={encounter.patient?.id ?? ""}
                facilityId={fid}
                canDocumentDiagnoses={canDocumentEncounterDiagnoses}
                isLocked={isLocked}
              />
            </div>
          ) : null}

          {activeSection === "triage" && canFetchEncounterTriage ? (
            <EmergencyTriagePanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              isLocked={isLocked}
              encounterTriageTabHref={tabHref("triage")}
              patientChartHref={
                encounter.patient?.id ? `/app/patients/${encodeURIComponent(encounter.patient.id)}` : undefined
              }
              onSaved={onEmbeddedEncounterUpdate}
            />
          ) : null}

          {activeSection === "triage" && !canFetchEncounterTriage ? (
            <MedoraCard leftAccentColor="#64748b" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="T">
                  <MedoraCardTitle
                    title={t("emergencyWorkspace.triageCardTitle")}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyWorkspace.triageCardSubline")}</p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("triage")} style={linkPill}>
                    {t("emergencyWorkspace.triageOpenLink")}
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "results" ? (
            <EmergencyResultsPanel
              encounterId={encounterId}
              facilityId={fid}
              refreshToken={resultsRefresh}
              canAcknowledgeResults={canAcknowledgeResults}
              patient={encounter?.patient ?? null}
              encounterMeta={
                encounter?.id && encounter.createdAt
                  ? {
                      id: encounter.id,
                      createdAt: encounter.createdAt,
                      physicianAssigned: encounter.physicianAssigned ?? null,
                    }
                  : null
              }
              facilityName={facilityName}
              facility={printFacilityInfoFromEnterpriseSource({
                facilityName,
                facilityCountry,
                careProfileJson,
              })}
            />
          ) : null}

          {activeSection === "mar" && canFetchMarTab ? (
            <MedoraCard leftAccentColor="#059669" variant="default">
              <MedoraCardInner>
                <MedoraCardTitle title={t("emergencyWorkspace.marTitle")} />
                <div style={{ width: "100%", marginTop: 8 }}>
                  <MedicationAdministrationTab
                    encounterId={encounterId}
                    facilityId={fid}
                    currentUserId={userId}
                    encounterStatus={encounter.status ?? "OPEN"}
                    providerDocumentationStatus={encounter.providerDocumentationStatus}
                    roleCodes={roles}
                    facilityTimeZone={facilityTimeZone}
                    embeddedWorkspaceLayout
                  />
                </div>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "mar" && !canFetchMarTab ? (
            <MedoraCard leftAccentColor="#059669" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title={t("emergencyWorkspace.marUnavailableTitle")}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyWorkspace.marUnavailableSubline")}</p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("mar")} style={linkPill}>
                    {t("emergencyWorkspace.marTabLink")}
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "orders" ? (
            <EmergencyErOrdersPanel
              encounterId={encounterId}
              facilityId={fid}
              canPrescribe={canPrescribe}
              encounterSigned={
                encounter?.providerDocumentationStatus === "SIGNED" || isLocked
              }
              encounterForOrderModal={encounter ? { patient: encounter.patient } : null}
              onRefetchEncounter={load}
              onOrdersCreated={async () => {
                setResultsRefresh((r) => r + 1);
              }}
              encounterType={encounter?.type}
              vitalsJsonForTraumaProtocol={triageSnapshot?.vitalsJson}
              roles={roles}
              cdsIntent={cdsIntent}
              onConsumeIntent={handleConsumeIntent}
            />
          ) : null}

          {activeSection === "clinicalData" ? (
            <EmergencyClinicalDataPanel
              encounterId={encounterId}
              facilityId={fid}
              facilityTimeZone={facilityTimeZone}
            />
          ) : null}

          {activeSection === "notes" ? (
            <EmergencyErNotesPanel
              encounterId={encounterId}
              facilityId={fid}
              status={encounter.status}
              isLocked={isLocked}
              roleCodes={roles}
              onSaved={onEmbeddedEncounterUpdate}
            />
          ) : null}

          {activeSection === "nursing" && showNursingTab ? (
            <div data-testid="emergency-nursing-assessment-workspace" style={{ display: "grid", gap: 12 }}>
              <EmergencyNursingReassessmentPanel
                encounterId={encounterId}
                facilityId={fid}
                encounter={encounter}
                isLocked={isLocked}
                onSaved={onEmbeddedEncounterUpdate}
                nursingTabHref={tabHref("nursing")}
              />
              <ErHandoffV1NursingSection
                encounter={encounter}
                encounterId={encounterId}
                facilityId={fid}
                isLocked={isLocked}
                canEditErHandoff={canEditOperationalEncounter && encounter.status === "OPEN"}
                onUpdated={onEmbeddedEncounterUpdate}
              />
              <EmergencyErNursingHandoffPanel
                encounter={encounter}
                encounterId={encounterId}
                facilityId={fid}
                onSaved={onEmbeddedEncounterUpdate}
                canRecordDischargeSortieExecution={canRecordDischargeSortieExecution}
                onSummaryClosureClick={goToErSummaryClosure}
                facilityName={facilityName}
              />
            </div>
          ) : null}

          {activeSection === "nursing" && !showNursingTab ? (
            <MedoraCard leftAccentColor="#0ea5e9" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="I">
                  <MedoraCardTitle
                    title={t("emergencyWorkspace.nursingDeniedTitle")}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyWorkspace.nursingDeniedSubline")}</p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("nursing")} style={linkPill}>
                    {t("emergencyWorkspace.nursingTabLink")}
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "providerMse" && showNursingTab ? (
            <EmergencyProviderMsePanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              isLocked={isLocked}
              onSaved={onEmbeddedEncounterUpdate}
              clinicTabHref={tabHref("clinic")}
              erChartHref={erChartHref}
              genericEncounterHref={genericEncounterHref}
              mseAssistContext={mseAssistContext}
            />
          ) : null}

          {activeSection === "providerMse" && !showNursingTab ? (
            <MedoraCard leftAccentColor="#4f46e5" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title={t("emergencyWorkspace.mseDeniedTitle")}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyWorkspace.mseDeniedSubline")}</p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("clinic")} style={linkPill}>
                    {t("emergencyWorkspace.mseTabLink")}
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "disposition" ? (
            <>
              <EmergencyDispositionPanel
                encounterId={encounterId}
                facilityId={fid}
                encounter={encounter}
                isLocked={isLocked}
                onSaved={onEmbeddedEncounterUpdate}
                canPrescribe={canPrescribe}
                canEditNursingDischarge={canEditNursingDischarge}
                canEditMedicalDischarge={canEditMedicalDischarge}
                facilityName={facilityName}
              />
              {canRecordDischargeSortieExecution && showHomeNursingDischargeExecution ? (
                <div
                  data-testid="ed-disposition-nursing-execution"
                  style={{ ...edBoardSectionStyle, marginTop: 12 }}
                >
                  <p style={edSectionHeadingStyle}>{t("emergencyDisposition.nursingExecutionTitle")}</p>
                  <NursingDischargeExecutionSection
                    encounterId={encounterId}
                    facilityId={fid}
                    patientId={patient?.id}
                    nursingAssessment={encounter.nursingAssessment}
                    onSaved={onEmbeddedEncounterUpdate}
                    canEdit={canRecordDischargeSortieExecution && encounter.status === "OPEN"}
                  />
                </div>
              ) : null}
              {canRecordDischargeSortieExecution &&
              isHomeNursingForbiddenForPathway(dispositionNursingPathway) ? (
                <div
                  data-testid="ed-disposition-nursing-execution"
                  style={{ ...edBoardSectionStyle, marginTop: 12 }}
                >
                  <p style={edSectionHeadingStyle}>{t("emergencyDisposition.nursingExecutionTitle")}</p>
                  <AdaptiveDispositionNursingSection
                    encounterId={encounterId}
                    facilityId={fid}
                    encounter={encounter}
                    admissionDecisionSigned={admissionDecisionSigned}
                    onSaved={onEmbeddedEncounterUpdate}
                    canEdit={canRecordDischargeSortieExecution && encounter.status === "OPEN"}
                  />
                </div>
              ) : null}
            </>
          ) : null}

        </section>

        {showCreateDx && encounter ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="er-create-dx-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCreateDx();
            }}
          >
            <div
              style={{ ...shellBox, maxWidth: 520, width: "100%" }}
              onClick={(ev) => ev.stopPropagation()}
            >
              <h2 id="er-create-dx-title" style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
                {t("emergencyWorkspace.createDxTitle")}
              </h2>
              <Icd10DiagnosisEntryPanel
                facilityId={fid}
                language={language}
                t={tDxEntry}
                showOnsetNotes
                saving={dxSubmitting}
                onError={setDxError}
                onPickCatalog={async (hit, extra) => {
                  setDxSubmitting(true);
                  setDxError(null);
                  try {
                    await createDiagnosis(fid, encounter.id, {
                      icd10CatalogId: hit.id,
                      code: hit.code,
                      description: hit.shortDescription,
                      onsetDate: extra?.onsetDate,
                      notes: extra?.notes,
                    });
                    setShowCreateDx(false);
                    setRefreshTick((prev) => prev + 1);
                  } catch (e) {
                    console.error(e);
                    setDxError(
                      normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
                        t("emergencyWorkspace.errSaveDx")
                    );
                  } finally {
                    setDxSubmitting(false);
                  }
                }}
                onSubmitManual={async (payload) => {
                  setDxSubmitting(true);
                  setDxError(null);
                  try {
                    await createDiagnosis(fid, encounter.id, {
                      code: payload.code,
                      description: payload.description,
                      onsetDate: payload.onsetDate,
                      notes: payload.notes,
                      manualNonCatalog: true,
                    });
                    setShowCreateDx(false);
                    setRefreshTick((prev) => prev + 1);
                  } catch (e) {
                    console.error(e);
                    setDxError(
                      normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
                        t("emergencyWorkspace.errSaveDx")
                    );
                  } finally {
                    setDxSubmitting(false);
                  }
                }}
              />
              {dxError ? (
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "#b91c1c" }}>{dxError}</p>
              ) : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={closeCreateDx}
                  disabled={dxSubmitting}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#475569",
                    cursor: dxSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {t("emergencyWorkspace.createDxCancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <EmergencyErWorkspaceBottomRail
          tiles={erDashboardTiles}
          activeSection={activeSection}
          onSelect={setActiveSection}
          layoutMode={layoutMode}
          ariaLabel={t("emergencyWorkspace.dashboardHeading")}
        />
      </div>

      {fid && encounter && showRoomAssignmentModal ? (
        <RoomAssignmentModal
          open
          facilityId={fid}
          encounter={{
            id: encounter.id,
            roomLabel: encounter.roomLabel,
            type: encounter.type ?? EMERGENCY_TYPE,
            admissionSummaryJson: encounter.admissionSummaryJson,
          }}
          onClose={() => setShowRoomAssignmentModal(false)}
          onSaved={(patch) => {
            setEncounter((prev) =>
              prev ? applyEncounterRoomAssignmentUpdate(prev, patch) : prev
            );
            if (fid) {
              dispatchEncounterRoomAssignmentRefresh({
                encounterId: encounter.id,
                facilityId: fid,
                patch,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
