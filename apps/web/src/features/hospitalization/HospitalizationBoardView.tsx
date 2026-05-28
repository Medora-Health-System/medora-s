"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatAgeYearsSexForLocale, DISPLAY_DASH } from "@/lib/patientDisplay";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import {
  assignNurseSelf,
  assignProviderSelf,
  fetchHospitalisationEncounters,
} from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import type { ObservationOperationalSnapshot } from "@medora/shared";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  MedoraCompactPatientCardRow,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { mergeHospitalisationRowAfterAssign } from "./hospitalizationBoardAssignMerge";
import {
  compareObservationBoardRows,
  computeObservationBoardCensus,
  computeObservationBoardStaffingPressure,
  observationBoardProviderAssignmentGap,
  observationBoardRnAssignmentGap,
  observationBoardRowMatchesOperationalFilter,
  type ObservationBoardOperationalFilterId,
  type ObservationBoardSortId,
} from "./observationBoardOperational";
import type { ErDispositionOutcomeUi } from "@/features/emergency/emergencyDispositionV1";
import { resolveObservationBoardDispositionModel } from "@/features/observation/observationBoardDisposition";
import {
  dispatchObservationEncounterRefresh,
  MEDORA_OBSERVATION_ENCOUNTER_REFRESH,
  type ObservationEncounterRefreshDetail,
} from "@/lib/observationEncounterRefresh";
import {
  observationBoardFilterRowStyle,
  observationBoardPageInnerStyle,
  observationBoardPatientListStyle,
  observationBoardSnapshotGridStyle,
  observationBoardTouchActionGroupStyle,
  observationBoardTouchControlStyle,
  observationBoardUsesStackedCards,
  resolveObservationBoardLayoutMode,
  type ObservationBoardLayoutMode,
} from "./observationBoardResponsiveLayout";

type AcuityTier = "critical" | "monitoring" | "stable";

const ACUITY_BORDER: Record<AcuityTier, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const ACUITY_SOFT: Record<AcuityTier, PriorityBadgeSoft> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  monitoring: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  stable: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
};

function acuityFromEsi(esi: number | null | undefined): AcuityTier {
  if (esi == null || Number.isNaN(esi)) return "stable";
  if (esi <= 1) return "critical";
  if (esi <= 3) return "monitoring";
  return "stable";
}

function patientInitials(p: HospitalisationBoardEncounterRow["patient"]): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function fullPatientName(p: HospitalisationBoardEncounterRow["patient"]): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
}

