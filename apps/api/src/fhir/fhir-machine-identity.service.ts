import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";

type ClientRow = {
  id: string;
  integrationId: string;
  facilityId: string;
  displayName: string;
  sourceSystemIdentifier: string | null;
  active: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuthRow = ClientRow & {
  integrationStatus: string;
  provisioningState: string;
  authorizationActive: boolean;
  credentialId: string;
  credentialKeyId: string;
  secretHash: string;
  credentialExpiresAt: Date | null;
  credentialRevokedAt: Date | null;
};

@Injectable()
export class FhirMachineIdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  connectionProfile() {
    const publicApiBase = (process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_BASE_URL || "https://api.medoras.com").replace(/\/$/, "");
    return {
      fhirBaseUrl: `${publicApiBase}/fhir`,
      tokenUrl: `${publicApiBase}/fhir/auth/token`,
      metadataUrl: `${publicApiBase}/fhir/metadata`,
      runtimeEnabled: (process.env.MEDORA_INTEROP_ENABLED ?? "false").trim().toLowerCase() === "true",
      authMethod: "client_credentials",
      credentialPolicy: "Client secrets are displayed once and stored by Medora only as Argon2id hashes.",
    };
  }

  async listClients(integrationId: string) {
    await this.requireIntegration(integrationId);
    return this.prisma.$queryRaw<Array<ClientRow & { scopes: string[]; credentialCount: number; lastUsedAt: Date | null }>>(Prisma.sql`
      SELECT c."id", c."integrationId", c."facilityId", c."displayName", c."sourceSystemIdentifier", c."active", c."revokedAt", c."createdAt", c."updatedAt",
        COALESCE(array_agg(DISTINCT s."capabilityCode") FILTER (WHERE s."capabilityCode" IS NOT NULL), ARRAY[]::text[]) AS "scopes",
        COUNT(DISTINCT cr."id")::int AS "credentialCount",
        MAX(cr."lastUsedAt") AS "lastUsedAt"
      FROM "interop"."IntegrationClient" c
      LEFT JOIN "interop"."IntegrationClientScope" s ON s."clientId" = c."id"
      LEFT JOIN "interop"."IntegrationClientCredential" cr ON cr."clientId" = c."id" AND cr."revokedAt" IS NULL
      WHERE c."integrationId" = ${integrationId}
      GROUP BY c."id"
      ORDER BY c."createdAt" ASC
    `);
  }

  async provisionClient(adminUserId: string, integrationId: string, input: { facilityId: string; displayName?: string; sourceSystemIdentifier?: string; scopes?: string[]; credentialExpiresAt?: string }) {
    const integration = await this.requireIntegration(integrationId);
    if (integration.protocol !== "FHIR_R4") throw new BadRequestException("FHIR machine clients require FHIR_R4 protocol");
    const authorization = integration.facilities.find((entry: any) => entry.facilityId === input.facilityId && entry.active && !entry.revokedAt);
    if (!authorization) throw new BadRequestException("Facility is not authorized for this integration");

    const available = new Set(integration.permissions.map((entry: any) => entry.capabilityCode));
    const requested = input.scopes?.length ? [...new Set(input.scopes)] : [...available];
    if (!requested.length || requested.some((scope) => !available.has(scope))) throw new BadRequestException("Client scopes exceed integration permissions");

    const expiresAt = input.credentialExpiresAt ? new Date(input.credentialExpiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date())) throw new BadRequestException("credentialExpiresAt must be a future timestamp");

    const clientId = randomUUID();
    const credentialId = randomUUID();
    const keyId = `mk_${randomBytes(12).toString("base64url")}`;
    const secret = randomBytes(32).toString("base64url");
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const displayName = (input.displayName?.trim() || `${integration.displayName} machine client`).slice(0, 160);
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "interop"."IntegrationClient" ("id", "integrationId", "facilityId", "displayName", "sourceSystemIdentifier", "active", "createdById", "updatedById", "createdAt", "updatedAt")
          VALUES (${clientId}, ${integrationId}, ${input.facilityId}, ${displayName}, ${input.sourceSystemIdentifier ?? integration.sourceSystemIdentifier ?? null}, true, ${adminUserId}, ${adminUserId}, ${now}, ${now})
        `);
        for (const scope of requested) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "interop"."IntegrationClientScope" ("id", "clientId", "capabilityCode", "createdAt")
            VALUES (${randomUUID()}, ${clientId}, ${scope}, ${now})
          `);
        }
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "interop"."IntegrationClientCredential" ("id", "clientId", "keyId", "secretHash", "createdById", "createdAt", "expiresAt")
          VALUES (${credentialId}, ${clientId}, ${keyId}, ${secretHash}, ${adminUserId}, ${now}, ${expiresAt})
        `);
        await tx.integration.update({ where: { id: integrationId }, data: { provisioningState: "PROVISIONED", status: integration.status === "DRAFT" ? "CONFIGURED" : integration.status, updatedById: adminUserId } });
        await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", {
          userId: adminUserId,
          facilityId: input.facilityId,
          entityId: clientId,
          critical: true,
          tx,
          metadata: { event: "FHIR_M2M_CLIENT_PROVISIONED", integrationId, keyId, scopeCount: requested.length },
        });
      });
    } catch (error: any) {
      if (String(error?.message ?? "").includes("IntegrationClient_integrationId_facilityId_key")) throw new ConflictException("A machine client already exists for this integration and facility");
      throw error;
    }

    return {
      clientId,
      facilityId: input.facilityId,
      keyId,
      clientSecret: secret,
      scopes: requested,
      expiresAt,
      ...this.connectionProfile(),
      secretDisplayPolicy: "This secret is returned once. Store it securely; Medora stores only an Argon2id hash.",
    };
  }

  async rotateCredential(adminUserId: string, integrationId: string, clientId: string, input: { expiresAt?: string } = {}) {
    const client = await this.requireClient(integrationId, clientId);
    if (!client.active || client.revokedAt) throw new BadRequestException("Machine client is revoked");
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date())) throw new BadRequestException("expiresAt must be a future timestamp");
    const id = randomUUID();
    const keyId = `mk_${randomBytes(12).toString("base64url")}`;
    const secret = randomBytes(32).toString("base64url");
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "interop"."IntegrationClientCredential" ("id", "clientId", "keyId", "secretHash", "createdById", "createdAt", "expiresAt")
        VALUES (${id}, ${clientId}, ${keyId}, ${secretHash}, ${adminUserId}, ${new Date()}, ${expiresAt})
      `);
      await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", { userId: adminUserId, entityId: clientId, critical: true, tx, metadata: { event: "FHIR_M2M_CREDENTIAL_ROTATED", integrationId, keyId } });
    });
    return { clientId, keyId, clientSecret: secret, expiresAt, ...this.connectionProfile(), overlapPolicy: "Existing unrevoked credentials remain valid until explicitly revoked or expired." };
  }

  async revokeClient(adminUserId: string, integrationId: string, clientId: string) {
    const client = await this.requireClient(integrationId, clientId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClient" SET "active" = false, "revokedAt" = COALESCE("revokedAt", ${now}), "revokedById" = COALESCE("revokedById", ${adminUserId}), "updatedById" = ${adminUserId}, "updatedAt" = ${now}
        WHERE "id" = ${clientId} AND "integrationId" = ${integrationId}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClientCredential" SET "revokedAt" = COALESCE("revokedAt", ${now}), "revokedById" = COALESCE("revokedById", ${adminUserId})
        WHERE "clientId" = ${clientId}
      `);
      await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", { userId: adminUserId, facilityId: client.facilityId, entityId: clientId, critical: true, tx, metadata: { event: "FHIR_M2M_CLIENT_REVOKED", integrationId } });
    });
    return { revoked: true, clientId };
  }

  async issueToken(input: { clientId: string; keyId: string; clientSecret: string; facilityId: string; scopes?: string[] }) {
    if (!input.clientId || !input.keyId || !input.clientSecret || !input.facilityId) throw new UnauthorizedException("Invalid client credentials");
    const [row] = await this.prisma.$queryRaw<AuthRow[]>(Prisma.sql`
      SELECT c."id", c."integrationId", c."facilityId", c."displayName", c."sourceSystemIdentifier", c."active", c."revokedAt", c."createdAt", c."updatedAt",
        i."status"::text AS "integrationStatus", i."provisioningState"::text AS "provisioningState",
        fa."active" AS "authorizationActive", cr."id" AS "credentialId", cr."keyId" AS "credentialKeyId", cr."secretHash",
        cr."expiresAt" AS "credentialExpiresAt", cr."revokedAt" AS "credentialRevokedAt"
      FROM "interop"."IntegrationClient" c
      JOIN "public"."Integration" i ON i."id" = c."integrationId"
      JOIN "public"."IntegrationFacilityAuthorization" fa ON fa."integrationId" = c."integrationId" AND fa."facilityId" = c."facilityId" AND fa."revokedAt" IS NULL
      JOIN "interop"."IntegrationClientCredential" cr ON cr."clientId" = c."id"
      WHERE c."id" = ${input.clientId} AND c."facilityId" = ${input.facilityId} AND cr."keyId" = ${input.keyId}
      LIMIT 1
    `);
    if (!row || !row.active || row.revokedAt || !row.authorizationActive || row.integrationStatus === "DISABLED" || row.provisioningState !== "PROVISIONED" || row.credentialRevokedAt || (row.credentialExpiresAt && row.credentialExpiresAt <= new Date())) throw new UnauthorizedException("Invalid client credentials");

    let validSecret = false;
    try { validSecret = await argon2.verify(row.secretHash, input.clientSecret); } catch { validSecret = false; }
    if (!validSecret) throw new UnauthorizedException("Invalid client credentials");

    const allowed = await this.effectiveScopes(row.id, row.integrationId);
    const requested = input.scopes?.length ? [...new Set(input.scopes)] : allowed;
    if (!requested.length || requested.some((scope) => !allowed.includes(scope))) throw new ForbiddenException("Requested scope is not authorized");

    const expiresIn = this.tokenTtlSeconds();
    const issuer = process.env.FHIR_M2M_ISSUER?.trim() || "medora-s";
    const audience = process.env.FHIR_M2M_AUDIENCE?.trim() || "medora-fhir";
    const accessToken = await this.jwt.signAsync({ tokenType: "fhir-m2m", clientId: row.id, integrationId: row.integrationId, facilityId: row.facilityId, scopes: requested, kid: row.credentialKeyId, jti: randomUUID() }, { secret: this.signingSecret(), issuer, audience, subject: row.id, expiresIn });

    await this.prisma.$executeRaw(Prisma.sql`UPDATE "interop"."IntegrationClientCredential" SET "lastUsedAt" = ${new Date()} WHERE "id" = ${row.credentialId}`);
    return { access_token: accessToken, token_type: "Bearer", expires_in: expiresIn, scope: requested.join(" ") };
  }

  private async effectiveScopes(clientId: string, integrationId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ capabilityCode: string }>>(Prisma.sql`
      SELECT cs."capabilityCode"
      FROM "interop"."IntegrationClientScope" cs
      INNER JOIN "public"."IntegrationPermission" p ON p."integrationId" = ${integrationId} AND p."capabilityCode" = cs."capabilityCode"
      WHERE cs."clientId" = ${clientId}
      ORDER BY cs."capabilityCode" ASC
    `);
    return rows.map((row) => row.capabilityCode);
  }

  private tokenTtlSeconds() {
    const parsed = Number(process.env.FHIR_M2M_ACCESS_TOKEN_TTL_SECONDS ?? 300);
    return Number.isInteger(parsed) && parsed >= 60 && parsed <= 900 ? parsed : 300;
  }

  private signingSecret() {
    const secret = process.env.FHIR_M2M_ACCESS_SECRET?.trim();
    if (!secret || secret.length < 32) throw new Error("FHIR_M2M_ACCESS_SECRET must contain at least 32 characters");
    return secret;
  }

  private async requireIntegration(id: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id }, include: { facilities: true, permissions: true } });
    if (!integration) throw new NotFoundException("Integration not found");
    return integration;
  }

  private async requireClient(integrationId: string, clientId: string) {
    const [row] = await this.prisma.$queryRaw<ClientRow[]>(Prisma.sql`SELECT * FROM "interop"."IntegrationClient" WHERE "id" = ${clientId} AND "integrationId" = ${integrationId} LIMIT 1`);
    if (!row) throw new NotFoundException("Machine client not found");
    return row;
  }
}
