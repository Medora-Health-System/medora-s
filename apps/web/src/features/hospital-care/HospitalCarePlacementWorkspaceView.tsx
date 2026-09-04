"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  edNursingHandoffStatusFromErHandoff,
  placementActionsForStatus,
  placementActionToStatus,
  readErHandoffV1FromNursingAssessment,
  type PlacementQueueAction,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { productUiBcp47Tag } from "@/i18n/config";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { formatAgeYearsSexForLocale, DISPLAY_DASH } from "@/lib/patientDisplay";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  ClinicalUserRoleAutocomplete,
  formatClinicalUserRoleLabel,
} from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { canonicalEncounterWorkspaceHref } from "@/features/encounters/canonicalEncounterWorkspaceHref";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  fetchPlacementRequestById,
  isForbiddenApiError,
  transitionPlacementRequest,
  type HospitalCarePlacementQueueRow,
} from "./hospitalCarePlacementApi";
import {
  fetchHospitalUnitRegistry,
  filterHospitalUnitsForPlacementDestination,
  type HospitalUnitRegistryUnit,
} from "./hospitalCareUnitsApi";
import { HOSPITAL_CARE_PLACEMENT_QUEUE } from "./hospitalCarePaths";
import {
  acceptingProviderFieldsForTransition,
  assignBedSelectionReady,
  canAcceptPlacement,
  canEditPlacementAssignment,
  canRunPlacementWorkspaceAction,
  isAcceptingProviderEditable,
  isBedSelectorEnabled,
  isRoomSelectorEnabled,
  isUnitSelectorEnabled,
  placementEditorMode,
  placementReadOnlyProviderLine,
  placementSectionHeadingKey,
  placementTransitionErrorKind,
  primaryActionLabelKey,
  responsiblePhysicianNameFromEncounter,
  shouldAutoSelectSoleEligibleUnit,
} from "./placementWorkspaceEditor";

const WORKFLOW_STEPS = [
  { id: "REQUESTED", key: "stepRequested", doneAt: ["REQUESTED", "SIGNED", "UNDER_REVIEW", "ACCEPTED", "BED_ASSIGNED", "READY_FOR_TRANSFER", "DEPARTED_ED", "ARRIVED_DESTINATION", "COMPLETED"] },
  { id: "ACCEPTED", key: "stepAccepted", doneAt: ["ACCEPTED", "BED_ASSIGNED", "READY_FOR_TRANSFER", "DEPARTED_ED", "ARRIVED_DESTINATION", "COMPLETED"] },
  { id: "BED_ASSIGNED", key: "stepBedAssigned", doneAt: ["BED_ASSIGNED", "READY_FOR_TRANSFER", "DEPARTED_ED", "ARRIVED_DESTINATION", "COMPLETED"] },
  { id: "READY_FOR_TRANSFER", key: "stepReady", doneAt: ["READY_FOR_TRANSFER", "DEPARTED_ED", "ARRIVED_DESTINATION", "COMPLETED"] },
  { id: "DEPARTED_ED", key: "stepDeparted", doneAt: ["DEPARTED_ED", "ARRIVED_DESTINATION", "COMPLETED"] },
  { id: "ARRIVED_DESTINATION", key: "stepArrived", doneAt: ["ARRIVED_DESTINATION", "COMPLETED"] },
] as const;

function primaryAction(actions: PlacementQueueAction[]): PlacementQueueAction | null {
  const order: PlacementQueueAction[] = [
    "ACCEPT",
    "ASSIGN_BED",
    "MARK_READY",
    "MARK_DEPARTED",
    "MARK_ARRIVED",
    "REVIEW",
  ];
  return order.find((a) => actions.includes(a)) ?? null;
}

function patientName(row: HospitalCarePlacementQueueRow, dash: string): string {
  const full = `${row.patient.firstName ?? ""} ${row.patient.lastName ?? ""}`.trim();
  return full || dash;
}

