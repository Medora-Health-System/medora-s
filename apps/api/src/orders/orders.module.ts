import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersLabRadiologyEffectiveTimeService } from "./orders-lab-radiology-effective-time.service";
import { ProcedureBillingReadinessService } from "./procedure-billing-readiness.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationAdministrationModule } from "../medication-administration/medication-administration.module";
import { PharmacyVerificationService } from "../medication-safety/pharmacy-verification.service";

@Module({
  imports: [PrismaModule, MedicationAdministrationModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersLabRadiologyEffectiveTimeService,
    ProcedureBillingReadinessService,
    PharmacyVerificationService,
    AuditService,
  ],
  exports: [OrdersService, OrdersLabRadiologyEffectiveTimeService, ProcedureBillingReadinessService],
})
export class OrdersModule {}