function physicianLabel(enc: HospitalisationBoardEncounterRow): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function nurseLabel(enc: HospitalisationBoardEncounterRow): string {
  const p = enc.nurseAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

const OBS_SOFT = { bg: "#f8fafc", text: "#334155", border: "#e2e8f0" } as const;
const OBS_WARN = { bg: "#fffbeb", text: "#92400e", border: "#fde68a" } as const;
const OBS_DANGER = { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" } as const;
const OBS_OK = { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" } as const;

const OBS_DISP_OUTCOME_I18N: Record<ErDispositionOutcomeUi, string> = {
  HOME: "emergencyDisposition.outcomeHOME",
  ADMISSION: "emergencyDisposition.outcomeADMISSION",
  TRANSFER: "emergencyDisposition.outcomeTRANSFER",
  AMA: "emergencyDisposition.outcomeAMA",
  LWBS: "emergencyDisposition.outcomeLWBS",
  DECEASED: "emergencyDisposition.outcomeDECEASED",
  OTHER: "emergencyDisposition.outcomeOTHER",
};

function ObservationDispositionBoardChips({
  encounter,
  t,
}: {
  encounter: HospitalisationBoardEncounterRow;
  t: (key: string) => string;
}) {
  const model = resolveObservationBoardDispositionModel({
    status: encounter.status,
    type: encounter.type,
    admittedAt: encounter.admittedAt,
    admissionSummaryJson: encounter.admissionSummaryJson,
    dischargedAt: encounter.dischargedAt,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
    nursingAssessment: encounter.nursingAssessment,
    trackboardOps: encounter.trackboardOps,
    observationOps: encounter.observationOps ?? null,
  });
  if (!model) return null;
  let label = "";
  let tone: PriorityBadgeSoft = OBS_SOFT;
  if (model.tier === "outcome") {
    label = t(OBS_DISP_OUTCOME_I18N[model.outcome]);
    if (model.encounterClosed) {
      tone = { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
    } else if (model.outcome === "AMA" || model.outcome === "LWBS" || model.outcome === "OTHER") {
      tone = OBS_WARN;
    } else if (model.outcome === "DECEASED") {
      tone = OBS_DANGER;
    } else if (model.outcome === "HOME") {
      tone = OBS_OK;
    }
  } else if (model.tier === "discharge_packet_active") {
    label = t("hospitalizationBoard.dispositionPacketInProgress");
    tone = OBS_WARN;
  } else if (model.tier === "ready_no_mode") {
    label = t("hospitalizationBoard.dispositionReadyNoModeShort");
    tone = OBS_OK;
  } else {
    label = t("hospitalizationBoard.dispositionObserving");
  }
  return (
    <span title={t("hospitalizationBoard.dispositionChipTitle")}>
      <MedoraCardBadge soft={tone}>{label}</MedoraCardBadge>
    </span>
  );
}

function ObservationOpsChips({
  obs,
  resultsPendingCount,
  t,
}: {
  obs: ObservationOperationalSnapshot;
  resultsPendingCount: number;
  t: (key: string) => string;
}) {
  const chips: React.ReactNode[] = [];
  chips.push(
    <span key="los" title={t("hospitalizationBoard.obsLosChipTitle")}>
      <MedoraCardBadge soft={OBS_SOFT}>{obs.losLabel}</MedoraCardBadge>
    </span>
  );
  const f = obs.flags;
  if (obs.extendedStay24h) {
    chips.push(
      <MedoraCardBadge key="24" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeExtended24h")}
      </MedoraCardBadge>
    );
  } else if (obs.overnightUtcSpan) {
    chips.push(
      <MedoraCardBadge key="night" soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeOvernightUtc")}
      </MedoraCardBadge>
    );
  }
  if (f.criticalLabsUnacked) {
    chips.push(
      <MedoraCardBadge key="crit" soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeCriticalUnacked")}
      </MedoraCardBadge>
    );
  }
  if (f.providerReassessmentOverdue && f.rnObservationReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="ro" soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="ropo" soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeProviderObsReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.rnObservationReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="rorn" soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeRnObsReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentDue && f.rnObservationReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rd" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeReassessmentDue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rdp" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeProviderObsReassessmentDue")}
      </MedoraCardBadge>
    );
  } else if (f.rnObservationReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rdrn" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeRnObsReassessmentDue")}
      </MedoraCardBadge>
    );
  }
  if (obs.vitalsStale) {
    chips.push(
      <MedoraCardBadge key="vs" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeVitalsStale")}
      </MedoraCardBadge>
    );
  }
  if (f.readyForDischarge) {
    chips.push(
      <MedoraCardBadge key="prd" soft={OBS_OK}>
        {t("hospitalizationBoard.badgeReadyDischarge")}
      </MedoraCardBadge>
    );
  }
  if (f.dispositionPhase) {
    chips.push(
      <MedoraCardBadge key="disp" soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeDisposition")}
      </MedoraCardBadge>
    );
  }
  if (f.boardingOperational) {
    chips.push(
      <MedoraCardBadge key="bd" soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeBoarding")}
      </MedoraCardBadge>
    );
  }
  if (resultsPendingCount > 0) {
    chips.push(
      <MedoraCardBadge key="pend" soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeResultsPending").replace("{count}", String(resultsPendingCount))}
      </MedoraCardBadge>
    );
  }
  if (f.assignPhysicianGap) {
    chips.push(
      <MedoraCardBadge key="md" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeNoPhysician")}
      </MedoraCardBadge>
    );
  }
  if (f.assignRnGap) {
    chips.push(
      <MedoraCardBadge key="rn" soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeNoRn")}
      </MedoraCardBadge>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        justifyContent: "flex-end",
        marginTop: 4,
        maxWidth: 320,
      }}
    >
      {chips.slice(0, 8)}
    </div>
  );
}

function ObservationEscalationHintBadges({
  encounter,
  t,
}: {
  encounter: HospitalisationBoardEncounterRow;
  t: (key: string) => string;
}) {
  if ((encounter.status ?? "").trim() !== "OPEN") return null;
  const o = encounter.observationOps ?? null;
  const pend = encounter.trackboardOps?.resultsPendingCount ?? 0;
  const nodes: React.ReactNode[] = [];
  if (observationBoardRnAssignmentGap(encounter)) {
    nodes.push(
      <MedoraCardBadge key="e-rn" soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationNeedsRn")}
      </MedoraCardBadge>
    );
  }
  if (observationBoardProviderAssignmentGap(encounter)) {
    nodes.push(
      <MedoraCardBadge key="e-md" soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationNeedsProvider")}
      </MedoraCardBadge>
    );
  }
  if (o?.flags.reassessmentOverdue) {
    nodes.push(
      <MedoraCardBadge key="e-re" soft={OBS_DANGER}>
        {t("hospitalizationBoard.escalationReassessOverdue")}
      </MedoraCardBadge>
    );
  }
  if (o?.vitalsStale) {
    nodes.push(
      <MedoraCardBadge key="e-vs" soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationVitalsStale")}
      </MedoraCardBadge>
    );
  }
  if (o?.extendedStay24h) {
    nodes.push(
      <MedoraCardBadge key="e-24" soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationLos24")}
      </MedoraCardBadge>
    );
  }
  if (pend > 0) {
    nodes.push(
      <MedoraCardBadge key="e-pend" soft={OBS_SOFT}>
        {t("hospitalizationBoard.escalationPendingResults")}
      </MedoraCardBadge>
    );
  }
  if (o?.flags.readyForDischarge) {
    nodes.push(
      <MedoraCardBadge key="e-rfd" soft={OBS_OK}>
        {t("hospitalizationBoard.escalationReadyDischargeReview")}
      </MedoraCardBadge>
    );
  }
  if (nodes.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        justifyContent: "flex-end",
        marginTop: 4,
        maxWidth: 320,
      }}
    >
      {nodes}
    </div>
  );
}

