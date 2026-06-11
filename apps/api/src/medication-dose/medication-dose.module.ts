import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";
import { MedicationPassQueueService } from "./medication-pass-queue.service";
import { MedicationPassQueueController } from "./medication-pass-queue.controller";
import { MarShiftTimelineService } from "./mar-shift-timeline.service";
import { MarShiftTimelineController } from "./mar-shift-timeline.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationPassQueueController, MarShiftTimelineController],
  providers: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
    MarShiftTimelineService,
  ],
  exports: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
    MarShiftTimelineService,
  ],
})
export class MedicationDoseModule {}
