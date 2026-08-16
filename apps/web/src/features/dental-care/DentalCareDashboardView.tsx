"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  D5A3_CERTIFICATION_ID,
  enterpriseDentalEncounterWorkspacePath,
  formatPatientLegalName,
  isDentalEncounterProjection,
  type PatientSearchHitV1,
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
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";

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
 * MEDUI.D5A.3B — Dental worklist + enterprise Patient discovery + safe encounter launch.
 * Typed search text is NEVER Patient.id. Reuses PatientSearchAndSelect → GET /patients/search.
 */
export function DentalCareDashboardView() {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [rows, setRows] = useState<WorklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchHitV1 | null>(null);
  const [visitReason, setVisitReason] = useState("");
  const [starting, setStarting] = useState(false);
  const [duplicateExistingId, setDuplicateExistingId] = useState<string | null>(null);

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    setDuplicateExistingId(null);
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

  const canStart =
    Boolean(facilityId) &&
    Boolean(selectedPatient?.id?.trim()) &&
    !starting;

  const startDentalEncounter = async () => {
    const patientId = selectedPatient?.id?.trim();
    if (!facilityId || !patientId) {
      setError(t("dentalCareD5a3.worklist.selectPatientRequired"));
      return;
    }
    setStarting(true);
    setError(null);
    setDuplicateExistingId(null);
    try {
      // MEDUI.D4C.10D — claim unclaimed Clinic wait, reuse Dental, or create new Dental visit.
      const result = (await apiFetch(
        `/dental-care/patients/${encodeURIComponent(patientId)}/claim-or-start`,
        {
          method: "POST",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitReason: visitReason.trim() || undefined,
          }),
        }
      )) as { encounter?: WorklistRow; routingAction?: string };

      const encounterId = result?.encounter?.id?.trim();
      if (!encounterId) {
        throw new Error("Missing encounter id");
      }

      window.location.assign(enterpriseDentalEncounterWorkspacePath(encounterId));
    } catch (err) {
      const body =
        err && typeof err === "object" && "body" in err
          ? ((err as { body?: unknown }).body as Record<string, unknown> | undefined)
          : undefined;
      const payload =
        body && typeof body.message === "object" && body.message
          ? (body.message as Record<string, unknown>)
          : body;
      const code = String(payload?.code ?? (err as { errorCode?: string })?.errorCode ?? "");
      const existingId = String(payload?.existingEncounterId ?? "").trim();
      if (
        existingId &&
        (code === "DUPLICATE_ACTIVE_SERVICE_ENCOUNTER" ||
          code === "OPEN_ENCOUNTER_EXISTS" ||
          /dental|compatible care context|active encounter/i.test(String(payload?.message ?? "")))
      ) {
        setDuplicateExistingId(existingId);
        setError(t("dentalCareD5a3.worklist.duplicateActive"));
      } else {
        setError(
          normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
            t("dentalCareD5a3.worklist.startError")
        );
      }
      setStarting(false);
    }
  };

  return (
    <div
      data-testid="dental-care-dashboard"
      data-certification-id="MEDUI.D5A.3B"
      data-d5a3-certification-id={D5A3_CERTIFICATION_ID}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("dentalCareD5a3.worklist.intro")}</p>

      <section style={{ ...MEDORA_CARD_SHELL, padding: 14 }} data-testid="dental-start-encounter">
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("dentalCareD5a3.worklist.startTitle")}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("dentalCareD5a3.worklist.searchHelp")}
        </p>
        <div style={{ marginTop: 10 }}>
          <PatientSearchAndSelect
            facilityId={facilityId}
            autoSearch
            debounceMs={300}
            limit={12}
            selectedPatientId={selectedPatient?.id ?? null}
            onSelect={(p) => {
              setSelectedPatient(p);
              setError(null);
            }}
            onClearSelection={() => setSelectedPatient(null)}
            clearSelectionOnQueryChange
            label={t("dentalCareD5a3.worklist.patientSearchLabel")}
            placeholder={t("dentalCareD5a3.worklist.patientSearchPlaceholder")}
            testIdPrefix="dental-patient-search"
          />
        </div>
        {selectedPatient ? (
          <p
            data-testid="dental-selected-patient"
            data-patient-id={selectedPatient.id}
            style={{ margin: "8px 0 0", fontSize: 12, color: "#0f172a" }}
          >
            {t("dentalCareD5a3.worklist.selectedPatient")}:{" "}
            <strong>{formatPatientLegalName(selectedPatient)}</strong>
            {selectedPatient.mrn ? ` · ${t("dentalCareD5a3.worklist.mrn")}: ${selectedPatient.mrn}` : ""}
          </p>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <input
            value={visitReason}
            onChange={(e) => setVisitReason(e.target.value)}
            placeholder={t("dentalCareD5a3.worklist.reasonPlaceholder")}
            style={{ flex: "2 1 260px", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
            data-testid="dental-visit-reason"
          />
          <button
            type="button"
            disabled={!canStart}
            onClick={() => void startDentalEncounter()}
            data-testid="dental-start-encounter-button"
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: canStart ? "#0f172a" : "#94a3b8",
              color: "#fff",
              fontWeight: 600,
              cursor: canStart ? (starting ? "wait" : "pointer") : "not-allowed",
            }}
          >
            {starting ? t("common.loading") : t("dentalCareD5a3.worklist.startButton")}
          </button>
        </div>
        {duplicateExistingId ? (
          <p
            data-testid="dental-duplicate-active"
            style={{ margin: "10px 0 0", fontSize: 13, color: "#0f172a" }}
          >
            <Link
              href={enterpriseDentalEncounterWorkspacePath(duplicateExistingId)}
              style={{ fontWeight: 600, color: "#1d4ed8" }}
            >
              {t("dentalCareD5a3.worklist.openExisting")}
            </Link>
          </p>
        ) : null}
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
                  const name =
                    `${row.patient?.firstName ?? ""} ${row.patient?.lastName ?? ""}`.trim() ||
                    t("dentalCareD5a3.notDocumented");
                  const provider =
                    `${row.physicianAssigned?.firstName ?? ""} ${row.physicianAssigned?.lastName ?? ""}`.trim() ||
                    t("dentalCareD5a3.notDocumented");
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
                        {(row.chiefComplaint ?? row.visitReason ?? "").trim() ||
                          t("dentalCareD5a3.notDocumented")}
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
