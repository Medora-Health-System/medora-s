"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { assignNurseSelf, assignProviderSelf, fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
} from "@/lib/encounterChromeI18n";
import { erDispositionBadgeDisplayLabel } from "@/features/emergency/erDispositionBadgeI18n";
import {
  esiDisplayChar,
  esiLevelFromUnknown,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import { BillingClassificationBadgeInteractive } from "@/components/encounters/BillingClassificationBadgeInteractive";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCompactPatientCardRow,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import {
  erDispositionBadgeFromEncounterJson,
  type ErDispositionBadgeVariant,
} from "@/features/emergency/erTrackboardDispositionBadge";
import { readDischargeSortieExecutionFromEncounter } from "@/features/emergency/emergencyDispositionV1";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import type { EncounterBedUnitCode } from "@medora/shared";
import {
  erHandoffV1SatisfiesInpatientTransferConfirm,
  sortRowsByRoomLabel,
} from "@medora/shared";
import type { EncounterRoomUpdateResponse } from "@/lib/roomAssignmentApi";
import { applyEncounterRoomAssignmentUpdate } from "@/lib/applyEncounterRoomAssignmentUpdate";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import { BedBoardUnitSection } from "@/components/encounters/BedBoardUnitSection";
import { BedBoardStatusFilterBar } from "@/components/encounters/BedBoardStatusFilterBar";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";
import {
  BedBoardAssignEncounterPicker,
  type BedBoardAssignCandidate,
} from "@/components/encounters/BedBoardAssignEncounterPicker";
import { EdBedStatusChip } from "@/components/encounters/BedOperationalStatusChip";
import {
  ED_LIFECYCLE_BOARD_VIEWS,
  ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS,
  ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS,
  isEdLifecyclePlaceholderView,
  type EdLifecycleBoardView,
} from "@/features/emergency/edEncounterLifecycleNavigation";
import {
  fetchFacilityBedBoard,
  findBedBoardUnit,
  indexBedBoardByKey,
  type FacilityBedBoardBedRow,
  type FacilityBedBoardResponse,
} from "@/lib/bedBoardApi";
import { lookupBedStatusForEncounter } from "@/lib/bedStatusDisplay";
import {
  canAssignEncounterRoom,
  formatEncounterGovernedRoomDisplay,
} from "@/lib/governedRoomDisplay";
import { canManageBedOperationalStatus } from "@/lib/bedBoardPermissions";
import {
  computeLos,
  LOS_ESCALATION_SOFT,
  LOS_TIER_SOFT,
  losEscalationTierFromMs,
  type LosResult,
} from "@/features/emergency/erLengthOfStay";
import {
  parseIsoMs,
  reassessmentDue,
  type TrackboardOpsPayload,
} from "@/features/emergency/erTrackboardOperationalBadges";
import {
  erTrackboardCardInnerStyle,
  erTrackboardCensusActionButtonStyle,
  erTrackboardFilterActionsStyle,
  erTrackboardFiltersRowStyle,
  erTrackboardIdentityLineStyle,
  erTrackboardIdentityTitleStyle,
  erTrackboardOpsRegionStyle,
  erTrackboardPageInnerStyle,
  erTrackboardPageShellStyle,
  erTrackboardPatientListStyle,
  erTrackboardPersonnelBlockStyle,
  erTrackboardPersonnelLineStyle,
  erTrackboardPrimaryBadgeRowStyle,
  erTrackboardRightColumnMaxWidth,
  erTrackboardSearchFieldStyle,
  erTrackboardTouchControlStyle,
  erTrackboardTouchActionGroupStyle,
  erTrackboardUsesCompactCensus,
  erTrackboardUsesStackedCardLayout,
  ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
  resolveErTrackboardLayoutMode,
  type ErTrackboardLayoutMode,
} from "@/features/emergency/erTrackboardResponsiveLayout";

const EMERGENCY_TYPE = "EMERGENCY" as const;

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

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

function acuityFromEsi(esi: number | null | undefined): AcuityTier {
  if (esi == null || Number.isNaN(esi)) return "stable";
  if (esi <= 1) return "critical";
  if (esi <= 3) return "monitoring";
  return "stable";
}

function patientInitials(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(
  p: { firstName?: string | null; lastName?: string | null } | null | undefined,
  dash: string
): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || dash;
}

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function nurseLabel(enc: {
  nurseAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const n = enc.nurseAssigned;
  if (!n) return "";
  return `${(n.firstName ?? "").trim()} ${(n.lastName ?? "").trim()}`.trim();
}

function patientNirDisplay(
  patient: { mrn?: string | null; nationalId?: string | null } | null | undefined,
  dash: string
): string {
  const raw = (patient?.mrn ?? patient?.nationalId ?? "").trim();
  return raw || dash;
}

type OpenEncounterRow = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  roomLabel?: string | null;
  chiefComplaint?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  } | null;
  triage?: { esi?: number | null; chiefComplaint?: string | null; triageCompleteAt?: string | null } | null;
  physicianAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  /** Phase 10A — RN currently responsible for the encounter (operational ownership). */
  nurseAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  physicianAssignedUserId?: string | null;
  physicianAssignedAt?: string | null;
  nurseAssignedAt?: string | null;
  /** Phase 10B — first admission-summary save timestamp (server). */
  admittedAt?: string | null;
  providerDocumentationSignedAt?: string | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  /** Phase 10B — read-only aggregates from `/trackboard` (no result text). */
  trackboardOps?: TrackboardOpsPayload | null;
  governedRoomDisplay?: string | null;
  governedRoomUnit?: string | null;
  governedRoomHasAssignment?: boolean;
};

