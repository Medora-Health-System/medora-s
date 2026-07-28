"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_TRACKBOARD_VIEWS,
  clinicCareRowMatchesView,
  defaultClinicCareTrackboardViewForProfession,
  facilityLocalDayUtcBounds,
  resolveClinicCareTrackboardFieldVisibility,
  resolveProfessionGroup,
  type ClinicCareStageId,
  type ClinicCareTrackboardFieldVisibility,
  type ClinicCareTrackboardMetricId,
  type ClinicCareTrackboardView,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { assignProviderSelf } from "@/lib/clinicalWorklistApi";
import { canAssignEncounterRoom } from "@/lib/governedRoomDisplay";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  resolveClinicBoardActionHref,
  resolveClinicBoardPatientNameHref,
} from "./clinicCareBoardRoutes";
import { ClinicCareInlineRoomSelect } from "./ClinicCareInlineRoomSelect";
import { clinicCareMetricToken, clinicCareStageToken, CLINIC_CARE_SHELL } from "./clinicCareTokens";

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
  openOrderCount: number;
  resultsPendingCount: number;
  hasOpenFollowUpDue: boolean;
  visitOrigin?: string | null;
  visitOriginDisplay?: string;
  scheduledStartAt?: string | null;
  arrivedAt?: string | null;
  checkedInAt?: string | null;
  registrationCompletenessStatus?: string | null;
};

type ClinicCareAccess = {
  canAccessClinicCareShell: boolean;
  canAccessProviderDocumentation: boolean;
  canAccessNursingMa: boolean;
  canAccessTechnicianSafeNursingMaProjection: boolean;
  canAccessRegistration: boolean;
  canAccessPatients: boolean;
  canAccessEncounters: boolean;
  canAccessFollowUps: boolean;
  canAccessLaboratory: boolean;
  canAccessRadiology: boolean;
  canAccessPharmacy: boolean;
  canAccessBilling: boolean;
  canAccessAdministration: boolean;
  canAccessPublicHealth?: boolean;
  canAccessPublicHealthImmunizations?: boolean;
  canAccessPublicHealthDiseaseReporting?: boolean;
  canAccessMsppHaitiPathway?: boolean;
  canAdministerVaccines?: boolean;
  canAuthorProviderDocumentation: boolean;
  canMutateDiagnosesOrProblemList: boolean;
  canIssueProviderOrders: boolean;
  canPrescribe: boolean;
  canAuthorIndependentNursingAssessment: boolean;
  canAdministerMedicationsUnrestricted: boolean;
  canCompleteDispositionOrEncounter: boolean;
  canSignAsNurseOrProvider: boolean;
};

type ClinicCareProjection = {
  facilityId: string;
  facilityName: string | null;
  facilityTimeZone: string;
  localDateKey: string;
  careProfile: string;
  operatingMode: string | null;
  metrics: Record<ClinicCareTrackboardMetricId, number>;
  defaultView: ClinicCareTrackboardView;
  rows: ClinicCareRow[];
  truncated: boolean;
  fieldVisibility?: ClinicCareTrackboardFieldVisibility;
  access: ClinicCareAccess;
  generatedAt: string;
};

type ShellNavItem = {
  id: string;
  href: string | null;
  labelKey: string;
  visible: (access: ClinicCareAccess) => boolean;
  placeholder?: boolean;
};

/** @deprecated MEDUI.D4C.2A — top tabs live in ClinicCareTopNav / CLINIC_WORKSPACE_NAV_REGISTRY. */
const SHELL_NAV: ShellNavItem[] = [];
void SHELL_NAV;

