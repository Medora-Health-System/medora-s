"use client";

import React, { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { formatPrimaryIdentifierForDisplay } from "@/lib/patientDisplay";
import {
  fetchDiseaseReports,
  fetchDiseaseReportsNational,
  fetchHaitiGeoReference,
  fetchHaitiGeoReferenceNational,
  type DiseaseCaseReportRow,
  type HaitiGeoDepartment,
  type HaitiGeoCommune,
} from "@/lib/publicHealthApi";
import { MsppFacilityFeedbackPanel } from "@/features/public-health/MsppFacilityFeedbackPanel";
import { DiseaseReportForm } from "@/features/public-health/disease-report-form";
import { PublicHealthFacilityRequiredBlock } from "@/features/public-health/PublicHealthFacilityRequiredBlock";
import { inputStyle } from "@/components/pharmacy/Modal";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: 24,
  borderRadius: 16,
  marginBottom: 20,
  border: "1px solid #e2e8f0",
};

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
  const {
    facilityId,
    facilities,
    ready,
    canViewPublicHealthDiseaseReports,
    isMsppOnlyUser,
    msppRoles,
  } = useFacilityAndRoles();
  const facilityName = facilities.find((f) => f.id === facilityId)?.name ?? "";
  const nationalRead = Boolean(isMsppOnlyUser && canViewPublicHealthDiseaseReports);
  /** Aligné API : identifiants opérationnels (y compris dossier global type UUID) lorsque le backend expose l’identité. */
  const showOperationalPatientIdentifier =
    nationalRead ||
    msppRoles.includes("MSPP_ADMIN") ||
    msppRoles.includes("MSPP_DISEASE_REPORTS");

  const [geoDepartments, setGeoDepartments] = useState<HaitiGeoDepartment[]>([]);
  const [communesByDept, setCommunesByDept] = useState<Record<string, HaitiGeoCommune[]>>({});

  useEffect(() => {
    if (!canViewPublicHealthDiseaseReports) return;
    if (!nationalRead && !facilityId) return;
    let cancelled = false;
    const p = nationalRead ? fetchHaitiGeoReferenceNational() : fetchHaitiGeoReference(facilityId!);
    void p
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
  }, [facilityId, canViewPublicHealthDiseaseReports, nationalRead]);

  const [reports, setReports] = useState<DiseaseCaseReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCommune, setFilterCommune] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDiseaseName, setFilterDiseaseName] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!canViewPublicHealthDiseaseReports) return;
    if (!nationalRead && !facilityId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filterStatus) params.status = filterStatus;
      if (filterCommune) params.commune = filterCommune;
      if (filterDepartment) params.department = filterDepartment;
      if (filterDiseaseName) params.diseaseName = filterDiseaseName;
      if (filterFrom) params.reportedFrom = filterFrom;
      if (filterTo) params.reportedTo = filterTo;
      const res = nationalRead
        ? await fetchDiseaseReportsNational(params)
        : await fetchDiseaseReports(facilityId!, params);
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
    canViewPublicHealthDiseaseReports,
    nationalRead,
    filterStatus,
    filterCommune,
    filterDepartment,
    filterDiseaseName,
    filterFrom,
    filterTo,
  ]);

  useEffect(() => {
    if (!ready || !canViewPublicHealthDiseaseReports) return;
    if (nationalRead || facilityId) void loadReports();
  }, [ready, facilityId, canViewPublicHealthDiseaseReports, nationalRead, loadReports]);

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

  const feedbackBadge = (r: DiseaseCaseReportRow) => {
    const fb = r.msppFeedback;
    if (!fb || (fb.pendingCount === 0 && fb.actionRequiredCount === 0)) {
      return <span style={{ color: "#94a3b8" }}>{t("diseaseReports.dash")}</span>;
    }
    if (fb.actionRequiredCount > 0) {
      return (
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 9999,
            background: "rgba(220,38,38,0.12)",
            color: "#b91c1c",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {t("diseaseReports.msppFeedbackBadgeAction").replace("{n}", String(fb.actionRequiredCount))}
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 9999,
          background: "rgba(217,119,6,0.15)",
          color: "#92400e",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {t("diseaseReports.msppFeedbackBadgePending").replace("{n}", String(fb.pendingCount))}
      </span>
    );
  };

  const tableColSpan = nationalRead ? 13 : 12;

  if (!ready) return <p>{t("diseaseReports.loadingPage")}</p>;
  if (!canViewPublicHealthDiseaseReports) {
    return (
      <div>
        <h1>{t("diseaseReports.title")}</h1>
        <p>{t("diseaseReports.accessDenied")}</p>
      </div>
    );
  }
  if (!nationalRead && !facilityId) {
    return <PublicHealthFacilityRequiredBlock />;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("diseaseReports.title")}</h1>
      {nationalRead ? (
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 12,
            fontSize: 14,
            color: "#14532d",
            maxWidth: 720,
          }}
        >
          <strong>{t("publicHealthNational.readOnlyBanner")}</strong>
          {" — "}
          {t("publicHealthNational.actionsNeedFacility")}
        </div>
      ) : null}
      <p style={{ color: "#475569", fontSize: 14, marginBottom: 8, maxWidth: 720, lineHeight: 1.5 }}>
        {t("diseaseReports.introMspp")}
      </p>
      {!nationalRead && facilityName ? (
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

      {!nationalRead && facilityId ? (
        <DiseaseReportForm
          facilityId={facilityId}
          onCreated={() => void loadReports()}
          geoDepartments={geoDepartments}
          communesByDept={communesByDept}
        />
      ) : null}

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
            <option value="SUSPECTED">{t("diseaseReports.statuses.SUSPECTED")}</option>
            <option value="CONFIRMED">{t("diseaseReports.statuses.CONFIRMED")}</option>
            <option value="RULED_OUT">{t("diseaseReports.statuses.RULED_OUT")}</option>
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
          <button type="button" onClick={() => void loadReports()} style={{ padding: "8px 14px", borderRadius: 8 }}>
            {t("diseaseReports.applyFilters")}
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("diseaseReports.countReports").replace("{count}", String(total))}</p>
        {loading ? (
          <p>{t("diseaseReports.tableLoading")}</p>
        ) : reports.length === 0 ? (
          <p>{t("diseaseReports.tableEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableDeclaredOn")}</th>
                  {nationalRead ? (
                    <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableFacility")}</th>
                  ) : null}
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tablePatient")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableIdentifier")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableDisease")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableCode")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableStatus")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableDepartment")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableCommune")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableOnset")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableClinicalPreview")}</th>
                  <th style={{ padding: "8px 6px" }}>{t("diseaseReports.tableMsppPipeline")}</th>
                  <th style={{ padding: "8px 6px", minWidth: 140 }}>{t("diseaseReports.tableMsppFeedback")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const idDisplay = formatPrimaryIdentifierForDisplay(r.patientPrimaryIdentifier, {
                    allowUuidLike: showOperationalPatientIdentifier,
                  });
                  return (
                    <Fragment key={r.id}>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{formatDate(r.reportedAt)}</td>
                        {nationalRead ? (
                          <td style={{ padding: "8px 6px" }}>
                            {r.facilityName?.trim() ? r.facilityName.trim() : t("diseaseReports.dash")}
                          </td>
                        ) : null}
                        <td style={{ padding: "8px 6px" }}>
                          {r.patientFullName?.trim() ? r.patientFullName.trim() : t("diseaseReports.dash")}
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          {idDisplay ?? t("diseaseReports.dash")}
                        </td>
                        <td style={{ padding: "8px 6px" }}>{r.diseaseName}</td>
                        <td style={{ padding: "8px 6px" }}>{r.diseaseCode}</td>
                        <td style={{ padding: "8px 6px" }}>{statusLabel(r.status)}</td>
                        <td style={{ padding: "8px 6px" }}>{r.department ?? t("diseaseReports.dash")}</td>
                        <td style={{ padding: "8px 6px" }}>{r.commune ?? t("diseaseReports.dash")}</td>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{formatDate(r.onsetDate)}</td>
                        <td style={{ padding: "8px 6px", maxWidth: 200 }}>
                          {truncateNote(r.clinicalSummary || r.notes, 80)}
                        </td>
                        <td style={{ padding: "8px 6px", fontSize: 12 }}>{msppPipelineLabel(r.msppReview)}</td>
                        <td style={{ padding: "8px 6px", fontSize: 12, verticalAlign: "top" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                            {feedbackBadge(r)}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReportId((cur) => (cur === r.id ? null : r.id))
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                background: expandedReportId === r.id ? "#e2e8f0" : "#fff",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              {expandedReportId === r.id
                                ? t("diseaseReports.msppFeedbackToggleHide")
                                : t("diseaseReports.msppFeedbackToggleShow")}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedReportId === r.id ? (
                        <tr>
                          <td colSpan={tableColSpan} style={{ padding: "6px 8px 14px", background: "#fafafa" }}>
                            <MsppFacilityFeedbackPanel
                              reportId={r.id}
                              facilityId={nationalRead ? null : facilityId ?? null}
                              nationalMsppReadonly={nationalRead}
                              onFeedbackUpdated={() => void loadReports()}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
