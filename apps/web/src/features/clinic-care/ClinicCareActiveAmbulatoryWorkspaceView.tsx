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
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
  canAccessClinicCareAmbulatoryWorkspaceSection,
  clinicCareAmbulatoryWorkflowActionLabelKey,
  getDefaultClinicCareAmbulatoryWorkspaceSection,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  isAmbulatoryEnterpriseCloseTarget,
  parseClinicCareAmbulatoryWorkspaceSection,
  projectAmbulatoryEnterpriseCloseResponse,
  projectAmbulatoryLifecycleHeader,
  resolveClinicCareAmbulatoryWorkflowTarget,
  shouldShowAmbulatoryCompleteVisitAction,
  ambulatoryWorkflowPendingLabelKey,
  D4C7F_ENCOUNTER_PENDING_ITEMS_CODE,
  D4C7F_ENCOUNTER_NON_OVERRIDABLE_BLOCKERS_CODE,
  D4C7F_PENDING_ITEMS_ACK_VERSION,
  D4C7F_PENDING_ITEMS_OVERRIDE_REASON,
  EMPTY_D4C7F_PENDING_ITEM_COUNTS,
  type ClinicCareAmbulatoryWorkflowAction,
  type ClinicCareAmbulatoryWorkspaceSection,
  type D4c7fPendingItemCounts,
} from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  closeAmbulatoryEncounterViaEnterprise,
  patchEncounterWorkflowState,
} from "@/lib/clinicalWorklistApi";
import { invalidateClinicCareAmbulatoryLifecycleCache } from "@/lib/invalidateClinicCareAmbulatoryLifecycleCache";
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
import { ClinicCareAmbulatoryClosurePendingModal } from "@/features/clinic-care/ClinicCareAmbulatoryClosurePendingModal";

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
  dischargeSummaryJson?: unknown;
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
  const { facilityId, roles, ready: rolesReady, userId, canPrescribe, facilityTimeZone, facilityCountry, facilities } =
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
  const [closeSuccess, setCloseSuccess] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<D4c7fPendingItemCounts>({
    ...EMPTY_D4C7F_PENDING_ITEM_COUNTS,
  });
  const [pendingOverrideAllowed, setPendingOverrideAllowed] = useState(false);
  const [pendingAck, setPendingAck] = useState(false);
  const [hardBlockMessage, setHardBlockMessage] = useState<string | null>(null);

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
    if (!parsed) return { pairs: undefined as { label: string; value: string }[] | undefined, allergyText: undefined as string | undefined };
    const pairs = buildErWorkspaceVitalPairs(parsed.slice, language);
    const pain = parsed.slice.painScore?.trim();
    if (pain) {
      pairs.push({ label: language === "en" ? "Pain" : "Douleur", value: pain });
    }
    return {
      pairs,
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

  const lifecycleHeader = useMemo(
    () =>
      projectAmbulatoryLifecycleHeader({
        encounterStatus: encounter?.status,
        workflowState: encounter?.workflowState,
        providerDocumentationStatus: encounter?.providerDocumentationStatus,
      }),
    [encounter]
  );

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
    const locked = encounter ? isEncounterLocked(encounter) : true;
    if (encounter?.status === "OPEN" && !locked) {
      if (isRnOrAdmin) {
        consider("START_INTAKE");
        consider("READY_FOR_PROVIDER");
      }
      if (isProviderOrAdmin) {
        consider("START_CONSULTATION");
      }
      if (isRnOrAdmin || isProviderOrAdmin) {
        consider("READY_FOR_CHECKOUT");
      }
    }
    // MEDUI.D4C.7D — COMPLETE_VISIT → enterprise close remains available after docs lock.
    if (
      shouldShowAmbulatoryCompleteVisitAction({
        encounterStatus: encounter?.status,
        workflowState: encounter?.workflowState,
        roleCodes: roles,
      })
    ) {
      consider("COMPLETE_VISIT");
    }
    return out;
  }, [encounter, isRnOrAdmin, isProviderOrAdmin, roles]);

  const applyCloseProjection = useCallback(
    (closed: unknown) => {
      const projection = projectAmbulatoryEnterpriseCloseResponse(closed);
      if (projection && projection.status !== "CLOSED") {
        throw new Error(t("clinicCareD4c7d.messages.closeFailed"));
      }
      if (projection) {
        setEncounter((prev) =>
          prev
            ? {
                ...prev,
                status: projection.status,
                workflowState: projection.workflowState,
                providerDocumentationStatus: projection.providerDocumentationStatus,
                roomLabel: projection.roomLabel,
              }
            : prev
        );
      }
      invalidateClinicCareAmbulatoryLifecycleCache({
        facilityId: facilityId!,
        encounterId: encounter!.id,
      });
      setCloseSuccess(true);
      setPendingModalOpen(false);
      setPendingAck(false);
    },
    [encounter, facilityId, t]
  );

  const runWorkflowAction = useCallback(
    async (action: ClinicCareAmbulatoryWorkflowAction, target: string) => {
      if (!facilityId || !encounter) return;
      if (workflowBusy) return;
      setWorkflowBusy(action);
      setWorkflowError(null);
      setHardBlockMessage(null);
      setCloseSuccess(false);
      try {
        if (isAmbulatoryEnterpriseCloseTarget(target) || action === "COMPLETE_VISIT") {
          let closed: unknown;
          try {
            closed = await closeAmbulatoryEncounterViaEnterprise(facilityId, encounter.id, {
              dischargeStatus: "DISCHARGED",
            });
          } catch (firstErr) {
            const err = firstErr as Error & { errorCode?: string | null; body?: unknown };
            const code = err.errorCode ?? null;
            const body = err.body && typeof err.body === "object" ? (err.body as Record<string, unknown>) : null;
            const msg = err instanceof Error ? err.message : String(firstErr ?? "");

            if (code === D4C7F_ENCOUNTER_NON_OVERRIDABLE_BLOCKERS_CODE) {
              setHardBlockMessage(
                normalizeUserFacingError(msg, language) || t("clinicCareD4c7f.closure.hardBlockTitle")
              );
              throw firstErr;
            }

            if (code === D4C7F_ENCOUNTER_PENDING_ITEMS_CODE || body?.code === D4C7F_ENCOUNTER_PENDING_ITEMS_CODE) {
              const pending =
                body?.pending && typeof body.pending === "object"
                  ? ({ ...EMPTY_D4C7F_PENDING_ITEM_COUNTS, ...(body.pending as object) } as D4c7fPendingItemCounts)
                  : { ...EMPTY_D4C7F_PENDING_ITEM_COUNTS };
              setPendingCounts(pending);
              setPendingOverrideAllowed(body?.overrideAllowed === true);
              setPendingAck(false);
              setPendingModalOpen(true);
              return;
            }

            const needsDocAck =
              code === "ENCOUNTER_CLOSE_DEFICIENCIES_NOT_ACKNOWLEDGED" ||
              msg.includes("acknowledgeDeficiencies") ||
              msg.includes("ENCOUNTER_CLOSE_DEFICIENCIES") ||
              msg.includes("documentation est incomplète");
            const needsSafetyAck =
              code === "ENCOUNTER_CLOSE_DISPOSITION_SAFETY_BLOCKED" ||
              msg.includes("acknowledgeDispositionSafety") ||
              msg.includes("ENCOUNTER_CLOSE_DISPOSITION_SAFETY") ||
              msg.includes("sécurité disposition");
            if (!needsDocAck && !needsSafetyAck) throw firstErr;
            // Deficiencies / other disposition safety — explicit ack only for docs path; do not silent-ack pending.
            if (needsSafetyAck && !needsDocAck) {
              setWorkflowError(
                normalizeUserFacingError(msg, language) || t("clinicCareD4c7f.errors.safetyMustResolve")
              );
              return;
            }
            closed = await closeAmbulatoryEncounterViaEnterprise(facilityId, encounter.id, {
              dischargeStatus: "DISCHARGED",
              acknowledgeDeficiencies: needsDocAck,
            });
          }
          applyCloseProjection(closed);
          await load();
          return;
        }
        if (target !== encounter.workflowState) {
          const patched = await patchEncounterWorkflowState(facilityId, encounter.id, target);
          const next = asApiObject<EncounterShell>(patched);
          if (next?.workflowState || next?.status) {
            setEncounter((prev) => (prev ? { ...prev, ...next } : next));
          }
          invalidateClinicCareAmbulatoryLifecycleCache({
            facilityId,
            encounterId: encounter.id,
          });
          await load();
        }
        if (action === "START_CONSULTATION") {
          goToSection("medical-evaluation");
        }
      } catch (e) {
        setCloseSuccess(false);
        setWorkflowError(
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
            t("clinicCareD4c7d.messages.closeFailed")
        );
      } finally {
        setWorkflowBusy(null);
      }
    },
    [facilityId, encounter, load, language, goToSection, t, workflowBusy, applyCloseProjection]
  );

  const confirmPendingOverrideClose = useCallback(async () => {
    if (!facilityId || !encounter || !pendingAck) return;
    setWorkflowBusy("COMPLETE_VISIT");
    setWorkflowError(null);
    try {
      const closed = await closeAmbulatoryEncounterViaEnterprise(facilityId, encounter.id, {
        dischargeStatus: "DISCHARGED",
        acknowledgePendingItems: true,
        acknowledgementVersion: D4C7F_PENDING_ITEMS_ACK_VERSION,
        pendingItemsOverrideReason: D4C7F_PENDING_ITEMS_OVERRIDE_REASON,
      });
      applyCloseProjection(closed);
      await load();
    } catch (e) {
      setCloseSuccess(false);
      setWorkflowError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("clinicCareD4c7d.messages.closeFailed")
      );
    } finally {
      setWorkflowBusy(null);
    }
  }, [facilityId, encounter, pendingAck, applyCloseProjection, load, language, t]);

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
      data-care-setting="AMBULATORY"
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
          statusKey={lifecycleHeader.badgeStatusKey}
          statusLabel={t(lifecycleHeader.badgeLabelKey)}
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
          workflowStateLabel={t(lifecycleHeader.metaLabelKey)}
          followUpDateLabel={
            encounter.followUpDate
              ? new Date(encounter.followUpDate).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")
              : null
          }
          language={language}
          t={t}
        >
          {workflowButtons.map(({ action, target }) => (
            <button
              key={action}
              type="button"
              disabled={Boolean(workflowBusy) || encounter.status === "CLOSED"}
              onClick={() => void runWorkflowAction(action, target)}
              aria-busy={workflowBusy === action}
              style={{ ...compactBtn, opacity: workflowBusy === action ? 0.6 : 1 }}
            >
              {workflowBusy === action
                ? t(ambulatoryWorkflowPendingLabelKey(action))
                : encounter.status === "CLOSED"
                  ? t("clinicCareD4c7f.success.closed")
                  : action === "COMPLETE_VISIT"
                    ? t("clinicCareD4c7d.actions.closeEncounter")
                    : t(clinicCareAmbulatoryWorkflowActionLabelKey(action))}
            </button>
          ))}
        </ClinicCareAmbulatoryPatientHeader>
        {hardBlockMessage ? (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
            {t("clinicCareD4c7f.closure.hardBlockTitle")} {hardBlockMessage}
          </p>
        ) : null}
        {closeSuccess ? (
          <p role="status" style={{ margin: "8px 0 0", fontSize: 12, color: "#047857" }}>
            {t("clinicCareD4c7d.messages.closed")}
          </p>
        ) : null}
        {workflowError ? (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
            {workflowError}
          </p>
        ) : null}
      </div>

      <ClinicCareAmbulatoryClosurePendingModal
        open={pendingModalOpen}
        pending={pendingCounts}
        acknowledged={pendingAck}
        onAcknowledgedChange={setPendingAck}
        closing={workflowBusy === "COMPLETE_VISIT"}
        overrideAllowed={pendingOverrideAllowed}
        onReturnToChart={() => {
          setPendingModalOpen(false);
          setPendingAck(false);
        }}
        onCancel={() => {
          setPendingModalOpen(false);
          setPendingAck(false);
        }}
        onConfirm={() => void confirmPendingOverrideClose()}
        t={t}
      />

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
          facilityCountry={facilityCountry}
          facilityDisplayName={facilities.find((f) => f.id === facilityId)?.name ?? facilityId}
          roles={roles}
          userId={userId}
          canPrescribe={canPrescribe}
          isLocked={isLocked}
          resultsRefresh={resultsRefresh}
          triageSnapshot={triageSnapshot}
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
