"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  createDiseaseReport,
  fetchDiseaseReports,
  fetchHaitiGeoReference,
  type DiseaseCaseReportRow,
  type HaitiGeoDepartment,
  type HaitiGeoCommune,
} from "@/lib/publicHealthApi";
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

type Patient = { id: string; firstName: string; lastName: string; mrn: string | null };

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function truncateNote(s: string | null | undefined, max: number) {
  if (!s) return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function DiseaseReportsPage() {
  const { t } = useI18n();
  const { facilityId, facilities, ready, canViewPublicHealth } = useFacilityAndRoles();
  const facilityName = facilities.find((f) => f.id === facilityId)?.name ?? "";

  const [geoDepartments, setGeoDepartments] = useState<HaitiGeoDepartment[]>([]);
  const [communesByDept, setCommunesByDept] = useState<Record<string, HaitiGeoCommune[]>>({});
  const [geoDeptId, setGeoDeptId] = useState("");
  const [geoCommuneId, setGeoCommuneId] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualCommune, setManualCommune] = useState("");

  const useGeoLists = geoDepartments.length > 0;

  const communesForDept = useMemo(() => {
    if (!geoDeptId) return [];
    return communesByDept[geoDeptId] ?? [];
  }, [geoDeptId, communesByDept]);

  useEffect(() => {
    if (!facilityId || !canViewPublicHealth) return;
    let cancelled = false;
    void fetchHaitiGeoReference(facilityId)
      .then((data) => {
        if (cancelled) return;
        setGeoDepartments(data.departments ?? []);
        setCommunesByDept(data.communesByDepartmentId ?? {});
      })
      .catch(() => {
        if (!cancelled) {
          setGeoDepartments([]);
          setCommunesByDept({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, canViewPublicHealth]);

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

  const [reports, setReports] = useState<DiseaseCaseReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCommune, setFilterCommune] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDiseaseName, setFilterDiseaseName] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const loadReports = useCallback(async () => {
    if (!facilityId || !canViewPublicHealth) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filterStatus) params.status = filterStatus;
      if (filterCommune) params.commune = filterCommune;
      if (filterDepartment) params.department = filterDepartment;
      if (filterDiseaseName) params.diseaseName = filterDiseaseName;
      if (filterFrom) params.reportedFrom = filterFrom;
      if (filterTo) params.reportedTo = filterTo;
      const res = await fetchDiseaseReports(facilityId, params);
      setReports(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    facilityId,
    canViewPublicHealth,
    filterStatus,
    filterCommune,
    filterDepartment,
    filterDiseaseName,
    filterFrom,
    filterTo,
  ]);

  useEffect(() => {
    if (ready && facilityId && canViewPublicHealth) void loadReports();
  }, [ready, facilityId, canViewPublicHealth, loadReports]);

  const searchPatients = async () => {
    if (!facilityId || !patientQuery.trim()) return;
    try {
      const data = await apiFetch(
        `/patients/search?q=${encodeURIComponent(patientQuery.trim())}`,
        { facilityId }
      );
      setPatients(data || []);
    } catch {
      setPatients([]);
    }
  };

  const statusLabel = (code: string) => {
    const key = `diseaseReports.statuses.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const msppPipelineLabel = (msppReview: DiseaseCaseReportRow["msppReview"]) => {
    if (!msppReview) return t("diseaseReports.msppReviewNotLinked");
    const key = `msppValidation.reviewStatus.${msppReview.status}`;
    const out = t(key);
    return out === key ? msppReview.status : out;
  };

  const handleSubmit = async () => {
    if (!facilityId || !diseaseCode.trim() || !diseaseName.trim()) return;
    if (useGeoLists && geoDeptId && communesForDept.length > 0 && !geoCommuneId.trim()) {
      setMessage({ type: "err", text: t("diseaseReports.communeRequiredWhenList") });
      return;
    }
    setMessage(null);
    setSubmitting(true);
    try {
      let departmentStr: string | undefined;
      let communeStr: string | undefined;
      if (useGeoLists && geoDeptId) {
        const deptRow = geoDepartments.find((x) => x.id === geoDeptId);
        departmentStr = deptRow?.name;
        if (geoCommuneId) {
          const comRow = communesForDept.find((x) => x.id === geoCommuneId);
          communeStr = comRow?.name;
        }
      } else {
        departmentStr = manualDepartment.trim() || undefined;
        communeStr = manualCommune.trim() || undefined;
      }

      const body: Record<string, unknown> = {
        diseaseCode: diseaseCode.trim(),
        diseaseName: diseaseName.trim(),
        status,
        reportedAt: new Date(`${reportedDate}T12:00:00`).toISOString(),
        onsetDate: onsetDate || undefined,
        commune: communeStr,
        department: departmentStr,
        notes: notes.trim() || undefined,
      };
      if (useGeoLists && geoCommuneId.trim()) {
        body.geoCommuneId = geoCommuneId.trim();
      }
      if (patientId) body.patientId = patientId;
      await createDiseaseReport(facilityId, body);
      setMessage({ type: "ok", text: t("diseaseReports.createdOk") });
      setDiseaseCode("");
      setDiseaseName("");
      setOnsetDate("");
      setReportedDate(todayDateInput());
      setGeoDeptId("");
      setGeoCommuneId("");
      setManualDepartment("");
      setManualCommune("");
      setNotes("");
      setPatientId("");
      void loadReports();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : t("diseaseReports.createErr"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <p>{t("diseaseReports.loadingPage")}</p>;
  if (!canViewPublicHealth) {
    return (
      <div>
        <h1>{t("diseaseReports.title")}</h1>
        <p>{t("diseaseReports.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("diseaseReports.title")}</h1>
      <p style={{ color: "#475569", fontSize: 14, marginBottom: 8, maxWidth: 720, lineHeight: 1.5 }}>
        {t("diseaseReports.introMspp")}
      </p>
      {facilityName ? (
        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            marginBottom: 16,
            padding: "10px 14px",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            maxWidth: 720,
          }}
        >
          <strong>{t("diseaseReports.contextFacility")}</strong> {facilityName}
        </p>
      ) : null}
      <p style={{ color: "#555", fontSize: 14, marginBottom: 12 }}>
        <Link href="/app/public-health/summary">{t("diseaseReports.navSummary")}</Link>
        {" · "}
        <Link href="/app/public-health/vaccinations">{t("diseaseReports.navVaccinations")}</Link>
      </p>

      <div
        style={{
          fontSize: 14,
          color: "#334155",
          lineHeight: 1.55,
          maxWidth: 720,
          marginBottom: 20,
          padding: "12px 14px",
          background: "#f0f9ff",
          borderRadius: 12,
          border: "1px solid #bae6fd",
        }}
      >
        <strong style={{ display: "block", marginBottom: 6, color: "#0c4a6e" }}>
          {t("diseaseReports.pipelineNoteTitle")}
        </strong>
        {t("diseaseReports.pipelineVisibilityNote")}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("diseaseReports.newSectionTitle")}</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder={t("diseaseReports.patientSearchPlaceholder")}
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void searchPatients()}
          />
          <button type="button" onClick={() => void searchPatients()} style={btnPrimary}>
            {t("diseaseReports.patientSearch")}
          </button>
        </div>
        {patients.length > 0 && (
          <Field label={t("diseaseReports.linkPatient")}>
            <select style={inputStyle} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">{t("diseaseReports.patientNone")}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} {p.mrn ? `— ${p.mrn}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t("diseaseReports.diseaseCode")}>
          <input
            style={inputStyle}
            value={diseaseCode}
            onChange={(e) => setDiseaseCode(e.target.value)}
            placeholder="ex. A09, J18"
          />
          <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
            {t("diseaseReports.diseaseCodeHint")}
          </span>
        </Field>
        <Field label={t("diseaseReports.diseaseName")}>
          <input
            style={inputStyle}
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="ex. Diarrhée aiguë"
          />
        </Field>
        <Field label={t("diseaseReports.status")}>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_CODES.map((c) => (
              <option key={c} value={c}>
                {statusLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("diseaseReports.reportedDate")}>
          <input
            type="date"
            style={inputStyle}
            value={reportedDate}
            onChange={(e) => setReportedDate(e.target.value)}
          />
          <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
            {t("diseaseReports.reportedDateHint")}
          </span>
        </Field>
        <Field label={t("diseaseReports.onsetDate")}>
          <input type="date" style={inputStyle} value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} />
        </Field>

        {useGeoLists ? (
          <>
            <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 4px" }}>{t("diseaseReports.geoPickHint")}</p>
            <Field label={t("diseaseReports.department")}>
              <select style={inputStyle} value={geoDeptId} onChange={(e) => setGeoDeptId(e.target.value)}>
                <option value="">{t("diseaseReports.deptPlaceholder")}</option>
                {geoDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("diseaseReports.commune")}>
              <select
                style={inputStyle}
                value={geoCommuneId}
                onChange={(e) => setGeoCommuneId(e.target.value)}
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
            </Field>
            {geoDeptId && communesForDept.length === 0 ? (
              <p style={{ fontSize: 13, color: "#92400e", margin: "4px 0 0", background: "#fffbeb", padding: 8, borderRadius: 8 }}>
                {t("diseaseReports.geoDeptButNoCommunesHint")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#92400e", margin: "8px 0 4px", background: "#fffbeb", padding: 8, borderRadius: 8 }}>
              {t("diseaseReports.geoManualHint")}
            </p>
            <Field label={t("diseaseReports.department")}>
              <input style={inputStyle} value={manualDepartment} onChange={(e) => setManualDepartment(e.target.value)} />
            </Field>
            <Field label={t("diseaseReports.commune")}>
              <input style={inputStyle} value={manualCommune} onChange={(e) => setManualCommune(e.target.value)} />
            </Field>
          </>
        )}

        <Field label={t("diseaseReports.notes")}>
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <button
          type="button"
          disabled={submitting || !diseaseCode.trim() || !diseaseName.trim()}
          onClick={() => void handleSubmit()}
          style={btnPrimary}
        >
          {submitting ? t("diseaseReports.submitting") : t("diseaseReports.submit")}
        </button>
      </div>

      {message && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 20,
            backgroundColor: message.type === "ok" ? "rgba(22,163,74,0.12)" : "rgba(185,28,28,0.1)",
            color: message.type === "ok" ? "#166534" : "#991b1b",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("diseaseReports.recentSectionTitle")}</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <input
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            placeholder={t("diseaseReports.filterDiseaseName")}
            value={filterDiseaseName}
            onChange={(e) => setFilterDiseaseName(e.target.value)}
          />
          <select
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">{t("diseaseReports.filterStatusAll")}</option>
            {STATUS_CODES.map((c) => (
              <option key={c} value={c}>
                {statusLabel(c)}
              </option>
            ))}
          </select>
          <input
            style={{ ...inputStyle, marginBottom: 0, width: 120 }}
            placeholder={t("diseaseReports.filterCommune")}
            value={filterCommune}
            onChange={(e) => setFilterCommune(e.target.value)}
          />
          <input
            style={{ ...inputStyle, marginBottom: 0, width: 120 }}
            placeholder={t("diseaseReports.filterDepartment")}
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          />
          <input
            type="date"
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
          <input
            type="date"
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
          <button type="button" onClick={() => void loadReports()} style={btnPrimary}>
            {t("diseaseReports.applyFilters")}
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
          {t("diseaseReports.countReports").replace("{count}", String(total))}
        </p>
        {loading ? (
          <p>{t("diseaseReports.tableLoading")}</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "#64748b" }}>{t("diseaseReports.tableEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableDeclaredOn")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableDisease")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableCode")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableStatus")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableDepartment")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableCommune")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableGeoQuality")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableMsppPipeline")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableOnset")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tableNotes")}</th>
                  <th style={{ padding: 10, textAlign: "left" }}>{t("diseaseReports.tablePatient")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 10 }}>{formatDate(r.reportedAt)}</td>
                    <td style={{ padding: 10 }}>{r.diseaseName}</td>
                    <td style={{ padding: 10 }}>{r.diseaseCode}</td>
                    <td style={{ padding: 10 }}>{statusLabel(r.status)}</td>
                    <td style={{ padding: 10 }}>{r.department ?? t("diseaseReports.dash")}</td>
                    <td style={{ padding: 10 }}>{r.commune ?? t("diseaseReports.dash")}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      {!r.dataQuality ? (
                        t("diseaseReports.dash")
                      ) : r.dataQuality.geoIncomplete ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: "rgba(217,119,6,0.15)",
                            color: "#92400e",
                            fontWeight: 600,
                          }}
                        >
                          {t("diseaseReports.badgeGeoIncomplete")}
                        </span>
                      ) : r.dataQuality.geoCommuneLinked ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: "rgba(22,163,74,0.14)",
                            color: "#166534",
                            fontWeight: 600,
                          }}
                        >
                          {t("diseaseReports.badgeGeoLinked")}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: "rgba(100,116,139,0.12)",
                            color: "#475569",
                            fontWeight: 600,
                          }}
                        >
                          {t("diseaseReports.badgeGeoFreeText")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 10, fontSize: 13, maxWidth: 200, color: "#334155" }}>
                      {msppPipelineLabel(r.msppReview)}
                    </td>
                    <td style={{ padding: 10 }}>{formatDate(r.onsetDate)}</td>
                    <td style={{ padding: 10, maxWidth: 180 }}>{truncateNote(r.notes, 48)}</td>
                    <td style={{ padding: 10 }}>
                      {r.patient ? `${r.patient.lastName}, ${r.patient.firstName}` : t("diseaseReports.dash")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
