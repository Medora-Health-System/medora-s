"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { apiFetch } from "@/lib/apiClient";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import { HospitalCareShell } from "./HospitalCareShell";
import { HospitalCareIncomingPlacementSection } from "./HospitalCareIncomingPlacementSection";
import { hospitalAdmissionReviewPath } from "./hospitalCarePaths";
import {
  fetchFacilityPlacementQueue,
  isForbiddenApiError,
  isHospitalBoardAdmissionsReceivingRow,
  type HospitalCarePlacementQueueRow,
  type PlacementQueueAvailability,
} from "./hospitalCarePlacementApi";
import { createDirectInpatientAdmission } from "./inpatientOperationsApi";
import { HOSPITAL_CARE_ADMISSION_COMMAND_CENTER, HOSPITAL_CARE_ENTERPRISE_COMMAND } from "./hospitalCarePaths";

type PatientHit = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
};

export function HospitalCareAdmissionsView() {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [availability, setAvailability] = useState<PlacementQueueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState<"DIRECT" | "SCHEDULED" | "EXTERNAL_TRANSFER" | null>(
    null
  );
  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [reason, setReason] = useState("");
  const [service, setService] = useState("");
  const [unit, setUnit] = useState("");
  const [level, setLevel] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacilityPlacementQueue();
      setRows(data.items);
      setAvailability(data.availability);
    } catch (err) {
      setRows([]);
      setAvailability(null);
      setError(
        isForbiddenApiError(err)
          ? t("hospitalCareD3ca.accessDenied")
          : t("hospitalCareD3ca.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!formOpen || patientQuery.trim().length < 2) {
      setPatientHits([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await apiFetch(
            `/patients/search?q=${encodeURIComponent(patientQuery.trim())}&limit=8`
          );
          const items = Array.isArray(data)
            ? data
            : Array.isArray((data as { items?: unknown })?.items)
              ? ((data as { items: PatientHit[] }).items)
              : [];
          if (!cancelled) setPatientHits(items as PatientHit[]);
        } catch {
          if (!cancelled) setPatientHits([]);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [formOpen, patientQuery]);

  const admissions = useMemo(
    () => rows.filter((r) => isHospitalBoardAdmissionsReceivingRow(r)),
    [rows]
  );

  const dash = t("common.dash") || DISPLAY_DASH;

  const directAdmissionFlagOn =
    String(process.env.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true" ||
    String(process.env.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED ?? "")
      .trim()
      .toLowerCase() === "1";

  const submitDirect = async () => {
    if (!selectedPatient || !formOpen) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createDirectInpatientAdmission({
        patientId: selectedPatient.id,
        admissionSource: formOpen,
        admissionDiagnosis: diagnosis.trim() || null,
        reasonForAdmission: reason.trim() || null,
        admittingService: service.trim() || null,
        requestedUnit: unit.trim() || null,
        requestedLevelOfCare: level.trim() || null,
        plannedAt: formOpen === "SCHEDULED" ? plannedAt || null : null,
        // Durable correlation key — server also stamps a UUID; never reuse by patient alone.
        idempotencyKey: `adm-${formOpen}-${selectedPatient.id}-${Date.now()}`,
      });
      if (result.createdEdEncounter || result.createdObservationEncounter) {
        setFormError(t("hospitalCareD3e7.admissions.fakePathwayError"));
        return;
      }
      const encounterId = result.encounter?.id;
      if (encounterId) {
        router.push(inpatientActiveWorkspacePath(encounterId));
        return;
      }
      setFormError(t("hospitalCareD3e7.admissions.submitError"));
    } catch {
      setFormError(t("hospitalCareD3e7.admissions.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HospitalCareShell
      active="admissions"
      title={t("hospitalCareD3ca.admissions.title")}
      subtitle={t("hospitalCareD3ca.admissions.subtitle")}
      actions={
        <>
          <Link
            href={HOSPITAL_CARE_ENTERPRISE_COMMAND}
            data-testid="open-enterprise-command"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0f766e",
              textDecoration: "none",
              border: "1px solid #99f6e4",
              background: "#f0fdfa",
              borderRadius: 10,
              padding: "8px 12px",
              marginRight: 8,
            }}
          >
            {t("enterpriseCommandD4a27.openLink")}
          </Link>
          <Link
            href={HOSPITAL_CARE_ADMISSION_COMMAND_CENTER}
            data-testid="open-admission-command-center"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0f766e",
              textDecoration: "none",
              border: "1px solid #99f6e4",
              background: "#f0fdfa",
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            {t("admissionCommandCenter.title")}
          </Link>
        </>
      }
    >
      <section
        style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
        data-testid="hospital-care-direct-admission-entry"
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {t("hospitalCareD3e6.admissions.directEntryTitle")}
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("hospitalCareD3e6.admissions.directEntryBody")}
        </p>
        <div style={{ marginTop: 10 }}>
          <Link
            href="/app/hospitalisation/admissions/new"
            data-testid="start-hospital-admission"
            style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #2563eb",
              background: "#eff6ff",
              color: "#1e40af",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {t("hospitalCareD3e6d.admission.startAction")}
          </Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {(
            [
              ["directInpatient", "DIRECT"],
              ["scheduledInpatient", "SCHEDULED"],
              ["transferIn", "EXTERNAL_TRANSFER"],
            ] as const
          ).map(([key, source]) => (
            <button
              key={key}
              type="button"
              disabled={!directAdmissionFlagOn}
              data-testid={`hospital-care-admission-${key}`}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: directAdmissionFlagOn ? "#fff" : "#f1f5f9",
                color: directAdmissionFlagOn ? "#0f172a" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: directAdmissionFlagOn ? "pointer" : "not-allowed",
              }}
              onClick={() => {
                if (!directAdmissionFlagOn) return;
                setFormOpen(source);
                setFormError(null);
              }}
            >
              {t(`hospitalCareD3e6.admissions.${key}`)}
            </button>
          ))}
        </div>
        {!directAdmissionFlagOn ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>
            {t("hospitalCareD3e6.admissions.writersOff")}
          </p>
        ) : null}

        {formOpen && directAdmissionFlagOn ? (
          <div
            style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}
            data-testid="hospital-care-direct-admission-form"
          >
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600 }}>
              {t("hospitalCareD3e7.admissions.formTitle")} ({formOpen})
            </p>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.patientSearch")}
              <input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                style={fieldStyle}
              />
            </label>
            {patientHits.length > 0 ? (
              <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0 }}>
                {patientHits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientQuery(`${p.lastName ?? ""} ${p.firstName ?? ""}`.trim());
                        setPatientHits([]);
                      }}
                      style={{
                        ...fieldStyle,
                        textAlign: "left",
                        cursor: "pointer",
                        background: selectedPatient?.id === p.id ? "#ecfeff" : "#fff",
                      }}
                    >
                      {`${p.lastName ?? ""} ${p.firstName ?? ""}`.trim()} — {p.mrn ?? dash}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.diagnosis")}
              <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.reason")}
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.service")}
              <input value={service} onChange={(e) => setService(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.unit")}
              <input value={unit} onChange={(e) => setUnit(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
              {t("hospitalCareD3e7.admissions.level")}
              <input value={level} onChange={(e) => setLevel(e.target.value)} style={fieldStyle} />
            </label>
            {formOpen === "SCHEDULED" ? (
              <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                {t("hospitalCareD3e7.admissions.plannedAt")}
                <input
                  type="datetime-local"
                  value={plannedAt}
                  onChange={(e) => setPlannedAt(e.target.value)}
                  style={fieldStyle}
                />
              </label>
            ) : null}
            {formError ? (
              <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
                {formError}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={submitting || !selectedPatient}
                data-testid="hospital-care-direct-admission-submit"
                onClick={() => void submitDirect()}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #0f766e",
                  background: "#0f766e",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: submitting || !selectedPatient ? "not-allowed" : "pointer",
                }}
              >
                {t("hospitalCareD3e7.admissions.submit")}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : null}
      </section>

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
          <HospitalCareIncomingPlacementSection
            surface="ADMISSIONS"
            rows={admissions}
            onReload={reload}
          />
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
                      <Link
                        href={hospitalAdmissionReviewPath(row.originatingEncounterId)}
                        data-testid={`ed-hosp-1g-admissions-review-${row.id}`}
                        style={{ color: "#0f172a", textDecoration: "none" }}
                      >
                        {name}
                      </Link>
                      <div style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>
                        {row.patient.mrn || dash}
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {row.requestedEncounterType === "OBSERVATION"
                        ? t("hospitalCareD3ca.destination.observation")
                        : row.requestedEncounterType === "INPATIENT"
                          ? t("hospitalCareD3ca.destination.inpatientAdmission")
                          : dash}
                    </td>
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

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 420,
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};
