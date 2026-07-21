"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  computeHospitalDay,
  computeLengthOfStayHours,
  inpatientCensusRowIsArrived,
  resolveInpatientAdmissionClock,
  resolveInpatientWorkspaceEncounterId,
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
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";

type StatusFilter = "all" | "arrived" | "in_transit";
type UnitFilter = "all" | string;

export function InpatientCensusView() {
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

  const inpatientRows = useMemo(
    () => rows.filter((r) => r.requestedEncounterType === "INPATIENT"),
    [rows]
  );

  const units = useMemo(() => {
    const set = new Set<string>();
    for (const r of inpatientRows) {
      const u = r.assignedUnitCode?.trim();
      if (u) set.add(u);
    }
    return [...set].sort();
  }, [inpatientRows]);

  const census = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inpatientRows
      .filter((r) => {
        const arrived = inpatientCensusRowIsArrived({
          status: r.status,
          arrivedDestinationAt: r.arrivedDestinationAt,
          receivingEncounterId: r.receivingEncounterId,
        });
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
  }, [inpatientRows, query, statusFilter, unitFilter]);

  return (
    <HospitalCareShell
      active="inpatient"
      title={t("inpatientD3e.census.title")}
      subtitle={t("inpatientD3e.census.subtitle")}
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
            placeholder={t("inpatientD3e.census.searchPlaceholder")}
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
          {t("inpatientD3e.census.filterStatus")}
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
            <option value="all">{t("inpatientD3e.census.statusAll")}</option>
            <option value="arrived">{t("inpatientD3e.census.statusArrived")}</option>
            <option value="in_transit">{t("inpatientD3e.census.statusInTransit")}</option>
          </select>
        </label>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("inpatientD3e.census.filterUnit")}
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
            <option value="all">{t("inpatientD3e.census.unitAll")}</option>
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
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="inpatient-census-feature-off">
          {t("inpatientD3e.census.placementUnavailable")}
        </p>
      ) : census.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="inpatient-census-empty">
          {t("inpatientD3e.census.empty")}
        </p>
      ) : (
        <div data-testid="inpatient-census-list">
          {census.map((row) => {
            const workspaceId = resolveInpatientWorkspaceEncounterId({
              receivingEncounterId: row.receivingEncounterId,
              fallbackEncounterId: row.originatingEncounterId,
            });
            const href = workspaceId ? inpatientActiveWorkspacePath(workspaceId) : undefined;
            const clock = resolveInpatientAdmissionClock({
              arrivedAt: row.arrivedDestinationAt,
              createdAt: row.createdAt,
            });
            const hospitalDay = computeHospitalDay(clock);
            const losHours = computeLengthOfStayHours(clock);
            return (
              <div key={row.id}>
                <HospitalCarePatientCard row={row} href={href} />
                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    margin: "-4px 0 12px 12px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                  data-testid={`inpatient-census-meta-${row.id}`}
                >
                  <span>
                    {t("inpatientD3e.census.unit")}: {row.assignedUnitCode?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.room")}:{" "}
                    {row.assignedRoomKey?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.bed")}: {row.assignedBedKey?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.service")}:{" "}
                    {row.requestedService?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.attending")}:{" "}
                    {row.acceptingProviderNameSnapshot?.trim() || t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.nurse")}: {t("inpatientD3e.census.nursePending")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.hospitalDay")}:{" "}
                    {hospitalDay != null ? String(hospitalDay) : t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.los")}:{" "}
                    {losHours != null
                      ? t("inpatientD3e.census.losHours").replace("{hours}", String(losHours))
                      : t("common.dash")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.isolation")}: {t("inpatientD3e.census.notDocumented")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.codeStatus")}: {t("inpatientD3e.census.notDocumented")}
                  </span>
                  <span>
                    {t("inpatientD3e.census.currentStatus")}: {row.status || t("common.dash")}
                  </span>
                  {href ? (
                    <Link href={href} style={{ color: "#0f766e", fontWeight: 600 }}>
                      {t("inpatientD3e.census.openWorkspace")}
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
