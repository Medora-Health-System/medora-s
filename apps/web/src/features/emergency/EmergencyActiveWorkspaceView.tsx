"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import type { PatientTriageVitalsResponse } from "@/lib/patientVitals";
import {
  buildVitalsTimelineNewestFirst,
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
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
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { emergencyChartPath, genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { EncounterOperationalPanel } from "@/components/encounters/EncounterOperationalPanel";
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

const EMERGENCY_TYPE = "EMERGENCY" as const;

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

const DASHBOARD_LABELS: Record<string, string> = {
  T: "Triage",
  ME: "Medical Exam",
  O: "Orders",
  M: "Medications",
  R: "Results",
  Dx: "Diagnostics",
  NA: "Nurse Assessment",
  N: "Notes",
  D: "Disposition",
  S: "Summary",
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

/** Zones du tableau de bord urgences (navigation locale + zone active). */
export type ErWorkspaceSection =
  | "triage"
  | "visitSummary"
  | "results"
  | "mar"
  | "orders"
  | "diagnostics"
  | "notes"
  | "nursing"
  | "providerMse"
  | "disposition";

type ErDashboardTile = {
  kind: "section";
  id: ErWorkspaceSection;
  accent: string;
  initials: string;
  ariaLabel: string;
  disabled: boolean;
};

export function EmergencyActiveWorkspaceView() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useI18n();
  const encounterId = params.id as string;
  const { facilityId: facilityIdFromHook, facilities, roles, ready: rolesReady, canPrescribe } =
    useFacilityAndRoles();
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
  const [showIvAccessModal, setShowIvAccessModal] = useState(false);
  const [showProcedureLauncherModal, setShowProcedureLauncherModal] = useState(false);

  const [activeSection, setActiveSection] = useState<ErWorkspaceSection>("triage");

  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOperationalPanel, setShowOperationalPanel] = useState(false);
  const [showCreateDx, setShowCreateDx] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dxSubmitting, setDxSubmitting] = useState(false);
  const [dxError, setDxError] = useState<string | null>(null);

  const fid = facilityId || facilityIdFromHook;
  const facilityName = facilities.find((x) => x.id === fid)?.name ?? null;

  const canViewEncounterDetail =
    roles.includes("FRONT_DESK") ||
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY");

  const canFetchEncounterTriage =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

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

  const canDocumentIvAccess =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY") ||
    roles.includes("ADMIN");

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
    setLoading(true);
    setError(null);
    const cacheKey = `encounter:${fid}:${encounterId}`;
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
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null);
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

  const encounterVitalSummaryReadings = useMemo(() => {
    if (!patientVitalsTimeline || !encounterId) return [];
    const merged = buildVitalsTimelineNewestFirst(
      patientVitalsTimeline.latest,
      patientVitalsTimeline.history,
      []
    );
    const forEnc = merged.filter((s) => s.encounterId === encounterId && hasVitalsJson(s.vitalsJson));
    return snapshotsToVitalSummaryReadings(forEnc, language);
  }, [patientVitalsTimeline, encounterId, language]);

  const encounterVitalsSnapshotsOldestFirst = useMemo(() => {
    if (!patientVitalsTimeline) return null;
    const merged = buildVitalsTimelineNewestFirst(
      patientVitalsTimeline.latest,
      patientVitalsTimeline.history,
      []
    );
    const forEnc = merged.filter(
      (s) => s.encounterId === encounterId && hasVitalsJson(s.vitalsJson)
    );
    if (forEnc.length < 2) return null;
    return [...forEnc].sort(
      (a, b) => vitalsSnapshotMeasuredAtMs(a) - vitalsSnapshotMeasuredAtMs(b)
    );
  }, [patientVitalsTimeline, encounterId]);

  const clinicalStripModel = useMemo(() => {
    const parsed = triagePreviewSliceFromTriageGet(triageSnapshot, language);
    if (!parsed) {
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
      return {
        esi: "",
        allergyText: "",
        pairs: buildErWorkspaceVitalPairs(emptySlice, language),
      };
    }
    return {
      esi: parsed.slice.esi,
      allergyText: buildAllergyStripSummary(parsed.slice, parsed.er),
      pairs: buildErWorkspaceVitalPairs(parsed.slice, language),
    };
  }, [triageSnapshot, language]);

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
    if (!canFetchEncounterTriage && activeSection === "triage") {
      setActiveSection("results");
    }
  }, [canFetchEncounterTriage, activeSection]);

  useEffect(() => {
    if (!showNursingTab && activeSection === "providerMse") {
      setActiveSection("results");
    }
  }, [showNursingTab, activeSection]);

  const sectionTitle = useMemo(
    (): Record<ErWorkspaceSection, string> => ({
      triage: t("emergencyWorkspace.sectionTitle.triage"),
      visitSummary: t("emergencyWorkspace.sectionTitle.visitSummary"),
      results: t("emergencyWorkspace.sectionTitle.results"),
      mar: t("emergencyWorkspace.sectionTitle.mar"),
      orders: t("emergencyWorkspace.sectionTitle.orders"),
      diagnostics: t("emergencyWorkspace.sectionTitle.diagnostics"),
      notes: t("emergencyWorkspace.sectionTitle.notes"),
      nursing: t("emergencyWorkspace.sectionTitle.nursing"),
      providerMse: t("emergencyWorkspace.sectionTitle.providerMse"),
      disposition: t("emergencyWorkspace.sectionTitle.disposition"),
    }),
    [t]
  );

  const erDashboardTiles = useMemo(
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

  if (loading && !encounter) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{t("emergencyWorkspace.loading")}</div>
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

  const patient = encounter.patient;
  const statusKey = (encounter.status ?? "").trim() || "OPEN";
  const typeKey = (encounter.type ?? "").trim() || "—";
  const roomDisplay = encounter.roomLabel?.trim() || t("common.dash");
  const isEmergencyType = encounter.type === EMERGENCY_TYPE;
  const isLocked = isEncounterLocked(encounter);
  const vitalsQuickEditEnabled =
    canFetchEncounterTriage && encounter.status === "OPEN" && !isLocked;

  const canEditOperationalEncounter = roles.includes("RN") || roles.includes("ADMIN");
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

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ width: "100%", maxWidth: "none", minWidth: 0, boxSizing: "border-box" }}>
        <MedoraCardActionsMediaStyle />

        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
            <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyWorkspace.backTrackboard")}
            </Link>
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("emergencyWorkspace.pageTitle")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
            {t("emergencyWorkspace.pageSubtitle")}
          </p>
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

        <div style={{ marginBottom: 16 }}>
        <MedoraCard leftAccentColor="#2563eb" variant="default">
          <MedoraCardInner>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: "10px 12px",
                width: "100%",
              }}
            >
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
                  flex: "1 1 260px",
                  alignItems: "stretch",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
                  <EmergencyWorkspaceVitalsCard
                    vitalPairs={clinicalStripModel.pairs}
                    loading={triageLoading}
                    editable={vitalsQuickEditEnabled}
                    onEditClick={vitalsQuickEditEnabled ? () => setShowQuickVitals(true) : undefined}
                    editAriaLabel={t("erQuickVitals.vitalsEditAria")}
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
                {showQuickVitals && vitalsQuickEditEnabled && fid ? (
                  <>
                    {/**
                     * Desktop forces a stable 2-col layout (summary LEFT, quick-entry RIGHT) so the panel
                     * does not prematurely wrap inside the ED header column. Below the workspace tablet
                     * breakpoint the row collapses to a single stacked column. Summary gets the wider
                     * track because its table has more columns (TIME → BY) and was clipping at the
                     * earlier 0.95fr ratio. Inline media query is injected with a unique class.
                     */}
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                          .medora-er-vitals-twocol {
                            display: grid;
                            grid-template-columns: minmax(520px, 1.05fr) minmax(500px, 0.95fr);
                            gap: 16px;
                            align-items: start;
                            width: 100%;
                            max-width: none;
                            min-width: 0;
                          }
                          .medora-er-vitals-twocol > * {
                            min-width: 0;
                          }
                          @media (max-width: 1023.98px) {
                            .medora-er-vitals-twocol {
                              grid-template-columns: 1fr;
                            }
                          }
                        `,
                      }}
                    />
                    <div className="medora-er-vitals-twocol">
                      <div style={{ minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
                        <VitalSummaryPanel
                          readings={encounterVitalSummaryReadings}
                          latestReadingId={encounterVitalSummaryReadings[0]?.id}
                          onClose={() => setShowQuickVitals(false)}
                          onViewFullHistory={
                            patient?.id
                              ? () => {
                                  router.push(`/app/patients/${patient.id}`);
                                }
                              : undefined
                          }
                        />
                      </div>
                      <div style={{ minWidth: 0, width: "100%", justifySelf: "stretch" }}>
                        <EmergencyQuickVitalsEditor
                          open={showQuickVitals}
                          onClose={() => setShowQuickVitals(false)}
                          encounterId={encounterId}
                          facilityId={fid}
                          patientId={patient?.id}
                          triageSnapshot={triageSnapshot}
                          onSaved={async () => {
                            setTriageRefresh((r) => r + 1);
                          }}
                        />
                      </div>
                    </div>
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                  flex: "0 1 auto",
                  marginLeft: "auto",
                  minWidth: 140,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowOperationalPanel((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowOperationalPanel((prev) => !prev);
                    }
                  }}
                  aria-expanded={showOperationalPanel}
                  aria-label={t("emergencyWorkspace.operationalRoomAria")}
                  style={{
                    padding: "8px 12px",
                    alignSelf: "flex-end",
                    cursor: "pointer",
                    borderRadius: 10,
                    border: "1px solid #bae6fd",
                    backgroundColor: "#f0f9ff",
                    textAlign: "center",
                    minWidth: 88,
                    maxWidth: 132,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#0369a1",
                    }}
                  >
                    {t("printOutput.patientChart.room")}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: "#0c4a6e",
                      fontVariantNumeric: "tabular-nums",
                      wordBreak: "break-word",
                    }}
                  >
                    {roomDisplay}
                  </div>
                </div>
                <MedoraCardBadgeRow marginTop={0}>
                  <MedoraCardBadge soft={statusSoft(statusKey)}>{tEncounterStatus(t, statusKey)}</MedoraCardBadge>
                  <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                    {tEncounterType(t, typeKey)}
                  </MedoraCardBadge>
                </MedoraCardBadgeRow>
                <Link href={erChartHref} style={{ ...linkPill, alignSelf: "flex-end", fontSize: 13, padding: "7px 12px" }}>
                  {t("emergencyWorkspace.linkFullEncounter")}
                </Link>
                <Link
                  href={genericEncounterHref}
                  style={{
                    alignSelf: "flex-end",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#64748b",
                    textDecoration: "none",
                  }}
                >
                  {t("emergencyWorkspace.linkMedoraChartRef")}
                </Link>
              </div>
            </div>
          </MedoraCardInner>
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

        <section aria-label={t("emergencyWorkspace.dashboardHeading")} style={{ marginBottom: 20 }}>
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: 13,
              fontWeight: 600,
              color: "#64748b",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {t("emergencyWorkspace.dashboardHeading")}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
              gap: 6,
              width: "100%",
            }}
          >
            {erDashboardTiles.map((q) => {
              const selected = activeSection === q.id;
              return (
                <div
                  key={q.id}
                  style={{
                    minWidth: 0,
                    borderRadius: 16,
                    outline: selected ? "2px solid #2563eb" : "1px solid transparent",
                    outlineOffset: 0,
                    transition: "outline-color 0.12s ease",
                  }}
                >
                  <button
                    type="button"
                    disabled={q.disabled}
                    aria-label={q.ariaLabel}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      if (!q.disabled) setActiveSection(q.id);
                    }}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      margin: 0,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: q.disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: q.disabled ? 0.55 : 1,
                    }}
                  >
                    <MedoraCard leftAccentColor={q.accent} variant="default">
                      <MedoraCardInner>
                        <MedoraCardIdentity initials={q.initials}>{null}</MedoraCardIdentity>
                        <div className="mt-1 text-[10px] leading-none text-gray-500 text-center truncate">
                          {DASHBOARD_LABELS[q.initials]}
                        </div>
                      </MedoraCardInner>
                    </MedoraCard>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label={t("emergencyWorkspace.activeZoneAria")} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>{sectionTitle[activeSection]}</h2>

          {activeSection === "visitSummary" ? (
            <EmergencyErSummaryClosureSurface
              encounterId={encounterId}
              facilityId={fid}
              facilityName={facilityName}
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
                onGoPatientChart={() => setShowCreateDx(true)}
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
            />
          ) : null}

          {activeSection === "mar" && canFetchMarTab ? (
            <MedoraCard leftAccentColor="#059669" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title={t("emergencyWorkspace.marTitle")}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("emergencyWorkspace.marSubline")}</p>
                    }
                  />
                </MedoraCardIdentity>
                <div style={{ width: "100%", marginTop: 12 }}>
                  <MedicationAdministrationTab
                    encounterId={encounterId}
                    facilityId={fid}
                    encounterStatus={encounter.status ?? "OPEN"}
                    roleCodes={roles}
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

          {activeSection === "notes" ? (
            <EmergencyErNotesPanel
              encounterId={encounterId}
              facilityId={fid}
              nursingAssessment={encounter.nursingAssessment}
              encounterNotes={encounter.notes}
              status={encounter.status}
              isLocked={isLocked}
              onSaved={onEmbeddedEncounterUpdate}
            />
          ) : null}

          {activeSection === "nursing" && showNursingTab ? (
            <>
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
            </>
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
              />
              <div style={{ marginTop: 10 }}>
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
      </div>
    </div>
  );
}
