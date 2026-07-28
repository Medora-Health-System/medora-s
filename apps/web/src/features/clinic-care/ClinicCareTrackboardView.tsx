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
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
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

const SHELL_NAV: ShellNavItem[] = [
  {
    id: "trackboard",
    href: null,
    labelKey: "clinicCareD4c2.nav.trackboard",
    visible: () => true,
  },
  {
    id: "registration",
    href: "/app/clinic-care/registration",
    labelKey: "clinicCareD4c2.nav.registration",
    visible: (a) => a.canAccessRegistration,
  },
  {
    id: "todaysVisits",
    href: null,
    labelKey: "clinicCareD4c2.nav.todaysVisits",
    visible: () => true,
  },
  {
    id: "nursing",
    href: "/app/nursing",
    labelKey: "clinicCareD4c2.nav.nursingMa",
    visible: (a) => a.canAccessNursingMa || a.canAccessTechnicianSafeNursingMaProjection,
  },
  {
    id: "provider",
    href: "/app/provider",
    labelKey: "clinicCareD4c2.nav.provider",
    visible: (a) => a.canAccessProviderDocumentation && a.canAuthorProviderDocumentation,
  },
  {
    id: "patients",
    href: "/app/patients",
    labelKey: "clinicCareD4c2.nav.patients",
    visible: (a) => a.canAccessPatients !== false,
  },
  {
    id: "encounters",
    href: "/app/encounters",
    labelKey: "clinicCareD4c2.nav.encounters",
    visible: (a) => a.canAccessEncounters === true,
  },
  {
    id: "followUps",
    href: "/app/follow-ups",
    labelKey: "clinicCareD4c2.nav.followUps",
    visible: (a) => a.canAccessFollowUps === true,
  },
  {
    id: "immunizations",
    href: "/app/public-health/vaccinations",
    labelKey: "clinicCareD4c2.nav.immunizations",
    visible: (a) => a.canAccessPublicHealthImmunizations === true,
  },
  {
    id: "diseaseReporting",
    href: "/app/public-health/disease-reports",
    labelKey: "clinicCareD4c2.nav.diseaseReporting",
    visible: (a) => a.canAccessPublicHealthDiseaseReporting === true,
  },
  {
    id: "billing",
    href: "/app/billing",
    labelKey: "clinicCareD4c2.nav.billing",
    visible: (a) => a.canAccessBilling,
  },
  {
    id: "pharmacy",
    href: "/app/pharmacy",
    labelKey: "clinicCareD4c2.nav.pharmacy",
    visible: (a) => a.canAccessPharmacy,
  },
];

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
  height: 36,
  borderRadius: 10,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  padding: "0 10px",
  fontSize: 13,
  color: "#0f172a",
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  width: "100%",
  boxSizing: "border-box",
};

