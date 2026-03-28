"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { MEDORA_PATIENT_VITALS_UPDATED, hasVitalsJson, type PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { usePathwayTimers } from "@/features/pathways/hooks/usePathwayTimers";
import { PathwayMilestoneRow } from "@/features/pathways/components/PathwayMilestoneRow";
import { PathwaySessionSummaryBar } from "@/features/pathways/components/PathwaySessionSummary";
import {
  COMMON_VISIT_REASONS,
  COMMON_NOTE_SNIPPETS,
  PROVIDER_IMPRESSION_SNIPPETS,
  PROVIDER_PLAN_SNIPPETS,
} from "@/constants/clinicalTemplates";
import { CreateOrderModal } from "@/components/orders";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";
import { printRx } from "@/components/pharmacy/RxPrintLayout";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import {
  medicationLineClinicallyExecuted,
  medicationOrderStatusKeyForEncounterTab,
  orderAllowsWholeCancelOnline,
} from "@/lib/orderEncounterUi";
import {
  getEncounterStatusLabelFr,
  getEncounterTypeLabelFr,
  getOrderPriorityLabelFr,
  getPathwayTypeLabelFr,
  getPatientSexLabelFr,
} from "@/lib/uiLabels";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { ORDER_CANCELLATION_REASON_VALUES } from "@medora/shared";
import { calculateAge } from "@/lib/patientDisplay";
import { formatEncounterPhysicianAssignedFr } from "@/lib/encounterDisplay";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { EncounterOperationalPanel } from "@/components/encounters/EncounterOperationalPanel";
import { NursingAssessmentTab } from "@/components/encounters/NursingAssessmentTab";
import {
  diagnosisDisplayFr,
  nursingAssessmentDisplayLines,
  nursingAssessmentSignatureLineFr,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  parsePhysicianEvalV1ForChart,
} from "@/components/patient-chart/patientChartHelpers";
import {
  admissionFormToPayload,
  CARE_LEVEL_OPTIONS_FR,
  emptyAdmissionForm,
  formatPhysicianName,
  hydrateAdmissionFormFromEncounterJson,
  type AdmissionFormState,
} from "@/lib/encounterAdmission";
import {
  DISCHARGE_MODE_OPTIONS_FR,
  emptyDischargeForm,
  hydrateDischargeFormFromEncounterJson,
  mergeDischargeForSave,
  type DischargeFormState,
} from "@/lib/encounterDischarge";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { EncounterResultsTab } from "@/components/encounters/EncounterResultsTab";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { MEDORA_CHART_RESULT_UPDATED } from "@/lib/chartEvents";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";

function getPathwayStatusLabelFr(status: string): string {
  if (status === "ACTIVE") return "Actif";
  if (status === "PAUSED") return "En pause";
  if (status === "COMPLETED") return "Terminé";
  if (status === "CANCELLED") return "Annulé";
  return status;
}

function formatLatestVitalsLineFr(
  vitals: Record<string, number | string | null | undefined>,
  esi?: number | null
): string {
  const parts: string[] = [];
  if (vitals.bpSys != null && vitals.bpDia != null && vitals.bpSys !== "" && vitals.bpDia !== "") {
    parts.push(`TA : ${vitals.bpSys}/${vitals.bpDia}`);
  }
  if (vitals.hr != null && vitals.hr !== "") parts.push(`FC : ${vitals.hr}/min`);
  if (vitals.rr != null && vitals.rr !== "") parts.push(`FR : ${vitals.rr}/min`);
  if (vitals.tempC != null && vitals.tempC !== "") parts.push(`Température : ${vitals.tempC} °C`);
  if (vitals.spo2 != null && vitals.spo2 !== "") parts.push(`SpO₂ : ${vitals.spo2} %`);
  if (vitals.weightKg != null && vitals.weightKg !== "") parts.push(`Poids : ${vitals.weightKg} kg`);
  if (vitals.heightCm != null && vitals.heightCm !== "") parts.push(`Taille : ${vitals.heightCm} cm`);
  if (esi != null) parts.push(`ESI : ${esi}`);
  return parts.length ? parts.join(" · ") : "Aucun signe vital enregistré";
}

const ENCOUNTER_TAB_IDS = new Set([
  "summary",
  "triage",
  "nursing",
  "clinic",
  "diagnostics",
  "orders",
  "mar",
  "results",
  "notes",
  "pathways",
]);

