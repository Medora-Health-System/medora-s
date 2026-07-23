/**
 * D3E.6A / D4A.2.8-HF1 — Server-owned canonical hospital census.
 * Facility always from JWT. Encounter-authoritative via compatibility-aware repo.
 * Missing optional Encounter.hospitalEpisodeId must never empty the census.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  buildHospitalCensusV1,
  type HospitalCensusV1,
  type HospitalOperationalSnapshotV1,
} from "@medora/shared";
import { InternalPlacementService } from "./internal-placement.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";
import { SchemaCompatibleEncounterRepository } from "./schema-compatible-encounter.repository";
import { HospitalEncounterAuthorityService } from "./hospital-encounter-authority.service";

@Injectable()
export class HospitalCensusService {
  private readonly logger = new Logger(HospitalCensusService.name);

  constructor(
    private readonly placement: InternalPlacementService,
    private readonly bedBoard: FacilityBedBoardService,
    private readonly encounters: SchemaCompatibleEncounterRepository,
    private readonly encounterAuthority: HospitalEncounterAuthorityService
  ) {}

  async getHospitalCensus(
    facilityId: string,
    options?: { snapshotScope?: HospitalOperationalSnapshotV1["scope"] }
  ): Promise<HospitalCensusV1> {
    const fid = String(facilityId ?? "").trim();

    // Placement is optional operational overlay — never let it empty clinical census.
    const [activeEncounters, queue, bedView] = await Promise.all([
      this.encounters.findOpenHospitalEncountersForCensus(fid),
      this.placement.listFacilityQueue(fid, { strict: false }),
      this.bedBoard.getBedBoard(fid).catch((err: unknown) => {
        this.logger.warn(
          `bed_board_unavailable_for_census facilityId=${fid} err=${
            err instanceof Error ? err.name : typeof err
          }`
        );
        return null;
      }),
    ]);

    const encounters = activeEncounters.map((e) => ({
      id: e.id,
      facilityId: e.facilityId,
      type: String(e.type),
      status: String(e.status),
      billingClassification: e.billingClassification ?? null,
      admissionSummaryJson: e.admissionSummaryJson,
      admittedAt: e.admittedAt ?? null,
      createdAt: e.createdAt ?? null,
      roomLabel: e.roomLabel ?? null,
      chiefComplaint: e.chiefComplaint ?? null,
      physicianAssignedUserId: e.physicianAssignedUserId ?? null,
      nurseAssignedUserId: e.nurseAssignedUserId ?? null,
      patient: e.patient
        ? {
            id: e.patient.id,
            firstName: e.patient.firstName,
            lastName: e.patient.lastName,
            mrn: e.patient.mrn,
            dob: e.patient.dob,
            sexAtBirth: e.patient.sexAtBirth,
          }
        : null,
      physicianAssigned: e.physicianAssigned
        ? {
            firstName: e.physicianAssigned.firstName,
            lastName: e.physicianAssigned.lastName,
          }
        : null,
      nurseAssigned: e.nurseAssigned
        ? {
            firstName: e.nurseAssigned.firstName,
            lastName: e.nurseAssigned.lastName,
          }
        : null,
      observationOps: null,
      trackboardOps: null,
    }));

    const censusEncounterIds = new Set(encounters.map((e) => e.id));

    let bedSummary: {
      total: number;
      available: number;
      occupied: number;
      cleaning: number;
      blocked: number;
    } | null = null;
    const occupiedBedKeysWithoutEncounter: string[] = [];

    if (bedView?.units?.length) {
      let available = 0;
      let occupied = 0;
      let cleaning = 0;
      let blocked = 0;
      for (const unit of bedView.units) {
        available += unit.summary.available ?? 0;
        occupied += unit.summary.occupied ?? 0;
        cleaning += unit.summary.cleaning ?? 0;
        blocked += unit.summary.blocked ?? 0;
        for (const bed of unit.beds ?? []) {
          const isOccupied =
            String(bed.status ?? "").toUpperCase() === "OCCUPIED" ||
            Boolean(bed.occupantEncounterId) ||
            Boolean(bed.occupantPatientName);
          if (!isOccupied) continue;
          const occupantId = String(bed.occupantEncounterId ?? "").trim();
          if (!occupantId || !censusEncounterIds.has(occupantId)) {
            occupiedBedKeysWithoutEncounter.push(String(bed.bedKey ?? bed.display ?? ""));
          }
        }
      }
      bedSummary = {
        total: available + occupied + cleaning + blocked,
        available,
        occupied,
        cleaning,
        blocked,
      };
    }

    const census = buildHospitalCensusV1({
      facilityId: fid,
      placementAvailability: queue.availability,
      encounters,
      placements: queue.items.map((item) => ({
        id: item.id,
        status: item.status,
        requestedEncounterType: item.requestedEncounterType,
        arrivedDestinationAt: item.arrivedDestinationAt ?? null,
        receivingEncounterId: item.receivingEncounterId ?? null,
        assignedBedKey: item.assignedBedKey ?? null,
        requestedAt: item.requestedAt ?? null,
        createdAt: item.createdAt,
        patient: item.patient,
      })),
      bedSummary,
      snapshotScope: options?.snapshotScope ?? "ALL_HOSPITAL_CARE",
      occupiedBedKeysWithoutEncounter: occupiedBedKeysWithoutEncounter.filter(Boolean),
    });

    if (occupiedBedKeysWithoutEncounter.length > 0) {
      this.logger.warn(
        JSON.stringify({
          event: "hospital_census_reconciliation_warning",
          facilityId: fid,
          code: "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER",
          bedKeys: occupiedBedKeysWithoutEncounter.filter(Boolean),
          authorityCertification: this.encounterAuthority.certification(),
        })
      );
    }

    return census;
  }
}
