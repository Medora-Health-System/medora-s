"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { createDiseaseReport, type HaitiGeoDepartment, type HaitiGeoCommune } from "@/lib/publicHealthApi";
import { Field, inputStyle } from "@/components/pharmacy/Modal";

const STATUS_CODES = ["SUSPECTED", "CONFIRMED", "RULED_OUT"] as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: 24,
  borderRadius: 16,
  marginBottom: 20,
  border: "1px solid #e2e8f0",
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

type Patient = { id: string; firstName: string; lastName: string; mrn: string | null };

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [diseaseCode, setDiseaseCode] = useState("");
  const [diseaseName, setDiseaseName] = useState("");
  const [status, setStatus] = useState<string>("SUSPECTED");
  const [reportedDate, setReportedDate] = useState(todayDateInput);
  const [onsetDate, setOnsetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const statusLabel = (code: string) => {
    const key = `diseaseReports.statuses.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const geoReadyForCommune =
    useGeoLists &&
    Boolean(geoDeptId) &&
    communesForDept.length > 0;

  const isFormValid = useMemo(() => {
    if (!diseaseCode.trim() || !diseaseName.trim() || !notes.trim()) return false;
    if (!reportedDate.trim()) return false;
    if (!status) return false;
    if (!useGeoLists) return false;
    if (!geoDeptId) return false;
    if (!geoReadyForCommune) return false;
    if (!geoCommuneId.trim()) return false;
    return true;
  }, [
    diseaseCode,
    diseaseName,
    notes,
    reportedDate,
    status,
    useGeoLists,
    geoDeptId,
    geoReadyForCommune,
    geoCommuneId,
  ]);

  const showInvalidHint = (isValid: boolean) => dirty && !isValid;

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
        onsetDate: onsetDate || undefined,
        geoCommuneId: geoCommuneId.trim(),
        notes: notes.trim(),
      };
      if (patientId) body.patientId = patientId;
      await createDiseaseReport(facilityId, body);
      setMessage({ type: "ok", text: t("diseaseReports.createdOk") });
      setDirty(false);
      setDiseaseCode("");
      setDiseaseName("");
      setOnsetDate("");
      setReportedDate(todayDateInput());
      setGeoDeptId("");
      setGeoCommuneId("");
      setNotes("");
      setPatientId("");
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
      <Field label={`${t("diseaseReports.diseaseCode")}${req}`}>
        <input
          style={inputStyle}
          value={diseaseCode}
          onChange={(e) => {
            markDirty();
            setDiseaseCode(e.target.value);
          }}
          placeholder="ex. A09, J18"
        />
        {showInvalidHint(Boolean(diseaseCode.trim())) ? <div style={errText}>{t("diseaseReports.validationDiseaseCode")}</div> : null}
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.diseaseCodeHint")}
        </span>
      </Field>
      <Field label={`${t("diseaseReports.diseaseName")}${req}`}>
        <input
          style={inputStyle}
          value={diseaseName}
          onChange={(e) => {
            markDirty();
            setDiseaseName(e.target.value);
          }}
          placeholder="ex. Diarrhée aiguë"
        />
        {showInvalidHint(Boolean(diseaseName.trim())) ? <div style={errText}>{t("diseaseReports.validationDiseaseName")}</div> : null}
      </Field>
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
        {showInvalidHint(Boolean(reportedDate.trim())) ? <div style={errText}>{t("diseaseReports.validationReportedDate")}</div> : null}
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.reportedDateHint")}
        </span>
      </Field>
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
              {showInvalidHint(Boolean(geoCommuneId.trim())) ? <div style={errText}>{t("diseaseReports.validationCommune")}</div> : null}
            </Field>
          ) : null}
        </>
      )}

      <Field label={t("diseaseReports.notes")}>
        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          value={notes}
          onChange={(e) => {
            markDirty();
            setNotes(e.target.value);
          }}
        />
        {showInvalidHint(Boolean(notes.trim())) ? <div style={errText}>{t("diseaseReports.validationNotes")}</div> : null}
      </Field>
      <button
        type="button"
        disabled={submitting || !isFormValid}
        onClick={() => void handleSubmit()}
        style={{
          ...btnPrimary,
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
