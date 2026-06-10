import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";

@Module({
  imports: [PrismaModule],
  providers: [MedicationDoseExpansionService, MedicationDoseHorizonMaintenanceService],
  exports: [MedicationDoseExpansionService, MedicationDoseHorizonMaintenanceService],
})
export class MedicationDoseModule {}