function metricLabelKey(id: ClinicCareTrackboardMetricId): string {
  switch (id) {
    case "TODAYS_VISITS":
      return "clinicCareD4c2.metrics.todaysVisits";
    case "WAITING":
      return "clinicCareD4c2.metrics.waiting";
    case "IN_PROGRESS":
      return "clinicCareD4c2.metrics.inProgress";
    case "RESULTS_PENDING":
      return "clinicCareD4c2.metrics.resultsPending";
    case "DISCHARGE_PENDING":
      return "clinicCareD4c2.metrics.dischargePending";
    case "FOLLOW_UPS_DUE":
      return "clinicCareD4c2.metrics.followUpsDue";
    default:
      return "clinicCareD4c2.metrics.todaysVisits";
  }
}

function stageLabelKey(id: ClinicCareStageId): string {
  switch (id) {
    case "WAITING":
      return "clinicCareD4c2.stages.waiting";
    case "IN_PROGRESS":
      return "clinicCareD4c2.stages.inProgress";
    case "RESULTS_PENDING":
      return "clinicCareD4c2.stages.resultsPending";
    case "DISCHARGE_PENDING":
      return "clinicCareD4c2.stages.dischargePending";
    case "COMPLETED":
      return "clinicCareD4c2.stages.completed";
    case "NEEDS_REVIEW":
      return "clinicCareD4c2.stages.needsReview";
    case "STATUS_UNAVAILABLE":
    default:
      return "clinicCareD4c2.stages.statusUnavailable";
  }
}

function nextStepLabelKey(hint: string): string {
  const map: Record<string, string> = {
    ROOM_PATIENT: "clinicCareD4c2.nextSteps.roomPatient",
    PROVIDER_EVAL: "clinicCareD4c2.nextSteps.providerEval",
    REVIEW_RESULTS: "clinicCareD4c2.nextSteps.reviewResults",
    COMPLETE_ENCOUNTER: "clinicCareD4c2.nextSteps.completeEncounter",
    DISCHARGE: "clinicCareD4c2.nextSteps.completeEncounter",
    NEEDS_REVIEW: "clinicCareD4c2.nextSteps.needsReview",
    STATUS_UNAVAILABLE: "clinicCareD4c2.nextSteps.statusUnavailable",
    NONE: "clinicCareD4c2.nextSteps.none",
  };
  return map[hint] ?? "clinicCareD4c2.nextSteps.statusUnavailable";
}

function viewLabelKey(view: ClinicCareTrackboardView): string {
  const map: Record<ClinicCareTrackboardView, string> = {
    ALL_TODAY: "clinicCareD4c2.views.allToday",
    WAITING: "clinicCareD4c2.views.waiting",
    NURSING_MA: "clinicCareD4c2.views.nursingMa",
    PROVIDER: "clinicCareD4c2.views.provider",
    RESULTS_PENDING: "clinicCareD4c2.views.resultsPending",
    DISCHARGE_PENDING: "clinicCareD4c2.views.dischargePending",
    FOLLOW_UP_DUE: "clinicCareD4c2.views.followUpDue",
    COMPLETED: "clinicCareD4c2.views.completed",
  };
  return map[view];
}

function operatingModeLabelKey(mode: string | null): string {
  switch (mode) {
    case "URGENT_CARE":
      return "clinicCareD4c2.modes.urgentCare";
    case "CLINIC_AND_URGENT_CARE":
      return "clinicCareD4c2.modes.hybrid";
    case "CLINIC":
    default:
      return "clinicCareD4c2.modes.clinic";
  }
}

function encounterTypeLabelKey(type: string): string {
  const u = type.toUpperCase();
  if (u === "URGENT_CARE") return "clinicCareD4c2.encounterTypes.urgentCare";
  if (u === "OUTPATIENT") return "clinicCareD4c2.encounterTypes.outpatient";
  return "clinicCareD4c2.encounterTypes.other";
}

function visitOriginLabelKey(token: string | null | undefined): string {
  const u = String(token || "LEGACY").toUpperCase();
  return `clinicCareD4c2.visitOrigins.${u}`;
}

