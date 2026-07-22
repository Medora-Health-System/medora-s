"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BED_NO_LONGER_AVAILABLE_CODE,
  canStartInpatientEncounterFromIntake,
  HOSPITAL_ADMISSION_SOURCES,
  HOSPITAL_ADMITTING_SERVICES,
  HOSPITAL_REQUESTED_LEVELS_OF_CARE,
  isBedSelectableForAdmissionIntake,
  levelsOfCareForUnit,
  type PatientSearchHitV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DISPLAY_DASH, calculateAge } from "@/lib/patientDisplay";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import { resolveBedBoardUnitCode } from "@/features/inpatient-workspace/UnitBedBoard";
import {
  fetchFacilityBedBoard,
  type FacilityBedBoardBedRow,
} from "@/lib/bedBoardApi";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { HospitalCareShell } from "./HospitalCareShell";
import { createDirectInpatientAdmission } from "./inpatientOperationsApi";
import { fetchHospitalUnitRegistry } from "./hospitalCareUnitsApi";

type OpenEncounterHit = {
  id: string;
  type?: string | null;
  status?: string | null;
};

type WorkspacePatient = PatientSearchHitV1 & {
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  email?: string | null;
};

type InsuranceRow = {
  rank?: string | null;
  payerName?: string | null;
  payerId?: string | null;
  planName?: string | null;
};

/**
 * D4A.0 — Connected hospital admission intake:
 * search → select → confirm demographics → details → required bed → Start Inpatient Encounter.
 * Never creates a Patient. Typed text is never identity.
 */
