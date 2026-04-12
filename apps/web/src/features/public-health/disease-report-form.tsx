"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import {
  createDiseaseReport,
  fetchDiseaseCatalog,
  type HaitiGeoDepartment,
  type HaitiGeoCommune,
  type DiseaseNotifiableCatalogItem,
} from "@/lib/publicHealthApi";
import {
  DiseaseCatalogCombobox,
  findCatalogEntryByCode,
} from "@/features/public-health/DiseaseCatalogCombobox";
import { Field, inputStyle } from "@/components/pharmacy/Modal";

const STATUS_CODES = ["SUSPECTED", "CONFIRMED", "RULED_OUT"] as const;

const LAB_EVIDENCE_FOR_CONFIRMED = [
  "PCR",
  "RAPID_ANTIGEN",
  "CULTURE",
  "SEROLOGY",
  "OTHER",
] as const;

const MSPP_CLASSIFICATION = [
  "SUSPECT",
  "PROBABLE",
  "CONFIRMED",
  "NOT_A_CASE",
] as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: 24,
  borderRadius: 16,
  marginBottom: 20,
  border: "1px solid #e2e8f0",
  maxWidth: 720,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#334155",
  marginTop: 20,
  marginBottom: 10,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const errText: React.CSSProperties = {
  fontSize: 12,
  color: "#b91c1c",
  marginTop: 4,
  fontWeight: 600,
};

const REPORTING_CONTEXT_HINT: React.CSSProperties = {
  fontSize: 12,
  color: "#334155",
  margin: "10px 0 0",
  padding: "8px 10px",
  background: "#f8fafc",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  lineHeight: 1.45,
};

function reportingCategoryForCatalogEntry(e: DiseaseNotifiableCatalogItem): "IMMEDIATE" | "WEEKLY" | "ROUTINE" {
  if (e.reportingCategory) return e.reportingCategory;
  if (e.surveillanceGroup === "IMMEDIATE") return "IMMEDIATE";
  if (e.surveillanceGroup === "WEEKLY") return "WEEKLY";
  return "ROUTINE";
}

