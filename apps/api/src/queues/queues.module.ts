import { Module } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { ClaimBuilderService } from "../billing/claim-builder.service";

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController],
  providers: [QueuesService, AuditService, ClaimBuilderService],
  exports: [QueuesService]
})
export class QueuesModule {}

