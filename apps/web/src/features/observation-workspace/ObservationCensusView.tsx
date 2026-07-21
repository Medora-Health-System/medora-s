"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  observationCensusRowIsArrived,
  resolveObservationWorkspaceEncounterId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalCarePatientCard } from "@/features/hospital-care/HospitalCarePatientCard";
import {
  fetchFacilityPlacementQueue,
  isForbiddenApiError,
  type HospitalCarePlacementQueueRow,
  type PlacementQueueAvailability,
} from "@/features/hospital-care/hospitalCarePlacementApi";
import { observationActiveWorkspacePath } from "./observationWorkspacePaths";

type StatusFilter = "all" | "arrived" | "in_transit";
type UnitFilter = "all" | string;

function formatDurationHours(
  fromIso: string | null | undefined,
  t: (k: string) => string
): string | null {
  if (!fromIso) return null;
  const ms = Date.now() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return t("observationD3d.census.durationHours").replace("{hours}", String(hours));
}

export function ObservationCensusView() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [availability, setAvailability] = useState<PlacementQueueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFacilityPlacementQueue();
        if (!cancelled) {
          setRows(data.items);
          setAvailability(data.availability);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setAvailability(null);
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3ca.loadError")
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

  const observationRows = useMemo(
    () => rows.filter((r) => r.requestedEncounterType === "OBSERVATION"),
    [rows]
  );

  const units = useMemo(() => {
    const set = new Set<string>();
    for (const r of observationRows) {
      const u = r.assignedUnitCode?.trim();
      if (u) set.add(u);
    }
    return [...set].sort();
  }, [observationRows]);

  const census = useMemo(() => {
    const q = query.trim().toLowerCase();
    return observationRows
      .filter((r) => {
        const arrived = observationCensusRowIsArrived(r);
        if (statusFilter === "arrived" && !arrived) return false;
        if (statusFilter === "in_transit" && arrived) return false;
        if (unitFilter !== "all" && (r.assignedUnitCode ?? "") !== unitFilter) return false;
        if (!q) return true;
        const name = `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.toLowerCase();
        const mrn = (r.patient.mrn ?? "").toLowerCase();
        const provider = (r.acceptingProviderNameSnapshot ?? "").toLowerCase();
        return (
          name.includes(q) ||
          mrn.includes(q) ||
          provider.includes(q) ||
          (r.assignedUnitCode ?? "").toLowerCase().includes(q) ||
          (r.status ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aAt = a.arrivedDestinationAt ?? a.requestedAt ?? a.createdAt;
        const bAt = b.arrivedDestinationAt ?? b.requestedAt ?? b.createdAt;
        return Date.parse(bAt) - Date.parse(aAt);
      });
  }, [observationRows, query, statusFilter, unitFilter]);

  return (
    <HospitalCareShell
      active="observation"
      title={t("observationD3d.census.title")}
      subtitle={t("observationD3d.census.subtitle")}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
          alignItems: "flex-end",
        }}
      >
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("common.search")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("observationD3d.census.searchPlaceholder")}
            style={{
              display: "block",
              width: "100%",
              minWidth: 220,
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
            }}
          />
        </label>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("observationD3d.census.filterStatus")}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              display: "block",
              marginTop: 4,
              minHeight: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
            }}
          >
            <option value="all">{t("observationD3d.census.statusAll")}</option>
            <option value="arrived">{t("observationD3d.census.statusArrived")}</option>
            <option value="in_transit">{t("observationD3d.census.statusInTransit")}</option>
          </select>
        </label>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("observationD3d.census.filterUnit")}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            style={{
              display: "block",
              marginTop: 4,
              minHeight: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
            }}
          >
            <option value="all">{t("observationD3d.census.unitAll")}</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : availability === "FEATURE_DISABLED" ? (
        <p
          style={{ fontSize: 13, color: "#64748b" }}
          data-testid="observation-census-feature-off"
        >
          {t("observationD3d.census.placementUnavailable")}
        </p>
      ) : census.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="observation-census-empty">
          {t("observationD3d.census.empty")}
        </p>
      ) : (
        <div data-testid="observation-census-list">
          {census.map((row) => {
            const workspaceId = resolveObservationWorkspaceEncounterId({
              receivingEncounterId: row.receivingEncounterId,
              fallbackEncounterId: row.originatingEncounterId,
            });
            const href = workspaceId ? observationActiveWorkspacePath(workspaceId) : undefined;
            return (
              <div key={row.id}>
                <HospitalCarePatientCard
                  row={row}
                  href={href}
                  durationLabel={formatDurationHours(
                    row.arrivedDestinationAt ?? row.departedEdAt,
                    t
                  )}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    margin: "-4px 0 12px 12px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <span>
                    {t("observationD3d.census.provider")}:{" "}
                    {row.acceptingProviderNameSnapshot?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("observationD3d.census.nurse")}: {t("observationD3d.census.nursePending")}
                  </span>
                  {href ? (
                    <Link href={href} style={{ color: "#0f766e", fontWeight: 600 }}>
                      {t("observationD3d.census.openWorkspace")}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </HospitalCareShell>
  );
}