export function ClinicCareTrackboardView() {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const { facilityId, roles, ready, facilityTimeZone } = useFacilityAndRoles();
  const profession = resolveProfessionGroup({ roleCodes: roles });

  const [data, setData] = useState<ClinicCareProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<"" | ClinicCareStageId>("");
  const [filterType, setFilterType] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [view, setView] = useState<ClinicCareTrackboardView>(
    defaultClinicCareTrackboardViewForProfession(profession)
  );
  const [sortKey, setSortKey] = useState<"arrival" | "patient" | "status">("arrival");
  const [activeShell, setActiveShell] = useState("trackboard");

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const payload = (await apiFetch("/clinic-care/trackboard", { facilityId })) as ClinicCareProjection;
      setData(payload);
      if (payload.defaultView) setView(payload.defaultView);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/403|denied|forbidden/i.test(message)) {
        setDenied(true);
        setData(null);
      } else {
        setError(t("clinicCareD4c2.errors.loadFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  useEffect(() => {
    setView(defaultClinicCareTrackboardViewForProfession(profession));
  }, [profession]);

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
      <main style={{ padding: 16 }}>
        <p style={{ color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
      </main>
    );
  }

  if (denied) {
    return (
      <main style={{ padding: 16, maxWidth: 720 }}>
        <section style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 20 }}>{t("clinicCareD4c2.title")}</h1>
          <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.errors.accessDenied")}</p>
        </section>
      </main>
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
    <div style={{ minHeight: "calc(100vh - 48px)", background: CLINIC_CARE_SHELL.canvas, padding: "12px 16px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.25rem, 2.2vw, 1.55rem)", fontWeight: 700, color: "#0f172a" }}>
                {t("clinicCareD4c2.title")}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                {data?.facilityName ? `${data.facilityName} · ` : ""}
                {t(operatingModeLabelKey(data?.operatingMode ?? null))}
                {data?.localDateKey ? ` · ${data.localDateKey}` : ""}
              </p>
            </div>
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
        </header>

        <nav
          aria-label={t("clinicCareD4c2.shellNavLabel")}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {(access ? SHELL_NAV.filter((item) => item.visible(access)) : SHELL_NAV.slice(0, 1)).map((item) => {
            const active = activeShell === item.id || (item.id === "trackboard" && activeShell === "trackboard");
            const baseStyle: React.CSSProperties = {
              display: "inline-flex",
              alignItems: "center",
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              border: `1px solid ${active ? "#0d9488" : CLINIC_CARE_SHELL.border}`,
              background: active ? "rgba(13,148,136,0.12)" : "#fff",
              color: active ? "#0f766e" : "#334155",
              cursor: "pointer",
            };
            if (item.href) {
              return (
                <Link key={item.id} href={item.href} style={baseStyle}>
                  {t(item.labelKey)}
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                style={baseStyle}
                onClick={() => {
                  setActiveShell(item.id);
                  if (item.id === "todaysVisits") setView("ALL_TODAY");
                  if (item.id === "trackboard") setView(data?.defaultView ?? "ALL_TODAY");
                }}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 14,
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
                  setActiveShell("trackboard");
                }}
                style={{
                  textAlign: "left",
                  borderRadius: CLINIC_CARE_SHELL.radius,
                  border: `1px solid ${token.border}`,
                  background: token.bg,
                  padding: "12px 14px",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: token.text, letterSpacing: "0.02em" }}>
                  {t(metricLabelKey(id))}
                </div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 750, color: token.accent, lineHeight: 1 }}>
                  {loading && count == null ? "…" : count ?? 0}
                </div>
              </button>
            );
          })}
        </section>

        <section
          style={{
            ...MEDORA_CARD_SHELL,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 1.4fr) repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8,
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
          <p role="alert" style={{ color: "#b91c1c", marginBottom: 12 }}>
            {error}
          </p>
        ) : null}

        {data?.truncated ? (
          <p style={{ fontSize: 12, color: "#92400e", marginBottom: 8 }}>{t("clinicCareD4c2.truncatedNotice")}</p>
        ) : null}

        <section style={{ ...MEDORA_CARD_SHELL, padding: 0, overflow: "auto" }}>
          {loading && !data ? (
            <p style={{ padding: 16, color: "#64748b", margin: 0 }}>{t("clinicCareD4c2.loading")}</p>
          ) : filteredRows.length === 0 ? (
            <p style={{ padding: 16, color: "#64748b", margin: 0 }}>{t("clinicCareD4c2.empty")}</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.patient")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.visitOrigin")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.visitType")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.scheduled")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.arrival")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.checkIn")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.status")}</th>
                  <th style={thStyle}>{t("clinicCareD4c2.columns.room")}</th>
                  {visibility.showProviderName ? (
                    <th style={thStyle}>{t("clinicCareD4c2.columns.provider")}</th>
                  ) : null}
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
                  const openHref =
                    row.stageId === "DISCHARGE_PENDING" && allowDischargeActions
                      ? access?.canAuthorProviderDocumentation
                        ? `/app/provider?encounterId=${encodeURIComponent(row.encounterId)}`
                        : `/app/nursing?encounterId=${encodeURIComponent(row.encounterId)}`
                      : visibility.showClinicalActionLinks && access?.canAuthorProviderDocumentation
                        ? `/app/provider?encounterId=${encodeURIComponent(row.encounterId)}`
                        : visibility.showClinicalActionLinks &&
                            (access?.canAccessNursingMa || access?.canAccessTechnicianSafeNursingMaProjection)
                          ? `/app/nursing?encounterId=${encodeURIComponent(row.encounterId)}`
                          : access?.canAccessEncounters
                            ? `/app/encounters`
                            : access?.canAccessPatients
                              ? `/app/patients`
                              : `/app/clinic-care`;
                  const actionLabel =
                    (row.stageId === "DISCHARGE_PENDING" && allowDischargeActions) ||
                    (visibility.showClinicalActionLinks &&
                      (access?.canAuthorProviderDocumentation || access?.canAccessNursingMa))
                      ? t("clinicCareD4c2.actions.open")
                      : t("clinicCareD4c2.actions.view");
                  return (
                    <tr key={row.encounterId} style={{ borderTop: `1px solid ${CLINIC_CARE_SHELL.border}` }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 650, color: "#0f172a" }}>{row.patientName}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
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
                            padding: "2px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: stageTok.bg,
                            color: stageTok.text,
                            border: `1px solid ${stageTok.border}`,
                          }}
                        >
                          {t(stageLabelKey(row.stageId))}
                        </span>
                      </td>
                      <td style={tdStyle}>{row.roomLabel || dash}</td>
                      {visibility.showProviderName ? (
                        <td style={tdStyle}>{row.providerName || dash}</td>
                      ) : null}
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
                        <Link
                          href={openHref}
                          style={{
                            display: "inline-flex",
                            height: 28,
                            alignItems: "center",
                            padding: "0 10px",
                            borderRadius: 8,
                            border: `1px solid ${CLINIC_CARE_SHELL.border}`,
                            background: "#fff",
                            color: "#0f172a",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {actionLabel}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <p style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>{t("clinicCareD4c2.footerDeferral")}</p>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
  color: "#0f172a",
};

function countChip(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: color,
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "0 6px",
  };
}
