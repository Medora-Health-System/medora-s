import { Module } from "@nestjs/common";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { ChartSummaryService } from "./chart-summary.service";
import { PatientVitalsService } from "./patient-vitals.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { EncountersModule } from "../encounters/encounters.module";
import { PublicHealthModule } from "../public-health/public-health.module";
import { DiagnosesModule } from "../diagnoses/diagnoses.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [PrismaModule, EncountersModule, PublicHealthModule, DiagnosesModule, OrdersModule],
  controllers: [PatientsController],
  providers: [PatientsService, ChartSummaryService, PatientVitalsService, AuditService],
  exports: [PatientsService],
})
export class PatientsModule {}

