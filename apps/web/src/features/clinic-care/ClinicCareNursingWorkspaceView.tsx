/**
 * MEDUI.D4C.4 — Ambulatory Nursing / MA workspace (Clinic Care shell).
 * Queue + thin intake adapter; reuses enterprise room/assign/vitals/allergy engines.
 * No second Clinic sidebar; no parallel ambulatory clinical documentation engines.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CLINIC_CARE_MA_ASSIGNMENT_ADAPTER,
  CLINIC_CARE_NURSING_QUEUE_STAGES,
  clinicCareAmbulatoryIntakeChartPath,
  clinicCareNursingNextWorkflowTransition,
  projectClinicCareNursingQueueStage,
  type ClinicCareIntakeStatus,
  type ClinicCareIntakeStatusProjection,
  type ClinicCareNursingQueueStage,
  type ClinicCareStageId,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { assignNurseSelf, patchEncounterWorkflowState } from "@/lib/clinicalWorklistApi";
import { assignHospitalRoleToMe } from "@/features/hospital-care/hospitalAssignmentApi";
import { canAssignEncounterRoom } from "@/lib/governedRoomDisplay";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { EncounterVitalsPanel } from "@/features/encounters/EncounterVitalsPanel";
import { InpatientAllergyEditorModal } from "@/features/inpatient-workspace/InpatientClinicalStatusEditors";
import {
  resolveClinicBoardPatientNameHref,
} from "./clinicCareBoardRoutes";
import { ClinicCareInlineRoomSelect } from "./ClinicCareInlineRoomSelect";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";
import { productUiBcp47Tag } from "@/i18n/config";

type ClinicCareRow = {
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  encounterType: string;
  status: string;
  workflowState: string | null;
  stageId: ClinicCareStageId;
  nextStepHint: string;
  createdAt: string;
  roomLabel: string | null;
  chiefComplaint: string | null;
  providerName: string | null;
  nurseName: string | null;
  maName?: string | null;
  openOrderCount: number;
  resultsPendingCount: number;
  arrivedAt?: string | null;
  nursingQueueStage?: ClinicCareNursingQueueStage;
  intakeStatus?: ClinicCareIntakeStatusProjection;
};

type ClinicCareAccess = {
  canAccessNursingMa: boolean;
  canAccessTechnicianSafeNursingMaProjection: boolean;
  canAuthorIndependentNursingAssessment: boolean;
  canSignAsNurseOrProvider: boolean;
};

type ClinicCareProjection = {
  facilityTimeZone: string;
  rows: ClinicCareRow[];
  access: ClinicCareAccess;
};

function queueLabelKey(stage: ClinicCareNursingQueueStage): string {
  switch (stage) {
    case "WAITING_FOR_INTAKE":
      return "clinicCareD4c4.queue.waitingForIntake";
    case "IN_PROGRESS":
      return "clinicCareD4c4.queue.inProgress";
    case "READY_FOR_PROVIDER":
      return "clinicCareD4c4.queue.readyForProvider";
    case "RETURNED":
      return "clinicCareD4c4.queue.returned";
    case "COMPLETED":
      return "clinicCareD4c4.queue.completed";
    default:
      return "clinicCareD4c4.queue.waitingForIntake";
  }
}

function intakeStatusLabelKey(status: ClinicCareIntakeStatus): string {
  switch (status) {
    case "DONE":
      return "clinicCareD4c4.intakeDone";
    case "PARTIAL":
      return "clinicCareD4c4.intakePartial";
    case "MISSING":
      return "clinicCareD4c4.intakeMissing";
    default:
      return "clinicCareD4c4.intakeUnknown";
  }
}

function formatTime(iso: string | null | undefined, timeZone: string, locale: string, dash: string): string {
  if (!iso) return dash;
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return dash;
  }
}

const compactBtn: React.CSSProperties = {
  display: "inline-flex",
  height: 26,
  alignItems: "center",
  padding: "0 10px",
  borderRadius: 6,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "none",
};

export function ClinicCareNursingWorkspaceView() {
  const { t, language } = useI18n();
  const locale = productUiBcp47Tag(language);
  const searchParams = useSearchParams();
  const focusEncounterId = searchParams?.get("encounterId") ?? null;
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const isRn = roles.includes("RN") || roles.includes("ADMIN");
  const isMa = roles.includes("PATIENT_CARE_TECH");
  const canAssignRoom = canAssignEncounterRoom(roles);
  const canClinicalIntake = isRn;
  const canMaAssist = isMa && !isRn;

  const [data, setData] = useState<ClinicCareProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMiss, setSchemaMiss] = useState(false);
  const [filterStage, setFilterStage] = useState<"" | ClinicCareNursingQueueStage>("");
  const [selectedId, setSelectedId] = useState<string | null>(focusEncounterId);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chiefDraft, setChiefDraft] = useState("");
  const [showVitals, setShowVitals] = useState(false);
  const [showAllergies, setShowAllergies] = useState(false);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    setSchemaMiss(false);
    try {
      const payload = (await apiFetch("/clinic-care/trackboard", { facilityId })) as ClinicCareProjection;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const miss =
        /CLINIC_CARE_SCHEMA_MISS|visitOrigin|P2021|P2022|schema not deployed|503/i.test(message);
      setSchemaMiss(miss);
      setError(miss ? t("clinicCareD4c2.errors.schemaMiss") : t("clinicCareD4c2.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  useEffect(() => {
    if (focusEncounterId) setSelectedId(focusEncounterId);
  }, [focusEncounterId]);

  const rowsWithQueue = useMemo(() => {
    return (data?.rows ?? [])
      .filter((r) => r.status === "OPEN" || r.stageId === "COMPLETED")
      .map((row) => ({
        ...row,
        nursingStage:
          row.nursingQueueStage ??
          projectClinicCareNursingQueueStage({
            workflowState: row.workflowState,
            encounterStatus: row.status,
            resultsPendingCount: row.resultsPendingCount,
          }),
      }));
  }, [data?.rows]);

  const filtered = useMemo(() => {
    let list = rowsWithQueue;
    if (filterStage) list = list.filter((r) => r.nursingStage === filterStage);
    else list = list.filter((r) => r.nursingStage !== "COMPLETED");
    return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [rowsWithQueue, filterStage]);

  const selected = useMemo(
    () => rowsWithQueue.find((r) => r.encounterId === selectedId) ?? null,
    [rowsWithQueue, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setChiefDraft("");
      setTriageSnapshot(null);
      return;
    }
    setChiefDraft(selected.chiefComplaint ?? "");
    if (!facilityId || !canClinicalIntake) return;
    let cancelled = false;
    void (async () => {
      try {
        const enc = (await apiFetch(`/encounters/${selected.encounterId}`, {
          facilityId,
        })) as { vitals?: Record<string, unknown> | null; triage?: Record<string, unknown> | null };
        if (cancelled) return;
        setTriageSnapshot(
          (enc.vitals as Record<string, unknown> | null) ??
            (enc.triage as Record<string, unknown> | null) ??
            null
        );
      } catch {
        if (!cancelled) setTriageSnapshot(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, facilityId, canClinicalIntake]);

  const runWorkflowTransition = useCallback(
    async (encounterId: string, workflowState: "TRIAGE" | "IN_TREATMENT") => {
      if (!facilityId) return;
      setActionBusy(true);
      setActionError(null);
      try {
        await patchEncounterWorkflowState(facilityId, encounterId, workflowState);
        await load();
        if (workflowState === "TRIAGE" && typeof window !== "undefined") {
          window.location.assign(clinicCareAmbulatoryIntakeChartPath(encounterId, "intake"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setActionError(message || t("clinicCareD4c4.errors.workflowFailed"));
      } finally {
        setActionBusy(false);
      }
    },
    [facilityId, load, t]
  );

  const saveChiefComplaint = useCallback(async () => {
    if (!facilityId || !selected || !canClinicalIntake) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/encounters/${selected.encounterId}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ chiefComplaint: chiefDraft.trim() || null }),
      });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setActionError(message || t("clinicCareD4c4.errors.saveFailed"));
    } finally {
      setActionBusy(false);
    }
  }, [facilityId, selected, canClinicalIntake, chiefDraft, load, t]);

  const claimNursing = useCallback(async () => {
    if (!facilityId || !selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (isRn) {
        await assignNurseSelf(facilityId, selected.encounterId);
      } else if (canMaAssist) {
        await assignHospitalRoleToMe(
          facilityId,
          selected.encounterId,
          CLINIC_CARE_MA_ASSIGNMENT_ADAPTER.enterpriseSlot
        );
      }
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setActionError(message || t("clinicCareD4c2.errors.assignFailed"));
    } finally {
      setActionBusy(false);
    }
  }, [facilityId, selected, isRn, canMaAssist, load, t]);

  const dash = t("common.dash");
  const access = data?.access;
  const techSafe =
    access?.canAccessTechnicianSafeNursingMaProjection &&
    !access.canAuthorIndependentNursingAssessment;

  if (!ready) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>;
  }

  const chartHref = selected
    ? resolveClinicBoardPatientNameHref({
        encounterId: selected.encounterId,
        patientId: selected.patientId,
        status: selected.status,
        workflowState: selected.workflowState,
        facilityId,
      })
    : "#";

  return (
    <div data-testid="clinic-care-nursing-workspace">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            {t("clinicCareD4c4.nursingTitle")}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c4.nursingSubtitle")}
          </p>
        </div>
        <button type="button" onClick={() => void load()} style={compactBtn}>
          {t("clinicCareD4c2.refresh")}
        </button>
      </div>

      {techSafe ? (
        <p
          role="status"
          data-testid="clinic-care-nursing-ma-adapter-banner"
          style={{
            margin: "0 0 10px",
            padding: "8px 10px",
            borderRadius: 8,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 12,
          }}
        >
          {t("clinicCareD4c4.maAdapterBanner")}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          <p style={{ margin: 0, fontWeight: 650 }}>{error}</p>
          {schemaMiss ? (
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>{t("clinicCareD4c2.errors.schemaMissHint")}</p>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1.1fr) minmax(300px, 1fr)",
          gap: 10,
          alignItems: "start",
        }}
      >
        <section style={{ ...MEDORA_CARD_SHELL, padding: 8 }} data-testid="clinic-care-nursing-queue">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setFilterStage("")}
              style={{
                ...compactBtn,
                background: filterStage === "" ? "#ecfdf5" : "#fff",
                borderColor: filterStage === "" ? "#6ee7b7" : CLINIC_CARE_SHELL.border,
              }}
            >
              {t("clinicCareD4c4.queue.active")}
            </button>
            {CLINIC_CARE_NURSING_QUEUE_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setFilterStage(stage)}
                style={{
                  ...compactBtn,
                  background: filterStage === stage ? "#ecfdf5" : "#fff",
                  borderColor: filterStage === stage ? "#6ee7b7" : CLINIC_CARE_SHELL.border,
                }}
              >
                {t(queueLabelKey(stage))}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{t("clinicCareD4c2.loading")}</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 12 }} data-testid="clinic-care-nursing-empty">
              {t("clinicCareD4c4.queueEmpty")}
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: "calc(100vh - 260px)",
                overflow: "auto",
              }}
            >
              {filtered.map((row) => {
                const rowChart = resolveClinicBoardPatientNameHref({
                  encounterId: row.encounterId,
                  patientId: row.patientId,
                  status: row.status,
                  workflowState: row.workflowState,
                  facilityId,
                });
                const active = row.encounterId === selectedId;
                return (
                  <button
                    key={row.encounterId}
                    type="button"
                    data-testid={`clinic-care-nursing-row-${row.encounterId}`}
                    onClick={() => setSelectedId(row.encounterId)}
                    style={{
                      textAlign: "left",
                      borderRadius: 8,
                      border: `1px solid ${active ? "#0f766e" : CLINIC_CARE_SHELL.border}`,
                      background: active ? "#f0fdfa" : "#fff",
                      padding: "8px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Link
                        href={rowChart}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontWeight: 650, color: "#0f766e", fontSize: 13 }}
                      >
                        {row.patientName}
                      </Link>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>
                        {t(queueLabelKey(row.nursingStage))}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                      {row.chiefComplaint || dash}
                      {" · "}
                      {formatTime(
                        row.arrivedAt || row.createdAt,
                        data?.facilityTimeZone || "America/Chicago",
                        locale,
                        dash
                      )}
                      {" · "}
                      {row.roomLabel || t("clinicCareD4c4.roomUnassigned")}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: "#475569" }}>
                      {t("clinicCareD4c2.columns.provider")}: {row.providerName || dash}
                      {" · "}
                      {t("clinicCareD4c4.nursingAssignment")}: {row.nurseName || dash}
                      {row.maName ? ` · ${t("clinicCareD4c4.maAssignment")}: ${row.maName}` : ""}
                    </div>
                    {row.intakeStatus ? (
                      <div style={{ marginTop: 2, fontSize: 10, color: "#64748b" }}>
                        {t("clinicCareD4c4.vitals")}: {t(intakeStatusLabelKey(row.intakeStatus.vitals))}
                        {" · "}
                        {t("clinicCareD4c4.allergies")}:{" "}
                        {t(intakeStatusLabelKey(row.intakeStatus.allergies))}
                        {" · "}
                        {t("clinicCareD4c4.medRec")}: {t(intakeStatusLabelKey(row.intakeStatus.medRec))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ ...MEDORA_CARD_SHELL, padding: 10 }} data-testid="clinic-care-nursing-intake">
          {!selected ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("clinicCareD4c4.selectPatient")}</p>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{selected.patientName}</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    {selected.mrn ? `${t("clinicCareD4c2.mrnPrefix")} ${selected.mrn}` : dash}
                    {" · "}
                    {t(queueLabelKey(selected.nursingStage))}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Link
                    href={clinicCareAmbulatoryIntakeChartPath(selected.encounterId, "intake")}
                    style={compactBtn}
                    data-testid="clinic-care-nursing-open-intake-chart"
                  >
                    {t("clinicCareD4c4.openIntakeChart")}
                  </Link>
                  <Link href={chartHref} style={compactBtn}>
                    {t("clinicCareD4c4.openChart")}
                  </Link>
                </div>
              </div>

              {actionError ? (
                <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
                  {actionError}
                </p>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                  {t("clinicCareD4c2.columns.room")}
                  <div style={{ marginTop: 4 }}>
                    {canAssignRoom && facilityId && selected.status === "OPEN" ? (
                      <ClinicCareInlineRoomSelect
                        facilityId={facilityId}
                        encounterId={selected.encounterId}
                        encounterType={selected.encounterType}
                        roomLabel={selected.roomLabel}
                        onSaved={load}
                        testId={`clinic-care-nursing-room-${selected.encounterId}`}
                      />
                    ) : (
                      <span style={{ fontSize: 13, color: "#0f172a" }}>{selected.roomLabel || dash}</span>
                    )}
                  </div>
                </label>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                    {t("clinicCareD4c4.nursingAssignment")}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {selected.nurseName || selected.maName || dash}
                    {(isRn || canMaAssist) &&
                    selected.status === "OPEN" &&
                    !selected.nurseName &&
                    !selected.maName ? (
                      <button
                        type="button"
                        data-testid="clinic-care-nursing-assign-me"
                        disabled={actionBusy}
                        onClick={() => void claimNursing()}
                        style={{ ...compactBtn, marginLeft: 6 }}
                      >
                        {t("clinicCareD4c4.assignMe")}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                    {t("clinicCareD4c2.columns.provider")}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>{selected.providerName || dash}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block" }}>
                  {t("clinicCareD4c4.chiefComplaint")}
                  <textarea
                    value={chiefDraft}
                    disabled={!canClinicalIntake || actionBusy || selected.status !== "OPEN"}
                    onChange={(e) => setChiefDraft(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      borderRadius: 8,
                      border: `1px solid ${CLINIC_CARE_SHELL.border}`,
                      padding: 8,
                      fontSize: 13,
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </label>
                {canClinicalIntake ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void saveChiefComplaint()}
                    style={{ ...compactBtn, marginTop: 6 }}
                  >
                    {t("clinicCareD4c4.saveComplaint")}
                  </button>
                ) : null}
              </div>

              {canClinicalIntake && facilityId ? (
                <div
                  style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}
                  data-testid="clinic-care-nursing-clinical-engines"
                >
                  <button
                    type="button"
                    data-testid="clinic-care-nursing-open-vitals"
                    disabled={selected.status !== "OPEN"}
                    onClick={() => setShowVitals(true)}
                    style={compactBtn}
                  >
                    {t("clinicCareD4c4.vitals")}
                  </button>
                  <button
                    type="button"
                    data-testid="clinic-care-nursing-open-allergies"
                    disabled={selected.status !== "OPEN"}
                    onClick={() => setShowAllergies(true)}
                    style={compactBtn}
                  >
                    {t("clinicCareD4c4.allergies")}
                  </button>
                  <Link
                    href={clinicCareAmbulatoryIntakeChartPath(selected.encounterId, "history")}
                    style={compactBtn}
                    data-testid="clinic-care-nursing-medrec-link"
                  >
                    {t("clinicCareD4c4.medRec")}
                  </Link>
                  <Link
                    href={clinicCareAmbulatoryIntakeChartPath(selected.encounterId, "intake")}
                    style={compactBtn}
                  >
                    {t("clinicCareD4c4.painFallSafety")}
                  </Link>
                  <Link href={chartHref} style={compactBtn}>
                    {t("clinicCareD4c4.notesChartHint")}
                  </Link>
                </div>
              ) : (
                <p
                  role="status"
                  style={{ marginTop: 12, fontSize: 12, color: "#92400e" }}
                  data-testid="clinic-care-nursing-intake-restricted"
                >
                  {canMaAssist ? t("clinicCareD4c4.maAssistOnly") : t("clinicCareD4c4.intakeRestricted")}
                </p>
              )}

              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {canClinicalIntake && selected.status === "OPEN" ? (
                  <>
                    {clinicCareNursingNextWorkflowTransition(selected.workflowState) === "TRIAGE" ? (
                      <button
                        type="button"
                        data-testid="clinic-care-nursing-start-intake"
                        disabled={actionBusy}
                        onClick={() => void runWorkflowTransition(selected.encounterId, "TRIAGE")}
                        style={{ ...compactBtn, background: "#ecfdf5", borderColor: "#6ee7b7" }}
                      >
                        {t("clinicCareD4c4.startIntake")}
                      </button>
                    ) : null}
                    {clinicCareNursingNextWorkflowTransition(selected.workflowState) === "IN_TREATMENT" ? (
                      <button
                        type="button"
                        data-testid="clinic-care-nursing-ready-for-provider"
                        disabled={actionBusy}
                        onClick={() => void runWorkflowTransition(selected.encounterId, "IN_TREATMENT")}
                        style={{ ...compactBtn, background: "#eff6ff", borderColor: "#93c5fd" }}
                      >
                        {t("clinicCareD4c4.readyForProvider")}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {showVitals && facilityId ? (
                <EncounterVitalsPanel
                  open={showVitals}
                  onClose={() => setShowVitals(false)}
                  encounterId={selected.encounterId}
                  facilityId={facilityId}
                  patientId={selected.patientId}
                  triageSnapshot={triageSnapshot}
                  onSaved={async () => {
                    setShowVitals(false);
                    await load();
                  }}
                />
              ) : null}

              {showAllergies && facilityId ? (
                <InpatientAllergyEditorModal
                  open={showAllergies}
                  onClose={() => setShowAllergies(false)}
                  encounterId={selected.encounterId}
                  facilityId={facilityId}
                  patientId={selected.patientId}
                  onSaved={async () => {
                    setShowAllergies(false);
                  }}
                />
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
