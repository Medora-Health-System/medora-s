"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { EncounterBedUnitCode } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { BedBoardGrid } from "@/components/encounters/BedBoardGrid";
import { BedBoardStatusFilterBar } from "@/components/encounters/BedBoardStatusFilterBar";
import {
  BedBoardAssignEncounterPicker,
  type BedBoardAssignCandidate,
} from "@/components/encounters/BedBoardAssignEncounterPicker";
import { RoomAssignmentModal } from "@/components/encounters/RoomAssignmentModal";
import {
  fetchFacilityBedBoard,
  type FacilityBedBoardBedRow,
  type FacilityBedBoardUnit,
} from "@/lib/bedBoardApi";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";
import {
  fetchHospitalisationEncounters,
} from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import { selectTreatmentBedAssignmentCandidates } from "@medora/shared";
import type { EncounterRoomUpdateResponse } from "@/lib/roomAssignmentApi";
import { canAssignEncounterRoom, resolveEncounterRoomUnit } from "@/lib/governedRoomDisplay";
import { canManageBedOperationalStatus } from "@/lib/bedBoardPermissions";
import { hospitalOccupantChartPath } from "./inpatientWorkspacePaths";
import { HOSPITAL_CARE_FLOOR_BOARD } from "@/features/hospital-care/hospitalCarePaths";

const BED_UNITS = new Set<string>(["ED", "OBS", "MS", "ICU"]);

export function resolveBedBoardUnitCode(unitCode: string | null | undefined): EncounterBedUnitCode | null {
  const c = String(unitCode ?? "")
    .trim()
    .toUpperCase();
  if (BED_UNITS.has(c)) return c as EncounterBedUnitCode;
  return null;
}

type Props = {
  facilityId: string | null;
  unitCode: string | null | undefined;
  title?: string;
};

/**
 * MEDUI.D4A.4.3 / D3E.6D — Unit-scoped visual bed board.
 * Same FacilityBedBoardService + BedBoardGrid/modal engine as ED Floor Board.
 * Not a second inventory or state machine.
 */
