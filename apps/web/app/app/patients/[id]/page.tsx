"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { apiFetch } from "@/lib/apiClient";
import { fetchChartSummary, type ChartSummary } from "@/lib/chartApi";
import { fetchPatientFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PatientHeaderCard, PatientSummaryTab, computeHeaderVitalsLine } from "@/components/patient-chart";
import { EnterprisePatientMedicalRecord } from "@/components/patient-chart/EnterprisePatientMedicalRecord";
import {
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsResponse,
  type PatientTriageVitalsSnapshot,
  hasMeaningfulVitalMeasurement,
  hasVitalsJson,
  buildVitalsTimelineNewestFirst,
  hasServerVitalsTimelineData,
  snapshotKey,
  vitalsTimelineFallbackFromChartSummary,
} from "@/lib/patientVitals";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { getPatientChartPrintHtml, printPatientChart } from "@/components/patient-chart/PatientChartPrintLayout";
import { MEDORA_CHART_RESULT_UPDATED, MEDORA_PATIENT_PROFILE_UPDATED } from "@/lib/chartEvents";
import { useI18n } from "@/lib/i18n";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const patientDetailPath = `/app/patients/${patientId}`;
  const [patient, setPatient] = useState<any>(null);
  const [chartSummary, setChartSummary] = useState<ChartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartLastFetchedAt, setChartLastFetchedAt] = useState<Date | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [vitalsTimeline, setVitalsTimeline] = useState<PatientTriageVitalsResponse | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [supersededVitals, setSupersededVitals] = useState<PatientTriageVitalsSnapshot[]>([]);
  const { facilityId, roles, ready: rolesReady, facilities } = useFacilityAndRoles();
  const { language, t } = useI18n();
  const triageLoadFailedRef = useRef(false);

  const clinicalChartAccess = rolesReady && (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));
  const canAccessPatientDetail = rolesReady && isAppPathAllowedForRoles(patientDetailPath, roles) && (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN") || roles.includes("FRONT_DESK"));
  const canEditPatientProfile = rolesReady && (roles.includes("FRONT_DESK") || roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));

  const loadPatient = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `patient:${facilityId}:${patientId}`;
    try {
      const data = await apiFetch(`/patients/${patientId}`, { facilityId });
      setPatient(data);
      void setCachedRecord("patient_summaries", cacheKey, data, { facilityId, patientId });
    } catch (e) {
      console.error("Failed to load patient:", e);
      const cached = await getCachedRecord<any>("patient_summaries", cacheKey);
      if (cached?.data) setPatient(cached.data);
    } finally { setLoading(false); }
  }, [facilityId, patientId]);

  const loadChartSummary = useCallback(async () => {
    if (!facilityId || !clinicalChartAccess) return;
    setChartLoading(true);
    const cacheKey = `chart-summary:${facilityId}:${patientId}:${language}`;
    try {
      const data = await fetchChartSummary(facilityId, patientId, language);
      setChartSummary(data);
      setChartLastFetchedAt(new Date());
      void setCachedRecord("patient_summaries", cacheKey, data, { facilityId, patientId });
    } catch (e) {
      console.error("Failed to load chart summary:", e);
      const cached = await getCachedRecord<ChartSummary>("patient_summaries", cacheKey);
      setChartSummary(cached?.data ?? null);
    } finally { setChartLoading(false); }
  }, [facilityId, patientId, language, clinicalChartAccess]);

  const loadFollowUps = useCallback(async () => {
    if (!facilityId || !clinicalChartAccess) return;
    try {
      const res = await fetchPatientFollowUps(facilityId, patientId, { limit: 50 });
      setFollowUps(res.items ?? []);
    } catch { setFollowUps([]); }
  }, [facilityId, patientId, clinicalChartAccess]);

  const loadPatientTriageVitals = useCallback(async () => {
    if (!facilityId || !patientId || !clinicalChartAccess) return;
    setVitalsLoading(true);
    try {
      const data = await apiFetch(`/patients/${patientId}/triage?latest=true`, { facilityId }) as PatientTriageVitalsResponse;
      triageLoadFailedRef.current = false;
      setVitalsTimeline({ latest: data?.latest ?? null, history: Array.isArray(data?.history) ? data.history : [] });
    } catch {
      triageLoadFailedRef.current = true;
      setVitalsTimeline(null);
    } finally { setVitalsLoading(false); }
  }, [facilityId, patientId, clinicalChartAccess]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!canAccessPatientDetail) {
      setLoading(false);
      router.replace(isAppPathAllowedForRoles("/app/patients", roles) ? "/app/patients" : getLandingRouteForRoles(roles));
    }
  }, [rolesReady, canAccessPatientDetail, roles, router]);

  useEffect(() => { if (canAccessPatientDetail && facilityId) void loadPatient(); }, [canAccessPatientDetail, facilityId, loadPatient]);
  useEffect(() => { if (clinicalChartAccess && facilityId) { void loadChartSummary(); void loadFollowUps(); void loadPatientTriageVitals(); } else { setChartSummary(null); setChartLoading(false); } }, [clinicalChartAccess, facilityId, loadChartSummary, loadFollowUps, loadPatientTriageVitals]);
  useEffect(() => { setSupersededVitals([]); triageLoadFailedRef.current = false; }, [patientId]);

  useEffect(() => {
    if (!clinicalChartAccess || !chartSummary || !triageLoadFailedRef.current || chartSummary.patient.id !== patientId) return;
    const fb = vitalsTimelineFallbackFromChartSummary({ patientId, recentEncounters: chartSummary.recentEncounters ?? [], latestVitalsJson: chartSummary.patient.latestVitalsJson, latestVitalsAt: chartSummary.patient.latestVitalsAt ?? null });
    if (fb.latest || fb.history.length > 0) { setVitalsTimeline(fb); triageLoadFailedRef.current = false; }
  }, [clinicalChartAccess, chartSummary, patientId]);

  useEffect(() => {
    const onProfileUpdated = (ev: Event) => { if ((ev as CustomEvent<{ patientId?: string }>).detail?.patientId === patientId) void loadPatient(); };
    window.addEventListener(MEDORA_PATIENT_PROFILE_UPDATED, onProfileUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_PROFILE_UPDATED, onProfileUpdated);
  }, [patientId, loadPatient]);

  useEffect(() => {
    if (!clinicalChartAccess) return;
    const onVitalsUpdated = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId: string; supersededSnapshot?: PatientTriageVitalsSnapshot | null }>;
      if (e.detail?.patientId !== patientId) return;
      if (e.detail.supersededSnapshot && hasVitalsJson(e.detail.supersededSnapshot.vitalsJson)) setSupersededVitals((prev) => prev.some((p) => snapshotKey(p) === snapshotKey(e.detail!.supersededSnapshot!)) ? prev : [e.detail!.supersededSnapshot!, ...prev]);
      void loadPatientTriageVitals(); void loadPatient(); void loadChartSummary();
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
  }, [clinicalChartAccess, patientId, loadPatientTriageVitals, loadPatient, loadChartSummary]);

  useEffect(() => {
    if (!clinicalChartAccess) return;
    const onChartResult = (ev: Event) => { if ((ev as CustomEvent<{ patientId?: string }>).detail?.patientId === patientId) { void loadChartSummary(); void loadPatientTriageVitals(); } };
    window.addEventListener(MEDORA_CHART_RESULT_UPDATED, onChartResult);
    return () => window.removeEventListener(MEDORA_CHART_RESULT_UPDATED, onChartResult);
  }, [clinicalChartAccess, patientId, loadChartSummary, loadPatientTriageVitals]);

  const latestVitalsJson = vitalsTimeline?.latest?.vitalsJson as Record<string, number | string | null | undefined> | undefined;
  const { line: headerVitalsLine, hasVitals: hasHeaderVitals } = computeHeaderVitalsLine(latestVitalsJson && hasMeaningfulVitalMeasurement(latestVitalsJson) ? latestVitalsJson : undefined, patient?.latestVitalsJson, language);
  const vitalsFullHistoryNewestFirst = clinicalChartAccess ? buildVitalsTimelineNewestFirst(vitalsTimeline?.latest ?? null, vitalsTimeline?.history ?? [], hasServerVitalsTimelineData(vitalsTimeline) ? [] : supersededVitals) : [];

  if (rolesReady && !canAccessPatientDetail) return null;
  if (loading) return <div style={{ padding: 24 }}>{t("patientChartUi.loading")}</div>;
  if (!patient) return <div style={{ padding: 24 }}>{t("patientChartUi.patientNotFound")}</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 8px 32px" }}>
      <EnterprisePatientMedicalRecord patientId={patientId} roleCodes={roles}>
        <PatientHeaderCard patient={patient} vitalsLoading={false} headerVitalsLine={headerVitalsLine} hasVitals={hasHeaderVitals} openEncounter={null} canOpenEncounterDetail={false} showEditButton={canEditPatientProfile} onEditClick={() => router.push(`/app/patients/${patientId}/profile`)} />
        {facilityId ? <ChartInsuranceReadOnlySummary patientId={patientId} facilityId={facilityId} /> : null}
        {clinicalChartAccess ? (
          <div style={{ marginTop: 16, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", padding: "20px 22px" }}>
            <PatientSummaryTab chartSummary={chartSummary} chartLoading={chartLoading} chartLastFetchedAt={chartLastFetchedAt} facilityId={facilityId} canPrescribe={false} vitalsFullHistory={vitalsFullHistoryNewestFirst} vitalsHistoryLoading={vitalsLoading} onRefresh={() => { void loadChartSummary(); void loadPatientTriageVitals(); }} onAddDiagnosis={() => undefined} onTabResults={() => undefined} followUps={followUps} followUpsLoading={false} onRefreshFollowUps={() => undefined} onAddFollowUp={() => undefined} onPrintMedicalRecord={chartSummary ? () => printPatientChart(() => getPatientChartPrintHtml({ chartSummary, followUps, facilityName: facilities.find((f) => f.id === facilityId)?.name, language }), language) : undefined} />
          </div>
        ) : null}
      </EnterprisePatientMedicalRecord>
    </div>
  );
}

