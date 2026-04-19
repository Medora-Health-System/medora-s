"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { apiFetch } from "@/lib/apiClient";
import { fetchChartSummary, createDiagnosis, type ChartSummary } from "@/lib/chartApi";
import { fetchPatientFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import { ChartSection, tableStyles, btnPrimary, btnSecondary } from "@/components/chart/ChartSection";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  PatientHeaderCard,
  PatientQuickActions,
  PatientSummaryTab,
  PatientConsultationsTab,
  PatientVaccinationsTab,
  CreateFollowUpModal,
  PatientPrimaryInsurancePanel,
  computeHeaderVitalsLine,
} from "@/components/patient-chart";
import {
  PatientAuditTimelineTabContent,
  PatientOrdersTabContent,
  PatientResultsTabContent,
  PatientImagingTabContent,
  PatientMedicationsTabContent,
} from "@/components/patient-chart/PatientChartClinicalTabs";
import {
  formatEncounterChromeDate,
  tEncounterType,
  tFollowUpStatus,
} from "@/lib/encounterChromeI18n";
import {
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsResponse,
  type PatientTriageVitalsSnapshot,
  hasVitalsJson,
  buildVitalsTimelineNewestFirst,
  hasServerVitalsTimelineData,
  snapshotKey,
  vitalsTimelineFallbackFromChartSummary,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { getPatientChartPrintHtml, printPatientChart } from "@/components/patient-chart/PatientChartPrintLayout";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const patientDetailPath = `/app/patients/${patientId}`;
  const [patient, setPatient] = useState<any>(null);
  const [chartSummary, setChartSummary] = useState<ChartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddDiagnosisModal, setShowAddDiagnosisModal] = useState(false);
  const [showAddFollowUpModal, setShowAddFollowUpModal] = useState(false);
  const [chartLastFetchedAt, setChartLastFetchedAt] = useState<Date | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [deskEncounters, setDeskEncounters] = useState<any[]>([]);
  const [pendingOpenCreateEncounter, setPendingOpenCreateEncounter] = useState(false);
  const [vitalsTimeline, setVitalsTimeline] = useState<PatientTriageVitalsResponse | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [supersededVitals, setSupersededVitals] = useState<PatientTriageVitalsSnapshot[]>([]);
  const { facilityId, canPrescribe, roles, ready: rolesReady, facilities } = useFacilityAndRoles();
  const { language, t } = useI18n();
  const triageLoadFailedRef = useRef(false);

  useEffect(() => {
    setSupersededVitals([]);
    triageLoadFailedRef.current = false;
  }, [patientId]);

  const clinicalChartAccess =
    rolesReady &&
    (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));
  /** Aligné sur GET /patients/:id — pas d’accès dossier pour lab / imagerie / pharmacie seuls. */
  const canAccessPatientDetail =
    rolesReady &&
    isAppPathAllowedForRoles(patientDetailPath, roles) &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK"));
  const isProviderLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const isRNOnly = roles.includes("RN") && !isProviderLike;
  /** Accueil seul n’a pas accès à `/app/patients/[id]` — pas de parcours « accueil » sur cette route. */
  const isFrontDeskQuick = false;
  const isBillingOnlyQuick =
    rolesReady && roles.includes("BILLING") && !clinicalChartAccess;
  /** Liens « Ouvrir la consultation » — aligné sur GET /encounters/:id. */
  const canOpenClinicalEncounterDetail =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("FRONT_DESK"));

  const loadPatient = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `patient:${facilityId}:${patientId}`;
    try {
      const data = await apiFetch(`/patients/${patientId}`, { facilityId });
      setPatient(data);
      void setCachedRecord("patient_summaries", cacheKey, data, {
        facilityId,
        patientId,
      });
    } catch (e) {
      console.error("Failed to load patient:", e);
      const cached = await getCachedRecord<any>("patient_summaries", cacheKey);
      if (cached?.data) setPatient(cached.data);
    } finally {
      setLoading(false);
    }
  }, [facilityId, patientId]);

  const loadChartSummary = useCallback(async () => {
    if (!facilityId) return;
    setChartLoading(true);
    const cacheKey = `chart-summary:${facilityId}:${patientId}`;
    try {
      const data = await fetchChartSummary(facilityId, patientId);
      setChartSummary(data);
      setChartLastFetchedAt(new Date());
      void setCachedRecord("patient_summaries", cacheKey, data, { facilityId, patientId });
    } catch (e) {
      console.error("Failed to load chart summary:", e);
      const cached = await getCachedRecord<ChartSummary>("patient_summaries", cacheKey);
      setChartSummary(cached?.data ?? null);
    } finally {
      setChartLoading(false);
    }
  }, [facilityId, patientId]);

  const loadFollowUps = useCallback(async () => {
    if (!facilityId) return;
    setFollowUpsLoading(true);
    const cacheKey = `patient-followups:${facilityId}:${patientId}`;
    try {
      const res = await fetchPatientFollowUps(facilityId, patientId, { limit: 50 });
      setFollowUps(res.items ?? []);
      void setCachedRecord("followups", cacheKey, res.items ?? [], { facilityId, patientId });
    } catch (e) {
      console.error("Failed to load follow-ups:", e);
      const cached = await getCachedRecord<FollowUpRow[]>("followups", cacheKey);
      setFollowUps(cached?.data ?? []);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [facilityId, patientId]);

  const loadDeskEncounters = useCallback(async () => {
    if (!facilityId) return;
    const cacheKey = `desk-encounters:${facilityId}:${patientId}`;
    try {
      const data = await apiFetch(`/patients/${patientId}/encounters?limit=15`, { facilityId });
      setDeskEncounters(Array.isArray(data) ? data : []);
      void setCachedRecord("encounter_summaries", cacheKey, Array.isArray(data) ? data : [], {
        facilityId,
        patientId,
      });
    } catch (e) {
      console.error("Failed to load encounters:", e);
      const cached = await getCachedRecord<any[]>("encounter_summaries", cacheKey);
      setDeskEncounters(cached?.data ?? []);
    }
  }, [facilityId, patientId]);

  /** GET /api/backend/patients/:id/triage?latest=true — dernier relevé + historique côté API. */
  const loadPatientTriageVitals = useCallback(async () => {
    if (!facilityId || !patientId) return;
    setVitalsLoading(true);
    const cacheKey = `latest-vitals:${facilityId}:${patientId}`;
    try {
      const data = (await apiFetch(`/patients/${patientId}/triage?latest=true`, {
        facilityId,
      })) as PatientTriageVitalsResponse;
      triageLoadFailedRef.current = false;
      setVitalsTimeline({
        latest: data?.latest ?? null,
        history: Array.isArray(data?.history) ? data.history : [],
      });
      void setCachedRecord("latest_vitals", cacheKey, {
        latest: data?.latest ?? null,
        history: Array.isArray(data?.history) ? data.history : [],
      }, { facilityId, patientId });
    } catch (e) {
      console.error("Failed to load patient triage vitals:", e);
      triageLoadFailedRef.current = true;
      const cached = await getCachedRecord<PatientTriageVitalsResponse>("latest_vitals", cacheKey);
      if (cached?.data) {
        triageLoadFailedRef.current = false;
        setVitalsTimeline(cached.data);
      } else {
        setVitalsTimeline(null);
      }
    } finally {
      setVitalsLoading(false);
    }
  }, [facilityId, patientId]);

  /** Si /patients/:id/triage échoue, réinjecter une timeline dès que le chart-summary (cache ou réseau) est disponible. */
  useEffect(() => {
    if (!clinicalChartAccess || !chartSummary || !triageLoadFailedRef.current) return;
    if (chartSummary.patient.id !== patientId) return;
    const fb = vitalsTimelineFallbackFromChartSummary({
      patientId,
      recentEncounters: chartSummary.recentEncounters ?? [],
      latestVitalsJson: chartSummary.patient.latestVitalsJson,
      latestVitalsAt: chartSummary.patient.latestVitalsAt ?? null,
    });
    if (fb.latest || fb.history.length > 0) {
      setVitalsTimeline(fb);
      triageLoadFailedRef.current = false;
    }
  }, [clinicalChartAccess, chartSummary, patientId]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!isAppPathAllowedForRoles(patientDetailPath, roles)) {
      setLoading(false);
      router.replace(
        isAppPathAllowedForRoles("/app/patients", roles) ? "/app/patients" : getLandingRouteForRoles(roles)
      );
      return;
    }
    if (
      !(
        roles.includes("RN") ||
        roles.includes("PROVIDER") ||
        roles.includes("ADMIN") ||
        roles.includes("FRONT_DESK")
      )
    ) {
      setLoading(false);
      router.replace(getLandingRouteForRoles(roles));
    }
  }, [rolesReady, patientDetailPath, roles, router]);

  useEffect(() => {
    if (patientId && facilityId && canAccessPatientDetail) {
      loadPatient();
    }
  }, [patientId, facilityId, canAccessPatientDetail, loadPatient]);

  useEffect(() => {
    if (!patientId || !facilityId || !canAccessPatientDetail) return;
    if (clinicalChartAccess) {
      loadChartSummary();
      loadDeskEncounters();
    } else {
      setChartSummary(null);
      loadDeskEncounters();
    }
    loadFollowUps();
  }, [
    patientId,
    facilityId,
    canAccessPatientDetail,
    clinicalChartAccess,
    loadChartSummary,
    loadDeskEncounters,
    loadFollowUps,
  ]);

  useEffect(() => {
    if (!patientId || !facilityId || !canAccessPatientDetail || !clinicalChartAccess) {
      setVitalsTimeline(null);
      setSupersededVitals([]);
      return;
    }
    loadPatientTriageVitals();
  }, [patientId, facilityId, canAccessPatientDetail, clinicalChartAccess, loadPatientTriageVitals]);

  useEffect(() => {
    const onVitalsUpdated = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId: string; supersededSnapshot?: PatientTriageVitalsSnapshot | null }>;
      if (e.detail?.patientId !== patientId) return;
      if (e.detail.supersededSnapshot && hasVitalsJson(e.detail.supersededSnapshot.vitalsJson)) {
        setSupersededVitals((prev) => {
          const snap = e.detail!.supersededSnapshot!;
          const k = snapshotKey(snap);
          if (prev.some((p) => snapshotKey(p) === k)) return prev;
          return [snap, ...prev];
        });
      }
      loadPatientTriageVitals();
      void loadPatient();
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
  }, [patientId, loadPatientTriageVitals, loadPatient]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!clinicalChartAccess && activeTab === "vaccinations") {
      setActiveTab("summary");
    }
  }, [rolesReady, clinicalChartAccess, activeTab]);

  useEffect(() => {
    if (!clinicalChartAccess) return;
    const onChartResult = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId?: string }>;
      if (e.detail?.patientId !== patientId) return;
      void loadChartSummary();
      void loadPatientTriageVitals();
    };
    window.addEventListener(MEDORA_CHART_RESULT_UPDATED, onChartResult);
    return () => window.removeEventListener(MEDORA_CHART_RESULT_UPDATED, onChartResult);
  }, [clinicalChartAccess, patientId, loadChartSummary, loadPatientTriageVitals]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return formatEncounterChromeDate(dateStr, language);
  };

  const openEncounterFromChart =
    clinicalChartAccess && chartSummary
      ? chartSummary.recentEncounters.find((e) => e.status === "OPEN")
      : undefined;
  const openEncounterFromDesk = deskEncounters.find((e: { status?: string }) => e.status === "OPEN");
  const openEncounter = openEncounterFromChart ?? openEncounterFromDesk;

  const latestVitalsJson = vitalsTimeline?.latest?.vitalsJson as
    | Record<string, number | string | null | undefined>
    | undefined;
  const hasClinicalLatestVitals = Boolean(latestVitalsJson && hasVitalsJson(latestVitalsJson));

  const { line: headerVitalsLine, hasVitals: hasHeaderVitals } = computeHeaderVitalsLine(
    hasClinicalLatestVitals ? latestVitalsJson : undefined,
    patient?.latestVitalsJson,
    language
  );

  const headerVitalsLoading = clinicalChartAccess && vitalsLoading && !hasHeaderVitals;

  const vitalsFullHistoryNewestFirst = clinicalChartAccess
    ? buildVitalsTimelineNewestFirst(
        vitalsTimeline?.latest ?? null,
        vitalsTimeline?.history ?? [],
        hasServerVitalsTimelineData(vitalsTimeline) ? [] : supersededVitals
      )
    : [];

  const canEditPatient =
    rolesReady &&
    (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));

  const canEditInsurance =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK") ||
      roles.includes("BILLING"));

  const tabs = useMemo(
    () => [
      { id: "summary", label: t("patientChartUi.tabsSummary") },
      { id: "encounters", label: t("patientChartUi.tabsEncounters") },
      ...(clinicalChartAccess ? [{ id: "history" as const, label: t("patientChartUi.tabsChartHistory") }] : []),
      ...(clinicalChartAccess ? [{ id: "vaccinations" as const, label: t("patientChartUi.tabsVaccinations") }] : []),
      { id: "notes", label: t("patientChartUi.tabsNotes") },
      { id: "orders", label: t("patientChartUi.tabsOrders") },
      { id: "results", label: t("patientChartUi.tabsResults") },
      { id: "medications", label: t("patientChartUi.tabsMedications") },
      { id: "imaging", label: t("patientChartUi.tabsImaging") },
    ],
    [t, clinicalChartAccess]
  );

  if (rolesReady && !canAccessPatientDetail) {
    return null;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>{t("patientChartUi.loading")}</div>;
  }

  if (!patient) {
    return <div style={{ padding: 24 }}>{t("patientChartUi.patientNotFound")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 8px 32px" }}>
      <div style={{ marginBottom: 14 }}>
        <PatientHeaderCard
          patient={patient}
          vitalsLoading={headerVitalsLoading}
          headerVitalsLine={headerVitalsLine}
          hasVitals={hasHeaderVitals}
          openEncounter={openEncounter ?? null}
          canOpenEncounterDetail={canOpenClinicalEncounterDetail}
          administrativeShell={false}
          showEditButton={canEditPatient}
          onEditClick={() => setShowEditModal(true)}
        />

        <PatientQuickActions
          clinicalChartAccess={clinicalChartAccess}
          isRNOnly={isRNOnly}
          isProviderLike={isProviderLike}
          isFrontDeskQuick={isFrontDeskQuick}
          isBillingOnlyQuick={isBillingOnlyQuick}
          openEncounter={openEncounter}
          canOpenEncounterDetail={canOpenClinicalEncounterDetail}
          canPrescribe={canPrescribe}
          chartSummaryReady={Boolean(chartSummary)}
          onTabEncounters={() => setActiveTab("encounters")}
          onTabResults={() => setActiveTab("results")}
          onTabSummary={() => setActiveTab("summary")}
          onAddDiagnosis={() => setShowAddDiagnosisModal(true)}
          onAddFollowUp={() => setShowAddFollowUpModal(true)}
          onEditPatient={() => setShowEditModal(true)}
          onPendingCreateEncounter={() => setPendingOpenCreateEncounter(true)}
        />

        {facilityId && (
          <>
            <div className="no-print" style={{ marginTop: 12, marginBottom: 8 }}>
              <Link
                href={`/app/patients/${patientId}/facesheet`}
                style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}
              >
                {t("facesheet.linkFromChart")}
              </Link>
            </div>
            <PatientPrimaryInsurancePanel
              patientId={patientId}
              facilityId={facilityId}
              canEdit={canEditInsurance}
              onSaved={() => void loadPatient()}
            />
          </>
        )}
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0,
            borderBottom: "1px solid #e8e8e8",
            backgroundColor: "#fafafa",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "#fff" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? "#111" : "#616161",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 22px" }}>
          {activeTab === "summary" && clinicalChartAccess && (
            <PatientSummaryTab
              chartSummary={chartSummary}
              chartLoading={chartLoading}
              chartLastFetchedAt={chartLastFetchedAt}
              facilityId={facilityId}
              canPrescribe={canPrescribe}
              vitalsFullHistory={vitalsFullHistoryNewestFirst}
              vitalsHistoryLoading={vitalsLoading}
              onRefresh={() => {
                void loadChartSummary();
                void loadPatientTriageVitals();
              }}
              onAddDiagnosis={() => setShowAddDiagnosisModal(true)}
              onTabResults={() => setActiveTab("results")}
              followUps={followUps}
              followUpsLoading={followUpsLoading}
              onRefreshFollowUps={loadFollowUps}
              onAddFollowUp={() => setShowAddFollowUpModal(true)}
              onPrintMedicalRecord={
                chartSummary
                  ? () =>
                      printPatientChart(
                        () =>
                          getPatientChartPrintHtml({
                            chartSummary,
                            followUps: followUps ?? [],
                            facilityName: facilities.find((f) => f.id === facilityId)?.name,
                            language,
                          }),
                        language
                      )
                  : undefined
              }
            />
          )}
          {activeTab === "summary" && !clinicalChartAccess && (
            <FrontDeskSummaryTab
              followUps={followUps}
              followUpsLoading={followUpsLoading}
              onGoEncounters={() => setActiveTab("encounters")}
            />
          )}
          {activeTab === "history" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientAuditTimelineTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderHistory")}</div>
            ))}
          {activeTab === "encounters" && (
            <PatientConsultationsTab
              patientId={patientId}
              facilityId={facilityId}
              canOpenEncounterDetail={canOpenClinicalEncounterDetail}
              administrativeOnly={false}
              pendingOpenCreateEncounter={pendingOpenCreateEncounter}
              onConsumedPendingOpenCreate={() => setPendingOpenCreateEncounter(false)}
              onEncounterCreated={() => {
                if (clinicalChartAccess) {
                  loadChartSummary();
                  loadPatientTriageVitals();
                } else loadDeskEncounters();
                loadFollowUps();
                loadPatient();
              }}
            />
          )}
          {activeTab === "vaccinations" && <PatientVaccinationsTab patientId={patientId} facilityId={facilityId} />}
          {activeTab === "notes" && (
            <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderNotes")}</div>
          )}
          {activeTab === "orders" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientOrdersTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderOrders")}</div>
            ))}
          {activeTab === "results" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientResultsTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderResults")}</div>
            ))}
          {activeTab === "medications" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientMedicationsTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderMedications")}</div>
            ))}
          {activeTab === "imaging" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientImagingTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>{t("patientChartUi.placeholderImaging")}</div>
            ))}
        </div>
      </div>

      {showAddDiagnosisModal && chartSummary && (
        <AddDiagnosisModal
          facilityId={facilityId}
          recentEncounters={chartSummary.recentEncounters}
          onClose={() => setShowAddDiagnosisModal(false)}
          onSuccess={() => {
            setShowAddDiagnosisModal(false);
            loadChartSummary();
          }}
        />
      )}

      {showAddFollowUpModal && (
        <CreateFollowUpModal
          facilityId={facilityId}
          patientId={patientId}
          lockedPatientLabel={
            patient ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || undefined : undefined
          }
          recentEncounters={chartSummary?.recentEncounters ?? []}
          onClose={() => setShowAddFollowUpModal(false)}
          onSuccess={() => {
            setShowAddFollowUpModal(false);
            void loadFollowUps();
          }}
        />
      )}

      {showEditModal && (
        <EditPatientModal
          patient={patient}
          facilityId={facilityId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadPatient();
          }}
        />
      )}
    </div>
  );
}

