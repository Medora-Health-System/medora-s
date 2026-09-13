import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export type FhirMachinePrincipal = {
  principalType: "fhir-client";
  clientId: string;
  integrationId: string;
  facilityId: string;
  credentialId: string;
  keyId: string;
  scopes: string[];
};

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

type CredentialRow = {
  id: string;
  clientId: string;
  keyId: string;
  secretHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
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

  async listClients(integrationId: string) {
    await this.requireIntegration(integrationId);
    const rows = await this.prisma.$queryRaw<Array<ClientRow & { scopes: string[]; credentialCount: number; lastUsedAt: Date | null }>>(Prisma.sql`
      SELECT c."id", c."integrationId", c."facilityId", c."displayName", c."sourceSystemIdentifier", c."active", c."revokedAt", c."createdAt", c."updatedAt",
        COALESCE(array_agg(DISTINCT s."capabilityCode") FILTER (WHERE s."capabilityCode" IS NOT NULL), ARRAY[]::text[]) AS "scopes",
        COUNT(DISTINCT cr."id")::int AS "credentialCount",
        MAX(cr."lastUsedAt") AS "lastUsedAt"
      FROM "IntegrationClient" c
      LEFT JOIN "IntegrationClientScope" s ON s."clientId" = c."id"
      LEFT JOIN "IntegrationClientCredential" cr ON cr."clientId" = c."id" AND cr."revokedAt" IS NULL
      WHERE c."integrationId" = ${integrationId}
      GROUP BY c."id"
      ORDER BY c."createdAt" ASC
    `);
    return rows;
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
    const displayName = (input.displayName?.trim() || `${integration.displayName} — ${input.facilityId}`).slice(0, 160);
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "IntegrationClient" ("id", "integrationId", "facilityId", "displayName", "sourceSystemIdentifier", "active", "createdById", "updatedById", "createdAt", "updatedAt")
          VALUES (${clientId}, ${integrationId}, ${input.facilityId}, ${displayName}, ${input.sourceSystemIdentifier ?? integration.sourceSystemIdentifier ?? null}, true, ${adminUserId}, ${adminUserId}, ${now}, ${now})
        `);
        for (const scope of requested) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "IntegrationClientScope" ("id", "clientId", "capabilityCode", "createdAt")
            VALUES (${randomUUID()}, ${clientId}, ${scope}, ${now})
          `);
        }
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "IntegrationClientCredential" ("id", "clientId", "keyId", "secretHash", "createdById", "createdAt", "expiresAt")
          VALUES (${credentialId}, ${clientId}, ${keyId}, ${secretHash}, ${adminUserId}, ${now}, ${expiresAt})
        `);
        await tx.integration.update({ where: { id: integrationId }, data: { provisioningState: "PROVISIONED", status: integration.status === "DRAFT" ? "CONFIGURED" : integration.status, updatedById: adminUserId } });
      });
    } catch (error: any) {
      if (String(error?.code ?? "") === "P2010" || String(error?.message ?? "").includes("IntegrationClient_integrationId_facilityId_key")) throw new ConflictException("A machine client already exists for this integration and facility");
      throw error;
    }

    await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", {
      userId: adminUserId,
      facilityId: input.facilityId,
      entityId: clientId,
      critical: true,
      metadata: { event: "FHIR_M2M_CLIENT_PROVISIONED", integrationId, keyId, scopeCount: requested.length },
    });

    return {
      clientId,
      facilityId: input.facilityId,
      keyId,
      clientSecret: secret,
      scopes: requested,
      expiresAt,
      secretDisplayPolicy: "This secret is returned once. Store it securely; Medora stores only an Argon2id hash.",
    };
  }

  async rotateCredential(adminUserId: string, integrationId: string, clientId: string, input: { expiresAt?: string } = {}) {
    await this.requireClient(integrationId, clientId);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date())) throw new BadRequestException("expiresAt must be a future timestamp");
    const id = randomUUID();
    const keyId = `mk_${randomBytes(12).toString("base64url")}`;
    const secret = randomBytes(32).toString("base64url");
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "IntegrationClientCredential" ("id", "clientId", "keyId", "secretHash", "createdById", "createdAt", "expiresAt")
      VALUES (${id}, ${clientId}, ${keyId}, ${secretHash}, ${adminUserId}, ${new Date()}, ${expiresAt})
    `);
    await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", { userId: adminUserId, entityId: clientId, critical: true, metadata: { event: "FHIR_M2M_CREDENTIAL_ROTATED", integrationId, keyId } });
    return { clientId, keyId, clientSecret: secret, expiresAt, overlapPolicy: "Existing unrevoked credentials remain valid until explicitly revoked or expired." };
  }

  async revokeCredential(adminUserId: string, integrationId: string, clientId: string, keyId: string) {
    await this.requireClient(integrationId, clientId);
    const changed = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "IntegrationClientCredential"
      SET "revokedAt" = COALESCE("revokedAt", ${new Date()}), "revokedById" = COALESCE("revokedById", ${adminUserId})
      WHERE "clientId" = ${clientId} AND "keyId" = ${keyId}
    `);
    if (!changed) throw new NotFoundException("Credential not found");
    await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", { userId: adminUserId, entityId: clientId, critical: true, metadata: { event: "FHIR_M2M_CREDENTIAL_REVOKED", integrationId, keyId } });
    return { revoked: true, clientId, keyId };
  }

  async revokeClient(adminUserId: string, integrationId: string, clientId: string) {
    const client = await this.requireClient(integrationId, clientId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "IntegrationClient" SET "active" = false, "revokedAt" = COALESCE("revokedAt", ${now}), "revokedById" = COALESCE("revokedById", ${adminUserId}), "updatedById" = ${adminUserId}, "updatedAt" = ${now}
        WHERE "id" = ${clientId} AND "integrationId" = ${integrationId}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "IntegrationClientCredential" SET "revokedAt" = COALESCE("revokedAt", ${now}), "revokedById" = COALESCE("revokedById", ${adminUserId})
        WHERE "clientId" = ${clientId}
      `);
    });
    await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", { userId: adminUserId, facilityId: client.facilityId, entityId: clientId, critical: true, metadata: { event: "FHIR_M2M_CLIENT_REVOKED", integrationId } });
    return { revoked: true, clientId };
  }

  async issueToken(input: { clientId: string; keyId: string; clientSecret: string; facilityId: string; scopes?: string[] }) {
    if (!input.clientId || !input.keyId || !input.clientSecret || !input.facilityId) throw new UnauthorizedException("Invalid client credentials");
    const [row] = await this.prisma.$queryRaw<AuthRow[]>(Prisma.sql`
      SELECT c."id", c."integrationId", c."facilityId", c."displayName", c."sourceSystemIdentifier", c."active", c."revokedAt", c."createdAt", c."updatedAt",
        i."status"::text AS "integrationStatus", i."provisioningState"::text AS "provisioningState",
        fa."active" AS "authorizationActive", cr."id" AS "credentialId", cr."keyId" AS "credentialKeyId", cr."secretHash",
        cr."expiresAt" AS "credentialExpiresAt", cr."revokedAt" AS "credentialRevokedAt"
      FROM "IntegrationClient" c
      JOIN "Integration" i ON i."id" = c."integrationId"
      JOIN "IntegrationFacilityAuthorization" fa ON fa."integrationId" = c."integrationId" AND fa."facilityId" = c."facilityId" AND fa."revokedAt" IS NULL
      JOIN "IntegrationClientCredential" cr ON cr."clientId" = c."id"
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

    const signingSecret = this.signingSecret();
    const expiresIn = this.tokenTtlSeconds();
    const issuer = process.env.FHIR_M2M_ISSUER?.trim() || "medora-s";
    const audience = process.env.FHIR_M2M_AUDIENCE?.trim() || "medora-fhir";
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync({
      tokenType: "fhir-m2m",
      clientId: row.id,
      integrationId: row.integrationId,
      facilityId: row.facilityId,
      scopes: requested,
      kid: row.credentialKeyId,
      jti,
    }, { secret: signingSecret, issuer, audience, subject: row.id, expiresIn });

    await this.prisma.$executeRaw(Prisma.sql`UPDATE "IntegrationClientCredential" SET "lastUsedAt" = ${new Date()} WHERE "id" = ${row.credentialId}`);
    await this.audit.log(AuditAction.VIEW, "FHIR_INTEGRATION_CLIENT", { facilityId: row.facilityId, entityId: row.id, metadata: { event: "FHIR_M2M_TOKEN_ISSUED", integrationId: row.integrationId, keyId: row.credentialKeyId, scopeCount: requested.length, jti } });
    return { access_token: accessToken, token_type: "Bearer", expires_in: expiresIn, scope: requested.join(" ") };
  }

  async resolveMachinePrincipal(payload: any): Promise<FhirMachinePrincipal> {
    if (!payload || payload.tokenType !== "fhir-m2m" || typeof payload.clientId !== "string" || typeof payload.integrationId !== "string" || typeof payload.facilityId !== "string" || typeof payload.kid !== "string" || !Array.isArray(payload.scopes)) throw new UnauthorizedException("Invalid machine token");
    const [row] = await this.prisma.$queryRaw<Array<{ clientId: string; integrationId: string; facilityId: string; active: boolean; revokedAt: Date | null; integrationStatus: string; provisioningState: string; authorizationActive: boolean; credentialId: string; credentialRevokedAt: Date | null; credentialExpiresAt: Date | null }>>(Prisma.sql`
      SELECT c."id" AS "clientId", c."integrationId", c."facilityId", c."active", c."revokedAt",
        i."status"::text AS "integrationStatus", i."provisioningState"::text AS "provisioningState",
        fa."active" AS "authorizationActive", cr."id" AS "credentialId", cr."revokedAt" AS "credentialRevokedAt", cr."expiresAt" AS "credentialExpiresAt"
      FROM "IntegrationClient" c
      JOIN "Integration" i ON i."id" = c."integrationId"
      JOIN "IntegrationFacilityAuthorization" fa ON fa."integrationId" = c."integrationId" AND fa."facilityId" = c."facilityId" AND fa."revokedAt" IS NULL
      JOIN "IntegrationClientCredential" cr ON cr."clientId" = c."id" AND cr."keyId" = ${payload.kid}
      WHERE c."id" = ${payload.clientId} AND c."integrationId" = ${payload.integrationId} AND c."facilityId" = ${payload.facilityId}
      LIMIT 1
    `);
    if (!row || !row.active || row.revokedAt || !row.authorizationActive || row.integrationStatus === "DISABLED" || row.provisioningState !== "PROVISIONED" || row.credentialRevokedAt || (row.credentialExpiresAt && row.credentialExpiresAt <= new Date())) throw new UnauthorizedException("Machine client revoked or inactive");
    const current = await this.effectiveScopes(row.clientId, row.integrationId);
    const scopes = payload.scopes.filter((scope: unknown): scope is string => typeof scope === "string" && current.includes(scope));
    if (!scopes.length) throw new ForbiddenException("Machine client has no active FHIR scopes");
    await this.consumeRateLimit(row.clientId, row.facilityId);
    return { principalType: "fhir-client", clientId: row.clientId, integrationId: row.integrationId, facilityId: row.facilityId, credentialId: row.credentialId, keyId: payload.kid, scopes };
  }

  async auditAccess(principal: FhirMachinePrincipal, resourceType: string, interaction: string, requestId?: string) {
    await this.audit.log(AuditAction.VIEW, "FHIR_INTEGRATION_ACCESS", {
      facilityId: principal.facilityId,
      entityId: principal.clientId,
      metadata: { integrationId: principal.integrationId, keyId: principal.keyId, resourceType, interaction, requestId: requestId || undefined },
    });
  }

  private async effectiveScopes(clientId: string, integrationId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ capabilityCode: string }>>(Prisma.sql`
      SELECT cs."capabilityCode"
      FROM "IntegrationClientScope" cs
      INNER JOIN "IntegrationPermission" p ON p."integrationId" = ${integrationId} AND p."capabilityCode" = cs."capabilityCode"
      WHERE cs."clientId" = ${clientId}
      ORDER BY cs."capabilityCode" ASC
    `);
    return rows.map((row) => row.capabilityCode);
  }

  private async consumeRateLimit(clientId: string, facilityId: string) {
    const limit = this.rateLimitPerMinute();
    const [bucket] = await this.prisma.$queryRaw<Array<{ requestCount: number }>>(Prisma.sql`
      INSERT INTO "FhirIntegrationRateLimitBucket" ("id", "clientId", "facilityId", "windowStart", "requestCount", "updatedAt")
      VALUES (${randomUUID()}, ${clientId}, ${facilityId}, date_trunc('minute', CURRENT_TIMESTAMP), 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("clientId", "facilityId", "windowStart") DO UPDATE
      SET "requestCount" = "FhirIntegrationRateLimitBucket"."requestCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "requestCount"
    `);
    if ((bucket?.requestCount ?? limit + 1) > limit) throw new HttpException("FHIR machine rate limit exceeded", 429);
  }

  private rateLimitPerMinute() {
    const parsed = Number(process.env.FHIR_M2M_RATE_LIMIT_PER_MINUTE ?? 120);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5000 ? parsed : 120;
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
    const [row] = await this.prisma.$queryRaw<ClientRow[]>(Prisma.sql`SELECT * FROM "IntegrationClient" WHERE "id" = ${clientId} AND "integrationId" = ${integrationId} LIMIT 1`);
    if (!row) throw new NotFoundException("Machine client not found");
    return row;
  }
}
