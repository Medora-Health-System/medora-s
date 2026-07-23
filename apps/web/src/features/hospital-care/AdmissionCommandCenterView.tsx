"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ADMISSION_COMMAND_CENTER_FILTERS,
  ADMISSION_COMMAND_CENTER_SORTS,
  ADMISSION_COMMAND_SIMULATION_STAGES,
  OPERATIONAL_HOLD_REASON_CODES,
  applyCommandCenterSimulationOverlay,
  formatAdmissionSlaDuration,
  isAdmissionSimulationAllowed,
  type AdmissionCommandCenterFilter,
  type AdmissionCommandCenterMetrics,
  type AdmissionCommandCenterRow,
  type AdmissionCommandCenterSort,
  type AdmissionCommandSimulationStage,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  NEUTRAL_BADGE,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { HospitalCareShell } from "./HospitalCareShell";
import { hospitalAdmissionReviewPath } from "./hospitalCarePaths";

type CommandCenterRow = AdmissionCommandCenterRow & {
  convergedDisplayState?: string;
  admissionSourceKind?: string;
  receivingAuthority?: string;
};

type ListResponse = {
  items: CommandCenterRow[];
  metrics: AdmissionCommandCenterMetrics;
  generatedAt: string;
  placementWorkflowEnabled: boolean;
  operationsMode?: string;
};

type ActionKind = "ACCEPT" | "HOLD" | "RECEIVING_ACCEPT" | null;

const POLL_MS = 10_000;

const filterBar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12,
  alignItems: "center",
};

const selectStyle: CSSProperties = {
  fontSize: 13,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const metricBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const metricCell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "8px 10px",
  background: "#fff",
};

