import { Module } from "@nestjs/common";
import { TriageController } from "./triage.controller";
import { TriageService } from "./triage.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [TriageController],
  providers: [TriageService, AuditService],
  exports: [TriageService],
})
export class TriageModule {}

