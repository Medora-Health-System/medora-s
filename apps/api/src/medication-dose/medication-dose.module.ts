import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";
import { MedicationPassQueueService } from "./medication-pass-queue.service";
import { MedicationPassQueueController } from "./medication-pass-queue.controller";
import { MarShiftTimelineService } from "./mar-shift-timeline.service";
import { MarShiftTimelineController } from "./mar-shift-timeline.controller";
import { MedicationDoseScheduleAdjustmentController } from "./medication-dose-schedule-adjustment.controller";
import { MedicationDoseScheduleAdjustmentService } from "./medication-dose-schedule-adjustment.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    MedicationPassQueueController,
    MarShiftTimelineController,
    MedicationDoseScheduleAdjustmentController,
  ],
  providers: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
    MarShiftTimelineService,
    MedicationDoseScheduleAdjustmentService,
  ],
  exports: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
    MedicationPassQueueService,
    MarShiftTimelineService,
    MedicationDoseScheduleAdjustmentService,
  ],
})
export class MedicationDoseModule {}
