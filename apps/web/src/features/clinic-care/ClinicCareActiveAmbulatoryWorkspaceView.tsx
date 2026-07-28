/**
 * MEDUI.D4C.5B — Active Clinic Workspace (ambulatory).
 * Single unified encounter workspace: `/app/encounters/:id?workspace=ambulatory&section=`.
 * Reuses the enterprise encounter shell + shared clinical engines only — no
 * ClinicPatientChart, no ClinicEncounterChart/Status, no popup chart gateway.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CLINIC_CARE_AMBULATORY_WORKFLOW_ACTIONS,
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
  canAccessClinicCareAmbulatoryWorkspaceSection,
  clinicCareAmbulatoryWorkflowActionLabelKey,
  getDefaultClinicCareAmbulatoryWorkspaceSection,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  parseClinicCareAmbulatoryWorkspaceSection,
  resolveClinicCareAmbulatoryWorkflowTarget,
  type ClinicCareAmbulatoryWorkflowAction,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { patchEncounterWorkflowState } from "@/lib/clinicalWorklistApi";
import { isEncounterLocked } from "@/lib/encounterLock";
import {
  buildAllergyStripSummary,
  buildErWorkspaceVitalPairs,
  triagePreviewSliceFromTriageGet,
} from "@/features/emergency/emergencyTriageDocPreview";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { CLINIC_CARE_HOME, CLINIC_CARE_TODAYS_VISITS } from "@/features/clinic-care/clinicCarePaths";
import { ClinicCareAmbulatoryPatientHeader } from "@/features/clinic-care/ClinicCareAmbulatoryPatientHeader";
import { ClinicCareAmbulatoryWorkspaceSectionNav } from "@/features/clinic-care/ClinicCareAmbulatoryWorkspaceSectionNav";
import { ClinicCareAmbulatoryWorkspacePanels } from "@/features/clinic-care/ClinicCareAmbulatoryWorkspacePanels";

type EncounterShell = {
  id: string;
  status?: string | null;
  type?: string | null;
  workflowState?: string | null;
  createdAt?: string | null;
  admittedAt?: string | null;
  roomLabel?: string | null;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
  admissionSummaryJson?: unknown;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  clinicianImpression?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  followUpDate?: string | null;
  nursingAssessment?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  physicianAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  } | null;
};

const compactBtn: React.CSSProperties = {
  display: "inline-flex",
  height: 30,
  alignItems: "center",
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #0d9488",
  background: "#0d9488",
  color: "#fff",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
};

export function ClinicCareActiveAmbulatoryWorkspaceView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useI18n();
  const encounterId = params?.id as string;
  const { facilityId, roles, ready: rolesReady, userId, canPrescribe, facilityTimeZone } =
    useFacilityAndRoles();

  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [resultsRefresh, setResultsRefresh] = useState(0);
  const [activeSection, setActiveSection] = useState<ClinicCareAmbulatoryWorkspaceSection>(
    () => parseClinicCareAmbulatoryWorkspaceSection(searchParams?.get("section")) ?? "summary"
  );
  const [workflowBusy, setWorkflowBusy] = useState<ClinicCareAmbulatoryWorkflowAction | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const fromParam = searchParams?.get("from");
  const backHref = fromParam === "todays-visits" ? CLINIC_CARE_TODAYS_VISITS : CLINIC_CARE_HOME;
  const backLabel =
    fromParam === "todays-visits" ? t("clinicCareD4c5b.backTodaysVisits") : t("clinicCareD4c5b.backClinicCare");

  const load = useCallback(async () => {
    if (!encounterId || !facilityId) return;
    setError(null);
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`, { facilityId });
      const enc = asApiObject<EncounterShell>(raw);
      if (enc) {
        setEncounter(enc);
      } else {
        setEncounter(null);
        setError(t("clinicCareD4c5b.loadFailed"));
      }
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      setError(msg || t("clinicCareD4c5b.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadTriage = useCallback(async () => {
    if (!encounterId || !facilityId) return;
    try {
      const data = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
      setTriageSnapshot(
        data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null
      );
    } catch {
      setTriageSnapshot(null);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  const clinicalStrip = useMemo(() => {
    const parsed = triagePreviewSliceFromTriageGet(triageSnapshot, language);
    if (!parsed) return { pairs: undefined, allergyText: undefined };
    return {
      pairs: buildErWorkspaceVitalPairs(parsed.slice, language),
      allergyText: buildAllergyStripSummary(parsed.slice, parsed.er, language),
    };
  }, [triageSnapshot, language]);

  const goToSection = useCallback(
    (section: ClinicCareAmbulatoryWorkspaceSection) => {
      setActiveSection(section);
      const qs = new URLSearchParams();
      qs.set("workspace", CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY);
      qs.set("section", section);
      if (fromParam) qs.set("from", fromParam);
      router.replace(`/app/encounters/${encodeURIComponent(encounterId)}?${qs.toString()}`, { scroll: false });
    },
    [router, encounterId, fromParam]
  );

  const visibleSections = useMemo(() => getVisibleClinicCareAmbulatoryWorkspaceSections(roles), [roles]);

  // Route guard: unauthorized / missing section in URL → redirect to role default.
  useEffect(() => {
    if (!rolesReady) return;
    const requested = parseClinicCareAmbulatoryWorkspaceSection(searchParams?.get("section"));
    if (requested && canAccessClinicCareAmbulatoryWorkspaceSection(roles, requested)) {
      setActiveSection(requested);
      return;
    }
    const fallback = getDefaultClinicCareAmbulatoryWorkspaceSection(roles);
    setActiveSection(fallback);
    const qs = new URLSearchParams();
    qs.set("workspace", CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY);
    qs.set("section", fallback);
    if (fromParam) qs.set("from", fromParam);
    router.replace(`/app/encounters/${encodeURIComponent(encounterId)}?${qs.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesReady, roles, searchParams, encounterId]);

  const isRnOrAdmin = roles.includes("RN") || roles.includes("ADMIN");
  const isProviderOrAdmin = roles.includes("PROVIDER") || roles.includes("ADMIN");

  const workflowButtons = useMemo(() => {
    const wf = encounter?.workflowState ?? null;
    const out: { action: ClinicCareAmbulatoryWorkflowAction; target: string }[] = [];
    const seen = new Set<ClinicCareAmbulatoryWorkflowAction>();
    const consider = (action: ClinicCareAmbulatoryWorkflowAction) => {
      if (seen.has(action)) return;
      const target = resolveClinicCareAmbulatoryWorkflowTarget(action, wf);
      if (target) {
        out.push({ action, target });
        seen.add(action);
      }
    };
    if (encounter?.status === "OPEN" && !isEncounterLocked(encounter)) {
      if (isRnOrAdmin) {
        consider("START_INTAKE");
        consider("READY_FOR_PROVIDER");
      }
      if (isProviderOrAdmin) {
        consider("START_CONSULTATION");
      }
      if (isRnOrAdmin || isProviderOrAdmin) {
        consider("READY_FOR_CHECKOUT");
        consider("COMPLETE_VISIT");
      }
    }
    return out;
  }, [encounter, isRnOrAdmin, isProviderOrAdmin]);

  const runWorkflowAction = useCallback(
    async (action: ClinicCareAmbulatoryWorkflowAction, target: string) => {
      if (!facilityId || !encounter) return;
      setWorkflowBusy(action);
      setWorkflowError(null);
      try {
        if (target !== encounter.workflowState) {
          await patchEncounterWorkflowState(facilityId, encounter.id, target);
          await load();
        }
        if (action === "START_CONSULTATION") {
          goToSection("medical-evaluation");
        }
      } catch (e) {
        setWorkflowError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
      } finally {
        setWorkflowBusy(null);
      }
    },
    [facilityId, encounter, load, language, goToSection]
  );

  if (!rolesReady || (!encounter && loading)) {
    return (
      <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", color: "#64748b" }}>
        <p style={{ margin: "0 0 12px 0", fontSize: 13 }}>
          <Link href={backHref} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            {backLabel}
          </Link>
        </p>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "1.35rem", fontWeight: 600, color: "#0f172a" }}>
          {t("clinicCareD4c5b.title")}
        </h1>
        <div style={{ ...MEDORA_CARD_SHELL, padding: 20, fontSize: 14 }}>{t("clinicCareD4c5b.loading")}</div>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? t("clinicCareD4c5b.loadFailed")}</p>
        <p style={{ margin: "16px 0 0 0" }}>
          <Link href={backHref} style={{ color: "#2563eb", fontWeight: 600 }}>
            {backLabel}
          </Link>
        </p>
      </div>
    );
  }

  const isLocked = isEncounterLocked(encounter);
  const providerName = encounter.physicianAssigned
    ? `${encounter.physicianAssigned.firstName ?? ""} ${encounter.physicianAssigned.lastName ?? ""}`.trim() || null
    : null;

  return (
    <div
      data-testid="clinic-care-active-ambulatory-workspace"
      style={{ padding: "20px 20px 40px", maxWidth: 1180, margin: "0 auto", boxSizing: "border-box" }}
    >
      <p style={{ margin: "0 0 10px 0", fontSize: 13 }}>
        <Link href={backHref} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
          {backLabel}
        </Link>
      </p>

      <header style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 600, color: "#0f172a" }}>
          {t("clinicCareD4c5b.title")}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c5b.subtitle")}</p>
      </header>

      {error ? (
        <div style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 14, borderColor: "#fecaca", background: "#fef2f2" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>{error}</p>
        </div>
      ) : null}

      <div style={{ marginBottom: 14 }}>
        <ClinicCareAmbulatoryPatientHeader
          patient={encounter.patient}
          chiefComplaint={encounter.chiefComplaint || encounter.visitReason}
          arrivedAt={encounter.createdAt}
          statusKey={encounter.status}
          vitalPairs={clinicalStrip.pairs}
          allergyText={clinicalStrip.allergyText}
          encounterRoom={{
            roomLabel: encounter.roomLabel,
            type: encounter.type,
            admissionSummaryJson: encounter.admissionSummaryJson,
            governedRoomDisplay: encounter.governedRoomDisplay,
            governedRoomUnit: encounter.governedRoomUnit,
            governedRoomHasAssignment: encounter.governedRoomHasAssignment,
          }}
          providerName={providerName}
          language={language}
          t={t}
        >
          {workflowButtons.map(({ action, target }) => (
            <button
              key={action}
              type="button"
              disabled={workflowBusy === action}
              onClick={() => void runWorkflowAction(action, target)}
              style={{ ...compactBtn, opacity: workflowBusy === action ? 0.6 : 1 }}
            >
              {t(clinicCareAmbulatoryWorkflowActionLabelKey(action))}
            </button>
          ))}
        </ClinicCareAmbulatoryPatientHeader>
        {workflowError ? (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
            {workflowError}
          </p>
        ) : null}
      </div>

      <ClinicCareAmbulatoryWorkspaceSectionNav
        sections={visibleSections}
        active={activeSection}
        onSelect={goToSection}
        t={t}
      />

      <section style={{ marginTop: 14 }}>
        <ClinicCareAmbulatoryWorkspacePanels
          section={activeSection}
          encounter={encounter}
          facilityId={facilityId}
          facilityTimeZone={facilityTimeZone}
          roles={roles}
          userId={userId}
          canPrescribe={canPrescribe}
          isLocked={isLocked}
          resultsRefresh={resultsRefresh}
          onUpdate={async () => {
            await load();
            await loadTriage();
            setResultsRefresh((r) => r + 1);
          }}
        />
      </section>
    </div>
  );
}
