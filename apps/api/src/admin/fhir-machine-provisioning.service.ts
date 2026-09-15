import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { AuditService } from "../common/services/audit.service";
import { FhirMachineIdentityService } from "../fhir/fhir-machine-identity.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminIntegrationsService } from "./admin-integrations.service";

type ProvisionInput = {
  facilityId: string;
  displayName?: string;
  sourceSystemIdentifier?: string;
  scopes?: string[];
  credentialExpiresAt?: string;
};

type ExistingClient = {
  id: string;
  active: boolean;
  revokedAt: Date | null;
};

@Injectable()
export class FhirMachineProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: AdminIntegrationsService,
    private readonly machines: FhirMachineIdentityService,
    private readonly audit: AuditService,
  ) {}

  async provision(adminUserId: string, integrationId: string, input: ProvisionInput) {
    const [existing] = await this.prisma.$queryRaw<ExistingClient[]>(Prisma.sql`
      SELECT "id", "active", "revokedAt"
      FROM "interop"."IntegrationClient"
      WHERE "integrationId" = ${integrationId}
        AND "facilityId" = ${input.facilityId}
      LIMIT 1
    `);

    if (!existing) return this.machines.provisionClient(adminUserId, integrationId, input);

    if (existing.active || !existing.revokedAt) {
      throw new ConflictException(
        "A FHIR client already exists for this integration and facility. Rotate its credential instead of generating another client.",
      );
    }

    const integration = await this.integrations.get(adminUserId, integrationId) as any;
    if (integration.protocol !== "FHIR_R4") throw new BadRequestException("FHIR machine clients require FHIR R4");

    const facilityGrant = integration.facilities?.find(
      (entry: any) => entry.facilityId === input.facilityId && entry.active !== false && !entry.revokedAt,
    );
    if (!facilityGrant) throw new BadRequestException("Facility is not authorized for this integration");

    const allowed = new Set<string>((integration.permissions ?? []).map((entry: any) => entry.capabilityCode));
    const scopes = input.scopes?.length ? [...new Set(input.scopes)] : [...allowed];
    if (!scopes.length || scopes.some((scope) => !allowed.has(scope))) {
      throw new BadRequestException("Client scopes exceed integration permissions");
    }

    const expiresAt = input.credentialExpiresAt ? new Date(input.credentialExpiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date())) {
      throw new BadRequestException("Credential expiry must be in the future");
    }

    const credentialId = randomUUID();
    const keyId = `mk_${randomBytes(12).toString("base64url")}`;
    const clientSecret = randomBytes(32).toString("base64url");
    const secretHash = await argon2.hash(clientSecret, { type: argon2.argon2id });
    const displayName = (input.displayName?.trim() || `${integration.displayName} FHIR client`).slice(0, 160);
    const sourceSystemIdentifier = input.sourceSystemIdentifier ?? integration.sourceSystemIdentifier ?? null;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const reactivated = await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClient"
        SET "displayName" = ${displayName},
            "sourceSystemIdentifier" = ${sourceSystemIdentifier},
            "active" = true,
            "revokedAt" = NULL,
            "revokedById" = NULL,
            "updatedById" = ${adminUserId},
            "updatedAt" = ${now}
        WHERE "id" = ${existing.id}
          AND "integrationId" = ${integrationId}
          AND "facilityId" = ${input.facilityId}
          AND "active" = false
          AND "revokedAt" IS NOT NULL
      `);
      if (reactivated !== 1) {
        throw new ConflictException("FHIR client state changed while credentials were being generated. Refresh and retry.");
      }

      // Defense in depth: all credentials from the revoked lifecycle stay unusable.
      await tx.$executeRaw(Prisma.sql`
        UPDATE "interop"."IntegrationClientCredential"
        SET "revokedAt" = COALESCE("revokedAt", ${now}),
            "revokedById" = COALESCE("revokedById", ${adminUserId})
        WHERE "clientId" = ${existing.id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "interop"."IntegrationClientScope"
        WHERE "clientId" = ${existing.id}
      `);
      for (const scope of scopes) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "interop"."IntegrationClientScope" ("id", "clientId", "capabilityCode", "createdAt")
          VALUES (${randomUUID()}, ${existing.id}, ${scope}, ${now})
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "interop"."IntegrationClientCredential"
          ("id", "clientId", "keyId", "secretHash", "createdById", "createdAt", "expiresAt")
        VALUES (${credentialId}, ${existing.id}, ${keyId}, ${secretHash}, ${adminUserId}, ${now}, ${expiresAt})
      `);

      await tx.integration.update({
        where: { id: integrationId },
        data: {
          provisioningState: "PROVISIONED",
          status: integration.status === "DRAFT" ? "CONFIGURED" : integration.status,
          updatedById: adminUserId,
        },
      });

      await this.audit.log(AuditAction.UPDATE, "FHIR_INTEGRATION_CLIENT", {
        tx,
        userId: adminUserId,
        facilityId: input.facilityId,
        entityId: existing.id,
        critical: true,
        metadata: {
          event: "FHIR_M2M_CLIENT_REPROVISIONED",
          integrationId,
          keyId,
          scopeCount: scopes.length,
        },
      });
    });

    return {
      clientId: existing.id,
      facilityId: input.facilityId,
      keyId,
      clientSecret,
      scopes,
      expiresAt,
      ...this.machines.connectionInfo(),
      secretDisplayPolicy: "This secret is shown once. Copy it now and transfer it to the partner through a secure channel.",
    };
  }
}
