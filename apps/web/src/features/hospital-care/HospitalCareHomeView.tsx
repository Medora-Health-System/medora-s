"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "./HospitalCareShell";
import { filterHospitalCareHomeTilesForRoles } from "./hospitalCareSectionAccess";
import {
  fetchHospitalCareDashboard,
  fetchHospitalCareMeta,
  type HospitalCareDashboardResponse,
  type HospitalCareMetaResponse,
} from "./hospitalCareDashboardApi";
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
  primaryCount: (d: HospitalCareDashboardResponse) => number;
  secondaryKey: string;
  secondaryCount: (d: HospitalCareDashboardResponse) => number | string;
  actionKey: string;
  statusKey: (d: HospitalCareDashboardResponse) => string;
};

const TILES: TileDef[] = [
  {
    sectionId: "placementQueue",
    href: HOSPITAL_CARE_PLACEMENT_QUEUE,
    titleKey: "hospitalCareD3e6.tiles.placement.title",
    primaryCount: (d) =>
      d.counts.placementRequested + d.counts.placementAccepted + d.counts.readyForTransfer,
    secondaryKey: "hospitalCareD3e6.tiles.placement.secondary",
    secondaryCount: (d) => d.counts.awaitingBed,
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
    statusKey: (d) =>
      d.capabilities.observation
        ? "hospitalCareD3e6.status.live"
        : "hospitalCareD3e6.status.optionalOff",
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
    secondaryCount: (d) => d.counts.placementRequested,
    actionKey: "hospitalCareD3e6.tiles.admissions.action",
    statusKey: () => "hospitalCareD3e6.status.live",
  },
  {
    sectionId: "beds",
    href: HOSPITAL_CARE_BEDS,
    titleKey: "hospitalCareD3e6.tiles.beds.title",
    primaryCount: (d) => d.counts.awaitingBed,
    secondaryKey: "hospitalCareD3e6.tiles.beds.secondary",
    secondaryCount: () => "—",
    actionKey: "hospitalCareD3e6.tiles.beds.action",
    statusKey: () => "hospitalCareD3e6.status.floorBoard",
  },
  {
    sectionId: "transfers",
    href: HOSPITAL_CARE_TRANSFERS,
    titleKey: "hospitalCareD3e6.tiles.transfers.title",
    primaryCount: () => 0,
    secondaryKey: "hospitalCareD3e6.tiles.transfers.secondary",
    secondaryCount: () => 0,
    actionKey: "hospitalCareD3e6.tiles.transfers.action",
    statusKey: () => "hospitalCareD3e6.status.future",
  },
];

function attentionLabelKey(code: string): string {
  const map: Record<string, string> = {
    PLACEMENTS_AWAITING_REVIEW: "hospitalCareD3e6.attention.awaitingReview",
    ACCEPTED_WITHOUT_BED: "hospitalCareD3e6.attention.acceptedWithoutBed",
    DEPARTED_ED_AWAITING_ARRIVAL: "hospitalCareD3e6.attention.departedAwaitingArrival",
  };
  return map[code] ?? "hospitalCareD3e6.attention.generic";
}

function activityLabelKey(kind: string): string {
  const map: Record<string, string> = {
    ADMISSION_REQUESTED: "hospitalCareD3e6.activity.admissionRequested",
    PLACEMENT_ACCEPTED: "hospitalCareD3e6.activity.placementAccepted",
    BED_ASSIGNED: "hospitalCareD3e6.activity.bedAssigned",
    DEPARTED_ED: "hospitalCareD3e6.activity.departedEd",
    ARRIVED_OBSERVATION: "hospitalCareD3e6.activity.arrivedObservation",
    ARRIVED_INPATIENT: "hospitalCareD3e6.activity.arrivedInpatient",
    PLACEMENT_UPDATE: "hospitalCareD3e6.activity.placementUpdate",
  };
  return map[kind] ?? "hospitalCareD3e6.activity.placementUpdate";
}