type Patient = { id: string; firstName: string; lastName: string; mrn: string | null };

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function triStateToBool(v: string): boolean | undefined {
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

type Props = {
  facilityId: string;
  onCreated: () => void;
  geoDepartments: HaitiGeoDepartment[];
  communesByDept: Record<string, HaitiGeoCommune[]>;
};

export function DiseaseReportForm({ facilityId, onCreated, geoDepartments, communesByDept }: Props) {
  const { t } = useI18n();

  const useGeoLists = geoDepartments.length > 0;
  const [geoDeptId, setGeoDeptId] = useState("");
  const [geoCommuneId, setGeoCommuneId] = useState("");

  const communesForDept = useMemo(() => {
    if (!geoDeptId) return [];
    return communesByDept[geoDeptId] ?? [];
  }, [geoDeptId, communesByDept]);

  useEffect(() => {
    setGeoCommuneId("");
  }, [geoDeptId]);

  useEffect(() => {
    let cancelled = false;
    if (!facilityId) {
      setDiseaseCatalogLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setDiseaseCatalogLoading(true);
    void fetchDiseaseCatalog(facilityId)
      .then((res) => {
        if (!cancelled) setDiseaseCatalog(res.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setDiseaseCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setDiseaseCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [diseaseCode, setDiseaseCode] = useState("");
  const [diseaseName, setDiseaseName] = useState("");
  const [status, setStatus] = useState<string>("SUSPECTED");
  const [reportedDate, setReportedDate] = useState(todayDateInput);
  const [onsetDate, setOnsetDate] = useState("");
  const [feverTri, setFeverTri] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [hospTri, setHospTri] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState("");
  const [labTri, setLabTri] = useState("");
  const [labEvidenceType, setLabEvidenceType] = useState("");
  const [epiTri, setEpiTri] = useState("");
  const [travelOrExposureContext, setTravelOrExposureContext] = useState("");
  const [provisionalClassification, setProvisionalClassification] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [diseaseCatalog, setDiseaseCatalog] = useState<DiseaseNotifiableCatalogItem[]>([]);
  const [diseaseCatalogLoading, setDiseaseCatalogLoading] = useState(true);

  const statusLabel = (code: string) => {
    const key = `diseaseReports.statuses.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const labEvidenceLabel = (code: string) => {
    const key = `diseaseReports.labEvidenceTypes.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const classLabel = (code: string) => {
    const key = `diseaseReports.msppClassifications.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const geoReadyForCommune =
    useGeoLists &&
    Boolean(geoDeptId) &&
    communesForDept.length > 0;

  const hasTextJustification = Boolean(clinicalSummary.trim() || notes.trim());

  const labValid =
    labTri !== "yes" ||
    Boolean(labEvidenceType && labEvidenceType !== "NONE");

  const isFormValid = useMemo(() => {
    if (!diseaseCode.trim() || !diseaseName.trim()) return false;
    if (!hasTextJustification) return false;
    if (!reportedDate.trim()) return false;
    if (!status) return false;
    if (!useGeoLists) return false;
    if (!geoDeptId) return false;
    if (!geoReadyForCommune) return false;
    if (!geoCommuneId.trim()) return false;
    if (!labValid) return false;
    return true;
  }, [
    diseaseCode,
    diseaseName,
    hasTextJustification,
    reportedDate,
    status,
    useGeoLists,
    geoDeptId,
    geoReadyForCommune,
    geoCommuneId,
    labValid,
  ]);

  const showInvalidHint = (isValid: boolean) => dirty && !isValid;

  const diseaseCatalogMatch = useMemo(() => {
    if (!diseaseCode.trim() || diseaseCatalog.length === 0) return null;
    return findCatalogEntryByCode(diseaseCatalog, diseaseCode.trim()) ?? null;
  }, [diseaseCatalog, diseaseCode]);

  const reportingContextHintKey = useMemo((): string | null => {
    if (!diseaseCatalogMatch) return null;
    const rc = reportingCategoryForCatalogEntry(diseaseCatalogMatch);
    if (rc === "IMMEDIATE") return "diseaseReports.reportingHintImmediate";
    if (rc === "WEEKLY") return "diseaseReports.reportingHintWeekly";
    return "diseaseReports.reportingHintRoutine";
  }, [diseaseCatalogMatch]);

  const searchPatients = async () => {
    if (!facilityId || !patientQuery.trim()) return;
    try {
      const data = await apiFetch(`/patients/search?q=${encodeURIComponent(patientQuery.trim())}`, {
        facilityId,
      });
      setPatients(data || []);
    } catch {
      setPatients([]);
    }
  };

  const resetForm = () => {
    setDiseaseCode("");
    setDiseaseName("");
    setOnsetDate("");
    setReportedDate(todayDateInput());
    setGeoDeptId("");
    setGeoCommuneId("");
    setFeverTri("");
    setSymptomDuration("");
    setHospTri("");
    setOutcomeStatus("");
    setLabTri("");
    setLabEvidenceType("");
    setEpiTri("");
    setTravelOrExposureContext("");
    setProvisionalClassification("");
    setClinicalSummary("");
    setNotes("");
    setPatientId("");
  };

  const handleSubmit = async () => {
    if (!facilityId || !isFormValid) return;

    setMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        diseaseCode: diseaseCode.trim(),
        diseaseName: diseaseName.trim(),
        status,
        reportedAt: new Date(`${reportedDate}T12:00:00`).toISOString(),
        geoCommuneId: geoCommuneId.trim(),
      };

      if (onsetDate) {
        body.onsetDate = new Date(`${onsetDate}T12:00:00`).toISOString();
      }
      if (clinicalSummary.trim()) body.clinicalSummary = clinicalSummary.trim();
      if (notes.trim()) body.notes = notes.trim();

      const f = triStateToBool(feverTri);
      if (f !== undefined) body.feverReported = f;
      if (symptomDuration.trim()) body.symptomDuration = symptomDuration.trim();
      const h = triStateToBool(hospTri);
      if (h !== undefined) body.hospitalized = h;
      if (outcomeStatus.trim()) body.outcomeStatus = outcomeStatus.trim();

      if (labTri === "yes") {
        body.labConfirmed = true;
        body.labEvidenceType = labEvidenceType;
      } else if (labTri === "no") {
        body.labConfirmed = false;
      }

      const e = triStateToBool(epiTri);
      if (e !== undefined) body.epiLinkedCase = e;
      if (travelOrExposureContext.trim()) {
        body.travelOrExposureContext = travelOrExposureContext.trim();
      }
      if (provisionalClassification.trim()) {
        body.provisionalCaseClassification = provisionalClassification.trim();
      }

      if (patientId) body.patientId = patientId;

      await createDiseaseReport(facilityId, body);
      setMessage({ type: "ok", text: t("diseaseReports.createdOk") });
      setDirty(false);
      resetForm();
      onCreated();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : t("diseaseReports.createErr"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const req = t("diseaseReports.requiredStar");
  const markDirty = () => setDirty(true);

  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("diseaseReports.newSectionTitle")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          placeholder={t("diseaseReports.patientSearchPlaceholder")}
          value={patientQuery}
          onChange={(e) => {
            markDirty();
            setPatientQuery(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && void searchPatients()}
        />
        <button type="button" onClick={() => void searchPatients()} style={btnPrimary}>
          {t("diseaseReports.patientSearch")}
        </button>
      </div>
      {patients.length > 0 && (
        <Field label={t("diseaseReports.linkPatient")}>
          <select
            style={inputStyle}
            value={patientId}
            onChange={(e) => {
              markDirty();
              setPatientId(e.target.value);
            }}
          >
            <option value="">{t("diseaseReports.patientNone")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName} {p.mrn ? `— ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div style={sectionTitleStyle}>{t("diseaseReports.sectionDeclaration")}</div>
      {diseaseCatalogLoading ? (
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>{t("diseaseReports.catalogLoading")}</p>
      ) : null}
      {!diseaseCatalogLoading && diseaseCatalog.length === 0 ? (
        <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 8px", background: "#fffbeb", padding: 8, borderRadius: 8 }}>
          {t("diseaseReports.catalogUnavailable")}
        </p>
      ) : null}
      {!diseaseCatalogLoading && diseaseCatalog.length > 0 ? (
        <DiseaseCatalogCombobox
          catalog={diseaseCatalog}
          diseaseName={diseaseName}
          diseaseCode={diseaseCode}
          onChangeName={setDiseaseName}
          onChangeCode={setDiseaseCode}
          markDirty={markDirty}
          showInvalidHintName={showInvalidHint(Boolean(diseaseName.trim()))}
          showInvalidHintCode={showInvalidHint(Boolean(diseaseCode.trim()))}
          requiredStar={req}
        />
      ) : (
        <>
          <Field label={`${t("diseaseReports.diseaseName")}${req}`}>
            <input
              style={inputStyle}
              value={diseaseName}
              onChange={(e) => {
                markDirty();
                setDiseaseName(e.target.value);
              }}
              placeholder={t("diseaseReports.diseaseNamePlaceholder")}
            />
            {showInvalidHint(Boolean(diseaseName.trim())) ? (
              <div style={errText}>{t("diseaseReports.validationDiseaseName")}</div>
            ) : null}
          </Field>
          <Field label={`${t("diseaseReports.diseaseCode")}${req}`}>
            <input
              style={inputStyle}
              value={diseaseCode}
              onChange={(e) => {
                markDirty();
                setDiseaseCode(e.target.value);
              }}
              placeholder={t("diseaseReports.diseaseCodePlaceholder")}
            />
            {showInvalidHint(Boolean(diseaseCode.trim())) ? (
              <div style={errText}>{t("diseaseReports.validationDiseaseCode")}</div>
            ) : null}
            <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
              {t("diseaseReports.diseaseCodeHint")}
            </span>
          </Field>
        </>
      )}
      {reportingContextHintKey ? (
        <p style={REPORTING_CONTEXT_HINT} role="note">
          {t(reportingContextHintKey)}
        </p>
      ) : null}
      <Field label={`${t("diseaseReports.status")}${req}`}>
        <select
          style={inputStyle}
          value={status}
          onChange={(e) => {
            markDirty();
            setStatus(e.target.value);
          }}
        >
          {STATUS_CODES.map((c) => (
            <option key={c} value={c}>
              {statusLabel(c)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`${t("diseaseReports.reportedDate")}${req}`}>
        <input
          type="date"
          style={inputStyle}
          value={reportedDate}
          onChange={(e) => {
            markDirty();
            setReportedDate(e.target.value);
          }}
        />
        {showInvalidHint(Boolean(reportedDate.trim())) ? (
          <div style={errText}>{t("diseaseReports.validationReportedDate")}</div>
        ) : null}
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.reportedDateHint")}
        </span>
      </Field>

      {!useGeoLists ? (
        <p style={{ fontSize: 13, color: "#92400e", margin: "8px 0 4px", background: "#fffbeb", padding: 8, borderRadius: 8 }}>
          {t("diseaseReports.geoReferenceUnavailable")}
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 4px" }}>{t("diseaseReports.geoPickHint")}</p>
          <Field label={`${t("diseaseReports.department")}${req}`}>
            <select
              style={inputStyle}
              value={geoDeptId}
              onChange={(e) => {
                markDirty();
                setGeoDeptId(e.target.value);
              }}
            >
              <option value="">{t("diseaseReports.deptPlaceholder")}</option>
              {geoDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            {showInvalidHint(Boolean(geoDeptId)) ? <div style={errText}>{t("diseaseReports.validationDepartment")}</div> : null}
          </Field>
          {geoDeptId && communesForDept.length === 0 ? (
            <p style={{ fontSize: 13, color: "#92400e", margin: "4px 0 0", background: "#fffbeb", padding: 8, borderRadius: 8 }}>
              {t("diseaseReports.geoDeptButNoCommunesHint")}
            </p>
          ) : null}
          {geoReadyForCommune ? (
            <Field label={`${t("diseaseReports.commune")}${req}`}>
              <select
                style={inputStyle}
                value={geoCommuneId}
                onChange={(e) => {
                  markDirty();
                  setGeoCommuneId(e.target.value);
                }}
                disabled={!geoDeptId}
              >
                <option value="">{t("diseaseReports.communePlaceholder")}</option>
                {communesForDept.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ""}
                  </option>
                ))}
              </select>
              {showInvalidHint(Boolean(geoCommuneId.trim())) ? (
                <div style={errText}>{t("diseaseReports.validationCommune")}</div>
              ) : null}
            </Field>
          ) : null}
        </>
      )}

      <div style={sectionTitleStyle}>{t("diseaseReports.sectionSignes")}</div>
      <Field label={t("diseaseReports.onsetDate")}>
        <input
          type="date"
          style={inputStyle}
          value={onsetDate}
          onChange={(e) => {
            markDirty();
            setOnsetDate(e.target.value);
          }}
        />
      </Field>
      <Field label={t("diseaseReports.feverReported")}>
        <select
          style={inputStyle}
          value={feverTri}
          onChange={(e) => {
            markDirty();
            setFeverTri(e.target.value);
          }}
        >
          <option value="">{t("diseaseReports.triStateUnknown")}</option>
          <option value="yes">{t("diseaseReports.triStateYes")}</option>
          <option value="no">{t("diseaseReports.triStateNo")}</option>
        </select>
      </Field>
      <Field label={t("diseaseReports.symptomDuration")}>
        <input
          style={inputStyle}
          value={symptomDuration}
          onChange={(e) => {
            markDirty();
            setSymptomDuration(e.target.value);
          }}
          placeholder={t("diseaseReports.symptomDurationHint")}
        />
      </Field>
      <Field label={t("diseaseReports.hospitalized")}>
        <select
          style={inputStyle}
          value={hospTri}
          onChange={(e) => {
            markDirty();
            setHospTri(e.target.value);
          }}
        >
          <option value="">{t("diseaseReports.triStateUnknown")}</option>
          <option value="yes">{t("diseaseReports.triStateYes")}</option>
          <option value="no">{t("diseaseReports.triStateNo")}</option>
        </select>
      </Field>
      <Field label={t("diseaseReports.outcomeStatus")}>
        <input
          style={inputStyle}
          value={outcomeStatus}
          onChange={(e) => {
            markDirty();
            setOutcomeStatus(e.target.value);
          }}
          placeholder={t("diseaseReports.outcomeStatusHint")}
        />
      </Field>

      <div style={sectionTitleStyle}>{t("diseaseReports.sectionLaboratoire")}</div>
      <Field label={t("diseaseReports.labConfirmed")}>
        <select
          style={inputStyle}
          value={labTri}
          onChange={(e) => {
            markDirty();
            const v = e.target.value;
            setLabTri(v);
            if (v !== "yes") setLabEvidenceType("");
          }}
        >
          <option value="">{t("diseaseReports.triStateUnknown")}</option>
          <option value="yes">{t("diseaseReports.triStateYes")}</option>
          <option value="no">{t("diseaseReports.triStateNo")}</option>
        </select>
      </Field>
      {labTri === "yes" ? (
        <Field label={`${t("diseaseReports.labEvidenceType")}${req}`}>
          <select
            style={inputStyle}
            value={labEvidenceType}
            onChange={(e) => {
              markDirty();
              setLabEvidenceType(e.target.value);
            }}
          >
            <option value="">{t("diseaseReports.labEvidencePlaceholder")}</option>
            {LAB_EVIDENCE_FOR_CONFIRMED.map((c) => (
              <option key={c} value={c}>
                {labEvidenceLabel(c)}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
            {t("diseaseReports.labEvidenceHint")}
          </span>
          {showInvalidHint(labValid) ? (
            <div style={errText}>{t("diseaseReports.validationLabEvidence")}</div>
          ) : null}
        </Field>
      ) : null}

      <div style={sectionTitleStyle}>{t("diseaseReports.sectionExposition")}</div>
      <Field label={t("diseaseReports.epiLinkedCase")}>
        <select
          style={inputStyle}
          value={epiTri}
          onChange={(e) => {
            markDirty();
            setEpiTri(e.target.value);
          }}
        >
          <option value="">{t("diseaseReports.triStateUnknown")}</option>
          <option value="yes">{t("diseaseReports.triStateYes")}</option>
          <option value="no">{t("diseaseReports.triStateNo")}</option>
        </select>
      </Field>
      <Field label={t("diseaseReports.travelOrExposureContext")}>
        <textarea
          style={{ ...inputStyle, minHeight: 72 }}
          value={travelOrExposureContext}
          onChange={(e) => {
            markDirty();
            setTravelOrExposureContext(e.target.value);
          }}
          placeholder={t("diseaseReports.travelOrExposureHint")}
        />
      </Field>

      <div style={sectionTitleStyle}>{t("diseaseReports.sectionResume")}</div>
      <Field label={`${t("diseaseReports.provisionalClassification")}`}>
        <select
          style={inputStyle}
          value={provisionalClassification}
          onChange={(e) => {
            markDirty();
            setProvisionalClassification(e.target.value);
          }}
        >
          <option value="">{t("diseaseReports.triStateUnknown")}</option>
          {MSPP_CLASSIFICATION.map((c) => (
            <option key={c} value={c}>
              {classLabel(c)}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.provisionalClassificationHint")}
        </span>
      </Field>
      <Field label={t("diseaseReports.clinicalSummary")}>
        <textarea
          style={{ ...inputStyle, minHeight: 120 }}
          value={clinicalSummary}
          onChange={(e) => {
            markDirty();
            setClinicalSummary(e.target.value);
          }}
        />
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.clinicalSummaryHint")}
        </span>
      </Field>
      <Field label={t("diseaseReports.notes")}>
        <textarea
          style={{ ...inputStyle, minHeight: 72 }}
          value={notes}
          onChange={(e) => {
            markDirty();
            setNotes(e.target.value);
          }}
        />
      </Field>
      {showInvalidHint(hasTextJustification) ? (
        <div style={errText}>{t("diseaseReports.validationNotesOrSummary")}</div>
      ) : null}

      <button
        type="button"
        disabled={submitting || !isFormValid}
        onClick={() => void handleSubmit()}
        style={{
          ...btnPrimary,
          marginTop: 8,
          opacity: submitting || !isFormValid ? 0.45 : 1,
          cursor: submitting || !isFormValid ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? t("diseaseReports.submitting") : t("diseaseReports.submit")}
      </button>

      {message && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            backgroundColor: message.type === "ok" ? "rgba(22,163,74,0.12)" : "rgba(185,28,28,0.1)",
            color: message.type === "ok" ? "#166534" : "#991b1b",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
