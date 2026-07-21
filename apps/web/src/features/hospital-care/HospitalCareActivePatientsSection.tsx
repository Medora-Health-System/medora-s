"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { filterHospitalCensusPatients } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  inpatientActiveWorkspacePath,
} from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import {
  observationActiveWorkspacePath,
} from "@/features/observation-workspace/observationWorkspacePaths";
import type { HospitalCensusPatientRow, HospitalCensusResponse } from "./hospitalCareCensusApi";

function workspaceHref(row: HospitalCensusPatientRow): string {
  return row.clinicalContext === "OBSERVATION"
    ? observationActiveWorkspacePath(row.encounterId)
    : inpatientActiveWorkspacePath(row.encounterId);
}

export function HospitalCareActivePatientsSection({
  census,
  defaultContext = "ALL",
}: {
  census: HospitalCensusResponse;
  defaultContext?: "ALL" | "OBSERVATION" | "INPATIENT";
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [context, setContext] = useState<"ALL" | "OBSERVATION" | "INPATIENT">(defaultContext);
  const [operational, setOperational] = useState("");

  const rows = useMemo(
    () =>
      filterHospitalCensusPatients(census.allHospitalPatients, {
        query,
        clinicalContext: context,
        operational,
      }),
    [census.allHospitalPatients, query, context, operational]
  );

  return (
    <section style={{ marginTop: 20 }} data-testid="hospital-care-active-patients">
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("hospitalCareD3e6a.patients.title")}
      </h2>
      <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>
        {t("hospitalCareD3e6a.patients.subtitle")}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          ...MEDORA_CARD_SHELL,
          padding: 10,
        }}
        data-testid="hospital-care-patient-filters"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("hospitalCareD3e6a.filters.search")}
          style={fieldStyle}
        />
        <select
          value={context}
          onChange={(e) => setContext(e.target.value as typeof context)}
          style={fieldStyle}
          aria-label={t("hospitalCareD3e6a.filters.context")}
        >
          <option value="ALL">{t("hospitalCareD3e6a.filters.contextAll")}</option>
          <option value="OBSERVATION">{t("hospitalCareD3e6a.filters.contextObs")}</option>
          <option value="INPATIENT">{t("hospitalCareD3e6a.filters.contextIp")}</option>
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

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="hospital-care-patients-empty">
          {context === "OBSERVATION"
            ? t("hospitalCareD3e6a.empty.observation")
            : context === "INPATIENT"
              ? t("hospitalCareD3e6a.empty.inpatient")
              : t("hospitalCareD3e6a.empty.hospital")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => (
            <article
              key={row.encounterId}
              data-testid={`hospital-care-patient-${row.encounterId}`}
              style={{
                ...MEDORA_CARD_SHELL,
                padding: "10px 12px",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                  {row.patientName}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#0f766e",
                      border: "1px solid #99f6e4",
                      borderRadius: 999,
                      padding: "1px 8px",
                    }}
                  >
                    {row.clinicalContext === "OBSERVATION"
                      ? t("hospitalCareD3e6a.badge.observation")
                      : t("hospitalCareD3e6a.badge.inpatient")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {row.mrn || "—"}
                  {row.ageSex ? ` · ${row.ageSex}` : ""}
                  {row.unitRoomBed ? ` · ${row.unitRoomBed}` : ` · ${t("hospitalCareD3e6a.patients.noBed")}`}
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  {row.chiefComplaint || "—"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                <div>
                  {t("hospitalCareD3e6a.patients.attending")}: {row.attendingName || "—"}
                </div>
                <div>
                  {t("hospitalCareD3e6a.patients.nurse")}: {row.nurseName || "—"}
                </div>
                <div>
                  {t("hospitalCareD3e6a.patients.los")}:{" "}
                  {row.losHours != null ? `${row.losHours} h` : "—"}
                </div>
                {row.alerts.length ? (
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {row.alerts.slice(0, 3).map((a) => (
                      <span
                        key={a.code}
                        title={a.code}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 6,
                          padding: "1px 6px",
                          border:
                            a.severity === "urgent"
                              ? "1px solid #fecaca"
                              : a.severity === "warning"
                                ? "1px solid #fde68a"
                                : "1px solid #e2e8f0",
                          background:
                            a.severity === "urgent"
                              ? "#fef2f2"
                              : a.severity === "warning"
                                ? "#fffbeb"
                                : "#f8fafc",
                          color: "#334155",
                        }}
                      >
                        {a.severity === "urgent" ? "!" : a.severity === "warning" ? "△" : "i"}{" "}
                        {a.code}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Link
                href={workspaceHref(row)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f766e",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t("hospitalCareD3e6a.patients.view")}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const fieldStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 12,
  minWidth: 140,
  background: "#fff",
};