const SLA_BADGE: Record<AdmissionCommandCenterRow["slaDisplayState"], PriorityBadgeSoft> = {
  NORMAL: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  APPROACHING_TARGET: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  OVER_TARGET: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  CRITICAL_DELAY: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

export function AdmissionCommandCenterView() {
  const { t } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("encounterId")?.trim() || "";
  const dialogTitleId = useId();

  const [filter, setFilter] = useState<AdmissionCommandCenterFilter>("ALL_PENDING");
  const [sort, setSort] = useState<AdmissionCommandCenterSort>("LONGEST_WAITING");
  const [service, setService] = useState("");
  const [unit, setUnit] = useState("");
  const [levelOfCare, setLevelOfCare] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [items, setItems] = useState<CommandCenterRow[]>([]);
  const [metrics, setMetrics] = useState<AdmissionCommandCenterMetrics | null>(null);
  const [placementOn, setPlacementOn] = useState(false);
  const [operationsMode, setOperationsMode] = useState<string>("PLACEMENT_OFF");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<{
    encounterId: string;
    kind: ActionKind;
    decisionAt: string | null;
  } | null>(null);
  const [note, setNote] = useState("");
  const [holdReason, setHoldReason] = useState<string>("NO_BED_AVAILABLE");
  const [receivingUnit, setReceivingUnit] = useState("");
  const [receivingService, setReceivingService] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulationStage, setSimulationStage] =
    useState<AdmissionCommandSimulationStage>("NONE");
  const fetchGen = useRef(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const simulationAllowed = isAdmissionSimulationAllowed({
    NODE_ENV: process.env.NODE_ENV,
    ADMISSION_WORKFLOW_SIMULATION_ENABLED:
      process.env.NEXT_PUBLIC_ADMISSION_WORKFLOW_SIMULATION_ENABLED,
  });

  const canOps = useMemo(() => {
    const set = new Set(roles.map((r) => r.toUpperCase()));
    return set.has("ADMIN") || set.has("PROVIDER") || set.has("RN");
  }, [roles]);

  const load = useCallback(
    async (silent: boolean) => {
      if (!facilityId) return;
      const gen = ++fetchGen.current;
      if (!silent) setLoading(true);
      try {
        const qs = new URLSearchParams({
          filter,
          sort,
        });
        if (service.trim()) qs.set("service", service.trim());
        if (unit.trim()) qs.set("unit", unit.trim());
        if (levelOfCare.trim()) qs.set("levelOfCare", levelOfCare.trim());
        if (unassignedOnly) qs.set("unassignedOnly", "1");
        const data = (await apiFetch(
          `/hospital-care/admission-command-center?${qs.toString()}`,
          { facilityId }
        )) as ListResponse;
        if (gen !== fetchGen.current) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setMetrics(data.metrics ?? null);
        setPlacementOn(data.placementWorkflowEnabled === true);
        setOperationsMode(data.operationsMode ?? "PLACEMENT_OFF");
        setLastRefreshed(data.generatedAt ?? new Date().toISOString());
        setError(null);
      } catch {
        if (gen !== fetchGen.current) return;
        setError(t("admissionCommandCenter.loadError"));
      } finally {
        if (gen === fetchGen.current && !silent) setLoading(false);
      }
    },
    [facilityId, filter, sort, service, unit, levelOfCare, unassignedOnly, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load(false);
  }, [ready, facilityId, load]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void load(true);
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, facilityId, load]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (actionFor) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
      restoreFocusRef.current?.focus();
    }
  }, [actionFor]);

  const displayItems = useMemo((): CommandCenterRow[] => {
    if (!simulationAllowed || simulationStage === "NONE") return items;
    return items.map((row) => ({
      ...applyCommandCenterSimulationOverlay(row, simulationStage),
      convergedDisplayState: row.convergedDisplayState,
      admissionSourceKind: row.admissionSourceKind,
      receivingAuthority: row.receivingAuthority,
    }));
  }, [items, simulationAllowed, simulationStage]);

  const openAction = (encounterId: string, kind: ActionKind, decisionAt: string | null) => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setNote("");
    setReceivingUnit("");
    setReceivingService("");
    setHoldReason("NO_BED_AVAILABLE");
    setActionFor({ encounterId, kind, decisionAt });
  };

  const submitAction = async () => {
    if (!actionFor || !facilityId || !canOps) return;
    setSubmitting(true);
    setInfo(null);
    try {
      const action =
        actionFor.kind === "HOLD"
          ? "HOLD"
          : actionFor.kind === "RECEIVING_ACCEPT"
            ? "RECEIVING_ACCEPT"
            : "ACCEPT";
      await apiFetch(
        `/encounters/${encodeURIComponent(actionFor.encounterId)}/admission/operational-action`,
        {
          method: "POST",
          facilityId,
          body: JSON.stringify({
            action,
            note: note.trim() || null,
            holdReasonCode: action === "HOLD" ? holdReason : null,
            receivingUnit: receivingUnit.trim() || null,
            receivingService: receivingService.trim() || null,
            expectedAdmissionDecisionAt: actionFor.decisionAt,
            clientRequestId:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `ops-${Date.now()}`,
            precautionsAcknowledged: action === "RECEIVING_ACCEPT" ? true : undefined,
            equipmentAcknowledged: action === "RECEIVING_ACCEPT" ? true : undefined,
            isolationAcknowledged: action === "RECEIVING_ACCEPT" ? true : undefined,
          }),
        }
      );
      setInfo(t("admissionCommandCenter.actionSuccess"));
      setActionFor(null);
      await load(true);
    } catch (e) {
      const err = e as { errorCode?: string | null; body?: { code?: string } };
      const code = String(err.errorCode ?? err.body?.code ?? "").trim();
      const key = code
        ? `admissionCommandCenter.errors.${code}`
        : "admissionCommandCenter.actionError";
      const msg = t(key);
      setInfo(msg === key ? t("admissionCommandCenter.actionError") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HospitalCareShell
      active="admissions"
      title={t("admissionCommandCenter.title")}
      subtitle={t("admissionCommandCenter.subtitle")}
      actions={
        <button
          type="button"
          onClick={() => void load(false)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid #cbd5e1",
            background: "#fff",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          {t("admissionCommandCenter.refreshNow")}
        </button>
      }
    >
      <div data-testid="admission-command-center">
        {lastRefreshed ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("admissionCommandCenter.lastRefreshed")}:{" "}
            {new Date(lastRefreshed).toLocaleString()}
            {" · "}
            {t("admissionCommandCenter.operationsMode")}: {operationsMode}
          </p>
        ) : null}

        {metrics ? (
          <div
            data-testid="admission-command-metrics"
            data-metrics-kind={metrics.metricsKind}
            style={metricBox}
            aria-label={t("admissionCommandCenter.metrics.title")}
          >
            {(
              [
                ["pending", metrics.pendingAdmissions],
                ["waitingPlacement", metrics.waitingForPlacement],
                ["waitingBeds", metrics.waitingForBeds],
                ["assignedBeds", metrics.assignedBeds],
                ["waitingReceiving", metrics.waitingForReceivingAcceptance],
                ["readyTransport", metrics.readyForTransport],
                ["transporting", metrics.currentlyTransporting],
                ["onHold", metrics.onHold],
                ["overTarget", metrics.overTarget],
              ] as const
            ).map(([key, value]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                  {t(`admissionCommandCenter.metrics.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{value}</div>
              </div>
            ))}
            <div style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                {t("admissionCommandCenter.metrics.avgWait")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {formatAdmissionSlaDuration(metrics.averageCurrentWaitMs) ?? DISPLAY_DASH}
              </div>
            </div>
            <div style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                {t("admissionCommandCenter.metrics.longestWait")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {formatAdmissionSlaDuration(metrics.longestCurrentWaitMs) ?? DISPLAY_DASH}
              </div>
            </div>
            <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 11, color: "#64748b" }}>
              {t("admissionCommandCenter.metrics.kind")}
            </p>
          </div>
        ) : null}

        <div style={filterBar} data-testid="admission-command-filters">
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("admissionCommandCenter.filters.label")}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as AdmissionCommandCenterFilter)}
              style={{ ...selectStyle, marginLeft: 6 }}
            >
              {ADMISSION_COMMAND_CENTER_FILTERS.map((f) => (
                <option key={f} value={f}>
                  {t(`admissionCommandCenter.filters.${f}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("admissionCommandCenter.filters.sort")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as AdmissionCommandCenterSort)}
              style={{ ...selectStyle, marginLeft: 6 }}
            >
              {ADMISSION_COMMAND_CENTER_SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`admissionCommandCenter.filters.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label={t("admissionCommandCenter.filters.service")}
            placeholder={t("admissionCommandCenter.filters.service")}
            value={service}
            onChange={(e) => setService(e.target.value)}
            style={selectStyle}
          />
          <input
            aria-label={t("admissionCommandCenter.filters.unit")}
            placeholder={t("admissionCommandCenter.filters.unit")}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={selectStyle}
          />
          <input
            aria-label={t("admissionCommandCenter.filters.levelOfCare")}
            placeholder={t("admissionCommandCenter.filters.levelOfCare")}
            value={levelOfCare}
            onChange={(e) => setLevelOfCare(e.target.value)}
            style={selectStyle}
          />
          <label style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
            />
            {t("admissionCommandCenter.filters.unassignedOnly")}
          </label>
        </div>

        {simulationAllowed ? (
          <div
            data-testid="admission-command-simulation"
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px dashed #f59e0b",
              background: "#fffbeb",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
              {t("admissionCommandCenter.simulation.title")}
            </div>
            <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#78716c" }}>
              {t("admissionCommandCenter.simulation.hint")}
            </p>
            <select
              value={simulationStage}
              onChange={(e) =>
                setSimulationStage(e.target.value as AdmissionCommandSimulationStage)
              }
              aria-label={t("admissionCommandCenter.simulation.title")}
              style={selectStyle}
            >
              {ADMISSION_COMMAND_SIMULATION_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSimulationStage("NONE")}
              style={{ ...selectStyle, marginLeft: 8, cursor: "pointer" }}
            >
              {t("admissionCommandCenter.simulation.reset")}
            </button>
            {simulationStage !== "NONE" ? (
              <p
                data-testid="admission-command-simulation-banner"
                style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 700, color: "#b45309" }}
              >
                {t("admissionCommandCenter.simulation.banner")}
              </p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("admissionCommandCenter.loading")}</p>
        ) : null}
        {error ? (
          <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}
        {info ? (
          <p role="status" style={{ fontSize: 13, color: "#0f766e" }}>
            {info}
          </p>
        ) : null}

        {!loading && !error && displayItems.length === 0 ? (
          <p data-testid="admission-command-empty" style={{ fontSize: 13, color: "#64748b" }}>
            {t("admissionCommandCenter.empty")}
          </p>
        ) : null}

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {displayItems.map((row) => {
            const highlighted = highlightId && highlightId === row.encounterId;
            return (
              <li key={row.encounterId} style={{ marginBottom: 10 }}>
                <div
                  data-testid={`admission-command-row-${row.encounterId}`}
                  data-highlighted={highlighted ? "1" : "0"}
                  style={
                    highlighted
                      ? { outline: "2px solid #0f766e", outlineOffset: 2, borderRadius: 16 }
                      : undefined
                  }
                >
                <MedoraCard leftAccentColor="#0d9488">
                  <MedoraCardInner>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                          {row.patientDisplayName || DISPLAY_DASH}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {t("admissionCommandCenter.card.location")}:{" "}
                          {row.currentLocation || DISPLAY_DASH}
                          {" · "}
                          {row.encounterType || DISPLAY_DASH}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <MedoraCardBadge soft={SLA_BADGE[row.slaDisplayState]}>
                          {t(`admissionCommandCenter.sla.${row.slaDisplayState}`)}
                          {" — "}
                          {formatAdmissionSlaDuration(row.elapsedCurrentStateMs) ?? DISPLAY_DASH}
                        </MedoraCardBadge>
                        <MedoraCardBadge soft={NEUTRAL_BADGE}>
                          {t(`admissionCommandCenter.filters.${row.operationalFilter}`)}
                        </MedoraCardBadge>
                        {row.convergedDisplayState ? (
                          <MedoraCardBadge soft={NEUTRAL_BADGE}>
                            {t(
                              `admissionCommandCenter.displayStates.${row.convergedDisplayState}`
                            ) !==
                            `admissionCommandCenter.displayStates.${row.convergedDisplayState}`
                              ? t(
                                  `admissionCommandCenter.displayStates.${row.convergedDisplayState}`
                                )
                              : row.convergedDisplayState}
                          </MedoraCardBadge>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: "6px 12px",
                        marginTop: 10,
                        fontSize: 12,
                        color: "#334155",
                      }}
                    >
                      <div>
                        <strong>{t("admissionCommandCenter.admissionSource")}:</strong>{" "}
                        {row.admissionSourceKind || row.admissionSource || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.primaryDx")}:</strong>{" "}
                        {row.primaryDiagnosis || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.secondaryDxCount")}:</strong>{" "}
                        {row.secondaryDiagnosisCount}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.service")}:</strong>{" "}
                        {row.requestedService || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.level")}:</strong>{" "}
                        {row.requestedLevelOfCare || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.opsState")}:</strong>{" "}
                        {row.operationalStatus}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.placement")}:</strong>{" "}
                        {row.hasDurablePlacementRequest
                          ? row.placementStatus || DISPLAY_DASH
                          : t("admissionCommandCenter.placementOff.unavailable")}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.unit")}:</strong>{" "}
                        {row.unit || t("admissionCommandCenter.card.notAssigned")}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.bed")}:</strong>{" "}
                        {row.bed || t("admissionCommandCenter.card.notAssigned")}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.receiving")}:</strong>{" "}
                        {row.receivingAcceptance}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.transport")}:</strong>{" "}
                        {row.transportStatus}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.inpatient")}:</strong>{" "}
                        {row.inpatientEncounterStatus === "CREATED"
                          ? row.receivingEncounterId
                          : t("admissionCommandCenter.card.notCreated")}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.provider")}:</strong>{" "}
                        {row.responsibleProvider || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.lastActor")}:</strong>{" "}
                        {row.lastOperationalActor || DISPLAY_DASH}
                      </div>
                      <div>
                        <strong>{t("admissionCommandCenter.card.elapsedDecision")}:</strong>{" "}
                        {formatAdmissionSlaDuration(row.elapsedSinceDecisionMs) ?? DISPLAY_DASH}
                      </div>
                    </div>

                    {!placementOn && !row.hasDurablePlacementRequest ? (
                      <div
                        data-testid="admission-command-placement-off"
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 10,
                          background: "#f0fdfa",
                          border: "1px solid #99f6e4",
                          fontSize: 12,
                          color: "#115e59",
                        }}
                      >
                        <strong>{t("admissionCommandCenter.placementOff.title")}</strong>
                        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                          <li>
                            {t("admissionCommandCenter.placementOff.ops")}:{" "}
                            {row.operationalStatus}
                          </li>
                          <li>{t("admissionCommandCenter.placementOff.unavailable")}</li>
                          <li>{t("admissionCommandCenter.placementOff.remainsEd")}</li>
                          <li>{t("admissionCommandCenter.placementOff.noIp")}</li>
                          <li>{t("admissionCommandCenter.placementOff.packageAvailable")}</li>
                        </ul>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <Link
                        href={hospitalAdmissionReviewPath(row.encounterId)}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#0f766e",
                          textDecoration: "none",
                          border: "1px solid #99f6e4",
                          borderRadius: 10,
                          padding: "6px 10px",
                          background: "#f0fdfa",
                        }}
                      >
                        {t("admissionCommandCenter.openReview")}
                      </Link>
                      {canOps ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openAction(row.encounterId, "ACCEPT", row.decisionAt)
                            }
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              padding: "6px 10px",
                              cursor: "pointer",
                              background: "#fff",
                            }}
                          >
                            {t("admissionCommandCenter.acceptOperationally")}
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(row.encounterId, "HOLD", row.decisionAt)}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              padding: "6px 10px",
                              cursor: "pointer",
                              background: "#fff",
                            }}
                          >
                            {t("admissionCommandCenter.hold")}
                          </button>
                          {placementOn ? (
                            <button
                              type="button"
                              onClick={() =>
                                openAction(row.encounterId, "RECEIVING_ACCEPT", row.decisionAt)
                              }
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                border: "1px solid #cbd5e1",
                                borderRadius: 10,
                                padding: "6px 10px",
                                cursor: "pointer",
                                background: "#fff",
                              }}
                            >
                              {t("admissionCommandCenter.receivingAccept")}
                            </button>
                          ) : (
                            <span
                              style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}
                              title={t("admissionCommandCenter.receivingUnavailable")}
                            >
                              {t("admissionCommandCenter.receivingUnavailable")}
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  </MedoraCardInner>
                </MedoraCard>
                </div>
              </li>
            );
          })}
        </ul>

        <dialog
          ref={dialogRef}
          data-testid="admission-command-action-dialog"
          aria-labelledby={dialogTitleId}
          onClose={() => setActionFor(null)}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
            maxWidth: 440,
            width: "calc(100% - 32px)",
          }}
        >
          {actionFor ? (
            <>
              <h2 id={dialogTitleId} style={{ margin: "0 0 10px", fontSize: 16 }}>
                {actionFor.kind === "HOLD"
                  ? t("admissionCommandCenter.dialog.titleHold")
                  : actionFor.kind === "RECEIVING_ACCEPT"
                    ? t("admissionCommandCenter.dialog.titleReceiving")
                    : t("admissionCommandCenter.dialog.titleAccept")}
              </h2>
              {actionFor.kind === "HOLD" ? (
                <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                  {t("admissionCommandCenter.holdReason")}
                  <select
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    style={{ ...selectStyle, width: "100%", marginTop: 4 }}
                  >
                    {OPERATIONAL_HOLD_REASON_CODES.map((code) => (
                      <option key={code} value={code}>
                        {t(`admissionCommandCenter.holdReasons.${code}`)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {(actionFor.kind === "ACCEPT" || actionFor.kind === "RECEIVING_ACCEPT") && (
                <>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                    {t("admissionCommandCenter.receivingService")}
                    <input
                      value={receivingService}
                      onChange={(e) => setReceivingService(e.target.value)}
                      style={{ ...selectStyle, width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                    {t("admissionCommandCenter.receivingUnit")}
                    <input
                      value={receivingUnit}
                      onChange={(e) => setReceivingUnit(e.target.value)}
                      style={{ ...selectStyle, width: "100%", marginTop: 4 }}
                    />
                  </label>
                </>
              )}
              <label style={{ display: "block", fontSize: 12, marginBottom: 12 }}>
                {t("admissionCommandCenter.note")}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  style={{
                    ...selectStyle,
                    width: "100%",
                    marginTop: 4,
                    resize: "vertical",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setActionFor(null)}
                  aria-label={t("admissionCommandCenter.dialog.a11yClose")}
                  style={{ ...selectStyle, cursor: "pointer" }}
                >
                  {t("admissionCommandCenter.cancelDialog")}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitAction()}
                  style={{
                    ...selectStyle,
                    cursor: submitting ? "wait" : "pointer",
                    background: "#0f766e",
                    color: "#fff",
                    borderColor: "#0f766e",
                    fontWeight: 700,
                  }}
                >
                  {t("admissionCommandCenter.submitAction")}
                </button>
              </div>
            </>
          ) : null}
        </dialog>
      </div>
    </HospitalCareShell>
  );
}