/** Heuristic « unité » from room label when API has no separate unit field. */
function unitFromRoomLabel(roomLabel: string | null | undefined): string {
  const r = (roomLabel ?? "").trim();
  if (!r) return "";
  const part = r.split(/[-–/]/)[0]?.trim() ?? "";
  return part || r;
}

function ObservationOperationalStatChip({
  label,
  value,
  title,
}: {
  label: string;
  value: string | number;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        minWidth: 54,
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        backgroundColor: "#fafafa",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{value}</span>
    </span>
  );
}

/**
 * Single implementation for `/app/hospitalisation` (and optional `?mock=error` | `?mock=empty` for demos/tests).
 */
export function HospitalizationBoardView() {
  const { t, language } = useI18n();
  const acuityLabel = useMemo(
    () => ({
      critical: t("hospitalizationBoard.acuityCritical"),
      monitoring: t("hospitalizationBoard.acuityMonitoring"),
      stable: t("hospitalizationBoard.acuityStable"),
    }),
    [t]
  );
  const dateLocale = encounterBcp47(language);
  const searchParams = useSearchParams();
  const mockMode = searchParams.get("mock");

  const { facilityId: facilityIdFromHook, ready, canManagePharmacy, roles, userId } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<HospitalisationBoardEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dischargingId, setDischargingId] = useState<string | null>(null);
  /** Phase 14G-B — same self-assign flow as ER trackboard (operational ownership). */
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<{ id: string; message: string } | null>(null);

  const isProvider = roles.includes("PROVIDER");
  const isNurse = roles.includes("RN");

  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterAcuity, setFilterAcuity] = useState<"" | AcuityTier>("");
  const [filterPhysician, setFilterPhysician] = useState("");
  const [filterOperational, setFilterOperational] = useState<ObservationBoardOperationalFilterId>("");
  const [sortOperational, setSortOperational] = useState<ObservationBoardSortId>("default");
  const [layoutMode, setLayoutMode] = useState<ObservationBoardLayoutMode>("desktopDense");

  useEffect(() => {
    const sync = () => setLayoutMode(resolveObservationBoardLayoutMode(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const stackedCardLayout = observationBoardUsesStackedCards(layoutMode);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (mockMode === "error") {
      setLoading(false);
      setFetchError(t("hospitalizationBoard.loadListError"));
      setEncounters([]);
      return;
    }
    if (mockMode === "empty") {
      setLoading(false);
      setFetchError(null);
      setEncounters([]);
    }
  }, [mockMode, t]);

  const effectiveFacilityId = facilityId || facilityIdFromHook || null;

  const loadEncounters = useCallback(async (opts?: { silent?: boolean }) => {
    if (mockMode === "error" || mockMode === "empty") return;
    if (!facilityId) return;
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
      setFetchError(null);
    }
    try {
      const data = await fetchHospitalisationEncounters(facilityId);
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load hospitalisation board:", error);
      setFetchError(t("hospitalizationBoard.loadListError"));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [facilityId, mockMode, t]);

  const claimSelf = useCallback(
    async (encounterId: string, kind: "provider" | "nurse") => {
      const fid = effectiveFacilityId;
      if (!fid || mockMode === "error" || mockMode === "empty") return;
      setAssigningId(encounterId);
      setAssignError(null);
      try {
        const updated =
          kind === "provider"
            ? await assignProviderSelf(fid, encounterId)
            : await assignNurseSelf(fid, encounterId);
        setEncounters((prev) =>
          prev.map((r) => (r.id === encounterId ? mergeHospitalisationRowAfterAssign(r, updated) : r))
        );
        await loadEncounters({ silent: true });
      } catch (err) {
        const raw = err instanceof Error ? err.message : "";
        const lc = raw.toLowerCase();
        const message =
          lc.includes("ouverte") || lc.includes("open")
            ? t("emergencyTrackboard.assignErrorClosed")
            : lc.includes("rôle") || lc.includes("role") || lc.includes("infirm") || lc.includes("médecin")
              ? t("emergencyTrackboard.assignErrorRole")
              : t("emergencyTrackboard.assignErrorGeneric");
        setAssignError({ id: encounterId, message });
      } finally {
        setAssigningId(null);
      }
    },
    [effectiveFacilityId, loadEncounters, mockMode, t]
  );

  const dischargeEncounter = async (encounter: HospitalisationBoardEncounterRow) => {
    const fid = effectiveFacilityId;
    if (!fid) return;
    const isClosable =
      encounter.status === "OPEN" && (encounter.type ?? "").trim() === "INPATIENT";
    if (!isClosable) return;
    setDischargingId(encounter.id);
    setFetchError(null);
    try {
      const check = await apiFetch(`/encounters/${encounter.id}/close-check`, {
        method: "POST",
        facilityId: fid,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeStatus: "DISCHARGED" }),
      });
      const hasDeficiencies =
        Boolean(check) &&
        typeof check === "object" &&
        !Array.isArray(check) &&
        (check as { hasDeficiencies?: unknown }).hasDeficiencies === true;

      const payload: Record<string, unknown> = { dischargeStatus: "DISCHARGED" };
      if (hasDeficiencies) payload.acknowledgeDeficiencies = true;

      await apiFetch(`/encounters/${encounter.id}/close`, {
        method: "POST",
        facilityId: fid,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadEncounters();
      dispatchObservationEncounterRefresh({ encounterId: encounter.id, facilityId: fid });
    } catch (error) {
      console.error("Failed to discharge inpatient encounter:", error);
      setFetchError(
        normalizeUserFacingError(error instanceof Error ? error.message : null, language) ||
          t("hospitalizationBoard.dischargeFailed")
      );
    } finally {
      setDischargingId(null);
    }
  };

  useEffect(() => {
    if (mockMode === "error" || mockMode === "empty") return;
    if (!ready || !facilityId) return;
    void loadEncounters();
    const interval = setInterval(() => {
      void loadEncounters();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId, mockMode, loadEncounters]);

  useEffect(() => {
    if (!facilityId) return;
    const onObservationRefresh = (ev: Event) => {
      const detail = (ev as CustomEvent<ObservationEncounterRefreshDetail>).detail;
      if (!detail || detail.facilityId !== facilityId) return;
      void loadEncounters();
    };
    window.addEventListener(MEDORA_OBSERVATION_ENCOUNTER_REFRESH, onObservationRefresh);
    return () => window.removeEventListener(MEDORA_OBSERVATION_ENCOUNTER_REFRESH, onObservationRefresh);
  }, [facilityId, loadEncounters]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of encounters) {
      const u = unitFromRoomLabel(e.roomLabel);
      if (u) set.add(u);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, language === "en" ? "en" : "fr"));
  }, [encounters, language]);

  const physicianOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of encounters) {
      const pl = physicianLabel(e);
      if (pl) set.add(pl);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, language === "en" ? "en" : "fr"));
  }, [encounters, language]);

  const observationCensus = useMemo(() => computeObservationBoardCensus(encounters), [encounters]);
  const observationStaffing = useMemo(() => computeObservationBoardStaffingPressure(encounters), [encounters]);

  const filteredEncounters = useMemo(() => {
    let list = encounters.filter((encounter) =>
      observationBoardRowMatchesOperationalFilter(encounter, filterOperational)
    );
    const q = search.trim().toLowerCase();
    list = list.filter((encounter) => {
      const acuity = acuityFromEsi(encounter.triage?.esi);
      if (filterAcuity && acuity !== filterAcuity) return false;

      const unit = unitFromRoomLabel(encounter.roomLabel);
      if (filterUnit && unit !== filterUnit) return false;

      const phys = physicianLabel(encounter);
      if (filterPhysician && phys !== filterPhysician) return false;

      if (q) {
        const name = fullPatientName(encounter.patient).toLowerCase();
        const cc = (
          encounter.triage?.chiefComplaint ||
          encounter.chiefComplaint ||
          ""
        ).toLowerCase();
        const room = (encounter.roomLabel ?? "").toLowerCase();
        const nurse = nurseLabel(encounter).toLowerCase();
        const blob = `${name} ${cc} ${room} ${phys.toLowerCase()} ${nurse}`;
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => compareObservationBoardRows(a, b, sortOperational));
    return list;
  }, [
    encounters,
    filterOperational,
    search,
    filterAcuity,
    filterUnit,
    filterPhysician,
    sortOperational,
  ]);

  const singleOpenInpatientRow = useMemo(() => {
    if (filteredEncounters.length !== 1) return null;
    const e = filteredEncounters[0];
    if (e.status !== "OPEN") return null;
    if ((e.type ?? "").trim() !== "INPATIENT") return null;
    if (e.observationOps != null) return null;
    return e;
  }, [filteredEncounters]);

  const formatTime = (date: string | null) => {
    if (!date) return t("common.dash");
    return new Date(date).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  };

  const inputBase: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    padding: "0 12px",
    fontSize: 13,
    color: "#0f172a",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const filterLabel: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 3,
    letterSpacing: "0.01em",
  };

  return (
    <div
      style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 8px 0" }}
      data-testid="observation-board-layout"
      data-layout-mode={layoutMode}
    >
      {ready && canManagePharmacy && effectiveFacilityId && (
        <div style={{ marginBottom: 16 }}>
          <PharmacyAlertsCard facilityId={effectiveFacilityId} />
        </div>
      )}

      <div style={observationBoardPageInnerStyle(layoutMode)}>
        <header
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)", fontWeight: 600, color: "#0f172a" }}>
              {t("hospitalizationBoard.pageTitle")}
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("hospitalizationBoard.pageSubtitle")}</p>
          </div>
        </header>

        {encounters.length > 0 && mockMode !== "error" ? (
          <section
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              {t("hospitalizationBoard.operationalStripTitle")}
            </div>
            <div style={observationBoardSnapshotGridStyle(layoutMode)}>
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatActive")}
                value={observationCensus.activeObservationPatients}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatRnUnassigned")}
                value={observationCensus.rnUnassignedCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatMdUnassigned")}
                value={observationCensus.providerUnassignedCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatReassessOverdue")}
                value={observationCensus.reassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatRnReassessOverdue")}
                value={observationCensus.rnReassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatMdReassessOverdue")}
                value={observationCensus.providerReassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatVitalsStale")}
                value={observationCensus.vitalsStaleCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatPendingPatients")}
                value={observationCensus.pendingResultsPatientsCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatPendingSum")}
                value={observationCensus.sumPendingResultsCounts}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatCriticalPatients")}
                value={observationCensus.criticalResultPatientsCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatLos24")}
                value={observationCensus.los24hOrMoreCount}
              />
              <ObservationOperationalStatChip
                label={t("hospitalizationBoard.operationalStatReadyDischarge")}
                value={observationCensus.dischargeReadyOpenCount}
              />
            </div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{t("hospitalizationBoard.operationalStaffingAvgRn")}:</span>{" "}
              {observationStaffing.avgPatientsPerRn != null
                ? String(observationStaffing.avgPatientsPerRn)
                : t("hospitalizationBoard.operationalStaffingDash")}
              {" · "}
              <span style={{ fontWeight: 600 }}>{t("hospitalizationBoard.operationalStaffingAvgMd")}:</span>{" "}
              {observationStaffing.avgPatientsPerProvider != null
                ? String(observationStaffing.avgPatientsPerProvider)
                : t("hospitalizationBoard.operationalStaffingDash")}
              {" · "}
              <span style={{ fontWeight: 600 }}>{t("hospitalizationBoard.operationalStaffingUnassignedAny")}:</span>{" "}
              {observationStaffing.unassignedEitherRolePatientCount}
            </div>
            {observationStaffing.highestRiskUnassignedPatientNames.length > 0 ? (
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>
                  {t("hospitalizationBoard.operationalStaffingTopRisk")}:
                </span>{" "}
                {observationStaffing.highestRiskUnassignedPatientNames.join(", ")}
              </div>
            ) : null}
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
              {t("hospitalizationBoard.operationalGuidanceFootnote")} {t("hospitalizationBoard.operationalNoAutoFootnote")}
            </p>
          </section>
        ) : null}

        {/* Barre unique : recherche à gauche, filtres compacts, actions à droite (V0) */}
        <div style={observationBoardFilterRowStyle(layoutMode)}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <span style={{ ...filterLabel, marginBottom: 3 }}>{t("hospitalizationBoard.filterSearchLabel")}</span>
            <input
              id="hosp-board-search"
              type="search"
              aria-label={t("hospitalizationBoard.filterSearchAriaLabel")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("hospitalizationBoard.filterSearchPlaceholder")}
              style={{
                ...inputBase,
                height: 40,
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "0 0 auto", width: 124 }}>
            <span style={filterLabel}>{t("hospitalizationBoard.filterUnitLabel")}</span>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("hospitalizationBoard.filterUnitAll")}</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 0 auto", width: 128 }}>
            <span style={filterLabel}>{t("hospitalizationBoard.filterStatusLabel")}</span>
            <select
              value={filterAcuity}
              onChange={(e) => setFilterAcuity(e.target.value as "" | AcuityTier)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("hospitalizationBoard.filterStatusAll")}</option>
              <option value="critical">{acuityLabel.critical}</option>
              <option value="monitoring">{acuityLabel.monitoring}</option>
              <option value="stable">{acuityLabel.stable}</option>
            </select>
          </div>

          <div style={{ flex: "0 1 160px", minWidth: 140 }}>
            <span style={filterLabel}>{t("hospitalizationBoard.filterPhysicianLabel")}</span>
            <select
              value={filterPhysician}
              onChange={(e) => setFilterPhysician(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("hospitalizationBoard.filterPhysicianAll")}</option>
              {physicianOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 1 260px", minWidth: 200 }}>
            <span style={filterLabel}>{t("hospitalizationBoard.operationalFilterLabel")}</span>
            <select
              value={filterOperational}
              onChange={(e) => setFilterOperational(e.target.value as ObservationBoardOperationalFilterId)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("hospitalizationBoard.operationalFilterAll")}</option>
              <option value="needs_attention">{t("hospitalizationBoard.operationalFilterNeedsAttention")}</option>
              <option value="unassigned">{t("hospitalizationBoard.operationalFilterUnassigned")}</option>
              <option value="needs_rn">{t("hospitalizationBoard.operationalFilterNeedsRn")}</option>
              <option value="needs_provider">{t("hospitalizationBoard.operationalFilterNeedsProvider")}</option>
              <option value="reassess_overdue">{t("hospitalizationBoard.operationalFilterReassessOverdue")}</option>
              <option value="rn_reassess_overdue">{t("hospitalizationBoard.operationalFilterRnReassessOverdue")}</option>
              <option value="provider_reassess_overdue">
                {t("hospitalizationBoard.operationalFilterProviderReassessOverdue")}
              </option>
              <option value="los24">{t("hospitalizationBoard.operationalFilterLos24")}</option>
              <option value="pending_results">{t("hospitalizationBoard.operationalFilterPendingResults")}</option>
              <option value="ready_discharge">{t("hospitalizationBoard.operationalFilterReadyDischarge")}</option>
              <option value="vitals_stale">{t("hospitalizationBoard.operationalFilterVitalsStale")}</option>
            </select>
          </div>

          <div style={{ flex: "0 0 auto", width: 200 }}>
            <span style={filterLabel}>{t("hospitalizationBoard.operationalSortLabel")}</span>
            <select
              value={sortOperational}
              onChange={(e) => setSortOperational(e.target.value as ObservationBoardSortId)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="default">{t("hospitalizationBoard.operationalSortDefault")}</option>
              <option value="los_desc">{t("hospitalizationBoard.operationalSortLos")}</option>
              <option value="reassess_desc">{t("hospitalizationBoard.operationalSortReassessFirst")}</option>
              <option value="pending_desc">{t("hospitalizationBoard.operationalSortPendingFirst")}</option>
              <option value="ready_discharge_desc">{t("hospitalizationBoard.operationalSortReadyDischargeFirst")}</option>
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={() => void loadEncounters()}
              disabled={loading}
              style={observationBoardTouchControlStyle(
                {
                  height: layoutMode === "desktopDense" ? 40 : undefined,
                  padding: "0 14px",
                  backgroundColor: "#fff",
                  color: "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                  whiteSpace: "nowrap",
                },
                layoutMode
              )}
            >
              {loading ? t("common.loading") : t("common.refresh")}
            </button>
            <button
              type="button"
              disabled={
                mockMode === "error" ||
                mockMode === "empty" ||
                !effectiveFacilityId ||
                !singleOpenInpatientRow ||
                dischargingId !== null
              }
              title={
                mockMode === "error" || mockMode === "empty"
                  ? t("hospitalizationBoard.dischargeTooltipDemo")
                  : !effectiveFacilityId
                    ? t("hospitalizationBoard.dischargeTooltipNoFacility")
                    : !singleOpenInpatientRow
                      ? t("hospitalizationBoard.dischargeTooltipNeedSingle")
                      : undefined
              }
              onClick={() => {
                if (singleOpenInpatientRow) void dischargeEncounter(singleOpenInpatientRow);
              }}
              style={observationBoardTouchControlStyle(
                {
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: layoutMode === "desktopDense" ? 40 : undefined,
                  padding: "0 16px",
                  backgroundColor:
                    mockMode === "error" ||
                    mockMode === "empty" ||
                    !effectiveFacilityId ||
                    !singleOpenInpatientRow ||
                    dischargingId !== null
                      ? "#f1f5f9"
                      : "#fff",
                  color:
                    mockMode === "error" ||
                    mockMode === "empty" ||
                    !effectiveFacilityId ||
                    !singleOpenInpatientRow ||
                    dischargingId !== null
                      ? "#64748b"
                      : "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    mockMode === "error" ||
                    mockMode === "empty" ||
                    !effectiveFacilityId ||
                    !singleOpenInpatientRow ||
                    dischargingId !== null
                      ? "not-allowed"
                      : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow:
                    mockMode === "error" ||
                    mockMode === "empty" ||
                    !effectiveFacilityId ||
                    !singleOpenInpatientRow ||
                    dischargingId !== null
                      ? undefined
                      : "0 1px 2px rgba(15, 23, 42, 0.05)",
                },
                layoutMode
              )}
            >
              {singleOpenInpatientRow && dischargingId === singleOpenInpatientRow.id
                ? t("hospitalizationBoard.dischargeSending")
                : t("hospitalizationBoard.dischargePatient")}
            </button>
          </div>
        </div>

        {fetchError ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #fecaca",
              backgroundColor: "#fff",
              padding: 40,
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{fetchError}</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("hospitalizationBoard.errorStateHint")}</p>
            <button
              type="button"
              onClick={() => void loadEncounters()}
              style={{
                marginTop: 24,
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                fontSize: 14,
                fontWeight: 500,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              {t("hospitalizationBoard.retryButton")}
            </button>
          </div>
        ) : loading && encounters.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  padding: 16,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f1f5f9" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 16, width: "40%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "25%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "70%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>
              {encounters.length === 0
                ? t("hospitalizationBoard.emptyNoPatients")
                : t("hospitalizationBoard.emptyFiltered")}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {encounters.length === 0
                ? t("hospitalizationBoard.emptyHintNoPatients")
                : t("hospitalizationBoard.emptyHintFiltered")}
            </p>
          </div>
        ) : (
          <ul style={observationBoardPatientListStyle(layoutMode)}>
            {filteredEncounters.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const cc =
                encounter.triage?.chiefComplaint || encounter.chiefComplaint || t("common.dash");
              const esiDisplay = encounter.triage?.esi != null ? `ESI ${encounter.triage.esi}` : t("common.dash");
              const room = encounter.roomLabel?.trim() || t("common.dash");
              const physName = physicianLabel(encounter);
              const nurseName = nurseLabel(encounter);
              const physLine = physName || t("emergencyTrackboard.unassignedDash");
              const nurseLine = nurseName || t("emergencyTrackboard.unassignedDash");
              const physId = (encounter.physicianAssigned?.id ?? "").trim();
              const nurseId = (encounter.nurseAssigned?.id ?? "").trim();
              const isPhysMine = Boolean(userId && physId && physId === userId);
              const isNurseMine = Boolean(userId && nurseId && nurseId === userId);
              const obs = encounter.observationOps ?? null;
              const resultsPendingCount = encounter.trackboardOps?.resultsPendingCount ?? 0;
              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <MedoraCardInner>
                      <MedoraCompactPatientCardRow
                        stackedLayout={stackedCardLayout}
                        avatarInitials={patientInitials(patient)}
                        roomLabel={t("common.room")}
                        roomValue={room}
                        rightMaxWidth={320}
                        centerTrailingMaxWidth={260}
                        centerTrailing={
                          <div
                            aria-label={t("emergencyTrackboard.assignedPersonnelLabel")}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#fff",
                              minWidth: 0,
                              width: "100%",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#475569",
                                lineHeight: 1.25,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={physName || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("emergencyTrackboard.physicianShort")}:
                              </span>
                              <span style={{ color: physName ? "#0f172a" : "#94a3b8", fontWeight: physName ? 600 : 500 }}>
                                {physLine}
                              </span>
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#475569",
                                lineHeight: 1.25,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={nurseName || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("emergencyTrackboard.nurseShort")}:
                              </span>
                              <span style={{ color: nurseName ? "#0f172a" : "#94a3b8", fontWeight: nurseName ? 600 : 500 }}>
                                {nurseLine}
                              </span>
                            </p>
                          </div>
                        }
                        identity={
                          <>
                            <h2
                              style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#0f172a",
                                lineHeight: 1.2,
                              }}
                            >
                              {fullPatientName(patient)}
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>
                              {formatAgeYearsSexForLocale(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null,
                                language
                              )}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.3 }}>{cc}</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicalTrackboardPage.esiIndex")}</span>{" "}
                              {esiDisplay}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.arrival")}</span>{" "}
                              {formatTime(encounter.createdAt ?? null)}
                            </p>
                          </>
                        }
                        right={
                          <>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                justifyContent: "flex-end",
                              }}
                            >
                              <MedoraCardBadge soft={ACUITY_SOFT[acuity]}>{acuityLabel[acuity]}</MedoraCardBadge>
                            </div>
                            {obs ? (
                              <>
                                <ObservationDispositionBoardChips encounter={encounter} t={t} />
                                <ObservationEscalationHintBadges encounter={encounter} t={t} />
                                <ObservationOpsChips obs={obs} resultsPendingCount={resultsPendingCount} t={t} />
                              </>
                            ) : (
                              <ObservationEscalationHintBadges encounter={encounter} t={t} />
                            )}
                            <div style={observationBoardTouchActionGroupStyle(layoutMode)}>
                              <Link
                                href={`/app/encounters/${encounter.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #bfdbfe",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                {t("common.view")}
                              </Link>
                              {isProvider ? (
                                <button
                                  type="button"
                                  onClick={() => void claimSelf(encounter.id, "provider")}
                                  disabled={
                                    assigningId === encounter.id ||
                                    isPhysMine ||
                                    mockMode === "error" ||
                                    mockMode === "empty" ||
                                    !effectiveFacilityId
                                  }
                                  title={
                                    isPhysMine
                                      ? t("emergencyTrackboard.assignProviderMine")
                                      : t("emergencyTrackboard.assignProviderMe")
                                  }
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: isPhysMine ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                                    backgroundColor: isPhysMine ? "#d1fae5" : "#fff",
                                    color: isPhysMine ? "#065f46" : "#0f172a",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor:
                                      assigningId === encounter.id ||
                                      isPhysMine ||
                                      mockMode === "error" ||
                                      mockMode === "empty" ||
                                      !effectiveFacilityId
                                        ? "default"
                                        : "pointer",
                                  }}
                                >
                                  {isPhysMine
                                    ? t("emergencyTrackboard.assignProviderMine")
                                    : assigningId === encounter.id
                                      ? t("emergencyTrackboard.assignSubmitting")
                                      : t("emergencyTrackboard.assignProviderMeShort")}
                                </button>
                              ) : null}
                              {isNurse ? (
                                <button
                                  type="button"
                                  onClick={() => void claimSelf(encounter.id, "nurse")}
                                  disabled={
                                    assigningId === encounter.id ||
                                    isNurseMine ||
                                    mockMode === "error" ||
                                    mockMode === "empty" ||
                                    !effectiveFacilityId
                                  }
                                  title={
                                    isNurseMine
                                      ? t("emergencyTrackboard.assignNurseMine")
                                      : t("emergencyTrackboard.assignNurseMe")
                                  }
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: isNurseMine ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                                    backgroundColor: isNurseMine ? "#d1fae5" : "#fff",
                                    color: isNurseMine ? "#065f46" : "#0f172a",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor:
                                      assigningId === encounter.id ||
                                      isNurseMine ||
                                      mockMode === "error" ||
                                      mockMode === "empty" ||
                                      !effectiveFacilityId
                                        ? "default"
                                        : "pointer",
                                  }}
                                >
                                  {isNurseMine
                                    ? t("emergencyTrackboard.assignNurseMine")
                                    : assigningId === encounter.id
                                      ? t("emergencyTrackboard.assignSubmitting")
                                      : t("emergencyTrackboard.assignNurseMeShort")}
                                </button>
                              ) : null}
                              {!obs ? (
                                <button
                                  type="button"
                                  onClick={() => void dischargeEncounter(encounter)}
                                  disabled={
                                    dischargingId === encounter.id ||
                                    encounter.status !== "OPEN" ||
                                    (encounter.type ?? "").trim() !== "INPATIENT"
                                  }
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#fff",
                                    color: "#475569",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor:
                                      dischargingId === encounter.id ||
                                      encounter.status !== "OPEN" ||
                                      (encounter.type ?? "").trim() !== "INPATIENT"
                                        ? "not-allowed"
                                        : "pointer",
                                    opacity:
                                      dischargingId === encounter.id ||
                                      encounter.status !== "OPEN" ||
                                      (encounter.type ?? "").trim() !== "INPATIENT"
                                        ? 0.6
                                        : 1,
                                  }}
                                  aria-label={t("hospitalizationBoard.rowDischargeAriaLabel")}
                                >
                                  {dischargingId === encounter.id
                                    ? t("hospitalizationBoard.rowDischargeSending")
                                    : t("hospitalizationBoard.rowDischarge")}
                                </button>
                              ) : null}
                            </div>
                            {assignError && assignError.id === encounter.id ? (
                              <p
                                role="alert"
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: 11,
                                  color: "#b91c1c",
                                  textAlign: "right",
                                }}
                              >
                                {assignError.message}
                              </p>
                            ) : null}
                          </>
                        }
                      />
                    </MedoraCardInner>
                  </MedoraCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
