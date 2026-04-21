import { Module } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { ClaimBuilderService } from "../billing/claim-builder.service";
import { ClaimExportService } from "../billing/claim-export.service";

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController],
  providers: [QueuesService, AuditService, ClaimBuilderService, ClaimExportService],
  exports: [QueuesService]
})
export class QueuesModule {}

