import { Module } from "@nestjs/common";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";
import { EncounterChartExportService } from "./chart-export.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { DiagnosesModule } from "../diagnoses/diagnoses.module";
import { OrdersModule } from "../orders/orders.module";
import { ObservationOrderTemplateService } from "./observation-order-template.service";

@Module({
  imports: [PrismaModule, DiagnosesModule, OrdersModule],
  controllers: [EncountersController],
  providers: [EncountersService, EncounterChartExportService, ObservationOrderTemplateService, AuditService],
  exports: [EncountersService, EncounterChartExportService],
})
export class EncountersModule {}

