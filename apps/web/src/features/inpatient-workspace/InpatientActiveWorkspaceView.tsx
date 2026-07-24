"use client";

/**
 * D4A.2.7B / MEDUI.D4A.3.2 — Inpatient active workspace shell.
 * Bootstrap via inpatient-operations (type-gated). Blocks writers when unresolved.
 * Compact header + unified sticky nav; vitals/IV reuse shared encounter panels.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  providerPrimaryNav,
  nursingPrimaryNav,
  technicianPrimaryNav,
  type EncounterResolutionFailureCategory,
  type HospitalWorkspaceBootstrapV1,
  type InpatientWorkspaceRole,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { apiFetch } from "@/lib/apiClient";
import {
  snapshotsToVitalSummaryReadings,
  VitalSummaryPanel,
  vitalSummaryInitials,
  type VitalSummaryReading,
} from "@/components/patients/VitalSummaryPanel";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import {
  parseVitalsHistoryEntries,
  type VitalsHistoryEntry,
} from "@/lib/encounterClinicalSafetyUi";
import { EncounterVitalsPanel } from "@/features/encounters/EncounterVitalsPanel";
import { EncounterIvAccessPanel } from "@/features/encounters/EncounterIvAccessPanel";
import {
  VitalReadingEditModal,
  VitalReadingVoidModal,
} from "@/features/emergency/VitalReadingGovernanceModals";
import {
  INPATIENT_CENSUS_PATH,
  isInpatientWorkspaceEnabledInBrowser,
  inpatientActiveWorkspacePath,
  inpatientNursingWorkspacePath,
  inpatientProviderWorkspacePath,
  inpatientSharedChartPath,
  inpatientTechnicianWorkspacePath,
} from "./inpatientWorkspacePaths";
import {
  INPATIENT_STICKY_NAV_SECTIONS,
  parseInpatientWorkspaceSection,
  type InpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { InpatientWorkspaceSectionNav } from "./InpatientWorkspaceSectionNav";
import { InpatientWorkspacePanel } from "./InpatientWorkspacePanel";
import { EnterpriseHospitalPatientHeader } from "./EnterpriseHospitalPatientHeader";
import { InpatientEncounterUnavailablePanel } from "./InpatientEncounterUnavailablePanel";
import { InpatientLongitudinalOverviewStrip } from "./InpatientLongitudinalOverviewStrip";
import { fetchInpatientWorkspaceBootstrap } from "@/features/hospital-care/inpatientOperationsApi";
import { emergencyActiveWorkspacePath } from "@/features/emergency/emergencyRoutes";
import { observationActiveWorkspacePath } from "@/features/observation-workspace/observationWorkspacePaths";
import { classifyInpatientBootstrapClientError } from "./inpatientBootstrapClientErrors";

function roleFromPath(pathname: string): InpatientWorkspaceRole {
  if (pathname.endsWith("/provider")) return "PROVIDER";
  if (pathname.endsWith("/nursing")) return "NURSING";
  if (pathname.endsWith("/technician")) return "TECHNICIAN";
  if (pathname.endsWith("/chart")) return "CHART";
  return "CHART";
}

function defaultRoleFromAuth(roles: string[]): InpatientWorkspaceRole {
  const set = new Set(roles.map((r) => r.toUpperCase()));
  if (set.has("PROVIDER")) return "PROVIDER";
  if (set.has("RN")) return "NURSING";
  if (set.has("LAB") || set.has("RADIOLOGY")) return "TECHNICIAN";
  return "CHART";
}

function filterSectionsForRole(role: InpatientWorkspaceRole): InpatientWorkspaceSection[] {
  const list =
    role === "PROVIDER"
      ? providerPrimaryNav()
      : role === "NURSING"
        ? nursingPrimaryNav()
        : role === "TECHNICIAN"
          ? technicianPrimaryNav()
          : providerPrimaryNav();
  return list as InpatientWorkspaceSection[];
}

/** Sticky chrome sections for role — includes Review Orders / MAR / Review Results. */
function stickySectionsForRole(role: InpatientWorkspaceRole): InpatientWorkspaceSection[] {
  const stickyIds = INPATIENT_STICKY_NAV_SECTIONS.map((s) => s.id);
  if (role === "TECHNICIAN") {
    return stickyIds.filter((id) =>
      (["overview", "nursing", "timeline", "summary"] as InpatientWorkspaceSection[]).includes(id)
    );
  }
  return stickyIds;
}

