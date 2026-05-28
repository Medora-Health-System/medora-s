import { Injectable, NotFoundException } from "@nestjs/common";
import type { FacilityBillingWorkflowPatchDto } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  facilityBillingWorkflowSelect,
  facilityWorkflowConfigFromRow,
  facilityWorkflowPatchData,
} from "./facility-billing-workflow.util";

@Injectable()
export class FacilityBillingWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getForFacility(facilityId: string) {
    const row = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: {
        id: true,
        name: true,
        ...facilityBillingWorkflowSelect,
      },
    });
    if (!row) throw new NotFoundException("Facility not found");
    const config = facilityWorkflowConfigFromRow(row);
    return {
      facilityId: row.id,
      facilityName: row.name,
      ...config,
    };
  }

  async updateForFacility(facilityId: string, dto: FacilityBillingWorkflowPatchDto) {
    const row = await this.prisma.facility.findFirst({ where: { id: facilityId }, select: { id: true } });
    if (!row) throw new NotFoundException("Facility not found");
    const updated = await this.prisma.facility.update({
      where: { id: facilityId },
      data: facilityWorkflowPatchData(dto),
      select: {
        id: true,
        name: true,
        ...facilityBillingWorkflowSelect,
      },
    });
    const config = facilityWorkflowConfigFromRow(updated);
    return {
      facilityId: updated.id,
      facilityName: updated.name,
      ...config,
    };
  }
}