function formatArrivalTime(iso: string, timeZone: string, locale: string, dash: string): string {
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

const selectStyle: React.CSSProperties = {
  height: 30,
  borderRadius: 8,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  padding: "0 8px",
  fontSize: 12,
  color: "#0f172a",
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  width: "100%",
  boxSizing: "border-box",
};

export function ClinicCareTrackboardView({
  mode = "trackboard",
}: {
  /** MEDUI.D4C.2A — route-backed Today's Visits vs operational trackboard. */
  mode?: "trackboard" | "todaysVisits";
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const { facilityId, roles, ready, facilityTimeZone, userId } = useFacilityAndRoles();
  const profession = resolveProfessionGroup({ roleCodes: roles });
  const isProvider = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canAssignRoom = canAssignEncounterRoom(roles);

  const [data, setData] = useState<ClinicCareProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMiss, setSchemaMiss] = useState(false);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<"" | ClinicCareStageId>("");
  const [filterType, setFilterType] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [view, setView] = useState<ClinicCareTrackboardView>(
    mode === "todaysVisits" ? "ALL_TODAY" : defaultClinicCareTrackboardViewForProfession(profession)
  );
  const [sortKey, setSortKey] = useState<"arrival" | "patient" | "status">("arrival");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<{ id: string; message: string } | null>(null);
  const activeShell = mode === "todaysVisits" ? "todaysVisits" : "trackboard";
  void activeShell;
  void userId;

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    setSchemaMiss(false);
    setDenied(false);
    try {
      const payload = (await apiFetch("/clinic-care/trackboard", { facilityId })) as ClinicCareProjection;
      setData(payload);
      if (mode === "todaysVisits") {
        setView("ALL_TODAY");
      } else if (payload.defaultView) {
        setView(payload.defaultView);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Never treat API failure as an empty board — clear rows only on auth denial.
      if (/403|denied|forbidden/i.test(message)) {
        setDenied(true);
        setData(null);
      } else {
        const miss =
          /CLINIC_CARE_SCHEMA_MISS|visitOrigin|P2021|P2022|schema not deployed|503/i.test(message);
        setSchemaMiss(miss);
        setError(
          miss ? t("clinicCareD4c2.errors.schemaMiss") : t("clinicCareD4c2.errors.loadFailed")
        );
        // Keep prior data for retry UX; do not replace with [].
      }
    } finally {
      setLoading(false);
    }
  }, [facilityId, t, mode]);

  const claimProviderSelf = useCallback(
    async (encounterId: string) => {
      if (!facilityId) return;
      setAssigningId(encounterId);
      setAssignError(null);
      try {
        await assignProviderSelf(facilityId, encounterId);
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setAssignError({
          id: encounterId,
          message: message || t("clinicCareD4c2.errors.assignFailed"),
        });
      } finally {
        setAssigningId(null);
      }
    },
    [facilityId, load, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  useEffect(() => {
    if (mode === "todaysVisits") {
      setView("ALL_TODAY");
      return;
    }
    setView(defaultClinicCareTrackboardViewForProfession(profession));
  }, [profession, mode]);

  const dayBounds = useMemo(() => {
    const tz = data?.facilityTimeZone || facilityTimeZone || "America/Chicago";
    return facilityLocalDayUtcBounds(new Date(), tz);
  }, [data?.facilityTimeZone, facilityTimeZone]);

  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.rows ?? []) {
      if (row.providerName) set.add(row.providerName);
    }
    return [...set].sort((a, b) => a.localeCompare(b, language === "en" ? "en" : "fr"));
  }, [data?.rows, language]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.rows ?? []) {
      if (row.roomLabel) set.add(row.roomLabel);
    }
    return [...set].sort((a, b) => a.localeCompare(b, language === "en" ? "en" : "fr"));
  }, [data?.rows, language]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    const effectiveView = activeShell === "todaysVisits" ? "ALL_TODAY" : view;
    let list = rows.filter((row) => {
      if (
        !clinicCareRowMatchesView({
          view: effectiveView,
          stageId: row.stageId,
          createdAt: row.createdAt,
          dayStartUtc: dayBounds.startUtc,
          dayEndExclusiveUtc: dayBounds.endExclusiveUtc,
          hasOpenFollowUpDue: row.hasOpenFollowUpDue,
        })
      ) {
        return false;
      }
      if (filterStage && row.stageId !== filterStage) return false;
      if (filterType && row.encounterType !== filterType) return false;
      if (filterProvider && row.providerName !== filterProvider) return false;
      if (filterRoom && row.roomLabel !== filterRoom) return false;
      if (q) {
        const blob = `${row.patientName} ${row.mrn ?? ""} ${row.chiefComplaint ?? ""} ${row.roomLabel ?? ""} ${row.providerName ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "patient") return a.patientName.localeCompare(b.patientName, language === "en" ? "en" : "fr");
      if (sortKey === "status") return a.stageId.localeCompare(b.stageId);
      return a.createdAt.localeCompare(b.createdAt);
    });
    return list;
  }, [
    data?.rows,
    search,
    view,
    activeShell,
    filterStage,
    filterType,
    filterProvider,
    filterRoom,
    sortKey,
    dayBounds,
    language,
  ]);

  if (!ready) {
    return (
      <div>
        <p style={{ color: "#64748b", margin: 0 }}>{t("clinicCareD4c2.loading")}</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div>
        <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.errors.accessDenied")}</p>
      </div>
    );
  }

  const visibility =
    data?.fieldVisibility ?? resolveClinicCareTrackboardFieldVisibility(profession);
  const access = data?.access;
  const dash = t("common.dash");
  void visibility.showDischargePendingKpi; // primary KPI always rendered via PRIMARY metric ids
  const allowDischargeActions =
    visibility.showDischargeActions === true && access?.canCompleteDispositionOrEncounter === true;

  return (
    <div data-testid="clinic-care-trackboard-panel">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {data?.facilityName ? `${data.facilityName} · ` : ""}
            {t(operatingModeLabelKey(data?.operatingMode ?? null))}
            {data?.localDateKey ? ` · ${data.localDateKey}` : ""}
            {mode === "todaysVisits" ? ` · ${t("clinicCareD4c2.nav.todaysVisits")}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            style={{
              height: 36,
              borderRadius: 10,
              border: `1px solid ${CLINIC_CARE_SHELL.border}`,
              background: "#fff",
              padding: "0 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "#0f172a",
            }}
          >
            {t("clinicCareD4c2.refresh")}
          </button>
        </div>

        {access?.canAccessTechnicianSafeNursingMaProjection && !access.canAuthorProviderDocumentation ? (
          <p
            role="status"
            style={{
              margin: "0 0 12px",
              padding: "8px 12px",
              borderRadius: 10,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: 12,
            }}
          >
            {t("clinicCareD4c2.techSafeBanner")}
          </p>
        ) : null}

        {profession === "FRONT_DESK" ? (
          <p
            role="status"
            style={{
              margin: "0 0 12px",
              padding: "8px 12px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: 12,
            }}
          >
            {t("clinicCareD4c2.banners.frontDesk")}
          </p>
        ) : null}

        {profession === "BILLING" ? (
          <p
            role="status"
            style={{
              margin: "0 0 12px",
              padding: "8px 12px",
              borderRadius: 10,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: 12,
            }}
          >
            {t("clinicCareD4c2.banners.billing")}
          </p>
        ) : null}

        <section
          aria-label={t("clinicCareD4c2.kpiSectionLabel")}
          data-testid="clinic-care-kpi-tiles"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS.map((id) => {
            const token = clinicCareMetricToken(id);
            const count = data?.metrics?.[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "WAITING") setView("WAITING");
                  else if (id === "RESULTS_PENDING") setView("RESULTS_PENDING");
                  else if (id === "DISCHARGE_PENDING") setView("DISCHARGE_PENDING");
                  else if (id === "FOLLOW_UPS_DUE") setView("FOLLOW_UP_DUE");
                  else if (id === "TODAYS_VISITS") setView("ALL_TODAY");
                  else if (id === "IN_PROGRESS") setView("PROVIDER");
                }}
                style={{
                  textAlign: "left",
                  borderRadius: 10,
                  border: `1px solid ${token.border}`,
                  background: token.bg,
                  padding: "8px 10px",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: token.text, letterSpacing: "0.02em" }}>
                  {t(metricLabelKey(id))}
                </div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 750, color: token.accent, lineHeight: 1 }}>
                  {loading && count == null ? "…" : error && count == null ? "—" : count ?? 0}
                </div>
              </button>
            );
          })}
        </section>

        <section style={{ ...MEDORA_CARD_SHELL, padding: 8, marginBottom: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(160px, 1.4fr) repeat(auto-fit, minmax(100px, 1fr))",
              gap: 6,
              alignItems: "end",
            }}
          >
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.search")}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("clinicCareD4c2.filters.searchPlaceholder")}
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.view")}
              <select value={view} onChange={(e) => setView(e.target.value as ClinicCareTrackboardView)} style={{ ...selectStyle, width: "100%", marginTop: 4 }}>
                {CLINIC_CARE_TRACKBOARD_VIEWS.map((v) => (
                  <option key={v} value={v}>
                    {t(viewLabelKey(v))}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.status")}
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as "" | ClinicCareStageId)}
                style={{ ...selectStyle, width: "100%", marginTop: 4 }}
              >
                <option value="">{t("clinicCareD4c2.filters.all")}</option>
                {(
                  [
                    "WAITING",
                    "IN_PROGRESS",
                    "RESULTS_PENDING",
                    "DISCHARGE_PENDING",
                    "COMPLETED",
                    "NEEDS_REVIEW",
                    "STATUS_UNAVAILABLE",
                  ] as ClinicCareStageId[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {t(stageLabelKey(s))}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.visitType")}
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 4 }}>
                <option value="">{t("clinicCareD4c2.filters.all")}</option>
                <option value="OUTPATIENT">{t("clinicCareD4c2.encounterTypes.outpatient")}</option>
                <option value="URGENT_CARE">{t("clinicCareD4c2.encounterTypes.urgentCare")}</option>
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.provider")}
              <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 4 }}>
                <option value="">{t("clinicCareD4c2.filters.all")}</option>
                {providerOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.room")}
              <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 4 }}>
                <option value="">{t("clinicCareD4c2.filters.all")}</option>
                {roomOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("clinicCareD4c2.filters.sort")}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as "arrival" | "patient" | "status")}
                style={{ ...selectStyle, width: "100%", marginTop: 4 }}
              >
                <option value="arrival">{t("clinicCareD4c2.filters.sortArrival")}</option>
                <option value="patient">{t("clinicCareD4c2.filters.sortPatient")}</option>
                <option value="status">{t("clinicCareD4c2.filters.sortStatus")}</option>
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            data-testid="clinic-care-trackboard-error"
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            <p style={{ margin: 0, fontWeight: 650 }}>{error}</p>
            {schemaMiss ? (
              <p style={{ margin: "6px 0 0", fontSize: 12 }}>{t("clinicCareD4c2.errors.schemaMissHint")}</p>
            ) : null}
            <button
              type="button"
              data-testid="clinic-care-trackboard-retry"
              onClick={() => void load()}
              style={{
                marginTop: 10,
                height: 32,
                borderRadius: 8,
                border: "1px solid #fca5a5",
                background: "#fff",
                padding: "0 12px",
                fontWeight: 600,
                cursor: "pointer",
                color: "#991b1b",
              }}
            >
              {t("clinicCareD4c2.retry")}
            </button>
          </div>
        ) : null}

        {data?.truncated ? (
          <p style={{ fontSize: 12, color: "#92400e", marginBottom: 8 }}>{t("clinicCareD4c2.truncatedNotice")}</p>
        ) : null}

        <section
          style={{ ...MEDORA_CARD_SHELL, padding: 0, overflow: "auto", maxHeight: "calc(100vh - 280px)" }}
        >
          {loading && !data ? (
            <p style={{ padding: 12, color: "#64748b", margin: 0 }}>{t("clinicCareD4c2.loading")}</p>
          ) : error && !data ? (
            <p
              style={{ padding: 12, color: "#64748b", margin: 0 }}
              data-testid="clinic-care-trackboard-error-empty"
            >
              {t("clinicCareD4c2.errors.loadBlockedEmpty")}
            </p>
          ) : filteredRows.length === 0 ? (
            <p
              style={{ padding: 12, color: "#64748b", margin: 0 }}
              data-testid="clinic-care-trackboard-true-empty"
            >
              {t("clinicCareD4c2.empty")}
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.patient")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.visitOrigin")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.visitType")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.scheduled")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.arrival")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.checkIn")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.status")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.room")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.provider")}</th>
                  {visibility.showOpenOrderCount ? (
                    <th style={thStyle}>{t("clinicCareD4c2.columns.orders")}</th>
                  ) : null}
                  {visibility.showResultsPendingCount ? (
                    <th style={thStyle}>{t("clinicCareD4c2.columns.results")}</th>
                  ) : null}
                  {visibility.showNextStepHint ? (
                    <th style={thStyle}>{t("clinicCareD4c2.columns.nextStep")}</th>
                  ) : null}
                  <th style={thStyle}>{t("clinicCareD4c2.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const stageTok = clinicCareStageToken(row.stageId);
                  const chartHref = resolveClinicBoardPatientNameHref({
                    encounterId: row.encounterId,
                    patientId: row.patientId,
                    status: row.status,
                    workflowState: row.workflowState,
                    facilityId,
                  });
                  const openHref = resolveClinicBoardActionHref({
                    encounterId: row.encounterId,
                    stageId: row.stageId,
                    canAuthorProviderDocumentation: access?.canAuthorProviderDocumentation,
                    canAccessNursingMa: access?.canAccessNursingMa,
                    canAccessTechnicianSafeNursingMaProjection:
                      access?.canAccessTechnicianSafeNursingMaProjection,
                    canAccessEncounters: access?.canAccessEncounters,
                    canAccessPatients: access?.canAccessPatients,
                    showClinicalActionLinks: visibility.showClinicalActionLinks,
                    allowDischargeActions,
                  });
                  const showOpenAction =
                    (row.stageId === "DISCHARGE_PENDING" && allowDischargeActions) ||
                    (visibility.showClinicalActionLinks === true &&
                      row.stageId === "DISCHARGE_PENDING");
                  const showAssignProvider =
                    isProvider && row.status === "OPEN" && !row.providerName;
                  return (
                    <tr key={row.encounterId} style={{ borderTop: `1px solid ${CLINIC_CARE_SHELL.border}` }}>
                      <td style={tdStyle}>
                        <Link
                          href={chartHref}
                          data-testid={`clinic-care-patient-name-${row.encounterId}`}
                          aria-label={t("clinicCareD4c2.actions.openPatientChartAria").replace(
                            "{{name}}",
                            row.patientName
                          )}
                          style={{
                            fontWeight: 650,
                            color: "#0f766e",
                            textDecoration: "underline",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {row.patientName}
                        </Link>
                        <div style={{ fontSize: 10, color: "#64748b" }}>
                          {row.mrn ? `${t("clinicCareD4c2.mrnPrefix")} ${row.mrn}` : dash}
                          {visibility.showChiefComplaint && row.chiefComplaint
                            ? ` · ${row.chiefComplaint}`
                            : ""}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {t(visitOriginLabelKey(row.visitOriginDisplay || row.visitOrigin || "LEGACY"))}
                      </td>
                      <td style={tdStyle}>{t(encounterTypeLabelKey(row.encounterType))}</td>
                      <td style={tdStyle}>
                        {row.scheduledStartAt
                          ? formatArrivalTime(
                              row.scheduledStartAt,
                              data?.facilityTimeZone || "America/Chicago",
                              locale,
                              dash
                            )
                          : dash}
                      </td>
                      <td style={tdStyle}>
                        {formatArrivalTime(
                          row.arrivedAt || row.createdAt,
                          data?.facilityTimeZone || "America/Chicago",
                          locale,
                          dash
                        )}
                      </td>
                      <td style={tdStyle}>
                        {row.checkedInAt
                          ? formatArrivalTime(
                              row.checkedInAt,
                              data?.facilityTimeZone || "America/Chicago",
                              locale,
                              dash
                            )
                          : dash}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "1px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            background: stageTok.bg,
                            color: stageTok.text,
                            border: `1px solid ${stageTok.border}`,
                          }}
                        >
                          {t(stageLabelKey(row.stageId))}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {canAssignRoom && row.status === "OPEN" && facilityId ? (
                          <ClinicCareInlineRoomSelect
                            facilityId={facilityId}
                            encounterId={row.encounterId}
                            encounterType={row.encounterType}
                            roomLabel={row.roomLabel}
                            onSaved={load}
                          />
                        ) : (
                          row.roomLabel || dash
                        )}
                      </td>
                      <td style={tdStyle}>
                        {visibility.showProviderName !== false ? (
                          <div style={{ fontSize: 12 }} data-testid={`clinic-care-provider-cell-${row.encounterId}`}>
                            {row.providerName ? (
                              row.providerName
                            ) : showAssignProvider ? (
                              <button
                                type="button"
                                data-testid={`clinic-care-assign-provider-${row.encounterId}`}
                                disabled={assigningId === row.encounterId}
                                onClick={() => void claimProviderSelf(row.encounterId)}
                                style={{ ...actionBtnStyle, cursor: "pointer", height: 24, fontSize: 11 }}
                              >
                                {t("clinicCareD4c4.assignMeProvider")}
                              </button>
                            ) : (
                              dash
                            )}
                          </div>
                        ) : (
                          dash
                        )}
                        {assignError && assignError.id === row.encounterId ? (
                          <p role="alert" style={{ margin: "2px 0 0", fontSize: 10, color: "#b91c1c" }}>
                            {assignError.message}
                          </p>
                        ) : null}
                      </td>
                      {visibility.showOpenOrderCount ? (
                        <td style={tdStyle}>
                          {row.openOrderCount > 0 ? (
                            <span style={countChip("#ea580c")}>{row.openOrderCount}</span>
                          ) : (
                            dash
                          )}
                        </td>
                      ) : null}
                      {visibility.showResultsPendingCount ? (
                        <td style={tdStyle}>
                          {row.resultsPendingCount > 0 ? (
                            <span style={countChip("#9333ea")}>{row.resultsPendingCount}</span>
                          ) : (
                            dash
                          )}
                        </td>
                      ) : null}
                      {visibility.showNextStepHint ? (
                        <td style={tdStyle}>{t(nextStepLabelKey(row.nextStepHint))}</td>
                      ) : null}
                      <td style={tdStyle}>
                        {showOpenAction ? (
                          <Link
                            href={openHref}
                            data-testid={`clinic-care-action-chart-${row.encounterId}`}
                            style={actionBtnStyle}
                          >
                            {t("clinicCareD4c2.actions.open")}
                          </Link>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  height: 24,
  alignItems: "center",
  padding: "0 8px",
  borderRadius: 6,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 11,
};

const thStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#64748b",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  borderBottom: `1px solid ${CLINIC_CARE_SHELL.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
  color: "#0f172a",
};

function countChip(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: color,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "0 5px",
  };
}