export function HospitalAdmissionIntakeView() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { facilityId, roles } = useFacilityAndRoles();
  const presetUnit = (searchParams?.get("unit") ?? "").trim().toUpperCase();
  const resumeMode = searchParams?.get("resume") === "1";
  const resumeSourceEncounterId = searchParams?.get("sourceEncounterId") ?? "";
  const formId = useId();

  const [resumeCorrelationId, setResumeCorrelationId] = useState<string | null>(null);
  const [resumePlacementId, setResumePlacementId] = useState<string | null>(null);
  const [existingAdmissionBanner, setExistingAdmissionBanner] = useState<{
    receivingEncounterId?: string | null;
    placementStatus?: string | null;
    requestedUnit?: string | null;
    assignedBed?: string | null;
    source?: string | null;
  } | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [workspacePatient, setWorkspacePatient] = useState<WorkspacePatient | null>(null);
  const [insurance, setInsurance] = useState<InsuranceRow[]>([]);
  const [demographicsConfirmed, setDemographicsConfirmed] = useState(false);
  const [openEncounters, setOpenEncounters] = useState<OpenEncounterHit[]>([]);
  const [sourceEdId, setSourceEdId] = useState<string>("");

  const [units, setUnits] = useState<Array<{ code: string; name: string }>>([]);
  const [unit, setUnit] = useState(presetUnit);
  const [availableBeds, setAvailableBeds] = useState<FacilityBedBoardBedRow[]>([]);
  const [bedsLoading, setBedsLoading] = useState(false);
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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idempotencyKey = useState(
    () => `adm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )[0];

  const receivingNurseLabel = t("hospitalAdmissionD4a0.receivingNurse.authenticated");

  const openEdCandidates = useMemo(
    () =>
      openEncounters.filter((e) => String(e.type ?? "").toUpperCase() === "EMERGENCY"),
    [openEncounters]
  );
  const openIp = openEncounters.find(
    (e) => String(e.type ?? "").toUpperCase() === "INPATIENT"
  );

  const levelOptions = useMemo(() => {
    const allowed = levelsOfCareForUnit(unit);
    return HOSPITAL_REQUESTED_LEVELS_OF_CARE.filter((l) =>
      (allowed as readonly string[]).includes(l)
    );
  }, [unit]);

  const canSubmit =
    canStartInpatientEncounterFromIntake({
      selectedPatientId,
      demographicsConfirmed,
      admissionSource: source,
      sourceEncounterId:
        source === "EMERGENCY_DEPARTMENT"
          ? sourceEdId || openEdCandidates[0]?.id || null
          : null,
      admittedAt: admittedAt ? new Date(admittedAt).toISOString() : null,
      requestedUnit: unit,
      assignedBedKey: bedKey,
      admissionDiagnosis: diagnosis,
      reasonForAdmission: reason,
      admittingService: service,
      requestedLevelOfCare: level,
    }) &&
    (source !== "EMERGENCY_DEPARTMENT" ||
      openEdCandidates.length <= 1 ||
      Boolean(sourceEdId));

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
    if (presetUnit) setUnit(presetUnit);
  }, [presetUnit]);

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
            receivingEncounterId?: string | null;
            destinationUnitId?: string | null;
            bed?: string | null;
            placementStatus?: string | null;
            admissionSource?: string | null;
          } | null;
        })?.journey;
        setResumeCorrelationId(journey?.admissionCorrelationId?.trim() || null);
        setResumePlacementId(journey?.placementRequestId?.trim() || null);
        if (journey?.receivingEncounterId) {
          setExistingAdmissionBanner({
            receivingEncounterId: journey.receivingEncounterId,
            placementStatus: journey.placementStatus ?? null,
            requestedUnit: journey.destinationUnitId ?? null,
            assignedBed: journey.bed ?? null,
            source: journey.admissionSource ?? null,
          });
        }
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
    if (!selectedPatientId || !facilityId) {
      setWorkspacePatient(null);
      setInsurance([]);
      setOpenEncounters([]);
      setDemographicsConfirmed(false);
      setSourceEdId("");
      setExistingAdmissionBanner(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [p, encs, ins] = await Promise.all([
          apiFetch(`/patients/${encodeURIComponent(selectedPatientId)}`, {
            facilityId,
          }),
          apiFetch(
            `/patients/${encodeURIComponent(selectedPatientId)}/encounters?status=OPEN&limit=10`,
            { facilityId }
          ),
          apiFetch(`/patients/${encodeURIComponent(selectedPatientId)}/insurance`, {
            facilityId,
          }).catch(() => []),
        ]);
        if (cancelled) return;
        setWorkspacePatient(p as WorkspacePatient);
        const items = Array.isArray(encs)
          ? encs
          : Array.isArray((encs as { items?: unknown })?.items)
            ? (encs as { items: OpenEncounterHit[] }).items
            : [];
        setOpenEncounters(items as OpenEncounterHit[]);
        setInsurance(Array.isArray(ins) ? (ins as InsuranceRow[]) : []);
      } catch {
        if (!cancelled) {
          setWorkspacePatient(null);
          setOpenEncounters([]);
          setInsurance([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatientId, facilityId]);

  useEffect(() => {
    const eds = openEncounters.filter(
      (e) => String(e.type ?? "").toUpperCase() === "EMERGENCY"
    );
    if (source === "EMERGENCY_DEPARTMENT") {
      if (eds.length === 1) setSourceEdId(eds[0]!.id);
      else if (eds.length === 0) setSourceEdId("");
    }
  }, [openEncounters, source]);

  useEffect(() => {
    setBedKey("");
    const bedUnit = resolveBedBoardUnitCode(unit);
    if (!facilityId || !bedUnit) {
      setAvailableBeds([]);
      return;
    }
    let cancelled = false;
    setBedsLoading(true);
    void (async () => {
      try {
        const board = await fetchFacilityBedBoard(facilityId, bedUnit);
        if (cancelled) return;
        const unitRows = board.units.find((u) => u.unitCode === bedUnit)?.beds ?? [];
        setAvailableBeds(unitRows.filter((b) => isBedSelectableForAdmissionIntake(b.status)));
      } catch {
        if (!cancelled) setAvailableBeds([]);
      } finally {
        if (!cancelled) setBedsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unit, facilityId]);

  const clearPatient = () => {
    setSelectedPatientId(null);
    setWorkspacePatient(null);
    setDemographicsConfirmed(false);
    setOpenEncounters([]);
    setSourceEdId("");
    setBedKey("");
    setExistingAdmissionBanner(null);
  };

  const submit = async () => {
    if (!selectedPatientId || !canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const admittedIso = admittedAt
        ? new Date(admittedAt).toISOString()
        : new Date().toISOString();
      const edLink =
        source === "EMERGENCY_DEPARTMENT"
          ? sourceEdId || openEdCandidates[0]?.id || resumeSourceEncounterId || null
          : resumeSourceEncounterId || null;
      const result = await createDirectInpatientAdmission({
        patientId: selectedPatientId,
        admissionSource: source as "EMERGENCY_DEPARTMENT",
        admissionDiagnosis: diagnosis.trim(),
        reasonForAdmission: reason.trim(),
        admittingService: service.trim(),
        requestedUnit: unit.trim(),
        requestedLevelOfCare: level.trim(),
        assignedBedKey: bedKey.trim(),
        sourceEdEncounterId: edLink,
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
        router.push(`${inpatientActiveWorkspacePath(encounterId)}?section=admission`);
        return;
      }
      setFormError(t("hospitalCareD3e7.admissions.submitError"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes(BED_NO_LONGER_AVAILABLE_CODE) || msg.includes("BED_NO_LONGER_AVAILABLE")) {
        setBedKey("");
        setFormError(t("hospitalAdmissionD4a0.bed.noLongerAvailable"));
        // Reload beds
        const bedUnit = resolveBedBoardUnitCode(unit);
        if (facilityId && bedUnit) {
          try {
            const board = await fetchFacilityBedBoard(facilityId, bedUnit);
            const unitRows = board.units.find((u) => u.unitCode === bedUnit)?.beds ?? [];
            setAvailableBeds(
              unitRows.filter((b) => isBedSelectableForAdmissionIntake(b.status))
            );
          } catch {
            /* keep prior list */
          }
        }
      } else {
        setFormError(t("hospitalCareD3e7.admissions.submitError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dash = t("common.dash") || DISPLAY_DASH;
  const primaryIns = insurance.find((r) => String(r.rank ?? "").toUpperCase() === "PRIMARY");
  const secondaryIns = insurance.find(
    (r) => String(r.rank ?? "").toUpperCase() === "SECONDARY"
  );
  const age =
    workspacePatient?.dob != null
      ? calculateAge(String(workspacePatient.dob).slice(0, 10))
      : null;

  return (
    <HospitalCareShell
      active="admissions"
      title={t("hospitalCareD3e6d.admission.title")}
      subtitle={t("hospitalAdmissionD4a0.subtitle")}
    >
      <div style={{ ...panel, maxWidth: 760 }} data-testid="hospital-admission-intake">
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

        {existingAdmissionBanner?.receivingEncounterId ? (
          <div style={warnBox} data-testid="existing-admission-banner">
            <strong>{t("hospitalAdmissionD4a0.existing.title")}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 12 }}>
              {t("hospitalAdmissionD4a0.existing.source")}:{" "}
              {existingAdmissionBanner.source ?? dash}
              {" · "}
              {t("hospitalAdmissionD4a0.existing.unit")}:{" "}
              {existingAdmissionBanner.requestedUnit ?? dash}
              {" · "}
              {t("hospitalAdmissionD4a0.existing.bed")}:{" "}
              {existingAdmissionBanner.assignedBed ?? dash}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Link
                href={`${inpatientActiveWorkspacePath(existingAdmissionBanner.receivingEncounterId)}?section=admission`}
                style={linkBtn}
              >
                {t("hospitalAdmissionD4a0.existing.resume")}
              </Link>
              <Link
                href={inpatientActiveWorkspacePath(existingAdmissionBanner.receivingEncounterId)}
                style={linkBtnSecondary}
              >
                {t("hospitalAdmissionD4a0.existing.openChart")}
              </Link>
            </div>
          </div>
        ) : null}

        {/* STEP 1 */}
        <h3 style={stepTitle} data-testid="admission-step-search">
          {t("hospitalAdmissionD4a0.steps.search")}
        </h3>
        {!demographicsConfirmed ? (
          <>
            <PatientSearchAndSelect
              facilityId={facilityId}
              autoSearch
              selectedPatientId={selectedPatientId}
              onSelect={(p) => {
                setSelectedPatientId(p.id);
                setDemographicsConfirmed(false);
                setBedKey("");
                setWorkspacePatient(p);
              }}
              onClearSelection={clearPatient}
              clearSelectionOnQueryChange
              testIdPrefix="admission-patient-search"
            />
            {!selectedPatientId ? (
              <div style={{ marginTop: 8 }}>
                <Link href="/app/registration" style={linkBtnSecondary} data-testid="open-registration">
                  {t("hospitalAdmissionD4a0.search.openRegistration")}
                </Link>
              </div>
            ) : null}
          </>
        ) : workspacePatient ? (
          <div
            style={{ ...confirmCard, marginBottom: 12 }}
            data-testid="admission-confirmed-patient-summary"
          >
            <h4 style={{ ...sectionHead, margin: "0 0 8px" }}>
              {t("hospitalAdmissionD4a0.steps.confirmedPatient")}
            </h4>
            <p style={metaLine}>
              <strong>
                {`${workspacePatient.firstName ?? ""} ${workspacePatient.lastName ?? ""}`.trim() ||
                  dash}
              </strong>
            </p>
            <p style={metaLine}>
              {t("hospitalAdmissionD4a0.search.mrn")}: {workspacePatient.mrn ?? dash}
            </p>
            <p style={metaLine}>
              {t("hospitalAdmissionD4a0.search.dob")}:{" "}
              {workspacePatient.dob ? String(workspacePatient.dob).slice(0, 10) : dash}
            </p>
            <button
              type="button"
              onClick={clearPatient}
              data-testid="choose-different-patient-locked"
              style={{ ...secondaryBtn, marginTop: 10 }}
            >
              {t("hospitalAdmissionD4a0.confirm.chooseDifferent")}
            </button>
          </div>
        ) : null}

        {/* STEP 2 */}
        {selectedPatientId && workspacePatient && !demographicsConfirmed ? (
          <div data-testid="admission-patient-confirm" style={{ marginTop: 12 }}>
            <h3 style={stepTitle}>{t("hospitalAdmissionD4a0.steps.confirm")}</h3>
            <div style={confirmCard}>
              <section>
                <h4 style={sectionHead}>{t("hospitalAdmissionD4a0.confirm.identity")}</h4>
                <p style={metaLine}>
                  <strong>
                    {`${workspacePatient.firstName ?? ""} ${workspacePatient.lastName ?? ""}`.trim() ||
                      dash}
                  </strong>
                </p>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.search.dob")}:{" "}
                  {workspacePatient.dob
                    ? String(workspacePatient.dob).slice(0, 10)
                    : dash}
                  {age != null
                    ? ` · ${age} ${t("hospitalAdmissionD4a0.search.yearOld")} ${String(workspacePatient.sexAtBirth ?? workspacePatient.sex ?? dash)}`
                    : ""}
                </p>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.search.mrn")}: {workspacePatient.mrn ?? dash}
                </p>
              </section>
              <section style={{ marginTop: 10 }}>
                <h4 style={sectionHead}>{t("hospitalAdmissionD4a0.confirm.contact")}</h4>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.search.phone")}: {workspacePatient.phone ?? dash}
                </p>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.confirm.email")}: {workspacePatient.email ?? dash}
                </p>
                <p style={metaLine}>
                  {[
                    workspacePatient.addressLine1,
                    workspacePatient.city,
                    workspacePatient.stateProvince,
                  ]
                    .filter(Boolean)
                    .join(", ") || dash}
                </p>
              </section>
              <section style={{ marginTop: 10 }}>
                <h4 style={sectionHead}>{t("hospitalAdmissionD4a0.confirm.coverage")}</h4>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.confirm.primaryInsurance")}:{" "}
                  {primaryIns?.payerName || primaryIns?.planName || t("hospitalAdmissionD4a0.confirm.selfPay")}
                </p>
                <p style={metaLine}>
                  {t("hospitalAdmissionD4a0.confirm.secondaryInsurance")}:{" "}
                  {secondaryIns?.payerName || secondaryIns?.planName || dash}
                </p>
              </section>
              <section style={{ marginTop: 10 }}>
                <h4 style={sectionHead}>{t("hospitalAdmissionD4a0.confirm.clinicalContext")}</h4>
                {openEdCandidates.length > 0 ? (
                  <p style={metaLine} data-testid="admission-open-ed-advisory">
                    {t("hospitalCareD3e6d.admission.openEdBadge")} ({openEdCandidates.length})
                  </p>
                ) : (
                  <p style={metaLine}>{t("hospitalAdmissionD4a0.confirm.noOpenEd")}</p>
                )}
                {openIp ? (
                  <p style={metaLine}>{t("hospitalAdmissionD4a0.advisory.OPEN_INPATIENT")}</p>
                ) : null}
              </section>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setDemographicsConfirmed(true)}
                  data-testid="confirm-patient-demographics"
                  style={primaryBtn}
                >
                  {t("hospitalAdmissionD4a0.confirm.confirmPatient")}
                </button>
                <button
                  type="button"
                  onClick={clearPatient}
                  data-testid="choose-different-patient"
                  style={secondaryBtn}
                >
                  {t("hospitalAdmissionD4a0.confirm.chooseDifferent")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* STEPS 3–5 — only after confirmation */}
        {demographicsConfirmed && selectedPatientId ? (
          <div data-testid="admission-details-form">
            <h3 style={stepTitle}>{t("hospitalAdmissionD4a0.steps.details")}</h3>

            <label style={labelStyle} htmlFor={`${formId}-source`}>
              {t("hospitalCareD3e6d.admission.source")}
              <select
                id={`${formId}-source`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={fieldStyle}
              >
                {HOSPITAL_ADMISSION_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t(`hospitalAdmissionD4a0.source.${s}`)}
                  </option>
                ))}
              </select>
            </label>

            {source === "EMERGENCY_DEPARTMENT" && openEdCandidates.length > 1 ? (
              <label style={labelStyle}>
                {t("hospitalAdmissionD4a0.source.selectEd")}
                <select
                  value={sourceEdId}
                  onChange={(e) => setSourceEdId(e.target.value)}
                  style={fieldStyle}
                  data-testid="source-ed-select"
                >
                  <option value="">{t("hospitalAdmissionD4a0.source.selectEdPlaceholder")}</option>
                  {openEdCandidates.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
              {t("hospitalCareD3e7.admissions.diagnosis")}
              <input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                style={fieldStyle}
                required
              />
            </label>
            <label style={labelStyle}>
              {t("hospitalCareD3e7.admissions.reason")}
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={fieldStyle}
                required
              />
            </label>
            <label style={labelStyle}>
              {t("hospitalCareD3e7.admissions.service")}
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                style={fieldStyle}
              >
                <option value="">{t("hospitalAdmissionD4a0.selectService")}</option>
                {HOSPITAL_ADMITTING_SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {t(`hospitalAdmissionD4a0.service.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("hospitalCareD3e7.admissions.level")}
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={fieldStyle}
              >
                <option value="">{t("hospitalAdmissionD4a0.selectLevel")}</option>
                {levelOptions.map((l) => (
                  <option key={l} value={l}>
                    {t(`hospitalAdmissionD4a0.level.${l}`)}
                  </option>
                ))}
              </select>
            </label>

            <h3 style={stepTitle}>{t("hospitalAdmissionD4a0.steps.unitBed")}</h3>
            <label style={labelStyle}>
              {t("hospitalCareD3e7.admissions.unit")}
              <select
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setLevel("");
                }}
                style={fieldStyle}
              >
                <option value="">{t("hospitalCareD3e6d.admission.selectUnit")}</option>
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {t("hospitalAdmissionD4a0.bed.assigned")}
              <select
                value={bedKey}
                onChange={(e) => setBedKey(e.target.value)}
                style={fieldStyle}
                disabled={!unit || bedsLoading}
                data-testid="assigned-bed-select"
              >
                <option value="">
                  {bedsLoading
                    ? t("common.loading")
                    : t("hospitalAdmissionD4a0.bed.select")}
                </option>
                {availableBeds.map((b) => (
                  <option key={b.bedKey} value={b.bedKey}>
                    {b.display} · {b.unitCode} · {t("hospitalAdmissionD4a0.bed.available")}
                  </option>
                ))}
              </select>
            </label>
            {unit && !bedsLoading && availableBeds.length === 0 ? (
              <p style={{ fontSize: 12, color: "#b45309" }}>
                {t("hospitalAdmissionD4a0.bed.noneAvailable")}
              </p>
            ) : null}

            <p style={{ fontSize: 12, color: "#334155", marginTop: 8 }}>
              <strong>{t("hospitalAdmissionD4a0.receivingNurse.label")}</strong>
              {": "}
              {receivingNurseLabel}
              {roles.includes("RN") ? ", RN" : ""}
            </p>
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
              disabled={!canSubmit || submitting}
              onClick={() => void submit()}
              data-testid="start-inpatient-encounter"
              style={{
                marginTop: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: canSubmit ? "#1d4ed8" : "#94a3b8",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting
                ? t("common.loading")
                : t("hospitalCareD3e6d.admission.startEncounter")}
            </button>
          </div>
        ) : null}
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

const stepTitle: CSSProperties = {
  margin: "16px 0 8px",
  fontSize: 14,
  fontWeight: 800,
  color: "#0f172a",
};

const confirmCard: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const sectionHead: CSSProperties = {
  margin: "0 0 4px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.04,
  textTransform: "uppercase",
  color: "#64748b",
};

const metaLine: CSSProperties = {
  margin: "0 0 2px",
  fontSize: 12,
  color: "#334155",
};

const primaryBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#0f766e",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const warnBox: CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #fcd34d",
  background: "#fffbeb",
  color: "#92400e",
  fontSize: 13,
};

const linkBtn: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  background: "#0f766e",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  textDecoration: "none",
};

const linkBtnSecondary: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: 600,
  fontSize: 12,
  textDecoration: "none",
};
