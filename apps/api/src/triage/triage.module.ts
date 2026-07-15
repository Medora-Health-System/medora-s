import { Module, forwardRef } from "@nestjs/common";
import { TriageController } from "./triage.controller";
import { TriageService } from "./triage.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TriageCarryForwardService } from "./triage-carry-forward.service";
import { TriageVitalsReadingService } from "./triage-vitals-reading.service";
import { AuditService } from "../common/services/audit.service";
import { PatientsModule } from "../patients/patients.module";
import { EdTriageAccessGuard } from "./ed-triage-access.guard";

@Module({
  imports: [PrismaModule, forwardRef(() => PatientsModule)],
  controllers: [TriageController],
  providers: [
    TriageService,
    TriageCarryForwardService,
    TriageVitalsReadingService,
    AuditService,
    EdTriageAccessGuard,
  ],
  exports: [TriageService, TriageVitalsReadingService],
})
export class TriageModule {}

