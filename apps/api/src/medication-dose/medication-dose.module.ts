import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";

@Module({
  imports: [PrismaModule],
  providers: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
  ],
  exports: [
    MedicationDoseExpansionService,
    MedicationDoseHorizonMaintenanceService,
    MedicationDoseStatusPromotionService,
  ],
})
export class MedicationDoseModule {}