function ChartInsuranceReadOnlySummary({ patientId, facilityId }: { patientId: string; facilityId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = React.useState<Array<{ rank: string; payerNameFreeText: string | null; planName?: string | null; memberId?: string | null; payer?: { name?: string | null } | null }>>([]);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => { let cancelled = false; void (async () => { try { const data = await apiFetch(`/patients/${patientId}/insurance`, { facilityId }); if (!cancelled) setRows(Array.isArray(data) ? data : []); } finally { if (!cancelled) setLoaded(true); } })(); return () => { cancelled = true; }; }, [patientId, facilityId]);
  if (!loaded) return null;
  const renderRow = (label: string, row: typeof rows[number] | undefined) => { const name = row?.payer?.name || row?.payerNameFreeText?.trim(); return <div style={{ fontSize: 13, marginBottom: 4, color: name ? "#334155" : "#94a3b8" }}><strong>{label}: </strong>{name ? <>{name}{row?.planName ? ` · ${row.planName}` : ""}{row?.memberId ? ` · ${t("chartInsuranceSummary.memberIdLabel")}: ${row.memberId}` : ""}</> : t("chartInsuranceSummary.noneOnFile")}</div>; };
  return <div id="patient-registration-insurance" className="no-print" style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fafafa" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><strong style={{ fontSize: 14 }}>{t("chartInsuranceSummary.heading")}</strong><Link href={`/app/registration?patient=${patientId}`} style={{ fontSize: 12, fontWeight: 600, color: "#1565c0" }}>{t("chartInsuranceSummary.editInRegistration")}</Link></div>{renderRow(t("chartInsuranceSummary.primaryLabel"), rows.find((r) => r.rank === "PRIMARY"))}{renderRow(t("chartInsuranceSummary.secondaryLabel"), rows.find((r) => r.rank === "SECONDARY"))}</div>;
}