type EdRoomAssignmentLaunch = {
  encounter: OpenEncounterRow;
  prefillFromBedBoard?: {
    room: string;
    unitCode: EncounterBedUnitCode;
  };
};

function dispositionBadgeSoft(variant: ErDispositionBadgeVariant): PriorityBadgeSoft {
  switch (variant) {
    case "discharge":
      return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" };
    case "admit":
      return { bg: "#eef2ff", text: "#3730a3", border: "#c7d2fe" };
    case "observe":
      return { bg: "#f5f3ff", text: "#5b21b6", border: "#ddd6fe" };
    case "transfer":
      return { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
    case "ama":
      return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" };
    case "deceased":
      return { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
    case "lwbs":
      return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
    case "other":
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  }
}

function acuityLabelKey(tier: AcuityTier): "emergencyTrackboard.acuityCritical" | "emergencyTrackboard.acuityMonitoring" | "emergencyTrackboard.acuityStable" {
  if (tier === "critical") return "emergencyTrackboard.acuityCritical";
  if (tier === "monitoring") return "emergencyTrackboard.acuityMonitoring";
  return "emergencyTrackboard.acuityStable";
}

export function EmergencyTrackboardView() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready, roles, userId } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [rows, setRows] = useState<OpenEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /** Phase 10A — per-row assignment in-flight + per-row error (transient UI only). */
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<{ id: string; message: string } | null>(null);
  const [roomAssignmentLaunch, setRoomAssignmentLaunch] = useState<EdRoomAssignmentLaunch | null>(
    null
  );
  const [bedIndex, setBedIndex] = useState<Map<string, FacilityBedBoardBedRow>>(new Map());
  const [edBedBoard, setEdBedBoard] = useState<FacilityBedBoardResponse | null>(null);
  const [boardViewMode, setBoardViewMode] = useState<EdLifecycleBoardView>("trackboard");
  const [assignPickerBed, setAssignPickerBed] = useState<FacilityBedBoardBedRow | null>(null);
  const [bedBoardStatusFilter, setBedBoardStatusFilter] = useState<BedBoardStatusFilterId>("all");
  const [layoutMode, setLayoutMode] = useState<ErTrackboardLayoutMode>("desktopDense");
  /**
   * Phase 10A — minute-tick driver for LOS updates. We only need to re-render
   * the LOS column once per minute; this avoids any extra network traffic.
   */
  const [losTick, setLosTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLosTick((n) => (n + 1) % 1_000_000), 60_000);
    return () => clearInterval(id);
  }, []);
  void losTick;

  const isProvider = roles.includes("PROVIDER");
  const canChangeBillingClassification =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    roles.includes("FRONT_DESK") ||
    roles.includes("BILLING");
  const isNurse = roles.includes("RN");
  const canAssignRoom = canAssignEncounterRoom(roles);
  const canManageBedStatus = canManageBedOperationalStatus(roles);
  const stackedCardLayout = erTrackboardUsesStackedCardLayout(layoutMode);
  const usesCompactCensus = erTrackboardUsesCompactCensus(layoutMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveErTrackboardLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const loadEncounters = useCallback(async (opts?: { silent?: boolean }) => {
    if (!facilityId) return;
    const silent = Boolean(opts?.silent) || hasLoadedOnceRef.current;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setFetchError(null);
    }
    try {
      const [data, bedBoard] = await Promise.all([
        fetchOpenEncounters(facilityId),
        fetchFacilityBedBoard(facilityId, "ED").catch(() => null),
      ]);
      const arr = Array.isArray(data) ? data : [];
      setRows(arr as OpenEncounterRow[]);
      hasLoadedOnceRef.current = true;
      if (bedBoard) {
        setEdBedBoard(bedBoard);
        setBedIndex(indexBedBoardByKey(bedBoard));
      }
    } catch (e) {
      console.error("Failed to load emergency trackboard:", e);
      if (!silent) {
        const status = typeof e === "object" && e != null && "status" in e ? Number((e as { status?: number }).status) : null;
        if (status === 403) {
          setFetchError(t("emergencyTrackboard.readAccessDenied"));
        } else {
          setFetchError(t("emergencyTrackboard.loadError"));
        }
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [facilityId, t]);

  const claimSelf = useCallback(
    async (encounterId: string, kind: "provider" | "nurse") => {
      if (!facilityId) return;
      setAssigningId(encounterId);
      setAssignError(null);
      try {
        const updated =
          kind === "provider"
            ? await assignProviderSelf(facilityId, encounterId)
            : await assignNurseSelf(facilityId, encounterId);
        setRows((prev) =>
          prev.map((r) =>
            r.id === encounterId
              ? ({
                  ...r,
                  ...(updated && typeof updated === "object" ? (updated as Partial<OpenEncounterRow>) : {}),
                } as OpenEncounterRow)
              : r
          )
        );
      } catch (err) {
        const raw = err instanceof Error ? err.message : "";
        const lc = raw.toLowerCase();
        const message = lc.includes("ouverte") || lc.includes("open")
          ? t("emergencyTrackboard.assignErrorClosed")
          : lc.includes("rôle") || lc.includes("role") || lc.includes("infirm") || lc.includes("médecin")
            ? t("emergencyTrackboard.assignErrorRole")
            : t("emergencyTrackboard.assignErrorGeneric");
        setAssignError({ id: encounterId, message });
      } finally {
        setAssigningId(null);
      }
    },
    [facilityId, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadEncounters();
    const interval = window.setInterval(() => {
      void loadEncounters({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId, loadEncounters]);

  const emergencyOnly = useMemo(
    () => rows.filter((e) => (e.type ?? "").trim() === EMERGENCY_TYPE),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emergencyOnly;
    return emergencyOnly.filter((encounter) => {
      const name = fullPatientName(encounter.patient, t("common.dash")).toLowerCase();
      const nir = String(encounter.patient?.mrn ?? encounter.patient?.nationalId ?? "")
        .trim()
        .toLowerCase();
      const cc = (encounter.triage?.chiefComplaint || encounter.chiefComplaint || "").toLowerCase();
      const room = (encounter.roomLabel ?? "").toLowerCase();
      const phys = physicianLabel(encounter).toLowerCase();
      const nurse = nurseLabel(encounter).toLowerCase();
      const blob = `${name} ${nir} ${cc} ${room} ${phys} ${nurse}`;
      return blob.includes(q);
    });
  }, [emergencyOnly, search, t]);

  const sortedFiltered = useMemo(() => sortRowsByRoomLabel(filtered), [filtered]);

  const edBedBoardUnit = useMemo(
    () => (edBedBoard ? findBedBoardUnit(edBedBoard, "ED") : null),
    [edBedBoard]
  );

  const lifecycleNavLabel = useCallback(
    (view: EdLifecycleBoardView): string => {
      const base = t(ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS[view]);
      if (view === "trackboard" && emergencyOnly.length > 0) {
        return `${base} (${emergencyOnly.length})`;
      }
      return base;
    },
    [emergencyOnly.length, t]
  );

  const lifecyclePlaceholderPanelStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px dashed #cbd5e1",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "48px 24px",
    textAlign: "center",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  };

  const unassignedEdCandidates = useMemo((): BedBoardAssignCandidate[] => {
    return emergencyOnly
      .filter((row) => !(row.roomLabel ?? "").trim())
      .map((row) => ({
        id: row.id,
        label: fullPatientName(row.patient, t("common.dash")),
        roomLabel: row.roomLabel,
        type: row.type ?? "EMERGENCY",
        admissionSummaryJson: row.admissionSummaryJson,
      }));
  }, [emergencyOnly, t]);

  const refreshEdBedBoard = useCallback(async () => {
    if (!facilityId) return;
    const bedBoard = await fetchFacilityBedBoard(facilityId, "ED").catch(() => null);
    if (bedBoard) {
      setEdBedBoard(bedBoard);
      setBedIndex(indexBedBoardByKey(bedBoard));
    }
  }, [facilityId]);

  const handleRoomAssignmentSaved = useCallback(
    (patch: EncounterRoomUpdateResponse) => {
      const savedEncounterId = patch.id || roomAssignmentLaunch?.encounter.id;
      if (savedEncounterId) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === savedEncounterId ? applyEncounterRoomAssignmentUpdate(row, patch) : row
          )
        );
      }
      setRoomAssignmentLaunch(null);
      void loadEncounters({ silent: true });
      void refreshEdBedBoard();
    },
    [loadEncounters, refreshEdBedBoard, roomAssignmentLaunch?.encounter.id]
  );

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

  const statusSoft = (status: string): PriorityBadgeSoft =>
    STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };

  return (
    <div style={erTrackboardPageShellStyle(layoutMode)} data-layout-mode={layoutMode}>
      <div
        style={erTrackboardPageInnerStyle(layoutMode)}
        data-testid="emergency-trackboard-layout"
        data-layout-mode={layoutMode}
      >
        {/*
         * Phase 10A patch — compact operational header.
         * The page name is preserved as a screen-reader-only h1 (page identity is
         * already conveyed by the side navigation). The visible left affordance is
         * a small "LOS" pill matching the approved mock; the ED intake link sits
         * top-right on the same row.
         */}
        <header
          style={{
            marginBottom: 16,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {t("emergencyTrackboard.title")}
          </h1>
          <span
            aria-hidden
            title={t("emergencyTrackboard.losTooltip")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 9999,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
              letterSpacing: "0.02em",
            }}
          >
            <span aria-hidden style={{ color: "#0369a1", fontSize: 12 }}>●</span>
            {t("emergencyTrackboard.losShort")}
          </span>
          <Link
            href="/app/emergency/triage"
            style={erTrackboardTouchControlStyle(
              {
                marginLeft: layoutMode === "compactStacked" ? 0 : "auto",
                color: "#2563eb",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                padding: layoutMode === "compactStacked" ? "10px 12px" : undefined,
              },
              layoutMode
            )}
          >
            {t("emergencyTrackboard.triageLink")}
          </Link>
        </header>

        <div style={erTrackboardFiltersRowStyle(layoutMode)} data-testid="emergency-trackboard-filters">
          <div style={erTrackboardSearchFieldStyle()}>
            <span style={{ ...filterLabel, marginBottom: 3 }}>{t("emergencyTrackboard.searchLabel")}</span>
            <input
              type="search"
              aria-label={t("emergencyTrackboard.searchAria")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("emergencyTrackboard.searchPlaceholder")}
              style={{
                ...inputBase,
                height: layoutMode === "desktopDense" ? 40 : ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
                fontSize: 14,
              }}
            />
          </div>
          <div style={erTrackboardFilterActionsStyle(layoutMode)}>
            <div
              role="group"
              aria-label={t("edLifecycle.navigation.ariaLabel")}
              data-testid="emergency-trackboard-view-toggle"
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {ED_LIFECYCLE_BOARD_VIEWS.map((view, index) => (
                <button
                  key={view}
                  type="button"
                  data-testid={`ed-lifecycle-nav-${view}`}
                  aria-pressed={boardViewMode === view}
                  onClick={() => setBoardViewMode(view)}
                  style={{
                    padding: "0 12px",
                    height: layoutMode === "desktopDense" ? 40 : ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
                    border: "none",
                    borderLeft: index > 0 ? "1px solid #e2e8f0" : undefined,
                    background: boardViewMode === view ? "#eff6ff" : "#fff",
                    color: boardViewMode === view ? "#1d4ed8" : "#475569",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lifecycleNavLabel(view)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadEncounters({ silent: hasLoadedOnceRef.current })}
              disabled={loading && !hasLoadedOnceRef.current}
              style={erTrackboardTouchControlStyle(
                {
                  height: layoutMode === "desktopDense" ? 40 : ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
                  width: layoutMode === "compactStacked" ? "100%" : undefined,
                  padding: "0 14px",
                  backgroundColor: "#fff",
                  color: "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  cursor: loading && !hasLoadedOnceRef.current ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                  whiteSpace: "nowrap",
                },
                layoutMode
              )}
            >
              {loading && !hasLoadedOnceRef.current
                ? t("common.loading")
                : refreshing
                  ? t("common.refreshing")
                  : t("common.refresh")}
            </button>
          </div>
        </div>

        {isEdLifecyclePlaceholderView(boardViewMode) ? (
          <div
            style={lifecyclePlaceholderPanelStyle}
            data-testid={`ed-lifecycle-placeholder-${boardViewMode}`}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>
              {t(ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS[boardViewMode]!)}
            </p>
          </div>
        ) : boardViewMode === "bedBoard" ? (
          edBedBoardUnit ? (
            <>
              <BedBoardStatusFilterBar
                value={bedBoardStatusFilter}
                onChange={setBedBoardStatusFilter}
                compact={usesCompactCensus}
              />
              <BedBoardUnitSection
                unit="ED"
                summary={edBedBoardUnit.summary}
                beds={edBedBoardUnit.beds}
                statusFilter={bedBoardStatusFilter}
                facilityId={facilityId}
                compact={usesCompactCensus}
                canAssignRoom={canAssignRoom}
                canManageBedStatus={canManageBedStatus}
                onAvailableBedClick={(bed) => setAssignPickerBed(bed)}
                onBedStatusUpdated={() => void refreshEdBedBoard()}
              />
            </>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 14 }}>
              {loading ? t("common.loading") : t("bedBoard.refreshBoard")}
            </div>
          )
        ) : fetchError ? (
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
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("emergencyTrackboard.loadErrorHint")}</p>
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
              {t("emergencyTrackboard.retry")}
            </button>
          </div>
        ) : loading && rows.length === 0 ? (
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
        ) : sortedFiltered.length === 0 ? (
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
              {emergencyOnly.length === 0
                ? t("emergencyTrackboard.emptyNoEncounters")
                : t("emergencyTrackboard.emptyNoSearch")}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {emergencyOnly.length === 0
                ? t("emergencyTrackboard.emptyHintNoEncounters")
                : t("emergencyTrackboard.emptyHintSearch")}
            </p>
          </div>
        ) : (
          <ul style={erTrackboardPatientListStyle(layoutMode)}>
            {sortedFiltered.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const dash = t("common.dash");
              const cc = encounter.triage?.chiefComplaint || encounter.chiefComplaint || dash;
              const esiLevel = esiLevelFromUnknown(encounter.triage?.esi ?? null);
              const room = formatEncounterGovernedRoomDisplay(
                {
                  roomLabel: encounter.roomLabel,
                  type: encounter.type ?? "EMERGENCY",
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
                    type: encounter.type ?? "EMERGENCY",
                    admissionSummaryJson: encounter.admissionSummaryJson,
                  },
                  bedIndex
                )?.status ?? null;
              const phys = physicianLabel(encounter);
              const nurse = nurseLabel(encounter);
              const physId = (encounter.physicianAssigned?.id ?? "").trim();
              const nurseId = (encounter.nurseAssigned?.id ?? "").trim();
              const isPhysMine = Boolean(userId && physId && physId === userId);
              const isNurseMine = Boolean(userId && nurseId && nurseId === userId);
              const nirLine = patientNirDisplay(patient, dash);
              const arrivalDisplay = encounter.createdAt
                ? formatEncounterChromeDateTime(encounter.createdAt, language)
                : dash;
              /** LOS source: `Encounter.createdAt` (see erLengthOfStay.ts header). */
              const los: LosResult | null = computeLos(encounter.createdAt);
              const losTooltip =
                los?.tier === "high"
                  ? t("emergencyTrackboard.losTierHighTooltip")
                  : los?.tier === "attention"
                    ? t("emergencyTrackboard.losTierAttentionTooltip")
                    : t("emergencyTrackboard.losTierNormalTooltip");
              const statusKey = (encounter.status ?? "").trim() || "OPEN";
              const encounterTypeKey = (encounter.type ?? "").trim();
              const dispositionBadge = erDispositionBadgeFromEncounterJson(encounter);
              const sortieInfirmierOk =
                dispositionBadge?.variant === "discharge" &&
                readDischargeSortieExecutionFromEncounter(encounter.nursingAssessment) != null;
              const primaryStatusSoft = dispositionBadge
                ? dispositionBadgeSoft(dispositionBadge.variant)
                : statusSoft(statusKey);
              const primaryStatusLabel = dispositionBadge
                ? dispositionBadge.variant === "admit" && encounterTypeKey === EMERGENCY_TYPE
                  ? t("emergencyTrackboard.disposition.admissionPending")
                  : erDispositionBadgeDisplayLabel(dispositionBadge, t)
                : tEncounterStatus(t, statusKey);
              const showTransferPendingChip =
                dispositionBadge?.variant === "admit" &&
                encounterTypeKey === EMERGENCY_TYPE &&
                !erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment);

              const losTier = los?.tier ?? "normal";
              const losTileSoft = LOS_TIER_SOFT[losTier];

              /** Phase 10B — minute tick + encounter list refresh drive these reminders. */
              void losTick;
              const nowMs = Date.now();
              const ops: TrackboardOpsPayload = encounter.trackboardOps ?? {
                resultsPendingCount: 0,
                criticalResultUnacknowledged: false,
                openOrderCount: 0,
                lastNursingReassessmentAt: null,
                firstDispositionDocAt: null,
              };
              const createdMs = parseIsoMs(encounter.createdAt);

              const escalationTier = los ? losEscalationTierFromMs(los.ms) : "none";
              const reassessNeeded =
                createdMs != null &&
                reassessmentDue({
                  nowMs,
                  encounterCreatedMs: createdMs,
                  triageCompleteMs: parseIsoMs(encounter.triage?.triageCompleteAt ?? null),
                  lastReassessmentMs: parseIsoMs(ops.lastNursingReassessmentAt),
                  esi: encounter.triage?.esi ?? null,
                });

              const opsChips: Array<{
                key: string;
                text: string;
                soft: PriorityBadgeSoft;
                href?: string;
                ariaLabel?: string;
              }> = [];
              if (ops.criticalResultUnacknowledged) {
                opsChips.push({
                  key: "crit",
                  text: t("emergencyTrackboard.ops.criticalUnack"),
                  soft: { bg: "#fef2f2", text: "#7f1d1d", border: "#dc2626" },
                });
              }
              if (ops.resultsPendingCount > 0) {
                opsChips.push({
                  key: "res",
                  text: t("emergencyTrackboard.ops.resultsPending").replace("{count}", String(ops.resultsPendingCount)),
                  soft: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
                });
              }
              if (ops.openOrderCount > 0) {
                const countLabel = String(ops.openOrderCount);
                opsChips.push({
                  key: "orders",
                  text: t("emergencyTrackboard.ops.ordersPending").replace("{count}", countLabel),
                  soft: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
                  href: emergencyActiveWorkspacePath(encounter.id, { section: "orders" }),
                  ariaLabel: t("emergencyTrackboard.ops.ordersPendingLinkAria").replace("{count}", countLabel),
                });
              }
              if (reassessNeeded) {
                opsChips.push({
                  key: "re",
                  text: t("emergencyTrackboard.ops.reassessmentDue"),
                  soft: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
                });
              }
              if (escalationTier !== "none") {
                const escSoft = LOS_ESCALATION_SOFT[escalationTier];
                const escLabel =
                  escalationTier === "los_high"
                    ? t("emergencyTrackboard.ops.losHigh")
                    : escalationTier === "observation_watch"
                      ? t("emergencyTrackboard.ops.observationWatch")
                      : t("emergencyTrackboard.ops.extendedStay");
                opsChips.push({ key: "esc", text: escLabel, soft: escSoft });
              }

              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <div style={erTrackboardCardInnerStyle(layoutMode)}>
                      <MedoraCompactPatientCardRow
                        stackedLayout={stackedCardLayout}
                        rightMaxWidth={erTrackboardRightColumnMaxWidth(layoutMode)}
                        avatarInitials={patientInitials(patient)}
                        avatarFooter={
                          <span style={esiUnderAvatarNumberStyle(esiLevel)}>{esiDisplayChar(esiLevel)}</span>
                        }
                        roomLabel={t("encounterChrome.labelRoom")}
                        roomValue={room}
                        roomClickable={canAssignRoom}
                        roomButtonTitle={t("roomAssignment.changeRoomTooltip")}
                        onRoomClick={() => setRoomAssignmentLaunch({ encounter })}
                        centerLeading={
                          los ? (
                            <div
                              title={`${t("emergencyTrackboard.losTooltip")} ${losTooltip}`}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                border: `1px solid ${losTileSoft.border}`,
                                backgroundColor: losTileSoft.bg,
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                                textAlign: "center",
                                minWidth: stackedCardLayout ? 0 : 80,
                                maxWidth: stackedCardLayout ? "100%" : 120,
                                width: stackedCardLayout ? "100%" : undefined,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  color: losTileSoft.text,
                                  marginBottom: 1,
                                  lineHeight: 1,
                                  opacity: 0.85,
                                }}
                              >
                                {t("emergencyTrackboard.losShort")}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  lineHeight: 1.15,
                                  color: losTileSoft.text,
                                  fontVariantNumeric: "tabular-nums",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {los.labelPadded}
                              </div>
                            </div>
                          ) : null
                        }
                        centerTrailing={
                          <div
                            aria-label={t("emergencyTrackboard.assignedPersonnelLabel")}
                            style={erTrackboardPersonnelBlockStyle(layoutMode)}
                          >
                            <p
                              style={erTrackboardPersonnelLineStyle(layoutMode)}
                              title={phys || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("emergencyTrackboard.physicianShort")}:
                              </span>
                              <span style={{ color: phys ? "#0f172a" : "#94a3b8", fontWeight: phys ? 600 : 500 }}>
                                {phys || t("emergencyTrackboard.unassignedDash")}
                              </span>
                            </p>
                            <p
                              style={erTrackboardPersonnelLineStyle(layoutMode)}
                              title={nurse || undefined}
                            >
                              <span style={{ color: "#94a3b8", marginRight: 4 }}>
                                {t("emergencyTrackboard.nurseShort")}:
                              </span>
                              <span style={{ color: nurse ? "#0f172a" : "#94a3b8", fontWeight: nurse ? 600 : 500 }}>
                                {nurse || t("emergencyTrackboard.unassignedDash")}
                              </span>
                            </p>
                          </div>
                        }
                        identity={
                          <>
                            <h2 style={erTrackboardIdentityTitleStyle(layoutMode)}>
                              {fullPatientName(patient, dash)}
                            </h2>
                            <p style={erTrackboardIdentityLineStyle(layoutMode, { fontSize: 12, color: "#64748b" })}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.labelNirMrn")}</span>{" "}
                              {nirLine}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.ageSexLabel")}</span>{" "}
                              {formatPatientAgeSexLine(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null,
                                t
                              )}
                            </p>
                            <p style={erTrackboardIdentityLineStyle(layoutMode, { fontSize: 12, color: "#334155" })}>
                              <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>
                                {t("emergencyTrackboard.chiefComplaintShort")}
                              </span>
                              {" — "}
                              {cc}
                            </p>
                            <p style={erTrackboardIdentityLineStyle(layoutMode, { fontSize: 11, color: "#64748b" })}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.arrivalLabel")}</span>{" "}
                              {arrivalDisplay}
                            </p>
                          </>
                        }
                        right={
                          <>
                            {/*
                             * Phase 10A patch — operational status chips.
                             * Emergency Department type chip removed (page is the ER
                             * trackboard, the chip was redundant). LOS chip removed
                             * here as well: LOS now lives in its own tile next to
                             * Room (centerLeading).
                             */}
                            <div style={erTrackboardPrimaryBadgeRowStyle(layoutMode)}>
                              <span
                                title={dispositionBadge ? t("emergencyTrackboard.dispositionTooltip") : undefined}
                              >
                                <MedoraCardBadge compact={usesCompactCensus} soft={primaryStatusSoft}>{primaryStatusLabel}</MedoraCardBadge>
                              </span>
                              <EdBedStatusChip status={bedStatus} compact={usesCompactCensus} />
                              {sortieInfirmierOk ? (
                                <span title={t("emergencyTrackboard.sortieExecTooltip")}>
                                  <MedoraCardBadge compact={usesCompactCensus} soft={{ bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" }}>
                                    {t("emergencyTrackboard.executedBadge")}
                                  </MedoraCardBadge>
                                </span>
                              ) : null}
                              {showTransferPendingChip ? (
                                <span title={t("emergencyTrackboard.transferPendingTooltip")}>
                                  <MedoraCardBadge compact={usesCompactCensus} soft={{ bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }}>
                                    {t("emergencyTrackboard.disposition.transferPending")}
                                  </MedoraCardBadge>
                                </span>
                              ) : null}
                              <MedoraCardBadge compact={usesCompactCensus} soft={ACUITY_SOFT[acuity]}>{t(acuityLabelKey(acuity))}</MedoraCardBadge>
                              {facilityId ? (
                                <BillingClassificationBadgeInteractive
                                  encounterId={encounter.id}
                                  facilityId={facilityId}
                                  classification={(encounter as { billingClassification?: string }).billingClassification}
                                  encounterOpen={encounter.status === "OPEN"}
                                  canEdit={canChangeBillingClassification}
                                  onUpdated={loadEncounters}
                                />
                              ) : null}
                            </div>
                            <div
                              style={{
                                ...erTrackboardTouchActionGroupStyle(layoutMode),
                                alignItems: "center",
                              }}
                            >
                              <Link
                                href={emergencyChartPath(encounter.id)}
                                style={erTrackboardCensusActionButtonStyle(
                                  {
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #93c5fd",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                  },
                                  layoutMode
                                )}
                              >
                                {t("emergencyTrackboard.chartLink")}
                              </Link>
                              <Link
                                href={emergencyActiveWorkspacePath(encounter.id)}
                                style={erTrackboardCensusActionButtonStyle(
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
                                  onClick={() => void claimSelf(encounter.id, "provider")}
                                  disabled={assigningId === encounter.id || isPhysMine}
                                  title={
                                    isPhysMine
                                      ? t("emergencyTrackboard.assignProviderMine")
                                      : t("emergencyTrackboard.assignProviderMe")
                                  }
                                  style={erTrackboardCensusActionButtonStyle(
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
                                      cursor: assigningId === encounter.id || isPhysMine ? "default" : "pointer",
                                    },
                                    layoutMode
                                  )}
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
                                  disabled={assigningId === encounter.id || isNurseMine}
                                  title={
                                    isNurseMine
                                      ? t("emergencyTrackboard.assignNurseMine")
                                      : t("emergencyTrackboard.assignNurseMe")
                                  }
                                  style={erTrackboardCensusActionButtonStyle(
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
                                      cursor: assigningId === encounter.id || isNurseMine ? "default" : "pointer",
                                    },
                                    layoutMode
                                  )}
                                >
                                  {isNurseMine
                                    ? t("emergencyTrackboard.assignNurseMine")
                                    : assigningId === encounter.id
                                      ? t("emergencyTrackboard.assignSubmitting")
                                      : t("emergencyTrackboard.assignNurseMeShort")}
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
                      <div
                        role="region"
                        aria-label={t("emergencyTrackboard.ops.regionAria")}
                        style={erTrackboardOpsRegionStyle(layoutMode)}
                      >
                        {opsChips.map((c) =>
                          c.href ? (
                            <Link
                              key={c.key}
                              href={c.href}
                              aria-label={c.ariaLabel ?? c.text}
                              style={{ textDecoration: "none", display: "inline-flex" }}
                            >
                              <MedoraCardBadge compact={usesCompactCensus} soft={c.soft}>
                                {c.text}
                              </MedoraCardBadge>
                            </Link>
                          ) : (
                            <MedoraCardBadge key={c.key} compact={usesCompactCensus} soft={c.soft}>
                              {c.text}
                            </MedoraCardBadge>
                          )
                        )}
                      </div>
                    </div>
                  </MedoraCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {assignPickerBed ? (
        <BedBoardAssignEncounterPicker
          open
          bed={assignPickerBed}
          candidates={unassignedEdCandidates}
          onClose={() => setAssignPickerBed(null)}
          onSelect={(candidate) => {
            const encounter = emergencyOnly.find((row) => row.id === candidate.id);
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
      {facilityId && roomAssignmentLaunch ? (
        <RoomAssignmentModal
          open
          facilityId={facilityId}
          encounter={{
            id: roomAssignmentLaunch.encounter.id,
            roomLabel: roomAssignmentLaunch.encounter.roomLabel,
            type: roomAssignmentLaunch.encounter.type ?? "EMERGENCY",
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
