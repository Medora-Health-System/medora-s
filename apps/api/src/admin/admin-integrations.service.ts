import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AuditAction, IntegrationStatus, Prisma } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { PrismaService } from "../prisma/prisma.service";
import { INTEGRATION_AUDIT_EVENTS } from "./integration-audit-events";

export const INTEGRATION_CONTROL_PLANE_NOT_READY = "INTEGRATION_CONTROL_PLANE_NOT_READY" as const;

@Injectable()
export class AdminIntegrationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly capabilities: FhirCapabilityRegistry) {}

  async authorize(userId: string) {
    if (!(await resolvePlatformAuthority(this.prisma, userId)).granted) throw new ForbiddenException("Platform integration administration required");
  }

  permissions() { return this.capabilities.permissionOptions(); }

  async facilityOptions(userId: string) {
    await this.authorize(userId);
    return this.prisma.facility.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, country: true, billingCity: true, billingStateProvince: true },
    });
  }

  async list(userId: string) {
    await this.authorize(userId);
    return this.controlPlane(async () => {
      const rows = await this.prisma.integration.findMany({
        include: {
          facilities: { where: { active: true }, select: { facilityId: true } },
          permissions: { select: { capabilityCode: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((row) => this.safeResponse(row));
    });
  }

  async get(userId: string, id: string) {
    await this.authorize(userId);
    return this.controlPlane(async () => {
      const row = await this.prisma.integration.findUnique({ where: { id }, include: { facilities: true, permissions: true } });
      if (!row) throw new NotFoundException("Integration not found");
      return this.safeResponse(row);
    });
  }

  async create(userId: string, input: any) {
    await this.authorize(userId);
    this.validatePermissions(input.protocol, input.permissionCodes);
    await this.validateFacilities(input.facilityIds);

    const { facilityIds, permissionCodes, ...details } = input;
    const technical = input.technicalContactSameAsPrimary
      ? {
          technicalContactName: `${input.primaryContactFirstName} ${input.primaryContactLastName}`,
          technicalContactJobTitle: input.primaryContactJobTitle,
          technicalContactEmail: input.primaryContactEmail,
          technicalContactPhone: input.primaryContactPhone,
          technicalContactExtension: input.primaryContactExtension,
        }
      : {};

    return this.controlPlane(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.integration.create({
          data: {
            ...details,
            ...technical,
            createdById: userId,
            updatedById: userId,
            facilities: { create: facilityIds.map((facilityId: string) => ({ facilityId, authorizedById: userId })) },
            permissions: { create: permissionCodes.map((capabilityCode: string) => ({ capabilityCode })) },
          },
          include: { facilities: true, permissions: true },
        });

        await this.event(userId, created.id, INTEGRATION_AUDIT_EVENTS.CREATED, {
          facilityCount: facilityIds.length,
          permissionCount: permissionCodes.length,
          protocol: input.protocol,
        }, tx);
        for (const facilityId of facilityIds as string[]) {
          await this.event(userId, created.id, INTEGRATION_AUDIT_EVENTS.FACILITY_GRANTED, { facilityId }, tx);
        }
        for (const capabilityCode of permissionCodes as string[]) {
          await this.event(userId, created.id, INTEGRATION_AUDIT_EVENTS.PERMISSION_GRANTED, { capabilityCode }, tx);
        }
        return created;
      });
      return this.safeResponse(row);
    });
  }

  async update(userId: string, id: string, input: any) {
    await this.authorize(userId);
    const current = await this.get(userId, id);
    const protocol = current.protocol;
    if (input.permissionCodes) this.validatePermissions(protocol, input.permissionCodes);
    if (input.facilityIds) await this.validateFacilities(input.facilityIds);

    const scalar = { ...input };
    delete scalar.facilityIds;
    delete scalar.permissionCodes;

    const effectiveSameAsPrimary = input.technicalContactSameAsPrimary ?? current.technicalContactSameAsPrimary;
    if (effectiveSameAsPrimary) {
      const firstName = input.primaryContactFirstName ?? current.primaryContactFirstName;
      const lastName = input.primaryContactLastName ?? current.primaryContactLastName;
      scalar.technicalContactName = [firstName, lastName].filter(Boolean).join(" ");
      scalar.technicalContactJobTitle = input.primaryContactJobTitle ?? current.primaryContactJobTitle;
      scalar.technicalContactEmail = input.primaryContactEmail ?? current.primaryContactEmail;
      scalar.technicalContactPhone = input.primaryContactPhone ?? current.primaryContactPhone;
      scalar.technicalContactExtension = input.primaryContactExtension ?? current.primaryContactExtension;
    }

    const previousFacilities = new Set<string>(current.facilities.filter((x: any) => x.active !== false).map((x: any) => x.facilityId));
    const previousPermissions = new Set<string>(current.permissions.map((x: any) => x.capabilityCode));

    return this.controlPlane(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        if (input.facilityIds) {
          await tx.integrationFacilityAuthorization.deleteMany({ where: { integrationId: id } });
          await tx.integrationFacilityAuthorization.createMany({ data: input.facilityIds.map((facilityId: string) => ({ integrationId: id, facilityId, authorizedById: userId })) });
        }
        if (input.permissionCodes) {
          await tx.integrationPermission.deleteMany({ where: { integrationId: id } });
          await tx.integrationPermission.createMany({ data: input.permissionCodes.map((capabilityCode: string) => ({ integrationId: id, capabilityCode })) });
        }

        const updated = await tx.integration.update({
          where: { id },
          data: { ...scalar, updatedById: userId },
          include: { facilities: true, permissions: true },
        });

        const nextFacilities = new Set<string>(updated.facilities.filter((x: any) => x.active !== false).map((x: any) => x.facilityId));
        const nextPermissions = new Set<string>(updated.permissions.map((x: any) => x.capabilityCode));

        for (const facilityId of [...nextFacilities].filter((value) => !previousFacilities.has(value))) {
          await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.FACILITY_GRANTED, { facilityId }, tx);
        }
        for (const facilityId of [...previousFacilities].filter((value) => !nextFacilities.has(value))) {
          await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.FACILITY_REVOKED, { facilityId }, tx);
        }
        for (const capabilityCode of [...nextPermissions].filter((value) => !previousPermissions.has(value))) {
          await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.PERMISSION_GRANTED, { capabilityCode }, tx);
        }
        for (const capabilityCode of [...previousPermissions].filter((value) => !nextPermissions.has(value))) {
          await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.PERMISSION_REVOKED, { capabilityCode }, tx);
        }
        await this.event(userId, id, INTEGRATION_AUDIT_EVENTS.UPDATED, {
          changedFields: Object.keys(input).filter((x) => !x.toLowerCase().includes("contact") && x !== "endpointConfig"),
        }, tx);
        return updated;
      });
      return this.safeResponse(row);
    });
  }

  async setEnabled(userId: string, id: string, enabled: boolean) {
    await this.authorize(userId);
    await this.get(userId, id);
    return this.controlPlane(async () => {
      const row = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.integration.update({
          where: { id },
          data: {
            status: enabled ? IntegrationStatus.CONFIGURED : IntegrationStatus.DISABLED,
            disabledAt: enabled ? null : new Date(),
            disabledById: enabled ? null : userId,
            updatedById: userId,
          },
        });
        await this.event(userId, id, enabled ? INTEGRATION_AUDIT_EVENTS.ENABLED : INTEGRATION_AUDIT_EVENTS.DISABLED, {}, tx);
        return updated;
      });
      return this.safeResponse(row);
    });
  }

  private validatePermissions(protocol: string, codes: string[]) {
    if (protocol === "FHIR_R4" && !codes.length) throw new BadRequestException({ fieldErrors: { permissionCodes: ["Select at least one FHIR permission"] } });
    if (protocol !== "FHIR_R4" && codes.length) throw new BadRequestException("Protocol permissions unavailable");
    try {
      this.capabilities.assertPermissionCodes(codes);
    } catch {
      throw new BadRequestException({ fieldErrors: { permissionCodes: ["Permission exceeds enabled server capabilities"] } });
    }
  }

  private async validateFacilities(ids: string[]) {
    if (!ids.length) throw new BadRequestException({ fieldErrors: { facilityIds: ["Select at least one authorized facility"] } });
    if (new Set(ids).size !== ids.length) throw new BadRequestException("Duplicate facility authorization");
    const count = await this.prisma.facility.count({ where: { id: { in: ids }, isActive: true } });
    if (count !== ids.length) throw new BadRequestException({ fieldErrors: { facilityIds: ["One or more facilities are not authorized or active"] } });
  }

  private event(userId: string, id: string, event: string, metadata: object, tx?: Prisma.TransactionClient) {
    return this.audit.log(AuditAction.UPDATE, "INTEGRATION", {
      userId,
      entityId: id,
      critical: true,
      tx,
      metadata: { event, ...metadata },
    });
  }

  private async controlPlane<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
      if (code === "P2021" || code === "P2022") {
        throw new ServiceUnavailableException({
          code: INTEGRATION_CONTROL_PLANE_NOT_READY,
          message: "Integration database schema is not ready. Apply pending Prisma migrations and retry.",
        });
      }
      throw error;
    }
  }

  private safeResponse<T extends Record<string, any>>(row: T): T {
    const raw = row.endpointConfig;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...row, endpointConfig: null };
    const allowed = ["baseUrl", "tokenUrl", "authMethod", "publicKeyReference", "scopes"];
    return {
      ...row,
      endpointConfig: Object.fromEntries(allowed.filter((key) => Object.prototype.hasOwnProperty.call(raw, key)).map((key) => [key, raw[key]])),
    };
  }
}
