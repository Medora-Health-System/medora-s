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

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController],
  providers: [
    QueuesService,
    AuditService,
    ClaimBuilderService,
    ClaimExportService,
    X12837GeneratorService,
    ClaimControlNumberService,
    X12EnvelopeBuilderService,
    ClaimSubmissionService,
  ],
  exports: [QueuesService]
})
export class QueuesModule {}

