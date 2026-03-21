"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
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
  computeHeaderVitalsLine,
} from "@/components/patient-chart";
import {
  PatientOrdersTabContent,
  PatientResultsTabContent,
  PatientImagingTabContent,
  PatientMedicationsTabContent,
} from "@/components/patient-chart/PatientChartClinicalTabs";
import { getEncounterTypeLabelFr, getFollowUpStatusLabelFr } from "@/lib/uiLabels";
import {
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsResponse,
  type PatientTriageVitalsSnapshot,
  hasVitalsJson,
  buildVitalsTimelineNewestFirst,
  snapshotKey,
  vitalsTimelineFallbackFromChartSummary,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { getPatientChartPrintHtml, printPatientChart } from "@/components/patient-chart/PatientChartPrintLayout";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<any>(null);
  const [chartSummary, setChartSummary] = useState<ChartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [facilityId, setFacilityId] = useState<string>("");
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
  const { canPrescribe, roles, ready: rolesReady } = useFacilityAndRoles();
  const triageLoadFailedRef = useRef(false);

  useEffect(() => {
    setSupersededVitals([]);
    triageLoadFailedRef.current = false;
  }, [patientId]);

  const clinicalChartAccess =
    rolesReady &&
    (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));
  /** Accueil seul (pas ADMIN / RN / PROVIDER) : coquille administrative patient, pas de dossier clinique. */
  const administrativePatientShellOnly =
    rolesReady &&
    roles.includes("FRONT_DESK") &&
    !roles.includes("ADMIN") &&
    !roles.includes("PROVIDER") &&
    !roles.includes("RN");
  const isProviderLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const isRNOnly = roles.includes("RN") && !isProviderLike;
  const isFrontDeskQuick =
    roles.includes("FRONT_DESK") && !isProviderLike && !roles.includes("RN");
  const isBillingOnlyQuick =
    rolesReady && roles.includes("BILLING") && !clinicalChartAccess && !isFrontDeskQuick;
  /**
   * Liens « Ouvrir la consultation » — aligné sur `canViewEncounterDetail` de `/app/encounters/[id]`.
   * (L’en-tête accueil seul masque toujours le lien via `administrativePatientShellOnly`.)
   */
  const canOpenClinicalEncounterDetail =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("FRONT_DESK") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    if (cookieValue) {
      setFacilityId(cookieValue);
    } else {
      fetch("/api/auth/me")
        .then((res) => parseApiResponse(res))
        .then((data) => {
          const d = data && typeof data === "object" && !Array.isArray(data) ? (data as { facilityRoles?: { facilityId?: string }[] }) : null;
          const fid = d?.facilityRoles?.[0]?.facilityId;
          if (fid) {
            setFacilityId(fid);
            document.cookie = `medora_facility_id=${fid}; path=/; max-age=${365 * 24 * 60 * 60}`;
          }
        });
    }
  }, []);

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
    if (patientId && facilityId) {
      loadPatient();
    }
  }, [patientId, facilityId, loadPatient]);

  useEffect(() => {
    if (!patientId || !facilityId || !rolesReady) return;
    if (clinicalChartAccess) {
      loadChartSummary();
    } else {
      setChartSummary(null);
      loadDeskEncounters();
    }
    loadFollowUps();
  }, [
    patientId,
    facilityId,
    rolesReady,
    clinicalChartAccess,
    loadChartSummary,
    loadDeskEncounters,
    loadFollowUps,
  ]);

  useEffect(() => {
    if (!patientId || !facilityId || !rolesReady || !clinicalChartAccess) {
      setVitalsTimeline(null);
      setSupersededVitals([]);
      return;
    }
    loadPatientTriageVitals();
  }, [patientId, facilityId, rolesReady, clinicalChartAccess, loadPatientTriageVitals]);

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
    if (!rolesReady || !administrativePatientShellOnly) return;
    const forbidden = new Set(["notes", "orders", "results", "medications", "imaging", "vaccinations"]);
    if (forbidden.has(activeTab)) setActiveTab("summary");
  }, [rolesReady, administrativePatientShellOnly, activeTab]);

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
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const openEncounter =
    clinicalChartAccess && chartSummary
      ? chartSummary.recentEncounters.find((e) => e.status === "OPEN")
      : deskEncounters.find((e: { status?: string }) => e.status === "OPEN");

  const latestVitalsJson = vitalsTimeline?.latest?.vitalsJson as
    | Record<string, number | string | null | undefined>
    | undefined;
  const hasClinicalLatestVitals = Boolean(latestVitalsJson && hasVitalsJson(latestVitalsJson));

  const { line: headerVitalsLine, hasVitals: hasHeaderVitals } = computeHeaderVitalsLine(
    hasClinicalLatestVitals ? latestVitalsJson : undefined,
    patient?.latestVitalsJson
  );

  const headerVitalsLoading = clinicalChartAccess && vitalsLoading && !hasHeaderVitals;

  const vitalsFullHistoryNewestFirst = clinicalChartAccess
    ? buildVitalsTimelineNewestFirst(
        vitalsTimeline?.latest ?? null,
        vitalsTimeline?.history ?? [],
        supersededVitals
      )
    : [];

  const canEditPatient =
    rolesReady &&
    (roles.includes("FRONT_DESK") ||
      roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN"));

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!patient) {
    return <div style={{ padding: 24 }}>Patient introuvable</div>;
  }

  const tabs = administrativePatientShellOnly
    ? [
        { id: "summary", label: "Administratif" },
        { id: "encounters", label: "Visites" },
      ]
    : [
        { id: "summary", label: "Résumé du patient" },
        { id: "encounters", label: "Consultations" },
        ...(clinicalChartAccess ? [{ id: "vaccinations", label: "Vaccinations" as const }] : []),
        { id: "notes", label: "Notes" },
        { id: "orders", label: "Ordres" },
        { id: "results", label: "Résultats" },
        { id: "medications", label: "Médicaments" },
        { id: "imaging", label: "Imagerie" },
      ];

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
          administrativeShell={administrativePatientShellOnly}
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
        {clinicalChartAccess && chartSummary && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() =>
                printPatientChart(
                  getPatientChartPrintHtml({ chartSummary, followUps: followUps ?? [] })
                )
              }
              style={{
                padding: "10px 16px",
                border: "1px solid #37474f",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                color: "#263238",
              }}
            >
              Imprimer le dossier
            </button>
          </div>
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
            />
          )}
          {activeTab === "summary" && !clinicalChartAccess && (
            <FrontDeskSummaryTab
              followUps={followUps}
              followUpsLoading={followUpsLoading}
              onGoEncounters={() => setActiveTab("encounters")}
            />
          )}
          {activeTab === "encounters" && (
            <PatientConsultationsTab
              patientId={patientId}
              facilityId={facilityId}
              canOpenEncounterDetail={canOpenClinicalEncounterDetail}
              administrativeOnly={administrativePatientShellOnly}
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
            <div style={{ color: "#616161", fontSize: 14 }}>Contenu des notes : à intégrer au dossier (consultation ou module dédié).</div>
          )}
          {activeTab === "orders" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientOrdersTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>
                Vue ordres disponible pour l&apos;équipe clinique sur ce dossier.
              </div>
            ))}
          {activeTab === "results" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientResultsTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>
                Vue résultats disponible pour l&apos;équipe clinique sur ce dossier.
              </div>
            ))}
          {activeTab === "medications" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientMedicationsTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>
                Vue médicaments disponible pour l&apos;équipe clinique sur ce dossier.
              </div>
            ))}
          {activeTab === "imaging" &&
            (clinicalChartAccess && chartSummary ? (
              <PatientImagingTabContent chartSummary={chartSummary} />
            ) : (
              <div style={{ color: "#616161", fontSize: 14 }}>
                Vue imagerie disponible pour l&apos;équipe clinique sur ce dossier.
              </div>
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
  const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
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
        <strong style={{ color: "#0d47a1" }}>Accès administratif.</strong> Le dossier clinique (résumé, résultats,
        ordres, médicaments, imagerie, notes) est réservé à l&apos;équipe soignante. Vous pouvez consulter
        l&apos;identité ci-dessus, modifier les coordonnées si besoin, et gérer les visites depuis l&apos;onglet
        « Visites ».
      </div>
      <button type="button" style={{ ...btnPrimary, marginBottom: 20 }} onClick={onGoEncounters}>
        Aller aux visites
      </button>
      <ChartSection title="Suivis planifiés">
        {followUpsLoading ? (
          <div style={emptyStateStyle}>Chargement…</div>
        ) : followUps.length === 0 ? (
          <div style={emptyStateStyle}>Aucun suivi enregistré.</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Date prévue</th>
                <th style={tableStyles.th}>Motif</th>
                <th style={tableStyles.th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map((fu) => (
                <tr key={fu.id}>
                  <td style={tableStyles.td}>{formatDate(fu.dueDate)}</td>
                  <td style={tableStyles.td}>{fu.reason || "—"}</td>
                  <td style={tableStyles.td}>{getFollowUpStatusLabelFr(fu.status)}</td>
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
    if (!encounterId.trim()) errs.encounter = "Sélectionnez la consultation concernée.";
    if (!code.trim()) errs.code = "Saisissez un code diagnostic (ex. CIM-10).";
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
      setError(
        normalizeUserFacingError(err?.message) ||
          "Impossible d'ajouter le diagnostic. Vérifiez le code et réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

  const encounterLabel = (e: ChartSummary["recentEncounters"][0]) => {
    const reason = e.visitReason || e.chiefComplaint;
    const parts = [getEncounterTypeLabelFr(e.type), formatDate(e.createdAt)];
    if (reason) parts.push(reason.length > 40 ? reason.slice(0, 40) + "…" : reason);
    return parts.join(" · ");
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", borderRadius: 8, padding: 24, maxWidth: 480, width: "90%" }}>
        <h3 style={{ margin: "0 0 4px 0" }}>Ajouter un diagnostic</h3>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Associer un diagnostic à une consultation récente.</p>
        {recentEncounters.length === 0 ? (
          <>
            <div style={{ ...emptyStateStyle, marginBottom: 16 }}>
              Aucune consultation pour l&apos;instant. Créez une consultation depuis l&apos;onglet <strong>Consultations</strong>, puis ajoutez un diagnostic ici.
            </div>
            <button type="button" style={btnSecondary} onClick={onClose}>Fermer</button>
          </>
        ) : success ? (
          <div style={{ padding: "16px 0", color: "#2e7d32", fontSize: 15 }}>
            Diagnostic ajouté. Mise à jour du dossier…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Consultation *</label>
              <select
                value={encounterId}
                onChange={(e) => { setEncounterId(e.target.value); setFieldErrors((prev) => ({ ...prev, encounter: undefined })); }}
                style={{ width: "100%", padding: 10, fontSize: 14, border: fieldErrors.encounter ? "1px solid #c62828" : "1px solid #ccc", borderRadius: 4 }}
                aria-invalid={!!fieldErrors.encounter}
              >
                <option value="">— Choisir la consultation —</option>
                {recentEncounters.map((e) => (
                  <option key={e.id} value={e.id}>{encounterLabel(e)}</option>
                ))}
              </select>
              {fieldErrors.encounter && <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.encounter}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Diagnostics courants</label>
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
                aria-label="Choisir un diagnostic courant"
              >
                <option value="">— Choisir un diagnostic courant —</option>
                {COMMON_DIAGNOSES.map((d) => (
                  <option key={d.code} value={`${d.code} - ${d.label}`}>
                    {d.code} — {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Code *</label>
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
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }} placeholder="Optionnel" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Date de début</label>
              <input type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }} placeholder="Optionnel" />
            </div>
            {error && <div style={{ color: "#c62828", marginBottom: 12, fontSize: 14 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnSecondary} onClick={onClose}>Annuler</button>
              <button type="submit" style={btnPrimary} disabled={submitting}>{submitting ? "Enregistrement…" : "Ajouter le diagnostic"}</button>
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
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de modifier le patient."
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
        <h2 style={{ marginTop: 0 }}>Modifier le patient</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Prénom *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Nom *</label>
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
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Date de naissance</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Sexe</label>
              <select
                value={formData.sexAtBirth}
                onChange={(e) => setFormData({ ...formData, sexAtBirth: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">—</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
                <option value="X">Autre</option>
                <option value="U">Inconnu</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Téléphone</label>
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
              Annuler
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
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

