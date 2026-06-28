import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { EnterpriseOrderSetAnalyticsController } from "./enterprise-order-set-analytics.controller";
import { MedicationOrderLifecycleService } from "./medication-order-lifecycle.service";
import { OrdersService } from "./orders.service";
import { EnterpriseOrderSetAnalyticsService } from "./enterprise-order-set-analytics.service";
import { OrdersLabRadiologyEffectiveTimeService } from "./orders-lab-radiology-effective-time.service";
import { ProcedureBillingReadinessService } from "./procedure-billing-readiness.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationAdministrationModule } from "../medication-administration/medication-administration.module";
import { PharmacyVerificationService } from "../medication-safety/pharmacy-verification.service";
import { OrdersContinuousFluidService } from "./orders-continuous-fluid.service";
import { OrdersFluidBolusService } from "./orders-fluid-bolus.service";

@Module({
  imports: [PrismaModule, MedicationAdministrationModule],
  controllers: [OrdersController, EnterpriseOrderSetAnalyticsController],
  providers: [
    OrdersService,
    EnterpriseOrderSetAnalyticsService,
    MedicationOrderLifecycleService,
    OrdersContinuousFluidService,
    OrdersFluidBolusService,
    OrdersLabRadiologyEffectiveTimeService,
    ProcedureBillingReadinessService,
    PharmacyVerificationService,
    AuditService,
  ],
  exports: [OrdersService, OrdersLabRadiologyEffectiveTimeService, ProcedureBillingReadinessService],
})
export class OrdersModule {}