function formatReportTime(iso: string | undefined, language: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(productUiBcp47Tag(language), {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HospitalCarePlacementWorkspaceView() {
  const params = useParams();
  const placementId = String(params.placementId ?? "").trim();
  const { t, language } = useI18n();
  const { facilityId, roles } = useFacilityAndRoles();
  const dash = t("common.dash") || DISPLAY_DASH;

  const [row, setRow] = useState<HospitalCarePlacementQueueRow | null>(null);
  const [units, setUnits] = useState<HospitalUnitRegistryUnit[]>([]);
  const [encounter, setEncounter] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionsUnavailable, setActionsUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const [unitCode, setUnitCode] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [bedKey, setBedKey] = useState("");
  const [acceptingName, setAcceptingName] = useState("");
  const [acceptingUserId, setAcceptingUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!placementId) return;
    setLoading(true);
    setError(null);
    try {
      const [found, registry] = await Promise.all([
        fetchPlacementRequestById(placementId),
        fetchHospitalUnitRegistry({ facilityId }),
      ]);
      if (!found) {
        setRow(null);
        setEncounter(null);
        setError(t("edHosp1g2PlacementWorkspace.notFound"));
        return;
      }
      setRow(found);
      setUnits(registry.units ?? []);
      setUnitCode(found.assignedUnitCode ?? "");
      setRoomKey(found.assignedRoomKey ?? "");
      setBedKey(found.assignedBedKey ?? "");
      setAcceptingUserId(found.acceptingProviderUserId ?? null);
      setAcceptingName(
        found.acceptingProviderUserId ? found.acceptingProviderNameSnapshot ?? "" : ""
      );
      const enc = asApiObject(
        await apiFetch(`/encounters/${found.originatingEncounterId}`, { facilityId })
      );
      setEncounter(enc);
    } catch (err) {
      setRow(null);
      setError(
        isForbiddenApiError(err)
          ? t("hospitalCareD3ca.accessDenied")
          : t("edHosp1g2PlacementWorkspace.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [placementId, facilityId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const eligibleUnits = useMemo(
    () => filterHospitalUnitsForPlacementDestination(units, row?.requestedEncounterType),
    [units, row?.requestedEncounterType]
  );
  const selectedUnit = eligibleUnits.find((u) => u.code === unitCode) ?? null;
  const rooms = (selectedUnit?.rooms ?? []).filter((r) => r.active);
  const selectedRoom = rooms.find((r) => r.code === roomKey || r.id === roomKey) ?? null;
  const beds = selectedRoom?.beds ?? [];
  const selectedBed = beds.find((b) => (b.bedKey || b.code) === bedKey) ?? null;
  const canEditBeds = canEditPlacementAssignment(roles, row?.status);
  const editorMode = placementEditorMode(row?.status);

  useEffect(() => {
    if (
      !shouldAutoSelectSoleEligibleUnit({
        roles,
        status: row?.status,
        currentUnitCode: unitCode,
        eligibleUnitCount: eligibleUnits.length,
      })
    ) {
      return;
    }
    setUnitCode(eligibleUnits[0]?.code ?? "");
  }, [roles, row?.status, unitCode, eligibleUnits]);

  const handoff = useMemo(
    () => readErHandoffV1FromNursingAssessment(encounter?.nursingAssessment),
    [encounter]
  );
  const handoffStatus = edNursingHandoffStatusFromErHandoff(handoff);
  const ageSex = row
    ? formatAgeYearsSexForLocale(row.patient.dob, row.patient.sexAtBirth, null, language)
    : dash;

  const destinationLabel =
    row?.requestedEncounterType === "OBSERVATION"
      ? t("hospitalCareD3ca.destination.observation")
      : t("hospitalCareD3ca.destination.inpatientAdmission");

  const statusLabel = row?.trackboardLabel
    ? t(`internalPlacementD3c.status.${row.trackboardLabel}` as Parameters<typeof t>[0])
    : row?.status ?? "";

  const edChartHref = row
    ? canonicalEncounterWorkspaceHref({
        encounterId: row.originatingEncounterId,
        encounterType: "EMERGENCY",
        encounterStatus: "OPEN",
        role: "ADMIN",
        source: "BOARD",
      })
    : HOSPITAL_CARE_PLACEMENT_QUEUE;

  const actions = row ? placementActionsForStatus(row.status) : [];
  const visibleActions = actions.filter((a) => {
    if (a === "ASSIGN_BED" && !canEditPlacementAssignment(roles, row?.status)) return false;
    if (a === "ACCEPT" && !canAcceptPlacement(roles, row?.status)) return false;
    return canRunPlacementWorkspaceAction(a, roles);
  });
  const next = primaryAction(visibleActions);

  const chiefComplaint = String(encounter?.chiefComplaint ?? encounter?.visitReason ?? "").trim();
  const diagnoses = String(row?.admissionDiagnosisSummary ?? "").trim();
  const codeStatus = (() => {
    const summary = encounter?.admissionSummaryJson;
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) return "";
    return String((summary as Record<string, unknown>).codeStatus ?? "").trim();
  })();

  const runTransition = async (action: PlacementQueueAction) => {
    if (!row) return;
    const toStatus = placementActionToStatus(action);
    if (!toStatus) return;
    if (action === "ASSIGN_BED" && (!unitCode.trim() || !roomKey.trim())) {
      setActionError(t("edHosp1g2PlacementWorkspace.selectDestination"));
      return;
    }
    if (action === "ASSIGN_BED" && beds.length > 0 && !bedKey.trim()) {
      setActionError(t("edHosp1g2PlacementWorkspace.selectDestination"));
      return;
    }
    if (action === "ASSIGN_BED" && selectedBed?.occupied) {
      setActionError(t("edHosp1g2PlacementWorkspace.bedTaken"));
      return;
    }
    setBusy(true);
    setActionError(null);
    setActionsUnavailable(false);
    try {
      const updated = await transitionPlacementRequest(row.id, {
        toStatus,
        expectedVersion: row.version,
        assignedUnitCode: action === "ASSIGN_BED" ? unitCode.trim() : undefined,
        assignedRoomKey: action === "ASSIGN_BED" ? roomKey.trim() : undefined,
        assignedBedKey: action === "ASSIGN_BED" ? bedKey.trim() || undefined : undefined,
        assignmentSourceSystem: action === "ASSIGN_BED" ? "HOSPITAL_UNIT_REGISTRY" : undefined,
        ...acceptingProviderFieldsForTransition({
          acceptingProviderUserId: acceptingUserId,
          acceptingProviderName: acceptingName,
        }),
      });
      setRow({ ...row, ...updated, patient: updated.patient ?? row.patient });
      await reload();
    } catch (err) {
      if (isForbiddenApiError(err)) {
        setActionsUnavailable(true);
      }
      const kind = placementTransitionErrorKind(err, action);
      setActionError(t(`edHosp1g2PlacementWorkspace.${kind}` as Parameters<typeof t>[0]));
    } finally {
      setBusy(false);
    }
  };

  const labelKey = primaryActionLabelKey(next);
  const primaryLabel = labelKey
    ? t(`edHosp1g2PlacementWorkspace.${labelKey}` as Parameters<typeof t>[0])
    : null;
  const assignReady = assignBedSelectionReady({
    unitCode,
    roomKey,
    bedKey,
    roomHasBeds: beds.length > 0,
    selectedBedOccupied: selectedBed?.occupied === true,
  });
  const unitEnabled = isUnitSelectorEnabled({ roles, status: row?.status });
  const roomEnabled = isRoomSelectorEnabled({ roles, status: row?.status, unitCode });
  const bedEnabled = isBedSelectorEnabled({ roles, status: row?.status, roomKey });
  const providerEditable = isAcceptingProviderEditable({ roles, status: row?.status }) && Boolean(facilityId);
  const headingKey = placementSectionHeadingKey({ roles, status: row?.status });
  const providerLine = placementReadOnlyProviderLine({
    acceptingProviderUserId: row?.acceptingProviderUserId,
    acceptingProviderNameSnapshot: row?.acceptingProviderNameSnapshot,
    responsiblePhysicianName: responsiblePhysicianNameFromEncounter(encounter),
  });

  return (
    <HospitalCareShell
      active="placementQueue"
      title={row ? patientName(row, dash) : t("edHosp1g2PlacementWorkspace.title")}
      subtitle={destinationLabel}
    >
      <div style={{ marginBottom: 10 }}>
        <Link
          href={HOSPITAL_CARE_PLACEMENT_QUEUE}
          style={{ fontSize: 12, color: "#0f766e", textDecoration: "none" }}
        >
          {t("edHosp1g2PlacementWorkspace.backQueue")}
        </Link>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : !row ? null : (
        <div
          data-testid="hospital-care-placement-workspace"
          data-placement-id={row.id}
          style={{ overflowX: "hidden", minWidth: 0 }}
        >
          <div
            style={{
              ...MEDORA_CARD_SHELL,
              padding: 14,
              marginBottom: 12,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {patientName(row, dash)}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {ageSex || dash}
                {" · "}
                {t("hospitalCareD3ca.card.mrn")}: {row.patient.mrn?.trim() || dash}
                {" · "}
                {t("edHosp1g2PlacementWorkspace.edEncounter")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>{statusLabel}</span>
              <span
                data-testid="placement-workspace-destination"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
              >
                {destinationLabel.toUpperCase()}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.65fr) minmax(240px, 0.9fr)",
              gap: 12,
            }}
            className="ed-hosp-1g2-placement-grid"
          >
            <div style={{ ...MEDORA_CARD_SHELL, padding: 14, minWidth: 0 }}>
              <div
                data-testid={
                  editorMode === "awaiting_acceptance"
                    ? "placement-workspace-awaiting-acceptance"
                    : editorMode === "assign_bed"
                      ? "placement-workspace-bed-editor"
                      : "placement-workspace-assignment-heading"
                }
                style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}
              >
                {t(`edHosp1g2PlacementWorkspace.${headingKey}` as Parameters<typeof t>[0])}
              </div>
              {canEditBeds ? (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("edHosp1g2PlacementWorkspace.unit")}
                  <select
                    data-testid="placement-workspace-unit"
                    disabled={!unitEnabled}
                    value={unitCode}
                    onChange={(e) => {
                      setUnitCode(e.target.value);
                      setRoomKey("");
                      setBedKey("");
                    }}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  >
                    <option value="">{t("edHosp1g2PlacementWorkspace.selectUnit")}</option>
                    {eligibleUnits.map((u) => (
                      <option key={u.id} value={u.code}>
                        {u.name || u.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("edHosp1g2PlacementWorkspace.room")}
                  <select
                    data-testid="placement-workspace-room"
                    disabled={!roomEnabled}
                    value={roomKey}
                    onChange={(e) => {
                      setRoomKey(e.target.value);
                      setBedKey("");
                    }}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  >
                    <option value="">{t("edHosp1g2PlacementWorkspace.selectRoom")}</option>
                    {rooms.map((r) => {
                      const roomOpen = (r.beds ?? []).length === 0 || r.beds.some((b) => !b.occupied);
                      return (
                        <option key={r.id} value={r.code} disabled={!roomOpen}>
                          {r.name || r.code}
                          {!roomOpen ? ` — ${t("edHosp1g2PlacementWorkspace.roomUnavailable")}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("edHosp1g2PlacementWorkspace.bed")}
                  <select
                    data-testid="placement-workspace-bed"
                    disabled={!bedEnabled}
                    value={bedKey}
                    onChange={(e) => setBedKey(e.target.value)}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  >
                    <option value="">{t("edHosp1g2PlacementWorkspace.selectBed")}</option>
                    {beds.map((b) => (
                      <option key={b.id} value={b.bedKey || b.code} disabled={b.occupied}>
                        {b.name || b.code} —{" "}
                        {b.occupied
                          ? t("edHosp1g2PlacementWorkspace.bedOccupied")
                          : t("edHosp1g2PlacementWorkspace.bedAvailable")}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {t("edHosp1g2PlacementWorkspace.acceptingProvider")}
                  </div>
                  {providerEditable ? (
                    <ClinicalUserRoleAutocomplete
                      facilityId={facilityId}
                      role="PROVIDER"
                      ariaLabel={t("edHosp1g2PlacementWorkspace.acceptingProvider")}
                      placeholder={t("edHosp1g2PlacementWorkspace.acceptingProviderPlaceholder")}
                      displayValue={acceptingName}
                      onChangeDisplay={(v) => {
                        setAcceptingName(v);
                        setAcceptingUserId(null);
                      }}
                      selectedUserId={acceptingUserId}
                      onSelectUser={(u) => {
                        if (!u) {
                          setAcceptingUserId(null);
                          return;
                        }
                        setAcceptingUserId(u.id);
                        setAcceptingName(formatClinicalUserRoleLabel(u));
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: "#334155" }}>
                      {row.acceptingProviderNameSnapshot || dash}
                    </div>
                  )}
                </div>
              </div>
              ) : (
                <div
                  data-testid="placement-workspace-assignment-readonly"
                  style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155" }}
                >
                  {editorMode === "assigned" ? (
                    <>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          {t("edHosp1g2PlacementWorkspace.unit")}
                          {": "}
                        </span>
                        {row.assignedUnitCode
                          ? eligibleUnits.find((u) => u.code === row.assignedUnitCode)?.name ||
                            row.assignedUnitCode
                          : dash}
                      </div>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          {t("edHosp1g2PlacementWorkspace.room")}
                          {": "}
                        </span>
                        {row.assignedRoomKey || dash}
                      </div>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          {t("edHosp1g2PlacementWorkspace.bed")}
                          {": "}
                        </span>
                        {row.assignedBedKey || dash}
                      </div>
                    </>
                  ) : (
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                        {t("edHosp1g2PlacementWorkspace.bed")}
                        {": "}
                      </span>
                      {t("edHosp1g2PlacementWorkspace.pending")}
                    </div>
                  )}
                  {providerLine.name ? (
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                        {providerLine.kind === "accepting"
                          ? t("edHosp1g2PlacementWorkspace.acceptingProvider")
                          : t("edHosp1g2PlacementWorkspace.admittingProvider")}
                        {": "}
                      </span>
                      {providerLine.name}
                    </div>
                  ) : null}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {t("edHosp1g2PlacementWorkspace.bedAvailability")}
                </div>
                {eligibleUnits.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    {t("edHosp1g2PlacementWorkspace.noEligibleUnits")}
                  </p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#475569" }}>
                    {eligibleUnits.slice(0, 8).map((u) => (
                      <li key={u.id}>
                        {u.name || u.code}
                        {u.availableBedCount != null
                          ? ` — ${u.availableBedCount} ${t("edHosp1g2PlacementWorkspace.bedAvailable").toLowerCase()}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div style={{ ...MEDORA_CARD_SHELL, padding: 14, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <strong>{t("edHosp1g2PlacementWorkspace.admissionDecision")}</strong>
                {" · "}
                {t("edHosp1g2PlacementWorkspace.signed")} ✓
              </div>
              <div
                data-testid="placement-workspace-nursing-handoff"
                style={{ fontSize: 12, marginBottom: 8 }}
              >
                <strong>{t("edHosp1g2PlacementWorkspace.nursingHandoff")}</strong>
                {" · "}
                {handoffStatus === "COMPLETED"
                  ? t("edHosp1g2PlacementWorkspace.handoffComplete")
                  : handoffStatus === "IN_PROGRESS"
                    ? t("edHosp1g2PlacementWorkspace.handoffInProgress")
                    : t("edHosp1g2PlacementWorkspace.handoffNotStarted")}
                {handoffStatus === "COMPLETED" ? " ✓" : ""}
                {handoff.receivingNurseName ? (
                  <div style={{ marginTop: 4, color: "#475569" }}>
                    {t("edHosp1g2PlacementWorkspace.receivingRn")}: {handoff.receivingNurseName}
                  </div>
                ) : null}
                {formatReportTime(handoff.reportGivenAt, language) ? (
                  <div style={{ color: "#475569" }}>
                    {t("edHosp1g2PlacementWorkspace.report")}:{" "}
                    {formatReportTime(handoff.reportGivenAt, language)}
                  </div>
                ) : null}
                {handoff.handoffNote ? (
                  <button
                    type="button"
                    onClick={() => setHandoffOpen((v) => !v)}
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0f766e",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {handoffOpen
                      ? t("edHosp1g2PlacementWorkspace.hideHandoff")
                      : t("edHosp1g2PlacementWorkspace.viewHandoff")}
                  </button>
                ) : null}
                {handoffOpen && handoff.handoffNote ? (
                  <p style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", marginTop: 6 }}>
                    {handoff.handoffNote}
                  </p>
                ) : null}
              </div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                <strong>{t("edHosp1g2PlacementWorkspace.bedStatus")}</strong>
                {" · "}
                {row.assignedBedKey
                  ? t("edHosp1g2PlacementWorkspace.assigned")
                  : t("edHosp1g2PlacementWorkspace.pending")}
              </div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                <strong>{t("edHosp1g2PlacementWorkspace.transport")}</strong>
                {" · "}
                {row.departedEdAt
                  ? t("edHosp1g2PlacementWorkspace.stepDeparted")
                  : t("edHosp1g2PlacementWorkspace.pending")}
              </div>
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                <strong>{t("edHosp1g2PlacementWorkspace.receiving")}</strong>
                {" · "}
                {row.receivingEncounterId || row.arrivedDestinationAt
                  ? t("edHosp1g2PlacementWorkspace.stepArrived")
                  : t("edHosp1g2PlacementWorkspace.pending")}
              </div>
              <Link href={edChartHref} style={{ fontSize: 12, fontWeight: 600, color: "#0f766e" }}>
                {t("edHosp1g2PlacementWorkspace.openEdChart")}
              </Link>
              {(chiefComplaint || diagnoses || row.isolationRequired || row.telemetryRequired || codeStatus) && (
                <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
                  {chiefComplaint ? (
                    <div>
                      {t("edHosp1g2PlacementWorkspace.chiefComplaint")}: {chiefComplaint}
                    </div>
                  ) : null}
                  {diagnoses ? (
                    <div>
                      {t("edHosp1g2PlacementWorkspace.workingDiagnoses")}: {diagnoses}
                    </div>
                  ) : null}
                  {row.isolationRequired ? (
                    <div>
                      {t("edHosp1g2PlacementWorkspace.isolation")}: {row.isolationType || t("common.yes")}
                    </div>
                  ) : null}
                  {row.telemetryRequired ? (
                    <div>{t("edHosp1g2PlacementWorkspace.telemetry")}</div>
                  ) : null}
                  {codeStatus ? (
                    <div>
                      {t("edHosp1g2PlacementWorkspace.codeStatus")}: {codeStatus}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...MEDORA_CARD_SHELL, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {t("edHosp1g2PlacementWorkspace.workflow")}
            </div>
            <div
              data-testid="placement-workspace-timeline"
              style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12 }}
            >
              {WORKFLOW_STEPS.map((step) => {
                const done = (step.doneAt as readonly string[]).includes(row.status);
                return (
                  <span key={step.id} style={{ color: done ? "#0f766e" : "#94a3b8", fontWeight: 600 }}>
                    {t(`edHosp1g2PlacementWorkspace.${step.key}` as Parameters<typeof t>[0])} {done ? "✓" : "○"}
                  </span>
                );
              })}
            </div>
            {actionError ? (
              <p style={{ fontSize: 13, color: "#b91c1c", marginTop: 8 }} role="alert">
                {actionError}
              </p>
            ) : null}
            {actionsUnavailable ? (
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {t("edHosp1g2PlacementWorkspace.actionsUnavailable")}
              </p>
            ) : null}
            {next && canRunPlacementWorkspaceAction(next, roles) ? (
              <button
                type="button"
                data-testid="placement-workspace-primary-action"
                disabled={busy || (next === "ASSIGN_BED" && !assignReady)}
                onClick={() => void runTransition(next)}
                style={{
                  marginTop: 10,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #0f766e",
                  background: "#0f766e",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? "wait" : next === "ASSIGN_BED" && !assignReady ? "not-allowed" : "pointer",
                }}
              >
                {primaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 1024px) {
          .ed-hosp-1g2-placement-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </HospitalCareShell>
  );
}
