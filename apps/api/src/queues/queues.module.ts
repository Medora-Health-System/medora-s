import { Module } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { ClaimBuilderService } from "../billing/claim-builder.service";
import { ClaimExportService } from "../billing/claim-export.service";
import { X12837GeneratorService } from "../billing/x12-837-generator.service";
import { ClaimControlNumberService } from "../billing/claim-control-number.service";
import { X12EnvelopeBuilderService } from "../billing/x12-envelope-builder.service";
import { ClaimSubmissionService } from "../billing/claim-submission.service";
import { ClaimTransmissionService } from "../billing/claim-transmission.service";
import { ClaimAcknowledgmentService } from "../billing/claim-acknowledgment.service";
import { ClearinghouseTransportFactory } from "../billing/clearinghouse-transport.factory";
import { AckSftpPollerService } from "../billing/ack-sftp-poller.service";
import { ClearinghouseAckWebhookController } from "../billing/clearinghouse-ack-webhook.controller";
import { ClearinghouseAckWebhookGuard } from "../billing/clearinghouse-ack-webhook.guard";
import { ClearinghouseOpsService } from "../billing/clearinghouse-ops.service";
import { ClaimRetryWorkerService } from "../billing/claim-retry-worker.service";
import { BillingIdentityService } from "../billing/billing-identity.service";
import { BillingIdentityController } from "../billing/billing-identity.controller";
import { BillingController } from "../billing/billing.controller";
import { BillingService } from "../billing/billing.service";
import { ExternalBillingExportService } from "../billing/external-billing-export.service";
import { ExternalBillingAutomationService } from "../billing/external-billing-automation.service";
import { ClearinghouseStabilizationService } from "../billing/clearinghouse-stabilization.service";
import { ClaimOperationalEventService } from "../billing/claim-operational-event.service";
import { ClaimClearinghouseObservabilityService } from "../billing/claim-clearinghouse-observability.service";

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController, ClearinghouseAckWebhookController, BillingIdentityController, BillingController],
  providers: [
    QueuesService,
    AuditService,
    BillingService,
    ExternalBillingExportService,
    ExternalBillingAutomationService,
    ClaimBuilderService,
    ClaimExportService,
    X12837GeneratorService,
    ClaimControlNumberService,
    X12EnvelopeBuilderService,
    ClaimOperationalEventService,
    ClaimClearinghouseObservabilityService,
    ClearinghouseStabilizationService,
    ClaimSubmissionService,
    ClearinghouseTransportFactory,
    ClaimTransmissionService,
    ClaimRetryWorkerService,
    ClaimAcknowledgmentService,
    AckSftpPollerService,
    ClearinghouseOpsService,
    BillingIdentityService,
    ClearinghouseAckWebhookGuard,
  ],
  exports: [QueuesService, BillingIdentityService, BillingService],
})
export class QueuesModule {}

