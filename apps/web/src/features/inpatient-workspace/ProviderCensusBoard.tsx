"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  filterProviderCensusRows,
  sortProviderCensusRows,
  PROVIDER_CENSUS_UNSUPPORTED_FACETS,
  type ProviderCensusSort,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchHospitalCensus,
  type HospitalCensusPatientRow,
} from "@/features/hospital-care/hospitalCareCensusApi";
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";

/**
 * D4A.2.6A — Real provider census with filter/sort over enterprise hospital census rows.
 */
export function ProviderCensusBoard() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCensusPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attending, setAttending] = useState("");
  const [unit, setUnit] = useState("");
  const [query, setQuery] = useState("");
  const [observation, setObservation] = useState(false);
  const [medSurg, setMedSurg] = useState(false);
  const [dischargeReady, setDischargeReady] = useState(false);
  const [pendingConsult, setPendingConsult] = useState(false);
  const [sort, setSort] = useState<ProviderCensusSort>("ROOM");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const census = await fetchHospitalCensus("ALL_HOSPITAL_CARE");
        if (!cancelled) setRows(census.allHospitalPatients ?? []);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError(t("hospitalCareD3ca.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const visible = useMemo(() => {
    const filtered = filterProviderCensusRows(rows, {
      attending: attending.trim() || null,
      unit: unit.trim() || null,
      query: query.trim() || null,
      observation: observation || null,
      medSurg: medSurg || null,
      dischargeReady: dischargeReady || null,
      pendingConsult: pendingConsult || null,
    });
    return sortProviderCensusRows(filtered, sort);
  }, [
    rows,
    attending,
    unit,
    query,
    observation,
    medSurg,
    dischargeReady,
    pendingConsult,
    sort,
  ]);

  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 12 }}
      data-testid="provider-census-board"
      aria-label={t("providerClinicalSynthesisD4a26a.census.title")}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>
        {t("providerClinicalSynthesisD4a26a.census.title")}
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }} data-testid="census-unsupported-facets">
        {t("providerLegalRecordD4a26b.facetUnsupported")}:{" "}
        {PROVIDER_CENSUS_UNSUPPORTED_FACETS.slice(0, 8).join(", ")}
        {PROVIDER_CENSUS_UNSUPPORTED_FACETS.length > 8 ? "…" : ""}
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
          alignItems: "flex-end",
        }}
      >
        <label style={{ fontSize: 12 }}>
          {t("providerClinicalSynthesisD4a26a.census.filterAttending")}
          <input
            value={attending}
            onChange={(e) => setAttending(e.target.value)}
            style={{ display: "block", marginTop: 2 }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          {t("providerClinicalSynthesisD4a26a.census.filterUnit")}
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{ display: "block", marginTop: 2 }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          {t("providerClinicalSynthesisD4a26a.census.filterQuery")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ display: "block", marginTop: 2 }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          {t("providerClinicalSynthesisD4a26a.census.sort")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProviderCensusSort)}
            style={{ display: "block", marginTop: 2 }}
          >
            <option value="ROOM">{t("providerClinicalSynthesisD4a26a.census.sortRoom")}</option>
            <option value="LOS">{t("providerClinicalSynthesisD4a26a.census.sortLos")}</option>
            <option value="ACUITY">{t("providerClinicalSynthesisD4a26a.census.sortAcuity")}</option>
            <option value="DISCHARGE_PRIORITY">
              {t("providerClinicalSynthesisD4a26a.census.sortDischarge")}
            </option>
            <option value="NAME">{t("providerClinicalSynthesisD4a26a.census.sortName")}</option>
          </select>
        </label>
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={observation}
            onChange={(e) => setObservation(e.target.checked)}
          />
          {t("providerClinicalSynthesisD4a26a.census.observation")}
        </label>
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" checked={medSurg} onChange={(e) => setMedSurg(e.target.checked)} />
          {t("providerClinicalSynthesisD4a26a.census.medSurg")}
        </label>
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={dischargeReady}
            onChange={(e) => setDischargeReady(e.target.checked)}
          />
          {t("providerClinicalSynthesisD4a26a.census.dischargeReady")}
        </label>
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={pendingConsult}
            onChange={(e) => setPendingConsult(e.target.checked)}
          />
          {t("providerClinicalSynthesisD4a26a.census.pendingConsult")}
        </label>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p style={{ fontSize: 13 }}>{t("providerClinicalSynthesisD4a26a.census.empty")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "4px" }}>{t("providerClinicalSynthesisD4a26a.census.sortName")}</th>
              <th style={{ padding: "4px" }}>{t("providerClinicalSynthesisD4a26a.census.sortRoom")}</th>
              <th style={{ padding: "4px" }}>
                {t("providerClinicalSynthesisD4a26a.census.filterAttending")}
              </th>
              <th style={{ padding: "4px" }}>{t("providerClinicalSynthesisD4a26a.census.sortLos")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.encounterId} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "4px" }}>
                  <Link href={inpatientActiveWorkspacePath(r.encounterId)}>{r.patientName}</Link>
                </td>
                <td style={{ padding: "4px" }}>{r.unitRoomBed ?? t("common.dash")}</td>
                <td style={{ padding: "4px" }}>{r.attendingName ?? t("common.dash")}</td>
                <td style={{ padding: "4px" }}>
                  {r.losHours != null ? String(r.losHours) : t("common.dash")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