export default function EncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params.id as string;
  const { facilityId, canPrescribe, roles, ready: rolesReady, facilities } = useFacilityAndRoles();
  const encounterDetailPath = `/app/encounters/${encounterId}`;
  const [encounter, setEncounter] = useState<any>(null);
  const [encounterFetchError, setEncounterFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [tabBootstrapped, setTabBootstrapped] = useState(false);
  const [quickTriage, setQuickTriage] = useState<any>(null);
  const [quickOrders, setQuickOrders] = useState<any[]>([]);
  const [quickDiagnosisCount, setQuickDiagnosisCount] = useState<number | null>(null);
  /** Premier diagnostic de la consultation (liste déjà chargée) — pour impression sortie sans fetch supplémentaire. */
  const [quickPrimaryDiagnosis, setQuickPrimaryDiagnosis] = useState<string | null>(null);
  const [quickContextLoading, setQuickContextLoading] = useState(false);
  /** Signes vitaux / ordres / diagnostics : échec partiel sans quitter la route. */
  const [quickContextNotice, setQuickContextNotice] = useState<string | null>(null);
  const [medicationModalRequestTick, setMedicationModalRequestTick] = useState(0);
  const [careModalRequestTick, setCareModalRequestTick] = useState(0);
  const [careModalPresetLabel, setCareModalPresetLabel] = useState<string | null>(null);
  const [encounterResultsRefresh, setEncounterResultsRefresh] = useState(0);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showDocumentationDeficiencyModal, setShowDocumentationDeficiencyModal] = useState(false);
  const [documentationDeficiencies, setDocumentationDeficiencies] = useState<
    Array<{ code: string; labelFr: string }>
  >([]);
  const [closingEncounter, setClosingEncounter] = useState(false);
  /** Clôture mise en file hors ligne — la consultation reste ouverte côté serveur jusqu’à sync. */
  const [queuedClosePendingSync, setQueuedClosePendingSync] = useState(false);
  /** Dossier de sortie PATCH mis en file — données pas encore confirmées côté serveur. */
  const [queuedDischargeSaveNotice, setQueuedDischargeSaveNotice] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  /** Objet fusionné enregistré avant la modale de confirmation finale (ou null si clôture sans étape dossier). */
  const [pendingDischarge, setPendingDischarge] = useState<Record<string, string> | null>(null);
  const [dischargeForm, setDischargeForm] = useState<DischargeFormState>(() => emptyDischargeForm());
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [savingAdmission, setSavingAdmission] = useState(false);
  /** Distingue la 1re ouverture (libellé dédié) des rechargements (ex. après clôture). */
  const encounterHasLoadedOnceRef = useRef(false);

  /** Aligné sur GET /encounters/:id (inclut lab / imagerie / pharmacie pour les liens depuis les files). */
  const canViewEncounterDetail =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY") ||
    roles.includes("PHARMACY");

  const canFetchEncounterTriage =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canFetchEncounterOrders =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("LAB") ||
    roles.includes("RADIOLOGY") ||
    roles.includes("PHARMACY") ||
    roles.includes("ADMIN");
  const canFetchPatientDiagnosesList = canFetchEncounterTriage;
  const canFetchMarTab =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canManageEncounterClosure =
    roles.includes("PROVIDER") || roles.includes("ADMIN") || roles.includes("RN");

  const canEditNursingDischarge = roles.includes("RN") || roles.includes("ADMIN");
  const canEditMedicalDischarge = roles.includes("PROVIDER") || roles.includes("ADMIN");

  useEffect(() => {
    setTabBootstrapped(false);
    encounterHasLoadedOnceRef.current = false;
    setQueuedDischargeSaveNotice(false);
  }, [encounterId]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!isAppPathAllowedForRoles(encounterDetailPath, roles)) {
      router.replace(getLandingRouteForRoles(roles));
    }
  }, [rolesReady, encounterDetailPath, roles, router]);

  useEffect(() => {
    if (!showCloseConfirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closingEncounter) setShowCloseConfirmModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCloseConfirmModal, closingEncounter]);

  useEffect(() => {
    if (!showDocumentationDeficiencyModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closingEncounter) {
        setShowDocumentationDeficiencyModal(false);
        setDocumentationDeficiencies([]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDocumentationDeficiencyModal, closingEncounter]);

  useEffect(() => {
    if (encounter?.status === "CLOSED") setQueuedClosePendingSync(false);
  }, [encounter?.status]);

  useEffect(() => {
    if (!queuedDischargeSaveNotice || !pendingDischarge) return;
    const parsed = parseDischargeSummaryForChart(encounter?.dischargeSummaryJson);
    if (!parsed) return;
    const matches = Object.entries(pendingDischarge).every(([k, v]) => {
      const sv = String((parsed as Record<string, unknown>)[k] ?? "").trim();
      return sv === String(v).trim();
    });
    if (matches) setQueuedDischargeSaveNotice(false);
  }, [encounter?.dischargeSummaryJson, pendingDischarge, queuedDischargeSaveNotice]);

  useEffect(() => {
    if (!showDischargeModal || !encounter) return;
    setDischargeForm(hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson));
  }, [showDischargeModal, encounter?.id]);

  useEffect(() => {
    if (!showAdmissionModal || !encounter) return;
    const def = formatPhysicianName(encounter.physicianAssigned);
    setAdmissionForm(hydrateAdmissionFormFromEncounterJson(encounter.admissionSummaryJson, def));
  }, [showAdmissionModal, encounter?.id, encounter?.physicianAssigned]);

  useEffect(() => {
    if (!encounterId || !facilityId || !rolesReady) return;
    if (!canViewEncounterDetail) {
      setEncounter(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setEncounterFetchError(null);
    (async () => {
      const cacheKey = `encounter:${facilityId}:${encounterId}`;
      try {
        const data = await apiFetch(`/encounters/${encounterId}`, { facilityId });
        const enc = asApiObject(data);
        if (!cancelled) {
          setEncounter(enc);
          if (enc) encounterHasLoadedOnceRef.current = true;
        }
        if (enc) {
          void setCachedRecord("encounter_summaries", cacheKey, enc, {
            facilityId,
            encounterId,
            patientId: (enc as { patient?: { id?: string } }).patient?.id ?? undefined,
          });
        }
      } catch (error) {
        console.error("Failed to load encounter:", error);
        if (process.env.NODE_ENV === "development") {
          console.warn("[encounterDetail] échec chargement consultation", { encounterId, facilityId, error });
        }
        const msg = normalizeUserFacingError(error instanceof Error ? error.message : null);
        if (!cancelled) setEncounterFetchError(msg || "Impossible de charger la consultation.");
        const cached = await getCachedRecord<any>("encounter_summaries", cacheKey);
        if (!cancelled) {
          setEncounter(cached?.data ?? null);
          if (cached?.data) encounterHasLoadedOnceRef.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, rolesReady, canViewEncounterDetail]);

  useEffect(() => {
    if (!encounter || !facilityId || !rolesReady || tabBootstrapped) return;
    const tabParam =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (tabParam && ENCOUNTER_TAB_IDS.has(tabParam)) {
      setActiveTab(tabParam);
    } else if (roles.includes("PROVIDER") || roles.includes("ADMIN")) {
      setActiveTab("clinic");
    } else if (roles.includes("RN")) {
      setActiveTab("triage");
    }
    setTabBootstrapped(true);
  }, [encounter, facilityId, rolesReady, roles, tabBootstrapped]);

  const loadQuickContext = useCallback(async () => {
    if (!encounter?.id || !facilityId || !rolesReady) return;
    setQuickContextLoading(true);
    setQuickContextNotice(null);
    const patientId = encounter.patient?.id as string;
    const triageCacheKey = `encounter-triage:${facilityId}:${encounter.id}`;
    const ordersCacheKey = `encounter-orders:${facilityId}:${encounter.id}`;
    const triageP = canFetchEncounterTriage
      ? apiFetch(`/encounters/${encounter.id}/triage`, { facilityId })
      : Promise.resolve(null);
    const ordersP = canFetchEncounterOrders
      ? apiFetch(`/encounters/${encounter.id}/orders`, { facilityId })
      : Promise.resolve([]);
    const dxP =
      canFetchPatientDiagnosesList && patientId
        ? apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId })
        : Promise.resolve(null);
    const [[triRes, ordRes, dxRes], pendingOrders] = await Promise.all([
      Promise.allSettled([triageP, ordersP, dxP]),
      getPendingCreateOrdersForEncounter(facilityId, encounter.id).catch(() => [] as Record<string, unknown>[]),
    ]);
    const tri = triRes.status === "fulfilled" ? triRes.value : null;
    const ords = ordRes.status === "fulfilled" ? ordRes.value : null;
    const dx = dxRes.status === "fulfilled" ? dxRes.value : null;

    const failedLabels: string[] = [];
    if (canFetchEncounterTriage && triRes.status === "rejected") failedLabels.push("signes vitaux");
    if (canFetchEncounterOrders && ordRes.status === "rejected") failedLabels.push("ordres");
    if (canFetchPatientDiagnosesList && patientId && dxRes.status === "rejected") failedLabels.push("liste de diagnostics");

    let mergedQuickOrders = mergeOrders(Array.isArray(ords) ? ords : [], pendingOrders);
    if (mergedQuickOrders.length === 0) {
      const cachedOrders = await getCachedRecord<any[]>("encounter_summaries", ordersCacheKey);
      if (cachedOrders?.data && Array.isArray(cachedOrders.data)) {
        mergedQuickOrders = mergeOrders(cachedOrders.data, pendingOrders);
      }
    }
    setQuickOrders(mergedQuickOrders);
    if (mergedQuickOrders.length > 0) {
      void setCachedRecord("encounter_summaries", ordersCacheKey, mergedQuickOrders, {
        facilityId,
        encounterId: encounter.id,
        patientId,
      });
    }

    if (tri) {
      void setCachedRecord("latest_vitals", triageCacheKey, tri, {
        facilityId,
        encounterId: encounter.id,
        patientId,
      });
      setQuickTriage(tri);
    } else {
      const cachedTri = await getCachedRecord<any>("latest_vitals", triageCacheKey);
      setQuickTriage(cachedTri?.data ?? null);
    }
    if (dx && typeof dx === "object" && Array.isArray((dx as any).items)) {
      const items = (dx as { items: Array<{ encounterId?: string; description?: string | null; code: string }> }).items.filter(
        (d) => d.encounterId === encounter.id
      );
      setQuickDiagnosisCount(items.length);
      setQuickPrimaryDiagnosis(
        items.length > 0 ? diagnosisDisplayFr(items[0].description, items[0].code) : null
      );
    } else {
      setQuickDiagnosisCount(null);
      setQuickPrimaryDiagnosis(null);
    }
    if (failedLabels.length > 0) {
      setQuickContextNotice(
        `Certaines données complémentaires n’ont pas pu être chargées (${failedLabels.join(", ")}). Le dossier de consultation reste disponible.`
      );
    }
    setQuickContextLoading(false);
  }, [
    encounter?.id,
    facilityId,
    encounter?.patient?.id,
    rolesReady,
    canFetchEncounterTriage,
    canFetchEncounterOrders,
    canFetchPatientDiagnosesList,
  ]);

  useEffect(() => {
    if (!encounter?.id || !facilityId || !rolesReady) return;
    void loadQuickContext();
  }, [encounter?.id, encounter?.updatedAt, facilityId, rolesReady, loadQuickContext]);

  useEffect(() => {
    if (!encounter?.patient?.id) return;
    const onVitalsUpdated = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId?: string }>;
      if (e.detail?.patientId !== encounter.patient.id) return;
      void loadQuickContext();
    };
    window.addEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_VITALS_UPDATED, onVitalsUpdated);
  }, [encounter?.patient?.id, loadQuickContext]);

  const refreshQuickOrdersOnly = useCallback(async () => {
    if (!encounter?.id || !facilityId || !canFetchEncounterOrders) return;
    const pendingOrders = await getPendingCreateOrdersForEncounter(facilityId, encounter.id).catch(
      () => [] as Record<string, unknown>[]
    );
    try {
      const ords = await apiFetch(`/encounters/${encounter.id}/orders`, { facilityId });
      setQuickOrders(mergeOrders(Array.isArray(ords) ? ords : [], pendingOrders));
    } catch {
      setQuickOrders(pendingOrders);
    }
  }, [encounter?.id, facilityId, canFetchEncounterOrders]);

  const mergeEncounterFromOperationalPatch = useCallback((patch: Record<string, unknown>) => {
    setEncounter((prev: any) => {
      if (!prev) return prev;
      const next: Record<string, unknown> = { ...prev, ...patch };
      const patchPatient = patch.patient;
      if (prev.patient && patchPatient && typeof patchPatient === "object" && !Array.isArray(patchPatient)) {
        next.patient = { ...prev.patient, ...patchPatient };
      }
      const uid = patch.physicianAssignedUserId as string | null | undefined;
      const rel = patch.physicianAssigned as typeof prev.physicianAssigned | null | undefined;
      if (
        uid &&
        uid === prev.physicianAssigned?.id &&
        rel === null &&
        prev.physicianAssigned
      ) {
        next.physicianAssigned = prev.physicianAssigned;
      }
      return next;
    });
  }, []);

  const loadEncounter = useCallback(async (opts?: { silent?: boolean }) => {
    if (!canViewEncounterDetail) return;
    if (!opts?.silent) setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}`, { facilityId });
      const enc = asApiObject(data);
      setEncounter(enc);
      if (enc) encounterHasLoadedOnceRef.current = true;
    } catch (error) {
      console.error("Failed to load encounter:", error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [canViewEncounterDetail, encounterId, facilityId]);

  const handlePrintDischarge = useCallback(() => {
    if (!encounter?.patient) return;
    const facilityName = facilities.find((f) => f.id === facilityId)?.name;
    const dischargeSummaryJsonForPrint =
      pendingDischarge != null && Object.keys(pendingDischarge).length > 0
        ? pendingDischarge
        : encounter.dischargeSummaryJson;
    printDischarge({
      patient: encounter.patient,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: dischargeSummaryJsonForPrint,
        physicianAssigned: encounter.physicianAssigned ?? null,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: quickPrimaryDiagnosis,
    });
  }, [encounter, facilityId, facilities, quickPrimaryDiagnosis, pendingDischarge]);

  useEffect(() => {
    if (!encounter?.id || !encounter?.patient?.id) return;
    const onResultSaved = (ev: Event) => {
      const e = ev as CustomEvent<{ patientId?: string; encounterId?: string }>;
      if (e.detail?.patientId && e.detail.patientId !== encounter.patient.id) return;
      if (e.detail?.encounterId && e.detail.encounterId !== encounter.id) return;
      void refreshQuickOrdersOnly();
      void loadEncounter({ silent: true });
      setEncounterResultsRefresh((t) => t + 1);
    };
    window.addEventListener(MEDORA_CHART_RESULT_UPDATED, onResultSaved);
    return () => window.removeEventListener(MEDORA_CHART_RESULT_UPDATED, onResultSaved);
  }, [encounter?.id, encounter?.patient?.id, loadEncounter, refreshQuickOrdersOnly]);

  const openCloseConfirmModal = () => {
    setPendingDischarge(null);
    setShowCloseConfirmModal(true);
  };

  const openDischargeThenClose = () => {
    setShowDischargeModal(true);
  };

  const submitAdmission = async () => {
    if (!encounter) return;
    const payload = admissionFormToPayload(admissionForm);
    if (Object.keys(payload).length === 0) {
      alert("Veuillez renseigner au moins un champ du dossier d'admission.");
      return;
    }
    setSavingAdmission(true);
    try {
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admissionSummaryJson: payload }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await loadEncounter({ silent: true });
      setShowAdmissionModal(false);
      if (queued) {
        alert(
          "Le dossier d'admission a été enregistré sur cet appareil et est en attente de synchronisation. Il n'est pas encore confirmé côté serveur."
        );
      }
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null);
      alert(msg || "Impossible d'enregistrer le dossier d'admission.");
    } finally {
      setSavingAdmission(false);
    }
  };

  const submitDischargeAndConfirmClose = async () => {
    if (!encounter) return;
    const merged = mergeDischargeForSave(
      encounter.dischargeSummaryJson,
      dischargeForm,
      canEditNursingDischarge,
      canEditMedicalDischarge
    );
    try {
      if (merged !== null) {
        const res = await apiFetch(`/encounters/${encounterId}`, {
          method: "PATCH",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dischargeSummaryJson: merged }),
        });
        const queued =
          res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
        setQueuedDischargeSaveNotice(queued);
        await loadEncounter({ silent: true });
      } else {
        setQueuedDischargeSaveNotice(false);
      }
      setPendingDischarge(merged);
      setShowDischargeModal(false);
      setShowCloseConfirmModal(true);
    } catch {
      alert("Impossible d'enregistrer le dossier de sortie.");
    }
  };

  const buildDischargePayloadFromPending = () => {
    const dischargePayload: Record<string, string> = {};
    if (pendingDischarge) {
      for (const [k, v] of Object.entries(pendingDischarge)) {
        const t = typeof v === "string" ? v.trim() : "";
        if (t) dischargePayload[k] = t;
      }
    }
    return dischargePayload;
  };

  const executeCloseEncounter = async (acknowledgeDeficiencies: boolean) => {
    setClosingEncounter(true);
    try {
      const dischargePayload = buildDischargePayloadFromPending();
      const body: Record<string, unknown> = {};
      if (Object.keys(dischargePayload).length > 0) body.discharge = dischargePayload;
      if (acknowledgeDeficiencies) body.acknowledgeDeficiencies = true;
      const res = await apiFetch(`/encounters/${encounterId}/close`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;

      setShowCloseConfirmModal(false);
      setShowDocumentationDeficiencyModal(false);
      setDocumentationDeficiencies([]);

      if (queued) {
        setQueuedClosePendingSync(true);
        setPendingDischarge(null);
        setQueuedDischargeSaveNotice(false);
        await loadEncounter();
        return;
      }

      setQueuedClosePendingSync(false);
      setPendingDischarge(null);
      setQueuedDischargeSaveNotice(false);
      if (acknowledgeDeficiencies) {
        alert(
          "Consultation terminée. La clôture a été enregistrée malgré des lacunes documentaires prises en compte."
        );
      }
      await loadEncounter();
    } catch {
      alert("Impossible de fermer la consultation");
    } finally {
      setClosingEncounter(false);
    }
  };

  const runCloseDocumentationCheckAndProceed = async () => {
    if (!encounter) return;
    setClosingEncounter(true);
    try {
      const dischargePayload = buildDischargePayloadFromPending();
      const checkBody = Object.keys(dischargePayload).length > 0 ? { discharge: dischargePayload } : {};
      const check = await apiFetch(`/encounters/${encounterId}/close-check`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkBody),
      });
      const result = asApiObject(check) as {
        hasDeficiencies?: boolean;
        deficiencies?: Array<{ code: string; labelFr: string }>;
      };
      if (result.hasDeficiencies && result.deficiencies && result.deficiencies.length > 0) {
        setShowCloseConfirmModal(false);
        setDocumentationDeficiencies(result.deficiencies);
        setShowDocumentationDeficiencyModal(true);
        return;
      }
      await executeCloseEncounter(false);
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null) ||
          "Impossible de vérifier la documentation avant la clôture."
      );
    } finally {
      setClosingEncounter(false);
    }
  };

  if (!facilityId || !encounterId) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!rolesReady) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (loading && canViewEncounterDetail) {
    return (
      <div style={{ padding: 24 }}>
        {encounterHasLoadedOnceRef.current ? "Chargement…" : "Ouverture de la consultation…"}
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!canViewEncounterDetail) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[encounterDetail] accès refusé (rôle)", { encounterId, roles });
    }
    return (
      <div style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Accès restreint.</p>
        <p style={{ margin: "12px 0 0 0", color: "#555", lineHeight: 1.5 }}>
          Votre rôle ne permet pas d&apos;ouvrir le dossier de cette consultation. Utilisez un compte clinique ou
          facturation, ou restez sur la fiche patient (liste des consultations).
        </p>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 520 }}>
        {encounterFetchError ? (
          <>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Impossible de charger la consultation.</p>
            {encounterFetchError.trim() !== "Impossible de charger la consultation." ? (
              <p style={{ margin: "12px 0 0 0", color: "#b71c1c", lineHeight: 1.5 }}>{encounterFetchError}</p>
            ) : null}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Consultation introuvable</p>
            <p style={{ margin: "12px 0 0 0", color: "#555" }}>
              Cette consultation n&apos;existe pas, a été supprimée, ou vous n&apos;avez pas accès à cet établissement.
            </p>
          </>
        )}
      </div>
    );
  }

  const isProviderLike = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const isRNOnly = roles.includes("RN") && !isProviderLike;
  const showNursingTab = roles.includes("RN") || roles.includes("ADMIN") || roles.includes("PROVIDER");
  const canEditOperational = roles.includes("RN") || roles.includes("ADMIN");
  /** Admission depuis la consultation — réservé médecin / admin (aligné sur `canPrescribe`). */
  const canAdmitPatient = canPrescribe && encounter.status === "OPEN";
  const patient = encounter.patient;
  const motif =
    (encounter.visitReason || encounter.chiefComplaint || quickTriage?.chiefComplaint || "").trim() || "—";
  const vitalsJson = (quickTriage?.vitalsJson || {}) as Record<string, number | string | null | undefined>;
  const vitalsAtRaw = quickTriage?.triageCompleteAt || quickTriage?.updatedAt || null;
  const vitalsAt = vitalsAtRaw ? new Date(vitalsAtRaw).toLocaleString("fr-FR") : null;
  const vitalsLine = hasVitalsJson(vitalsJson)
    ? formatLatestVitalsLineFr(vitalsJson, quickTriage?.esi ?? null)
    : "Aucun signe vital enregistré";
  const medOrderCount = quickOrders.filter((o) => o.type === "MEDICATION").length;
  const totalOrderCount = quickOrders.length;
  const ageText =
    patient?.dob && !Number.isNaN(new Date(patient.dob).getTime()) ? `${calculateAge(patient.dob)} ans` : "—";
  const sexText = getPatientSexLabelFr(patient?.sex ?? null, patient?.sexAtBirth ?? null);
  const patientDob =
    patient?.dob != null
      ? new Date(patient.dob).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  const dischargePreviewForPrint = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const showPrintDischarge =
    encounter.status === "OPEN" || dischargePreviewForPrint !== null;

  const quickBtn: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 13,
    border: "1px solid #ccc",
    borderRadius: 6,
    background: "#fafafa",
    cursor: "pointer",
    fontWeight: 500,
  };

  const tabs = [
    { id: "summary", label: "Résumé de la consultation" },
    { id: "triage", label: "Signes vitaux" },
    ...(showNursingTab ? [{ id: "nursing", label: "Évaluation infirmière" }] : []),
    { id: "clinic", label: "Évaluation médicale" },
    { id: "diagnostics", label: "Diagnostics" },
    { id: "orders", label: "Ordres" },
    ...(canFetchMarTab ? [{ id: "mar" as const, label: "Administration médicamenteuse" }] : []),
    { id: "results", label: "Résultats" },
    { id: "notes", label: "Notes Inf." },
    { id: "pathways", label: "Parcours cliniques" },
  ];

  return (
    <div>
      {quickContextNotice ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ffcc80",
            backgroundColor: "#fff8e1",
            fontSize: 13,
            color: "#5d4037",
            lineHeight: 1.45,
          }}
        >
          {quickContextNotice}
        </div>
      ) : null}
      {queuedClosePendingSync && encounter?.status === "OPEN" ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ef9a9a",
            backgroundColor: "#ffebee",
            fontSize: 13,
            color: "#b71c1c",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          La demande de clôture a été enregistrée sur cet appareil et est en attente de synchronisation avec le
          serveur. La consultation n&apos;est pas encore confirmée fermée : les autres postes peuvent encore afficher la
          visite comme ouverte jusqu&apos;à la fin de la synchronisation.
        </div>
      ) : null}
      {queuedDischargeSaveNotice ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ef9a9a",
            backgroundColor: "#ffebee",
            fontSize: 13,
            color: "#b71c1c",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          Le dossier de sortie a été enregistré sur cet appareil et est en attente de synchronisation avec le serveur. Il
          n&apos;est pas encore confirmé côté serveur.
        </div>
      ) : null}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            backgroundColor: "white",
            padding: "20px 24px",
            borderRadius: 8,
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <h1 style={{ margin: "0 0 6px 0", fontSize: 22, lineHeight: 1.25 }}>
                {patient.firstName} {patient.lastName}
              </h1>
              <div style={{ color: "#444", fontSize: 14, lineHeight: 1.5 }}>
                <div>
                  <span style={{ color: "#757575" }}>Âge :</span> {ageText}
                </div>
                <div>
                  <span style={{ color: "#757575" }}>Sexe :</span> {sexText}
                </div>
                {patientDob && (
                  <div>
                    <span style={{ color: "#757575" }}>Date de naissance :</span> {patientDob}
                  </div>
                )}
                <div>
                  <span style={{ color: "#757575" }}>NIR / MRN :</span> {patient.mrn || "—"}
                </div>
                <div>
                  <span style={{ color: "#757575" }}>Type de consultation :</span>{" "}
                  {getEncounterTypeLabelFr(encounter.type)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ color: "#757575" }}>Statut :</span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: encounter.status === "OPEN" ? "#e3f2fd" : "#f5f5f5",
                      color: encounter.status === "OPEN" ? "#1565c0" : "#616161",
                    }}
                  >
                    {getEncounterStatusLabelFr(encounter.status)}
                  </span>
                  {encounter.admittedAt || parseAdmissionSummaryForChart(encounter.admissionSummaryJson) ? (
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: "#f3e5f5",
                        color: "#6a1b9a",
                      }}
                      title={
                        encounter.admittedAt
                          ? `Décision d'admission le ${new Date(encounter.admittedAt).toLocaleString("fr-FR")}`
                          : "Dossier d'admission enregistré"
                      }
                    >
                      Patient admis (hospitalisation)
                    </span>
                  ) : null}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "#757575" }}>Ouverture :</span>{" "}
                  {new Date(encounter.createdAt).toLocaleString("fr-FR")}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "#757575" }}>Salle :</span>{" "}
                  {encounter.roomLabel?.trim() || "—"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "#757575" }}>Médecin attribué :</span>{" "}
                  {formatEncounterPhysicianAssignedFr(encounter)}
                </div>
                {encounter.status === "CLOSED" && (encounter.dischargedAt || encounter.updatedAt) && (
                  <div style={{ color: "#424242", fontSize: 14 }}>
                    {encounter.closedByDisplayFr?.trim()
                      ? `Fermé par ${encounter.closedByDisplayFr.trim()} — ${new Date(
                          encounter.dischargedAt ?? encounter.updatedAt
                        ).toLocaleString("fr-FR")}`
                      : `Fermé le ${new Date(encounter.dischargedAt ?? encounter.updatedAt).toLocaleString("fr-FR")}`}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <Link
                href={`/app/patients/${patient.id}`}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#1a1a1a",
                  textDecoration: "none",
                  fontWeight: 600,
                  background: "#fff",
                }}
              >
                Retour au dossier patient
              </Link>
              {canAdmitPatient && (
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6a1b9a",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Admettre le patient
                </button>
              )}
              {encounter.status === "OPEN" && canManageEncounterClosure && (
                <>
                  <button
                    type="button"
                    onClick={openDischargeThenClose}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#37474f",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Dossier de sortie
                  </button>
                  <button
                    type="button"
                    onClick={openCloseConfirmModal}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#c62828",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Terminer la consultation
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#424242", marginBottom: 8, letterSpacing: 0.02 }}>
              Derniers signes vitaux
            </div>
            <div style={{ fontSize: 13, color: "#333", lineHeight: 1.55 }}>
              {quickContextLoading ? "Chargement…" : vitalsLine}
              {vitalsJson?.allergyNote && String(vitalsJson.allergyNote).trim() !== "" && (
                <div style={{ marginTop: 6, color: "#c62828", fontWeight: 700 }}>
                  ⚠️ Allergie : {String(vitalsJson.allergyNote).trim()}
                </div>
              )}
              {vitalsAt && <div style={{ color: "#757575" }}>Relevé : {vitalsAt}</div>}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#424242", marginBottom: 8, letterSpacing: 0.02 }}>
              Résumé rapide de la consultation
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "8px 16px",
                fontSize: 13,
                color: "#333",
              }}
            >
              <div>
                <span style={{ color: "#757575" }}>Motif :</span>{" "}
                <span style={{ wordBreak: "break-word" }}>{motif}</span>
              </div>
              <div>
                <span style={{ color: "#757575" }}>Diagnostics (visite) :</span>{" "}
                {quickContextLoading ? "…" : quickDiagnosisCount !== null ? quickDiagnosisCount : "—"}
              </div>
              <div>
                <span style={{ color: "#757575" }}>Ordonnances :</span>{" "}
                {quickContextLoading ? "…" : medOrderCount}
                {totalOrderCount > 0 && (
                  <span style={{ color: "#757575" }}> · Ordres : {totalOrderCount}</span>
                )}
              </div>
              {encounter.followUpDate && (
                <div>
                  <span style={{ color: "#757575" }}>Suivi :</span>{" "}
                  {new Date(encounter.followUpDate).toLocaleDateString("fr-FR")}
                </div>
              )}
              <div>
                <span style={{ color: "#757575" }}>Salle :</span>{" "}
                {encounter.roomLabel?.trim() || "—"}
              </div>
              <div>
                <span style={{ color: "#757575" }}>Médecin attribué :</span>{" "}
                {formatEncounterPhysicianAssignedFr(encounter)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#424242", marginBottom: 8, letterSpacing: 0.02 }}>
              Actions rapides
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {isRNOnly && (
                <>
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("triage")}>
                    Saisir les signes vitaux
                  </button>
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
                    Voir l&apos;évaluation médicale
                  </button>
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("orders")}>
                    Voir les ordres
                  </button>
                  {encounter.status === "OPEN" && canManageEncounterClosure ? (
                    <>
                      <button
                        type="button"
                        style={{
                          ...quickBtn,
                          backgroundColor: "#37474f",
                          color: "#fff",
                          borderColor: "#37474f",
                        }}
                        onClick={openDischargeThenClose}
                      >
                        Dossier de sortie
                      </button>
                      <button type="button" style={{ ...quickBtn, borderColor: "#c62828", color: "#c62828" }} onClick={openCloseConfirmModal}>
                        Terminer la consultation
                      </button>
                    </>
                  ) : null}
                  <Link href={`/app/patients/${patient.id}`} style={{ ...quickBtn, display: "inline-block", textDecoration: "none", color: "inherit" }}>
                    Retour au dossier patient
                  </Link>
                </>
              )}
              {isProviderLike && (
                <>
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
                    Évaluation médicale
                  </button>
                  <button
                    type="button"
                    style={quickBtn}
                    onClick={() => setActiveTab("diagnostics")}
                  >
                    Ajouter un diagnostic
                  </button>
                  {canPrescribe ? (
                    <>
                      <button
                        type="button"
                        style={quickBtn}
                        onClick={() => {
                          setActiveTab("orders");
                          setMedicationModalRequestTick((t) => t + 1);
                        }}
                      >
                        Créer une ordonnance
                      </button>
                      <button
                        type="button"
                        style={quickBtn}
                        onClick={() => {
                          setActiveTab("orders");
                          setCareModalPresetLabel("Pose de voie IV");
                          setCareModalRequestTick((t) => t + 1);
                        }}
                      >
                        Prescrire voie IV
                      </button>
                      <button
                        type="button"
                        style={quickBtn}
                        onClick={() => {
                          setActiveTab("orders");
                          setCareModalPresetLabel("Administration d'oxygène");
                          setCareModalRequestTick((t) => t + 1);
                        }}
                      >
                        Prescrire oxygène
                      </button>
                      <button
                        type="button"
                        style={quickBtn}
                        onClick={() => {
                          setActiveTab("orders");
                          setCareModalPresetLabel("Pansement / soin de plaie");
                          setCareModalRequestTick((t) => t + 1);
                        }}
                      >
                        Prescrire soin de plaie
                      </button>
                    </>
                  ) : null}
                  {canAdmitPatient ? (
                    <button
                      type="button"
                      style={{
                        ...quickBtn,
                        backgroundColor: "#f3e5f5",
                        borderColor: "#6a1b9a",
                        color: "#4a148c",
                        fontWeight: 600,
                      }}
                      onClick={() => setShowAdmissionModal(true)}
                    >
                      Admettre le patient
                    </button>
                  ) : null}
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("triage")}>
                    Voir les signes vitaux
                  </button>
                </>
              )}
              {!isRNOnly && !isProviderLike && (
                <>
                  <button type="button" style={quickBtn} onClick={() => setActiveTab("summary")}>
                    Résumé de la consultation
                  </button>
                  <Link href={`/app/patients/${patient.id}`} style={{ ...quickBtn, display: "inline-block", textDecoration: "none", color: "inherit" }}>
                    Retour au dossier patient
                  </Link>
                </>
              )}
            </div>
          </div>
          <EncounterOperationalPanel
            encounterId={encounterId}
            facilityId={facilityId}
            canEdit={canEditOperational && encounter.status === "OPEN"}
            roomLabel={encounter.roomLabel}
            physicianAssigned={encounter.physicianAssigned}
            onSaved={mergeEncounterFromOperationalPatch}
            onUpdated={() => void loadEncounter({ silent: true })}
          />
        </div>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "#f5f5f5" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === "summary" && (
            <EncounterSummaryTab
              encounter={encounter}
              showPrintDischarge={showPrintDischarge}
              onPrintDischarge={handlePrintDischarge}
            />
          )}
          {activeTab === "clinic" && (
            <ClinicVisitTab
              encounter={encounter}
              facilityId={facilityId}
              onUpdate={loadEncounter}
              canSignProviderDocumentation={isProviderLike}
            />
          )}
          {activeTab === "triage" && <TriageVitalsTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} />}
          {activeTab === "nursing" && showNursingTab && (
            <NursingAssessmentTab
              encounterId={encounterId}
              facilityId={facilityId}
              encounter={encounter}
              onUpdate={loadEncounter}
            />
          )}
          {activeTab === "diagnostics" && (
            <EncounterDiagnosticsTab
              encounterId={encounter.id}
              patientId={patient.id}
              facilityId={facilityId}
              canPrescribe={canPrescribe}
              onGoPatientChart={() => router.push(`/app/patients/${patient.id}`)}
            />
          )}
          {activeTab === "pathways" && <PathwaysTab encounterId={encounterId} encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} />}
          {activeTab === "notes" && <NotesTab encounter={encounter} facilityId={facilityId} onUpdate={loadEncounter} />}
          {activeTab === "orders" && (
            <OrdersTab
              encounterId={encounterId}
              encounter={encounter}
              facilityId={facilityId}
              canPrescribe={canPrescribe}
              medicationModalRequestTick={medicationModalRequestTick}
              careModalRequestTick={careModalRequestTick}
              careModalPresetLabel={careModalPresetLabel}
              onOrdersUpdated={refreshQuickOrdersOnly}
              onRefetchEncounter={() => loadEncounter({ silent: true })}
            />
          )}
          {activeTab === "mar" && canFetchMarTab && (
            <MedicationAdministrationTab
              encounterId={encounterId}
              facilityId={facilityId}
              encounterStatus={encounter.status}
            />
          )}
          {activeTab === "results" && (
            <EncounterResultsTab
              encounterId={encounterId}
              facilityId={facilityId}
              refreshToken={encounterResultsRefresh}
            />
          )}
        </div>
      </div>

      {showDischargeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
            padding: 16,
          }}
          onClick={() => setShowDischargeModal(false)}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discharge-title"
          >
            <h2 id="discharge-title" style={{ margin: "0 0 16px 0", fontSize: 18 }}>
              Dossier de sortie
            </h2>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#555", lineHeight: 1.45 }}>
              Champs infirmiers et médicaux selon le rôle (infirmier : état, destination, mode ; médecin :
              disposition, instructions, médicaments, suivi). Les champs non autorisés sont en lecture seule.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(
                [
                  ["disposition", "Disposition", "medical", 2],
                  ["exitCondition", "État à la sortie", "nursing", 2],
                  ["dischargeInstructions", "Instructions de sortie", "medical", 3],
                  ["medicationsGiven", "Médicaments remis / prescrits", "medical", 3],
                  ["followUp", "Suivi recommandé", "medical", 2],
                  ["returnIfWorse", "Retour si aggravation", "nursing", 2],
                  ["patientDestination", "Destination du patient", "nursing", 2],
                ] as const
              ).map(([key, label, kind, rows]) => {
                const editable =
                  (kind === "nursing" && canEditNursingDischarge) ||
                  (kind === "medical" && canEditMedicalDischarge);
                const k = key as keyof DischargeFormState;
                return (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>
                      {label}
                      {!editable ? (
                        <span style={{ fontWeight: 400, color: "#757575", marginLeft: 6 }}>(lecture seule)</span>
                      ) : null}
                    </span>
                    <textarea
                      readOnly={!editable}
                      value={dischargeForm[k] as string}
                      onChange={(e) => setDischargeForm((f) => ({ ...f, [k]: e.target.value }))}
                      rows={rows}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        fontSize: 14,
                        background: editable ? "#fff" : "#f5f5f5",
                        cursor: editable ? "text" : "not-allowed",
                      }}
                    />
                  </label>
                );
              })}
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>
                  Mode de sortie
                  {!canEditNursingDischarge ? (
                    <span style={{ fontWeight: 400, color: "#757575", marginLeft: 6 }}>(lecture seule)</span>
                  ) : null}
                </span>
                <select
                  disabled={!canEditNursingDischarge}
                  value={dischargeForm.dischargeMode}
                  onChange={(e) => setDischargeForm((f) => ({ ...f, dischargeMode: e.target.value }))}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 14,
                    background: canEditNursingDischarge ? "#fff" : "#f5f5f5",
                  }}
                >
                  <option value="">— Sélectionner —</option>
                  {DISCHARGE_MODE_OPTIONS_FR.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitDischargeAndConfirmClose}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  background: "#37474f",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Continuer vers la clôture
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmissionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2150,
            padding: 16,
          }}
          onClick={() => !savingAdmission && setShowAdmissionModal(false)}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              maxWidth: 560,
              width: "100%",
              padding: 24,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admission-title"
          >
            <h2 id="admission-title" style={{ margin: "0 0 12px 0", fontSize: 18, color: "#4a148c" }}>
              Dossier d&apos;admission
            </h2>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#555", lineHeight: 1.45 }}>
              Documentez la décision d&apos;hospitalisation depuis cette consultation. La{" "}
              <strong>sortie de consultation</strong> (autre flux) clôt la visite ; l&apos;
              <strong>admission</strong> enregistre la décision et le plan initial dans ce même dossier.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Motif d&apos;admission</span>
                <textarea
                  value={admissionForm.admissionReason}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, admissionReason: e.target.value }))}
                  rows={2}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Service / unité</span>
                <input
                  type="text"
                  value={admissionForm.serviceUnit}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, serviceUnit: e.target.value }))}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Diagnostic d&apos;admission</span>
                <textarea
                  value={admissionForm.admissionDiagnosis}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, admissionDiagnosis: e.target.value }))}
                  rows={2}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Niveau de soins</span>
                <input
                  type="text"
                  list="medora-care-level-suggestions"
                  placeholder="Saisie libre ou choix parmi les suggestions"
                  value={admissionForm.careLevel}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, careLevel: e.target.value }))}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
                <datalist id="medora-care-level-suggestions">
                  {CARE_LEVEL_OPTIONS_FR.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Condition à l&apos;admission</span>
                <textarea
                  value={admissionForm.conditionAtAdmission}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, conditionAtAdmission: e.target.value }))}
                  rows={3}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Plan initial</span>
                <textarea
                  value={admissionForm.initialPlan}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, initialPlan: e.target.value }))}
                  rows={3}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Médecin responsable</span>
                <input
                  type="text"
                  value={admissionForm.responsiblePhysicianName}
                  onChange={(e) => setAdmissionForm((f) => ({ ...f, responsiblePhysicianName: e.target.value }))}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                disabled={savingAdmission}
                onClick={() => setShowAdmissionModal(false)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: savingAdmission ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingAdmission}
                onClick={() => void submitAdmission()}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  background: "#6a1b9a",
                  color: "white",
                  cursor: savingAdmission ? "not-allowed" : "pointer",
                  opacity: savingAdmission ? 0.85 : 1,
                }}
              >
                {savingAdmission ? "…" : "Enregistrer le dossier d'admission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 16,
          }}
          onClick={() => !closingEncounter && setShowCloseConfirmModal(false)}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              maxWidth: 420,
              width: "100%",
              padding: 24,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-encounter-confirm-title"
          >
            <h2 id="close-encounter-confirm-title" style={{ margin: "0 0 12px 0", fontSize: 18 }}>
              Terminer la consultation
            </h2>
            <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#333", lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir terminer la consultation ?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => {
                  setShowCloseConfirmModal(false);
                  setPendingDischarge(null);
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => void runCloseDocumentationCheckAndProceed()}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  background: "#c62828",
                  color: "white",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                  opacity: closingEncounter ? 0.85 : 1,
                }}
              >
                {closingEncounter ? "…" : "Terminer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocumentationDeficiencyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
            padding: 16,
          }}
          onClick={() => {
            if (!closingEncounter) {
              setShowDocumentationDeficiencyModal(false);
              setDocumentationDeficiencies([]);
            }
          }}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="documentation-deficiency-title"
          >
            <h2 id="documentation-deficiency-title" style={{ margin: "0 0 12px 0", fontSize: 18 }}>
              Documentation incomplète
            </h2>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#333", lineHeight: 1.5 }}>
              Les éléments suivants sont manquants ou incomplets :
            </p>
            <ul style={{ margin: "0 0 20px 0", paddingLeft: 20, fontSize: 14, color: "#333", lineHeight: 1.5 }}>
              {documentationDeficiencies.map((d) => (
                <li key={d.code}>{d.labelFr}</li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => {
                  setShowDocumentationDeficiencyModal(false);
                  setDocumentationDeficiencies([]);
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                }}
              >
                Retour au dossier
              </button>
              <button
                type="button"
                disabled={closingEncounter}
                onClick={() => void executeCloseEncounter(true)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  background: "#5d4037",
                  color: "white",
                  cursor: closingEncounter ? "not-allowed" : "pointer",
                  opacity: closingEncounter ? 0.85 : 1,
                }}
              >
                {closingEncounter ? "…" : "Terminer quand même"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EncounterSummaryTab({
  encounter,
  showPrintDischarge,
  onPrintDischarge,
}: {
  encounter: any;
  showPrintDischarge: boolean;
  onPrintDischarge: () => void;
}) {
  const reason = encounter.visitReason || encounter.chiefComplaint;
  const nursingLines = nursingAssessmentDisplayLines(encounter?.nursingAssessment);
  const nursingSig = nursingAssessmentSignatureLineFr(encounter?.nursingAssessment);
  const physicianDocSections = parsePhysicianEvalV1ForChart(encounter?.nursingAssessment);
  const dischargePreview = parseDischargeSummaryForChart(encounter?.dischargeSummaryJson);
  const admissionPreview = parseAdmissionSummaryForChart(encounter?.admissionSummaryJson);
  return (
    <div>
      <h3>Résumé de la consultation</h3>
      <p style={{ color: "#757575", fontSize: 13, marginTop: -4, marginBottom: 16 }}>
        Synthèse clinique — les détails sont dans les onglets Signes vitaux et Évaluation médicale.
      </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <strong>Médecin attribué :</strong>{" "}
          {formatEncounterPhysicianAssignedFr(encounter)}
        </div>
        {reason && (
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Motif :</strong> {reason}
          </div>
        )}
        {nursingLines.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Évaluation infirmière (synthèse)</strong>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "#37474f", lineHeight: 1.5 }}>
              {nursingLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {nursingSig ? (
              <div style={{ fontSize: 12, color: "#546e7a", marginTop: 8, fontStyle: "italic" }}>{nursingSig}</div>
            ) : null}
          </div>
        )}
        {encounter.followUpDate && (
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Date de suivi :</strong>{" "}
            {new Date(encounter.followUpDate).toLocaleDateString("fr-FR")}
          </div>
        )}
      </div>
      {physicianDocSections.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Documentation médicale (HPI / ROS / examen / MDM)</strong>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {physicianDocSections.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.labelFr}</div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "#263238", marginTop: 4 }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(encounter.clinicianImpression || encounter.providerNote) && (
        <div style={{ marginTop: 16 }}>
          <strong>Impression clinique / Note médecin</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 4, whiteSpace: "pre-wrap" }}>
            {encounter.clinicianImpression || encounter.providerNote}
          </div>
        </div>
      )}
      {encounter.treatmentPlan && (
        <div style={{ marginTop: 16 }}>
          <strong>Plan de traitement</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: "#f0f7ff", borderRadius: 4, whiteSpace: "pre-wrap" }}>
            {encounter.treatmentPlan}
          </div>
        </div>
      )}
      {(admissionPreview || encounter.admittedAt) && (
        <div style={{ marginTop: 16 }}>
          <strong style={{ color: "#4a148c" }}>Décision d&apos;admission (hospitalisation)</strong>
          {encounter.admittedAt ? (
            <div style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
              Enregistrée le {new Date(encounter.admittedAt).toLocaleString("fr-FR")}
            </div>
          ) : null}
          {admissionPreview ? (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                backgroundColor: "#f3e5f5",
                borderRadius: 4,
                fontSize: 14,
                lineHeight: 1.5,
                color: "#263238",
                borderLeft: "4px solid #6a1b9a",
              }}
            >
              {admissionPreview.admissionReason ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Motif d&apos;admission : </span>
                  {admissionPreview.admissionReason}
                </div>
              ) : null}
              {admissionPreview.serviceUnit ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Service / unité : </span>
                  {admissionPreview.serviceUnit}
                </div>
              ) : null}
              {admissionPreview.admissionDiagnosis ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Diagnostic d&apos;admission : </span>
                  {admissionPreview.admissionDiagnosis}
                </div>
              ) : null}
              {admissionPreview.careLevel ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Niveau de soins : </span>
                  {admissionPreview.careLevel}
                </div>
              ) : null}
              {admissionPreview.conditionAtAdmission ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Condition à l&apos;admission : </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{admissionPreview.conditionAtAdmission}</span>
                </div>
              ) : null}
              {admissionPreview.initialPlan ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Plan initial : </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{admissionPreview.initialPlan}</span>
                </div>
              ) : null}
              {admissionPreview.responsiblePhysicianName ? (
                <div>
                  <span style={{ fontWeight: 600 }}>Médecin responsable : </span>
                  {admissionPreview.responsiblePhysicianName}
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#757575" }}>
              Décision d&apos;admission enregistrée — détail à compléter depuis le bouton « Admettre le patient ».
            </p>
          )}
        </div>
      )}
      {showPrintDischarge && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <strong>Sortie de consultation</strong>
            <button
              type="button"
              onClick={onPrintDischarge}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Imprimer la sortie
            </button>
          </div>
          {dischargePreview ? (
            <div
              style={{
                marginTop: 4,
                padding: 12,
                backgroundColor: "#eceff1",
                borderRadius: 4,
                fontSize: 14,
                lineHeight: 1.5,
                color: "#263238",
              }}
            >
              {dischargePreview.disposition ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Disposition : </span>
                  {dischargePreview.disposition}
                </div>
              ) : null}
              {dischargePreview.exitCondition ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>État à la sortie : </span>
                  {dischargePreview.exitCondition}
                </div>
              ) : null}
              {dischargePreview.dischargeInstructions ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Instructions de sortie : </span>
                  {dischargePreview.dischargeInstructions}
                </div>
              ) : null}
              {dischargePreview.medicationsGiven ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Médicaments remis / prescrits : </span>
                  {dischargePreview.medicationsGiven}
                </div>
              ) : null}
              {dischargePreview.followUp ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Suivi recommandé : </span>
                  {dischargePreview.followUp}
                </div>
              ) : null}
              {dischargePreview.returnIfWorse ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Retour si aggravation : </span>
                  {dischargePreview.returnIfWorse}
                </div>
              ) : null}
              {dischargePreview.patientDestination ? (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Destination du patient : </span>
                  {dischargePreview.patientDestination}
                </div>
              ) : null}
              {dischargePreview.dischargeMode ? (
                <div>
                  <span style={{ fontWeight: 600 }}>Mode de sortie : </span>
                  {dischargePreview.dischargeMode}
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#757575" }}>
              Aucun résumé de sortie structuré enregistré pour l&apos;instant — vous pouvez tout de même imprimer un
              document avec l&apos;identité patient et les informations de consultation.
            </p>
          )}
        </div>
      )}
      {encounter.notes && (
        <div style={{ marginTop: 16 }}>
          <strong>Note infirmière, autres</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 4, whiteSpace: "pre-wrap" }}>
            {encounter.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function EncounterDiagnosticsTab({
  encounterId,
  patientId,
  facilityId,
  canPrescribe,
  onGoPatientChart,
}: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  canPrescribe: boolean;
  onGoPatientChart: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ id: string; code: string; description: string | null; onsetDate: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId });
        const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
        const forEncounter = items
          .filter((d: any) => d.encounterId === encounterId)
          .map((d: any) => ({
            id: d.id,
            code: d.code,
            description: d.description ?? null,
            onsetDate: d.onsetDate ?? null,
          }));
        if (!cancelled) setRows(forEncounter);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [encounterId, patientId, facilityId]);

  if (loading) return <div>Chargement des diagnostics…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Diagnostics de la consultation</h3>
        {canPrescribe ? (
          <button
            type="button"
            onClick={onGoPatientChart}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6, background: "#fafafa", cursor: "pointer" }}
          >
            Ajouter un diagnostic
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 6, background: "#fafafa", color: "#555" }}>
          Aucun diagnostic enregistré pour cette consultation.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Code</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Libellé</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Début</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "10px 12px" }}>{r.code}</td>
                <td style={{ padding: "10px 12px" }}>{r.description || "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {r.onsetDate ? new Date(r.onsetDate).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Aligné sur la validation serveur avant signature de l’évaluation médicale. */
function encounterHasSignableProviderContentForUi(enc: {
  clinicianImpression?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
}): boolean {
  const note = (enc.clinicianImpression || enc.providerNote || "").trim();
  const plan = (enc.treatmentPlan || "").trim();
  if (note || plan) return true;
  const raw = enc.nursingAssessment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const pe = (raw as Record<string, unknown>).physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return false;
  const o = pe as Record<string, unknown>;
  return ["hpi", "ros", "physicalExam", "mdm"].some(
    (k) => typeof o[k] === "string" && (o[k] as string).trim().length > 0
  );
}

function parsePhysicianEvalV1FromEncounter(enc: { nursingAssessment?: unknown } | null | undefined): {
  hpi: string;
  ros: string;
  physicalExam: string;
  mdm: string;
} {
  const raw = enc?.nursingAssessment;
  const pe =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as { physicianEvalV1?: unknown }).physicianEvalV1
      : null;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) {
    return { hpi: "", ros: "", physicalExam: "", mdm: "" };
  }
  const o = pe as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    hpi: s(o.hpi),
    ros: s(o.ros),
    physicalExam: s(o.physicalExam),
    mdm: s(o.mdm),
  };
}

