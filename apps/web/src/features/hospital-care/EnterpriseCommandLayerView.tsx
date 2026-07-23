"use client";

/**
 * D4A.2.7 — Enterprise Clinical Command Layer UI.
 * Consumes EnterpriseCommandService APIs only. Never edits clinical documentation.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  ENTERPRISE_PATIENT_LIST_KINDS,
  type EnterprisePatientListKind,
  type EnterpriseTrackBoardRowV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  NEUTRAL_BADGE,
} from "@/components/medora-card";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  fetchEnterpriseAlerts,
  fetchEnterpriseCapacity,
  fetchEnterpriseCommandDashboard,
  fetchEnterpriseExecutive,
  fetchEnterprisePatientFlow,
  fetchEnterprisePatientList,
  fetchEnterpriseTasks,
  fetchEnterpriseTrackBoard,
  type EnterpriseDashboardResponse,
  type EnterpriseExecutiveResponse,
} from "./enterpriseCommandApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";

type TabId =
  | "trackBoard"
  | "commandCenter"
  | "patientLists"
  | "capacity"
  | "tasks"
  | "alerts"
  | "executive"
  | "flow";

const POLL_MS = 15_000;

const tabBar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 12,
};

const tabBtn = (active: boolean): CSSProperties => ({
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 9999,
  border: `1px solid ${active ? "#0f766e" : "#cbd5e1"}`,
  background: active ? "#ccfbf1" : "#fff",
  color: active ? "#115e59" : "#334155",
  cursor: "pointer",
});

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

const selectStyle: CSSProperties = {
  fontSize: 13,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

function flagBadges(row: EnterpriseTrackBoardRowV1): string[] {
  const flags: string[] = [];
  if (row.isolation) flags.push("ISO");
  if (row.rapidResponse) flags.push("RRT");
  if (row.stroke) flags.push("STROKE");
  if (row.stemi) flags.push("STEMI");
  if (row.sepsis) flags.push("SEPSIS");
  if (row.codeBlue) flags.push("CODE");
  if (row.telemetry) flags.push("TELE");
  if (row.dischargeReady) flags.push("DC");
  if (row.pendingPlacement) flags.push("PLACE*");
  return flags;
}

export function EnterpriseCommandLayerView() {
  const { t } = useI18n();
  const { ready } = useFacilityAndRoles();
  const [tab, setTab] = useState<TabId>("trackBoard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rows, setRows] = useState<EnterpriseTrackBoardRowV1[]>([]);
  const [dashboard, setDashboard] = useState<EnterpriseDashboardResponse | null>(null);
  const [listKind, setListKind] = useState<EnterprisePatientListKind>("OBSERVATION");
  const [listQuery, setListQuery] = useState("");
  const [listRows, setListRows] = useState<EnterpriseTrackBoardRowV1[]>([]);
  const [capacity, setCapacity] = useState<EnterpriseDashboardResponse["capacity"] | null>(null);
  const [tasks, setTasks] = useState<
    Array<{ encounterId: string; taskId: string; title: string; priority: string; status: string }>
  >([]);
  const [alerts, setAlerts] = useState<
    Array<{ alertType: string; encounterId: string; summary: string }>
  >([]);
  const [executive, setExecutive] = useState<EnterpriseExecutiveResponse | null>(null);
  const [flow, setFlow] = useState<Record<string, number | null> | null>(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [board, dash] = await Promise.all([
        fetchEnterpriseTrackBoard(),
        fetchEnterpriseCommandDashboard(),
      ]);
      setRows(board.rows);
      setGeneratedAt(board.generatedAt);
      setDashboard(dash);
      setCapacity(dash.capacity);
    } catch (err) {
      setError(
        isForbiddenApiError(err)
          ? t("hospitalCareD3ca.accessDenied")
          : t("enterpriseCommandD4a27.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready) return;
    void loadCore();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCore();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadCore();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, loadCore]);

  useEffect(() => {
    if (!ready || tab !== "patientLists") return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEnterprisePatientList(listKind, listQuery);
        if (!cancelled) setListRows(data.rows);
      } catch {
        if (!cancelled) setListRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, tab, listKind, listQuery]);

  useEffect(() => {
    if (!ready) return;
    if (tab === "capacity") {
      void fetchEnterpriseCapacity()
        .then((d) => setCapacity(d.capacity))
        .catch(() => undefined);
    }
    if (tab === "tasks") {
      void fetchEnterpriseTasks()
        .then((d) => setTasks(d.tasks))
        .catch(() => setTasks([]));
    }
    if (tab === "alerts") {
      void fetchEnterpriseAlerts()
        .then((d) => setAlerts(d.alerts))
        .catch(() => setAlerts([]));
    }
    if (tab === "executive") {
      void fetchEnterpriseExecutive()
        .then(setExecutive)
        .catch(() => setExecutive(null));
    }
    if (tab === "flow") {
      void fetchEnterprisePatientFlow()
        .then((d) => setFlow(d.flow))
        .catch(() => setFlow(null));
    }
  }, [ready, tab]);

  const tabs: TabId[] = [
    "trackBoard",
    "commandCenter",
    "patientLists",
    "capacity",
    "tasks",
    "alerts",
    "executive",
    "flow",
  ];

  return (
    <HospitalCareShell
      active="home"
      title={t("enterpriseCommandD4a27.title")}
      subtitle={t("enterpriseCommandD4a27.subtitle")}
    >
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        {t("enterpriseCommandD4a27.neverLegalRecord")} · {t("enterpriseCommandD4a27.placementOff")}
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button type="button" onClick={() => void loadCore()} style={tabBtn(false)}>
          {t("enterpriseCommandD4a27.refreshNow")}
        </button>
        {generatedAt ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t("enterpriseCommandD4a27.lastRefreshed")}: {new Date(generatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <div style={tabBar} role="tablist" aria-label={t("enterpriseCommandD4a27.title")}>
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            style={tabBtn(tab === id)}
          >
            {t(`enterpriseCommandD4a27.tabs.${id}`)}
          </button>
        ))}
      </div>

      {loading && !dashboard ? <p>{t("enterpriseCommandD4a27.loading")}</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {(tab === "commandCenter" || tab === "trackBoard") && dashboard ? (
        <section aria-label={t("enterpriseCommandD4a27.metrics.title")} style={metricBox}>
          {(
            [
              ["census", dashboard.capacity.activeHospitalPatients],
              ["observation", dashboard.capacity.activeObservation],
              ["inpatient", dashboard.capacity.activeInpatient],
              ["bedsAvailable", dashboard.capacity.bedsAvailable],
              ["bedsOccupied", dashboard.capacity.bedsOccupied],
              ["bedsCleaning", dashboard.capacity.bedsCleaning],
              ["admissionsToday", dashboard.capacity.admissionsToday],
              ["dischargesToday", dashboard.capacity.dischargesToday],
              ["criticalAlerts", dashboard.criticalAlerts],
              ["pendingConsults", dashboard.pendingConsults],
              ["pendingImaging", dashboard.pendingImaging],
              ["dischargeReady", dashboard.dischargeReady],
              ["openTasks", dashboard.openTasks],
              ["openEscalations", dashboard.openEscalations],
              ["pendingPlacement", dashboard.capacity.pendingPlacement],
            ] as const
          ).map(([key, val]) => (
            <div key={key} style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {t(`enterpriseCommandD4a27.metrics.${key}`)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{val ?? DISPLAY_DASH}</div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "trackBoard" ? (
        <section aria-label={t("enterpriseCommandD4a27.trackBoard.title")}>
          {rows.length === 0 && !loading ? (
            <p>{t("enterpriseCommandD4a27.trackBoard.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((row) => (
                <MedoraCard key={row.encounterId} leftAccentColor="#0d9488">
                  <MedoraCardInner>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(140px, 1.4fr) repeat(4, minmax(70px, 1fr)) auto",
                        gap: 8,
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <strong>{row.patientName}</strong>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {row.mrn ?? DISPLAY_DASH} · {row.status ?? DISPLAY_DASH}
                        </div>
                      </div>
                      <div>
                        {t("enterpriseCommandD4a27.trackBoard.unit")}: {row.unit ?? DISPLAY_DASH}
                      </div>
                      <div>
                        {t("enterpriseCommandD4a27.trackBoard.room")}/{t("enterpriseCommandD4a27.trackBoard.bed")}:{" "}
                        {row.room ?? DISPLAY_DASH}/{row.bed ?? DISPLAY_DASH}
                      </div>
                      <div>
                        {t("enterpriseCommandD4a27.trackBoard.provider")}: {row.provider ?? DISPLAY_DASH}
                      </div>
                      <div>
                        {t("enterpriseCommandD4a27.trackBoard.rn")}: {row.rn ?? DISPLAY_DASH}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                        <MedoraCardBadge soft={NEUTRAL_BADGE}>
                          {t("enterpriseCommandD4a27.trackBoard.los")} {row.losHours ?? DISPLAY_DASH}h
                        </MedoraCardBadge>
                        {flagBadges(row).map((f) => (
                          <MedoraCardBadge key={f} soft={NEUTRAL_BADGE}>
                            {f}
                          </MedoraCardBadge>
                        ))}
                      </div>
                    </div>
                    {(row.pendingImaging > 0 ||
                      row.pendingConsult > 0 ||
                      row.warnings.length > 0) && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
                        {t("enterpriseCommandD4a27.trackBoard.pending")}: img {row.pendingImaging} ·
                        consult {row.pendingConsult}
                        {row.warnings.length
                          ? ` · ${t("enterpriseCommandD4a27.trackBoard.warnings")}: ${row.warnings.join(", ")}`
                          : ""}
                      </div>
                    )}
                  </MedoraCardInner>
                </MedoraCard>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "patientLists" ? (
        <section>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 13 }}>
              {t("enterpriseCommandD4a27.lists.label")}{" "}
              <select
                value={listKind}
                onChange={(e) => setListKind(e.target.value as EnterprisePatientListKind)}
                style={selectStyle}
              >
                {ENTERPRISE_PATIENT_LIST_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder={t("enterpriseCommandD4a27.lists.search")}
              style={{ ...selectStyle, minWidth: 220 }}
            />
          </div>
          {listRows.length === 0 ? (
            <p>{t("enterpriseCommandD4a27.lists.empty")}</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {listRows.map((r) => (
                <li key={r.encounterId} style={{ ...metricCell, marginBottom: 6 }}>
                  <strong>{r.patientName}</strong> — {r.unit ?? DISPLAY_DASH} / {r.room ?? DISPLAY_DASH}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "capacity" && capacity ? (
        <section style={metricBox} aria-label={t("enterpriseCommandD4a27.tabs.capacity")}>
          {(
            [
              ["bedsAvailable", capacity.bedsAvailable],
              ["bedsOccupied", capacity.bedsOccupied],
              ["bedsCleaning", capacity.bedsCleaning],
              ["admissionsToday", capacity.admissionsToday],
              ["dischargesToday", capacity.dischargesToday],
              ["pendingPlacement", capacity.pendingPlacement],
              ["census", capacity.activeHospitalPatients],
            ] as const
          ).map(([key, val]) => (
            <div key={key} style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {t(`enterpriseCommandD4a27.metrics.${key}`)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{val ?? DISPLAY_DASH}</div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "tasks" ? (
        <section>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("enterpriseCommandD4a27.tasks.neverDocumentation")}
          </p>
          {tasks.length === 0 ? (
            <p>{t("enterpriseCommandD4a27.tasks.empty")}</p>
          ) : (
            <ul>
              {tasks.map((task) => (
                <li key={`${task.encounterId}-${task.taskId}`}>
                  [{task.priority}] {task.title} — {task.status}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "alerts" ? (
        <section>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("enterpriseCommandD4a27.alerts.neverAutoAck")}
          </p>
          {alerts.length === 0 ? (
            <p>{t("enterpriseCommandD4a27.alerts.empty")}</p>
          ) : (
            <ul>
              {alerts.map((a, i) => (
                <li key={`${a.encounterId}-${a.alertType}-${i}`}>
                  [{a.alertType}] {a.summary}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "executive" && executive ? (
        <section aria-label={t("enterpriseCommandD4a27.executive.title")} style={metricBox}>
          <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b" }}>
            {t("enterpriseCommandD4a27.executive.readOnly")}
          </p>
          {(
            [
              ["census", executive.census],
              ["admissionsToday", executive.admissionsToday],
              ["dischargesToday", executive.dischargesToday],
              ["averageLos", executive.averageLosHours],
              ["occupancy", executive.capacityOccupancyPct != null ? `${executive.capacityOccupancyPct}%` : null],
              ["criticalAlerts", executive.criticalAlerts],
              ["pendingConsults", executive.pendingConsult],
              ["pendingPlacement", executive.pendingPlacement],
            ] as const
          ).map(([key, val]) => (
            <div key={key} style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {t(`enterpriseCommandD4a27.metrics.${key}`)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{val ?? DISPLAY_DASH}</div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "flow" && flow ? (
        <section>
          <p style={{ fontSize: 12, color: "#64748b" }}>{t("enterpriseCommandD4a27.flow.note")}</p>
          <pre
            style={{
              fontSize: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              overflow: "auto",
            }}
          >
            {JSON.stringify(flow, null, 2)}
          </pre>
        </section>
      ) : null}
    </HospitalCareShell>
  );
}
