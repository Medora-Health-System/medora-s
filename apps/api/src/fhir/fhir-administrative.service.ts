import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FhirReferenceResolver } from "./fhir-reference.resolver";
import { FhirSearchService, searchBundle } from "./fhir-search";
import { parseFhirReference } from "./fhir-protocol";

const CLINICAL_ROLES: RoleCode[] = [RoleCode.RN, RoleCode.PROVIDER];

@Injectable()
export class FhirAdministrativeService {
  constructor(private readonly prisma: PrismaService, private readonly refs: FhirReferenceResolver, private readonly search: FhirSearchService) {}

  async read(type: string, id: string, facilityId: string) {
    await this.refs.assertVisible(type as never, id, facilityId);
    const resource = (await this.rows(type, facilityId, { _id: id }, 1))[0];
    if (!resource) throw new NotFoundException(`${type} not found`);
    return resource;
  }

  async find(type: string, facilityId: string, query: Record<string, unknown>) {
    const allowed = type === "Practitioner" ? ["_id", "identifier", "family", "given", "name", "_count", "_cursor"] : type === "PractitionerRole" ? ["_id", "practitioner", "organization", "_count", "_cursor"] : type === "Organization" ? ["_id", "identifier", "name", "_count", "_cursor"] : ["_id", "identifier", "name", "organization", "status", "_count", "_cursor"];
    const parsed = this.search.parse(query, allowed);
    const rows = await this.rows(type, facilityId, parsed.values, parsed.count + 1, parsed.cursor);
    return searchBundle(this.search.baseUrl(), type, query, rows.slice(0, parsed.count), rows.length > parsed.count);
  }

  private async rows(type: string, facilityId: string, v: Record<string, string>, take: number, cursor?: string): Promise<Array<{ resourceType: string; id: string; [key: string]: unknown }>> {
    if (type === "Organization") {
      const rows = await this.prisma.facility.findMany({ where: { id: v._id && v._id !== facilityId ? "__not_visible__" : facilityId, ...(v.identifier ? { code: v.identifier.split("|").at(-1) } : {}), ...(v.name ? { name: { startsWith: v.name, mode: "insensitive" } } : {}), ...(cursor ? { AND: { id: { gt: cursor } } } : {}) }, orderBy: { id: "asc" }, take });
      return rows.map((f) => ({ resourceType: "Organization", id: f.id, active: f.isActive, identifier: [{ system: "https://medora.app/fhir/identifier/facility-code", value: f.code }], name: f.name, address: f.billingAddressLine1 || f.billingCity || f.billingCountry ? [{ line: f.billingAddressLine1 ? [f.billingAddressLine1] : undefined, city: f.billingCity ?? undefined, country: f.billingCountry ?? undefined }] : undefined }));
    }
    if (type === "Location") {
      const requestedOrganization = v.organization ? parseFhirReference(v.organization, "Organization").id : undefined;
      const rows = await this.prisma.department.findMany({ where: { facilityId: requestedOrganization && requestedOrganization !== facilityId ? "__not_visible__" : facilityId, ...(v._id ? { id: v._id } : {}), ...(v.identifier ? { code: v.identifier.split("|").at(-1) as never } : {}), ...(v.name ? { name: { startsWith: v.name, mode: "insensitive" } } : {}), ...(v.status ? { isActive: v.status === "active" } : {}), ...(cursor ? { AND: { id: { gt: cursor } } } : {}) }, orderBy: { id: "asc" }, take });
      return rows.map((d) => ({ resourceType: "Location", id: d.id, status: d.isActive ? "active" : "inactive", name: d.name, identifier: [{ system: "https://medora.app/fhir/identifier/department-code", value: d.code }], mode: "instance", managingOrganization: this.refs.reference("Organization", d.facilityId) }));
    }
    if (type === "PractitionerRole") {
      const requestedOrganization = v.organization ? parseFhirReference(v.organization, "Organization").id : undefined;
      const practitionerId = v.practitioner ? parseFhirReference(v.practitioner, "Practitioner").id : undefined;
      const rows = await this.prisma.userRole.findMany({ where: { facilityId: requestedOrganization && requestedOrganization !== facilityId ? "__not_visible__" : facilityId, isActive: true, role: { code: { in: CLINICAL_ROLES } }, ...(v._id ? { id: v._id } : {}), ...(practitionerId ? { userId: practitionerId } : {}), ...(cursor ? { AND: { id: { gt: cursor } } } : {}) }, include: { role: true }, orderBy: { id: "asc" }, take });
      return rows.map((r) => ({ resourceType: "PractitionerRole", id: r.id, active: r.isActive, practitioner: this.refs.reference("Practitioner", r.userId), organization: this.refs.reference("Organization", r.facilityId) }));
    }
    const rows = await this.prisma.user.findMany({ where: { isActive: true, userRoles: { some: { facilityId, isActive: true, role: { code: { in: CLINICAL_ROLES } } } }, ...(v._id ? { id: v._id } : {}), ...(v.identifier ? { billingNpi: v.identifier.split("|").at(-1) } : {}), ...(v.family ? { lastName: { startsWith: v.family, mode: "insensitive" } } : {}), ...(v.given ? { firstName: { startsWith: v.given, mode: "insensitive" } } : {}), ...(v.name ? { OR: [{ firstName: { startsWith: v.name, mode: "insensitive" } }, { lastName: { startsWith: v.name, mode: "insensitive" } }] } : {}), ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take });
    return rows.map((u) => ({ resourceType: "Practitioner", id: u.id, active: u.isActive, name: [{ family: u.lastName, given: [u.firstName] }], identifier: u.billingNpi ? [{ system: "http://hl7.org/fhir/sid/us-npi", value: u.billingNpi }] : undefined }));
  }
}
