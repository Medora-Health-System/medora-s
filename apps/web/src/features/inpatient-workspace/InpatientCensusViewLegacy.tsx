"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ALL_HOSPITAL_UNITS_SELECTION_ID,
  AWAITING_UNIT_ASSIGNMENT_SELECTION_ID,
  buildSelectedUnitSummary,
  filterCensusByUnitSelection,
  filterHospitalCensusPatients,
  resolveUnitChartProfile,
  selectionFromUnitDropdownValue,
  unitDropdownValueFromSelection,
  type HospitalUnitSelection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalUnitTree } from "@/features/hospital-care/HospitalUnitTree";
import {
  fetchHospitalCensus,
  type HospitalCensusResponse,
} from "@/features/hospital-care/hospitalCareCensusApi";
import {
  fetchHospitalUnitRegistry,
  type HospitalUnitRegistryResponse,
} from "@/features/hospital-care/hospitalCareUnitsApi";
import { isForbiddenApiError } from "@/features/hospital-care/hospitalCarePlacementApi";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";

/**
 * D3E.6B — Unit-based Inpatient navigation + canonical census.
 * Never blank: defaults to All Hospital Units; loads when placement is OFF.
 */
export function InpatientCensusViewLegacy() {
  const { t } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [census, setCensus] = useState<HospitalCensusResponse | null>(null);
  const [registry, setRegistry] = useState<HospitalUnitRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<HospitalUnitSelection>({ kind: "ALL" });
  const [query, setQuery] = useState("");
  const [operational, setOperational] = useState("");
  const [treeOpenMobile, setTreeOpenMobile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ready || !facilityId?.trim()) {
      setLoading(!ready);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [censusData, unitsData] = await Promise.all([
          fetchHospitalCensus("INPATIENT", { facilityId }),
          fetchHospitalUnitRegistry({ facilityId }),
        ]);
        if (!cancelled) {
          setCensus(censusData);
          setRegistry(unitsData);
          setSelection({ kind: "ALL" });
        }
      } catch (err) {
        if (!cancelled) {
          setCensus(null);
          setRegistry(null);
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
  }, [t, ready, facilityId]);

  const dropdownValue = unitDropdownValueFromSelection(selection);

  const summary = useMemo(() => {
    if (!census || !registry) return null;
    return buildSelectedUnitSummary({
      registry: registry as Parameters<typeof buildSelectedUnitSummary>[0]["registry"],
      selection,
      patients: census.inpatientPatients,
      clinicalContext: "INPATIENT",
    });
  }, [census, registry, selection]);

  const filteredPatients = useMemo(() => {
    if (!census) return [];
    const scoped = filterCensusByUnitSelection(
      census.inpatientPatients,
      selection,
      { clinicalContext: "INPATIENT" }
    );
    return filterHospitalCensusPatients(scoped, {
      query,
      clinicalContext: "INPATIENT",
      operational,
    });
  }, [census, selection, query, operational]);

  const chartProfileHint = useMemo(() => {
    if (!summary?.unit) return null;
    return resolveUnitChartProfile({
      unitType: summary.unit.unitType,
      unitCode: summary.unit.code,
    });
  }, [summary]);

  return (
    <HospitalCareShell
      active="inpatient"
      title={t("inpatientD3e.census.title")}
      subtitle={t("hospitalCareD3e6b.inpatient.subtitle")}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : census && registry ? (
        <>
          {registry.placementAvailability === "FEATURE_DISABLED" ? (
            <p
              style={{
                ...MEDORA_CARD_SHELL,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
                color: "#92400e",
                background: "#fffbeb",
                borderColor: "#fcd34d",
              }}
              data-testid="inpatient-placement-off-banner"
            >
              {t("hospitalCareD3e6b.placementOffBanner")}
            </p>
          ) : null}

          {!registry.configuration.hasConfiguredUnits ? (
            <div
              style={{ ...MEDORA_CARD_SHELL, padding: 16, marginBottom: 12 }}
              data-testid="inpatient-no-units"
            >
              <p style={{ margin: 0, fontSize: 14, color: "#0f172a", fontWeight: 600 }}>
                {t("hospitalCareD3e6b.empty.noUnits")}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                {t("hospitalCareD3e6b.empty.configureUnits")}
              </p>
            </div>
          ) : null}

          <div
            style={{
              ...MEDORA_CARD_SHELL,
              padding: 10,
              marginBottom: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
            data-testid="inpatient-filter-bar"
          >
            <button
              type="button"
              style={fieldStyle}
              className="hospital-unit-tree-mobile-toggle"
              onClick={() => setTreeOpenMobile((v) => !v)}
              data-testid="inpatient-unit-tree-toggle"
            >
              {t("hospitalCareD3e6b.tree.toggle")}
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("hospitalCareD3e6b.filters.search")}
              style={fieldStyle}
              aria-label={t("hospitalCareD3e6b.filters.search")}
            />
            <select
              value={dropdownValue}
              onChange={(e) => setSelection(selectionFromUnitDropdownValue(e.target.value))}
              style={fieldStyle}
              aria-label={t("hospitalCareD3e6b.filters.unit")}
              data-testid="inpatient-unit-dropdown"
            >
              <option value={ALL_HOSPITAL_UNITS_SELECTION_ID}>
                {t("hospitalCareD3e6b.tree.allUnits")}
              </option>
              <option value={AWAITING_UNIT_ASSIGNMENT_SELECTION_ID}>
                {t("hospitalCareD3e6b.tree.awaitingAssignment")}
              </option>
              {registry.units
                .filter((u) => u.acceptsInpatient && u.unitType !== "OBSERVATION")
                .map((u) => (
                  <option key={u.id} value={u.code}>
                    {u.name}
                  </option>
                ))}
            </select>
            <select
              value={operational}
              onChange={(e) => setOperational(e.target.value)}
              style={fieldStyle}
              aria-label={t("hospitalCareD3e6a.filters.operational")}
            >
              <option value="">{t("hospitalCareD3e6a.filters.opAll")}</option>
              <option value="unassigned_nurse">{t("hospitalCareD3e6a.filters.opRn")}</option>
              <option value="unassigned_physician">{t("hospitalCareD3e6a.filters.opMd")}</option>
              <option value="reassessment_overdue">{t("hospitalCareD3e6a.filters.opReassess")}</option>
              <option value="vitals_stale">{t("hospitalCareD3e6a.filters.opVitals")}</option>
              <option value="critical_results">{t("hospitalCareD3e6a.filters.opCritical")}</option>
              <option value="ready_discharge">{t("hospitalCareD3e6a.filters.opReadyDc")}</option>
              <option value="los24">{t("hospitalCareD3e6a.filters.opLos")}</option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 38%) minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
            className="hospital-unit-workspace"
            data-testid="inpatient-unit-workspace"
          >
            <div
              className="hospital-unit-tree-panel"
              data-open={treeOpenMobile ? "true" : "false"}
            >
              <HospitalUnitTree
                units={registry.units}
                awaitingAssignmentCount={registry.awaitingAssignmentCount}
                selection={selection}
                onSelect={(sel) => {
                  setSelection(sel);
                  setTreeOpenMobile(false);
                }}
                inpatientScope
              />
            </div>

            <section style={{ ...MEDORA_CARD_SHELL, padding: 14 }} data-testid="selected-unit-panel">
              {summary ? (
                <>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                    {summary.title}
                  </h2>
                  {summary.unit ? (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                      {summary.unit.unitType.replace(/_/g, " ")} · {summary.unit.levelOfCare}
                    </p>
                  ) : selection.kind === "ALL" ? (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                      {t("hospitalCareD3e6b.summary.allHint")}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <Metric label={t("hospitalCareD3e6b.summary.patients")} value={summary.patientCount} />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.occupied")}
                      value={
                        summary.occupiedBedCount == null
                          ? t("hospitalCareD3e6b.counts.unavailable")
                          : summary.occupiedBedCount
                      }
                    />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.available")}
                      value={
                        summary.availableBedCount == null
                          ? t("hospitalCareD3e6b.counts.unavailable")
                          : summary.availableBedCount
                      }
                    />
                    <Metric label={t("hospitalCareD3e6b.summary.rnUnassigned")} value={summary.rnUnassigned} />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.mdUnassigned")}
                      value={summary.physicianUnassigned}
                    />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.reassess")}
                      value={summary.reassessmentOverdue}
                    />
                    <Metric label={t("hospitalCareD3e6b.summary.vitals")} value={summary.vitalsStale} />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.critical")}
                      value={summary.criticalResults}
                    />
                    <Metric
                      label={t("hospitalCareD3e6b.summary.readyDc")}
                      value={summary.readyDischarge}
                    />
                  </div>

                  {chartProfileHint ? (
                    <p
                      style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b" }}
                      data-testid="unit-chart-profile-hint"
                    >
                      {t("hospitalCareD3e6b.chartProfile.hint").replace(
                        "{profile}",
                        chartProfileHint.workspaceProfile
                      )}
                    </p>
                  ) : null}

                  <h3
                    style={{
                      margin: "18px 0 8px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {t("hospitalCareD3e6b.patients.title")}
                  </h3>

                  {filteredPatients.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#64748b" }} data-testid="inpatient-patients-empty">
                      {t("hospitalCareD3e6a.empty.inpatient")}
                    </p>
                  ) : (
                    <ul
                      style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}
                      data-testid="inpatient-unit-patient-list"
                    >
                      {filteredPatients.map((row) => (
                        <li
                          key={row.encounterId}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: "8px 10px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                              {row.patientName}
                              {row.ageSex ? ` · ${row.ageSex}` : ""}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {row.mrn ?? "—"}
                              {" · "}
                              {row.unitRoomBed || t("hospitalCareD3e6a.patients.noBed")}
                              {" · "}
                              {t("hospitalCareD3e6a.patients.attending")}: {row.attendingName || "—"}
                            </div>
                            {row.alerts.length > 0 ? (
                              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {row.alerts.map((a) => (
                                  <span
                                    key={a.code}
                                    style={{
                                      fontSize: 10,
                                      borderRadius: 9999,
                                      padding: "2px 6px",
                                      border: "1px solid #cbd5e1",
                                      background:
                                        a.severity === "urgent"
                                          ? "#fef2f2"
                                          : a.severity === "warning"
                                            ? "#fffbeb"
                                            : "#f8fafc",
                                    }}
                                  >
                                    {a.severity === "urgent"
                                      ? "!"
                                      : a.severity === "warning"
                                        ? "△"
                                        : "i"}{" "}
                                    {a.code}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <Link
                            href={inpatientActiveWorkspacePath(row.encounterId)}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#2563eb",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("hospitalCareD3e6b.patients.viewChart")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  {t("hospitalCareD3e6b.summary.selectUnit")}
                </p>
              )}
            </section>
          </div>

          <div
            style={{
              ...MEDORA_CARD_SHELL,
              marginTop: 16,
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
              {t("hospitalCareD3e6b.bedManagement.hint")}
            </p>
            <Link
              href="/app/hospitalisation/floor-board"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#2563eb",
              }}
              data-testid="inpatient-open-bed-management"
            >
              {t("hospitalCareD3e6b.bedManagement.open")}
            </Link>
          </div>

          <style>{`
            .hospital-unit-tree-mobile-toggle { display: none; }
            @media (max-width: 900px) {
              .hospital-unit-workspace {
                grid-template-columns: 1fr !important;
              }
              .hospital-unit-tree-mobile-toggle { display: inline-block; }
              .hospital-unit-tree-panel { display: none; }
              .hospital-unit-tree-panel[data-open="true"] { display: block; margin-bottom: 12px; }
            }
          `}</style>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("hospitalCareD3e6b.summary.selectUnit")}</p>
      )}
    </HospitalCareShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "8px 10px",
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 13,
  minWidth: 140,
};
