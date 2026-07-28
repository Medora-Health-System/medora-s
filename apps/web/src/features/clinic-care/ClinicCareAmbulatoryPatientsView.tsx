/**
 * MEDUI.D4C.5 — Ambulatory patients list inside Clinic Care shell.
 * Direct content (no Open card); enterprise patient search — longitudinal chart on open.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clinicCareAmbulatoryPatientChartPath } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

type PatientRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  dateOfBirth?: string | null;
};

const compactBtn: React.CSSProperties = {
  display: "inline-flex",
  height: 26,
  alignItems: "center",
  padding: "0 10px",
  borderRadius: 6,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "none",
};

export function ClinicCareAmbulatoryPatientsView() {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const search = useCallback(
    async (q: string) => {
      if (!facilityId) return;
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setRows([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: trimmed });
        const data = await apiFetch(`/patients/search?${params.toString()}`, { facilityId });
        const list = Array.isArray(data)
          ? (data as PatientRow[])
          : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
            ? (data as { items: PatientRow[] }).items
            : [];
        setRows(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("clinicCareD4c2.errors.loadFailed"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [facilityId, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    const handle = window.setTimeout(() => {
      void search(query);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [ready, facilityId, query, search]);

  if (!ready) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>;
  }

  return (
    <div data-testid="clinic-care-ambulatory-patients">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("clinicCareD4c5.patientsTitle")}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c5.patientsSubtitle")}
          </p>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("clinicCareD4c5.patientsSearchPlaceholder")}
        aria-label={t("clinicCareD4c5.patientsSearchPlaceholder")}
        data-testid="clinic-care-patients-search"
        style={{
          width: "100%",
          maxWidth: 420,
          height: 30,
          marginBottom: 10,
          padding: "0 10px",
          borderRadius: 6,
          border: `1px solid ${CLINIC_CARE_SHELL.border}`,
          fontSize: 12,
          boxSizing: "border-box",
        }}
      />

      {error ? (
        <p role="alert" style={{ color: "#991b1b", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      <section style={{ ...MEDORA_CARD_SHELL, padding: 0, overflow: "auto" }}>
        {loading ? (
          <p style={{ padding: 12, margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
        ) : query.trim().length < 2 ? (
          <p style={{ padding: 12, margin: 0, color: "#64748b" }} data-testid="clinic-care-patients-hint">
            {t("clinicCareD4c5.patientsSearchHint")}
          </p>
        ) : rows.length === 0 ? (
          <p style={{ padding: 12, margin: 0, color: "#64748b" }} data-testid="clinic-care-patients-empty">
            {t("clinicCareD4c5.patientsEmpty")}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={th}>{t("clinicCareD4c2.columns.patient")}</th>
                <th style={th}>MRN</th>
                <th style={th}>{t("clinicCareD4c5.dateOfBirth")}</th>
                <th style={th}>{t("clinicCareD4c2.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || t("common.dash");
                const href = clinicCareAmbulatoryPatientChartPath(row.id);
                let dob = t("common.dash");
                if (row.dateOfBirth) {
                  try {
                    dob = new Date(row.dateOfBirth).toLocaleDateString(locale);
                  } catch {
                    dob = t("common.dash");
                  }
                }
                return (
                  <tr
                    key={row.id}
                    data-testid={`clinic-care-patient-row-${row.id}`}
                    style={{ borderTop: `1px solid ${CLINIC_CARE_SHELL.border}` }}
                  >
                    <td style={td}>
                      <Link href={href} style={{ fontWeight: 650, color: "#0f766e" }}>
                        {name}
                      </Link>
                    </td>
                    <td style={td}>{row.mrn || t("common.dash")}</td>
                    <td style={td}>{dob}</td>
                    <td style={td}>
                      <Link href={href} style={compactBtn}>
                        {t("clinicCareD4c5.openPatientChart")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#64748b",
  background: "#f8fafc",
};

const td: React.CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
};
