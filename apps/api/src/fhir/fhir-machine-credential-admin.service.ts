import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export type FhirCredentialAdminRow = {
  id: string;
  keyId: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
};

@Injectable()
export class FhirMachineCredentialAdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listCredentials(integrationId: string, clientId: string): Promise<FhirCredentialAdminRow[]> {
    await this.requireClient(integrationId, clientId);
    const rows = await this.prisma.$queryRaw<Array<Omit<FhirCredentialAdminRow, "status">>>(Prisma.sql`
      SELECT cr."id", cr."keyId", cr."createdAt", cr."expiresAt", cr."revokedAt", cr."lastUsedAt"
      FROM "interop"."IntegrationClientCredential" cr
      JOIN "interop"."IntegrationClient" c ON c."id" = cr."clientId"
      WHERE c."id" = ${clientId} AND c."integrationId" = ${integrationId}
      ORDER BY cr."createdAt" DESC
    `);
    const now = new Date();
    return rows.map((row) => ({
      ...row,
      status: row.revokedAt ? "REVOKED" : row.expiresAt && row.expiresAt <= now ? "EXPIRED" : "ACTIVE",
    }));
  }

  async revokeCredential(adminUserId: string, integrationId: string, clientId: string, credentialId: string) {
    const client = await this.requireClient(integrationId, clientId);
    const [credential] = await this.prisma.$queryRaw<Array<{ id: string; keyId: string; revokedAt: Date | null }>>(Prisma.sql`
      SELECT cr."id", cr."keyId", cr."revokedAt"
      FROM "interop"."IntegrationClientCredential" cr
      JOIN "interop"."IntegrationClient" c ON c."id" = cr."clientId"
      WHERE cr."id" = ${credentialId} AND c."id" = ${clientId} AND c."integrationId" = ${integrationId}
      LIMIT 1
    `);
    if (!credential) throw new NotFoundException("FHIR credential not found");
    if (credential.revokedAt) return { revoked: true, credentialId, keyId: credential.keyId, alreadyRevoked: true };

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClientCredential"
        SET "revokedAt" = ${now}, "revokedById" = ${adminUserId}
        WHERE "id" = ${credentialId} AND "clientId" = ${clientId} AND "revokedAt" IS NULL
      `);
      if (changed !== 1) throw new NotFoundException("FHIR credential not found or already revoked");
      await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", {
        tx,
        userId: adminUserId,
        facilityId: client.facilityId,
        entityId: clientId,
        critical: true,
        metadata: { event: "FHIR_M2M_CREDENTIAL_REVOKED", integrationId, credentialId, keyId: credential.keyId },
      });
    });
    return { revoked: true, credentialId, keyId: credential.keyId, alreadyRevoked: false };
  }

  async replaceScopes(adminUserId: string, integrationId: string, clientId: string, requestedScopes: string[]) {
    const scopes = [...new Set(requestedScopes)].sort();
    if (!scopes.length) throw new BadRequestException("Select at least one machine scope");

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Integration"
        WHERE "id" = ${integrationId}
        FOR UPDATE
      `);

      const [client] = await tx.$queryRaw<Array<{ id: string; facilityId: string; active: boolean; revokedAt: Date | null }>>(Prisma.sql`
        SELECT "id", "facilityId", "active", "revokedAt"
        FROM "interop"."IntegrationClient"
        WHERE "id" = ${clientId} AND "integrationId" = ${integrationId}
        LIMIT 1
      `);
      if (!client) throw new NotFoundException("FHIR client not found");
      if (!client.active || client.revokedAt) throw new BadRequestException("FHIR client is revoked or inactive");

      const integration = await tx.integration.findUnique({ where: { id: integrationId }, include: { permissions: true } });
      if (!integration) throw new NotFoundException("Integration not found");
      const allowed = new Set(integration.permissions.map((permission) => permission.capabilityCode));
      if (scopes.some((scope) => !allowed.has(scope))) throw new BadRequestException("Client scopes exceed integration permissions");

      await tx.$executeRaw(Prisma.sql`DELETE FROM "interop"."IntegrationClientScope" WHERE "clientId" = ${clientId}`);
      for (const scope of scopes) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "interop"."IntegrationClientScope" ("id", "clientId", "capabilityCode", "createdAt")
          VALUES (${randomUUID()}, ${clientId}, ${scope}, CURRENT_TIMESTAMP)
        `);
      }
      await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClient" SET "updatedById" = ${adminUserId}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${clientId}
      `);
      await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", {
        tx,
        userId: adminUserId,
        facilityId: client.facilityId,
        entityId: clientId,
        critical: true,
        metadata: { event: "FHIR_M2M_SCOPES_REPLACED", integrationId, scopeCount: scopes.length },
      });
      return { clientId, scopes };
    });
  }

  private async requireClient(integrationId: string, clientId: string) {
    const [client] = await this.prisma.$queryRaw<Array<{ id: string; facilityId: string; active: boolean; revokedAt: Date | null }>>(Prisma.sql`
      SELECT "id", "facilityId", "active", "revokedAt"
      FROM "interop"."IntegrationClient"
      WHERE "id" = ${clientId} AND "integrationId" = ${integrationId}
      LIMIT 1
    `);
    if (!client) throw new NotFoundException("FHIR client not found");
    return client;
  }
}
