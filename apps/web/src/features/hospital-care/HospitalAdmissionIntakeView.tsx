"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import { HospitalCareShell } from "./HospitalCareShell";
import { createDirectInpatientAdmission } from "./inpatientOperationsApi";
import { fetchHospitalUnitRegistry } from "./hospitalCareUnitsApi";

type PatientHit = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
};

type OpenEncounterHit = {
  id: string;
  type?: string | null;
  status?: string | null;
};

/**
 * D3E.6D — Hospital admission intake: search patient → unit/bed → Start Inpatient Encounter.
 * Open ED is advisory only; does not block or mutate ED chart.
 */
export function HospitalAdmissionIntakeView() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetUnit = searchParams?.get("unit") ?? "";
  const resumeMode = searchParams?.get("resume") === "1";
  const resumeSourceEncounterId = searchParams?.get("sourceEncounterId") ?? "";
  const formId = useId();
  const [resumeCorrelationId, setResumeCorrelationId] = useState<string | null>(null);
  const [resumePlacementId, setResumePlacementId] = useState<string | null>(null);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const [openEncounters, setOpenEncounters] = useState<OpenEncounterHit[]>([]);
  const [units, setUnits] = useState<Array<{ code: string; name: string }>>([]);
  const [unit, setUnit] = useState(presetUnit);
  const [bedKey, setBedKey] = useState("");
  const [admittedAt, setAdmittedAt] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [source, setSource] = useState("EMERGENCY_DEPARTMENT");
  const [diagnosis, setDiagnosis] = useState("");
  const [reason, setReason] = useState("");
  const [service, setService] = useState("");
  const [level, setLevel] = useState("");
  const [confirmEd, setConfirmEd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idempotencyKey = useState(() => `adm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)[0];

  useEffect(() => {
    void (async () => {
      try {
        const reg = await fetchHospitalUnitRegistry();
        setUnits(
          reg.units
            .filter((u) => u.acceptsInpatient)
            .map((u) => ({ code: u.code, name: u.name }))
        );
      } catch {
        setUnits([
          { code: "MS", name: "Medical/Surgical" },
          { code: "ICU", name: "Intensive Care Unit" },
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!resumeMode || !resumeSourceEncounterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(
          `/admission-correlation/encounters/${encodeURIComponent(resumeSourceEncounterId)}/journey`
        );
        if (cancelled) return;
        const journey = (data as {
          journey?: {
            admissionCorrelationId?: string | null;
            placementRequestId?: string | null;
          } | null;
        })?.journey;
        setResumeCorrelationId(journey?.admissionCorrelationId?.trim() || null);
        setResumePlacementId(journey?.placementRequestId?.trim() || null);
      } catch {
        if (!cancelled) {
          setResumeCorrelationId(null);
          setResumePlacementId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeMode, resumeSourceEncounterId]);

  useEffect(() => {
    if (patientQuery.trim().length < 2) {
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
              ? (data as { items: PatientHit[] }).items
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
  }, [patientQuery]);

  useEffect(() => {
    if (!selectedPatient) {
      setOpenEncounters([]);
      setConfirmEd(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(
          `/patients/${encodeURIComponent(selectedPatient.id)}/encounters?status=OPEN&limit=10`
        );
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown })?.items)
            ? (data as { items: OpenEncounterHit[] }).items
            : [];
        if (!cancelled) setOpenEncounters(items as OpenEncounterHit[]);
      } catch {
        if (!cancelled) setOpenEncounters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatient]);

  const openEd = openEncounters.find((e) => String(e.type ?? "").toUpperCase() === "EMERGENCY");
  const dash = t("common.dash") || DISPLAY_DASH;

  const submit = async () => {
    if (!selectedPatient) return;
    if (openEd && !confirmEd) {
      setFormError(t("hospitalCareD3e6d.admission.confirmEdRequired"));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const admittedIso = admittedAt ? new Date(admittedAt).toISOString() : new Date().toISOString();
      const result = await createDirectInpatientAdmission({
        patientId: selectedPatient.id,
        admissionSource: source as "EMERGENCY_DEPARTMENT",
        admissionDiagnosis: diagnosis.trim() || null,
        reasonForAdmission: reason.trim() || null,
        admittingService: service.trim() || null,
        requestedUnit: unit.trim() || null,
        requestedLevelOfCare: level.trim() || null,
        assignedBedKey: bedKey.trim() || null,
        sourceEdEncounterId: openEd?.id ?? resumeSourceEncounterId ?? null,
        admittedAt: admittedIso,
        idempotencyKey,
        admissionCorrelationId: resumeCorrelationId,
        internalPlacementRequestId: resumePlacementId,
      });
      if (result.createdEdEncounter || result.createdObservationEncounter) {
        setFormError(t("hospitalCareD3e7.admissions.fakePathwayError"));
        return;
      }
      if (result.edEncounterClosed || result.edEncounterMutated) {
        setFormError(t("hospitalCareD3e6d.admission.edMutatedError"));
        return;
      }
      const encounterId = result.encounter?.id;
      if (encounterId) {
        // Receiving workflow opens Admission section first on the shared enterprise chart.
        router.push(
          `${inpatientActiveWorkspacePath(encounterId)}?section=admission`
        );
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
      title={t("hospitalCareD3e6d.admission.title")}
      subtitle={t("hospitalCareD3e6d.admission.subtitle")}
    >
      <div style={{ ...panel, maxWidth: 720 }} data-testid="hospital-admission-intake">
        {resumeMode ? (
          <p
            style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#0f766e" }}
            data-testid="admission-resume-banner"
          >
            {t("hospitalCareD3e8a.intake.resumeAdmission")}
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
            {t("hospitalCareD3e8a.intake.startNewAdmission")}
          </p>
        )}
        <label style={labelStyle} htmlFor={`${formId}-search`}>
          {t("hospitalCareD3e7.admissions.patientSearch")}
          <input
            id={`${formId}-search`}
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            style={fieldStyle}
            placeholder={t("hospitalCareD3e6d.admission.searchPlaceholder")}
          />
        </label>

        {patientHits.length > 0 ? (
          <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0 }}>
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
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    background: selectedPatient?.id === p.id ? "#ecfeff" : "#fff",
                  }}
                >
                  {`${p.lastName ?? ""} ${p.firstName ?? ""}`.trim()} — {p.mrn ?? dash}
                  {p.dob ? ` · ${String(p.dob).slice(0, 10)}` : ""}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selectedPatient ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
            data-testid="admission-patient-confirm"
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {`${selectedPatient.lastName ?? ""} ${selectedPatient.firstName ?? ""}`.trim()}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              MRN {selectedPatient.mrn ?? dash}
              {selectedPatient.dob ? ` · DOB ${String(selectedPatient.dob).slice(0, 10)}` : ""}
            </div>
            {openEd ? (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  fontSize: 12,
                  color: "#92400e",
                }}
                data-testid="admission-open-ed-advisory"
              >
                <strong>{t("hospitalCareD3e6d.admission.openEdBadge")}</strong>
                <p style={{ margin: "4px 0 0" }}>{t("hospitalCareD3e6d.admission.openEdAdvisory")}</p>
                <label style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={confirmEd}
                    onChange={(e) => setConfirmEd(e.target.checked)}
                  />
                  <span>{t("hospitalCareD3e6d.admission.confirmEd")}</span>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <label style={labelStyle}>
          {t("hospitalCareD3e6d.admission.source")}
          <select value={source} onChange={(e) => setSource(e.target.value)} style={fieldStyle}>
            <option value="EMERGENCY_DEPARTMENT">EMERGENCY_DEPARTMENT</option>
            <option value="DIRECT">DIRECT</option>
            <option value="CLINIC">CLINIC</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="EXTERNAL_TRANSFER">EXTERNAL_TRANSFER</option>
            <option value="OBSERVATION_CONVERSION">OBSERVATION_CONVERSION</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>

        <label style={labelStyle}>
          {t("hospitalCareD3e6d.admission.datetime")}
          <input
            type="datetime-local"
            value={admittedAt}
            onChange={(e) => setAdmittedAt(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          {t("hospitalCareD3e7.admissions.unit")}
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={fieldStyle}>
            <option value="">{t("hospitalCareD3e6d.admission.selectUnit")}</option>
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          {t("hospitalCareD3e6d.admission.bedOptional")}
          <input
            value={bedKey}
            onChange={(e) => setBedKey(e.target.value)}
            placeholder="MS:1"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          {t("hospitalCareD3e7.admissions.diagnosis")}
          <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          {t("hospitalCareD3e7.admissions.reason")}
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          {t("hospitalCareD3e7.admissions.service")}
          <input value={service} onChange={(e) => setService(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          {t("hospitalCareD3e7.admissions.level")}
          <input value={level} onChange={(e) => setLevel(e.target.value)} style={fieldStyle} />
        </label>

        <p style={{ fontSize: 11, color: "#64748b" }}>
          {t("hospitalCareD3e6d.admission.receivingNurseHint")}
        </p>

        {formError ? (
          <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!selectedPatient || submitting}
          onClick={() => void submit()}
          data-testid="start-inpatient-encounter"
          style={{
            marginTop: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: selectedPatient ? "#1d4ed8" : "#94a3b8",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: selectedPatient ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? t("common.loading") : t("hospitalCareD3e6d.admission.startEncounter")}
        </button>
      </div>
    </HospitalCareShell>
  );
}

const panel: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 10,
};

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  boxSizing: "border-box",
};
