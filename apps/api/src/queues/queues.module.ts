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

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController, ClearinghouseAckWebhookController],
  providers: [
    QueuesService,
    AuditService,
    ClaimBuilderService,
    ClaimExportService,
    X12837GeneratorService,
    ClaimControlNumberService,
    X12EnvelopeBuilderService,
    ClaimSubmissionService,
    ClearinghouseTransportFactory,
    ClaimTransmissionService,
    ClaimAcknowledgmentService,
    AckSftpPollerService,
    ClearinghouseAckWebhookGuard,
  ],
  exports: [QueuesService]
})
export class QueuesModule {}

