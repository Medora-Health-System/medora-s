"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardInner,
  MEDORA_CARD_SHELL,
} from "@/components/medora-card";
import { EncounterGovernedRoomChip } from "@/components/encounters/EncounterGovernedRoomChip";
import {
  snapshotsToVitalSummaryReadings,
  VitalSummaryPanel,
  vitalSummaryInitials,
} from "@/components/patients/VitalSummaryPanel";
import { EmergencyQuickVitalsEditor } from "@/features/emergency/EmergencyQuickVitalsEditor";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { EmergencyVisitSummaryPanel } from "@/features/emergency/EmergencyVisitSummaryPanel";
import { triagePreviewSliceFromTriageGet } from "@/features/emergency/emergencyTriageDocPreview";
import {
  resolveEmergencyChartLayoutMode,
  type EmergencyChartLayoutMode,
} from "@/features/emergency/emergencyChartResponsiveLayout";
import { emergencyChartUsesBottomRail } from "@/features/emergency/emergencyChartTouchNavigationMode";
import { isEncounterLocked } from "@/lib/encounterLock";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_PATIENT_VITALS_UPDATED, type PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import {
  getDefaultHospitalTechnicianTile,
  getVisibleHospitalTechnicianTiles,
  hospitalTechnicianTileToSection,
  hospitalTechnicianWorkspacePermissions,
  isHospitalFloorTechnicianProfile,
  isHospitalTechnicianSectionVisible,
} from "./hospitalTechnicianTiles";
import {
  parseHospitalTechnicianSection,
  type HospitalTechnicianSection,
} from "./hospitalTechnicianSections";
import {
  HospitalTechnicianBottomRail,
  HospitalTechnicianSectionNav,
  type HospitalTechnicianDashboardTile,
} from "./HospitalTechnicianSectionNav";
import { resolveHospitalTechnicianWorkspace } from "./hospitalTechnicianWorkspace";
import { getLandingRouteForRoles } from "@/lib/landingRoute";

type EncounterShell = {
  id: string;
  status?: string | null;
  type?: string | null;
  roomLabel?: string | null;
  admissionSummaryJson?: unknown;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  dischargeSummaryJson?: unknown;
  updatedAt?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    mrn?: string | null;
  } | null;
};

type VitalsHistoryEntry = {
  recordedAt: string;
  recordedBy?: { displayName?: string | null };
  vitals: Record<string, unknown>;
};

function statusSoft(statusKey: string) {
  if (statusKey === "OPEN") return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" };
  if (statusKey === "CLOSED") return { bg: "#f8fafc", text: "#334155", border: "#e2e8f0" };
  return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
}

function vitalsHistoryToSnapshots(
  entries: VitalsHistoryEntry[],
  encounterType: string
): PatientTriageVitalsSnapshot[] {
  return [...entries]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .map((entry, idx) => ({
      encounterId: "",
      encounterType,
      triageId: `vh-${idx}-${entry.recordedAt}`,
      vitalsJson: entry.vitals,
      updatedAt: entry.recordedAt,
      triageCompleteAt: entry.recordedAt,
    }));
}

