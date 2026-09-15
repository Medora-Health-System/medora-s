-- Phase 3B: durable, facility-scoped outbound diagnostic delivery state.
-- Raw FHIR payloads are intentionally not stored in this operational table.
CREATE TABLE "DiagnosticOutboundDelivery" (
  "id" UUID NOT NULL,
  "integrationId" UUID NOT NULL,
  "facilityId" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(96) NOT NULL,
  "domain" VARCHAR(16) NOT NULL,
  "state" VARCHAR(32) NOT NULL DEFAULT 'prepared',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "partnerStatusCode" INTEGER,
  "partnerMessageId" VARCHAR(255),
  "failureClass" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticOutboundDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticOutboundDelivery_attemptCount_check" CHECK ("attemptCount" >= 0 AND "attemptCount" <= 5),
  CONSTRAINT "DiagnosticOutboundDelivery_state_check" CHECK ("state" IN ('prepared','dispatched','acknowledged','retryable_failure','dead_lettered','permanent_failure')),
  CONSTRAINT "DiagnosticOutboundDelivery_domain_check" CHECK ("domain" IN ('LAB','RADIOLOGY')),
  CONSTRAINT "DiagnosticOutboundDelivery_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOutboundDelivery_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOutboundDelivery_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DiagnosticOutboundDelivery_idempotencyKey_key" ON "DiagnosticOutboundDelivery"("idempotencyKey");
CREATE UNIQUE INDEX "DiagnosticOutboundDelivery_integration_facility_order_key" ON "DiagnosticOutboundDelivery"("integrationId", "facilityId", "orderItemId");
CREATE INDEX "DiagnosticOutboundDelivery_retry_idx" ON "DiagnosticOutboundDelivery"("state", "nextAttemptAt");
CREATE INDEX "DiagnosticOutboundDelivery_integration_facility_idx" ON "DiagnosticOutboundDelivery"("integrationId", "facilityId", "createdAt");