export function HospitalCareHomeView() {
  const { t } = useI18n();
  const { roles, ready } = useFacilityAndRoles();
  const tiles = ready ? filterHospitalCareHomeTilesForRoles(TILES, roles) : TILES;
  const [dashboard, setDashboard] = useState<HospitalCareDashboardResponse | null>(null);
  const [meta, setMeta] = useState<HospitalCareMetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, m] = await Promise.all([
          fetchHospitalCareDashboard(),
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

  return (
    <HospitalCareShell
      active="home"
      title={t("hospitalCareD3e6.home.title")}
      subtitle={t("hospitalCareD3e6.home.subtitle")}
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
              {t("hospitalCareD3e6.featureOffGuidance")}
            </p>
          ) : null}

          {dashboard.emptyGuidance.boardEmpty &&
          dashboard.placementAvailability === "ENABLED" ? (
            <p
              data-testid="hospital-care-dashboard-empty"
              style={{
                ...MEDORA_CARD_SHELL,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
                color: "#334155",
              }}
            >
              {t("hospitalCareD3e6.empty.dashboard")}
            </p>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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
                    minHeight: 120,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
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
                  <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "#0f766e" }}>
                    {t(tile.actionKey)}
                  </p>
                </Link>
              );
            })}
          </div>

          <section style={{ marginTop: 18 }} data-testid="hospital-care-attention">
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {t("hospitalCareD3e6.attention.title")}
            </h2>
            {dashboard.attention.length === 0 ? (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                {t("hospitalCareD3e6.attention.empty")}
              </p>
            ) : (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {dashboard.attention.map((a) => (
                  <li key={a.code}>
                    {t(attentionLabelKey(a.code)).replace("{count}", String(a.count))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: 18 }} data-testid="hospital-care-recent-activity">
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {t("hospitalCareD3e6.activity.title")}
            </h2>
            {dashboard.recentActivity.length === 0 ? (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                {t("hospitalCareD3e6.activity.empty")}
              </p>
            ) : (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {dashboard.recentActivity.map((a) => (
                  <li key={`${a.id}-${a.kind}`}>
                    {t(activityLabelKey(a.kind))}: {a.label}
                    {a.destination ? ` (${a.destination})` : ""}
                  </li>
                ))}
              </ul>
            )}
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
                  {t("hospitalCareD3e6.diagnostics.observation")}:{" "}
                  {dashboard.capabilities.observation
                    ? t("hospitalCareD3e6.diagnostics.on")
                    : t("hospitalCareD3e6.diagnostics.off")}
                </li>
                <li>
                  {t("hospitalCareD3e6.diagnostics.inpatient")}:{" "}
                  {dashboard.capabilities.inpatient
                    ? t("hospitalCareD3e6.diagnostics.on")
                    : t("hospitalCareD3e6.diagnostics.off")}
                </li>
                <li>
                  {t("hospitalCareD3e6.diagnostics.directAdmission")}:{" "}
                  {dashboard.capabilities.directAdmission
                    ? t("hospitalCareD3e6.diagnostics.on")
                    : t("hospitalCareD3e6.diagnostics.off")}
                </li>
              </ul>
              {meta.mismatches?.length ? (
                <p style={{ margin: "8px 0 0", color: "#b45309" }}>
                  {t("hospitalCareD3e6.diagnostics.mismatchHint")}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      <p style={{ margin: "16px 0 0", fontSize: 12, color: "#64748b" }}>
        {t("hospitalCareD3e6.home.edRemainsPrimary")}{" "}
        <Link href="/app/emergency/trackboard" style={{ color: "#0f766e" }}>
          {t("nav.emergency")}
        </Link>
        {" · "}
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={{ color: "#0f766e" }}>
          {t("hospitalCareD3ca.home.floorBoardLink")}
        </Link>
      </p>
    </HospitalCareShell>
  );
}
