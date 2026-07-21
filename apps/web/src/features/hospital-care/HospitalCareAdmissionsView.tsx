"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  fetchFacilityPlacementQueue,
  isForbiddenApiError,
  PLACEMENT_QUEUE_STATUS_SET,
  type HospitalCarePlacementQueueRow,
  type PlacementQueueAvailability,
} from "./hospitalCarePlacementApi";

export function HospitalCareAdmissionsView() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [availability, setAvailability] = useState<PlacementQueueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const admissions = useMemo(
    () => rows.filter((r) => PLACEMENT_QUEUE_STATUS_SET.has(r.status)),
    [rows]
  );

  const dash = t("common.dash") || DISPLAY_DASH;

  return (
    <HospitalCareShell
      active="admissions"
      title={t("hospitalCareD3ca.admissions.title")}
      subtitle={t("hospitalCareD3ca.admissions.subtitle")}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : availability === "FEATURE_DISABLED" ? (
        <p
          style={{ fontSize: 13, color: "#64748b" }}
          data-testid="hospital-care-admissions-feature-off"
        >
          {t("hospitalCareD3ca.featureUnavailable")}
        </p>
      ) : admissions.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="hospital-care-admissions-empty">
          {t("hospitalCareD3ca.admissions.empty")}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colPatient")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colType")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colPriority")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colService")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colLevel")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colStatus")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colRequested")}</th>
                <th style={{ padding: "8px 6px" }}>{t("hospitalCareD3ca.admissions.colProvider")}</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((row) => {
                const name =
                  `${row.patient.firstName ?? ""} ${row.patient.lastName ?? ""}`.trim() || dash;
                const statusLabel = row.trackboardLabel
                  ? t(
                      `internalPlacementD3c.status.${row.trackboardLabel}` as Parameters<
                        typeof t
                      >[0]
                    )
                  : row.status;
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 6px", fontWeight: 600, color: "#0f172a" }}>
                      {name}
                      <div style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>
                        {row.patient.mrn || dash}
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px" }}>{row.requestedEncounterType}</td>
                    <td style={{ padding: "10px 6px" }}>{row.clinicalPriority || dash}</td>
                    <td style={{ padding: "10px 6px" }}>{row.requestedService || dash}</td>
                    <td style={{ padding: "10px 6px" }}>{row.requestedLevelOfCare || dash}</td>
                    <td style={{ padding: "10px 6px" }}>{statusLabel}</td>
                    <td style={{ padding: "10px 6px" }}>
                      {row.requestedAt
                        ? new Date(row.requestedAt).toLocaleString()
                        : dash}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {row.acceptingProviderNameSnapshot || dash}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </HospitalCareShell>
  );
}
