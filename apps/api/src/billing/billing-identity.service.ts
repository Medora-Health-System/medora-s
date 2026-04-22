import { Injectable, NotFoundException } from "@nestjs/common";
import type { FacilityBillingIdentityPatchDto } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

const facilityBillingSelect = {
  id: true,
  name: true,
  code: true,
  billingLegalName: true,
  billingNpi: true,
  taxIdEin: true,
  billingAddressLine1: true,
  billingAddressLine2: true,
  billingCity: true,
  billingStateProvince: true,
  billingPostalCode: true,
  billingCountry: true,
  billingFacilityTypeLabel: true,
} as const;

@Injectable()
export class BillingIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async getFacilityBillingIdentity(facilityId: string) {
    const row = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: facilityBillingSelect,
    });
    if (!row) throw new NotFoundException("Facility not found");
    return row;
  }

  async updateFacilityBillingIdentity(facilityId: string, dto: FacilityBillingIdentityPatchDto) {
    const row = await this.prisma.facility.findFirst({ where: { id: facilityId }, select: { id: true } });
    if (!row) throw new NotFoundException("Facility not found");
    return this.prisma.facility.update({
      where: { id: facilityId },
      data: {
        billingLegalName: dto.billingLegalName,
        billingNpi: dto.billingNpi,
        taxIdEin: dto.taxIdEin,
        billingAddressLine1: dto.billingAddressLine1,
        billingAddressLine2: dto.billingAddressLine2,
        billingCity: dto.billingCity,
        billingStateProvince: dto.billingStateProvince,
        billingPostalCode: dto.billingPostalCode,
        billingCountry: dto.billingCountry,
        billingFacilityTypeLabel: dto.billingFacilityTypeLabel,
      },
      select: facilityBillingSelect,
    });
  }
}
