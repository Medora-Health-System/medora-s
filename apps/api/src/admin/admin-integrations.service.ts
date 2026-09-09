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
  async facilityOptions(userId: string) {
    await this.authorize(userId);
    return this.prisma.facility.findMany({
      where: { isActive: true }, orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, country: true, billingCity: true, billingStateProvince: true },
    });
  }
  async list(userId: string) { await this.authorize(userId); const rows = await this.prisma.integration.findMany({ include: { facilities: { where: { active: true }, select: { facilityId: true } }, permissions: { select: { capabilityCode: true } } }, orderBy: { updatedAt: "desc" } }); return rows.map((row) => this.safeResponse(row)); }
  async get(userId: string, id: string) { await this.authorize(userId); const row = await this.prisma.integration.findUnique({ where: { id }, include: { facilities: true, permissions: true } }); if (!row) throw new NotFoundException("Integration not found"); return this.safeResponse(row); }
  async create(userId: string, input: any) {
    await this.authorize(userId); this.validatePermissions(input.protocol, input.permissionCodes); await this.validateFacilities(input.facilityIds);
    const { facilityIds, permissionCodes, ...details } = input;
    const technical = input.technicalContactSameAsPrimary ? { technicalContactName: `${input.primaryContactFirstName} ${input.primaryContactLastName}`, technicalContactJobTitle: input.primaryContactJobTitle, technicalContactEmail: input.primaryContactEmail, technicalContactPhone: input.primaryContactPhone, technicalContactExtension: input.primaryContactExtension } : {};
    const row = await this.prisma.integration.create({ data: { ...details, ...technical, createdById: userId, updatedById: userId, facilities: { create: facilityIds.map((facilityId: string) => ({ facilityId, authorizedById: userId })) }, permissions: { create: permissionCodes.map((capabilityCode: string) => ({ capabilityCode })) } }, include: { facilities: true, permissions: true } });
    await this.event(userId, row.id, INTEGRATION_AUDIT_EVENTS.CREATED, { facilityCount: facilityIds.length, permissionCount: permissionCodes.length, protocol: input.protocol });
    await Promise.all([...facilityIds.map((facilityId: string) => this.event(userId, row.id, INTEGRATION_AUDIT_EVENTS.FACILITY_GRANTED, { facilityId })), ...permissionCodes.map((capabilityCode: string) => this.event(userId, row.id, INTEGRATION_AUDIT_EVENTS.PERMISSION_GRANTED, { capabilityCode }))]);
    return this.safeResponse(row);
  }
  async update(userId: string, id: string, input: any) {
    await this.authorize(userId); const current = await this.get(userId, id); const protocol = current.protocol; if (input.permissionCodes) this.validatePermissions(protocol, input.permissionCodes); if (input.facilityIds) await this.validateFacilities(input.facilityIds);
    const scalar = { ...input }; delete scalar.facilityIds; delete scalar.permissionCodes;
    const previousFacilities = new Set(current.facilities.filter((x: any) => x.active !== false).map((x: any) => x.facilityId)); const previousPermissions = new Set(current.permissions.map((x: any) => x.capabilityCode));
    const row = await this.prisma.$transaction(async (tx) => { if (input.facilityIds) { await tx.integrationFacilityAuthorization.deleteMany({ where: { integrationId: id } }); await tx.integrationFacilityAuthorization.createMany({ data: input.facilityIds.map((facilityId: string) => ({ integrationId: id, facilityId, authorizedById: userId })) }); } if (input.permissionCodes) { await tx.integrationPermission.deleteMany({ where: { integrationId: id } }); await tx.integrationPermission.createMany({ data: input.permissionCodes.map((capabilityCode: string) => ({ integrationId: id, capabilityCode })) }); } return tx.integration.update({ where: { id }, data: { ...scalar, updatedById: userId }, include: { facilities: true, permissions: true } }); });
    const nextFacilities = new Set(row.facilities.filter((x: any) => x.active !== false).map((x: any) => x.facilityId)); const nextPermissions = new Set(row.permissions.map((x: any) => x.capabilityCode));
    await Promise.all([
      ...[...nextFacilities].filter((x) => !previousFacilities.has(x)).map((facilityId) => this.event(userId, id, INTEGRATION_AUDIT_EVENTS.FACILITY_GRANTED, { facilityId })),
      ...[...previousFacilities].filter((x) => !nextFacilities.has(x)).map((facilityId) => this.event(userId, id, INTEGRATION_AUDIT_EVENTS.FACILITY_REVOKED, { facilityId })),
      ...[...nextPermissions].filter((x) => !previousPermissions.has(x)).map((capabilityCode) => this.event(userId, id, INTEGRATION_AUDIT_EVENTS.PERMISSION_GRANTED, { capabilityCode })),
      ...[...previousPermissions].filter((x) => !nextPermissions.has(x)).map((capabilityCode) => this.event(userId, id, INTEGRATION_AUDIT_EVENTS.PERMISSION_REVOKED, { capabilityCode })),
    ]);
    await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.UPDATED, { changedFields: Object.keys(input).filter((x) => !x.toLowerCase().includes("contact") && x !== "endpointConfig") }); return this.safeResponse(row);
  }
  async setEnabled(userId: string, id: string, enabled: boolean) { await this.authorize(userId); await this.get(userId, id); const row = await this.prisma.integration.update({ where: { id }, data: { status: enabled ? IntegrationStatus.CONFIGURED : IntegrationStatus.DISABLED, disabledAt: enabled ? null : new Date(), disabledById: enabled ? null : userId, updatedById: userId } }); await this.event(userId, id, enabled ? INTEGRATION_AUDIT_EVENTS.ENABLED : INTEGRATION_AUDIT_EVENTS.DISABLED, {}); return this.safeResponse(row); }
  private validatePermissions(protocol: string, codes: string[]) { if (protocol === "FHIR_R4" && !codes.length) throw new BadRequestException({ fieldErrors: { permissionCodes: ["Select at least one FHIR permission"] } }); if (protocol !== "FHIR_R4" && codes.length) throw new BadRequestException("Protocol permissions unavailable"); try { this.capabilities.assertPermissionCodes(codes); } catch { throw new BadRequestException({ fieldErrors: { permissionCodes: ["Permission exceeds enabled server capabilities"] } }); } }
  private async validateFacilities(ids: string[]) { if (!ids.length) throw new BadRequestException({ fieldErrors: { facilityIds: ["Select at least one authorized facility"] } }); if (new Set(ids).size !== ids.length) throw new BadRequestException("Duplicate facility authorization"); const count = await this.prisma.facility.count({ where: { id: { in: ids }, isActive: true } }); if (count !== ids.length) throw new BadRequestException({ fieldErrors: { facilityIds: ["One or more facilities are not authorized or active"] } }); }
  private event(userId: string, id: string, event: string, metadata: object) { return this.audit.log(AuditAction.UPDATE, "INTEGRATION", { userId, entityId: id, critical: true, metadata: { event, ...metadata } }); }
  private safeResponse<T extends Record<string, any>>(row: T): T {
    const raw = row.endpointConfig;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...row, endpointConfig: null };
    const allowed = ["baseUrl", "tokenUrl", "authMethod", "publicKeyReference", "scopes"];
    return { ...row, endpointConfig: Object.fromEntries(allowed.filter((key) => Object.prototype.hasOwnProperty.call(raw, key)).map((key) => [key, raw[key]])) };
  }
}
