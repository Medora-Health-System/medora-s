"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  filterMyIncompleteChartsEncountersEnterprise,
  filterMyPatientsEncountersEnterprise,
  filterProviderCensusRows,
  filterUnassignedHospitalEncountersEnterprise,
  sortProviderCensusRows,
  type ProviderCensusSort,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchHospitalCensus,
  type HospitalCensusPatientRow,
} from "@/features/hospital-care/hospitalCareCensusApi";
import {
  assignHospitalRoleToMe,
  unassignHospitalRole,
} from "@/features/hospital-care/hospitalAssignmentApi";
import {
  HOSPITAL_BOARD_VIEW_TABS,
  isHospitalCareTechAssigner,
  resolveHospitalUnassignedBoardRole,
  type HospitalBoardViewTab,
} from "@/features/hospitalization/hospitalMyPatientsFilter";
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";

/**
 * D4A.2.6A / D4A.3.0 — My Patients hospital census with enterprise assignment filters.
 */
export function ProviderCensusBoard() {
  const { t } = useI18n();
  const { facilityId, ready, userId, roles } = useFacilityAndRoles();
  const [rows, setRows] = useState<HospitalCensusPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<HospitalBoardViewTab>("myPatients");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProviderCensusSort>("ROOM");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const reload = async () => {
    if (!facilityId?.trim()) return;
    const census = await fetchHospitalCensus("ALL_HOSPITAL_CARE", { facilityId });
    setRows(census.allHospitalPatients ?? []);
  };

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
        await reload();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload closes over facilityId
  }, [t, ready, facilityId]);

  const filterCtx = useMemo(
    () => ({
      currentUserId: userId ?? "",
      roles: (roles ?? []) as string[],
    }),
    [userId, roles]
  );

  const isProvider = (roles ?? []).includes("PROVIDER") || (roles ?? []).includes("ADMIN");
  const isNurse = (roles ?? []).includes("RN") || (roles ?? []).includes("ADMIN");
  const isTech = isHospitalCareTechAssigner(roles ?? []);

  const tabRows = useMemo(() => {
    if (tab === "allPatients") return rows;
    if (tab === "myPatients") return filterMyPatientsEncountersEnterprise(rows, filterCtx);
    if (tab === "unassignedPatients") {
      return filterUnassignedHospitalEncountersEnterprise(
        rows,
        resolveHospitalUnassignedBoardRole(roles ?? [])
      );
    }
    if (tab === "incompleteCharts") {
      return filterMyIncompleteChartsEncountersEnterprise(rows, filterCtx);
    }
    return rows;
  }, [rows, tab, filterCtx, roles]);

  const visible = useMemo(() => {
    const filtered = filterProviderCensusRows(tabRows, {
      query: query.trim() || null,
    });
    return sortProviderCensusRows(filtered, sort);
  }, [tabRows, query, sort]);

  const claim = async (
    encounterId: string,
    role: "PROVIDER" | "NURSE" | "TECHNICIAN",
    action: "ASSIGN_ME" | "UNASSIGN"
  ) => {
    if (!facilityId) return;
    setAssigningId(encounterId);
    setError(null);
    try {
      if (action === "ASSIGN_ME") {
        await assignHospitalRoleToMe(facilityId, encounterId, role);
      } else {
        await unassignHospitalRole(facilityId, encounterId, role);
      }
      await reload();
    } catch {
      setError(t("enterpriseHospitalAssignmentD4a30.assignError"));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 12 }}
      data-testid="provider-census-board"
      aria-label={t("enterpriseHospitalAssignmentD4a30.myPatients")}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>
        {t("enterpriseHospitalAssignmentD4a30.myPatients")}
      </h2>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
        role="tablist"
        aria-label={t("enterpriseHospitalAssignmentD4a30.tabsLabel")}
      >
        {HOSPITAL_BOARD_VIEW_TABS.map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={tab === view}
            onClick={() => setTab(view)}
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              border: tab === view ? "1px solid #2563eb" : "1px solid #cbd5e1",
              background: tab === view ? "#eff6ff" : "#fff",
              color: tab === view ? "#1e40af" : "#334155",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(`enterpriseHospitalAssignmentD4a30.tabs.${view}`)}
          </button>
        ))}
      </div>

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
            <option value="NAME">{t("providerClinicalSynthesisD4a26a.census.sortName")}</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p style={{ fontSize: 13 }}>{t("enterpriseHospitalAssignmentD4a30.emptyTab")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "4px" }}>{t("providerClinicalSynthesisD4a26a.census.sortName")}</th>
              <th style={{ padding: "4px" }}>{t("providerClinicalSynthesisD4a26a.census.sortRoom")}</th>
              <th style={{ padding: "4px" }}>{t("enterpriseHospitalAssignmentD4a30.provider")}</th>
              <th style={{ padding: "4px" }}>{t("enterpriseHospitalAssignmentD4a30.nurse")}</th>
              <th style={{ padding: "4px" }}>{t("enterpriseHospitalAssignmentD4a30.technician")}</th>
              <th style={{ padding: "4px" }}>{t("enterpriseHospitalAssignmentD4a30.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const mineProvider = Boolean(userId && r.providerUserId === userId);
              const mineNurse = Boolean(userId && r.nurseUserId === userId);
              const mineTech = Boolean(userId && r.technicianUserId === userId);
              return (
                <tr key={r.encounterId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px" }}>
                    <Link href={inpatientActiveWorkspacePath(r.encounterId)}>{r.patientName}</Link>
                  </td>
                  <td style={{ padding: "4px" }}>{r.unitRoomBed ?? t("common.dash")}</td>
                  <td style={{ padding: "4px" }}>
                    {r.attendingName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
                  </td>
                  <td style={{ padding: "4px" }}>
                    {r.nurseName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
                  </td>
                  <td style={{ padding: "4px" }}>
                    {r.technicianName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
                  </td>
                  <td style={{ padding: "4px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {isProvider ? (
                        <button
                          type="button"
                          disabled={assigningId === r.encounterId}
                          onClick={() =>
                            void claim(
                              r.encounterId,
                              "PROVIDER",
                              mineProvider ? "UNASSIGN" : "ASSIGN_ME"
                            )
                          }
                          style={actionBtnStyle}
                        >
                          {mineProvider
                            ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                            : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                        </button>
                      ) : null}
                      {isNurse ? (
                        <button
                          type="button"
                          disabled={assigningId === r.encounterId}
                          onClick={() =>
                            void claim(r.encounterId, "NURSE", mineNurse ? "UNASSIGN" : "ASSIGN_ME")
                          }
                          style={actionBtnStyle}
                        >
                          {mineNurse
                            ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                            : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                        </button>
                      ) : null}
                      {isTech ? (
                        <button
                          type="button"
                          disabled={assigningId === r.encounterId}
                          onClick={() =>
                            void claim(
                              r.encounterId,
                              "TECHNICIAN",
                              mineTech ? "UNASSIGN" : "ASSIGN_ME"
                            )
                          }
                          style={actionBtnStyle}
                        >
                          {mineTech
                            ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                            : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

const actionBtnStyle: CSSProperties = {
  padding: "2px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
