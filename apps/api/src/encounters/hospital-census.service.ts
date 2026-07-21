/**
 * D3E.6A — Server-owned canonical hospital census.
 * Facility always from JWT. Clinical identity via resolveClinicalEncounterContext.
 */

import { Injectable } from "@nestjs/common";
import {
  buildHospitalCensusV1,
  type HospitalCensusV1,
  type HospitalOperationalSnapshotV1,
} from "@medora/shared";
import { InternalPlacementService } from "./internal-placement.service";
import { TrackboardService } from "../trackboard/trackboard.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";

@Injectable()
export class HospitalCensusService {
  constructor(
    private readonly placement: InternalPlacementService,
    private readonly trackboard: TrackboardService,
    private readonly bedBoard: FacilityBedBoardService
  ) {}

  async getHospitalCensus(
    facilityId: string,
    options?: { snapshotScope?: HospitalOperationalSnapshotV1["scope"] }
  ): Promise<HospitalCensusV1> {
    const fid = String(facilityId ?? "").trim();

    const [activeEncounters, queue, bedView] = await Promise.all([
      this.trackboard.getActiveEncounters(fid, "OPEN", "INPATIENT"),
      this.placement.listFacilityQueue(fid, { strict: false }),
      this.bedBoard.getBedBoard(fid).catch(() => null),
    ]);

    const encounters = activeEncounters.map((e) => ({
      id: e.id,
      facilityId: e.facilityId,
      type: e.type,
      status: e.status,
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
      observationOps: e.observationOps ?? null,
      trackboardOps: e.trackboardOps
        ? {
            resultsPendingCount: e.trackboardOps.resultsPendingCount,
            criticalResultUnacknowledged: e.trackboardOps.criticalResultUnacknowledged,
          }
        : null,
    }));

    let bedSummary: {
      total: number;
      available: number;
      occupied: number;
      cleaning: number;
      blocked: number;
    } | null = null;
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
      }
      bedSummary = {
        total: available + occupied + cleaning + blocked,
        available,
        occupied,
        cleaning,
        blocked,
      };
    }

    return buildHospitalCensusV1({
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
    });
  }
}
