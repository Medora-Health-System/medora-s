import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";
import { MedicationPassQueueService } from "./medication-pass-queue.service";
import { MedicationPassQueueController } from "./medication-pass-queue.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationPassQueueController],
  providers: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
  ],
  exports: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
  ],
})
export class MedicationDoseModule {}
