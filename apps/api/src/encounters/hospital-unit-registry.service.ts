/**
 * D3E.6B — Facility-scoped clinical unit registry.
 * JWT facility only. Loads when placement workflow is OFF.
 */

import { Injectable } from "@nestjs/common";
import {
  buildHospitalUnitRegistryV1,
  hospitalCareActivationFlagsFromProcessEnv,
  isDevelopmentRuntime,
  type ComposedFacilityBedBoard,
  type HospitalUnitRegistryV1,
} from "@medora/shared";
import { HospitalCensusService } from "./hospital-census.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";

@Injectable()
export class HospitalUnitRegistryService {
  constructor(
    private readonly census: HospitalCensusService,
    private readonly bedBoard: FacilityBedBoardService
  ) {}

  async getUnitRegistry(facilityId: string): Promise<HospitalUnitRegistryV1> {
    const fid = String(facilityId ?? "").trim();
    const env = hospitalCareActivationFlagsFromProcessEnv();
    const includeDevelopmentFixtures = isDevelopmentRuntime(env);

    const [census, bedView] = await Promise.all([
      this.census.getHospitalCensus(fid, { snapshotScope: "ALL_HOSPITAL_CARE" }),
      this.bedBoard.getBedBoard(fid).catch(() => null),
    ]);

    const composed: ComposedFacilityBedBoard | null = bedView?.units?.length
      ? {
          facilityId: fid,
          generatedAt: String(bedView.generatedAt ?? new Date().toISOString()),
          units: bedView.units.map((u) => ({
            unitCode: u.unitCode,
            beds: (u.beds ?? []).map((b) => ({
              bedKey: b.bedKey,
              display: b.display ?? b.bedKey,
              room: b.room,
              unitCode: u.unitCode,
              status: b.status,
              statusSource: (b.statusSource ?? "derived") as "derived" | "operational",
              occupantEncounterId: b.occupantEncounterId ?? null,
              occupantPatientName: b.occupantPatientName ?? null,
              occupantMrn: b.occupantMrn ?? null,
              reasonCode: b.reasonCode ?? null,
              reasonText: b.reasonText ?? null,
              updatedAt: b.updatedAt ?? null,
            })),
          })),
        }
      : null;

    return buildHospitalUnitRegistryV1({
      facilityId: fid,
      placementAvailability: census.placementAvailability,
      patients: census.allHospitalPatients,
      bedBoard: composed,
      includeDevelopmentFixtures,
    });
  }
}
