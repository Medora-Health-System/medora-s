"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatAgeYearsSexForLocale, DISPLAY_DASH } from "@/lib/patientDisplay";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { canonicalEncounterWorkspaceHref } from "@/features/encounters/canonicalEncounterWorkspaceHref";
import {
  assignHospitalRoleToMe,
  unassignHospitalRole,
  fetchHospitalisationEncounters,
} from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import {
  canReadFreestandingErObservationPatients,
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  resolveClinicalEncounterContext,
  selectTreatmentBedAssignmentCandidates,
  type ObservationOperationalSnapshot,
  type EncounterBedUnitCode,
} from "@medora/shared";
import { HOSPITAL_CARE_HOME } from "@/features/hospital-care/hospitalCarePaths";
import type { EncounterRoomUpdateResponse } from "@/lib/roomAssignmentApi";
import {
  dispatchEncounterRoomAssignmentRefresh,
  MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH,
  type EncounterRoomAssignmentRefreshDetail,
} from "@/lib/applyEncounterRoomAssignmentUpdate";
import {
  applyBedBoardStatusPatch,
  rebuildFacilityBedBoardUnitsFromEncounters,
} from "@/lib/bedBoardMutationPatch";
import { invalidateClinicalBoardGetCache } from "@/lib/invalidateClinicalBoardGetCache";
import { logBedBoardMutationDebug } from "@/lib/bedBoardMutationDebug";
import {
  applyTrackboardRoomMutationPatch,
  mergeTrackboardEncounterUpdate,
  reconcilePendingRoomPatches,
} from "@/lib/trackboardMutationPatch";
import { shouldReplaceEncounterRows } from "@/features/emergency/edTrackboardSilentRefresh";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCompactPatientCardRow,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { mergeHospitalisationRowAfterAssign } from "./hospitalizationBoardAssignMerge";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import { BedBoardUnitSection } from "@/components/encounters/BedBoardUnitSection";
import { BedBoardStatusFilterBar } from "@/components/encounters/BedBoardStatusFilterBar";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";
import {
  BedBoardAssignEncounterPicker,
  type BedBoardAssignCandidate,
} from "@/components/encounters/BedBoardAssignEncounterPicker";
import { HospitalBedStatusChip } from "@/components/encounters/BedOperationalStatusChip";
import {
  fetchFacilityBedBoard,
  findBedBoardUnit,
  indexBedBoardByKey,
  type FacilityBedBoardBedRow,
  type FacilityBedBoardResponse,
} from "@/lib/bedBoardApi";
import { lookupBedStatusForEncounter } from "@/lib/bedStatusDisplay";
import { canManageBedOperationalStatus } from "@/lib/bedBoardPermissions";
import {
  canAssignEncounterRoom,
  formatEncounterGovernedRoomDisplay,
  resolveEncounterRoomUnit,
} from "@/lib/governedRoomDisplay";
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
  hospitalTechnicianActiveWorkspacePath,
} from "./hospitalTechnicianWorkspace";
import { isHospitalFloorTechnicianProfile } from "./hospitalTechnicianTiles";
import {
  observationBoardCardInnerStyle,
  observationBoardCensusActionButtonStyle,
  observationBoardFilterRowStyle,
  observationBoardIdentityLineStyle,
  observationBoardIdentityTitleStyle,
  observationBoardPageInnerStyle,
  observationBoardPatientListStyle,
  observationBoardPersonnelBlockStyle,
  observationBoardPersonnelLineStyle,
  observationBoardPrimaryBadgeRowStyle,
  observationBoardRightColumnMaxWidth,
  observationBoardSnapshotGridStyle,
  observationBoardSnapshotSectionStyle,
  observationBoardSnapshotTitleStyle,
  observationBoardStatChipLabelStyle,
  observationBoardStatChipShellStyle,
  observationBoardStatChipValueStyle,
  observationBoardTouchActionGroupStyle,
  observationBoardTouchControlStyle,
  observationBoardUsesCompactCensus,
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

/** D4A.3.0 — hospital bag only (never ED physicianAssigned / nurseAssigned columns). */
function hospitalAssignmentFromRow(enc: HospitalisationBoardEncounterRow) {
  return projectHospitalBoardAssignments(
    readHospitalAssignmentBag(
      (enc as { admissionSummaryJson?: unknown }).admissionSummaryJson
    )
  );
}

function physicianLabel(enc: HospitalisationBoardEncounterRow): string {
  return hospitalAssignmentFromRow(enc).providerName?.trim() || "";
}

function nurseLabel(enc: HospitalisationBoardEncounterRow): string {
  return hospitalAssignmentFromRow(enc).nurseName?.trim() || "";
}

function technicianLabel(enc: HospitalisationBoardEncounterRow): string {
  return hospitalAssignmentFromRow(enc).technicianName?.trim() || "";
}

const OBS_SOFT = { bg: "#f8fafc", text: "#334155", border: "#e2e8f0" } as const;
const OBS_WARN = { bg: "#fffbeb", text: "#92400e", border: "#fde68a" } as const;
const OBS_DANGER = { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" } as const;
const OBS_OK = { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" } as const;

const OBS_DISP_OUTCOME_I18N: Record<ErDispositionOutcomeUi, string> = {
  HOME: "emergencyDisposition.outcomeHOME",
  OBSERVATION: "emergencyDisposition.outcomeOBSERVATION",
  ADMISSION: "emergencyDisposition.outcomeADMISSION",
  TRANSFER: "emergencyDisposition.outcomeTRANSFER",
  AMA: "emergencyDisposition.outcomeAMA",
  LWBS: "emergencyDisposition.outcomeLWBS",
  ELOPEMENT: "emergencyDisposition.outcomeELOPEMENT",
  DECEASED: "emergencyDisposition.outcomeDECEASED",
  OTHER: "emergencyDisposition.outcomeOTHER",
};

function ObservationDispositionBoardChips({
  encounter,
  t,
  compact = false,
}: {
  encounter: HospitalisationBoardEncounterRow;
  t: (key: string) => string;
  compact?: boolean;
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
      <MedoraCardBadge compact={compact} soft={tone}>{label}</MedoraCardBadge>
    </span>
  );
}

function ObservationOpsChips({
  obs,
  resultsPendingCount,
  t,
  compact = false,
  inline = false,
  rowStyle,
}: {
  obs: ObservationOperationalSnapshot;
  resultsPendingCount: number;
  t: (key: string) => string;
  compact?: boolean;
  inline?: boolean;
  rowStyle?: React.CSSProperties;
}) {
  const chips: React.ReactNode[] = [];
  chips.push(
    <span key="los" title={t("hospitalizationBoard.obsLosChipTitle")}>
      <MedoraCardBadge compact={compact} soft={OBS_SOFT}>{obs.losLabel}</MedoraCardBadge>
    </span>
  );
  const f = obs.flags;
  if (obs.extendedStay24h) {
    chips.push(
      <MedoraCardBadge key="24" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeExtended24h")}
      </MedoraCardBadge>
    );
  } else if (obs.overnightUtcSpan) {
    chips.push(
      <MedoraCardBadge key="night" compact={compact} soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeOvernightUtc")}
      </MedoraCardBadge>
    );
  }
  if (f.criticalLabsUnacked) {
    chips.push(
      <MedoraCardBadge key="crit" compact={compact} soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeCriticalUnacked")}
      </MedoraCardBadge>
    );
  }
  if (f.providerReassessmentOverdue && f.rnObservationReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="ro" compact={compact} soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="ropo" compact={compact} soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeProviderObsReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.rnObservationReassessmentOverdue) {
    chips.push(
      <MedoraCardBadge key="rorn" compact={compact} soft={OBS_DANGER}>
        {t("hospitalizationBoard.badgeRnObsReassessmentOverdue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentDue && f.rnObservationReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rd" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeReassessmentDue")}
      </MedoraCardBadge>
    );
  } else if (f.providerReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rdp" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeProviderObsReassessmentDue")}
      </MedoraCardBadge>
    );
  } else if (f.rnObservationReassessmentDue) {
    chips.push(
      <MedoraCardBadge key="rdrn" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeRnObsReassessmentDue")}
      </MedoraCardBadge>
    );
  }
  if (obs.vitalsStale) {
    chips.push(
      <MedoraCardBadge key="vs" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeVitalsStale")}
      </MedoraCardBadge>
    );
  }
  if (f.readyForDischarge) {
    chips.push(
      <MedoraCardBadge key="prd" compact={compact} soft={OBS_OK}>
        {t("hospitalizationBoard.badgeReadyDischarge")}
      </MedoraCardBadge>
    );
  }
  if (f.dispositionPhase) {
    chips.push(
      <MedoraCardBadge key="disp" compact={compact} soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeDisposition")}
      </MedoraCardBadge>
    );
  }
  if (f.boardingOperational) {
    chips.push(
      <MedoraCardBadge key="bd" compact={compact} soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeBoarding")}
      </MedoraCardBadge>
    );
  }
  if (resultsPendingCount > 0) {
    chips.push(
      <MedoraCardBadge key="pend" compact={compact} soft={OBS_SOFT}>
        {t("hospitalizationBoard.badgeResultsPending").replace("{count}", String(resultsPendingCount))}
      </MedoraCardBadge>
    );
  }
  if (f.assignPhysicianGap) {
    chips.push(
      <MedoraCardBadge key="md" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeNoPhysician")}
      </MedoraCardBadge>
    );
  }
  if (f.assignRnGap) {
    chips.push(
      <MedoraCardBadge key="rn" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.badgeNoRn")}
      </MedoraCardBadge>
    );
  }

  if (inline) {
    return <>{chips.slice(0, 8)}</>;
  }

  return (
    <div
      style={
        rowStyle ?? {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "flex-end",
          marginTop: 4,
          maxWidth: 320,
        }
      }
    >
      {chips.slice(0, 8)}
    </div>
  );
}

function ObservationEscalationHintBadges({
  encounter,
  t,
  compact = false,
  inline = false,
  rowStyle,
}: {
  encounter: HospitalisationBoardEncounterRow;
  t: (key: string) => string;
  compact?: boolean;
  inline?: boolean;
  rowStyle?: React.CSSProperties;
}) {
  if ((encounter.status ?? "").trim() !== "OPEN") return null;
  const o = encounter.observationOps ?? null;
  const pend = encounter.trackboardOps?.resultsPendingCount ?? 0;
  const nodes: React.ReactNode[] = [];
  if (observationBoardRnAssignmentGap(encounter)) {
    nodes.push(
      <MedoraCardBadge key="e-rn" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationNeedsRn")}
      </MedoraCardBadge>
    );
  }
  if (observationBoardProviderAssignmentGap(encounter)) {
    nodes.push(
      <MedoraCardBadge key="e-md" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationNeedsProvider")}
      </MedoraCardBadge>
    );
  }
  if (o?.flags.reassessmentOverdue) {
    nodes.push(
      <MedoraCardBadge key="e-re" compact={compact} soft={OBS_DANGER}>
        {t("hospitalizationBoard.escalationReassessOverdue")}
      </MedoraCardBadge>
    );
  }
  if (o?.vitalsStale) {
    nodes.push(
      <MedoraCardBadge key="e-vs" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationVitalsStale")}
      </MedoraCardBadge>
    );
  }
  if (o?.extendedStay24h) {
    nodes.push(
      <MedoraCardBadge key="e-24" compact={compact} soft={OBS_WARN}>
        {t("hospitalizationBoard.escalationLos24")}
      </MedoraCardBadge>
    );
  }
  if (pend > 0) {
    nodes.push(
      <MedoraCardBadge key="e-pend" compact={compact} soft={OBS_SOFT}>
        {t("hospitalizationBoard.escalationPendingResults")}
      </MedoraCardBadge>
    );
  }
  if (o?.flags.readyForDischarge) {
    nodes.push(
      <MedoraCardBadge key="e-rfd" compact={compact} soft={OBS_OK}>
        {t("hospitalizationBoard.escalationReadyDischargeReview")}
      </MedoraCardBadge>
    );
  }
  if (nodes.length === 0) return null;
  if (inline) {
    return <>{nodes}</>;
  }
  return (
    <div
      style={
        rowStyle ?? {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "flex-end",
          marginTop: 4,
          maxWidth: 320,
        }
      }
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
  layoutMode,
}: {
  label: string;
  value: string | number;
  title?: string;
  layoutMode: ObservationBoardLayoutMode;
}) {
  return (
    <span title={title} style={observationBoardStatChipShellStyle(layoutMode)}>
      <span style={observationBoardStatChipLabelStyle(layoutMode)}>{label}</span>
      <span style={observationBoardStatChipValueStyle(layoutMode)}>{value}</span>
    </span>
  );
}

/**
 * Single implementation for hospitalisation operational boards.
 * - `legacyCensusWithBeds` — historical Observation-style census + beds (other callers)
 * - `hospitalCareDashboard` — MEDUI.D4A.4.3 facility Hospital Care Dashboard (beds only)
 */
export type HospitalizationBoardProjection = "legacyCensusWithBeds" | "hospitalCareDashboard";

export function HospitalizationBoardView({
  projection = "legacyCensusWithBeds",
}: {
  projection?: HospitalizationBoardProjection;
} = {}) {
  const isHospitalCareDashboard = projection === "hospitalCareDashboard";
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

  const { facilityId: facilityIdFromHook, ready, canManagePharmacy, roles, userId, departmentCode, facilityType, facilityServiceLines } =
    useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<HospitalisationBoardEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dischargingId, setDischargingId] = useState<string | null>(null);
  /** Phase 14G-B — same self-assign flow as ER trackboard (operational ownership). */
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<{ id: string; message: string } | null>(null);
  const [roomAssignmentLaunch, setRoomAssignmentLaunch] = useState<{
    encounter: HospitalisationBoardEncounterRow;
    prefillFromBedBoard?: {
      room: string;
      unitCode: EncounterBedUnitCode;
    };
  } | null>(null);
  const [bedIndex, setBedIndex] = useState<Map<string, FacilityBedBoardBedRow>>(new Map());
  const [facilityBedBoard, setFacilityBedBoard] = useState<FacilityBedBoardResponse | null>(null);
  const [assignPickerBed, setAssignPickerBed] = useState<FacilityBedBoardBedRow | null>(null);
  const [bedBoardStatusFilter, setBedBoardStatusFilter] = useState<BedBoardStatusFilterId>("all");
  const pendingRoomPatchesRef = useRef<Map<string, EncounterRoomUpdateResponse>>(new Map());

  const isProvider = roles.includes("PROVIDER");
  const isNurse = roles.includes("RN");
  const canAssignRoom = canAssignEncounterRoom(roles);
  const canManageBedStatus = canManageBedOperationalStatus(roles);
  const hospitalTechnicianSession = useMemo(
    () => ({
      roleCodes: roles,
      departmentCode,
      prismaDepartmentCode: departmentCode,
    }),
    [roles, departmentCode]
  );
  const isFloorTechnician = isHospitalFloorTechnicianProfile(hospitalTechnicianSession);
  const isFreestandingErObservationTechnician = useMemo(
    () =>
      canReadFreestandingErObservationPatients({
        roleCodes: roles,
        facilityType,
        facilityServiceLines,
        departmentCode,
      }),
    [roles, facilityType, facilityServiceLines, departmentCode]
  );
  const resolveEncounterHref = useCallback(
    (encounterId: string, encounterType?: string | null) =>
      isFloorTechnician
        ? hospitalTechnicianActiveWorkspacePath(encounterId)
        : canonicalEncounterWorkspaceHref({
            encounterId,
            encounterType,
            encounterStatus: "OPEN",
            source: "BOARD",
          }),
    [isFloorTechnician]
  );

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
  const usesCompactCensus = observationBoardUsesCompactCensus(layoutMode);

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
      const [data, bedBoard] = await Promise.all([
        fetchHospitalisationEncounters(facilityId),
        fetchFacilityBedBoard(facilityId).catch(() => null),
      ]);
      const nextRows = data || [];
      setEncounters((prev) => {
        const merged = mergeTrackboardEncounterUpdate(
          prev,
          nextRows,
          pendingRoomPatchesRef.current
        );
        reconcilePendingRoomPatches(merged, pendingRoomPatchesRef.current);
        return shouldReplaceEncounterRows(prev, merged) || pendingRoomPatchesRef.current.size > 0
          ? merged
          : prev;
      });
      if (bedBoard) {
        setFacilityBedBoard(bedBoard);
        setBedIndex(indexBedBoardByKey(bedBoard));
      }
    } catch (error) {
      console.error("Failed to load hospitalisation board:", error);
      const status =
        typeof error === "object" && error != null && "status" in error
          ? Number((error as { status?: number }).status)
          : null;
      if (status === 403) {
        setFetchError(t("observationBoard.readAccessDenied"));
      } else {
        setFetchError(t("hospitalizationBoard.loadListError"));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [facilityId, mockMode, t]);

  const claimSelf = useCallback(
    async (
      encounterId: string,
      kind: "PROVIDER" | "NURSE" | "TECHNICIAN",
      action: "ASSIGN_ME" | "UNASSIGN" = "ASSIGN_ME"
    ) => {
      const fid = effectiveFacilityId;
      if (!fid || mockMode === "error" || mockMode === "empty") return;
      setAssigningId(encounterId);
      setAssignError(null);
      try {
        const updated =
          action === "ASSIGN_ME"
            ? await assignHospitalRoleToMe(fid, encounterId, kind)
            : await unassignHospitalRole(fid, encounterId, kind);
        const projection = updated.projection;
        setEncounters((prev) =>
          prev.map((r) => {
            if (r.id !== encounterId) return r;
            const summary =
              r.admissionSummaryJson &&
              typeof r.admissionSummaryJson === "object" &&
              !Array.isArray(r.admissionSummaryJson)
                ? { ...(r.admissionSummaryJson as Record<string, unknown>) }
                : {};
            // Keep bag fields in local summary for immediate UI refresh.
            summary.enterpriseHospitalAssignmentV1 = {
              v: 1,
              careSetting: "OBSERVATION",
              slots: {
                PROVIDER: projection.providerUserId
                  ? {
                      userId: projection.providerUserId,
                      assignedAt: new Date().toISOString(),
                      source: "SELF_ASSIGN",
                      displayName: projection.providerName,
                    }
                  : null,
                NURSE: projection.nurseUserId
                  ? {
                      userId: projection.nurseUserId,
                      assignedAt: new Date().toISOString(),
                      source: "SELF_ASSIGN",
                      displayName: projection.nurseName,
                    }
                  : null,
                TECHNICIAN: projection.technicianUserId
                  ? {
                      userId: projection.technicianUserId,
                      assignedAt: new Date().toISOString(),
                      source: "SELF_ASSIGN",
                      displayName: projection.technicianName,
                    }
                  : null,
              },
              history: [],
            };
            return mergeHospitalisationRowAfterAssign(r, {
              ...r,
              admissionSummaryJson: summary,
            });
          })
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
              : t("enterpriseHospitalAssignmentD4a30.assignError");
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
  /** D3E.6A — clinical identity for OBS vs IP counts (not bed labels / LOS). */
  const clinicalCensusSplit = useMemo(() => {
    let observation = 0;
    let inpatient = 0;
    for (const e of encounters) {
      if (String(e.status ?? "").trim() !== "OPEN") continue;
      const ctx = resolveClinicalEncounterContext({
        type: e.type,
        status: e.status,
        billingClassification: (e as { billingClassification?: string | null }).billingClassification,
        admissionSummaryJson: (e as { admissionSummaryJson?: unknown }).admissionSummaryJson,
      });
      if (ctx === "OBSERVATION") observation += 1;
      else if (ctx === "INPATIENT") inpatient += 1;
    }
    return { observation, inpatient, total: observation + inpatient };
  }, [encounters]);

  const hospitalBedBoardUnits = useMemo(() => {
    const units: EncounterBedUnitCode[] = ["MS", "ICU", "OBS"];
    return units
      .map((unit) => (facilityBedBoard ? findBedBoardUnit(facilityBedBoard, unit) : null))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [facilityBedBoard]);

  const refreshFacilityBedBoard = useCallback(async () => {
    const fid = effectiveFacilityId;
    if (!fid) return;
    invalidateClinicalBoardGetCache(fid, ["MS", "ICU", "OBS"]);
    const bedBoard = await fetchFacilityBedBoard(fid).catch(() => null);
    logBedBoardMutationDebug("refreshFacilityBedBoard.result", {
      facilityId: fid,
      received: bedBoard?.generatedAt ?? null,
    });
    if (bedBoard) {
      setFacilityBedBoard(bedBoard);
      setBedIndex(indexBedBoardByKey(bedBoard));
    }
  }, [effectiveFacilityId]);

  const handleBedStatusUpdated = useCallback(
    (updatedBed: FacilityBedBoardBedRow) => {
      setFacilityBedBoard((prev) => {
        if (!prev) return prev;
        const nextBoard = applyBedBoardStatusPatch(prev, updatedBed);
        setBedIndex(indexBedBoardByKey(nextBoard));
        return nextBoard;
      });
      void refreshFacilityBedBoard();
    },
    [refreshFacilityBedBoard]
  );

  const handleRoomAssignmentSaved = useCallback(
    (patch: EncounterRoomUpdateResponse) => {
      const savedEncounterId = patch.id || roomAssignmentLaunch?.encounter.id;
      const fid = effectiveFacilityId;
      if (savedEncounterId) {
        pendingRoomPatchesRef.current.set(savedEncounterId, patch);
        setEncounters((prev) => {
          const nextRows = applyTrackboardRoomMutationPatch(prev, patch);
          if (fid) {
            setFacilityBedBoard((prevBoard) => {
              const nextBoard = rebuildFacilityBedBoardUnitsFromEncounters({
                facilityId: fid,
                units: ["MS", "ICU", "OBS"],
                encounters: nextRows,
                previousBoard: prevBoard,
              });
              if (nextBoard) {
                setBedIndex(indexBedBoardByKey(nextBoard));
                return nextBoard;
              }
              return prevBoard;
            });
          }
          return nextRows;
        });
        if (fid) {
          dispatchEncounterRoomAssignmentRefresh({
            encounterId: savedEncounterId,
            facilityId: fid,
            patch,
          });
        }
      }
      setRoomAssignmentLaunch(null);
      void loadEncounters({ silent: true });
      void refreshFacilityBedBoard();
    },
    [effectiveFacilityId, loadEncounters, refreshFacilityBedBoard, roomAssignmentLaunch?.encounter.id]
  );

  useEffect(() => {
    if (!effectiveFacilityId || typeof window === "undefined") return;
    const onRoomAssignmentRefresh = (event: Event) => {
      const detail = (event as CustomEvent<EncounterRoomAssignmentRefreshDetail>).detail;
      if (!detail || detail.facilityId !== effectiveFacilityId) return;
      pendingRoomPatchesRef.current.set(detail.encounterId, detail.patch);
      setEncounters((prev) => applyTrackboardRoomMutationPatch(prev, detail.patch));
      void loadEncounters({ silent: true });
      void refreshFacilityBedBoard();
    };
    window.addEventListener(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH, onRoomAssignmentRefresh);
    return () => {
      window.removeEventListener(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH, onRoomAssignmentRefresh);
    };
  }, [effectiveFacilityId, loadEncounters, refreshFacilityBedBoard]);

  const hospitalAssignCandidates = useMemo((): BedBoardAssignCandidate[] => {
    if (!assignPickerBed) return [];
    return selectTreatmentBedAssignmentCandidates(encounters, {
      facilityId: effectiveFacilityId,
    })
      .filter((row) => {
        const unit = resolveEncounterRoomUnit({
          roomLabel: row.roomLabel,
          type: row.type,
          admissionSummaryJson: row.admissionSummaryJson,
        });
        return unit === assignPickerBed.unitCode;
      })
      .map((row) => ({
        id: row.id,
        label: fullPatientName(row.patient),
        roomLabel: row.roomLabel,
        type: row.type ?? "INPATIENT",
        admissionSummaryJson: row.admissionSummaryJson,
      }));
  }, [assignPickerBed, effectiveFacilityId, encounters]);

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
      data-testid={isHospitalCareDashboard ? "hospital-care-dashboard" : "observation-board-layout"}
      data-layout-mode={layoutMode}
      data-projection={projection}
    >
      {ready && canManagePharmacy && effectiveFacilityId && !isHospitalCareDashboard && (
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
              {isHospitalCareDashboard
                ? t("hospitalCareD3e6a.floorBoard.dashboardTitle")
                : t("hospitalizationBoard.pageTitle")}
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {t("hospitalCareD3e6a.floorBoard.pageSubtitle")}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#0f766e" }}>
              <Link href={HOSPITAL_CARE_HOME} style={{ color: "#0f766e", fontWeight: 600 }}>
                {t("hospitalCareD3e6a.floorBoard.openHospitalCare")}
              </Link>
              {" · "}
              {t("hospitalCareD3e6a.floorBoard.clinicalCensusHint")
                .replace("{obs}", String(clinicalCensusSplit.observation))
                .replace("{ip}", String(clinicalCensusSplit.inpatient))}
            </p>
          </div>
        </header>

        {!isHospitalCareDashboard && encounters.length > 0 && mockMode !== "error" ? (
          <section style={observationBoardSnapshotSectionStyle(layoutMode)}>
            <div style={observationBoardSnapshotTitleStyle(layoutMode)}>
              {t("hospitalizationBoard.operationalStripTitle")}
            </div>
            <div style={observationBoardSnapshotGridStyle(layoutMode)}>
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatActive")}
                value={clinicalCensusSplit.total}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatRnUnassigned")}
                value={observationCensus.rnUnassignedCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatMdUnassigned")}
                value={observationCensus.providerUnassignedCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatReassessOverdue")}
                value={observationCensus.reassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatRnReassessOverdue")}
                value={observationCensus.rnReassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatMdReassessOverdue")}
                value={observationCensus.providerReassessmentOverdueCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatVitalsStale")}
                value={observationCensus.vitalsStaleCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatPendingPatients")}
                value={observationCensus.pendingResultsPatientsCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatPendingSum")}
                value={observationCensus.sumPendingResultsCounts}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatCriticalPatients")}
                value={observationCensus.criticalResultPatientsCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
                label={t("hospitalizationBoard.operationalStatLos24")}
                value={observationCensus.los24hOrMoreCount}
              />
              <ObservationOperationalStatChip
                layoutMode={layoutMode}
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

        {hospitalBedBoardUnits.length > 0 ? (
          <section data-testid="hospitalization-bed-board" style={{ marginBottom: 16 }}>
            <BedBoardStatusFilterBar
              value={bedBoardStatusFilter}
              onChange={setBedBoardStatusFilter}
              compact={usesCompactCensus}
            />
            {hospitalBedBoardUnits.map((unitView) => (
              <BedBoardUnitSection
                key={unitView.unit}
                unit={unitView.unit}
                summary={unitView.summary}
                beds={unitView.beds}
                statusFilter={bedBoardStatusFilter}
                facilityId={effectiveFacilityId}
                compact={usesCompactCensus}
                canAssignRoom={canAssignRoom}
                canManageBedStatus={canManageBedStatus}
                onAvailableBedClick={(bed) => setAssignPickerBed(bed)}
                onBedStatusUpdated={handleBedStatusUpdated}
                onChangeRoom={(bed) => {
                  const encounterId = bed.occupantEncounterId;
                  if (!encounterId) return;
                  const encounter = encounters.find((row) => row.id === encounterId);
                  if (!encounter) return;
                  setRoomAssignmentLaunch({ encounter });
                }}
              />
            ))}
          </section>
        ) : null}

        {!isHospitalCareDashboard ? (
        <>
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
                ? isFreestandingErObservationTechnician
                  ? t("observationBoard.emptyNoPatients")
                  : t("hospitalizationBoard.emptyNoPatients")
                : t("hospitalizationBoard.emptyFiltered")}
            </p>
            {!(encounters.length === 0 && isFreestandingErObservationTechnician) ? (
              <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
                {encounters.length === 0
                  ? t("hospitalizationBoard.emptyHintNoPatients")
                  : t("hospitalizationBoard.emptyHintFiltered")}
              </p>
            ) : null}
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
              const room = formatEncounterGovernedRoomDisplay(
                {
                  roomLabel: encounter.roomLabel,
                  type: encounter.type ?? "INPATIENT",
                  admissionSummaryJson: encounter.admissionSummaryJson,
                  governedRoomDisplay: encounter.governedRoomDisplay,
                  governedRoomUnit: encounter.governedRoomUnit,
                  governedRoomHasAssignment: encounter.governedRoomHasAssignment,
                },
                t
              );
              const bedStatus =
                lookupBedStatusForEncounter(
                  {
                    roomLabel: encounter.roomLabel,
                    type: encounter.type ?? "INPATIENT",
                    admissionSummaryJson: encounter.admissionSummaryJson,
                  },
                  bedIndex
                )?.status ?? null;
              const hospitalAssign = hospitalAssignmentFromRow(encounter);
              const physName = physicianLabel(encounter);
              const nurseName = nurseLabel(encounter);
              const techName = technicianLabel(encounter);
              const physLine = physName || t("emergencyTrackboard.unassignedDash");
              const nurseLine = nurseName || t("emergencyTrackboard.unassignedDash");
              const techLine = techName || t("emergencyTrackboard.unassignedDash");
              const physId = (hospitalAssign.providerUserId ?? "").trim();
              const nurseId = (hospitalAssign.nurseUserId ?? "").trim();
              const techId = (hospitalAssign.technicianUserId ?? "").trim();
              const isPhysMine = Boolean(userId && physId && physId === userId);
              const isNurseMine = Boolean(userId && nurseId && nurseId === userId);
              const isTechMine = Boolean(userId && techId && techId === userId);
              const isTechRole =
                roles.includes("PATIENT_CARE_TECH") || roles.includes("ADMIN");
              const obs = encounter.observationOps ?? null;
              const resultsPendingCount = encounter.trackboardOps?.resultsPendingCount ?? 0;
              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <div style={observationBoardCardInnerStyle(layoutMode)}>
                      <MedoraCompactPatientCardRow
                        stackedLayout={stackedCardLayout}
                        rightMaxWidth={observationBoardRightColumnMaxWidth(layoutMode)}
                        avatarInitials={patientInitials(patient)}
                        roomLabel={t("common.room")}
                        roomValue={room}
                        roomClickable={canAssignRoom}
                        roomButtonTitle={t("roomAssignment.changeRoomTooltip")}
                        onRoomClick={() => setRoomAssignmentLaunch({ encounter })}
                        centerTrailingMaxWidth={usesCompactCensus ? 200 : 260}
                        centerTrailing={
                          <div
                            aria-label={t("emergencyTrackboard.assignedPersonnelLabel")}
                            style={observationBoardPersonnelBlockStyle(layoutMode)}
                          >
                            <p
                              style={observationBoardPersonnelLineStyle(layoutMode)}
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
                              style={observationBoardPersonnelLineStyle(layoutMode)}
                              title={nurseName || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("emergencyTrackboard.nurseShort")}:
                              </span>
                              <span style={{ color: nurseName ? "#0f172a" : "#94a3b8", fontWeight: nurseName ? 600 : 500 }}>
                                {nurseLine}
                              </span>
                            </p>
                            <p
                              style={observationBoardPersonnelLineStyle(layoutMode)}
                              title={techName || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("enterpriseHospitalAssignmentD4a30.technician")}:
                              </span>
                              <span style={{ color: techName ? "#0f172a" : "#94a3b8", fontWeight: techName ? 600 : 500 }}>
                                {techLine}
                              </span>
                            </p>
                          </div>
                        }
                        identity={
                          <>
                            <h2 style={observationBoardIdentityTitleStyle(layoutMode)}>{fullPatientName(patient)}</h2>
                            <p style={observationBoardIdentityLineStyle(layoutMode, { fontSize: 12, color: "#64748b" })}>
                              {formatAgeYearsSexForLocale(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null,
                                language
                              )}
                            </p>
                            <p style={observationBoardIdentityLineStyle(layoutMode, { fontSize: 12, color: "#334155" })}>{cc}</p>
                            <p style={observationBoardIdentityLineStyle(layoutMode, { fontSize: 11, color: "#64748b" })}>
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
                            {usesCompactCensus ? (
                              <div style={observationBoardPrimaryBadgeRowStyle(layoutMode)}>
                                <MedoraCardBadge compact soft={ACUITY_SOFT[acuity]}>{acuityLabel[acuity]}</MedoraCardBadge>
                                <HospitalBedStatusChip status={bedStatus} compact />
                                {obs ? (
                                  <>
                                    <ObservationDispositionBoardChips encounter={encounter} t={t} compact />
                                    <ObservationEscalationHintBadges encounter={encounter} t={t} compact inline />
                                    <ObservationOpsChips obs={obs} resultsPendingCount={resultsPendingCount} t={t} compact inline />
                                  </>
                                ) : (
                                  <ObservationEscalationHintBadges encounter={encounter} t={t} compact inline />
                                )}
                              </div>
                            ) : (
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
                                  <HospitalBedStatusChip status={bedStatus} />
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
                              </>
                            )}
                            <div style={observationBoardTouchActionGroupStyle(layoutMode)}>
                              <Link
                                href={resolveEncounterHref(encounter.id, encounter.type)}
                                style={observationBoardCensusActionButtonStyle(
                                  {
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
                                  },
                                  layoutMode
                                )}
                              >
                                {t("common.view")}
                              </Link>
                              {isProvider ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void claimSelf(
                                      encounter.id,
                                      "PROVIDER",
                                      isPhysMine ? "UNASSIGN" : "ASSIGN_ME"
                                    )
                                  }
                                  disabled={
                                    assigningId === encounter.id ||
                                    mockMode === "error" ||
                                    mockMode === "empty" ||
                                    !effectiveFacilityId
                                  }
                                  title={
                                    isPhysMine
                                      ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")
                                  }
                                  style={observationBoardCensusActionButtonStyle(
                                    {
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
                                        mockMode === "error" ||
                                        mockMode === "empty" ||
                                        !effectiveFacilityId
                                          ? "default"
                                          : "pointer",
                                    },
                                    layoutMode
                                  )}
                                >
                                  {isPhysMine
                                    ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                    : assigningId === encounter.id
                                      ? t("enterpriseHospitalAssignmentD4a30.assignSubmitting")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                                </button>
                              ) : null}
                              {isNurse ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void claimSelf(
                                      encounter.id,
                                      "NURSE",
                                      isNurseMine ? "UNASSIGN" : "ASSIGN_ME"
                                    )
                                  }
                                  disabled={
                                    assigningId === encounter.id ||
                                    mockMode === "error" ||
                                    mockMode === "empty" ||
                                    !effectiveFacilityId
                                  }
                                  title={
                                    isNurseMine
                                      ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")
                                  }
                                  style={observationBoardCensusActionButtonStyle(
                                    {
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
                                        mockMode === "error" ||
                                        mockMode === "empty" ||
                                        !effectiveFacilityId
                                          ? "default"
                                          : "pointer",
                                    },
                                    layoutMode
                                  )}
                                >
                                  {isNurseMine
                                    ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                    : assigningId === encounter.id
                                      ? t("enterpriseHospitalAssignmentD4a30.assignSubmitting")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                                </button>
                              ) : null}
                              {isTechRole ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void claimSelf(
                                      encounter.id,
                                      "TECHNICIAN",
                                      isTechMine ? "UNASSIGN" : "ASSIGN_ME"
                                    )
                                  }
                                  disabled={
                                    assigningId === encounter.id ||
                                    mockMode === "error" ||
                                    mockMode === "empty" ||
                                    !effectiveFacilityId
                                  }
                                  title={
                                    isTechMine
                                      ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")
                                  }
                                  style={observationBoardCensusActionButtonStyle(
                                    {
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "4px 10px",
                                      borderRadius: 8,
                                      border: isTechMine ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                                      backgroundColor: isTechMine ? "#d1fae5" : "#fff",
                                      color: isTechMine ? "#065f46" : "#0f172a",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor:
                                        assigningId === encounter.id ||
                                        mockMode === "error" ||
                                        mockMode === "empty" ||
                                        !effectiveFacilityId
                                          ? "default"
                                          : "pointer",
                                    },
                                    layoutMode
                                  )}
                                >
                                  {isTechMine
                                    ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                                    : assigningId === encounter.id
                                      ? t("enterpriseHospitalAssignmentD4a30.assignSubmitting")
                                      : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
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
                                  style={observationBoardCensusActionButtonStyle(
                                    {
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
                                    },
                                    layoutMode
                                  )}
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
                    </div>
                  </MedoraCard>
                </li>
              );
            })}
          </ul>
        )}
        </>
        ) : null}
      </div>
      {assignPickerBed ? (
        <BedBoardAssignEncounterPicker
          open
          bed={assignPickerBed}
          candidates={hospitalAssignCandidates}
          onClose={() => setAssignPickerBed(null)}
          onSelect={(candidate) => {
            const encounter = encounters.find((row) => row.id === candidate.id);
            if (!encounter || !assignPickerBed) return;
            setRoomAssignmentLaunch({
              encounter,
              prefillFromBedBoard: {
                room: assignPickerBed.room,
                unitCode: assignPickerBed.unitCode,
              },
            });
            setAssignPickerBed(null);
          }}
        />
      ) : null}
      {effectiveFacilityId && roomAssignmentLaunch ? (
        <RoomAssignmentModal
          open
          facilityId={effectiveFacilityId}
          encounter={{
            id: roomAssignmentLaunch.encounter.id,
            roomLabel: roomAssignmentLaunch.encounter.roomLabel,
            type: roomAssignmentLaunch.encounter.type ?? "INPATIENT",
            admissionSummaryJson: roomAssignmentLaunch.encounter.admissionSummaryJson,
          }}
          prefillFromBedBoard={Boolean(roomAssignmentLaunch.prefillFromBedBoard)}
          initialRoom={roomAssignmentLaunch.prefillFromBedBoard?.room ?? null}
          initialUnitCode={roomAssignmentLaunch.prefillFromBedBoard?.unitCode ?? null}
          onClose={() => setRoomAssignmentLaunch(null)}
          onSaved={handleRoomAssignmentSaved}
        />
      ) : null}
    </div>
  );
}
