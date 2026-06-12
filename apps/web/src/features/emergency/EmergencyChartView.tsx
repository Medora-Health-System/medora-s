"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import {
  esiDisplayChar,
  esiLevelFromUnknown,
  EMERGENCY_AVATAR_CIRCLE_STYLE,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import { buildErCdsRecommendations } from "@/features/emergency/erClinicalDecisionSupport";
import {
  buildAllergyStripSummary,
  buildErWorkspaceVitalPairs,
  triagePreviewSliceFromTriageGet,
} from "@/features/emergency/emergencyTriageDocPreview";
import { BillingClassificationBadgeInteractive } from "@/components/encounters/BillingClassificationBadgeInteractive";
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
import type { ErProcedureLauncherStep } from "@/features/emergency/erProcedureLauncherCatalog";
import { EmergencyTriagePanel } from "@/features/emergency/EmergencyTriagePanel";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyErNursingHandoffPanel } from "@/features/emergency/EmergencyErNursingHandoffPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import {
  MEDORA_CARD_SHELL,
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import {
  emergencyActiveWorkspacePath,
  emergencyChartPath,
  emergencyTrackboardPath,
  genericEncounterPath,
} from "@/features/emergency/emergencyRoutes";
import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { EncounterOperationalPanel } from "@/components/encounters/EncounterOperationalPanel";
import { EncounterGovernedRoomChip } from "@/components/encounters/EncounterGovernedRoomChip";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import { canAssignEncounterRoom } from "@/lib/governedRoomDisplay";
import { ErHandoffV1NursingSection } from "@/components/encounters/ErHandoffV1Panel";
import { isEncounterLocked } from "@/lib/encounterLock";
import { EmergencyChartSectionJumpNav, type EmergencyChartJumpSection } from "@/features/emergency/EmergencyChartSectionJumpNav";
import {
  emergencyChartContentStackStyle,
  emergencyChartHeaderRailStyle,
  emergencyChartPageShellStyle,
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
  visitReason?: string | null;
  chiefComplaint?: string | null;
  admittedAt?: string | null;
  patient?: PatientLite | null;
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

function fullPatientName(p: PatientLite | null | undefined, dash: string): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || dash;
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
  fontSize: 13,
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

const sectionTitle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 13,
  fontWeight: 600,
  color: "#64748b",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

export function EmergencyChartView() {
  const params = useParams();
  const { t, language } = useI18n();
  const dash = t("common.dash");
  const formatEncounterDt = (iso: string | null | undefined) => {
    if (!iso) return dash;
    try {
      return formatEncounterChromeDateTime(iso, language);
    } catch {
      return dash;
    }
  };
  const encounterId = params.id as string;
  const {
    facilityId: facilityIdFromHook,
    facilities,
    roles,
    ready: rolesReady,
    canPrescribe,
    userId,
    facilityTimeZone,
  } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [resultsRefresh, setResultsRefresh] = useState(0);
  const [triageRefresh, setTriageRefresh] = useState(0);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [showQuickVitals, setShowQuickVitals] = useState(false);
  const [showIvAccessModal, setShowIvAccessModal] = useState(false);
  const [showProcedureLauncherModal, setShowProcedureLauncherModal] = useState(false);
  const [procedureLauncherInitialStep, setProcedureLauncherInitialStep] = useState<ErProcedureLauncherStep | null>(
    null
  );

  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOperationalPanel, setShowOperationalPanel] = useState(false);
  const [showRoomAssignmentModal, setShowRoomAssignmentModal] = useState(false);
  const [layoutMode, setLayoutMode] = useState<EmergencyChartLayoutMode>("desktopSplit");

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

  /** Lab/Radiology techniciens : accès dossier urgences en lecture seule (workflow technicien). */
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
  const canRecordDischargeSortieExecution = roles.includes("RN") || roles.includes("ADMIN");

  const canDocumentIvAccess =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY") ||
    roles.includes("ADMIN");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
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
  const tabHref = (tab: string) => `${genericEncounterHref}?tab=${encodeURIComponent(tab)}`;
  const erActiveHref = emergencyActiveWorkspacePath(encounterId);

  const scrollToErSummaryClosure = useCallback(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("er-er-summary-closure")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

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

  const onEmbeddedEncounterUpdate = useCallback(async () => {
    await load();
    setResultsRefresh((r) => r + 1);
    setTriageRefresh((r) => r + 1);
  }, [load]);

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
      allergyText: buildAllergyStripSummary(parsed.slice, parsed.er, language),
      pairs: buildErWorkspaceVitalPairs(parsed.slice, language),
    };
  }, [triageSnapshot, language]);

  const complaintLine = useMemo(() => {
    if (!encounter) return dash;
    const raw =
      (encounter.visitReason || "").trim() || (encounter.chiefComplaint || "").trim();
    return raw || dash;
  }, [encounter, dash]);

  const erCdsRecommendations = useMemo(
    () =>
      buildErCdsRecommendations({
        encounterType: encounter?.type,
        triage: triageSnapshot,
        encounterVitalsSnapshotsOldestFirst: null,
      }),
    [encounter?.type, triageSnapshot]
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

  const chartJumpSections = useMemo(
    (): EmergencyChartJumpSection[] => [
      { targetId: "section-triage", label: t("emergencyWorkspace.triageCardTitle") },
      { targetId: "section-synth", label: t("emergencyChartView.sectionSummary") },
      { targetId: "section-results", label: t("emergencyWorkspace.sectionTitle.results") },
      { targetId: "section-mar", label: t("emergencyChartView.sectionMarHeading") },
      { targetId: "section-orders", label: t("emergencyChartView.sectionOrders") },
      { targetId: "section-notes", label: t("emergencyWorkspace.sectionTitle.notes") },
      { targetId: "section-nursing", label: t("emergencyChartView.sectionNursingCare") },
      { targetId: "section-mse", label: t("emergencyChartView.sectionProviderEval") },
      { targetId: "section-disp", label: t("emergencyWorkspace.sectionTitle.disposition") },
      { targetId: "section-handoff", label: t("emergencyChartView.sectionTeamExecution") },
    ],
    [t]
  );

  if (!rolesReady || !fid) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{t("common.loading")}</div>
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
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{t("common.loading")}</div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? t("emergencyWorkspace.errEncounterNotFound")}</p>
        <p style={{ margin: "16px 0 0 0" }}>
          <Link href={emergencyTrackboardPath()} style={{ color: "#2563eb", fontWeight: 600 }}>
            {t("emergencyWorkspace.backTrackboardLong")}
          </Link>
        </p>
      </div>
    );
  }

  const patient = encounter.patient;
  const statusKey = (encounter.status ?? "").trim() || "OPEN";
  const typeKey = (encounter.type ?? "").trim() || "—";
  const isEmergencyType = encounter.type === EMERGENCY_TYPE;
  const isLocked = isEncounterLocked(encounter);
  const canAssignRoom =
    canAssignEncounterRoom(roles) && encounter.status === "OPEN" && !isLocked;
  const encounterRoomContext = {
    roomLabel: encounter.roomLabel,
    type: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
  };
  const vitalsQuickEditEnabled =
    canFetchEncounterTriage && encounter.status === "OPEN" && !isLocked;

  const canEditOperationalEncounter = roles.includes("RN") || roles.includes("ADMIN");
  const canChangeBillingClassification =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    roles.includes("FRONT_DESK") ||
    roles.includes("BILLING");
  const billingClassKey = String((encounter as { billingClassification?: string }).billingClassification ?? "").trim();
  const physicianAssignedForOperational =
    encounter.physicianAssigned?.id != null && String(encounter.physicianAssigned.id).trim() !== ""
      ? {
          id: String(encounter.physicianAssigned.id),
          firstName: encounter.physicianAssigned.firstName ?? "",
          lastName: encounter.physicianAssigned.lastName ?? "",
        }
      : null;

  const headerEsiLevel = esiLevelFromUnknown(clinicalStripModel.esi.trim());

  return (
    <div style={emergencyChartPageShellStyle(layoutMode)}>
      <div style={{ width: "100%", maxWidth: "none", minWidth: 0, boxSizing: "border-box" }}>
        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
            <Link href={emergencyTrackboardPath()} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyWorkspace.backTrackboard")}
            </Link>
            {" · "}
            <Link href={erActiveHref} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyChartView.linkActiveWorkspace")}
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
            {t("emergencyChartView.pageTitle")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
            {t("emergencyChartView.pageSubtitle")}
          </p>
          <p style={{ margin: "10px 0 0 0", fontSize: 13 }}>
            <Link href={genericEncounterHref} style={{ color: "#64748b", fontWeight: 600 }}>
              {t("emergencyChartView.linkMedoraEncounterRef")}
            </Link>
          </p>
        </header>

        {!isEmergencyType && (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
              {t("emergencyWorkspace.notEmergencyBanner")}
            </p>
          </div>
        )}

        {error ? (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fecaca", backgroundColor: "#fef2f2" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>{error}</p>
          </div>
        ) : null}

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

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <MedoraCardTitle
                    title={fullPatientName(patient ?? undefined, dash)}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.nir")}</span>{" "}
                        {(patient?.mrn ?? patient?.nationalId ?? "").trim() || dash}
                        {" · "}
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.ageSex")}</span>{" "}
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
                      {t("encounterChrome.chiefComplaintShort")}
                    </span>
                    {" — "}
                    {complaintLine}
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                    <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.arrival")}</span>{" "}
                    {formatEncounterDt(encounter.createdAt ?? null)}
                    {encounter.admittedAt ? (
                      <>
                        {" · "}
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("patientChartUi.admissionLabel")}</span>{" "}
                        {formatEncounterDt(encounter.admittedAt)}
                      </>
                    ) : null}
                  </p>
                </div>

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
                          triageLoading || encounter.status !== "OPEN" || isLocked || !encounter
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
                            triageLoading || encounter.status !== "OPEN" || isLocked || !encounter
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            triageLoading || encounter.status !== "OPEN" || isLocked || !encounter ? 0.45 : 1,
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
                          triageLoading || encounter.status !== "OPEN" || isLocked || !encounter
                        }
                        onClick={() => {
                          setProcedureLauncherInitialStep(null);
                          setShowProcedureLauncherModal(true);
                        }}
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
                            triageLoading || encounter.status !== "OPEN" || isLocked || !encounter
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            triageLoading || encounter.status !== "OPEN" || isLocked || !encounter ? 0.45 : 1,
                        }}
                      >
                        🧰
                      </button>
                    ) : null}
                  </div>
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
                      }}
                    />
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
                      onClose={() => {
                        setShowProcedureLauncherModal(false);
                        setProcedureLauncherInitialStep(null);
                      }}
                      encounterId={encounterId}
                      facilityId={fid}
                      initialStep={procedureLauncherInitialStep}
                      onRecorded={() => setResultsRefresh((r) => r + 1)}
                    />
                  ) : null}
                </div>

                <div style={emergencyChartHeaderRailStyle(layoutMode)}>
                  <EncounterGovernedRoomChip
                    encounter={encounterRoomContext}
                    clickable={canAssignRoom}
                    onClick={
                      canAssignRoom && fid ? () => setShowRoomAssignmentModal(true) : undefined
                    }
                    labelKey="encounterChrome.room"
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
                </div>
              </div>
            </MedoraCardInner>
          </MedoraCard>
        </div>

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

        {layoutMode === "mobileStacked" ? (
          <EmergencyChartSectionJumpNav
            sections={chartJumpSections}
            heading={t("emergencyWorkspace.dashboardHeading")}
          />
        ) : null}

        <div
          style={emergencyChartContentStackStyle()}
          data-testid="emergency-chart-content-stack"
          data-layout-mode={layoutMode}
        >
          <section aria-labelledby="section-triage">
            <h2 id="section-triage" style={sectionTitle}>
              {t("emergencyWorkspace.triageCardTitle")}
            </h2>
            {canFetchEncounterTriage ? (
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
                onRequestDocumentEcg={
                  canDocumentIvAccess && fid
                    ? () => {
                        setProcedureLauncherInitialStep("EKG");
                        setShowProcedureLauncherModal(true);
                      }
                    : undefined
                }
              />
            ) : (
              <MedoraCard leftAccentColor="#64748b" variant="default">
                <MedoraCardInner>
                  <MedoraCardIdentity initials="T">
                    <MedoraCardTitle
                      title={t("emergencyWorkspace.triageCardTitle")}
                      subline={
                        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                          {t("emergencyChartView.triageLockedSubline")}
                        </p>
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
            )}
          </section>

          <section aria-labelledby="section-synth">
            <h2 id="section-synth" style={sectionTitle}>
              {t("emergencyChartView.sectionSummary")}
            </h2>
            <EmergencyErSummaryClosureSurface
              sectionId="er-er-summary-closure"
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
              canOpenProcedureDocumentation={canDocumentIvAccess}
              onOpenProcedureDocumentation={(step) => {
                setProcedureLauncherInitialStep(step);
                setShowProcedureLauncherModal(true);
              }}
            />
          </section>

          <section aria-labelledby="section-results">
            <h2 id="section-results" style={sectionTitle}>
              {t("emergencyWorkspace.sectionTitle.results")}
            </h2>
            <EmergencyResultsPanel
              encounterId={encounterId}
              facilityId={fid}
              refreshToken={resultsRefresh}
              canAcknowledgeResults={canAcknowledgeResults}
            />
          </section>

          <section aria-labelledby="section-mar">
            <h2 id="section-mar" style={sectionTitle}>
              {t("emergencyChartView.sectionMarHeading")}
            </h2>
            {canFetchMarTab ? (
              <MedoraCard leftAccentColor="#059669" variant="default">
                <MedoraCardInner>
                  <MedoraCardIdentity initials="M">
                    <MedoraCardTitle title={t("emergencyWorkspace.marTitle")} />
                  </MedoraCardIdentity>
                  <div style={{ width: "100%", marginTop: 12 }}>
                    <MedicationAdministrationTab
                      encounterId={encounterId}
                      facilityId={fid}
                      currentUserId={userId}
                      encounterStatus={encounter.status ?? "OPEN"}
                      providerDocumentationStatus={encounter.providerDocumentationStatus}
                      roleCodes={roles}
                      facilityTimeZone={facilityTimeZone}
                    />
                  </div>
                </MedoraCardInner>
              </MedoraCard>
            ) : (
              <MedoraCard leftAccentColor="#059669" variant="default">
                <MedoraCardInner>
                  <MedoraCardIdentity initials="M">
                    <MedoraCardTitle
                      title={t("emergencyWorkspace.marUnavailableTitle")}
                      subline={
                        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                          {t("emergencyWorkspace.marUnavailableSubline")}
                        </p>
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
            )}
          </section>

          <section aria-labelledby="section-orders">
            <h2 id="section-orders" style={sectionTitle}>
              {t("emergencyChartView.sectionOrders")}
            </h2>
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
            />
          </section>

          <section aria-labelledby="section-notes">
            <h2 id="section-notes" style={sectionTitle}>
              {t("emergencyWorkspace.sectionTitle.notes")}
            </h2>
            <EmergencyErNotesPanel
              encounterId={encounterId}
              facilityId={fid}
              status={encounter.status}
              isLocked={isLocked}
              roleCodes={roles}
              onSaved={onEmbeddedEncounterUpdate}
            />
          </section>

          <section aria-labelledby="section-nursing">
            <h2 id="section-nursing" style={sectionTitle}>
              {t("emergencyChartView.sectionNursingCare")}
            </h2>
            {showNursingTab ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              </div>
            ) : (
              <MedoraCard leftAccentColor="#0ea5e9" variant="default">
                <MedoraCardInner>
                  <MedoraCardIdentity initials="I">
                    <MedoraCardTitle
                      title={t("emergencyWorkspace.nursingDeniedTitle")}
                      subline={
                        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                          {t("emergencyWorkspace.nursingDeniedSubline")}
                        </p>
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
            )}
          </section>

          <section aria-labelledby="section-mse">
            <h2 id="section-mse" style={sectionTitle}>
              {t("emergencyChartView.sectionProviderEval")}
            </h2>
            {showNursingTab ? (
              <EmergencyProviderMsePanel
                encounterId={encounterId}
                facilityId={fid}
                encounter={encounter}
                isLocked={isLocked}
                onSaved={onEmbeddedEncounterUpdate}
                clinicTabHref={tabHref("clinic")}
                erChartHref={emergencyChartPath(encounterId)}
                genericEncounterHref={genericEncounterHref}
                mseAssistContext={mseAssistContext}
              />
            ) : (
              <MedoraCard leftAccentColor="#4f46e5" variant="default">
                <MedoraCardInner>
                  <MedoraCardIdentity initials="M">
                    <MedoraCardTitle
                      title={t("emergencyWorkspace.mseDeniedTitle")}
                      subline={
                        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                          {t("emergencyWorkspace.mseDeniedSubline")}
                        </p>
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
            )}
          </section>

          <section aria-labelledby="section-disp">
            <h2 id="section-disp" style={sectionTitle}>
              {t("emergencyWorkspace.sectionTitle.disposition")}
            </h2>
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
          </section>

          <section aria-labelledby="section-handoff">
            <h2 id="section-handoff" style={sectionTitle}>
              {t("emergencyChartView.sectionTeamExecution")}
            </h2>
            <EmergencyErNursingHandoffPanel
              encounter={encounter}
              encounterId={encounterId}
              facilityId={fid}
              onSaved={onEmbeddedEncounterUpdate}
              canRecordDischargeSortieExecution={canRecordDischargeSortieExecution}
              onSummaryClosureClick={scrollToErSummaryClosure}
              facilityName={facilityName}
            />
          </section>
        </div>
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
              prev ? { ...prev, roomLabel: patch.roomLabel ?? prev.roomLabel } : prev
            );
          }}
        />
      ) : null}
    </div>
  );
}