export function UnitBedBoard({ facilityId, unitCode, title }: Props) {
  const { t } = useI18n();
  const { roles } = useFacilityAndRoles();
  const bedUnit = resolveBedBoardUnitCode(unitCode);
  const [unitView, setUnitView] = useState<FacilityBedBoardUnit | null>(null);
  const [encounters, setEncounters] = useState<HospitalisationBoardEncounterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BedBoardStatusFilterId>("all");
  const [assignPickerBed, setAssignPickerBed] = useState<FacilityBedBoardBedRow | null>(null);
  const [roomAssignmentLaunch, setRoomAssignmentLaunch] = useState<{
    encounterId: string;
    roomLabel?: string | null;
    type?: string | null;
    admissionSummaryJson?: unknown;
    prefillFromBedBoard?: { room: string; unitCode: EncounterBedUnitCode };
  } | null>(null);

  const canAssignRoom = canAssignEncounterRoom(roles);
  const canManageBedStatus = canManageBedOperationalStatus(roles);

  const refreshBoard = useCallback(async () => {
    if (!facilityId || !bedUnit) {
      setUnitView(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [board, census] = await Promise.all([
        fetchFacilityBedBoard(facilityId, bedUnit),
        fetchHospitalisationEncounters(facilityId).catch(() => [] as HospitalisationBoardEncounterRow[]),
      ]);
      const unit = board.units.find((u) => u.unitCode === bedUnit) ?? null;
      setUnitView(unit);
      setEncounters(Array.isArray(census) ? census : []);
    } catch {
      setUnitView(null);
      setError(t("hospitalCareD3e6d.bedBoard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, bedUnit, t]);

  useEffect(() => {
    void refreshBoard();
  }, [refreshBoard]);

  const assignCandidates = useMemo((): BedBoardAssignCandidate[] => {
    if (!assignPickerBed || !facilityId) return [];
    return selectTreatmentBedAssignmentCandidates(encounters, {
      facilityId,
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
        label: [row.patient?.lastName, row.patient?.firstName].filter(Boolean).join(", ") || row.id,
        roomLabel: row.roomLabel,
        type: row.type ?? "INPATIENT",
        admissionSummaryJson: row.admissionSummaryJson,
      }));
  }, [assignPickerBed, facilityId, encounters]);

  const handleBedStatusUpdated = useCallback(
    (_bed: FacilityBedBoardBedRow) => {
      void refreshBoard();
    },
    [refreshBoard]
  );

  const handleChangeRoom = useCallback((bed: FacilityBedBoardBedRow) => {
    const encounterId = bed.occupantEncounterId;
    if (!encounterId) return;
    const enc = encounters.find((e) => e.id === encounterId);
    setRoomAssignmentLaunch({
      encounterId,
      roomLabel: enc?.roomLabel ?? bed.room,
      type: enc?.type ?? "INPATIENT",
      admissionSummaryJson: enc?.admissionSummaryJson,
    });
  }, [encounters]);

  const handleRoomSaved = useCallback(
    async (_patch: EncounterRoomUpdateResponse) => {
      setRoomAssignmentLaunch(null);
      await refreshBoard();
    },
    [refreshBoard]
  );

  const summary = useMemo(() => unitView?.summary ?? null, [unitView]);

  if (!bedUnit) {
    return (
      <section style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }} data-testid="unit-bed-board-unavailable">
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          {title ?? t("hospitalCareD3e6d.bedBoard.title")}
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("hospitalCareD3e6d.bedBoard.noPool")}
        </p>
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={linkStyle}>
          {t("hospitalCareD3e6b.bedManagement.open")}
        </Link>
      </section>
    );
  }

  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }}
      data-testid="unit-bed-board"
      data-unit={bedUnit}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {title ?? t("hospitalCareD3e6d.bedBoard.title")}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("hospitalCareD3e6d.bedBoard.subtitle").replace("{unit}", bedUnit)}
          </p>
        </div>
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={linkStyle}>
          {t("hospitalCareD3e6b.bedManagement.open")}
        </Link>
      </div>

      {summary ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
            fontSize: 12,
            color: "#334155",
          }}
          data-testid="unit-bed-board-summary"
        >
          <span>
            {summary.occupied} {t("hospitalCareD3e6b.tree.occupied")}
          </span>
          <span>·</span>
          <span>
            {summary.available} {t("hospitalCareD3e6b.tree.available")}
          </span>
          <span>·</span>
          <span>
            {summary.cleaning + summary.dirty} {t("hospitalCareD3e6d.bedBoard.cleaning")}
          </span>
          <span>·</span>
          <span>
            {summary.blocked} {t("hospitalCareD3e6d.bedBoard.blocked")}
          </span>
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        <BedBoardStatusFilterBar value={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : unitView ? (
        <div style={{ marginTop: 10 }} data-testid="unit-bed-board-grid">
          <BedBoardGrid
            unit={bedUnit}
            beds={unitView.beds as FacilityBedBoardBedRow[]}
            statusFilter={statusFilter}
            facilityId={facilityId}
            canAssignRoom={canAssignRoom}
            canManageBedStatus={canManageBedStatus}
            onAvailableBedClick={(bed) => setAssignPickerBed(bed)}
            onBedStatusUpdated={handleBedStatusUpdated}
            onChangeRoom={handleChangeRoom}
            encounterChartPath={(encounterId) =>
              hospitalOccupantChartPath({
                encounterId,
                unitCode: bedUnit,
              })
            }
          />
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("hospitalCareD3e6d.bedBoard.empty")}</p>
      )}

      {assignPickerBed ? (
        <BedBoardAssignEncounterPicker
          open
          bed={assignPickerBed}
          candidates={assignCandidates}
          onClose={() => setAssignPickerBed(null)}
          onSelect={(candidate) => {
            const encounter = encounters.find((row) => row.id === candidate.id);
            if (!encounter || !assignPickerBed) return;
            setRoomAssignmentLaunch({
              encounterId: encounter.id,
              roomLabel: encounter.roomLabel,
              type: encounter.type ?? "INPATIENT",
              admissionSummaryJson: encounter.admissionSummaryJson,
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
            id: roomAssignmentLaunch.encounterId,
            roomLabel: roomAssignmentLaunch.roomLabel,
            type: roomAssignmentLaunch.type ?? "INPATIENT",
            admissionSummaryJson: roomAssignmentLaunch.admissionSummaryJson as never,
          }}
          prefillFromBedBoard={Boolean(roomAssignmentLaunch.prefillFromBedBoard)}
          initialRoom={roomAssignmentLaunch.prefillFromBedBoard?.room ?? null}
          initialUnitCode={roomAssignmentLaunch.prefillFromBedBoard?.unitCode ?? null}
          onClose={() => setRoomAssignmentLaunch(null)}
          onSaved={handleRoomSaved}
        />
      ) : null}
    </section>
  );
}

const linkStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#2563eb",
  textDecoration: "none",
  alignSelf: "flex-start",
};