function ClinicVisitTab({
  encounter,
  facilityId,
  onUpdate,
  canSignProviderDocumentation,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
  canSignProviderDocumentation: boolean;
}) {
  const [visitReason, setVisitReason] = useState(encounter.visitReason || encounter.chiefComplaint || "");
  const [impression, setImpression] = useState(encounter.clinicianImpression || encounter.providerNote || "");
  const [plan, setPlan] = useState(encounter.treatmentPlan || "");
  const [followUp, setFollowUp] = useState(
    encounter.followUpDate ? new Date(encounter.followUpDate).toISOString().slice(0, 10) : ""
  );
  const [hpi, setHpi] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).hpi);
  const [ros, setRos] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).ros);
  const [physicalExam, setPhysicalExam] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).physicalExam);
  const [mdm, setMdm] = useState(() => parsePhysicianEvalV1FromEncounter(encounter).mdm);
  const [saving, setSaving] = useState(false);
  const [signingDoc, setSigningDoc] = useState(false);
  const [addendumText, setAddendumText] = useState("");
  const [addendumSaving, setAddendumSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "queued" | "err"; text: string } | null>(null);
  const readOnly = encounter.status !== "OPEN";
  const docSigned = encounter.providerDocumentationStatus === "SIGNED";
  const fieldsLocked = readOnly || docSigned;

  useEffect(() => {
    setVisitReason(encounter.visitReason || encounter.chiefComplaint || "");
    setImpression(encounter.clinicianImpression || encounter.providerNote || "");
    setPlan(encounter.treatmentPlan || "");
    setFollowUp(encounter.followUpDate ? new Date(encounter.followUpDate).toISOString().slice(0, 10) : "");
    const pe = parsePhysicianEvalV1FromEncounter(encounter);
    setHpi(pe.hpi);
    setRos(pe.ros);
    setPhysicalExam(pe.physicalExam);
    setMdm(pe.mdm);
  }, [
    encounter.id,
    encounter.updatedAt,
    encounter.visitReason,
    encounter.chiefComplaint,
    encounter.clinicianImpression,
    encounter.providerNote,
    encounter.treatmentPlan,
    encounter.followUpDate,
    encounter.nursingAssessment,
    encounter.providerDocumentationStatus,
    encounter.providerDocumentationSignedAt,
    encounter.providerDocumentationSignedByDisplayFr,
    encounter.providerAddenda,
  ]);

  const handleAddAddendum = async () => {
    const t = addendumText.trim();
    if (!t) return;
    setMessage(null);
    setAddendumSaving(true);
    try {
      await apiFetch(`/encounters/${encounter.id}/provider-addenda`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      setAddendumText("");
      setMessage({ type: "ok", text: "Addendum enregistré." });
      onUpdate();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text: normalizeUserFacingError(e instanceof Error ? e.message : null) || "Enregistrement impossible.",
      });
    } finally {
      setAddendumSaving(false);
    }
  };

  const handleSignDocumentation = async () => {
    setMessage(null);
    setSigningDoc(true);
    try {
      await apiFetch(`/encounters/${encounter.id}/sign-provider-documentation`, {
        method: "POST",
        facilityId,
      });
      setMessage({ type: "ok", text: "Évaluation médicale signée." });
      onUpdate();
    } catch (e: unknown) {
      setMessage({
        type: "err",
        text: normalizeUserFacingError(e instanceof Error ? e.message : null) || "Signature impossible.",
      });
    } finally {
      setSigningDoc(false);
    }
  };

  const save = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const prevNav = encounter.nursingAssessment;
      const prevObj =
        prevNav && typeof prevNav === "object" && !Array.isArray(prevNav)
          ? { ...(prevNav as Record<string, unknown>) }
          : {};
      const physicianEvalV1: Record<string, string> = {};
      if (hpi.trim()) physicianEvalV1.hpi = hpi.trim();
      if (ros.trim()) physicianEvalV1.ros = ros.trim();
      if (physicalExam.trim()) physicianEvalV1.physicalExam = physicalExam.trim();
      if (mdm.trim()) physicianEvalV1.mdm = mdm.trim();
      const mergedNav: Record<string, unknown> = { ...prevObj };
      if (Object.keys(physicianEvalV1).length > 0) mergedNav.physicianEvalV1 = physicianEvalV1;
      else delete mergedNav.physicianEvalV1;

      const prevKeys = prevObj && typeof prevObj === "object" ? Object.keys(prevObj as object) : [];
      const shouldPatchNav =
        Object.keys(mergedNav).length > 0 || prevKeys.length > 0;

      const payload: Record<string, unknown> = {
        visitReason: visitReason.trim() || null,
        clinicianImpression: impression.trim() || null,
        treatmentPlan: plan.trim() || null,
        followUpDate: followUp ? new Date(followUp + "T12:00:00").toISOString() : null,
      };
      if (shouldPatchNav) payload.nursingAssessment = mergedNav;

      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setMessage({
        type: queued ? "queued" : "ok",
        text: queued
          ? "Évaluation médicale enregistrée sur cet appareil, en attente de synchronisation. Pas encore confirmée côté serveur."
          : "Évaluation médicale enregistrée.",
      });
      onUpdate();
    } catch (e: any) {
      setMessage({
        type: "err",
        text: normalizeUserFacingError(e?.message) || "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>Évaluation médicale</h3>
      {docSigned &&
      encounter.providerDocumentationSignedByDisplayFr &&
      encounter.providerDocumentationSignedAt ? (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            backgroundColor: "#e3f2fd",
            borderRadius: 6,
            border: "1px solid #90caf9",
            fontSize: 14,
            color: "#0d47a1",
            lineHeight: 1.45,
          }}
        >
          Évaluation signée par <strong>{encounter.providerDocumentationSignedByDisplayFr}</strong> le{" "}
          {new Date(encounter.providerDocumentationSignedAt).toLocaleString("fr-FR")}
        </div>
      ) : null}
      {(encounter.providerAddenda ?? []).length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {(encounter.providerAddenda ?? []).map((ad: { id: string; text: string; createdAt: string; createdByDisplayFr?: string | null }) => (
            <div
              key={ad.id}
              style={{
                marginBottom: 12,
                padding: "12px 14px",
                backgroundColor: "#fafafa",
                borderRadius: 6,
                border: "1px solid #eee",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Addendum par {ad.createdByDisplayFr ?? "—"} le{" "}
                {new Date(ad.createdAt).toLocaleString("fr-FR")}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{ad.text}</div>
            </div>
          ))}
        </div>
      ) : null}
      {docSigned && canSignProviderDocumentation ? (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Ajouter un addendum</h4>
          <textarea
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            rows={4}
            maxLength={5000}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4, marginBottom: 8 }}
            placeholder="Texte de l'addendum (append-only, sans modifier l'évaluation signée)."
          />
          <button
            type="button"
            onClick={() => void handleAddAddendum()}
            disabled={addendumSaving || !addendumText.trim()}
            style={{
              padding: "8px 18px",
              backgroundColor: "#37474f",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: addendumSaving || !addendumText.trim() ? "not-allowed" : "pointer",
              opacity: addendumSaving || !addendumText.trim() ? 0.65 : 1,
            }}
          >
            {addendumSaving ? "Enregistrement…" : "Enregistrer l'addendum"}
          </button>
        </div>
      ) : null}
      <p style={{ color: "#757575", fontSize: 13 }}>
        {readOnly
          ? "Consultation clôturée — lecture seule."
          : "HPI, ROS, examen, aide à la décision, impression, plan et suivi — enregistrement partagé avec le dossier patient."}
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Motif de visite</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <select
            disabled={fieldsLocked}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) setVisitReason(v);
            }}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, minWidth: 200 }}
            aria-label="Choisir un motif courant"
          >
            <option value="">— Motifs courants —</option>
            {COMMON_VISIT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <input
          disabled={fieldsLocked}
          value={visitReason}
          onChange={(e) => setVisitReason(e.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Pourquoi le patient est-il là aujourd'hui ?"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Histoire de la maladie actuelle (HPI)</label>
        <textarea
          disabled={fieldsLocked}
          value={hpi}
          onChange={(e) => setHpi(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Histoire de la plainte actuelle"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Revue des systèmes (ROS)</label>
        <textarea
          disabled={fieldsLocked}
          value={ros}
          onChange={(e) => setRos(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Revue par systèmes"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Examen physique</label>
        <textarea
          disabled={fieldsLocked}
          value={physicalExam}
          onChange={(e) => setPhysicalExam(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Constatations à l’examen"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Aide à la décision médicale (MDM)</label>
        <textarea
          disabled={fieldsLocked}
          value={mdm}
          onChange={(e) => setMdm(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Complexité, données, risque, synthèse décisionnelle"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Impression clinique</label>
        {!fieldsLocked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>Insérer :</span>
            {PROVIDER_IMPRESSION_SNIPPETS.slice(0, 5).map((snippet) => (
              <button
                key={snippet.slice(0, 24)}
                type="button"
                onClick={() => setImpression((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#f9f9f9",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={snippet}
              >
                {snippet.length > 36 ? snippet.slice(0, 35) + "…" : snippet}
              </button>
            ))}
          </div>
        )}
        <textarea
          disabled={fieldsLocked}
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Bilan / impression clinique"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Plan de traitement</label>
        {!fieldsLocked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>Insérer :</span>
            {PROVIDER_PLAN_SNIPPETS.slice(0, 5).map((snippet) => (
              <button
                key={snippet.slice(0, 24)}
                type="button"
                onClick={() => setPlan((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#f9f9f9",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={snippet}
              >
                {snippet.length > 36 ? snippet.slice(0, 35) + "…" : snippet}
              </button>
            ))}
          </div>
        )}
        <textarea
          disabled={fieldsLocked}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
          placeholder="Médicaments, éducation, examens demandés, précautions de retour…"
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Date de suivi</label>
        <input
          type="date"
          disabled={fieldsLocked}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
        />
      </div>
      {message && (
        <p
          role={message.type === "queued" ? "alert" : undefined}
          style={{
            color:
              message.type === "ok" ? "#2e7d32" : message.type === "queued" ? "#b71c1c" : "#c62828",
            marginBottom: 12,
            fontWeight: message.type === "queued" ? 600 : undefined,
            lineHeight: 1.45,
          }}
        >
          {message.text}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        {!readOnly && !docSigned && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "10px 24px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer la visite"}
          </button>
        )}
        {canSignProviderDocumentation && !readOnly && !docSigned && (
          <button
            type="button"
            onClick={() => void handleSignDocumentation()}
            disabled={
              signingDoc || !encounterHasSignableProviderContentForUi(encounter)
            }
            style={{
              padding: "10px 24px",
              backgroundColor: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor:
                signingDoc || !encounterHasSignableProviderContentForUi(encounter)
                  ? "not-allowed"
                  : "pointer",
              opacity: signingDoc || !encounterHasSignableProviderContentForUi(encounter) ? 0.65 : 1,
            }}
          >
            {signingDoc ? "…" : "Signer l'évaluation"}
          </button>
        )}
      </div>
    </div>
  );
}

function TriageVitalsTab({
  encounter,
  facilityId,
  onUpdate,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
}) {
  const [triage, setTriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const vitals = (triage?.vitalsJson as any) || {};
  const [formData, setFormData] = useState({
    chiefComplaint: "",
    onsetAt: "",
    esi: "",
    tempC: "",
    hr: "",
    rr: "",
    bpSys: "",
    bpDia: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    allergyNote: "",
    strokeScreen: "",
    sepsisScreen: "",
    triageCompleteAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string>("");
  const isReadOnly = encounter.status !== "OPEN";

  useEffect(() => {
    loadTriage();
  }, [encounter.id, facilityId]);

  const loadTriage = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      setTriage(data);
      if (data) {
        const v = (data.vitalsJson || {}) as Record<string, number | string | null>;
        setFormData({
          chiefComplaint: data.chiefComplaint || "",
          onsetAt: data.onsetAt ? new Date(data.onsetAt).toISOString().slice(0, 16) : "",
          esi: data.esi?.toString() || "",
          tempC: v.tempC?.toString() ?? "",
          hr: v.hr?.toString() ?? "",
          rr: v.rr?.toString() ?? "",
          bpSys: v.bpSys?.toString() ?? "",
          bpDia: v.bpDia?.toString() ?? "",
          spo2: v.spo2?.toString() ?? "",
          weightKg: v.weightKg?.toString() ?? "",
          heightCm: v.heightCm?.toString() ?? "",
          allergyNote:
            (data.vitalsJson as { allergyNote?: string | null } | null | undefined)?.allergyNote ?? "",
          strokeScreen: data.strokeScreen ? JSON.stringify(data.strokeScreen, null, 2) : "",
          sepsisScreen: data.sepsisScreen ? JSON.stringify(data.sepsisScreen, null, 2) : "",
          triageCompleteAt: data.triageCompleteAt ? new Date(data.triageCompleteAt).toISOString().slice(0, 16) : "",
        });
      }
    } catch (error) {
      console.error("Failed to load triage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveInfo("");

    const screenWarnings: string[] = [];

    let strokeScreenParsed: unknown = null;
    if (formData.strokeScreen.trim()) {
      try {
        strokeScreenParsed = JSON.parse(formData.strokeScreen);
      } catch {
        strokeScreenParsed = null;
        screenWarnings.push("strokeScreen : JSON invalide, champ ignoré.");
      }
    }

    let sepsisScreenParsed: unknown = null;
    if (formData.sepsisScreen.trim()) {
      try {
        sepsisScreenParsed = JSON.parse(formData.sepsisScreen);
      } catch {
        sepsisScreenParsed = null;
        screenWarnings.push("sepsisScreen : JSON invalide, champ ignoré.");
      }
    }

    try {
      const payload: any = {
        chiefComplaint: formData.chiefComplaint || null,
        onsetAt: formData.onsetAt ? new Date(formData.onsetAt).toISOString() : null,
        esi: formData.esi ? parseInt(formData.esi) : null,
        vitalsJson: {
          tempC: formData.tempC ? parseFloat(formData.tempC) : null,
          hr: formData.hr ? parseInt(formData.hr) : null,
          rr: formData.rr ? parseInt(formData.rr) : null,
          bpSys: formData.bpSys ? parseInt(formData.bpSys) : null,
          bpDia: formData.bpDia ? parseInt(formData.bpDia) : null,
          spo2: formData.spo2 ? parseInt(formData.spo2) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          allergyNote: (() => {
            const t = formData.allergyNote.trim();
            return t.length > 0 ? t.slice(0, 2000) : null;
          })(),
        },
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: formData.triageCompleteAt ? new Date(formData.triageCompleteAt).toISOString() : null,
      };
      // Remove null values from vitalsJson
      Object.keys(payload.vitalsJson).forEach((key) => {
        if (payload.vitalsJson[key] === null) delete payload.vitalsJson[key];
      });
      if (Object.keys(payload.vitalsJson).length === 0) payload.vitalsJson = null;

      const res = await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
      if (
        patientIdForEvent &&
        triage &&
        hasVitalsJson(triage.vitalsJson) &&
        triage.id
      ) {
        const u = triage.updatedAt;
        supersededSnapshot = {
          encounterId: encounter.id,
          encounterType: encounter.type ?? "—",
          triageId: triage.id,
          updatedAt: typeof u === "string" ? u : new Date(u).toISOString(),
          triageCompleteAt: triage.triageCompleteAt
            ? new Date(triage.triageCompleteAt).toISOString()
            : null,
          vitalsJson: { ...(triage.vitalsJson as object) } as Record<string, unknown>,
        };
      }
      if (patientIdForEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId: patientIdForEvent, supersededSnapshot },
          })
        );
      }

      loadTriage();
      onUpdate();
      const baseMsg = (res as any)?.queued ? "En attente de synchronisation" : "Signes vitaux enregistrés";
      setSaveInfo(
        screenWarnings.length ? `${baseMsg} ${screenWarnings.join(" ")}` : baseMsg
      );
    } catch (error) {
      console.error("Save error:", error);
      setSaveInfo("Impossible d'enregistrer les signes vitaux");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Chargement des signes vitaux…</div>;
  }

  const triageUpdatedLine =
    triage?.updatedByDisplayFr?.trim() && triage.updatedAt
      ? `Dernière mise à jour par ${triage.updatedByDisplayFr.trim()} — ${new Date(triage.updatedAt).toLocaleString("fr-FR")}`
      : null;

  return (
    <div>
      <h3 style={{ marginBottom: triageUpdatedLine ? 8 : undefined }}>
        Signes vitaux
      </h3>
      {triageUpdatedLine ? (
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#424242" }}>{triageUpdatedLine}</p>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Motif principal
          </label>
          <input
            type="text"
            value={formData.chiefComplaint}
            onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Date / heure de début
          </label>
          <input
            type="datetime-local"
            value={formData.onsetAt}
            onChange={(e) => setFormData({ ...formData, onsetAt: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            ESI (indice de gravité) 1-5
          </label>
          <select
            value={formData.esi}
            onChange={(e) => setFormData({ ...formData, esi: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          >
            <option value="">Choisir…</option>
            <option value="1">1 - Réanimation</option>
            <option value="2">2 - Émergent</option>
            <option value="3">3 - Urgent</option>
            <option value="4">4 - Moins urgent</option>
            <option value="5">5 - Non urgent</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Complété à
          </label>
          <input
            type="datetime-local"
            value={formData.triageCompleteAt}
            onChange={(e) => setFormData({ ...formData, triageCompleteAt: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      </div>

      <h4 style={{ marginTop: 24, marginBottom: 16 }}>Valeurs</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Temp. (°C)</label>
          <input
            type="number"
            step="0.1"
            value={formData.tempC}
            onChange={(e) => setFormData({ ...formData, tempC: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Fréquence cardiaque (bpm)</label>
          <input
            type="number"
            value={formData.hr}
            onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Fréquence respiratoire</label>
          <input
            type="number"
            value={formData.rr}
            onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>TA systolique</label>
          <input
            type="number"
            value={formData.bpSys}
            onChange={(e) => setFormData({ ...formData, bpSys: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>TA diastolique</label>
          <input
            type="number"
            value={formData.bpDia}
            onChange={(e) => setFormData({ ...formData, bpDia: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>SpO2 (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.spo2}
            onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Poids (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weightKg}
            onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Taille (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.heightCm}
            onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
            disabled={isReadOnly}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Allergie</label>
        <textarea
          value={formData.allergyNote}
          onChange={(e) => setFormData({ ...formData, allergyNote: e.target.value })}
          disabled={isReadOnly}
          maxLength={2000}
          rows={4}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, minHeight: 80 }}
        />
      </div>

      {!isReadOnly && (
        <div style={{ marginTop: 24 }}>
          {saveInfo && (
            <div style={{ marginBottom: 10, color: saveInfo.includes("Impossible") ? "#c62828" : "#2e7d32", fontSize: 13 }}>
              {saveInfo}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer les signes vitaux"}
          </button>
        </div>
      )}
      {isReadOnly && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fff3cd", borderRadius: 4, color: "#856404" }}>
          La consultation est fermée. Les signes vitaux sont en lecture seule.
        </div>
      )}
    </div>
  );
}

function NotesTab({
  encounter,
  facilityId,
  onUpdate,
}: {
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
}) {
  const [notes, setNotes] = useState(encounter.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      onUpdate();
      alert(
        queued
          ? "Notes enregistrées sur cet appareil, en attente de synchronisation. Pas encore confirmées côté serveur."
          : "Notes enregistrées"
      );
    } catch (error) {
      alert("Impossible d'enregistrer les notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3>Notes Inf.</h3>
      <p style={{ fontSize: 12, color: "#9e9e9e", marginBottom: 8 }}>Raccourcis ci-dessous.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {COMMON_NOTE_SNIPPETS.slice(0, 6).map((snippet) => (
          <button
            key={snippet.slice(0, 20)}
            type="button"
            onClick={() => setNotes((prev: string) => (prev ? `${prev}\n${snippet}` : snippet))}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "#f5f5f5",
              cursor: "pointer",
              whiteSpace: "nowrap",
              maxWidth: 260,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={snippet}
          >
            {snippet.length > 32 ? snippet.slice(0, 31) + "…" : snippet}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 4, marginBottom: 16 }}
        placeholder="Notes infirmières ou médicales…"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 20px",
          backgroundColor: "#1a1a1a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer les notes"}
      </button>
    </div>
  );
}

function PathwaysTab({
  encounterId,
  encounter,
  facilityId,
  onUpdate,
}: {
  encounterId: string;
  encounter: any;
  facilityId: string;
  onUpdate: () => void;
}) {
  const [pathway, setPathway] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Use the timer hook - no more polling needed!
  const { milestoneViews, summary } = usePathwayTimers(pathway, {
    autoMarkMissedInUI: true,
  });

  useEffect(() => {
    loadPathway();
  }, [encounterId, facilityId]);

  const loadPathway = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/pathways`, { facilityId });
      setPathway(data && typeof data === "object" && !Array.isArray(data) ? data : null);
    } catch (error) {
      console.error("Failed to load pathway:", error);
      setPathway(null);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (type: string) => {
    if (!confirm(`Activer le parcours ${getPathwayTypeLabelFr(type)} ? Des ordres de protocole seront créés.`)) return;
    setActivating(true);
    try {
      await apiFetch(`/encounters/${encounterId}/pathways/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        facilityId,
      });
      await loadPathway();
      onUpdate(); // Refresh encounter
    } catch (error: any) {
      alert(
        `Impossible d'activer le parcours : ${normalizeUserFacingError(error?.message) || "erreur inconnue"}`
      );
    } finally {
      setActivating(false);
    }
  };

  const handlePause = async () => {
    if (!pathway?.id) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/pause`, {
        method: "POST",
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert("Impossible de mettre le parcours en pause");
    }
  };

  const handleComplete = async () => {
    if (!pathway?.id) return;
    if (!confirm("Clôturer ce parcours ?")) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/complete`, {
        method: "POST",
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert("Impossible de clôturer le parcours");
    }
  };

  const handleMarkMilestone = async (milestoneId: string) => {
    if (!pathway?.id) return;
    try {
      await apiFetch(`/pathways/${pathway.id}/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "MET" }),
        facilityId,
      });
      await loadPathway();
    } catch (error) {
      alert("Impossible de valider le jalon");
    }
  };

  const jumpToNextDue = () => {
    if (!summary?.nextDue) return;
    const nextDueId = summary.nextDue.id;
    const el = rowRefs.current[nextDueId];
    if (!el) return;

    // Set flash state
    setFlashId(nextDueId);
    setTimeout(() => {
      setFlashId((cur) => (cur === nextDueId ? null : cur));
    }, 1500);

    // Scroll to element
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) return <div>Chargement des parcours…</div>;

  const isReadOnly = encounter.status !== "OPEN";

  return (
    <div>
      <h3>Parcours urgences</h3>
      {!pathway ? (
        <div>
          <p>Aucun parcours actif. Activez un parcours pour lancer les ordres de protocole et les chronos.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {["STROKE", "SEPSIS", "STEMI", "TRAUMA"].map((type) => (
              <button
                key={type}
                onClick={() => handleActivate(type)}
                disabled={activating || isReadOnly}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: activating || isReadOnly ? "not-allowed" : "pointer",
                  fontSize: 14,
                  opacity: activating || isReadOnly ? 0.6 : 1,
                }}
              >
                Activer {getPathwayTypeLabelFr(type)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0" }}>
                  Parcours {getPathwayTypeLabelFr(pathway.type)} – {getPathwayStatusLabelFr(pathway.status)}
                </h4>
                <div style={{ fontSize: 14, color: "#666" }}>
                  Activé le : {new Date(pathway.activatedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {pathway.status === "ACTIVE" && (
                  <button
                    onClick={handlePause}
                    disabled={isReadOnly}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      fontSize: 14,
                    }}
                  >
                    Mettre en pause
                  </button>
                )}
                {pathway.status !== "COMPLETED" && (
                  <button
                    onClick={handleComplete}
                    disabled={isReadOnly}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      fontSize: 14,
                    }}
                  >
                    Terminer
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: 16 }}>Chronos et jalons</h4>
            {summary && (
              <PathwaySessionSummaryBar
                summary={summary}
                pathwayStatus={pathway.status}
                onJumpToNextDue={jumpToNextDue}
              />
            )}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {(Array.isArray(milestoneViews) ? milestoneViews : []).map((milestone) => (
                <PathwayMilestoneRow
                  key={milestone.id}
                  ref={(el) => {
                    rowRefs.current[milestone.id] = el;
                  }}
                  milestone={milestone}
                  pathwayStatus={pathway.status}
                  onMarkMet={handleMarkMilestone}
                  isNextDue={summary?.nextDue?.id === milestone.id}
                  isFlashing={flashId === milestone.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatOrderItemLineFr(it: any): string {
  return getOrderItemDisplayLabelFr(it);
}

function medicationIntentLabelFr(intent: string | null | undefined): string {
  if (intent === "ADMINISTER_CHART") return "À administrer au patient";
  return "À envoyer à la pharmacie";
}

/** Aligné sur `assertCanTransition(…, CANCELLED)` côté serveur — ordre parent. */
function canAttemptWholeOrderCancel(order: { status?: string; pendingSync?: boolean }, encounterOpen: boolean): boolean {
  if (!encounterOpen) return false;
  if (order.pendingSync) return false;
  const st = order.status ?? "";
  if (st === "CANCELLED") return false;
  if (
    st === "COMPLETED" ||
    st === "RESULTED" ||
    st === "VERIFIED" ||
    st === "IN_PROGRESS" ||
    st === "STARTED"
  ) {
    return false;
  }
  return true;
}

function OrdersTab({
  encounterId,
  encounter,
  facilityId,
  canPrescribe,
  medicationModalRequestTick = 0,
  careModalRequestTick = 0,
  careModalPresetLabel = null,
  onOrdersUpdated,
  onRefetchEncounter,
}: {
  encounterId: string;
  encounter: any;
  facilityId: string;
  canPrescribe: boolean;
  medicationModalRequestTick?: number;
  careModalRequestTick?: number;
  careModalPresetLabel?: string | null;
  onOrdersUpdated?: () => void | Promise<void>;
  onRefetchEncounter?: () => Promise<void>;
}) {
  const { roles } = useFacilityAndRoles();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitialTab, setCreateModalInitialTab] = useState<OrderModalTab>("LAB");
  /** Libellé CARE à injecter uniquement à l’ouverture via action rapide (évite de réutiliser un ancien preset avec une ordonnance). */
  const [carePresetForOpenModal, setCarePresetForOpenModal] = useState<string | null>(null);
  const isRn = roles.includes("RN") || roles.includes("ADMIN");
  const canCancelWholeOrder =
    roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN");
  const encounterOpen = encounter?.status === "OPEN";
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);
  const [cancelReasonSelection, setCancelReasonSelection] = useState<string>("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [ordersFeedback, setOrdersFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handlePrintRx = (order: any) => {
    if (order.type !== "MEDICATION") return;
    printRx({
      order: {
        createdAt: order.createdAt,
        prescriberName: order.prescriberName,
        prescriberLicense: order.prescriberLicense,
        prescriberContact: order.prescriberContact,
        items: order.items || [],
      },
      patient: encounter?.patient ?? {},
    });
  };

  useEffect(() => {
    if (facilityId) {
      loadOrders();
    }
  }, [encounterId, facilityId]);

  const loadOrders = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const pending = await getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(
      () => [] as Record<string, unknown>[]
    );
    try {
      const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      const server = Array.isArray(data) ? data : [];
      setOrders(mergeOrders(server, pending));
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrders(mergeOrders([], pending));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const confirmCancelWholeOrder = async () => {
    if (!cancelConfirmOrderId || cancelSubmitting || !cancelReasonSelection.trim()) return;
    setCancelSubmitting(true);
    setOrdersFeedback(null);
    try {
      await apiFetch(`/orders/${cancelConfirmOrderId}/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: cancelReasonSelection }),
      });
      setCancelConfirmOrderId(null);
      setCancelReasonSelection("");
      setOrdersFeedback({ type: "ok", text: "La commande a été annulée." });
      await loadOrders({ silent: true });
      await onOrdersUpdated?.();
      await onRefetchEncounter?.();
    } catch (e: unknown) {
      setOrdersFeedback({
        type: "err",
        text: normalizeUserFacingError(e instanceof Error ? e.message : null) || "Impossible d'annuler cette commande.",
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  useEffect(() => {
    if (medicationModalRequestTick <= 0 || !canPrescribe) return;
    setCreateModalInitialTab("MEDICATION");
    setCarePresetForOpenModal(null);
    setShowCreateModal(true);
  }, [medicationModalRequestTick, canPrescribe]);

  useEffect(() => {
    if (careModalRequestTick <= 0 || !canPrescribe) return;
    setCreateModalInitialTab("CARE");
    setCarePresetForOpenModal(careModalPresetLabel?.trim() ?? null);
    setShowCreateModal(true);
  }, [careModalRequestTick, canPrescribe, careModalPresetLabel]);

  if (loading) return <div>Chargement des ordres…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Ordres</h3>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#9e9e9e", maxWidth: 480 }}>
            Analyses, imagerie, ordonnances — prescription médicamenteuse : médecins / administrateurs.
          </p>
        </div>
        {canPrescribe ? (
          <button
            onClick={() => {
              setCreateModalInitialTab("LAB");
              setShowCreateModal(true);
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            Créer un ordre
          </button>
        ) : null}
      </div>

      {ordersFeedback ? (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: ordersFeedback.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: ordersFeedback.type === "ok" ? "#1b5e20" : "#b71c1c",
            border: `1px solid ${ordersFeedback.type === "ok" ? "#a5d6a7" : "#ef9a9a"}`,
          }}
        >
          {ordersFeedback.text}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          Aucun ordre trouvé
        </div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Type</th>
                <th style={{ padding: 12, textAlign: "left" }}>Statut</th>
                <th style={{ padding: 12, textAlign: "left" }}>Priorité</th>
                <th style={{ padding: 12, textAlign: "left" }}>Détail clinique</th>
                <th style={{ padding: 12, textAlign: "left" }}>Saisie de l&apos;ordre</th>
                {(canPrescribe || isRn) && <th style={{ padding: 12, textAlign: "left" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const orderStatusBadgeKey =
                  order.type === "MEDICATION" ? medicationOrderStatusKeyForEncounterTab(order) : order.status;
                return (
                <tr
                  key={order.id}
                  style={{
                    borderTop: "1px solid #eee",
                    backgroundColor: (order as { pendingSync?: boolean }).pendingSync ? "#fff8e1" : undefined,
                  }}
                >
                  <td style={{ padding: 12, verticalAlign: "top" }}>
                    {(order as { pendingSync?: boolean }).pendingSync ? (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#856404",
                          marginBottom: 8,
                          padding: "4px 8px",
                          backgroundColor: "#fff3cd",
                          borderRadius: 4,
                          display: "inline-block",
                        }}
                      >
                        En attente de synchronisation
                      </div>
                    ) : null}
                    {order.type === "LAB" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>Laboratoire</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>Analyses demandées :</strong>{" "}
                          {(order.items || []).map((it: any) => getOrderItemDisplayLabelFr(it)).filter(Boolean).join(", ") || "—"}
                        </div>
                      </>
                    ) : order.type === "IMAGING" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>Imagerie</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>Imagerie demandée :</strong>{" "}
                          {(order.items || []).map((it: any) => getOrderItemDisplayLabelFr(it)).filter(Boolean).join(", ") || "—"}
                        </div>
                      </>
                    ) : order.type === "MEDICATION" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>Médicaments</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>Médicaments :</strong>{" "}
                          {(order.items || []).map((it: any) => getOrderItemDisplayLabelFr(it)).filter(Boolean).join(", ") || "—"}
                        </div>
                      </>
                    ) : order.type === "CARE" ? (
                      <>
                        <div style={{ fontWeight: 600 }}>Soins / procédures</div>
                        <div style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.45 }}>
                          <strong>Soins demandés :</strong>{" "}
                          {(order.items || []).map((it: any) => getOrderItemDisplayLabelFr(it)).filter(Boolean).join(", ") || "—"}
                        </div>
                      </>
                    ) : (
                      <span>{String(order.type)}</span>
                    )}
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          orderStatusBadgeKey === "PENDING"
                            ? "#fff3cd"
                            : orderStatusBadgeKey === "COMPLETED"
                              ? "#d4edda"
                              : orderStatusBadgeKey === "CANCELLED"
                                ? "#ffebee"
                                : orderStatusBadgeKey === "IN_PROGRESS"
                                  ? "#e3f2fd"
                                  : "#f5f5f5",
                        color:
                          orderStatusBadgeKey === "PENDING"
                            ? "#856404"
                            : orderStatusBadgeKey === "COMPLETED"
                              ? "#155724"
                              : orderStatusBadgeKey === "CANCELLED"
                                ? "#b71c1c"
                                : orderStatusBadgeKey === "IN_PROGRESS"
                                  ? "#1565c0"
                                  : "#666",
                      }}
                    >
                      {getOrderItemStatusLabel(orderStatusBadgeKey)}
                    </span>
                    {order.status === "CANCELLED" &&
                    ((order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr ||
                      (order as { cancelledAt?: string | null }).cancelledAt ||
                      (order as { cancellationReason?: string | null }).cancellationReason) ? (
                      <div style={{ fontSize: 12, color: "#616161", marginTop: 8, lineHeight: 1.45 }}>
                        {(order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr ? (
                          <>
                            Annulée par{" "}
                            <strong>{(order as { cancelledByDisplayFr?: string | null }).cancelledByDisplayFr}</strong>
                            {(order as { cancelledAt?: string | null }).cancelledAt ? (
                              <>
                                {" "}
                                le{" "}
                                {new Date(
                                  String((order as { cancelledAt?: string | null }).cancelledAt)
                                ).toLocaleString("fr-FR")}
                              </>
                            ) : null}
                          </>
                        ) : null}
                        {(order as { cancellationReason?: string | null }).cancellationReason ? (
                          <>
                            <br />
                            Raison : {(order as { cancellationReason?: string | null }).cancellationReason}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top" }}>{getOrderPriorityLabelFr(order.priority)}</td>
                  <td style={{ padding: 12, verticalAlign: "top", fontSize: 13 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(order.items || []).map((it: any) => (
                        <li key={it.id} style={{ marginBottom: 8 }}>
                          <strong>{formatOrderItemLineFr(it)}</strong>
                          {order.type === "MEDICATION" && !medicationLineClinicallyExecuted(it) ? (
                            <div style={{ fontSize: 12, color: "#555" }}>
                              {medicationIntentLabelFr(it.medicationFulfillmentIntent)} · Qté : {it.quantity ?? "—"}
                              {it.refillCount != null ? ` · Renouvellements : ${it.refillCount}` : ""}
                              {it.notes ? ` · Posologie : ${it.notes}` : ""}
                            </div>
                          ) : null}
                          {it.completedAt && it.completedByNurse ? (
                            <div style={{ fontSize: 12, color: "#2e7d32" }}>
                              Administré par {it.completedByNurse.firstName} {it.completedByNurse.lastName} le{" "}
                              {new Date(it.completedAt).toLocaleString("fr-FR")}
                            </div>
                          ) : order.type === "MEDICATION" &&
                            Array.isArray(it.medicationAdministrations) &&
                            it.medicationAdministrations[0]?.administeredAt &&
                            it.medicationAdministrations[0]?.administeredBy ? (
                            <div style={{ fontSize: 12, color: "#2e7d32" }}>
                              Administré par {it.medicationAdministrations[0].administeredBy.firstName}{" "}
                              {it.medicationAdministrations[0].administeredBy.lastName} le{" "}
                              {new Date(it.medicationAdministrations[0].administeredAt).toLocaleString("fr-FR")}
                            </div>
                          ) : order.type === "MEDICATION" && it.pharmacyDispenseRecord?.dispensedAt ? (
                            <div style={{ fontSize: 12, color: "#1565c0" }}>
                              Délivré par {it.pharmacyDispenseRecord.dispensedBy?.firstName ?? ""}{" "}
                              {it.pharmacyDispenseRecord.dispensedBy?.lastName ?? ""} le{" "}
                              {new Date(it.pharmacyDispenseRecord.dispensedAt).toLocaleString("fr-FR")}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td style={{ padding: 12, verticalAlign: "top", whiteSpace: "normal", fontSize: 13 }}>
                    {order.orderedByDisplayFr?.trim()
                      ? `Ordre saisi par ${order.orderedByDisplayFr.trim()} — ${new Date(order.createdAt).toLocaleString("fr-FR")}`
                      : new Date(order.createdAt).toLocaleString("fr-FR")}
                  </td>
                  {(canPrescribe || isRn) && (
                    <td style={{ padding: 12, verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                        {canPrescribe && order.type === "MEDICATION" && !(order as { pendingSync?: boolean }).pendingSync ? (
                          <button
                            type="button"
                            onClick={() => handlePrintRx(order)}
                            style={{ padding: "4px 12px", fontSize: 13, cursor: "pointer", border: "1px solid #ddd", borderRadius: 4 }}
                          >
                            Imprimer
                          </button>
                        ) : null}
                        {canCancelWholeOrder &&
                        canAttemptWholeOrderCancel(order, encounterOpen) &&
                        orderAllowsWholeCancelOnline(order) ? (
                          <button
                            type="button"
                            disabled={cancelSubmitting}
                            onClick={() => {
                              setOrdersFeedback(null);
                              setCancelReasonSelection("");
                              setCancelConfirmOrderId(order.id);
                            }}
                            style={{
                              padding: "4px 12px",
                              fontSize: 13,
                              cursor: cancelSubmitting ? "not-allowed" : "pointer",
                              border: "1px solid #e57373",
                              borderRadius: 4,
                              backgroundColor: "#fff",
                              color: "#c62828",
                            }}
                          >
                            Annuler la commande
                          </button>
                        ) : null}
                      </div>
                      {order.type === "MEDICATION" && order.prescriberName ? (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Prescripteur : {order.prescriberName}</div>
                      ) : null}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelConfirmOrderId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
          aria-busy={cancelSubmitting}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
            cursor: cancelSubmitting ? "wait" : "default",
          }}
          onClick={(e) => {
            if (cancelSubmitting) return;
            if (e.target === e.currentTarget) setCancelConfirmOrderId(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              maxWidth: 440,
              width: "100%",
              padding: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="cancel-order-title" style={{ margin: "0 0 12px 0", fontSize: 17 }}>
              Annuler cette commande ?
            </h4>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, lineHeight: 1.5, color: "#424242" }}>
              Cette action annule toute la commande (toutes les lignes). Elle ne peut pas être annulée depuis cet écran.
            </p>
            <label style={{ display: "block", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
              Motif d&apos;annulation
              <select
                value={cancelReasonSelection}
                onChange={(e) => setCancelReasonSelection(e.target.value)}
                disabled={cancelSubmitting}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 10px",
                  fontSize: 14,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              >
                <option value="">— Choisir un motif —</option>
                {ORDER_CANCELLATION_REASON_VALUES.map((r: (typeof ORDER_CANCELLATION_REASON_VALUES)[number]) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={() => {
                  setCancelConfirmOrderId(null);
                  setCancelReasonSelection("");
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#fff",
                  cursor: cancelSubmitting ? "not-allowed" : "pointer",
                }}
              >
                Retour
              </button>
              <button
                type="button"
                disabled={cancelSubmitting || !cancelReasonSelection.trim()}
                onClick={() => void confirmCancelWholeOrder()}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  border: "none",
                  borderRadius: 4,
                  background: "#c62828",
                  color: "white",
                  fontWeight: 600,
                  cursor: cancelSubmitting || !cancelReasonSelection.trim() ? "not-allowed" : "pointer",
                  opacity: cancelSubmitting || !cancelReasonSelection.trim() ? 0.7 : 1,
                }}
              >
                {cancelSubmitting ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal && (
        <CreateOrderModal
          key={`${encounterId}-${createModalInitialTab}-${medicationModalRequestTick}-${careModalRequestTick}-${carePresetForOpenModal ?? ""}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          encounter={encounter}
          initialOrderTab={createModalInitialTab}
          initialCareManualLabel={carePresetForOpenModal}
          onClose={() => setShowCreateModal(false)}
          onRefetchEncounter={onRefetchEncounter}
          onSuccess={async () => {
            setShowCreateModal(false);
            await loadOrders();
            await onOrdersUpdated?.();
          }}
        />
      )}
    </div>
  );
}


