import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersLabRadiologyEffectiveTimeService } from "./orders-lab-radiology-effective-time.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationAdministrationModule } from "../medication-administration/medication-administration.module";

@Module({
  imports: [PrismaModule, MedicationAdministrationModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersLabRadiologyEffectiveTimeService, AuditService],
  exports: [OrdersService, OrdersLabRadiologyEffectiveTimeService],
})
export class OrdersModule {}