export function HospitalTechnicianActiveWorkspaceView() {
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
    departmentCode,
  } = useFacilityAndRoles();

  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsHistoryEntry[]>([]);
  const [vitalsRefresh, setVitalsRefresh] = useState(0);
  const [resultsRefresh, setResultsRefresh] = useState(0);
  const [showQuickVitals, setShowQuickVitals] = useState(false);
  const [layoutMode, setLayoutMode] = useState<EmergencyChartLayoutMode>("desktopSplit");

  const sessionInput = useMemo(
    () => ({
      roleCodes: roles,
      departmentCode,
      prismaDepartmentCode: departmentCode,
    }),
    [roles, departmentCode]
  );

  const isFloorTechnician = isHospitalFloorTechnicianProfile(sessionInput);
  const workspaceType = resolveHospitalTechnicianWorkspace(departmentCode);
  const permissions = hospitalTechnicianWorkspacePermissions(sessionInput);
  const visibleTileIds = getVisibleHospitalTechnicianTiles(sessionInput);

  const [activeSection, setActiveSection] = useState<HospitalTechnicianSection>(() => {
    const fromUrl = parseHospitalTechnicianSection(searchParams.get("section"));
    if (fromUrl) return fromUrl;
    const defaultTile = getDefaultHospitalTechnicianTile(sessionInput);
    return hospitalTechnicianTileToSection(defaultTile);
  });

  const fid = facilityId || facilityIdFromHook;
  const facilityName = facilities.find((x) => x.id === fid)?.name ?? null;
  const usesBottomRail = emergencyChartUsesBottomRail(layoutMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setLayoutMode(resolveEmergencyChartLayoutMode(window.innerWidth));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!isFloorTechnician) {
      router.replace(getLandingRouteForRoles(roles, { navigationProfile: sessionInput }));
    }
  }, [rolesReady, isFloorTechnician, roles, router, sessionInput]);

  const loadEncounter = useCallback(async () => {
    if (!encounterId || !fid || !rolesReady || !isFloorTechnician) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`, { facilityId: fid });
      const enc = asApiObject<EncounterShell>(raw);
      setEncounter(enc);
      if (!enc) {
        setError(t("hospitalTechnicianWorkspace.errEncounterNotFound"));
      }
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      setError(msg || t("hospitalTechnicianWorkspace.errLoadEncounter"));
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, fid, rolesReady, isFloorTechnician, t, language]);

  const loadVitalsHistory = useCallback(async () => {
    if (!encounterId || !fid || !rolesReady || !isFloorTechnician) return;
    try {
      const raw = await apiFetch(`/encounters/${encounterId}/vitals-history`, { facilityId: fid });
      const body = asApiObject<{ entries?: VitalsHistoryEntry[] }>(raw);
      setVitalsHistory(Array.isArray(body?.entries) ? body.entries : []);
    } catch {
      setVitalsHistory([]);
    }
  }, [encounterId, fid, rolesReady, isFloorTechnician]);

  const loadTriageOptional = useCallback(async () => {
    if (!encounterId || !fid || !permissions.canDocumentVitals) return;
    try {
      const raw = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId: fid });
      setTriageSnapshot(asApiObject(raw));
    } catch {
      setTriageSnapshot(null);
    }
  }, [encounterId, fid, permissions.canDocumentVitals]);

  useEffect(() => {
    void loadEncounter();
  }, [loadEncounter]);

  useEffect(() => {
    void loadVitalsHistory();
    void loadTriageOptional();
  }, [loadVitalsHistory, loadTriageOptional, vitalsRefresh]);

  useEffect(() => {
    const pid = encounter?.patient?.id?.trim();
    if (!pid) return;
    const onVitals = (ev: Event) => {
      const d = (ev as CustomEvent<{ patientId?: string }>).detail;
      if (d?.patientId === pid) setVitalsRefresh((r) => r + 1);
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitals);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitals);
  }, [encounter?.patient?.id]);

  useEffect(() => {
    if (!isHospitalTechnicianSectionVisible(activeSection, sessionInput)) {
      const defaultTile = getDefaultHospitalTechnicianTile(sessionInput);
      setActiveSection(hospitalTechnicianTileToSection(defaultTile));
    }
  }, [activeSection, sessionInput]);

  const encounterTypeKey = (encounter?.type ?? "").trim() || "INPATIENT";

  const encounterVitalSummaryReadings = useMemo(() => {
    const sortedHistory = [...vitalsHistory].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    const snapshots = vitalsHistoryToSnapshots(sortedHistory, encounterTypeKey);
    const readings = snapshotsToVitalSummaryReadings(snapshots, language);
    return readings.map((row, idx) => {
      const displayName = sortedHistory[idx]?.recordedBy?.displayName ?? null;
      if (!displayName) return row;
      return { ...row, byInitials: vitalSummaryInitials({ displayName }) };
    });
  }, [vitalsHistory, language, encounterTypeKey]);

  const dashboardTiles = useMemo((): HospitalTechnicianDashboardTile[] => {
    const all: HospitalTechnicianDashboardTile[] = [
      {
        kind: "section",
        id: "vitals",
        accent: "#059669",
        initials: "V",
        ariaLabel: t("hospitalTechnicianWorkspace.tileAria.vitals"),
      },
      {
        kind: "section",
        id: "notes",
        accent: "#475569",
        initials: "N",
        ariaLabel: t("hospitalTechnicianWorkspace.tileAria.notes"),
      },
      {
        kind: "section",
        id: "summary",
        accent: "#0f172a",
        initials: "S",
        ariaLabel: t("hospitalTechnicianWorkspace.tileAria.summary"),
      },
    ];
    const visibleSections = new Set(
      visibleTileIds.map((tileId) => hospitalTechnicianTileToSection(tileId))
    );
    return all.filter((tile) => visibleSections.has(tile.id));
  }, [t, visibleTileIds]);

  const sectionTitle: Record<HospitalTechnicianSection, string> = useMemo(
    () => ({
      vitals: t("hospitalTechnicianWorkspace.sectionTitle.vitals"),
      notes: t("hospitalTechnicianWorkspace.sectionTitle.notes"),
      summary: t("hospitalTechnicianWorkspace.sectionTitle.summary"),
    }),
    [t]
  );

  const genericEncounterHref = `/app/encounters/${encodeURIComponent(encounterId)}`;
  const isLocked = encounter ? isEncounterLocked(encounter) : false;
  const vitalsQuickEditEnabled =
    permissions.canDocumentVitals && encounter?.status === "OPEN" && !isLocked;

  const onEmbeddedUpdate = useCallback(async () => {
    setVitalsRefresh((r) => r + 1);
    setResultsRefresh((r) => r + 1);
    await loadEncounter();
    await loadVitalsHistory();
    await loadTriageOptional();
  }, [loadEncounter, loadVitalsHistory, loadTriageOptional]);

  if (!rolesReady || !fid) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>
        {t("hospitalTechnicianWorkspace.loading")}
      </div>
    );
  }

  if (!isFloorTechnician) {
    return null;
  }

  if (loading && !encounter) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>
        {t("hospitalTechnicianWorkspace.loading")}
      </div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>
          {error ?? t("hospitalTechnicianWorkspace.errEncounterNotFound")}
        </p>
        <p style={{ margin: "16px 0 0 0" }}>
          <Link href="/app/hospitalisation" style={{ color: "#2563eb", fontWeight: 600 }}>
            {t("hospitalTechnicianWorkspace.backBoard")}
          </Link>
        </p>
      </div>
    );
  }

  const patient = encounter.patient;
  const patientName = `${(patient?.firstName ?? "").trim()} ${(patient?.lastName ?? "").trim()}`.trim();
  const statusKey = (encounter.status ?? "").trim() || "OPEN";
  const typeKey = (encounter.type ?? "").trim() || "—";
  const encounterRoomContext = {
    roomLabel: encounter.roomLabel,
    type: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
    governedRoomDisplay: encounter.governedRoomDisplay,
    governedRoomUnit: encounter.governedRoomUnit,
    governedRoomHasAssignment: encounter.governedRoomHasAssignment ?? undefined,
  };

  const latestVitalsLine = (() => {
    const parsed = triagePreviewSliceFromTriageGet(triageSnapshot, language);
    if (parsed?.slice) {
      const s = parsed.slice;
      const parts = [s.bpSys && s.bpDia ? `${s.bpSys}/${s.bpDia}` : "", s.hr, s.rr, s.tempC, s.spo2].filter(Boolean);
      if (parts.length) return parts.join(" · ");
    }
    const latest = encounterVitalSummaryReadings[0];
    if (!latest) return "";
    return [latest.bp, latest.hr, latest.rr, latest.temp, latest.spo2].filter((x) => x && x !== "—").join(" · ");
  })();

  return (
    <div
      style={{
        padding: usesBottomRail ? "16px 16px 88px" : "16px 20px 24px",
        maxWidth: 1280,
        margin: "0 auto",
        minWidth: 0,
      }}
      data-testid="hospital-technician-active-workspace"
      data-workspace-type={workspaceType}
    >
      <header style={{ marginBottom: 16 }}>
        <Link
          href="/app/hospitalisation"
          style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
        >
          {t("hospitalTechnicianWorkspace.backBoard")}
        </Link>
        <h1 style={{ margin: "8px 0 4px 0", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
          {t("hospitalTechnicianWorkspace.pageTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t(`hospitalTechnicianWorkspace.workspaceLabel.${workspaceType}`)}
        </p>
      </header>

      <MedoraCard leftAccentColor="#6366f1" variant="default">
        <MedoraCardInner>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {patientName || "—"}
              </p>
              {facilityName ? (
                <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}>{facilityName}</p>
              ) : null}
              {latestVitalsLine ? (
                <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#475569" }}>{latestVitalsLine}</p>
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <EncounterGovernedRoomChip encounter={encounterRoomContext} clickable={false} />
              <MedoraCardBadgeRow marginTop={0}>
                <MedoraCardBadge soft={statusSoft(statusKey)}>{tEncounterStatus(t, statusKey)}</MedoraCardBadge>
                <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                  {tEncounterType(t, typeKey)}
                </MedoraCardBadge>
              </MedoraCardBadgeRow>
              <Link
                href={genericEncounterHref}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748b",
                  textDecoration: "none",
                  padding: "6px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  backgroundColor: "#fff",
                }}
              >
                {t("hospitalTechnicianWorkspace.linkFullChart")}
              </Link>
            </div>
          </div>
        </MedoraCardInner>
      </MedoraCard>

      <HospitalTechnicianSectionNav
        tiles={dashboardTiles}
        activeSection={activeSection}
        onSelect={setActiveSection}
        layoutMode={layoutMode}
        heading={t("hospitalTechnicianWorkspace.dashboardHeading")}
      />

      <section
        aria-label={t("hospitalTechnicianWorkspace.activeZoneAria")}
        style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}
        data-testid="hospital-technician-active-content"
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
          {sectionTitle[activeSection]}
        </h2>

        {activeSection === "vitals" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {vitalsQuickEditEnabled ? (
              <button
                type="button"
                onClick={() => setShowQuickVitals((v) => !v)}
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #bae6fd",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showQuickVitals
                  ? t("hospitalTechnicianWorkspace.vitalsHideEntry")
                  : t("hospitalTechnicianWorkspace.vitalsShowEntry")}
              </button>
            ) : null}
            {showQuickVitals && vitalsQuickEditEnabled && fid ? (
              <div
                style={{
                  ...MEDORA_CARD_SHELL,
                  padding: "12px 14px",
                }}
              >
                <EmergencyQuickVitalsEditor
                  open={showQuickVitals}
                  onClose={() => setShowQuickVitals(false)}
                  encounterId={encounterId}
                  facilityId={fid}
                  patientId={patient?.id}
                  triageSnapshot={triageSnapshot}
                  onSaved={async () => {
                    await onEmbeddedUpdate();
                  }}
                />
              </div>
            ) : null}
            <VitalSummaryPanel
              readings={encounterVitalSummaryReadings}
              latestReadingId={encounterVitalSummaryReadings[0]?.id}
              onClose={() => setShowQuickVitals(false)}
            />
          </div>
        ) : null}

        {activeSection === "notes" && fid ? (
          <EmergencyErNotesPanel
            encounterId={encounterId}
            facilityId={fid}
            status={encounter.status}
            isLocked={isLocked}
            roleCodes={roles}
            onSaved={onEmbeddedUpdate}
          />
        ) : null}

        {activeSection === "summary" && fid ? (
          <EmergencyVisitSummaryPanel
            encounterId={encounterId}
            facilityId={fid}
            encounter={encounter}
            triageSnapshot={triageSnapshot}
            resultsRefresh={resultsRefresh}
            resultsTabHref={`${genericEncounterHref}?tab=results`}
            diagnosticsTabHref={`${genericEncounterHref}?tab=diagnostics`}
            ivAccessFetchEnabled={false}
            proceduresFetchEnabled={false}
            canOpenProcedureDocumentation={false}
          />
        ) : null}
      </section>

      {usesBottomRail ? (
        <HospitalTechnicianBottomRail
          tiles={dashboardTiles}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />
      ) : null}
    </div>
  );
}
