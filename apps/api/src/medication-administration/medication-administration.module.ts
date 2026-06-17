import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationAdministrationController } from "./medication-administration.controller";
import { MedicationAdministrationService } from "./medication-administration.service";
import { MedicationAdministrationHistoryService } from "./medication-administration-history.service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationAdministrationController],
  providers: [
    MedicationAdministrationService,
    MedicationAdministrationHistoryService,
    AuditService,
  ],
  exports: [MedicationAdministrationService, MedicationAdministrationHistoryService],
})
export class MedicationAdministrationModule {}
