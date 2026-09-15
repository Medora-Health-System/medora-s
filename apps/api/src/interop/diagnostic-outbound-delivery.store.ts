import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { DiagnosticExchangeDomain } from "./integration-event.contracts";
import type { DiagnosticOutboundDeliveryState } from "./diagnostic-outbound-order.contracts";

export type PersistedDiagnosticDelivery = {
  id: string;
  integrationId: string;
  facilityId: string;
  orderItemId: string;
  idempotencyKey: string;
  domain: DiagnosticExchangeDomain;
  state: DiagnosticOutboundDeliveryState;
  attemptCount: number;
  nextAttemptAt: Date | null;
  acknowledgedAt: Date | null;
};

@Injectable()
export class DiagnosticOutboundDeliveryStore {
  constructor(private readonly prisma: PrismaService) {}

  async prepare(input: {
    integrationId: string;
    facilityId: string;
    orderItemId: string;
    idempotencyKey: string;
    domain: DiagnosticExchangeDomain;
  }): Promise<PersistedDiagnosticDelivery> {
    const id = randomUUID();
    const rows = await this.prisma.$queryRaw<PersistedDiagnosticDelivery[]>(Prisma.sql`
      INSERT INTO "DiagnosticOutboundDelivery"
        ("id", "integrationId", "facilityId", "orderItemId", "idempotencyKey", "domain", "state", "attemptCount", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${input.integrationId}::uuid, ${input.facilityId}::uuid, ${input.orderItemId}::uuid,
         ${input.idempotencyKey}, ${input.domain}, 'prepared', 0, NOW(), NOW())
      ON CONFLICT ("integrationId", "facilityId", "orderItemId") DO UPDATE
        SET "updatedAt" = "DiagnosticOutboundDelivery"."updatedAt"
      RETURNING "id", "integrationId", "facilityId", "orderItemId", "idempotencyKey", "domain", "state",
                "attemptCount", "nextAttemptAt", "acknowledgedAt"
    `);
    const row = rows[0];
    if (!row) throw new Error("Failed to persist diagnostic delivery");
    if (row.idempotencyKey !== input.idempotencyKey) {
      throw new Error("Diagnostic delivery identity conflict");
    }
    return row;
  }

  async recordAttempt(input: {
    id: string;
    integrationId: string;
    facilityId: string;
    state: Exclude<DiagnosticOutboundDeliveryState, "prepared" | "acknowledged">;
    nextAttemptAt?: Date;
    partnerStatusCode?: number;
    failureClass?: string;
  }): Promise<boolean> {
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "DiagnosticOutboundDelivery"
      SET "state" = ${input.state},
          "attemptCount" = "attemptCount" + 1,
          "lastAttemptAt" = NOW(),
          "nextAttemptAt" = ${input.nextAttemptAt ?? null},
          "partnerStatusCode" = ${input.partnerStatusCode ?? null},
          "failureClass" = ${input.failureClass ?? null},
          "updatedAt" = NOW()
      WHERE "id" = ${input.id}::uuid
        AND "integrationId" = ${input.integrationId}::uuid
        AND "facilityId" = ${input.facilityId}::uuid
        AND "state" <> 'acknowledged'
        AND "attemptCount" < 5
    `);
    return updated === 1;
  }

  async acknowledge(input: {
    id: string;
    integrationId: string;
    facilityId: string;
    partnerStatusCode: number;
    partnerMessageId?: string;
  }): Promise<boolean> {
    if (input.partnerStatusCode < 200 || input.partnerStatusCode >= 300) return false;
    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "DiagnosticOutboundDelivery"
      SET "state" = 'acknowledged', "acknowledgedAt" = NOW(), "nextAttemptAt" = NULL,
          "partnerStatusCode" = ${input.partnerStatusCode},
          "partnerMessageId" = ${input.partnerMessageId ?? null}, "updatedAt" = NOW()
      WHERE "id" = ${input.id}::uuid
        AND "integrationId" = ${input.integrationId}::uuid
        AND "facilityId" = ${input.facilityId}::uuid
        AND "state" NOT IN ('acknowledged', 'dead_lettered', 'permanent_failure')
    `);
    return updated === 1;
  }
}