function asApiObject<T extends Record<string, unknown>>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as T;
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
      measuredAt: entry.recordedAt,
    }));
}

export function InpatientActiveWorkspaceView({
  forcedRole,
}: {
  forcedRole?: InpatientWorkspaceRole;
}) {
  const { t, language } = useI18n();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { roles, ready: authReady, facilityId } = useFacilityAndRoles();
  const encounterId = String(params?.id ?? "").trim();
  const workspaceEnabled = isInpatientWorkspaceEnabledInBrowser();

  const pathRole = forcedRole ?? roleFromPath(pathname);
  const [role, setRole] = useState<InpatientWorkspaceRole>(pathRole);

  useEffect(() => {
    if (forcedRole) {
      setRole(forcedRole);
      return;
    }
    if (pathname.match(/\/(provider|nursing|technician|chart)$/)) {
      setRole(roleFromPath(pathname));
      return;
    }
    if (authReady) {
      const preferred = defaultRoleFromAuth(roles);
      setRole(preferred);
      const target =
        preferred === "PROVIDER"
          ? inpatientProviderWorkspacePath(encounterId)
          : preferred === "NURSING"
            ? inpatientNursingWorkspacePath(encounterId)
            : preferred === "TECHNICIAN"
              ? inpatientTechnicianWorkspacePath(encounterId)
              : inpatientSharedChartPath(encounterId);
      if (encounterId && !pathname.endsWith(`/${preferred.toLowerCase()}`) && !pathname.endsWith("/chart")) {
        router.replace(target);
      }
    }
  }, [forcedRole, pathname, authReady, roles, encounterId, router]);

  const stickyAllowed = stickySectionsForRole(role);
  const allowed = useMemo(() => {
    const base = filterSectionsForRole(role);
    return Array.from(new Set([...base, ...stickyAllowed]));
  }, [role, stickyAllowed]);

  const initialSection =
    parseInpatientWorkspaceSection(searchParams.get("section")) ?? allowed[0] ?? "overview";
  const [section, setSection] = useState<InpatientWorkspaceSection>(
    allowed.includes(initialSection) ? initialSection : allowed[0] ?? "overview"
  );
  const [bootstrap, setBootstrap] = useState<HospitalWorkspaceBootstrapV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCategory, setErrorCategory] = useState<
    EncounterResolutionFailureCategory | string | null
  >(null);

  const [showQuickVitals, setShowQuickVitals] = useState(false);
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [esiLevel, setEsiLevel] = useState<string | number | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsHistoryEntry[]>([]);
  const [vitalsRefresh, setVitalsRefresh] = useState(0);
  const [editVitalReading, setEditVitalReading] = useState<VitalSummaryReading | null>(null);
  const [voidVitalReading, setVoidVitalReading] = useState<VitalSummaryReading | null>(null);
  const [showIvAccessModal, setShowIvAccessModal] = useState(false);
  const [ivRefreshToken, setIvRefreshToken] = useState(0);

  useEffect(() => {
    const fromUrl = parseInpatientWorkspaceSection(searchParams.get("section"));
    if (fromUrl && allowed.includes(fromUrl)) setSection(fromUrl);
  }, [searchParams, allowed]);

  const selectSection = useCallback(
    (next: InpatientWorkspaceSection) => {
      if (!allowed.includes(next)) return;
      setSection(next);
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("section", next);
      router.replace(`?${qs.toString()}`, { scroll: false });
    },
    [router, searchParams, allowed]
  );

  const loadBootstrap = useCallback(async () => {
    if (!encounterId) {
      setBootstrap(null);
      setErrorCategory("MISSING_ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorCategory(null);
    try {
      const data = await fetchInpatientWorkspaceBootstrap(encounterId, role, { facilityId });
      setBootstrap(data);
      if (!data.resolution.ok) {
        setErrorCategory(data.resolution.category);
      } else if (
        data.resolution.redirectedFromEncounterId &&
        data.resolution.encounterId &&
        data.resolution.encounterId !== encounterId
      ) {
        const dest = data.resolution.encounterId;
        if (role === "PROVIDER") router.replace(inpatientProviderWorkspacePath(dest));
        else if (role === "NURSING") router.replace(inpatientNursingWorkspacePath(dest));
        else if (role === "TECHNICIAN") router.replace(inpatientTechnicianWorkspacePath(dest));
        else if (role === "CHART") router.replace(inpatientSharedChartPath(dest));
        else router.replace(inpatientActiveWorkspacePath(dest));
      }
    } catch (err) {
      setBootstrap(null);
      setErrorCategory(classifyInpatientBootstrapClientError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId, role, router, facilityId]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const loadTriageAndVitals = useCallback(async () => {
    if (!encounterId || !facilityId) return;
    try {
      const [triageRaw, historyRaw] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/triage`, { facilityId }).catch(() => null),
        apiFetch(`/encounters/${encounterId}/vitals-history`, { facilityId }).catch(() => null),
      ]);
      const triage = asApiObject(triageRaw);
      setTriageSnapshot(triage);
      const esi = triage && "esi" in triage ? (triage.esi as string | number | null) : null;
      setEsiLevel(esi ?? null);
      setVitalsHistory(parseVitalsHistoryEntries(historyRaw));
    } catch {
      setTriageSnapshot(null);
      setEsiLevel(null);
      setVitalsHistory([]);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadTriageAndVitals();
  }, [loadTriageAndVitals, vitalsRefresh]);

  const writersEnabled = Boolean(bootstrap?.writersEnabled && bootstrap.resolution.ok);
  const header = bootstrap?.header ?? null;

  const encounterLite = useMemo(() => {
    if (!header || !bootstrap?.resolution.ok) return null;
    return {
      id: header.encounterId,
      status: header.encounterStatus,
      type: header.encounterType,
      providerDocumentationStatus: null,
      patient: {
        id: header.patientId,
        firstName: header.patientName.split(/\s+/)[0] ?? null,
        lastName: header.patientName.split(/\s+/).slice(1).join(" ") || null,
        mrn: header.mrn,
        dob: header.dateOfBirth,
        sexAtBirth: header.sexAtBirth,
      },
    };
  }, [header, bootstrap]);

  const sourceHref = useMemo(() => {
    if (!bootstrap || bootstrap.resolution.ok) return null;
    const actual = bootstrap.resolution.actualEncounterType;
    if (!actual || !encounterId) return null;
    const upper = String(actual).toUpperCase();
    if (upper === "EMERGENCY") return emergencyActiveWorkspacePath(encounterId);
    if (upper.includes("OBS")) return observationActiveWorkspacePath(encounterId);
    return null;
  }, [bootstrap, encounterId]);

  const encounterVitalSummaryReadings = useMemo(() => {
    const sortedHistory = [...vitalsHistory].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    const snapshots = vitalsHistoryToSnapshots(sortedHistory, header?.encounterType ?? "INPATIENT");
    const readings = snapshotsToVitalSummaryReadings(snapshots, language, t);
    return readings.map((row, idx) => {
      const displayName = sortedHistory[idx]?.recordedBy?.displayName ?? null;
      if (!displayName) return row;
      return { ...row, byInitials: vitalSummaryInitials({ displayName }) };
    });
  }, [vitalsHistory, language, t, header?.encounterType]);

  const canDocumentVitals =
    writersEnabled &&
    Boolean(facilityId) &&
    (role === "NURSING" || role === "TECHNICIAN" || role === "CHART" || role === "PROVIDER");
  const canDocumentIv =
    writersEnabled &&
    Boolean(facilityId) &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      role === "NURSING" ||
      role === "CHART");

  const openVitalsBoard = () => {
    setShowQuickVitals(true);
    setShowVitalsHistory(true);
  };

  return (
    <div style={{ padding: "12px 16px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <Link href={INPATIENT_CENSUS_PATH} style={{ fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
          {t("inpatientD3e.workspace.backCensus")}
        </Link>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {t("inpatientWorkspaceRecoveryD4a27b.roleLabel")}:{" "}
          <strong>{t(`inpatientWorkspaceRecoveryD4a27b.roles.${role}`)}</strong>
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : errorCategory || !writersEnabled || !header ? (
        <InpatientEncounterUnavailablePanel
          category={errorCategory ?? "UNKNOWN"}
          requestedEncounterId={encounterId}
          actualEncounterType={
            bootstrap && !bootstrap.resolution.ok
              ? bootstrap.resolution.actualEncounterType
              : null
          }
          onRetry={() => void loadBootstrap()}
          sourceEncounterHref={sourceHref}
          showTechnical={roles.includes("ADMIN")}
        />
      ) : (
        <>
          <EnterpriseHospitalPatientHeader
            header={header}
            role={role}
            sticky={false}
            facilityId={facilityId}
            esiLevel={esiLevel}
            ivRefreshToken={ivRefreshToken}
            onDocumentVitals={canDocumentVitals ? openVitalsBoard : undefined}
            onOpenIvAccess={canDocumentIv ? () => setShowIvAccessModal(true) : undefined}
            onOpenAllergies={() => selectSection("overview")}
            onOpenCodeStatus={() => selectSection("overview")}
            onOpenIsolation={() => selectSection("overview")}
          />

          <InpatientWorkspaceSectionNav
            active={section}
            onSelect={selectSection}
            allowedSections={stickyAllowed}
          />

          {(showVitalsHistory || showQuickVitals) && facilityId ? (
            <div
              style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 12 }}
              data-testid="inpatient-vitals-board"
            >
              <VitalSummaryPanel
                readings={encounterVitalSummaryReadings}
                latestReadingId={encounterVitalSummaryReadings[0]?.id}
                onClose={() => {
                  setShowVitalsHistory(false);
                  if (!canDocumentVitals) setShowQuickVitals(false);
                }}
                actionsEnabled={canDocumentVitals && header.encounterStatus === "OPEN"}
                onEditReading={canDocumentVitals ? (r) => setEditVitalReading(r) : undefined}
                onVoidReading={canDocumentVitals ? (r) => setVoidVitalReading(r) : undefined}
              />
            </div>
          ) : null}

          {showQuickVitals && canDocumentVitals && facilityId ? (
            <EncounterVitalsPanel
              open={showQuickVitals}
              onClose={() => setShowQuickVitals(false)}
              encounterId={encounterId}
              facilityId={facilityId}
              patientId={header.patientId}
              triageSnapshot={triageSnapshot}
              onSaved={async () => {
                setVitalsRefresh((r) => r + 1);
                setShowVitalsHistory(true);
                await loadBootstrap();
              }}
            />
          ) : null}

          {showIvAccessModal && facilityId ? (
            <EncounterIvAccessPanel
              open={showIvAccessModal}
              onClose={() => setShowIvAccessModal(false)}
              encounterId={encounterId}
              facilityId={facilityId}
              onRecorded={() => {
                setIvRefreshToken((n) => n + 1);
              }}
            />
          ) : null}

          {facilityId ? (
            <>
              <VitalReadingEditModal
                open={Boolean(editVitalReading)}
                reading={editVitalReading}
                encounterId={encounterId}
                facilityId={facilityId}
                onClose={() => setEditVitalReading(null)}
                onDone={async () => {
                  setVitalsRefresh((r) => r + 1);
                }}
              />
              <VitalReadingVoidModal
                open={Boolean(voidVitalReading)}
                reading={voidVitalReading}
                encounterId={encounterId}
                facilityId={facilityId}
                onClose={() => setVoidVitalReading(null)}
                onDone={async () => {
                  setVitalsRefresh((r) => r + 1);
                }}
              />
            </>
          ) : null}

          <section style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px" }}>
            {!workspaceEnabled ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>
                {t("inpatientWorkspaceRecoveryD4a27b.states.NOT_CONFIGURED")}
              </p>
            ) : (
              <>
                {section === "overview" ? (
                  <InpatientLongitudinalOverviewStrip
                    header={header}
                    onNavigateSection={selectSection}
                    onOpenVitals={canDocumentVitals ? openVitalsBoard : undefined}
                  />
                ) : null}
                <InpatientWorkspacePanel
                  section={section}
                  encounterId={encounterId}
                  encounter={encounterLite}
                  workspaceEnabled={workspaceEnabled}
                  writersEnabled={writersEnabled}
                  workspaceRole={role}
                  onRefetchEncounter={loadBootstrap}
                  onNavigateSection={selectSection}
                />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