const emptyStateStyle: React.CSSProperties = {
  padding: "20px 16px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

function FrontDeskSummaryTab({
  followUps,
  followUpsLoading,
  onGoEncounters,
}: {
  followUps: FollowUpRow[];
  followUpsLoading: boolean;
  onGoEncounters: () => void;
}) {
  const { t, language } = useI18n();
  const formatDate = (d: string | null | undefined) =>
    d ? formatEncounterChromeDate(d, language) : t("common.dash");
  return (
    <div>
      <div
        style={{
          padding: "14px 16px",
          marginBottom: 18,
          borderRadius: 8,
          background: "linear-gradient(135deg, #e8f4fd 0%, #fff9e6 100%)",
          border: "1px solid #b3d9f2",
          fontSize: 14,
          color: "#37474f",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "#0d47a1" }}>{t("patientChartUi.frontDeskLead")}</strong>{" "}
        {t("patientChartUi.frontDeskBody")}
      </div>
      <button type="button" style={{ ...btnPrimary, marginBottom: 20 }} onClick={onGoEncounters}>
        {t("patientChartUi.frontDeskGoEncounters")}
      </button>
      <ChartSection title={t("patientChartUi.frontDeskFollowUpsTitle")}>
        {followUpsLoading ? (
          <div style={emptyStateStyle}>{t("patientChartUi.frontDeskLoading")}</div>
        ) : followUps.length === 0 ? (
          <div style={emptyStateStyle}>{t("patientChartUi.frontDeskNoFollowUps")}</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>{t("patientChartUi.frontDeskThDue")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.frontDeskThReason")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.frontDeskThStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map((fu) => (
                <tr key={fu.id}>
                  <td style={tableStyles.td}>{formatDate(fu.dueDate)}</td>
                  <td style={tableStyles.td}>{fu.reason || t("common.dash")}</td>
                  <td style={tableStyles.td}>{tFollowUpStatus(t, fu.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>
    </div>
  );
}


function AddDiagnosisModal({
  facilityId,
  recentEncounters,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  recentEncounters: ChartSummary["recentEncounters"];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, language } = useI18n();
  const [encounterId, setEncounterId] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ encounter?: string; code?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errs: { encounter?: string; code?: string } = {};
    if (!encounterId.trim()) errs.encounter = t("patientChartUi.addDiagnosisErrEncounter");
    if (!code.trim()) errs.code = t("patientChartUi.addDiagnosisErrCode");
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await createDiagnosis(facilityId, encounterId, {
        code: code.trim(),
        description: description.trim() || undefined,
        onsetDate: onsetDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(normalizeUserFacingError(err?.message) || t("patientChartUi.addDiagnosisError"));
    } finally {
      setSubmitting(false);
    }
  };

  const encounterLabel = (e: ChartSummary["recentEncounters"][0]) => {
    const reason = e.visitReason || e.chiefComplaint;
    const parts = [tEncounterType(t, e.type ?? ""), formatEncounterChromeDate(e.createdAt, language)];
    if (reason) parts.push(reason.length > 40 ? reason.slice(0, 40) + "…" : reason);
    return parts.join(" · ");
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", borderRadius: 8, padding: 24, maxWidth: 480, width: "90%" }}>
        <h3 style={{ margin: "0 0 4px 0" }}>{t("patientChartUi.addDiagnosisTitle")}</h3>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{t("patientChartUi.addDiagnosisIntro")}</p>
        {recentEncounters.length === 0 ? (
          <>
            <div style={{ ...emptyStateStyle, marginBottom: 16 }}>{t("patientChartUi.addDiagnosisEmpty")}</div>
            <button type="button" style={btnSecondary} onClick={onClose}>
              {t("patientChartUi.addDiagnosisClose")}
            </button>
          </>
        ) : success ? (
          <div style={{ padding: "16px 0", color: "#2e7d32", fontSize: 15 }}>{t("patientChartUi.addDiagnosisSuccess")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
                {t("patientChartUi.addDiagnosisEncounterLabel")}
              </label>
              <select
                value={encounterId}
                onChange={(e) => { setEncounterId(e.target.value); setFieldErrors((prev) => ({ ...prev, encounter: undefined })); }}
                style={{ width: "100%", padding: 10, fontSize: 14, border: fieldErrors.encounter ? "1px solid #c62828" : "1px solid #ccc", borderRadius: 4 }}
                aria-invalid={!!fieldErrors.encounter}
              >
                <option value="">{t("patientChartUi.addDiagnosisEncounterPlaceholder")}</option>
                {recentEncounters.map((e) => (
                  <option key={e.id} value={e.id}>{encounterLabel(e)}</option>
                ))}
              </select>
              {fieldErrors.encounter && <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.encounter}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("patientChartUi.addDiagnosisCommonLabel")}</label>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    const d = COMMON_DIAGNOSES.find((x) => `${x.code} - ${x.label}` === v);
                    if (d) {
                      setCode(d.code);
                      setDescription(d.label);
                      setFieldErrors((prev) => ({ ...prev, code: undefined }));
                    }
                  }
                }}
                style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
                aria-label={t("patientChartUi.addDiagnosisCommonAria")}
              >
                <option value="">{t("patientChartUi.addDiagnosisCommonPlaceholder")}</option>
                {COMMON_DIAGNOSES.map((d) => (
                  <option key={d.code} value={`${d.code} - ${d.label}`}>
                    {d.code} — {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>{t("patientChartUi.addDiagnosisCodeLabel")}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setFieldErrors((prev) => ({ ...prev, code: undefined })); }}
                style={{ width: "100%", padding: 10, fontSize: 14, border: fieldErrors.code ? "1px solid #c62828" : "1px solid #ccc", borderRadius: 4 }}
                placeholder="ex. I10, J06.9"
                aria-invalid={!!fieldErrors.code}
              />
              {fieldErrors.code && <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.code}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("patientChartUi.addDiagnosisDescriptionLabel")}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
                placeholder={t("patientChartUi.addDiagnosisOptionalPh")}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("patientChartUi.addDiagnosisOnsetLabel")}</label>
              <input type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>{t("patientChartUi.addDiagnosisNotesLabel")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
                placeholder={t("patientChartUi.addDiagnosisOptionalPh")}
              />
            </div>
            {error && <div style={{ color: "#c62828", marginBottom: 12, fontSize: 14 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnSecondary} onClick={onClose}>
                {t("patientChartUi.addDiagnosisCancel")}
              </button>
              <button type="submit" style={btnPrimary} disabled={submitting}>
                {submitting ? t("patientChartUi.addDiagnosisSaving") : t("patientChartUi.addDiagnosisSubmit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function initialSexAtBirthForEdit(p: { sexAtBirth?: string | null; sex?: string | null }): string {
  if (p.sexAtBirth) return p.sexAtBirth;
  if (p.sex === "MALE") return "M";
  if (p.sex === "FEMALE") return "F";
  if (p.sex === "OTHER") return "X";
  if (p.sex === "UNKNOWN") return "U";
  return "";
}

function EditPatientModal({
  patient,
  facilityId,
  onClose,
  onSuccess,
}: {
  patient: any;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    dob: patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : "",
    phone: patient.phone || "",
    email: patient.email || "",
    sexAtBirth: initialSexAtBirthForEdit(patient),
    address: patient.address || "",
    city: patient.city || "",
    country: patient.country || "",
    language: patient.language || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = { ...formData };
      if (payload.dob) {
        payload.dob = new Date(payload.dob).toISOString();
      }
      if (!payload.sexAtBirth) payload.sexAtBirth = null;
      if (!payload.phone) payload.phone = null;
      if (!payload.email) payload.email = null;

      await apiFetch(`/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
      onSuccess();
    } catch (err) {
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) || t("patientChartUi.editPatientError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{t("patientChartUi.editPatientTitle")}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientChartUi.editPatientFirstName")}</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientChartUi.editPatientLastName")}</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientChartUi.editPatientDob")}</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientChartUi.editPatientSex")}</label>
              <select
                value={formData.sexAtBirth}
                onChange={(e) => setFormData({ ...formData, sexAtBirth: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">{t("patientChartUi.editPatientSexPh")}</option>
                <option value="M">{t("patientChartUi.editPatientSexM")}</option>
                <option value="F">{t("patientChartUi.editPatientSexF")}</option>
                <option value="X">{t("patientChartUi.editPatientSexX")}</option>
                <option value="U">{t("patientChartUi.editPatientSexU")}</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientChartUi.editPatientPhone")}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}>
              {t("patientChartUi.editPatientCancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? t("patientChartUi.editPatientSaving") : t("patientChartUi.editPatientSave")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

