"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "./HospitalCareShell";
import { HospitalCareActivePatientsSection } from "./HospitalCareActivePatientsSection";
import { filterHospitalCareHomeTilesForRoles } from "./hospitalCareSectionAccess";
import {
  fetchHospitalCareDashboard,
  fetchHospitalCareMeta,
  type HospitalCareDashboardWithCensus,
  type HospitalCareMetaResponse,
  type HospitalCensusResponse,
} from "./hospitalCareCensusApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";
import {
  HOSPITAL_CARE_ADMISSIONS,
  HOSPITAL_CARE_BEDS,
  HOSPITAL_CARE_FLOOR_BOARD,
  HOSPITAL_CARE_INPATIENT,
  HOSPITAL_CARE_OBSERVATION,
  HOSPITAL_CARE_PLACEMENT_QUEUE,
  HOSPITAL_CARE_TRANSFERS,
  type HospitalCareSectionId,
} from "./hospitalCarePaths";

type TileDef = {
  sectionId: HospitalCareSectionId;
  href: string;
  titleKey: string;
  primaryCount: (d: HospitalCareDashboardWithCensus) => number | string;
  secondaryKey: string;
  secondaryCount: (d: HospitalCareDashboardWithCensus) => number | string;
  actionKey: string;
  statusKey: (d: HospitalCareDashboardWithCensus) => string;
};

const TILES: TileDef[] = [
  {
    sectionId: "placementQueue",
    href: HOSPITAL_CARE_PLACEMENT_QUEUE,
    titleKey: "hospitalCareD3e6.tiles.placement.title",
    primaryCount: (d) =>
      d.placementAvailability === "FEATURE_DISABLED"
        ? "—"
        : d.counts.placementRequested + d.counts.placementAccepted + d.counts.readyForTransfer,
    secondaryKey: "hospitalCareD3e6.tiles.placement.secondary",
    secondaryCount: (d) =>
      d.placementAvailability === "FEATURE_DISABLED" ? "—" : d.counts.awaitingBed,
    actionKey: "hospitalCareD3e6.tiles.placement.action",
    statusKey: (d) =>
      d.placementAvailability === "FEATURE_DISABLED"
        ? "hospitalCareD3e6.status.placementOff"
        : "hospitalCareD3e6.status.live",
  },
  {
    sectionId: "observation",
    href: HOSPITAL_CARE_OBSERVATION,
    titleKey: "hospitalCareD3e6.tiles.observation.title",
    primaryCount: (d) => d.counts.activeObservation,
    secondaryKey: "hospitalCareD3e6.tiles.observation.secondary",
    secondaryCount: () => "—",
    actionKey: "hospitalCareD3e6.tiles.observation.action",
    statusKey: () => "hospitalCareD3e6.status.live",
  },
  {
    sectionId: "inpatient",
    href: HOSPITAL_CARE_INPATIENT,
    titleKey: "hospitalCareD3e6.tiles.inpatient.title",
    primaryCount: (d) => d.counts.activeInpatient,
    secondaryKey: "hospitalCareD3e6.tiles.inpatient.secondary",
    secondaryCount: (d) => d.counts.admissionsToday,
    actionKey: "hospitalCareD3e6.tiles.inpatient.action",
    statusKey: () => "hospitalCareD3e6.status.live",
  },
  {
    sectionId: "admissions",
    href: HOSPITAL_CARE_ADMISSIONS,
    titleKey: "hospitalCareD3e6.tiles.admissions.title",
    primaryCount: (d) => d.counts.admissionsToday,
    secondaryKey: "hospitalCareD3e6.tiles.admissions.secondary",
    secondaryCount: (d) =>
      d.placementAvailability === "FEATURE_DISABLED" ? "—" : d.counts.placementRequested,
    actionKey: "hospitalCareD3e6.tiles.admissions.action",
    statusKey: () => "hospitalCareD3e6.status.live",
  },
  {
    sectionId: "beds",
    href: HOSPITAL_CARE_BEDS,
    titleKey: "hospitalCareD3e6.tiles.beds.title",
    primaryCount: (d) =>
      d.counts.bedsOccupied != null ? d.counts.bedsOccupied : "—",
    secondaryKey: "hospitalCareD3e6a.tiles.beds.secondary",
    secondaryCount: (d) =>
      d.counts.bedsAvailable != null ? d.counts.bedsAvailable : "—",
    actionKey: "hospitalCareD3e6.tiles.beds.action",
    statusKey: () => "hospitalCareD3e6.status.floorBoard",
  },
  {
    sectionId: "transfers",
    href: HOSPITAL_CARE_TRANSFERS,
    titleKey: "hospitalCareD3e6.tiles.transfers.title",
    primaryCount: () => "—",
    secondaryKey: "hospitalCareD3e6.tiles.transfers.secondary",
    secondaryCount: () => "—",
    actionKey: "hospitalCareD3e6.tiles.transfers.action",
    statusKey: () => "hospitalCareD3e6.status.future",
  },
];

function SnapshotGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "6px 8px",
              background: "#fff",
              minWidth: 72,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HospitalCareHomeView() {
  const { t } = useI18n();
  const { roles, ready } = useFacilityAndRoles();
  const tiles = ready ? filterHospitalCareHomeTilesForRoles(TILES, roles) : TILES;
  const [dashboard, setDashboard] = useState<HospitalCareDashboardWithCensus | null>(null);
  const [meta, setMeta] = useState<HospitalCareMetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, m] = await Promise.all([
          fetchHospitalCareDashboard() as Promise<HospitalCareDashboardWithCensus>,
          fetchHospitalCareMeta().catch(() => null),
        ]);
        if (!cancelled) {
          setDashboard(dash);
          setMeta(m);
        }
      } catch (err) {
        if (!cancelled) {
          setDashboard(null);
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3e6.loadError")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const census: HospitalCensusResponse | null = dashboard?.census ?? null;
  const snap = census?.operationalSnapshot;

  return (
    <HospitalCareShell
      active="home"
      title={t("hospitalCareD3e6.home.title")}
      subtitle={t("hospitalCareD3e6a.home.subtitle")}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : dashboard ? (
        <>
          {dashboard.placementAvailability === "FEATURE_DISABLED" ? (
            <p
              data-testid="hospital-care-dashboard-feature-off"
              style={{
                ...MEDORA_CARD_SHELL,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {t("hospitalCareD3e6a.featureOffGuidance")}
            </p>
          ) : null}

          {/* SECTION 2 — Primary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
            data-testid="hospital-care-dashboard-tiles"
          >
            {tiles.map((tile) => {
              const primary = tile.primaryCount(dashboard);
              const secondary = tile.secondaryCount(dashboard);
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  data-testid={`hospital-care-tile-${tile.sectionId}`}
                  style={{
                    display: "block",
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    textDecoration: "none",
                    color: "inherit",
                    minHeight: 118,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {t(tile.titleKey)}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: "#0f766e" }}>
                    {primary}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                    {t(tile.secondaryKey).replace("{count}", String(secondary))}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {t(tile.statusKey(dashboard))}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* SECTION 3 — Operational snapshot */}
          {snap ? (
            <section
              style={{ marginTop: 18, ...MEDORA_CARD_SHELL, padding: 12 }}
              data-testid="hospital-care-operational-snapshot"
            >
              <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {t("hospitalCareD3e6a.snapshot.title")}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <SnapshotGroup
                  title={t("hospitalCareD3e6a.snapshot.staffing")}
                  items={[
                    { label: t("hospitalCareD3e6a.snapshot.rnUnassigned"), value: snap.rnUnassigned },
                    {
                      label: t("hospitalCareD3e6a.snapshot.mdUnassigned"),
                      value: snap.physicianUnassigned,
                    },
                  ]}
                />
                <SnapshotGroup
                  title={t("hospitalCareD3e6a.snapshot.clinical")}
                  items={[
                    {
                      label: t("hospitalCareD3e6a.snapshot.reassess"),
                      value: snap.reassessmentOverdue,
                    },
                    { label: t("hospitalCareD3e6a.snapshot.vitals"), value: snap.vitalsStale },
                    { label: t("hospitalCareD3e6a.snapshot.critical"), value: snap.criticalResults },
                  ]}
                />
                <SnapshotGroup
                  title={t("hospitalCareD3e6a.snapshot.flow")}
                  items={[
                    { label: t("hospitalCareD3e6a.snapshot.awaitingBed"), value: snap.awaitingBed },
                    { label: t("hospitalCareD3e6a.snapshot.los24"), value: snap.los24hOrMore },
                    { label: t("hospitalCareD3e6a.snapshot.readyDc"), value: snap.readyDischarge },
                  ]}
                />
              </div>
            </section>
          ) : null}

          {/* SECTION 4–5 — Filters + patients */}
          {census ? <HospitalCareActivePatientsSection census={census} /> : null}

          {/* SECTION 6 — Attention */}
          {dashboard.attention.length > 0 ? (
            <section style={{ marginTop: 18 }} data-testid="hospital-care-attention">
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {t("hospitalCareD3e6.attention.title")}
              </h2>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {dashboard.attention.map((a) => (
                  <li key={a.code}>
                    {a.code}: {a.count}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* SECTION 7 — Recent activity (collapsed) */}
          <section style={{ marginTop: 18 }} data-testid="hospital-care-recent-activity">
            <button
              type="button"
              onClick={() => setActivityOpen((v) => !v)}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              {t("hospitalCareD3e6.activity.title")} {activityOpen ? "▾" : "▸"}
            </button>
            {activityOpen ? (
              dashboard.recentActivity.length === 0 ? (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                  {t("hospitalCareD3e6.activity.empty")}
                </p>
              ) : (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                  {dashboard.recentActivity.slice(0, 8).map((a) => (
                    <li key={`${a.id}-${a.kind}`}>
                      {a.label}
                      {a.destination ? ` (${a.destination})` : ""}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>

          {/* SECTION 8 — Floor & bed overview */}
          <section
            style={{ marginTop: 18, ...MEDORA_CARD_SHELL, padding: 12 }}
            data-testid="hospital-care-floor-overview"
          >
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {t("hospitalCareD3e6a.floorOverview.title")}
            </h2>
            <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>
              {t("hospitalCareD3e6a.floorOverview.subtitle")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
              <span>
                {t("hospitalCareD3e6a.floorOverview.occupied")}:{" "}
                <strong>
                  {dashboard.counts.bedsOccupied != null ? dashboard.counts.bedsOccupied : "—"}
                </strong>
              </span>
              <span>
                {t("hospitalCareD3e6a.floorOverview.available")}:{" "}
                <strong>
                  {dashboard.counts.bedsAvailable != null ? dashboard.counts.bedsAvailable : "—"}
                </strong>
              </span>
              <span>
                {t("hospitalCareD3e6a.floorOverview.unavailable")}:{" "}
                <strong>
                  {dashboard.counts.bedsUnavailable != null
                    ? dashboard.counts.bedsUnavailable
                    : "—"}
                </strong>
              </span>
            </div>
            <Link
              href={HOSPITAL_CARE_FLOOR_BOARD}
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 12,
                fontWeight: 600,
                color: "#0f766e",
              }}
            >
              {t("hospitalCareD3e6a.floorOverview.openFull")}
            </Link>
          </section>

          {meta?.developmentDiagnosticsVisible ? (
            <section
              style={{
                marginTop: 18,
                ...MEDORA_CARD_SHELL,
                padding: "10px 12px",
                fontSize: 12,
                color: "#64748b",
              }}
              data-testid="hospital-care-dev-diagnostics"
            >
              <strong style={{ color: "#334155" }}>{t("hospitalCareD3e6.diagnostics.title")}</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>
                  {t("hospitalCareD3e6.diagnostics.placement")}:{" "}
                  {dashboard.capabilities.placementWorkflow
                    ? t("hospitalCareD3e6.diagnostics.on")
                    : t("hospitalCareD3e6.diagnostics.off")}
                </li>
                <li>
                  Census: Obs {dashboard.counts.activeObservation} / IP{" "}
                  {dashboard.counts.activeInpatient}
                </li>
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </HospitalCareShell>
  );
}
