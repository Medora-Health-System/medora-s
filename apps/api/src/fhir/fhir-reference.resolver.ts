import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { FHIR_RESOURCE_TYPES, parseLogicalId } from "./fhir-protocol";

export type FhirReferenceType = (typeof FHIR_RESOURCE_TYPES)[number];
export function fhirReference(type: FhirReferenceType, id: string) {
  if (!FHIR_RESOURCE_TYPES.includes(type)) throw new BadRequestException("Unsupported reference type");
  return { reference: `${type}/${parseLogicalId(id)}` };
}

@Injectable()
export class FhirReferenceResolver {
  constructor(private readonly prisma: PrismaService) {}

  reference(type: FhirReferenceType, id: string) {
    return fhirReference(type, id);
  }

  /** Resolve existence and tenant ownership before emitting or following a reference. */
  async assertVisible(type: FhirReferenceType, id: string, facilityId: string): Promise<void> {
    const validId = parseLogicalId(id);
    const found = type === "Patient" ? await this.prisma.patient.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "Encounter" ? await this.prisma.encounter.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "Condition" ? await this.prisma.diagnosis.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "ServiceRequest" ? await this.prisma.orderItem.findFirst({ where: { id: validId, order: { facilityId }, catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] } }, select: { id: true } })
      : type === "DiagnosticReport" ? await this.prisma.result.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "CarePlan" ? await this.prisma.encounterCarePlan.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "Organization" ? await this.prisma.facility.findFirst({ where: { id: validId === facilityId ? validId : "__not_visible__" }, select: { id: true } })
      : type === "Location" ? await this.prisma.department.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "PractitionerRole" ? await this.prisma.userRole.findFirst({ where: { id: validId, facilityId, isActive: true, role: { code: { in: [RoleCode.RN, RoleCode.PROVIDER] } } }, select: { id: true } })
      : await this.prisma.userRole.findFirst({ where: { userId: validId, facilityId, isActive: true, role: { code: { in: [RoleCode.RN, RoleCode.PROVIDER] } } }, select: { id: true } });
    if (!found) throw new NotFoundException(`${type} not found`);
  }
}
