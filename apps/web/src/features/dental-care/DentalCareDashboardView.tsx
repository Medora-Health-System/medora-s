"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  D5A3_CERTIFICATION_ID,
  buildDentalServiceLineTag,
  enterpriseDentalEncounterWorkspacePath,
  isDentalEncounterProjection,
  mergeDentalServiceLineIntoNursingAssessment,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  tEncounterStatus,
} from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type WorklistRow = {
  id: string;
  status?: string | null;
  type?: string | null;
  createdAt?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  roomLabel?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
};

/**
 * MEDUI.D5A.3 — Dental worklist + start-encounter projection over enterprise Encounter.
 */
export function DentalCareDashboardView() {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<WorklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [visitReason, setVisitReason] = useState("");
  const [starting, setStarting] = useState(false);

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/dental-care/worklist", { facilityId });
      const items = Array.isArray((data as { items?: unknown })?.items)
        ? ((data as { items: WorklistRow[] }).items)
        : Array.isArray(data)
          ? (data as WorklistRow[])
          : [];
      setRows(items);
    } catch (err) {
      setRows([]);
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("dentalCareD5a3.worklist.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId]);

  const startDentalEncounter = async () => {
    if (!facilityId || !patientId.trim()) return;
    setStarting(true);
    setError(null);
    try {
      const created = (await apiFetch(`/patients/${encodeURIComponent(patientId.trim())}/encounters`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTPATIENT",
          visitReason: visitReason.trim() || undefined,
          roomLabel: "DENTAL",
        }),
      })) as WorklistRow;

      const nursing = mergeDentalServiceLineIntoNursingAssessment(
        created.nursingAssessment,
        buildDentalServiceLineTag()
      );
      await apiFetch(`/encounters/${encodeURIComponent(created.id)}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: nursing }),
      });

      window.location.assign(enterpriseDentalEncounterWorkspacePath(created.id));
    } catch (err) {
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("dentalCareD5a3.worklist.startError")
      );
      setStarting(false);
    }
  };

  return (
    <div data-testid="dental-care-dashboard" data-certification-id={D5A3_CERTIFICATION_ID} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("dentalCareD5a3.worklist.intro")}</p>

      <section style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("dentalCareD5a3.worklist.startTitle")}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder={t("dentalCareD5a3.worklist.patientIdPlaceholder")}
            style={{ flex: "1 1 220px", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
          />
          <input
            value={visitReason}
            onChange={(e) => setVisitReason(e.target.value)}
            placeholder={t("dentalCareD5a3.worklist.reasonPlaceholder")}
            style={{ flex: "2 1 260px", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
          />
          <button
            type="button"
            disabled={starting || !patientId.trim()}
            onClick={() => void startDentalEncounter()}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
              cursor: starting ? "wait" : "pointer",
            }}
          >
            {starting ? t("common.loading") : t("dentalCareD5a3.worklist.startButton")}
          </button>
        </div>
      </section>

      <section style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("dentalCareD5a3.worklist.title")}</h2>
          <button
            type="button"
            onClick={() => void load()}
            style={{
              fontSize: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "4px 10px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {t("dentalCareD5a3.worklist.refresh")}
          </button>
        </div>
        {loading ? <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 13 }}>{t("common.loading")}</p> : null}
        {error ? (
          <p role="alert" style={{ margin: "10px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 13 }}>{t("dentalCareD5a3.worklist.empty")}</p>
        ) : null}
        {rows.length > 0 ? (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colPatient")}</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colTime")}</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colReason")}</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colProvider")}</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colStatus")}</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("dentalCareD5a3.worklist.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dental = isDentalEncounterProjection({
                    type: row.type,
                    nursingAssessment: row.nursingAssessment,
                    admissionSummaryJson: row.admissionSummaryJson,
                  });
                  const name = `${row.patient?.firstName ?? ""} ${row.patient?.lastName ?? ""}`.trim() || t("dentalCareD5a3.notDocumented");
                  const provider = `${row.physicianAssigned?.firstName ?? ""} ${row.physicianAssigned?.lastName ?? ""}`.trim() || t("dentalCareD5a3.notDocumented");
                  return (
                    <tr key={row.id} data-testid="dental-worklist-row" style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: "8px 10px" }}>
                        <strong>{name}</strong>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{row.patient?.mrn ?? ""}</div>
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        {row.createdAt ? formatEncounterChromeDateTime(row.createdAt, language) : "—"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {(row.chiefComplaint ?? row.visitReason ?? "").trim() || t("dentalCareD5a3.notDocumented")}
                      </td>
                      <td style={{ padding: "8px 10px" }}>{provider}</td>
                      <td style={{ padding: "8px 10px" }}>{tEncounterStatus(t, row.status ?? "OPEN")}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {dental ? (
                          <Link
                            href={enterpriseDentalEncounterWorkspacePath(row.id)}
                            style={{ fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                          >
                            {t("dentalCareD5a3.worklist.openWorkspace")}
                          </Link>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
