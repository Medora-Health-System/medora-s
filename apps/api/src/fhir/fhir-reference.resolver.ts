import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FHIR_RESOURCE_TYPES, parseLogicalId } from "./fhir-protocol";

export type AdministrativeResourceType = Exclude<(typeof FHIR_RESOURCE_TYPES)[number], "Observation">;
export function fhirReference(type: AdministrativeResourceType, id: string) {
  if (!FHIR_RESOURCE_TYPES.includes(type)) throw new BadRequestException("Unsupported reference type");
  return { reference: `${type}/${parseLogicalId(id)}` };
}

@Injectable()
export class FhirReferenceResolver {
  constructor(private readonly prisma: PrismaService) {}

  reference(type: AdministrativeResourceType, id: string) {
    return fhirReference(type, id);
  }

  /** Resolve existence and tenant ownership before emitting or following a reference. */
  async assertVisible(type: AdministrativeResourceType, id: string, facilityId: string): Promise<void> {
    const validId = parseLogicalId(id);
    const found = type === "Patient" ? await this.prisma.patient.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "Encounter" ? await this.prisma.encounter.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "Organization" ? await this.prisma.facility.findFirst({ where: { id: validId === facilityId ? validId : "__not_visible__" }, select: { id: true } })
      : type === "Location" ? await this.prisma.department.findFirst({ where: { id: validId, facilityId }, select: { id: true } })
      : type === "PractitionerRole" ? await this.prisma.userRole.findFirst({ where: { id: validId, facilityId, isActive: true }, select: { id: true } })
      : await this.prisma.userRole.findFirst({ where: { userId: validId, facilityId, isActive: true }, select: { id: true } });
    if (!found) throw new NotFoundException(`${type} not found`);
  }
}
