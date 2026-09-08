import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, IntegrationStatus } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { PrismaService } from "../prisma/prisma.service";
import { INTEGRATION_AUDIT_EVENTS } from "./integration-audit-events";

@Injectable()
export class AdminIntegrationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly capabilities: FhirCapabilityRegistry) {}
  async authorize(userId: string) { if (!(await resolvePlatformAuthority(this.prisma, userId)).granted) throw new ForbiddenException("Platform integration administration required"); }
  permissions() { return this.capabilities.permissionOptions(); }
  async list(userId: string) { await this.authorize(userId); return this.prisma.integration.findMany({ include: { facilities: { where: { active: true }, select: { facilityId: true } }, permissions: { select: { capabilityCode: true } } }, orderBy: { updatedAt: "desc" } }); }
  async get(userId: string, id: string) { await this.authorize(userId); const row = await this.prisma.integration.findUnique({ where: { id }, include: { facilities: true, permissions: true } }); if (!row) throw new NotFoundException("Integration not found"); return row; }
  async create(userId: string, input: any) {
    await this.authorize(userId); this.validatePermissions(input.protocol, input.permissionCodes); await this.validateFacilities(input.facilityIds);
    const row = await this.prisma.integration.create({ data: { displayName: input.displayName, partnerName: input.partnerName, organizationType: input.organizationType, protocol: input.protocol, direction: input.direction, environment: input.environment, jurisdiction: input.jurisdiction, sourceSystemIdentifier: input.sourceSystemIdentifier, technicalContactName: input.technicalContactName, technicalContactEmail: input.technicalContactEmail, technicalContactPhone: input.technicalContactPhone, endpointConfig: input.endpointConfig, createdById: userId, updatedById: userId, facilities: { create: input.facilityIds.map((facilityId: string) => ({ facilityId, authorizedById: userId })) }, permissions: { create: input.permissionCodes.map((capabilityCode: string) => ({ capabilityCode })) } }, include: { facilities: true, permissions: true } });
    await this.event(userId, row.id, INTEGRATION_AUDIT_EVENTS.CREATED, { facilityCount: input.facilityIds.length, permissionCount: input.permissionCodes.length, protocol: input.protocol }); return row;
  }
  async update(userId: string, id: string, input: any) {
    await this.authorize(userId); const current = await this.get(userId, id); const protocol = current.protocol; if (input.permissionCodes) this.validatePermissions(protocol, input.permissionCodes); if (input.facilityIds) await this.validateFacilities(input.facilityIds);
    const scalar = { ...input }; delete scalar.facilityIds; delete scalar.permissionCodes;
    const row = await this.prisma.$transaction(async (tx) => { if (input.facilityIds) { await tx.integrationFacilityAuthorization.deleteMany({ where: { integrationId: id } }); await tx.integrationFacilityAuthorization.createMany({ data: input.facilityIds.map((facilityId: string) => ({ integrationId: id, facilityId, authorizedById: userId })) }); } if (input.permissionCodes) { await tx.integrationPermission.deleteMany({ where: { integrationId: id } }); await tx.integrationPermission.createMany({ data: input.permissionCodes.map((capabilityCode: string) => ({ integrationId: id, capabilityCode })) }); } return tx.integration.update({ where: { id }, data: { ...scalar, updatedById: userId }, include: { facilities: true, permissions: true } }); });
    await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.UPDATED, { changedFields: Object.keys(input).filter((x) => !x.toLowerCase().includes("contact")) }); return row;
  }
  async setEnabled(userId: string, id: string, enabled: boolean) { await this.authorize(userId); await this.get(userId, id); const row = await this.prisma.integration.update({ where: { id }, data: { status: enabled ? IntegrationStatus.CONFIGURED : IntegrationStatus.DISABLED, disabledAt: enabled ? null : new Date(), disabledById: enabled ? null : userId, updatedById: userId } }); await this.event(userId, id, enabled ? INTEGRATION_AUDIT_EVENTS.ENABLED : INTEGRATION_AUDIT_EVENTS.DISABLED, {}); return row; }
  private validatePermissions(protocol: string, codes: string[]) { if (protocol !== "FHIR_R4" && codes.length) throw new BadRequestException("Protocol permissions unavailable"); try { this.capabilities.assertPermissionCodes(codes); } catch { throw new BadRequestException("Permission exceeds enabled server capabilities"); } }
  private async validateFacilities(ids: string[]) { if (new Set(ids).size !== ids.length) throw new BadRequestException("Duplicate facility authorization"); const count = await this.prisma.facility.count({ where: { id: { in: ids }, isActive: true } }); if (count !== ids.length) throw new BadRequestException("Unknown or inactive facility"); }
  private event(userId: string, id: string, event: string, metadata: object) { return this.audit.log(AuditAction.UPDATE, "INTEGRATION", { userId, entityId: id, critical: true, metadata: { event, ...metadata } }); }
}
