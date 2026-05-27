import { Module, forwardRef } from "@nestjs/common";
import { TriageController } from "./triage.controller";
import { TriageService } from "./triage.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TriageCarryForwardService } from "./triage-carry-forward.service";
import { AuditService } from "../common/services/audit.service";
import { PatientsModule } from "../patients/patients.module";

@Module({
  imports: [PrismaModule, forwardRef(() => PatientsModule)],
  controllers: [TriageController],
  providers: [TriageService, TriageCarryForwardService, AuditService],
  exports: [TriageService],
})
export class TriageModule {}

